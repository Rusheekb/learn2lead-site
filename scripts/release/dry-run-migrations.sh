#!/usr/bin/env bash
# Rehearse pending migrations on PRODUCTION without changing anything.
#
# Runs every local migration that production hasn't applied yet, in order, in
# one transaction, then deliberately raises an error so Postgres rolls it all
# back. Run it right before `supabase db push --linked` (see docs/releasing.md).
#
# Limits: a migration that uses a value it just added to an enum can't be
# rehearsed together with that ALTER TYPE (split them, as 20261015000001 did);
# migrations must not contain their own BEGIN/COMMIT.
set -euo pipefail
cd "$(dirname "$0")/../.."

pending=$(supabase migration list --linked 2>/dev/null |
  awk -F'|' 'NR > 2 { l = $1; r = $2; gsub(/ /, "", l); gsub(/ /, "", r); if (l != "" && r == "") print l }')
if [ -z "$pending" ]; then
  echo "No pending migrations."
  exit 0
fi

script=$(mktemp)
trap 'rm -f "$script"' EXIT
echo "SET lock_timeout = '2s';" >"$script"
for version in $pending; do
  file=$(ls supabase/migrations/"${version}"_*.sql)
  echo "Including $file"
  { cat "$file"; echo; } >>"$script"
done
echo "DO \$dryrun\$ BEGIN RAISE EXCEPTION 'DRYRUN_OK'; END \$dryrun\$;" >>"$script"

output=$(supabase db query --linked -f "$script" 2>&1 || true)
if grep -q DRYRUN_OK <<<"$output"; then
  echo "Dry run passed; everything was rolled back. Pending: $(echo $pending)"
else
  echo "Dry run FAILED (nothing was changed):" >&2
  grep -o '"message":"[^"]*' <<<"$output" | sed 's/"message":"//' >&2 || echo "$output" >&2
  exit 1
fi
