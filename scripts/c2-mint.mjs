// C2-2 — mint 4 contas sintéticas (Admin API) + login real + roles + fixture SQL.
// Autorização: "Sim, avança com o Cenário 2" (08/11). Escola reutilizada: Municipal Alpha (08ebef62…).
// Nada de credencial impressa. Senhas geradas no processo, nunca persistidas; sessões só em ficheiro (apagado na limpeza).
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { DIR, sql, admin, saveSessions, stage, criarGates } from './c2-lib.mjs';

const ACCOUNTS = `${DIR}/docs/c2-accounts.json`;
const SESSIONS = `${DIR}/c2-sessions.json`;
const FIXTURES = `${DIR}/docs/c2-fixtures.json`;
for (const f of [ACCOUNTS, SESSIONS, FIXTURES]) {
  if (existsSync(f)) throw new Error(`ABORTA: ${f} já existe — ciclo sujo`);
}

const SCHOOL = '08ebef62-2193-4520-ab44-c044160d565f'; // Escola Municipal Alpha (todos os 848 alunos reais)
const CONTAS = [
  { chave: 'monitor', role: 'monitor' },
  { chave: 'gatekeeper', role: 'gatekeeper' },
  { chave: 'parent', role: 'parent' },
  { chave: 'student', role: 'student' },
];

const { gate, resumo } = criarGates();
const sessions = {};

console.log('[1] Mint Admin API + login real + role');
for (const c of CONTAS) {
  const uid = randomUUID();
  const email = `c2-${c.chave}-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
  const senha = randomBytes(18).toString('base64url');
  const criado = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ id: uid, email, password: senha, email_confirm: true, data: { full_name: `C2 ${c.chave} Sintético` } }),
  });
  if (![200, 201].includes(criado.status)) throw new Error(`mint ${c.chave} HTTP ${criado.status}: ${JSON.stringify(criado.j).slice(0, 300)}`);
  gate(`mint ${c.chave} HTTP 200/201`, [200, 201].includes(criado.status), true);

  const tok = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: senha }) });
  gate(`login real ${c.chave} → 200 + access_token`, tok.status === 200 && typeof tok.j?.access_token === 'string' && tok.j.access_token.length > 100, true);
  if (!tok.j?.access_token) throw new Error(`login ${c.chave} falhou HTTP ${tok.status}`);

  await sql(`update public.profiles set role='${c.role}'::account_role, full_name='C2 ${c.chave} Sintético' where id='${uid}'::uuid;`);
  const perfil = await sql(`select role::text from public.profiles where id='${uid}'::uuid;`);
  gate(`profile ${c.chave} role = ${c.role}`, perfil[0]?.role, c.role);

  Object.assign(c, { uid, email });
  sessions[c.chave] = { uid, email, ...tok.j, expires_at: tok.j.expires_at ?? Math.floor(Date.now() / 1000) + tok.j.expires_in };
  console.log(`  ${c.chave}: ${uid} · login OK · role ${c.role}`);
}
saveSessions(sessions);

console.log('[2] Fixture SQL (turma, aluno, vínculo, crachá)');
const turma = randomUUID();
const aluno = randomUUID();
const badge = randomUUID();
const badgeToken = randomUUID();
const studentUid = CONTAS.find(c => c.chave === 'student').uid;
const parentUid = CONTAS.find(c => c.chave === 'parent').uid;

await sql(`insert into public.classes (id, year, class_code, shift, school_id) values ('${turma}', 2026, 'C2', 'morning', '${SCHOOL}');`);
gate('turma C2 inserida', (await sql(`select class_code from public.classes where id='${turma}';`))[0]?.class_code, 'C2');

await sql(`insert into public.students (id, official_name, class_id, school_id, student_profile_id, observation) values ('${aluno}', 'C2 Aluno Sintético', '${turma}', '${SCHOOL}', '${studentUid}', 'Fixture sintética do ciclo C2 — apagar no fim');`);
gate('aluno inserido e ligado à conta student', (await sql(`select student_profile_id::text as p from public.students where id='${aluno}';`))[0]?.p, studentUid);

await sql(`insert into public.guardian_students (profile_id, student_id, relationship, linked_by, linked_at) values ('${parentUid}', '${aluno}', 'responsável', '${parentUid}', now());`);
gate('vínculo guardian_students parent↔aluno', (await sql(`select count(*)::int as n from public.guardian_students where profile_id='${parentUid}' and student_id='${aluno}';`))[0]?.n, 1);

await sql(`insert into public.gate_badges (id, student_id, badge_token, active) values ('${badge}', '${aluno}', '${badgeToken}', true);`);
gate('crachá ativo com token', (await sql(`select badge_token::text as t from public.gate_badges where id='${badge}';`))[0]?.t, badgeToken);

writeFileSync(ACCOUNTS, JSON.stringify({ ciclo: 'C2', em: new Date().toISOString(), contas: CONTAS }, null, 2) + '\n');
writeFileSync(FIXTURES, JSON.stringify({ ciclo: 'C2', em: new Date().toISOString(), school: SCHOOL, turma, aluno, badge, badge_token: badgeToken, parent_uid: parentUid, student_uid: studentUid }, null, 2) + '\n');
const { portoes, falhas } = resumo();
stage('mint', { contas: CONTAS.map(c => ({ chave: c.chave, uid: c.uid, role: c.role })), portoes, falhas });
stage('fixture', { school: SCHOOL, turma, aluno, badge, portoes, falhas });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2_MINT_PAROU' : 'C2_MINT_OK');
if (falhas.length) process.exit(1);