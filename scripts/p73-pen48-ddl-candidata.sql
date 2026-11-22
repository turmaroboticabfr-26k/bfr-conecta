-- PEN-48 candidata — NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR (`APLICAR PEN-48 NO BANCO`).
--
-- O que está medido (21/11, catálogo vivo pela API de gestão, sem JWT de sessão, registo
-- `evidence/p73-pen42-preflight-reversao-21-11-k.json`):
--   `public.register_gate_checkin_v2` (oid 32918, criada pela PEN-42) tem `proacl`
--   `postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres` e
--   `has_function_privilege('anon', …, 'EXECUTE') = true`. A função que ela encaminha,
--   `public.register_gate_checkin` (oid 30855), tem as mesmas entradas MENOS `anon`. O revestimento ficou portanto
--   mais largo do que a viva por um papel — e a linha `GRANT … TO authenticated` que a PEN-42 escreveu não o nega:
--   os privilégios default do esquema entregam `anon` no instante do `CREATE`, e `REVOKE ALL … FROM PUBLIC` remove
--   só a entrada do pseudo-papel, nunca as entradas nominais. A classe está medida em
--   `scripts/p73-sonda-exposicao-anonima.mjs` e é o motivo de a PEN-43 existir.
--   O `service_role` não é alargamento: a viva também o tem, e o censo do catálogo conta hoje 163 de 163 funções de
--   `public` executáveis por esse papel. Tocar-lhe aqui seria fechar na casa inteira o que esta peça autoriza para
--   um nome, e é por isso que a régua de saída da PEN-42 o mede como igualdade relativa à viva, não como `false`.
--
-- O que esta peça fecha: um nome, um papel, zero dados. Não toca em `authenticated` (é o papel do `front` com
-- sessão, e o único chamador real do nome novo), não toca na viva, não toca em policies nem em tabelas. Depois de
-- aplicada, um chamador sem sessão apanha 42501 antes de chegar ao `is_gatekeeper()` interno — o mesmo desenho de
-- porta que a casa já escolheu para PEN-43 e PEN-44.
--
-- Forma de execução: uma só transacção, com as duas marcas nos bytes crus (`/^BEGIN;/m` e `/^COMMIT;/m`), que é a
-- régua do aplicador. A reversão devolve o grau ao mesmo papel pela mesma assinatura; meia peça aplicada deixaria
-- a porta fechada sem caminho de volta simétrico, e é isso que a transacção impede.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

REVOKE EXECUTE ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text) FROM anon;

COMMIT;
