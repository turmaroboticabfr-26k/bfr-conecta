-- C2-R candidata — notificação de responsável em ocorrência de percurso (gap_1/gap_2)
-- Espelha o fluxo legado do monitor (ar-shell v118 L5953-5957): cria student_messages
-- (category 'general') para cada responsável vinculado e marca notification_status='sent'.
-- Só dispara quando a ocorrência entra como 'pending_guardian' (default do Central);
-- o caminho legado que já grava 'sent' não gera mensagem duplicada.
-- Reversão: sql/c2r-notificacao-rollback.sql

create or replace function public.bfr_notify_guardian_on_route_incident()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_body text;
  v_nome text;
  v_turma text;
  v_n integer := 0;
begin
  select s.official_name into v_nome from public.students s where s.id = new.student_id;
  select concat(c.year, 'º ano ', c.class_code) into v_turma from public.classes c where c.id = new.class_id;
  v_body := 'Alerta durante o percurso do ônibus.' || chr(10)
         || 'Aluno: ' || coalesce(v_nome, '') || chr(10)
         || 'Turma: ' || coalesce(v_turma, '') || chr(10)
         || 'Tipo: ' || new.incident_type || chr(10) || chr(10) || new.description;
  begin
    insert into public.student_messages (student_id, sender_id, recipient_id, category, body)
    select new.student_id, new.monitor_id, gs.profile_id, 'general', v_body
    from public.guardian_students gs
    where gs.student_id = new.student_id;
    get diagnostics v_n = row_count;
  exception when others then
    v_n := 0; -- falha de notificação não pode impedir o registro da ocorrência
  end;
  if v_n > 0 then
    update public.route_incidents
       set notification_status = 'sent', notified_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_route_incidents_notify_guardian on public.route_incidents;
create trigger trg_route_incidents_notify_guardian
after insert on public.route_incidents
for each row
when (new.notification_status = 'pending_guardian')
execute function public.bfr_notify_guardian_on_route_incident();

-- função de trigger não é superfície de RPC: sem EXECUTE para papéis de aplicação
revoke all on function public.bfr_notify_guardian_on_route_incident() from public, anon, authenticated;
