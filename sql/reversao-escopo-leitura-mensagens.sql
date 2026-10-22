-- REVERSÃO da candidata sql-candidata-escopo-leitura-mensagens.sql.
-- Devolve exatamente as policies originais (catálogo de 22/10) e remove a função nova.
-- Aplicar só depois de reverter as policies; a função é referenciada por elas.

drop policy if exists "reading staff select" on public.student_reading_levels;
create policy "reading staff select" on public.student_reading_levels
  for select to authenticated
  using (public.bfr_reading_staff());

drop policy if exists "reading staff insert" on public.student_reading_levels;
create policy "reading staff insert" on public.student_reading_levels
  for insert to authenticated
  with check (public.bfr_reading_editor());

drop policy if exists "reading staff update" on public.student_reading_levels;
create policy "reading staff update" on public.student_reading_levels
  for update to authenticated
  using (public.bfr_reading_editor())
  with check (public.bfr_reading_editor());

drop policy if exists messages_family_read on public.student_messages;
create policy messages_family_read on public.student_messages
  for select to authenticated
  using ((sender_id = auth.uid()) or (recipient_id = auth.uid()) or public.is_staff());

drop policy if exists student_messages_staff_manage on public.student_messages;
create policy student_messages_staff_manage on public.student_messages
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop function if exists public.bfr_team_can_access_student(uuid);
