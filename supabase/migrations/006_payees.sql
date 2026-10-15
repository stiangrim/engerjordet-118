-- Mottakere (håndverker/firma) med samlet skyldig og betalt

create table if not exists public.payees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  name text not null,
  total_owed numeric(12, 2),
  total_paid numeric(12, 2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payees_project_id_idx on public.payees (project_id);

alter table public.payees enable row level security;

create policy "anon_all_payees" on public.payees for all to anon
  using (true) with check (true);

alter table public.cost_entries
  add column if not exists payee_id uuid references public.payees (id) on delete set null;

alter table public.receipts
  add column if not exists payee_id uuid references public.payees (id) on delete set null;

create index if not exists cost_entries_payee_id_idx on public.cost_entries (payee_id);
create index if not exists receipts_payee_id_idx on public.receipts (payee_id);
