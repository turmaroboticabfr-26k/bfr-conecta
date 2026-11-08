// Dry-run transacional do Lote C (storage.objects — supervision attachments)
// Protocolo: aplica candidata → confere catálogo → aplica rollback → confere restauração

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
  console.log('=== DRY-RUN LOTE C (storage.objects — supervision attachments) ===\n');

  // 1. Snapshot ANTES das policies de storage.objects (supervision)
  console.log('[1] Snapshot ANTES das policies de storage.objects (supervision):');
  const before = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'bfr_supervision_attachments_%'
    ORDER BY policyname;
  `);
  console.log(`    ${before.length} policies:`);
  before.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 2. Aplicar candidata
  console.log('[2] Aplicando candidata s20-gaps-loteC-candidate.sql...');
  const candidateSql = readFileSync(
    join(process.cwd(), 'scripts', 's20-gaps-loteC-candidate.sql'),
    'utf8'
  );
  try {
    const applyResult = await sql(candidateSql);
    console.log('    OK:', JSON.stringify(applyResult));
  } catch (e) {
    console.error('    ERRO ao aplicar candidata:', e.message);
    console.log('    Dry-run INTERROMPIDO — nenhuma mudança foi persistida (transação).');
    process.exit(1);
  }
  console.log();

  // 3. Conferir catálogo após candidata
  console.log('[3] Snapshot DEPOIS da candidata:');
  const afterCandidate = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'bfr_supervision_attachments_%'
    ORDER BY policyname;
  `);
  console.log(`    ${afterCandidate.length} policies:`);
  afterCandidate.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 4. Aplicar rollback
  console.log('[4] Aplicando rollback s20-gaps-loteC-rollback.sql...');
  const rollbackSql = readFileSync(
    join(process.cwd(), 'scripts', 's20-gaps-loteC-rollback.sql'),
    'utf8'
  );
  try {
    const rollbackResult = await sql(rollbackSql);
    console.log('    OK:', JSON.stringify(rollbackResult));
  } catch (e) {
    console.error('    ERRO ao aplicar rollback:', e.message);
    console.log('    ATENÇÃO: candidata foi aplicada mas rollback falhou!');
    console.log('    Estado do banco pode estar inconsistente.');
    process.exit(1);
  }
  console.log();

  // 5. Conferir restauração
  console.log('[5] Snapshot DEPOIS do rollback:');
  const afterRollback = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'bfr_supervision_attachments_%'
    ORDER BY policyname;
  `);
  console.log(`    ${afterRollback.length} policies:`);
  afterRollback.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 6. Comparar antes × depois do rollback
  console.log('[6] Comparação ANTES × DEPOIS DO ROLLBACK:');
  const beforeNames = before.map(p => p.policyname).sort();
  const afterNames = afterRollback.map(p => p.policyname).sort();
  const match = JSON.stringify(beforeNames) === JSON.stringify(afterNames);
  console.log(`    Antes: [${beforeNames.join(', ')}]`);
  console.log(`    Depois: [${afterNames.join(', ')}]`);
  console.log(`    Iguais? ${match ? 'SIM ✓' : 'NÃO ✗'}`);

  if (!match) {
    console.log('\n    ATENÇÃO: rollback não restaurou o catálogo ao estado original!');
    console.log('    Diferenças:');
    const onlyBefore = beforeNames.filter(n => !afterNames.includes(n));
    const onlyAfter = afterNames.filter(n => !beforeNames.includes(n));
    if (onlyBefore.length) console.log(`      Somente antes: ${onlyBefore.join(', ')}`);
    if (onlyAfter.length) console.log(`      Somente depois: ${onlyAfter.join(', ')}`);
  }

  console.log('\n=== DRY-RUN LOTE C CONCLUÍDO ===');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
