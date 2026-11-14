// RM-1.2 — baseline PRÉ do ciclo "aprovação administrativa de contas" (read-only).
// Sem mint, sem escrita: contagem E md5 por tabela + histograma de papéis + as contas de teste que já vivem no banco.
import { writeFileSync } from 'node:fs';
import { DIR, sql, admin } from './s19-lib.mjs';

const OUT = `${DIR}/evidence/roadmap-rm12-baseline.json`;

const TABELAS = ['profiles', 'access_requests'];
const snap = { ciclo: 'RM-1.2', em: new Date().toISOString(), tabelas: {} };

for (const t of TABELAS) {
  const rows = await sql(`select count(*)::int as n from public.${t};`);
  const hash = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from public.${t}) x;`);
  snap.tabelas[t] = { n: rows[0].n, md5: hash[0].h ?? 'empty' };
  console.log(`${t}: n=${snap.tabelas[t].n} md5=${snap.tabelas[t].md5}`);
}

const papeis = await sql(`select role::text as role, count(*)::int as n from public.profiles group by 1 order by 1;`);
snap.papeis = Object.fromEntries(papeis.map(r => [r.role, r.n]));
console.log('\npapéis em profiles:');
for (const r of papeis) console.log(`  ${r.role}: ${r.n}`);
snap.pending_vivas = await sql(`select id, email, role::text as role, created_at from public.profiles where role='pending' order by created_at;`);
console.log(`\ncontas pending vivas: ${snap.pending_vivas.length}`);
for (const p of snap.pending_vivas) console.log(`  ${p.id} · ${p.email} · ${p.created_at}`);

const estados = await sql(`select status::text as status, count(*)::int as n from public.access_requests group by 1 order by 1;`);
snap.access_requests_por_status = Object.fromEntries(estados.map(r => [r.status, r.n]));
console.log('\naccess_requests por status:');
for (const r of estados) console.log(`  ${r.status}: ${r.n}`);

// As contas do domínio de teste já existentes — o ciclo não pode mexer nelas nem confundi-las com a sua própria fixture.
snap.test_contas = await sql(`select id, email, role::text as role, created_at from public.profiles where email like '%@bfr-conecta.test' order by created_at;`);
console.log(`\ncontas @bfr-conecta.test já vivas: ${snap.test_contas.length}`);
for (const p of snap.test_contas) console.log(`  ${p.id} · ${p.email} · ${p.role} · ${p.created_at}`);

// Catálogo do lado Auth: total de utilizadores (Admin API paginada, nada impresso além de contagens).
let authTotal = 0, page = 1;
for (;;) {
  const r = await admin(`/auth/v1/admin/users?page=${page}&per_page=1000`);
  if (r.status !== 200 || !Array.isArray(r.j?.users)) { authTotal = -1; snap.auth_error = `HTTP ${r.status}`; break; }
  authTotal += r.j.users.length;
  if (r.j.users.length < 1000) break;
  page++;
}
snap.auth_users_total = authTotal;
console.log(`\nauth.users total: ${authTotal}`);

writeFileSync(OUT, JSON.stringify(snap, null, 2) + '\n');
console.log(`\nbaseline escrita em ${OUT}`);
console.log('RM12_BASELINE_OK');
