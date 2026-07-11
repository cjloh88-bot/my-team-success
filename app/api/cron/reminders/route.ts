import { NextRequest, NextResponse } from "next/server";
import { buildReminderCandidates, deliverQueuedSlack, queueReminderCandidates } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateRiskScore, type TeamMember, type WeeklyUpdate, type WorkItem, type WorkItemView } from "@/lib/team-success";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const [{ data: items, error: itemsError }, { data: members, error: membersError }, { data: updates, error: updatesError }] = await Promise.all([
      supabase.from("work_items").select("*").eq("archived", false),
      supabase.from("team_members").select("*"),
      supabase.from("weekly_updates").select("*").order("created_at", { ascending: false }),
    ]);
    if (itemsError || membersError || updatesError) throw new Error(itemsError?.message ?? membersError?.message ?? updatesError?.message);
    const itemViews = (items as WorkItem[]).map((item) => {
      const latestUpdate = (updates as WeeklyUpdate[]).find((update) => update.work_item_id === item.id && update.is_current)
        ?? (updates as WeeklyUpdate[]).find((update) => update.work_item_id === item.id)
        ?? null;
      return {
        ...item,
        risk_score: calculateRiskScore(item, latestUpdate),
        owner: (members as TeamMember[]).find((member) => member.id === item.owner_id) ?? null,
        latestUpdate,
        updateCount: (updates as WeeklyUpdate[]).filter((update) => update.work_item_id === item.id).length,
      } satisfies WorkItemView;
    });
    const queued = await queueReminderCandidates(supabase, buildReminderCandidates(itemViews));
    if (queued.error) throw new Error(queued.error.message);
    const delivered = await deliverQueuedSlack(supabase);
    if (delivered.error && delivered.error !== "SLACK_WEBHOOK_URL is not configured") throw new Error(delivered.error);
    return NextResponse.json({ queued: queued.queued, sent: delivered.sent, failed: delivered.failed, slackConfigured: !delivered.error });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Reminder run failed" }, { status: 500 });
  }
}
