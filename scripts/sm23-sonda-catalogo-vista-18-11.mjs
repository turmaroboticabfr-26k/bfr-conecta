#!/usr/bin/env node
// Sonda só-leitura, sem artefacto versionado: definição exata da vista, ACL da vista, ACL das funções
// envolvidas, e a MENSAGEM completa do erro anónimo (não só o código) — porque «401 ≠ 401»: preciso de
// saber se o anon bate na vista, na função de escopo ou na tabela base antes de escrever a candidata (b)/(c).
import { sql, HOST } from './c2-lib.mjs';
import { readFileSync } from 'node:fs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(REPO + '/audit-publicacao-v134.json', 'utf8')) || [])[0];
const shell = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shell) || [])[1];

const vista = 'bfr_municipal_school_stats';
const cat = await sql(`select pg_get_viewdef('public.${vista}'::regclass, true) as def,
  (select array_to_string(reloptions,',')) as reloptions,
  (select relowner::regrole::text) as dono,
  (select array_to_string(relacl,' | ')) as acl_vista
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relname='${vista}'`);
console.log('== VISTA ==');
console.log('reloptions =', JSON.stringify(cat[0].reloptions), '| dono =', cat[0].dono);
console.log('relacl     =', cat[0].acl_vista);
console.log('def:\n' + cat[0].def);

const fun = await sql(`select p.proname, pg_get_function_arguments(p.oid) as args, p.prosecdef as definer,
  array_to_string(p.proacl,' | ') as acl, r.rolname as dono
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' join pg_roles r on r.oid=p.proowner
  where p.proname in ('bfr_has_municipal_grant','bfr_municipal_network_totals','bfr_school_in_municipal_scope','bfr_municipal_municipalities','bfr_school_in_own_school_scope','bfr_is_municipal_authority','bfr_has_municipal_grant','bfr_municipalities_visible')
  order by p.proname, args`);
console.log('\n== FUNCOES ==');
for (const f of fun) console.log(`${f.proname}(${f.args}) definer=${f.definer} dono=${f.dono}\n   acl: ${f.acl}`);

const base = await sql(`select distinct dep.refobjid::regclass::text as relacao, c.relkind, c.relrowsecurity as rls, c.relforcerowsecurity as forcada,
  array_to_string(c.relacl,' | ') as acl, r.rolname as dono, has_table_privilege('anon', c.oid, 'SELECT') as anon_sel, has_table_privilege('authenticated', c.oid, 'SELECT') as auth_sel
  from pg_depend dep
  join pg_rewrite rw on rw.oid=dep.objid and rw.ev_class='public.${vista}'::regclass
  join pg_class c on c.oid=dep.refobjid join pg_roles r on r.oid=c.relowner
  where dep.classid='pg_rewrite'::regclass and dep.refclassid='pg_class'::regclass and dep.refobjid<>'public.${vista}'::regclass and c.relkind in ('r','p','v','m')
  order by 1`);
console.log('\n== RELACOES BASE DA VISTA (pg_depend) ==');
for (const b of base) console.log(`${b.relacao} [${b.relkind}] rls=${b.rls} forcada=${b.forcada} dono=${b.dono} anon_sel=${b.anon_sel} auth_sel=${b.auth_sel}\n   acl: ${b.acl}`);

const argGrant = (fun.find((f) => f.proname === 'bfr_has_municipal_grant')?.args || '').trim().split(/\s+/)[0];
console.log('arg name lido do catálogo =', JSON.stringify(argGrant));
const get = async (path, key) => { const r = await fetch(HOST + path, { headers: { apikey: anonKey, Authorization: `Bearer ${key}` } }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { status: r.status, corpo: t.slice(0, 300), linhas: Array.isArray(j) ? j.length : null, code: j && j.code, message: j && (j.message || j.error) }; };
console.log('\n== PROBES ANONIMOS (mensagem inteira) ==');
for (const p of [`/rest/v1/${vista}?select=*&limit=3`, `/rest/v1/bfr_municipal_access_grants?select=*&limit=3`, `/rpc/bfr_municipal_network_totals`, `/rpc/bfr_has_municipal_grant?${argGrant}=00000000-0000-0000-0000-000000000000`]) {
  console.log(p, '→', JSON.stringify(await get(p, anonKey)));
}
console.log('\nos =', JSON.stringify({ alvoUrl, anonKey_presente: !!anonKey }));
