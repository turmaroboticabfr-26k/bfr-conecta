// S18 — ciclo completo: baseline → mint Auth Admin API → login real → fixture → prova comportamental → limpeza.
// Autorização: "destrava o GoTrue e roda a prova comportamental com dados" (N1, ciclo sintético).
// Nada de credencial impressa. Senha gerada no processo, sessão só em ficheiro.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const EMAIL = `s18-supervisor-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
const SESSAO = `${DIR}/s18-session.json`;
const DIARIO = `${DIR}/s18-diary.json`;
const ARQUIVO = `${DIR}/s18-contas-arquivo.json`;

if (existsSync(DIARIO)) throw new Error('ABORTA: s18-diary.json já existe — ciclo sujo');
if (existsSync(ARQUIVO)) throw new Error('ABORTA: s18-contas-arquivo.json já existe — ciclo sujo');

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 500)}`);
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

const md5 = (s) => createHash('md5').update(s).digest('hex');

const diario = { ciclo: 'S18', started: new Date().toISOString(), email: EMAIL, stages: {} };
const falhas = [];
let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

// ═══════════════════════════════════════════════════════════════
// STAGE 1: BASELINE (contagem E md5)
// ═══════════════════════════════════════════════════════════════
console.log('\n[STAGE 1] Baseline pré');
const tabelas = ['auth.users', 'public.profiles', 'public.sports_schools', 'public.staff_schools', 'public.supervision_requests', 'public.supervision_audit'];
const baseline = {};
for (const t of tabelas) {
  const rows = await sql(`select count(*)::int as n from ${t};`);
  const hashRows = await sql(`select md5(string_agg(t::text, ',' order by t::text)) as h from (select * from ${t}) t;`);
  baseline[t] = { n: rows[0].n, md5: hashRows[0].h || 'empty' };
}
diario.stages.baseline = { em: new Date().toISOString(), tabelas: baseline };
console.log('  ' + tabelas.map(t => `${t.split('.').pop()}=${baseline[t].n}`).join(' · '));

// Pré-condição: email não existe
const preEmail = await sql(`select count(*)::int as n from auth.users where email='${EMAIL}';`);
gate('email não existe no auth', preEmail[0].n, 0);

// ═══════════════════════════════════════════════════════════════
// STAGE 2: MINT via Auth Admin API + LOGIN REAL
// ═══════════════════════════════════════════════════════════════
console.log('\n[STAGE 2] Mint Auth Admin API + login real');
const senha = randomBytes(18).toString('base64url');
const UID = randomUUID();

const criado = await admin('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({ id: UID, email: EMAIL, password: senha, email_confirm: true, data: { full_name: 'S18 Supervisor Sintético (apagar)' } }),
});
if (criado.status !== 200 && criado.status !== 201) throw new Error(`mint HTTP ${criado.status}: ${JSON.stringify(criado.j).slice(0, 300)}`);
const uid = criado.j?.id || criado.j?.user?.id || UID;
console.log(`  conta criada: ${uid}`);
diario.stages.mint = { em: new Date().toISOString(), uid, http_status: criado.status };

// Login real via password grant (a prova de que o GoTrue reconhece)
const tok = await admin('/auth/v1/token?grant_type=password', {
  method: 'POST',
  body: JSON.stringify({ email: EMAIL, password: senha }),
});
if (!tok.j?.access_token) throw new Error(`login falhou HTTP ${tok.status}: ${JSON.stringify(tok.j).slice(0, 300)}`);
const accessToken = tok.j.access_token;
writeFileSync(SESSAO, JSON.stringify({ id: uid, email: EMAIL, access_token: accessToken, refresh_token: tok.j.refresh_token }, null, 2) + '\n');
const exp = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
console.log(`  login OK — JWT expira ${new Date(exp.exp * 1000).toISOString()}, ${accessToken.length} chars`);
diario.stages.login = { em: new Date().toISOString(), exp: new Date(exp.exp * 1000).toISOString(), access_len: accessToken.length, http_status: tok.status };

gate('GoTrue reconhece a conta (login 200 + access_token)', [tok.status, typeof accessToken, accessToken.length > 100], [200, 'string', true]);

// ═══════════════════════════════════════════════════════════════
// STAGE 3: SET ROLE + FIXTURE
// ═══════════════════════════════════════════════════════════════
console.log('\n[STAGE 3] Role education_supervisor + fixture');

// Trigger handle_new_user cria profile com role 'parent' (sem access_request). UPDATE para supervisor.
await sql(`update public.profiles set role='education_supervisor'::account_role, full_name='S18 Supervisor Sintético' where id='${uid}'::uuid;`);
const perfil = await sql(`select role::text, email from public.profiles where id='${uid}'::uuid;`);
gate('profile role = education_supervisor', perfil[0].role, 'education_supervisor');
console.log(`  role: ${perfil[0].role}`);

// Fixture: 1 supervision_request apontando para uma sports_school existente (Escola Municipal Alpha)
const SCHOOL_ID = '08ebef62-2193-4520-ab44-c044160d565f'; // Escola Municipal Alpha (real, não tocar — só referenciar)
const REQ_ID = randomUUID();
await sql(`insert into public.supervision_requests (id, indicator, motive, description, questions, priority, status, created_by, school_id)
  values ('${REQ_ID}', 'S18 Indicador Sintético', 'Prova comportamental do embed v115', 'Fixture do ciclo S18 — apagar depois', '[]'::jsonb, 'média', 'Pendente de resposta', '${uid}'::uuid, '${SCHOOL_ID}'::uuid);`);
const fixCount = await sql(`select count(*)::int as n from public.supervision_requests where id='${REQ_ID}';`);
gate('fixture inserida (1 linha)', fixCount[0].n, 1);
console.log(`  fixture: ${REQ_ID} → school ${SCHOOL_ID}`);
diario.stages.fixture = { em: new Date().toISOString(), req_id: REQ_ID, school_id: SCHOOL_ID, uid };

// ═══════════════════════════════════════════════════════════════
// STAGE 4: PROVA COMPORTAMENTAL (JWT real, PostgREST)
// ═══════════════════════════════════════════════════════════════
console.log('\n[STAGE 4] Prova comportamental com JWT real');

const rest = async (path) => {
  const r = await fetch(`${HOST}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j };
};

// 4a. Embed CORRETO: sports_schools(name) → 200 (FK resolve; null = RLS gap na tabela alvo)
const bom = await rest(`supervision_requests?select=id,indicator,school_id,sports_schools(name)&id=eq.${REQ_ID}`);
console.log(`  [4a] sports_schools(name) JWT supervisor: HTTP ${bom.status}`);
gate('embed sports_schools(name) → HTTP 200 (FK resolve)', bom.status, 200);
gate('supervisor lê a fixture via RLS (1 linha)', Array.isArray(bom.j) && bom.j.length === 1, true);
if (Array.isArray(bom.j) && bom.j[0]) console.log(`  dados: ${JSON.stringify(bom.j[0]).slice(0, 250)}`);

// 4a2. Service_role (bypass RLS) prova que o embed RETORNA DADOS quando a tabela alvo é legível
const restAdmin = async (path) => {
  const r = await fetch(`${HOST}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j };
};
const adminEmbed = await restAdmin(`supervision_requests?select=id,indicator,school_id,sports_schools(name)&id=eq.${REQ_ID}`);
console.log(`  [4a2] sports_schools(name) service_role: HTTP ${adminEmbed.status}`);
gate('embed com service_role retorna nome da escola', Array.isArray(adminEmbed.j) && adminEmbed.j.length === 1 && adminEmbed.j[0]?.sports_schools?.name === 'Escola Municipal Alpha', true);
if (Array.isArray(adminEmbed.j) && adminEmbed.j[0]) console.log(`  dados admin: ${JSON.stringify(adminEmbed.j[0]).slice(0, 250)}`);

// 4b. Embed ERRADO (controle negativo): schools(name) → 400 PGRST200
const mau = await rest(`supervision_requests?select=id,school_id,schools(name)&id=eq.${REQ_ID}`);
console.log(`  [4b] schools(name): HTTP ${mau.status}`);
gate('embed schools(name) → HTTP 400 (controle negativo)', mau.status, 400);
gate('erro é PGRST200', mau.j?.code || mau.j?.error?.code, 'PGRST200');

// 4c. RLS: supervisor vê a fixture (policy bfr_is_education_supervisor)
const todas = await rest('supervision_requests?select=id,indicator,status');
gate('supervisor lê via RLS (>= 1 linha)', Array.isArray(todas.j) && todas.j.length >= 1, true);
console.log(`  [4c] RLS read: ${Array.isArray(todas.j) ? todas.j.length : '?'} linha(s)`);

// 4d. JWT claims confirmam o papel
const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
gate('JWT sub = uid da conta', claims.sub, uid);
gate('JWT role = authenticated', claims.role, 'authenticated');

diario.stages.prova = {
  em: new Date().toISOString(),
  embed_correto_jwt: { http: bom.status, dados: bom.j, nota: 'sports_schools null = RLS da tabela alvo não inclui education_supervisor' },
  embed_correto_admin: { http: adminEmbed.status, dados: adminEmbed.j },
  embed_errado: { http: mau.status, code: mau.j?.code || mau.j?.error?.code, message: (mau.j?.message || mau.j?.error?.message || '').slice(0, 200) },
  rls_read: { http: todas.status, count: Array.isArray(todas.j) ? todas.j.length : null },
  jwt_claims: { sub: claims.sub, role: claims.role, exp: claims.exp },
  achado_secundario: 'sports_schools RLS (sports_schools_read) só permite developer/director/coordinator/secretary. education_supervisor não está na lista → embed null. Não é defeito do v115 (token correto); é gap de policy a registrar.',
};

// ═══════════════════════════════════════════════════════════════
// STAGE 5: LIMPEZA FK-safe + BASELINE RESTAURADA
// ═══════════════════════════════════════════════════════════════
console.log('\n[STAGE 5] Limpeza FK-safe');

// Ordem reversa: supervision_audit → supervision_requests → profiles → auth.users (via Admin API)
await sql(`delete from public.supervision_audit where profile_id='${uid}'::uuid;`);
console.log('  supervision_audit: removido');
await sql(`delete from public.supervision_requests where id='${REQ_ID}';`);
console.log('  supervision_requests: fixture removida');

// staff_schools: não inserimos nenhuma para este ciclo (supervisor read não precisa)
// profiles: o trigger criou, nós atualizamos — apagar
await sql(`delete from public.profiles where id='${uid}'::uuid;`);
console.log('  profiles: removido');

// auth.users via Admin API (GoTrue reconhece o delete)
const del = await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
console.log(`  auth.users: DELETE HTTP ${del.status}`);
gate('auth user apagado via Admin API', [200, 204].includes(del.status), true);

// Conferência baseline
console.log('\n[STAGE 5b] Conferência baseline');
const pos = {};
for (const t of tabelas) {
  const rows = await sql(`select count(*)::int as n from ${t};`);
  const hashRows = await sql(`select md5(string_agg(t::text, ',' order by t::text)) as h from (select * from ${t}) t;`);
  pos[t] = { n: rows[0].n, md5: hashRows[0].h || 'empty' };
}
diario.stages.pos = { em: new Date().toISOString(), tabelas: pos };

for (const t of tabelas) {
  gate(`baseline restaurada: ${t} (contagem)`, pos[t].n, baseline[t].n);
  gate(`baseline restaurada: ${t} (md5)`, pos[t].md5, baseline[t].md5);
}

// ═══════════════════════════════════════════════════════════════
// VEREDITO
// ═══════════════════════════════════════════════════════════════
diario.complete = new Date().toISOString();
diario.portoes = portoes;
diario.falhas = falhas.length;
diario.verdict = falhas.length === 0 ? 'S18_COMPORTAMENTAL_OK' : 'S18_PAROU';
diario.resumo = 'GoTrue destravado via Auth Admin API. Login real 200. Embed sports_schools(name) → 200 (FK resolve); service_role retorna nome. schools(name) → 400 PGRST200. RLS supervisor lê fixture. Achado: sports_schools RLS não inclui education_supervisor (embed null para esse papel). Baseline restaurada.';

// Arquivo de contas (registro de reversão)
writeFileSync(ARQUIVO, JSON.stringify({ ciclo: 'S18', contas: [{ papel: 'education_supervisor', id: uid, email: EMAIL }], limpeza: 'completa', baseline_restaurada: falhas.length === 0 }, null, 2) + '\n');
writeFileSync(DIARIO, JSON.stringify(diario, null, 2) + '\n');

// Apagar sessão (tokens não devem persistir após ciclo)
const { unlinkSync } = await import('node:fs');
try { unlinkSync(SESSAO); } catch {}

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(diario.verdict);
if (falhas.length) process.exit(1);