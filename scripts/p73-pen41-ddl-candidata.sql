-- P73-PEN-41 — CANDIDATA, NÃO APLICADA. Correr só com OK explícito, e só depois de
-- `scripts/p73-pen41-preflight.mjs` dar verde contra o estado vivo (ele mede as quatro policies que aqui se
-- substituem, confere o predicado que se usa e o seu GRANT, e recusa se alguma já tiver escopo ou se o
-- ficheiro tiver estrutura diferente da certificada). Reversão completa em `scripts/p73-pen41-ddl-reversao.sql`.
--
-- De onde isto vem (medições de 20/11, em artefactos versionados):
--   evidence/p73-politicas-municipais-20-11e.json  → em `students` e `classes` as leituras de cargo são
--     `director_dashboard_read_*` = `(("current_role"())::text = 'director'::text)` e
--     `classes_select_secretary` / `students_select_secretary` = `EXISTS (SELECT 1 FROM profiles p WHERE
--     p.id = auth.uid() AND p.role = 'secretary'::account_role)`. Nenhuma das quatro menciona `school_id`,
--     `municipality_id` ou o predicado de escopo.
--   evidence/p73-pen38-alcance-por-concessao-20-11e.json → `director` e `secretary` recebem 848 alunos e
--     27 turmas sem concessão nenhuma.
--   O catálogo já sabe a forma certa, e não é preciso inventá-la: `students_municipal_read` e
--     `classes_municipal_read` usam `bfr_school_in_municipal_scope(school_id)`, e existe
--     `bfr_school_in_own_school_scope(p_school uuid)` (SECURITY DEFINER, search_path 'public') para a escola
--     do próprio vínculo em `staff_schools`.
--
-- O efeito desta candidata está medido ANTES de aplicar, e é menor do que o problema parece: as 848 alunos e
-- as 27 turmas estão TODAS numa única escola (`Escola Municipal Alpha`), e os 4 perfis de director/secretary
-- que hoje usam a Secretaria Escolar têm vínculo nessa escola. Logo:
--   * 4 perfis (2 director, 2 secretary) mantêm exactamente os mesmos números;
--   * 2 perfis `secretary` sem linha em `staff_schools` passam de 848/27 para 0/0 — e é isso, não o volume,
--     que faz desta linha uma decisão de produto. O preflight imprime os dois números, inclusive o zero.
--
-- O que esta candidata NÃO toca, e porquê:
--   * `students_read`, `classes_read`, `students_municipal_read`, `classes_municipal_read`,
--     `students_supervisor_read`, `students_monitor_read`, `classes_family_read`, `bfr_students_directory_*`,
--     `staff manage student records` — ou já têm escopo, ou decidem por vínculo de outro tipo, ou são escrita.
--   * Nenhuma policy de escrita: apertar SELECT não autoriza apertar INSERT/UPDATE (§11.2).
--   * `bfr_municipal_network_totals` fica intocado (§11.1/§11.6 da PEN-39).

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

--------------------------------------------------------------------------------
-- A) DIRECTOR: o cargo abre a mesa, o vínculo abre a escola.
--------------------------------------------------------------------------------
DROP POLICY director_dashboard_read_students ON public.students;
CREATE POLICY director_dashboard_read_students ON public.students
  FOR SELECT TO authenticated
  USING (("current_role"()::text = 'director'::text)
         AND public.bfr_school_in_own_school_scope(school_id));

DROP POLICY director_dashboard_read_classes ON public.classes;
CREATE POLICY director_dashboard_read_classes ON public.classes
  FOR SELECT TO authenticated
  USING (("current_role"()::text = 'director'::text)
         AND public.bfr_school_in_own_school_scope(school_id));

--------------------------------------------------------------------------------
-- B) SECRETARY: mesma conjunção, mesma forma. O teste de pertença ao papel fica como estava (por `profiles`,
--    porque é assim que a policy viva está escrita); só se acrescenta a cláusula de escola.
--------------------------------------------------------------------------------
DROP POLICY students_select_secretary ON public.students;
CREATE POLICY students_select_secretary ON public.students
  FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'secretary'::account_role))
         AND public.bfr_school_in_own_school_scope(school_id));

DROP POLICY classes_select_secretary ON public.classes;
CREATE POLICY classes_select_secretary ON public.classes
  FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'secretary'::account_role))
         AND public.bfr_school_in_own_school_scope(school_id));

COMMIT;

-- Depois de aplicar, o critério de fecho é re-correr `scripts/p73-pen38-alcance-por-concessao-20-11.mjs` e
-- esperar: director 848/27 (a escola deles é onde os dados estão), secretary com vínculo 848/27, secretary sem
-- vínculo 0/0, e `equipe_administrativa` a subir de 0 conforme o PEN-38 bloco C for usado para etiquetar
-- escolas. Um «todos ainda vêem tudo» depois disto é RLS em cache, não DDL falhado: conferir com sessão nova.
