// Sonda somente-leitura: support_requests × perfis ae5. 0 escrita.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5e-rm68-support-fk-16-11.json`;
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
out.support_requests_por_requester = await sql(`
  select requester_id, count(*)::int as n
    from public.support_requests group by requester_id order by n desc;`);
out.ae5_perfis_vivos = await sql(`
  select id, email, role::text from public.profiles where email like 'ae5-%@bfr.test';`);
out.fks_para_profiles = await sql(`
  select tc.table_name, kcu.column_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
   where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
     and kcu.column_name in (select column_name from information_schema.columns
       where table_schema='public' and table_name='profiles' and column_name='id')
     and tc.table_name <> 'profiles'
     and (select 1 from information_schema.constraint_column_usage ccu
           where ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
             and ccu.table_name = 'profiles' and ccu.column_name = 'id') is not null
   order by tc.table_name;`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5E_SUPPORT_FK_ESCRITO');
