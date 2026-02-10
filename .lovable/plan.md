
# Auto-Fill Class Costs with Default Rates

## Problem
Class logs have empty `Class Cost` and `Tutor Cost` fields, making payment totals show $0. Manually entering costs per class is tedious, and rates can change over time due to raises.

## Solution
Store a **default class rate** on each student and use the existing **tutor hourly rate** to automatically populate costs when a class is created. When rates change (raises), you update the student or tutor record once, and all future classes pick up the new rate. Historical classes keep their original costs.

## What Changes

### 1. Database: Add `class_rate` to `students` table
A new column stores each student's per-class cost (what the parent pays). The `tutors` table already has `hourly_rate`.

```sql
ALTER TABLE public.students ADD COLUMN class_rate numeric DEFAULT NULL;
```

### 2. Student Manager: Set Class Rate
Add a "Class Rate ($)" input field to the Student Form so you can set each student's rate. The Student Table will also display the rate.

### 3. Auto-Fill Costs on Class Creation
When a class log is created (via the tutor scheduler or CSV import), the system will:
- Look up the student's `class_rate` from the `students` table and set it as `Class Cost`
- Look up the tutor's `hourly_rate` from the `tutors` table and set it as `Tutor Cost`
- Only auto-fill if the cost fields are not already provided (manual overrides still work)

### 4. Bulk Backfill Existing Logs
Add an admin action ("Apply Default Rates to Empty Logs") that updates all existing class logs where costs are NULL, using the current student/tutor rates. This fills in your historical data in one click.

### 5. Rate Change Workflow
When a tutor or student gets a raise:
1. Update the rate on their student/tutor record
2. All **future** classes automatically use the new rate
3. **Past** classes keep their original rate (accurate historical records)

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/students/StudentForm.tsx` | Add "Class Rate" number input |
| `src/components/admin/students/StudentTable.tsx` | Show class rate column |
| `src/services/class-logs.ts` | Look up student/tutor rates when `Class Cost` or `Tutor Cost` are missing |
| `src/components/admin/ClassLogs.tsx` | Add "Apply Default Rates" button for backfilling |

## Technical Details

### Auto-fill logic in `createClassLog`
Before inserting, if `Class Cost` is null:
1. Query `students` table by `Student Name` to get `class_rate`
2. Query `tutors` table by `Tutor Name` to get `hourly_rate`
3. Set `Class Cost = class_rate` and `Tutor Cost = hourly_rate`

### Backfill query
The "Apply Default Rates" button runs:
```sql
UPDATE class_logs
SET "Class Cost" = s.class_rate
FROM students s
WHERE class_logs."Student Name" = s.name
  AND class_logs."Class Cost" IS NULL
  AND s.class_rate IS NOT NULL;

UPDATE class_logs
SET "Tutor Cost" = t.hourly_rate
FROM tutors t
WHERE class_logs."Tutor Name" = t.name
  AND class_logs."Tutor Cost" IS NULL
  AND t.hourly_rate IS NOT NULL;
```

### No impact on existing data
- Only fills NULL costs; never overwrites existing values
- Historical classes with manually entered costs are untouched
- Rate changes only affect future classes
