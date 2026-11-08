// Dry-run transacional do Lote B (sports_schools + supervision_requests UPDATE)
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
  console.log('=== DRY-RUN LOTE B (sports_schools + supervision_requests UPDATE) ===\n');

  // 1. Snapshot ANTES de sports_schools
  console.log('[1] Snapshot ANTES das policies de sports_schools:');
  const beforeSchools = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'sports_schools'
    ORDER BY policyname;
  `);
  console.log(`    ${beforeSchools.length} policies:`);
  beforeSchools.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 2. Snapshot ANTES de supervision_requests
  console.log('[2] Snapshot ANTES das policies de supervision_requests:');
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
    console.log('    Dry-run INTERROMPIDO — nenhuma mudança foi persistida (transação).');
    process.exit(1);
  }
  console.log();

  // 4. Conferir catálogo após candidata — sports_schools
  console.log('[4] Snapshot DEPOIS da candidata — sports_schools:');
  const afterCandidateSchools = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'sports_schools'
    ORDER BY policyname;
  `);
  console.log(`    ${afterCandidateSchools.length} policies:`);
  afterCandidateSchools.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 5. Conferir catálogo após candidata — supervision_requests
  console.log('[5] Snapshot DEPOIS da candidata — supervision_requests:');
  const afterCandidateRequests = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'supervision_requests'
    ORDER BY policyname;
  `);
  console.log(`    ${afterCandidateRequests.length} policies:`);
  afterCandidateRequests.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 6. Aplicar rollback
  console.log('[6] Aplicando rollback s20-gaps-loteB-rollback.sql...');
  const rollbackSql = readFileSync(
    join(process.cwd(), 'scripts', 's20-gaps-loteB-rollback.sql'),
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

  // 7. Conferir restauração — sports_schools
  console.log('[7] Snapshot DEPOIS do rollback — sports_schools:');
  const afterRollbackSchools = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'sports_schools'
    ORDER BY policyname;
  `);
  console.log(`    ${afterRollbackSchools.length} policies:`);
  afterRollbackSchools.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 8. Conferir restauração — supervision_requests
  console.log('[8] Snapshot DEPOIS do rollback — supervision_requests:');
  const afterRollbackRequests = await sql(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'supervision_requests'
    ORDER BY policyname;
  `);
  console.log(`    ${afterRollbackRequests.length} policies:`);
  afterRollbackRequests.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
  console.log();

  // 9. Comparar antes × depois do rollback
  console.log('[9] Comparação ANTES × DEPOIS DO ROLLBACK:');

  const beforeSchoolsNames = beforeSchools.map(p => p.policyname).sort();
  const afterSchoolsNames = afterRollbackSchools.map(p => p.policyname).sort();
  const schoolsMatch = JSON.stringify(beforeSchoolsNames) === JSON.stringify(afterSchoolsNames);

  const beforeRequestsNames = beforeRequests.map(p => p.policyname).sort();
  const afterRequestsNames = afterRollbackRequests.map(p => p.policyname).sort();
  const requestsMatch = JSON.stringify(beforeRequestsNames) === JSON.stringify(afterRequestsNames);

  console.log(`    sports_schools:`);
  console.log(`      Antes: [${beforeSchoolsNames.join(', ')}]`);
  console.log(`      Depois: [${afterSchoolsNames.join(', ')}]`);
  console.log(`      Iguais? ${schoolsMatch ? 'SIM ✓' : 'NÃO ✗'}`);

  console.log(`    supervision_requests:`);
  console.log(`      Antes: [${beforeRequestsNames.join(', ')}]`);
  console.log(`      Depois: [${afterRequestsNames.join(', ')}]`);
  console.log(`      Iguais? ${requestsMatch ? 'SIM ✓' : 'NÃO ✗'}`);

  if (!schoolsMatch || !requestsMatch) {
    console.log('\n    ATENÇÃO: rollback não restaurou o catálogo ao estado original!');
    if (!schoolsMatch) {
      const onlyBefore = beforeSchoolsNames.filter(n => !afterSchoolsNames.includes(n));
      const onlyAfter = afterSchoolsNames.filter(n => !beforeSchoolsNames.includes(n));
      if (onlyBefore.length) console.log(`      sports_schools — somente antes: ${onlyBefore.join(', ')}`);
      if (onlyAfter.length) console.log(`      sports_schools — somente depois: ${onlyAfter.join(', ')}`);
    }
    if (!requestsMatch) {
      const onlyBefore = beforeRequestsNames.filter(n => !afterRequestsNames.includes(n));
      const onlyAfter = afterRequestsNames.filter(n => !beforeRequestsNames.includes(n));
      if (onlyBefore.length) console.log(`      supervision_requests — somente antes: ${onlyBefore.join(', ')}`);
      if (onlyAfter.length) console.log(`      supervision_requests — somente depois: ${onlyAfter.join(', ')}`);
    }
  }

  console.log('\n=== DRY-RUN LOTE B CONCLUÍDO ===');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
