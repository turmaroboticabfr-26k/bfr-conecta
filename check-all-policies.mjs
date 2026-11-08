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

console.log('[1] ALL policies em staff_announcements (incluindo RESTRICTIVE):');
const allPolicies = await sql(`
  SELECT 
    polname,
    polcmd,
    polpermissive,
    polroles::regrole[] as roles,
    pg_get_expr(polqual, polrelid) as using_expr,
    pg_get_expr(polwithcheck, polrelid) as check_expr
  FROM pg_policy
  WHERE polrelid = 'staff_announcements'::regclass
  ORDER BY polpermissive, polcmd, polname;
`);
console.log(allPolicies);

console.log('\n[2] Verificar bfr_staff_is_manager():');
const managerFunc = await sql(`
  SELECT proname, prosecdef, pg_get_functiondef(oid) as def
  FROM pg_proc
  WHERE proname = 'bfr_staff_is_manager';
`);
console.log(managerFunc);

console.log('\n[3] Testar bfr_staff_is_manager() para coordinator:');
const testCoord = await sql(`
  SELECT bfr_staff_is_manager() as is_manager;
`);
console.log('  Como postgres:', testCoord);
