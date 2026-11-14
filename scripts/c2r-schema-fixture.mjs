// C2-R — só-leitura: fatos de schema necessários para a fixture do dry-run 42P17.
import { writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const r = await sql(`
select jsonb_build_object(
 'fk_staff_schools', (select jsonb_agg(jsonb_build_object('col', a.attname, 'ref', con.confrelid::regclass::text, 'refcol', ca.attname))
    from pg_constraint con
    join lateral unnest(con.conkey) with ordinality k(attnum, pos) on true
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
    join lateral unnest(con.confkey) kk(attnum) on true
    join pg_attribute ca on ca.attrelid = con.confrelid and ca.attnum = kk.attnum
    where con.contype = 'f' and con.conrelid = 'public.staff_schools'::regclass),
 'col_staff_schools', (select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='staff_schools'),
 'col_profiles', (select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='profiles'),
 'escolas', (select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name)) from (select id, name from public.sports_schools order by name limit 8) s),
 'n_escolas', (select count(*)::int from public.sports_schools),
 'staff_schools_linhas', (select jsonb_agg(row_to_json(ss)) from public.staff_schools ss),
 'col_guardian', (select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='guardian_students'),
 'col_gate_checkins', (select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='gate_checkins'),
 'profiles_tem_student_profile_id', (select count(*)::int from pg_attribute where attrelid='public.profiles'::regclass and attname='student_profile_id'),
 'alunos_com_perfil', (select count(*)::int from public.students where student_profile_id is not null),
 'contas_vivas', (select count(*)::int from auth.users where email like '%@bfr-conecta.test'),
 'route_incidents_n', (select count(*)::int from public.route_incidents),
 'student_messages_n', (select count(*)::int from public.student_messages),
 'gate_checkins_n', (select count(*)::int from public.gate_checkins),
 'gate_entry_alerts_n', (select count(*)::int from public.gate_entry_alerts)
) as j`);

writeFileSync(new URL('../docs/c2r-schema-fixture.json', import.meta.url), JSON.stringify(r[0].j, null, 2) + '\n');
console.log(JSON.stringify(r[0].j, null, 1));
