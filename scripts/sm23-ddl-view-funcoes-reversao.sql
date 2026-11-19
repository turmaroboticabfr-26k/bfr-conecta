-- SM.23 peças (b) e (c) — REVERSÃO, só para correr se a escola decidir voltar atrás.
-- Repõe exactamente o estado medido antes do apply (evidence/sm23-preflight-view-funcoes-18-11.json):
--   * `reloptions` da vista era NULL → usa-se `RESET`, não `SET (security_invoker = false)`, porque o
--     `SET false` deixaria `{security_invoker=false}` escrito no catálogo: semanticamente igual, mas
--     já não byte-a-byte o estado que encontrámos.
--   * os dois ACL tinham `=X/postgres` (EXECUTE a PUBLIC) e `anon=X/postgres` → devolvem-se os dois.
-- O dry-run transacional do preflight já exercitou o caminho inverso: depois do ROLLBACK o catálogo
-- voltou a `modo=sem-opcao-null`, `anon_exec_totals=true`, `def_md5=af7a898df0af2401d80f289a0736dcd2`.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '10s';

ALTER VIEW public.bfr_municipal_school_stats RESET (security_invoker);

GRANT EXECUTE ON FUNCTION public.bfr_municipal_network_totals() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bfr_has_municipal_grant(uuid) TO PUBLIC, anon;

NOTIFY pgrst, 'reload schema';
COMMIT;
