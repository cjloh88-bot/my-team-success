import Link from "next/link";
import { Field, Metric, Notice, Shell } from "@/app/components";
import { createTeamMember, deleteTeamMember, updateTeamMember } from "@/lib/actions";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { getTeamMembers, getWorkItems } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

const roleOptions = ["admin", "member", "viewer"];

export default async function TeamPage({ searchParams }: PageProps) {
  const [members, items, profile, params] = await Promise.all([getTeamMembers(), getWorkItems(), getCurrentProfile(), searchParams]);
  const admin = isAdmin(profile);
  return (
    <Shell>
      <Notice error={params?.error} success={params?.success} />
      <section className="page-heading">
        <div>
          <p className="eyebrow">People</p>
          <h1>Team</h1>
        </div>
      </section>

      {admin ? (
        <section className="form-panel admin-panel">
          <h2>Add Member</h2>
          <form action={createTeamMember} className="inline-form">
            <Field label="Name"><input name="name" required /></Field>
            <Field label="Email"><input name="email" type="email" /></Field>
            <Field label="Role">
              <select name="role" defaultValue="member">
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </Field>
            <button className="button-primary" type="submit">Add</button>
          </form>
        </section>
      ) : null}

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
              {admin ? (
                <div className="admin-member-tools">
                  <form action={updateTeamMember} className="stack-form">
                    <input type="hidden" name="id" value={member.id} />
                    <div className="form-grid">
                      <Field label="Name"><input name="name" defaultValue={member.name} required /></Field>
                      <Field label="Email"><input name="email" type="email" defaultValue={member.email ?? ""} /></Field>
                      <Field label="Role">
                        <select name="role" defaultValue={member.role}>
                          {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </Field>
                    </div>
                    <button className="button-secondary" type="submit">Save Member</button>
                  </form>
                  <form action={deleteTeamMember}>
                    <input type="hidden" name="id" value={member.id} />
                    <button className="button-danger" type="submit">Delete Member</button>
                  </form>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </Shell>
  );
}
