

## Recommended Improvements

After reviewing the codebase, here are the remaining issues worth addressing, grouped by priority:

---

### 1. Dead code and duplicate files

- **`postcss.config 2.js`** is a duplicate of `postcss.config.js` (likely from an accidental copy). Delete it.
- **`src/lib/supabase.ts`** creates a second Supabase client using env vars, but nothing imports it. The canonical client is `src/integrations/supabase/client.ts`. Delete `src/lib/supabase.ts`.
- **`src/utils/dynamicImports.ts`** is an empty placeholder with no consumers. Delete it.
- **`pages/index.js`** at the project root appears to be a stale Next.js artifact. Delete it.
- **`src/services/classService.ts`** is a one-line re-export barrel from `./class`. Inline these imports at the call sites and delete the file.

### 2. Inconsistent Supabase client imports

Two files (`src/services/assignments/mutations.ts` and `src/services/assignments/fetch.ts`) import supabase from `@/services/supabaseClient` instead of the canonical `@/integrations/supabase/client`. Update them to use the canonical import and consider whether `src/services/supabaseClient.ts` (which re-exports + adds `handleResult`) should itself be consolidated or its `handleResult` moved to a utility.

### 3. Student payment methods keyed by name (fragile)

In `useClassLogs.ts` (line 212-225), `studentPaymentMethods` maps `student.name -> payment_method`. If two students share the same name, data collides. This should use a stable identifier (student email or ID) as the key, with a corresponding update to how `ClassTable` looks up the payment method.

### 4. `useRoleSync` called outside AuthProvider

In `App.tsx` line 196, `useRoleSync()` is called in the `App` component, which is **above** the `<AuthProvider>` in the tree. If `useRoleSync` depends on `useAuth()`, it will fail or use stale data. It should be moved inside `AuthProvider`.

### 5. Realtime channel leak potential

The realtime subscription in `useClassLogs.ts` (line 228-243) runs for every mount of the hook. Since the hook is used in the admin ClassLogs page, this is fine as a singleton. But if it were ever used in multiple components simultaneously, it would create duplicate channels. Consider adding a unique channel name with a ref or deduplicating via a shared context.

---

### Implementation Summary

| Task | Files affected | Effort |
|------|---------------|--------|
| Delete dead files | 4 files deleted | Trivial |
| Standardize supabase imports | 2-3 files | Small |
| Fix payment method key collision | `useClassLogs.ts`, `ClassTable.tsx` | Small |
| Move `useRoleSync` inside AuthProvider | `App.tsx` | Trivial |

Total: ~30 minutes of implementation work across small, low-risk changes.

