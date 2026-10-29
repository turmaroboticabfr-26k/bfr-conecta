// Recon do throttle: lê o que está no ar antes de gerar a candidata. Somente leitura.
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 500)}`);
  try { return JSON.parse(t); } catch { return []; }
}

const shape = await sql(`
select c.relname, a.attname, format_type(a.atttypid,a.atttypmod) as tipo, a.attnotnull
from pg_class c join pg_attribute a on a.attrelid=c.oid
where c.relname in ('student_location_report_throttle','student_locations','student_location_sharing')
  and a.attnum>0 and not a.attisdropped
order by c.relname, a.attnum`);

const pks = await sql(`
select conrelid::regclass::text as tabela, conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid in ('public.student_location_report_throttle'::regclass,'public.student_locations'::regclass,'public.student_location_sharing'::regclass)
order by 1, 2`);

const meta = await sql(`
select c.relname, r.rolname as owner, c.relrowsecurity, c.relforcerowsecurity,
       coalesce(c.relacl::text,'(null = só dono)') as acl,
       (select count(*)::int from pg_policy p where p.polrelid=c.oid) as policies
from pg_class c join pg_roles r on r.oid=c.relowner
where c.relname in ('student_location_report_throttle','student_locations','push_subscriptions')
order by 1`);

const throttleRows = await sql('select * from public.student_location_report_throttle order by 1 limit 10');
const locsRows = await sql('select * from public.student_locations order by 1 limit 5');

const reportDef = await sql(`
select pg_get_functiondef(p.oid) as t
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='bfr_report_location'`);

const funcs = await sql(`
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef,
       r.rolname as owner, p.proacl::text as acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner
where n.nspname='public' and p.proname in ('bfr_report_location','bfr_pf_notify_location') order by 1`);

const netRows = await sql('select id, status_code, left(coalesce(error_msg,\'\'),40) as erro, created from net._http_response order by id');

const TABELAS = ['profiles','classes','students','guardian_students','student_location_sharing',
  'student_locations','student_location_report_throttle','vault.secrets','notification_preferences','push_subscriptions'];
const baseline = await sql(`
select * from (
  ${TABELAS.map(t => `
  select '${t}' as tabela,
         (select count(*)::int from ${t}) as linhas,
         (select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from ${t} x) as md5
  `).join(' union all ')}
  union all
  select 'auth.users', (select count(*)::int from auth.users), '(somente contagem)'
  union all
  select 'net._http_response', (select count(*)::int from net._http_response),
         (select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from net._http_response x)
) x order by tabela`);

const pushNorm = await sql(`
select count(*)::int as linhas,
       md5(coalesce(string_agg((select (p.id,p.profile_id,p.endpoint,p.p256dh,p.auth,p.user_agent,p.created_at,p.fcm_token)::text
                                from public.push_subscriptions p order by 1), '|'), '')) as md5_sem_last_seen
from public.push_subscriptions p`);

const catalogo = await sql(`
select 'trigger' as tipo, tgname as nome, tgtype::text as detalhe
from pg_trigger where tgrelid='public.student_locations'::regclass and not tgisinternal
union all
select 'funcao', 'bfr_pf_notify_location', case when to_regprocedure('public.bfr_pf_notify_location()') is null then 'ausente' else 'presente' end
union all
select 'tabela_throttle_notify', 'student_location_notify_throttle',
       case when to_regclass('public.student_location_notify_throttle') is null then 'NAO_EXISTE' else 'existe' end
union all
select 'segredo', 'pf_emissor_service_role', (select count(*)::text from vault.secrets where name='pf_emissor_service_role')
order by tipo, nome`);

const notifyDef = await sql(`
select pg_get_functiondef('public.bfr_pf_notify_location()'::regprocedure) as t`);

const out = { quando: new Date().toISOString(), somente_leitura: true,
  notifyDef: notifyDef[0]?.t, shape, pks, meta, throttleRows, locsRows, reportDef: reportDef[0]?.t, funcs, netRows, baseline, pushNorm, catalogo };
writeFileSync('C:/Users/pcmac/.kiro/crew/uploads/pf-throttle-recon.json', JSON.stringify(out, null, 2) + '\n');
console.log('shape:'); for (const r of shape) console.log(' ', r.relname, r.attname, r.tipo, 'notnull=' + r.attnotnull, 'pk=' + r.pk);
console.log('meta:', JSON.stringify(meta));
console.log('throttleRows:', JSON.stringify(throttleRows));
console.log('locsRows:', JSON.stringify(locsRows).slice(0, 600));
console.log('funcs:', JSON.stringify(funcs));
console.log('netRows:', JSON.stringify(netRows));
console.log('catalogo:', JSON.stringify(catalogo));
console.log('baseline:'); for (const r of baseline) console.log(' ', r.tabela, r.linhas, r.md5);
console.log('pushNorm:', JSON.stringify(pushNorm));
console.log('reportDef presente?', !!out.reportDef, 'len', (out.reportDef || '').length);
console.log('ARTEFATO pf-throttle-recon.json gravado');
