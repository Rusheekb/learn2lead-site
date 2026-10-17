# Learn2Lead

[![CI](https://github.com/Rusheekb/learn2lead-site/actions/workflows/ci.yml/badge.svg)](https://github.com/Rusheekb/learn2lead-site/actions/workflows/ci.yml)

Learn2Lead is a tutoring platform. Students, or parents paying for their children, buy one-time packs of tutoring hours through Stripe (1 credit = 1 hour). Students are matched with tutors and book classes, and hours are deducted from the payer's balance as classes are completed. There are four roles, each with its own dashboard: **student**, **parent**, **tutor** and **admin**.

## Stack

- **Frontend:** React 18, TypeScript, Vite 6, React Router 7, TanStack Query, Tailwind CSS with shadcn/ui (Radix) components. Installable as a PWA via `vite-plugin-pwa`.
- **Backend:** Supabase (Postgres with row-level security, Auth, and Edge Functions running on Deno).
- **Payments:** Stripe one-time purchases; webhooks are handled by the `stripe-webhooks` edge function.
- **Observability:** Sentry for errors (production builds only, when a DSN is set) and PostHog for product analytics (capturing is disabled in development).
- **Testing:** Jest, Testing Library and jsdom.
- **Hosting:** Vercel (see `vercel.json`).

## Getting started

Prerequisites: Node.js 20 (pinned in `.nvmrc`) and npm.

```bash
nvm use                       # or install the Node version in .nvmrc
npm ci                        # also installs the git pre-commit hook
cp .env.example .env.local    # then fill in your Supabase URL and anon key
npm run dev                   # http://localhost:8080
```

### Environment variables

Only `VITE_`-prefixed variables are exposed to the browser bundle. `.env.local` is gitignored.

| Variable                    | Required | Purpose                                                                                  |
| --------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Yes      | Supabase project URL                                                                     |
| `VITE_SUPABASE_ANON_KEY`    | Yes      | Supabase anon (public) key                                                               |
| `VITE_STRIPE_MODE`          | No       | `test` uses Stripe test-mode price IDs (`src/config/stripe.ts`); anything else uses live |
| `VITE_SENTRY_DSN`           | No       | Sentry DSN; Sentry initializes only in production builds                                 |
| `VITE_GOOGLE_CLIENT_ID`     | No       | Enables Google's own sign-in button (see `docs/google-sign-in.md`)                       |
| `VITE_ENABLE_FAMILY_SIGNUP` | No       | `true` shows family sign-up and the student "Invite a parent" card                       |
| `VITE_ENABLE_SMS`           | No       | `true` shows the text-message notification settings                                      |

## Scripts

| Command                      | What it does                                               |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run dev`                | Start the Vite dev server on port 8080                     |
| `npm run build`              | Production build into `dist/`                              |
| `npm run lint`               | ESLint with `--fix` on `src/**/*.{ts,tsx}`                 |
| `npm run type-check`         | `tsc --noEmit` against `tsconfig.app.json`                 |
| `npm run format`             | Format the repo with Prettier                              |
| `npm run check-format`       | Check formatting with Prettier (used in CI)                |
| `npm run test`               | Run the Jest suite                                         |
| `npm run test -- --coverage` | Run Jest with coverage; a 50% global threshold is enforced |

Run a single file with `npm run test -- path/to/file.test.ts`, or a single test with `npm run test -- -t "test name"`.

## Project layout

```text
src/
  pages/            Route-level pages
  components/       UI by role and feature; components/ui/ is shadcn-generated
  hooks/            Shared hooks; React Query hooks live in hooks/queries/
  services/         Supabase queries and business logic, by domain
  contexts/         Auth and other React context providers
  config/           Stripe tiers, feature flags
  integrations/     Supabase client and generated database types
  lib/              Logger, Sentry and PostHog setup, shared helpers
supabase/
  migrations/       SQL migrations, applied in filename order (start: the baseline)
  migrations_archive/  Pre-baseline migrations, kept for history only
  functions/        Edge functions, one directory each; shared code in _shared/
  tests/            Database behaviour tests (run.sh)
  cron/             Production-only scheduled jobs (reference)
scripts/release/    Migration dry run and changed-function helpers
docs/               Feature docs, and the release checklist (docs/releasing.md)
```

[`CLAUDE.md`](CLAUDE.md) describes the architecture in detail: routing and role gating, auth and role sync, the credit ledger, family accounts, the services layer, data fetching and testing conventions. Feature docs live in `docs/`:

- [`docs/family-accounts-plan.md`](docs/family-accounts-plan.md): parent accounts, guardian links, managed students, billing and notifications.
- [`docs/google-sign-in.md`](docs/google-sign-in.md): Google sign-in through Google's own button, and the setup steps.

## Supabase

- **Migrations** live in `supabase/migrations/` and are applied in filename (timestamp) order. Prefix new files with `YYYYMMDD...`. The first one, `20261017100000_baseline.sql`, is the full production schema; older migrations are in `migrations_archive/` because they can't rebuild a database on their own. Ship migrations with the steps in [`docs/releasing.md`](docs/releasing.md) (dry run on production, then `supabase db push --linked`).
- **Local database:** `supabase db start` builds a Postgres 15 database from the migrations (Docker required); `supabase db reset` rebuilds it. Then `supabase/tests/run.sh` runs the database tests against it.
- **Types:** after a schema change, regenerate `src/integrations/supabase/types.ts` (`supabase gen types`) instead of editing it by hand.
- **Edge functions** live in `supabase/functions/<name>/` and are deployed separately from the frontend. Merging or deploying the site does not update them; run `supabase functions deploy <name>` and confirm the new version is live.
- **`verify_jwt`** is set per function in `supabase/config.toml`. Functions called by Stripe or by cron have it turned off and authenticate another way (Stripe signature verification, or the shared `x-cron-secret` header).
- **Secrets:** never commit secrets. Server-side keys (Stripe, Resend, the cron secret, the service role key) are Supabase edge-function secrets and are read with `Deno.env.get`.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request to `main`:

| Job                  | Checks                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| `lint-and-typecheck` | ESLint (no auto-fix), `npm run type-check`, `npm run check-format`        |
| `test`               | `npm run test -- --coverage` (50% threshold), uploads the coverage report |
| `build`              | `npm run build`, after the other two jobs pass                            |
| `edge-functions`     | `deno check` on every edge function                                       |
| `database`           | builds a fresh database from `supabase/migrations`, runs `supabase/tests` |

Run the same checks locally before pushing. A husky pre-commit hook also runs Prettier and `eslint --fix` on staged files through lint-staged.
