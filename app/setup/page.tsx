import { Shell } from "@/app/components";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { getDeploymentReadiness } from "@/lib/team-success";

export const dynamic = "force-dynamic";

function StatusRow({ label, ready, value }: { label: string; ready: boolean; value: string }) {
  return (
    <article className="readiness-row">
      <span className={`readiness-dot ${ready ? "ready" : "pending"}`} aria-hidden="true" />
      <div><strong>{label}</strong><p>{value}</p></div>
      <span className={`badge ${ready ? "status-complete" : "priority-medium"}`}>{ready ? "Ready" : "Pending"}</span>
    </article>
  );
}

export default async function SetupPage() {
  const [profile, readiness] = await Promise.all([getCurrentProfile(), getDeploymentReadiness()]);
  if (!isAdmin(profile)) {
    return <Shell><section className="empty-state"><h1>Setup</h1><p>Administrator access is required.</p></section></Shell>;
  }

  return (
    <Shell>
      <section className="page-heading"><div><p className="eyebrow">Operations</p><h1>Setup</h1></div></section>
      <section className="readiness-list">
        <StatusRow label="Database" ready={readiness.databaseConnected} value={readiness.databaseConnected ? `${readiness.databaseMode} database connected` : "Database connection unavailable"} />
        <StatusRow label="Database migrations" ready={readiness.missingMigrations.length === 0} value={readiness.missingMigrations.length === 0 ? "All application migrations applied" : `Missing: ${readiness.missingMigrations.join(", ")}`} />
        <StatusRow label="Server credentials" ready={readiness.serviceRoleConfigured} value={readiness.serviceRoleConfigured ? "Service role available to server actions" : "SUPABASE_SERVICE_ROLE_KEY is missing"} />
        <StatusRow label="Scheduled reminders" ready={readiness.cronConfigured} value={readiness.cronConfigured ? "Reminder endpoint protected" : "CRON_SECRET is missing"} />
        <StatusRow label="AI summaries" ready={readiness.openAIConfigured} value={readiness.openAIConfigured ? "OpenAI drafting enabled" : "Rule-based summaries active"} />
        <StatusRow label="Slack notifications" ready={readiness.slackConfigured} value={readiness.slackConfigured ? "Slack delivery enabled" : "In-app reminder queue only"} />
      </section>
      <section className="section-heading"><div><p className="eyebrow">Applied versions</p><h2>Migrations</h2></div></section>
      <div className="migration-list">
        {readiness.appliedMigrations.length === 0 ? <p className="muted">No migration markers found.</p> : readiness.appliedMigrations.map((migration) => <span key={migration} className="badge status-complete">{migration}</span>)}
      </div>
    </Shell>
  );
}
