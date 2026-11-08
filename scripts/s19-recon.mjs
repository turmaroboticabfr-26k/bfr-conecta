// S19-1 — recon read-only. Nada escrito. Credenciais de ficheiro, nunca impressas.
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const token = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/s19-recon.json';

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

const recon = { ciclo: 'S19', em: new Date().toISOString(), queries: {} };
const q = async (nome, query, resumo) => {
  recon.queries[nome] = await sql(query);
  console.log(`[${nome}] ${resumo ? resumo(recon.queries[nome]) : JSON.stringify(recon.queries[nome]).slice(0, 200)}`);
};

const polQuery = (t) => `
  select polname, polcmd,
    pg_get_expr(polqual, polrelid) as using_expr,
    pg_get_expr(polwithcheck, polrelid) as check_expr
  from pg_policy where polrelid = '${t}'::regclass order by polname;`;

await q('policies_requests', polQuery('public.supervision_requests'), r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);
await q('policies_responses', polQuery('public.supervision_responses'), r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);
await q('policies_attachments', polQuery('public.supervision_response_attachments'), r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);
await q('policies_action_plans', polQuery('public.supervision_action_plans'), r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);
await q('policies_sports_schools', polQuery('public.sports_schools'), r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);
await q('policies_staff_schools', polQuery('public.staff_schools'), r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);
await q('policies_learning_plans', polQuery('public.learning_action_plans'), r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);

await q('storage_policies', `
  select polname, polcmd,
    pg_get_expr(polqual, polrelid) as using_expr,
    pg_get_expr(polwithcheck, polrelid) as check_expr
  from pg_policy
  where polrelid = 'storage.objects'::regclass and polname like 'bfr_supervision%'
  order by polname;`, r => `${r.length} policies: ${r.map(p => p.polname).join(', ')}`);

await q('fn_is_supervisor', `select pg_get_functiondef(oid) as def from pg_proc where proname='bfr_is_education_supervisor';`, r => r.length ? 'existe' : 'NÃO EXISTE');
await q('fn_school_staff_ids', `select pg_get_functiondef(oid) as def from pg_proc where proname='bfr_school_staff_ids';`, r => r.length ? 'existe' : 'NÃO EXISTE');

await q('sports_schools_rows', `select id::text, name from public.sports_schools order by name;`, r => `${r.length} escolas: ${r.map(s => s.name).join(' | ')}`);
await q('staff_schools_rows', `select id::text, profile_id::text, school_id::text, role from public.staff_schools order by created_at;`, r => `${r.length} vínculos`);
await q('staff_schools_emails', `
  select ss.profile_id::text, p.email, p.role::text as profile_role, ss.role as link_role, ss.school_id::text
  from public.staff_schools ss join public.profiles p on p.id = ss.profile_id order by p.email;`,
  r => r.map(x => `${x.email}(${x.profile_role})→${x.school_id.slice(0,8)}`).join(' | '));

await q('counts', `
  select 'supervision_requests' as t, count(*)::int as n from public.supervision_requests
  union all select 'supervision_responses', count(*)::int from public.supervision_responses
  union all select 'supervision_response_attachments', count(*)::int from public.supervision_response_attachments
  union all select 'supervision_action_plans', count(*)::int from public.supervision_action_plans
  union all select 'supervision_alerts', count(*)::int from public.supervision_alerts
  union all select 'supervision_audit', count(*)::int from public.supervision_audit
  union all select 'learning_action_plans', count(*)::int from public.learning_action_plans
  union all select 'support_requests', count(*)::int from public.support_requests
  union all select 'storage_objects_bucket', count(*)::int from storage.objects where bucket_id='secretary-attachments';`,
  r => r.map(x => `${x.t}=${x.n}`).join(' · '));

await q('bucket', `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='secretary-attachments';`);
await q('attachments_cols', `
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema='public' and table_name='supervision_response_attachments' order by ordinal_position;`,
  r => r.map(c => `${c.column_name}:${c.data_type}${c.is_nullable === 'NO' ? '!' : ''}`).join(' · '));
await q('responses_cols', `
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema='public' and table_name='supervision_responses' order by ordinal_position;`,
  r => r.map(c => `${c.column_name}:${c.data_type}${c.is_nullable === 'NO' ? '!' : ''}`).join(' · '));
await q('requests_cols', `
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema='public' and table_name='supervision_requests' order by ordinal_position;`,
  r => r.map(c => `${c.column_name}:${c.data_type}${c.is_nullable === 'NO' ? '!' : ''}`).join(' · '));

await q('storage_objects_existentes', `
  select id::text, name, bucket_id, created_at::text
  from storage.objects where bucket_id='secretary-attachments' order by created_at limit 20;`,
  r => `${r.length} objetos no bucket`);

await q('contas_teste_vivas', `
  select id::text, email from auth.users where email like '%@bfr-conecta.test' or email like '%@bfr.test';`,
  r => `${r.length} contas de teste vivas`);

writeFileSync(OUT, JSON.stringify(recon, null, 2) + '\n');
console.log('\nS19_RECON_OK — evidence/s19-recon.json');