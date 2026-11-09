-- P2-1 — Escopo por escola em profiles_read e gate_badges_staff_manage
-- CANDIDATA — NÃO APLICADA.
--
-- Data: 2026-11-08
-- Objetivo: restringir o acesso de staff cross-school para escopo por escola,
--   mantendo o desenvolvedor com acesso transversal (admin de plataforma).
--
-- ANÁLISE DOS GAPS:
--
-- GAP-1: profiles_read
--   Atual:  USING ((id = auth.uid()) OR is_staff())
--   Problema: qualquer staff vê TODOS os perfis (alunos, pais, staff de outras escolas)
--   Correção: staff vê apenas perfis da sua própria escola, developer vê todos
--
--   Caminhos de escopo para perfis visíveis a um staff:
--     (a) próprio perfil (id = auth.uid())
--     (b) developer (is_developer())
--     (c) staff da mesma escola (profiles → staff_schools ↔ staff_schools do caller)
--     (d) aluno da escola do staff (students.school_id → staff_schools do caller)
--     (e) pai/responsável de aluno da escola do staff
--         (guardian_students → students.school_id → staff_schools do caller)
--
-- GAP-2: gate_badges_staff_manage
--   Atual:  USING (is_staff()) WITH CHECK (is_staff())
--   Problema: qualquer staff gerencia fichas de alunos de qualquer escola
--   Correção: staff gerencia apenas fichas de alunos da sua escola, developer vê todas
--
--   Caminho de escopo:
--     (a) developer (is_developer())
--     (b) staff: gate_badges.student_id → students.school_id → staff_schools do caller
--
-- DEPENDÊNCIAS:
--   - Tabelas: profiles, students, staff_schools, guardian_students, gate_badges
--   - Funções: is_staff(), is_developer(), auth.uid()
--   - Enum: account_role (valor 'developer')
--   - Outras policies de SELECT em profiles (director_dashboard_read_profiles,
--     profiles_chat_staff_directory_read, profiles_hide_test_accounts) continuam
--     vigentes — PostgREST combina policies permissivas com OR, portanto a
--     visibilidade total é a união. Esta candidate apenas estreita profiles_read.
--
-- TESTEDRYRUN: ao final há um bloco comentado que pode ser executado antes da
--   aplicação para visualizar o estado antes/depois das policies.

BEGIN;

-- ============================================================================
-- DRY-RUN: estado ANTES (descomente para verificar antes de aplicar)
-- ============================================================================

-- SELECT policyname, tablename, cmd,
--        COALESCE(qual, '') AS usando,
--        COALESCE(with_check, '') AS verificacao
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('profiles', 'gate_badges')
--   AND policyname IN ('profiles_read', 'gate_badges_staff_manage')
-- ORDER BY tablename, policyname;

-- ============================================================================
-- GAP-1: profiles_read — escopo por escola para staff
-- ============================================================================

DROP POLICY IF EXISTS profiles_read ON public.profiles;

CREATE POLICY profiles_read ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- (a) Todo usuário vê seu próprio perfil
    (id = auth.uid())

    OR

    -- (b) Developer vê todos os perfis (admin de plataforma, cross-school)
    is_developer()

    OR

    -- (c) Staff vê perfis vinculados à(s) sua(s) escola(s):

    -- (c.1) Outros staff da mesma escola
    EXISTS (
      SELECT 1
      FROM staff_schools ss_target
      JOIN profiles p_caller ON p_caller.id = auth.uid()
      JOIN staff_schools ss_caller ON ss_caller.profile_id = p_caller.id
      WHERE ss_target.profile_id = profiles.id
        AND ss_caller.school_id = ss_target.school_id
    )

    OR

    -- (c.2) Alunos matriculados na escola do staff
    --       (perfis de aluno não têm staff_schools; o vínculo é via students)
    EXISTS (
      SELECT 1
      FROM profiles p_caller
      JOIN staff_schools ss_caller ON ss_caller.profile_id = p_caller.id
      JOIN students st ON st.school_id = ss_caller.school_id
      JOIN profiles p_student ON p_student.id = profiles.id
      WHERE p_caller.id = auth.uid()
        AND st.student_profile_id = p_student.id
    )

    OR

    -- (c.3) Pais/responsáveis de alunos matriculados na escola do staff
    EXISTS (
      SELECT 1
      FROM profiles p_caller
      JOIN staff_schools ss_caller ON ss_caller.profile_id = p_caller.id
      JOIN guardian_students gs ON gs.profile_id = profiles.id
      JOIN students st ON st.id = gs.student_id
      WHERE p_caller.id = auth.uid()
        AND ss_caller.school_id = st.school_id
    )
  );

-- ============================================================================
-- GAP-2: gate_badges_staff_manage — escopo por escola para staff
-- ============================================================================

DROP POLICY IF EXISTS gate_badges_staff_manage ON public.gate_badges;

CREATE POLICY gate_badges_staff_manage ON public.gate_badges
  FOR ALL
  TO authenticated
  USING (
    -- (a) Developer gerencia todas as fichas (cross-school)
    is_developer()

    OR

    -- (b) Staff gerencia apenas fichas de alunos da sua escola
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      JOIN students st ON st.school_id = ss.school_id
      WHERE p.id = auth.uid()
        AND st.id = gate_badges.student_id
    )
  )
  WITH CHECK (
    -- (a) Developer gerencia todas as fichas (cross-school)
    is_developer()

    OR

    -- (b) Staff gerencia apenas fichas de alunos da sua escola
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      JOIN students st ON st.school_id = ss.school_id
      WHERE p.id = auth.uid()
        AND st.id = gate_badges.student_id
    )
  );

-- ============================================================================
-- VERIFICAÇÃO: conferir policies recriadas
-- ============================================================================

SELECT policyname, tablename, cmd,
       COALESCE(qual, '') AS usando,
       COALESCE(with_check, '') AS verificacao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'gate_badges')
  AND policyname IN ('profiles_read', 'gate_badges_staff_manage')
ORDER BY tablename, policyname;

-- ============================================================================
-- DRY-RUN: estado DEPOIS (descomente para verificar após aplicar)
-- ============================================================================

-- SELECT policyname, tablename, cmd,
--        COALESCE(qual, '') AS usando,
--        COALESCE(with_check, '') AS verificacao
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('profiles', 'gate_badges')
-- ORDER BY tablename, policyname;

COMMIT;

-- ============================================================================
-- REVERSÃO (executar somente se necessário para restaurar o estado anterior)
-- ============================================================================

-- BEGIN;
--
-- -- Restaurar profiles_read original (sem escopo por escola)
-- DROP POLICY IF EXISTS profiles_read ON public.profiles;
-- CREATE POLICY profiles_read ON public.profiles
--   FOR SELECT
--   TO authenticated
--   USING ((id = auth.uid()) OR is_staff());
--
-- -- Restaurar gate_badges_staff_manage original (sem escopo por escola)
-- DROP POLICY IF EXISTS gate_badges_staff_manage ON public.gate_badges;
-- CREATE POLICY gate_badges_staff_manage ON public.gate_badges
--   FOR ALL
--   TO authenticated
--   USING (is_staff())
--   WITH CHECK (is_staff());
--
-- COMMIT;
