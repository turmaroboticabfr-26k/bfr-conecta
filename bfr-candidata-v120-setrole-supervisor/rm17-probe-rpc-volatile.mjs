// #1160 RM-1.7 — sondagem read-only: os POST /rpc/ que a bancada bloqueou sao funcoes de leitura?
import { readFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const tok = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const q = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { status: r.status, body: await r.text() };
};
const nomes = ['list_current_month_birthdays', 'bfr_list_staff_birthdays'];
for (const n of nomes) {
  const r = await q(`select p.proname, p.provolatile, pg_get_function_result(p.oid) as ret, pg_get_functiondef(p.oid) like '%insert into%' as tem_insert, pg_get_functiondef(p.oid) like '%update %' as tem_update, pg_get_functiondef(p.oid) like '%delete from%' as tem_delete from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='${n}' order by 1`);
  console.log(n, r.status, r.body.slice(0, 400));
}
