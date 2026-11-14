// C2-R — só-leitura: helpers SECURITY DEFINER existentes e quem cita staff_schools no corpo.
import { writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const out = { em: new Date().toISOString(), tipo: 'helpers-definer' };

out.definers_de_escopo = await sql(`
select p.proname, p.prosecdef, l.lanname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prorettype::regtype::text as retorna,
       (p.prosrc like '%staff_schools%') as cita_staff_schools,
       (p.prosrc like '%profiles%') as cita_profiles,
       p.proconfig::text as config, p.proowner::regrole::text as dono
from pg_proc p join pg_language l on l.oid = p.prolang
where p.pronamespace = 'public'::regnamespace
  and (p.prosecdef or p.prosrc like '%staff_schools%')
order by p.proname`);

out.corpos_uteis = await sql(`
select p.proname, left(p.prosrc, 1200) as corpo
from pg_proc p
where p.pronamespace='public'::regnamespace
  and p.proname in ('bfr_staff_school_ids','bfr_current_school_ids','bfr_staff_can_manage_student_scope','bfr_is_education_supervisor','is_staff','internal_chat_is_staff','bfr_can_manage_student_directory','is_monitor','is_gatekeeper')
order by 1`);

writeFileSync(new URL('../docs/c2r-helpers.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('--- definers / quem cita staff_schools ---');
for (const f of out.definers_de_escopo)
  console.log(` ${f.prosecdef ? 'DEFINER' : 'invoker '} ${f.proname}(${f.args}) -> ${f.retorna} [${f.lanname}] staff_schools=${f.cita_staff_schools} profiles=${f.cita_profiles} dono=${f.dono} cfg=${f.config}`);
console.log('\n--- corpos ---');
for (const c of out.corpos_uteis) console.log(`\n### ${c.proname}\n${c.corpo.replace(/\s+/g, ' ')}`);
