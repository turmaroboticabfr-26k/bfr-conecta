-- Fix GAP-3: Coordinator cannot INSERT into staff_announcements
-- Root cause: RESTRICTIVE policy profiles_hide_test_accounts blocks SELECT on profiles
-- Solution: SECURITY DEFINER function bypasses RLS for the check

-- Step 1: Create SECURITY DEFINER function
CREATE OR REPLACE FUNCTION bfr_is_coordinator(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'coordinator'::account_role
  );
END;
$$;

-- Step 2: Drop old policy
DROP POLICY IF EXISTS staff_announcements_coordinator_insert ON staff_announcements;

-- Step 3: Create new policy using the function
CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements
FOR INSERT TO authenticated
WITH CHECK (bfr_is_coordinator(auth.uid()));

-- Step 4: Revoke execute from public/anonymous
REVOKE EXECUTE ON FUNCTION bfr_is_coordinator(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION bfr_is_coordinator(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION bfr_is_coordinator(uuid) TO authenticated;
