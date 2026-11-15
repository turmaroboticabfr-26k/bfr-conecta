-- RM-6.8 — fluxo de APLICAÇÃO (BEGIN…COMMIT) derivado de scripts/rm68-fail-closed-por-policy.sql
-- Gerado por scripts/rm68-preflight-15-11.mjs em 2026-11-15T02:39:34.404Z (passada b, depois do 42601 medido no ensaio).
-- Régua: scripts/rm68-fail-closed-por-policy.sql md5 85ccd0927153fbcca4389e9218f1111f (14568 B).
-- Regra da derivación: cada statement é o byte-a-byte do candidato com (a) o `;` acrescentado quando
-- faltava e (b) o `public.` removido do NOME da policy, que a gramática `ALTER POLICY nome ON tabela`
-- recusa em 42601. O `ON public.<tabela>` fica intacto. Conferido statement a statement por reinserção.
-- Do DRY-RUN foram deixados fora os `select` de veredito e o ROLLBACK; aqui o fecho é COMMIT, por isso
-- a aplicação inteira é UMA transacção: se qualquer statement falhar, nada fica no banco.
-- ═══════════════════════════════ DRY-RUN (BEGIN … ROLLBACK) ═══════════════════════════════
BEGIN;


SET LOCAL lock_timeout = '5s';


SET LOCAL statement_timeout = '60s';



-- 1) três funções próprias, SECURITY DEFINER, pinadas ao search_path e executáveis pelo anon
CREATE OR REPLACE FUNCTION public.bfr_rls_session_role()
 RETURNS public.account_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $fn$
  -- Responde o mesmo que public."current_role"() (que já é SECURITY DEFINER e faz exactamente isto):
  -- para o anon, auth.uid() é NULL → 0 linhas → NULL, e a qualificação fica falsa por lógica própria
  -- em vez de por 42501.
  select role from public.profiles where id = auth.uid()
$fn$;



CREATE OR REPLACE FUNCTION public.bfr_rls_is_developer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $fn$
  -- Delega na função viva: a resposta é a mesma; o que muda é que quem chama o wrapper não precisa de
  -- privilégio nenhum sobre a função interior.
  select coalesce(public.is_developer(), false)
$fn$;



CREATE OR REPLACE FUNCTION public.bfr_rls_director_manages_student(p_student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $fn$
  -- Corpo = o EXISTS vivo de occurrences_director_select (lido do catálogo), só com
  -- occurrences.student_id trocado pelo parâmetro. O SELECT em staff_schools passa a ser feito pelo
  -- dono da função, por isso a policy deixa de precisar de privilégio sobre ela.
  select EXISTS ( SELECT 1
   FROM ((profiles p
     JOIN staff_schools ss ON ((ss.profile_id = p.id)))
     JOIN students st ON ((st.school_id = ss.school_id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::account_role) AND (st.id = p_student_id)))
$fn$;



REVOKE ALL ON FUNCTION public.bfr_rls_session_role(), public.bfr_rls_is_developer(),
                     public.bfr_rls_director_manages_student(uuid) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.bfr_rls_session_role() TO anon, authenticated, service_role;


GRANT EXECUTE ON FUNCTION public.bfr_rls_is_developer() TO anon, authenticated, service_role;


GRANT EXECUTE ON FUNCTION public.bfr_rls_director_manages_student(uuid) TO anon, authenticated, service_role;

ALTER POLICY "access_requests_manage" ON public.access_requests
  USING (public.bfr_rls_is_developer())
  WITH CHECK ((public.bfr_rls_is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND ((approved_role IS NULL) OR (approved_role = requested_role)) AND (status = ANY (ARRAY['pending'::request_status, 'approved'::request_status, 'rejected'::request_status]))));

ALTER POLICY "access_requests_staff_insert" ON public.access_requests
  WITH CHECK ((public.bfr_rls_is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND (((approved_role IS NULL) AND (status = 'pending'::request_status)) OR ((approved_role = requested_role) AND (status = 'approved'::request_status)))));

ALTER POLICY "attendance_staff_delete" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)));

ALTER POLICY "attendance_staff_insert" ON public.attendance
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text) AND (((public.bfr_rls_session_role())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))));

ALTER POLICY "attendance_staff_select" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)));

ALTER POLICY "attendance_staff_update" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)))
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)));

ALTER POLICY "grades_staff_delete" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)));

ALTER POLICY "grades_staff_insert" ON public.grades
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id, subject) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text) AND (((public.bfr_rls_session_role())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))));

ALTER POLICY "grades_staff_select" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)));

ALTER POLICY "occurrences_director_select" ON public.occurrences
  USING ((public.bfr_rls_director_manages_student(occurrences.student_id)));

ALTER POLICY "occurrences_director_update" ON public.occurrences
  USING ((public.bfr_rls_director_manages_student(occurrences.student_id)))
  WITH CHECK ((public.bfr_rls_director_manages_student(occurrences.student_id)));

COMMIT;
