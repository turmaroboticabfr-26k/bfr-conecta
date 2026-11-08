import fs from 'fs';
import fetch from 'node-fetch';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  console.log('Verificando constraint schools_phase_check...');
  const sql = `select pg_get_constraintdef(oid) from pg_constraint where conname = 'schools_phase_check'`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const data = await res.json();
  console.log('constraint:', res.status, JSON.stringify(data, null, 2));
}

main().catch(console.error);
