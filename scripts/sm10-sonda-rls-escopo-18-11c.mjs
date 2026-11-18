// sm10c — re-sonda pós-GRANT (18/11): os mesmos 4 papéis da sm10/sm10b, agora com contagem de
// linhas para provar que o RLS devolve linhas filtradas (e não só «sem erro»). SÓ LEITURA.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const RAIZ = `${DIR}/bfr-conecta`;
const HOST = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const OUT = `${RAIZ}/evidence/sm10-sonda-rls-escopo-18-11c.json`;
if (existsSync(OUT)) { console.log('VERMELHO  já existe ' + OUT); process.exit(1); }

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const md5 = (b) => createHash('md5').update(b).digest('hex');

const diario = {
  programa: 'sm10c-sonda-rls-escopo-18-11', em: new Date().toISOString(),
  natureza: 'SOMENTE_LEITURA', escrita_no_banco: false,
  instrumento_md5: md5(readFileSync(new URL(import.meta.url), 'utf8')),
  utilizadores: {}, veredito: '', falhas: [],
};

async function get(token, path, init = {}) {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const j = await r.json().catch(() => null);
  return { status: r.status, corpo: j };
}

async function refreshDe(ficheiro, chave) {
  const sess = JSON.parse(readFileSync(ficheiro, 'utf8'));
  const s = sess[chave];
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (r.status !== 200) throw new Error(`refresh ${chave} ${r.status}`);
  const j = await r.json();
  sess[chave] = { ...s, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, refreshed_em: new Date().toISOString() };
  writeFileSync(ficheiro, JSON.stringify(sess, null, 2) + '\n');
  return j.access_token;
}

const sm8 = JSON.parse(readFileSync(`${DIR}/sm8-municipal-sessions.json`, 'utf8'));
const ah2 = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const utilizadores = {
  secretario_municipal: sm8.secretario_municipal.access_token,
  pedagogical: ah2.pedagogical.access_token,
  education_supervisor: ah2.education_supervisor.access_token,
  secretary: ah2.secretary.access_token,
};

for (const [rotulo, token] of Object.entries(utilizadores)) {
  const m = {};
  for (const tabela of ['students', 'classes', 'supervision_requests']) {
    const r = await get(token, `/rest/v1/${tabela}?select=id&limit=1`);
    m[`select_${tabela}`] = { status: r.status, linhas: Array.isArray(r.corpo) ? r.corpo.length : null, message: String(r.corpo?.message || '') };
  }
  const vista = await get(token, '/rest/v1/bfr_municipal_school_stats?select=school_id&limit=1');
  m.vista_estatisticas = { status: vista.status, linhas: Array.isArray(vista.corpo) ? vista.corpo.length : null, message: String(vista.corpo?.message || '') };
  const rpc = await get(token, '/rest/v1/rpc/bfr_school_in_municipal_scope', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_school: '08ebef62-2193-4520-ab44-c044160d565f' }),
  });
  m.rpc_escopo = { status: rpc.status, corpo: rpc.corpo };
  diario.utilizadores[rotulo] = m;
}

const falhas = Object.entries(diario.utilizadores).flatMap(([r, v]) =>
  Object.entries(v).filter(([, x]) => x.status !== 200).map(([k, x]) => `${r}.${k}:${x.status} ${x.message}`));
diario.falhas = falhas;
diario.veredito = falhas.length ? 'SELECts_POS_GRANT_COM_FALHA' : 'SELECts_POS_GRANT_TODOS_200';

writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(diario.veredito);
console.log(JSON.stringify(diario.utilizadores, null, 1));
