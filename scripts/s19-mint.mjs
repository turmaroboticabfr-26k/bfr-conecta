// S19-3 — mint 4 contas sintéticas (Admin API) + login real + roles + vínculos + fixture via JWT.
// Autorização: seleção explícita "Prova comportamental S17" (08/11). Escolas Alpha/Beta simples (sem vínculos reais).
// Nada de credencial impressa. Senhas geradas no processo, nunca persistidas; sessões só em ficheiro (apagado na limpeza).
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { DIR, sql, admin, jwtFetch, loadSessions, saveSessions, stage, criarGates } from './s19-lib.mjs';

const ACCOUNTS = `${DIR}/evidence/s19-accounts.json`;
const SESSIONS = `${DIR}/s19-sessions.json`;
const FIXTURES = `${DIR}/evidence/s19-fixtures.json`;
for (const f of [ACCOUNTS, SESSIONS, FIXTURES, `${DIR}/evidence/s19-diary.json`]) {
  if (existsSync(f)) throw new Error(`ABORTA: ${f} já existe — ciclo sujo`);
}

const ALPHA = '559acff1-e4df-42bc-aea4-2d96b8b5b11b'; // Escola Alpha (sports_schools, sem staff_schools)
const BETA = '2efafbdc-12f4-4e63-a58e-2e50ca5479e2';  // Escola Beta  (idem)
const CONTAS = [
  { chave: 'secretary', role: 'secretary', escola: ALPHA },
  { chave: 'director', role: 'director', escola: ALPHA },
  { chave: 'coordinator', role: 'coordinator', escola: BETA },
  { chave: 'supervisor', role: 'education_supervisor', escola: null },
];

const { gate, resumo } = criarGates();
const sessions = {};

console.log('[1] Mint Admin API + login real + role');
for (const c of CONTAS) {
  const uid = randomUUID();
  const email = `s19-${c.chave}-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
  const senha = randomBytes(18).toString('base64url');
  const criado = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ id: uid, email, password: senha, email_confirm: true, data: { full_name: `S19 ${c.chave} Sintético` } }),
  });
  if (![200, 201].includes(criado.status)) throw new Error(`mint ${c.chave} HTTP ${criado.status}: ${JSON.stringify(criado.j).slice(0, 300)}`);
  gate(`mint ${c.chave} HTTP 200/201`, [200, 201].includes(criado.status), true);

  const tok = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: senha }) });
  gate(`login real ${c.chave} → 200 + access_token`, tok.status === 200 && typeof tok.j?.access_token === 'string' && tok.j.access_token.length > 100, true);
  if (!tok.j?.access_token) throw new Error(`login ${c.chave} falhou HTTP ${tok.status}`);

  await sql(`update public.profiles set role='${c.role}'::account_role, full_name='S19 ${c.chave} Sintético' where id='${uid}'::uuid;`);
  const perfil = await sql(`select role::text from public.profiles where id='${uid}'::uuid;`);
  gate(`profile ${c.chave} role = ${c.role}`, perfil[0]?.role, c.role);

  Object.assign(c, { uid, email });
  sessions[c.chave] = { uid, email, ...tok.j, expires_at: tok.j.expires_at ?? Math.floor(Date.now() / 1000) + tok.j.expires_in };
  console.log(`  ${c.chave}: ${uid} · login OK · role ${c.role}`);
}
saveSessions(sessions);

console.log('[2] Vínculos staff_schools (fixture, SQL)');
for (const c of CONTAS.filter(x => x.escola)) {
  c.link_id = randomUUID();
  await sql(`insert into public.staff_schools (id, profile_id, school_id, role) values ('${c.link_id}','${c.uid}'::uuid,'${c.escola}'::uuid,'${c.role}');`);
  console.log(`  ${c.chave} → ${c.escola === ALPHA ? 'Alpha' : 'Beta'}`);
}
const nLinks = await sql(`select count(*)::int as n from public.staff_schools;`);
gate('staff_schools = 12 (9 intactos + 3 sintéticos)', nLinks[0].n, 12);
writeFileSync(ACCOUNTS, JSON.stringify({ ciclo: 'S19', em: new Date().toISOString(), contas: CONTAS.map(({ chave, role, escola, uid, email, link_id }) => ({ chave, role, escola, uid, email, link_id: link_id ?? null })) }, null, 2) + '\n');

console.log('[3] Fixture via JWT real (prova comportamental dos INSERTs)');
const sup = sessions.supervisor;
const mkReq = async (escola, rotulo) => {
  const r = await jwtFetch(sup.access_token, '/rest/v1/supervision_requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ indicator: `S19 Indicador ${rotulo}`, motive: 'Prova comportamental S19', description: 'Fixture sintética do ciclo S19 — apagar no fim', questions: [], priority: 'média', status: 'Pendente de resposta', created_by: sup.uid, school_id: escola }),
  });
  gate(`supervisor JWT insere R_${rotulo} → 201`, r.status, 201);
  if (r.status !== 201) throw new Error(`insert R_${rotulo} HTTP ${r.status}: ${JSON.stringify(r.j).slice(0, 300)}`);
  return r.j[0].id;
};
const reqA = await mkReq(ALPHA, 'A');
const reqB = await mkReq(BETA, 'B');
console.log(`  R_A=${reqA} (Alpha) · R_B=${reqB} (Beta)`);

const dir = sessions.director;
const resp = await jwtFetch(dir.access_token, '/rest/v1/supervision_responses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ request_id: reqA, round: 1, justification: 'S19 justificativa sintética', measures_taken: 'S19 medidas tomadas (sintético)', measures_planned: 'S19 medidas planejadas (sintético)', responsible_name: 'S19 director Sintético', created_by: dir.uid }),
});
gate('director JWT insere resposta em R_A → 201', resp.status, 201);
if (resp.status !== 201) throw new Error(`insert resposta HTTP ${resp.status}: ${JSON.stringify(resp.j).slice(0, 300)}`);
const respId = resp.j[0].id;
console.log(`  resposta=${respId}`);

const st = await sql(`select status from public.supervision_requests where id='${reqA}'::uuid;`);
gate('trigger notify: R_A status → Respondida', st[0]?.status, 'Respondida');

const uids = CONTAS.map(c => `'${c.uid}'`).join(',');
const nAudit = await sql(`select count(*)::int as n from public.supervision_audit where profile_id in (${uids});`);
gate('auditoria do ciclo = 4 linhas (2 requests + insert resposta + update notify)', nAudit[0].n, 4);

writeFileSync(FIXTURES, JSON.stringify({ ciclo: 'S19', em: new Date().toISOString(), alpha: ALPHA, beta: BETA, req_a: reqA, req_b: reqB, resp_id: respId }, null, 2) + '\n');
const { portoes, falhas } = resumo();
stage('mint', { contas: CONTAS.map(c => ({ chave: c.chave, uid: c.uid, role: c.role })), portoes, falhas });
stage('fixture', { req_a: reqA, req_b: reqB, resp_id: respId, links: 3, audit_linhas: nAudit[0].n });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'S19_MINT_PAROU' : 'S19_MINT_OK');
if (falhas.length) process.exit(1);