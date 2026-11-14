#!/usr/bin/env node
// Atualizar profiles para as 4 contas sintéticas S20 (corrigir papel)
import { readFileSync } from 'fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const SESSIONS = JSON.parse(readFileSync('s20-sessions.json', 'utf8'));
const SQL_TOKEN = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + SQL_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t);
};

console.log('[1] Atualizando profiles S20 (corrigir papel e nome)...\n');

const roles = [
  { key: 'secretary', role: 'secretary', name: 'S20 Secretária Sintética' },
  { key: 'director', role: 'director', name: 'S20 Diretor Sintético' },
  { key: 'coordinator', role: 'coordinator', name: 'S20 Coordenador Sintético' },
  { key: 'supervisor', role: 'education_supervisor', name: 'S20 Supervisor Sintético' }
];

for (const { key, role, name } of roles) {
  const session = SESSIONS[key];
  const uid = session.uid;
  const email = session.email;

  console.log(`[${key}] UID: ${uid}`);
  console.log(`   Email: ${email}`);
  console.log(`   Papel alvo: ${role}`);

  // Atualizar profile com papel correto
  const updateResult = await sql(`
    UPDATE public.profiles
    SET full_name = '${name}', role = '${role}'::account_role
    WHERE id = '${uid}'
    RETURNING id, full_name, role;
  `);

  if (updateResult.length > 0) {
    console.log(`   ✓ Atualizado: ${updateResult[0].full_name} (${updateResult[0].role})`);
  } else {
    console.log(`   ⚠ Nenhuma linha atualizada`);
  }

  console.log();
}

console.log('[2] Verificando profiles atualizados...');
const verifyResult = await sql(`
  SELECT id, email, full_name, role
  FROM public.profiles
  WHERE email LIKE 's20-%@bfr-conecta.test'
  ORDER BY role;
`);
console.log(`   ${verifyResult.length} profiles encontrados:`);
for (const p of verifyResult) {
  console.log(`   - ${p.role}: ${p.full_name} (${p.email})`);
}

console.log('\n[3] Profiles atualizados com sucesso!');
console.log('   Próximo: testar provas behavioral com as contas S20');
