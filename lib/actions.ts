"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  calculateRiskScore,
  currentWeekStart,
  getWorkItem,
  getWorkItems,
  hasSupabaseEnv,
  isAllowedTransition,
  type Priority,
  type Status,
  type WeeklyUpdate,
  type WorkItem,
} from "@/lib/team-success";
import { draftWeeklyDigestWithAI, draftWorkItemInsight } from "@/lib/intelligence";
import { buildReminderCandidates, deliverQueuedSlack, isSlackConfigured, queueReminderCandidates } from "@/lib/notifications";

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
  return currentWeekStart();
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
    .update({ status, risk_score: calculateRiskScore({ status, due_date: before.due_date }, { created_at: update.created_at }) })
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

export async function draftWeeklyDigest(formData: FormData) {
  const admin = await requireAdmin("/digests");
  const weekStartValue = text(formData, "week_start") || currentWeekStart();
  const supabase = await createClient();
  const [{ data: updates, error: updatesError }, { data: members, error: membersError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("weekly_updates").select("*").gte("week_start", weekStartValue).order("created_at", { ascending: false }),
    supabase.from("team_members").select("*"),
    supabase.from("work_items").select("id,title,status,due_date"),
  ]);

  if (updatesError || membersError || itemsError) {
    redirect(`/digests?error=${encodeURIComponent(updatesError?.message ?? membersError?.message ?? itemsError?.message ?? "Could not draft digest")}`);
  }

  const updateRows = (updates ?? []) as WeeklyUpdate[];
  const memberRows = (members ?? []) as { id: string; name: string }[];
  const itemRows = (items ?? []) as { id: string; title: string; status: string; due_date: string | null }[];
  const blocked = itemRows.filter((item) => item.status === "blocked").length;
  const complete = updateRows.filter((update) => update.status === "complete").length;
  const hours = updateRows.reduce((sum, update) => sum + Number(update.hours_spent ?? 0), 0);
  const blockerNotes = updateRows.filter((update) => update.blockers).map((update) => update.blockers);
  const lines = [
    `Week of ${weekStartValue}: ${updateRows.length} updates submitted across ${new Set(updateRows.map((update) => update.work_item_id)).size} work items.`,
    `${complete} updates marked complete, ${blocked} work items are currently blocked, and ${hours.toFixed(1)} hours were reported.`,
    blockerNotes.length > 0 ? `Key blockers: ${blockerNotes.slice(0, 4).join("; ")}.` : "No blockers were reported in this week's updates.",
    "Highlights:",
    ...updateRows.slice(0, 6).map((update) => {
      const member = memberRows.find((row) => row.id === update.submitted_by)?.name ?? "Team member";
      const item = itemRows.find((row) => row.id === update.work_item_id)?.title ?? "Work item";
      return `- ${member} on ${item}: ${update.progress_notes ?? "No notes provided"}`;
    }),
  ];

  const draft = await draftWeeklyDigestWithAI(lines.join("\n"), [
    `Week start: ${weekStartValue}`,
    ...updateRows.map((update) => {
      const member = memberRows.find((row) => row.id === update.submitted_by)?.name ?? "Team member";
      const item = itemRows.find((row) => row.id === update.work_item_id)?.title ?? "Work item";
      return `${member} | ${item} | ${update.status} | ${update.progress_notes ?? "No notes"}${update.blockers ? ` | Blocker: ${update.blockers}` : ""}`;
    }),
  ].join("\n"));

  const { data, error } = await supabase
    .from("weekly_digests")
    .insert({
      user_id: admin.user.id,
      week_start: weekStartValue,
      summary_text: draft.summary,
      summary_source: draft.source,
      summary_confidence: updateRows.length > 0 ? draft.confidence : 0.45,
      summary_review_status: "unreviewed",
      published: false,
    })
    .select("*")
    .single();

  if (error) redirect(`/digests?error=${encodeURIComponent(error.message)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "digest_drafted",
    detail: { digest_id: data.id, week_start: weekStartValue, source: draft.source },
  });
  await logAudit("weekly_digests", data.id, "insert", null, data, admin.member.id);
  revalidatePath("/digests");
  redirect("/digests?success=Weekly digest drafted");
}

export async function reviewWeeklyDigest(formData: FormData) {
  const admin = await requireAdmin("/digests");
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !["approved", "rejected"].includes(status)) redirect("/digests?error=Invalid digest review");
  const supabase = await createClient();
  const { data: before } = await supabase.from("weekly_digests").select("*").eq("id", id).single();
  const { data, error } = await supabase
    .from("weekly_digests")
    .update({ summary_review_status: status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) redirect(`/digests?error=${encodeURIComponent(error.message)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: `digest_${status}`,
    detail: { digest_id: id },
  });
  await logAudit("weekly_digests", id, "update", before, data, admin.member.id);
  revalidatePath("/digests");
  redirect(`/digests?success=Digest ${status}`);
}

export async function publishWeeklyDigest(formData: FormData) {
  const admin = await requireAdmin("/digests");
  const id = text(formData, "id");
  const supabase = await createClient();
  const { data: before } = await supabase.from("weekly_digests").select("*").eq("id", id).single();
  if (before?.summary_review_status !== "approved") redirect("/digests?error=Approve the digest before publishing");
  const { data, error } = await supabase.from("weekly_digests").update({ published: true }).eq("id", id).select("*").single();
  if (error) redirect(`/digests?error=${encodeURIComponent(error.message)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "digest_published",
    detail: { digest_id: id },
  });
  await logAudit("weekly_digests", id, "update", before, data, admin.member.id);
  revalidatePath("/digests");
  redirect("/digests?success=Digest published");
}

export async function refreshRiskScores() {
  const admin = await requireAdmin("/insights");
  const items = await getWorkItems();
  const supabase = await createClient();
  const activeItems = items.filter((item) => !item.archived);
  const results = await Promise.all(activeItems.map((item) => supabase
    .from("work_items")
    .update({ risk_score: item.risk_score })
    .eq("id", item.id)));
  const failure = results.find((result) => result.error)?.error;
  if (failure) redirect(`/insights?error=${encodeURIComponent(failure.message)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "risk_scores_refreshed",
    detail: { work_item_count: activeItems.length },
  });
  await logAudit("work_items", null, "risk_scores_refreshed", null, { work_item_count: activeItems.length }, admin.member.id);
  revalidatePath("/dashboard");
  revalidatePath("/insights");
  redirect(`/insights?success=Risk scores refreshed for ${activeItems.length} work items`);
}

export async function generateWorkItemInsight(formData: FormData) {
  const id = text(formData, "work_item_id");
  const admin = await requireAdmin(`/work-items/${id}`);
  const data = await getWorkItem(id);
  if (!data) redirect(`/work-items/${id}?error=Work item not found`);
  const draft = await draftWorkItemInsight(data.item, data.updates);
  const supabase = await createClient();
  const payload = {
    work_item_id: id,
    summary_text: draft.summary,
    blockers: draft.blockers,
    risk_flag: draft.riskFlag,
    risk_score: draft.riskScore,
    source: draft.source,
    confidence: draft.confidence,
    generated_by: admin.member.id,
    generated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await supabase
    .from("work_item_insights")
    .upsert(payload, { onConflict: "work_item_id" })
    .select("*")
    .single();
  if (error) redirect(`/work-items/${id}?error=${encodeURIComponent(`Could not save insight. Apply migration 0003 first: ${error.message}`)}`);
  await supabase.from("activities").insert({
    work_item_id: id,
    actor_id: admin.member.id,
    action: "work_item_insight_drafted",
    detail: { source: draft.source, risk_flag: draft.riskFlag },
  });
  await logAudit("work_item_insights", saved.id, "upsert", null, saved, admin.member.id);
  revalidatePath(`/work-items/${id}`);
  revalidatePath("/insights");
  redirect(`/work-items/${id}?success=Work item insight drafted`);
}

export async function queueOverdueReminders() {
  const admin = await requireAdmin("/insights");
  const items = await getWorkItems();
  const candidates = buildReminderCandidates(items);
  const supabase = await createClient();
  const { queued, error } = await queueReminderCandidates(supabase, candidates);
  if (error) redirect(`/insights?error=${encodeURIComponent(`Could not queue reminders. Apply migration 0003 first: ${error.message}`)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "reminders_queued",
    detail: { reminder_count: queued },
  });
  await logAudit("notification_deliveries", null, "queue", null, { reminder_count: queued }, admin.member.id);
  revalidatePath("/insights");
  redirect(`/insights?success=${queued === 0 ? "No overdue or stale reminders were needed" : `${queued} reminders queued`}`);
}

export async function deliverQueuedNotifications() {
  const admin = await requireAdmin("/insights");
  if (!isSlackConfigured()) redirect("/insights?error=SLACK_WEBHOOK_URL is not configured");
  const supabase = await createClient();
  const result = await deliverQueuedSlack(supabase);
  if (result.error) redirect(`/insights?error=${encodeURIComponent(result.error)}`);
  await supabase.from("activities").insert({
    actor_id: admin.member.id,
    action: "slack_reminders_delivered",
    detail: { sent: result.sent, failed: result.failed },
  });
  await logAudit("notification_deliveries", null, "deliver", null, result, admin.member.id);
  revalidatePath("/insights");
  redirect(`/insights?success=${result.sent} Slack reminders sent${result.failed ? `; ${result.failed} failed` : ""}`);
}
