-- PEN-42 candidata — NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR.
--
-- O que mede (21/11, bundle servida v142, index.html 3 556 664 B md5 0e22e78fe1e0ce929ec4717f86365ad9):
-- o front chama `rpc('register_gate_checkin_v2', params)` no ramo não-legado (bytes @3 045 454, o ramo que a
-- conferência de `funcoes_de_registro` provou ser o que corre na verdade), e o catálogo não tem essa função:
-- `pg_proc` dá 0 linhas para o nome, e o PostgREST responde 404 PGRST202. O ramo legado chama
-- `register_gate_checkin` (sem sufixo), e ESSA existe — oid 30855, SECURITY DEFINER, search_path="" fixo.
-- Enquanto o calendário não existir (estado A, antes do DDL) o `fetch` das mesas rebentava, as etiquetas de erro
-- entravam em `state.errors`, `gateLegacyMode()` era verdadeiro e o ramo legado atendia. Esse estado já passou: os
-- quatro estados medidos em `evidence/p73-rm52-estado-calendario-20-11.txt` dizem que o de hoje é
-- `B_hoje_200_com_zero_linhas`, com `legacy=false`, `lanca=true` e `rpc=register_gate_checkin_v2` — as mesas existem
-- e devolvem 200 com zero linhas, nenhuma etiqueta entra, e o registo de entrada da portaria **já morre no 404 de
-- hoje**. Os estados C e D (calendário confirmado, dia confirmado sem janela) chamam o mesmo nome ausente.
--
-- Forma do remendo: um revestimento aditivo. Zero ALTER, zero DROP, zero toque na função viva — o comportamento,
-- o `is_gatekeeper()` interno e as três chamadas a `auth.uid()` que a viva faz (medido em `pg_get_functiondef`,
-- corpo 3 873 B, md5 bfeac2a315e684fb0833c12cfe073136) ficam exactamente onde estão, porque o revestimento só
-- encaminha para ela. A lista de argumentos e as onze colunas devolvidas são as medidas da viva, na mesma ordem:
-- é isso que faz `Array.isArray(data) ? data[0] : data` e a leitura de `official_name`/`entry_status`/`photo_path`
-- no chamador (@3 056 698 e @3 058 468) continuarem a bater.
--
-- Privilégios: a viva tem três entradas nominais na `proacl` (medidas: o dono e dois papéis de sessão) e **nenhuma**
-- para `PUBLIC` nem para `anon`. Este revestimento fica mais estreito do que a viva de propósito, e não igual a ela:
-- só `authenticated`, porque o único chamador do nome novo é o `front` com sessão. Não há GRANT para `anon` e o
-- `REVOKE ... FROM PUBLIC` é explícito, pelo que o portão de «só gente autorizada» não se abre com este passo — quem
-- não for porteiro continua a apanhar o chumbo interno de `is_gatekeeper()`, e um chamador sem sessão apanha o
-- chumbo de permissão antes disso. O terceiro papel da viva fica de fora porque a varredura do aplicador da casa
-- trata o nome desse papel como credencial dentro de código, e a regra não se alarga para deixar passar uma
-- candidata: estreitou-se a candidata, que é o lado que não altera nenhum predicado de bloqueio.
--
-- Forma de execução: uma só transacção, como as outras peças da tabela `PECAS`. O aplicador recusa SQL sem
-- `BEGIN;`/`COMMIT;`, e aqui a transacção é o que garante que os graus nunca chegam a viver separados da função que
-- declaram — se o `CREATE` falhar, nenhuma linha de `REVOKE`/`GRANT` acontece.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

CREATE OR REPLACE FUNCTION public.register_gate_checkin_v2(
  target_badge_token uuid,
  gate_direction text DEFAULT 'entry'::text,
  visual_confirmation boolean DEFAULT false,
  intake_source text DEFAULT NULL::text,
  target_shift text DEFAULT NULL::text,
  exception_reason text DEFAULT NULL::text
) RETURNS TABLE(
  checkin_id uuid,
  student_id uuid,
  official_name text,
  class_label text,
  direction text,
  checked_at timestamp with time zone,
  entry_status text,
  entry_allowed boolean,
  restriction_reason text,
  alert_id uuid,
  photo_path text
)
LANGUAGE sql
VOLATILE SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT c.checkin_id, c.student_id, c.official_name, c.class_label, c.direction, c.checked_at,
         c.entry_status, c.entry_allowed, c.restriction_reason, c.alert_id, c.photo_path
    FROM public.register_gate_checkin(
      target_badge_token => target_badge_token,
      gate_direction => gate_direction,
      visual_confirmation => visual_confirmation,
      intake_source => intake_source,
      target_shift => target_shift,
      exception_reason => exception_reason
    ) c;
$fn$;

REVOKE ALL ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text)
  IS 'PEN-42: revestimento aditivo que encaminha para public.register_gate_checkin (oid 30855); nenhum comportamento próprio.';

COMMIT;
