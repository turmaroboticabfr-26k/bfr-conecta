// C2-R — só-leitura: fechamento transitivo profiles <-> staff_schools via funções de policy.
import { writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const out = { em: new Date().toISOString(), tipo: 'fechamento-transitivo' };

// corpo de toda função SECURITY INVOKER citada por policies (as definidoras são seguras)
out.funcoes_de_policy = await sql(`
with usadas as (
  select distinct (regexp_matches(pg_get_expr(pol.polqual, pol.polrelid)
        || ' ' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid),''),
        '([a-z_][a-z0-9_]*)\\s\\(\\s\\)','g'))[1] as fn
  from pg_policy pol
)
select p.proname, p.prosecdef,
       (select string_agg(distinct c.polname, ', ')
          from pg_policy c
         where pg_get_expr(c.polqual, c.polrelid) like '%'||p.proname||'()%'
            or pg_get_expr(c.polwithcheck, c.polrelid) like '%'||p.proname||'()%') as usadas_em,
       left(p.prosrc, 900) as corpo
from pg_proc p
join usadas u on u.fn = p.proname
where p.pronamespace = 'public'::regnamespace
order by p.prosecdef desc, p.proname`);

// políticas de students e gate_badges que cite profiles/staff_schools (RTEs novas do candidato)
out.rte_relevantes = await sql(`
select pol.polrelid::regclass::text as tabela, pol.polname,
       coalesce(pg_get_expr(pol.polqual, pol.polrelid),'(sem using)') as using_
from pg_policy pol
where pol.polrelid in (to_regclass('public.students'), to_regclass('public.gate_badges'), to_regclass('public.guardian_students'))
  and (pg_get_expr(pol.polqual, pol.polrelid) ~ '(profiles|staff_schools)'
    or pg_get_expr(pol.polwithcheck, pol.polrelid) ~ '(profiles|staff_schools)')
order by 1,2`);

out.colunas_students = await sql(`
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='students' and column_name in ('student_profile_id','school_id','id')
order by 1`);

out.escopo_vivo = await sql(`
select (select count(*)::int from public.staff_schools) as staff_schools_linhas,
       (select count(*)::int from public.students where student_profile_id is not null) as alunos_com_perfil,
       (select count(*)::int from public.profiles) as profiles_total`);

writeFileSync(new URL('../docs/c2r-fechamento.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('--- funcoes citadas por policies ---');
for (const f of out.funcoes_de_policy) console.log(`\n[${f.prosecdef ? 'DEFINER' : 'invoker '}] ${f.proname}  (usadas em: ${f.usadas_em})\n${f.corpo.replace(/\s+/g,' ')}`);
console.log('\n--- RTEs relevantes ---');
for (const r of out.rte_relevantes) console.log(` - ${r.tabela}.${r.polname}: ${r.using_.replace(/\s+/g,' ').slice(0,200)}`);
console.log('\ncolunas students:', JSON.stringify(out.colunas_students));
console.log('escopo vivo:', JSON.stringify(out.escopo_vivo));
