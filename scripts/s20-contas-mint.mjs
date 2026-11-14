#!/usr/bin/env node
// Mint novas contas sintéticas S20 (substitui S19 expiradas)
import { readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const SERVICE_KEY = readFileSync(process.env.HOME + '/.supabase-service-role', 'utf8').trim();

const randomSuffix = () => crypto.randomBytes(3).toString('hex');
const randomPassword = () => crypto.randomBytes(12).toString('base64url');

const roles = [
  { role: 'secretary', label: 'Secretária' },
  { role: 'director', label: 'Diretor' },
  { role: 'coordinator', label: 'Coordenador' },
  { role: 'supervisor', label: 'Supervisor Educacional' }
];

console.log('[1] Mintando 4 contas sintéticas S20...\n');

const sessions = {};

for (const { role, label } of roles) {
  const suffix = randomSuffix();
  const email = `s20-${role}-${suffix}@bfr-conecta.test`;
  const password = randomPassword();

  console.log(`[1.${role}] ${label}: ${email}`);

  try {
    // Criar conta via Auth Admin API (usando service_role key)
    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true
      })
    });

    const user = await createResponse.json();

    if (!createResponse.ok || !user.id) {
      console.log(`   ✗ Erro na criação:`, JSON.stringify(user).substring(0, 300));
      continue;
    }

    console.log(`   ✓ Conta criada: ${user.id}`);

    // Fazer login para obter token (usa anon key, não service_role)
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const session = await loginResponse.json();

    if (!loginResponse.ok || !session.access_token) {
      console.log(`   ✗ Erro no login:`, JSON.stringify(session).substring(0, 200));
      continue;
    }

    console.log(`   ✓ Token obtido (expira em ${session.expires_in}s)`);
    sessions[role] = {
      uid: user.id,
      email,
      ...session
    };

  } catch (e) {
    console.log(`   ✗ Erro:`, e.message.substring(0, 200));
  }

  console.log();
}

console.log(`[2] Contas mintadas: ${Object.keys(sessions).length}/${roles.length}`);

if (Object.keys(sessions).length === roles.length) {
  writeFileSync('s20-sessions.json', JSON.stringify(sessions, null, 2));
  console.log('[3] Sessões gravadas em s20-sessions.json');

  console.log('\n[4] Próximos passos:');
  console.log('   - Criar profiles para cada conta (scripts/s20-profiles-cria.mjs)');
  console.log('   - Vincular perfis às contas');
  console.log('   - Testar provas behavioral');
} else {
  console.log('\n[ERRO] Nem todas as contas foram mintadas');
  process.exit(1);
}
