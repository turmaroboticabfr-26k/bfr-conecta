// C2-R — recon-2: helpers do fixture (is_monitor, handle_new_user, profiles, guardian_students).
import { sql } from './c2-lib.mjs';
import { writeFileSync } from 'node:fs';

const out = { ciclo: 'C2-R', em: new Date().toISOString(), tipo: 'recon2-read-only' };

out.funcoes_fixture = await sql(`
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef, p.proowner::regrole::text as dono,
       pg_get_functiondef(p.oid) as corpo
from pg_proc p
where p.pronamespace='public'::regnamespace and p.proname in ('is_monitor','handle_new_user')
order by p.proname`);

out.profiles_colunas = await sql(`
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='profiles'
order by ordinal_position`);

out.guardian_students_colunas = await sql(`
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='guardian_students'
order by ordinal_position`);

out.classes_colunas = await sql(`
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='classes'
order by ordinal_position`);

out.students_colunas = await sql(`
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='students'
order by ordinal_position`);

out.route_incidents_acl = await sql(`
select rel.relname, rel.relacl::text
from pg_class rel where rel.oid = to_regclass('public.route_incidents')`);

writeFileSync(new URL('../docs/c2r-recon2.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
for (const f of out.funcoes_fixture) {
  console.log('=== ' + f.proname + '(' + f.args + ') dono=' + f.dono + ' definer=' + f.prosecdef + ' ===');
  console.log(f.corpo.slice(0, 1200));
  console.log('...');
}
console.log('profiles:', out.profiles_colunas.map(c => c.column_name).join(','));
console.log('guardian_students:', out.guardian_students_colunas.map(c => c.column_name).join(','));
console.log('classes:', out.classes_colunas.map(c => c.column_name).join(','));
console.log('students:', out.students_colunas.map(c => c.column_name).join(','));
console.log('route_incidents acl:', JSON.stringify(out.route_incidents_acl));
