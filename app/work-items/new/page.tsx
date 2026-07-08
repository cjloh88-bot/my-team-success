import { Field, Notice, Shell } from "@/app/components";
import { createWorkItem } from "@/lib/actions";
import { getTeamMembers, priorityOptions, statusOptions } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function NewWorkItemPage({ searchParams }: PageProps) {
  const [members, params] = await Promise.all([getTeamMembers(), searchParams]);
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
      </section>
    </Shell>
  );
}
