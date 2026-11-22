-- PEN-48 — REVERSÃO da candidata `scripts/p73-pen48-ddl-candidata.sql`. Devolve o EXECUTE ao mesmo papel, no mesmo
-- nome e pela mesma assinatura medida, sem `IF EXISTS` e sem nenhum outro lado: se a candidata não estiver aplicada,
-- isto chumba em vez de fingir que reverteu, e o preflight do modo `candidata` é que afirma o estado que a reversão
-- destrói. É o caminho de volta, não um estado desejado — o grau que aqui se devolve é o que os privilégios default
-- do esquema entregaram no `CREATE` da PEN-42, e a casa já decidiu fechar esse grau noutras peças (PEN-43, PEN-44).

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

GRANT EXECUTE ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text) TO anon;

COMMIT;
