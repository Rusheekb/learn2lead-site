

## Remaining Improvements

After a thorough review, here are the actionable items left:

---

### 1. Delete more dead service files (no importers)

- **`src/services/profiles.ts`** -- identical to `src/services/auth/profileService.ts`, and **neither is imported anywhere**. The `useProfile` hook does inline Supabase queries. Delete both files.
- **`src/services/content/contentShareService.ts`** -- a pure re-export barrel of `src/services/content-shares.ts`. Update the 2 consumers (`useContentSharesBaseQuery.ts`, `useContentSharesMutations.ts`) to import directly from `@/services/content-shares`, then delete the barrel.
- **`src/services/supabaseClient.ts`** -- now only imported by `src/services/content-shares.ts` and `src/services/profiles.ts`. After deleting profiles.ts, move `handleResult` into `content-shares.ts` (its only remaining consumer) or a shared utility, then delete `supabaseClient.ts`.

### 2. Replace `console.log/error` with structured logger

~17 hooks still use raw `console.log`/`console.error` instead of the project's `logger` utility. Key offenders:
- `useRoleSync.ts`, `useSidebar.tsx`, `useProfile.ts`, `useClassCompletionStatus.ts`, `useSimplifiedTutorScheduler.ts`, `useReferralCode.ts`, `useUserRole.ts`
- Realtime callbacks in `useStudentsQuery`, `useTutorsQuery`, `useStudentClassesQuery`, `useNotifications`, `useContentSharesBaseQuery`

Replace with `logger.create('hookName')` for consistent, filterable logging.

### 3. Duplicate Toasters in route tree

In `App.tsx`, `<Toaster />` and `<Sonner />` are rendered **only inside the private route wrapper** (line 139-140). Public pages (login, pricing, home) use `toast()` from sonner but have no `<Sonner />` mounted, so toasts on public pages are silently lost. Move both Toasters to the top level of the `App` component, outside the route tree.

### 4. `useProfile` should use React Query instead of manual cache

`useProfile.ts` implements a hand-rolled `Map` cache with manual `useState`/`useEffect` loading. This duplicates what React Query provides (caching, stale management, deduplication). Refactor to `useQuery` for consistency with the rest of the codebase.

---

### Implementation Summary

| Task | Files affected | Effort |
|------|---------------|--------|
| Delete dead service files | 3 files deleted, 3 updated | Small |
| Replace console.* with logger | ~12 hook files | Small |
| Fix Toaster placement | `App.tsx` | Trivial |
| Refactor useProfile to React Query | `useProfile.ts` | Medium |

