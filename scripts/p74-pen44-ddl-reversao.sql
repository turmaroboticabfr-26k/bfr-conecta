-- PEN-44 - reversao: devolve a PUBLIC o grau que a candidata retirou e retira dos papeis que ela preservou,
-- nos mesmos nomes e com as mesmas assinaturas. Se a preservacao nao for desfeita, a reversao deixa na ACL
-- entradas explicitas que o default ja cobre, e o catalogo vivo deixa de ser o espelho do estado de antes.
-- Transacao unica, pela mesma razao da candidata.

BEGIN;
REVOKE EXECUTE ON FUNCTION public.is_aee() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.is_aee() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.is_aee_manager() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.is_aee_manager() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.aee_can_access_student(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.aee_can_access_student(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_role() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_staff_role() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_literacy_staff() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_literacy_staff() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_can_access_literacy_student(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_can_access_literacy_student(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_access_channel(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_access_channel(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_message_recipient(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_message_recipient(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_is_manager() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_staff_is_manager() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_is_staff() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_collab_is_staff() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_is_manager() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_collab_is_manager() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_can_profile(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_collab_can_profile(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_can_project(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_collab_can_project(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_can_task(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_collab_can_task(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_manage_channel(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_manage_channel(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_read_message(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_read_message(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.internal_chat_is_staff() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.internal_chat_is_staff() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.internal_chat_can_access_room(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.internal_chat_can_access_room(uuid) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.family_normalize_name(text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.family_normalize_name(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_normalize_name(text) TO anon;

REVOKE EXECUTE ON FUNCTION public.family_normalize_cpf(text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.family_normalize_cpf(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_normalize_cpf(text) TO anon;

REVOKE EXECUTE ON FUNCTION public.family_cpf_is_valid(text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.family_cpf_is_valid(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_cpf_is_valid(text) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_is_schedule_manager() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_is_schedule_manager() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_current_teacher_id() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_current_teacher_id() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_teacher_can_manage_student(uuid, text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_teacher_can_manage_student(uuid, text) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_teacher_can_manage_class_subject(uuid, text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_teacher_can_manage_class_subject(uuid, text) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_subject_matches(text, text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_subject_matches(text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_subject_matches(text, text) TO anon;

REVOKE EXECUTE ON FUNCTION public.sports_role_allowed(text[]) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.sports_role_allowed(text[]) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.bfr_can_manage_communications() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_can_manage_communications() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_can_manage_communications() TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_pedagogical_can_manage_student(uuid, text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_pedagogical_can_manage_student(uuid, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_pedagogical_can_manage_student(uuid, text) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_manage_student_scope(uuid, text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_manage_student_scope(uuid, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_manage_student_scope(uuid, text) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_has_specialized_permission(text) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_has_specialized_permission(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_has_specialized_permission(text) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_family_can_view_aee(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_family_can_view_aee(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_family_can_view_aee(uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_support_request_access(uuid, uuid, uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_access(uuid, uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_access(uuid, uuid, uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_support_detail_access(uuid, uuid, boolean, uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_support_detail_access(uuid, uuid, boolean, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_support_detail_access(uuid, uuid, boolean, uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_support_request_create_access(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_create_access(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_create_access(uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.aee_can_write_student(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.aee_can_write_student(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.aee_can_write_student(uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_psychology_can_write(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_can_write(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_can_write(uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_psychology_record_access(uuid, uuid, boolean, boolean, boolean) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_record_access(uuid, uuid, boolean, boolean, boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_record_access(uuid, uuid, boolean, boolean, boolean) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_psychology_active_professional(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_active_professional(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_active_professional(uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_can_manage_student_directory() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_can_manage_student_directory() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_can_manage_student_directory() TO anon;

REVOKE EXECUTE ON FUNCTION public.aee_game_can_access_student(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.aee_game_can_access_student(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.aee_game_can_access_student(uuid) TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_learning_is_manager() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_learning_is_manager() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_learning_is_manager() TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_is_platform_admin() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_is_platform_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_is_platform_admin() TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_is_municipal_authority() FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_is_municipal_authority() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_is_municipal_authority() TO anon;

REVOKE EXECUTE ON FUNCTION public.bfr_municipalities_visible(uuid) FROM dashboard_user, pgbouncer, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;
GRANT EXECUTE ON FUNCTION public.bfr_municipalities_visible(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_municipalities_visible(uuid) TO anon;

COMMIT;
