// RM-1.4 — sondas dos 4 portões vermelhos da primeira corrida. Somente leitura.
import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
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
console.log('alvo derivado:', URL, 'de', cand[0].f);

// 1. CSP completo + todos os cabeçalhos (frame-ancestors substitui XFO?)
const res = await fetch(URL + '/', { headers: { 'cache-control': 'no-cache' } });
const html = await res.text();
console.log('\nCSP completo:\n   ' + res.headers.get('content-security-policy'));
console.log('   x-frame-options:', res.headers.get('x-frame-options'));
const chave = (html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];

// 2. GoTrue health já medido (200 com apikey) — confirmar com a chave do shell
const h = await fetch(HOST + '/auth/v1/health', { headers: { apikey: chave } });
console.log('\nhealth com apikey do shell: HTTP', h.status, (await h.text()).slice(0, 80));

// 3. censo: tabelas de comportamento que existem + quantas tabelas o anon alcança
const tab = await sql(`
select count(*) filter (where has_table_privilege('anon',c.oid,'SELECT'))::int as anon_alcancaveis,
       count(*)::int as total_public
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p')`);
console.log('\ntabelas public:', JSON.stringify(tab[0]));
const beh = await sql(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p','v')
   and (c.relname ~ 'behav|conduct|discipl|incident|ocorr' or c.relname ~ 'comport') order by 1`);
console.log('comportamento/conduta/incidência:', beh.map((x) => x.relname).join(', ') || 'nenhuma');
// tabelas que o app realmente consulta (aparecem no index.html como .from('…'))
const froms = [...new Set([...html.matchAll(/\.from\(\s*['"]([a-z0-9_]+)['"]/g)].map((m) => m[1]))];
const exist = await sql(`select c.relname, c.relkind, has_table_privilege('anon',c.oid,'SELECT') as anon_sel
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname = any(array[${froms.map((f) => `'${f}'`).join(',')}])`);
const mapa = Object.fromEntries(exist.map((x) => [x.relname, x]));
console.log(`\n.from() no shell: ${froms.length} | existem no catálogo: ${exist.length}`);
console.log('   NÃO existem (nomes inventados pela minha amostra): ' + froms.filter((f) => !mapa[f]).join(', '));
console.log('   alcançadas por anon: ' + froms.filter((f) => mapa[f]?.anon_sel).join(', '));

// 4. as views de dono BYPASSRLS: dono, grants reais, security_invoker e leitura anónima efectiva
const v = await sql(`
select c.oid, c.relname as view, pg_get_userbyid(c.relowner) as dono, r.rolbypassrls as dono_bypass,
       r.rolname as dono_role,
       (select array_agg(distinct grantee) from information_schema.role_table_grants g
         where g.table_name=c.relname and g.privilege_type='SELECT'
           and grantee in ('anon','authenticated','service_role')) as sel_grantees,
       c.reloptions::text as opts
  from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner
 where n.nspname='public' and c.relkind='v' and r.rolbypassrls
   and (has_table_privilege('anon',c.oid,'SELECT') or has_table_privilege('authenticated',c.oid,'SELECT'))
 order by 1`);
console.log('\n=== views BYPASSRLS-alcançáveis: leitura anónima real ===');
for (const x of v) {
  const si = /security_invoker=true/.test(x.opts || '') ? 'invoker' : (/security_invoker=false/.test(x.opts || '') ? 'definer' : 'sem-opção(→definer)');
  const r = await fetch(`${HOST}/rest/v1/${x.view}?select=*&limit=3`, { headers: { apikey: chave, Authorization: `Bearer ${chave}` } });
  const t = await r.text();
  let n = 'obj', cols = '';
  try { const j = JSON.parse(t); if (Array.isArray(j)) { n = j.length; cols = j[0] ? Object.keys(j[0]).slice(0, 10).join(',') : ''; } } catch {}
  const vazado = r.status === 200 && typeof n === 'number' && n > 0;
  console.log(`   ${x.view} dono=${x.dono}(${x.dono_bypass}) sel=${(x.sel_grantees || []).join('|')} invoker=${si}`);
  console.log(`        anon REST → HTTP ${r.status} linhas=${n} ${vazado ? '⚠ VAZA p/ anon: ' + cols : t.slice(0, 70)}`);
}
