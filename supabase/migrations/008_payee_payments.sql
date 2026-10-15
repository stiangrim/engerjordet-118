-- Innbetalinger mot mottaker (summeres til «betalt totalt»)

create table if not exists public.payee_payments (
  id uuid primary key default gen_random_uuid(),
  payee_id uuid not null references public.payees (id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payee_payments_payee_id_idx
  on public.payee_payments (payee_id);

alter table public.payee_payments enable row level security;

create policy "anon_all_payee_payments" on public.payee_payments for all to anon
  using (true) with check (true);

-- Flytt tidligere samlet «betalt totalt» til én post per mottaker
insert into public.payee_payments (payee_id, payment_date, amount, method, note)
select
  p.id,
  current_date,
  p.total_paid,
  'Migrert',
  'Tidligere «betalt totalt» på mottakeren'
from public.payees p
where p.total_paid > 0
  and not exists (
    select 1 from public.payee_payments pp where pp.payee_id = p.id
  );

alter table public.payees drop column if exists total_paid;
