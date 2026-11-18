// sm10b — seguimento da sm10: mensagens de erro completas (a sm10 guardou só status) e
// re-sonda do secretary com refresh (a sessão expirou a meio da sm10). SÓ LEITURA.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const RAIZ = `${DIR}/bfr-conecta`;
const HOST = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const OUT = `${RAIZ}/evidence/sm10-sonda-rls-escopo-18-11b.json`;
if (existsSync(OUT)) { console.log('VERMELHO  já existe ' + OUT); process.exit(1); }

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const md5 = (b) => createHash('md5').update(b).digest('hex');

const diario = {
  programa: 'sm10b-sonda-rls-escopo-18-11', em: new Date().toISOString(),
  natureza: 'SOMENTE_LEITURA', escrita_no_banco: false,
  instrumento_md5: md5(readFileSync(new URL(import.meta.url), 'utf8')),
  mensagens: {},
};

async function get(token, path, init = {}) {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const j = await r.json().catch(() => null);
  return { status: r.status, corpo: j };
}

async function refreshSecretary() {
  const ficheiro = `${DIR}/ah2-sessions.json`;
  const sess = JSON.parse(readFileSync(ficheiro, 'utf8'));
  const s = sess.secretary;
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (r.status !== 200) throw new Error('refresh secretary ' + r.status);
  const j = await r.json();
  sess.secretary = { ...s, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, refreshed_em: new Date().toISOString() };
  writeFileSync(ficheiro, JSON.stringify(sess, null, 2) + '\n');
  return j.access_token;
}

const sessMunicipal = JSON.parse(readFileSync(`${DIR}/sm8-municipal-sessions.json`, 'utf8')).secretario_municipal;
const sessAh2 = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const utilizadores = {
  secretario_municipal: sessMunicipal.access_token,
  pedagogical: sessAh2.pedagogical.access_token,
  secretary: await refreshSecretary(),
};

for (const [rotulo, token] of Object.entries(utilizadores)) {
  const m = {};
  for (const tabela of ['students', 'classes', 'supervision_requests']) {
    const r = await get(token, `/rest/v1/${tabela}?select=id&limit=1`);
    m[`select_${tabela}`] = { status: r.status, message: String(r.corpo?.message || ''), code: r.corpo?.code || null };
  }
  const vista = await get(token, '/rest/v1/bfr_municipal_school_stats?select=school_id&limit=1');
  m.vista_estatisticas = { status: vista.status, message: String(vista.corpo?.message || ''), code: vista.corpo?.code || null, linhas: Array.isArray(vista.corpo) ? vista.corpo.length : null };
  const rpc = await get(token, '/rest/v1/rpc/bfr_school_in_municipal_scope', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_school: '08ebef62-2193-4520-ab44-c044160d565f' }),
  });
  m.rpc_escopo = { status: rpc.status, message: String(rpc.corpo?.message || ''), code: rpc.corpo?.code || null };
  diario.mensagens[rotulo] = m;
}

writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(JSON.stringify(diario.mensagens, null, 1));
