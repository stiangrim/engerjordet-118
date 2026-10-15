-- Skyldig = sum knyttede kostnader/kvitteringer + ekstra utover poster

alter table public.payees
  add column if not exists extra_owed numeric(12, 2) not null default 0;

-- Bevar tidligere «manuelt skyldig totalt» som ekstra utover knyttede poster
with linked as (
  select payee_id, sum(amount)::numeric(12, 2) as linked_total
  from (
    select payee_id, amount
    from public.cost_entries
    where payee_id is not null
    union all
    select payee_id, amount
    from public.receipts
    where payee_id is not null
  ) lines
  group by payee_id
)
update public.payees p
set extra_owed = greatest(
  0,
  coalesce(p.total_owed, 0) - coalesce(l.linked_total, 0)
)
from linked l
where l.payee_id = p.id
  and p.total_owed is not null;

update public.payees p
set extra_owed = coalesce(p.total_owed, 0)
where p.total_owed is not null
  and not exists (
    select 1
    from public.cost_entries ce
    where ce.payee_id = p.id
    union all
    select 1
    from public.receipts r
    where r.payee_id = p.id
  );

alter table public.payees drop column if exists total_owed;
