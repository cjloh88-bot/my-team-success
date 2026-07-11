import Link from "next/link";
import { DateText, PriorityBadge, Shell, StatusBadge } from "@/app/components";
import { getCurrentProfile } from "@/lib/auth";
import { getWorkItems, type WorkItemView } from "@/lib/team-success";

export const dynamic = "force-dynamic";

function isOverdue(item: WorkItemView) {
  return Boolean(item.due_date && new Date(`${item.due_date}T00:00:00`) < new Date() && item.status !== "complete");
}

function needsUpdate(item: WorkItemView) {
  if (item.status === "complete") return false;
  if (!item.latestUpdate) return true;
  return (Date.now() - new Date(item.latestUpdate.created_at).getTime()) / 86400000 >= 7;
}

function WorkList({ title, items, empty }: { title: string; items: WorkItemView[]; empty: string }) {
  return (
    <section className="work-section">
      <div className="section-heading"><div><h2>{title}</h2></div><span className="badge">{items.length}</span></div>
      {items.length === 0 ? <p className="muted">{empty}</p> : (
        <div className="item-grid">
          {items.map((item) => (
            <Link key={item.id} href={`/work-items/${item.id}`} className={`item-card ${item.risk_score >= 0.7 ? "high-risk" : ""}`}>
              <div className="card-row">
                <div><h2>{item.title}</h2><p>{item.description}</p></div>
                <StatusBadge status={item.status} />
              </div>
              <div className="meta-grid">
                <span>Due <strong><DateText value={item.due_date} /></strong></span>
                <span>Latest <strong>{item.latestUpdate ? <DateText value={item.latestUpdate.created_at} /> : "No update"}</strong></span>
                <span>Risk <strong>{Math.round(item.risk_score * 100)}%</strong></span>
                <span>Priority <strong>{item.priority}</strong></span>
              </div>
              <div className="card-footer">
                <PriorityBadge priority={item.priority} />
                {isOverdue(item) ? <span className="flag risk-high">Overdue</span> : null}
                {needsUpdate(item) ? <span className="flag">Update due</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function MyWorkPage() {
  const [profile, items] = await Promise.all([getCurrentProfile(), getWorkItems()]);
  if (!profile) {
    return (
      <Shell>
        <section className="empty-state">
          <h1>My Work</h1>
          <p>Log in to see assignments and weekly updates that need your attention.</p>
          <Link className="button-primary" href="/login?next=/my-work">Log In</Link>
        </section>
      </Shell>
    );
  }

  const owned = items.filter((item) => item.owner_id === profile.member.id && !item.archived);
  const overdue = owned.filter(isOverdue);
  const updateDue = owned.filter((item) => needsUpdate(item) && !isOverdue(item));
  const active = owned.filter((item) => item.status !== "complete" && !isOverdue(item) && !needsUpdate(item));
  const completed = owned.filter((item) => item.status === "complete");

  return (
    <Shell>
      <section className="page-heading">
        <div><p className="eyebrow">Personal queue</p><h1>My Work</h1></div>
        <Link className="button-primary" href="/work-items/new">Log Work Item</Link>
      </section>
      <section className="focus-strip">
        <div><span>Overdue</span><strong>{overdue.length}</strong></div>
        <div><span>Update due</span><strong>{updateDue.length}</strong></div>
        <div><span>On track</span><strong>{active.length}</strong></div>
        <div><span>Complete</span><strong>{completed.length}</strong></div>
      </section>
      <WorkList title="Needs attention" items={[...overdue, ...updateDue]} empty="Nothing needs attention." />
      <WorkList title="On track" items={active} empty="No active work is currently on track." />
      <WorkList title="Recently completed" items={completed.slice(0, 6)} empty="No completed work yet." />
    </Shell>
  );
}
