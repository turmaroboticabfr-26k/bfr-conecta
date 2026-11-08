// C7-2: jornada administrativa cruzada (5 testes cross-role via JWT)
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();

const accounts = JSON.parse(readFileSync('docs/c7-accounts.json', 'utf8'));
const fx = JSON.parse(readFileSync('docs/c7-fixtures.json', 'utf8'));

const director = accounts.contas.find(c => c.chave === 'director');
const coordinator = accounts.contas.find(c => c.chave === 'coordinator');
const secretary = accounts.contas.find(c => c.chave === 'secretary');

// Mint JWT token for an account
async function mintToken(conta) {
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: conta.email, password: 'C7-Test-2026!' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`mintToken ${conta.chave}: HTTP ${r.status} ${JSON.stringify(j).slice(0,200)}`);
  return j.access_token;
}

// JWT-authenticated fetch
async function jwtFetch(token, path, init) {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, ok: r.ok, data: j, headers: Object.fromEntries(r.headers) };
}

const results = { ciclo: 'C7', fase: 'jornada', em: new Date().toISOString(), testes: [], portoes: 0, falhas: [] };
const gate = (nome, cond, detalhe) => {
  results.portoes++;
  const ok = !!cond;
  results.testes.push({ nome, ok, detalhe });
  if (!ok) results.falhas.push(nome);
  console.log(`${ok ? '✅' : '❌'} [${results.portoes}] ${nome}: ${detalhe}`);
};

try {
  console.log('=== C7-2: jornada administrativa cruzada ===\n');

  // Mint tokens
  console.log('[0] mintando tokens JWT...');
  const tokenDir = await mintToken(director);
  const tokenCoord = await mintToken(coordinator);
  const tokenSecr = await mintToken(secretary);
  gate('T0_DIR_TOKEN', tokenDir.length > 50, `token director ${tokenDir.length}B`);
  gate('T0_COORD_TOKEN', tokenCoord.length > 50, `token coordinator ${tokenCoord.length}B`);
  gate('T0_SECR_TOKEN', tokenSecr.length > 50, `token secretary ${tokenSecr.length}B`);

  // T1: coordinator INSERT occurrence → director SELECT
  console.log('\n[T1] coordinator INSERT occurrence → director SELECT');
  const occ1 = await jwtFetch(tokenCoord, '/rest/v1/occurrences', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      student_id: fx.student,
      title: 'C7-T1 ocorrência teste',
      description: 'Criada pelo coordinator no teste cross-role C7',
      occurred_at: new Date().toISOString(),
      created_by: coordinator.uid,
    }),
  });
  gate('T1_COORD_INSERT_OCC', occ1.ok && occ1.status === 201, `occurrence INSERT status=${occ1.status}`);
  const occId = occ1.data?.[0]?.id;

  if (occId) {
    const occRead = await jwtFetch(tokenDir, `/rest/v1/occurrences?id=eq.${occId}&select=id,title,created_by`, { method: 'GET' });
    gate('T1_DIR_READ_OCC', occRead.ok && occRead.data.length === 1, `director SELECT occurrence: ${occRead.data.length} linhas`);
    gate('T1_DIR_SEES_COORD', occRead.data[0]?.created_by === coordinator.uid, `created_by=${occRead.data[0]?.created_by?.slice(0,8)}...`);
  }

  // T2: secretary INSERT supervision_request → director UPDATE → secretary SELECT
  console.log('\n[T2] secretary INSERT supervision_request → director UPDATE → secretary SELECT');
  const sup1 = await jwtFetch(tokenSecr, '/rest/v1/supervision_requests', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      school_id: fx.school,
      created_by: secretary.uid,
      indicator: 'C7-T2 indicador teste',
      motive: 'Motivo do teste cross-role C7',
      description: 'Descrição detalhada da solicitação de supervisão',
      status: 'Pendente de resposta',
      priority: 'média',
    }),
  });
  gate('T2_SECR_INSERT_SUP', sup1.ok && sup1.status === 201, `supervision_request INSERT status=${sup1.status}`);
  const supId = sup1.data?.[0]?.id;

  if (supId) {
    const supUpd = await jwtFetch(tokenDir, `/rest/v1/supervision_requests?id=eq.${supId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'Em análise' }),
    });
    gate('T2_DIR_UPDATE_SUP', supUpd.ok && supUpd.status === 200, `director UPDATE status=${supUpd.status}`);

    const supRead = await jwtFetch(tokenSecr, `/rest/v1/supervision_requests?id=eq.${supId}&select=id,status`, { method: 'GET' });
    gate('T2_SECR_READ_UPDATED', supRead.ok && supRead.data[0]?.status === 'Em análise', `secretary SELECT status=${supRead.data[0]?.status}`);
  }

  // T3: coordinator INSERT learning_action_plan → director SELECT
  console.log('\n[T3] coordinator INSERT learning_action_plan → director SELECT');
  const lap1 = await jwtFetch(tokenCoord, '/rest/v1/learning_action_plans', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      student_id: fx.student,
      name: 'C7-T3 plano de ação teste',
      diagnostic_source: 'Diagnóstico do teste cross-role C7',
      problem: 'Problema identificado',
      created_by: coordinator.uid,
      status: 'draft',
    }),
  });
  gate('T3_COORD_INSERT_LAP', lap1.ok && lap1.status === 201, `learning_action_plan INSERT status=${lap1.status}`);
  const lapId = lap1.data?.[0]?.id;

  if (lapId) {
    const lapRead = await jwtFetch(tokenDir, `/rest/v1/learning_action_plans?id=eq.${lapId}&select=id,title,created_by`, { method: 'GET' });
    gate('T3_DIR_READ_LAP', lapRead.ok && lapRead.data.length === 1, `director SELECT learning_action_plan: ${lapRead.data.length} linhas`);
  }

  // T4: coordinator INSERT staff_announcement → secretary SELECT
  console.log('\n[T4] coordinator INSERT staff_announcement → secretary SELECT');
  const sa1 = await jwtFetch(tokenCoord, '/rest/v1/staff_announcements', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      title: 'C7-T4 comunicado interno',
      body: 'Criado pelo coordinator no teste cross-role C7',
      target_roles: ['secretary', 'director'],
      published_by: coordinator.uid,
    }),
  });
  gate('T4_COORD_INSERT_SA', sa1.ok && sa1.status === 201, `staff_announcement INSERT status=${sa1.status}`);
  const saId = sa1.data?.[0]?.id;

  if (saId) {
    const saRead = await jwtFetch(tokenSecr, `/rest/v1/staff_announcements?id=eq.${saId}&select=id,title`, { method: 'GET' });
    gate('T4_SECR_READ_SA', saRead.ok && saRead.data.length === 1, `secretary SELECT staff_announcement: ${saRead.data.length} linhas`);
  }

  // T5: secretary INSERT support_request → coordinator SELECT
  console.log('\n[T5] secretary INSERT support_request → coordinator SELECT');
  const sr1 = await jwtFetch(tokenSecr, '/rest/v1/support_requests', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      student_id: fx.student,
      requester_id: secretary.uid,
      reason: 'C7-T5 solicitação de suporte',
      description: 'Criada pelo secretary no teste cross-role C7',
      priority: 'normal',
      status: 'pending',
      source: 'family',
    }),
  });
  gate('T5_SECR_INSERT_SR', sr1.ok && sr1.status === 201, `support_request INSERT status=${sr1.status}`);
  const srId = sr1.data?.[0]?.id;

  if (srId) {
    const srRead = await jwtFetch(tokenCoord, `/rest/v1/support_requests?id=eq.${srId}&select=id,reason,requester_id`, { method: 'GET' });
    gate('T5_COORD_READ_SR', srRead.ok && srRead.data.length === 1, `coordinator SELECT support_request: ${srRead.data.length} linhas`);
  }

  // Summary
  console.log(`\n=== C7-2 RESUMO ===`);
  console.log(`Portões: ${results.portoes} | Falhas: ${results.falhas.length}`);
  if (results.falhas.length > 0) console.log(`Falhas: ${results.falhas.join(', ')}`);

  writeFileSync('docs/c7-2-jornada-jwt.json', JSON.stringify(results, null, 2));
  console.log('Resultados salvos em docs/c7-2-jornada-jwt.json');

} catch (e) {
  console.error('ERRO:', e.message);
  results.erro = e.message;
  writeFileSync('docs/c7-2-jornada-jwt.json', JSON.stringify(results, null, 2));
  process.exit(1);
}
