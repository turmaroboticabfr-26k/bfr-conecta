#!/usr/bin/env node
// SM-22 (peca 14, SOMENTE LEITURA, ZERO ESCRITA): a peca 2 contou `pen29` com tres marcadores de
// texto — shift_settings=1, calendar_days=3, month_targets=1 — contra os «0/0/0» da tranche sm10.
// Uma contagem de texto nao diz O QUE existe no catalog: `month_targets`, por exemplo, pode casar
// dentro de `bfr_month_targets_por_aluno`. Este script nao tenta adivinhar o nome: lista as tabelas
// do esquema public por semelhanca com cada termo, com a contagem de linhas, e depois procura em que
// contexto cada termo aparece no bundle (declaracao de tipo? rota? string de UI?). So depois disto e
// que a linha PEN-29 do roadmap pode levar nomes em vez de termos.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-nomes-tabelas-pen29-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const TERMOS = ['shift_settings', 'calendar_days', 'month_targets'];
// os termos vao como LITERAL SQL entre aspas: escrito nu, `|| shift_settings ||` seria uma
// referencia a uma coluna com esse nome e a consulta rebentava (ou, pior, casava outra coisa).
// As tres strings sao constantes deste ficheiro, nao entrada externa.
const pareadas = {};
for (const t of TERMOS) {
  pareadas[t] = await sql(`select c.relname as nome, n.nspname as esquema, c.reltuples::bigint as estimativa_pg_class
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r' and n.nspname = 'public' and c.relname like '%' || '${t}' || '%'
    order by c.relname`);
}
// contagem real (nao estimativa) so das tabelas que apareceram, para o artefacto nao levar
// `reltuples` como se fosse `count(*)` — reltuples vale -1 em tabelas nunca analisadas.
const nomes = [...new Set(Object.values(pareadas).flat().map((x) => x.nome))];
if (nomes.some((n) => !/^[a-z_][a-z0-9_]*$/.test(n))) throw new Error('ABORTA: um nome de tabela do catalog nao cabe no padrao de identificador — a contagem nao se interpolada às cegas');
const contagens = {};
for (const nome of nomes) {
  const r = await sql(`select count(*)::bigint as n from public.${nome}`);
  contagens[nome] = Number(r[0].n);
}
// RLS e dono, porque a pergunta do roadmap e de acesso, nao apenas de existencia
const metas = nomes.length ? await sql(`select c.relname as nome, c.relowner::regrole::text as dono, c.relrowsecurity as rls_on, c.relforcerowsecurity as rls_forcado
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind='r' and n.nspname='public' and c.relname in (${nomes.map((x) => `'${x}'`).join(',')}) order by 1`) : [];

// onde e que os termos aparecem no bundle, com o texto em volta, para se poder ler a natureza do uso
const t = readFileSync(join(REPO, 'bfr-candidata-v134-sidebar-escondida/index.html'), 'utf8');
const contexto = {};
for (const termo of TERMOS) {
  const oc = [...t.matchAll(new RegExp(termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))].map((m) => ({
    offset_bytes: Buffer.byteLength(t.slice(0, m.index), 'utf8'),
    trecho: t.slice(Math.max(0, m.index - 70), m.index + 70).replace(/\s+/g, ' '),
  }));
  contexto[termo] = { ocorrencias: oc.length, trechos: oc.slice(0, 6) };
}
// contraprova: os tres nomes que a tranche sm10 deu como fantasmas tem de continuar a dar zero,
// senao o «0/0/0» de 16/11 e que estava certo e a leitura de hoje e que esta errada
const fantasmas = {};
for (const nome of ['shift_settings', 'calendar_days', 'month_targets']) {
  const r = await sql(`select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relname = '${nome}' and n.nspname='public'`);
  fantasmas[nome] = { com_esse_nome_exato: Number(r[0].n) };
}

const out = {
  em: new Date().toISOString(),
  metodo: 'SELECTs de pg_catalog + count(*) por tabela + leitura do bundle local; zero escrita; zero rede publica',
  termos: TERMOS,
  pareadas_por_semelhanca: pareadas,
  contagens_reais: contagens,
  dono_e_rls: metas,
  contexto_no_bundle_v134: contexto,
  nomes_exatos: fantasmas,
  leitura: nomes.length
    ? `existem ${nomes.length} tabela(s) publicas cujo nome contem um dos termos; o «0/0/0» de 16/11 referia-se aos nomes EXATOS`
    : 'nenhuma tabela publica contem nenhum dos tres termos — os contadores da peca 2 casavam em texto que nao e nome de tabela',
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const [termo, lista] of Object.entries(pareadas)) console.log(`  ${termo}: [${lista.map((x) => `${x.nome}=${contagens[x.nome]}`).join(', ') || 'nenhuma'}]`);
console.log(`nomes exatos: ${JSON.stringify(fantasmas)}`);
console.log(`dono/rls: ${JSON.stringify(metas)}`);
for (const [termo, c] of Object.entries(contexto)) console.log(`  bundle ${termo}: ${c.ocorrencias} ocorrencias${c.trechos[0] ? ' | ex.: ' + JSON.stringify(c.trechos[0].trecho).slice(0, 190) : ''}`);
console.log(out.leitura);
console.log(`\nSM22_NOMES_OK · registo evidence/sm22-nomes-tabelas-pen29-18-11.json`);
