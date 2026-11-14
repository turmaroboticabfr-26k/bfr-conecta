// C2-R — recon read-only das 3 estruturas do transporte (canal SQL, postgres).
import { sql } from './c2-lib.mjs';
import { writeFileSync } from 'node:fs';

const out = { ciclo: 'C2-R', em: new Date().toISOString(), tipo: 'recon-read-only' };

out.student_messages_colunas = await sql(`
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema='public' and table_name='student_messages'
order by ordinal_position`);

out.check_constraints = await sql(`
select con.conrelid::regclass::text as tabela, con.conname, pg_get_constraintdef(con.oid) as def
from pg_constraint con
where con.conrelid in (to_regclass('public.route_incidents'), to_regclass('public.student_messages'))
order by 1,2`);

out.triggers_transporte = await sql(`
select t.tgrelid::regclass::text as tabela, t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) as def
from pg_trigger t
where t.tgrelid in (to_regclass('public.route_incidents'), to_regclass('public.student_messages'), to_regclass('public.gate_checkins'))
  and not t.tgisinternal
order by 1,2`);

out.gate_checkins_policies_escrita = await sql(`
select pol.polname, pol.polcmd,
       pg_get_expr(pol.polqual, pol.polrelid) as using,
       pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check,
       pol.polroles::regrole[]::text[] as papeis
from pg_policy pol
where pol.polrelid = to_regclass('public.gate_checkins')
  and pol.polcmd in ('a','w','*')
order by pol.polname`);

out.funcao_register_gate_checkin = await sql(`
select p.proname, p.prosecdef, p.proowner::regrole::text as dono,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_functiondef(p.oid) as corpo,
       (select string_agg(g::text,';') from aclexplode(coalesce(p.proacl,'{}'::aclitem[])) g) as proacl
from pg_proc p
where p.proname in ('register_gate_checkin','is_gatekeeper')
  and p.pronamespace = 'public'::regnamespace
order by p.proname`);

out.colunas_aluno_turma = await sql(`
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and ((table_name='students' and column_name in ('id','official_name','full_name','class_id'))
    or (table_name='classes' and column_name in ('id','year','class_code','grade_level','school_id')))
order by table_name, column_name`);

out.funcoes_que_citam_status = await sql(`
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and (p.prosrc like '%pending_guardian%' or p.prosrc like '%notified_at%')
order by p.proname`);

// O md5 tem de ser recontável com a MESMA expressão na passada seguinte (limpeza do
// jornada). Por isso a expressão é gravada junto do baseline, não reimplementada à mão.
out.baseline = (await sql(`
select 'route_incidents' as t, count(*)::int as n, md5(string_agg(id::text||notification_status||coalesce(notified_at::text,''),'' order by id::text)) as h,
       $$md5(string_agg(id::text||notification_status||coalesce(notified_at::text,''),'' order by id::text))$$ as expr from public.route_incidents
union all
select 'student_messages', count(*)::int, md5(string_agg(id::text||category||coalesce(body,''),'' order by id::text)),
       $$md5(string_agg(id::text||category||coalesce(body,''),'' order by id::text))$$ from public.student_messages
union all
select 'gate_checkins', count(*)::int, md5(string_agg(id::text||coalesce(intake_source,''),'' order by id::text)),
       $$md5(string_agg(id::text||coalesce(intake_source,''),'' order by id::text))$$ from public.gate_checkins
union all
select 'gate_entry_alerts', count(*)::int, md5(string_agg(id::text,'' order by id::text)),
       $$md5(string_agg(id::text,'' order by id::text))$$ from public.gate_entry_alerts`)).map((r) => ({ t: r.t, n: r.n, h: r.h, expr: r.expr }));

writeFileSync(new URL('../docs/c2r-recon.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('c2r-recon.json gravado;', Object.keys(out).join(', '));
console.log('student_messages colunas:', out.student_messages_colunas.map(c => c.column_name).join(','));
console.log('check_constraints:', JSON.stringify(out.check_constraints));
console.log('triggers:', JSON.stringify(out.triggers_transporte.map(t => t.tabela + '.' + t.tgname)));
console.log('gate_checkins escrita policies:', JSON.stringify(out.gate_checkins_policies_escrita));
console.log('funcoes citam status:', JSON.stringify(out.funcoes_que_citam_status));
console.log('baseline:', JSON.stringify(out.baseline));
