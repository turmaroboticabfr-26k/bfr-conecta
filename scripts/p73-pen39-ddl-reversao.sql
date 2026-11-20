-- P73-PEN-39 — REVERSÃO da candidata `scripts/p73-pen39-ddl-candidata.sql`. Só tira as duas funções novas:
-- `bfr_municipal_network_totals()` e a vista `bfr_municipal_school_stats` não são tocadas nem aqui nem na
-- candidata (foi decidido à partida, e o bloco final do ficheiro de candidata diz porquê).

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

DROP FUNCTION IF EXISTS public.bfr_municipal_municipio_totais();
DROP FUNCTION IF EXISTS public.bfr_municipal_distribuicao_por_zona();

COMMIT;
