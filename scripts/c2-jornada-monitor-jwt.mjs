// C2-3 perna 1 — prova gap_1 via JWT direto (sem UI).
// Monitor INSERT route_incidents → notification_status='pending_guardian', ZERO student_messages.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, jwtFetch, ensureFresh, stage, criarGates } from './c2-lib.mjs';

const fx = JSON.parse(readFileSync(`${DIR}/docs/c2-fixtures.json`, 'utf8'));
const { gate, resumo } = criarGates();
const out = { perna: 'monitor-jwt', em: new Date().toISOString(), aluno: fx.aluno };

console.log('[1] refresh token monitor');
const token = await ensureFresh('monitor');

console.log('[2] INSERT route_incidents via JWT monitor');
const insert = await jwtFetch(token, '/rest/v1/route_incidents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({
    student_id: fx.aluno,
    class_id: fx.turma,
    monitor_id: JSON.parse(readFileSync(`${DIR}/docs/c2-accounts.json`, 'utf8')).contas.find(c => c.chave === 'monitor').uid,
    incident_type: 'Ocorrência',
    description: 'C2 sintético: ônibus atrasou 10 min (fixture via JWT direto).',
    occurred_at: new Date().toISOString(),
  }),
});
gate('INSERT route_incidents → 201', insert.status, 201);
if (insert.status !== 201) {
  console.log('  ERRO:', JSON.stringify(insert.j).slice(0, 300));
  out.insert_error = insert.j;
} else {
  const row = insert.j[0];
  out.route_incident_id = row.id;
  console.log('  criado:', row.id);

  console.log('[3] verificar notification_status no banco');
  const dbRow = await sql(`select id, notification_status, monitor_id from public.route_incidents where id='${row.id}'::uuid;`);
  gate('notification_status = pending_guardian (não notifica)', dbRow[0]?.notification_status, 'pending_guardian');
  out.notification_status = dbRow[0]?.notification_status;

  console.log('[4] verificar ZERO student_messages (gap_1 comportamental)');
  const msgs = await sql(`select count(*)::int as n from public.student_messages where student_id='${fx.aluno}'::uuid;`);
  gate('student_messages do aluno C2 = 0', msgs[0].n, 0);
  out.student_messages_count = msgs[0].n;
  out.gap1_comportamental = 'PROVADO: route_incidents criado, notification_status=pending_guardian, ZERO student_messages';
}

const { portoes, falhas } = resumo();
out.portoes = portoes; out.falhas = falhas;
writeFileSync(`${DIR}/docs/c2-jornada-monitor-jwt.json`, JSON.stringify(out, null, 2) + '\n');
stage('jornada-monitor-jwt', { portoes, falhas: falhas.length, gap1_comportamental: falhas.length === 0 });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2_MONITOR_JWT_PAROU' : 'C2_MONITOR_JWT_OK');
if (falhas.length) process.exit(1);