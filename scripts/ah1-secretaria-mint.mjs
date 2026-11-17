// AH-1-M — mint de 1 conta test secretary + baseline pré, para o ciclo autenticado da aba Secretaria.
// Autorização: «finalize 100 % utilizando uma conta test se for preciso» (17/11). Escopo: mint de 1
// conta sintética secretary via Auth Admin API + login real + papel no profile + 1 vínculo staff_schools
// de fixture. 0 DDL, 0 deploy, 0 linha de produto além da fixture declarada (removida na limpeza).
// A régua do ar é LIDA de worker-deploy-v123-pdfs/esperado-v123.json; o ar é conferido ANTES de mintar.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const EMAIL = `ah1-secretaria-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
const SESSAO = `${DIR}/ah1-session.json`;
const DIARIO = `${DIR}/bfr-conecta/evidence/ah1-secretaria-diary-17-11.json`;
const ARQUIVO = `${DIR}/bfr-conecta/evidence/ah1-secretaria-contas-17-11.json`;
const SCHOOL = '08ebef62-2193-4520-ab44-c044160d565f'; // Escola Municipal Alpha

for (const f of [DIARIO, ARQUIVO]) if (existsSync(f)) throw new Error(`ABORTA: ${f} já existe — ciclo sujo`);
if (existsSync(SESSAO)) throw new Error(`ABORTA: ${SESSAO} já existe — ciclo sujo`);

const regua = JSON.parse(readFileSync(`${DIR}/bfr-conecta/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 400)}`);
  return JSON.parse(t);
};
const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

const diario = { ciclo: 'AH-1', ok_literal: 'finalize 100 % utilizando uma conta test se for preciso', started: new Date().toISOString(), email: EMAIL, stages: {}, escritas_em_tabelas_de_produto: 0 };
const falhas = [];
let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

// ═══ STAGE 1: ar + baseline pré ═══
console.log('\n[S1] ar e baseline');
const shellTxt = await (await fetch(AR, { headers: { 'Cache-Control': 'no-cache' } })).text();
const md5 = createHash('md5').update(shellTxt).digest('hex');
gate('ar = v123 (md5 da régua)', md5, regua.htmlMd5);
gate('ar = v123 (bytes da régua)', Buffer.byteLength(shellTxt), regua.htmlBytes);
if (md5 !== regua.htmlMd5) throw new Error('ABORTA: o ar mudou desde a régua v123 — re-preflight antes de mintar');

const tabelas = ['auth.users', 'public.profiles', 'public.staff_schools', 'public.sports_schools', 'public.supervision_requests', 'public.supervision_audit'];
const baseline = {};
for (const t of tabelas) {
  const rows = await sql(`select count(*)::int as n from ${t};`);
  const hash = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from ${t}) x;`);
  baseline[t] = { n: rows[0].n, md5: hash[0].h || 'empty' };
}
diario.stages.baseline = { em: new Date().toISOString(), tabelas: baseline };
console.log('  ' + tabelas.map(t => `${t.split('.').pop()}=${baseline[t].n}`).join(' · '));
gate('supervision_requests vazio no ar (0 linhas)', baseline['public.supervision_requests'].n, 0);
gate('email não existe no auth', (await sql(`select count(*)::int as n from auth.users where email='${EMAIL}';`))[0].n, 0);

// ═══ STAGE 2: mint via Auth Admin API + login real ═══
console.log('\n[S2] mint + login');
const senha = randomBytes(18).toString('base64url');
const UID = randomUUID();
const criado = await admin('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({ id: UID, email: EMAIL, password: senha, email_confirm: true, data: { full_name: 'AH1 Secretaria Sintética (apagar)' } }),
});
if (![200, 201].includes(criado.status)) throw new Error(`mint HTTP ${criado.status}: ${JSON.stringify(criado.j).slice(0, 240)}`);
const uid = criado.j?.id || criado.j?.user?.id || UID;
console.log('  conta criada: ' + uid);

const tok = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: senha }) });
if (!tok.j?.access_token) throw new Error(`login falhou HTTP ${tok.status}: ${JSON.stringify(tok.j).slice(0, 240)}`);
const accessToken = tok.j.access_token;
writeFileSync(SESSAO, JSON.stringify({
  id: uid, email: EMAIL, access_token: accessToken, refresh_token: tok.j.refresh_token,
  expires_at: tok.j.expires_at, user: tok.j.user,
}, null, 2) + '\n');
gate('GoTrue reconhece a conta (login 200 + access_token)', [tok.status, typeof accessToken, accessToken.length > 100], [200, 'string', true]);
diario.stages.mint = { em: new Date().toISOString(), uid, http_mint: criado.status, http_login: tok.status, exp: tok.j.expires_at };

// ═══ STAGE 3: papel secretary no profile + vínculo staff_schools (fixture) ═══
console.log('\n[S3] role secretary + vínculo staff_schools');
const perfilAntes = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
gate('trigger criou profile (1 linha)', perfilAntes.length, 1);
console.log('  role criado pelo trigger: ' + (perfilAntes[0]?.r ?? 'AUSENTE'));
await sql(`update public.profiles set role='secretary'::account_role, full_name='AH1 Secretaria Sintética' where id='${uid}'::uuid;`);
const perfilDepois = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
gate('profile role = secretary', perfilDepois[0].r, 'secretary');
diario.stages.perfil = { criado_pelo_trigger: perfilAntes[0]?.r ?? null, depois: perfilDepois[0]?.r };

const linkId = randomUUID();
await sql(`insert into public.staff_schools (id, profile_id, school_id, role) values ('${linkId}', '${uid}'::uuid, '${SCHOOL}'::uuid, 'secretary');`);
const link = await sql(`select count(*)::int as n from public.staff_schools where id='${linkId}' and profile_id='${uid}'::uuid and school_id='${SCHOOL}'::uuid;`);
gate('vínculo staff_schools criado (fixture 1 linha)', link[0].n, 1);
diario.stages.fixture = { staff_schools_id: linkId, school: SCHOOL, nota: 'fixture do ciclo — removida na limpeza AH-1-L' };
diario.escritas_em_tabelas_de_produto = 1; // só o vínculo de fixture, declarado e removível

diario.portoes_parciais = portoes;
diario.falhas_parciais = falhas.slice();
diario.stages.session = { arquivo: 'ah1-session.json', nota: 'tokens só em ficheiro; apagado na limpeza' };
writeFileSync(DIARIO, JSON.stringify(diario, null, 2) + '\n');
writeFileSync(ARQUIVO, JSON.stringify({ ciclo: 'AH-1', contas: [{ papel: 'secretary', id: uid, email: EMAIL, staff_schools_id: linkId, school: SCHOOL }], limpeza: 'pendente — falta a etapa do navegador' }, null, 2) + '\n');

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'AH1_PAROU' : 'AH1_MINT_E_BASELINE_OK (seguir para ah1-secretaria-navegador.mjs)');
if (falhas.length) process.exit(1);
