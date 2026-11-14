// RM-1.4 — censo SOMENTE-LEITURA: o que a chave anónima realmente lê, tabela a tabela.
// Sem escrita, sem DDL, sem mint. Apenas SELECT via PostgREST com a chave pública do ar.
import { readFileSync, writeFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo', HOST = `https://${REF}.supabase.co`;
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text(); if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t);
};

const cand = [];
for (const d of [DIR, path.join(DIR, 'docs'), path.join(DIR, 'evidence')]) {
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    if (!/\.json$/i.test(f) || /^rm14/.test(f)) continue;
    const m = readFileSync(path.join(d, f), 'utf8').match(/https:\/\/[a-z0-9.-]+\.workers\.dev/);
    if (m) cand.push({ f, url: m[0], t: statSync(path.join(d, f)).mtimeMs });
  }
}
cand.sort((a, b) => b.t - a.t);
const URL = cand[0].url;
const html = await (await fetch(URL + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const chave = (html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];
console.log(`alvo ${URL} (de ${cand[0].f}) | apikey ${chave.slice(0, 12)}…(${chave.length} B)\n`);

const rel = await sql(`
select c.relname, c.relkind::text as tipo, pg_get_userbyid(c.relowner) as dono,
       r.rolbypassrls::text as dono_bypass,
       coalesce(has_table_privilege('anon',c.oid,'SELECT')::text,'?') as anon_sel,
       coalesce(has_table_privilege('authenticated',c.oid,'SELECT')::text,'?') as auth_sel,
       coalesce(c.relrowsecurity::text,'?') as rls,
       coalesce(array_to_string(c.reloptions,','),'') as opts
  from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner
 where n.nspname='public' and c.relkind in ('r','p','v')
 order by c.relkind, c.relname`);
const alc = rel.filter((x) => x.anon_sel === 'true');
console.log(`relações public: ${rel.length} | alcançáveis por anon: ${alc.length} (tabelas ${alc.filter((x) => x.tipo !== 'v').length}, views ${alc.filter((x) => x.tipo === 'v').length})\n`);

const cabe = { apikey: chave, Authorization: `Bearer ${chave}` };
const linhas = [];
let i = 0;
const trabalho = async () => {
  while (i < alc.length) {
    const x = alc[i++];
    let r, t;
    try { r = await fetch(`${HOST}/rest/v1/${x.relname}?select=*&limit=1`, { headers: cabe }); t = await r.text(); }
    catch (e) { linhas.push({ ...x, status: 'erro', n: -1, cols: String(e.message).slice(0, 40) }); continue; }
    let n = null, cols = '';
    try { const j = JSON.parse(t); if (Array.isArray(j)) { n = j.length; cols = j[0] ? Object.keys(j[0]).join(',') : ''; } else n = -2; } catch { n = -2; }
    linhas.push({ ...x, status: r.status, n, cols: cols.slice(0, 120), bruto: n === -2 ? t.slice(0, 100) : '' });
  }
};
await Promise.all(Array.from({ length: 8 }, trabalho));

const vazam = linhas.filter((x) => x.status === 200 && x.n > 0);
const erros = linhas.filter((x) => x.status !== 200);
console.log(`=== anon DEVOLVE LINHAS em ${vazam.length}/${linhas.length} relações ===`);
for (const x of vazam) console.log(`   ${x.relname} (${x.tipo}) rls=${x.rls} cols=${x.cols.slice(0, 80)}`);
console.log(`\n=== não-200 (${erros.length}) ===`);
for (const x of erros.slice(0, 40)) console.log(`   ${x.relname} (${x.tipo}) HTTP ${x.status} ${String(x.bruto).slice(0, 70)}`);
console.log(`\n=== views alcançáveis por anon: detalhe ===`);
for (const x of linhas.filter((y) => y.tipo === 'v'))
  console.log(`   ${x.relname} dono=${x.dono} bypass=${x.dono_bypass} opts=${x.opts || '-'} HTTP ${x.status} linhas=${x.n}`);

writeFileSync(`${DIR}/evidence/rm14-censo-anon.json`, JSON.stringify({
  em: new Date().toISOString(), alvo: URL, apikey_prefixo: chave.slice(0, 12), total_relacoes: rel.length,
  alcancaveis_anon: alc.length, devolvem_linhas: vazam.length, nomes_vazam: vazam.map((x) => x.relname),
  nao_200: erros.map((x) => ({ r: x.relname, s: x.status })), linhas,
}, null, 2) + '\n');
console.log('\ndiário: evidence/rm14-censo-anon.json');
