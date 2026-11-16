// AE-5b recon 2 — funções do escopo pedagógico/aee e esquemas classes/schools.
// Somente leitura.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5b-rm68-recon2-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const out = { em: new Date().toISOString(), autorizacao: 'somente leitura' };

out.funcoes = await sql(`
  select p.proname as nome, pg_get_function_identity_arguments(p.oid) as args,
         pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('bfr_pedagogical_can_manage_student','bfr_teacher_can_manage_student','is_aee',
                       'bfr_is_education_supervisor','bfr_is_guardian','bfr_is_schedule_manager')
   order by p.proname, pg_get_function_identity_arguments(p.oid);`);

out.colunas = await sql(`
  select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
   where table_schema = 'public'
     and table_name in ('classes','schools','guardian_students')
   order by table_name, ordinal_position;`);

out.fks = await sql(`
  select tc.table_name, kcu.column_name,
         ccu.table_name as ref_tabela, ccu.column_name as ref_coluna
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
   where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
     and tc.table_name in ('classes','guardian_students')
   order by tc.table_name, kcu.column_name;`);

out.grants_vistas_e_bases = await sql(`
  select c.relname, grantee.rolname as papel,
         has_table_privilege(grantee.rolname, c.oid, 'SELECT') as sel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (select rolname from pg_roles where rolname in ('anon','authenticated')) grantee
   where n.nspname = 'public' and c.relname in ('sports_public_athletes','sports_public_match_events',
     'sports_public_matches','sports_public_schools','sports_public_teams',
     'sports_athletes','sports_match_events','sports_matches','sports_schools','sports_teams')
   order by c.relname, grantee.rolname;`);

out.modos_vistas = await sql(`
  select c.relname,
         case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
              when c.reloptions::text like '%security_invoker=false%' then 'definer'
              else 'sem-opcao' end as modo
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'sports\\_public\\_%' escape '\\'
   order by c.relname;`);

out.contagens = await sql(`
  select json_object_agg(t, c) as contagens from (
    select 'classes' as t, count(*)::int as c from public.classes
    union all select 'schools', count(*)::int from public.schools
    union all select 'guardian_students', count(*)::int from public.guardian_students) x;`);

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5B_RECON2_ESCRITO', OUT);
