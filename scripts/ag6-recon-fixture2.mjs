// AG-6 recon 2 (SÓ LEITURA): padrão real das linhas de horário da versão publicada, para a fixture
// do professor usar os mesmos shift/grade_label/weekday/period/times e ids de turma/disciplina.
import { readFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
};
const V = '430db726-8a48-4ec8-a6ff-27e05160a420';
console.log('distinct shift/grade:', JSON.stringify(await sql(`select shift, grade_label, count(*)::int n from public.bfr_schedule_entries where version_id='${V}' group by 1,2 order by 1,2;`)));
console.log('\ndistinct weekday/period/times:', JSON.stringify(await sql(`select weekday, period, min(start_time) ini, max(end_time) fim, count(*)::int n from public.bfr_schedule_entries where version_id='${V}' group by 1,2 order by 1,2;`)));
console.log('\n3 linhas reais completas:', JSON.stringify(await sql(`select * from public.bfr_schedule_entries where version_id='${V}' limit 3;`), null, 1));
console.log('\nclasses:', JSON.stringify(await sql(`select table_name from information_schema.tables where table_schema='public' and table_name ilike '%class%';`)));
console.log('amostra de classes:', JSON.stringify(await sql(`select * from public.classes limit 3;`).catch((e) => String(e.message).slice(0, 200))));
console.log('\ndisciplinas:', JSON.stringify(await sql(`select table_name from information_schema.tables where table_schema='public' and table_name ilike '%subject%';`)));
console.log('subjects distintos das entries:', JSON.stringify(await sql(`select distinct subject_id, subject_name from public.bfr_schedule_entries where version_id='${V}' limit 8;`)));
console.log('\ndirectory real (3):', JSON.stringify(await sql(`select id, profile_id, source_name, display_name, normalized_name, active from public.bfr_teacher_directory limit 3;`)));
console.log('\nquantas entries têm teacher_id nulo:', JSON.stringify(await sql(`select (teacher_id is null) sem_professor, count(*)::int n from public.bfr_schedule_entries where version_id='${V}' group by 1;`)));
console.log('\ncontas por role:', JSON.stringify(await sql(`select role, count(*)::int n from public.profiles group by 1 order by 2 desc;`)));
