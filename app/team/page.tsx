import Link from "next/link";
import { DateText, Metric, Shell } from "@/app/components";
import { getTeamMembers, getWorkItems } from "@/lib/team-success";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, items] = await Promise.all([getTeamMembers(), getWorkItems()]);
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <p className="eyebrow">People</p>
          <h1>Team</h1>
        </div>
      </section>
      <section className="team-grid">
        {members.map((member) => {
          const owned = items.filter((item) => item.owner_id === member.id && !item.archived && item.status !== "complete");
          const latest = items
            .filter((item) => item.owner_id === member.id && item.latestUpdate)
            .sort((a, b) => Number(new Date(b.latestUpdate!.created_at)) - Number(new Date(a.latestUpdate!.created_at)))[0]?.latestUpdate;
          return (
            <article key={member.id} className="panel-card">
              <div className="card-row">
                <div>
                  <h2>{member.name}</h2>
                  <p>{member.email}</p>
                </div>
                <span className="badge">{member.role}</span>
              </div>
              <div className="metric-grid two">
                <Metric label="Active items" value={owned.length} />
                <Metric label="Last update" value={latest ? new Date(latest.created_at).toLocaleDateString() : "None"} />
              </div>
              <div className="owned-list">
                {owned.length === 0 ? <p className="muted">No active items.</p> : owned.map((item) => (
                  <Link key={item.id} href={`/work-items/${item.id}`}>{item.title}</Link>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </Shell>
  );
}
