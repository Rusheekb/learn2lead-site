

# Move Rate Management into Student & Tutor Detail Modals

## Overview
Remove the "Apply Default Rates" bulk button from Class Logs and instead let admins view and edit `class_rate` (students) and `hourly_rate` (tutors) directly from their respective detail modals/popups. These stored rates will continue to auto-fill costs on new class creation.

## Changes

### 1. Remove "Apply Default Rates" from ClassLogs
- Delete the `handleApplyDefaultRates` function and its button from `src/components/admin/ClassLogs.tsx`
- Remove the `isBackfilling` state and `Wand2` icon import

### 2. Expand the Student Detail Modal (UserDetailModal)
When viewing a student, show and allow editing of:
- **Class Rate ($)** -- editable input field, saved to `students.class_rate`
- **Payment Method** -- editable dropdown (Stripe/Zelle), saved to `students.payment_method`

On save, update the `students` table directly. Future classes for that student will auto-pick up the new rate.

### 3. Show Tutor Hourly Rate in Tutor Detail Modal (UserDetailModal)
When viewing a tutor, show and allow editing of:
- **Hourly Rate ($)** -- editable input field, saved to `tutors.hourly_rate`

On save, update the `tutors` table. Future classes for that tutor will auto-pick up the new rate.

### 4. Keep Auto-Fill on Class Creation
The existing logic in `src/services/class-logs.ts` (lines 59-86) that looks up `students.class_rate` and `tutors.hourly_rate` when creating a class stays unchanged -- it already does the right thing.

### 5. Optionally Show Rates in Tables
- Student table already shows `Class Rate` column -- keep it
- Tutor table currently only shows name/email/actions -- add an `Hourly Rate` column

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/ClassLogs.tsx` | Remove Apply Default Rates button, `handleApplyDefaultRates`, `isBackfilling` state, `Wand2` import |
| `src/components/admin/UserDetailModal.tsx` | Add editable Class Rate + Payment Method fields for students; editable Hourly Rate for tutors; save to DB on change |
| `src/components/admin/tutors/TutorTable.tsx` | Add Hourly Rate column |

## How It Works

1. Admin clicks a student row to open their detail modal
2. They see and can edit the student's Class Rate and Payment Method
3. Clicking "Save" updates the `students` table
4. Next time a class is logged for that student, the cost auto-fills from the saved rate
5. Same flow for tutors -- edit Hourly Rate in their modal, future classes use the new rate
6. Past classes are never affected by rate changes

## Technical Details

### UserDetailModal Changes
- Detect `user.role` to show role-specific fields
- For students: fetch `class_rate` and `payment_method` from `students` table by name, show editable fields, add a "Save" button that runs `supabase.from('students').update(...)` 
- For tutors: fetch `hourly_rate` from `tutors` table, show editable field, save with `supabase.from('tutors').update(...)`
- After save, call `onUserUpdated?.()` to refresh parent data

### TutorTable Changes
- Add a column that displays `tutor.hourlyRate` formatted as currency, or a dash if not set
