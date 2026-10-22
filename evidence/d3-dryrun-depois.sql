rollback;
begin;
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
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3abaa3a-ac38-40ea-82f5-94073ce0155a","role":"authenticated"}';
insert into public.school_activities (title, subject, class_id, description, published_by, published_at)
values ('sonda-d3-depois', 'História', '5e6d0744-f2b7-4201-8ad5-64c36a1bc3da', 'sonda rollback', 'c3abaa3a-ac38-40ea-82f5-94073ce0155a', now())
returning id;
rollback;
