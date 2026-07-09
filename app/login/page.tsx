import { Field, Notice, Shell } from "@/app/components";
import { signIn, signUp } from "@/lib/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const next = params.next ?? "/dashboard";
  const signupMode = params.mode === "signup";

  return (
    <Shell>
      <Notice error={params.error} success={params.success} />
      <section className="auth-grid">
        <div className="form-panel">
          <div className="page-heading compact">
            <div>
              <p className="eyebrow">Access</p>
              <h1>{signupMode ? "Create Account" : "Log In"}</h1>
            </div>
          </div>
          <form action={signupMode ? signUp : signIn} className="stack-form">
            <input type="hidden" name="next" value={next} />
            {signupMode ? <Field label="Name"><input name="name" required /></Field> : null}
            <Field label="Email"><input name="email" type="email" required /></Field>
            <Field label="Password"><input name="password" type="password" minLength={6} required /></Field>
            <button className="button-primary" type="submit">{signupMode ? "Create Account" : "Log In"}</button>
          </form>
          <div className="card-footer">
            {signupMode ? (
              <a className="button-ghost" href={`/login?next=${encodeURIComponent(next)}`}>Use an existing account</a>
            ) : (
              <a className="button-ghost" href={`/login?mode=signup&next=${encodeURIComponent(next)}`}>Create an account</a>
            )}
          </div>
        </div>
        <aside className="side-panel static-panel">
          <h2>Roles</h2>
          <p className="muted">Admins manage members and all work. Members can create work and submit updates. Viewers can read the shared picture without changing records.</p>
        </aside>
      </section>
    </Shell>
  );
}
