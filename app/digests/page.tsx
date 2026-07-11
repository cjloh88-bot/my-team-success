import { Field, Notice, Shell } from "@/app/components";
import { draftWeeklyDigest, publishWeeklyDigest, reviewWeeklyDigest } from "@/lib/actions";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { currentWeekStart, formatDate, getWeeklyDigests } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function DigestsPage({ searchParams }: PageProps) {
  const [digests, profile, params] = await Promise.all([getWeeklyDigests(), getCurrentProfile(), searchParams]);
  const admin = isAdmin(profile);

  return (
    <Shell>
      <Notice error={params?.error} success={params?.success} />
      <section className="page-heading">
        <div>
          <p className="eyebrow">Weekly review</p>
          <h1>Digests</h1>
        </div>
      </section>

      {admin ? (
        <section className="form-panel admin-panel">
          <h2>Draft Weekly Digest</h2>
          <form action={draftWeeklyDigest} className="inline-form digest-form">
            <Field label="Week start">
              <input name="week_start" type="date" defaultValue={currentWeekStart()} />
            </Field>
            <button className="button-primary" type="submit">Draft Digest</button>
          </form>
        </section>
      ) : (
        <section className="empty-state small-state">
          <h2>Admin review area</h2>
          <p>Admins can draft, approve, reject, and publish weekly digests. Published digests are visible here for the team.</p>
        </section>
      )}

      <section className="history">
        {digests.length === 0 ? (
          <div className="empty-state">
            <h2>No digests yet</h2>
            <p>Draft the first weekly digest after team members submit updates.</p>
          </div>
        ) : (
          digests.map((digest) => (
            <article key={digest.id} className="timeline-card">
              <div className="card-row">
                <div>
                  <h2>Week of {formatDate(digest.week_start)}</h2>
                  <p>{digest.summary_source ?? "manual"} · confidence {Math.round(Number(digest.summary_confidence ?? 0) * 100)}%</p>
                </div>
                <div className="card-footer">
                  <span className="badge">{digest.summary_review_status}</span>
                  {digest.published ? <span className="badge status-complete">Published</span> : <span className="badge">Draft</span>}
                </div>
              </div>
              <pre className="digest-text">{digest.summary_text}</pre>
              {admin ? (
                <div className="button-row">
                  <form action={reviewWeeklyDigest}>
                    <input type="hidden" name="id" value={digest.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button className="button-secondary" type="submit">Approve</button>
                  </form>
                  <form action={reviewWeeklyDigest}>
                    <input type="hidden" name="id" value={digest.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className="button-ghost" type="submit">Reject</button>
                  </form>
                  <form action={publishWeeklyDigest}>
                    <input type="hidden" name="id" value={digest.id} />
                    <button className="button-primary" type="submit" disabled={digest.summary_review_status !== "approved" || digest.published}>
                      Publish
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </Shell>
  );
}
