-- P144 reversao — apaga exactamente o que a candidata semeou: as linhas de 2026 das tres mesas.
-- GERADA por scripts/p144-rm52-conteudo-calendario.mjs a partir do CALENDARIO LETIVO 2026 oficial
-- (quatro imagens de 23/11 + respostas do dono, registadas em g-p151-d1-extracao.txt) e da grade medida
-- (p73 grade_tempos); NAO EDITAR A MAO. Geracao em 2026-11-23T07:07:06.621Z.
-- NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR. A reversao apaga o ano 2026 inteiro das tres mesas; o preflight em modo reversao mede que as linhas presentes batem com as da candidata antes de a autorizar.
-- Forma de execucao: uma so transaccao, com as duas marcas nos bytes crus (/^BEGIN;/m e /^COMMIT;/m).
-- A candidata so insere; a reversao so apaga. Meia peca aplicada deixa o ano incompleto, e e isso que a
-- transaccao impede. Nada de DDL, policies, funcoes ou grants: este pacote e so conteudo.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

DELETE FROM public.bfr_school_calendar_days WHERE school_year = 2026;
DELETE FROM public.bfr_school_calendar_month_targets WHERE school_year = 2026;
DELETE FROM public.bfr_school_shift_settings WHERE school_year = 2026;

COMMIT;
