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

console.log('[1] Grants em staff_announcements:');
const grants = await sql(`
  SELECT grantee, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_name = 'staff_announcements'
  ORDER BY grantee, privilege_type;
`);
console.log(grants);

console.log('\n[2] Column-level grants:');
const colGrants = await sql(`
  SELECT grantee, column_name, privilege_type
  FROM information_schema.role_column_grants
  WHERE table_name = 'staff_announcements'
  ORDER BY grantee, column_name;
`);
console.log(colGrants);

console.log('\n[3] Table owner and ACL:');
const tableInfo = await sql(`
  SELECT relname, relowner::regrole, relacl
  FROM pg_class
  WHERE relname = 'staff_announcements';
`);
console.log(tableInfo);
