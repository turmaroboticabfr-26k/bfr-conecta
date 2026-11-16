// AE-1 pré-voo (somente leitura) — vistas sports_public_* e políticas das tabelas-base.
// Não escreve nada no banco. Guarda de não-sobreposição no artefacto.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae1-vistas-preflight-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t);
};

const out = { em: new Date().toISOString(), autorizacao: 'leitura: 0 DDL, 0 escrita, 0 mint, 0 deploy, 0 git push' };

out.vistas = await sql(`
select c.relname,
       pg_get_viewdef(c.oid) as def,
       coalesce(has_table_privilege('anon', c.oid, 'SELECT')::text, '?') as anon_sel,
       coalesce(has_table_privilege('authenticated', c.oid, 'SELECT')::text, '?') as auth_sel,
       case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
            when c.reloptions::text like '%security_invoker=false%' then 'definer'
            else 'sem-opcao' end as modo,
       (select n.nspname || '.' || x.relname
          from pg_depend d
          join pg_rewrite rw on rw.oid = d.objid
          join pg_class x on x.oid = rw.ev_class
         where d.refobjid = c.oid and d.classid = 'pg_rewrite'::regclass limit 1) as base
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'sports\\_public\\_%' escape '\\'
 order by c.relname`);

// tabelas-base: policies que tocam anon/public/authenticated
out.base_policies = await sql(`
select t.tablename, p.policyname, p.cmd, p.permissive,
       coalesce(p.roles::text, '(sem pg_roles)') as roles,
       coalesce(p.qual, '') as using_,
       coalesce(p.with_check, '') as with_check
  from pg_policies p
  join pg_tables t on t.schemaname = p.schemaname and t.tablename = p.tablename
 where p.schemaname = 'public'
   and t.tablename in ('sports_athletes','sports_match_events','sports_matches','sports_schools','sports_teams')
 order by t.tablename, p.policyname`);

// grants de escrita/leitura por papel nas bases
out.base_grants = await sql(`
select c.relname,
       has_table_privilege('anon', c.oid, 'SELECT')::text as anon_sel,
       has_table_privilege('authenticated', c.oid, 'SELECT')::text as auth_sel
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in ('sports_athletes','sports_match_events','sports_matches','sports_schools','sports_teams')
 order by c.relname`);

// contagens atuais: como dono e como authenticated via set local role (auth.uid() = NULL)
out.contagens = [];
for (const v of out.vistas) {
  const linha = { view: v.relname };
  for (const papel of ['postgres', 'authenticated']) {
    const r = await sql(`begin; set local role ${papel}; select count(*)::int as n from ${v.relname}; rollback;`);
    linha[papel] = Array.isArray(r) ? r[0].n : 'ERRO';
  }
  out.contagens.push(linha);
}

out.tabelas_base_nomes = out.vistas.map((v) => v.base);
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log('escrito', OUT, 'vistas', out.vistas.length);
console.log('modos:', out.vistas.map((v) => `${v.relname}=${v.modo}`).join(' '));
console.log('contagens:', JSON.stringify(out.contagens));
