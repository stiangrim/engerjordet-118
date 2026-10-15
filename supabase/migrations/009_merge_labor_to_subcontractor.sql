-- Slå sammen «Arbeid / egeninnsats» (labor) inn i håndverker (subcontractor)

update public.cost_entries
set cost_type = 'subcontractor'
where cost_type = 'labor';

update public.receipts
set cost_type = 'subcontractor'
where cost_type = 'labor';

alter table public.cost_entries
  alter column cost_type set default 'subcontractor';
