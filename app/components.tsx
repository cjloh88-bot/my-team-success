import Link from "next/link";
import { signOut } from "@/lib/actions";
import { getCurrentProfile } from "@/lib/auth";
import { formatDate, priorityLabel, statusLabel, type Priority, type Status } from "@/lib/team-success";

export async function Shell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">my-team-success</Link>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="nav-link" href="/dashboard">Dashboard</Link>
            <Link className="nav-link" href="/team">Team</Link>
            <Link className="nav-link" href="/activity">Activity</Link>
            <Link className="nav-link" href="/profile">Profile</Link>
            <Link className="button-primary" href="/work-items/new">Log Work Item</Link>
            {profile ? (
              <form action={signOut}>
                <button className="button-ghost" type="submit">Sign Out</button>
              </form>
            ) : (
              <Link className="button-secondary" href="/login">Log In</Link>
            )}
          </nav>
        </div>
        {profile ? (
          <div className="identity-bar">
            <span>{profile.member.name}</span>
            <span className="badge">{profile.member.role}</span>
          </div>
        ) : (
          <div className="identity-bar">
            <span>Viewing demo data. Log in to create, edit, or submit updates.</span>
          </div>
        )}
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6">{children}</div>
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
