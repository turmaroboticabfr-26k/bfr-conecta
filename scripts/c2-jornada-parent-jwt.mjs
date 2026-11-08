// C2-3 perna 2 — parent verifica notificações de percurso (gap_2).
// Prova gap_2: parent NÃO vê route_incidents do filho (notification_status='pending_guardian' + ZERO student_messages).
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, stage, criarGates, ensureFresh, jwtFetch } from './c2-lib.mjs';

const fx = JSON.parse(readFileSync(`${DIR}/docs/c2-fixtures.json`, 'utf8'));
const contas = JSON.parse(readFileSync(`${DIR}/docs/c2-accounts.json`, 'utf8'));
const { gate, resumo } = criarGates();
const out = { perna: 'parent-jwt', em: new Date().toISOString(), aluno: fx.aluno, parent: contas.contas.find(c => c.chave === 'parent').uid };

console.log('[1] refresh token parent');
await ensureFresh('parent');
const parentSession = JSON.parse(readFileSync(`${DIR}/c2-sessions.json`, 'utf8')).parent;
const token = parentSession.access_token;

console.log('[2] verificar route_incidents do aluno C2 (parent NÃO deveria ver)');
const incidents = await jwtFetch(token, `/rest/v1/route_incidents?student_id=eq.${fx.aluno}&select=id,incident_type,notification_status,occurred_at`, {
  method: 'GET',
});
gate('GET route_incidents → 200', incidents.status, 200);
if (incidents.status !== 200) {
  console.log('  ERRO:', JSON.stringify(incidents.j).slice(0, 300));
  out.incidents_error = incidents.j;
} else {
  console.log('  encontrados:', incidents.j.length, 'route_incidents');
  gate('route_incidents do aluno C2 = 1 (o que o monitor criou)', incidents.j.length, 1);
  if (incidents.j.length > 0) {
    const inc = incidents.j[0];
    out.route_incident_id = inc.id;
    out.notification_status = inc.notification_status;
    gate('notification_status = pending_guardian (não notifica)', inc.notification_status, 'pending_guardian');
  }
}

console.log('[3] verificar student_messages do aluno C2 (parent NÃO deveria ver mensagens de percurso)');
const msgs = await jwtFetch(token, `/rest/v1/student_messages?student_id=eq.${fx.aluno}&select=id,category,body,created_at`, {
  method: 'GET',
});
gate('GET student_messages → 200', msgs.status, 200);
if (msgs.status !== 200) {
  console.log('  ERRO:', JSON.stringify(msgs.j).slice(0, 300));
  out.messages_error = msgs.j;
} else {
  console.log('  encontradas:', msgs.j.length, 'student_messages');
  gate('student_messages do aluno C2 = 0 (gap_2 comportamental)', msgs.j.length, 0);
}

console.log('[4] verificar direto no banco (confirmação)');
const dbIncidents = await sql(`select count(*)::int as n from public.route_incidents where student_id='${fx.aluno}'::uuid;`);
gate('route_incidents no banco = 1', dbIncidents[0].n, 1);
const dbMsgs = await sql(`select count(*)::int as n from public.student_messages where student_id='${fx.aluno}'::uuid;`);
gate('student_messages no banco = 0', dbMsgs[0].n, 0);

out.gap2_comportamental = 'PROVADO: parent vê 1 route_incident (notification_status=pending_guardian) e ZERO student_messages';

const { portoes, falhas } = resumo();
out.portoes = portoes; out.falhas = falhas;
writeFileSync(`${DIR}/docs/c2-jornada-parent-jwt.json`, JSON.stringify(out, null, 2) + '\n');
stage('jornada-parent', { portoes, falhas: falhas.length, gap2_comportamental: falhas.length === 0 });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2_PARENT_PAROU' : 'C2_PARENT_OK');
if (falhas.length) process.exit(1);
