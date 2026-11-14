-- C2-R rollback da candidata 42P17 — restaura o estado VIVO de 2026-11-11 (medido, não lembrado).
-- Fonte: docs/c2r-policies-ciclo.json (pg_get_expr das 6 policies + papeis + cmd), extraído
-- antes de qualquer escrita. As policies de staff_schools nunca tiveram arquivo candidato em
-- disco (foram aplicadas inline no Achado 1), então este texto é o deparse vivo transcrito.
-- Também remove a função bfr_profile_in_my_schools, que só existe na candidata.
-- O dry-run prova a equivalência: md5(do deparse) antes == md5(do deparse) depois disto.

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    (id = auth.uid())
    or is_developer()
    or exists (
      select 1
        from staff_schools ss_target
        join profiles p_caller on p_caller.id = auth.uid()
        join staff_schools ss_caller on ss_caller.profile_id = p_caller.id
       where ss_target.profile_id = profiles.id
         and ss_caller.school_id = ss_target.school_id
    )
    or exists (
      select 1
        from profiles p_caller
        join staff_schools ss_caller on ss_caller.profile_id = p_caller.id
        join students st on st.school_id = ss_caller.school_id
        join profiles p_student on p_student.id = profiles.id
       where p_caller.id = auth.uid()
         and st.student_profile_id = p_student.id
    )
    or exists (
      select 1
        from profiles p_caller
        join staff_schools ss_caller on ss_caller.profile_id = p_caller.id
        join guardian_students gs on gs.profile_id = profiles.id
        join students st on st.id = gs.student_id
       where p_caller.id = auth.uid()
         and ss_caller.school_id = st.school_id
    )
  );

drop policy if exists staff_schools_developer_read on public.staff_schools;
create policy staff_schools_developer_read on public.staff_schools
  for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'developer'::account_role));

drop policy if exists staff_schools_developer_insert on public.staff_schools;
create policy staff_schools_developer_insert on public.staff_schools
  for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'developer'::account_role));

drop policy if exists staff_schools_developer_update on public.staff_schools;
create policy staff_schools_developer_update on public.staff_schools
  for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'developer'::account_role))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'developer'::account_role));

drop policy if exists staff_schools_developer_delete on public.staff_schools;
create policy staff_schools_developer_delete on public.staff_schools
  for delete to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'developer'::account_role));

drop policy if exists staff_schools_own_insert on public.staff_schools;
create policy staff_schools_own_insert on public.staff_schools
  for insert to authenticated
  with check (
    (profile_id = auth.uid())
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = any (array['director'::account_role, 'coordinator'::account_role, 'secretary'::account_role])
    )
  );

drop function if exists public.bfr_profile_in_my_schools(uuid);
