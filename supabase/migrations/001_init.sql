-- Engerjordet 118 – kjør i Supabase SQL Editor (én gang)

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

-- Seed (hopp over hvis prosjekt finnes)
do $$
declare
  pid uuid;
begin
  if exists (select 1 from public.project where name = 'Engerjordet 118') then
    return;
  end if;

  insert into public.project (name, original_budget, current_budget, frame_budget)
  values ('Engerjordet 118', 1654100, 1619100, 2000000)
  returning id into pid;

  insert into public.budget_items (
    project_id, category, post, description,
    budget_materials, budget_labor, budget_total, budget_hours, hourly_rate,
    status, sort_order
  ) values
    (pid, 'Riving og avfall', 'Riving', '12 t × 2 dager × 3 mann × 450 kr', 0, 32400, 32400, 72, 450, 'Ikke startet', 1),
    (pid, 'Riving og avfall', 'Container', 'Container', 0, 0, 10000, null, null, 'Ikke startet', 2),
    (pid, 'VVS', 'Rørlegger – materialer', 'Rørlegger – materialer', 70000, 0, 70000, null, null, 'Ikke startet', 10),
    (pid, 'VVS', 'Rørlegger – utførelse', 'Rørlegger – utførelse', 0, 100000, 100000, 222.2222, 450, 'Ikke startet', 11),
    (pid, 'Elektrisk', 'Elektrisk – arbeid', 'Elektrisk – arbeid', 0, 30000, 30000, 66.6667, 450, 'Ikke startet', 20),
    (pid, 'Elektrisk', 'Elektrisk – materialer', 'Elektrisk – materialer', 30000, 0, 30000, null, null, 'Ikke startet', 21),
    (pid, 'Elektrisk', 'El-skap m.m.', 'El-skap, kurser, komplettering, stikk etc.', 70000, 0, 70000, null, null, 'Ikke startet', 22),
    (pid, 'Vegger', 'Gips- og lettvegger', 'Gipsvegger. Lettvegger, isolasjon og stenderverk.', 95000, 115000, 210000, 255.5556, 450, 'Ikke startet', 30),
    (pid, 'Vinduer/dører', 'Vinduer', 'Vinduer – 12 stk', 108000, 0, 108000, null, null, 'Ikke startet', 40),
    (pid, 'Vinduer/dører', 'Vindusmontasje', 'Vindusmontasje – 12 stk', 0, 36000, 36000, 80, 450, 'Ikke startet', 41),
    (pid, 'Vinduer/dører', 'Balkongdør', 'Balkongdør', 18000, 0, 18000, null, null, 'Ikke startet', 42),
    (pid, 'Bad', 'Membran', 'Membran', 30000, 0, 30000, null, null, 'Ikke startet', 50),
    (pid, 'Bad', 'Støp/varmekabler', 'Støp og varmekabler', 20000, 0, 20000, null, null, 'Ikke startet', 51),
    (pid, 'Bad', 'Flis', 'Flis', 60000, 0, 60000, null, null, 'Ikke startet', 52),
    (pid, 'Bad', 'Flislegging', 'Flislegging – 12 dager × 8 t × 450 kr', 0, 43200, 43200, 96, 450, 'Ikke startet', 53),
    (pid, 'Bad', 'Baderomsinnredning', 'Øvrig baderomsinnredning', 40000, 0, 40000, null, null, 'Ikke startet', 54),
    (pid, 'Kjøkken', 'Kjøkken', 'Kjøkken', 200000, 22500, 222500, 50, 450, 'Ikke startet', 60),
    (pid, 'Trapp', 'Trapp', 'Trapp', 0, 0, 75000, null, null, 'Ikke startet', 70),
    (pid, 'Gulv', 'Parkett', 'Parkett – 100 m²', 65000, 20000, 85000, 44.4444, 450, 'Ikke startet', 80),
    (pid, 'Dører/listverk', 'Listverk/dører', 'Listverk, dører, terskler, feielister – 9 stk', 45000, 9000, 54000, 20, 450, 'Ikke startet', 90),
    (pid, 'Dører/listverk', 'Fotlister', 'Fotlister', 10000, 0, 10000, null, null, 'Ikke startet', 91),
    (pid, 'Maling', 'Maling', 'Maling', 100000, 0, 100000, null, null, 'Ikke startet', 100),
    (pid, 'Inngangsparti', 'Materialer', 'Inngangsparti – materialer', 10000, 0, 10000, null, null, 'Ikke startet', 110),
    (pid, 'Inngangsparti', 'Ombygging', 'Inngangsparti – ombygging', 0, 20000, 20000, 44.4444, 450, 'Ikke startet', 111),
    (pid, 'Inngangsparti', 'Dør', 'Inngangsparti – dør', 10000, 0, 10000, null, null, 'Ikke startet', 112),
    (pid, 'Uforutsett', 'Uforutsett timearbeid', 'Uforutsett timearbeid', 0, 125000, 125000, 277.7778, 450, 'Ikke startet', 999);

  insert into public.schedule_periods (
    project_id, period_label, work_summary, main_focus, highlights,
    planned_start, planned_end, status, sort_order
  ) values
    (pid, 'Helg 1 – 18.–20. sept.', 'Riving + kritiske arbeider', 'Full riving og åpning av konstruksjoner.',
     E'1. Vann inn må plugges – Knut Erik fikse?\n2. Pigge ut gamle sluk og skjøte inn nye – PRIO.\n3. Måle vinduer + balkongdør og bestille.\n4. Hullta og riv for alle tekniske føringer.\n5. Sjekke vannrør inn i kjellertak.\n6. Avklare lysgrav/kjellervindu.',
     '2026-09-18', '2026-09-20', 'Ikke startet', 1),
    (pid, 'Uke 39 – 21.–27. sept.', 'Riving + tekniske forberedelser', 'Ferdigstille riving og klargjøre tekniske føringer.', 'Bad/sluk prioriteres.', '2026-09-21', '2026-09-27', 'Ikke startet', 2),
    (pid, 'Helg 2 – 25.–27. sept.', 'Teknisk + lettvegger/gips', 'Føringsveier og K-rør. Lettvegger bygges og gipses der mulig.', 'Teknisk koordinering før vegger lukkes.', '2026-09-25', '2026-09-27', 'Ikke startet', 3),
    (pid, 'Uke 40 – 28. sept.–4. okt.', 'Tekniske fag + vegger', 'EL/rør grovarbeid, lettvegger og gips.', 'Ikke avhengig av vinduene.', '2026-09-28', '2026-10-04', 'Ikke startet', 4),
    (pid, 'Uke 41 – 5.–11. okt.', 'Bad + overflater', 'Membran, støp/varmekabler. Sparkling/maling i øvrige rom.', 'Få badet raskt videre.', '2026-10-05', '2026-10-11', 'Ikke startet', 5),
    (pid, 'Uke 42–43 – 12.–25. okt.', 'Flis + maling', 'Flislegging, maling og øvrige overflater.', 'Flislegging ca. 12 arbeidsdager.', '2026-10-12', '2026-10-25', 'Ikke startet', 6),
    (pid, 'Uke 44 – 26. okt.–1. nov.', 'Overflater + kjøkken/trapp', 'Parkett, kjøkken og trapp der mulig.', 'Vinduer forventes rundt 30. okt.', '2026-10-26', '2026-11-01', 'Ikke startet', 7),
    (pid, 'Uke 45 – 2.–8. nov.', 'Vinduer + sluttarbeider', 'Vindusmontasje, balkongdør, dører/listverk, EL/rør sluttmontasje.', 'Noe arbeid rundt vinduene må eventuelt gjøres etter montasje.', '2026-11-02', '2026-11-08', 'Ikke startet', 8),
    (pid, 'Uke 46 – 9.–15. nov.', 'Komplettering', 'Maling rundt vinduer, lister, fuging, småarbeider, vask og feilretting.', 'Buffer.', '2026-11-09', '2026-11-15', 'Ikke startet', 9),
    (pid, 'Mål: ca. 13.–15. nov.', 'FERDIG', 'Ferdig bolig.', 'Intern målsetting kan fortsatt være tidligere hvis vinduene kommer før estimert.', '2026-11-13', '2026-11-15', 'Ikke startet', 10);

  insert into public.critical_tasks (
    project_id, priority, title, when_label, responsible, status, due_date, comment, sort_order
  ) values
    (pid, 'Høy', 'Vann inn må plugges', 'Helg 1', 'Synne/far?', 'Ikke startet', '2026-09-20', '', 1),
    (pid, 'KRITISK', 'Pigge ut gamle sluk og skjøte inn nye – PRIO', 'Første/andre helg', '', 'Ikke startet', '2026-09-27', 'Må tas tidlig for å starte bad-prosessen → deretter rørlegger.', 2),
    (pid, 'Høy', 'Måle vinduer + balkongdør og bestille', 'Helg 1', '', 'Ikke startet', '2026-09-20', 'Ca. 6 ukers levering.', 3),
    (pid, 'Høy', 'Hullta og riv for alle tekniske føringer', 'Under riving', '', 'Ikke startet', '2026-09-27', 'Krever god planlegging under riving.', 4),
    (pid, 'Høy', 'Sjekke vannrør inn i kjellertak – kan de rives? Kun radiator?', 'Helg 1', '', 'Ikke startet', '2026-09-20', '', 5),
    (pid, 'Høy', 'Avklare lysgrav/kjellervindu – eventuell utvidelse', 'Tidlig i prosjektet', '', 'Ikke startet', '2026-09-27', 'Eventuell utvidelse bør startes tidlig.', 6),
    (pid, 'Høy', 'Teknisk koordinering før vegger lukkes', 'Helg 2', '', 'Ikke startet', '2026-09-27', '', 7);

  insert into public.milestones (
    project_id, title, planned_date, status, dependency, comment, sort_order
  ) values
    (pid, 'Vinduer/balkongdør bestilt', '2026-09-20', 'Ikke startet', 'Måling ferdig', 'Ca. 6 ukers levering', 1),
    (pid, 'Sluk klare for rørlegger', '2026-09-27', 'Ikke startet', 'Riving/pigging', 'Bad-prosessen kan gå videre', 2),
    (pid, 'Tekniske føringer avklart', '2026-09-27', 'Ikke startet', 'EL/rør-plan', 'Før vegger lukkes', 3),
    (pid, 'Bad klart for flis', '2026-10-12', 'Ikke startet', 'Membran/støp/varmekabler', '', 4),
    (pid, 'Vinduer forventet', '2026-10-30', 'Ikke startet', 'Leveringstid', 'Estimert', 5),
    (pid, 'Sluttarbeider', '2026-11-08', 'Ikke startet', 'Vindusmontasje + sluttmontasje', '', 6),
    (pid, 'Ferdig bolig', '2026-11-15', 'Ikke startet', 'Komplettering', 'Mål ca. 13.–15. nov.', 7);
end $$;
