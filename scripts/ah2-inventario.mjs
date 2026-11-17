// AH-2 inventário (SÓ LEITURA): o CHECK de staff_schools.role e a classe exata do resíduo deixado
// pelo mint interrompido. Nada é escrito; a lista é medida por predicado, nunca por memória.
import { readFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
};
console.log('=== CHECK de staff_schools ===');
console.log(JSON.stringify(await sql(`select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.staff_schools'::regclass;`), null, 1));
console.log('\n=== resíduo AH-2 (classe medida por predicado) ===');
console.log('auth.users ah2-:', JSON.stringify(await sql(`select u.id, u.email, p.role::text as role from auth.users u left join public.profiles p on p.id=u.id where u.email like 'ah2-%@bfr-conecta.test' order by u.email;`), null, 1));
console.log('\nstaff_schools desses perfis:', JSON.stringify(await sql(`select s.id, s.role, u.email from public.staff_schools s join auth.users u on u.id=s.profile_id where u.email like 'ah2-%@bfr-conecta.test';`)));
console.log('bfr_teacher_directory com profile_id de resíduo:', JSON.stringify(await sql(`select d.id, d.display_name from public.bfr_teacher_directory d join auth.users u on u.id=d.profile_id where u.email like 'ah2-%@bfr-conecta.test';`)));
console.log('contagens agora: users', (await sql('select count(*)::int n from auth.users;'))[0].n, 'profiles', (await sql('select count(*)::int n from public.profiles;'))[0].n, 'staff', (await sql('select count(*)::int n from public.staff_schools;'))[0].n);
