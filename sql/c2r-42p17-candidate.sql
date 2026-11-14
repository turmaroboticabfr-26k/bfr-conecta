-- C2-R candidata v2 — quebrar o ciclo de policies que produz SQLSTATE 42P17
-- ("infinite recursion detected in policy for relation") em todo plano que toque as
-- policies de profiles. Descoberta do ciclo C2-R: INSERT direto de gate_checkins pelo
-- porteiro devolvia 500/42P17 em vez do 403 de design.
--
-- CAUSA (introduzida por P2-1, 08/11, e pelo Achado 1 da S16, 06-07/11):
--   arestas no grafo "policy de R -> RTE de R'":
--     profiles_read     -> staff_schools, profiles (p_caller/p_student), students
--     staff_schools (5) -> profiles
--     students (2)      -> profiles
--   PostgreSQL expande as policies das RTEs dentro do qual de uma policy, então
--   profiles -> staff_schools -> profiles e profiles -> students -> profiles são ciclos.
--   v1 desta candidata só cortou a aresta staff_schools->profiles; as branches (c.2)/(c.3)
--   de profiles_read continuavam chamando students, que chama profiles. Ciclo intacto.
--
-- v2 corta TODAS as arestas que entram em profiles/staff_schools a partir de profiles_read,
-- pondo o escopo por escola dentro de uma função SECURITY DEFINER (não expandida por RLS),
-- como a casa já faz com is_staff()/is_developer()/current_role().
-- Semântica do P2-1 preservada: (c.1) staff da mesma escola, (c.2) aluno da escola do staff,
-- (c.3) responsável de aluno da escola do staff, developer transversal, dono vê-se sempre.
--
-- NÃO TOCA em gate_badges_staff_manage, occurrences, supervision_* nem storage.objects:
-- cortadas as arestas de profiles e staff_schools, o fechamento transitivo deles deixa de
-- reentrar e volta a expandir normalmente (era o que dava 42P17 nas sondas P1-P6).

-- ---------------------------------------------------------------------------
-- 1) oráculo de escopo (SECURITY DEFINER: o corpo roda como dono, sem expansão de policies)
-- ---------------------------------------------------------------------------
create or replace function public.bfr_profile_in_my_schools(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
           select 1
             from public.staff_schools ss_target
             join public.staff_schools ss_caller on ss_caller.school_id = ss_target.school_id
            where ss_target.profile_id = p_target
              and ss_caller.profile_id = auth.uid()
         )
      or exists (
           select 1
             from public.staff_schools ss_caller
             join public.students st on st.school_id = ss_caller.school_id
            where ss_caller.profile_id = auth.uid()
              and st.student_profile_id = p_target
         )
      or exists (
           select 1
             from public.staff_schools ss_caller
             join public.guardian_students gs on gs.profile_id = p_target
             join public.students st on st.id = gs.student_id
            where ss_caller.profile_id = auth.uid()
              and ss_caller.school_id = st.school_id
         );
$$;

alter function public.bfr_profile_in_my_schools(uuid) owner to postgres;
revoke execute on function public.bfr_profile_in_my_schools(uuid) from public, anon, authenticated;
grant execute on function public.bfr_profile_in_my_schools(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) profiles_read — sem nenhuma RTE de profiles, staff_schools ou students
-- ---------------------------------------------------------------------------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    (id = auth.uid())
    or public.is_developer()
    or public.bfr_profile_in_my_schools(id)
  );

-- ---------------------------------------------------------------------------
-- 3) staff_schools — predicados só por função SECURITY DEFINER (sem RTE de profiles)
-- ---------------------------------------------------------------------------
drop policy if exists staff_schools_developer_read on public.staff_schools;
create policy staff_schools_developer_read on public.staff_schools
  for select to authenticated
  using (public.is_developer());

drop policy if exists staff_schools_developer_insert on public.staff_schools;
create policy staff_schools_developer_insert on public.staff_schools
  for insert to authenticated
  with check (public.is_developer());

drop policy if exists staff_schools_developer_update on public.staff_schools;
create policy staff_schools_developer_update on public.staff_schools
  for update to authenticated
  using (public.is_developer())
  with check (public.is_developer());

drop policy if exists staff_schools_developer_delete on public.staff_schools;
create policy staff_schools_developer_delete on public.staff_schools
  for delete to authenticated
  using (public.is_developer());

drop policy if exists staff_schools_own_insert on public.staff_schools;
create policy staff_schools_own_insert on public.staff_schools
  for insert to authenticated
  with check (
    (profile_id = auth.uid())
    and public.current_role() = any (array['director'::account_role, 'coordinator'::account_role, 'secretary'::account_role])
  );
