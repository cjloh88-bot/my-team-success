import Link from "next/link";
import { signOut } from "@/lib/actions";
import { getCurrentProfile } from "@/lib/auth";
import { formatDate, priorityLabel, statusLabel, type Priority, type Status } from "@/lib/team-success";
import { AppNavigation } from "@/app/navigation";

export async function Shell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const signedIn = Boolean(profile);
  const admin = profile?.member.role === "admin";
  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <Link href="/dashboard" className="sidebar-brand">my-team-success</Link>
        <AppNavigation className="sidebar-nav" signedIn={signedIn} admin={admin} />
        <div className="sidebar-footer">
          <Link className="button-primary sidebar-command" href="/work-items/new">Log Work Item</Link>
          {profile ? (
            <>
              <div className="sidebar-identity">
                <strong>{profile.member.name}</strong>
                <span className="badge">{profile.member.role}</span>
              </div>
              <form action={signOut}>
                <button className="button-ghost sidebar-command" type="submit">Sign Out</button>
              </form>
            </>
          ) : (
            <>
              <p className="sidebar-note">Viewing demo data</p>
              <Link className="button-secondary sidebar-command" href="/login">Log In</Link>
            </>
          )}
        </div>
      </aside>

      <section className="app-frame">
        <header className="mobile-header">
          <Link href="/dashboard" className="mobile-brand">my-team-success</Link>
          <details className="mobile-menu">
            <summary className="mobile-menu-trigger">Menu</summary>
            <div className="mobile-menu-panel">
              <AppNavigation className="mobile-nav" signedIn={signedIn} admin={admin} />
              <Link className="button-primary mobile-command" href="/work-items/new">Log Work Item</Link>
              {profile ? (
                <form action={signOut}><button className="button-ghost mobile-command" type="submit">Sign Out</button></form>
              ) : (
                <Link className="button-secondary mobile-command" href="/login">Log In</Link>
              )}
            </div>
          </details>
        </header>
        {profile ? (
          <div className="identity-bar mobile-identity">
            <span>{profile.member.name}</span>
            <span className="badge">{profile.member.role}</span>
          </div>
        ) : null}
        <div className="app-page">{children}</div>
      </section>
    </main>
  );
}

export function Notice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <div className={error ? "notice-error" : "notice-success"}>
      {error ?? success}
    </div>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge status-${status}`}>{statusLabel(status)}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge priority-${priority}`}>{priorityLabel(priority)}</span>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function DateText({ value }: { value: string | null }) {
  return <time>{formatDate(value)}</time>;
}
