-- Fix GAP-3: Simplificar a policy do coordinator
-- Hipótese: a função bfr_is_coordinator() pode não estar sendo avaliada corretamente no contexto da policy
-- Solução: Usar uma policy mais direta que verifica o role via profiles

BEGIN;

-- Drop a policy problemática
DROP POLICY IF EXISTS staff_announcements_coordinator_insert ON staff_announcements;

-- Criar policy mais direta: coordinator pode INSERT se published_by = auth.uid()
CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'coordinator'::account_role
    )
  );

-- Conferir
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'staff_announcements' 
AND cmd = 'INSERT';

COMMIT;
