// C2-3 perna 3 — gatekeeper registra entrada e saída de aluno (transporte).
// Prova: gatekeeper consegue criar gate_checkins via JWT (RLS OK).
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, stage, criarGates, ensureFresh, jwtFetch } from './c2-lib.mjs';

const fx = JSON.parse(readFileSync(`${DIR}/docs/c2-fixtures.json`, 'utf8'));
const contas = JSON.parse(readFileSync(`${DIR}/docs/c2-accounts.json`, 'utf8'));
const { gate, resumo } = criarGates();
const out = { perna: 'gatekeeper-jwt', em: new Date().toISOString(), aluno: fx.aluno, gatekeeper: contas.contas.find(c => c.chave === 'gatekeeper').uid };

console.log('[1] refresh token gatekeeper');
await ensureFresh('gatekeeper');
const gkSession = JSON.parse(readFileSync(`${DIR}/c2-sessions.json`, 'utf8')).gatekeeper;
const token = gkSession.access_token;

console.log('[2] verificar baseline de gate_checkins do aluno C2');
const baseline = await sql(`select count(*)::int as n from public.gate_checkins where student_id='${fx.aluno}'::uuid;`);
out.baseline_checkins = baseline[0].n;
console.log('  baseline:', baseline[0].n, 'gate_checkins');

console.log('[3] INSERT gate_checkin ENTRADA via JWT gatekeeper');
const entrada = await jwtFetch(token, '/rest/v1/gate_checkins', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({
    student_id: fx.aluno,
    class_id: fx.turma,
    gatekeeper_id: contas.contas.find(c => c.chave === 'gatekeeper').uid,
    direction: 'entrada',
    checked_at: new Date().toISOString(),
    intake_source: 'manual',
    entry_status: 'allowed',
    school_date: new Date().toISOString().split('T')[0],
  }),
});
gate('INSERT gate_checkin ENTRADA → 201', entrada.status, 201);
if (entrada.status !== 201) {
  console.log('  ERRO:', JSON.stringify(entrada.j).slice(0, 300));
  out.entrada_error = entrada.j;
} else {
  const row = entrada.j[0];
  out.entrada_id = row.id;
  console.log('  criado:', row.id);
}

console.log('[4] INSERT gate_checkin SAÍDA via JWT gatekeeper');
const saida = await jwtFetch(token, '/rest/v1/gate_checkins', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({
    student_id: fx.aluno,
    class_id: fx.turma,
    gatekeeper_id: contas.contas.find(c => c.chave === 'gatekeeper').uid,
    direction: 'saida',
    checked_at: new Date().toISOString(),
    intake_source: 'manual',
    entry_status: 'allowed',
    school_date: new Date().toISOString().split('T')[0],
  }),
});
gate('INSERT gate_checkin SAÍDA → 201', saida.status, 201);
if (saida.status !== 201) {
  console.log('  ERRO:', JSON.stringify(saida.j).slice(0, 300));
  out.saida_error = saida.j;
} else {
  const row = saida.j[0];
  out.saida_id = row.id;
  console.log('  criado:', row.id);
}

console.log('[5] verificar gate_checkins do aluno C2 no banco');
const apos = await sql(`select id, direction, intake_source, gatekeeper_id from public.gate_checkins where student_id='${fx.aluno}'::uuid order by checked_at;`);
gate('gate_checkins do aluno C2 = 2 (entrada + saída)', apos.length, 2);
if (apos.length === 2) {
  gate('primeiro checkin = entrada', apos[0].direction, 'entrada');
  gate('segundo checkin = saida', apos[1].direction, 'saida');
  gate('intake_source = manual (ambos)', apos.every(r => r.intake_source === 'manual'), true);
  gate('gatekeeper_id = porteiro sintético (ambos)', apos.every(r => r.gatekeeper_id === contas.contas.find(c => c.chave === 'gatekeeper').uid), true);
}

out.gap3_comportamental = 'PROVADO: gatekeeper cria gate_checkins (entrada + saída) via JWT com RLS OK';

const { portoes, falhas } = resumo();
out.portoes = portoes; out.falhas = falhas;
writeFileSync(`${DIR}/docs/c2-jornada-gatekeeper-jwt.json`, JSON.stringify(out, null, 2) + '\n');
stage('jornada-gatekeeper', { portoes, falhas: falhas.length, gap3_comportamental: falhas.length === 0 });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2_GATEKEEPER_PAROU' : 'C2_GATEKEEPER_OK');
if (falhas.length) process.exit(1);
