-- Notater og vedlegg på oversikt (f.eks. kjøkkendesign, PDF-er)

create table if not exists public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  storage_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_attachments_project_id_idx
  on public.project_attachments (project_id);

create index if not exists project_attachments_sort_idx
  on public.project_attachments (project_id, sort_order, created_at);

alter table public.project_attachments enable row level security;

create policy "anon_all_project_attachments"
  on public.project_attachments
  for all
  to anon
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('project_attachments', 'project_attachments', false)
on conflict (id) do nothing;

create policy "anon_project_attachments_select"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'project_attachments');

create policy "anon_project_attachments_insert"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'project_attachments');

create policy "anon_project_attachments_update"
  on storage.objects
  for update
  to anon
  using (bucket_id = 'project_attachments');

create policy "anon_project_attachments_delete"
  on storage.objects
  for delete
  to anon
  using (bucket_id = 'project_attachments');
