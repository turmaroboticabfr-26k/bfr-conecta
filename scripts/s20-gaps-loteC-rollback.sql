-- S20-gaps-loteC-rollback.sql
-- Reverte Lote C: storage policies (bucket secretary-attachments)

BEGIN;

-- Drop novas policies
DROP POLICY IF EXISTS bfr_supervision_attachments_select ON storage.objects;
DROP POLICY IF EXISTS bfr_supervision_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS bfr_supervision_attachments_delete ON storage.objects;

-- Restaurar policies antigas
CREATE POLICY bfr_supervision_attachments_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    (bucket_id = 'secretary-attachments'::text)
    AND (name ~ '^supervision/[0-9a-fA-F-]{36}/'::text)
    AND (EXISTS (
      SELECT 1
      FROM supervision_response_attachments a
      WHERE (a.storage_path = objects.name)
    ))
    AND (EXISTS (
      SELECT 1
      FROM profiles p
      WHERE (p.id = auth.uid())
        AND (p.role = ANY (ARRAY['secretary'::account_role, 'developer'::account_role, 'director'::account_role, 'coordinator'::account_role]))
    ))
  );

CREATE POLICY bfr_supervision_attachments_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (bucket_id = 'secretary-attachments'::text)
    AND (name ~ '^supervision/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/'::text)
    AND (split_part(name, '/'::text, 1) = 'supervision'::text)
    AND (EXISTS (
      SELECT 1
      FROM profiles p
      WHERE (p.id = auth.uid())
        AND (p.role = ANY (ARRAY['director'::account_role, 'coordinator'::account_role, 'developer'::account_role]))
    ))
    AND (EXISTS (
      SELECT 1
      FROM supervision_responses r
      WHERE (r.id::text = split_part(objects.name, '/'::text, 2))
    ))
    AND (split_part(name, '/'::text, 3) = (auth.uid())::text)
  );

CREATE POLICY bfr_supervision_attachments_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    (bucket_id = 'secretary-attachments'::text)
    AND (name ~ '^supervision/[0-9a-fA-F-]{36}/'::text)
    AND (
      (split_part(name, '/'::text, 3) = (auth.uid())::text)
      OR (EXISTS (
        SELECT 1
        FROM profiles p
        WHERE (p.id = auth.uid())
          AND (p.role = ANY (ARRAY['developer'::account_role, 'director'::account_role]))
      ))
    )
  );

COMMIT;
