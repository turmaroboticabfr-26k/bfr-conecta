-- CANDIDATA — NÃO APLICADA.
-- Escopo por aluno nas duas tabelas que hoje aceitam qualquer aluno para os papéis
-- pedagógico/aee: student_reading_levels (leitura) e student_messages (recados).
-- Regras:
--   coordinator / director / developer  -> todos os alunos (como hoje)
--   pedagogical                         -> alunos de bfr_teacher_class_subjects (como students_read)
--   aee                                 -> alunos de aee_student_roster ativo (como students_read)
--   demais                              -> nenhum
-- Nenhum dado é alterado: só função nova e policies de leitura/escrita mais estreitas.

create or replace function public.bfr_team_can_access_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case public."current_role"()::text
    when 'coordinator' then true
    when 'director' then true
    when 'developer' then true
    when 'pedagogical' then public.bfr_pedagogical_can_manage_student(p_student_id)
    when 'aee' then exists (
      select 1 from public.aee_student_roster r
      where r.student_id = p_student_id and r.active
    )
    else false
  end;
$function$;

revoke all on function public.bfr_team_can_access_student(uuid) from public;
revoke all on function public.bfr_team_can_access_student(uuid) from anon;
grant execute on function public.bfr_team_can_access_student(uuid) to authenticated;

drop policy if exists "reading staff select" on public.student_reading_levels;
create policy "reading staff select" on public.student_reading_levels
  for select to authenticated
  using (public.bfr_reading_staff() and public.bfr_team_can_access_student(student_id));

drop policy if exists "reading staff insert" on public.student_reading_levels;
create policy "reading staff insert" on public.student_reading_levels
  for insert to authenticated
  with check (public.bfr_reading_editor() and public.bfr_team_can_access_student(student_id));

drop policy if exists "reading staff update" on public.student_reading_levels;
create policy "reading staff update" on public.student_reading_levels
  for update to authenticated
  using (public.bfr_reading_editor() and public.bfr_team_can_access_student(student_id))
  with check (public.bfr_reading_editor() and public.bfr_team_can_access_student(student_id));

drop policy if exists messages_family_read on public.student_messages;
create policy messages_family_read on public.student_messages
  for select to authenticated
  using (
    (sender_id = auth.uid())
    or (recipient_id = auth.uid())
    or (public.is_staff() and public.bfr_team_can_access_student(student_id))
  );

drop policy if exists student_messages_staff_manage on public.student_messages;
create policy student_messages_staff_manage on public.student_messages
  for all to authenticated
  using (public.is_staff() and public.bfr_team_can_access_student(student_id))
  with check (public.is_staff() and public.bfr_team_can_access_student(student_id));
