
## Fix: Calendar Showing Stale "Completed" Classes

### Root Cause

The Calendar and Class History pull from **two separate tables**:

| View | Table | Purpose |
|---|---|---|
| Class History tab | `class_logs` | Permanent record of completed sessions |
| Calendar (Scheduler) | `scheduled_classes` | Active/upcoming scheduled sessions |

When you deleted the log from Supabase directly (from `class_logs`), the Class History correctly went empty. But the Calendar is still showing the entry because the corresponding row in `scheduled_classes` still exists with `status = 'completed'`.

In normal operation, the `complete_class_atomic` database function atomically:
1. Inserts into `class_logs`
2. Deletes from `scheduled_classes`

But the session you deleted was left behind in `scheduled_classes` with a `completed` status instead of being removed. The calendar currently shows **all** entries from `scheduled_classes`, including completed ones.

### The Fix

**Filter out completed classes from the calendar view** in `useSimplifiedTutorScheduler.ts`.

Currently the query fetches all rows without filtering by status. We need to add `.neq('status', 'completed')` to the Supabase query so that the calendar only shows genuinely upcoming/active sessions.

This is the correct long-term fix because:
- Completed classes belong in `class_logs` / Class History, not the calendar
- The calendar should only show what needs to happen, not what already happened
- It prevents any future "completed" strays from showing on the calendar

**File to change:**
| File | Change |
|---|---|
| `src/hooks/useSimplifiedTutorScheduler.ts` | Add `.neq('status', 'completed')` to the `scheduled_classes` query |

This is a one-line change. No database migrations or new components needed.

### After the Fix

- The calendar will only show scheduled/active upcoming classes
- Completed classes will only appear in the Class History tab (from `class_logs`)
- The stale "completed" entry currently visible on the calendar will disappear

### Cleanup of the Orphaned Row

The specific row currently visible ("New Class Session - completed" on Feb 11) is an orphaned `scheduled_classes` row that should have been deleted when the class was marked complete. After the code fix, it will no longer show on the calendar. You can also optionally delete it directly from the `scheduled_classes` table in Supabase if you want to clean up the database.
