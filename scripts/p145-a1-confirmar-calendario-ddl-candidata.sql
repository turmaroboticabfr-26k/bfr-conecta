-- P145-A1 — CANDIDATA, NÃO APLICADA.
--
-- Cria a função de confirmação do calendário (ausência A1 do plano RM-5.2, §4/§7): um ato
-- administrativo único que passa os dias do ano de 'draft' para 'confirmed', só quando o ano
-- está completo e sem duplicados, e devolve a contagem de datas confirmadas.
--
-- O que o consumidor medido espera (bundle v142 servido, app/index.html):
--   const {data,error}=await db().rpc('bfr_confirm_school_calendar',{target_school_year:schoolYear});
--   state.gateSettingsMessage=error?`Calendário não confirmado: ${error.message}`:`${data||0} datas confirmadas.
--   A gestão ainda precisa confirmar os horários dos turnos.`;
-- ou seja: a função devolve UM NÚMERO (contagem) e NÃO toca nos turnos — a mensagem do bundle avisa
-- que os turnos continuam por confirmar. Os turnos confirmam-se no formulário de horários (checkbox
-- «confirmado», app/index.html:15303). Por isso esta candidata confirma SÓ bfr_school_calendar_days;
-- a forma proposta no §7 do plano (confirmar também os turnos) fica com correção datada no plano.
--
-- Porta por papel (decisão §9-D2, os 3 confirmadores): bfr_rls_session_role() = coordinator,
-- director ou developer — a mesma cláusula das políticas managers_write já vivas (ah2-ddl-calendario).
-- SECURITY DEFINER com FORCE RLS nas mesas: o UPDATE continua a passar pela política managers_write,
-- que exige o mesmo conjunto — a checagem explícita no corpo é a porta que devolve erro claro em vez
-- de «0 datas confirmadas» silencioso.
--
-- O portão de completude: o ano tem de ter exatamente os dias do ano civil (365/366), todos distintos,
-- com o primeiro dia em 01/01 e o último em 31/12 do ano alvo. A semente p144 preenche o ano civil
-- inteiro (365 linhas de 2026), por isso a régua é por ano civil, não por ano letivo.
--
-- Correr só com OK explícito (DDL). Reversão: scripts/p145-a1-confirmar-calendario-ddl-reversao.sql.
-- Depois de aplicar, o 404/PGRST202 pode persistir por cache do PostgREST: o NOTIFY recarrega o schema,
-- e o critério de fecho é o fio, não o pg_proc.
BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

CREATE OR REPLACE FUNCTION public.bfr_confirm_school_calendar(target_school_year integer)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  papel text;
  dias_esperados integer;
  presentes integer;
  distintas integer;
  primeira date;
  ultima date;
  confirmadas bigint;
BEGIN
  papel := (public.bfr_rls_session_role())::text;
  IF papel IS NULL OR NOT (papel = ANY (ARRAY['coordinator','director','developer'])) THEN
    RAISE EXCEPTION 'A confirmação do calendário é reservada a coordinator, director e developer (papel da sessão: %).', coalesce(papel, 'sem papel');
  END IF;

  dias_esperados := (make_date(target_school_year, 12, 31) - make_date(target_school_year, 1, 1)) + 1;

  SELECT count(*), count(DISTINCT school_date), min(school_date), max(school_date)
    INTO presentes, distintas, primeira, ultima
    FROM public.bfr_school_calendar_days
   WHERE school_year = target_school_year;

  IF presentes <> dias_esperados OR distintas <> dias_esperados
     OR primeira IS DISTINCT FROM make_date(target_school_year, 1, 1)
     OR ultima IS DISTINCT FROM make_date(target_school_year, 12, 31) THEN
    RAISE EXCEPTION 'O ano % não está completo para confirmar: % datas distintas presentes (esperadas %, de 01/01 a 31/12).',
      target_school_year, distintas, dias_esperados;
  END IF;

  UPDATE public.bfr_school_calendar_days
     SET source_status = 'confirmed',
         confirmed_by = auth.uid(),
         confirmed_at = now(),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE school_year = target_school_year;

  GET DIAGNOSTICS confirmadas = ROW_COUNT;
  RETURN confirmadas;
END
$fn$;

REVOKE ALL ON FUNCTION public.bfr_confirm_school_calendar(integer) FROM PUBLIC;
-- 24/11, medido no catálogo: o pg_default_acl de postgres em public concede EXECUTE a anon/authenticated/
-- service_role na criação — o REVOKE FROM PUBLIC não apaga essas entradas. O contrato declarado é «um só
-- GRANT, a authenticated», por isso os dois papéis são revogados por nome.
REVOKE ALL ON FUNCTION public.bfr_confirm_school_calendar(integer) FROM anon, service_role;
GRANT EXECUTE ON FUNCTION public.bfr_confirm_school_calendar(integer) TO authenticated;

COMMENT ON FUNCTION public.bfr_confirm_school_calendar(integer)
  IS 'RM-5.2/A1: confirma os dias do ano (completo e sem duplicados) e devolve a contagem; os turnos confirmam-se no formulário de horários.';

-- o PostgREST só serve o nome depois de recarregar o schema
NOTIFY pgrst, 'reload schema';

COMMIT;
