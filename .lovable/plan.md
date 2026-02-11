

## Problem

The "Record Payment" dialog shows **$20.00 owed** for 2 unpaid classes, but the Class Records table shows costs of **$10.00** and **$0.00**.

The root cause: the November class has a `NULL` value for `Class Cost` in the database (not `$0`). Two parts of the UI interpret this differently:

- **Class Records table**: displays NULL as `$0.00` (treating it as zero)
- **Record Payment calculator**: falls back to the student's default class rate (`$10`) when NULL, resulting in `$10 + $10 = $20`

This inconsistency makes the payment amount incorrect from the admin's perspective.

## Fix

Update the `unpaidTotal` calculation and the payment allocation logic in `StudentPaymentRecorder.tsx` to treat NULL costs as `$0` (consistent with how the table displays them), rather than falling back to the student's default rate.

### Technical Details

**File: `src/components/admin/class-logs/StudentPaymentRecorder.tsx`**

1. **Line 289** - Change the `unpaidTotal` calculation:
   - From: `(sum, c) => sum + (c.classCost ?? selectedStudent.classRate ?? 0)`
   - To: `(sum, c) => sum + (c.classCost ?? 0)`

2. **Line 186** - Change the payment allocation loop to match:
   - From: `const cost = cls.classCost ?? rate;`
   - To: `const cost = cls.classCost ?? 0;`

This ensures that if a class was logged with no cost, it is treated as free everywhere -- both in what the admin sees and in the payment math.
