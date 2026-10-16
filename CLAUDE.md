# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Learn2Lead is a tutoring platform: students buy hourly credit packs (Stripe, one-time purchases — not subscriptions), get matched with tutors, book/complete classes, and credits are debited per class. There are four roles — student, tutor, parent, admin — each with its own dashboard and route tree (parents: see Family accounts below). React/Vite SPA on the frontend, Supabase (Postgres + Auth + Edge Functions) on the backend.

## Commands

```bash
npm run dev              # start Vite dev server (port 8080)
npm run build             # production build
npm run lint               # eslint --fix on src/**/*.{ts,tsx}
npm run type-check       # tsc --noEmit
npm run format            # prettier --write .
npm run check-format   # prettier --check . (used in CI)
npm run test               # jest
npm run test -- --coverage             # with coverage (50% threshold, enforced)
npm run test -- path/to/file.test.ts   # single test file
npm run test -- -t "test name"         # by test name
```

CI (`.github/workflows/ci.yml`) runs lint, type-check, format-check, tests-with-coverage, and build as separate jobs on every PR to `main`. Match these locally before pushing.

Pre-commit hook (husky + lint-staged) runs prettier + eslint --fix on staged files.

Node version is pinned in `.nvmrc`.

### Supabase / edge functions

- Migrations live in `supabase/migrations/*.sql`, applied in filename (timestamp) order. Create new ones with a `YYYYMMDD...` prefix.
- Edge functions live in `supabase/functions/<name>/`. **Editing a function's local file does not deploy it** — you must run `supabase functions deploy <name>` and verify the change landed (e.g. bump a version/log line) before assuming it's live.
- `supabase/config.toml` declares `verify_jwt` per function — functions called by cron or by Stripe webhooks (`stripe-webhooks`, `class-reminder`, `admin-weekly-digest`, `send-weekly-digest`, `cron-quarterly-reports`, `process-auto-renewal`, `send-contact-email`) have `verify_jwt = false` and must authenticate/validate by other means (e.g. Stripe signature verification). The four cron-triggered ones check a shared `x-cron-secret` header via `_shared/cronAuth.ts` — pg_cron reads it from Vault (`cron_secret`), the functions from the `CRON_SECRET` edge secret; never commit the value.
- `scripts/db-migrate.js` is a legacy helper for applying migrations against `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` outside the Supabase CLI; prefer the Supabase CLI (`supabase db push`, `supabase functions deploy`) for real workflows.

## Architecture

### Routing & shell (`src/App.tsx`)

All routes are lazy-loaded. Route tree is flat, gated by `PrivateRoute` with an `allowedRoles` prop (`student` / `tutor` / `admin`) — nested `Route element={<PrivateRoute allowedRoles={[...]} />}` blocks wrap each role's dashboard subtree. Each role has a dashboard wrapper (`StudentDashboardWrapper`, `TutorDashboardWrapper`, `AdminDashboardWrapper`) that composes `DashboardShell` + `OptimizedSuspense` + a per-section `ErrorBoundary` + page transition animation. When adding a new page for a role, follow this same wrapper pattern rather than adding routes ad hoc.

### Auth & role sync

- `src/contexts/AuthContext/` holds the real auth provider/hook (`AuthProvider`, `useAuth`); `src/contexts/AuthContext.tsx` just re-exports it for backward compatibility — edit the files under `AuthContext/`, not the shim.
- `useRoleSync` (`src/hooks/useRoleSync.ts`) listens to Supabase `onAuthStateChange` and materializes a `students` or `tutors` row from `user_metadata.role` on `SIGNED_IN`/`USER_UPDATED`, deleting any stale row of the other type. Role is stored in both Supabase auth metadata and app tables — keep them in sync when touching role logic.
- `PrivateRoute` (`src/components/PrivateRoute.tsx`) enforces role-based access at the route level; RLS policies enforce it again at the database level (belt-and-suspenders — don't rely on client-side gating alone).

### Credits & billing (Stripe)

- One-time "credit pack" purchases, not subscriptions: 1 credit = 1 hour, half-hour increments supported. Tiers/prices are defined in `src/config/stripe.ts` (`CREDIT_TIERS`), switching between live/test price IDs via `VITE_STRIPE_MODE`.
- `supabase/functions/stripe-webhooks/` handles `checkout.session.completed` etc., looks up the plan by Stripe price ID, and credits the student. Webhook events are logged to `stripe_webhook_events` for idempotency/debugging (see `WebhookEventLog` admin component).
- Credit balance mutations (purchase, class deduction, refund/restore, auto-renewal) all funnel through `apply_credit_ledger_entry` (see `supabase/migrations/20260728000002_atomic_credit_ledger.sql`), which takes a row lock on the subscription before computing the new balance — this exists specifically to prevent lost updates when two credit/debit events race (e.g. a class completion and an auto-renewal webhook landing concurrently). Any new code path that changes a student's credit balance must go through this function rather than doing read-then-write in application code.
- `deduct-class-credit` / `restore-class-credit` edge functions handle the debit-on-completion / refund-on-failure pair; `retryWithBackoff` (`src/utils/retryWithBackoff.ts`) wraps these for transient-failure resilience.
- Referral system: self-service discount codes, referrer rewards in hours (not dollars) — see `src/components/referral/`, `src/hooks/useReferralCode.ts`, `src/utils/referralDiscount.ts`, and the `referral_*` migrations.

### Family accounts (parents)

See `docs/family-accounts-plan.md`. A `parent` role logs in and pays; it's linked to students through `guardian_links` and grants nothing without a link. Children a parent adds are "managed" students: a normal student identity (auth user + profile + `students` row) with no login, a placeholder address `student-<uuid>@managed.learn2lead.page` that must never be emailed, and an optional `profiles.notification_email`.

- **Billing:** any code that finds a student's balance must use `billing_account_for(student)`, i.e. the parent if linked, else the student. In edge functions that's `getBillingAccountId` in `_shared/recipients.ts`. Ledger rows keep `student_id` = the student while `subscription_id` is the payer's.
- **Email:** any email about a student must get its recipients from `student_notification_recipients(student, 'student' | 'parent_only')`, via `getStudentRecipients` in edge functions. Never send to a profile's `email` directly, which could be a placeholder.
- **Existing accounts:** for every account without a parent, both resolve to the student themself, exactly as before.
- **Students with a parent never see billing.** The database enforces it (`has_guardian()` in the billing RLS policies; `check-subscription` returns hours only). Don't add billing UI or queries reachable by a student without the same check.
- **Sign-in:** everyone has a unique `profiles.username` and signs in with "Email or username". Usernames resolve to an account only on the server (`username-login` → `login_email_for_username`, service role only); never expose that lookup to clients.
- **Notifications:** new notifications about a student go through `_shared/notify.ts` (`getTargetsForStudent` / `getTargetForProfile`, then `deliver`), so family routing, each person's per-channel preferences (`notification_preferences`) and text opt-outs apply. Texts need a verified, opted-in number in `contact_methods`; the texting UI is behind `VITE_ENABLE_SMS`.
- **Messaging:** one conversation per student + tutor (`message_threads`). The student's parent(s) and admins can always read it (safeguarding); don't add private tutor–student channels. Reads go through the `get_my_threads` / `get_thread_messages` RPCs; posts only through the `send-message` function, which posts as the user and sends alerts.

### Services layer (`src/services/`)

Business logic and Supabase queries are organized by domain (`class/`, `assignments/`, `students/`, `tutors/`, `logs/`, `security/`), each typically split into `fetch.ts` / `mutations.ts` (or `create.ts`/`update.ts`/`delete.ts`) / `types.ts`. Components should call into these services rather than querying Supabase directly. `src/services/utils/` holds shared mappers/transformers (DB row ↔ app type) used across domains — check there before writing a new one.

### Data fetching

React Query (`@tanstack/react-query`) is the standard for server state; query hooks live under `src/hooks/queries/` (e.g. `useStudentsQuery`, `useClassLogsQuery`), each domain typically with its own `queryKeys.ts`. Realtime updates (Supabase Realtime) are centralized in `useRealtimeManager` rather than each component subscribing independently.

### Supabase types

`src/integrations/supabase/types.ts` is generated from the live schema — regenerate rather than hand-edit after a migration changes the schema (`mcp__supabase__generate_typescript_types` or `supabase gen types`). `src/integrations/supabase/client.ts` is the single Supabase client instance; import it rather than constructing new clients.

### Testing

Jest + Testing Library + jsdom. Config: `jest.config.ts`, setup in `src/setupTests.ts`. Tests live alongside code in `__tests__/` folders (e.g. `src/services/__tests__/`, `src/utils/__tests__/`, `src/components/student/__tests__/`, `src/contexts/__tests__/`). `jest.importMetaEnvTransform.cjs` shims `import.meta.env` for Jest since the app otherwise relies on Vite env handling. Coverage threshold (50% branches/functions/lines/statements) is enforced in both `jest.config.ts` and CI.

### Linting notes

`eslint.config.js` deliberately excludes `**/pages/**`, `src/components/ui/**` (shadcn-generated), and `src/utils/**` from linting — don't be surprised these directories can have lint issues that CI won't flag.

### Observability

Sentry (`src/lib/sentry.ts`) for error monitoring, PostHog (`src/lib/posthog.ts`) for product analytics, both env-gated for production. `src/lib/logger.ts` provides a `logger.create(scope)` pattern used instead of raw `console.*` — prefer it in new code so logs are consistently scoped and stripped appropriately in production builds.
