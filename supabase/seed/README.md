# Privat seed

Migrasjon `001_init.sql` oppretter bare **skjema** (tabeller, RLS, storage).

Prosjektdata (navn, budsjettposter, plan, mottakere) skal **ikke** committes til det offentlige repoet.

1. Lag filen `private.sql` i denne mappen (den er i `.gitignore`).
2. Kjør innholdet i Supabase SQL Editor, eller mot lokal database.

Eksempel på minimum:

```sql
insert into public.project (name, original_budget, current_budget, frame_budget)
values ('Mitt prosjekt', 0, 0, 0);
```

Du kan ta backup av eksisterende data med Supabase Dashboard → Database → backups, eller eksportere tabeller.
