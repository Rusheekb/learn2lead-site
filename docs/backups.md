# Backups

A GitHub Actions workflow (`.github/workflows/backup.yml`) dumps the production database every Sunday:

- roles, schema, and data for `public`, `auth` and `storage`;
- encrypted with AES-256 before it's stored;
- kept as a workflow artifact for 30 days.

It can also be run by hand: Actions → Database backup → Run workflow.

Uploaded files (class materials, avatars) are not in the dump; only the storage records are.

## Turning it on

Add two repository secrets (GitHub → Settings → Secrets and variables → Actions):

- `SUPABASE_DB_URL`: Supabase → Connect → Session pooler connection string, with the database password filled in.
- `BACKUP_PASSPHRASE`: at least 24 random characters. Keep a copy somewhere safe (a password manager): without it, backups can't be decrypted.

The repository is public, so anyone signed in to GitHub can download the encrypted file. That's why the passphrase must be long and random, and must never be committed.

## Restoring

Restore into a **new** Supabase project, or a local one (`supabase start`). Never restore over production without a plan.

```bash
gpg --decrypt learn2lead-YYYY-MM-DD.tar.gz.gpg | tar -xzf -   # asks for the passphrase
psql "$TARGET_DB_URL" -f roles.sql
psql "$TARGET_DB_URL" -f schema.sql
psql "$TARGET_DB_URL" -c "SET session_replication_role = replica" -f data.sql
```

Then re-create the production-only pieces: the scheduled jobs (`supabase/cron/jobs.sql`), the Vault secret `cron_secret`, and the edge-function secrets.
