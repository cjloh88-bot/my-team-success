create table if not exists work_item_insights (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null unique references work_items(id) on delete cascade,
  summary_text text not null,
  blockers jsonb not null default '[]'::jsonb,
  risk_flag text not null check (risk_flag in ('low', 'medium', 'high')),
  risk_score numeric not null default 0,
  source text not null,
  confidence numeric not null default 0,
  generated_by uuid references team_members(id),
  generated_at timestamptz not null default now()
);
alter table work_item_insights enable row level security;
drop policy if exists "work_item_insights_read_team" on work_item_insights;
drop policy if exists "work_item_insights_write_admin" on work_item_insights;
create policy "work_item_insights_read_team" on work_item_insights for select using (true);
create policy "work_item_insights_write_admin" on work_item_insights for all using (public.is_team_admin()) with check (public.is_team_admin());

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_key text not null unique,
  work_item_id uuid not null references work_items(id) on delete cascade,
  recipient_id uuid references team_members(id) on delete set null,
  channel text not null check (channel in ('slack')),
  notification_type text not null check (notification_type in ('overdue', 'stale_update')),
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts integer not null default 0,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table notification_deliveries enable row level security;
drop policy if exists "notification_deliveries_read_admin" on notification_deliveries;
drop policy if exists "notification_deliveries_write_admin" on notification_deliveries;
create policy "notification_deliveries_read_admin" on notification_deliveries for select using (public.is_team_admin());
create policy "notification_deliveries_write_admin" on notification_deliveries for all using (public.is_team_admin()) with check (public.is_team_admin());

create index if not exists notification_deliveries_status_created_at_idx on notification_deliveries (status, created_at desc);
create index if not exists work_item_insights_generated_at_idx on work_item_insights (generated_at desc);

insert into app_migrations (version) values ('0003_intelligence_and_notifications')
on conflict (version) do update set applied_at = now();
