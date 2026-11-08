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

const testUid = 'c7f10000-a1b2-c3d4-0000-000000000099';

console.log('[1] Criar perfil de teste:');
await sql(`
  INSERT INTO profiles (id, email, role) 
  VALUES ('${testUid}'::uuid, 'test-coord@gmail.com', 'coordinator'::account_role)
  ON CONFLICT (id) DO UPDATE SET role = 'coordinator'::account_role
`);
console.log('  Perfil criado');

console.log('\n[2] Verificar perfil:');
const profile = await sql(`
  SELECT id, email, role FROM profiles WHERE id = '${testUid}'::uuid;
`);
console.log('  Profile:', profile);

console.log('\n[3] Testar função bfr_is_coordinator:');
const testResult = await sql(`
  SELECT bfr_is_coordinator('${testUid}'::uuid) as is_coord;
`);
console.log('  Resultado:', testResult);

console.log('\n[4] Testar EXISTS direto (sem função):');
const directTest = await sql(`
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = '${testUid}'::uuid AND role = 'coordinator'::account_role
  ) as exists_result;
`);
console.log('  Resultado:', directTest);

console.log('\n[5] Limpar:');
await sql(`DELETE FROM profiles WHERE id = '${testUid}'::uuid`);
console.log('  Limpo');
