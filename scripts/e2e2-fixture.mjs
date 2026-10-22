// E2E-2 — fixture sintética dos 4 fluxos pendentes (frequência por aula, chat interno,
// nota pelo modal, biblioteca). Só leitura nas contas; inserts 100% sintéticos com UUIDs
// explícitos salvos em e2e2-fixture.json para limpeza exata. Entrada de grade entra na
// versão REAL publicada de 2026 (único jeito de o app e a RLS enxergarem a aula).
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/.kiro/crew/uploads';
const SQL_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const token = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const contas = JSON.parse(readFileSync(`${DIR}/bfr-audit-contas.json`, 'utf8'));
const P = contas.find(c => c?.papel === 'pedagogical')?.id;
const Q = contas.find(c => c?.papel === 'coordinator')?.id;
if (!P || !Q) throw new Error('contas sintéticas ausentes — rode antes: node cria-sessao-audit.mjs <papel> para os dois papéis');
const baseline = JSON.parse(readFileSync(`${DIR}/e2e2-baseline.json`, 'utf8')).dados;
const VERSAO_ESPERADA = baseline.versao_publicada_2026;

const diario = {
  em: new Date().toISOString(), ref: REF, contas: { pedagogical: P, coordinator: Q },
  versao_publicada_2026: VERSAO_ESPERADA, fixture: {},
};

const rodarSql = async (query) => {
  const r = await fetch(SQL_URL, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 600)}`);
  return JSON.parse(t);
};
const falhar = (msg) => { diario.falha = msg; writeFileSync(`${DIR}/e2e2-fixture.json`, JSON.stringify(diario, null, 2)); throw new Error(msg); };
const salvar = () => writeFileSync(`${DIR}/e2e2-fixture.json`, JSON.stringify(diario, null, 2));

console.log('[1] pré-condições: contas vivas + versão publicada intacta');
const pre = await rodarSql(`select json_build_object(
  'auth_vivas', (select count(*)::int from auth.users where id in ('${P}','${Q}')),
  'profiles_vivos', (select count(*)::int from public.profiles where id in ('${P}','${Q}')),
  'versao', (select id from public.bfr_schedule_versions where status='published' and school_year=2026 limit 1),
  'sobra_classe', (select count(*)::int from public.classes where year=9 and class_code='ZY'),
  'sobra_diretorio', (select count(*)::int from public.bfr_teacher_directory where normalized_name='e2e2-sintetico'),
  'sobra_thread', (select count(*)::int from public.internal_chat_threads where title='E2E-2 grupo sintético'),
  'sobra_link', (select count(*)::int from public.bfr_teacher_class_subjects where profile_id='${P}' and subject='História')
) as dados;`);
const d = pre[0].dados;
diario.pre = d;
console.log(JSON.stringify(d, null, 2));
if (d.auth_vivas !== 2) falhar('contas sintéticas não estão vivas (esperava 2)');
if (d.profiles_vivos !== 2) falhar('profiles das contas sintéticas ausentes');
if (d.versao !== VERSAO_ESPERADA) falhar(`versão publicada mudou: ${d.versao} (esperava ${VERSAO_ESPERADA})`);
if (d.sobra_classe || d.sobra_diretorio || d.sobra_thread || d.sobra_link) falhar('sobras de uma execução anterior detectadas — limpe antes de re-rodar');

console.log('[2] insert da fixture (turma 9ZY + 2 alunos + vínculo + diretório + aula na grade real + sala de chat)');
const C = randomUUID(), S1 = randomUUID(), S2 = randomUUID(), L = randomUUID(), T = randomUUID(), E = randomUUID(), TH = randomUUID();
const FIXTURE_SQL = `
insert into public.classes (id, year, class_code, shift) values ('${C}', 9, 'ZY', 'matutino');
insert into public.students (id, official_name, class_id, active) values
  ('${S1}', 'E2E-2 ALUNO UM', '${C}', true),
  ('${S2}', 'E2E-2 ALUNO DOIS', '${C}', true);
insert into public.bfr_teacher_class_subjects (id, profile_id, class_id, subject, active)
  values ('${L}', '${P}', '${C}', 'História', true);
insert into public.bfr_teacher_directory (id, profile_id, source_name, display_name, normalized_name, active)
  values ('${T}', '${P}', 'e2e2-sintetico', 'Conta sintética E2E-2', 'e2e2-sintetico', true);
insert into public.bfr_schedule_entries (id, version_id, shift, weekday, period, grade_label, class_id, teacher_id, subject_name, start_time, end_time, source_status)
  values ('${E}', '${VERSAO_ESPERADA}', 'matutino', 'quinta', 1, '9ZY', '${C}', '${T}', 'História', '07:00:00', '07:50:00', 'confirmed');
insert into public.internal_chat_threads (id, kind, title, created_by)
  values ('${TH}', 'group', 'E2E-2 grupo sintético', '${P}');
insert into public.internal_chat_room_members (room_id, profile_id) values ('${TH}', '${P}'), ('${TH}', '${Q}');
select 1 as fixture_ok;`;
const fix = await rodarSql(FIXTURE_SQL);
if (fix[0]?.fixture_ok !== 1) falhar('fixture não confirmou');
Object.assign(diario.fixture, { classe: C, aluno1: S1, aluno2: S2, link: L, diretorio: T, entrada: E, thread: TH });
salvar();

console.log('[3] conferência de cada linha');
const conf = await rodarSql(`select json_build_object(
  'classe', (select count(*)::int from public.classes where id='${C}' and year=9 and class_code='ZY' and shift='matutino'),
  'alunos', (select count(*)::int from public.students where id in ('${S1}','${S2}') and class_id='${C}' and active),
  'link', (select count(*)::int from public.bfr_teacher_class_subjects where id='${L}' and profile_id='${P}' and class_id='${C}' and subject='História' and active),
  'diretorio', (select count(*)::int from public.bfr_teacher_directory where id='${T}' and profile_id='${P}' and normalized_name='e2e2-sintetico' and active),
  'entrada', (select count(*)::int from public.bfr_schedule_entries where id='${E}' and version_id='${VERSAO_ESPERADA}' and class_id='${C}' and teacher_id='${T}' and subject_name='História' and weekday='quinta' and period=1),
  'thread', (select count(*)::int from public.internal_chat_threads where id='${TH}' and kind='group' and created_by='${P}'),
  'membros', (select count(*)::int from public.internal_chat_room_members where room_id='${TH}' and profile_id in ('${P}','${Q}'))
) as dados;`);
diario.conferencia = conf[0].dados;
console.log(JSON.stringify(diario.conferencia, null, 2));
const esperado = { classe: 1, alunos: 2, link: 1, diretorio: 1, entrada: 1, thread: 1, membros: 2 };
for (const [k, v] of Object.entries(esperado)) {
  if (diario.conferencia[k] !== v) falhar(`conferência falhou em ${k}: veio ${diario.conferencia[k]}, esperava ${v}`);
}

salvar();
console.log('FIXTURE OK:', JSON.stringify(diario.fixture, null, 2));
console.log('próximo passo: node e2e2-teste-frequencia.mjs');
