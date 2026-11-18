-- SM4-DDL-MUN-REV — REVERSÃO da candidata `scripts/sm4-ddl-municipal-candidata.sql`.
-- Só faz sentido depois de a candidata ter sido aplicada; correr sozinha num banco onde a candidata
-- nunca correu rebenta no primeiro DROP (os objetos não existem), o que é o resultado certo e desejado.
-- Ordem: políticas antes das funções que elas chamam; vistas antes das funções que as lêem; tabelas
-- dependentes antes das referidas; por fim as colunas adicionadas a tabelas que já existiam.
--
-- ATENÇÃO, e é de propósito: o bloco 8 repõe `supervision_requests_director_read` em PUBLIC. Uma reversão
-- tem de devolver o estado anterior, e o estado anterior era a concessão errada medida em
-- evidence/sm2-escopo-atual-17-11b.json. Fechar essa concessão é trabalho próprio, com OK próprio, e não
-- efeito colateral de um rollback.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

-- 1) políticas novas
DROP POLICY IF EXISTS bfr_municipalities_read     ON public.bfr_municipalities;
DROP POLICY IF EXISTS bfr_municipalities_insert   ON public.bfr_municipalities;
DROP POLICY IF EXISTS bfr_municipalities_update   ON public.bfr_municipalities;
DROP POLICY IF EXISTS schools_municipal_read      ON public.schools;
DROP POLICY IF EXISTS bfr_school_key_map_read     ON public.bfr_school_key_map;
DROP POLICY IF EXISTS bfr_school_key_map_write    ON public.bfr_school_key_map;
DROP POLICY IF EXISTS bfr_municipal_grants_self_read ON public.bfr_municipal_access_grants;
DROP POLICY IF EXISTS bfr_municipal_grants_grant  ON public.bfr_municipal_access_grants;
DROP POLICY IF EXISTS bfr_municipal_grants_revoke ON public.bfr_municipal_access_grants;
DROP POLICY IF EXISTS students_municipal_read     ON public.students;
DROP POLICY IF EXISTS classes_municipal_read      ON public.classes;
DROP POLICY IF EXISTS supervision_requests_municipal_read ON public.supervision_requests;
DROP POLICY IF EXISTS bfr_municipal_audit_write   ON public.bfr_municipal_audit;
DROP POLICY IF EXISTS bfr_municipal_audit_read    ON public.bfr_municipal_audit;

-- 2) o bloco H invertido (ver advertência no cabeçalho)
ALTER POLICY supervision_requests_director_read ON public.supervision_requests TO PUBLIC;

-- 3) agregados: função que lê a vista, depois a vista
DROP FUNCTION IF EXISTS public.bfr_municipal_network_totals();
DROP VIEW IF EXISTS public.bfr_municipal_school_stats;

-- 4) predicados
DROP FUNCTION IF EXISTS public.bfr_municipalities_visible(uuid);
DROP FUNCTION IF EXISTS public.bfr_school_in_own_school_scope(uuid);
DROP FUNCTION IF EXISTS public.bfr_school_in_municipal_scope(uuid);
DROP FUNCTION IF EXISTS public.bfr_municipal_municipalities();
DROP FUNCTION IF EXISTS public.bfr_is_municipal_authority();
DROP FUNCTION IF EXISTS public.bfr_has_municipal_grant(uuid);
DROP FUNCTION IF EXISTS public.bfr_is_platform_admin();

-- 5) tabelas novas (grants antes de municipalities: depende dela)
DROP TABLE IF EXISTS public.bfr_municipal_audit;
DROP TABLE IF EXISTS public.bfr_municipal_access_grants;
DROP TABLE IF EXISTS public.bfr_school_key_map;
DROP TABLE IF EXISTS public.bfr_municipalities;

-- 6) colunas adicionadas a tabelas que já existiam (o índice parcial cai com a coluna)
ALTER TABLE public.students DROP COLUMN IF EXISTS code_mec;
ALTER TABLE public.schools
  DROP COLUMN IF EXISTS municipality_id,
  DROP COLUMN IF EXISTS zone,
  DROP COLUMN IF EXISTS operating_status;

COMMIT;
