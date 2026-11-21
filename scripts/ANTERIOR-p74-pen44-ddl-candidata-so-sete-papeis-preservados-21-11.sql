-- PEN-44 - candidata: fecha o EXECUTE de anon nos nomes municipais cujo grau chega da entrada a PUBLIC e
-- devolve o grau, nome a nome, EXACTAMENTE aos papeis que hoje executam so por causa dessa entrada.
-- Gerada por scripts/p74-pen44-gera-candidata.mjs: nomes, assinaturas e listas de preservacao vem do
-- catalogo vivo (proacl, pg_get_function_identity_arguments, prorettype, has_function_privilege por papel e
-- pg_auth_members), nunca dactilografados. Mudou o catalogo, re-gera-se ou os portoes dao vermelho.
-- Invariante: depois de aplicar, anon nao executa nenhum nome daqui e nenhum outro papel perde um grau que
-- tinha. Um REVOKE FROM PUBLIC pelado deixaria 315 pares papel-funcao sem grau, entre eles
-- 7 papeis de plataforma que hoje executam estes nomes so pela entrada a PUBLIC.
-- Um GRANT a mais tambem e um erro: daria o grau a um papel mesmo depois de o pai o perder. Por isso a lista
-- de cada nome e a diferenca medida entre o grau de hoje e o que restaria, nunca uma lista recordada.
-- 0 dados tocados: nenhuma linha escreve em tabelas. Autorizacao exigida: APLICAR PEN-44 NO BANCO.
-- Transacao unica: um GRANT de preservacao em falta aborta tudo, em vez de deixar meio mundo fechado.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.is_aee() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_aee() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.is_aee_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_aee_manager() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.aee_can_access_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aee_can_access_student(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_role() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_literacy_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_literacy_staff() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_can_access_literacy_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_can_access_literacy_student(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_access_channel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_access_channel(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_message_recipient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_message_recipient(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_is_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_is_manager() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_is_staff() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_is_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_is_manager() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_can_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_can_profile(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_can_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_can_project(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_collab_can_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_collab_can_task(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_manage_channel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_manage_channel(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_read_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_read_message(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.internal_chat_is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_chat_is_staff() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.internal_chat_can_access_room(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_chat_can_access_room(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.family_normalize_name(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.family_normalize_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_normalize_name(text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.family_normalize_cpf(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.family_normalize_cpf(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_normalize_cpf(text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.family_cpf_is_valid(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.family_cpf_is_valid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_cpf_is_valid(text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_is_schedule_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_is_schedule_manager() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_current_teacher_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_current_teacher_id() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_teacher_can_manage_student(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_teacher_can_manage_student(uuid, text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_teacher_can_manage_class_subject(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_teacher_can_manage_class_subject(uuid, text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_subject_matches(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_subject_matches(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_subject_matches(text, text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.sports_role_allowed(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sports_role_allowed(text[]) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_can_manage_communications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_can_manage_communications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_can_manage_communications() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_pedagogical_can_manage_student(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_pedagogical_can_manage_student(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_pedagogical_can_manage_student(uuid, text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_manage_student_scope(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_staff_can_manage_student_scope(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_staff_can_manage_student_scope(uuid, text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_has_specialized_permission(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_has_specialized_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_has_specialized_permission(text) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_family_can_view_aee(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_family_can_view_aee(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_family_can_view_aee(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_support_request_access(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_support_request_access(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_access(uuid, uuid, uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_support_detail_access(uuid, uuid, boolean, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_support_detail_access(uuid, uuid, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_support_detail_access(uuid, uuid, boolean, uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_support_request_create_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_support_request_create_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_support_request_create_access(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.aee_can_write_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.aee_can_write_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aee_can_write_student(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_psychology_can_write(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_psychology_can_write(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_can_write(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_psychology_record_access(uuid, uuid, boolean, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_psychology_record_access(uuid, uuid, boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_record_access(uuid, uuid, boolean, boolean, boolean) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_psychology_active_professional(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_psychology_active_professional(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_psychology_active_professional(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_can_manage_student_directory() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_can_manage_student_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_can_manage_student_directory() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.aee_game_can_access_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.aee_game_can_access_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aee_game_can_access_student(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_learning_is_manager() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_learning_is_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_learning_is_manager() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_is_platform_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_is_platform_admin() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_is_municipal_authority() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_is_municipal_authority() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_is_municipal_authority() TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

REVOKE EXECUTE ON FUNCTION public.bfr_municipalities_visible(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_municipalities_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_municipalities_visible(uuid) TO dashboard_user, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_privileged_role, supabase_read_only_user, supabase_replication_admin;

COMMIT;

-- FORA DESTA PECA (declarado, nao esquecido):
-- * 14 nomes devolvem `trigger`: nao sao superficie RPC e saem do alvo por
--   `prorettype`; a lista de nomes esta no registo da geradora.
-- * As 3 funcoes municipais de leitura da PEN-43 nao tem entrada a PUBLIC na ACL viva,
--   por isso a alavanca delas e REVOKE ... FROM anon e o ficheiro e outro.
