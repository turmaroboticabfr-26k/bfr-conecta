-- S20-gaps-loteA-rollback.sql
-- Reverte Lote A: supervision_responses

BEGIN;

-- Drop novas policies
DROP POLICY IF EXISTS supervision_responses_supervisor_read ON public.supervision_responses;
DROP POLICY IF EXISTS supervision_responses_supervisor_insert ON public.supervision_responses;
DROP POLICY IF EXISTS supervision_responses_staff_insert ON public.supervision_responses;
DROP POLICY IF EXISTS supervision_responses_staff_read ON public.supervision_responses;

-- Restaurar policies antigas
CREATE POLICY supervision_responses_school_insert
  ON public.supervision_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (created_by = auth.uid())
    AND (EXISTS (
      SELECT 1
      FROM profiles p
      WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['director'::account_role, 'coordinator'::account_role, 'developer'::account_role])))
    ))
  );

CREATE POLICY supervision_responses_staff_read
  ON public.supervision_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['secretary'::account_role, 'developer'::account_role, 'director'::account_role, 'coordinator'::account_role])))
    )
  );

COMMIT;
