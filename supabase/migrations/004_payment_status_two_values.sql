-- Kun Betalt / Ikke betalt (migrer «Skal betales»)

update public.receipts
set payment_status = 'Ikke betalt'
where payment_status is distinct from 'Betalt';

update public.cost_entries
set payment_status = 'Ikke betalt'
where payment_status is distinct from 'Betalt';

alter table public.receipts
  alter column payment_status set default 'Ikke betalt';

alter table public.cost_entries
  alter column payment_status set default 'Ikke betalt';
