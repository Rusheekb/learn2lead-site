

# Auto-Fill Zoom Link for Tutor Class Scheduling

## Overview

Add a `zoom_link` field to the tutor's profile so they can save their Zoom link once, and it automatically pre-fills whenever they schedule a new class. Tutors can still override it per class if needed.

## How It Works

1. Tutors go to their Profile tab and enter their Zoom meeting link in a new "Zoom Link" field
2. When scheduling a new class, the Zoom link field auto-fills from their saved profile
3. The tutor can still edit or clear the link for any individual class

## Changes Required

### 1. Database Migration

Add a `zoom_link` column to the `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN zoom_link text DEFAULT NULL;
```

No RLS changes needed -- tutors can already read/update their own profile.

### 2. Update Profile Type

**`src/types/profile.ts`** and **`src/hooks/useProfile.ts`**

Add `zoom_link: string | null` to the `Profile` interface in both locations.

### 3. Show Zoom Link Field on Profile Page (Tutors Only)

**`src/components/shared/profile/ProfileForm.tsx`**

Add a "Zoom Meeting Link" input field that only renders when the user's role is `tutor`. It saves alongside existing profile fields.

### 4. Auto-Fill Zoom Link When Scheduling Classes

**`src/components/tutor/dialogs/AddClassDialog.tsx`**

When the dialog opens, read `currentUser.zoom_link` (the tutor's profile) and use it as the default value for `zoomLink` instead of the current hardcoded `'https://zoom.us/'`.

### 5. Update Profile Editor

**`src/components/shared/ProfileEditor.tsx`**

Add `zoom_link` to the form data so it's included when the profile is saved.

## Files to Modify

| File | Change |
|------|--------|
| `src/types/profile.ts` | Add `zoom_link` to Profile interface |
| `src/hooks/useProfile.ts` | Add `zoom_link` to Profile interface |
| `src/components/shared/profile/ProfileForm.tsx` | Add Zoom link input (tutor-only) |
| `src/components/shared/ProfileEditor.tsx` | Include `zoom_link` in form state |
| `src/components/tutor/dialogs/AddClassDialog.tsx` | Read `currentUser.zoom_link` as default |

## Technical Notes

- The `zoom_link` column is nullable with no default, so existing profiles are unaffected
- The AddClassDialog already receives `currentUser` (the profile object), so no additional data fetching is needed
- If no Zoom link is saved, the field behaves exactly as it does today (empty)
