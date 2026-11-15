// RM-1.8 — prova do chip «Supervisor(a) de ensino» em sessão real no ar (v123).
// OK literal recebido: «executar #1190 mint do chip supervisor de ensino». Escopo: mint de 1 conta
// sintética education_supervisor via Auth Admin API + login real + baseline pré. 0 DDL, 0 deploy,
// 0 linha de produto. A prova do chip no navegador corre em rm18-chip-navegador.mjs; a limpeza em
// rm18-chip-limpeza.mjs. A régua do ar é LIDA de worker-deploy-v123-pdfs/esperado-v123.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const EMAIL = `rm18-supervisor-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
const SESSAO = `${DIR}/rm18-session.json`;
const DIARIO = `${DIR}/bfr-conecta/evidence/rm18-diary.json`;
const ARQUIVO = `${DIR}/bfr-conecta/evidence/rm18-contas-arquivo.json`;

for (const f of [DIARIO, ARQUIVO]) if (existsSync(f)) throw new Error(`ABORTA: ${f} já existe — ciclo sujo`);

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

const diario = { ciclo: 'RM-1.8', ok_literal: 'executar #1190 mint do chip supervisor de ensino', started: new Date().toISOString(), email: EMAIL, stages: {}, escritas_em_tabelas_de_produto: 0 };
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
  body: JSON.stringify({ id: UID, email: EMAIL, password: senha, email_confirm: true, data: { full_name: 'RM18 Supervisor Sintético (apagar)' } }),
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

// ═══ STAGE 3: papel education_supervisor no profile ═══
console.log('\n[S3] role education_supervisor (linha criada pelo mint, via trigger)');
const perfilAntes = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
gate('trigger criou profile (1 linha)', perfilAntes.length, 1);
console.log('  role criado pelo trigger: ' + (perfilAntes[0]?.r ?? 'AUSENTE'));
await sql(`update public.profiles set role='education_supervisor'::account_role, full_name='RM18 Supervisor Sintético' where id='${uid}'::uuid;`);
const perfilDepois = await sql(`select role::text as r from public.profiles where id='${uid}'::uuid;`);
gate('profile role = education_supervisor', perfilDepois[0].r, 'education_supervisor');
diario.stages.perfil = { criado_pelo_trigger: perfilAntes[0]?.r ?? null, depois: perfilDepois[0]?.r };

diario.portoes_parciais = portoes;
diario.falhas_parciais = falhas.slice();
diario.stages.session = { arquivo: 'rm18-session.json', nota: 'tokens só em ficheiro; apagado na limpeza' };
writeFileSync(DIARIO, JSON.stringify(diario, null, 2) + '\n');
writeFileSync(ARQUIVO, JSON.stringify({ ciclo: 'RM-1.8', contas: [{ papel: 'education_supervisor', id: uid, email: EMAIL }], limpeza: 'pendente — falta a etapa do navegador' }, null, 2) + '\n');

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'RM18_PAROU' : 'RM18_MINT_E_BASELINE_OK (seguir para rm18-chip-navegador.mjs)');
if (falhas.length) process.exit(1);
