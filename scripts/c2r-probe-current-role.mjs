// C2-R — sonda somente-leitura: corpo de current_role() e FK de classes.school_id.
import { writeFileSync } from 'node:fs';
import { DIR, sql } from './c2-lib.mjs';

const out = { em: new Date().toISOString() };
out.current_role = (await sql(`select pg_get_functiondef(p.oid) as corpo from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='current_role' and n.nspname='public';`))[0]?.corpo;
out.classes_school_fk = await sql(`
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid = 'public.classes'::regclass and contype='f';`);
writeFileSync(`${DIR}/docs/c2r-probe-current-role.json`, JSON.stringify(out, null, 2) + '\n');
console.log('current_role corpo:', out.current_role);
console.log('classes FKs:', JSON.stringify(out.classes_school_fk));
