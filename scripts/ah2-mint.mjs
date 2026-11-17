// AH-2-M — mint das 15 contas sintéticas (uma por rótulo do enum account_role) + fixture do vínculo
// docente, para fechar AG-6 (RM-6.3 ×15×2, RM-1.2 clique de developer, RM-2.7 professor populado).
// Autorização: tranche escolhida «Ciclos com mint + browser» + «faca todos» (17/11). 0 deploy, 0 DDL,
// 0 publicação. Toda linha escrita é de fixture e tem o valor anterior guardado para a limpeza.
// O vínculo docente é um UPDATE de UMA coluna (bfr_teacher_directory.profile_id, hoje nulo) num
// professor real da grade publicada — não se inventa linha de horário.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const SESSOES = `${DIR}/ah2-sessions.json`;
const DIARIO = `${DIR}/bfr-conecta/evidence/ah2-mint-17-11.json`;
const ARQUIVO = `${DIR}/bfr-conecta/evidence/ah2-contas-17-11.json`;
const SCHOOL = '08ebef62-2193-4520-ab44-c044160d565f';
const VERSAO = '430db726-8a48-4ec8-a6ff-27e05160a420'; // Grade oficial 2026, published

for (const f of [DIARIO, ARQUIVO, SESSOES]) if (existsSync(f)) throw new Error(`ABORTA: ${f} já existe — ciclo sujo`);

const regua = JSON.parse(readFileSync(`${DIR}/bfr-conecta/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 400)}`);
  return JSON.parse(t);
};
const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, { ...init, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

const diario = { ciclo: 'AH-2', autorizacao: 'tranche «Ciclos com mint + browser» + «faca todos»; publicar/DDL/push NÃO autorizados', em: new Date().toISOString(), stages: {} };
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

// ═══ S1: ar + baseline ═══
const shellTxt = await (await fetch(AR, { headers: { 'Cache-Control': 'no-cache' } })).text();
const md5 = (s) => createHash('md5').update(s).digest('hex');
gate('ar = v123 (md5 da régua)', md5(shellTxt), regua.htmlMd5);
if (md5(shellTxt) !== regua.htmlMd5) throw new Error('ABORTA: o ar mudou desde a régua — re-preflight antes de mintar');

const tabelas = ['auth.users', 'public.profiles', 'public.staff_schools', 'public.access_requests', 'public.bfr_teacher_directory', 'public.bfr_schedule_entries', 'public.supervision_audit', 'public.supervision_requests'];
const baseline = {};
for (const t of tabelas) {
  const n = await sql(`select count(*)::int as n from ${t};`);
  const h = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from ${t}) x;`);
  baseline[t] = { n: n[0].n, md5: h[0].h || 'empty' };
}
diario.stages.baseline_pre = baseline;
console.log('[S1] ' + tabelas.map((t) => `${t.split('.').pop()}=${baseline[t].n}`).join(' · '));
gate('ciclo limpo: nenhuma conta ah2- existe antes de mintar', (await sql(`select count(*)::int as n from auth.users where email like 'ah2-%@bfr-conecta.test';`))[0].n, 0);

// ═══ S2: os 15 rótulos, lidos do ar (não da memória) ═══
const rotulos = (await sql(`select e.enumlabel as r from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='account_role' order by e.enumsortorder;`)).map((x) => x.r);
gate('enum account_role tem 15 rótulos', rotulos.length, 15);
gate('rótulos distintos (sem duplicata por caixa)', new Set(rotulos).size, rotulos.length);
diario.stages.rotulos = rotulos;
console.log('[S2] rótulos: ' + rotulos.join(' '));

// ═══ S3: 15 contas, uma por rótulo ═══
const contas = []; const sessoes = {};
for (const rotulo of rotulos) {
  const email = `ah2-${rotulo}-${randomBytes(3).toString('hex')}@bfr-conecta.test`;
  const uid = randomUUID();
  const senha = randomBytes(18).toString('base64url');
  const criado = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ id: uid, email, password: senha, email_confirm: true, data: { full_name: `AH2 ${rotulo} Sintética (apagar)` } }) });
  if (![200, 201].includes(criado.status)) throw new Error(`mint ${rotulo} HTTP ${criado.status}: ${JSON.stringify(criado.j).slice(0, 200)}`);
  const id = criado.j?.id || criado.j?.user?.id || uid;
  const tok = await admin('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: senha }) });
  if (!tok.j?.access_token) throw new Error(`login ${rotulo} HTTP ${tok.status}: ${JSON.stringify(tok.j).slice(0, 200)}`);
  const papelTrigger = (await sql(`select role::text as r, full_name as f from public.profiles where id='${id}'::uuid;`))[0];
  await sql(`update public.profiles set role='${rotulo}'::account_role, full_name='AH2 ${rotulo} Sintética (apagar)' where id='${id}'::uuid;`);
  const depois = await sql(`select role::text as r from public.profiles where id='${id}'::uuid;`);
  contas.push({ papel: rotulo, id, email, papel_ao_criar: papelTrigger?.r ?? null, papel_depois: depois[0]?.r });
  sessoes[rotulo] = { id, email, access_token: tok.j.access_token, refresh_token: tok.j.refresh_token, expires_at: tok.j.expires_at, user: tok.j.user };
  console.log(`  ${rotulo}: criado=${papelTrigger?.r ?? 'AUSENTE'} → ${depois[0]?.r}`);
}
gate('as 15 contas têm o papel pedido', contas.filter((c) => c.papel_depois !== c.papel).map((c) => c.papel), []);
gate('15 perfis novos no ar', contas.length, 15);
gate('login 200 para as 15', Object.values(sessoes).filter((s) => typeof s.access_token === 'string' && s.access_token.length > 100).length, 15);
// ACHADO medido (não expectativa): o gatilho de criação dá `parent`, não `pending`. Foi este portão
// errado que derrubou a 1.ª execução — a régua é o ar, não a memória.
gate('papel herdado no create é parent (medido 17/11; pending exige ação)', [...new Set(contas.map((c) => c.papel_ao_criar))], ['parent']);
diario.achado_papel_herdado = 'on_auth_user_created dá role=parent a toda conta nova; nenhum rótulo nasce pending por trigger';

// ═══ S4: fixtures declaradas ═══
// A lista de papéis com vínculo de equipe é LIDA do CHECK do ar, não escrita à mão: foi um CHECK que
// derrubou a execução anterior quando eu supus que todo account_role cabia em staff_schools.
const defCheck = (await sql(`select pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.staff_schools'::regclass and conname='staff_schools_role_check';`))[0].def;
const PAPEIS_STAFF = [...defCheck.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
gate('o CHECK de staff_schools aceita 4 rótulos', PAPEIS_STAFF, ['director', 'coordinator', 'secretary', 'education_supervisor']);
diario.achado_vocabulario_de_vinculo = { permitidos_por_check: PAPEIS_STAFF, papeis_sem_vocabulario_de_vinculo: rotulos.filter((r) => !PAPEIS_STAFF.includes(r)) };
console.log('[S4] vínculo de equipe possível só para: ' + PAPEIS_STAFF.join(', '));
const vinculos = [];
for (const p of PAPEIS_STAFF) {
  const c = contas.find((x) => x.papel === p);
  const linkId = randomUUID();
  await sql(`insert into public.staff_schools (id, profile_id, school_id, role) values ('${linkId}', '${c.id}'::uuid, '${SCHOOL}'::uuid, '${p}');`);
  const n = (await sql(`select count(*)::int as n from public.staff_schools where id='${linkId}';`))[0].n;
  vinculos.push({ papel: p, staff_schools_id: linkId });
  gate(`staff_schools de ${p}`, n, 1);
}
// RM-2.7: ligar um professor REAL da grade publicada à conta pedagogical (uma coluna, hoje nula)
const prof = (await sql(`select d.id, d.display_name, d.profile_id, count(e.id)::int as entries, count(distinct e.class_id)::int as turmas, count(distinct e.subject_id)::int as disciplinas from public.bfr_teacher_directory d join public.bfr_schedule_entries e on e.teacher_id=d.id where e.version_id='${VERSAO}' and d.profile_id is null and d.active group by 1,2,3 order by entries desc limit 1;`))[0];
const ped = contas.find((x) => x.papel === 'pedagogical');
const antes = (await sql(`select profile_id from public.bfr_teacher_directory where id='${prof.id}';`))[0];
gate('o profile_id do professor elegido está nulo antes (fixture não pisa vínculo alheio)', antes.profile_id, null);
await sql(`update public.bfr_teacher_directory set profile_id='${ped.id}'::uuid where id='${prof.id}'::uuid;`);
const depois = (await sql(`select count(*)::int as n from public.bfr_teacher_directory where id='${prof.id}'::uuid and profile_id='${ped.id}'::uuid;`))[0].n;
gate('vínculo docente criado (1 coluna, 1 linha)', depois, 1);
const aulas = (await sql(`select count(*)::int as n, count(distinct class_id)::int as turmas from public.bfr_schedule_entries where teacher_id='${prof.id}'::uuid and version_id='${VERSAO}';`))[0];
gate('o vínculo tem grade real por trás (>20 aulas, >5 turmas)', [aulas.n > 20, aulas.turmas > 5], [true, true]);
// RM-1.2: alvo da mudança de papel tem de ser uma das NOSSAS contas, nunca uma real
const alvo = contas.find((x) => x.papel === 'parent');

diario.stages.fixtures = {
  staff_schools: vinculos,
  professor: { directory_id: prof.id, aulas: aulas.n, turmas: aulas.turmas, disciplinas: prof.disciplinas, profile_id_anterior: antes.profile_id, ligado_a: ped.id },
  alvo_de_troca_de_papel: { papel: alvo.papel, id: alvo.id },
};
diario.escritas_em_tabelas_de_produto = { auth_users: 15, profiles_role: 15, profiles_vinculo_staff: PAPEIS_STAFF.length, teacher_directory_profile_id: 1, total_linhas_novas: 15 + PAPEIS_STAFF.length, celulas_alteradas_em_linha_existente: 1 };

writeFileSync(SESSOES, JSON.stringify(sessoes, null, 2) + '\n');
writeFileSync(ARQUIVO, JSON.stringify({ ciclo: 'AH-2', contas, ...diario.stages.fixtures, limpeza: 'pendente — ah2-varredura / ah2-cliques / ah2-professor antes de ah2-limpeza' }, null, 2) + '\n');
diario.stages.sessions = { arquivo: 'ah2-sessions.json (fora do repositório)', nota: 'tokens nunca entram no repositório' };
diario.portoes = portoes; diario.falhas = falhas.slice();
writeFileSync(DIARIO, JSON.stringify(diario, null, 2) + '\n');

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'AH2_PAROU' : `AH2_MINT_OK 15 contas + vínculo docente de ${prof.aulas ?? aulas.n} aulas · seguir para ah2-varredura.mjs`);
if (falhas.length) process.exit(1);
