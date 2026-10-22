-- D3 candidata: permitir que o perfil pedagogical publique atividades das
-- turmas/disciplinas a que está vinculado na grade publicada.
-- Predicado atual (pg_policy, 22/10, polcmd 'a', USING null):
--   WITH CHECK: ((bfr_is_schedule_manager() OR (is_aee() AND bfr_teacher_can_manage_class_subject(class_id, subject))) AND (published_by = auth.uid()))
-- Mudança: +1 braço (current_role()='pedagogical' AND bfr_teacher_can_manage_class_subject(class_id, subject)).
-- Nada mais muda: published_by = auth.uid() continua, atividade school-wide (class_id null)
-- continua restrita aos schedule managers, AEE continua como está.

drop policy if exists school_activities_staff_insert on public.school_activities;

create policy school_activities_staff_insert on public.school_activities
  for all to authenticated
  using (null)
  with check (
    (
      bfr_is_schedule_manager()
      or (is_aee() and bfr_teacher_can_manage_class_subject(class_id, subject))
      or (public.current_role()::text = 'pedagogical' and bfr_teacher_can_manage_class_subject(class_id, subject))
    )
    and (published_by = auth.uid())
  );
