// C2-R — só-leitura: CHECKs, NOT NULLs e unicidades necessários para montar a fixture do dry-run.
import { sql } from './c2-lib.mjs';

const r = await sql(`
select jsonb_build_object(
 'checks', (select jsonb_agg(jsonb_build_object('t', c.relname, 'con', co.conname, 'def', pg_get_constraintdef(co.oid)) order by c.relname, co.conname)
              from pg_constraint co join pg_class c on c.oid = co.conrelid
             where co.contype = 'c'
               and c.relname in ('gate_checkins','students','classes','guardian_students','staff_schools','route_incidents')),
 'notnull', (select jsonb_agg(jsonb_build_object('t', c.relname, 'col', a.attname) order by c.relname, a.attnum)
              from pg_attribute a join pg_class c on c.oid = a.attrelid
             where a.attnum > 0 and not a.attisdropped and a.attnotnull
               and c.relname in ('gate_checkins','students','classes','guardian_students','staff_schools','profiles','auth_users_fake')
               and c.relnamespace in (select oid from pg_namespace where nspname in ('public'))),
 'unicos', (select jsonb_agg(jsonb_build_object('t', c.relname, 'con', co.conname, 'def', pg_get_constraintdef(co.oid)) order by c.relname, co.conname)
              from pg_constraint co join pg_class c on c.oid = co.conrelid
             where co.contype in ('p','u')
               and c.relname in ('gate_checkins','students','classes','guardian_students','staff_schools','profiles')),
 'fk_gate_checkins', (select jsonb_agg(jsonb_build_object('col', a.attname, 'ref', con.confrelid::regclass::text))
              from pg_constraint con
              join lateral unnest(con.conkey) k(attnum) on true
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
             where con.contype = 'f' and con.conrelid = 'public.gate_checkins'::regclass),
 'role_enum', (select jsonb_agg(e.enumlabel order by e.enumsortorder)
              from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = 'account_role')
) as j`);

console.log(JSON.stringify(r[0].j, null, 1));
