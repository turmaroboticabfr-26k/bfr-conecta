-- C2-R reversão — desfaz a candidata de notificação de percurso
drop trigger if exists trg_route_incidents_notify_guardian on public.route_incidents;
drop function if exists public.bfr_notify_guardian_on_route_incident();
