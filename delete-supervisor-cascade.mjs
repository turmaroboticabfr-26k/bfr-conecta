import fs from 'fs';
import fetch from 'node-fetch';

const USER_ID = 'a6624c51-8b6e-41cd-b8d1-f227eacb2273';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  console.log('Deletando supervision_audit...');
  const sql1 = `delete from public.supervision_audit where profile_id = '${USER_ID}' returning id`;
  const res1 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql1 })
  });
  const data1 = await res1.json();
  console.log('supervision_audit:', res1.status, JSON.stringify(data1));

  console.log('\nDeletando profiles...');
  const sql2 = `delete from public.profiles where id = '${USER_ID}' returning id, email`;
  const res2 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql2 })
  });
  const data2 = await res2.json();
  console.log('profiles:', res2.status, JSON.stringify(data2));

  console.log('\nDeletando auth.users...');
  const sql3 = `delete from auth.users where id = '${USER_ID}' returning id, email`;
  const res3 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql3 })
  });
  const data3 = await res3.json();
  console.log('auth.users:', res3.status, JSON.stringify(data3));

  console.log('\nVerificando deleção...');
  const sql4 = `select count(*) as users from auth.users where id = '${USER_ID}'`;
  const res4 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql4 })
  });
  const data4 = await res4.json();
  console.log('Contagem:', JSON.stringify(data4));
}

main().catch(console.error);
