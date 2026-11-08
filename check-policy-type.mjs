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

console.log('=== Verificar tipo das policies INSERT em staff_announcements ===\n');

const policies = await sql(`
  SELECT 
    pol.polname AS policyname,
    CASE 
      WHEN pol.polpermissive THEN 'PERMISSIVE'
      ELSE 'RESTRICTIVE'
    END AS policy_type,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  WHERE cls.relname = 'staff_announcements'
  AND pol.polcmd = 'INSERT'::char
  ORDER BY pol.polname;
`);

console.log('Policies INSERT:');
policies.forEach(p => {
  console.log(`\n  ${p.policyname}:`);
  console.log(`    Tipo: ${p.policy_type}`);
  console.log(`    WITH CHECK: ${p.with_check_expr}`);
});
