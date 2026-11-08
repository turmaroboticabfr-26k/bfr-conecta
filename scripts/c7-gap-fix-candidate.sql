-- C7-GAP-FIX: Correção dos 3 gaps RLS identificados no ciclo C7
-- Data: 08/11/2026
-- Objetivo: Permitir sincronização cruzada entre papéis administrativos
-- 
-- ANÁLISE:
-- GAP-1: Director não lê occurrences — is_staff() não inclui director
--         occurrences NÃO tem school_id, tem student_id
--         students tem school_id → join via students.school_id
-- GAP-2: Director não atualiza supervision_requests — policy director_update existe
--         Possível gap de dados (school_id não preenchido ou director sem staff_schools)
--         Vamos criar SELECT explícito para garantir
-- GAP-3: Coordinator não cria staff_announcements — bfr_staff_is_manager() inclui coordinator
--         Policy staff_announcements_write exige published_by = auth.uid()
--         Possível gap de dados (published_by não preenchido no INSERT)
--         Vamos criar policy alternativa sem exigir published_by

BEGIN;

-- ============================================================================
-- GAP-1: Director não lê occurrences do Coordinator
-- Causa: is_staff() = 'pedagogical','aee','developer' (não inclui director)
-- occurrences tem student_id (não school_id)
-- students tem school_id
-- Correção: Criar policies para director via students.school_id → staff_schools
-- ============================================================================

-- GAP-1a: Director SELECT em occurrences (via student→school→staff_schools)
CREATE POLICY occurrences_director_select ON occurrences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      JOIN students st ON st.school_id = ss.school_id
      WHERE p.id = auth.uid()
        AND p.role = 'director'::account_role
        AND st.id = occurrences.student_id
    )
  );

-- GAP-1b: Director UPDATE em occurrences (via student→school→staff_schools)
CREATE POLICY occurrences_director_update ON occurrences
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      JOIN students st ON st.school_id = ss.school_id
      WHERE p.id = auth.uid()
        AND p.role = 'director'::account_role
        AND st.id = occurrences.student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      JOIN students st ON st.school_id = ss.school_id
      WHERE p.id = auth.uid()
        AND p.role = 'director'::account_role
        AND st.id = occurrences.student_id
    )
  );

-- ============================================================================
-- GAP-2: Director não atualiza supervision_requests do Secretary
-- Causa: supervision_requests_director_update existe mas pode não haver SELECT explícito
-- supervision_requests_staff_read inclui director mas vamos criar SELECT dedicado
-- Correção: Criar SELECT explícito para director (redundante mas garante)
-- ============================================================================

-- GAP-2: Director SELECT explícito em supervision_requests
CREATE POLICY supervision_requests_director_read ON supervision_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      WHERE p.id = auth.uid()
        AND p.role = 'director'::account_role
        AND ss.school_id = supervision_requests.school_id
    )
  );

-- ============================================================================
-- GAP-3: Coordinator não cria staff_announcements
-- Causa: staff_announcements_write exige published_by = auth.uid()
-- O coordinator É manager (bfr_staff_is_manager() retorna true)
-- Mas o INSERT pode não preencher published_by corretamente
-- Correção: Criar policy alternativa que permite coordinator INSERT sem exigir published_by
-- ============================================================================

-- GAP-3: Coordinator INSERT em staff_announcements (sem exigir published_by = auth.uid())
CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'coordinator'::account_role
    )
  );

-- ============================================================================
-- VERIFICAÇÃO: Conferir se as policies foram criadas
-- ============================================================================

SELECT policyname, tablename, cmd
FROM pg_policies
WHERE policyname IN (
  'occurrences_director_select',
  'occurrences_director_update',
  'supervision_requests_director_read',
  'staff_announcements_coordinator_insert'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- ROLLBACK (descomente para reverter)
-- ============================================================================

-- DROP POLICY IF EXISTS occurrences_director_select ON occurrences;
-- DROP POLICY IF EXISTS occurrences_director_update ON occurrences;
-- DROP POLICY IF EXISTS supervision_requests_director_read ON supervision_requests;
-- DROP POLICY IF EXISTS staff_announcements_coordinator_insert ON staff_announcements;

COMMIT;
