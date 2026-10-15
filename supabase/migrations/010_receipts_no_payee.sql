-- Kvitteringer knyttes ikke til mottaker (kun manuelle kostnader)

update public.receipts
set payee_id = null
where payee_id is not null;
