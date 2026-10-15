# Engerjordet 118

Vite + React + TypeScript med Tailwind CSS og Supabase.

## Oppsett

1. Installer avhengigheter:

```bash
npm install
```

2. Kopier miljøfilen og fyll inn nøklene:

```bash
cp .env.local.example .env.local
```

3. Hent verdiene fra [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **API**:

- `VITE_SUPABASE_URL` — prosjektets API-URL
- `VITE_SUPABASE_ANON_KEY` — den offentlige `anon`-nøkkelen

4. Start utviklingsserveren:

```bash
npm run dev
```

`.env.local` lastes automatisk av Vite og skal ikke committes.

Sett `VITE_ACCESS_AUTH=true` for innlogging. Passord ligger **ikke** i frontend – de settes som Supabase Function-secrets:

```bash
supabase functions deploy verify-access
supabase secrets set \
  ACCESS_SESSION_SECRET="$(openssl rand -hex 32)" \
  ACCESS_PASSWORD_READONLY="ditt-les-passord" \
  ACCESS_PASSWORD_FULL="ditt-rediger-passord"
```

Samme passord gir full tilgang hvis du kun setter `ACCESS_PASSWORD_FULL`. Restart `npm run dev` etter env-endringer.

## Database og seed

1. Åpne [Supabase SQL Editor](https://supabase.com/dashboard) for prosjektet.
2. Lim inn og kjør hele filen [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql).

Det oppretter tabeller, RLS, storage-bucket `receipts`, og seed-data fra Excel (budsjett, plan, kritiske punkter, milepæler).

3. Kjør også [`supabase/migrations/002_cost_entries.sql`](supabase/migrations/002_cost_entries.sql) for manuelle kostnader (timer uten kvittering).
4. Kjør [`supabase/migrations/003_payment_status.sql`](supabase/migrations/003_payment_status.sql) og [`004_payment_status_two_values.sql`](supabase/migrations/004_payment_status_two_values.sql) for betalingsstatus (Betalt / Ikke betalt).
5. Kjør [`supabase/migrations/005_receipt_cost_types.sql`](supabase/migrations/005_receipt_cost_types.sql) for flere typer på kvitteringer (verktøy, leie, frakt, osv.).
6. Kjør [`supabase/migrations/006_payees.sql`](supabase/migrations/006_payees.sql) for mottakere (f.eks. Dalius) med samlet skyldig/betalt.

## Kvitteringer

Last opp kvitteringer under **Kostnader** i appen. Beløp registreres **inkl. mva**. Filene lagres i Supabase Storage og kan knyttes til budsjettposter.

## Publisering (Vercel)

Appen er en statisk Vite-build. Anbefalt hosting: [Vercel](https://vercel.com).

1. Push prosjektet til GitHub (eller Cursor Origin).
2. Importer repoet i Vercel → **Framework Preset: Vite**.
3. Sett **Environment Variables** (Production + Preview):

| Variabel | Verdi |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_ACCESS_AUTH` | `true` hvis innlogging skal være på |

4. Deploy. `vercel.json` sørger for SPA-routing (`/budsjett`, `/kostnader`, osv.).

Passord til innlogging ligger fortsatt kun i Supabase Function-secrets (`verify-access`), ikke i Vercel.

Etter første deploy: i Supabase **Authentication → URL configuration** (eller CORS der det gjelder) er det ofte ikke nødvendig for anon + Edge Functions; test kvitteringsopplasting mot Storage fra produksjonsdomenet.

## Redigering i appen

Du kan oppdatere data direkte uten SQL:

- **Oversikt** → *Rediger rammer* (prosjektramme, opprinnelig/gjeldende budsjett, eller synk sum fra poster)
- **Budsjett** → *Rediger* / *Ny budsjettpost* (inkl. slett)
- **Plan** → *Rediger* / *Ny periode*, *Nytt punkt*, *Ny milepæl*
- **Kostnader** → manuelle timer/beløp + kvitteringer, knyttet til budsjettpost
