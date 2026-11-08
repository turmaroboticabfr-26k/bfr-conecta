import fs from 'fs';
import fetch from 'node-fetch';

const NEW_USER_ID = 'b7725c51-9b6e-42cd-c9d2-f338facd3384';
const NEW_EMAIL = 'supervisor.test2@gmail.com';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  console.log('Atualizando perfil com email e role correto...');
  const sql1 = `
    update public.profiles
    set email = '${NEW_EMAIL}', role = 'education_supervisor'
    where id = '${NEW_USER_ID}'
    returning id, email, full_name, role
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
  console.log('profiles:', res1.status, JSON.stringify(data1, null, 2));

  console.log('\nCriando escolas sintéticas...');
  const sql2 = `
    insert into public.schools (name, address, city, state, country)
    values
      ('Escola Alpha', 'Rua A, 100', 'São Paulo', 'SP', 'Brasil'),
      ('Escola Beta', 'Rua B, 200', 'Rio de Janeiro', 'RJ', 'Brasil'),
      ('Escola Gamma', 'Rua C, 300', 'Belo Horizonte', 'MG', 'Brasil')
    returning id, name
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
  console.log('schools:', res2.status, JSON.stringify(data2, null, 2));

  if (data2.length === 3) {
    console.log('\nCriando vínculos em staff_schools...');
    const sql3 = `
      insert into public.staff_schools (profile_id, school_id, role)
      values
        ('${NEW_USER_ID}', '${data2[0].id}', 'education_supervisor'),
        ('${NEW_USER_ID}', '${data2[1].id}', 'education_supervisor'),
        ('${NEW_USER_ID}', '${data2[2].id}', 'education_supervisor')
      returning profile_id, school_id, role
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
    console.log('staff_schools:', res3.status, JSON.stringify(data3, null, 2));
  }

  console.log('\nVerificando conta completa...');
  const sql4 = `
    select u.id, u.email, p.full_name, p.role, count(ss.id) as escolas
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.staff_schools ss on ss.profile_id = u.id
    where u.id = '${NEW_USER_ID}'
    group by u.id, u.email, p.full_name, p.role
  `;
  const res4 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql4 })
  });
  const data4 = await res4.json();
  console.log('Conta:', res4.status, JSON.stringify(data4, null, 2));
}

main().catch(console.error);
