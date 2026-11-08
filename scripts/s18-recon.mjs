// S18-1 — recon read-only. Nada escrito. Deriva credenciais de ficheiro, nunca imprime valores.
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const token = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/s18-recon.json';

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const recon = { ciclo: 'S18', em: new Date().toISOString(), queries: {} };

// 1. Conta supervisor sintética existente (SQL-mintada no F0/F1.3)
recon.queries.supervisor_existente = await sql(`
  select id::text, email, role::text, full_name
  from public.profiles
  where email like '%supervisor%synthetic%' or email like '%supervisor.synthetic%';`);
console.log('[1] supervisor existente:', JSON.stringify(recon.queries.supervisor_existente));

// 2. auth.users para essa conta
recon.queries.auth_supervisor = await sql(`
  select id::text, email, email_confirmed_at is not null as confirmed, created_at::text
  from auth.users
  where email like '%supervisor%synthetic%' or email like '%supervisor.synthetic%';`);
console.log('[2] auth supervisor:', JSON.stringify(recon.queries.auth_supervisor));

// 3. Policies RLS de supervision_requests
recon.queries.policies_supervision = await sql(`
  select polname, polcmd,
    pg_get_expr(polqual, polrelid) as using_expr,
    pg_get_expr(polwithcheck, polrelid) as check_expr
  from pg_policy
  where polrelid = 'public.supervision_requests'::regclass
  order by polname;`);
console.log('[3] policies supervision_requests:', recon.queries.policies_supervision.length, 'policies');

// 4. Funções RLS do supervisor
recon.queries.fn_is_supervisor = await sql(`
  select pg_get_functiondef(oid) as def
  from pg_proc where proname = 'bfr_is_education_supervisor';`);
console.log('[4] bfr_is_education_supervisor:', recon.queries.fn_is_supervisor.length ? 'existe' : 'NÃO EXISTE');

recon.queries.fn_school_staff_ids = await sql(`
  select pg_get_functiondef(oid) as def
  from pg_proc where proname = 'bfr_school_staff_ids';`);
console.log('[5] bfr_school_staff_ids:', recon.queries.fn_school_staff_ids.length ? 'existe' : 'NÃO EXISTE');

// 5. Trigger handle_new_user (confirma como o perfil nasce)
recon.queries.fn_handle_new_user = await sql(`
  select pg_get_functiondef(oid) as def
  from pg_proc where proname = 'handle_new_user';`);
console.log('[6] handle_new_user:', recon.queries.fn_handle_new_user.length ? 'existe' : 'NÃO EXISTE');

// 6. sports_schools schema (alvo do embed corrigido)
recon.queries.sports_schools_cols = await sql(`
  select column_name, data_type, is_nullable
  from information_schema.columns
  where table_schema='public' and table_name='sports_schools'
  order by ordinal_position;`);
console.log('[7] sports_schools colunas:', recon.queries.sports_schools_cols.length);

// 7. staff_schools atuais (6 reais + possíveis sintéticas)
recon.queries.staff_schools = await sql(`
  select id::text, profile_id::text, school_id::text, role, created_at::text
  from public.staff_schools order by created_at;`);
console.log('[8] staff_schools:', recon.queries.staff_schools.length, 'linhas');

// 8. supervision_requests count atual
recon.queries.supervision_count = await sql(`
  select count(*)::int as n from public.supervision_requests;`);
console.log('[9] supervision_requests:', recon.queries.supervision_count[0].n, 'linhas');

// 9. FK de supervision_requests.school_id (confirma alvo)
recon.queries.fk_school_id = await sql(`
  select
    tc.constraint_name,
    ccu.table_name as foreign_table,
    ccu.column_name as foreign_column
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
  join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
  where tc.table_name = 'supervision_requests'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'school_id';`);
console.log('[10] FK school_id →', JSON.stringify(recon.queries.fk_school_id));

// 10. enum account_role (confirma education_supervisor existe)
recon.queries.enum_roles = await sql(`
  select enum_range(null::account_role)::text as v;`);
console.log('[11] enum roles:', recon.queries.enum_roles[0].v);

// 11. sports_schools existentes (para fixture)
recon.queries.sports_schools_rows = await sql(`
  select id::text, name from public.sports_schools order by name limit 20;`);
console.log('[12] sports_schools linhas:', recon.queries.sports_schools_rows.length);

// 12. profiles CHECK constraint (confirma role allowed)
recon.queries.profiles_check = await sql(`
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid = 'public.profiles'::regclass and contype = 'c';`);
console.log('[13] profiles CHECK:', JSON.stringify(recon.queries.profiles_check));

writeFileSync(OUT, JSON.stringify(recon, null, 2) + '\n');
console.log('\nS18_RECON_OK — gravado em s18-recon.json');