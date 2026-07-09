"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const title = text(formData, "title");
  const ownerId = text(formData, "owner_id");
  const priority = text(formData, "priority") as Priority;
  if (!id || !title || !ownerId) redirect(`/work-items/${id}/edit?error=Title and owner are required`);

  const supabase = await createClient();
  const { data: before } = await supabase.from("work_items").select("*").eq("id", id).single();
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
  const actorId = text(formData, "actor_id") || null;
  const supabase = await createClient();
  const { data: before } = await supabase.from("work_items").select("*").eq("id", id).single();
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
  const submittedBy = text(formData, "submitted_by");
  const status = text(formData, "status") as Status;
  const progressNotes = text(formData, "progress_notes");
  const blockers = nullableText(formData, "blockers");
  const hours = Number(text(formData, "hours_spent") || "0");

  if (!progressNotes) redirect(`/work-items/${workItemId}?error=Progress notes are required`);
  if (!submittedBy) redirect(`/work-items/${workItemId}?error=Submitted by is required`);

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
