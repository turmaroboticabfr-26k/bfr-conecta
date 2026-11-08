#!/usr/bin/env node
// S19-7: limpeza FK-safe + BASELINE_RESTAURADA
import { sql, admin, loadSessions } from './s19-lib.mjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE = join(__dirname, '..', 'evidence');

const baselinePre = JSON.parse(readFileSync(join(EVIDENCE, 's19-baseline-pre.json'), 'utf8'));
const sessions = loadSessions();

const accounts = [
  sessions.secretary?.uid,
  sessions.director?.uid,
  sessions.coordinator?.uid,
  sessions.supervisor?.uid,
].filter(Boolean);

const accountsArr = `{${accounts.join(',')}}`;

console.log('[S19-7] Limpeza FK-safe');
console.log(`Contas a remover: ${accounts.length}`);

// 1. Deletar fixture data (ordem FK-safe)
console.log('\n[1] Deletar supervision_response_attachments');
const r1 = await sql(`delete from public.supervision_response_attachments where id in (
  select id from public.supervision_response_attachments
  where response_id in (select id from public.supervision_responses where created_by = any('${accountsArr}'::uuid[]))
     or response_id in (select id from public.supervision_responses where request_id in (select id from public.supervision_requests where created_by = any('${accountsArr}'::uuid[])))
);`);
console.log(`  Linhas removidas: ${r1.length}`);

console.log('\n[2] Deletar supervision_responses');
const r2 = await sql(`delete from public.supervision_responses where created_by = any('${accountsArr}'::uuid[]);`);
console.log(`  Linhas removidas: ${r2.length}`);

console.log('\n[3] Deletar supervision_action_plans');
const r3 = await sql(`delete from public.supervision_action_plans where created_by = any('${accountsArr}'::uuid[]);`);
console.log(`  Linhas removidas: ${r3.length}`);

console.log('\n[4] Deletar supervision_requests');
const r4 = await sql(`delete from public.supervision_requests where created_by = any('${accountsArr}'::uuid[]);`);
console.log(`  Linhas removidas: ${r4.length}`);

console.log('\n[5] Deletar supervision_audit (linhas do ciclo)');
const r5 = await sql(`delete from public.supervision_audit where profile_id = any('${accountsArr}'::uuid[]);`);
console.log(`  Linhas removidas: ${r5.length}`);

console.log('\n[6] Deletar staff_schools (vínculos das contas sintéticas)');
const r6 = await sql(`delete from public.staff_schools where profile_id = any('${accountsArr}'::uuid[]);`);
console.log(`  Linhas removidas: ${r6.length}`);

console.log('\n[7] Storage objects (já limpo pelo S19-5)');
const r7 = { length: 0 };
console.log('  (placeholder .emptyFolderPlaceholder permanece)');

// 2. Deletar contas via Admin API
console.log('\n[8] Deletar contas sintéticas (Admin API)');
for (const uid of accounts) {
  const r = await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  console.log(`  ${uid.slice(0,8)}... → HTTP ${r.status}`);
}

// 3. Conferência de baseline
console.log('\n[9] Conferência de baseline');
const tabelas = [
  ['auth.users', 'auth.users'],
  ['public.profiles', 'public.profiles'],
  ['public.sports_schools', 'public.sports_schools'],
  ['public.staff_schools', 'public.staff_schools'],
  ['public.supervision_requests', 'public.supervision_requests'],
  ['public.supervision_responses', 'public.supervision_responses'],
  ['public.supervision_response_attachments', 'public.supervision_response_attachments'],
  ['public.supervision_action_plans', 'public.supervision_action_plans'],
  ['public.supervision_alerts', 'public.supervision_alerts'],
  ['public.supervision_audit', 'public.supervision_audit'],
  ['public.learning_action_plans', 'public.learning_action_plans'],
  ['public.support_requests', 'public.support_requests'],
  ['storage.objects(secretary-attachments)', `(select * from storage.objects where bucket_id='secretary-attachments') sub`],
];

let ok = 0, fail = 0;
const pos = {};
for (const [nome, from] of tabelas) {
  const rows = await sql(`select count(*)::int as n from ${from};`);
  const hashRows = await sql(`select md5(string_agg(t::text, ',' order by t::text)) as h from (select * from ${from}) t;`);
  const n = rows[0].n;
  const md5 = hashRows[0].h || 'empty';
  pos[nome] = { n, md5 };
  const pre = baselinePre.tabelas[nome];
  const match = pre.n === n && pre.md5 === md5;
  if (match) { ok++; console.log(`  ✓ ${nome}: ${n} (md5 ${md5.slice(0,8)}...)`); }
  else { fail++; console.log(`  ✗ ${nome}: esperado ${pre.n}/${pre.md5.slice(0,8)}..., got ${n}/${md5.slice(0,8)}...`); }
}

console.log(`\nBaseline: ${ok}/${tabelas.length} OK, ${fail} falhas`);

// 4. Persistir evidência
const diary = JSON.parse(readFileSync(join(EVIDENCE, 's19-diary.json'), 'utf8'));
diary.stages.cleanup = {
  em: new Date().toISOString(),
  linhas_removidas: {
    attachments: r1.length,
    responses: r2.length,
    action_plans: r3.length,
    requests: r4.length,
    audit: r5.length,
    staff_schools: r6.length,
    storage: r7.length,
  },
  contas_removidas: accounts.length,
  baseline: { ok, fail, total: tabelas.length },
};
writeFileSync(join(EVIDENCE, 's19-diary.json'), JSON.stringify(diary, null, 2));

writeFileSync(join(EVIDENCE, 's19-baseline-pos.json'), JSON.stringify({
  ciclo: 'S19',
  fase: 'pos',
  em: new Date().toISOString(),
  tabelas: pos,
}, null, 2));

console.log('\n[S19-7] Limpeza concluída');
if (fail > 0) {
  console.error('ATENÇÃO: baseline não restaurada completamente');
  process.exit(1);
}
