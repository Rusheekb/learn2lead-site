

## Remaining Improvements

The codebase is in good shape after the previous rounds. Here are the final items worth addressing:

---

### 1. Delete unused `usePerformance.ts` hook

`src/hooks/usePerformance.ts` is imported by zero files. It also has a broken pattern -- `createMemoizedFilter` calls `useMemo` inside a `useCallback`, which violates the Rules of Hooks. Delete it entirely.

### 2. Remove no-op `useRealtimeManager` call in ClassCalendarContainer

`ClassCalendarContainer.tsx` calls `useRealtimeManager()` without passing any `setClasses` callback, so it subscribes to nothing. This is dead code -- remove the call and import.

### 3. Remove pass-through wrapper `ContentShare.tsx`

`src/components/shared/ContentShare.tsx` is a single-line wrapper that delegates to `ContentShareContainer`. Its only consumer is `SharedContentTab.tsx`. Update `SharedContentTab` to import `ContentShareContainer` directly and delete `ContentShare.tsx`.

### 4. Replace remaining `console.*` with structured logger in services and components

Two service files (`errorHandling.ts`, `dateTimeTransformers.ts`) and ~30 component files still use raw `console.log/error`. The most impactful ones to convert:
- `src/contexts/AuthContext/AuthProvider.tsx` (5 calls)
- `src/contexts/SubscriptionContext/SubscriptionProvider.tsx` (6 calls)
- `src/components/admin/ManualCreditAllocation.tsx` (4 calls)
- `src/components/admin/class-logs/StudentPaymentRecorder.tsx` (2 calls)
- `src/components/admin/class-logs/CsvUploader.tsx` (3 calls)

Other component files with 1-2 console calls can be batched together.

### 5. Fix `useContentShareData` mock functions

`useContentShareData.ts` has empty no-op functions for `loadShares`, `handleDownload`, and `markAsViewed`. These should either be implemented or removed from the return value to avoid confusing consumers.

---

### Implementation Summary

| Task | Files affected | Effort |
|------|---------------|--------|
| Delete `usePerformance.ts` | 1 file deleted | Trivial |
| Remove dead realtime call | `ClassCalendarContainer.tsx` | Trivial |
| Remove `ContentShare.tsx` wrapper | 2 files | Trivial |
| Standardize remaining console.* | ~10 files (high-impact subset) | Small |
| Fix or remove mock functions in useContentShareData | 1 file | Small |

