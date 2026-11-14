// RM-1.2 recon — set_profile_role, access_requests, policies de perfis. Read-only.
import { writeFileSync } from 'node:fs';
import { sql, DIR } from './s19-lib.mjs';

const out = {};

out.set_profile_role = await sql(`select pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='set_profile_role';`);
console.log('== set_profile_role');
console.log(out.set_profile_role[0]?.def);

out.acl = await sql(`select p.proname, p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='set_profile_role';`);
console.log('== ACL:', JSON.stringify(out.acl));

out.access_requests = await sql(`select column_name, data_type from information_schema.columns where table_schema='public' and table_name='access_requests' order by ordinal_position;`);
console.log('== access_requests cols:', JSON.stringify(out.access_requests.map(c => c.column_name)));

out.policies_profiles = await sql(`select policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='profiles' order by policyname;`);
for (const p of out.policies_profiles) console.log(`\n== profiles policy: ${p.policyname} (${p.cmd})`);
for (const p of out.policies_profiles) console.log(`   ${p.policyname}: ${p.qual?.replace(/\s+/g,' ').slice(0,300)}`);

out.policies_access_requests = await sql(`select policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='access_requests' order by policyname;`);
console.log('\n== access_requests policies:', JSON.stringify(out.policies_access_requests.map(p => p.policyname)));

out.test_contas_vivas = await sql(`select count(*)::int n from public.profiles where email ilike '%@bfr-conecta.test';`);
console.log('== contas @bfr-conecta.test vivas em profiles:', out.test_contas_vivas);

writeFileSync(`${DIR}/evidence/roadmap-rm12-recon.json`, JSON.stringify(out, null, 2) + '\n');
