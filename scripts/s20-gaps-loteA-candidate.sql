-- S20-gaps-loteA-candidate.sql
-- Corrige 4 gaps de supervision_responses:
-- 1. supervisor não lê responses (falta SELECT policy)
-- 2. supervisor não insere responses (falta INSERT policy)
-- 3. coordinator insere sem filtro de escola (with_check sem school_id)
-- 4. staff lê todas as responses (qual sem filtro de escola)

BEGIN;

-- 1. Drop policies antigas que serão substituídas
DROP POLICY IF EXISTS supervision_responses_school_insert ON public.supervision_responses;
DROP POLICY IF EXISTS supervision_responses_staff_read ON public.supervision_responses;

-- 2. Criar policies novas com filtros corretos

-- supervisor pode ler responses das suas escolas (via bfr_is_education_supervisor)
CREATE POLICY supervision_responses_supervisor_read
  ON public.supervision_responses
  FOR SELECT
  TO authenticated
  USING (
    bfr_is_education_supervisor()
  );

-- supervisor pode inserir responses (com created_by = auth.uid())
CREATE POLICY supervision_responses_supervisor_insert
  ON public.supervision_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bfr_is_education_supervisor()
    AND created_by = auth.uid()
  );

-- staff (secretary/director/coordinator) pode inserir com filtro de escola
CREATE POLICY supervision_responses_staff_insert
  ON public.supervision_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      WHERE p.id = auth.uid()
        AND ss.school_id = (
          SELECT school_id
          FROM supervision_requests
          WHERE id = request_id
        )
        AND p.role = ANY (ARRAY['secretary'::account_role, 'director'::account_role, 'coordinator'::account_role])
    )
  );

-- staff pode ler apenas responses das suas escolas
CREATE POLICY supervision_responses_staff_read
  ON public.supervision_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      WHERE p.id = auth.uid()
        AND ss.school_id = (
          SELECT school_id
          FROM supervision_requests
          WHERE id = request_id
        )
        AND p.role = ANY (ARRAY['secretary'::account_role, 'director'::account_role, 'coordinator'::account_role, 'developer'::account_role])
    )
  );

COMMIT;
