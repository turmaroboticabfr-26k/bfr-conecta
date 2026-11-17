-- AH-2-DDL-CAL — reversão da candidata scripts/ah2-ddl-calendario-candidata.sql.
-- Devolve o banco ao estado medido em 17/11/2026: as três relações não existem e a app continua a levar
-- 404 PGRST205 nelas (é o estado actual, não um estado seguro — por isso é isto que se desfaz se a
-- candidata tiver de sair de cena). Perda: qualquer linha entretanto gravada em turnos/calendário/metas.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '10s';

DROP POLICY IF EXISTS bfr_school_shift_settings_staff_read ON public.bfr_school_shift_settings;
DROP POLICY IF EXISTS bfr_school_shift_settings_managers_write ON public.bfr_school_shift_settings;
DROP POLICY IF EXISTS bfr_school_calendar_days_staff_read ON public.bfr_school_calendar_days;
DROP POLICY IF EXISTS bfr_school_calendar_days_managers_write ON public.bfr_school_calendar_days;
DROP POLICY IF EXISTS bfr_school_calendar_month_targets_staff_read ON public.bfr_school_calendar_month_targets;
DROP POLICY IF EXISTS bfr_school_calendar_month_targets_managers_write ON public.bfr_school_calendar_month_targets;

REVOKE ALL ON public.bfr_school_shift_settings, public.bfr_school_calendar_days, public.bfr_school_calendar_month_targets FROM authenticated;
REVOKE ALL ON public.bfr_school_shift_settings, public.bfr_school_calendar_days, public.bfr_school_calendar_month_targets FROM service_role;

DROP TABLE IF EXISTS public.bfr_school_calendar_month_targets;
DROP TABLE IF EXISTS public.bfr_school_calendar_days;
DROP TABLE IF EXISTS public.bfr_school_shift_settings;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Verificação depois de reverter: o GET anónimo às três relações volta a dar 404 PGRST205
-- (node scripts/ah2-sonda-rest.mjs <rótulo>).
