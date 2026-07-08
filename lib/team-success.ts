import { createClient } from "@/lib/supabase/server";

export type Status = "not_started" | "in_progress" | "blocked" | "complete";
export type Priority = "low" | "medium" | "high";

export type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  role: "admin" | "member" | "viewer";
  created_at: string;
};

export type WorkItem = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  archived: boolean;
  risk_score: number;
  created_at: string;
};

export type WeeklyUpdate = {
  id: string;
  user_id: string | null;
  work_item_id: string;
  submitted_by: string | null;
  week_start: string;
  status: Status;
  progress_notes: string | null;
  blockers: string | null;
  hours_spent: number | null;
  is_current: boolean;
  created_at: string;
};

export type Activity = {
  id: string;
  work_item_id: string | null;
  actor_id: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type WorkItemView = WorkItem & {
  owner: TeamMember | null;
  latestUpdate: WeeklyUpdate | null;
  updateCount: number;
};

export const statusOptions: { value: Status; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "complete", label: "Complete" },
];

export const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const statusRank: Record<Status, number> = {
  blocked: 0,
  in_progress: 1,
  not_started: 2,
  complete: 3,
};

const demoMembers: TeamMember[] = [
  { id: "a1000000-0000-0000-0000-000000000001", name: "Jordan Lee", email: "jordan@example.com", role: "admin", created_at: new Date().toISOString() },
  { id: "a1000000-0000-0000-0000-000000000002", name: "Sam Rivera", email: "sam@example.com", role: "member", created_at: new Date().toISOString() },
  { id: "a1000000-0000-0000-0000-000000000003", name: "Alex Kim", email: "alex@example.com", role: "member", created_at: new Date().toISOString() },
  { id: "a1000000-0000-0000-0000-000000000004", name: "Casey Patel", email: "casey@example.com", role: "viewer", created_at: new Date().toISOString() },
];

const today = new Date();
const isoDate = (offsetDays: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const demoItems: WorkItem[] = [
  { id: "b1000000-0000-0000-0000-000000000001", user_id: null, title: "Q3 Vendor Contract Renewal", description: "Renew contracts with three key vendors before end of quarter.", owner_id: demoMembers[1].id, status: "in_progress", priority: "high", due_date: isoDate(14), archived: false, risk_score: 0.06, created_at: today.toISOString() },
  { id: "b1000000-0000-0000-0000-000000000002", user_id: null, title: "Onboarding Process Update", description: "Revise onboarding checklist and update shared drive materials.", owner_id: demoMembers[1].id, status: "in_progress", priority: "medium", due_date: isoDate(7), archived: false, risk_score: 0.08, created_at: today.toISOString() },
  { id: "b1000000-0000-0000-0000-000000000003", user_id: null, title: "Monthly Reporting Template", description: "Standardise the monthly ops report and get sign-off from leads.", owner_id: demoMembers[2].id, status: "blocked", priority: "high", due_date: isoDate(3), archived: false, risk_score: 0.58, created_at: today.toISOString() },
  { id: "b1000000-0000-0000-0000-000000000004", user_id: null, title: "Team Tooling Audit", description: "Inventory all current tools and flag redundant subscriptions.", owner_id: demoMembers[1].id, status: "not_started", priority: "low", due_date: isoDate(21), archived: false, risk_score: 0.2, created_at: today.toISOString() },
  { id: "b1000000-0000-0000-0000-000000000005", user_id: null, title: "Budget Tracker Handover", description: "Transfer ownership of budget tracker spreadsheet to new lead.", owner_id: demoMembers[0].id, status: "complete", priority: "medium", due_date: isoDate(-2), archived: false, risk_score: 0, created_at: today.toISOString() },
];

const demoUpdates: WeeklyUpdate[] = [
  { id: "c1000000-0000-0000-0000-000000000001", user_id: null, work_item_id: demoItems[0].id, submitted_by: demoMembers[1].id, week_start: isoDate(0), status: "in_progress", progress_notes: "Sent renewal drafts to two of three vendors. Awaiting legal review.", blockers: "Legal review is the remaining blocker before final vendor edits.", hours_spent: 3.5, is_current: true, created_at: today.toISOString() },
  { id: "c1000000-0000-0000-0000-000000000002", user_id: null, work_item_id: demoItems[0].id, submitted_by: demoMembers[1].id, week_start: isoDate(-7), status: "in_progress", progress_notes: "Identified contacts at all three vendors and drafted initial terms.", blockers: null, hours_spent: 2, is_current: false, created_at: isoDate(-7) },
  { id: "c1000000-0000-0000-0000-000000000003", user_id: null, work_item_id: demoItems[1].id, submitted_by: demoMembers[1].id, week_start: isoDate(0), status: "in_progress", progress_notes: "Updated first three sections of checklist. Shared draft for feedback.", blockers: null, hours_spent: 4, is_current: true, created_at: today.toISOString() },
  { id: "c1000000-0000-0000-0000-000000000004", user_id: null, work_item_id: demoItems[2].id, submitted_by: demoMembers[2].id, week_start: isoDate(0), status: "blocked", progress_notes: "Template drafted but waiting on sign-off from two leads who are on leave.", blockers: "Two approvers on leave until next Monday.", hours_spent: 1.5, is_current: true, created_at: today.toISOString() },
  { id: "c1000000-0000-0000-0000-000000000005", user_id: null, work_item_id: demoItems[4].id, submitted_by: demoMembers[0].id, week_start: isoDate(-7), status: "complete", progress_notes: "Handover complete. New lead confirmed access and understanding.", blockers: null, hours_spent: 1, is_current: true, created_at: isoDate(-7) },
];

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function statusLabel(status: Status) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

export function priorityLabel(priority: Priority) {
  return priorityOptions.find((option) => option.value === priority)?.label ?? priority;
}

export function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function calculateRiskScore(item: Pick<WorkItem, "status" | "due_date">, latestUpdate?: Pick<WeeklyUpdate, "created_at"> | null) {
  const now = new Date();
  const due = item.due_date ? new Date(`${item.due_date}T00:00:00`) : null;
  const daysOverdue = due ? Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000)) : 0;
  const noUpdateDays = latestUpdate ? Math.max(0, Math.floor((now.getTime() - new Date(latestUpdate.created_at).getTime()) / 86400000)) : 7;
  const score = 0.4 * Math.min(daysOverdue / 7, 1) + 0.4 * (item.status === "blocked" ? 1 : 0) + 0.2 * Math.min(noUpdateDays / 7, 1);
  return Math.min(1, Number(score.toFixed(2)));
}

export function isAllowedTransition(from: Status, to: Status) {
  if (from === to) return true;
  if (from === "not_started") return to === "in_progress";
  if (from === "in_progress") return to === "blocked" || to === "complete";
  if (from === "blocked") return to === "in_progress" || to === "complete";
  return false;
}

function mergeItems(items: WorkItem[], members: TeamMember[], updates: WeeklyUpdate[]): WorkItemView[] {
  return items
    .map((item) => {
      const itemUpdates = updates
        .filter((update) => update.work_item_id === item.id)
        .sort((a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at)));
      return {
        ...item,
        owner: members.find((member) => member.id === item.owner_id) ?? null,
        latestUpdate: itemUpdates.find((update) => update.is_current) ?? itemUpdates[0] ?? null,
        updateCount: itemUpdates.length,
      };
    })
    .sort((a, b) => statusRank[a.status] - statusRank[b.status] || b.risk_score - a.risk_score || a.title.localeCompare(b.title));
}

export async function getTeamMembers() {
  if (!hasSupabaseEnv()) return demoMembers;
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").select("*").order("name");
  if (error) throw new Error(error.message);
  return data as TeamMember[];
}

export async function getWorkItems() {
  if (!hasSupabaseEnv()) return mergeItems(demoItems, demoMembers, demoUpdates);
  const supabase = await createClient();
  const [{ data: items, error: itemsError }, { data: members, error: membersError }, { data: updates, error: updatesError }] = await Promise.all([
    supabase.from("work_items").select("*").order("created_at", { ascending: false }),
    supabase.from("team_members").select("*"),
    supabase.from("weekly_updates").select("*").order("created_at", { ascending: false }),
  ]);
  if (itemsError || membersError || updatesError) throw new Error(itemsError?.message ?? membersError?.message ?? updatesError?.message);
  return mergeItems(items as WorkItem[], members as TeamMember[], updates as WeeklyUpdate[]);
}

export async function getWorkItem(id: string) {
  if (!hasSupabaseEnv()) {
    const item = mergeItems(demoItems, demoMembers, demoUpdates).find((entry) => entry.id === id);
    return item ? { item, members: demoMembers, updates: demoUpdates.filter((update) => update.work_item_id === id), activities: [] as Activity[] } : null;
  }
  const supabase = await createClient();
  const [{ data: item, error: itemError }, { data: members, error: membersError }, { data: updates, error: updatesError }, { data: activities, error: activitiesError }] = await Promise.all([
    supabase.from("work_items").select("*").eq("id", id).single(),
    supabase.from("team_members").select("*").order("name"),
    supabase.from("weekly_updates").select("*").eq("work_item_id", id).order("created_at", { ascending: false }),
    supabase.from("activities").select("*").eq("work_item_id", id).order("created_at", { ascending: false }).limit(12),
  ]);
  if (itemError) return null;
  if (membersError || updatesError || activitiesError) throw new Error(membersError?.message ?? updatesError?.message ?? activitiesError?.message);
  const [view] = mergeItems([item as WorkItem], members as TeamMember[], updates as WeeklyUpdate[]);
  return { item: view, members: members as TeamMember[], updates: updates as WeeklyUpdate[], activities: activities as Activity[] };
}

export async function getActivities() {
  if (!hasSupabaseEnv()) return [] as (Activity & { itemTitle: string; actorName: string })[];
  const supabase = await createClient();
  const [{ data: activities, error: activitiesError }, { data: members, error: membersError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("team_members").select("*"),
    supabase.from("work_items").select("id,title"),
  ]);
  if (activitiesError || membersError || itemsError) throw new Error(activitiesError?.message ?? membersError?.message ?? itemsError?.message);
  return (activities as Activity[]).map((activity) => ({
    ...activity,
    itemTitle: (items as Pick<WorkItem, "id" | "title">[]).find((item) => item.id === activity.work_item_id)?.title ?? "Unknown item",
    actorName: (members as TeamMember[]).find((member) => member.id === activity.actor_id)?.name ?? "Team member",
  }));
}
