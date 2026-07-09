"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  hasSupabaseEnv,
  isAllowedTransition,
  type Priority,
  type Status,
  type WeeklyUpdate,
  type WorkItem,
} from "@/lib/team-success";

function requireDatabase(fallbackPath: string) {
  if (!hasSupabaseEnv()) {
    redirect(`${fallbackPath}?error=Supabase environment variables are not configured. Run vercel env pull .env.local before submitting forms.`);
  }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
}

async function requireSignedIn(fallbackPath: string) {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(fallbackPath)}&error=Please log in first`);
  return profile;
}

async function requireWriter(fallbackPath: string) {
  const profile = await requireSignedIn(fallbackPath);
  if (profile.member.role === "viewer") redirect(`${fallbackPath}?error=Viewers are read-only`);
  return profile;
}

async function requireAdmin(fallbackPath: string) {
  const profile = await requireSignedIn(fallbackPath);
  if (!isAdmin(profile)) redirect(`${fallbackPath}?error=Admin access required`);
  return profile;
}

function weekStart() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

async function logAudit(tableName: string, recordId: string | null, action: string, beforeState: unknown, afterState: unknown, actorId?: string | null) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    actor_id: actorId ?? null,
    table_name: tableName,
    record_id: recordId,
    action,
    before_state: beforeState ?? null,
    after_state: afterState ?? null,
  });
}

export async function createWorkItem(formData: FormData) {
  requireDatabase("/work-items/new");
  const profile = await requireWriter("/work-items/new");
  const title = text(formData, "title");
  const ownerId = text(formData, "owner_id");
  const status = text(formData, "status") as Status;
  const priority = text(formData, "priority") as Priority;

  if (!title || !ownerId) redirect("/work-items/new?error=Title and owner are required");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_items")
    .insert({
      title,
      description: nullableText(formData, "description"),
      owner_id: ownerId,
      due_date: nullableText(formData, "due_date"),
      priority,
      status,
      user_id: profile.user.id,
    })
    .select("*")
    .single();

  if (error) redirect(`/work-items/new?error=${encodeURIComponent(error.message)}`);

  await supabase.from("activities").insert({
    work_item_id: data.id,
    actor_id: ownerId,
    action: "work_item_created",
    detail: { title, status, priority },
  });
  await logAudit("work_items", data.id, "insert", null, data, ownerId);
  revalidatePath("/dashboard");
  redirect(`/work-items/${data.id}?success=Work item logged`);
}

export async function updateWorkItem(formData: FormData) {
  const id = text(formData, "id");
  requireDatabase(`/work-items/${id}/edit`);
  const profile = await requireWriter(`/work-items/${id}/edit`);
  const title = text(formData, "title");
  const ownerId = text(formData, "owner_id");
  const priority = text(formData, "priority") as Priority;
  if (!id || !title || !ownerId) redirect(`/work-items/${id}/edit?error=Title and owner are required`);

  const supabase = await createClient();
  const { data: before } = await supabase.from("work_items").select("*").eq("id", id).single();
  if (before && profile.member.role !== "admin" && before.owner_id !== profile.member.id) {
    redirect(`/work-items/${id}/edit?error=Only admins and item owners can edit this work item`);
  }
  const { data, error } = await supabase
    .from("work_items")
    .update({
      title,
      description: nullableText(formData, "description"),
      owner_id: ownerId,
      due_date: nullableText(formData, "due_date"),
      priority,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) redirect(`/work-items/${id}/edit?error=${encodeURIComponent(error.message)}`);

  await supabase.from("activities").insert({
    work_item_id: id,
    actor_id: ownerId,
    action: "work_item_edited",
    detail: { title, priority },
  });
  await logAudit("work_items", id, "update", before, data, ownerId);
  revalidatePath("/dashboard");
  revalidatePath(`/work-items/${id}`);
  redirect(`/work-items/${id}?success=Work item updated`);
}

export async function archiveWorkItem(formData: FormData) {
  const id = text(formData, "id");
  requireDatabase(`/work-items/${id}`);
  const profile = await requireWriter(`/work-items/${id}`);
  const actorId = text(formData, "actor_id") || null;
  const supabase = await createClient();
  const { data: before } = await supabase.from("work_items").select("*").eq("id", id).single();
  if (before && profile.member.role !== "admin" && before.owner_id !== profile.member.id) {
    redirect(`/work-items/${id}?error=Only admins and item owners can archive this work item`);
  }
  const { data, error } = await supabase.from("work_items").update({ archived: true }).eq("id", id).select("*").single();
  if (error) redirect(`/work-items/${id}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("activities").insert({ work_item_id: id, actor_id: actorId, action: "work_item_archived", detail: { archived: true } });
  await logAudit("work_items", id, "update", before, data, actorId);
  revalidatePath("/dashboard");
  redirect("/dashboard?success=Work item archived");
}

export async function submitWeeklyUpdate(formData: FormData) {
  const workItemId = text(formData, "work_item_id");
  requireDatabase(`/work-items/${workItemId}`);
  const profile = await requireWriter(`/work-items/${workItemId}`);
  const submittedBy = text(formData, "submitted_by");
  const status = text(formData, "status") as Status;
  const progressNotes = text(formData, "progress_notes");
  const blockers = nullableText(formData, "blockers");
  const hours = Number(text(formData, "hours_spent") || "0");

  if (!progressNotes) redirect(`/work-items/${workItemId}?error=Progress notes are required`);
  if (!submittedBy) redirect(`/work-items/${workItemId}?error=Submitted by is required`);
  if (profile.member.role !== "admin" && submittedBy !== profile.member.id) {
    redirect(`/work-items/${workItemId}?error=Members can only submit updates as themselves`);
  }

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase.from("work_items").select("*").eq("id", workItemId).single();
  if (itemError || !item) redirect(`/work-items/${workItemId}?error=Work item not found`);

  const before = item as WorkItem;
  if (!isAllowedTransition(before.status, status)) {
    redirect(`/work-items/${workItemId}?error=Status cannot jump from ${before.status.replace("_", " ")} to ${status.replace("_", " ")}`);
  }

  await supabase.from("weekly_updates").update({ is_current: false }).eq("work_item_id", workItemId);

  const { data: update, error: updateError } = await supabase
    .from("weekly_updates")
    .insert({
      work_item_id: workItemId,
      submitted_by: submittedBy,
      week_start: weekStart(),
      status,
      progress_notes: progressNotes,
      blockers,
      hours_spent: Number.isFinite(hours) ? hours : 0,
      is_current: true,
      user_id: profile.user.id,
    })
    .select("*")
    .single();

  if (updateError) redirect(`/work-items/${workItemId}?error=${encodeURIComponent(updateError.message)}`);

  const { data: after, error: workItemError } = await supabase
    .from("work_items")
    .update({ status })
    .eq("id", workItemId)
    .select("*")
    .single();

  if (workItemError) redirect(`/work-items/${workItemId}?error=${encodeURIComponent(workItemError.message)}`);

  await supabase.from("activities").insert({
    work_item_id: workItemId,
    actor_id: submittedBy,
    action: "update_submitted",
    detail: { from: before.status, to: status, blockers, hours_spent: hours, update_id: update.id },
  });
  await logAudit("weekly_updates", update.id, "insert", null, update, submittedBy);
  await logAudit("work_items", workItemId, "update", before, after, submittedBy);

  revalidatePath("/dashboard");
  revalidatePath(`/work-items/${workItemId}`);
  redirect(`/work-items/${workItemId}?success=Weekly update submitted`);
}

export async function signIn(formData: FormData) {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const next = text(formData, "next") || "/dashboard";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(error.message)}`);
  await getCurrentProfile();
  revalidatePath("/");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const password = text(formData, "password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`);
  redirect("/login?success=Account created. Check your email if confirmation is enabled, then sign in.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/dashboard?success=Signed out");
}

export async function createTeamMember(formData: FormData) {
  const admin = await requireAdmin("/team");
  const name = text(formData, "name");
  const email = nullableText(formData, "email");
  const role = text(formData, "role") || "member";
  if (!name) redirect("/team?error=Member name is required");
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").insert({ name, email, role }).select("*").single();
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "member_created",
    detail: { member_id: data.id, name, role },
  });
  await logAudit("team_members", data.id, "insert", null, data, admin.member.id);
  revalidatePath("/team");
  redirect("/team?success=Team member added");
}

export async function updateTeamMember(formData: FormData) {
  const admin = await requireAdmin("/team");
  const id = text(formData, "id");
  const name = text(formData, "name");
  const email = nullableText(formData, "email");
  const role = text(formData, "role") || "member";
  if (!id || !name) redirect("/team?error=Member name is required");
  const supabase = await createClient();
  const { data: before } = await supabase.from("team_members").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("team_members").update({ name, email, role }).eq("id", id).select("*").single();
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "member_updated",
    detail: { member_id: id, name, role },
  });
  await logAudit("team_members", id, "update", before, data, admin.member.id);
  revalidatePath("/team");
  redirect("/team?success=Team member updated");
}

export async function deleteTeamMember(formData: FormData) {
  const admin = await requireAdmin("/team");
  const id = text(formData, "id");
  if (!id) redirect("/team?error=Missing member id");
  if (id === admin.member.id) redirect("/team?error=Admins cannot delete their own member record");
  const supabase = await createClient();
  const { data: before } = await supabase.from("team_members").select("*").eq("id", id).single();
  await supabase.from("work_items").update({ owner_id: null }).eq("owner_id", id);
  await supabase.from("weekly_updates").update({ submitted_by: null }).eq("submitted_by", id);
  await supabase.from("activities").update({ actor_id: null }).eq("actor_id", id);
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "member_deleted",
    detail: { member_id: id, name: before?.name },
  });
  await logAudit("team_members", id, "delete", before, null, admin.member.id);
  revalidatePath("/team");
  revalidatePath("/dashboard");
  redirect("/team?success=Team member deleted");
}
