create or replace function public.current_team_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.team_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1
$$;

create or replace function public.is_team_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_team_role() = 'admin', false)
$$;

drop policy if exists "team_members_v1_read" on team_members;
drop policy if exists "team_members_v1_write" on team_members;
drop policy if exists "team_members_read_all" on team_members;
drop policy if exists "team_members_insert_self_or_admin" on team_members;
drop policy if exists "team_members_update_self_link_or_admin" on team_members;
drop policy if exists "team_members_delete_admin" on team_members;
create policy "team_members_read_all" on team_members for select using (true);
create policy "team_members_insert_self_or_admin" on team_members for insert with check (
  public.is_team_admin()
  or user_id = auth.uid()
  or (user_id is null and email = auth.jwt() ->> 'email')
);
create policy "team_members_update_self_link_or_admin" on team_members for update using (
  public.is_team_admin()
  or user_id = auth.uid()
  or (user_id is null and email = auth.jwt() ->> 'email')
) with check (
  public.is_team_admin()
  or user_id = auth.uid()
);
create policy "team_members_delete_admin" on team_members for delete using (public.is_team_admin());

drop policy if exists "work_items_v1_read" on work_items;
drop policy if exists "work_items_v1_write" on work_items;
drop policy if exists "work_items_read_all" on work_items;
drop policy if exists "work_items_insert_member_admin" on work_items;
drop policy if exists "work_items_update_owner_admin" on work_items;
drop policy if exists "work_items_delete_admin" on work_items;
create policy "work_items_read_all" on work_items for select using (true);
create policy "work_items_insert_member_admin" on work_items for insert with check (
  public.current_team_role() in ('admin', 'member')
  and user_id = auth.uid()
);
create policy "work_items_update_owner_admin" on work_items for update using (
  public.is_team_admin()
  or owner_id in (select id from team_members where user_id = auth.uid())
) with check (
  public.is_team_admin()
  or owner_id in (select id from team_members where user_id = auth.uid())
);
create policy "work_items_delete_admin" on work_items for delete using (public.is_team_admin());

drop policy if exists "weekly_updates_v1_read" on weekly_updates;
drop policy if exists "weekly_updates_v1_write" on weekly_updates;
drop policy if exists "weekly_updates_read_all" on weekly_updates;
drop policy if exists "weekly_updates_insert_member_admin" on weekly_updates;
drop policy if exists "weekly_updates_update_owner_admin" on weekly_updates;
drop policy if exists "weekly_updates_delete_admin" on weekly_updates;
create policy "weekly_updates_read_all" on weekly_updates for select using (true);
create policy "weekly_updates_insert_member_admin" on weekly_updates for insert with check (
  public.current_team_role() in ('admin', 'member')
  and user_id = auth.uid()
);
create policy "weekly_updates_update_owner_admin" on weekly_updates for update using (
  public.is_team_admin()
  or submitted_by in (select id from team_members where user_id = auth.uid())
  or work_item_id in (
    select id from work_items
    where owner_id in (select id from team_members where user_id = auth.uid())
  )
) with check (true);
create policy "weekly_updates_delete_admin" on weekly_updates for delete using (public.is_team_admin());

drop policy if exists "activities_v1_read" on activities;
drop policy if exists "activities_v1_write" on activities;
drop policy if exists "activities_read_all" on activities;
drop policy if exists "activities_insert_member_admin" on activities;
drop policy if exists "activities_update_admin" on activities;
drop policy if exists "activities_delete_admin" on activities;
create policy "activities_read_all" on activities for select using (true);
create policy "activities_insert_member_admin" on activities for insert with check (
  public.current_team_role() in ('admin', 'member')
);
create policy "activities_update_admin" on activities for update using (public.is_team_admin()) with check (public.is_team_admin());
create policy "activities_delete_admin" on activities for delete using (public.is_team_admin());

drop policy if exists "audit_logs_v1_read" on audit_logs;
drop policy if exists "audit_logs_v1_write" on audit_logs;
drop policy if exists "audit_logs_read_admin" on audit_logs;
drop policy if exists "audit_logs_insert_member_admin" on audit_logs;
create policy "audit_logs_read_admin" on audit_logs for select using (public.is_team_admin());
create policy "audit_logs_insert_member_admin" on audit_logs for insert with check (
  public.current_team_role() in ('admin', 'member')
);

drop policy if exists "weekly_digests_v1_read" on weekly_digests;
drop policy if exists "weekly_digests_v1_write" on weekly_digests;
drop policy if exists "weekly_digests_read_team" on weekly_digests;
drop policy if exists "weekly_digests_insert_admin" on weekly_digests;
drop policy if exists "weekly_digests_update_admin" on weekly_digests;
drop policy if exists "weekly_digests_delete_admin" on weekly_digests;
create policy "weekly_digests_read_team" on weekly_digests for select using (
  published = true
  or public.current_team_role() in ('admin', 'member', 'viewer')
);
create policy "weekly_digests_insert_admin" on weekly_digests for insert with check (
  public.is_team_admin()
  and user_id = auth.uid()
);
create policy "weekly_digests_update_admin" on weekly_digests for update using (public.is_team_admin()) with check (public.is_team_admin());
create policy "weekly_digests_delete_admin" on weekly_digests for delete using (public.is_team_admin());

insert into app_migrations (version) values ('0002_lockdown_rls')
on conflict (version) do update set applied_at = now();
