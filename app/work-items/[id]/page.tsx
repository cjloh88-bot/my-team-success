import Link from "next/link";
import { notFound } from "next/navigation";
import { DateText, Field, Metric, Notice, PriorityBadge, Shell, StatusBadge } from "@/app/components";
import { archiveWorkItem, submitWeeklyUpdate } from "@/lib/actions";
import { canWrite, getCurrentProfile, isAdmin } from "@/lib/auth";
import { getWorkItem, statusOptions } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function WorkItemDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [data, profile] = await Promise.all([getWorkItem(id), getCurrentProfile()]);
  if (!data) notFound();
  const { item, members, updates, activities } = data;
  const writable = canWrite(profile);
  const canManageItem = isAdmin(profile) || (writable && profile?.member.id === item.owner_id);
  const submittedBy = isAdmin(profile) ? item.owner_id ?? profile?.member.id ?? "" : profile?.member.id ?? "";

  return (
    <Shell>
      <Notice error={query?.error} success={query?.success} />
      <section className="detail-layout">
        <div className="detail-main">
          <div className="page-heading compact">
            <div>
              <p className="eyebrow">Work item</p>
              <h1>{item.title}</h1>
            </div>
            {canManageItem ? <div className="button-row">
              <Link className="button-secondary" href={`/work-items/${item.id}/edit`}>Edit</Link>
              <form action={archiveWorkItem}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="actor_id" value={item.owner_id ?? ""} />
                <button className="button-ghost" type="submit">Archive</button>
              </form>
            </div> : null}
          </div>
          <p className="lead">{item.description}</p>
          <div className="metric-grid">
            <Metric label="Owner" value={item.owner?.name ?? "Unassigned"} />
            <Metric label="Due" value={item.due_date ? new Date(item.due_date).toLocaleDateString() : "No date"} />
            <Metric label="Updates" value={updates.length} />
            <Metric label="Risk" value={`${Math.round(item.risk_score * 100)}%`} />
          </div>
          <div className="card-footer">
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
          </div>

          <section className="history">
            <h2>Update History</h2>
            {updates.length === 0 ? (
              <p className="muted">No updates submitted yet.</p>
            ) : (
              updates.map((update) => {
                const actor = members.find((member) => member.id === update.submitted_by);
                return (
                  <article key={update.id} className="timeline-card">
                    <div className="card-row">
                      <div>
                        <strong>{actor?.name ?? "Team member"}</strong>
                        <p><DateText value={update.created_at} /> · {update.hours_spent ?? 0} hours</p>
                      </div>
                      <StatusBadge status={update.status} />
                    </div>
                    <p>{update.progress_notes}</p>
                    {update.blockers ? <p className="blocker">Blocker: {update.blockers}</p> : null}
                  </article>
                );
              })
            )}
          </section>
        </div>

        <aside className="side-panel">
          <h2>Submit Weekly Update</h2>
          {!writable ? (
            <div className="empty-state small-state">
              <h2>Login required</h2>
              <p>Members and admins can submit weekly updates. Viewers can read update history.</p>
              <Link href={`/login?next=/work-items/${item.id}`} className="button-primary">Log In</Link>
            </div>
          ) : (
          <form action={submitWeeklyUpdate} className="stack-form">
            <input type="hidden" name="work_item_id" value={item.id} />
            <Field label="Submitted by">
              <select name="submitted_by" defaultValue={submittedBy} required>
                {isAdmin(profile)
                  ? members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)
                  : <option value={profile?.member.id}>{profile?.member.name}</option>}
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={item.status}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Progress notes"><textarea name="progress_notes" rows={5} required /></Field>
            <Field label="Blockers"><textarea name="blockers" rows={3} /></Field>
            <Field label="Hours"><input name="hours_spent" type="number" min="0" step="0.25" defaultValue="1" /></Field>
            <button className="button-primary" type="submit">Submit Weekly Update</button>
          </form>
          )}

          <div className="activity-mini">
            <h2>Recent Activity</h2>
            {activities.length === 0 ? <p className="muted">No activity logged yet.</p> : activities.map((activity) => (
              <p key={activity.id}><strong>{activity.action.replaceAll("_", " ")}</strong><br /><DateText value={activity.created_at} /></p>
            ))}
          </div>
        </aside>
      </section>
    </Shell>
  );
}
