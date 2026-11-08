// C7-3: limpeza FK-safe + BASELINE_RESTAURADA
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const accounts = JSON.parse(readFileSync('docs/c7-accounts.json', 'utf8'));
const fx = JSON.parse(readFileSync('docs/c7-fixtures.json', 'utf8'));
const baseline = JSON.parse(readFileSync('docs/c7-baseline-pre.json', 'utf8'));

const results = { ciclo: 'C7', fase: 'limpeza', em: new Date().toISOString(), portoes: 0, falhas: [] };
const gate = (nome, cond, detalhe) => {
  results.portoes++;
  const ok = !!cond;
  if (!ok) results.falhas.push(nome);
  console.log(`${ok ? '✅' : '❌'} [${results.portoes}] ${nome}: ${detalhe}`);
};

try {
  console.log('=== C7-3: limpeza FK-safe + baseline ===\n');

  // [1] Contagens antes
  console.log('[1] contagens pré-limpeza');
  const tables = ['occurrences', 'supervision_requests', 'learning_action_plans', 'staff_announcements', 'support_requests', 'students', 'classes', 'staff_schools'];
  const pre = {};
  for (const t of tables) {
    const r = await sql(`SELECT count(*) as n FROM public.${t}`);
    pre[t] = parseInt(r[0].n);
    console.log(`  ${t}: ${pre[t]}`);
  }

  // [2] Apagar dados de teste (FK-safe: filhos antes de pais)
  console.log('\n[2] apagar dados de teste');

  // Apagar occurrences criadas no teste
  const delOcc = await sql(`DELETE FROM occurrences WHERE title LIKE 'C7-T%' RETURNING id`);
  console.log(`  occurrences: ${delOcc.length} linhas apagadas`);
  gate('DEL_OCC', delOcc.length >= 1, `${delOcc.length} occurrences`);

  // Apagar supervision_requests criadas no teste
  const delSup = await sql(`DELETE FROM supervision_requests WHERE indicator LIKE 'C7-T%' RETURNING id`);
  console.log(`  supervision_requests: ${delSup.length} linhas apagadas`);
  gate('DEL_SUP', delSup.length >= 1, `${delSup.length} supervision_requests`);

  // Apagar support_requests criadas no teste (se houver)
  const delSR = await sql(`DELETE FROM support_requests WHERE reason LIKE 'C7-T%' RETURNING id`);
  console.log(`  support_requests: ${delSR.length} linhas apagadas`);

  // Apagar learning_action_plans criadas no teste (se houver)
  const delLAP = await sql(`DELETE FROM learning_action_plans WHERE name LIKE 'C7-T%' RETURNING id`);
  console.log(`  learning_action_plans: ${delLAP.length} linhas apagadas`);

  // Apagar staff_announcements criadas no teste (se houver)
  const delSA = await sql(`DELETE FROM staff_announcements WHERE title LIKE 'C7-T%' RETURNING id`);
  console.log(`  staff_announcements: ${delSA.length} linhas apagadas`);

  // [3] Apagar fixture (student, class)
  console.log('\n[3] apagar fixture (student, class)');
  const delStudent = await sql(`DELETE FROM students WHERE id='${fx.student}'::uuid RETURNING id`);
  console.log(`  student: ${delStudent.length > 0 ? 'apagado' : 'não existia'}`);
  gate('DEL_STUDENT', delStudent.length === 1, 'student fixture');

  const delClass = await sql(`DELETE FROM classes WHERE id='${fx.class}'::uuid RETURNING id`);
  console.log(`  class: ${delClass.length > 0 ? 'apagada' : 'não existia'}`);
  gate('DEL_CLASS', delClass.length === 1, 'class fixture');

  // [4] Apagar staff_schools links
  console.log('\n[4] apagar staff_schools links');
  const delSS = await sql(`DELETE FROM staff_schools WHERE profile_id='${fx.director_uid}'::uuid OR profile_id='${fx.coordinator_uid}'::uuid OR profile_id='${fx.secretary_uid}'::uuid RETURNING profile_id`);
  console.log(`  staff_schools: ${delSS.length} links apagados`);
  gate('DEL_STAFF_SCHOOLS', delSS.length === 3, `${delSS.length} links`);

  // [5] Apagar contas
  console.log('\n[5] apagar contas sintéticas');
  for (const c of accounts.contas) {
    const r = await fetch(`${HOST}/auth/v1/admin/users/${c.uid}`, {
      method: 'DELETE',
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    });
    console.log(`  ${c.chave}: ${r.ok ? 'apagada' : 'falha ' + r.status}`);
    gate(`DEL_ACCOUNT_${c.chave.toUpperCase()}`, r.ok, `conta ${c.chave}`);
  }

  // [6] Contagens pós-limpeza
  console.log('\n[6] contagens pós-limpeza');
  const post = {};
  for (const t of tables) {
    const r = await sql(`SELECT count(*) as n FROM public.${t}`);
    post[t] = parseInt(r[0].n);
    const expected = baseline.tabelas[t]?.n;
    const match = expected !== undefined ? post[t] === expected : '?';
    console.log(`  ${t}: ${post[t]} (esperado ${expected ?? '?'}) ${match === true ? '✅' : match === false ? '❌' : ''}`);
    if (expected !== undefined && match === false) {
      gate(`COUNT_${t.toUpperCase()}`, false, `esperado ${expected}, got ${post[t]}`);
    }
  }

  // [7] Verificar 0 contas C7 vivas
  console.log('\n[7] verificar 0 contas C7 vivas');
  const vivas = await sql(`SELECT count(*) as n FROM auth.users WHERE email LIKE '%@bfr-admin.test'`);
  gate('ZERO_VIVAS', vivas[0].n === '0', `${vivas[0].n} contas C7 vivas`);

  // [8] Conferir baseline (contagens)
  console.log('\n[8] conferência baseline');
  let baselineOk = true;
  for (const t of Object.keys(baseline.tabelas)) {
    const expected = baseline.tabelas[t].n;
    const actual = post[t] !== undefined ? post[t] : (await sql(`SELECT count(*) as n FROM public.${t}`))[0].n;
    if (parseInt(actual) !== expected) {
      console.log(`  ❌ ${t}: esperado ${expected}, got ${actual}`);
      baselineOk = false;
    }
  }
  gate('BASELINE_RESTAURADA', baselineOk, baselineOk ? 'todas contagens conferem' : 'divergências detectadas');

  // Summary
  console.log(`\n=== C7-3 RESUMO ===`);
  console.log(`Portões: ${results.portoes} | Falhas: ${results.falhas.length}`);
  if (results.falhas.length > 0) console.log(`Falhas: ${results.falhas.join(', ')}`);

  results.baseline_restaurada = baselineOk;
  writeFileSync('docs/c7-3-limpeza.json', JSON.stringify(results, null, 2));
  console.log('Resultados salvos em docs/c7-3-limpeza.json');

} catch (e) {
  console.error('ERRO:', e.message);
  results.erro = e.message;
  writeFileSync('docs/c7-3-limpeza.json', JSON.stringify(results, null, 2));
  process.exit(1);
}
