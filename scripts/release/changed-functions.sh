#!/usr/bin/env bash
# Edge functions to deploy: those changed since a git ref (default: the
# previous release tag or origin/main's previous merge). A change under
# supabase/functions/_shared lists every function, since they share it.
#
#   scripts/release/changed-functions.sh v2026.10.16
set -euo pipefail
cd "$(dirname "$0")/../.."
since="${1:-HEAD~1}"
changed=$(git diff --name-only "$since" -- supabase/functions | grep -v '/__tests__/' || true)
if grep -q '^supabase/functions/_shared/' <<<"$changed"; then
  ls -d supabase/functions/*/ | xargs -n1 basename | grep -v '^_shared$'
else
  sed -n 's#^supabase/functions/\([^/]*\)/.*#\1#p' <<<"$changed" | sort -u
fi
