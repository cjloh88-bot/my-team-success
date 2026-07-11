import Link from "next/link";
import { Metric, Notice, Shell } from "@/app/components";
import { deliverQueuedNotifications, queueOverdueReminders, refreshRiskScores } from "@/lib/actions";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { isSlackConfigured } from "@/lib/notifications";
import { getTeamInsightReport } from "@/lib/team-success";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

const trendLabel = {
  up: "More updates than last week",
  steady: "Same update pace",
  down: "Fewer updates than last week",
  no_data: "No recent update history",
} as const;

export default async function InsightsPage({ searchParams }: PageProps) {
  const [report, profile, params] = await Promise.all([getTeamInsightReport(), getCurrentProfile(), searchParams]);
  const admin = isAdmin(profile);
  const slackConfigured = isSlackConfigured();

  return (
    <Shell>
      <Notice error={params?.error} success={params?.success} />
      <section className="page-heading">
        <div>
          <p className="eyebrow">Intelligence layer</p>
          <h1>Insights</h1>
        </div>
      </section>

      {admin ? (
        <section className="form-panel admin-panel">
          <div className="card-row">
            <div>
              <h2>Automation controls</h2>
              <p>Risk scoring and reminder queueing stay inside the app. Slack delivery only becomes available after its server-side webhook is configured.</p>
            </div>
            <span className={`badge ${slackConfigured ? "status-complete" : ""}`}>{slackConfigured ? "Slack connected" : "Slack not connected"}</span>
          </div>
          <div className="button-row">
            <form action={refreshRiskScores}><button className="button-secondary" type="submit">Refresh Risk Scores</button></form>
            <form action={queueOverdueReminders}><button className="button-secondary" type="submit">Queue Due Reminders</button></form>
            <form action={deliverQueuedNotifications}><button className="button-primary" type="submit" disabled={!slackConfigured}>Send Queued Slack Reminders</button></form>
          </div>
        </section>
      ) : (
        <section className="empty-state small-state">
          <h2>Admin controls</h2>
          <p>All team members can read workload signals. Only admins can generate insights, queue reminders, or send notifications.</p>
        </section>
      )}

      <section className="focus-strip insight-summary">
        <div><span>High risk</span><strong>{report.highRiskItems.length}</strong></div>
        <div><span>Needs update</span><strong>{report.staleItems.length}</strong></div>
        <div><span>Queued reminders</span><strong>{report.queuedNotifications.filter((delivery) => delivery.status === "queued").length}</strong></div>
        <div><span>Sent reminders</span><strong>{report.queuedNotifications.filter((delivery) => delivery.status === "sent").length}</strong></div>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Capacity</p>
          <h2>Team workload</h2>
        </div>
        <p className="muted">Score combines active assignments, reported hours, high-risk items, and overdue work.</p>
      </section>
      <section className="team-grid">
        {report.workloads.map((workload) => (
          <article key={workload.member.id} className="panel-card">
            <div className="card-row">
              <div>
                <h2>{workload.member.name}</h2>
                <p>{trendLabel[workload.trend]}</p>
              </div>
              <span className={`badge ${workload.workloadScore >= 70 ? "risk-high" : workload.workloadScore >= 45 ? "risk-medium" : "risk-low"}`}>Load {workload.workloadScore}</span>
            </div>
            <div className="metric-grid two">
              <Metric label="Active items" value={workload.activeItems} />
              <Metric label="High risk" value={workload.highRiskItems} />
              <Metric label="Hours this week" value={workload.currentWeekHours.toFixed(1)} />
              <Metric label="Updates this week" value={workload.currentWeekUpdates} />
            </div>
          </article>
        ))}
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Attention</p>
          <h2>Risk and update gaps</h2>
        </div>
      </section>
      <section className="history">
        {[...report.highRiskItems, ...report.staleItems.filter((item) => !report.highRiskItems.some((risk) => risk.id === item.id))].length === 0 ? (
          <div className="empty-state small-state"><h2>All clear</h2><p>No active work items need attention right now.</p></div>
        ) : (
          [...report.highRiskItems, ...report.staleItems.filter((item) => !report.highRiskItems.some((risk) => risk.id === item.id))].map((item) => (
            <article key={item.id} className={`timeline-card ${item.risk_score >= 0.7 ? "high-risk" : ""}`}>
              <div className="card-row">
                <div>
                  <h2>{item.title}</h2>
                  <p>Owner {item.owner?.name ?? "Unassigned"} · risk {Math.round(item.risk_score * 100)}%</p>
                </div>
                <Link className="button-ghost" href={`/work-items/${item.id}`}>Open</Link>
              </div>
            </article>
          ))
        )}
      </section>

      {admin ? (
        <section className="history notification-history">
          <div className="section-heading"><div><p className="eyebrow">Delivery</p><h2>Reminder queue</h2></div></div>
          {report.queuedNotifications.length === 0 ? <p className="muted">No reminder deliveries have been queued.</p> : report.queuedNotifications.map((delivery) => (
            <article key={delivery.id} className="timeline-card">
              <div className="card-row">
                <div><strong>{delivery.notification_type.replaceAll("_", " ")}</strong><p>{delivery.message}</p></div>
                <span className={`badge ${delivery.status === "sent" ? "status-complete" : delivery.status === "failed" ? "status-blocked" : ""}`}>{delivery.status}</span>
              </div>
              {delivery.error_message ? <p className="blocker">Delivery error: {delivery.error_message}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </Shell>
  );
}
