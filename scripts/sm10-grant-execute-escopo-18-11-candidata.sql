-- sm10 — candidata de correção da quebra RLS medida em 18/11 (sm10/sm10b + sm7 390 sm8bar390).
-- MEDIDA (sondas sm10/sm10b, artefactos evidence/sm10-sonda-rls-escopo-18-11.json e -18-11b.json):
--   as políticas sm4 de students/classes/supervision_requests avaliam bfr_school_in_municipal_scope /
--   bfr_school_in_own_school_scope com os privilégios do CHAMADOR; o REVOKE ALL FROM PUBLIC do sm4
--   deixou só postgres+service_role com EXECUTE (ACL medida em pg_proc), e QUALQUER SELECT autenticado
--   nessas três tabelas — inclusive a vista agregada bfr_municipal_school_stats — falha 42501
--   «permission denied for function bfr_school_in_municipal_scope». Reproduzido com SET ROLE
--   authenticated e com JWT reais (secretario_municipal, pedagogical, education_supervisor, secretary).
-- IMPACTO: não é só o módulo — é a app v123 em produção (secretaria, professor, responsável) para
--   students/classes/supervision_requests desde a aplicação do DDL sm4.
-- CORREÇÃO: devolver EXECUTE dos dois predicados a `authenticated`. O anon continua sem acesso (o
--   fecho visava o PUBLIC não-autenticado). O booleano de escopo não é canal novo de enumeração: o
--   mesmo conjunto já é revelado pelas próprias políticas RLS a qualquer autenticado.
-- bfr_municipal_municipalities() NÃO precisa de grant: só é chamada por dentro dos dois predicados
--   (SECURITY DEFINER → corre como dono).

BEGIN;

GRANT EXECUTE ON FUNCTION public.bfr_school_in_municipal_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bfr_school_in_own_school_scope(uuid) TO authenticated;

COMMIT;

-- ── reversão ─────────────────────────────────────────────────────────────────
-- BEGIN;
-- REVOKE EXECUTE ON FUNCTION public.bfr_school_in_municipal_scope(uuid) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bfr_school_in_own_school_scope(uuid) FROM authenticated;
-- COMMIT;
