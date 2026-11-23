-- P143 reversao — devolve ao anon e ao PUBLIC exactamente o EXECUTE que a candidata revogou, pela mesma assinatura de cada nome.
-- GERADA por scripts/p143-revoke-anon-e-publico.mjs a partir do catalogo vivo (2026-11-23T05:41:40.792Z); NAO EDITAR A MAO.
-- NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR. O que esta medido: censo 163/19/15/0 com delta 0
-- contra o registo sm37g; 15 nomes com entrada nominal anon, 14 com entrada PUBLIC, 10 com as duas.
-- O que fecha: o caminho do anonimo ao EXECUTE nos 29 graus abaixo, e mais nada.
-- O que nao toca: authenticated, service_role, postgres, outorgantes, policies, tabelas, dados, e o mecanismo de
-- default privileges (pg_default_acl) que reabre a porta a funcoes novas — esse e outra decisao, fora desta peca.
-- Forma de execucao: uma so transaccao, com as duas marcas nos bytes crus (/^BEGIN;/m e /^COMMIT;/m), que e a regua
-- do aplicador. A reversao devolve cada grau ao mesmo papel pela mesma assinatura; meia peca aplicada deixaria a
-- porta fechada sem caminho de volta simetrico, e e isso que a transaccao impede.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

GRANT EXECUTE ON FUNCTION public.bfr_audit_lesson_attendance_change() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_get_student_photo_path(target_student_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_prevent_duplicate_grade() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_schedule_guard() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_rls_director_manages_student(p_student_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_rls_is_developer() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_rls_session_role() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_school_set_municipality(p_school uuid, p_municipality uuid, p_reason text) TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_specialized_audit_trigger() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_scope_guard() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_touch_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_validate_lesson_attendance() TO anon;
GRANT EXECUTE ON FUNCTION public.enforce_bfr_avatar_uniform() TO anon;
GRANT EXECUTE ON FUNCTION public.schools_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.sports_touch_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_audit_lesson_attendance_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_comment_notification_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_member_notification_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_task_notification_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_prevent_duplicate_grade() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_schedule_guard() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_specialized_audit_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_audit_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_scope_guard() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_touch_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_validate_lesson_attendance() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_bfr_avatar_uniform() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.schools_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sports_touch_updated_at() TO PUBLIC;

COMMIT;
