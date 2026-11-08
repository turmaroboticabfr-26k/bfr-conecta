// Aplicar correção GAP-3 permanentemente (staff_announcements coordinator INSERT)
// Protocolo: aplica candidata → confere catálogo final

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

async function main() {
  console.log('=== APLICAR GAP-3 FIX (staff_announcements coordinator INSERT) ===\n');

  // 1. Snapshot antes
  console.log('[1] Snapshot ANTES:');
  const beforePolicy = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE policyname = 'staff_announcements_coordinator_insert';
  `);
  console.log(`    Policy: ${beforePolicy.length > 0 ? 'existe' : 'não existe'}`);
  if (beforePolicy.length > 0) {
    console.log(`    WITH CHECK: ${beforePolicy[0].with_check}`);
  }

  const beforeFunc = await sql(`
    SELECT proname, prosecdef, proacl
    FROM pg_proc
    WHERE proname = 'bfr_is_coordinator';
  `);
  console.log(`    Função bfr_is_coordinator: ${beforeFunc.length > 0 ? 'existe' : 'não existe'}`);
  console.log();

  // 2. Aplicar candidata
  console.log('[2] Aplicando candidata c7-gap3-fix-candidate.sql...');
  const candidateSql = readFileSync(
    join(process.cwd(), 'scripts', 'c7-gap3-fix-candidate.sql'),
    'utf8'
  );
  const result = await sql(candidateSql);
  console.log('    Aplicada com sucesso');
  console.log();

  // 3. Snapshot depois
  console.log('[3] Snapshot DEPOIS:');
  const afterPolicy = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE policyname = 'staff_announcements_coordinator_insert';
  `);
  console.log(`    Policy: ${afterPolicy.length > 0 ? 'recriada' : 'ERRO - não encontrada'}`);
  if (afterPolicy.length > 0) {
    console.log(`    WITH CHECK: ${afterPolicy[0].with_check}`);
  }

  const afterFunc = await sql(`
    SELECT proname, prosecdef, proacl
    FROM pg_proc
    WHERE proname = 'bfr_is_coordinator';
  `);
  console.log(`    Função bfr_is_coordinator: ${afterFunc.length > 0 ? 'criada' : 'ERRO - não encontrada'}`);
  if (afterFunc.length > 0) {
    console.log(`      SECURITY DEFINER: ${afterFunc[0].prosecdef}`);
    console.log(`      ACL: ${afterFunc[0].proacl || '(padrão)'}`);
  }
  console.log();

  // 4. Conferência final
  console.log('[4] Conferência final:');
  const allPolicies = await sql(`
    SELECT COUNT(*) as total
    FROM pg_policies
    WHERE tablename = 'staff_announcements';
  `);
  console.log(`    Total de policies em staff_announcements: ${allPolicies[0].total}`);

  const allFunctions = await sql(`
    SELECT COUNT(*) as total
    FROM pg_proc
    WHERE proname LIKE 'bfr_%' AND prosecdef = true;
  `);
  console.log(`    Total de funções SECURITY DEFINER bfr_*: ${allFunctions[0].total}`);
  console.log();

  console.log('=== GAP-3 FIX APLICADO ===');
  console.log('Próximo passo: rodar scripts/c7-gap-fix-prova.mjs para verificar behavioral');
}

main().catch(err => {
  console.error('ERRO:', err.message);
  process.exit(1);
});
