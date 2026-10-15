-- Betalingsstatus på kvitteringer og manuelle kostnader

alter table public.receipts
  add column if not exists payment_status text not null default 'Skal betales';

alter table public.cost_entries
  add column if not exists payment_status text not null default 'Skal betales';
