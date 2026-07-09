import { notFound } from "next/navigation";
import { Field, Notice, Shell } from "@/app/components";
import { updateWorkItem } from "@/lib/actions";
import { canWrite, getCurrentProfile, isAdmin } from "@/lib/auth";
import { getWorkItem, priorityOptions } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function EditWorkItemPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [data, profile] = await Promise.all([getWorkItem(id), getCurrentProfile()]);
  if (!data) notFound();
  const { item, members } = data;
  const canEdit = isAdmin(profile) || (canWrite(profile) && profile?.member.id === item.owner_id);

  return (
    <Shell>
      <Notice error={query?.error} success={query?.success} />
      <section className="form-panel">
        <div className="page-heading compact">
          <div>
            <p className="eyebrow">Maintain</p>
            <h1>Edit Work Item</h1>
          </div>
        </div>
        {!canEdit ? (
          <div className="empty-state small-state">
            <h2>Admin or owner required</h2>
            <p>You can view this work item, but only admins and the assigned owner can edit it.</p>
          </div>
        ) : (
        <form action={updateWorkItem} className="stack-form">
          <input type="hidden" name="id" value={item.id} />
          <Field label="Title"><input name="title" defaultValue={item.title} required /></Field>
          <Field label="Description"><textarea name="description" rows={4} defaultValue={item.description ?? ""} /></Field>
          <Field label="Owner">
            <select name="owner_id" defaultValue={item.owner_id ?? ""} required>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Priority">
              <select name="priority" defaultValue={item.priority}>
                {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Due date"><input name="due_date" type="date" defaultValue={item.due_date ?? ""} /></Field>
          </div>
          <button className="button-primary" type="submit">Save Changes</button>
        </form>
        )}
      </section>
    </Shell>
  );
}
