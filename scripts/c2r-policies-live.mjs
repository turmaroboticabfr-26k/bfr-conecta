// C2-R — leituras só-leitura: definição viva das 6 policies do ciclo profiles<->staff_schools.
import { writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const out = { em: new Date().toISOString(), tipo: 'policies-ciclo-read-only' };

out.policies = await sql(`
select pol.polname,
       pol.polrelid::regclass::text as tabela,
       case pol.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update'
                       when 'd' then 'delete' when '*' then 'all' end as cmd,
       pol.polroles::regrole[]::text[] as papeis,
       coalesce(pg_get_expr(pol.polqual, pol.polrelid), '(sem using)') as using_,
       coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '(sem with_check)') as with_check
from pg_policy pol
where (pol.polrelid = to_regclass('public.profiles')
        and pol.polname in ('profiles_read','profiles_self_read','profiles_staff_read'))
   or (pol.polrelid = to_regclass('public.staff_schools'))
order by pol.polrelid::regclass::text, pol.polname`);

out.rls_ligado = await sql(`
select c.oid::regclass::text as tabela, c.relrowsecurity as rls, c.relforcerowsecurity as force
from pg_class c
where c.oid in (to_regclass('public.profiles'), to_regclass('public.staff_schools'))
order by 1`);

out.total_policies = await sql(`
select count(*)::int as n from pg_policy p
where p.polrelid in (to_regclass('public.profiles'), to_regclass('public.staff_schools'))`);

writeFileSync(new URL('../docs/c2r-policies-ciclo.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
for (const p of out.policies) {
  console.log(`\n### ${p.tabela}.${p.polname}  [${p.cmd}] papeis=${JSON.stringify(p.papeis)}`);
  console.log('using:      ' + p.using_);
  console.log('with_check: ' + p.with_check);
}
console.log('\nrls:', JSON.stringify(out.rls_ligado), 'total:', JSON.stringify(out.total_policies));
