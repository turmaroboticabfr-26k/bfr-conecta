#!/usr/bin/env node
// Sonda só-leitura que resolve a CONTRADIÇÃO entre duas leituras do mesmo nome tiradas neste ciclo:
//   preflight 17:04  → GET /rpc/bfr_municipal_network_totals com a chave anónima = 200, 1 linha, 59 B
//   catálogo   17:3x → mesmo GET, mesmo host, mesma chave = 404 {"error":"requested path is invalid"}
// «404 ≠ 404» e «200 ≠ 200»: antes de escrever o REVOKE tenho de saber o que o nome guarda AGORA.
// Prova autoritativa: a lista de rotas que o próprio PostgREST publica (`GET /` e `GET /openapi.json`)
// com a chave anónima — se a rota não está na lista, o cache do servidor não a expõe a anon; se está,
// o 404 é outra coisa. Também mede o ACL de `bfr_is_platform_admin` (falta na sonda anterior) porque a
// vista chama-a no WHERE e `security_invoker` vai passar a exigir o privilégio do CHAMADOR.
import { readFileSync } from 'node:fs';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(REPO + '/audit-publicacao-v134.json', 'utf8')) || [])[0];
const shell = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shell) || [])[1];
const NOME = 'bfr_municipal_network_totals';
const BASE = HOST + '/rest/v1';
const CAMINHO = '/rpc/' + NOME;
const GET_REST = BASE + CAMINHO;
const POST_REST = BASE + CAMINHO;

const cab = (chave) => ({ apikey: anonKey, Authorization: `Bearer ${chave}`, 'content-type': 'application/json', Accept: 'application/json' });
const chamadas = [];
for (let i = 0; i < 3; i++) {
  for (const metodo of ['GET', 'POST']) {
    const r = await fetch(metodo === 'GET' ? GET_REST + '' : POST_REST, { method: metodo, headers: cab(anonKey), body: metodo === 'GET' ? undefined : '{}' });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    chamadas.push({ tentativa: i + 1, metodo, status: r.status, bytes: Buffer.byteLength(t), linhas: Array.isArray(j) ? j.length : null, colunas: Array.isArray(j) && j[0] ? Object.keys(j[0]) : null, corpo: t.slice(0, 200) });
  }
  await new Promise((s) => setTimeout(s, 1200));
}
// fixture que PROVA que a régua dispara: uma rota que se sabe existir e estar aberta a anon
const fixture = await fetch(BASE + '/bfr_municipal_access_grants?select=id&limit=1', { headers: cab(anonKey) });
const fixtureCorpo = await fixture.text();
chamadas.push({ fixture_que_deve_disparar: '/rest/v1/bfr_municipal_access_grants', status: fixture.status, bytes: Buffer.byteLength(fixtureCorpo), corpo: fixtureCorpo.slice(0, 120) });

// lista de rotas publicada pelo próprio servidor, anónima
const raizes = [];
for (const caminho of ['/', '/openapi.json']) {
  const r = await fetch(BASE + caminho, { headers: cab(anonKey) });
  const t = await r.text();
  let listaRpc = null, contem = null, tem = null;
  try {
    const j = JSON.parse(t);
    const chaves = j.paths ? Object.keys(j.paths) : Object.keys(j);
    listaRpc = chaves.filter((x) => x.startsWith('/rpc/'));
    contem = chaves.filter((x) => /municipal/i.test(x));
    tem = listaRpc ? listaRpc.includes(CAMINHO) : null;
  } catch (e) { tem = null; }
  raizes.push({ caminho: BASE + caminho, status: r.status, bytes: Buffer.byteLength(t), total_rpcs: listaRpc ? listaRpc.length : null, total_rotas: contem ? contem.length + listaRpc.length : null, rpc_municipais_na_lista: contem ? contem.filter((x) => x.startsWith('/rpc/')) : null, contem_a_rota_alvo: tem });
}

// o que o catálogo diz das 8 funções municipais + as duas chamadas dentro do WHERE da vista
const acl = await sql(`select p.proname, pg_get_function_arguments(p.oid) as args, array_to_string(p.proacl,' | ') as acl,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec, has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in ('bfr_is_platform_admin','bfr_school_in_municipal_scope','${NOME}','bfr_has_municipal_grant') order by 1`);

// reler o registo do preflight: exactamente que chamada produziu o 200
const pre = JSON.parse(readFileSync(REPO + '/evidence/sm23-preflight-ddl-18-11.json', 'utf8'));
const registo = JSON.stringify(pre.funcoes.probe.find((x) => x.nome === NOME));

// e com sessão autenticada real (developer), para saber se o 404 é só do papel anon
const s = JSON.parse(readFileSync(FORA + '/ah2-sessions.json', 'utf8'));
let comSessao = null;
try {
  const p = s.developer;
  let access = p.access_token;
  if (Number(p.expires_at) * 1000 <= Date.now() + 30_000) {
    const rr = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: p.refresh_token }) });
    access = (await rr.json()).access_token;
  }
  const r1 = await fetch(BASE + CAMINHO, { method: 'POST', headers: cab(access), body: '{}' });
  const t1 = await r1.text();
  const r2 = await fetch(BASE + '/bfr_municipal_school_stats?select=school_id,school_name', { headers: { apikey: anonKey, Authorization: `Bearer ${access}`, Accept: 'application/json' } });
  const t2 = await r2.text();
  comSessao = { rpc_developer: { status: r1.status, corpo: t1.slice(0, 200) }, vista_developer: { status: r2.status, bytes: Buffer.byteLength(t2), linhas: JSON.parse(t2).length } };
} catch (e) { comSessao = { erro: String(e.message).slice(0, 160) }; }

console.log(JSON.stringify({ HOST, alvoUrl, anonKey_comprimento: anonKey.length, chamadas_anonimas: chamadas, rotas_publicadas: raizes, acl_catalogo: acl, registo_do_preflight: registo, com_sessao: comSessao }, null, 1));
