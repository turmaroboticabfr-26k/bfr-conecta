// C2-R dry-run transacional — candidata do trigger de notificação (gap_1/gap_2).
// Uma única chamada HTTP = uma transação: DDL + fixture + escrita RLS como monitor
// + controle negativo + select agregado + rollback. Depois, chamada fresca prova que
// nada ficou (função/trigger ausentes, contagens == baseline).
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, stage, criarGates } from './c2-lib.mjs';

const MONITOR = 'aaaaaaaa-0000-4000-8000-00000000c203';
const PARENT = 'aaaaaaaa-0000-4000-8000-00000000c204';
const TURMA = 'aaaaaaaa-0000-4000-8000-00000000c201';
const ALUNO = 'aaaaaaaa-0000-4000-8000-00000000c202';
const SCHOOL = '08ebef62-2193-4520-ab44-c044160d565f'; // Municipal Alpha

const candidata = readFileSync(`${DIR}/sql/c2r-notificacao-candidate.sql`, 'utf8');
const { gate, resumo } = criarGates();
const out = { ciclo: 'C2-R', em: new Date().toISOString(), monitor: MONITOR, aluno: ALUNO };

const authInsert = (id, email) => `insert into auth.users (id, aud, role, email, email_confirmed_at, is_sso_user, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values ('${id}', 'authenticated', 'authenticated', '${email}', now(), false, '{}', '{}', now(), now());`;

const txn = `
begin;
${candidata}
${authInsert(MONITOR, 'c2r-monitor-dry@bfr-conecta.test')}
update public.profiles set role='monitor', full_name='C2R Monitor Dry' where id='${MONITOR}';
${authInsert(PARENT, 'c2r-parent-dry@bfr-conecta.test')}
insert into public.classes (id, year, class_code, shift, school_id) values ('${TURMA}', 2026, 'C2R', 'morning', '${SCHOOL}');
insert into public.students (id, official_name, class_id, active, created_at, school_id) values ('${ALUNO}', 'C2R Aluno Dry', '${TURMA}', true, now(), '${SCHOOL}');
insert into public.guardian_students (profile_id, student_id, relationship) values ('${PARENT}', '${ALUNO}', 'responsável');

set local role authenticated;
set local request.jwt.claims = '{"sub":"${MONITOR}","role":"authenticated"}';
set local request.jwt.claim.sub = '${MONITOR}';

insert into public.route_incidents (student_id, class_id, monitor_id, incident_type, description)
  values ('${ALUNO}', '${TURMA}', '${MONITOR}', 'Ocorrência', 'C2R dry-run positivo: ônibus atrasou 10 min');
insert into public.route_incidents (student_id, class_id, monitor_id, incident_type, description, notification_status)
  values ('${ALUNO}', '${TURMA}', '${MONITOR}', 'Ocorrência', 'C2R dry-run negativo: já nasceu sent', 'sent');

select
  (select count(*)::int from public.route_incidents where student_id='${ALUNO}') as inc_total,
  (select count(*)::int from public.route_incidents where student_id='${ALUNO}' and notification_status='sent' and notified_at is not null) as inc_sent_nt,
  (select count(*)::int from public.route_incidents where student_id='${ALUNO}' and notification_status='pending_guardian') as inc_pending,
  (select count(*)::int from public.route_incidents where student_id='${ALUNO}' and notification_status='sent' and notified_at is null) as inc_sent_null,
  (select count(*)::int from public.student_messages where student_id='${ALUNO}') as msgs_total,
  (select count(*)::int from public.student_messages where student_id='${ALUNO}' and recipient_id='${PARENT}' and category='general' and body like 'Alerta durante o percurso do ônibus.%') as msgs_guardian;
rollback;
`;

console.log('[1] dry-run transacional (DDL + fixture + escrita RLS + rollback)');
const linhas = await sql(txn);
out.dryrun = linhas;
const r = linhas[0];
console.log('  resultado:', JSON.stringify(r));
gate('inc_total = 2 (ambas gravaram sob RLS do monitor)', r?.inc_total, 2);
gate('inc_sent_nt = 1 (a pendente foi marcada sent+notified_at pelo trigger)', r?.inc_sent_nt, 1);
gate('inc_pending = 0 (nada ficou pendente)', r?.inc_pending, 0);
gate('inc_sent_null = 1 (controle negativo intacto: nasceu sent, sem notified_at)', r?.inc_sent_null, 1);
gate('msgs_total = 1 (só a pendente gerou mensagem)', r?.msgs_total, 1);
gate('msgs_guardian = 1 (mensagem category general para o responsável)', r?.msgs_guardian, 1);

console.log('[2] chamada fresca: nada sobreviveu ao rollback');
const pos = await sql(`
select
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='bfr_notify_guardian_on_route_incident' and n.nspname='public') as fn,
  (select count(*)::int from pg_trigger where tgname='trg_route_incidents_notify_guardian') as trg,
  (select count(*)::int from public.route_incidents) as route,
  (select count(*)::int from public.student_messages) as msgs,
  (select count(*)::int from public.gate_checkins) as gate,
  (select count(*)::int from public.gate_entry_alerts) as alerts,
  (select count(*)::int from auth.users where id in ('${MONITOR}','${PARENT}')) as users,
  (select count(*)::int from public.classes where id='${TURMA}') as turma,
  (select count(*)::int from public.students where id='${ALUNO}') as aluno,
  (select count(*)::int from public.guardian_students where student_id='${ALUNO}') as vinculo;`);
out.pos = pos;
const p = pos[0];
console.log('  pos:', JSON.stringify(p));
gate('função ausente', p?.fn, 0);
gate('trigger ausente', p?.trg, 0);
gate('route_incidents = 0 (baseline)', p?.route, 0);
gate('student_messages = 1 (baseline)', p?.msgs, 1);
gate('gate_checkins = 193 (baseline)', p?.gate, 193);
gate('gate_entry_alerts = 1 (baseline)', p?.alerts, 1);
gate('auth.users fixture = 0', p?.users, 0);
gate('turma fixture = 0', p?.turma, 0);
gate('aluno fixture = 0', p?.aluno, 0);
gate('vínculo fixture = 0', p?.vinculo, 0);

const { portoes, falhas } = resumo();
out.portoes = portoes; out.falhas = falhas;
writeFileSync(`${DIR}/docs/c2r-dryrun.json`, JSON.stringify(out, null, 2) + '\n');
stage('dryrun', { portoes, falhas: falhas.length, resultado: r, pos: p });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2R_DRYRUN_PAROU' : 'C2R_DRYRUN_OK');
if (falhas.length) process.exit(1);
