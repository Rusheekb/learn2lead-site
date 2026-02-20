
## Fix Zoom Link Auto-Fill in Schedule New Class Dialog

### Root Cause
In `src/hooks/useSimplifiedTutorScheduler.ts`, the `currentUser` object passed into the scheduling dialog is a hardcoded mock:

```typescript
const currentUser = useMemo(() => ({ 
  first_name: 'Current', 
  last_name: 'Tutor'   // No zoom_link!
}), []);
```

Because `currentUser.zoom_link` is always `undefined`, the `AddClassDialog`'s initialization code (`zoomLink: currentUser?.zoom_link || ''`) never has a value to fill in.

The tutor's `zoom_link` **is** saved in the database (the profile page shows it and has a helper text "This link will auto-fill when you schedule new classes"), but it's never actually fetched in the scheduler hook.

### Fix: Fetch the Real Profile in the Scheduler Hook

**Modified file: `src/hooks/useSimplifiedTutorScheduler.ts`**

Replace the hardcoded mock `currentUser` with a real Supabase query for the tutor's profile:

1. Add a `useQuery` call that fetches `profiles` for the current `user.id`, selecting `first_name`, `last_name`, and `zoom_link`
2. Use the fetched profile data as `currentUser` instead of the hardcoded object
3. Keep the type safe by including `zoom_link: string | null` in the return type

This is a single-file change. No database migrations, no new components, no edge function changes needed.

### What Changes

| File | Change |
|------|--------|
| `src/hooks/useSimplifiedTutorScheduler.ts` | Replace mock `currentUser` with a real Supabase profile query |

### How It Works After the Fix

1. Tutor opens the "Schedule New Class" dialog
2. `AddClassDialog` initializes with `zoomLink: currentUser?.zoom_link || ''`
3. Since `currentUser.zoom_link` now contains the tutor's saved Zoom link, the field pre-fills automatically
4. Tutor can override it per-class if needed
