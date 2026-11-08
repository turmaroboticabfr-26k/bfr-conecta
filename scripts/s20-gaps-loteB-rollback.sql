-- S20-gaps-loteB-rollback.sql
-- Reverte Lote B: supervision_requests + sports_schools

BEGIN;

-- Drop novas policies (criadas pela candidata)
DROP POLICY IF EXISTS sports_schools_staff_read ON public.sports_schools;
DROP POLICY IF EXISTS supervision_requests_director_update ON public.supervision_requests;
DROP POLICY IF EXISTS supervision_requests_coordinator_update ON public.supervision_requests;

COMMIT;
