import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/.kiro/crew/uploads/';
const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = fs.readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const esp = h => h.split('').join(' ');

async function q(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`HTTP ${r.status} ${t.slice(0, 400)}`);
  try { return JSON.parse(t); } catch { return t; }
}

const cand = fs.readFileSync(DIR + 'pf-throttle-candidate.sql', 'utf8');
const corpoCand = cand.slice(cand.indexOf('CREATE OR REPLACE FUNCTION'), cand.indexOf('\nrevoke all on function')).trimEnd().replace(/;$/, '');

const def = (await q("select pg_get_functiondef('public.bfr_pf_notify_location()'::regprocedure) as t;"))[0].t;

let i = 0;
while (i < Math.min(def.length, corpoCand.length) && def[i] === corpoCand[i]) i++;

const res = {
  quando: new Date().toISOString(),
  igual: def === corpoCand,
  md5_live: md5(def), md5_candidata: md5(corpoCand),
  len_live: def.length, len_candidata: corpoCand.length,
  primeiro_diferente_em: i,
  live_ao_redor: JSON.stringify(def.slice(Math.max(0, i - 60), i + 60)),
  cand_ao_redor: JSON.stringify(corpoCand.slice(Math.max(0, i - 60), i + 60)),
};
console.log('igual?', res.igual, '| idx', res.primeiro_diferente_em);
console.log('live:', res.live_ao_redor);
console.log('cand:', res.cand_ao_redor);
console.log('md5 live      :', esp(res.md5_live));
console.log('md5 candidata :', esp(res.md5_candidata));

const estado = await q(`
select 'funcao' as o, prosecdef::text || ' owner=' || r.rolname || ' acl=' || coalesce(proacl::text,'null') as v
from pg_proc p join pg_roles r on r.oid=p.proowner where p.oid='public.bfr_pf_notify_location()'::regprocedure
union all
select 'gatilho', tgtype::text || ' enabled=' || tgenabled::text from pg_trigger
where tgname='bfr_pf_notify_location' and tgrelid='public.student_locations'::regclass and not tgisinternal
union all
select 'tabela', 'owner=' || r.rolname || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity || ' acl=' || coalesce(c.relacl::text,'null')
from pg_class c join pg_roles r on r.oid=c.relowner where c.oid='public.student_location_notify_throttle'::regclass
union all
select 'policies', (select count(*)::text from pg_policy p where p.polrelid='public.student_location_notify_throttle'::regclass)
union all
select 'constraints', (select string_agg(conname,',' ) from pg_constraint where conrelid='public.student_location_notify_throttle'::regclass)
union all
select 'linhas', (select count(*)::text from public.student_location_notify_throttle)
union all
select 'anon_executa', has_function_privilege('anon','public.bfr_pf_notify_location()','execute')::text
union all
select 'anon_le_tabela', has_table_privilege('anon','public.student_location_notify_throttle','select')::text
union all
select 'authenticated_executa', has_function_privilege('authenticated','public.bfr_pf_notify_location()','execute')::text
order by 1;`);
for (const r of estado) console.log(' ', r.o, '=', r.v);
res.estado = estado;

const cols = await q("select a.attname, format_type(a.atttypid,a.atttypmod) as tipo, a.attnotnull from pg_attribute a where a.attrelid='public.student_location_notify_throttle'::regclass and a.attnum>0 and not a.attisdropped order by a.attnum;");
res.colunas = cols;
console.log('colunas:', JSON.stringify(cols));

fs.writeFileSync(DIR + 'pf-throttle-confere-aplicacao.json', JSON.stringify(res, null, 2) + '\n');
console.log('ARTEFATO pf-throttle-confere-aplicacao.json');
