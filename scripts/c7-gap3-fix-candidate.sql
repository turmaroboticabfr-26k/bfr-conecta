-- C7-GAP3-FIX: Corrige policy de coordinator INSERT em staff_announcements
-- Data: 08/11/2026
-- Problema: RESTRICTIVE policy profiles_hide_test_accounts bloqueia SELECT em profiles
--           quando a policy staff_announcements_coordinator_insert tenta verificar o papel
-- Solução: SECURITY DEFINER function bypassa RLS para a verificação
--
-- ANÁLISE:
-- A policy staff_announcements_coordinator_insert tem:
--   WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coordinator'))
-- 
-- Mas a tabela profiles tem uma policy RESTRICTIVE profiles_hide_test_accounts que filtra:
--   ((id = auth.uid()) OR ((email !~~ '%@bfr-conecta.test') AND (email !~~ 'bfr.qa.email.%')))
-- 
-- Quando o coordinator tenta INSERT, a policy evaluation context não bypassa a RESTRICTIVE policy,
-- então o SELECT em profiles retorna 0 linhas → EXISTS = FALSE → INSERT negado (403)
--
-- CORREÇÃO:
-- 1. Criar função SECURITY DEFINER que bypassa RLS
-- 2. Recriar policy usando a função em vez de SELECT direto

BEGIN;

-- 1. Criar função SECURITY DEFINER
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

-- 2. Drop policy antiga
DROP POLICY IF EXISTS staff_announcements_coordinator_insert ON staff_announcements;

-- 3. Criar policy nova usando a função
CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (bfr_is_coordinator(auth.uid()));

-- 4. Revogar execute de public/anon (segurança)
REVOKE EXECUTE ON FUNCTION bfr_is_coordinator(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION bfr_is_coordinator(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION bfr_is_coordinator(uuid) TO authenticated;

-- 5. Verificar
SELECT policyname, tablename, cmd, roles, qual, with_check
FROM pg_policies
WHERE policyname = 'staff_announcements_coordinator_insert';

SELECT proname, prosecdef, proacl
FROM pg_proc
WHERE proname = 'bfr_is_coordinator';

-- ============================================================================
-- ROLLBACK (descomente para reverter)
-- ============================================================================

-- DROP POLICY IF EXISTS staff_announcements_coordinator_insert ON staff_announcements;
-- DROP FUNCTION IF EXISTS bfr_is_coordinator(uuid);
-- 
-- CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM profiles p
--       WHERE p.id = auth.uid() AND p.role = 'coordinator'::account_role
--     )
--   );

COMMIT;
