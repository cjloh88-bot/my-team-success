# Tasks & Sprints

## Implementation Status

All Sprint 1-4 product code is implemented in this repository, including the AI-enabled digest fallback, role-aware workflows, dashboard filters, intelligence view, and reminder queue. The remaining activation work is external: apply `supabase/migrations/0002_lockdown_rls.sql` and `supabase/migrations/0003_intelligence_and_notifications.sql` to the production Supabase database, then configure optional Vercel environment variables for OpenAI, Slack, and the scheduled reminder secret.

## Sprint 1 — Database & Core Work Item Engine
**Goal:** The one core action works end-to-end: a team member logs a work item and submits a weekly update; the shared dashboard reflects it instantly. No login required.

- [ ] Apply migration SQL (all tables, RLS v1 open policies, seed data)
- [ ] `/dashboard` page — work items list with status badge, owner, last update, priority; sorted by status
- [ ] Work item detail page — title, description, owner, due date, full weekly update history
- [ ] "Log Work Item" form — title, description, owner (select), priority, due date, status; POST to `work_items`
- [ ] "Submit Weekly Update" form — status, progress notes, blockers, hours; POST to `weekly_updates`; sets `is_current = true`, flips previous to false; updates `work_items.status`; writes `activities` row
- [ ] Status transition guard: validate allowed transitions before save
- [ ] Empty state on dashboard (no items yet), loading skeleton, error toast
- [ ] Supabase client set up with anon key; no secrets in frontend

**Definition of Done:** A new browser tab opens `/dashboard`, sees seeded work items, clicks one, reads update history, submits a new weekly update, and the dashboard shows the updated status — all without logging in.

> ✅ **v1 functional milestone** — success scenario is fully usable at end of Sprint 1.

---

## Sprint 2 — Team Views, Filters & Activity Feed
**Goal:** Team lead can see the full team picture; filtering and the activity feed are live.

- [ ] Team member list page — each person, their active items count, last update date
- [ ] Dashboard filter bar — filter by status, owner, priority
- [ ] Activity feed page — chronological log of all actions across work items
- [ ] Edit work item (title, description, due date, priority)
- [ ] Archive work item (sets `archived = true`; hidden from default dashboard view)
- [ ] "Show archived" toggle on dashboard
- [ ] Risk score computed on update submit (rule-based: days overdue + blocked flag); stored on work item
- [ ] High-risk items highlighted on dashboard

**Definition of Done:** Filtering works; activity feed shows real entries; archived items hidden by default; risk score visible on work item cards.

---

## Sprint 3 — Lock It Down (Auth & Per-User Isolation)
**Goal:** Real users log in; their data is scoped; demo data still visible to anonymous visitors.

- [ ] Supabase Auth — email/password signup + login + logout
- [ ] On form submit, attach `auth.uid()` as `user_id` on new records
- [ ] Replace v1 open RLS with owner-scoped policies: `auth.uid() = user_id` for writes
- [ ] Admin role can read/write all records regardless of user_id
- [ ] Viewer role: read-only enforced at RLS level
- [ ] Profile page — display name, email, role
- [ ] Redirect unauthenticated users attempting writes to login page
- [ ] Seeded demo rows retain null user_id and remain publicly readable

**Definition of Done:** A logged-in member can only edit their own records; an admin can edit any record; an unauthenticated visitor can view the dashboard but cannot submit forms.

---

## Sprint 4 — Intelligence & Weekly Digest
**Goal:** AI-drafted weekly summaries reduce admin overhead; overdue items are flagged automatically.

- [ ] `draft_weekly_digest(week_start)` tool — calls LLM with all updates for the week; stores result with `source`, `confidence`, `review_status = 'unreviewed'`
- [ ] Admin digest review page — view draft, approve or reject
- [ ] `publish_digest(digest_id)` — sets `published = true` after approval; writes audit log
- [ ] Overdue detection — items where `due_date < today` and `status != 'complete'` highlighted in red
- [ ] No-update alert — items with no update in 7+ days flagged on dashboard
- [ ] All agent actions logged to `audit_logs` with before/after state

**Definition of Done:** Admin sees AI digest draft, approves it, it appears as published; overdue and no-update items are visually flagged.

---

## Gantt
```
Week 1  |-- Sprint 1: DB + Core Engine (v1 functional) --|
Week 2  |-- Sprint 2: Team Views + Filters + Risk Scores --|
Week 3  |-- Sprint 3: Auth + Lock Down --|
Week 4  |-- Sprint 4: AI Digest + Overdue Flags --|
```
