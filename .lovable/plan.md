

# Fix Privilege Escalation in Profiles Update RLS Policy

## Problem
The "Users can update their own profile" policy on `profiles` has no `WITH CHECK` clause. Any authenticated user can update their own `role` column to `admin`, bypassing authorization. The `validate_role_change` trigger provides a secondary check but RLS should be the primary defense.

## Fix
Drop the existing policy and recreate it with a `WITH CHECK` clause that prevents users from changing their own `role`. The `get_auth_user_role()` security definer function already exists and avoids infinite recursion.

### SQL Migration

```sql
-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with WITH CHECK that prevents role changes
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role::text = get_auth_user_role()
);
```

This ensures that any UPDATE a non-admin user makes to their own profile must keep the `role` column equal to their current role. Admins bypass this entirely via the existing "Admins can do everything with profiles" ALL policy.

No code changes are needed -- this is a database-only fix.

