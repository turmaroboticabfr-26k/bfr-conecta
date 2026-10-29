import fs from 'node:fs';

const PAT = fs.readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const URL = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function q(sql) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  let b;
  try { b = JSON.parse(t); } catch { b = t; }
  return { http: r.status, ok: r.status === 201, body: b };
}

const md5s = (tbl, cols) => {
  const inner = cols ? `(select ${cols} from ${tbl})` : tbl;
  return `(select count(*)::int from ${inner} x)`;
};

const queries = {
  throttle_shape: "select a.attnum, a.attname, format_type(a.atttypid,a.atttypmod) as typ, a.attnotnull from pg_attribute a where a.attrelid='public.student_location_report_throttle'::regclass and a.attnum>0 and not a.attisdropped order by a.attnum;",
  throttle_meta: "select r.rolname as owner, c.relrowsecurity, c.relforcerowsecurity, coalesce((select string_agg(conname||': '||pg_get_constraintdef(oid), ' | ') from pg_constraint where conrelid=c.oid),'(sem constraints)') as constraints from pg_class c join pg_roles r on r.oid=c.relowner where c.oid='public.student_location_report_throttle'::regclass;",
  throttle_policies: "select count(*)::int as n_policies from pg_policy where polrelid='public.student_location_report_throttle'::regclass;",
  throttle_grants: "select dataacl::text as acl from pg_tables where schemaname='public' and tablename='student_location_report_throttle';",
  throttle_rows: "select count(*)::int as n from public.student_location_report_throttle;",
  throttle_conteudo: "select * from public.student_location_report_throttle order by 1 limit 20;",
  report_location_def: "select pg_get_functiondef('public.bfr_report_location(uuid,double precision,double precision,text,integer,text,boolean)') as t;",
  report_location_alt: "select p.proname, pg_get_function_identity_arguments(p.oid) as args from pg_proc p where p.proname='bfr_report_location';",
  net_rows: "select id, status_code, left(coalesce(error_msg,''),40) as err, created from net._http_response order by id;",
  baseline: `select 'student_locations' as t, (select count(*)::int from public.student_locations) as n, md5(coalesce((select string_agg(md5(x::text),'') from public.student_locations x),'vazio')) as m_com_carimbo, md5(coalesce((select string_agg(md5((select (s.id,s.student_id,s.reported_by_profile_id,s.latitude,s.longitude,s.status,s.battery,s.accidental_flag)::text from public.student_locations s)),''),'') from public.student_locations s),'vazio')) as m_sem_carimbo
union all select 'push_subscriptions', (select count(*)::int from public.push_subscriptions), md5(coalesce((select string_agg(md5((select (p.id,p.endpoint,p.p256dh,p.auth,p.fcm_token,p.profile_id,p.user_agent)::text from public.push_subscriptions p)),'') from public.push_subscriptions p),'vazio')), md5(coalesce((select string_agg(md5(x::text),'') from public.push_subscriptions x),'vazio'))
union all select 'profiles', (select count(*)::int from public.profiles), md5(coalesce((select string_agg(md5(x::text),'') from public.profiles x),'vazio')), '(idem)'
union all select 'auth_users', (select count(*)::int from auth.users), md5(coalesce((select string_agg(md5(x::text),'') from auth.users x),'vazio')), '(idem)'
union all select 'notification_preferences', (select count(*)::int from public.notification_preferences), md5(coalesce((select string_agg(md5(x::text),'') from public.notification_preferences x),'vazio')), '(idem)'
union all select 'guardian_students', (select count(*)::int from public.guardian_students), md5(coalesce((select string_agg(md5(x::text),'') from public.guardian_students x),'vazio')), '(idem)'
union all select 'classes', (select count(*)::int from public.classes), md5(coalesce((select string_agg(md5(x::text),'') from public.classes x),'vazio')), '(idem)'
union all select 'student_location_sharing', (select count(*)::int from public.student_location_sharing), md5(coalesce((select string_agg(md5(x::text),'') from public.student_location_sharing x),'vazio')), '(idem)'
union all select 'student_location_report_throttle', (select count(*)::int from public.student_location_report_throttle), md5(coalesce((select string_agg(md5(x::text),'') from public.student_location_report_throttle x),'vazio')), '(idem)'
union all select 'net_http_response', (select count(*)::int from net._http_response), md5(coalesce((select string_agg(md5(x::text),'') from net._http_response x),'vazio')), '(idem)';`,
  tabelas_pf: "select c.relname, r.rolname as owner, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner where n.nspname='public' and c.relkind='r' and (c.relname like 'student_location%' or c.relname like '%pf%' or c.relname='push_subscriptions') order by 1;",
  pk_student_locations: "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.student_locations'::regclass;",
  fk_student: "select tc.table_name as from_tbl, kcu.column_name, ccu.table_name as to_tbl, rc.delete_rule from information_schema.table_constraints tc join information_schema.key_column_usage kcu on kcu.constraint_name=tc.constraint_name join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name join information_schema.referential_constraints rc on rc.constraint_name=tc.constraint_name where tc.constraint_type='FOREIGN KEY' and ccu.table_name='profiles' and tc.table_schema='public' order by 1;",
};

const out = { quando: new Date().toISOString(), somente_leitura: true };
for (const [nome, sql] of Object.entries(queries)) {
  const r = await q(sql);
  out[nome] = r;
  console.log(r.ok ? 'ok  ' : 'FALH', nome, r.http, r.ok ? '' : JSON.stringify(r.body).slice(0, 260));
}
fs.writeFileSync('C:/Users/pcmac/.kiro/crew/uploads/pf-throttle-recon2.json', JSON.stringify(out, null, 2));
console.log('escrito pf-throttle-recon2.json');
