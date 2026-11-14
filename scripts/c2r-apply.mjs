// C2-R aplicar — DDL da candidata do trigger de notificação (gap_1/gap_2).
// Preflight (função/trigger ausentes + baseline intacta) → aplicar → conferência de catálogo.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, stage, criarGates } from './c2-lib.mjs';

const candidata = readFileSync(`${DIR}/sql/c2r-notificacao-candidate.sql`, 'utf8');
const { gate, resumo } = criarGates();
const out = { ciclo: 'C2-R', em: new Date().toISOString() };

console.log('[1] preflight: função/trigger ausentes, baseline intacta');
const pre = await sql(`
select
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='bfr_notify_guardian_on_route_incident' and n.nspname='public') as fn,
  (select count(*)::int from pg_trigger where tgname='trg_route_incidents_notify_guardian') as trg,
  (select count(*)::int from public.route_incidents) as route,
  (select count(*)::int from public.student_messages) as msgs;`);
const p = pre[0];
out.preflight = p;
gate('preflight: route_incidents = 0', p?.route, 0);
gate('preflight: student_messages = 1', p?.msgs, 1);

console.log('[2] aplicar DDL (uma transação)');
await sql(candidata);
out.aplicado = true;

console.log('[3] conferência de catálogo');
const pos = await sql(`
select
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='bfr_notify_guardian_on_route_incident' and n.nspname='public') as fn,
  (select string_agg(r.rolname, ',' order by r.rolname) from pg_proc p join pg_roles r on r.oid=p.proowner where p.proname='bfr_notify_guardian_on_route_incident') as dono,
  (select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='bfr_notify_guardian_on_route_incident' and n.nspname='public') as definer,
  (select count(*)::int from pg_trigger where tgname='trg_route_incidents_notify_guardian' and tgrelid='public.route_incidents'::regclass and not tgisinternal) as trg,
  (select count(*)::int from pg_trigger where tgname='trg_route_incidents_notify_guardian' and tgrelid='public.route_incidents'::regclass and (tgtype::int & 2) = 0) as trg_after,
  (select count(*)::int from pg_trigger where tgname='trg_route_incidents_notify_guardian' and tgrelid='public.route_incidents'::regclass and (tgtype::int & 4) > 0) as trg_insert,
  (select count(*)::int from pg_trigger where tgname='trg_route_incidents_notify_guardian' and tgrelid='public.route_incidents'::regclass and pg_get_triggerdef(oid) like '%pending_guardian%') as trg_when,
  (select proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='bfr_notify_guardian_on_route_incident' and n.nspname='public') as proacl,
  (select count(*)::int from pg_proc p where p.proname='bfr_notify_guardian_on_route_incident' and exists (select 1 from aclexplode(coalesce(p.proacl, '{}'::aclitem[])) a where a.grantee = 0)) as public_exec,
  (select count(*)::int from pg_proc p where p.proname='bfr_notify_guardian_on_route_incident' and exists (select 1 from aclexplode(coalesce(p.proacl, '{}'::aclitem[])) a join pg_roles r on r.oid=a.grantee where r.rolname in ('anon','authenticated'))) as app_exec,
  (select count(*)::int from pg_proc p where p.proname='bfr_notify_guardian_on_route_incident' and exists (select 1 from aclexplode(coalesce(p.proacl, '{}'::aclitem[])) a join pg_roles r on r.oid=a.grantee where r.rolname = 'service_role')) as service_exec,
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='bfr_notify_guardian_on_route_incident' and n.nspname='public' and position('search_path' in pg_get_functiondef(p.oid)) > 0) as search_path_fixado;`);
const q = pos[0];
gate('função criada', q?.fn, 1);
gate('dono = postgres', q?.dono, 'postgres');
gate('SECURITY DEFINER', q?.definer, true);
gate('trigger criado (não-interno)', q?.trg, 1);
gate('trigger AFTER', q?.trg_after, 1);
gate('trigger INSERT', q?.trg_insert, 1);
gate('trigger com WHEN pending_guardian', q?.trg_when, 1);
gate('proacl sem anon/authenticated', q?.app_exec, 0);
gate('EXECUTE público = 0', q?.public_exec, 0);
gate('service_role mantém EXECUTE (padrão Supabase)', q?.service_exec, 1);
gate('search_path fixado', q?.search_path_fixado, 1);
out.catalogo = q;

console.log('[4] baseline intacta após DDL');
const base = await sql(`select (select count(*)::int from public.route_incidents) as route, (select count(*)::int from public.student_messages) as msgs, (select count(*)::int from public.gate_checkins) as gate, (select count(*)::int from public.gate_entry_alerts) as alerts;`);
gate('route_incidents = 0', base[0]?.route, 0);
gate('student_messages = 1', base[0]?.msgs, 1);
gate('gate_checkins = 193', base[0]?.gate, 193);
gate('gate_entry_alerts = 1', base[0]?.alerts, 1);
out.baseline_pos = base[0];

const { portoes, falhas } = resumo();
out.portoes = portoes; out.falhas = falhas;
writeFileSync(`${DIR}/docs/c2r-apply.json`, JSON.stringify(out, null, 2) + '\n');
stage('apply', { portoes, falhas: falhas.length, aplicado: falhas.length === 0, catalogo: q });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2R_APPLY_PAROU' : 'C2R_APPLY_OK');
if (falhas.length) process.exit(1);
