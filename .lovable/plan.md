

## Fix: Auto-populate Class Cost and Tutor Cost on class completion

### Root Cause
When a tutor marks a scheduled class as "completed", the `completeClass` function in `src/services/classCompletion.ts` creates a class log entry but never includes `Class Cost` or `Tutor Cost`. These fields are simply omitted from the insert, so they default to NULL (displayed as $0.00).

The auto-fill logic that fetches rates from the `students` and `tutors` tables exists in a different code path (`src/services/class-logs.ts`) that is only used for admin CSV imports -- not during normal class completion.

### Solution
Modify `src/services/classCompletion.ts` to look up the student's `class_rate` and tutor's `hourly_rate` from their respective tables before inserting the class log.

### Changes

**File: `src/services/classCompletion.ts`**

1. After verifying the class exists and before the class log insert (around line 109), add two database lookups:
   - Query the `students` table for `class_rate` using the student name
   - Query the `tutors` table for `hourly_rate` using the tutor name

2. Include the fetched rates in the class log insert as `'Class Cost'` and `'Tutor Cost'`

The lookup will use `.maybeSingle()` so that if no matching record is found, the cost simply stays NULL rather than blocking the completion flow.

### Technical Detail

```text
Before insert, add:

  // Fetch student class rate
  const { data: studentData } = await supabase
    .from('students')
    .select('class_rate')
    .eq('name', data.studentName)
    .maybeSingle();

  // Fetch tutor hourly rate
  const { data: tutorData } = await supabase
    .from('tutors')
    .select('hourly_rate')
    .eq('name', data.tutorName)
    .maybeSingle();

Then add to the insert object:
  'Class Cost': studentData?.class_rate ?? null,
  'Tutor Cost': tutorData?.hourly_rate ?? null,
```

This ensures every newly completed class automatically picks up the saved rates without requiring any admin intervention.
