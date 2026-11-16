// AE-5 recon somente-leitura — esquemas e funções vivas necessárias para desenhar a prova
// comportamental por papel sobre as 11 policies PUBLIC do RM-6.8 (grades/attendance/
// access_requests/occurrences) e as 5 vistas sports_public_* já fechadas.
// 0 DDL, 0 escrita, 0 mint. Escreve só o artefacto de evidência.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5-rm68-recon-16-11.json`;
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

const out = {
  em: new Date().toISOString(),
  autorizacao: 'somente leitura: 0 DDL, 0 escrita, 0 mint',
};

out.policies_4_tabelas = await sql(`
  select c.relname as tabela, p.polname as politica, p.polcmd::text as cmd,
         p.polpermissive::text as permissive,
         coalesce((select string_agg(rolname, ',' order by rolname) from pg_roles where oid = any(p.polroles)), '(public)') as roles,
         pg_get_expr(p.polqual, p.polrelid) as using_,
         pg_get_expr(p.polwithcheck, p.polrelid) as with_check
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('grades','attendance','access_requests','occurrences')
   order by c.relname, p.polname;`);

out.funcoes = await sql(`
  select p.proname as nome, pg_get_function_identity_arguments(p.oid) as args,
         pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('bfr_staff_can_manage_student_scope','bfr_rls_session_role','bfr_rls_is_developer',
                       'bfr_rls_director_manages_student','sports_role_allowed','bfr_is_schedule_manager',
                       'is_staff','is_developer','current_role')
   order by p.proname, pg_get_function_identity_arguments(p.oid);`);

out.colunas = await sql(`
  select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
   where table_schema = 'public'
     and table_name in ('grades','attendance','occurrences','access_requests','students','profiles','staff_schools','sports_schools')
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
     and tc.table_name in ('grades','attendance','occurrences','access_requests','students','staff_schools')
   order by tc.table_name, kcu.column_name;`);

out.grants_4_tabelas = await sql(`
  select c.relname, grantee.rolname as papel,
         has_table_privilege(grantee.rolname, c.oid, 'SELECT') as sel,
         has_table_privilege(grantee.rolname, c.oid, 'INSERT') as ins,
         has_table_privilege(grantee.rolname, c.oid, 'UPDATE') as upd,
         has_table_privilege(grantee.rolname, c.oid, 'DELETE') as del
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (select rolname from pg_roles where rolname in ('anon','authenticated')) grantee
   where n.nspname = 'public' and c.relname in ('grades','attendance','access_requests','occurrences')
   order by c.relname, grantee.rolname;`);

out.contagens = await sql(`
  select json_object_agg(t, c) as contagens from (
    select 'grades' as t, count(*)::int as c from public.grades
    union all select 'attendance', count(*)::int from public.attendance
    union all select 'access_requests', count(*)::int from public.access_requests
    union all select 'occurrences', count(*)::int from public.occurrences
    union all select 'students', count(*)::int from public.students
    union all select 'profiles', count(*)::int from public.profiles
    union all select 'staff_schools', count(*)::int from public.staff_schools
    union all select 'sports_schools', count(*)::int from public.sports_schools) x;`);

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5_RECON_ESCRITO', OUT);
