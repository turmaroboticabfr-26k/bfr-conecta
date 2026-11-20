-- P73-PEN-41 — REVERSÃO da candidata `scripts/p73-pen41-ddl-candidata.sql`. As quatro definições abaixo são a
-- forma medida no catálogo em 20/11 (coluna `qual` de `pg_policy`, lida por `p73-politicas-municipais-20-11e.json`
-- e re-confida por `scripts/p73-pen41-preflight.mjs`), não uma reconstrução de memória: se alguma delas já não
-- for esta, o preflight do modo `reversao` chumba antes de isto correr.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

DROP POLICY director_dashboard_read_students ON public.students;
CREATE POLICY director_dashboard_read_students ON public.students
  FOR SELECT TO authenticated
  USING ((current_role()::text = 'director'::text));

DROP POLICY director_dashboard_read_classes ON public.classes;
CREATE POLICY director_dashboard_read_classes ON public.classes
  FOR SELECT TO authenticated
  USING ((current_role()::text = 'director'::text));

DROP POLICY students_select_secretary ON public.students;
CREATE POLICY students_select_secretary ON public.students
  FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM profiles p WHERE (p.id = auth.uid() AND p.role = 'secretary'::account_role))));

DROP POLICY classes_select_secretary ON public.classes;
CREATE POLICY classes_select_secretary ON public.classes
  FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM profiles p WHERE (p.id = auth.uid() AND p.role = 'secretary'::account_role))));

COMMIT;
