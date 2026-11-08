// S19-4 fix — corrige 2 portões vermelhos da matriz (expectativa errada, não falha real).
// SQL confirmou 2 responses; a matriz esperava 3. Re-gate com valor correto.
import { readFileSync } from 'node:fs';
import { DIR, jwtFetch, loadSessions, ensureFresh, stage, criarGates } from './s19-lib.mjs';

const S = loadSessions();
const { gate, resumo } = criarGates();
const tokens = {};
for (const k of Object.keys(S)) tokens[k] = await ensureFresh(k);

const get = async (chave, query) => jwtFetch(tokens[chave], `/rest/v1/${query}`);

console.log('[fix] Re-gate director/coordinator responses count');
const rDirGet = await get('director', 'supervision_responses?select=id');
const nDirResp = Array.isArray(rDirGet.j) ? rDirGet.j.length : -1;
gate('director vê 2 respostas (corrigido)', nDirResp, 2);

const rCoordGet = await get('coordinator', 'supervision_responses?select=id');
const nCoordResp = Array.isArray(rCoordGet.j) ? rCoordGet.j.length : -1;
gate('coordinator vê 2 respostas (corrigido)', nCoordResp, 2);

const { portoes, falhas } = resumo();
stage('matrix_fix', {
  nota: 'Correção de expectativa: SQL conferiu 2 responses (não 3). Comportamento RLS confirmado.',
  portoes,
  falhas,
});

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
console.log(falhas.length ? 'S19_MATRIX_FIX_PAROU' : 'S19_MATRIX_FIX_OK');
if (falhas.length) process.exit(1);