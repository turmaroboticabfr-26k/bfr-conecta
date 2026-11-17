// Preflight de leitura para `ah2-cliques-fixtura-visivel.mjs`: corre exactamente as consultas SQL das
// fases S0/S1/S6, antes de eu abrir browser ou criar conta, porque a primeira corrida morreu num SQL de
// controle (`pg_policy` não tem `relname`) e perdeu uma sessão de browser inteira por uma vírgula.
// 0 escrita: só SELECT e pg_policies. Tokens só do ficheiro local, nunca no corpo nem no output.
import { readFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const tok = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(60000) });
  const t = await r.text(); if (!r.ok) throw new Error('sql HTTP ' + r.status + ' ' + t.slice(0, 300)); return JSON.parse(t);
};
const EMAIL = `ah2f-rm12-preflight@bfr-conecta.midicao`;
const q = {
  politica: `select policyname as polname, tablename as relname, case when permissive = 'PERMISSIVE' then 'PERMISSIVA' else 'RESTRITIVA' end as tipo, qual as using_ from pg_policies where policyname='profiles_hide_test_accounts';`,
  casa: `select ('${EMAIL}' like '%@bfr-conecta.test') as escondida_test, ('${EMAIL}' like 'bfr.qa.email.%') as escondida_qa;`,
  sem_fissura: `select count(*)::int as n from public.profiles where email like 'ah2f-rm12-%';`,
  profiles_n: `select count(*)::int as n from public.profiles;`,
  auth_n: `select count(*)::int as n from auth.users;`,
  md5_tabela: `select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from public.profiles) x;`,
  md5_papel: `select md5(string_agg(x::text, ',' order by x::text)) as h from (select id, role, full_name from public.profiles) x;`,
  set_profile_role: `select pg_get_function_arguments((oid::regprocedure)::oid) as arg from pg_proc where proname='set_profile_role';`,
};
for (const [k, v] of Object.entries(q)) {
  try { const r = await sql(v); console.log(k + ' = ' + JSON.stringify(r[0] ?? r).slice(0, 300)); }
  catch (e) { console.log(k + ' FALHOU: ' + String(e.message).slice(0, 240)); }
}
