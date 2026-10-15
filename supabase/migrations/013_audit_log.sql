-- Aktivitetslogg (fylles fra klient ved redigering, vises kun i redigeringsmodus)

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  actor text not null,
  role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_project_created_idx
  on public.audit_log (project_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "anon_all_audit_log" on public.audit_log for all to anon
  using (true) with check (true);
