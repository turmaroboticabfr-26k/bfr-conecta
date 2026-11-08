import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PAT = readFileSync(join(homedir(), '.supabase-pat'), 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const BASE = `https://api.supabase.com/v1/projects/${REF}/database/query`;

const headers = {
  'Authorization': `Bearer ${PAT}`,
  'Content-Type': 'application/json'
};

async function sql(query) {
  const r = await fetch(BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query })
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`SQL ${r.status}: ${t}`);
  }
  return r.json();
}

console.log('[1] ALL policies em profiles (incluindo RESTRICTIVE):');
const allPolicies = await sql(`
  SELECT 
    polname,
    polcmd,
    polpermissive,
    polroles::regrole[] as roles,
    pg_get_expr(polqual, polrelid) as using_expr,
    pg_get_expr(polwithcheck, polrelid) as check_expr
  FROM pg_policy
  WHERE polrelid = 'profiles'::regclass
  ORDER BY polpermissive DESC, polcmd, polname;
`);
console.log(allPolicies);

console.log('\n[2] Verificar se profiles tem RLS habilitado:');
const rlsStatus = await sql(`
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
  WHERE relname = 'profiles';
`);
console.log(rlsStatus);
