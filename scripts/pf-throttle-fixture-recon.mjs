// Recon ONLY-READ da fixture do throttle: o que e obrigatorio criar para escrever
// uma posicao sem depender de conta de auth (o gatilho dispara em qualquer escrita).
import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 400)}`);
  try { return JSON.parse(t); } catch { return []; }
}

const cols = await sql(`
select c.relname as tabela, a.attname as coluna,
       (a.attnotnull and d.adbin is null) as exige_valor,
       pg_get_expr(d.adbin, d.adrelid) as default
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
where c.relname in ('students','classes','student_locations','student_location_sharing','guardian_students')
  and a.attname in ('id','official_name','name','class_id','student_profile_id','year','class_code','shift',
                    'student_id','profile_id','latitude','longitude','source','reported_at','accuracy_m',
                    'reported_by_profile_id','enabled','precision_level','relationship')
order by c.relname, a.attname
`);

const fks = await sql(`
select c.relname as tabela, con.conname, pg_get_constraintdef(con.oid) as def
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where c.relname in ('students','student_locations','student_location_sharing','guardian_students')
  and con.contype = 'f'
order by c.relname, con.conname
`);

const contas = await sql(`
select 'profiles' as t, count(*)::int as n from public.profiles
union all select 'auth.users', count(*)::int from auth.users
union all select 'students', count(*)::int from public.students
union all select 'classes', count(*)::int from public.classes
union all select 'guardian_students', count(*)::int from public.guardian_students
union all select 'sharing', count(*)::int from public.student_location_sharing
union all select 'locations', count(*)::int from public.student_locations
union all select 'report_throttle', count(*)::int from public.student_location_report_throttle
union all select 'notify_throttle', count(*)::int from public.student_location_notify_throttle
union all select 'net_response', count(*)::int from net._http_response
`);

const alvo = await sql(`
select p.id::text as profile_id, p.role, p.full_name is not null as tem_nome,
       (select count(*)::int from public.push_subscriptions s
         where s.profile_id = p.id) as assinaturas
from public.profiles p
where p.id = '19bc8c0e-5b1c-4e73-a765-80ea58911315'
`);

console.log('cols:', JSON.stringify(cols));
console.log('fks:', JSON.stringify(fks, null, 1));
console.log('contas:', JSON.stringify(contas));
console.log('alvo:', JSON.stringify(alvo));
