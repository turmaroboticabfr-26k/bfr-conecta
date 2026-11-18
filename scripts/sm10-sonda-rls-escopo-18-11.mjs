// sm10 — sonda READ-ONLY do efeito das políticas RLS municipais sobre as tabelas de toda a app.
// Motivo: o sm7 390 de 18/11 mediu «permission denied for function bfr_school_in_municipal_scope»
// no painel do módulo. As políticas de students/classes/supervision_requests (sm4) avaliam os
// predicados com os privilégios do chamador; o sm4 fez REVOKE ALL FROM PUBLIC. Esta sonda prova,
// com JWT reais de 4 papéis, quais SELECTs passaram a falhar — e quais continuam a funcionar
// (vista agregada = dono, service-role = bypass de RLS). Não escreve nada no banco; só lê.
// Pode reescrever os ficheiros de sessão FORA do repo se precisar de refresh (padrão sm8).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const RAIZ = `${DIR}/bfr-conecta`;
const HOST = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const OUT = `${RAIZ}/evidence/sm10-sonda-rls-escopo-18-11.json`;
if (existsSync(OUT)) { console.log('VERMELHO  já existe ' + OUT); process.exit(1); }

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const md5 = (b) => createHash('md5').update(b).digest('hex');

const sessFiles = {
  secretario_municipal: { ficheiro: `${DIR}/sm8-municipal-sessions.json`, chave: 'secretario_municipal' },
  pedagogical: { ficheiro: `${DIR}/ah2-sessions.json`, chave: 'pedagogical' },
  education_supervisor: { ficheiro: `${DIR}/ah2-sessions.json`, chave: 'education_supervisor' },
  secretary: { ficheiro: `${DIR}/ah2-sessions.json`, chave: 'secretary' },
};

const diario = {
  programa: 'sm10-sonda-rls-escopo-18-11', em: new Date().toISOString(),
  natureza: 'SOMENTE_LEITURA', escrita_no_banco: false,
  instrumento_md5: md5(readFileSync(new URL(import.meta.url), 'utf8')),
  controlo: null, utilizadores: {}, veredito: '', falhas: [],
};

async function get(token, path, init = {}) {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const j = await r.json().catch(() => null);
  return { status: r.status, corpo: j };
}

async function refresh(rotulo) {
  const cfg = sessFiles[rotulo];
  const sess = JSON.parse(readFileSync(cfg.ficheiro, 'utf8'));
  const s = sess[cfg.chave];
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (r.status !== 200) return { ok: false, status: r.status };
  const j = await r.json();
  sess[cfg.chave] = { ...s, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, refreshed_em: new Date().toISOString() };
  writeFileSync(cfg.ficheiro, JSON.stringify(sess, null, 2) + '\n');
  return { ok: true, access_token: j.access_token };
}

const tokenDe = (rotulo) => JSON.parse(readFileSync(sessFiles[rotulo].ficheiro, 'utf8'))[sessFiles[rotulo].chave].access_token;

async function probe(rotulo, token) {
  const linhas = {};
  for (const tabela of ['students', 'classes', 'supervision_requests']) {
    const r1 = await get(token, `/rest/v1/${tabela}?select=id&limit=1`);
    if (r1.status === 401 && String(r1.corpo?.message || '').includes('JWT expired')) {
      const f = await refresh(rotulo);
      if (f.ok) { const r2 = await get(f.access_token, `/rest/v1/${tabela}?select=id&limit=1`); linhas[`select_${tabela}`] = r2.status; continue; }
    }
    linhas[`select_${tabela}`] = r1.status;
  }
  return linhas;
}

// id de escola real para a sonda RPC (só leitura, via service-role).
const escolas = await get(serviceKey, '/rest/v1/schools?select=id&limit=1');
const escolaId = escolas.corpo?.[0]?.id || null;
diario.controlo = { service_role_select_students: (await get(serviceKey, '/rest/v1/students?select=id&limit=1')).status, escola_sonda: escolaId };

for (const rotulo of Object.keys(sessFiles)) {
  const token = tokenDe(rotulo);
  const linhas = await probe(rotulo, token);
  const rpc = await get(token, '/rest/v1/rpc/bfr_school_in_municipal_scope', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_school: escolaId }),
  });
  const vista = await get(token, '/rest/v1/bfr_municipal_school_stats?select=school_id&limit=1');
  const sonda = await get(token, '/rest/v1/rpc/bfr_is_municipal_authority', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  diario.utilizadores[rotulo] = {
    ...linhas,
    rpc_escopo: { status: rpc.status, mensagem: String(rpc.corpo?.message || rpc.corpo?.hint || '') },
    vista_estatisticas: { status: vista.status, linhas: Array.isArray(vista.corpo) ? vista.corpo.length : null },
    sonda_autoridade: { status: sonda.status, corpo: sonda.corpo },
  };
  const tok2 = tokenDe(rotulo); // pode ter sido reescrito pelo refresh — não guardamos token no artefacto
  diario.utilizadores[rotulo].sessao_viva = tok2.length > 20;
}

const quebras = Object.entries(diario.utilizadores)
  .filter(([, v]) => v.select_students !== 200 || v.select_classes !== 200 || v.select_supervision_requests !== 200)
  .map(([r, v]) => `${r}:${v.select_students}/${v.select_classes}/${v.select_supervision_requests}`);
diario.falhas = quebras.length ? [`SELECTs de tabelas com política municipal falharam para: ${quebras.join(' ')}`] : [];
diario.veredito = quebras.length ? 'RLS_MUNICIPAL_QUEBRA_SELECTS_AUTENTICADOS' : 'RLS_MUNICIPAL_SEM_QUEBRA';

writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
const resumo = Object.fromEntries(Object.entries(diario.utilizadores).map(([r, v]) => [r, {
  select_students: v.select_students, select_classes: v.select_classes, select_supervision_requests: v.select_supervision_requests,
  rpc_escopo_status: v.rpc_escopo.status, vista_status: v.vista_estatisticas.status, vista_linhas: v.vista_estatisticas.linhas,
  sonda_autoridade: v.sonda_autoridade.corpo,
}]));
console.log(diario.veredito, JSON.stringify({ controlo: diario.controlo, utilizadores: resumo }));
