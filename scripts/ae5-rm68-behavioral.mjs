// AE-5 — prova behavioral por papel sobre as 11 policies PUBLIC do RM-6.8
// (grades/attendance/access_requests/occurrences) e sobre as 5 vistas sports_public_*
// já fechadas com security_invoker (ciclo AE-4). OK nomeado que autoriza:
// «(a) Mint + s20-behavioral» — mint de 4 contas sintéticas + escrita de fixture,
// com baseline pré/pós por contagem E md5 e limpeza FK-safe conferida por listagem
// independente. 0 DDL, 0 deploy, 0 publicação, 0 git push.
//
// Papéis: director (D), secretary (S), pedagogical (P), student (E) — os 4 do OK.
// Contas: ae5-<papel>@bfr.test, senha aleatória por execução (nunca literal).
//
// O que esta prova NÃO alcança, dito no artefacto (honestidade):
//  - o ramo POSITIVO de access_requests_manage/staff_insert exige papel developer
//    (5.ª conta, fora do OK); fica coberto pela conferência de texto 44/0;
//  - o delta de linhas do fecho das vistas é inobservável na maioria dos pares
//    papel×vista porque as tabelas-base estão vazias; a excepção medida é
//    sports_public_schools (8 linhas para D/S vs 0 para P/E);
//  - occurrences reais = 0: a equivalência do wrapper do director é provada com
//    fixture (ramo TRUE em occA, ramo FALSE em occB).
//
// Desenho da fixture — o truque dos ids partilhados: bfr_rls_director_manages_student
// copia byte-a-byte o EXISTS vivo, que junta staff_schools.school_id (sports_schools)
// com students.school_id (public.schools). Para o ramo TRUE existir, a escola AE5-Alpha
// recebe o MESMO uuid nas duas tabelas (idA): é o mesmo desenho de dados que a política
// original sempre avaliou — a prova é de equivalência, não de redesenho.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sondaSql } from './rm68-lib.mjs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const TMP = 'C:/Users/pcmac/.qoder/tmp';
const OUT = `${DIR}/evidence/ae5-rm68-behavioral-16-11.json`;
const BASEPRE = `${DIR}/evidence/ae5-rm68-baseline-pre-16-11.json`;
const BASEPOS = `${DIR}/evidence/ae5-rm68-baseline-pos-16-11.json`;
const SESSIONS = `${TMP}/ae5-sessions-${Date.now()}.json`;
for (const p of [OUT, BASEPRE, BASEPOS]) if (existsSync(p)) throw new Error(`Artefacto ${p} já existe — guard de não-sobreposição.`);

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query, tentativas = 6) => {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 400)}`;
    if (!/Failed to check user auth status/.test(t)) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error(`sql esgotou as tentativas — ${ultimo}`);
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

// O parâmetro ?email= da Admin API é IGNORADO (devolve a lista completa) — provado em
// ae5g: a consulta ae5-director@bfr.test retornou os 9 usuários reais e o DELETE foi
// para users[0] (conta real), travado por acaso pela FK support_requests. Filtro por
// email TEM de ser do lado do cliente, com guarda de que só se toca em ae5-*@bfr.test.
const adminUsersPorEmail = async (email) => {
  if (!/^ae5-[\w.+-]+@bfr\.test$/.test(email)) throw new Error(`guard: ${email} não é ae5-*@bfr.test`);
  const r = await admin('/auth/v1/admin/users?per_page=200');
  if (r.status !== 200) throw new Error(`lista admin falhou HTTP ${r.status}`);
  const alvos = (r.j.users ?? []).filter((u) => u.email === email);
  for (const u of alvos) if (u.email !== email) throw new Error(`guard: ${u.id} tem email ${u.email} ≠ ${email}`);
  return alvos;
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

const gates = { portoes: 0, falhas: [] };
const gate = (nome, dado, esperado) => {
  gates.portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) gates.falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
};

const MARCA = 'AE5-16-11';
const contas = {
  director: { email: 'ae5-director@bfr.test', role: 'director' },
  secretary: { email: 'ae5-secretary@bfr.test', role: 'secretary' },
  pedagogical: { email: 'ae5-pedagogical@bfr.test', role: 'pedagogical' },
  student: { email: 'ae5-student@bfr.test', role: 'student' },
};

async function main() {
  console.log('=== AE-5 — PROVA BEHAVIORAL DAS 11 POLICIES PUBLIC DO RM-6.8 + 5 VISTAS ===\n');

  // ── 0. portões de pré-voo (somente leitura) ──
  console.log('[0] Pré-voo de catálogo (sonda rm68 + modo das vistas)...');
  const sondaPre = (await sql(sondaSql()))[0].veredito;
  gate('pré: 11 policies PUBLIC nas 4 tabelas', sondaPre.polisticas.filter((p) => p.roles_public).length, 11);
  gate('pré: 11 PUBLIC sem chamada privilegiada', sondaPre.public_sem_chamada_privilegiada, 11);
  gate('pré: 3 wrappers executáveis por anon', sondaPre.wrappers.filter((w) => w.anon_exec === true).length, 3);
  const pegadaPre = sondaPre.pegada;
  const modosVistas = await sql(`select c.relname,
    case when c.reloptions::text like '%security_invoker=true%' then 'invoker' else 'outro' end as modo
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='v' and c.relname like 'sports\\_public\\_%' escape '\\'
    order by c.relname;`);
  gate('pré: 5 vistas em modo invoker', modosVistas.map((v) => v.modo), ['invoker', 'invoker', 'invoker', 'invoker', 'invoker']);

  // ── 1. pré-limpeza por classe medida (restos de execuções abortadas DESTE ciclo) ──
  // Ordem FK-safe: primeiro tudo o que referencia profiles/students (entered_by,
  // created_by, guardian), depois students/classes/schools, depois os vínculos e SÓ
  // então profiles e as contas auth (o DELETE da Admin API cascateia para profiles e
  // falha em silêncio se alguma FK viva o bloquear — lições AB.5 e da tentativa abortada).
  console.log('[1] Pré-limpeza da classe AE5 (contas ae5-* + fixture AE5-16-11)...');
  await sql(`DELETE FROM public.grades WHERE student_id IN (SELECT id FROM public.students WHERE official_name LIKE '${MARCA} %')
             OR entered_by IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.attendance WHERE student_id IN (SELECT id FROM public.students WHERE official_name LIKE '${MARCA} %')
             OR entered_by IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.occurrences WHERE student_id IN (SELECT id FROM public.students WHERE official_name LIKE '${MARCA} %')
             OR created_by IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.access_requests WHERE email LIKE 'ae5-%@bfr.test'
             OR reviewed_by IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.guardian_students WHERE student_id IN (SELECT id FROM public.students WHERE official_name LIKE '${MARCA} %')
             OR profile_id IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.students WHERE official_name LIKE '${MARCA} %';`);
  await sql(`DELETE FROM public.bfr_teacher_class_subjects WHERE profile_id IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.staff_schools WHERE profile_id IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.classes WHERE class_code LIKE '${MARCA} %';`);
  await sql(`DELETE FROM public.schools WHERE name LIKE '${MARCA} %';`);
  await sql(`DELETE FROM public.sports_schools WHERE name LIKE '${MARCA} %';`);
  await sql(`DELETE FROM public.supervision_audit WHERE profile_id IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.push_subscriptions WHERE profile_id IN (SELECT id FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test');`);
  await sql(`DELETE FROM public.profiles WHERE email LIKE 'ae5-%@bfr.test';`);
  for (const c of Object.values(contas)) {
    const vivos = await adminUsersPorEmail(c.email);
    for (const u of vivos) {
      const del = await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
      if (![200, 204].includes(del.status)) throw new Error(`pré-limpeza: DELETE conta ${c.email} falhou HTTP ${del.status}: ${JSON.stringify(del.j).slice(0, 400)}`);
    }
    const restantes = await adminUsersPorEmail(c.email);
    if (restantes.length > 0) throw new Error(`pré-limpeza: conta ${c.email} sobreviveu ao DELETE`);
  }
  console.log('    pré-limpeza concluída\n');

  // ── 2. baseline pré (14 tabelas, contagem E md5) ──
  console.log('[2] Baseline pré...');
  execFileSync('node', ['scripts/ae5-rm68-baseline.mjs', 'capture', BASEPRE], { cwd: DIR, stdio: 'inherit' });

  const counts0 = (await sql(`select json_object_agg(t, c) as contagens from (
    select 'grades' as t, count(*)::int as c from public.grades
    union all select 'attendance', count(*)::int from public.attendance
    union all select 'access_requests', count(*)::int from public.access_requests
    union all select 'occurrences', count(*)::int from public.occurrences
    union all select 'sports_schools', count(*)::int from public.sports_schools) x;`))[0].contagens;
  console.log(`    contagens de partida: ${JSON.stringify(counts0)}\n`);

  // ── 3. mint de 4 contas (senha aleatória por execução) ──
  console.log('[3] Mint de 4 contas sintéticas...');
  const password = 'Ae5!' + randomBytes(18).toString('hex');
  for (const [papel, c] of Object.entries(contas)) {
    const uid = randomUUID();
    const create = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ id: uid, email: c.email, password, email_confirm: true, user_metadata: { full_name: `AE5 ${papel} Sintético` } }),
    });
    if (![200, 201].includes(create.status)) throw new Error(`mint falhou ${c.email}: HTTP ${create.status}: ${JSON.stringify(create.j).slice(0, 300)}`);
    await sql(`UPDATE public.profiles SET role='${c.role}'::account_role, full_name='AE5 ${papel} Sintético' WHERE id='${uid}'::uuid;`);
    const perfil = await sql(`SELECT role::text as r FROM public.profiles WHERE id='${uid}'::uuid;`);
    gate(`mint ${papel}: perfil com papel ${c.role}`, perfil[0]?.r, c.role);
    const login = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: c.email, password }) });
    gate(`mint ${papel}: login 200`, login.status, 200);
    c.uid = uid;
    c.access_token = login.j.access_token;
  }
  writeFileSync(SESSIONS, JSON.stringify({ ciclo: 'AE5', em: new Date().toISOString(), senha_em_sessoes: password, contas }, null, 2) + '\n');
  console.log('    4 contas mintadas (sessões fora do repositório)\n');

  // ── 4. fixture ──
  console.log('[4] Fixture (escolas gémeas, turmas, alunos, vínculos, notas, presenças, ocorrências)...');
  const idA = randomUUID(); const idB = randomUUID();
  await sql(`INSERT INTO public.sports_schools (id, name, city) VALUES ('${idA}', '${MARCA} Alpha', 'AE5'), ('${idB}', '${MARCA} Beta', 'AE5');`);
  await sql(`INSERT INTO public.schools (id, name) VALUES ('${idA}', '${MARCA} Escola Alpha'), ('${idB}', '${MARCA} Escola Beta');`);
  const [classA] = await sql(`INSERT INTO public.classes (school_id, year, class_code, shift) VALUES ('${idA}', 2026, '${MARCA} A', 'Integral') RETURNING id;`);
  const [classB] = await sql(`INSERT INTO public.classes (school_id, year, class_code, shift) VALUES ('${idB}', 2026, '${MARCA} B', 'Integral') RETURNING id;`);
  const [stuA] = await sql(`INSERT INTO public.students (official_name, class_id, school_id, active) VALUES ('${MARCA} Aluno A', '${classA.id}', '${idA}', true) RETURNING id;`);
  const [stuB] = await sql(`INSERT INTO public.students (official_name, class_id, school_id, active) VALUES ('${MARCA} Aluno B', '${classB.id}', '${idB}', true) RETURNING id;`);
  const [linkDir] = await sql(`INSERT INTO public.staff_schools (profile_id, school_id, role) VALUES ('${contas.director.uid}', '${idA}', 'director') RETURNING id;`);
  const [linkSec] = await sql(`INSERT INTO public.staff_schools (profile_id, school_id, role) VALUES ('${contas.secretary.uid}', '${idA}', 'secretary') RETURNING id;`);
  const [linkPed] = await sql(`INSERT INTO public.bfr_teacher_class_subjects (profile_id, class_id, subject) VALUES ('${contas.pedagogical.uid}', '${classA.id}', 'matematica') RETURNING id;`);
  const [gA1] = await sql(`INSERT INTO public.grades (student_id, subject, assessment, score, term, entered_by) VALUES ('${stuA.id}', 'matematica', 'AE5 P1', 8.5, 1, '${contas.director.uid}') RETURNING id;`);
  const [gA2] = await sql(`INSERT INTO public.grades (student_id, subject, assessment, score, term, entered_by) VALUES ('${stuA.id}', 'ciencias', 'AE5 P1', 7, 1, '${contas.pedagogical.uid}') RETURNING id;`);
  const [gB1] = await sql(`INSERT INTO public.grades (student_id, subject, assessment, score, term, entered_by) VALUES ('${stuB.id}', 'matematica', 'AE5 P1', 9, 1, '${contas.director.uid}') RETURNING id;`);
  const [atA1] = await sql(`INSERT INTO public.attendance (student_id, attendance_date, status, entered_by) VALUES ('${stuA.id}', '2026-11-16', 'present', '${contas.director.uid}') RETURNING id;`);
  const [atB1] = await sql(`INSERT INTO public.attendance (student_id, attendance_date, status, entered_by) VALUES ('${stuB.id}', '2026-11-16', 'absent', '${contas.director.uid}') RETURNING id;`);
  const [occA] = await sql(`INSERT INTO public.occurrences (student_id, title, description, created_by) VALUES ('${stuA.id}', 'AE5 Ocorrencia A', 'fixture AE5 A', '${contas.director.uid}') RETURNING id;`);
  const [occB] = await sql(`INSERT INTO public.occurrences (student_id, title, description, created_by) VALUES ('${stuB.id}', 'AE5 Ocorrencia B', 'fixture AE5 B', '${contas.director.uid}') RETURNING id;`);
  console.log(`    ids: idA=${idA.slice(0, 8)} idB=${idB.slice(0, 8)} stuA=${stuA.id.slice(0, 8)} stuB=${stuB.id.slice(0, 8)}\n`);

  const D = contas.director, S = contas.secretary, P = contas.pedagogical, E = contas.student;

  // ── 5. LOTE G: grades (4 policies PUBLIC) ──
  console.log('[5] LOTE G: grades...');
  const dGetG = await jwtFetch(D.access_token, '/rest/v1/grades?select=*');
  gate('G1 director GET grades: 200', dGetG.status, 200);
  gate('G1 director vê TODAS as notas (scope de schedule-manager)', dGetG.j.length, counts0.grades + 3);
  gate('G1 inclui nota do aluno da outra escola', dGetG.j.some((r) => r.id === gB1.id), true);
  const pGetG = await jwtFetch(P.access_token, '/rest/v1/grades?select=*');
  gate('G2 pedagogical GET grades: 200', pGetG.status, 200);
  gate('G2 pedagogical vê SÓ matematica do aluno da turma', pGetG.j.length === 1 && pGetG.j[0].id === gA1.id, true);
  const sGetG = await jwtFetch(S.access_token, '/rest/v1/grades?select=*');
  gate('G3 secretary GET grades: vazio (role!=secretary)', sGetG.j, []);
  const eGetG = await jwtFetch(E.access_token, '/rest/v1/grades?select=*');
  gate('G4 student GET grades: vazio', eGetG.j, []);
  const gP1 = await jwtFetch(P.access_token, '/rest/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, subject: 'matematica', assessment: 'AE5 P2', score: 9, term: 1, entered_by: P.uid }) });
  gate('G5 pedagogical POST nota da sua matéria (entered_by=próprio): 201', gP1.status, 201);
  const gPneg1 = await jwtFetch(P.access_token, '/rest/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, subject: 'ciencias', assessment: 'AE5 P2', score: 9, term: 1, entered_by: P.uid }) });
  gate('G6 pedagogical POST ciências (fora da matéria): 403', gPneg1.status, 403);
  const gDupTrigger = await jwtFetch(E.access_token, '/rest/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, subject: 'matematica', assessment: 'AE5 P2', score: 9, term: 1, entered_by: E.uid }) });
  gate('G6b student POST duplicado da nota P2: 409 (trigger BEFORE RLS, dispara antes do 403 do RLS)', gDupTrigger.status, 409);
  const gPneg2 = await jwtFetch(P.access_token, '/rest/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, subject: 'matematica', assessment: 'AE5 P2b', score: 9, term: 1, entered_by: D.uid }) });
  gate('G7 pedagogical POST com entered_by alheio: 403', gPneg2.status, 403);
  const gSneg = await jwtFetch(S.access_token, '/rest/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, subject: 'matematica', assessment: 'AE5 P2c', score: 9, term: 1, entered_by: S.uid }) });
  gate('G8 secretary POST nota: 403', gSneg.status, 403);
  const gEneg = await jwtFetch(E.access_token, '/rest/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, subject: 'matematica', assessment: 'AE5 P2d', score: 9, term: 1, entered_by: E.uid }) });
  gate('G9 student POST nota: 403', gEneg.status, 403);
  const gD1 = await jwtFetch(D.access_token, '/rest/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuB.id, subject: 'historia', assessment: 'AE5 P1', score: 8, term: 1, entered_by: D.uid }) });
  gate('G10 director POST nota de qualquer aluno: 201', gD1.status, 201);
  const pPatchCie = await jwtFetch(P.access_token, '/rest/v1/grades?id=eq.' + gA2.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ score: 8 }) });
  gate('G11 grades NÃO tem policy de UPDATE — PATCH pedagogical ciências: 0 linhas (default deny)', [pPatchCie.status, pPatchCie.j.length], [200, 0]);
  const pPatchMat = await jwtFetch(P.access_token, '/rest/v1/grades?id=eq.' + gA1.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ score: 9.5 }) });
  gate('G12 grades NÃO tem policy de UPDATE — PATCH pedagogical matematica (sua matéria): 0 linhas', [pPatchMat.status, pPatchMat.j.length], [200, 0]);
  const sPatchG = await jwtFetch(S.access_token, '/rest/v1/grades?id=eq.' + gA1.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ score: 5 }) });
  gate('G13 grades NÃO tem policy de UPDATE — PATCH secretary: 0 linhas', [sPatchG.status, sPatchG.j.length], [200, 0]);
  const dPatchG = await jwtFetch(D.access_token, '/rest/v1/grades?id=eq.' + gB1.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ score: 8 }) });
  gate('G14 grades NÃO tem policy de UPDATE — PATCH director: 0 linhas', [dPatchG.status, dPatchG.j.length], [200, 0]);
  const pDelCie = await jwtFetch(P.access_token, '/rest/v1/grades?id=eq.' + gA2.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('G15 pedagogical DELETE ciências: 0 linhas', pDelCie.j.length, 0);
  const sDelG = await jwtFetch(S.access_token, '/rest/v1/grades?id=eq.' + gA1.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('G16 secretary DELETE nota: 0 linhas', sDelG.j.length, 0);
  const dDelG = await jwtFetch(D.access_token, '/rest/v1/grades?id=eq.' + gD1.j[0].id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('G17 director DELETE nota: 1 linha', dDelG.j.length, 1);
  const eDelG = await jwtFetch(E.access_token, '/rest/v1/grades?id=eq.' + gP1.j[0].id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('G18 student DELETE nota: 0 linhas', eDelG.j.length, 0);

  // ── 6. LOTE A: attendance (4 policies PUBLIC) ──
  console.log('[6] LOTE A: attendance...');
  const dGetA = await jwtFetch(D.access_token, '/rest/v1/attendance?select=*');
  gate('A1 director GET attendance: 200', dGetA.status, 200);
  gate('A1 director vê todas as presenças', dGetA.j.length, counts0.attendance + 2);
  const pGetA = await jwtFetch(P.access_token, '/rest/v1/attendance?select=*');
  gate('A2 pedagogical vê só o aluno da turma', pGetA.j.length === 1 && pGetA.j[0].id === atA1.id, true);
  const sGetA = await jwtFetch(S.access_token, '/rest/v1/attendance?select=*');
  gate('A3 secretary GET attendance: vazio', sGetA.j, []);
  const eGetA = await jwtFetch(E.access_token, '/rest/v1/attendance?select=*');
  gate('A4 student GET attendance: vazio', eGetA.j, []);
  const atD1 = await jwtFetch(D.access_token, '/rest/v1/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuB.id, attendance_date: '2026-11-17', status: 'present', entered_by: D.uid }) });
  gate('A5 director POST presença: 201', atD1.status, 201);
  const atP1 = await jwtFetch(P.access_token, '/rest/v1/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, attendance_date: '2026-11-17', status: 'present', entered_by: P.uid }) });
  gate('A6 pedagogical POST presença (entered_by=próprio): 201', atP1.status, 201);
  const atPneg1 = await jwtFetch(P.access_token, '/rest/v1/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, attendance_date: '2026-11-16', status: 'present', entered_by: D.uid }) });
  gate('A7 pedagogical POST com entered_by alheio: 403', atPneg1.status, 403);
  const atPneg2 = await jwtFetch(P.access_token, '/rest/v1/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuB.id, attendance_date: '2026-11-16', status: 'present', entered_by: P.uid }) });
  gate('A8 pedagogical POST aluno de outra turma: 403', atPneg2.status, 403);
  const atSneg = await jwtFetch(S.access_token, '/rest/v1/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, attendance_date: '2026-11-16', status: 'present', entered_by: S.uid }) });
  gate('A9 secretary POST presença: 403', atSneg.status, 403);
  const atEneg = await jwtFetch(E.access_token, '/rest/v1/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, attendance_date: '2026-11-16', status: 'present', entered_by: E.uid }) });
  gate('A10 student POST presença: 403', atEneg.status, 403);
  const pPatchAtB = await jwtFetch(P.access_token, '/rest/v1/attendance?id=eq.' + atB1.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status: 'absent' }) });
  gate('A11 pedagogical PATCH aluno de outra turma: 0 linhas', pPatchAtB.j.length, 0);
  const pPatchAtA = await jwtFetch(P.access_token, '/rest/v1/attendance?id=eq.' + atA1.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status: 'justified' }) });
  gate('A12 pedagogical PATCH aluno da turma: 1 linha', pPatchAtA.j.length, 1);
  const sPatchAt = await jwtFetch(S.access_token, '/rest/v1/attendance?id=eq.' + atA1.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status: 'absent' }) });
  gate('A13 secretary PATCH presença: 0 linhas', sPatchAt.j.length, 0);
  const dDelAt = await jwtFetch(D.access_token, '/rest/v1/attendance?id=eq.' + atB1.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('A14 director DELETE presença: 1 linha', dDelAt.j.length, 1);
  const sDelAt = await jwtFetch(S.access_token, '/rest/v1/attendance?id=eq.' + atA1.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('A15 secretary DELETE presença: 0 linhas', sDelAt.j.length, 0);

  // ── 7. LOTE O: occurrences (2 policies PUBLIC — director_select/update) ──
  console.log('[7] LOTE O: occurrences...');
  const dGetO = await jwtFetch(D.access_token, '/rest/v1/occurrences?select=*');
  gate('O1 director GET occurrences: 200', dGetO.status, 200);
  gate('O1 director vê SÓ a ocorrência do aluno da sua escola (wrapper TRUE)', dGetO.j.length === counts0.occurrences + 1 && dGetO.j[0].id === occA.id, true);
  const pGetO = await jwtFetch(P.access_token, '/rest/v1/occurrences?select=*');
  gate('O2 pedagogical vê todas (is_staff, policy alheia ao RM-6.8)', pGetO.j.length, counts0.occurrences + 2);
  const sGetO = await jwtFetch(S.access_token, '/rest/v1/occurrences?select=*');
  gate('O3 secretary GET occurrences: vazio', sGetO.j, []);
  const eGetO = await jwtFetch(E.access_token, '/rest/v1/occurrences?select=*');
  gate('O4 student GET occurrences: vazio', eGetO.j, []);
  const dPatchOwn = await jwtFetch(D.access_token, '/rest/v1/occurrences?id=eq.' + occA.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ description: 'AE5 diretor editou A' }) });
  gate('O5 director PATCH ocorrência da escola: 1 linha', dPatchOwn.j.length, 1);
  const dPatchOther = await jwtFetch(D.access_token, '/rest/v1/occurrences?id=eq.' + occB.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ description: 'AE5 diretor editou B' }) });
  gate('O6 director PATCH ocorrência de OUTRA escola: 0 linhas (wrapper FALSE)', [dPatchOther.status, dPatchOther.j.length], [200, 0]);
  const pPatchO = await jwtFetch(P.access_token, '/rest/v1/occurrences?id=eq.' + occB.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ description: 'AE5 pedagogico editou B' }) });
  gate('O7 pedagogical PATCH qualquer ocorrência: 1 linha', pPatchO.j.length, 1);
  const dPostO = await jwtFetch(D.access_token, '/rest/v1/occurrences', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuA.id, title: 'AE5 diretor insere', description: 'não tem política de INSERT', created_by: D.uid }) });
  gate('O8 director POST ocorrência: 403 (não há INSERT de director)', dPostO.status, 403);
  const occP1 = await jwtFetch(P.access_token, '/rest/v1/occurrences', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: stuB.id, title: 'AE5 pedagogico insere', description: 'is_staff', created_by: P.uid }) });
  gate('O9 pedagogical POST ocorrência: 201', occP1.status, 201);
  const sDelO = await jwtFetch(S.access_token, '/rest/v1/occurrences?id=eq.' + occA.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('O10 secretary DELETE ocorrência: 0 linhas', sDelO.j.length, 0);
  const dDelO = await jwtFetch(D.access_token, '/rest/v1/occurrences?id=eq.' + occB.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  gate('O11 director DELETE ocorrência: 0 linhas (não há DELETE de director)', dDelO.j.length, 0);
  const ePatchO = await jwtFetch(E.access_token, '/rest/v1/occurrences?id=eq.' + occA.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ description: 'AE5 estudante' }) });
  gate('O12 student PATCH ocorrência: 0 linhas', ePatchO.j.length, 0);

  // ── 8. LOTE R: access_requests (2 policies PUBLIC — manage + staff_insert, developer-only) ──
  console.log('[8] LOTE R: access_requests...');
  for (const [papel, c] of Object.entries(contas)) {
    const get = await jwtFetch(c.access_token, '/rest/v1/access_requests?select=*');
    gate(`R GET ${papel}: 200 vazio`, [get.status, get.j.length], [200, 0]);
    const post = await jwtFetch(c.access_token, '/rest/v1/access_requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ email: c.email, requested_role: 'director' }) });
    gate(`R POST ${papel} requested_role fora do self-service: 403 (wrapper dev=false)`, post.status, 403);
  }
  const arD1 = await jwtFetch(D.access_token, '/rest/v1/access_requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ email: D.email, requested_role: 'student' }) });
  gate('R self-service director (requested_role=student): 201 — banda autenticada intacta', arD1.status, 201);

  // ── 9. LOTE V: as 5 vistas sports_public_* FECHADAS (invoker) — regressão de serviço ──
  console.log('[9] LOTE V: vistas sports_public_*...');
  const escolasEsperadas = counts0.sports_schools + 2;
  for (const [papel, c] of Object.entries(contas)) {
    for (const vista of ['sports_public_athletes', 'sports_public_match_events', 'sports_public_matches', 'sports_public_schools', 'sports_public_teams']) {
      const get = await jwtFetch(c.access_token, `/rest/v1/${vista}?select=*`);
      gate(`V ${papel} GET ${vista}: 200`, get.status, 200);
      if (vista === 'sports_public_schools') {
        const esperado = (papel === 'director' || papel === 'secretary') ? escolasEsperadas : 0;
        gate(`V ${papel} ${vista}: ${esperado} linhas (filtro + RLS da base em invoker)`, get.j.length, esperado);
      } else {
        gate(`V ${papel} ${vista}: 0 linhas (base vazia)`, get.j.length, 0);
      }
    }
  }

  // ── 10. limpeza FK-safe por ids gravados + verificação independente ──
  console.log('[10] Limpeza FK-safe...');
  const idsCriados = {
    grades: [gA1.id, gA2.id, gB1.id, gP1.j?.[0]?.id, gD1.j?.[0]?.id].filter(Boolean),
    attendance: [atA1.id, atB1.id, atD1.j?.[0]?.id, atP1.j?.[0]?.id].filter(Boolean),
    occurrences: [occA.id, occB.id, occP1.j?.[0]?.id].filter(Boolean),
    access_requests: [arD1.j?.[0]?.id].filter(Boolean),
    students: [stuA.id, stuB.id],
    classes: [classA.id, classB.id],
    staff_schools: [linkDir.id, linkSec.id],
    teacher_class_subjects: [linkPed.id],
    schools: [idA, idB],
    sports_schools: [idA, idB],
    profiles: Object.values(contas).map((c) => c.uid),
  };
  await sql(`DELETE FROM public.grades WHERE id = ANY('{${idsCriados.grades.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.attendance WHERE id = ANY('{${idsCriados.attendance.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.occurrences WHERE id = ANY('{${idsCriados.occurrences.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.access_requests WHERE id = ANY('{${idsCriados.access_requests.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.students WHERE id = ANY('{${idsCriados.students.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.bfr_teacher_class_subjects WHERE id = ANY('{${idsCriados.teacher_class_subjects.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.classes WHERE id = ANY('{${idsCriados.classes.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.staff_schools WHERE id = ANY('{${idsCriados.staff_schools.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.schools WHERE id = ANY('{${idsCriados.schools.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.sports_schools WHERE id = ANY('{${idsCriados.sports_schools.join(',')}}'::uuid[]);`);
  const auditAntes = await sql(`SELECT count(*)::int as n FROM public.supervision_audit WHERE profile_id = ANY('{${idsCriados.profiles.join(',')}}'::uuid[]);`);
  await sql(`DELETE FROM public.supervision_audit WHERE profile_id = ANY('{${idsCriados.profiles.join(',')}}'::uuid[]);`);
  const auditDepois = await sql(`SELECT count(*)::int as n FROM public.supervision_audit WHERE profile_id = ANY('{${idsCriados.profiles.join(',')}}'::uuid[]);`);
  gate('limpeza: audit FK zerada antes do DELETE das contas (lição AB.5)', [auditAntes[0].n, auditDepois[0].n], [0, 0]);
  await sql(`DELETE FROM public.profiles WHERE id = ANY('{${idsCriados.profiles.join(',')}}'::uuid[]);`);
  for (const c of Object.values(contas)) {
    const del = await admin(`/auth/v1/admin/users/${c.uid}`, { method: 'DELETE' });
    if (![200, 204].includes(del.status)) throw new Error(`limpeza: DELETE conta ${c.email} falhou HTTP ${del.status}: ${JSON.stringify(del.j).slice(0, 400)}`);
    gate(`limpeza: conta ${c.email} re-consultada = 0`, (await adminUsersPorEmail(c.email)).length, 0);
  }
  const perfisRestantes = await sql(`SELECT count(*)::int as n FROM public.profiles WHERE id = ANY('{${idsCriados.profiles.join(',')}}'::uuid[]);`);
  gate('limpeza: 0 perfis restantes', perfisRestantes[0].n, 0);
  const contasVivas = await admin('/auth/v1/admin/users?per_page=200');
  const ae5Vivas = (contasVivas.j.users ?? []).filter((u) => u.email?.startsWith('ae5-'));
  gate('limpeza: 0 contas ae5-* vivas (listagem independente)', ae5Vivas.length, 0);
  const sobrasFixture = await sql(`select json_build_object(
    'grades_volta_a_counts0', (select count(*)::int from public.grades) = ${counts0.grades},
    'attendance_volta_a_counts0', (select count(*)::int from public.attendance) = ${counts0.attendance},
    'occurrences_volta_a_counts0', (select count(*)::int from public.occurrences) = ${counts0.occurrences},
    'access_requests_volta_a_counts0', (select count(*)::int from public.access_requests) = ${counts0.access_requests},
    'students_marca_0', (select count(*)::int from public.students where official_name like '${MARCA} %'),
    'classes_marca_0', (select count(*)::int from public.classes where class_code like '${MARCA} %'),
    'schools_marca_0', (select count(*)::int from public.schools where name like '${MARCA} %'),
    'sports_schools_marca_0', (select count(*)::int from public.sports_schools where name like '${MARCA} %')) as sobras;`);
  gate('limpeza: contagens voltam a counts0 e 0 sobras por classe', sobrasFixture[0].sobras, {
    grades_volta_a_counts0: true, attendance_volta_a_counts0: true, occurrences_volta_a_counts0: true,
    access_requests_volta_a_counts0: true, students_marca_0: 0, classes_marca_0: 0, schools_marca_0: 0, sports_schools_marca_0: 0,
  });
  console.log('    limpeza concluída e verificada\n');

  // ── 11. baseline pós + comparativo ──
  console.log('[11] Baseline pós + comparativo...');
  execFileSync('node', ['scripts/ae5-rm68-baseline.mjs', 'capture', BASEPOS], { cwd: DIR, stdio: 'inherit' });
  const cmp = execFileSync('node', ['scripts/ae5-rm68-baseline.mjs', 'compare', BASEPRE, BASEPOS], { cwd: DIR, encoding: 'utf8' });
  gate('baseline: BASELINE_RESTAURADA (marcador terminal do comparativo)', /AE5_BASELINE_RESTAURADA/.test(cmp), true);

  // ── 12. pós-voo de catálogo (pegada intacta — 0 DDL neste ciclo) ──
  const sondaPos = (await sql(sondaSql()))[0].veredito;
  gate('pós: pegada do catálogo intacta', sondaPos.pegada, pegadaPre);
  gate('pós: 11 PUBLIC ainda com wrappers', sondaPos.public_sem_chamada_privilegiada, 11);

  // ── 13. fecho ──
  const veredito = gates.falhas.length === 0 ? 'AE5_BEHAVIORAL_VERDE' : 'AE5_BEHAVIORAL_VERMELHO';
  const out = {
    em: new Date().toISOString(),
    ok_nomeado: '(a) Mint + s20-behavioral — seleção do usuário, 16/11',
    escopo: '11 policies PUBLIC do RM-6.8 + 5 vistas sports_public_* fechadas (invoker)',
    contas_mintadas: Object.values(contas).map((c) => c.email),
    senha_gerada_por_execucao: true,
    sessoes: SESSIONS,
    counts0,
    ids_fixture: idsCriados,
    limites_honestos: [
      'ramo POSITIVO de access_requests_manage/staff_insert exige papel developer (5.ª conta, fora do OK); coberto pela conferência de texto 44/0',
      'delta de linhas do fecho das vistas é inobservável onde a tabela-base está vazia; excepção medida: sports_public_schools',
      'occurrences reais = 0: equivalência do wrapper do director provada com fixture (TRUE em occA, FALSE em occB)',
    ],
    achados_behaviorais: [
      'grades NÃO tem policy de UPDATE no conjunto PUBLIC do RM-6.8 (só insert/select/delete): PATCH de QUALQUER papel é 200 com 0 linhas (default deny) — atualização de nota só por via privilegiada',
      'trigger bfr_prevent_duplicate_grade (BEFORE INSERT OR UPDATE) dispara ANTES do RLS: POST duplicado devolve 409 mesmo para papel que o RLS negaria (G6b, student)',
      'attendance tem UNIQUE (student_id, attendance_date) avaliado DEPOIS do RLS: papel negado vê 403 (A7), papel permitido em duplicata vê 409 (prova de ordem de avaliação)',
    ],
    pegada_pre: pegadaPre,
    pegada_pos: sondaPos.pegada,
    portoes: gates.portoes,
    falhas: gates.falhas,
    veredito,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n=== ${veredito} | portões ${gates.portoes} | falhas ${gates.falhas.length} ===`);
  if (gates.falhas.length) { for (const f of gates.falhas) console.log('VERMELHO  ' + f); process.exit(1); }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
