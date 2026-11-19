#!/usr/bin/env node
// SM.23 — CAUSA (medida, não atribuída) do `developer` ter passado de 6 para 0 linhas na vista
// `bfr_municipal_school_stats` depois do `security_invoker=true`.
// Hipótese a falsificar: «a quebra é do invoker» NÃO basta — o que o invoker faz é deixar de usar os
// privilégios do dono (postgres, BYPASSRLS) e passar a usar os do CHAMADOR. Se o chamador já via 0
// linhas nas cinco tabelas base por RLS própria, então a vista em invoker dá exactamente o que a
// política do banco manda, e o «6 antes» era o salto do RLS pelo dono, não uma funcionalidade perdida.
// Mede therefore, por persona: SELECT direto em cada tabela base, a vista, e os dois RPC. 0 escrita.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-causa-vista-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, não por cima');

const pre = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-aplicacao-view-funcoes-18-11.json'), 'utf8'));
const BASE = ['schools', 'classes', 'students', 'staff_schools', 'bfr_school_key_map'];
const VISTA = 'bfr_municipal_school_stats';
const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
const shell = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shell) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

const fichas = { ...JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8')), ...JSON.parse(readFileSync(join(FORA, 'sm8-municipal-sessions.json'), 'utf8')) };
const PERSONAS = ['developer', 'secretario_municipal', 'gestor_autorizado', 'secretary'];
const tokenVivo = async (nome) => {
  const p = fichas[nome];
  if (!p || !p.access_token) throw new Error('sem ficha');
  if (Number(p.expires_at) * 1000 > Date.now() + 30_000) return p.access_token;
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: p.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new Error('refresh HTTP ' + r.status);
  return j.access_token;
};
const ler = async (cab, path) => {
  const r = await fetch(HOST + '/rest/v1' + path, { headers: cab });
  const t = await r.text();
  let linhas = null, code = null;
  const cr = r.headers.get('content-range');
  const total = cr && /^\d+-\d+\/(\d+|\*)/.test(cr) ? cr.split('/')[1] : null;
  try { const j = JSON.parse(t); if (Array.isArray(j)) linhas = j.length; else if (j && typeof j === 'object') code = j.code || null; } catch {}
  return { status: r.status, linhas, total_ou_estrela: total, code, bytes: Buffer.byteLength(t) };
};
// `Prefer: count=exact` é o que dá o TOTAL filtrado por RLS mesmo com limit=1 — sem isto, «linhas=1»
// seria a minha lente, não o censo.
const cabComContagem = (tk) => ({ apikey: anonKey, Authorization: `Bearer ${tk}`, Accept: 'application/json', Prefer: 'count=exact' });

const porPersona = [];
for (const nome of PERSONAS) {
  const linha = { persona: nome };
  let tk;
  try { tk = await tokenVivo(nome); } catch (e) { linha.erro = String(e.message).slice(0, 120); porPersona.push(linha); continue; }
  for (const t of BASE) linha[t] = await ler(cabComContagem(tk), `/${t}?select=id&limit=1`);
  linha[VISTA] = await ler(cabComContagem(tk), `/${VISTA}?select=school_id&limit=1`);
  linha.rpc_totals = await (async () => { const r = await fetch(HOST + '/rest/v1/rpc/bfr_municipal_network_totals', { method: 'POST', headers: { ...cabComContagem(tk), 'content-type': 'application/json' }, body: '{}' }); const t2 = await r.text(); let v = null; try { v = JSON.parse(t2); } catch {} return { status: r.status, valores: Array.isArray(v) ? v[0] : v }; })();
  porPersona.push(linha);
}
const anon = { };
for (const t of BASE) anon[t] = await ler({ apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json', Prefer: 'count=exact' }, `/${t}?select=id&limit=1`);
anon[VISTA] = await ler({ apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' }, `/${VISTA}?select=school_id&limit=1`);

const leitura = (l) => (l?.total_ou_estrela ?? l?.linhas ?? l?.code ?? '?');
const linhas = [];
for (const p of porPersona) linhas.push(`${p.persona.padEnd(20)} ${BASE.map((t) => `${t.slice(0, 12)}=${leitura(p[t])}`).join(' ')} | VISTA=${leitura(p[VISTA])} | rpc=${JSON.stringify(p.rpc_totals?.valores)}`);
linhas.push(`anon`.padEnd(20) + BASE.map((t) => `${t.slice(0, 12)}=${leitura(anon[t])}`).join(' ') + ` | VISTA=${anon[VISTA].status}/${anon[VISTA].code || leitura(anon[VISTA])}`);

const out = {
  programa: 'scripts/sm23-causa-vista-18-11.mjs',
  em: new Date().toISOString(),
  pergunta: 'o developer perdeu 6 linhas na vista por minha causa, ou por RLS que sempre existiu nas tabelas base?',
  metodo: 'GET com Prefer: count=exact (total = o que a RLS do chamador deixa ver, não o limit)',
  unidade: 'total de linhas visíveis POR PAPEL (Content-Range depois do «/»), não contagem global de tabela; `*` significa que o servidor não devolveu contagem — não é zero',
  hipotese_e_falsificacao: 'se o mesmo papel vê 0 em `schools` direto, então a vista em invoker devolve o que a política manda; o «6 antes» era BYPASSRLS do dono da vista',
  estado_do_aplicador: { vista_modo: pre.catalogo_depois.modo, def_md5: pre.catalogo_depois.def_md5, dif_vista_do_registro: pre.diff_linhas_da_vista },
  globais_esperadas: pre.baselines_agora,
  porPersona, anon,
  leitura_humana: linhas,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(linhas.join('\n'));
console.log('CAUSA_REGISTADA ·', OUT);
