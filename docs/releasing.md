# Releasing

Real families use the site, so ship in batches at a quiet time (no classes running), never per fix. The front end deploys from `main` through Vercel; the database and edge functions are deployed separately, by hand, in this order.

## 1. Before merging

- The pull request's checks are green: lint, type-check, formatting, unit tests, build, edge-function type-check, and the database tests (a fresh database built from `supabase/migrations`).
- For changes that need the new database or functions first, note the order in the PR description.

## 2. Database migrations

```bash
scripts/release/dry-run-migrations.sh   # runs pending migrations on production, then rolls back
supabase db push --linked               # applies them for real
supabase migration list --linked        # local and remote columns now match
```

The dry run changes nothing: it runs the pending migrations in one transaction and forces an error at the end. If it fails, fix the migration before pushing.

After a schema change, regenerate the types and commit them: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`, then `npx prettier --write` that file.

## 3. Edge functions

```bash
scripts/release/changed-functions.sh <last released commit>   # which functions changed
supabase functions deploy <name> --project-ref lnhtlbatcufmsyoujuqh
supabase functions list --project-ref lnhtlbatcufmsyoujuqh    # each new VERSION went up
```

New secrets go in with `supabase secrets set NAME=value` before deploying the function that reads them.

## 4. Front end

Merge the pull request. Vercel builds and deploys `main` in a few minutes; the page's main script name (`/assets/index-*.js`) changes when the new build is live. Feature flags (`VITE_ENABLE_*`) are Vercel environment variables and need a redeploy to change.

## 5. Check

- Sign in on the live site and open the area you changed.
- Supabase → Edge Functions → Logs: no new errors.
- Sentry: no new issues.

## Production-only pieces

- **Scheduled jobs** (`supabase/cron/jobs.sql`) and **Vault secrets** aren't in migrations, so local and CI databases never call production. Change them on production directly and update the reference file.
