// C7-GAP-FIX: Prova behavioral dos 3 gaps corrigidos
// Data: 08/11/2026
// Objetivo: Verificar se director/coordinator/secretary agora conseguem sincronização cruzada

import { readFileSync, writeFileSync } from 'node:fs';

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

const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, body: j };
};

const jwt = async (email, password) => {
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`jwt HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
};

const rest = async (token, method, path, body) => {
  const r = await fetch(`${HOST}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, body: j };
};

const results = { ciclo: 'C7-GAP-FIX', fase: 'prova-behavioral', em: new Date().toISOString(), portoes: 0, sucessos: [], falhas: [] };
const gate = (nome, cond, detalhe) => {
  results.portoes++;
  const ok = !!cond;
  if (ok) results.sucessos.push(nome); else results.falhas.push(nome);
  console.log(`${ok ? '✅' : '❌'} [${results.portoes}] ${nome}: ${detalhe}`);
};

try {
  console.log('=== C7-GAP-FIX: Prova behavioral ===\n');

  // [1] Mint 3 contas
  console.log('[1] mintar 3 contas sintéticas');
  const hash = Math.random().toString(36).slice(2, 10);
  const accounts = {
    director: { email: `c7fix-director-${hash}@bfr-admin.test`, password: 'Test1234!', role: 'director' },
    coordinator: { email: `c7fix-coordinator-${hash}@bfr-admin.test`, password: 'Test1234!', role: 'coordinator' },
    secretary: { email: `c7fix-secretary-${hash}@bfr-admin.test`, password: 'Test1234!', role: 'secretary' },
  };
  
  const uids = {};
  for (const [key, acc] of Object.entries(accounts)) {
    const r = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true, user_metadata: { role: acc.role } }),
    });
    if (r.status !== 200) throw new Error(`mint ${key} falhou: ${JSON.stringify(r.body)}`);
    uids[key] = r.body.id;
    console.log(`  ${key}: ${r.body.id}`);
  }

  // [2] Criar perfis + staff_schools
  console.log('\n[2] criar perfis + staff_schools');
  const schoolId = '08ebef62-2193-4520-ab44-c044160d565f'; // Escola Municipal Alpha
  
  for (const [key, uid] of Object.entries(uids)) {
    await sql(`INSERT INTO profiles (id, email, role) VALUES ('${uid}'::uuid, '${accounts[key].email}', '${accounts[key].role}'::account_role) ON CONFLICT (id) DO UPDATE SET role = '${accounts[key].role}'::account_role`);
    await sql(`INSERT INTO staff_schools (profile_id, school_id, role) VALUES ('${uid}'::uuid, '${schoolId}'::uuid, '${accounts[key].role}') ON CONFLICT DO NOTHING`);
    console.log(`  ${key}: perfil + staff_schools OK`);
  }

  // [3] Criar student fixture
  console.log('\n[3] criar student fixture');
  const studentId = 'c7f10000-a1b2-c3d4-0000-000000000001';
  const classId = '5e6d0744-f2b7-4201-8ad5-64c36a1bc3da'; // 6º ano A, matutino, Escola Alpha
  await sql(`INSERT INTO students (id, official_name, class_id, school_id) VALUES ('${studentId}'::uuid, 'C7-FIX Student', '${classId}'::uuid, '${schoolId}'::uuid) ON CONFLICT (id) DO NOTHING`);
  console.log(`  student: ${studentId}`);

  // [4] Obter JWTs
  console.log('\n[4] obter JWTs');
  const tokens = {};
  for (const [key, acc] of Object.entries(accounts)) {
    tokens[key] = await jwt(acc.email, acc.password);
    console.log(`  ${key}: JWT OK (${tokens[key].slice(0, 20)}...)`);
  }

  // [5] Testar GAP-1: Director lê occurrences do Coordinator
  console.log('\n[5] GAP-1: Director lê occurrences do Coordinator');
  const coordOcc = await rest(tokens.coordinator, 'POST', 'occurrences', {
    student_id: studentId,
    title: 'C7-FIX-T1',
    description: 'Test GAP-1',
    created_by: uids.coordinator,
  });
  gate('GAP1_COORD_INSERT', coordOcc.status === 201, `coordinator INSERT: ${coordOcc.status}`);
  
  const dirReadOcc = await rest(tokens.director, 'GET', `occurrences?student_id=eq.${studentId}`);
  const dirOccCount = Array.isArray(dirReadOcc.body) ? dirReadOcc.body.length : 0;
  gate('GAP1_DIR_SELECT', dirOccCount >= 1, `director SELECT: ${dirOccCount} linhas`);

  // [6] Testar GAP-2: Director atualiza supervision_requests do Secretary
  console.log('\n[6] GAP-2: Director atualiza supervision_requests do Secretary');
  const secSup = await rest(tokens.secretary, 'POST', 'supervision_requests', {
    indicator: 'C7-FIX-T2',
    motive: 'Test GAP-2',
    description: 'Test GAP-2',
    questions: [],
    created_by: uids.secretary,
    school_id: schoolId,
    status: 'Pendente de resposta',
    priority: 'média',
  });
  gate('GAP2_SEC_INSERT', secSup.status === 201, `secretary INSERT: ${secSup.status}`);
  
  const supId = secSup.body?.[0]?.id;
  if (supId) {
    const dirUpdSup = await rest(tokens.director, 'PATCH', `supervision_requests?id=eq.${supId}`, {
      status: 'Em análise pela Secretaria',
      closed_by: uids.director,
    });
    gate('GAP2_DIR_UPDATE', dirUpdSup.status === 200, `director UPDATE: ${dirUpdSup.status}`);
  } else {
    gate('GAP2_DIR_UPDATE', false, 'secretary INSERT não retornou id');
  }

  // [7] Testar GAP-3: Coordinator cria staff_announcements
  console.log('\n[7] GAP-3: Coordinator cria staff_announcements');
  const coordAnn = await rest(tokens.coordinator, 'POST', 'staff_announcements', {
    title: 'C7-FIX-T3',
    body: 'Test GAP-3',
    target_roles: ['director', 'secretary'],
    published_by: uids.coordinator,
  });
  gate('GAP3_COORD_INSERT', coordAnn.status === 201, `coordinator INSERT: ${coordAnn.status}`);

  // Debug: verificar função e perfil antes da limpeza
  if (coordAnn.status !== 201) {
    console.log('\n  [DEBUG GAP-3]');
    console.log('    Resposta completa:', JSON.stringify(coordAnn.body, null, 2).slice(0, 500));
    const debugProfile = await sql(`SELECT id, email, role FROM profiles WHERE id = '${uids.coordinator}'::uuid`);
    console.log('    Perfil coordinator:', debugProfile);
    const debugFunc = await sql(`SELECT bfr_is_coordinator('${uids.coordinator}'::uuid) as is_coord`);
    console.log('    bfr_is_coordinator():', debugFunc);
    const debugPolicies = await sql(`SELECT policyname, with_check FROM pg_policies WHERE tablename = 'staff_announcements' AND cmd = 'INSERT'`);
    console.log('    Policies INSERT:', debugPolicies);
  }

  // [8] Limpeza
  console.log('\n[8] limpeza FK-safe');
  await sql(`DELETE FROM staff_announcements WHERE title LIKE 'C7-FIX-%'`);
  await sql(`DELETE FROM supervision_requests WHERE indicator LIKE 'C7-FIX-%'`);
  await sql(`DELETE FROM occurrences WHERE title LIKE 'C7-FIX-%'`);
  await sql(`DELETE FROM students WHERE id='${studentId}'::uuid`);
  await sql(`DELETE FROM supervision_audit WHERE profile_id='${uids.director}'::uuid OR profile_id='${uids.coordinator}'::uuid OR profile_id='${uids.secretary}'::uuid`);
  await sql(`DELETE FROM staff_schools WHERE profile_id='${uids.director}'::uuid OR profile_id='${uids.coordinator}'::uuid OR profile_id='${uids.secretary}'::uuid`);
  await sql(`DELETE FROM profiles WHERE id='${uids.director}'::uuid OR id='${uids.coordinator}'::uuid OR id='${uids.secretary}'::uuid`);
  
  for (const uid of Object.values(uids)) {
    await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  }
  console.log('  limpeza OK');

  // [9] Baseline
  console.log('\n[9] conferência baseline');
  const tables = ['occurrences', 'supervision_requests', 'staff_announcements', 'students', 'staff_schools'];
  for (const t of tables) {
    const r = await sql(`SELECT count(*) as n FROM public.${t}`);
    console.log(`  ${t}: ${r[0].n}`);
  }

  // Summary
  console.log(`\n=== C7-GAP-FIX RESUMO ===`);
  console.log(`Portões: ${results.portoes} | Sucessos: ${results.sucessos.length} | Falhas: ${results.falhas.length}`);
  if (results.falhas.length > 0) console.log(`Falhas: ${results.falhas.join(', ')}`);
  
  results.gaps_corrigidos = results.falhas.length === 0;
  writeFileSync('docs/c7-gap-fix-prova.json', JSON.stringify(results, null, 2));
  console.log('Resultados salvos em docs/c7-gap-fix-prova.json');

} catch (e) {
  console.error('ERRO:', e.message);
  results.erro = e.message;
  writeFileSync('docs/c7-gap-fix-prova.json', JSON.stringify(results, null, 2));
  process.exit(1);
}
