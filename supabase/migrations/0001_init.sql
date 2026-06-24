create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  email text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);
alter table team_members enable row level security;
drop policy if exists "team_members_v1_read" on team_members;
create policy "team_members_v1_read" on team_members for select using (true);
drop policy if exists "team_members_v1_write" on team_members;
create policy "team_members_v1_write" on team_members for all using (true) with check (true);

create table if not exists work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  owner_id uuid references team_members(id),
  status text not null default 'not_started',
  priority text not null default 'medium',
  due_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
alter table work_items enable row level security;
drop policy if exists "work_items_v1_read" on work_items;
create policy "work_items_v1_read" on work_items for select using (true);
drop policy if exists "work_items_v1_write" on work_items;
create policy "work_items_v1_write" on work_items for all using (true) with check (true);

create table if not exists weekly_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  work_item_id uuid references work_items(id) on delete cascade,
  submitted_by uuid references team_members(id),
  week_start date not null,
  status text not null,
  progress_notes text,
  blockers text,
  hours_spent numeric,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
alter table weekly_updates enable row level security;
drop policy if exists "weekly_updates_v1_read" on weekly_updates;
create policy "weekly_updates_v1_read" on weekly_updates for select using (true);
drop policy if exists "weekly_updates_v1_write" on weekly_updates;
create policy "weekly_updates_v1_write" on weekly_updates for all using (true) with check (true);

create table if not exists weekly_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  week_start date not null,
  summary_text text,
  summary_source text,
  summary_confidence numeric,
  summary_review_status text default 'unreviewed',
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table weekly_digests enable row level security;
drop policy if exists "weekly_digests_v1_read" on weekly_digests;
create policy "weekly_digests_v1_read" on weekly_digests for select using (true);
drop policy if exists "weekly_digests_v1_write" on weekly_digests;
create policy "weekly_digests_v1_write" on weekly_digests for all using (true) with check (true);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  work_item_id uuid references work_items(id) on delete cascade,
  actor_id uuid references team_members(id),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table activities enable row level security;
drop policy if exists "activities_v1_read" on activities;
create policy "activities_v1_read" on activities for select using (true);
drop policy if exists "activities_v1_write" on activities;
create policy "activities_v1_write" on activities for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  actor_id uuid references team_members(id),
  table_name text not null,
  record_id uuid,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into team_members (id, name, email, role) values
  ('a1000000-0000-0000-0000-000000000001', 'Jordan Lee', 'jordan@example.com', 'admin'),
  ('a1000000-0000-0000-0000-000000000002', 'Sam Rivera', 'sam@example.com', 'member'),
  ('a1000000-0000-0000-0000-000000000003', 'Alex Kim', 'alex@example.com', 'member'),
  ('a1000000-0000-0000-0000-000000000004', 'Casey Patel', 'casey@example.com', 'viewer');

insert into work_items (id, title, description, owner_id, status, priority, due_date) values
  ('b1000000-0000-0000-0000-000000000001', 'Q3 Vendor Contract Renewal', 'Renew contracts with three key vendors before end of quarter.', 'a1000000-0000-0000-0000-000000000001', 'in_progress', 'high', current_date + 14),
  ('b1000000-0000-0000-0000-000000000002', 'Onboarding Process Update', 'Revise onboarding checklist and update shared drive materials.', 'a1000000-0000-0000-0000-000000000002', 'in_progress', 'medium', current_date + 7),
  ('b1000000-0000-0000-0000-000000000003', 'Monthly Reporting Template', 'Standardise the monthly ops report and get sign-off from leads.', 'a1000000-0000-0000-0000-000000000003', 'blocked', 'high', current_date + 3),
  ('b1000000-0000-0000-0000-000000000004', 'Team Tooling Audit', 'Inventory all current tools and flag redundant subscriptions.', 'a1000000-0000-0000-0000-000000000002', 'not_started', 'low', current_date + 21),
  ('b1000000-0000-0000-0000-000000000005', 'Budget Tracker Handover', 'Transfer ownership of budget tracker spreadsheet to new lead.', 'a1000000-0000-0000-0000-000000000001', 'complete', 'medium', current_date - 2);

insert into weekly_updates (work_item_id, submitted_by, week_start, status, progress_notes, blockers, hours_spent, is_current) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', date_trunc('week', current_date)::date, 'in_progress', 'Sent renewal drafts to two of three vendors. Awaiting legal review.', null, 3.5, true),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', (date_trunc('week', current_date) - interval '7 days')::date, 'in_progress', 'Identified contacts at all three vendors and drafted initial terms.', null, 2.0, false),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', date_trunc('week', current_date)::date, 'in_progress', 'Updated first three sections of checklist. Shared draft for feedback.', null, 4.0, true),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', date_trunc('week', current_date)::date, 'blocked', 'Template drafted but waiting on sign-off from two leads who are on leave.', 'Two approvers on leave until next Monday.', 1.5, true),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', (date_trunc('week', current_date) - interval '7 days')::date, 'complete', 'Handover complete. New lead confirmed access and understanding.', null, 1.0, true);