// Resíduo project-wide depois da rotação das 8 (somente-leitura).
// Quantas sessões e refresh tokens vivos restam no projecto, a quem pertencem, e se alguma
// linha-fantasma (SQL sem GoTrue) sobra. Não escreve.
import { admin, sql } from './s19-lib.mjs';

const mask = (e) => {
  const [local, dom] = String(e || '').split('@');
  return /^(test|bfr|synth|audit|seed|demo|supervis)/i.test(local) ? `${local}@${dom}` : `<${local.length} chars>@${dom}`;
};

const s = await sql(`select count(*)::int as n from auth.sessions`);
const r = await sql(`select count(*)::int as total, count(*) filter (where revoked is distinct from true)::int as vivas from auth.refresh_tokens`);
console.log(`auth.sessions project-wide: ${s[0].n} | auth.refresh_tokens: ${r[0].total} (vivas ${r[0].vivas})`);

const por = await sql(`select u.id, u.email, count(rt.id)::int as refresh, count(rt.id) filter (where rt.revoked is distinct from true)::int as vivas, count(distinct ses.id)::int as sessoes
  from auth.users u
  left join auth.refresh_tokens rt on rt.user_id = u.id::text
  left join auth.sessions ses on ses.user_id = u.id
  group by u.id, u.email having count(rt.id) > 0 or count(ses.id) > 0 order by u.email`);
console.log(`contas com sessão ou refresh token: ${por.length}`);
for (const p of por) console.log(`   ${p.id.slice(0, 8)} | ${mask(p.email)} | refresh=${p.refresh} vivas=${p.vivas} sessões=${p.sessoes}`);

const lista = await admin('/auth/v1/admin/users?page=1&per_page=200', { method: 'GET' });
const idsGoTrue = new Set((lista.j?.users || []).map((u) => u.id));
const rows = await sql(`select id, email, created_at, last_sign_in_at, left(encrypted_password,3) as prefixo from auth.users order by created_at`);
const fantasmas = rows.filter((u) => !idsGoTrue.has(u.id));
console.log(`\nlinhas-fantasma (SQL, GoTrue não lista): ${fantasmas.length} de ${rows.length}`);
for (const f of fantasmas) console.log(`   ${f.id.slice(0, 8)} | ${mask(f.email)} | hash=${f.prefixo === '$2a' || f.prefixo === '$2b' ? 'bcrypt' : f.prefixo} | ultimo_login=${f.last_sign_in_at ?? 'NULL'}`);
const naoBcrypt = rows.filter((u) => u.prefixo !== '$2a' && u.prefixo !== '$2b');
console.log(`contas com hash não-bcrypt (OAuth/vazio): ${naoBcrypt.length}`);
