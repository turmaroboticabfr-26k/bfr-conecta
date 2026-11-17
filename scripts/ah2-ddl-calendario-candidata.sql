-- AH-2-DDL-CAL — CANDIDATA, NÃO APLICADA.
--
-- O que está provado (evidence/ah2-sonda-rest-17-11b.json, GETs anónimos, 17/11/2026):
--   bfr_school_shift_settings          → HTTP 404 PGRST205 «Could not find the table 'public.bfr_school_shift_settings' in the schema cache»
--   bfr_school_calendar_days           → HTTP 404 PGRST205 (mesma frase)
--   bfr_school_calendar_month_targets  → HTTP 404 PGRST205 (mesma frase)
--   gate_checkins / students           → HTTP 200  ← controlo: as minhas chamadas sabem falar com o PostgREST
-- e evidence/ah2-sonda-tabelas-17-11.json: nas 182 relações de `public` não há NENHUM nome que bata
-- %calendar%, %shift% ou bfr_school%. Não é «sem privilégio»: as relações nunca foram criadas.
-- O efeito medido no browser está em evidence/ah2-censo-404-17-11.json — os únicos 404 de /rest/ em 21
-- células corridas são estes três, todos na vista que a portaria abre (bloco app/index.html:15088-15091).
--
-- De onde vêm as colunas: não são inventadas. Cada nome sai do próprio bundle servido —
--   select  → app/index.html:15089-15091
--   upsert  → app/index.html:15309 (turnos) e 15317 (datas), com os conflitos onConflict
--   valores → turnos «matutino|vespertino» (regex em 15286), estados do calendário
--             {school_day,no_school,holiday,recess,recuperação→recovery} (15267), source_status 'draft'/'confirmed' (15270)
--
-- Decisão que fica para a escola (por isso a candidata não fecha sozinha):
--   * escrita limitada a coordinator/director/developer, que é o `allowed()` do bundle (app/index.html:14867).
--     A portaria ABRE o painel mas, se a escola quiser que ela também grave, junta-se 'gatekeeper' às
--     políticas de INSERT/UPDATE — uma linha, e é decisão de negócio, não técnica.
--   * sem chave estrangeira em confirmed_by/updated_by: a app escreve auth.uid() e uma FK nova faria o
--     salvamento falhar em conta sem linha em profiles — trocar um 404 por um 409 não é corrigir.
--
-- Correr só com OK explícito. Reversão: scripts/ah2-ddl-calendario-reversao.sql.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '10s';

-- 1) turnos: quem abre, que hora começa a aula, que fecha, em que dias, tolerância de atraso
CREATE TABLE IF NOT EXISTS public.bfr_school_shift_settings (
  school_year          integer      NOT NULL CHECK (school_year BETWEEN 2000 AND 2999),
  shift                text         NOT NULL CHECK (shift IN ('matutino','vespertino')),
  entry_opens_at       time         NOT NULL,
  class_starts_at      time,
  shift_closes_at      time         NOT NULL,
  active_weekdays      integer[]    NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(active_weekdays,1),0) BETWEEN 1 AND 7),
  late_grace_minutes   integer      NOT NULL DEFAULT 0 CHECK (late_grace_minutes BETWEEN 0 AND 240),
  confirmed_by         uuid,
  confirmed_at         timestamp with time zone,
  updated_by           uuid,
  updated_at           timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (school_year, shift),
  -- O início da primeira aula tem de estar dentro do turno; a app já valida, o banco é o teto.
  CONSTRAINT bfr_school_shift_settings_window_check
    CHECK (class_starts_at IS NULL OR (class_starts_at >= entry_opens_at AND class_starts_at <= shift_closes_at))
);

-- 2) calendário: estado de cada dia do ano lectivo (dia letivo, feriado, recesso…)
CREATE TABLE IF NOT EXISTS public.bfr_school_calendar_days (
  school_year      integer NOT NULL CHECK (school_year BETWEEN 2000 AND 2999),
  school_date      date    NOT NULL,
  calendar_status  text    NOT NULL CHECK (calendar_status IN ('school_day','no_school','holiday','recess','recovery')),
  label            text    NOT NULL DEFAULT '' CHECK (length(label) <= 160),
  source_status    text    NOT NULL DEFAULT 'draft' CHECK (source_status IN ('draft','confirmed')),
  confirmed_by     uuid,
  confirmed_at     timestamp with time zone,
  updated_by       uuid,
  updated_at       timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (school_year, school_date)
);
CREATE INDEX IF NOT EXISTS bfr_school_calendar_days_year_status_idx
  ON public.bfr_school_calendar_days (school_year, calendar_status);

-- 3) metas por mês: só alimenta a comparação «dias letivos previstos vs. lançados»
CREATE TABLE IF NOT EXISTS public.bfr_school_calendar_month_targets (
  school_year         integer NOT NULL CHECK (school_year BETWEEN 2000 AND 2999),
  month               integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  expected_school_days integer NOT NULL CHECK (expected_school_days BETWEEN 0 AND 31),
  updated_by          uuid,
  updated_at          timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (school_year, month)
);

-- 4) RLS: ligado desde o primeiro dia, sem políticas = negado. A leitura é para a equipa da escola
--    (a app já não mostra isto a responsável nem a aluno: o painel vive na central de coordenação);
--    a escrita segue o `allowed()` do bundle.
ALTER TABLE public.bfr_school_shift_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bfr_school_calendar_days          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bfr_school_calendar_month_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bfr_school_shift_settings         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bfr_school_calendar_days          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bfr_school_calendar_month_targets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bfr_school_shift_settings_staff_read ON public.bfr_school_shift_settings;
CREATE POLICY bfr_school_shift_settings_staff_read ON public.bfr_school_shift_settings
  FOR SELECT TO authenticated
  USING ((public.bfr_rls_session_role())::text <> 'parent' AND (public.bfr_rls_session_role())::text <> 'student');

DROP POLICY IF EXISTS bfr_school_shift_settings_managers_write ON public.bfr_school_shift_settings;
CREATE POLICY bfr_school_shift_settings_managers_write ON public.bfr_school_shift_settings
  FOR ALL TO authenticated
  USING ((public.bfr_rls_session_role())::text = ANY (ARRAY['coordinator','director','developer']))
  WITH CHECK ((public.bfr_rls_session_role())::text = ANY (ARRAY['coordinator','director','developer']));

DROP POLICY IF EXISTS bfr_school_calendar_days_staff_read ON public.bfr_school_calendar_days;
CREATE POLICY bfr_school_calendar_days_staff_read ON public.bfr_school_calendar_days
  FOR SELECT TO authenticated
  USING ((public.bfr_rls_session_role())::text <> 'parent' AND (public.bfr_rls_session_role())::text <> 'student');

DROP POLICY IF EXISTS bfr_school_calendar_days_managers_write ON public.bfr_school_calendar_days;
CREATE POLICY bfr_school_calendar_days_managers_write ON public.bfr_school_calendar_days
  FOR ALL TO authenticated
  USING ((public.bfr_rls_session_role())::text = ANY (ARRAY['coordinator','director','developer']))
  WITH CHECK ((public.bfr_rls_session_role())::text = ANY (ARRAY['coordinator','director','developer']));

DROP POLICY IF EXISTS bfr_school_calendar_month_targets_staff_read ON public.bfr_school_calendar_month_targets;
CREATE POLICY bfr_school_calendar_month_targets_staff_read ON public.bfr_school_calendar_month_targets
  FOR SELECT TO authenticated
  USING ((public.bfr_rls_session_role())::text <> 'parent' AND (public.bfr_rls_session_role())::text <> 'student');

DROP POLICY IF EXISTS bfr_school_calendar_month_targets_managers_write ON public.bfr_school_calendar_month_targets;
CREATE POLICY bfr_school_calendar_month_targets_managers_write ON public.bfr_school_calendar_month_targets
  FOR ALL TO authenticated
  USING ((public.bfr_rls_session_role())::text = ANY (ARRAY['coordinator','director','developer']))
  WITH CHECK ((public.bfr_rls_session_role())::text = ANY (ARRAY['coordinator','director','developer']));

-- 5) privilégios: o PostgREST só serve o que está grantado. Sem isto, o 404 passa a 42501.
GRANT SELECT ON public.bfr_school_shift_settings, public.bfr_school_calendar_days, public.bfr_school_calendar_month_targets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bfr_school_shift_settings, public.bfr_school_calendar_days, public.bfr_school_calendar_month_targets TO authenticated;
GRANT ALL ON public.bfr_school_shift_settings, public.bfr_school_calendar_days, public.bfr_school_calendar_month_targets TO service_role;

-- 6) cache do PostgREST: sem recarregar, o nome novo continua «não encontrado» minutos a fio.
NOTIFY pgrst, 'reload schema';

-- Verificação depois de aplicar (leitura, não escrita):
--   curl -H "apikey: …" "https://…/rest/v1/bfr_school_calendar_days?select=school_date&limit=1"  → 200 []
COMMIT;
