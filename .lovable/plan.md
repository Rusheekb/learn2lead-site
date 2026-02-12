

## Keep Completed Classes on Calendar with Visual Indicator

### What Changes

Instead of deleting a scheduled class when it's marked complete, the system will update its status to "completed" and keep it visible on the calendar with a distinct visual indicator.

### Changes Required

**1. Stop deleting completed classes (`src/services/classCompletion.ts`)**
- Remove the delete operation (lines 184-198) that removes the scheduled class after completion
- Replace it with an update that sets `status = 'completed'` on the scheduled class record
- Keep the existing rollback logic but adapt it for the update instead of delete

**2. Update calendar date indicators (`src/components/CalendarWithEvents.tsx`)**
- Modify the `hasEventsOnDate` logic to distinguish between scheduled and completed classes
- Add a second dot indicator (e.g., green checkmark dot) for dates with completed classes, alongside the existing teal dot for scheduled classes
- This gives an at-a-glance view of which days had classes completed vs. upcoming

**3. Update event cards in the day panel (`src/components/CalendarWithEvents.tsx`)**
- Completed classes already show a green "completed" badge -- no change needed there
- Hide the "Add Class" button logic is already role-gated, no change needed
- Optionally add a small checkmark icon next to completed class titles for extra clarity

**4. Filter handling for tutor scheduler**
- The tutor's `fetchScheduledClasses` already fetches all statuses, so completed classes will appear automatically
- No query changes needed

### Technical Detail

```text
In classCompletion.ts, replace lines 184-198:

BEFORE:
  // Delete the scheduled class
  const { error: deleteError } = await supabase
    .from('scheduled_classes')
    .delete()
    .eq('id', data.classId);

AFTER:
  // Mark the scheduled class as completed (keep on calendar)
  const { error: updateError } = await supabase
    .from('scheduled_classes')
    .update({ status: 'completed', attendance: 'present' })
    .eq('id', data.classId);

Error handling and rollback logic will be updated accordingly.
```

```text
In CalendarWithEvents.tsx, update the calendar modifiers:

- Scheduled classes: teal dot (existing behavior)
- Completed classes: green dot or checkmark indicator
- Days with both: show both indicators

The DayContent component will render different colored dots
based on whether events on that date are scheduled vs completed.
```

### What Won't Change
- The class log creation flow remains the same
- Credit deduction logic is untouched
- Admin class logs table is unaffected
- Student calendar view will also benefit (they'll see their completed classes)

### Risk Considerations
- The duplicate completion guard (Class ID check) already prevents re-completing a class
- Tutors cannot re-complete because the status will be "completed" and the CompletedClassActions component handles that state
- No database schema changes needed -- the `status` column already supports "completed"

