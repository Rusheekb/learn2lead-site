

# Record Payment: Batch Payment + Credits with Confirmation Flow

## Overview
Add a "Record Payment" dialog to Class Logs that lets admins enter a dollar amount received from a student. The system shows a **preview of current state** before input, then a **confirmation screen** after input showing exactly what will happen -- classes marked paid, credits added, and any surplus stored.

## Two-Step Flow

```text
Step 1: Student Summary (after selecting student)
+------------------------------------------+
| Student: John Smith                      |
| Class Rate: $30/class                    |
| Payment Method: Zelle                    |
| Current Credits: 5                       |
| Unpaid Classes: 3 ($90 owed)             |
| Prepaid Balance: $0                      |
| Last Paid Date: 1/15/26                  |
|                                          |
| Amount Received: $________               |
| Payment Date: [today]                    |
|                          [Continue ->]   |
+------------------------------------------+

Step 2: Confirmation Preview (after entering $300)
+------------------------------------------+
| Payment Summary for John Smith           |
|                                          |
| Amount Received:          $300.00        |
| Unpaid classes to mark paid: 3 (-$90)    |
| Remaining after unpaid:   $210.00        |
| Credits to add:           7 classes      |
| Surplus (prepaid balance): $0.00         |
|                                          |
| BEFORE -> AFTER                          |
| Credits:     5 -> 12                     |
| Prepaid:    $0 -> $0                     |
| Unpaid:      3 -> 0                      |
|                                          |
|        [Back]  [Confirm Payment]         |
+------------------------------------------+
```

## What Happens on Confirm

1. **Mark unpaid classes as paid** -- batch update `student_payment_date` on those class logs
2. **Add credits** -- insert into `class_credits_ledger` with transaction_type "credit" and reason "Direct payment (Zelle) - $300"
3. **Store surplus** -- update `students.prepaid_balance` if amount exceeds all classes
4. **Toast summary** -- "Marked 3 classes paid, added 7 credits, $0 surplus"

## Credit Calculation Logic

```text
total_available = amount_entered + existing_prepaid_balance
unpaid_cost = unpaid_classes_count * class_rate
remaining_after_unpaid = total_available - unpaid_cost
credits_to_add = floor(remaining_after_unpaid / class_rate)
new_surplus = remaining_after_unpaid - (credits_to_add * class_rate)
```

## Database Change

Add `prepaid_balance` column to `students` table:

```sql
ALTER TABLE students ADD COLUMN prepaid_balance numeric DEFAULT 0;
```

## Auto-Apply Prepaid on Class Completion

When a new class log is created for a student, check if `prepaid_balance >= class_rate`. If yes, auto-set `student_payment_date` to today and reduce `prepaid_balance`.

## Files to Create / Modify

| File | Change |
|------|--------|
| **Migration SQL** | Add `prepaid_balance` to `students` |
| `src/components/admin/class-logs/StudentPaymentRecorder.tsx` | **New** -- multi-step dialog: student picker, summary, amount input, confirmation preview, apply |
| `src/components/admin/ClassLogs.tsx` | Add "Record Payment" button, render `StudentPaymentRecorder` |
| `src/services/class-operations/update/updatePaymentDate.ts` | Add `batchUpdateStudentPaymentDate` function |
| `src/services/class-logs.ts` | In `createClassLog`, auto-apply prepaid balance after insert |
| `src/components/admin/UserDetailModal.tsx` | Show prepaid balance (read-only) for students |

## Technical Details

### StudentPaymentRecorder Component
- **Step 1 (Summary)**: On student select, fetch from `students` (class_rate, payment_method, prepaid_balance), `class_logs` (count where student_payment_date IS NULL, last paid date), and `class_credits_ledger` / `student_subscriptions` (current credits). Display all as read-only summary.
- **Step 2 (Confirm)**: Calculate all derived values (classes to mark, credits to add, surplus). Show before/after comparison. On confirm:
  1. Batch update `student_payment_date` on unpaid logs (oldest first, up to what the amount covers)
  2. Insert ledger entry for credits
  3. Update `students.prepaid_balance` with surplus
  4. Call `onPaymentRecorded()` callback to refresh parent

### Edge Cases
- **No class rate set**: Show error, link to UserDetailModal to set it
- **No unpaid classes**: Entire amount becomes credits + surplus
- **Partial class**: If $45 left and rate is $30, one credit added, $15 surplus
- **Stripe students**: Filter to Zelle-only students in the picker
- **Zero amount**: Disable confirm button

