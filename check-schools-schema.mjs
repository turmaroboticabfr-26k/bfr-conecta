import fs from 'fs';
import fetch from 'node-fetch';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  console.log('Estrutura da tabela schools...');
  const sql = `select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'schools' order by ordinal_position`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const data = await res.json();
  console.log('schools:', res.status, JSON.stringify(data, null, 2));
}

main().catch(console.error);
