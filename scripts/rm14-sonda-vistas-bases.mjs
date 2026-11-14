// RM-1.4 — por que as 5 sports_public_* devolvem 0? Definicao da view + contagem da base. So-leitura.
import { readFileSync } from 'node:fs';
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text(); if (!r.ok) return { __erro: t.slice(0, 300).replace(/\s+/g, ' ') };
  return JSON.parse(t);
};
for (const v of ['sports_public_athletes','sports_public_match_events','sports_public_matches','sports_public_schools','sports_public_teams']) {
  const d = await sql(`select pg_get_viewdef('${v}'::regclass, true) as def`);
  console.log(`--- ${v}\n${String(d.__erro || (Array.isArray(d) ? d[0].def : d)).slice(0, 700)}`);
}
const bases = await sql(`
select c.relname as base, c.reltuples::bigint::text as Estimativa,
       (select count(*) from pg_depend dd where dd.refobjid=c.oid and dd.classid='pg_rewrite'::regclass) as refs
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relname like 'sports_%' order by 1`);
console.log('\n--- bases sports_* (reltuples ~= -1 significa nunca analisada)');
for (const b of (Array.isArray(bases) ? bases : [bases])) console.log(`   ${b.base} reltuples=${b.Estimativa}`);
