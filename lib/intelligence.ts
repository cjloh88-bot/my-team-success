import type { Status, WeeklyUpdate, WorkItemView } from "@/lib/team-success";

export type RiskFlag = "low" | "medium" | "high";

export type WorkItemInsightDraft = {
  summary: string;
  blockers: string[];
  riskFlag: RiskFlag;
  riskScore: number;
  source: string;
  confidence: number;
};

function daysSince(value: string | null | undefined) {
  if (!value) return 7;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

export function assessRisk(item: Pick<WorkItemView, "status" | "due_date" | "latestUpdate">) {
  const due = item.due_date ? new Date(`${item.due_date}T00:00:00`) : null;
  const daysOverdue = due ? Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000)) : 0;
  const noUpdateDays = daysSince(item.latestUpdate?.created_at);
  const score = Math.min(1, Number((
    0.4 * Math.min(daysOverdue / 7, 1) +
    0.4 * Number(item.status === "blocked") +
    0.2 * Math.min(noUpdateDays / 7, 1)
  ).toFixed(2)));
  const riskFlag: RiskFlag = score >= 0.7 ? "high" : score >= 0.35 ? "medium" : "low";
  const reasons = [
    ...(item.status === "blocked" ? ["Blocked"] : []),
    ...(daysOverdue > 0 ? [`${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`] : []),
    ...(noUpdateDays >= 7 ? [`No update for ${noUpdateDays} days`] : []),
  ];
  return { score, riskFlag, daysOverdue, noUpdateDays, reasons };
}

function fallbackInsight(item: WorkItemView, updates: WeeklyUpdate[]): WorkItemInsightDraft {
  const risk = assessRisk(item);
  const latest = updates[0];
  const blockers = updates
    .map((update) => update.blockers?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
  const summary = latest?.progress_notes
    ? `${item.status.replaceAll("_", " ")}: ${latest.progress_notes}`
    : `No weekly update has been submitted for ${item.title}.`;
  return {
    summary,
    blockers,
    riskFlag: risk.riskFlag,
    riskScore: risk.score,
    source: "rule-engine-v2",
    confidence: latest ? 0.78 : 0.5,
  };
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  return response.output?.flatMap((entry) => entry.content ?? []).find((content) => content.type === "output_text")?.text ?? null;
}

export async function draftWorkItemInsight(item: WorkItemView, updates: WeeklyUpdate[]): Promise<WorkItemInsightDraft> {
  const fallback = fallbackInsight(item, updates);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const prompt = [
    "Summarize this work item for an internal team dashboard.",
    "Return only JSON with summary (one short paragraph) and blockers (string array). Do not invent facts.",
    `Title: ${item.title}`,
    `Status: ${item.status}`,
    `Due date: ${item.due_date ?? "none"}`,
    "Updates:",
    ...updates.slice(0, 8).map((update) => `- ${update.progress_notes ?? "No notes"}${update.blockers ? ` Blocker: ${update.blockers}` : ""}`),
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini", input: prompt }),
    });
    if (!response.ok) return fallback;
    const text = extractResponseText(await response.json());
    if (!text) return fallback;
    const parsed = JSON.parse(text) as { summary?: unknown; blockers?: unknown };
    const summary = typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : fallback.summary;
    const blockers = Array.isArray(parsed.blockers)
      ? parsed.blockers.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 6)
      : fallback.blockers;
    return { ...fallback, summary, blockers, source: process.env.OPENAI_MODEL ?? "gpt-5.4-mini", confidence: 0.84 };
  } catch {
    return fallback;
  }
}

export function isLateOrStale(item: Pick<WorkItemView, "status" | "due_date" | "latestUpdate">) {
  const risk = assessRisk(item);
  return {
    overdue: risk.daysOverdue > 0 && item.status !== ("complete" satisfies Status),
    stale: risk.noUpdateDays >= 7 && item.status !== ("complete" satisfies Status),
    risk,
  };
}
