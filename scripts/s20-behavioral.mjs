// S20 — prova behavioral das 9 policies corrigidas
// Lote A: supervision_responses (4 gaps)
// Lote B: sports_schools + supervision_requests (2 gaps)
// Lote C: storage.objects (3 gaps)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SESSIONS = `${DIR}/s20-sessions.json`;
const DIARY = `${DIR}/evidence/s20-diary.json`;

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

const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

const jwtFetch = async (accessToken, path, init = {}) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j, text: t };
};

const jwtRaw = async (accessToken, path, init = {}) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
  });
  const text = await r.text();
  return { status: r.status, text, contentType: r.headers.get('content-type') };
};

const stage = (nome, dados) => {
  const d = existsSync(DIARY) ? JSON.parse(readFileSync(DIARY, 'utf8')) : { ciclo: 'S20', started: new Date().toISOString(), stages: {} };
  d.stages[nome] = { em: new Date().toISOString(), ...dados };
  writeFileSync(DIARY, JSON.stringify(d, null, 2) + '\n');
};

const criarGates = () => {
  const falhas = []; let portoes = 0;
  return {
    gate(nome, dado, esperado) {
      portoes++;
      const ok = JSON.stringify(dado) === JSON.stringify(esperado);
      if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
      console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
      return ok;
    },
    resumo() { return { portoes, falhas }; },
  };
};

// Mint ou refresh de conta sintética
const mintarConta = async (email, password, role) => {
  // Verificar se já existe (busca exata pelo email)
  const check = await admin(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
  let uid;
  
  const matched = check.j.users?.find(u => u.email === email);
  if (matched) {
    // Conta já existe, reutilizar
    uid = matched.id;
    console.log(`    Reutilizando conta existente ${email} (uid ${uid.slice(0, 8)}...)`);
  } else {
    // Criar nova conta
    uid = randomUUID();
    const create = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        id: uid,
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `S20 ${role} Sintético` },
      }),
    });
    if (![200, 201].includes(create.status)) {
      throw new Error(`Falha ao criar conta ${email}: HTTP ${create.status}: ${JSON.stringify(create.j).slice(0, 300)}`);
    }
  }

  const login = await admin('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (login.status !== 200) {
    throw new Error(`Falha ao login ${email}: HTTP ${login.status}`);
  }

  await sql(`UPDATE public.profiles SET role='${role}'::account_role, full_name='S20 ${role} Sintético' WHERE id='${uid}'::uuid;`);
  const perfil = await sql(`SELECT role::text FROM public.profiles WHERE id='${uid}'::uuid;`);
  if (perfil[0]?.role !== role) {
    throw new Error(`Profile role mismatch para ${email}: esperado ${role}, obtido ${perfil[0]?.role}`);
  }

  return { ...login.j, user: { id: uid, email } };
};

async function main() {
  console.log('=== S20 — PROVA BEHAVIORAL DAS 9 POLICIES ===\n');
  
  const gates = criarGates();
  
  // 0. Pre-limpeza (contas e escolas de runs anteriores)
  console.log('[0] Pre-limpeza de runs anteriores...');
  const emails = ['s20-secretary@bfr.test', 's20-director@bfr.test', 's20-coordinator@bfr.test', 's20-supervisor@bfr.test'];
  for (const email of emails) {
    const check = await admin(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
    if (check.status === 200 && check.j.users?.length > 0) {
      for (const u of check.j.users) {
        await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
      }
    }
  }
  await sql(`DELETE FROM staff_schools WHERE school_id IN (SELECT id FROM sports_schools WHERE name LIKE '%S20');`);
  await sql(`DELETE FROM supervision_responses WHERE request_id IN (SELECT id FROM supervision_requests WHERE school_id IN (SELECT id FROM sports_schools WHERE name LIKE '%S20'));`);
  await sql(`DELETE FROM supervision_requests WHERE school_id IN (SELECT id FROM sports_schools WHERE name LIKE '%S20');`);
  await sql(`DELETE FROM sports_schools WHERE name LIKE '%S20';`);
  console.log('    Pre-limpeza completa\n');
  
  // 1. Mint 4 contas sintéticas
  console.log('[1] Mintando 4 contas sintéticas...');
  const password = 'TestPass123!';
  const contas = {
    secretary: await mintarConta('s20-secretary@bfr.test', password, 'secretary'),
    director: await mintarConta('s20-director@bfr.test', password, 'director'),
    coordinator: await mintarConta('s20-coordinator@bfr.test', password, 'coordinator'),
    supervisor: await mintarConta('s20-supervisor@bfr.test', password, 'education_supervisor'),
  };
  
  // Salvar sessões
  writeFileSync(SESSIONS, JSON.stringify({
    ciclo: 'S20',
    em: new Date().toISOString(),
    contas: Object.fromEntries(Object.entries(contas).map(([k, v]) => [k, {
      uid: v.user.id,
      email: v.user.email,
      access_token: v.access_token,
      refresh_token: v.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + v.expires_in,
    }])),
  }, null, 2) + '\n');
  
  console.log('    4 contas mintadas:\n');
  Object.entries(contas).forEach(([k, v]) => {
    console.log(`      ${k}: uid ${v.user.id.slice(0, 8)}...`);
  });
  console.log();
  
  // 2. Fixture: 3 escolas + vínculos staff_schools
  console.log('[2] Fixture: escolas + vínculos staff_schools...');
  
  // Verificar se escolas sintéticas já existem
  const escolas = await sql(`
    SELECT id, name FROM sports_schools
    WHERE name IN ('Alpha S20', 'Beta S20', 'Gamma S20')
    ORDER BY name;
  `);
  
  let escolaAlpha, escolaBeta, escolaGamma;
  
  if (escolas.length === 3) {
    console.log('    Escolas já existem, reutilizando...');
    escolaAlpha = escolas.find(e => e.name === 'Alpha S20');
    escolaBeta = escolas.find(e => e.name === 'Beta S20');
    escolaGamma = escolas.find(e => e.name === 'Gamma S20');
  } else {
    console.log('    Criando 3 escolas sintéticas...');
    const [alpha] = await sql(`INSERT INTO sports_schools (name, city) VALUES ('Alpha S20', 'São Paulo') RETURNING id, name;`);
    const [beta] = await sql(`INSERT INTO sports_schools (name, city) VALUES ('Beta S20', 'Rio de Janeiro') RETURNING id, name;`);
    const [gamma] = await sql(`INSERT INTO sports_schools (name, city) VALUES ('Gamma S20', 'Belo Horizonte') RETURNING id, name;`);
    escolaAlpha = alpha;
    escolaBeta = beta;
    escolaGamma = gamma;
  }
  
  console.log(`    Alpha: ${escolaAlpha.id}`);
  console.log(`    Beta: ${escolaBeta.id}`);
  console.log(`    Gamma: ${escolaGamma.id}`);
  console.log();
  
  // Vínculos staff_schools
  console.log('    Criando vínculos staff_schools...');
  await sql(`DELETE FROM staff_schools WHERE profile_id IN ('${contas.secretary.user.id}', '${contas.director.user.id}', '${contas.coordinator.user.id}');`);
  await sql(`INSERT INTO staff_schools (profile_id, school_id, role) VALUES
    ('${contas.secretary.user.id}', '${escolaAlpha.id}', 'secretary'),
    ('${contas.director.user.id}', '${escolaAlpha.id}', 'director'),
    ('${contas.coordinator.user.id}', '${escolaBeta.id}', 'coordinator');`);
  console.log('    3 vínculos criados (secretary→Alpha, director→Alpha, coordinator→Beta)');
  console.log();
  
  // 3. Fixture: supervision_requests (2 requests: Alpha e Beta)
  console.log('[3] Fixture: supervision_requests...');
  await sql(`DELETE FROM supervision_responses WHERE request_id IN (SELECT id FROM supervision_requests WHERE school_id IN ('${escolaAlpha.id}', '${escolaBeta.id}'));`);
  await sql(`DELETE FROM supervision_requests WHERE school_id IN ('${escolaAlpha.id}', '${escolaBeta.id}');`);
  
  const [reqAlpha] = await sql(`
    INSERT INTO supervision_requests (school_id, indicator, motive, description, status, priority, created_by)
    VALUES ('${escolaAlpha.id}', 'infraestrutura', 'Reforma do ginásio', 'Solicitação de reforma do ginásio poliesportivo', 'Pendente de resposta', 'média', '${contas.director.user.id}')
    RETURNING id;
  `);

  const [reqBeta] = await sql(`
    INSERT INTO supervision_requests (school_id, indicator, motive, description, status, priority, created_by)
    VALUES ('${escolaBeta.id}', 'pedagogico', 'Material didático', 'Solicitação de material didático para o 2º semestre', 'Pendente de resposta', 'média', '${contas.coordinator.user.id}')
    RETURNING id;
  `);
  
  console.log(`    Request Alpha: ${reqAlpha.id}`);
  console.log(`    Request Beta: ${reqBeta.id}`);
  console.log();
  
  // 4. Testar Lote A: supervision_responses (4 gaps)
  console.log('[4] LOTE A: supervision_responses (4 gaps)\n');
  
  // Gap 1: supervisor_read — supervisor GET supervision_responses → 200
  console.log('  Gap 1: supervisor_read');
  const supGetResponses = await jwtFetch(contas.supervisor.access_token, `/rest/v1/supervision_responses?select=*`);
  gates.gate('supervisor GET supervision_responses', supGetResponses.status, 200);
  
  // Gap 2: supervisor_insert — supervisor POST supervision_responses → 201
  console.log('  Gap 2: supervisor_insert');
  const supPostResponse = await jwtFetch(contas.supervisor.access_token, `/rest/v1/supervision_responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      request_id: reqAlpha.id,
      round: 1,
      justification: 'Supervisor response test',
      created_by: contas.supervisor.user.id,
    }),
  });
  gates.gate('supervisor POST supervision_responses', supPostResponse.status, 201);
  const supResponseId = supPostResponse.j?.[0]?.id;
  
  // Gap 3: staff_insert (school filter) — staff POST para escola própria → 201; para escola alheia → 403
  console.log('  Gap 3: staff_insert (school filter)');
  const dirPostOwnSchool = await jwtFetch(contas.director.access_token, `/rest/v1/supervision_responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      request_id: reqAlpha.id,
      round: 1,
      justification: 'Director response to own school',
      created_by: contas.director.user.id,
    }),
  });
  gates.gate('director POST response → Alpha (own school)', dirPostOwnSchool.status, 201);

  const dirPostOtherSchool = await jwtFetch(contas.director.access_token, `/rest/v1/supervision_responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      request_id: reqBeta.id,
      round: 1,
      justification: 'Director response to other school',
      created_by: contas.director.user.id,
    }),
  });
  gates.gate('director POST response → Beta (other school)', dirPostOtherSchool.status, 403);
  
  // Gap 4: staff_read (school filter) — staff GET supervision_responses → vê só da escola própria
  console.log('  Gap 4: staff_read (school filter)');
  const dirGetResponses = await jwtFetch(contas.director.access_token, `/rest/v1/supervision_responses?select=*,supervision_requests!inner(school_id)`);
  gates.gate('director GET supervision_responses', dirGetResponses.status, 200);
  const dirResponsesSchools = new Set(dirGetResponses.j.map(r => r.supervision_requests?.school_id));
  gates.gate('director vê só responses da escola própria', dirResponsesSchools.has(escolaAlpha.id) && !dirResponsesSchools.has(escolaBeta.id), true);
  
  console.log();
  
  // 5. Testar Lote B: sports_schools + supervision_requests (2 gaps)
  console.log('[5] LOTE B: sports_schools + supervision_requests (2 gaps)\n');
  
  // Gap 5: sports_schools_staff_read — supervisor GET sports_schools → 200 (com dados)
  console.log('  Gap 5: sports_schools_staff_read');
  const supGetSchools = await jwtFetch(contas.supervisor.access_token, `/rest/v1/sports_schools?select=*`);
  gates.gate('supervisor GET sports_schools', supGetSchools.status, 200);
  gates.gate('supervisor vê escolas (dados)', supGetSchools.j.length > 0, true);
  
  // Gap 6: supervision_requests_director_update — director PATCH request da sua escola → 200 (1 row); de outra → 200 (0 rows)
  console.log('  Gap 6: supervision_requests_director_update');
  const dirPatchOwn = await jwtFetch(contas.director.access_token, `/rest/v1/supervision_requests?id=eq.${reqAlpha.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'Em análise pela Secretaria' }),
  });
  gates.gate('director PATCH request → Alpha (own school) status', dirPatchOwn.status, 200);
  gates.gate('director PATCH request → Alpha (own school) rows', Array.isArray(dirPatchOwn.j) ? dirPatchOwn.j.length : 0, 1);

  const dirPatchOther = await jwtFetch(contas.director.access_token, `/rest/v1/supervision_requests?id=eq.${reqBeta.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'Em análise pela Secretaria' }),
  });
  gates.gate('director PATCH request → Beta (other school) status', dirPatchOther.status, 200);
  gates.gate('director PATCH request → Beta (other school) 0 rows', Array.isArray(dirPatchOther.j) ? dirPatchOther.j.length : -1, 0);

  // Gap 7: supervision_requests_coordinator_update — coordinator PATCH request da sua escola → 200 (1 row); de outra → 200 (0 rows)
  console.log('  Gap 7: supervision_requests_coordinator_update');
  const coordPatchOwn = await jwtFetch(contas.coordinator.access_token, `/rest/v1/supervision_requests?id=eq.${reqBeta.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'Em análise pela Secretaria' }),
  });
  gates.gate('coordinator PATCH request → Beta (own school) status', coordPatchOwn.status, 200);
  gates.gate('coordinator PATCH request → Beta (own school) rows', Array.isArray(coordPatchOwn.j) ? coordPatchOwn.j.length : 0, 1);

  const coordPatchOther = await jwtFetch(contas.coordinator.access_token, `/rest/v1/supervision_requests?id=eq.${reqAlpha.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'Em análise pela Secretaria' }),
  });
  gates.gate('coordinator PATCH request → Alpha (other school) status', coordPatchOther.status, 200);
  gates.gate('coordinator PATCH request → Alpha (other school) 0 rows', Array.isArray(coordPatchOther.j) ? coordPatchOther.j.length : -1, 0);
  
  console.log();
  
  // 6. Testar Lote C: storage.objects (3 gaps)
  console.log('[6] LOTE C: storage.objects (3 gaps)\n');
  
  // Criar fixture de storage (response + attachment)
  console.log('  Criando fixture de storage...');
  const [storageResponse] = await sql(`
    INSERT INTO supervision_responses (request_id, round, justification, created_by)
    VALUES ('${reqAlpha.id}', 1, 'Storage test response', '${contas.director.user.id}')
    RETURNING id;
  `);
  
  const storagePath = `supervision/${storageResponse.id}/${contas.director.user.id}/test.txt`;
  
  // Upload inicial com director (já testado no S19)
  const uploadContent = 'Test file content for S20';
  const uploadResult = await jwtRaw(contas.director.access_token, `/storage/v1/object/secretary-attachments/${storagePath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: uploadContent,
  });
  console.log(`    director POST storage: status=${uploadResult.status}, body=${uploadResult.text.slice(0, 200)}`);
  gates.gate('director POST storage object', uploadResult.status, 200);
  
  // Inserir row em supervision_response_attachments
  await sql(`
    INSERT INTO supervision_response_attachments (response_id, storage_path, file_name, mime_type, created_by)
    VALUES ('${storageResponse.id}', '${storagePath}', 'test.txt', 'text/plain', '${contas.director.user.id}');
  `);
  
  // Verificar que o arquivo existe (GET com o próprio director)
  const verifyGet = await jwtRaw(contas.director.access_token, `/storage/v1/object/secretary-attachments/${storagePath}`);
  console.log(`    verify GET (director): status=${verifyGet.status}`);
  
  console.log(`    Storage path: ${storagePath}`);
  console.log();
  
  // Gap 8: bfr_supervision_attachments_select — supervisor GET storage object → 200
  console.log('  Gap 8: bfr_supervision_attachments_select');
  const supGetStorage = await jwtRaw(contas.supervisor.access_token, `/storage/v1/object/secretary-attachments/${storagePath}`);
  console.log(`    supervisor GET storage: status=${supGetStorage.status}, contentType=${supGetStorage.contentType}`);
  if (supGetStorage.status !== 200) {
    console.log(`    response (first 300): ${supGetStorage.text.slice(0, 300)}`);
  }
  gates.gate('supervisor GET storage object', supGetStorage.status, 200);
  
  // Gap 9: bfr_supervision_attachments_insert — secretary POST storage object → 200
  console.log('  Gap 9: bfr_supervision_attachments_insert');
  const secStoragePath = `supervision/${storageResponse.id}/${contas.secretary.user.id}/secretary-test.txt`;
  const secUploadResult = await jwtRaw(contas.secretary.access_token, `/storage/v1/object/secretary-attachments/${secStoragePath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'Secretary test file',
  });
  gates.gate('secretary POST storage object', secUploadResult.status, 200);
  
  // Gap 10 (bônus): bfr_supervision_attachments_delete — coordinator DELETE storage object → 200
  console.log('  Gap 10 (bônus): bfr_supervision_attachments_delete');
  const coordDeleteStorage = await jwtRaw(contas.coordinator.access_token, `/storage/v1/object/secretary-attachments/${storagePath}`, {
    method: 'DELETE',
  });
  gates.gate('coordinator DELETE storage object', coordDeleteStorage.status, 200);
  
  console.log();
  
  // 7. Limpeza FK-safe
  console.log('[7] Limpeza FK-safe...');
  // Usar Storage API para deletar objetos (DELETE direto em storage.objects é bloqueado)
  await jwtRaw(contas.coordinator.access_token, `/storage/v1/object/secretary-attachments/${secStoragePath}`, { method: 'DELETE' });
  await jwtRaw(contas.coordinator.access_token, `/storage/v1/object/secretary-attachments/${storagePath}`, { method: 'DELETE' });
  await sql(`DELETE FROM supervision_response_attachments WHERE response_id IN (SELECT id FROM supervision_responses WHERE request_id IN (SELECT id FROM supervision_requests WHERE school_id IN ('${escolaAlpha.id}', '${escolaBeta.id}')));`);
  await sql(`DELETE FROM supervision_responses WHERE request_id IN (SELECT id FROM supervision_requests WHERE school_id IN ('${escolaAlpha.id}', '${escolaBeta.id}'));`);
  await sql(`DELETE FROM supervision_requests WHERE school_id IN ('${escolaAlpha.id}', '${escolaBeta.id}');`);
  await sql(`DELETE FROM staff_schools WHERE profile_id IN ('${contas.secretary.user.id}', '${contas.director.user.id}', '${contas.coordinator.user.id}');`);
  await sql(`DELETE FROM sports_schools WHERE name IN ('Alpha S20', 'Beta S20', 'Gamma S20');`);
  
  // Apagar contas
  await admin(`/auth/v1/admin/users/${contas.secretary.user.id}`, { method: 'DELETE' });
  await admin(`/auth/v1/admin/users/${contas.director.user.id}`, { method: 'DELETE' });
  await admin(`/auth/v1/admin/users/${contas.coordinator.user.id}`, { method: 'DELETE' });
  await admin(`/auth/v1/admin/users/${contas.supervisor.user.id}`, { method: 'DELETE' });
  
  console.log('    Limpeza completa (fixture + contas)');
  console.log();
  
  // 8. Resumo
  console.log('[8] RESUMO\n');
  const resumo = gates.resumo();
  console.log(`    Portões: ${resumo.portoes}`);
  console.log(`    Falhas: ${resumo.falhas.length}`);
  
  if (resumo.falhas.length > 0) {
    console.log('\n    Falhas detalhadas:');
    resumo.falhas.forEach(f => console.log(`      ${f}`));
  }
  
  console.log('\n=== S20 ' + (resumo.falhas.length === 0 ? 'FECHADO COM SUCESSO' : 'COM FALHAS') + ' ===\n');
  
  stage('S20 Behavioral', {
    portoes: resumo.portoes,
    falhas: resumo.falhas.length,
    detalhes: resumo.falhas,
    veredito: resumo.falhas.length === 0 ? 'S20_OK' : 'S20_FALHAS',
  });
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
