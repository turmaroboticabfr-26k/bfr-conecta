// C2-2a — recon SOMENTE-LEITURA dos esquemas da fixture (enum, colunas, FKs, policies).
import { writeFileSync } from 'node:fs';
import { sql, DIR, stage } from './c2-lib.mjs';

const q = async (nome, query) => { const r = await sql(query); console.log(nome, 'linhas:', Array.isArray(r) ? r.length : '?'); return r; };
const d = { ciclo: 'C2', em: new Date().toISOString(), tipo: 'fixture-recon-read-only' };

d.enum_roles = await q('enum account_role', `
  select e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid
  where t.typname='account_role' order by e.enumsortorder;`);

d.colunas = {};
for (const t of ['students', 'classes', 'guardian_students', 'gate_badges', 'profiles', 'student_school_profiles']) {
  d.colunas[t] = await q(`colunas ${t}`, `
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns where table_schema='public' and table_name='${t}'
    order by ordinal_position;`);
}

d.fks = await q('FKs das 4 tabelas', `
  select conrelid::regclass::text as tabela, conname, pg_get_constraintdef(oid) as def
  from pg_constraint
  where contype='f' and conrelid in ('public.students'::regclass,'public.classes'::regclass,'public.guardian_students'::regclass,'public.gate_badges'::regclass)
  order by 1,2;`);

d.policies = await q('policies fixture', `
  select tablename as tabela, policyname, cmd, roles::text as papeis, qual, with_check
  from pg_policies
  where schemaname='public' and tablename in ('students','classes','guardian_students','gate_badges','gate_checkins','profiles')
  order by 1,2;`);

// papéis existentes hoje (para saber se monitor/gatekeeper já têm linhas reais)
d.roles_vivos = await q('roles vivos', `select role::text, count(*)::int as n from public.profiles group by 1 order by 1;`);

writeFileSync(`${DIR}/docs/c2-fixture-recon.json`, JSON.stringify(d, null, 2) + '\n');
stage('fixture-recon', { ficheiro: 'docs/c2-fixture-recon.json', enum: d.enum_roles.length, policies: d.policies.length });
console.log('C2_FIXTURE_RECON_OK');
console.log(JSON.stringify({ enum: d.enum_roles.map(x => x.enumlabel), roles_vivos: d.roles_vivos }, null, 1));