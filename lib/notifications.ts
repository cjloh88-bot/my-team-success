import type { SupabaseClient } from "@supabase/supabase-js";
import { currentWeekStart, type WorkItemView } from "@/lib/team-success";
import { isLateOrStale } from "@/lib/intelligence";

type ReminderCandidate = {
  reminder_key: string;
  work_item_id: string;
  recipient_id: string | null;
  channel: "slack";
  notification_type: "overdue" | "stale_update";
  message: string;
};

export function isSlackConfigured() {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

export function buildReminderCandidates(items: WorkItemView[]): ReminderCandidate[] {
  const period = currentWeekStart();
  return items.flatMap((item) => {
    if (item.archived || !item.owner_id) return [];
    const state = isLateOrStale(item);
    const candidates: ReminderCandidate[] = [];
    if (state.overdue) {
      candidates.push({
        reminder_key: `overdue:${item.id}:${item.owner_id}:${period}`,
        work_item_id: item.id,
        recipient_id: item.owner_id,
        channel: "slack",
        notification_type: "overdue",
        message: `Overdue: ${item.title} is ${state.risk.daysOverdue} day${state.risk.daysOverdue === 1 ? "" : "s"} past its due date. Please update its progress.`,
      });
    }
    if (state.stale && !state.overdue) {
      candidates.push({
        reminder_key: `stale_update:${item.id}:${item.owner_id}:${period}`,
        work_item_id: item.id,
        recipient_id: item.owner_id,
        channel: "slack",
        notification_type: "stale_update",
        message: `Update needed: ${item.title} has not received a weekly update for ${state.risk.noUpdateDays} days.`,
      });
    }
    return candidates;
  });
}

export async function queueReminderCandidates(supabase: SupabaseClient, candidates: ReminderCandidate[]) {
  if (candidates.length === 0) return { queued: 0, error: null };
  const { error } = await supabase.from("notification_deliveries").upsert(candidates, { onConflict: "reminder_key", ignoreDuplicates: true });
  return { queued: candidates.length, error };
}

export async function deliverQueuedSlack(supabase: SupabaseClient) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return { sent: 0, failed: 0, error: "SLACK_WEBHOOK_URL is not configured" };
  const { data, error } = await supabase.from("notification_deliveries").select("*").eq("status", "queued").order("created_at").limit(25);
  if (error) return { sent: 0, failed: 0, error: error.message };
  let sent = 0;
  let failed = 0;
  for (const delivery of data ?? []) {
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: delivery.message }),
      });
      if (!response.ok) throw new Error(`Slack returned ${response.status}`);
      await supabase.from("notification_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), attempts: Number(delivery.attempts ?? 0) + 1, error_message: null }).eq("id", delivery.id);
      sent += 1;
    } catch (caught) {
      await supabase.from("notification_deliveries").update({ status: "failed", attempts: Number(delivery.attempts ?? 0) + 1, error_message: caught instanceof Error ? caught.message : "Unknown delivery error" }).eq("id", delivery.id);
      failed += 1;
    }
  }
  return { sent, failed, error: null };
}
