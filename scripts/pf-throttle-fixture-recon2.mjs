// Recon ONLY-READ 2: colunas obrigatorias que a fixture ainda nao cobre + colunas do net.
import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 900)}`);
  try { return JSON.parse(t); } catch { return []; }
}

const cobertas = ['student_id', 'profile_id', 'class_id', 'official_name', 'year', 'class_code',
  'shift', 'latitude', 'longitude', 'source', 'enabled'];

const obr = await sql(`
select c.relname as tabela, a.attname as coluna
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
where c.relname in ('classes','students','student_locations','student_location_sharing')
  and a.attnotnull and d.adbin is null
order by c.relname, a.attnum
`);
console.log('obrigatorias:', JSON.stringify(obr.filter(r => !cobertas.includes(r.coluna))));

const netCols = await sql(`
select a.attname as coluna
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'net'
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where c.relname = '_http_response' order by a.attnum
`);
console.log('net._http_response:', JSON.stringify(netCols.map(r => r.coluna)));

const netRows = await sql(`
select id, status_code, error_msg, created,
       (content is not null) as tem_content
from net._http_response order by id
`);
console.log('linhas net:', JSON.stringify(netRows));

const subs = await sql(`
select profile_id::text as p, count(*)::int as n from public.push_subscriptions group by 1 order by 1
`);
console.log('assinaturas por perfil:', JSON.stringify(subs));
