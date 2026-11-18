-- SM4-DDL-MUN — CANDIDATA, NÃO APLICADA. Correr só com OK explícito, e só depois de
-- `scripts/sm4-preflight-ddl-municipal.mjs` dar verde (ele mede o estado vivo e recusa se algum dos
-- nomes abaixo já existir, se alguma coluna referida não existir, ou se a ordem deste ficheiro deixar de
-- bater com o catálogo — políticas chamam funções, e funções leem tabelas: a ordem é obrigatória).
-- Reversão completa em `scripts/sm4-ddl-municipal-reversao.sql`.
--
-- De onde isto vem (medições de 17/11, todas em artefactos versionados):
--   evidence/sm1-inventario-rede-17-11b.json  → nenhuma coluna de município em 176 tabelas; a única
--     coluna geográfica é `city` em `schools`, `sports_schools`, `sports_public_schools`; `school_id`
--     existe apenas em `classes, staff_schools, students, supervision_requests, sports_teams,
--     sports_public_teams`; os planos `secretary_*` e `supervision_*` têm 0 linhas.
--   evidence/sm2-escopo-atual-17-11b.json     → `students.school_id`/`classes.school_id` → `schools.id`,
--     mas `staff_schools.school_id`/`supervision_requests.school_id` → `sports_schools.id`; 86 políticas
--     nas 17 tabelas alvo, 9 citando chave de escola; `supervision_requests_director_read` com
--     polroles = {0} = PUBLIC.
--   evidence/sm3-duas-escolas-e-supervisor-17-11b.json → 6×6 escolas, 3 ids partilhados, 3 só em
--     `schools`, 3 só em `sports_schools`; `bfr_is_education_supervisor()` é `profiles.role =
--     'education_supervisor'`; nenhum perfil com papel `teacher`.
--
-- O que cada bloco fecha no briefing:
--   §4.1 zona urbana/rural, período, conjunto de escolas        → bloco A
--   §4.2/§7.416 relação município–escolas–usuários              → blocos A, B, C
--   §5.379 «autorização concedida exclusivamente por um admin»  → bloco C (tabela de concessões com
--        autor e revogação, a nascer VAZIA: sem linha, sem acesso)
--   §6.408 «alternar entre áreas sem perder contexto»           → bloco C (o cargo em `profiles.role`
--        deixa de precisar de ser substituído para alguém ser municipal — hoje é exatamente isso que
--        um `UPDATE profiles SET role` faz)
--   §7.381/§7.453 «controle no backend, não filtro visual»      → blocos C, D, E
--   §4.3 identificação única do aluno                            → bloco F
--   §7.442 registro de auditoria                                 → bloco G
--   §5/§10 «diretor não vê a rede» / concessão PUBLIC            → bloco H
-- O que esta candidata NÃO faz, e porquê: não cria calendário letivo nem turnos (já existe candidata
-- própria em `scripts/ah2-ddl-calendario-candidata.sql`, com reversão própria — duplicar violaria o
-- §11.3); não preenche `zone`, `code_mec` nem `municipality_id` de nenhuma escola (§11.5 proíbe números
-- fictícios: preenchimento é importação ou decisão por interface); não concede acesso a ninguém; não
-- toca em dados de alunos existentes.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

--------------------------------------------------------------------------------
-- A) MUNICÍPIO + colunas de cadastro que os indicadores do §4.1 pedem.
--------------------------------------------------------------------------------
CREATE TABLE public.bfr_municipalities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  uf          char(2) NOT NULL,
  code_ibge   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.bfr_municipalities IS 'SM4: entidade administrativa municipal; ausente no esquema até 17/11 (evidence/sm1-inventario-rede-17-11b.json). code_ibge nullable: é dado de fonte externa.';

ALTER TABLE public.schools
  ADD COLUMN municipality_id  uuid REFERENCES public.bfr_municipalities(id),
  ADD COLUMN zone             text CHECK (zone IN ('urbana','rural')),
  ADD COLUMN operating_status text NOT NULL DEFAULT 'ativo' CHECK (operating_status IN ('ativo','suspenso','desativado'));
COMMENT ON COLUMN public.schools.zone IS 'SM4: §4.1 pede distribuição urbana/rural «quando cadastrada»; nunca preenchido por suposição.';
CREATE INDEX schools_municipality_id_idx ON public.schools (municipality_id) WHERE municipality_id IS NOT NULL;

--------------------------------------------------------------------------------
-- B) PONTE DE CHAVES `schools` × `sports_schools` — nada é fundido nem apagado (§11.8).
--------------------------------------------------------------------------------
CREATE TABLE public.bfr_school_key_map (
  school_id        uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sports_school_id uuid NOT NULL REFERENCES public.sports_schools(id) ON DELETE CASCADE,
  matched_by       text NOT NULL CHECK (matched_by IN ('mesmo_id','mesmo_nome','manual')),
  confirmed_by     uuid REFERENCES public.profiles(id),
  confirmed_at     timestamptz,
  PRIMARY KEY (school_id, sports_school_id)
);
COMMENT ON TABLE public.bfr_school_key_map IS 'SM4: reconciliação das duas chaves de escola. Par por nome nasce com confirmed_by NULL e NÃO vale em política até um humano confirmar.';

--------------------------------------------------------------------------------
-- C) CONCESSÃO MUNICIPAL, separada do cargo. Nasce vazia por decisão.
--------------------------------------------------------------------------------
CREATE TABLE public.bfr_municipal_access_grants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  municipality_id uuid NOT NULL REFERENCES public.bfr_municipalities(id) ON DELETE CASCADE,
  municipal_role  text NOT NULL CHECK (municipal_role IN
                    ('secretario_municipal','secretario_adjunto','gestor_autorizado','equipe_administrativa')),
  granted_by      uuid NOT NULL REFERENCES public.profiles(id),
  granted_at      timestamptz NOT NULL DEFAULT now(),
  revoked_by      uuid REFERENCES public.profiles(id),
  revoked_at      timestamptz
);
COMMENT ON TABLE public.bfr_municipal_access_grants IS 'SM4: §5.379. A hierarquia do §5 (secretário, adjunto, gestor autorizado, equipe) vive aqui como `municipal_role`, não como substituição de cargo.';
CREATE UNIQUE INDEX bfr_municipal_grants_one_active_per_profile
  ON public.bfr_municipal_access_grants (profile_id, municipality_id) WHERE revoked_at IS NULL;

--------------------------------------------------------------------------------
-- D) PREDICADOS. Só depois das tabelas, porque as funções leem-nas.
--    Todos SECURITY DEFINER + STABLE, o mesmo padrão de `bfr_is_education_supervisor()` medido em sm3.
--------------------------------------------------------------------------------
CREATE FUNCTION public.bfr_is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT COALESCE((SELECT true FROM public.profiles
                   WHERE id = auth.uid() AND role = 'developer'::account_role), false);
$fn$;

CREATE FUNCTION public.bfr_has_municipal_grant(p_municipality uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT COALESCE((SELECT true FROM public.bfr_municipal_access_grants g
                   WHERE g.profile_id = auth.uid() AND g.revoked_at IS NULL
                     AND (p_municipality IS NULL OR g.municipality_id = p_municipality)), false);
$fn$;

CREATE FUNCTION public.bfr_is_municipal_authority()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT public.bfr_has_municipal_grant(NULL)
      -- Retro-compatibilidade medida: o cargo `education_supervisor` já tinha políticas de rede inteira
      -- em `schools` e `supervision_requests`; retirá-las em silêncio deixaria de funcionar o que hoje
      -- funciona (contra §11.1/§11.6). Com a concessão nova, passa a ser possível ser municipal SEM
      -- ser supervisor do enum.
      OR COALESCE((SELECT true FROM public.profiles WHERE id = auth.uid()
                   AND role = 'education_supervisor'::account_role), false);
$fn$;

CREATE FUNCTION public.bfr_municipal_municipalities()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT municipality_id FROM public.bfr_municipal_access_grants
  WHERE profile_id = auth.uid() AND revoked_at IS NULL;
$fn$;

-- «esta escola está ao alcance deste utilizador?» — pelos dois lados do problema de chaves.
CREATE FUNCTION public.bfr_school_in_municipal_scope(p_school uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT COALESCE((SELECT true FROM public.schools s
                    WHERE s.id = p_school
                      AND s.municipality_id = ANY (SELECT * FROM public.bfr_municipal_municipalities())), false)
      OR COALESCE((SELECT true
                     FROM public.bfr_school_key_map m
                     JOIN public.schools s ON s.id = m.school_id
                    WHERE m.sports_school_id = p_school
                      AND (m.matched_by = 'mesmo_id' OR m.confirmed_by IS NOT NULL)
                      AND s.municipality_id = ANY (SELECT * FROM public.bfr_municipal_municipalities())), false);
$fn$;

-- Serve para as tabelas do espaço `sports_schools` (`staff_schools`, `supervision_requests`): responder
-- com a chave do lado escolar, que é o que a rede e os municípios pensam.
CREATE FUNCTION public.bfr_school_in_own_school_scope(p_school uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT COALESCE((SELECT true FROM public.staff_schools ss
                    WHERE ss.profile_id = auth.uid()
                      AND (ss.school_id = p_school
                           OR ss.school_id IN (SELECT m.sports_school_id
                                               FROM public.bfr_school_key_map m
                                               WHERE m.school_id = p_school
                                                 AND (m.matched_by = 'mesmo_id' OR m.confirmed_by IS NOT NULL)))), false);
$fn$;

CREATE FUNCTION public.bfr_municipalities_visible(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT p_id = ANY (SELECT * FROM public.bfr_municipal_municipalities())
      OR public.bfr_is_platform_admin()
      OR public.bfr_is_education_supervisor();
$fn$;

-- A interface precisa de PERGUNTAR «mostro a aba municipal?» ao backend, em vez de adivinhar pelo cargo
-- local (é o pedido explícito de §5.381 e §7.453): estes dois ficam executáveis por `authenticated`.
-- Os predicados de escopo ficam fechados ao PUBLIC — não são sonda para enumerar escolas.
GRANT EXECUTE ON FUNCTION public.bfr_is_municipal_authority() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bfr_has_municipal_grant(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.bfr_school_in_municipal_scope(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bfr_school_in_own_school_scope(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bfr_municipal_municipalities() FROM PUBLIC;

--------------------------------------------------------------------------------
-- E) RLS: ativar, depois criar políticas (todas já têm predicado válido para chamar).
--------------------------------------------------------------------------------
ALTER TABLE public.bfr_municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bfr_school_key_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bfr_municipal_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY bfr_municipalities_read ON public.bfr_municipalities
  FOR SELECT TO authenticated USING (public.bfr_municipalities_visible(id));
CREATE POLICY bfr_municipalities_insert ON public.bfr_municipalities
  FOR INSERT TO authenticated WITH CHECK (public.bfr_is_platform_admin());
CREATE POLICY bfr_municipalities_update ON public.bfr_municipalities
  FOR UPDATE TO authenticated USING (public.bfr_is_platform_admin()) WITH CHECK (public.bfr_is_platform_admin());

-- §4.2 quer a lista de escolas da rede para «gestores autorizados», não só para o cargo supervisor.
CREATE POLICY schools_municipal_read ON public.schools
  FOR SELECT TO authenticated USING (public.bfr_is_municipal_authority());

CREATE POLICY bfr_school_key_map_read ON public.bfr_school_key_map
  FOR SELECT TO authenticated USING (public.bfr_is_municipal_authority() OR public.bfr_is_platform_admin());
CREATE POLICY bfr_school_key_map_write ON public.bfr_school_key_map
  FOR ALL TO authenticated USING (public.bfr_is_platform_admin()) WITH CHECK (public.bfr_is_platform_admin());

CREATE POLICY bfr_municipal_grants_self_read ON public.bfr_municipal_access_grants
  FOR SELECT TO authenticated USING (profile_id = auth.uid() OR public.bfr_is_platform_admin()
                                     OR public.bfr_is_municipal_authority());
CREATE POLICY bfr_municipal_grants_grant ON public.bfr_municipal_access_grants
  FOR INSERT TO authenticated WITH CHECK (public.bfr_is_platform_admin() AND granted_by = auth.uid());
CREATE POLICY bfr_municipal_grants_revoke ON public.bfr_municipal_access_grants
  FOR UPDATE TO authenticated USING (public.bfr_is_platform_admin()) WITH CHECK (public.bfr_is_platform_admin());

-- Censo: só onde a chave de escola existe de facto (medido em sm1: `students`, `classes` no espaço
-- `schools`; `supervision_requests` no espaço `sports_schools`, atravessado pela ponte). Para
-- `attendance`, `grades`, `school_documents`, `announcements` — que NÃO têm `school_id` — esta
-- candidata NÃO cria política «por aluno»: usa as vistas agregadas abaixo, porque escrever uma junção
-- por memória seria exatamente o género de número que o preflight não consegue defender.
CREATE POLICY students_municipal_read ON public.students
  FOR SELECT TO authenticated USING (public.bfr_school_in_municipal_scope(school_id));
CREATE POLICY classes_municipal_read ON public.classes
  FOR SELECT TO authenticated USING (public.bfr_school_in_municipal_scope(school_id));
CREATE POLICY supervision_requests_municipal_read ON public.supervision_requests
  FOR SELECT TO authenticated USING (public.bfr_school_in_municipal_scope(school_id)
                                     OR public.bfr_school_in_own_school_scope(school_id));

--------------------------------------------------------------------------------
-- F) IDENTIFICAÇÃO ÚNICA DO ALUNO (§4.3) — nullable: preencher é dado real, não criação.
--------------------------------------------------------------------------------
ALTER TABLE public.students ADD COLUMN code_mec text;
CREATE UNIQUE INDEX students_code_mec_unique ON public.students (code_mec) WHERE code_mec IS NOT NULL;
COMMENT ON COLUMN public.students.code_mec IS 'SM4: §4.3; NULL até importação — nunca gerado por esta candidata.';

--------------------------------------------------------------------------------
-- G) REGISTRO DE AUDITORIA MUNICIPAL (§7.442).
--------------------------------------------------------------------------------
CREATE TABLE public.bfr_municipal_audit (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor       uuid REFERENCES public.profiles(id),
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  detail      jsonb
);
CREATE INDEX bfr_municipal_audit_at_idx ON public.bfr_municipal_audit (at DESC);
ALTER TABLE public.bfr_municipal_audit ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.bfr_municipal_audit IS 'SM4: trilha de operações municipais; `detail` jsonb guarda o que mudou, nunca o teor de dado pessoal completo.';
CREATE POLICY bfr_municipal_audit_write ON public.bfr_municipal_audit
  FOR INSERT TO authenticated WITH CHECK (actor = auth.uid() AND public.bfr_is_municipal_authority());
CREATE POLICY bfr_municipal_audit_read ON public.bfr_municipal_audit
  FOR SELECT TO authenticated USING (public.bfr_is_municipal_authority() OR public.bfr_is_platform_admin());

--------------------------------------------------------------------------------
-- H) CORRIGIR A CONCESSÃO ERRADA MEDIDA (§5, §10): `supervision_requests_director_read` está hoje com
--    polroles = {0} = PUBLIC, ou seja vale para `anon`. Não há exploração provada — com `auth.uid()`
--    NULL a qualificação `p.id = auth.uid()` devolve 0 linhas — mas a política era para diretores.
--------------------------------------------------------------------------------
ALTER POLICY supervision_requests_director_read ON public.supervision_requests TO authenticated;

--------------------------------------------------------------------------------
-- I) AGREGADOS DO DASHBOARD (§4.1). Vistas depois das funções de escopo.
--    Nota de honestidade: a vista corre como DONO da vista, por isso o RLS das tabelas interiores não é
--    o que limita as linhas — o limite é a predica de escopo dentro do WHERE, que é SECURITY DEFINER e
--    lê `auth.uid()`. Um não-concedido recebe 0 linhas, não recebe tudo. É a mesma forma que a casa já
--    usa nas vistas `sports_public_*` fechadas por DDL em 16/11 (ciclo AE).
--    Devolve contagens e nomes de ESCOLA, nunca nomes de aluno: §7.451.
--------------------------------------------------------------------------------
CREATE VIEW public.bfr_municipal_school_stats AS
  SELECT s.id AS school_id, s.name AS school_name, s.city, s.zone, s.operating_status,
         s.municipality_id,
         (SELECT count(*)::int FROM public.students st WHERE st.school_id = s.id) AS students_total,
         (SELECT count(*)::int FROM public.classes  cl WHERE cl.school_id = s.id) AS classes_total,
         (SELECT count(*)::int FROM public.bfr_school_key_map m
           JOIN public.staff_schools ss ON ss.school_id = m.sports_school_id
          WHERE m.school_id = s.id)                                               AS staff_links_total
  FROM public.schools s
  WHERE public.bfr_school_in_municipal_scope(s.id) OR public.bfr_is_platform_admin();
GRANT SELECT ON public.bfr_municipal_school_stats TO authenticated;

CREATE FUNCTION public.bfr_municipal_network_totals()
RETURNS TABLE (schools int, students int, classes int, municipalities int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT (SELECT count(*)::int FROM public.bfr_municipal_school_stats),
         (SELECT coalesce(sum(students_total), 0)::int FROM public.bfr_municipal_school_stats),
         (SELECT coalesce(sum(classes_total), 0)::int FROM public.bfr_municipal_school_stats),
         (SELECT count(DISTINCT municipality_id)::int FROM public.bfr_municipal_school_stats
           WHERE municipality_id IS NOT NULL);
$fn$;
GRANT EXECUTE ON FUNCTION public.bfr_municipal_network_totals() TO authenticated;

--------------------------------------------------------------------------------
-- J) LINHAS DA PONTE. As de id igual são as únicas afirmáveis sem leitura humana; as de nome igual
--    entram como sugestão não confirmada (medidas em sm3: Escola Alpha/Beta/Gamma existem nas duas
--    tabelas com ids diferentes). O preflight mede os dois conjuntos antes de isto correr.
--------------------------------------------------------------------------------
INSERT INTO public.bfr_school_key_map (school_id, sports_school_id, matched_by)
  SELECT s.id, x.id, 'mesmo_id'
  FROM public.schools s JOIN public.sports_schools x ON x.id = s.id
  WHERE NOT EXISTS (SELECT 1 FROM public.bfr_school_key_map m WHERE m.school_id = s.id
                      OR m.sports_school_id = x.id);

INSERT INTO public.bfr_school_key_map (school_id, sports_school_id, matched_by)
  SELECT s.id, x.id, 'mesmo_nome'
  FROM public.schools s JOIN public.sports_schools x ON x.name = s.name AND x.id <> s.id
  WHERE NOT EXISTS (SELECT 1 FROM public.bfr_school_key_map m WHERE m.school_id = s.id
                      OR m.sports_school_id = x.id);

COMMIT;
