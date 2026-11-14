// S21 — PEN-31 na v119: mint via Auth Admin API + login real + prova do embed com JWT de supervisor.
// Autorização recebida: «Autorizo o mint via Auth Admin API». 0 DDL, 0 deploy, 0 linha de produto.
// A query sondada é EXTRAÍDA dos bytes publicados da v119 (não dactilografada).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const EMAIL = `s21-supervisor-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
const SESSAO = `${DIR}/s21-session.json`;
const DIARIO = `${DIR}/s21-diary.json`;
const ARQUIVO = `${DIR}/s21-contas-arquivo.json`;

if (existsSync(DIARIO)) throw new Error('ABORTA: s21-diary.json já existe — ciclo sujo');
if (existsSync(ARQUIVO)) throw new Error('ABORTA: s21-contas-arquivo.json já existe — ciclo sujo');

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
const rest = async (path, token) => {
  const r = await fetch(`${HOST}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j, corpo: t.slice(0, 400) };
};

const diario = { ciclo: 'S21', started: new Date().toISOString(), email: EMAIL, stages: {}, escritas_em_tabelas_de_produto: 0 };
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
gate('ar = v119 (md5)', md5, 'a1969cdf023042e7d2a91e7ed9333a05');
gate('ar = v119 (bytes)', Buffer.byteLength(shellTxt), 3489474);

// a consulta da aba, extraída do corpo vivo
const mSel = shellTxt.match(/from\('supervision_requests'\)\.select\('([^']+)'\)/);
if (!mSel) throw new Error('ABORTA: não localizei o select da aba nos bytes do ar');
const SELECT_DO_AR = mSel[1];
console.log('  select do ar: ' + SELECT_DO_AR.slice(0, 160) + '…');
gate('select do ar contém sports_schools(name)', SELECT_DO_AR.includes('sports_schools(name)'), true);
gate('select do ar NÃO contém a forma partida', /(^|,)schools\(name\)/.test(SELECT_DO_AR), false);

const tabelas = ['auth.users', 'public.profiles', 'public.sports_schools', 'public.staff_schools', 'public.supervision_requests', 'public.supervision_audit'];
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
  body: JSON.stringify({ id: UID, email: EMAIL, password: senha, email_confirm: true, data: { full_name: 'S21 Supervisor Sintético (apagar)' } }),
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

// ═══ STAGE 3: papel do supervisor no profile criado pelo próprio mint ═══
console.log('\n[S3] role education_supervisor (linha criada pelo mint, via trigger)');
const perfilAntes = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
gate('trigger criou profile (1 linha)', perfilAntes.length, 1);
console.log('  role criado pelo trigger: ' + (perfilAntes[0]?.r ?? 'AUSENTE'));
await sql(`update public.profiles set role='education_supervisor'::account_role, full_name='S21 Supervisor Sintético' where id='${uid}'::uuid;`);
const perfilDepois = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
gate('profile role = education_supervisor', perfilDepois[0].r, 'education_supervisor');
diario.stages.perfil = { criado_pelo_trigger: perfilAntes[0]?.r ?? null, depois: perfilDepois[0]?.r };

// o oráculo do papel, respondido pelo banco (pode não responder sem JWT — só registo, sem portão)
let oracle;
try { oracle = (await sql(`select public.bfr_is_education_supervisor() as vivo;`))[0]; }
catch (e) { oracle = { erro: String(e.message).slice(0, 160) }; }
console.log('  bfr_is_education_supervisor() como postgres: ' + JSON.stringify(oracle));

// ═══ STAGE 4: prova comportamental do embed com JWT REAL ═══
console.log('\n[S4] embed da aba com JWT de supervisor');
const qBoa = `supervision_requests?select=${encodeURIComponent(SELECT_DO_AR)}&order=created_at.desc&limit=200`;
const boa = await rest(qBoa, accessToken);
console.log(`  [boa] HTTP ${boa.status} corpo=${boa.corpo.slice(0, 120)}`);
gate('consulta EXTRAÍDA do ar → HTTP 200 (não 400)', boa.status, 200);
gate('sem PGRST200 na resposta', JSON.stringify(boa.j).includes('PGRST200'), false);

// controle negativo: a mesma string trocada para a forma partida
const SELECT_PARTIDA = SELECT_DO_AR.replace('sports_schools(name)', 'schools(name)');
const ma = await rest(`supervision_requests?select=${encodeURIComponent(SELECT_PARTIDA)}&limit=5`, accessToken);
console.log(`  [partida] HTTP ${ma.status} ${JSON.stringify(ma.j).slice(0, 160)}`);
gate('controle negativo: forma partida → HTTP 400', ma.status, 400);
gate('controle negativo: erro é PGRST200', JSON.stringify(ma.j).includes('PGRST200'), true);

// RLS: o supervisor lê a tabela (0 linhas no ar, mas sem 403)
gate('RLS: supervisor lê sem 403', [200, 206].includes(boa.status), true);
gate('RLS: 0 linhas visíveis (tabela do ar está vazia)', Array.isArray(boa.j) ? boa.j.length : null, 0);

// service_role: mesma consulta, prova que o plano resolve a FK (0 linhas também)
const adminBoa = await rest(qBoa, serviceKey);
gate('service_role na mesma consulta → HTTP 200', adminBoa.status, 200);

// RLS da sports_schools para ESTE papel — medida pelo REST, não pelo catálogo
const escolaViaJWT = await rest('sports_schools?select=id,name&limit=3', accessToken);
console.log(`  [sports_schools via JWT supervisor] HTTP ${escolaViaJWT.status} linhas=${Array.isArray(escolaViaJWT.j) ? escolaViaJWT.j.length : JSON.stringify(escolaViaJWT.j).slice(0, 120)}`);
gate('supervisor LÊ sports_schools (gap da S18 resolvido)', [escolaViaJWT.status, Array.isArray(escolaViaJWT.j) && escolaViaJWT.j.length > 0], [200, true]);
diario.stages.prova = {
  em: new Date().toISOString(),
  select_extraido_do_ar: SELECT_DO_AR,
  boa: { http: boa.status, corpo: boa.corpo },
  partida: { http: ma.status, corpo: JSON.stringify(ma.j).slice(0, 300) },
  service_role: { http: adminBoa.status, corpo: adminBoa.corpo },
  sports_schools_jwt: { http: escolaViaJWT.status, corpo: escolaViaJWT.corpo },
};

diario.portoes_parciais = portoes;
diario.falhas_parciais = falhas.slice();
diario.stages.session = { arquivo: 's21-session.json', nota: 'tokens só em ficheiro; apagado na limpeza' };
writeFileSync(DIARIO, JSON.stringify(diario, null, 2) + '\n');
writeFileSync(ARQUIVO, JSON.stringify({ ciclo: 'S21', contas: [{ papel: 'education_supervisor', id: uid, email: EMAIL }], limpeza: 'pendente — falta a etapa do navegador' }, null, 2) + '\n');

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'S21_PAROU' : 'S21_MINT_E_PROVA_OK (seguir para o navegador; limpeza em s21-limpeza.mjs)');
if (falhas.length) process.exit(1);
