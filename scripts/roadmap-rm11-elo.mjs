// RM-1.1 — levantamento read-only do elo check-in→frequência. Nada escreve.
import { writeFileSync } from 'node:fs';
import { sql, DIR } from './s19-lib.mjs';

const q = async (nome, query) => {
  try {
    return { nome, ok: true, linhas: await sql(query) };
  } catch (e) {
    return { nome, ok: false, erro: String(e).slice(0, 300) };
  }
};

const results = [];
results.push(await q('tabelas_attend_checkin', `
  select relname, relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and (relname ilike '%attend%' or relname ilike '%check%' or relname ilike '%frequen%')
  and relkind in ('r','v','p') order by relname`));

results.push(await q('triggers_sobre_alvos', `
  select tgname, tgrelid::regclass::text as tabela, pg_get_triggerdef(t.oid) as def
  from pg_trigger t
  where not tgisinternal and (
    tgrelid::regclass::text like 'public.%checkin%' or tgrelid::regclass::text like 'public.attendance%'
  ) order by tabela, tgname`));

results.push(await q('funcoes_citando_checkin_ou_attendance', `
  select p.proname, p.oid::regprocedure::text as assinatura,
    case when p.prosrc ilike '%gate_checkins%' then 'cita gate_checkins' else '' end as cita_gc,
    case when p.prosrc ilike '%attendance%' then 'cita attendance' else '' end as cita_att
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and (p.prosrc ilike '%gate_checkins%' or p.prosrc ilike '%attendance%')
  order by p.proname`));

results.push(await q('policies_citando_checkin', `
  select tablename, policyname, cmd, qual, with_check
  from pg_policies
  where qual ilike '%checkin%' or with_check ilike '%checkin%'
  order by tablename, policyname`));

results.push(await q('funcao_registra_attendance', `
  select p.proname, p.oid::regprocedure::text as assinatura, p.prosrc
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosrc ilike '%insert%attendance%'
  order by p.proname`));

results.push(await q('attendance_no_realtime', `
  select table_name from supabase_realtime.publication_tables
  where table_name ilike '%attend%' or table_name ilike '%checkin%'`));

writeFileSync(`${DIR}/evidence/roadmap-rm11-elo.json`, JSON.stringify(results, null, 2) + '\n');
for (const r of results) {
  console.log(`== ${r.nome} ${r.ok ? `(${r.linhas.length} linhas)` : 'ERRO'}`);
  if (!r.ok) { console.log('   ', r.erro); continue; }
  for (const l of r.linhas.slice(0, 40)) console.log('   ', JSON.stringify(l).slice(0, 400));
}
