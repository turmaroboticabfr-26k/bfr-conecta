// C2-0 — recon SOMENTE-LEITURA do transporte na v118 (catálogo do banco).
// Perguntas: (1) existe trigger route_incidents→student_messages? (2) a RPC da portaria
// notifica o responsável na entrada/saída? (3) policies das 3 tabelas. Zero escrita.
import { writeFileSync } from 'node:fs';
import { sql, DIR, stage } from './s19-lib.mjs';

const q = async (nome, query) => { const r = await sql(query); console.log(nome, 'linhas:', Array.isArray(r) ? r.length : '?'); return r; };
const d = { ciclo: 'C2', em: new Date().toISOString(), tipo: 'recon-read-only' };

d.triggers = await q('triggers', `
  select event_object_table as tabela, trigger_name, action_timing, event_manipulation, action_statement
  from information_schema.triggers
  where event_object_schema='public' and event_object_table in ('route_incidents','student_messages','gate_checkins')
  order by 1,2;`);

d.policies = await q('policies', `
  select tablename as tabela, policyname, cmd, roles::text as papeis, qual, with_check
  from pg_policies
  where schemaname='public' and tablename in ('route_incidents','student_messages','gate_checkins','guardian_students')
  order by 1,2;`);

d.colunas_route = await q('colunas route_incidents', `
  select column_name, data_type, column_default, is_nullable
  from information_schema.columns
  where table_schema='public' and table_name='route_incidents' order by ordinal_position;`);

d.funcoes_gate = await q('funções gate', `
  select p.proname, pg_get_function_identity_arguments(p.oid) as args,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
         length(pg_get_functiondef(p.oid)) as chars
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and (p.proname ilike '%gate%' or p.proname ilike '%checkin%')
  order by 1;`);

d.funcoes_notificam = await q('funções que escrevem student_messages', `
  select p.proname, pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f' and p.prosrc ilike '%student_messages%'
  order by 1;`);

d.funcoes_rota = await q('funções que citam route_incidents', `
  select p.proname, pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f' and p.prosrc ilike '%route_incidents%'
  order by 1;`);

d.realtime = await q('publication', `
  select tablename from pg_publication_tables
  where pubname='supabase_realtime' and tablename in ('route_incidents','student_messages','gate_checkins')
  order by 1;`);

writeFileSync(`${DIR}/docs/c2-recon.json`, JSON.stringify(d, null, 2) + '\n');
stage('c2-recon', { ficheiro: 'docs/c2-recon.json', triggers: d.triggers.length, policies: d.policies.length, funcoes_gate: d.funcoes_gate.length });
console.log('C2_RECON_OK — docs/c2-recon.json');
console.log(JSON.stringify({ triggers: d.triggers, funcoes_notificam: d.funcoes_notificam, funcoes_rota: d.funcoes_rota, realtime: d.realtime }, null, 1));