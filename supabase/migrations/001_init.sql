-- Skjema for renoveringsprosjekt (uten prosjektspesifikk seed – se supabase/seed/)

create extension if not exists "pgcrypto";

-- Prosjekt
create table if not exists public.project (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  original_budget numeric(12, 2) not null,
  current_budget numeric(12, 2) not null,
  frame_budget numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

-- Budsjettposter
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  category text not null,
  post text not null,
  description text not null default '',
  budget_materials numeric(12, 2) not null default 0,
  budget_labor numeric(12, 2) not null default 0,
  budget_total numeric(12, 2) not null default 0,
  budget_hours numeric(10, 4),
  hourly_rate numeric(10, 2),
  status text not null default 'Ikke startet',
  comment text not null default '',
  sort_order int not null default 0
);

-- Fremdriftsperioder
create table if not exists public.schedule_periods (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  period_label text not null,
  work_summary text not null default '',
  main_focus text not null default '',
  highlights text not null default '',
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  status text not null default 'Ikke startet',
  responsible text not null default '',
  comment text not null default '',
  sort_order int not null default 0
);

-- Kritiske punkter
create table if not exists public.critical_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  priority text not null default '',
  title text not null,
  when_label text not null default '',
  responsible text not null default '',
  status text not null default 'Ikke startet',
  due_date date,
  completed_date date,
  comment text not null default '',
  sort_order int not null default 0
);

-- Milepæler
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  title text not null,
  planned_date date,
  actual_date date,
  status text not null default 'Ikke startet',
  dependency text not null default '',
  comment text not null default '',
  sort_order int not null default 0
);

-- Kvitteringer
create type public.receipt_cost_type as enum ('materials', 'labor', 'other');

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  budget_item_id uuid references public.budget_items (id) on delete set null,
  vendor text not null default '',
  receipt_date date,
  amount numeric(12, 2) not null default 0,
  vat_amount numeric(12, 2),
  cost_type public.receipt_cost_type not null default 'other',
  description text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists budget_items_project_id_idx on public.budget_items (project_id);
create index if not exists receipts_project_id_idx on public.receipts (project_id);
create index if not exists receipts_budget_item_id_idx on public.receipts (budget_item_id);

-- RLS (åpent for anon – privat prosjekt, del ikke URL)
alter table public.project enable row level security;
alter table public.budget_items enable row level security;
alter table public.schedule_periods enable row level security;
alter table public.critical_tasks enable row level security;
alter table public.milestones enable row level security;
alter table public.receipts enable row level security;

create policy "anon_all_project" on public.project for all to anon using (true) with check (true);
create policy "anon_all_budget_items" on public.budget_items for all to anon using (true) with check (true);
create policy "anon_all_schedule_periods" on public.schedule_periods for all to anon using (true) with check (true);
create policy "anon_all_critical_tasks" on public.critical_tasks for all to anon using (true) with check (true);
create policy "anon_all_milestones" on public.milestones for all to anon using (true) with check (true);
create policy "anon_all_receipts" on public.receipts for all to anon using (true) with check (true);

-- Storage
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "anon_receipts_select" on storage.objects for select to anon
  using (bucket_id = 'receipts');

create policy "anon_receipts_insert" on storage.objects for insert to anon
  with check (bucket_id = 'receipts');

create policy "anon_receipts_update" on storage.objects for update to anon
  using (bucket_id = 'receipts');

create policy "anon_receipts_delete" on storage.objects for delete to anon
  using (bucket_id = 'receipts');

-- Prosjektspesifikk seed (budsjett, plan, navn) ligger i supabase/seed/private.sql (gitignored).
