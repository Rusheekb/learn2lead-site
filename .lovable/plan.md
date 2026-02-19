

## Block Class Scheduling When Student Has 0 Credits

### Problem
Currently, tutors can schedule classes for students with 0 credits. The credit check only happens at class completion time, which creates a confusing experience -- a class gets scheduled, both parties prepare, and then it fails when the tutor tries to mark it complete.

### Solution
Add a credit balance check in the class scheduling flow so tutors see a clear warning and are prevented from scheduling if the student has no credits.

### Changes

**1. AddClassDialog.tsx -- Add credit check on student selection**

When the tutor selects a student from the dropdown, fetch that student's credit balance using the existing `get_student_credit_balance` database function. If the balance is 0:
- Show a warning banner in the dialog: "This student has no credits remaining. They need to purchase credits before a class can be scheduled."
- Disable the "Schedule Class" button
- Include a visual indicator next to the student's name in the dropdown (e.g., a red dot or "(0 credits)" label)

If credits are low (1-2), show a softer warning: "This student only has X credit(s) remaining."

**2. Database RPC call for credit check**

Use the existing `get_student_credit_balance(p_student_id)` function which is already a `SECURITY DEFINER` function. Call it via `supabase.rpc('get_student_credit_balance', { p_student_id: studentId })` when a student is selected.

**3. Optional: Show credits in student dropdown**

Enhance the student options list to include each student's credit count, fetched in bulk when the dialog opens. This gives the tutor immediate visibility without needing to select each student individually.

---

### Technical Details

**Modified files:**
| File | Change |
|------|--------|
| `src/components/tutor/dialogs/AddClassDialog.tsx` | Add credit balance fetch on student select, show warning banner, disable submit button when 0 credits |

**No new files, no database changes, no edge function changes needed** -- the `get_student_credit_balance` RPC already exists.

**Key code flow:**
1. Tutor opens "Schedule New Class" dialog
2. Tutor selects a student from the dropdown
3. `handleStudentChange` fires -- in addition to current logic, calls `supabase.rpc('get_student_credit_balance', { p_student_id: studentId })`
4. Result stored in component state (e.g., `studentCredits`)
5. If `studentCredits === 0`: show red Alert banner, disable "Schedule Class" button
6. If `studentCredits <= 2`: show amber warning
7. If `studentCredits > 2`: normal flow, no warning

**What this does NOT change:**
- The completion-time credit check remains as a safety net
- Admin override behavior is unchanged
- Students paying via Zelle/manual credits are handled the same way (the ledger function works for all payment methods)

