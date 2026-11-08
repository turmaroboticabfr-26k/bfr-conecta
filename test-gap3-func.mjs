import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PAT = readFileSync(join(homedir(), '.supabase-pat'), 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5enFveGxrdnZxcGVzc3lwZmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTcyMTQ4MDAsImV4cCI6MjAxMjc5MDgwMH0.JyHxqWVZTJmJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';

const headers = {
  'Authorization': `Bearer ${PAT}`,
  'Content-Type': 'application/json'
};

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
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

async function mintEmail(prefix) {
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${nonce}@bfr-admin.test`;
}

async function main() {
  console.log('=== Teste da função bfr_is_coordinator() ===\n');

  // 1. Mintar conta coordinator
  console.log('[1] Mintar conta coordinator');
  const email = await mintEmail('c7fix-func');
  const password = 'TestPass123!';
  
  const mintRes = await fetch(`https://api.supabase.com/v1/projects/${REF}/auth/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  });
  
  if (!mintRes.ok) {
    const t = await mintRes.text();
    throw new Error(`Mint ${mintRes.status}: ${t}`);
  }
  
  const user = await mintRes.json();
  const uid = user.id;
  console.log(`  coordinator: ${uid}`);

  // 2. Criar perfil
  console.log('\n[2] Criar perfil coordinator');
  await sql(`INSERT INTO profiles (id, email, role) VALUES ('${uid}'::uuid, '${email}', 'coordinator'::account_role)`);
  console.log('  perfil OK');

  // 3. Testar função com service_role
  console.log('\n[3] Testar bfr_is_coordinator() com service_role');
  const funcRes1 = await sql(`SELECT bfr_is_coordinator('${uid}'::uuid) as result`);
  console.log(`  Resultado: ${funcRes1[0].result}`);

  // 4. Obter JWT
  console.log('\n[4] Obter JWT');
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    throw new Error(`Token ${tokenRes.status}: ${t}`);
  }
  
  const tokenData = await tokenRes.json();
  const jwt = tokenData.access_token;
  console.log(`  JWT: ${jwt.slice(0, 20)}...`);

  // 5. Testar função com JWT via PostgREST
  console.log('\n[5] Testar bfr_is_coordinator() com JWT via PostgREST');
  const funcRes2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bfr_is_coordinator`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: uid })
  });
  
  console.log(`  Status: ${funcRes2.status}`);
  const funcData2 = await funcRes2.json();
  console.log(`  Resultado:`, funcData2);

  // 6. Testar INSERT com JWT
  console.log('\n[6] Testar INSERT em staff_announcements com JWT');
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/staff_announcements`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      title: 'C7-FUNC-TEST',
      body: 'Teste da função',
      target_roles: ['director'],
      published_by: uid
    })
  });
  
  console.log(`  Status: ${insertRes.status}`);
  const insertData = await insertRes.json();
  console.log(`  Resposta:`, JSON.stringify(insertData, null, 2).slice(0, 500));

  // 7. Limpeza
  console.log('\n[7] Limpeza');
  await sql(`DELETE FROM staff_announcements WHERE title = 'C7-FUNC-TEST'`);
  await sql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
  
  const adminHeaders = {
    'Authorization': `Bearer ${PAT}`,
    'Content-Type': 'application/json'
  };
  await fetch(`https://api.supabase.com/v1/projects/${REF}/auth/admin/users/${uid}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  console.log('  limpeza OK');
}

main().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
