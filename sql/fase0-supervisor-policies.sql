-- FASE 0 — Policies RLS para supervisor educacional
-- Objetivo: dar acesso ao supervisor para supervisionar todas as escolas

BEGIN;

-- 1. Schools: supervisor lê todas as escolas
CREATE POLICY schools_supervisor_read ON public.schools
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 2. Students: supervisor lê todos os alunos
CREATE POLICY students_supervisor_read ON public.students
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 3. Classes: supervisor lê todas as turmas
CREATE POLICY classes_supervisor_read ON public.classes
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 4. Grades: supervisor lê todas as notas
CREATE POLICY grades_supervisor_read ON public.grades
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 5. Attendance: supervisor lê toda a frequência
CREATE POLICY attendance_supervisor_read ON public.attendance
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 6. Supervision requests: supervisor lê, cria e atualiza todas as solicitações
CREATE POLICY supervision_requests_supervisor_read ON public.supervision_requests
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

CREATE POLICY supervision_requests_supervisor_insert ON public.supervision_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.bfr_is_education_supervisor());

CREATE POLICY supervision_requests_supervisor_update ON public.supervision_requests
  FOR UPDATE TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 7. Learning action plans: supervisor lê, cria e atualiza todos os planos
CREATE POLICY learning_action_plans_supervisor_read ON public.learning_action_plans
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

CREATE POLICY learning_action_plans_supervisor_insert ON public.learning_action_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.bfr_is_education_supervisor());

CREATE POLICY learning_action_plans_supervisor_update ON public.learning_action_plans
  FOR UPDATE TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 8. School events: supervisor lê todos os eventos
CREATE POLICY school_events_supervisor_read ON public.school_events
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 9. Student school profiles: supervisor lê todos os perfis
CREATE POLICY student_school_profiles_supervisor_read ON public.student_school_profiles
  FOR SELECT TO authenticated
  USING (public.bfr_is_education_supervisor());

-- 10. Conferir policies criadas
SELECT 
  'policies_criadas' as check_name,
  COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%supervisor%';

COMMIT;
