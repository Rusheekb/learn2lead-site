

## Problem

The "Record Payment" feature shows "$0.00 owed" because of a **name mismatch** between two tables:

- The `students` table stores the student's name as **"bar"**
- The `class_logs` table stores the student name as **"bar@gmail.com"** (the email fallback)

When the Record Payment dialog queries for unpaid class logs, it filters by `Student Name = 'bar'`, which doesn't match any records since they're stored under `'bar@gmail.com'`.

## Root Cause

When class logs are created (via the `complete_class_atomic` function or auto-creation), the student name is pulled from the `profiles` table. If the profile has no first/last name set, it falls back to the email address. Meanwhile, the `students` table may have been manually set to a shorter display name.

## Proposed Fix

Update the `StudentPaymentRecorder` component to query unpaid class logs using **both** the student name AND their email, so it catches records regardless of which identifier was used.

### Technical Details

**File: `src/components/admin/class-logs/StudentPaymentRecorder.tsx`**

1. In the summary fetch effect (~line 105), change the unpaid logs query from:
   ```
   .eq('Student Name', selectedStudent.name)
   ```
   to:
   ```
   .or(`Student Name.eq.${selectedStudent.name},Student Name.eq.${selectedStudent.email}`)
   ```

2. Apply the same fix to the "last paid date" query (~line 113):
   ```
   .or(`Student Name.eq.${selectedStudent.name},Student Name.eq.${selectedStudent.email}`)
   ```

This is a safe, minimal change -- it broadens the query to match either the display name or the email, without altering any write logic or data.

