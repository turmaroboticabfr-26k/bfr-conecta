// Doze varreduras deram «404 /rest/v1/bfr_school_calendar_days» e «…bfr_school_shift_settings» no portão de
// rede. 404 no PostgREST tem duas leituras possíveis — a relação não existe, ou existe mas não está exposta
// no schema cache — e a correção é diferente para cada uma. Este censo lê o dicionário do banco e diz qual
// é, mais o que existe à volta (família bfr_school*) para a candidata não reinventar nomes.
// Só SELECT em information_schema/pg_catalog: nenhuma escrita, nenhum DDL.
// PAT em ficheiro próprio (nunca na linha de comandos). Uso: node scripts/ah2-sonda-tabelas.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const REF = 'yyzqoxlkcvqpessypfjo';
const OUT = `${DIR}/evidence/ah2-sonda-tabelas-17-11.json`;
if (existsSync(OUT) && !process.argv.includes('--force')) throw new Error('ABORTA: ' + OUT + ' existe — use --force');
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const q = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  if (!r.ok || !j) throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 200));
  return j;
};

const ALVOS = ['bfr_school_calendar_days', 'bfr_school_shift_settings'];

const existentes = await q(
  `select table_schema, table_name, table_type from information_schema.tables
   where table_name in ('${ALVOS.join("','")}') order by table_schema, table_name`,
);
const familia = await q(
  `select table_schema, table_name, table_type from information_schema.tables
   where table_name like 'bfr_school%' or table_name like '%calendar%' or table_name like '%shift%'
   order by table_schema, table_name`,
);
// Colunas das duas tabelas-alvo, se existirem: a app pede colunas nomeadas, e um 404 pode ser só o
// select de uma coluna inexistente a subir como «relação não resolvida» nalgumas versões do PostgREST.
const cols = existentes.length
  ? await q(
      `select table_schema, table_name, column_name, data_type from information_schema.columns
       where table_name in ('${ALVOS.join("','")}') order by table_name, ordinal_position`,
    )
  : [];
// O que o PostgREST efectivamente expõe: um nome existe em information_schema mas fica fora do
// `db_config.exposed_schemas` se o schema não estiver na lista do pooler/API.
const expostos = await q(
  `select n.nspname as schema, count(c.oid) as relacoes
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r','v','p','m') and n.nspname not in ('pg_catalog','information_schema','extensions','graphql','graphql_public','net','pnpg','realtime','storage','supabase_functions','supabase_migrations','vault','pgbouncer','auth','pgmq')
   group by 1 order by 2 desc`,
).catch((e) => ({ erro: String(e.message).slice(0, 200) }));

const out = {
  ciclo: 'AH-2-TABELAS',
  em: new Date().toISOString(),
  alvos: ALVOS,
  encontrados: existentes,
  em_falta: ALVOS.filter((t) => !existentes.some((e) => e.table_name === t)),
  familia: familias_sem_ruido(familia),
  colunas: cols,
  esquemas_com_relacoes: expostos,
};
function familias_sem_ruido(rows) {
  return rows.filter((r) => !/^pg_/i.test(r.table_name));
}
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log('encontrados=' + out.encontrados.length + ' em_falta=' + out.em_falta.join(',') );
for (const r of out.encontrados) console.log('  EXISTE ' + r.table_schema + '.' + r.table_name + ' (' + r.table_type + ')');
for (const r of out.familia.slice(0, 40)) console.log('  famil ' + r.table_schema + '.' + r.table_name);
console.log('OUT ' + OUT);
