-- Prosjektbilder (galleri med tatt-dato fra EXIF)

create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  storage_path text not null,
  thumb_path text,
  taken_at timestamptz not null,
  caption text not null default '',
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_photos_project_id_idx
  on public.project_photos (project_id);

create index if not exists project_photos_taken_at_idx
  on public.project_photos (project_id, taken_at desc);

alter table public.project_photos enable row level security;

create policy "anon_all_project_photos"
  on public.project_photos
  for all
  to anon
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('project_photos', 'project_photos', false)
on conflict (id) do nothing;

create policy "anon_project_photos_select"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'project_photos');

create policy "anon_project_photos_insert"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'project_photos');

create policy "anon_project_photos_update"
  on storage.objects
  for update
  to anon
  using (bucket_id = 'project_photos');

create policy "anon_project_photos_delete"
  on storage.objects
  for delete
  to anon
  using (bucket_id = 'project_photos');
