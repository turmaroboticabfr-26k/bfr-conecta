// S19 — sonda read-only: triggers das tabelas do ciclo + colunas de alerts/audit + CHECKs de staff_schools.
// Nada escrito no banco. Credencial de ficheiro, nunca impressa.
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const token = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/s19-triggers.json';

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const out = { ciclo: 'S19', em: new Date().toISOString(), queries: {} };

out.queries.triggers_supervision = await sql(`
  select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
  from information_schema.triggers
  where event_object_schema='public'
    and event_object_table in ('supervision_requests','supervision_responses','supervision_response_attachments','supervision_action_plans','supervision_alerts','supervision_audit','staff_schools')
  order by event_object_table, trigger_name;`);
console.log('[1] triggers:', out.queries.triggers_supervision.length);

out.queries.trigger_fns = await sql(`
  select proname, pg_get_functiondef(oid) as def
  from pg_proc
  where proname in (
    select distinct substring(action_statement from 'FUNCTION ([a-zA-Z0-9_]+)')
    from information_schema.triggers
    where event_object_schema='public'
      and event_object_table in ('supervision_requests','supervision_responses','supervision_response_attachments','supervision_action_plans','supervision_alerts','staff_schools')
  );`);
console.log('[2] funções de trigger:', out.queries.trigger_fns.length);

out.queries.alerts_cols = await sql(`
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema='public' and table_name='supervision_alerts'
  order by ordinal_position;`);
console.log('[3] supervision_alerts colunas:', out.queries.alerts_cols.length);

out.queries.audit_cols = await sql(`
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema='public' and table_name='supervision_audit'
  order by ordinal_position;`);
console.log('[4] supervision_audit colunas:', out.queries.audit_cols.length);

out.queries.staff_schools_checks = await sql(`
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid='public.staff_schools'::regclass and contype in ('c','u')
  order by conname;`);
console.log('[5] staff_schools CHECK/UNIQUE:', JSON.stringify(out.queries.staff_schools_checks));

out.queries.responses_checks = await sql(`
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid='public.supervision_responses'::regclass and contype='c'
  order by conname;`);
console.log('[6] supervision_responses CHECK:', JSON.stringify(out.queries.responses_checks));

out.queries.requests_checks = await sql(`
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid='public.supervision_requests'::regclass and contype='c'
  order by conname;`);
console.log('[7] supervision_requests CHECK:', JSON.stringify(out.queries.requests_checks));

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('S19_TRIGGERS_OK — evidence/s19-triggers.json');