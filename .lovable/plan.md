

# Payment Tracking with Stripe vs. Zelle Differentiation

## The Key Insight

For **Stripe students**, parent payment is handled automatically -- you only need to manually track **tutor payments**. For **Zelle students**, you need to track **both** parent and tutor payments manually. So the system needs to know which payment method each student uses.

## What Changes

### 1. Database: Add `payment_method` to `students` table

Add a column to indicate how each student/parent pays:

```sql
ALTER TABLE public.students
ADD COLUMN payment_method text DEFAULT 'zelle'
CHECK (payment_method IN ('stripe', 'zelle'));
```

Default is `zelle` so existing students work without changes. You update it to `stripe` as parents migrate over.

### 2. Student Manager: Set Payment Method

In the admin Students tab, add a "Payment Method" dropdown (Stripe / Zelle) so you can flag each student. This is a one-time setup per student.

### 3. Smart Payment Indicators in Class Table

The payment dots in the Class Table will behave differently based on the student's payment method:

- **Zelle students**: Both student and tutor dots are clickable (current plan, no change)
- **Stripe students**: Student dot is always green with a "Stripe" label (auto-managed) -- only the tutor dot is clickable

### 4. Tutor Payment Summary (unchanged)

The batch "Mark All Paid" for biweekly tutor payouts works the same regardless of payment method -- it only touches `tutor_payment_date`.

### 5. Payment Filters Enhanced

Add a "Payment Method" filter option so you can view:
- All Zelle students with unpaid balances (for manual collection)
- All students regardless of method (for full overview)

### 6. Class Details Dialog

When viewing a class, the payment section will show:
- Payment method badge ("Stripe" or "Zelle")
- For Stripe students: student payment marked as "Managed by Stripe" (non-editable)
- For Zelle students: both Mark Paid/Unpaid buttons as planned

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/students/StudentForm.tsx` | Add payment method dropdown |
| `src/components/admin/students/StudentTable.tsx` | Show payment method column |
| `src/components/admin/class-logs/ClassTable.tsx` | Conditional student payment dot behavior based on payment method |
| `src/components/admin/class-logs/ClassDetailsDialog.tsx` | Payment section with method-aware controls |
| `src/components/admin/class-logs/ClassFilters.tsx` | Add payment method and unpaid filters |
| `src/components/admin/ClassLogs.tsx` | Wire up payment updates and tutor summary |
| `src/hooks/useClassLogs.ts` | Add payment mutations and join student payment method |
| `src/services/class-operations/update/updateClassLog.ts` | Payment date update helper |

## New Files

| File | Purpose |
|------|---------|
| `src/components/admin/class-logs/TutorPaymentSummary.tsx` | Batch tutor payout view |

## How It Works Day-to-Day

**Biweekly tutor payouts (same for both):**
1. Go to Class Logs, open Tutor Payment Summary
2. See each tutor's total owed
3. Pay them, click "Mark All Paid" -- done

**Collecting from Zelle parents:**
1. Filter by "Payment Method: Zelle" + "Student: Unpaid"
2. See who owes you
3. When they Zelle you, click the dot to mark paid

**Stripe parents:**
1. No action needed -- student payment dot auto-shows as managed by Stripe
2. You only click the tutor payment dot after paying the tutor

## No Changes to Stripe Integration

The existing Stripe webhook and subscription system stays untouched. This is purely an admin tracking layer so you know which students to chase for Zelle payments vs. which are handled automatically.

