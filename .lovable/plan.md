

## Plan: Use `complete_class_atomic` RPC, consolidate transformers, unify query hooks

### 1. Replace manual class completion with `complete_class_atomic` RPC

**File: `src/services/classCompletion.ts`**

The current `completeClass` function performs 5+ separate queries (check existence, deduct credit, check duplicate log, lookup rates, insert log, update status) with fragile rollback logic. The `complete_class_atomic` database function already handles all of this atomically with advisory locking.

Changes:
- Keep the credit deduction edge function call (it handles the ledger/subscription updates that the RPC doesn't)
- Replace the post-credit steps (lines 127-230) — duplicate check, rate lookup, log insert, status update, rollback — with a single `supabase.rpc('complete_class_atomic', {...})` call
- The RPC handles: advisory lock, existence check, duplicate prevention, name resolution via UUID joins, log insertion with `tutor_user_id`/`student_user_id`, and scheduled class deletion
- Keep the existing toast/analytics/Sentry instrumentation around the RPC call
- Remove the credit restore fallback code since the RPC is atomic (if it fails, nothing was inserted)

### 2. Consolidate duplicate transformers into one

**Current state:** Two transformers doing the same thing:
- `src/services/logs/transformers.ts` → `transformClassLog()` returns `TransformedClassLog`
- `src/services/utils/classEventMapper.ts` → `transformDbRecordToClassEvent()` returns `ClassEvent`

**Action:**
- Keep `transformDbRecordToClassEvent` in `classEventMapper.ts` as the single canonical transformer (it returns `ClassEvent` which is the type used everywhere in the UI)
- Update `classLogsService.ts` to import and use `transformDbRecordToClassEvent` instead of `transformClassLog`
- Update `src/services/logs/transformers.ts`: keep `transformCodeLog` if it has consumers, re-export `transformDbRecordToClassEvent` as `transformClassLog` for any remaining references
- Remove the `TransformedClassLog` type from `src/services/logs/types.ts` — use `ClassEvent` instead

### 3. Unify class log query hooks

**Current state:** Two hooks with different query keys and duplicate realtime subscriptions:
- `useSimplifiedClassLogs` (query key `['class-logs']`) — used via `useClassLogs` wrapper by `ClassLogs.tsx` and `StudentsManager.tsx`
- `useClassLogsQuery` (query key `['classLogs', 'list']`) — exported from `hooks/queries/index.ts` but not actively consumed

**Action:**
- Merge into a single `useClassLogs` hook in `src/hooks/useClassLogs.ts` that:
  - Uses one query key: `['class-logs']`
  - Contains the query, realtime subscription, filtering, pagination, and payment toggle logic from `useSimplifiedClassLogs`
  - Exposes CRUD mutations (create/update/delete) from `useClassLogsQuery`
  - Uses `transformDbRecordToClassEvent` as the transformer
- Delete `src/hooks/useSimplifiedClassLogs.ts`
- Update `src/hooks/queries/useClassLogsQuery.ts` to re-export from `useClassLogs` for backward compatibility
- No changes needed in `ClassLogs.tsx` or `StudentsManager.tsx` — they already import `useClassLogs`

### Summary of files changed

| File | Change |
|------|--------|
| `src/services/classCompletion.ts` | Replace manual steps with `rpc('complete_class_atomic')` |
| `src/hooks/useClassLogs.ts` | Merged hook with query, mutations, realtime, filters |
| `src/hooks/useSimplifiedClassLogs.ts` | Delete |
| `src/hooks/queries/useClassLogsQuery.ts` | Thin re-export wrapper |
| `src/services/classLogsService.ts` | Use `transformDbRecordToClassEvent` |
| `src/services/logs/transformers.ts` | Remove `transformClassLog`, keep `transformCodeLog` |
| `src/services/utils/classEventMapper.ts` | No changes (already canonical) |

