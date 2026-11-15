// AD-2 — recon SOMENTE LEITURA das afirmações de censo do cabeçalho do roadmap-master.md (§18/§20):
//   «176 tabelas, todas com RLS», «15 papéis no enum account_role», «Realtime (75 tabelas
//   publicadas)», «848 alunos (censo vivo)».
// Nada aqui foi re-contado desde 08/11; este script mede e escreve o veredito em artefacto novo.
// 0 escrita, 0 DDL, 0 mint, 0 deploy, 0 push. A não-escrita prova-se por pegada de catálogo
// (total + md5 das relações de `public` ordenadas) antes e depois.
// Artefacto: argv[1] ou evidence/ad2-censo-afirmacoes-15-11.json  (existe => exit 1, não sobreponho)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SAIDA = process.argv[2] || `${DIR}/evidence/ad2-censo-afirmacoes-15-11.json`;

if (existsSync(SAIDA)) {
  console.log(`VERMELHO  já existe ${SAIDA} — artefactos não se sobrepõem; rebatize (b/c).`);
  process.exit(1);
}

const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

// A API de gestão devolve 500 «Failed to check user auth status» de forma intermitente (medido
// 15/11). Estas consultas são leituras idempotentes, por isso o retry só casa nessa mensagem.
const sql = async (query, tentativas = 6) => {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 300)}`;
    if (!/Failed to check user auth status/.test(t)) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error(`sql esgotou as tentativas — ${ultimo}`);
};

const md5 = (s) => createHash('md5').update(s).digest('hex');

// Pegada de catálogo: só o identificador das relações, nunca linhas de dado.
const PEGADA = `select c.relname, c.relkind::text as tipo from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','v','p','m','f')
  order by c.relname`;

const footprint = async () => {
  const rows = await sql(PEGADA);
  return { total: rows.length, hash: md5(rows.map((x) => `${x.relname}:${x.tipo}`).join('|')) };
};

const antes = await footprint();

const porTipo = await sql(`select c.relkind::text as tipo, count(*)::int as n
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','v','p','m','f')
  group by 1 order by 1`);

// «todas com RLS»: tabelas comuns (r) e particionadas (p) com relrowsecurity = true.
const rls = await sql(`select count(*)::int as tabelas,
    count(*) filter (where c.relrowsecurity)::int as com_rls,
    count(*) filter (where c.relforcerowsecurity)::int as com_force
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p')`);

const semRls = await sql(`select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity
  order by 1`);

const enums = await sql(`select t.typname, array_agg(e.enumlabel order by e.enumsortorder)::text[] as labels
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  where t.typname in ('account_role','role') group by 1 order by 1`);

const realtime = await sql(`select count(distinct tablename)::int as n
  from pg_publication_tables where pubname = 'supabase_realtime'`);

const realtimeNomes = await sql(`select distinct tablename from pg_publication_tables
  where pubname = 'supabase_realtime' order by 1`);

// O censo de alunos do cabeçalho — contagem apenas, nunca nomes.
let alunos = { erro: 'sem consulta' };
try {
  alunos = (await sql(`select count(*)::int as n from public.students`))[0];
} catch (e) {
  alunos = { erro: String(e.message).slice(0, 120) };
}

const depois = await footprint();

const labels = enums.find((x) => x.typname === 'account_role')?.labels || [];
const medido = {
  relacoes_public: Object.fromEntries(porTipo.map((x) => [x.tipo, x.n])),
  rls: rls[0],
  tabelas_sem_rls: semRls.map((x) => x.relname),
  account_role_n: labels.length,
  account_role_labels: labels,
  realtime_publicadas: realtime[0].n,
  realtime_nomes: realtimeNomes.map((x) => x.tablename),
  students: alunos,
};

const asserir = (campo, afirmado, actual) => ({
  campo,
  afirmado_no_roadmap: afirmado,
  medido_agora: actual,
  bate: String(afirmado) === String(actual),
});

const veredito = [
  asserir('tabelas_comuns_r', 176, (medido.relacoes_public.r ?? 0) + (medido.relacoes_public.p ?? 0)),
  asserir('relacoes_public', 182, depois.total),
  asserir('todas_com_rls', true, medido.tabelas_sem_rls.length === 0),
  asserir('papéis_account_role', 15, medido.account_role_n),
  asserir('realtime_publicadas', 75, medido.realtime_publicadas),
  asserir('alunos', 848, medido.students.n ?? null),
];

const saida = {
  em: new Date().toISOString(),
  tarefa: 'AD-2/§AC — re-contar as afirmações de censo do cabeçalho do roadmap-master.md',
  autorizacao: 'somente leitura: 0 DDL, 0 mint, 0 deploy, 0 escrita',
  pegada_antes: antes,
  pegada_depois: depois,
  nao_escrita_prova: antes.total === depois.total && antes.hash === depois.hash,
  medido,
  veredito,
  falhas: veredito.filter((v) => !v.bate).map((v) => `${v.campo}: afirmado ${v.afirmado_no_roadmap} / medido ${v.medido_agora}`),
};

writeFileSync(SAIDA, JSON.stringify(saida, null, 1) + '\n');
console.log(`pegada ${antes.total}/${antes.hash.slice(0, 12)} -> ${depois.total}/${depois.hash.slice(0, 12)}  nao_escrita=${saida.nao_escrita_prova}`);
for (const v of veredito) console.log(`${v.bate ? 'VERDE  ' : 'VELHO  '} ${v.campo}: roadmap=${v.afirmado_no_roadmap} medido=${v.medido_agora}`);
console.log(`sem_rls=${medido.tabelas_sem_rls.length} realtime=${medido.realtime_publicadas} account_role=${medido.account_role_n} students=${JSON.stringify(medido.students)}`);
console.log(saida.falhas.length ? `AD2_COM_DECLARACOES_VELHAS ${saida.falhas.length}` : 'AD2_CENSO_BATE_TUDO');
console.log(`gravado em ${SAIDA}`);
