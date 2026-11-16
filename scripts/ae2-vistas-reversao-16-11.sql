-- AE-2 — fecho das 5 vistas sports_public_* (REVERSÃO — security_invoker=false)
-- Gerado por scripts/ae2-vistas-gerador.mjs em 2026-11-16T03:43:24.958Z
-- Definições copiadas byte-a-byte de evidence/ae1-vistas-preflight-16-11.json
-- (pg_get_viewdef do catálogo vivo, re-conferido igual antes de emitir).
-- O que muda: WITH (security_invoker = true) — a vista passa a rodar com os
-- privilégios do chamador, logo a RLS das tabelas-base aplica-se à leitura autenticada.
-- Medido no pré-voo: para todo papel, a RLS da base é superconjunto do filtro interno
-- da vista, logo nenhum papel perde linhas; fecha-se a via do dono (postgres BYPASSRLS).
-- Os grants de SELECT não são tocados (CREATE OR REPLACE VIEW preserva privilégios);
-- a conferência re-mede anon=false / auth=true depois.
CREATE OR REPLACE VIEW public.sports_public_athletes
WITH (security_invoker = false) AS
 SELECT id,
    team_id,
    name,
    jersey_number,
    "position",
    status
   FROM sports_athletes
  WHERE sports_role_allowed(ARRAY['developer'::text, 'director'::text, 'coordinator'::text, 'secretary'::text, 'pedagogical'::text, 'aee'::text]);;

CREATE OR REPLACE VIEW public.sports_public_match_events
WITH (security_invoker = false) AS
 SELECT id,
    match_id,
    team_id,
    athlete_id,
    event_type,
    points,
    period,
    clock_seconds,
    description,
    created_at
   FROM sports_match_events
  WHERE sports_role_allowed(ARRAY['developer'::text, 'director'::text, 'coordinator'::text]);;

CREATE OR REPLACE VIEW public.sports_public_matches
WITH (security_invoker = false) AS
 SELECT id,
    championship_id,
    sport,
    category,
    gender,
    home_team_id,
    away_team_id,
    scheduled_at,
    venue,
    phase,
    status,
    home_score,
    away_score,
    period,
    clock_seconds,
    started_at,
    finished_at
   FROM sports_matches
  WHERE sports_role_allowed(ARRAY['developer'::text, 'director'::text, 'coordinator'::text, 'secretary'::text, 'pedagogical'::text, 'aee'::text]);;

CREATE OR REPLACE VIEW public.sports_public_schools
WITH (security_invoker = false) AS
 SELECT id,
    name,
    city,
    logo_url
   FROM sports_schools
  WHERE sports_role_allowed(ARRAY['developer'::text, 'director'::text, 'coordinator'::text, 'secretary'::text]);;

CREATE OR REPLACE VIEW public.sports_public_teams
WITH (security_invoker = false) AS
 SELECT t.id,
    t.school_id,
    s.name AS school_name,
    t.name,
    t.sport,
    t.category,
    t.gender,
    t.crest_url,
    t.active
   FROM (sports_teams t
     JOIN sports_schools s ON ((s.id = t.school_id)))
  WHERE (bfr_is_schedule_manager() OR is_staff());;
