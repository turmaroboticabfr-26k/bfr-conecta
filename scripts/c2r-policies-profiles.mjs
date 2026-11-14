// C2-R — só-leitura: TODAS as policies de public.profiles + censo de referências cruzadas.
import { writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const out = { em: new Date().toISOString(), tipo: 'policies-profiles-full' };

out.profile_policies = await sql(`
select pol.polname,
       case pol.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update'
                       when 'd' then 'delete' when '*' then 'all' end as cmd,
       pol.polroles::regrole[]::text[] as papeis,
       coalesce(pg_get_expr(pol.polqual, pol.polrelid), '(sem using)') as using_,
       coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '(sem with_check)') as with_check
from pg_policy pol
where pol.polrelid = to_regclass('public.profiles')
order by pol.polname`);

// quantas policies de QUALQUER tabela citam profiles ou staff_schools no corpo
out.censo_citacoes = await sql(`
select pol.polrelid::regclass::text as tabela, count(*)::int as policies,
       count(*) filter (where pg_get_expr(pol.polqual, pol.polrelid) like '%profiles%'
                          or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%profiles%')::int as citam_profiles,
       count(*) filter (where pg_get_expr(pol.polqual, pol.polrelid) like '%staff_schools%'
                          or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%staff_schools%')::int as citam_staff_schools
from pg_policy pol
where pg_get_expr(pol.polqual, pol.polrelid) ~ '(profiles|staff_schools)'
   or pg_get_expr(pol.polwithcheck, pol.polrelid) ~ '(profiles|staff_schools)'
group by 1 order by 1`);

out.politicas_de_students = await sql(`
select pol.polname,
       case pol.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update'
                       when 'd' then 'delete' when '*' then 'all' end as cmd,
       coalesce(pg_get_expr(pol.polqual, pol.polrelid), '(sem using)') as using_,
       coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '(sem with_check)') as with_check
from pg_policy pol
where pol.polrelid in (to_regclass('public.students'), to_regclass('public.guardian_students'))
order by pol.polrelid::regclass::text, pol.polname`);

writeFileSync(new URL('../docs/c2r-policies-profiles.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
for (const p of out.profile_policies) {
  console.log(`\n### profiles.${p.polname} [${p.cmd}] ${JSON.stringify(p.papeis)}`);
  console.log('using:      ' + p.using_.replace(/\s+/g, ' '));
  console.log('with_check: ' + p.with_check.replace(/\s+/g, ' '));
}
console.log('\ncenso:', JSON.stringify(out.censo_citacoes, null, 1));
console.log('\nstudents/guardian:');
for (const p of out.politicas_de_students) console.log(` - ${p.polname} [${p.cmd}] :: ${p.using_.replace(/\s+/g, ' ').slice(0, 160)}`);
