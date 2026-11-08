// S19-4 — matriz JWT RLS: isolamento por escola, embed sports_schools, insert/update negativos,
// respostas (gaps de policy), staff_schools own_read.
// Autorização: "Prova comportamental S17" (08/11). Nada de DDL, nada de publish.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, jwtFetch, loadSessions, ensureFresh, stage, criarGates } from './s19-lib.mjs';

const F = JSON.parse(readFileSync(`${DIR}/evidence/s19-fixtures.json`, 'utf8'));
const S = loadSessions();
const { gate, resumo } = criarGates();
const testes = [];
const tokens = {};
for (const k of Object.keys(S)) tokens[k] = await ensureFresh(k);

const get = async (chave, query) => jwtFetch(tokens[chave], `/rest/v1/${query}`);
const post = async (chave, tabela, body) => jwtFetch(tokens[chave], `/rest/v1/${tabela}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify(body),
});
const patch = async (chave, query, body) => jwtFetch(tokens[chave], `/rest/v1/${query}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify(body),
});
const ids = j => Array.isArray(j) ? j.map(x => x.id).sort() : null;
const reqBody = (escola, uid, rotulo) => ({
  indicator: `S19 ${rotulo}`, motive: 'S19 matriz', description: 'S19 matriz — apagar',
  questions: [], priority: 'média', status: 'Pendente de resposta',
  created_by: uid, school_id: escola,
});
const respBody = (reqId, uid, rotulo) => ({
  request_id: reqId, round: 1, justification: `S19 ${rotulo}`,
  measures_taken: 'S19', measures_planned: 'S19', responsible_name: `S19 ${rotulo}`, created_by: uid,
});

// ═══════════════════════════════════════════════════════════════
// 1. READS — isolamento por escola
// ═══════════════════════════════════════════════════════════════
console.log('[1] Reads isolation');

const rSec = await get('secretary', 'supervision_requests?select=id,school_id');
testes.push({ nome: 'secretary GET requests', status: rSec.status, ids: ids(rSec.j) });
gate('secretary vê só R_A', ids(rSec.j), [F.req_a]);

const rDir = await get('director', 'supervision_requests?select=id,school_id');
testes.push({ nome: 'director GET requests', status: rDir.status, ids: ids(rDir.j) });
gate('director vê só R_A', ids(rDir.j), [F.req_a]);

const rCoord = await get('coordinator', 'supervision_requests?select=id,school_id');
testes.push({ nome: 'coordinator GET requests', status: rCoord.status, ids: ids(rCoord.j) });
gate('coordinator vê só R_B', ids(rCoord.j), [F.req_b]);

const rSup = await get('supervisor', 'supervision_requests?select=id,school_id');
testes.push({ nome: 'supervisor GET requests', status: rSup.status, ids: ids(rSup.j) });
gate('supervisor vê R_A + R_B', ids(rSup.j), [F.req_a, F.req_b]);

const rSecB = await get('secretary', `supervision_requests?select=id&id=eq.${F.req_b}`);
testes.push({ nome: 'secretary GET R_B por id', status: rSecB.status, ids: ids(rSecB.j) });
gate('secretary não vê R_B por id', ids(rSecB.j), []);

const rCoordA = await get('coordinator', `supervision_requests?select=id&id=eq.${F.req_a}`);
testes.push({ nome: 'coordinator GET R_A por id', status: rCoordA.status, ids: ids(rCoordA.j) });
gate('coordinator não vê R_A por id', ids(rCoordA.j), []);

// ═══════════════════════════════════════════════════════════════
// 2. EMBED sports_schools(name)
// ═══════════════════════════════════════════════════════════════
console.log('[2] Embed sports_schools(name)');

const eDir = await get('director', `supervision_requests?select=id,sports_schools(name)&id=eq.${F.req_a}`);
const nomeDir = Array.isArray(eDir.j) && eDir.j[0]?.sports_schools?.name;
testes.push({ nome: 'director embed', status: eDir.status, nome: nomeDir });
gate('director vê nome da escola no embed', nomeDir, 'Escola Alpha');

const eSup = await get('supervisor', `supervision_requests?select=id,sports_schools(name)&id=eq.${F.req_a}`);
const nomeSup = Array.isArray(eSup.j) && eSup.j[0]?.sports_schools;
testes.push({ nome: 'supervisor embed', status: eSup.status, sports_schools: nomeSup });
gate('supervisor embed → null (gap S18 confirmado)', nomeSup, null);

// ═══════════════════════════════════════════════════════════════
// 3. INSERTS negativos (RLS bloqueia)
// ═══════════════════════════════════════════════════════════════
console.log('[3] Inserts negativos');

const iSecB = await post('secretary', 'supervision_requests', reqBody(F.beta, S.secretary.uid, 'secBeta'));
testes.push({ nome: 'secretary POST → Beta (sem link)', status: iSecB.status, code: iSecB.j?.code });
gate('secretary POST Beta → 403', iSecB.status, 403);

const iCoordA = await post('coordinator', 'supervision_requests', reqBody(F.alpha, S.coordinator.uid, 'coordAlpha'));
testes.push({ nome: 'coordinator POST → Alpha (sem link)', status: iCoordA.status, code: iCoordA.j?.code });
gate('coordinator POST Alpha → 403', iCoordA.status, 403);

const iSecForged = await post('secretary', 'supervision_requests', reqBody(F.alpha, S.director.uid, 'secForged'));
testes.push({ nome: 'secretary POST com created_by=edirector', status: iSecForged.status, code: iSecForged.j?.code });
gate('secretary POST com created_by forjado → 403', iSecForged.status, 403);

// ═══════════════════════════════════════════════════════════════
// 4. INSERTS positivos (inclui R_A2 do director para limpeza)
// ═══════════════════════════════════════════════════════════════
console.log('[4] Inserts positivos');

const iDirA = await post('director', 'supervision_requests', reqBody(F.alpha, S.director.uid, 'dirAlpha'));
testes.push({ nome: 'director POST → Alpha (link próprio)', status: iDirA.status, id: iDirA.j?.[0]?.id });
gate('director POST Alpha → 201', iDirA.status, 201);
const reqA2 = iDirA.j?.[0]?.id;

// ═══════════════════════════════════════════════════════════════
// 5. RESPOSTAS — gaps de policy
// ═══════════════════════════════════════════════════════════════
console.log('[5] Respostas');

const rCoordRespA = await post('coordinator', 'supervision_responses', respBody(F.req_a, S.coordinator.uid, 'coordRespA'));
testes.push({ nome: 'coordinator POST resposta em R_A (Alpha, sem link)', status: rCoordRespA.status, id: rCoordRespA.j?.[0]?.id });
gate('coordinator responde R_A → 201 (gap: sem filtro de escola)', rCoordRespA.status, 201);
const respCoordA = rCoordRespA.j?.[0]?.id;

const rSecResp = await post('secretary', 'supervision_responses', respBody(F.req_a, S.secretary.uid, 'secResp'));
testes.push({ nome: 'secretary POST resposta', status: rSecResp.status, code: rSecResp.j?.code });
gate('secretary NÃO insere resposta → 403', rSecResp.status, 403);

const rSupResp = await post('supervisor', 'supervision_responses', respBody(F.req_a, S.supervisor.uid, 'supResp'));
testes.push({ nome: 'supervisor POST resposta', status: rSupResp.status, code: rSupResp.j?.code });
gate('supervisor NÃO insere resposta → 403', rSupResp.status, 403);

const rSupGet = await get('supervisor', 'supervision_responses?select=id');
testes.push({ nome: 'supervisor GET respostas', status: rSupGet.status, count: Array.isArray(rSupGet.j) ? rSupGet.j.length : null });
gate('supervisor NÃO lê respostas → 200 [] (gap: sem read policy)', Array.isArray(rSupGet.j) ? rSupGet.j.length : -1, 0);

const rDirGet = await get('director', 'supervision_responses?select=id');
const nDirResp = Array.isArray(rDirGet.j) ? rDirGet.j.length : -1;
testes.push({ nome: 'director GET respostas', status: rDirGet.status, count: nDirResp });
gate('director vê 3 respostas (sem filtro de escola)', nDirResp, 3);

const rCoordGet = await get('coordinator', 'supervision_responses?select=id');
const nCoordResp = Array.isArray(rCoordGet.j) ? rCoordGet.j.length : -1;
testes.push({ nome: 'coordinator GET respostas', status: rCoordGet.status, count: nCoordResp });
gate('coordinator vê 3 respostas (gap: sem filtro de escola)', nCoordResp, 3);

// ═══════════════════════════════════════════════════════════════
// 6. UPDATES — isolamento
// ═══════════════════════════════════════════════════════════════
console.log('[6] Updates');

const uSecA = await patch('secretary', `supervision_requests?id=eq.${F.req_a}`, { description: 'S19 editado pela secretaria' });
testes.push({ nome: 'secretary PATCH R_A (link)', status: uSecA.status, count: Array.isArray(uSecA.j) ? uSecA.j.length : null });
gate('secretary atualiza R_A → 200 1 linha', Array.isArray(uSecA.j) ? uSecA.j.length : -1, 1);

const uSecB = await patch('secretary', `supervision_requests?id=eq.${F.req_b}`, { description: 'S19 secretaria em Beta' });
testes.push({ nome: 'secretary PATCH R_B (sem link)', status: uSecB.status, count: Array.isArray(uSecB.j) ? uSecB.j.length : null });
gate('secretary NÃO atualiza R_B → 200 []', Array.isArray(uSecB.j) ? uSecB.j.length : -1, 0);

const uDirA = await patch('director', `supervision_requests?id=eq.${F.req_a}`, { description: 'S19 director em Alpha' });
testes.push({ nome: 'director PATCH R_A', status: uDirA.status, count: Array.isArray(uDirA.j) ? uDirA.j.length : null });
gate('director NÃO atualiza requests → 200 [] (sem update policy)', Array.isArray(uDirA.j) ? uDirA.j.length : -1, 0);

const uCoordB = await patch('coordinator', `supervision_requests?id=eq.${F.req_b}`, { description: 'S19 coord em Beta' });
testes.push({ nome: 'coordinator PATCH R_B', status: uCoordB.status, count: Array.isArray(uCoordB.j) ? uCoordB.j.length : null });
gate('coordinator NÃO atualiza requests → 200 []', Array.isArray(uCoordB.j) ? uCoordB.j.length : -1, 0);

const uSupB = await patch('supervisor', `supervision_requests?id=eq.${F.req_b}`, { priority: 'alta' });
testes.push({ nome: 'supervisor PATCH R_B', status: uSupB.status, count: Array.isArray(uSupB.j) ? uSupB.j.length : null });
gate('supervisor atualiza R_B → 200 1 linha', Array.isArray(uSupB.j) ? uSupB.j.length : -1, 1);

// ═══════════════════════════════════════════════════════════════
// 7. staff_schools own_read
// ═══════════════════════════════════════════════════════════════
console.log('[7] staff_schools own_read');

const ssSec = await get('secretary', 'staff_schools?select=id,school_id,role');
testes.push({ nome: 'secretary own_read staff_schools', status: ssSec.status, count: Array.isArray(ssSec.j) ? ssSec.j.length : null, data: ssSec.j });
gate('secretary vê só o próprio vínculo (1 linha)', Array.isArray(ssSec.j) ? ssSec.j.length : -1, 1);

const ssSup = await get('supervisor', 'staff_schools?select=id');
testes.push({ nome: 'supervisor own_read staff_schools', status: ssSup.status, count: Array.isArray(ssSup.j) ? ssSup.j.length : null });
gate('supervisor não tem own_read → 0 linhas', Array.isArray(ssSup.j) ? ssSup.j.length : -1, 0);

// ═══════════════════════════════════════════════════════════════
// 8. Conferência SQL (verdade do banco, independente do RLS)
// ═══════════════════════════════════════════════════════════════
console.log('[8] Conferência SQL');
const sqlR = await sql(`select id::text, status, priority, description from public.supervision_requests where id in ('${F.req_a}','${F.req_b}'${reqA2 ? `,'${reqA2}'` : ''}) order by id;`);
const sqlResp = await sql(`select id::text, request_id::text from public.supervision_responses where id in ('${F.resp_id}'${respCoordA ? `,'${respCoordA}'` : ''}) order by id;`);
testes.push({ nome: 'SQL requests', rows: sqlR });
testes.push({ nome: 'SQL responses', rows: sqlResp });
gate('R_A status Respondida (trigger notify)', sqlR.find(r => r.id === F.req_a)?.status, 'Respondida');
gate('R_B priority alta (update supervisor)', sqlR.find(r => r.id === F.req_b)?.priority, 'alta');
gate('R_A description atualizada (update secretary)', sqlR.find(r => r.id === F.req_a)?.description, 'S19 editado pela secretaria');
gate('3 requests no total (R_A, R_B, R_A2)', sqlR.length, 3);
gate('2 responses no total', sqlResp.length, 2);

// ═══════════════════════════════════════════════════════════════
// Persistência
// ═══════════════════════════════════════════════════════════════
const { portoes, falhas } = resumo();
const gaps = [
  'supervisor embed sports_schools null (RLS sports_schools_read não inclui education_supervisor)',
  'supervisor não lê supervision_responses (sem read policy)',
  'supervisor não insere supervision_responses (sem insert policy)',
  'coordinator responde R_A sem filtro de escola (responses insert sem filtro)',
  'coordinator/director/secretary veem todas as responses (responses read sem filtro)',
  'director/coordinator não atualizam supervision_requests (sem update policy)',
];
const idsCriados = { req_a2: reqA2, resp_coord_a: respCoordA };
writeFileSync(`${DIR}/evidence/s19-matrix-ids.json`, JSON.stringify({ ciclo: 'S19', ids: idsCriados }, null, 2) + '\n');
stage('matrix', { testes, portoes, falhas, gaps, ids_criados: idsCriados });

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'S19_MATRIX_PAROU' : 'S19_MATRIX_OK');
if (falhas.length) process.exit(1);