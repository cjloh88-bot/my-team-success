import { Field, Notice, Shell } from "@/app/components";
import { createWorkItem } from "@/lib/actions";
import { canWrite, getCurrentProfile } from "@/lib/auth";
import { getTeamMembers, priorityOptions, statusOptions } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function NewWorkItemPage({ searchParams }: PageProps) {
  const [members, params, profile] = await Promise.all([getTeamMembers(), searchParams, getCurrentProfile()]);
  const writable = canWrite(profile);
  return (
    <Shell>
      <Notice error={params?.error} success={params?.success} />
      <section className="form-panel">
        <div className="page-heading compact">
          <div>
            <p className="eyebrow">Capture</p>
            <h1>Log Work Item</h1>
          </div>
        </div>
        {!writable ? (
          <div className="empty-state small-state">
            <h2>Login required</h2>
            <p>Members and admins can log work items. Viewers can browse the shared dashboard.</p>
            <a className="button-primary" href="/login?next=/work-items/new">Log In</a>
          </div>
        ) : (
        <form action={createWorkItem} className="stack-form">
          <Field label="Title"><input name="title" required /></Field>
          <Field label="Description"><textarea name="description" rows={4} /></Field>
          <Field label="Owner">
            <select name="owner_id" required>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Priority">
              <select name="priority" defaultValue="medium">
                {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue="not_started">
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Due date"><input name="due_date" type="date" /></Field>
          </div>
          <button className="button-primary" type="submit">Save Work Item</button>
        </form>
        )}
      </section>
    </Shell>
  );
}
