-- RM-6.8 / PEN-25 — fail-closed por POLICY, não por PRIVILÉGIO.
-- >>>>>> NÃO APLICADA. Nenhum DDL foi executado. A aplicação pede OK novo e explícito. <<<<<<
--
-- Fonte: evidence/rm68-recon-quals.json (medição 2026-11-13T02:13:35.747Z, emitida por scripts/rm68-recon-quals.mjs,
-- que é somente leitura). As 11 policies abaixo são as de papel PUBLIC das 4 tabelas da
-- PEN-25 — são as únicas que um pedido anon chega a avaliar.
--
-- O que está errado hoje (medido 12/11, §12.2 da documentação): a qualificação chama directamente
--   public."current_role"()             → anon não tem EXECUTE                        → 42501
--   public.is_developer()              → idem                                        → 42501
--   EXISTS (… JOIN staff_schools …)    → anon não tem SELECT em staff_schools        → 42501
-- O resultado para o anon já é «nenhuma linha», mas pela porta do privilégio: um GRANT SELECT futuro
-- abriria a tabela sem tocar em policy nenhuma. Esta candidata move a decisão para dentro de funções
-- próprias — o anon passa a poder avaliá-las, e é a lógica delas (auth.uid() NULL → sem papel → false)
-- que fecha a porta.
--
-- O que este ficheiro NÃO altera: nenhuma expressão sobre dados. bfr_staff_can_manage_student_scope(),
-- auth.uid(), os filtros de família (guardian_students) e os predicados de entered_by continuam com o
-- mesmo texto; muda só quem responde «que papel é esta sessão» e onde vive o filtro do director.
-- Nenhum GRANT sobre tabela é emitido aqui.
--
-- Como o texto foi produzido: cada USING/WITH CHECK novo é o texto do catálogo com substituição
-- programática — o EXISTS do director é recortado por contagem de parênteses e copiado byte-a-byte,
-- com occurrences.student_id trocado pelo parâmetro. Nada foi dactilografado a partir da memória.

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

-- 2) as 11 policies de papel PUBLIC: mesma forma, decisão movida para as funções
ALTER POLICY public."access_requests_manage" ON public.access_requests
  USING (public.bfr_rls_is_developer())
  WITH CHECK ((public.bfr_rls_is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND ((approved_role IS NULL) OR (approved_role = requested_role)) AND (status = ANY (ARRAY['pending'::request_status, 'approved'::request_status, 'rejected'::request_status]))))

ALTER POLICY public."access_requests_staff_insert" ON public.access_requests
  WITH CHECK ((public.bfr_rls_is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND (((approved_role IS NULL) AND (status = 'pending'::request_status)) OR ((approved_role = requested_role) AND (status = 'approved'::request_status)))))

ALTER POLICY public."attendance_staff_delete" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)))

ALTER POLICY public."attendance_staff_insert" ON public.attendance
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text) AND (((public.bfr_rls_session_role())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))))

ALTER POLICY public."attendance_staff_select" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)))

ALTER POLICY public."attendance_staff_update" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)))
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)))

ALTER POLICY public."grades_staff_delete" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)))

ALTER POLICY public."grades_staff_insert" ON public.grades
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id, subject) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text) AND (((public.bfr_rls_session_role())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))))

ALTER POLICY public."grades_staff_select" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND ((public.bfr_rls_session_role())::text <> 'secretary'::text)))

ALTER POLICY public."occurrences_director_select" ON public.occurrences
  USING ((public.bfr_rls_director_manages_student(occurrences.student_id)))

ALTER POLICY public."occurrences_director_update" ON public.occurrences
  USING ((public.bfr_rls_director_manages_student(occurrences.student_id)))
  WITH CHECK ((public.bfr_rls_director_manages_student(occurrences.student_id)))

-- 3) vereditos do dry-run — o que está à direita do comentário é o que tem de aparecer
select count(*)::int as polisticas_public_sem_chamada_privilegiada      -- esperado: 11
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('grades','attendance','access_requests','occurrences')
   and cardinality(p.polroles) = 0
   and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%current_role%'
   and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%is_developer%'
   and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%staff_schools%'
   and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%current_role%'
   and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%is_developer%'
   and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%staff_schools%';

select has_function_privilege('anon', 'public.bfr_rls_session_role()'::regprocedure, 'EXECUTE')                as anon_chama_role_wrapper,  -- true
       has_function_privilege('anon', 'public.bfr_rls_is_developer()'::regprocedure, 'EXECUTE')                as anon_chama_dev_wrapper,     -- true
       has_function_privilege('anon', 'public.bfr_rls_director_manages_student(uuid)'::regprocedure, 'EXECUTE') as anon_chama_dir_wrapper,   -- true
       has_function_privilege('anon', 'public."current_role"()'::regprocedure, 'EXECUTE')                     as anon_no_legado,             -- false: fica como estava
       has_table_privilege('anon', 'public.staff_schools', 'SELECT')                                          as anon_le_staff_schools;      -- false: nada se abre

select public.bfr_rls_session_role() as papel_da_sessao,   -- NULL nesta ligação (não é JWT de app)
       public.bfr_rls_is_developer() as dev,               -- false
       public.bfr_rls_director_manages_student(null) as dir; -- false, nunca erro

-- 4) o que o dry-run NÃO prova: que a resposta por papel é a mesma de antes para cada papel autenticado.
--    Isso é comportamental e só se mede com JWTs reais — ver a secção APLICAÇÃO.
--    A igualdade esperada é: director continua a ver só ocorrências dos alunos da(s) sua(s) escola(s),
--    porque o corpo mantém `p.id = auth.uid()` e `ss.profile_id = p.id`; o que muda é quem tem de ter
--    privilégio para avaliar a expressão, não a expressão.

ROLLBACK;  -- o dry-run não deixa nada no banco

-- ═══════════════════════════════ REVERSÃO (texto original do banco) ═══════════════════════════════
-- Cada USING/WITH CHECK abaixo é copiado do artefacto, não reescrito: é o byte-a-byte do que está vivo
-- em 2026-11-13T02:13:35.747Z. Depois das 11 re-atribuições:
ALTER POLICY public."access_requests_manage" ON public.access_requests
  USING (is_developer())
  WITH CHECK ((is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND ((approved_role IS NULL) OR (approved_role = requested_role)) AND (status = ANY (ARRAY['pending'::request_status, 'approved'::request_status, 'rejected'::request_status]))))

ALTER POLICY public."access_requests_staff_insert" ON public.access_requests
  WITH CHECK ((is_developer() AND (requested_role = ANY (enum_range(NULL::account_role))) AND (((approved_role IS NULL) AND (status = 'pending'::request_status)) OR ((approved_role = requested_role) AND (status = 'approved'::request_status)))))

ALTER POLICY public."attendance_staff_delete" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)))

ALTER POLICY public."attendance_staff_insert" ON public.attendance
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text) AND ((("current_role"())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))))

ALTER POLICY public."attendance_staff_select" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)))

ALTER POLICY public."attendance_staff_update" ON public.attendance
  USING ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)))
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id) AND (("current_role"())::text <> 'secretary'::text)))

ALTER POLICY public."grades_staff_delete" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND (("current_role"())::text <> 'secretary'::text)))

ALTER POLICY public."grades_staff_insert" ON public.grades
  WITH CHECK ((bfr_staff_can_manage_student_scope(student_id, subject) AND (("current_role"())::text <> 'secretary'::text) AND ((("current_role"())::text <> 'pedagogical'::text) OR (entered_by = auth.uid()))))

ALTER POLICY public."grades_staff_select" ON public.grades
  USING ((bfr_staff_can_manage_student_scope(student_id, subject) AND (("current_role"())::text <> 'secretary'::text)))

ALTER POLICY public."occurrences_director_select" ON public.occurrences
  USING ((EXISTS ( SELECT 1
   FROM ((profiles p
     JOIN staff_schools ss ON ((ss.profile_id = p.id)))
     JOIN students st ON ((st.school_id = ss.school_id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::account_role) AND (st.id = occurrences.student_id)))))

ALTER POLICY public."occurrences_director_update" ON public.occurrences
  USING ((EXISTS ( SELECT 1
   FROM ((profiles p
     JOIN staff_schools ss ON ((ss.profile_id = p.id)))
     JOIN students st ON ((st.school_id = ss.school_id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::account_role) AND (st.id = occurrences.student_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((profiles p
     JOIN staff_schools ss ON ((ss.profile_id = p.id)))
     JOIN students st ON ((st.school_id = ss.school_id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::account_role) AND (st.id = occurrences.student_id)))))

DROP FUNCTION IF EXISTS public.bfr_rls_session_role();
DROP FUNCTION IF EXISTS public.bfr_rls_is_developer();
DROP FUNCTION IF EXISTS public.bfr_rls_director_manages_student(uuid);

-- ═══════════════════════════════ APLICAÇÃO (só com OK novo) ═══════════════════════════════
-- Mesmo corpo do DRY-RUN sem BEGIN/ROLLBACK, numa sessão cujo search_path inclui public (é o default do
-- canal de DDL; foi assim que o texto vivo foi capturado). Não executar a partir deste ficheiro.
-- Ordem e portões depois de aplicar:
--   1) node scripts/rm68-recon-quals.mjs          → as 23 policies voltam, e as 11 PUBLIC
--      já não chamam nada privilegiado;
--   2) node scripts/rm14-suite.mjs                → os 30 verdes intactos E o AVISO RM14-A2 VAZIO
--      (0 recusas por 42501); nenhum portão pode ser enfraquecido para obter o verde;
--   3) node scripts/s20-behavioral.mjs            → a equivalência por papel (director/secretaria/
--      coordenação) medida com JWTs reais, porque a substituição é de privilégio, não de lógica, e só
--      o comportamento com sessão autenticada prova que nenhum vista ganhou linhas.
