// C2-1 — baseline do ciclo Transporte: contagem E md5 por tabela. Instrumento único pré/pós.
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, DIR } from './s19-lib.mjs';

const ALVOS = [
  ['auth.users', 'auth.users'],
  ['public.profiles', 'public.profiles'],
  ['public.classes', 'public.classes'],
  ['public.students', 'public.students'],
  ['public.guardian_students', 'public.guardian_students'],
  ['public.gate_badges', 'public.gate_badges'],
  ['public.route_incidents', 'public.route_incidents'],
  ['public.student_messages', 'public.student_messages'],
  ['public.gate_checkins', 'public.gate_checkins'],
  ['public.gate_entry_alerts', 'public.gate_entry_alerts'],
  ['public.entry_restrictions', 'public.entry_restrictions'],
  ['public.occurrences', 'public.occurrences'],
  ['public.attendance', 'public.attendance'],
  ['public.student_school_profiles', 'public.student_school_profiles'],
  ['public.school_notification_reads', 'public.school_notification_reads'],
];

export async function snapshot() {
  const tabelas = {};
  for (const [nome, from] of ALVOS) {
    const rows = await sql(`select count(*)::int as n from ${from};`);
    const hashRows = await sql(`select md5(string_agg(t::text, ',' order by t::text)) as h from (select * from ${from}) t;`);
    tabelas[nome] = { n: rows[0].n, md5: hashRows[0].h || 'empty' };
  }
  return { em: new Date().toISOString(), tabelas };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fase = process.argv[2] || 'pre';
  if (!['pre', 'pos'].includes(fase)) throw new Error('uso: node c2-baseline.mjs [pre|pos]');
  const out = `${DIR}/docs/c2-baseline-${fase}.json`;
  if (existsSync(out)) throw new Error(`ABORTA: ${out} já existe — ciclo sujo`);
  const snap = await snapshot();
  writeFileSync(out, JSON.stringify({ ciclo: 'C2', fase, ...snap }, null, 2) + '\n');
  for (const [nome, v] of Object.entries(snap.tabelas)) console.log(`  ${nome}: n=${v.n} md5=${v.md5}`);
  console.log(`C2_BASELINE_${fase.toUpperCase()}_OK — docs/c2-baseline-${fase}.json`);
}