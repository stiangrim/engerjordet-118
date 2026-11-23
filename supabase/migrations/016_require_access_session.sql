-- Close the database to the public key. Until now every table and storage
-- bucket allowed `anon` to do anything, so the password screen only hid the
-- UI: anyone with the publishable key from the site bundle could read, change
-- or delete all data. Now only a session from the verify-access login reaches
-- the data: both roles read, only `full` writes. The role lives in
-- app_metadata, which only the service role can set.

create or replace function public.access_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'access_role', '')
$$;

do $$
declare
  t text;
  p record;
begin
  -- Drop every anon policy on the app tables and on storage.objects.
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where 'anon' = any(roles)
      and (schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects'))
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;

  foreach t in array array[
    'project', 'budget_items', 'schedule_periods', 'critical_tasks',
    'milestones', 'receipts', 'cost_entries', 'payees', 'payee_payments',
    'project_attachments', 'audit_log', 'project_photos'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.access_role() in (''readonly'', ''full''))',
      'session_read_' || t, t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.access_role() = ''full'')',
      'session_insert_' || t, t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.access_role() = ''full'') with check (public.access_role() = ''full'')',
      'session_update_' || t, t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.access_role() = ''full'')',
      'session_delete_' || t, t);
  end loop;
end $$;

create policy "session_read_project_files" on storage.objects for select to authenticated
  using (bucket_id in ('receipts', 'project_attachments', 'project_photos')
         and public.access_role() in ('readonly', 'full'));
create policy "session_insert_project_files" on storage.objects for insert to authenticated
  with check (bucket_id in ('receipts', 'project_attachments', 'project_photos')
              and public.access_role() = 'full');
create policy "session_update_project_files" on storage.objects for update to authenticated
  using (bucket_id in ('receipts', 'project_attachments', 'project_photos')
         and public.access_role() = 'full')
  with check (bucket_id in ('receipts', 'project_attachments', 'project_photos')
              and public.access_role() = 'full');
create policy "session_delete_project_files" on storage.objects for delete to authenticated
  using (bucket_id in ('receipts', 'project_attachments', 'project_photos')
         and public.access_role() = 'full');
