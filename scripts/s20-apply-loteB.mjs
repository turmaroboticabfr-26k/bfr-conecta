// Aplicar Lote B permanentemente (sports_schools + supervision_requests UPDATE)
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
  console.log('=== APLICAR LOTE B (sports_schools + supervision_requests UPDATE) ===\n');

  // 1. Snapshot antes — sports_schools
  console.log('[1] Snapshot ANTES — sports_schools:');
  const beforeSchools = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'sports_schools'
    ORDER BY policyname;
  `);
  console.log(`    ${beforeSchools.length} policies:`);
  beforeSchools.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 2. Snapshot antes — supervision_requests
  console.log('[2] Snapshot ANTES — supervision_requests:');
  const beforeRequests = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'supervision_requests'
    ORDER BY policyname;
  `);
  console.log(`    ${beforeRequests.length} policies:`);
  beforeRequests.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 3. Aplicar candidata
  console.log('[3] Aplicando candidata s20-gaps-loteB-candidate.sql...');
  const candidateSql = readFileSync(
    join(process.cwd(), 'scripts', 's20-gaps-loteB-candidate.sql'),
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

  // 4. Conferir catálogo final — sports_schools
  console.log('[4] Snapshot DEPOIS — sports_schools:');
  const afterSchools = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'sports_schools'
    ORDER BY policyname;
  `);
  console.log(`    ${afterSchools.length} policies:`);
  afterSchools.forEach(p => {
    console.log(`      - ${p.policyname} (${p.cmd})`);
    if (p.qual) console.log(`        USING: ${p.qual.substring(0, 120)}${p.qual.length > 120 ? '...' : ''}`);
    if (p.with_check) console.log(`        WITH CHECK: ${p.with_check.substring(0, 120)}${p.with_check.length > 120 ? '...' : ''}`);
  });
  console.log();

  // 5. Conferir catálogo final — supervision_requests
  console.log('[5] Snapshot DEPOIS — supervision_requests:');
  const afterRequests = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'supervision_requests'
    ORDER BY policyname;
  `);
  console.log(`    ${afterRequests.length} policies:`);
  afterRequests.forEach(p => {
    console.log(`      - ${p.policyname} (${p.cmd})`);
    if (p.qual) console.log(`        USING: ${p.qual.substring(0, 120)}${p.qual.length > 120 ? '...' : ''}`);
    if (p.with_check) console.log(`        WITH CHECK: ${p.with_check.substring(0, 120)}${p.with_check.length > 120 ? '...' : ''}`);
  });
  console.log();

  // 6. Resumo das mudanças
  console.log('[6] Resumo das mudanças:');

  const beforeSchoolsNames = new Set(beforeSchools.map(p => p.policyname));
  const afterSchoolsNames = new Set(afterSchools.map(p => p.policyname));
  const schoolsAdded = [...afterSchoolsNames].filter(n => !beforeSchoolsNames.has(n));
  const schoolsRemoved = [...beforeSchoolsNames].filter(n => !afterSchoolsNames.has(n));
  const schoolsKept = [...afterSchoolsNames].filter(n => beforeSchoolsNames.has(n));

  console.log(`    sports_schools:`);
  if (schoolsAdded.length) console.log(`      Adicionadas: ${schoolsAdded.join(', ')}`);
  if (schoolsRemoved.length) console.log(`      Removidas: ${schoolsRemoved.join(', ')}`);
  if (schoolsKept.length) console.log(`      Mantidas: ${schoolsKept.join(', ')}`);

  const beforeRequestsNames = new Set(beforeRequests.map(p => p.policyname));
  const afterRequestsNames = new Set(afterRequests.map(p => p.policyname));
  const requestsAdded = [...afterRequestsNames].filter(n => !beforeRequestsNames.has(n));
  const requestsRemoved = [...beforeRequestsNames].filter(n => !afterRequestsNames.has(n));
  const requestsKept = [...afterRequestsNames].filter(n => beforeRequestsNames.has(n));

  console.log(`    supervision_requests:`);
  if (requestsAdded.length) console.log(`      Adicionadas: ${requestsAdded.join(', ')}`);
  if (requestsRemoved.length) console.log(`      Removidas: ${requestsRemoved.join(', ')}`);
  if (requestsKept.length) console.log(`      Mantidas: ${requestsKept.join(', ')}`);

  console.log('\n=== LOTE B APLICADO COM SUCESSO ===');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
