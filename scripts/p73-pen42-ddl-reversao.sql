-- PEN-42 reversão — desfaz exactamente o passo aditivo da candidata, e nada mais.
--
-- Não há `CREATE OR REPLACE` aqui: a viva `public.register_gate_checkin` (oid 30855) nunca foi tocada pela
-- candidata, por isso não existe estado anterior a restaurar. Retirar o revestimento devolve o catálogo ao
-- estado medido em 21/11, em que `register_gate_checkin_v2` tem 0 linhas em `pg_proc`.
--
-- Sem `IF EXISTS`: se o objeto não estiver lá, a reversão chumba em vez de fingir que reverteu.

DROP FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text);
