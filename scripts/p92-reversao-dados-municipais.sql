-- P92 — REVERSÃO DOS DADOS MUNICIPAIS (escrita por scripts/p92-dados-municipais.mjs em 2026-11-21T17:40:08.883Z).
-- Apaga APENAS o que a P92 criou; não toca no fixture da SM8 nem nas 4 concessões que sobre ele existem.
BEGIN;
delete from public.bfr_municipal_access_grants where id = 'cf6fac96-8464-4d71-9991-f2ba10f7e565';
update public.schools set municipality_id = null where municipality_id = 'cde2740e-9f09-45a5-9cd6-6ee3d6b17268';
delete from public.bfr_municipalities where id = 'cde2740e-9f09-45a5-9cd6-6ee3d6b17268';
-- estado de antes (medido): 6 escolas, 1 municípios, 4 concessões, 0 escolas ligadas.
COMMIT;
