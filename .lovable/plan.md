

# Recurring Classes for Tutors

## Approach
The most efficient way: **client-side batch insertion**. When a tutor enables recurrence, we generate multiple individual `scheduled_classes` rows (one per week) up to a chosen end date. No new database tables or schema changes are needed -- each recurring instance is a normal scheduled class.

This is simpler and more reliable than a recurring-rules engine because:
- Each class remains independently editable, completable, and deletable
- No new cron jobs or server-side expansion logic
- Works with existing credit checks, completion flow, and calendar views
- Tutors can cancel individual weeks without affecting the series

## What the Tutor Sees

In the "Schedule New Class" dialog, after the existing date picker, a new section appears:

```text
[x] Repeat weekly

Repeat until: [Date picker - e.g., 4 weeks out]

This will create 4 classes on Tuesdays at 3:00 PM.
```

- Toggle defaults to off (single class, current behavior)
- When enabled, a "Repeat until" date picker appears
- A summary line shows how many classes will be created and on which day
- Maximum limit of 12 weeks to prevent accidental mass creation
- Credit balance warning updates to show total credits needed vs available

## Technical Details

### Files to modify

| File | Change |
|------|--------|
| `src/components/tutor/NewClassEventForm.tsx` | Add "Repeat weekly" switch, "Repeat until" date picker, and summary text below the date/time section |
| `src/components/tutor/dialogs/AddClassDialog.tsx` | Update `handleSubmit` to loop and create multiple classes when recurrence is enabled; update credit check to account for total classes |
| `src/hooks/useSimplifiedTutorScheduler.ts` | Update `handleCreateEventActual` to accept and process an array of dates for batch creation |
| `src/services/class/create.ts` | Add a new `createScheduledClassBatch` function that inserts multiple rows in a single Supabase call |

### No database changes needed
The `scheduled_classes` table already has all necessary columns. Each recurring instance is stored as its own row with its own date. The `ClassEvent` type already has `recurring` and `recurringDays` fields (unused until now).

### Recurrence logic (client-side)
When the tutor toggles "Repeat weekly" and picks an end date:
1. Calculate the day-of-week from the selected start date
2. Generate all weekly dates from start date to end date (same weekday)
3. On submit, batch-insert all classes with the same title, subject, student, time, and zoom link but different dates
4. Show a single success toast: "4 classes scheduled (Tuesdays, Feb 25 - Mar 18)"

### Batch insert function
A new `createScheduledClassBatch` in `src/services/class/create.ts` that:
- Accepts an array of date strings + shared class data
- Builds an array of insert objects
- Calls `supabase.from('scheduled_classes').insert(rows)` in one query
- Returns the count of successfully created classes

### Credit validation
- When recurrence is enabled, multiply the number of classes by the per-class credit cost
- Update the warning banner in `AddClassDialog` to show: "This student has 3 credits. Scheduling 4 classes requires 4 credits."
- Still allow scheduling even with insufficient credits (soft warning, not a blocker), since credits can be purchased before the class date

### Form state
Add two new fields to the `newEvent` partial state:
- `recurring: boolean` (default false)
- `recurringUntil: Date | null` (the end date for recurrence)

These use the existing `recurring` field on `ClassEvent` and add `recurringUntil` as a transient form-only field.

