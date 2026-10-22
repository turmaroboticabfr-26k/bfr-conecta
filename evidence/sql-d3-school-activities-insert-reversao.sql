-- Reversão da D3: restaura o predicado exato medido em 22/10 (pg_policy, polcmd 'a', USING null).

drop policy if exists school_activities_staff_insert on public.school_activities;

create policy school_activities_staff_insert on public.school_activities
  for all to authenticated
  using (null)
  with check (
    (bfr_is_schedule_manager() OR (is_aee() AND bfr_teacher_can_manage_class_subject(class_id, subject)))
    AND (published_by = auth.uid())
  );
