import fs from 'fs';
import fetch from 'node-fetch';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function main() {
  console.log('FKs de staff_schools...');
  const sql = `
    select
      tc.constraint_name,
      kcu.column_name,
      ccu.table_schema as foreign_table_schema,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    from information_schema.table_constraints as tc
    join information_schema.key_column_usage as kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage as ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name = 'staff_schools'
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
  console.log('FKs:', res.status, JSON.stringify(data, null, 2));

  console.log('\nEstrutura de sports_schools...');
  const sql2 = `select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'sports_schools' order by ordinal_position`;
  const res2 = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql2 })
  });
  const data2 = await res2.json();
  console.log('sports_schools:', res2.status, JSON.stringify(data2, null, 2));
}

main().catch(console.error);
