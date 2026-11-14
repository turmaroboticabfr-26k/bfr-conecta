#!/usr/bin/env node
// Verifica contas sintéticas S19 e mint novas se expiradas
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const SUPABASE_URL = 'https://yyzqoxlkcvqpesypfjo.supabase.co';
const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const S19_SESSIONS = JSON.parse(readFileSync('s19-sessions.json', 'utf8'));

const now = Math.floor(Date.now() / 1000);
console.log(`[1] Timestamp atual: ${now} (${new Date().toISOString()})`);

const accounts = [];
for (const [role, session] of Object.entries(S19_SESSIONS)) {
  const expiresAt = session.expires_at;
  const expired = expiresAt < now;
  const expiresIn = expiresAt - now;
  console.log(`\n[2.${role}] ${session.email}`);
  console.log(`   UID: ${session.uid}`);
  console.log(`   Expira: ${expiresAt} (${new Date(expiresAt * 1000).toISOString()})`);
  console.log(`   Status: ${expired ? 'EXPIRADO' : 'VÁLIDO'} (${expiresIn}s)`);
  accounts.push({ role, ...session, expired, expiresIn });
}

console.log('\n[3] Verificando contas no banco (auth.users)...');
const sql = `
SELECT id, email, role, created_at, last_sign_in_at
FROM auth.users
WHERE email LIKE 's19-%@bfr-conecta.test'
ORDER BY email;
`;

try {
  const result = execSync(
    `curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" ` +
    `-H "Authorization: Bearer ${PAT}" ` +
    `-H "Content-Type: application/json" ` +
    `-d '${JSON.stringify({ sql })}'`,
    { encoding: 'utf8' }
  );
  console.log('   Resposta:', result.substring(0, 500));
} catch (e) {
  console.log('   Erro (exec_sql não existe, tentando SQL direto):');
  console.log('   ', e.message.substring(0, 200));
}

console.log('\n[4] Verificando profiles...');
const sql2 = `
SELECT id, email, role, school_id, full_name
FROM public.profiles
WHERE email LIKE 's19-%@bfr-conecta.test'
ORDER BY email;
`;

try {
  const result2 = execSync(
    `curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" ` +
    `-H "Authorization: Bearer ${PAT}" ` +
    `-H "Content-Type: application/json" ` +
    `-d '${JSON.stringify({ sql: sql2 })}'`,
    { encoding: 'utf8' }
  );
  console.log('   Resposta:', result2.substring(0, 500));
} catch (e) {
  console.log('   Erro:', e.message.substring(0, 200));
}

console.log('\n[5] Resumo:');
const expired = accounts.filter(a => a.expired);
const valid = accounts.filter(a => !a.expired);
console.log(`   Expiradas: ${expired.length}/${accounts.length}`);
console.log(`   Válidas: ${valid.length}/${accounts.length}`);

if (expired.length > 0) {
  console.log('\n[6] Contas expiradas:');
  expired.forEach(a => console.log(`   - ${a.role}: ${a.email}`));
  console.log('\n   → Mintar novas contas necessário');
}

writeFileSync('s19-status.json', JSON.stringify({ timestamp: now, accounts }, null, 2));
console.log('\n[7] Status gravado em s19-status.json');
