-- RM-6.8 — fluxo de REVERSÃO (BEGIN…COMMIT) derivado de scripts/rm68-fail-closed-por-policy.sql
-- Gerado por scripts/rm68-preflight-15-11.mjs em 2026-11-15T02:39:34.404Z (passada b, depois do 42601 medido no ensaio).
-- Régua: scripts/rm68-fail-closed-por-policy.sql md5 85ccd0927153fbcca4389e9218f1111f (14568 B).
-- Regra da derivación: cada statement é o byte-a-byte do candidato com (a) o `;` acrescentado quando
-- faltava e (b) o `public.` removido do NOME da policy, que a gramática `ALTER POLICY nome ON tabela`
-- recusa em 42601. O `ON public.<tabela>` fica intacto. Conferido statement a statement por reinserção.
-- Do DRY-RUN foram deixados fora os `select` de veredito e o ROLLBACK; aqui o fecho é COMMIT, por isso
-- a aplicação inteira é UMA transacção: se qualquer statement falhar, nada fica no banco.
BEGIN;


SET LOCAL lock_timeout = '5s';


SET LOCAL statement_timeout = '60s';

ALTER POLICY "access_requests_manage" ON public.access_requests
  USING (is_developer())
  WITH CHECK ((is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND ((approved_role IS NULL) OR (approved_role = requested_role)) AND (status = ANY (ARRAY['pending'::request_status, 'approved'::request_status, 'rejected'::request_status]))));

ALTER POLICY "access_requests_staff_insert" ON public.access_requests
  WITH CHECK ((is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND (((approved_role IS NULL) AND (status = 'pending'::request_status)) OR ((approved_role = requested_role) AND (status = 'approved'::request_status)))));

ALTER POLICY "attendance_staff_delete" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)));

ALTER POLICY "attendance_staff_insert" ON public.attendance
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text) AND ((("current_role"())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))));

ALTER POLICY "attendance_staff_select" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)));

ALTER POLICY "attendance_staff_update" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)))
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)));

ALTER POLICY "grades_staff_delete" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND (("current_role"())::text <> 'secretary'::text)));

ALTER POLICY "grades_staff_insert" ON public.grades
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id, subject) AND (("current_role"())::text <> 'secretary'::text) AND ((("current_role"())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))));

ALTER POLICY "grades_staff_select" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND (("current_role"())::text <> 'secretary'::text)));

ALTER POLICY "occurrences_director_select" ON public.occurrences
  USING ((EXISTS ( SELECT 1
   FROM ((profiles p
     JOIN staff_schools ss ON ((ss.profile_id = p.id)))
     JOIN students st ON ((st.school_id = ss.school_id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::account_role) AND (st.id = occurrences.student_id)))));

ALTER POLICY "occurrences_director_update" ON public.occurrences
  USING ((EXISTS ( SELECT 1
   FROM ((profiles p
     JOIN staff_schools ss ON ((ss.profile_id = p.id)))
     JOIN students st ON ((st.school_id = ss.school_id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::account_role) AND (st.id = occurrences.student_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((profiles p
     JOIN staff_schools ss ON ((ss.profile_id = p.id)))
     JOIN students st ON ((st.school_id = ss.school_id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::account_role) AND (st.id = occurrences.student_id)))));

DROP FUNCTION IF EXISTS public.bfr_rls_session_role();

DROP FUNCTION IF EXISTS public.bfr_rls_is_developer();

DROP FUNCTION IF EXISTS public.bfr_rls_director_manages_student(uuid);

COMMIT;
