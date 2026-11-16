// Sonda somente-leitura: CHECKs vivos de attendance/grades/occurrences e valores distintos.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5d-rm68-checks-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard.`);
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};
const out = { em: new Date().toISOString() };
out.checks = await sql(`
  select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
   where contype = 'c'
     and conrelid in ('public.attendance'::regclass, 'public.grades'::regclass, 'public.occurrences'::regclass, 'public.access_requests'::regclass)
   order by conname;`);
out.distintos = await sql(`
  select json_build_object(
    'attendance_status', (select coalesce(string_agg(distinct status, '|'), '') from public.attendance),
    'attendance_datas_recentes', (select coalesce(string_agg(d, '|'), '') from (select distinct attendance_date::text as d from public.attendance order by 1 desc limit 3) x),
    'grades_subjects', (select coalesce(string_agg(distinct subject, '|'), '') from public.grades),
    'grades_assessments', (select coalesce(string_agg(distinct assessment, '|'), '') from public.grades),
    'grades_terms', (select coalesce(string_agg(distinct term::text, '|'), '') from public.grades),
    'occurrences_titulos', (select coalesce(string_agg(distinct title, '|'), '') from public.occurrences)) as d;`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5D_CHECKS_ESCRITO');
