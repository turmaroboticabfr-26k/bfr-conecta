-- P73-PEN-38 — CANDIDATA, NÃO APLICADA. Correr só com OK explícito, e só depois de
-- `scripts/p73-pen38-preflight.mjs` dar verde contra o estado vivo (ele mede o que este ficheiro pressupõe e
-- recusa se alguma destas policies ou funções já existir, ou se o predicado que aqui se substitui já não for
-- o que foi medido). Reversão completa em `scripts/p73-pen38-ddl-reversao.sql`.
--
-- De onde isto vem (medições de 20/11, em artefactos versionados):
--   evidence/p73-politicas-municipais-20-11e.json → 60 policies nas 11 mesas. Em `schools` só existem duas
--     leituras: `schools_municipal_read USING bfr_is_municipal_authority()` e `schools_supervisor_read USING
--     bfr_is_education_supervisor()`. Nenhuma delas menciona o município da concessão. Não existe UMA policy
--     de escrita em `schools` para `authenticated`.
--   evidence/p73-pen38-alcance-por-concessao-20-11e.json → com as 4 concessões ativas de hoje: os 4
--     concedidos lêem 6/6 escolas da rede (e «6» é o total sem RLS), `escolas com município` = 0 em toda a
--     rede, a vista `bfr_municipal_school_stats` devolve 0 linhas a TODOS os papéis medidos, e
--     `bfr_municipal_network_totals()` devolve {6,848,27} ao `developer` e {0,0,0,0} a quem tem concessão.
--     O `developer` — admin de plataforma, papel que a própria casa trata como admin — lê 0 de 6 escolas na
--     mesa e 6 no agregado: a mesma resposta dá dois números diferentes conforme a porta.
--
-- O que cada bloco fecha:
--   §5.379/§7.381 «a concessão é que dá alcance, e o alcance é o município»  → bloco A
--   §10 «o admin da plataforma não pode estar cego na mesa que lista»        → bloco B
--   §4.2/§6.408 etiquetar escola↔município sem abrir escrita arbitrária      → bloco C (RPC auditado)
--   §12 «diagnóstico em cada tela» / distinguir «não tens acesso» de «ainda  → bloco D
--   não há escolas ligadas ao teu município»

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

--------------------------------------------------------------------------------
-- A) ESCOPO NO LUGAR DA AUTORIDADE. `bfr_is_municipal_authority()` responde «és autoridade em algum
--    município?»; a política precisa de «esta escola está no teu município?», que é exactamente o que
--    `bfr_school_in_municipal_scope(id)` já faz (inclui a ponte `bfr_school_key_map` confirmada). Nome
--    mantido: a medida é o predicado, não a etiqueta.
--------------------------------------------------------------------------------
DROP POLICY schools_municipal_read ON public.schools;
CREATE POLICY schools_municipal_read ON public.schools
  FOR SELECT TO authenticated USING (public.bfr_school_in_municipal_scope(id));

-- NÃO retirado nesta candidata (e porquê, medido em 20/11): `students_municipal_read`,
-- `classes_municipal_read` e `supervision_requests_municipal_read` já usam o predicado de escopo, e com
-- `escolas_com_municipio = 0` devolvem 0 linhas a todos. O que hoje dá rede inteira a um concedido NÃO é
-- uma policy municipal: é `students_select_secretary` / `director_dashboard_read_students` /
-- `classes_select_secretary`, que filtram por `profiles.role` e não têm nenhuma cláusula de escola. Apertar
-- essas é mexer na Secretaria ESCOLAR em uso por pessoas reais (contra §11.1), exige decisão de produto e
-- fica registado como pendência própria (PEN-41), não disfarçado dentro deste ficheiro.

--------------------------------------------------------------------------------
-- B) O ADMIN DE PLATAFORMA VOLTA A ENXERGAR A MESA (medido: developer = 0 de 6 em `schools`, 6 no agregado).
--    Política separada, para a reversão do bloco A não arrastar esta.
--------------------------------------------------------------------------------
CREATE POLICY schools_platform_admin_read ON public.schools
  FOR SELECT TO authenticated USING (public.bfr_is_platform_admin());

--------------------------------------------------------------------------------
-- C) ETIQUETAR É DECISÃO, NÃO INFERÊNCIA. Sem escolas ligadas, o bloco A dá o resultado correcto mas vazio;
--    por isso o fecho da PEN-38 precisa de um caminho para a ligação existir. A alternativa «policy de UPDATE
--    para admin» abriria escrita em QUALQUER coluna de `schools`; um RPC nomeado fecha o alcance à coluna
--    decidida, exige motivo, e escreve trilha. §11.5: nada aqui preenche `municipality_id` de ninguém.
--------------------------------------------------------------------------------
CREATE FUNCTION public.bfr_school_set_municipality(p_school uuid, p_municipality uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $fn$
BEGIN
  IF NOT public.bfr_is_platform_admin() THEN
    RAISE EXCEPTION 'bfr_school_set_municipality: exige admin de plataforma' USING ERRCODE = '42501';
  END IF;
  IF p_school IS NULL OR p_municipality IS NULL THEN
    RAISE EXCEPTION 'bfr_school_set_municipality: escola e municipio sao obrigatorios' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'bfr_school_set_municipality: exigir motivo e a unica defesa contra o preenchimento por suposicao (11.5)'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bfr_municipalities WHERE id = p_municipality) THEN
    RAISE EXCEPTION 'bfr_school_set_municipality: municipio inexistente' USING ERRCODE = '23503';
  END IF;
  UPDATE public.schools SET municipality_id = p_municipality WHERE id = p_school;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bfr_school_set_municipality: escola inexistente' USING ERRCODE = '23503';
  END IF;
  INSERT INTO public.bfr_municipal_audit (actor, action, entity, entity_id, detail)
    VALUES (auth.uid(), 'school_municipality_set', 'schools', p_school::text,
            jsonb_build_object('municipio_id', p_municipality, 'motivo', left(btrim(p_reason), 240)));
END;
$fn$;
COMMENT ON FUNCTION public.bfr_school_set_municipality(uuid, uuid, text) IS 'SM4/PEN-38: única porta de etiquetagem escola↔município; só admin de plataforma, sempre com motivo, sempre com trilha.';
REVOKE ALL ON FUNCTION public.bfr_school_set_municipality(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_school_set_municipality(uuid, uuid, text) TO authenticated;

-- Dentro da função (dono = postgres, que é o dono das tabelas) o RLS de `bfr_municipal_audit` não trava o
-- INSERT do admin concedido-ou-não: o preflight mede `relrowsecurity`/`relforcerowsecurity` e o dono desta
-- mesa antes de isto correr, porque a frase acima é uma afirmação sobre o catálogo, não sobre a esperança.
-- O bloco H do DDL sm4 já tinha fechado a leitura da trilha a `{0}`? Não: fica como está, medido.

--------------------------------------------------------------------------------
-- D) DIAGNÓSTICO DE ESCOPO. Devolve números e o próprio uid, nunca nomes: distingue os dois zeros que hoje
--    são indistinguíveis na tela («não tenho concessão» e «a minha concessão não tem escolas ligadas» deram
--    ambos 0 linhas na vista, para papéis diferentes, sem nada que o dissesse).
--------------------------------------------------------------------------------
CREATE FUNCTION public.bfr_municipal_scope_diagnostico()
RETURNS TABLE (perfil uuid, tem_concessao boolean, municipios_da_concessao bigint,
               escolas_no_meu_municipio bigint, escolas_sem_municipio_na_rede bigint,
               pontes_confirmadas bigint, concessoes_ativas_na_rede bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT auth.uid(),
         public.bfr_is_municipal_authority(),
         (SELECT count(*) FROM public.bfr_municipal_municipalities()),
         (SELECT count(*) FROM public.schools s
           WHERE s.municipality_id = ANY (SELECT * FROM public.bfr_municipal_municipalities())),
         (SELECT count(*) FROM public.schools WHERE municipality_id IS NULL),
         (SELECT count(*) FROM public.bfr_school_key_map
           WHERE matched_by = 'mesmo_id' OR confirmed_by IS NOT NULL),
         (SELECT count(*) FROM public.bfr_municipal_access_grants WHERE revoked_at IS NULL);
$fn$;
COMMENT ON FUNCTION public.bfr_municipal_scope_diagnostico() IS 'SM4/PEN-38: §12 — porque é que a aba está vazia. Só contagens e o uid do próprio chamador.';
REVOKE ALL ON FUNCTION public.bfr_municipal_scope_diagnostico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_municipal_scope_diagnostico() TO authenticated;

COMMIT;

-- Depois de aplicar, a medição que fecha a PEN-38 é re-correr
-- `scripts/p73-pen38-alcance-por-concessao-20-11.mjs` e esperar, para cada concedido: `schools` = escolas do
-- município da concessão (0 enquanto ninguém for etiquetado pelo bloco C), developer = 6, e
-- `escolas_no_meu_municipio` a subir conforme o bloco C for usado. A vista `bfr_municipal_school_stats`
-- continuar a dar 0 NÃO é bug deste ficheiro: o WHERE dela é o predicado de escopo, e enquanto a rede não
-- tiver escolas etiquetadas o número correcto é zero.
