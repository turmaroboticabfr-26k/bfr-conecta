// AG-6 recon (SÓ LEITURA): colunas das tabelas que a fixture do professor e o pré-cadastro tocam,
// e a versão de horário viva. Zero escrita.
import { readFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
};
const cols = async (t) => console.log(t, JSON.stringify(await sql(`select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='${t}' order by ordinal_position;`)));
for (const t of ['bfr_teacher_directory', 'bfr_schedule_entries', 'access_requests']) await cols(t);
console.log('\ntabelas de versão de horário:', JSON.stringify(await sql(`select table_name from information_schema.tables where table_schema='public' and table_name ilike '%schedule%version%' or table_schema='public' and table_name ilike '%version%schedule%';`)));
console.log('versões vivas:', JSON.stringify(await sql(`select * from public.bfr_schedule_versions order by 1 desc limit 3;`).catch(e => String(e.message).slice(0, 200))));
console.log('\ncontagens: directory', (await sql('select count(*)::int as n from public.bfr_teacher_directory;'))[0].n,
  'entries', (await sql('select count(*)::int as n from public.bfr_schedule_entries;'))[0].n,
  'access_requests', (await sql('select count(*)::int as n from public.access_requests;'))[0].n);
