-- S20-gaps-loteC-candidate.sql
-- Corrige 3 gaps de storage (bucket secretary-attachments, path supervision/):
-- 1. supervisor não baixa anexo (SELECT policy exclui education_supervisor)
-- 2. coordinator não deleta objeto (DELETE policy exclui coordinator)
-- 3. secretary não faz upload (INSERT policy exclui secretary)

BEGIN;

-- 1. Drop policies antigas
DROP POLICY IF EXISTS bfr_supervision_attachments_select ON storage.objects;
DROP POLICY IF EXISTS bfr_supervision_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS bfr_supervision_attachments_delete ON storage.objects;

-- 2. Recriar com papéis completos

-- SELECT: adicionar supervisor
CREATE POLICY bfr_supervision_attachments_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'secretary-attachments'
    AND name ~ '^supervision/[0-9a-fA-F-]{36}/'
    AND EXISTS (
      SELECT 1
      FROM supervision_response_attachments a
      WHERE a.storage_path = objects.name
    )
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY[
          'secretary'::account_role,
          'developer'::account_role,
          'director'::account_role,
          'coordinator'::account_role,
          'education_supervisor'::account_role
        ])
    )
  );

-- INSERT: adicionar secretary
CREATE POLICY bfr_supervision_attachments_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'secretary-attachments'
    AND name ~ '^supervision/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/'
    AND split_part(name, '/', 1) = 'supervision'
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY[
          'secretary'::account_role,
          'director'::account_role,
          'coordinator'::account_role,
          'developer'::account_role
        ])
    )
    AND EXISTS (
      SELECT 1
      FROM supervision_responses r
      WHERE r.id::text = split_part(objects.name, '/', 2)
    )
    AND split_part(name, '/', 3) = auth.uid()::text
  );

-- DELETE: adicionar coordinator
CREATE POLICY bfr_supervision_attachments_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'secretary-attachments'
    AND name ~ '^supervision/[0-9a-fA-F-]{36}/'
    AND (
      split_part(name, '/', 3) = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = ANY (ARRAY[
            'developer'::account_role,
            'director'::account_role,
            'coordinator'::account_role
          ])
      )
    )
  );

COMMIT;
