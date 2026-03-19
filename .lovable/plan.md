

## Final Round of Improvements

After four rounds of cleanup, the codebase is in strong shape. Here are the last meaningful items:

---

### 1. Convert `CreditHistory` and `useStudentNotes` to React Query

Both use manual `useState`/`useEffect` fetch patterns, inconsistent with the rest of the codebase which uses React Query. Converting them gives you automatic caching, deduplication, and stale management.

- **`CreditHistory.tsx`**: Replace `useState`+`useEffect` fetch with `useQuery` for credit ledger data
- **`useStudentNotes.ts`**: Replace manual state with `useQuery` for fetching and `useMutation` for creating notes

### 2. Type the realtime handler payloads

`useRealtimeManager.ts` uses `any` for all four handler functions (`handleClassUpdate`, `handleStudentUpdate`, `handleTutorUpdate`, `handleContentShareUpdate`). Replace `any` with Supabase's `RealtimePostgresChangesPayload<T>` generic for type safety.

### 3. Remaining `console.*` → logger (batch)

~35 files still have raw `console.*` calls. The highest-value batch to convert (files with 2+ calls each):

- `calendarUtils.ts` (8 calls — mostly `console.warn`)
- `authActions.ts` (5 calls)
- `useStudentNotes.ts` (2 calls — done as part of task 1)
- `useRoutePersistence.ts` (1 call)
- `RolePromotionDialog.tsx`, `QuarterlyReports.tsx`, `CreditHistory.tsx` (1-2 each)

Remaining single-call files (`ErrorBoundary`, `timeUtils`) can be left as-is since they're in dev-only or utility code.

### 4. Remove `useRealtimeManager` from `useContentShareData`

`useContentShareData.ts` calls `useRealtimeManager` to set up a realtime channel for `content_shares`, but the hook's data comes from React Query (`useContentSharesBaseQuery`). The realtime subscription writes to a local `useState` that's never read. Remove it and instead use React Query's `invalidateQueries` via a lightweight Supabase channel subscription in the base query hook.

---

### Implementation Summary

| Task | Files affected | Effort |
|------|---------------|--------|
| CreditHistory → React Query | `CreditHistory.tsx` | Small |
| useStudentNotes → React Query | `useStudentNotes.ts` | Small |
| Type realtime handlers | `useRealtimeManager.ts` | Small |
| Batch console.* → logger | ~8 files | Small |
| Remove dead realtime in useContentShareData | `useContentShareData.ts` | Trivial |

