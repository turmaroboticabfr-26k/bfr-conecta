import { readFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const checkRLS = `
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class 
WHERE relname = 'schools' AND relkind = 'r'
`;

async function verify() {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: checkRLS })
  });
  
  const data = await res.json();
  console.log('RLS status da tabela schools:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data[0]?.rls_enabled === true) {
    console.log('✓ RLS está habilitado');
  } else {
    console.log('✗ RLS NÃO está habilitado - precisa corrigir');
  }
}

verify();
