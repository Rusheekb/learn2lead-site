

## Recommended Improvements to the Class Logging System

### 1. Delete dead code: `TransformedClassLog` type and `dataService.ts` functions

**Problem:** `TransformedClassLog` in `src/services/logs/types.ts` is marked `@deprecated` and has zero imports. The `fetchClassLogs` function in `src/services/classLogsService.ts` is also unused — the hook now queries Supabase directly. `dataService.ts` has legacy functions (`fetchTutors`, payment record types) that duplicate what the hook already does.

**Action:**
- Remove `TransformedClassLog` from `src/services/logs/types.ts`
- Remove `fetchClassLogs` from `src/services/classLogsService.ts` (only `createClassLog`, `updateClassLog`, `deleteClassLog` are imported)
- Audit `dataService.ts` — `fetchStudents` is still used by `StudentsManager.tsx`, but the class-log-related functions (`fetchTutors`, payment types) should be removed or migrated

### 2. Move summary totals to a database aggregate query

**Problem:** `useClassLogs` fetches *every* record via `fetchAllBatched` just to compute 5 payment totals and populate the export. With thousands of records this downloads megabytes of data on every page load.

**Action:** Create a lightweight RPC (`get_class_log_totals`) that returns aggregate sums:
```sql
CREATE FUNCTION get_class_log_totals(
  p_search text DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_payment_filter text DEFAULT NULL
) RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'total_class_cost', COALESCE(SUM("Class Cost"), 0),
    'total_tutor_cost', COALESCE(SUM("Tutor Cost"), 0),
    'pending_student', COALESCE(SUM(CASE WHEN student_payment_date IS NULL THEN "Class Cost" ELSE 0 END), 0),
    'pending_tutor', COALESCE(SUM(CASE WHEN tutor_payment_date IS NULL THEN "Tutor Cost" ELSE 0 END), 0)
  ) FROM class_logs WHERE ...filters...
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```
Replace the `fetchAllBatched` summary query with this RPC. Keep batched fetching only for CSV export (triggered on-demand, not on mount).

### 3. Lazy-load CSV export data

**Problem:** The `allClassesRaw` query (batched fetch of all records) runs on mount with `staleTime: 60s`. This is wasteful since exports are rare.

**Action:** Change the summary query to `enabled: false` and trigger it only when the user clicks Export. Use `refetch()` on the export button click, then pass the data to `exportClassLogsToCSV`.

### 4. Add secondary sort by time for same-date records

**Problem:** Records on the same date appear in arbitrary order. The paginated query only sorts by `Date`.

**Action:** Add `.order('Time (CST)', { ascending: false })` as a secondary sort in both the paginated query and the RPC.

### 5. Remove `classLogsService.ts` CRUD functions — inline into hook

**Problem:** `createClassLog`, `updateClassLog`, `deleteClassLog` in `classLogsService.ts` are thin Supabase wrappers used only by `useClassLogs`. The update mutation in the hook already re-maps fields manually before calling `updateClassLog`, creating a double-mapping layer.

**Action:** Inline the Supabase calls directly in the mutation functions within `useClassLogs`, eliminating the middleman service file. This reduces indirection and makes the field mapping happen in one place.

---

### Summary of changes

| Change | Benefit |
|--------|---------|
| DB aggregate RPC for totals | Eliminates full-table download on every page load |
| Lazy-load export data | Only fetches all records when user actually exports |
| Secondary sort by time | Consistent ordering for same-date records |
| Delete dead types/functions | Less code to maintain |
| Inline CRUD into hook | Single field-mapping layer, less indirection |

