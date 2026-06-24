# PRD — my-team-success

## Problem
The team tracks work items, statuses, and progress in spreadsheets and chat. There is no single shared view, updates are lost, and status is always stale.

## Target User
An internal department team of 3–10 people: a team lead (Admin) and individual contributors (Members) who report progress weekly.

## Core Objects
- **Work Item** — a task or project the team is actively tracking
- **Weekly Update** — a status snapshot submitted against a work item each week
- **Team Member** — a person on the team with a name, email, and role
- **Activity** — a timestamped log of every meaningful change
- **Weekly Digest** — an AI-drafted summary of the week's updates (later)

## MVP Checklist (v1 must-haves)
- [ ] Dashboard lists all work items with current status, owner, and latest update
- [ ] Any team member can log a new work item (title, description, owner, due date, priority, status)
- [ ] Any team member can submit a weekly update (status, progress notes, blockers, hours)
- [ ] Work item detail page shows full update history
- [ ] Status transitions enforced: Not Started → In Progress → Blocked → Complete
- [ ] Empty, loading, and error states handled everywhere
- [ ] Seed demo data so the app is live on first load without login

## Non-Goals (v1)
- Login/auth wall, per-user data isolation
- Email or Slack notifications
- AI summaries or risk scoring
- Mobile-native app

## Success Criteria
Jordan (team lead) opens the dashboard, sees all five active work items, clicks into "Q3 Vendor Contract Renewal", reads Sam's latest blocker note, and submits a new weekly update with status "In Progress" and a progress note — the dashboard immediately reflects the new status without a page reload.
