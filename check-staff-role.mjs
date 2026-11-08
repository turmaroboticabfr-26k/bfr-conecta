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

console.log('[1] Definição de bfr_staff_role():');
const funcDef = await sql(`
  SELECT pg_get_functiondef(oid) as def
  FROM pg_proc
  WHERE proname = 'bfr_staff_role';
`);
console.log(funcDef[0].def);

console.log('\n[2] Definição de bfr_is_staff():');
const isStaffDef = await sql(`
  SELECT pg_get_functiondef(oid) as def
  FROM pg_proc
  WHERE proname = 'bfr_is_staff';
`);
console.log(isStaffDef[0].def);
