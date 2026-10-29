CREATE OR REPLACE FUNCTION public.bfr_pf_notify_location()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_key text;
  v_ids jsonb;
begin
  select s.decrypted_secret into v_key
    from vault.decrypted_secrets s
   where s.name = 'pf_emissor_service_role'
   limit 1;

  if v_key is null then
    raise warning 'bfr_pf_notify_location: segredo pf_emissor_service_role ausente';
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

  return new;
exception
  when others then
    raise warning 'bfr_pf_notify_location: falha ao enfileirar (%)', sqlerrm;
    return new;
end;
$function$
