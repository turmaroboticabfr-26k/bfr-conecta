// Por que o PUT /auth/v1/admin/users/:id deu 404? GET (somente-leitura) em cada um dos 8 alvos
// + um DELETE-void probe de rota. Imprime só status, id e domínio mascarado.
import { admin, sql } from './s19-lib.mjs';

const IDS = [
  ['d44be8ab-3ce9-47fc-8c0c-5278ebd72028', 'test.local'],
  ['66046b00-af4b-4b1c-b094-dcaa5a6624b2', 'test.local'],
  ['c2cb43eb-d1e6-4ba2-896c-639bb6370c76', 'test.local'],
  ['341c2671-0b93-4639-85cf-fbaad72582ba', 'test.local'],
  ['981fcbb0-0f60-4001-a279-ef49b7e942b3', 'bfr-admin.test'],
  ['0afd82b2-b140-4aaf-8af0-fc7647348d25', 'bfr.test'],
  ['635ac53e-7eef-4539-91b6-d4e41a38b7e1', 'bfr.test'],
  ['5d0821e0-6893-48b0-94b1-90b9cfcdc052', 'bfr.test'],
];

const rows = await sql(`select id, email, created_at, phone, is_sso_user, deleted_at from auth.users order by created_at`);
for (const [id, dom] of IDS) {
  const g = await admin(`/auth/v1/admin/users/${id}`, { method: 'GET' });
  const r = rows.find((u) => u.id === id);
  const corpo = JSON.stringify(g.j).slice(0, 160);
  console.log(`GET ${id.slice(0, 8)} (${dom}) -> HTTP ${g.status} | body=${g.status === 200 ? 'ok' : corpo}`);
  if (r) console.log(`     sql: criado=${r.created_at} | phone=${r.phone ? 'SIM' : 'NULL'} | is_sso_user=${r.is_sso_user} | deleted_at=${r.deleted_at ?? 'NULL'}`);
  else console.log('     sql: SEM LINHA');
}
// rota de lista: quantas contas o GoTrue devolve por paginação própria?
const l = await admin('/auth/v1/admin/users?page=1&per_page=200', { method: 'GET' });
const n = Array.isArray(l.j?.users) ? l.j.users.length : -1;
console.log(`\nlista admin: HTTP ${l.status} | users=${n} | total_count=${l.j?.aud ? '?' : ''}${l.j?.users?.length ?? '?'}`);
const sqlN = await sql(`select count(*)::int as n from auth.users`);
console.log(`auth.users por SQL: ${sqlN[0].n}`);
if (n >= 0) {
  const idsGoTrue = new Set(l.j.users.map((u) => u.id));
  const faltando = rows.filter((u) => !idsGoTrue.has(u.id));
  console.log(`contas em SQL que o GoTrue NÃO lista: ${faltando.length}`);
  for (const u of faltando) console.log(`   ${u.id.slice(0, 8)} | ${String(u.email).split('@')[1]} | criado=${u.created_at}`);
}
