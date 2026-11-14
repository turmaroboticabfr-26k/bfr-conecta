#!/usr/bin/env node
// S19 — limpeza cirúrgica das 4 contas sintéticas (OK explícito 11/11/2026).
// Prova: complemento md5 igual antes/depois + zero referências aos 4 UIDs + contas fora do auth.
import { sql, admin, stage } from './s19-lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..');
const EVIDENCE = join(DIR, 'evidence');

const sess = JSON.parse(readFileSync(join(DIR, 's19-sessions.json'), 'utf8'));
const contas = ['secretary', 'director', 'coordinator', 'supervisor'].map((papel) => {
  const uid = sess[papel]?.uid ?? sess[papel]?.user?.id;
  if (!uid) throw new Error(`sem uid para ${papel}`);
  return { papel, uid };
});
const uids = contas.map((c) => c.uid);
const ARR = `{${uids.join(',')}}`;
const LIKE = uids.map((u) => `%${u}%`).join("','");

let portoes = 0;
const falhas = [];
const gate = (nome, ok, detalhe = '') => {
  portoes++;
  if (!ok) falhas.push(`${nome} | ${detalhe}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}${detalhe ? `  [${detalhe}]` : ''}`);
};

console.log('[S19-CLEANUP] Contas alvo:');
for (const c of contas) console.log(`  ${c.papel.padEnd(11)} ${c.uid}`);

const colmap = {};
for (const c of await sql(`select table_name, column_name from information_schema.columns
  where table_schema = 'public'
    and table_name in ('profiles','staff_schools','supervision_requests','supervision_responses',
      'supervision_response_attachments','supervision_action_plans','supervision_audit',
      'supervision_alerts','learning_action_plans','support_requests')
    and data_type = 'uuid' order by table_name, column_name;`)) {
  (colmap[c.table_name] ??= []).push(c.column_name);
}
const storageCols = (await sql(`select column_name from information_schema.columns where table_schema='storage' and table_name='objects';`)).map((r) => r.column_name);
const tem = (t, c) => (colmap[t.replace(/^public\./, '')] ?? []).includes(c);
const temStorage = (c) => storageCols.includes(c);

const req = [
  ['public.profiles', 'id'], ['public.staff_schools', 'profile_id'],
  ['public.supervision_requests', 'created_by'], ['public.supervision_responses', 'created_by'],
  ['public.supervision_responses', 'request_id'],
  ['public.supervision_response_attachments', 'response_id'],
  ['public.supervision_action_plans', 'created_by'], ['public.supervision_audit', 'profile_id'],
];
const faltando = req.filter(([t, c]) => !tem(t, c));
if (faltando.length) { console.error('Colunas em falta:', faltando); process.exit(2); }

const anyUids = `any('${ARR}'::uuid[])`;
const reqFiltro = `created_by = ${anyUids}`;
const respFiltro = `created_by = ${anyUids} or request_id in (select id from public.supervision_requests where ${reqFiltro})`;
const attFiltro = `response_id in (select id from public.supervision_responses where ${respFiltro})`;

const storageFiltro = [
  temStorage('owner_id') ? `owner_id in ('${uids.join("','")}')` : null,
  `name like any(array['${LIKE}'])`,
].filter(Boolean).join(' or ');

const tabelas = [
  { nome: 'auth.users', from: 'auth.users', filtro: `id = ${anyUids}` },
  { nome: 'public.profiles', from: 'public.profiles', filtro: `id = ${anyUids}` },
  { nome: 'public.staff_schools', from: 'public.staff_schools', filtro: `profile_id = ${anyUids}` },
  { nome: 'public.supervision_requests', from: 'public.supervision_requests', filtro: reqFiltro },
  { nome: 'public.supervision_responses', from: 'public.supervision_responses', filtro: respFiltro },
  { nome: 'public.supervision_response_attachments', from: 'public.supervision_response_attachments', filtro: attFiltro },
  { nome: 'public.supervision_action_plans', from: 'public.supervision_action_plans', filtro: `created_by = ${anyUids}` },
  { nome: 'public.supervision_audit', from: 'public.supervision_audit', filtro: `profile_id = ${anyUids}` },
  { nome: 'public.supervision_alerts', from: 'public.supervision_alerts', filtro: tem('supervision_alerts', 'created_by') ? `created_by = ${anyUids}` : null },
  { nome: 'public.learning_action_plans', from: 'public.learning_action_plans', filtro: tem('learning_action_plans', 'created_by') ? `created_by = ${anyUids}` : null },
  { nome: 'public.support_requests', from: 'public.support_requests', filtro: tem('support_requests', 'created_by') ? `created_by = ${anyUids}` : null },
  { nome: "storage.objects(secretary-attachments)", from: `(select * from storage.objects where bucket_id='secretary-attachments') sub`, filtro: storageFiltro },
];

// [0] Varredura global: qualquer coluna created_by/profile_id/user_id em public com referências
const sweepCols = await sql(`select table_name, column_name from information_schema.columns
  where table_schema='public' and data_type='uuid' and column_name in ('created_by','profile_id','user_id') order by table_name;`);
const achados = [];
for (const { table_name, column_name } of sweepCols) {
  const n = (await sql(`select count(*)::int as n from public.${table_name} where ${column_name} = ${anyUids};`))[0].n;
  if (n > 0) achados.push({ table_name, column_name, n });
}
const conhecidos = new Set(['profiles', 'staff_schools', 'supervision_requests', 'supervision_responses', 'supervision_action_plans', 'supervision_audit', 'supervision_alerts', 'learning_action_plans', 'support_requests']);
const desconhecidos = achados.filter((a) => !conhecidos.has(a.table_name));
console.log('\n[0] Varredura de referências:', achados.length ? achados : 'nenhuma');
if (desconhecidos.length) {
  console.error('Referências fora do conjunto conhecido — abortar:', JSON.stringify(desconhecidos));
  process.exit(2);
}

// [1] Baseline PRÉ
const medir = async (t) => {
  const filtro = t.filtro ? ` where not (${t.filtro})` : '';
  const r = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h, count(*)::int as n from (select * from ${t.from}${filtro}) x;`);
  const alvo = t.filtro ? (await sql(`select count(*)::int as n from ${t.from} where ${t.filtro};`))[0].n : 0;
  return { comp_n: r[0].n, comp_h: r[0].h || 'empty', alvo_n: alvo };
};
console.log('\n[1] Baseline PRÉ (complemento = linhas sem referência aos 4 UIDs)');
const pre = {};
for (const t of tabelas) {
  pre[t.nome] = await medir(t);
  console.log(`  ${t.nome}: compl ${pre[t.nome].comp_n} (${pre[t.nome].comp_h.slice(0, 8)}...), alvo ${pre[t.nome].alvo_n}`);
}

// [2] Deletes FK-safe (cirúrgicos)
console.log('\n[2] Deletes FK-safe');
const removidas = {};
const del = async (label, q) => {
  const rows = await sql(q);
  removidas[label] = rows.length;
  console.log(`  ${label}: ${rows.length}`);
};
await del('supervision_response_attachments', `delete from public.supervision_response_attachments where ${attFiltro};`);
await del('supervision_responses', `delete from public.supervision_responses where ${respFiltro};`);
await del('supervision_action_plans', `delete from public.supervision_action_plans where created_by = ${anyUids};`);
await del('supervision_requests', `delete from public.supervision_requests where ${reqFiltro};`);
await del('supervision_audit', `delete from public.supervision_audit where profile_id = ${anyUids};`);
if (tem('supervision_alerts', 'created_by')) await del('supervision_alerts', `delete from public.supervision_alerts where created_by = ${anyUids};`);
if (tem('learning_action_plans', 'created_by')) await del('learning_action_plans', `delete from public.learning_action_plans where created_by = ${anyUids};`);
if (tem('support_requests', 'created_by')) await del('support_requests', `delete from public.support_requests where created_by = ${anyUids};`);
await del('staff_schools', `delete from public.staff_schools where profile_id = ${anyUids};`);
// storage: protect_delete bloqueia DELETE direto por SQL — só pela Storage API, e só se houver alvo
if (pre['storage.objects(secretary-attachments)'].alvo_n > 0) {
  const objetos = await sql(`select name from storage.objects where bucket_id='secretary-attachments' and (${storageFiltro});`);
  for (const o of objetos) {
    const r = await admin(`/storage/v1/object/secretary-attachments/${encodeURIComponent(o.name)}`, { method: 'DELETE' });
    console.log(`  storage ${o.name.slice(0, 60)} → HTTP ${r.status}`);
  }
  removidas['storage.objects(secretary-attachments)'] = objetos.length;
} else {
  removidas['storage.objects(secretary-attachments)'] = 0;
  console.log('  storage.objects(secretary-attachments): 0 (alvo vazio)');
}

// [3] Contas auth (Admin API DELETE; se bloquear por FK, remove profile e repete)
console.log('\n[3] Contas auth (Admin API DELETE)');
const adminDel = {};
for (const c of contas) {
  let r = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'DELETE' });
  if (r.status !== 200) {
    const p = (await sql(`select count(*)::int as n from public.profiles where id = '${c.uid}';`))[0].n;
    if (p > 0) {
      await del(`profiles(${c.papel})`, `delete from public.profiles where id = '${c.uid}';`);
      r = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'DELETE' });
    }
  }
  adminDel[c.papel] = r.status;
  console.log(`  ${c.papel.padEnd(11)} ${c.uid.slice(0, 8)}... → HTTP ${r.status}`);
}

// [4] Baseline PÓS + portões
console.log('\n[4] Baseline PÓS + portões');
const pos = {};
for (const t of tabelas) {
  pos[t.nome] = await medir(t);
  const m = pre[t.nome];
  const compOk = m.comp_h === pos[t.nome].comp_h && m.comp_n === pos[t.nome].comp_n;
  gate(`complemento intacto: ${t.nome}`, compOk, `pre ${m.comp_n}/${m.comp_h.slice(0, 8)}... pós ${pos[t.nome].comp_n}/${pos[t.nome].comp_h.slice(0, 8)}...`);
  gate(`zero referências: ${t.nome}`, pos[t.nome].alvo_n === 0, `alvo=${pos[t.nome].alvo_n}`);
}
for (const c of contas) {
  const g = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'GET' });
  gate(`conta fora do auth: ${c.papel}`, g.status === 404, `GET=${g.status}`);
}

// [5] Evidência
const resumo = {
  ciclo: 'S19', fase: 'cleanup', em: new Date().toISOString(),
  contas: contas.map((c) => ({ ...c, admin_delete: adminDel[c.papel] })),
  removidas,
  baseline: { portoes, falhas },
};
writeFileSync(join(EVIDENCE, 's19-baseline-pre-20261111.json'), JSON.stringify({ ...resumo, fase: 'pre', tabelas: pre }, null, 2) + '\n');
writeFileSync(join(EVIDENCE, 's19-baseline-pos-20261111.json'), JSON.stringify({ ...resumo, fase: 'pos', tabelas: pos }, null, 2) + '\n');
stage('cleanup_20261111', { contas: contas.map((c) => c.uid), removidas, admin_delete: adminDel, portoes, falhas });

const statusPath = join(DIR, 's19-status.json');
const status = JSON.parse(readFileSync(statusPath, 'utf8'));
status.cleanup_20261111 = { em: resumo.em, contas_removidas: contas.length, removidas, portoes, falhas };
writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');

console.log(`\n[S19-CLEANUP] ${falhas.length === 0 ? 'BASELINE_RESTAURADA' : 'FALHAS'} — ${portoes} portões, ${falhas.length} falhas`);
if (falhas.length) {
  for (const f of falhas) console.error('  ' + f);
  process.exit(1);
}
