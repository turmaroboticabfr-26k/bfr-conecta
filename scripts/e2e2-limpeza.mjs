// LIMPEZA do ciclo E2E-2 (frequência, chat, nota, biblioteca): apaga só o que o ciclo criou,
// em ordem FK-safe, e prova a volta à baseline por contagem + md5 programático (nunca por olho).
// Guardas: e-mail @bfr-conecta.test antes de tocar contas; linhas só pelos ids sintéticos do fixture.
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/.kiro/crew/uploads';
const SQL_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const HOST = `https://${REF}.supabase.co`;
const token = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();

const baseline = JSON.parse(readFileSync(`${DIR}/e2e2-baseline.json`, 'utf8')).dados;
const fix = JSON.parse(readFileSync(`${DIR}/e2e2-fixture.json`, 'utf8')).fixture;
const contas = JSON.parse(readFileSync(`${DIR}/bfr-audit-contas.json`, 'utf8'));
const { classe: C, aluno1: S1, aluno2: S2, link: L, diretorio: T, entrada: E, thread: TH } = fix;
const P = contas.find(c => c?.papel === 'pedagogical')?.id;
const Q = contas.find(c => c?.papel === 'coordinator')?.id;

const diario = { em: new Date().toISOString(), ref: REF, fixture: fix, contas };
const rodar = async (query) => {
  const r = await fetch(SQL_URL, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 600)}`);
  return JSON.parse(t);
};
const falhar = (msg) => { diario.falha = msg; writeFileSync(`${DIR}/e2e2-limpeza.json`, JSON.stringify(diario, null, 2)); throw new Error(msg); };
const salvar = () => writeFileSync(`${DIR}/e2e2-limpeza.json`, JSON.stringify(diario, null, 2));

// mesma assinatura da baseline (md5 das chaves ordenadas; '' para tabela vazia)
const assinatura = {
  'internal_chat_room_members': `coalesce(md5(string_agg(room_id::text || '|' || profile_id::text, ',' order by room_id, profile_id)), '')`,
  'internal_chat_presence': `coalesce(md5(string_agg(profile_id::text, ',' order by profile_id)), '')`,
  'internal_chat_message_reactions': `coalesce(md5(string_agg(message_id::text || '|' || profile_id::text || '|' || emoji, ',' order by message_id, profile_id, emoji)), '')`,
};
const tabelas = [
  'profiles', 'classes', 'students', 'bfr_teacher_class_subjects', 'bfr_teacher_directory',
  'bfr_schedule_entries', 'bfr_schedule_versions', 'grades', 'attendance',
  'bfr_lesson_attendance', 'bfr_lesson_attendance_audit',
  'internal_chat_threads', 'internal_chat_messages', 'internal_chat_room_members',
  'internal_chat_message_reactions', 'internal_chat_message_reports', 'internal_chat_presence',
  'school_documents', 'auth_users',
];
const rel = tb => tb === 'auth_users' ? 'auth.users' : 'public.' + tb;
const expr = tb => assinatura[tb] || `coalesce(md5(string_agg(id::text, ',' order by id)), '')`;
const medirSql = () => `select json_build_object(
  ${tabelas.map(tb => `'${tb}', (select ${expr(tb)} from ${rel(tb)})`).join(',\n  ')},
  'counts', json_build_object(${tabelas.map(tb => `'${tb}', (select count(*)::int from ${rel(tb)})`).join(',\n    ')}),
  'versao_publicada_2026', (select id from public.bfr_schedule_versions where status='published' and school_year=2026 limit 1),
  'conta_testes_vivas', (select count(*)::int from auth.users where email like '%bfr-conecta.test%')
) as dados;`;

console.log('[1] pré-voo: guarda de contas + contagens atuais');
const guarda = await rodar(`select json_agg(json_build_object('id', id::text, 'email', email)) as contas
  from auth.users where id in ('${P}','${Q}');`);
for (const c of guarda[0].contas || []) {
  if (!/@bfr-conecta\.test$/.test(c.email)) falhar(`RECUSADO: conta ${c.id} tem e-mail fora do domínio de teste (${c.email})`);
}
diario.guarda_contas = guarda[0].contas;
const antes = (await rodar(medirSql()))[0].dados;
diario.antes = antes;
console.log(JSON.stringify(antes.counts));

console.log('[2] deletes FK-safe (linhas do ciclo)');
const delSql = `
delete from public.internal_chat_messages where room_id = '${TH}';
delete from public.internal_chat_room_members where room_id = '${TH}';
delete from public.internal_chat_threads where id = '${TH}' and title = 'E2E-2 grupo sintético';
delete from public.internal_chat_presence where profile_id in ('${P}','${Q}');
delete from public.bfr_lesson_attendance_audit
  where lesson_attendance_id in (select id from public.bfr_lesson_attendance where student_id in ('${S1}','${S2}') and schedule_entry_id = '${E}');
delete from public.bfr_lesson_attendance where student_id in ('${S1}','${S2}') and schedule_entry_id = '${E}';
delete from public.grades where student_id in ('${S1}','${S2}') and assessment like 'Prova E2E-3%' and entered_by = '${P}';
delete from public.bfr_schedule_entries where id = '${E}';
delete from public.bfr_teacher_directory where id = '${T}' and normalized_name = 'e2e2-sintetico';
delete from public.bfr_teacher_class_subjects where id = '${L}' and profile_id = '${P}';
delete from public.students where id in ('${S1}','${S2}') and class_id = '${C}';
delete from public.classes where id = '${C}' and year = 9 and class_code = 'ZY';
delete from public.profiles where id in ('${P}','${Q}');
select 1 as deletes_ok;`;
const d = await rodar(delSql);
if (d[0]?.deletes_ok !== 1) falhar('deletes não confirmaram: ' + JSON.stringify(d).slice(0, 400));

console.log('[3] auth.users via Admin API (guard já feito)');
diario.admin = [];
for (const c of [P, Q]) {
  const r = await fetch(`${HOST}/auth/v1/admin/users/${c}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey } });
  diario.admin.push({ id: c, http: r.status });
  if (r.status !== 200 && r.status !== 404) falhar(`Admin DELETE de ${c} respondeu HTTP ${r.status}`);
}

console.log('[4] conferência programática contra a baseline');
const depois = (await rodar(medirSql()))[0].dados;
diario.depois = depois;
const dif = { counts: {}, md5: {} };
for (const tb of tabelas) {
  const cOk = depois.counts[tb] === baseline.counts[tb];
  const mOk = depois[tb] === baseline[tb];
  if (!cOk) dif.counts[tb] = { atual: depois.counts[tb], baseline: baseline.counts[tb] };
  if (!mOk) dif.md5[tb] = { atual: depois[tb], baseline: baseline[tb] };
}
diario.diferencas = dif;
if (depois.versao_publicada_2026 !== baseline.versao_publicada_2026) {
  falhar(`versão publicada mudou: ${depois.versao_publicada_2026} (baseline ${baseline.versao_publicada_2026})`);
}
if (depois.conta_testes_vivas !== baseline.conta_testes_vivas) {
  dif.counts.conta_testes_vivas = { atual: depois.conta_testes_vivas, baseline: baseline.conta_testes_vivas };
}
if (Object.keys(dif.counts).length || Object.keys(dif.md5).length) {
  falhar('baseline NÃO restaurada: ' + JSON.stringify(dif));
}
console.log('BASELINE RESTAURADA: contagens e md5 idênticos em todas as ' + tabelas.length + ' tabelas.');

console.log('[5] manifesto zerado');
writeFileSync(`${DIR}/bfr-audit-contas.json`, '[]', 'utf8');
diario.manifesto = [];
diario.veredito = 'LIMPO';
salvar();
console.log('LIMPEZA OK — diário em e2e2-limpeza.json');
