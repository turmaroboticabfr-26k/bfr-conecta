// Recon somente-leitura do "supervisor" visado pelo reset-supervisor-password.mjs.
// O USER_ID do script nao devolveu linha — isto confirma com controle positivo (o canal le
// mesmo auth.users) e procura a conta pelo nome, porque o UUID pode estar velho.
// Imprime: contagens, dominio, prefixo do local-part quando e padrao de teste, comprimentos
// e os primeiros 4 caracteres do hash. Nunca imprime senha nem email completo de pessoa real.
import { sql } from './c2-lib.mjs';

const UID = 'a6624c51-8b6e-41cd-b8d1-f227eacb2273';

const total = await sql(`select count(*)::int as n from auth.users`);
const confirm = await sql(`select count(*)::int as n from auth.users where id = '${UID}'`);
const soft = await sql(`select count(*)::int as n from auth.users where deleted_at is not null`);
console.log('CONTROLE POSITIVO auth.users:', JSON.stringify(total));
console.log('linha com o USER_ID do script:', JSON.stringify(confirm), '| macios-apagados:', JSON.stringify(soft));

// sessoes/refresh do id mesmo sem linha em users (historico orfao)
const o = await sql(`select count(*)::int as sessoes from auth.sessions where user_id = '${UID}'`);
console.log('auth.sessions orfaos desse id:', JSON.stringify(o));

const cand = await sql(`
  select id, email, role, created_at, last_sign_in_at,
         char_length(encrypted_password) as pw_len, left(encrypted_password, 4) as pw_prefix
    from auth.users
   where split_part(coalesce(email,''), '@', 1) ~* '(super|supervis|coorden|secret|direc|test|bfr|audit|synth|seed|demo)'
   order by created_at desc
   limit 60`);
const mask = (e) => {
  const [l, d] = String(e || '').split('@');
  return /^(test|bfr|synth|audit|seed|demo|supervis)/i.test(l) ? `${l}@${d}` : `<${l.length} chars>@${d}`;
};
console.log(`candidatos por nome de local-part: ${cand.length}`);
for (const c of cand) {
  console.log(`  ${c.id} | ${mask(c.email)} | role=${c.role} | bcrypt=${/^\$2/.test(c.pw_prefix) ? 'SIM' : 'NAO'} pw_len=${c.pw_len} | criado=${c.created_at} | ultimo_login=${c.last_sign_in_at ?? 'NULL'}`);
}

// contas com hash que NAO e bcrypt — o literal de 7 caracteres do script cairia aqui
const quebradas = await sql(`
  select id, email, role, char_length(encrypted_password) as pw_len, left(encrypted_password, 4) as pw_prefix, updated_at
    from auth.users
   where left(encrypted_password, 2) <> '$2' and encrypted_password <> ''
   limit 30`);
console.log(`contas cujo encrypted_password NAO comeca por $2 (fora do formato bcrypt): ${quebradas.length}`);
for (const q of quebradas) console.log(`  ${q.id} | ${mask(q.email)} | role=${q.role} | len=${q.pw_len} | prefixo=${q.pw_prefix} | updated_at=${q.updated_at}`);
