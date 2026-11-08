// S19-2 — baseline do ciclo: contagem E md5 por tabela. Instrumento único pré/pós.
// Credenciais só de ficheiro; nada impresso além de contagens e hashes.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const token = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

// [rótulo, FROM] — storage.objects entra filtrado pelo bucket do ciclo
const ALVOS = [
  ['auth.users', 'auth.users'],
  ['public.profiles', 'public.profiles'],
  ['public.sports_schools', 'public.sports_schools'],
  ['public.staff_schools', 'public.staff_schools'],
  ['public.supervision_requests', 'public.supervision_requests'],
  ['public.supervision_responses', 'public.supervision_responses'],
  ['public.supervision_response_attachments', 'public.supervision_response_attachments'],
  ['public.supervision_action_plans', 'public.supervision_action_plans'],
  ['public.supervision_alerts', 'public.supervision_alerts'],
  ['public.supervision_audit', 'public.supervision_audit'],
  ['public.learning_action_plans', 'public.learning_action_plans'],
  ['public.support_requests', 'public.support_requests'],
  ['storage.objects(secretary-attachments)', `(select * from storage.objects where bucket_id='secretary-attachments') sub`],
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
  if (!['pre', 'pos'].includes(fase)) throw new Error('uso: node s19-baseline.mjs [pre|pos]');
  const out = `${DIR}/evidence/s19-baseline-${fase}.json`;
  if (existsSync(out)) throw new Error(`ABORTA: ${out} já existe — ciclo sujo`);
  const snap = await snapshot();
  writeFileSync(out, JSON.stringify({ ciclo: 'S19', fase, ...snap }, null, 2) + '\n');
  for (const [nome, v] of Object.entries(snap.tabelas)) console.log(`  ${nome}: n=${v.n} md5=${v.md5}`);
  console.log(`S19_BASELINE_${fase.toUpperCase()}_OK — evidence/s19-baseline-${fase}.json`);
}