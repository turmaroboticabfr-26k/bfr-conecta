// RM-1.1b — fonte das funções que citam gate_checkins+attendance. Read-only.
import { writeFileSync } from 'node:fs';
import { sql, DIR } from './s19-lib.mjs';

const funcoes = ['bfr_teacher_lesson_gate_evidence', 'bfr_supervision_frequencia', 'bfr_supervision_comparativo', 'confirm_guardian_entry', 'register_gate_checkin'];
const out = {};
for (const f of funcoes) {
  const linhas = await sql(`
    select p.proname, p.oid::regprocedure::text assinatura, pg_get_functiondef(p.oid) def
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname = '${f}'`);
  out[f] = linhas.map(l => ({ assinatura: l.assinatura, def: l.def }));
  console.log(`== ${f} (${linhas.length})`);
  for (const l of linhas) console.log(l.def);
}

const rt = await sql(`select pubname, tablename from pg_publication_tables where tablename ilike '%attend%' or tablename ilike '%checkin%' order by tablename`);
out.realtime = rt;
console.log('== realtime:', JSON.stringify(rt));

writeFileSync(`${DIR}/evidence/roadmap-rm11-elo-funcoes.json`, JSON.stringify(out, null, 2) + '\n');
