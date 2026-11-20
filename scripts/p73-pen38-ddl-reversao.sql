-- P73-PEN-38 — REVERSÃO da candidata `scripts/p73-pen38-ddl-candidata.sql`. Não toca em nada do sm4
-- (tabelas, predicados, vista, agregados, colunas): reverte exactamente os quatro blocos daquela ficheiro.
-- Corre só com OK explícito, e depois de `scripts/p73-pen38-preflight.mjs --reversao` confirmar que estão
-- lá (o preflight recusa o verde se o estado vivo não bater com o estado de saída da candidata).

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

DROP POLICY IF EXISTS schools_platform_admin_read ON public.schools;          -- bloco B

DROP POLICY IF EXISTS schools_municipal_read ON public.schools;               -- bloco A, no predicado medido
CREATE POLICY schools_municipal_read ON public.schools                        -- antes da candidata (20/11,
  FOR SELECT TO authenticated USING (public.bfr_is_municipal_authority());    -- p73-politicas-municipais-20-11e)

DROP FUNCTION IF EXISTS public.bfr_school_set_municipality(uuid, uuid, text); -- bloco C
DROP FUNCTION IF EXISTS public.bfr_municipal_scope_diagnostico();             -- bloco D

COMMIT;

-- Nota de honestidade: as linhas escritas em `bfr_municipal_audit` pelo bloco C ficam — apagar trilha é
-- precisamente o que §7.442 proíbe. Se a intenção for desaparecer também com as etiquetagens, isso é um
-- `UPDATE schools SET municipality_id = NULL` por escola listada na trilha, e é decisão de produto, não
-- desta reversão.
