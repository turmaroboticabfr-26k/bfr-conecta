import fs from 'fs';
import fetch from 'node-fetch';

const NEW_USER_ID = 'b7725c51-9b6e-42cd-c9d2-f338facd3384';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  console.log('Criando escolas sintéticas...');
  const sql1 = `
    insert into public.schools (id, name, code, address_line, city, state, phase, active, created_at, updated_at)
    values
      (gen_random_uuid(), 'Escola Alpha', 'ALPHA', 'Rua A, 100', 'São Paulo', 'SP', 'fundamental_i', true, now(), now()),
      (gen_random_uuid(), 'Escola Beta', 'BETA', 'Rua B, 200', 'Rio de Janeiro', 'RJ', 'fundamental_ii', true, now(), now()),
      (gen_random_uuid(), 'Escola Gamma', 'GAMMA', 'Rua C, 300', 'Belo Horizonte', 'MG', 'medio', true, now(), now())
    returning id, name, code
  `;
  const res1 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql1 })
  });
  const data1 = await res1.json();
  console.log('schools:', res1.status, JSON.stringify(data1, null, 2));

  if (data1.length === 3) {
    console.log('\nCriando vínculos em staff_schools...');
    const sql2 = `
      insert into public.staff_schools (profile_id, school_id, role)
      values
        ('${NEW_USER_ID}', '${data1[0].id}', 'education_supervisor'),
        ('${NEW_USER_ID}', '${data1[1].id}', 'education_supervisor'),
        ('${NEW_USER_ID}', '${data1[2].id}', 'education_supervisor')
      returning profile_id, school_id, role
    `;
    const res2 = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql2 })
    });
    const data2 = await res2.json();
    console.log('staff_schools:', res2.status, JSON.stringify(data2, null, 2));
  }

  console.log('\nVerificando conta completa...');
  const sql3 = `
    select u.id, u.email, p.full_name, p.role, count(ss.id) as escolas
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.staff_schools ss on ss.profile_id = u.id
    where u.id = '${NEW_USER_ID}'
    group by u.id, u.email, p.full_name, p.role
  `;
  const res3 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql3 })
  });
  const data3 = await res3.json();
  console.log('Conta:', res3.status, JSON.stringify(data3, null, 2));
}

main().catch(console.error);
