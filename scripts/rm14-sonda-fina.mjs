// RM-1.4 — sondas finas: (a) frame-ancestors em algum CSP; (b) as 4 tabelas 401 × catálogo.
import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
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
const res = await fetch(URL + '/', { headers: { 'cache-control': 'no-cache' } });
const html = await res.text();
const chave = (html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];

// (a) frame-ancestors: header, meta, qualquer sítio dos bytes publicados
const hdrCSP = res.headers.get('content-security-policy') || '';
const metaTag = (html.match(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/i) || [])[0] || '';
const metaCSP = (metaTag.match(/content="([^"]*)"/i) || [])[1] || '';
console.log('=== protecção contra enquadramento ===');
console.log('   header CSP tem frame-ancestors?', /frame-ancestors/i.test(hdrCSP));
console.log('   meta  CSP presente?            ', metaCSP ? 'SIM' : 'NAO', '| tem frame-ancestors?', /frame-ancestors/i.test(metaCSP));
console.log('   x-frame-options               ', res.headers.get('x-frame-options'));
console.log('   permissions-policy            ', res.headers.get('permissions-policy'));
console.log('   cross-origin-opener-policy    ', res.headers.get('cross-origin-opener-policy'));
console.log('   referrer-policy               ', res.headers.get('referrer-policy'));
console.log('   strict-transport-security     ', res.headers.get('strict-transport-security'));
console.log('   "frame-ancestors" em qualquer byte do shell?', /frame-ancestors/i.test(html));

// (b) as 4 tabelas que deram 401: ACL real, RLS, policies para anon, homónimas noutro schema
const NOMES = ['access_requests', 'attendance', 'grades', 'occurrences'];
const acl = await sql(`
select c.relname, n.nspname as schema, c.relrowsecurity as rls, c.relacl::text as acl,
       pg_get_userbyid(c.relowner) as dono
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p') and c.relname = any(array['${NOMES.join("','")}']) order by 1,2`);
console.log('\n=== ACL e RLS das 4 ===');
for (const x of acl) console.log(`   ${x.schema}.${x.relname} rls=${x.rls} dono=${x.dono}\n        acl=${String(x.acl).slice(0, 260)}`);
const pol = await sql(`
select t.relname, p.polname, p.polpermissive::text as permissiva, p.polcmd::text as cmds,
       (select string_agg(r.rolname,',') from unnest(p.polroles) rid join pg_roles r on r.oid=rid) as roles,
       pg_get_expr(p.polqual, t.oid) as qual
  from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace
 where n.nspname='public' and t.relname = any(array['${NOMES.join("','")}'])
   and p.polcmd::text like '%r%'
 order by 1,2`);
console.log('\n=== policies de SELECT nas 4 ===');
for (const x of pol) console.log(`   ${x.relname} · ${x.polname} permissiva=${x.permissiva} roles=${x.roles}\n        qual=${String(x.qual).slice(0, 160)}`);
console.log('   (sem linha para uma tabela = nenhuma policy de SELECT → RLS nega tudo)');

// (c) erro real do PostgreSQL quando a consulta é feita como anon (transacção só-leitura, sem escrita)
console.log('\n=== SELECT executado como role anon (diagnóstico do 42501) ===');
for (const t of NOMES) {
  const q = `begin; set local role anon; select count(*) from public.${t}; reset role; rollback;`;
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const txt = await r.text();
  console.log(`   ${t}: HTTP ${r.status} ${txt.slice(0, 220).replace(/\s+/g, ' ')}`);
}
const roles = await sql(`select rolname, rolsuper::text as super, rolbypassrls::text as bypass from pg_roles
 where rolname in ('anon','authenticated','service_role','postgres') order by 1`);
console.log('\n=== papéis ===');
for (const x of roles) console.log(`   ${x.rolname} super=${x.super} bypassrls=${x.bypass}`);
const memb = await sql(`select r.rolname as grupo, m.rolname as membro from pg_authid r
  join pg_auth_members a on a.roleid=r.oid join pg_authid m on m.oid=a.member
 where r.rolname in ('anon','authenticated') or m.rolname in ('anon','authenticated')`);
console.log('   membros/grupos de anon/authenticated:', memb.length ? JSON.stringify(memb) : 'nenhum');

// (d) o REST com a service_role lê estas 4? (confirma que é negação de anon, não tabela inexistente)
const svc = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
for (const t of NOMES) {
  const a = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: chave, Authorization: `Bearer ${chave}` } });
  const b = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: svc, Authorization: `Bearer ${svc}` } });
  console.log(`\n   ${t}: anon HTTP ${a.status} ${(await a.text()).slice(0, 90)}`);
  console.log(`   ${t}: service HTTP ${b.status} ${String((await b.text()).length)} chars`);
}
