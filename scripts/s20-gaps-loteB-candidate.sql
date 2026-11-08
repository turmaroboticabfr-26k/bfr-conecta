-- S20-gaps-loteB-candidate.sql
-- Corrige 2 gaps:
-- 1. supervisor não lê sports_schools (embed falha)
-- 2. director/coordinator não atualizam supervision_requests

BEGIN;

-- 1. Adicionar supervisor à policy de leitura de sports_schools
-- Primeiro, verificar se existe uma policy staff_read ou similar
-- Se não existir, criar uma nova policy para supervisor

-- Drop policy antiga se existir (para recriar com supervisor incluído)
DROP POLICY IF EXISTS sports_schools_staff_read ON public.sports_schools;

-- Criar policy que inclui supervisor
CREATE POLICY sports_schools_staff_read
  ON public.sports_schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY[
          'secretary'::account_role,
          'director'::account_role,
          'coordinator'::account_role,
          'developer'::account_role,
          'education_supervisor'::account_role
        ])
    )
    OR bfr_is_education_supervisor()
  );

-- 2. Adicionar policies UPDATE para director e coordinator em supervision_requests
-- Director pode atualizar requests da sua escola
CREATE POLICY supervision_requests_director_update
  ON public.supervision_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      WHERE p.id = auth.uid()
        AND ss.school_id = supervision_requests.school_id
        AND p.role = 'director'::account_role
    )
  );

-- Coordinator pode atualizar requests da sua escola
CREATE POLICY supervision_requests_coordinator_update
  ON public.supervision_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      WHERE p.id = auth.uid()
        AND ss.school_id = supervision_requests.school_id
        AND p.role = 'coordinator'::account_role
    )
  );

COMMIT;
