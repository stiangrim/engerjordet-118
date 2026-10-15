-- Manuell faktisk kostnad (timer, beløp uten kvittering). Kjør etter 001_init.sql.

create table if not exists public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  budget_item_id uuid references public.budget_items (id) on delete set null,
  entry_date date not null default current_date,
  cost_type public.receipt_cost_type not null default 'labor',
  amount numeric(12, 2) not null,
  hours numeric(10, 2),
  hourly_rate numeric(10, 2),
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cost_entries_project_id_idx on public.cost_entries (project_id);
create index if not exists cost_entries_budget_item_id_idx on public.cost_entries (budget_item_id);

alter table public.cost_entries enable row level security;

create policy "anon_all_cost_entries" on public.cost_entries for all to anon using (true) with check (true);
