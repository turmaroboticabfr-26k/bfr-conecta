// C2-R — só-leitura: qual tabela de escola cada FK aponta (classes/students x schools/sports_schools).
import { sql } from './c2-lib.mjs';

const r = await sql(`
select jsonb_build_object(
 'fk', (select jsonb_agg(jsonb_build_object('t', c.relname, 'col', a.attname, 'ref', con.confrelid::regclass::text, 'refcol', ca.attname, 'chave', con.conname) order by c.relname, a.attnum)
          from pg_constraint con
          join pg_class c on c.oid = con.conrelid
          join lateral unnest(con.conkey) with ordinality k(attnum, pos) on true
          join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
          join lateral unnest(con.confkey) with ordinality kk(attnum, pos) on true
          join pg_attribute ca on ca.attrelid = con.confrelid and ca.attnum = kk.attnum and kk.pos = k.pos
         where con.contype = 'f' and c.relname in ('classes','students','staff_schools')),
 'schools_kind', (select coalesce(jsonb_agg(c.relkind::text), '[]') from pg_class c
                   join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = 'schools'),
 'schools_cols', (select jsonb_agg(column_name order by ordinal_position) from information_schema.columns
                    where table_schema = 'public' and table_name = 'schools'),
 'schools_linhas', (select coalesce(jsonb_agg(to_json(s)), '[]') from (select * from public.schools limit 10) s),
 'sports_schools_linhas', (select coalesce(jsonb_agg(to_json(s)), '[]') from (select * from public.sports_schools limit 10) s)
) as j`);
console.log(JSON.stringify(r[0].j, null, 1));
