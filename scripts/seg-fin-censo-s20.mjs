// Censo das 3 contas S20 cujos pares senha↔conta foram rodados: a linha continua em auth.users?
// Quantas sessões e refresh tokens tem agora? Somente-leitura; não escreve.
import { sql } from './s19-lib.mjs';

const alvo = ['s20-coordinator@bfr.test', 's20-director@bfr.test', 's20-supervisor@bfr.test', 's20-teacher@bfr.test'];
for (const email of alvo) {
  const u = await sql(`select id, email, deleted_at, last_sign_in_at from auth.users where email = '${email}'`);
  if (!u.length) { console.log(`${email} | AUSENTE em auth.users`); continue; }
  const id = u[0].id;
  const rt = await sql(`select count(*)::int as total, count(*) filter (where revoked is distinct from true)::int as vivas from auth.refresh_tokens where user_id = '${id}'`);
  const se = await sql(`select count(*)::int as total from auth.sessions where user_id = '${id}'`);
  console.log(`${email} | id=${id.slice(0, 8)} deleted_at=${u[0].deleted_at ?? 'NULL'} ultimo_login=${u[0].last_sign_in_at ?? 'NULL'} | refresh=${rt[0].total} (vivas ${rt[0].vivas}) | sessões=${se[0].total}`);
}
