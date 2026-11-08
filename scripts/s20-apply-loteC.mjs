// Aplicar Lote C permanentemente (storage.objects — supervision attachments)
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
  console.log('=== APLICAR LOTE C (storage.objects — supervision attachments) ===\n');

  // 1. Snapshot antes
  console.log('[1] Snapshot ANTES:');
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
    console.log('    APLICAÇÃO INTERROMPIDA — nenhuma mudança foi persistida (transação).');
    process.exit(1);
  }
  console.log();

  // 3. Conferir catálogo final
  console.log('[3] Snapshot DEPOIS (catálogo final):');
  const after = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'bfr_supervision_attachments_%'
    ORDER BY policyname;
  `);
  console.log(`    ${after.length} policies:`);
  after.forEach(p => {
    console.log(`      - ${p.policyname} (${p.cmd})`);
    if (p.qual) console.log(`        USING: ${p.qual.substring(0, 120)}${p.qual.length > 120 ? '...' : ''}`);
    if (p.with_check) console.log(`        WITH CHECK: ${p.with_check.substring(0, 120)}${p.with_check.length > 120 ? '...' : ''}`);
  });
  console.log();

  // 4. Resumo das mudanças
  console.log('[4] Resumo das mudanças:');
  const beforeNames = new Set(before.map(p => p.policyname));
  const afterNames = new Set(after.map(p => p.policyname));
  const added = [...afterNames].filter(n => !beforeNames.has(n));
  const removed = [...beforeNames].filter(n => !afterNames.has(n));
  const kept = [...afterNames].filter(n => beforeNames.has(n));

  if (added.length) console.log(`    Adicionadas: ${added.join(', ')}`);
  if (removed.length) console.log(`    Removidas: ${removed.join(', ')}`);
  if (kept.length) console.log(`    Mantidas/Substituídas: ${kept.join(', ')}`);

  console.log('\n=== LOTE C APLICADO COM SUCESSO ===');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
