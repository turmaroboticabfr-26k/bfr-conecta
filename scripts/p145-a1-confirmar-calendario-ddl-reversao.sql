-- P145-A1-REVERSÃO — apaga a função criada pela candidata p145 (a função não existe antes dela).
-- Correr só com OK explícito (DDL). Não toca em nenhuma linha das mesas.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '10s';

DROP FUNCTION IF EXISTS public.bfr_confirm_school_calendar(integer);

NOTIFY pgrst, 'reload schema';

COMMIT;
