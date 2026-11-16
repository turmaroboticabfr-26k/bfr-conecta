// AE-3 — dry-run do DDL das vistas: BEGIN … ROLLBACK, prova escrita_persistida=false.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const APL = `${DIR}/scripts/ae2-vistas-aplicacao-16-11.sql`;
const OUT = `${DIR}/evidence/ae3-vistas-dryrun-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t);
};

const modoQuery = `select c.relname,
  case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
       when c.reloptions::text like '%security_invoker=false%' then 'definer'
       else 'sem-opcao' end as modo
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname='public' and c.relkind='v' and c.relname like 'sports\\_public\\_%' escape '\\'
 order by c.relname`;

const antes = await sql(modoQuery);
const ddl = readFileSync(APL, 'utf8');

const run = await sql(`BEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '60s';\n${ddl}\n${modoQuery};\nROLLBACK;`);

// run devolve as linhas de todas as consultas do lote; as 5 últimas são o modoQuery de dentro da transação
const dentro = run.slice(-5);
const depois = await sql(modoQuery);

const out = {
  em: new Date().toISOString(),
  autorizacao: 'dry-run: DDL dentro de transação com ROLLBACK; nada persiste',
  aplicacao_md5: md5(ddl),
  aplicacao_bytes: readFileSync(APL).length,
  antes,
  dentro_da_transacao: dentro,
  depois_do_rollback: depois,
  escrita_persistida: JSON.stringify(depois) === JSON.stringify(antes) && JSON.stringify(dentro) !== JSON.stringify(antes),
  veredito:
    JSON.stringify(depois) === JSON.stringify(antes) && dentro.every((x) => x.modo === 'invoker')
      ? 'AE3_DRYRUN_VERDE'
      : 'AE3_DRYRUN_VERMELHO',
};
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(out.veredito, '| antes=', antes.map((x) => x.modo).join(','), '| dentro=', dentro.map((x) => x.modo).join(','), '| depois=', depois.map((x) => x.modo).join(','));
if (out.veredito !== 'AE3_DRYRUN_VERDE') process.exit(1);
