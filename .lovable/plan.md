
# Admin Calendar View

## Overview

Add a new "Calendar" tab to the Admin Dashboard that displays all scheduled classes across the entire platform in one unified calendar view, with multi-user filtering to isolate classes by specific tutors and/or students.

## How It Works

- A new "Calendar" tab appears in the admin sidebar navigation
- The calendar shows all scheduled classes from every tutor and student
- Dots on calendar dates indicate days with classes
- Clicking a date shows all classes for that day in a detail panel
- Filter dropdowns let you select one or more tutors and/or students to narrow the view
- A search bar provides quick text filtering by class title, subject, or names

## Filtering System

| Filter | Type | Behavior |
|--------|------|----------|
| Tutor | Multi-select dropdown | Show only classes from selected tutors |
| Student | Multi-select dropdown | Show only classes for selected students |
| Subject | Single-select dropdown | Filter by subject area |
| Search | Text input | Quick search across title, tutor, student, subject |
| Clear All | Button | Reset all filters at once |

## Technical Details

### New Files

| File | Purpose |
|------|---------|
| `src/components/admin/AdminCalendarView.tsx` | Main calendar component with filters and event list |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Add `calendar` tab case, lazy-import AdminCalendarView |
| `src/components/shared/sidebar/AdminNavLinks.tsx` | Add Calendar nav link |

### Data Fetching

- Reuse the existing `fetchScheduledClasses()` from `src/services/class/fetch.ts` with no tutor/student filter (admin RLS policies already grant full access to all scheduled classes)
- Fetch all profiles for tutor/student dropdown options
- Use `@tanstack/react-query` for caching

### Component Structure

The `AdminCalendarView` component will:
1. Fetch all scheduled classes (no filters = admin sees all)
2. Fetch tutor and student profiles for filter dropdowns
3. Reuse the existing `Calendar` UI component with event dot modifiers
4. Display a filtered event list for the selected date
5. Use `useMemo` to apply client-side filters efficiently

### No Database Changes Required

The existing `scheduled_classes` table and admin RLS policies already support this -- admins have `ALL` access to scheduled classes.
