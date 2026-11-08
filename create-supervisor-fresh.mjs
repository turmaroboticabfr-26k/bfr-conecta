import bcrypt from 'bcrypt';
import fs from 'fs';
import fetch from 'node-fetch';

const SALT_ROUNDS = 10;
const NEW_PASSWORD = 'supervisor123';
const NEW_USER_ID = 'b7725c51-9b6e-42cd-c9d2-f338facd3384';
const NEW_EMAIL = 'supervisor.test2@gmail.com';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
  console.log('Hash gerado:', hash);

  const sql = `
    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      phone_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      is_sso_user,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '${NEW_USER_ID}',
      'authenticated',
      'authenticated',
      '${NEW_EMAIL}',
      '${hash}',
      now(),
      now(),
      null,
      null,
      null,
      null,
      false,
      '{"provider":"email","providers":["email"]}',
      '{"role":"education_supervisor","full_name":"Supervisor Teste 2"}',
      now(),
      now()
    )
    returning id, email, email_confirmed_at, encrypted_password
  `;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Resposta:', JSON.stringify(data, null, 2));

  if (res.status === 201 && data.length > 0) {
    console.log('\nConta criada com sucesso!');
    console.log('User ID:', data[0].id);
    console.log('Email:', data[0].email);
    console.log('Password: supervisor123');
  }
}

main().catch(console.error);
