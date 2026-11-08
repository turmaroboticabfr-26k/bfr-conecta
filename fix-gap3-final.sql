-- fix-gap3-final.sql
-- GAP-3 Fix: Coordinator INSERT into staff_announcements returns 403
--
-- ROOT CAUSE (discovered by behavioral testing):
-- The INSERT itself SUCCEEDS. The 403 error comes from the SELECT that
-- PostgREST performs when the client sends "Prefer: return=representation".
--
-- The SELECT policy "staff_announcements_read" only allows rows where:
--   bfr_is_staff() AND (bfr_staff_role() = 'developer' OR bfr_staff_role() = ANY (target_roles))
--
-- When a coordinator publishes an announcement targeting ['director', 'secretary'],
-- the coordinator's role ('coordinator') is NOT in target_roles, so the SELECT
-- returns 0 rows. PostgREST interprets this as an RLS violation and returns 403.
--
-- The RESTRICTIVE policy "profiles_hide_test_accounts" on "profiles" is NOT the
-- cause. The SECURITY DEFINER function bfr_is_coordinator() works correctly.
--
-- FIX:
-- Modify the SELECT policy to also allow staff to see announcements they
-- published themselves (published_by = auth.uid()), regardless of target_roles.
--
-- HYPOTHESIS DISPROVED:
-- The original hypothesis was that the RESTRICTIVE policy on profiles was
-- blocking the SELECT inside bfr_is_coordinator(). This is false because:
-- 1. bfr_is_coordinator() is SECURITY DEFINER (runs as postgres, bypasses RLS)
-- 2. Dropping the RESTRICTIVE policy did not change the behavior
-- 3. The INSERT succeeds with return=minimal (proving INSERT policies work)
-- 4. The 403 only occurs with return=representation (proving SELECT is the issue)

BEGIN;

-- Step 1: Drop the old SELECT policy
DROP POLICY IF EXISTS staff_announcements_read ON staff_announcements;

-- Step 2: Create the fixed SELECT policy
-- Allows staff to see announcements that:
-- (a) target their role, OR
-- (b) they published themselves, OR
-- (c) they are the developer (sees everything)
CREATE POLICY staff_announcements_read ON staff_announcements
  FOR SELECT
  TO authenticated
  USING (
    bfr_is_staff() AND (
      bfr_staff_role() = 'developer'
      OR bfr_staff_role() = ANY (target_roles)
      OR published_by = auth.uid()
    )
  );

-- Step 3: Verify
SELECT policyname, tablename, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'staff_announcements'
ORDER BY cmd, policyname;

-- ============================================================================
-- ROLLBACK (uncomment to revert)
-- ============================================================================

-- DROP POLICY IF EXISTS staff_announcements_read ON staff_announcements;
-- CREATE POLICY staff_announcements_read ON staff_announcements
--   FOR SELECT
--   TO authenticated
--   USING (
--     bfr_is_staff() AND (
--       bfr_staff_role() = 'developer'::text
--       OR bfr_staff_role() = ANY (target_roles)
--     )
--   );

COMMIT;
