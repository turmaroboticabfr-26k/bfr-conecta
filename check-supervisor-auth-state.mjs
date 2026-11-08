import fs from 'fs';
import fetch from 'node-fetch';

const USER_EMAIL = 'supervisor.synthetic@bfr.test';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  const sql = `select id, email, encrypted_password, email_confirmed_at, phone_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, is_sso_user, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at from auth.users where email = '${USER_EMAIL}'`;

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
}

main().catch(console.error);
