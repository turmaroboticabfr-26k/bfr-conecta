-- SM.23 peças (b) e (c) — CANDIDATA, NÃO APLICADA NESTE FICHEIRO.
-- OK que autoriza: «DDL municipal + calendário» (seleção do utilizador, 18/11), as três peças (a)(b)(c).
-- (a) já aplicada: scripts/ah2-ddl-calendario-candidata.sql → evidence/sm23-aplicacao-calendario-18-11-VERMELHO.json
--     e conferência verde em evidence/sm23-conferencia-calendario-18-11.json.
--
-- O que está medido (evidence/sm23-preflight-view-funcoes-18-11.json, 25/25 portões verdes):
--   * `bfr_municipal_school_stats`: dono `postgres` com rolbypassrls, `reloptions` NULL (modo
--     «sem-opcao-null» = definer), definição 652 B md5 af7a898df0af2401d80f289a0736dcd2, chamada 0
--     vezes no bundle servido. O WHERE da vista já filtra por `bfr_school_in_municipal_scope(id) OR
--     bfr_is_platform_admin()`, mas como a vista é definer de um dono BYPASSRLS, as POLÍTICAS RLS das
--     cinco tabelas base (schools, classes, students, staff_schools, bfr_school_key_map) são saltadas.
--     `security_invoker=true` é o que faz o banco perguntar ao papel que chama, não ao dono.
--   * `bfr_municipal_network_totals()` e `bfr_has_municipal_grant(uuid)`: ACL `=X/postgres` — o
--     beneficiário vazio é PUBLIC, e `anon` é membro de PUBLIC. Medido com a chave anónima:
--       POST /rest/v1/rpc/bfr_municipal_network_totals → 200, 1 linha, todos os contadores a 0
--       POST /rest/v1/rpc/bfr_has_municipal_grant      → 200, `false`
--     Isto não divulgava números (o predicado lê o claim de sessão, que anon não tem); divulgava a
--     rota e um ORÁCULO BOOLEANO de «este município existe/tem grant?». É isso que se fecha.
--
-- Duas armadilhas que este ficheiro evita, e por isso a redação não é a que a roadmap sugeriu:
--   1. `REVOKE ... FROM anon` a solo não fechava nada: o privilégio herdado de PUBLIC ficava no sítio.
--      Por isso os dois beneficiários são nomeados.
--   2. Não se usa `CASCADE`: se houvesse privilégios dependentes, preferimos que o Postgres rebente e
--      o rollback não deixe nada, a que caia um objeto desconhecido. O dry-run transacional do preflight
--      já provou que os dois REVOKE correm sem dependentes.
--
-- Correr só com OK explícito (o de 18/11 cobre estas peças). Reversão: sm23-ddl-view-funcoes-reversao.sql.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '10s';

-- (b) a vista municipal passa a consultar o RLS de quem chama
ALTER VIEW public.bfr_municipal_school_stats SET (security_invoker = true);

-- (c) as duas funções agregadas deixam de ser chamáveis por anon (nem por herança de PUBLIC)
REVOKE EXECUTE ON FUNCTION public.bfr_municipal_network_totals() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bfr_has_municipal_grant(uuid) FROM PUBLIC, anon;

-- cache do PostgREST: sem recarregar, a rota velha continua servida minutos a fio
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Verificação depois de aplicar (leitura, não escrita):
--   select c.relname, array_to_string(c.reloptions,',') from pg_class c where relname='bfr_municipal_school_stats';
--   select proname, array_to_string(proacl,' | ') from pg_proc where proname in ('bfr_municipal_network_totals','bfr_has_municipal_grant');
