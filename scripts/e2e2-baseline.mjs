// Baseline do ciclo E2E-2 (frequência, chat, modal de nota, biblioteca) — só leitura.
import { readFileSync, writeFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/.kiro/crew/uploads';
const token = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

// expressão de assinatura por tabela: md5 da concatenação ordenada das chaves
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

const md5s = tabelas.map(tb => `'${tb}', (select ${expr(tb)} from ${rel(tb)})`).join(',\n  ');

const sql = `select json_build_object(
  ${md5s},
  'counts', json_build_object(
    ${tabelas.map(tb => `'${tb}', (select count(*)::int from ${rel(tb)})`).join(',\n    ')}
  ),
  'versao_publicada_2026', (select id from public.bfr_schedule_versions where status='published' and school_year=2026 limit 1),
  'perfil_pedagogical_real', (select id from public.profiles where role::text='pedagogical' and email not like '%bfr-conecta.test%' limit 1),
  'conta_testes_vivas', (select count(*)::int from auth.users where email like '%bfr-conecta.test%')
) as dados;`;

const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const t = await r.text();
console.log('HTTP', r.status);
if (!r.ok) { console.log(t.slice(0, 1200)); process.exit(1); }
const dados = JSON.parse(t)[0]?.dados;
const saida = { em: new Date().toISOString(), ref: REF, dados };
writeFileSync(`${DIR}/e2e2-baseline.json`, JSON.stringify(saida, null, 2), 'utf8');
console.log(JSON.stringify({ counts: dados.counts, versao: dados.versao_publicada_2026, vivas: dados.conta_testes_vivas }, null, 2));
