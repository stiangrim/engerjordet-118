# Renoveringsprosjekt (Vite + Supabase)

Vite + React + TypeScript med Tailwind CSS og Supabase — budsjett, plan og kostnader.

**Live (GitHub Pages):** https://stiangrim.github.io/engerjordet-118/

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
- Valgfritt `VITE_APP_TITLE` — vises på innloggingsskjerm (uten å hente fra DB)

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

**Les** og **rediger** må ha **ulike** passord. Lesepassord bør fortsatt være vanskelig å gjette (ikke «gjest» / «1234»). Hvis de er like, avviser `verify-access` innlogging.

Oppdater lesepassord: `supabase secrets set ACCESS_PASSWORD_READONLY="…"`

Valgfritt visningsnavn i endringslogg (kun internt i token / audit, ikke vist for lesemodus):

```bash
supabase secrets set ACCESS_ACTOR_READONLY="…" ACCESS_ACTOR_FULL="…"
```

Restart `npm run dev` etter env-endringer.

## Database

Kjør migrasjoner med `supabase db push` (eller SQL-filene i `supabase/migrations/` i rekkefølge).

`001_init.sql` oppretter **skjema** (tabeller, RLS, storage). Prosjektspesifikk data (navn, budsjett, plan, mottakere) legges i [`supabase/seed/private.sql`](supabase/seed/README.md) — filen committes **ikke**.

## Kvitteringer

Last opp kvitteringer under **Kostnader** i appen. Beløp registreres **inkl. mva**. Filene lagres i Supabase Storage og kan knyttes til budsjettposter.

## Publisering

**Produksjon:** https://stiangrim.github.io/engerjordet-118/

Ved push til `main` bygger [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Repo-secrets (Settings → Secrets → Actions):

| Secret | Innhold |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_ACCESS_AUTH` | `true` |
| `VITE_APP_TITLE` (valgfri) | Generisk tittel på innlogging |

Passord til innlogging ligger kun i Supabase Function-secrets (`verify-access`).

**Alternativ:** `vercel.json` for Vercel (root-domene). Sett samme env-variabler der.

## Sikkerhet (offentlig repo)

- Ingen personnavn eller budsjettbeløp i kildekode eller migrasjoner.
- Sensitive data ligger i Supabase og bak passord.
- Eldre git-historikk kan fortsatt inneholde seed fra før opprydding — vurder `git filter-repo` eller rotering av passord hvis repoet har vært offentlig lenge.

## Endringslogg (redigering)

I redigeringsmodus vises en sammenleggbar **Endringslogg** nederst på siden (hvem gjorde hva og når). Kun sesjon med redigeringstilgang kan se loggen og skrive nye linjer ved endringer i appen.

## Redigering i appen

- **Oversikt** → *Notater og vedlegg* (tekst + valgfri PDF/bilde), *Rediger rammer*
- **Bilder** → bulk-opplasting, galleri gruppert etter tatt-dato (EXIF)
- **Budsjett** → *Rediger* / *Ny budsjettpost*
- **Plan** → perioder, kritiske punkter, milepæler
- **Kostnader** → kvitteringer, manuelle poster, mottakere
