#!/usr/bin/env bash
# Database behaviour tests (access rules, billing and email routing, logins,
# notifications, messaging, storage). Run them against a LOCAL database built
# from supabase/migrations — never production:
#
#   supabase db start          # or: supabase db reset (for a fresh database)
#   supabase/tests/run.sh
#
# Each suite runs inside a transaction that's rolled back, except suites whose
# first line says "autocommit" (they run last and need a fresh database).
set -uo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$DB_URL" in
  *@127.0.0.1:* | *@localhost:*) ;;
  *) echo "Refusing to run: DB_URL must point at a local database." >&2; exit 2 ;;
esac

cd "$(dirname "$0")"
total=0
failed=0
for file in [0-9]*.test.sql; do
  if head -1 "$file" | grep -q autocommit; then
    output=$(psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$file" 2>&1)
  else
    output=$({ echo 'BEGIN;'; cat "$file"; echo 'ROLLBACK;'; } | psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 2>&1)
  fi
  status=$?
  passed=$(grep -c 'ok - ' <<<"$output")
  total=$((total + passed))
  if [ $status -ne 0 ] || grep -q 'FAIL:' <<<"$output"; then
    failed=$((failed + 1))
    echo "✗ $file ($passed passed before failing)"
    grep -E 'FAIL:|ERROR:' <<<"$output" | head -5 | sed 's/^/    /'
  else
    echo "✓ $file ($passed checks)"
  fi
done

echo
if [ $failed -ne 0 ]; then
  echo "$failed suite(s) failed; $total checks passed."
  exit 1
fi
echo "All database tests passed ($total checks)."
