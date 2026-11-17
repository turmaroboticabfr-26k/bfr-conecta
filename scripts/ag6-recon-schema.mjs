// AG-6 recon (SÓ LEITURA): rótulos do enum, colunas de vínculo professor↔turma, e o que as
// funções teacher* consultam. Zero escrita, zero mint.
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
console.log('enum:', (await sql("select enum_range(null::account_role)::text as v;"))[0].v);
console.log('\nclasses cols:', JSON.stringify((await sql("select column_name, data_type from information_schema.columns where table_schema='public' and table_name='classes' order by 1;"))));
console.log('\nstaff_schools cols:', JSON.stringify((await sql("select column_name, data_type from information_schema.columns where table_schema='public' and table_name='staff_schools' order by 1;"))));
console.log('\ntabelas com coluna *profile* que parecem vínculo de docência:');
console.log(JSON.stringify(await sql("select table_name, column_name from information_schema.columns where table_schema='public' and data_type='uuid' and (column_name ilike '%teacher%' or column_name ilike '%professor%' or column_name ilike '%educator%') order by 1;")));
console.log('\npaper/role distintos em staff_schools:', JSON.stringify(await sql("select role::text as r, count(*)::int as n from public.staff_schools group by 1 order by 2 desc;")));
