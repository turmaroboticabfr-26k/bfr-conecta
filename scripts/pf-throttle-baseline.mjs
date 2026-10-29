// Baseline PRE-ciclo THROTTLE: contagem E md5 das tabelas tocadas pelo ensaio.
// Somente leitura. Artefato: pf-throttle-baseline.json
import { readFileSync, writeFileSync } from 'node:fs';

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

// Metodo da casa (pf-e-baseline.mjs): md5(string_agg(x::text,'|' order by x::text)).
const TABELAS = ['classes', 'students', 'guardian_students', 'student_location_sharing',
  'student_locations', 'student_location_report_throttle', 'student_location_notify_throttle'];

const base = await sql(`
select * from (
  ${TABELAS.map(t => `
  select 'public.${t}' as tabela,
         (select count(*)::int from public.${t}) as linhas,
         (select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.${t} x) as md5
  `).join(' union all ')}
  union all
  select 'net._http_response',
         (select count(*)::int from net._http_response),
         (select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from net._http_response x)
  union all
  select 'vault.secrets',
         (select count(*)::int from vault.secrets),
         (select md5(coalesce(string_agg(x.id::text, '|' order by x.id::text), '')) from vault.secrets x)
  union all
  select 'auth.users', (select count(*)::int from auth.users), '(somente contagem)'
  union all
  select 'public.profiles', (select count(*)::int from public.profiles),
         (select md5(coalesce(string_agg(x.id::text, '|' order by x.id::text), '')) from public.profiles x)
  union all
  select 'public.push_subscriptions', (select count(*)::int from public.push_subscriptions),
         '(somente contagem: linha do aparelho-alvo fica viva de proposito)'
) x order by tabela
`);

const catalogo = await sql(`
select 'trigger' as tipo, tgname as nome, tgtype::text || '/' || tgenabled::text as detalhe
from pg_trigger
where tgrelid = 'public.student_locations'::regclass and not tgisinternal
union all
select 'funcao', 'bfr_pf_notify_location',
       md5(pg_get_functiondef('public.bfr_pf_notify_location()'::regprocedure))
union all
select 'tabela_throttle', 'student_location_notify_throttle',
       coalesce(to_regclass('public.student_location_notify_throttle')::text, 'ausente')
order by tipo, nome
`);

const out = { quando: new Date().toISOString(), somente_leitura: true, base, catalogo };
writeFileSync('pf-throttle-baseline.json', JSON.stringify(out, null, 2) + '\n');
for (const r of base) console.log(`${r.tabela}: ${r.linhas} · md5 ${r.md5}`);
console.log('catalogo:', JSON.stringify(catalogo));
console.log('ARTEFATO pf-throttle-baseline.json gravado');
