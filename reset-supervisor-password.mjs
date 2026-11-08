import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import fs from 'fs';
import fetch from 'node-fetch';

const SALT_ROUNDS = 10;
const NEW_PASSWORD = randomBytes(18).toString('base64url');
const USER_ID = 'a6624c51-8b6e-41cd-b8d1-f227eacb2273';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
  console.log('Hash gerado:', hash);

  const sql = `update auth.users set encrypted_password = '${hash}', updated_at = now() where id = '${USER_ID}' returning id, email, updated_at`;

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
