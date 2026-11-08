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

console.log('[1] Verificar função bfr_is_coordinator:');
const func = await sql(`
  SELECT proname, prosecdef, proacl, pg_get_functiondef(oid) as def
  FROM pg_proc
  WHERE proname = 'bfr_is_coordinator';
`);
console.log(func);

console.log('\n[2] Todas as policies de staff_announcements:');
const policies = await sql(`
  SELECT policyname, cmd, roles, qual, with_check
  FROM pg_policies
  WHERE tablename = 'staff_announcements'
  ORDER BY cmd, policyname;
`);
console.log(policies);

console.log('\n[3] Verificar se há RESTRICTIVE policies em staff_announcements:');
const restrictive = await sql(`
  SELECT polname, polcmd, polroles, polqual, polwithcheck
  FROM pg_policy
  WHERE polrelid = 'staff_announcements'::regclass
    AND polpermissive = false;
`);
console.log('RESTRICTIVE policies:', restrictive.length > 0 ? restrictive : 'nenhuma');

console.log('\n[4] Testar função diretamente (como postgres):');
const testUid = '2323b066-bd54-4609-a824-7e403562caaf'; // coordinator do último teste
const testResult = await sql(`
  SELECT bfr_is_coordinator('${testUid}'::uuid) as is_coord;
`);
console.log('bfr_is_coordinator(coordinator_uid):', testResult);

console.log('\n[5] Verificar perfil do coordinator:');
const profile = await sql(`
  SELECT id, email, role FROM profiles WHERE id = '${testUid}'::uuid;
`);
console.log('Profile:', profile);
