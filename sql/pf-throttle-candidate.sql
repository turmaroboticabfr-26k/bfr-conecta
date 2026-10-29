-- BFR Conecta · Protecao Familiar · throttle de notificacao de nova localizacao
-- CANDIDATA — gerada de pg_get_functiondef vivo (29/10), nao copiada a mao.
--
-- Decisao de produto (§C.26 item vi): o gatilho bfr_pf_notify_location disparava a CADA
--   escrita de posicao, sem janela. A partir daqui, para o MESMO aluno ha no maximo uma
--   notificacao por interval '5 minutes'.
--   Dentro da janela o gatilho SILENCE: nao chama net.http_post e nao gasta a janela.
--   A escrita da posicao NUNCA e bloqueada — o throttle so segura a notificacao.
--   Chave = aluno (uma fila por student_id): se dois responsaveis compartilham, ambos
--   recebem na primeira e ambos ficam calados durante a janela.
--
-- Espelha o padrao da irma public.student_location_report_throttle (trava de 30 s por
--   escrita): dono postgres, RLS ligado SEM force e sem policies, ACL so postgres+
--   service_role. Sem force e de proposito: com force + 0 policies a propria
--   SECURITY DEFINER (dono postgres) ficava bloqueada na tabela que ela escreve.
-- Dependencias no ar: Edge send-school-notification v20, segredo Vault
--   'pf_emissor_service_role', pg_net 0.20.4, gatilho bfr_pf_notify_location (tgtype 21).
--
begin;

create table if not exists public.student_location_notify_throttle (
  student_id uuid primary key references public.students(id) on delete cascade,
  last_notified_at timestamp with time zone not null
);

alter table public.student_location_notify_throttle enable row level security;
revoke all on public.student_location_notify_throttle from public, anon, authenticated;
grant all on public.student_location_notify_throttle to service_role;

CREATE OR REPLACE FUNCTION public.bfr_pf_notify_location()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_key text;
  v_ids jsonb;
  v_janela interval := interval '5 minutes';
  v_livre boolean;
begin
  select s.decrypted_secret into v_key
    from vault.decrypted_secrets s
   where s.name = 'pf_emissor_service_role'
   limit 1;

  if v_key is null then
    raise warning 'bfr_pf_notify_location: segredo pf_emissor_service_role ausente';
    return new;
  end if;

  select coalesce(bool_or(now() - t.last_notified_at >= v_janela), true)
    into v_livre
    from public.student_location_notify_throttle t
   where t.student_id = new.student_id;

  if not v_livre then
    return new;
  end if;

  select jsonb_agg(sh.profile_id order by sh.profile_id)
    into v_ids
    from public.student_location_sharing sh
   where sh.student_id = new.student_id
     and sh.enabled
     and sh.profile_id is distinct from new.reported_by_profile_id;

  if v_ids is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://yyzqoxlkcvqpessypfjo.supabase.co/functions/v1/send-school-notification',
    body := jsonb_build_object(
      'title', 'Atualização de localização',
      'body', 'Uma nova localização foi compartilhada. Abra o BFR Conecta para ver no mapa.',
      'profile_ids', v_ids
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    timeout_milliseconds := 5000
  );

  insert into public.student_location_notify_throttle (student_id, last_notified_at)
  values (new.student_id, now())
  on conflict (student_id) do update
    set last_notified_at = excluded.last_notified_at;

  return new;
exception
  when others then
    raise warning 'bfr_pf_notify_location: falha ao enfileirar (%)', sqlerrm;
    return new;
end;
$function$;

revoke all on function public.bfr_pf_notify_location() from public, anon, authenticated;

commit;

-- Reversao (congelada; executar so com OK):
-- begin;
-- drop trigger if exists bfr_pf_notify_location on public.student_locations;
-- drop function if exists public.bfr_pf_notify_location();
-- drop table if exists public.student_location_notify_throttle;
-- commit;
-- (a funcao anterior a esta candidata esta salva em pf-throttle-original-function.sql;
--  para reverter SEM perder o emissor, reaplicar aquele texto e manter a tabela vazia)
