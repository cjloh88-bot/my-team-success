import Link from "next/link";
import { DateText, Shell } from "@/app/components";
import { getActivities } from "@/lib/team-success";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const activities = await getActivities();
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Chronological log</p>
          <h1>Activity Feed</h1>
        </div>
      </section>
      <section className="history">
        {activities.length === 0 ? (
          <div className="empty-state">
            <h2>No activity yet</h2>
            <p>Submitted updates, edits, and archives will appear here once the database records them.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <article key={activity.id} className="timeline-card">
              <div className="card-row">
                <div>
                  <strong>{activity.action.replaceAll("_", " ")}</strong>
                  <p>{activity.actorName} · <DateText value={activity.created_at} /></p>
                </div>
                <Link className="button-ghost" href={`/work-items/${activity.work_item_id}`}>Open</Link>
              </div>
              <p>{activity.itemTitle}</p>
            </article>
          ))
        )}
      </section>
    </Shell>
  );
}
