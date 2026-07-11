import Link from "next/link";
import { DateText, Notice, PriorityBadge, Shell, StatusBadge } from "@/app/components";
import { canWrite, getCurrentProfile } from "@/lib/auth";
import { getTeamMembers, getWorkItems, priorityOptions, statusOptions } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const [items, members, profile] = await Promise.all([getWorkItems(), getTeamMembers(), getCurrentProfile()]);
  const writable = canWrite(profile);
  const showArchived = params.archived === "true";
  const search = (params.q ?? "").trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!showArchived && item.archived) return false;
    if (params.status && item.status !== params.status) return false;
    if (params.owner && item.owner_id !== params.owner) return false;
    if (params.priority && item.priority !== params.priority) return false;
    if (params.due_from && (!item.due_date || item.due_date < params.due_from)) return false;
    if (params.due_to && (!item.due_date || item.due_date > params.due_to)) return false;
    if (search) {
      const searchable = [item.title, item.description, item.owner?.name, item.owner?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(search)) return false;
    }
    return true;
  });
  const blockedCount = items.filter((item) => item.status === "blocked" && !item.archived).length;
  const overdueCount = items.filter((item) => item.due_date && new Date(item.due_date) < new Date() && item.status !== "complete" && !item.archived).length;
  const staleCount = items.filter((item) => item.latestUpdate && (Date.now() - new Date(item.latestUpdate.created_at).getTime()) / 86400000 >= 7 && !item.archived).length;
  const activeCount = items.filter((item) => !item.archived && item.status !== "complete").length;

  return (
    <Shell>
      <Notice error={params.error} success={params.success} />
      <section className="page-heading">
        <div>
          <p className="eyebrow">Shared weekly progress</p>
          <h1>Dashboard</h1>
        </div>
        <Link href={writable ? "/work-items/new" : "/login?next=/work-items/new"} className="button-primary">Log Work Item</Link>
      </section>

      <form className="filter-bar">
        <input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Search work or owner"
          aria-label="Search work items or owners"
        />
        <select name="status" defaultValue={params.status ?? ""}>
          <option value="">All statuses</option>
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="owner" defaultValue={params.owner ?? ""}>
          <option value="">All owners</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <select name="priority" defaultValue={params.priority ?? ""}>
          <option value="">All priorities</option>
          {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input
          name="due_from"
          type="date"
          defaultValue={params.due_from ?? ""}
          aria-label="Due on or after"
          title="Due on or after"
        />
        <input
          name="due_to"
          type="date"
          defaultValue={params.due_to ?? ""}
          aria-label="Due on or before"
          title="Due on or before"
        />
        <label className="toggle">
          <input type="checkbox" name="archived" value="true" defaultChecked={showArchived} />
          Show archived
        </label>
        <div className="filter-actions">
          <button className="button-secondary" type="submit">Apply</button>
          <Link href="/dashboard" className="button-ghost">Reset</Link>
        </div>
      </form>

      <section className="focus-strip">
        <div><span>Active</span><strong>{activeCount}</strong></div>
        <div><span>Blocked</span><strong>{blockedCount}</strong></div>
        <div><span>Overdue</span><strong>{overdueCount}</strong></div>
        <div><span>No update 7+ days</span><strong>{staleCount}</strong></div>
      </section>

      {filtered.length === 0 ? (
        <section className="empty-state">
          <h2>No work items yet</h2>
          <p>Log the first work item to start tracking owner, status, priority, and weekly updates.</p>
          <Link href={writable ? "/work-items/new" : "/login?next=/work-items/new"} className="button-primary">Log Work Item</Link>
        </section>
      ) : (
        <section className="item-grid">
          {filtered.map((item) => {
            const overdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== "complete";
            const stale = item.latestUpdate && (Date.now() - new Date(item.latestUpdate.created_at).getTime()) / 86400000 >= 7;
            return (
              <Link key={item.id} href={`/work-items/${item.id}`} className={`item-card ${item.risk_score >= 0.7 ? "high-risk" : ""}`}>
                <div className="card-row">
                  <div>
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="meta-grid">
                  <span>Owner <strong>{item.owner?.name ?? "Unassigned"}</strong></span>
                  <span>Due <strong><DateText value={item.due_date} /></strong></span>
                  <span>Latest <strong>{item.latestUpdate ? <DateText value={item.latestUpdate.created_at} /> : "No updates"}</strong></span>
                  <span>Risk <strong>{Math.round(item.risk_score * 100)}%</strong></span>
                </div>
                <div className="card-footer">
                  <PriorityBadge priority={item.priority} />
                  {overdue ? <span className="flag">Overdue</span> : null}
                  {stale ? <span className="flag">No update 7+ days</span> : null}
                  {item.archived ? <span className="flag">Archived</span> : null}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </Shell>
  );
}
