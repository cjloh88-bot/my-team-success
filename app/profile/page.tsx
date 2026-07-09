import Link from "next/link";
import { Metric, Shell } from "@/app/components";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <Shell>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile</h1>
        </div>
      </section>
      {profile ? (
        <section className="form-panel">
          <div className="metric-grid">
            <Metric label="Name" value={profile.member.name} />
            <Metric label="Email" value={profile.user.email ?? profile.member.email ?? "No email"} />
            <Metric label="Role" value={profile.member.role} />
            <Metric label="Member ID" value={profile.member.id.slice(0, 8)} />
          </div>
        </section>
      ) : (
        <section className="empty-state">
          <h2>No active session</h2>
          <p>Log in to create work items, submit weekly updates, and see your assigned role.</p>
          <Link href="/login?next=/profile" className="button-primary">Log In</Link>
        </section>
      )}
    </Shell>
  );
}
