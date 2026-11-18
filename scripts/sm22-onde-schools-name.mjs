#!/usr/bin/env node
// SM-22 (peca 17, SOMENTE LEITURA): a peca 16 contou, com fronteira, `schools(name)` = 2 no shell
// servido e `sports_schools(name)` = 2 — ou seja, ha duas chamadas que embedam `schools(name)` sem
// o prefixo `sports_`, o que e exatamente a forma que o PEN-31 deu como fechada na v119. Antes de
// escrever «regressao» ou «nao e regressao`, ha de se responder a duas perguntas com o texto em
// vez de opiniao: (1) de que tabela de origem saem essas duas chamadas? (2) a relacao FK existe em
// pg_catalog? Uma chamada `X?select=schools(name)` so e defeito se nao houver um caminho FK de X a
// `schools`; se houver, e uma consulta valida e o PEN-31 nao e chamado.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-onde-sao-as-2-schools-name-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
const shell = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
if (shell.length < 100000) throw new Error(`ABORTA: shell com ${shell.length} caracteres — nao e o bundle`);

// FIXURA obrigatoria antes de confiar no numero: a mesma regex, aplicada a um texto sintetico com
// as duas formas, tem de contar so a pelada. Sem isto, um 2 pode ser outrasubstring a contar-se.
const FIX = `A?select=schools(name)&B?select=sports_schools(name)&C=schools(name`;
const fx = (FIX.match(/(?<![a-z0-9_])schools\(name\)/g) || []).length;
if (fx !== 1) throw new Error(`ABORTA: a regex de fronteira contou ${fx} no fixture (deveria 1) — o «2» do ar nao e lido`);

const RE = /(?<![a-z0-9_])schools\(name\)/g;
const ocorrencias = [];
let m;
while ((m = RE.exec(shell))) {
  const desde = Math.max(0, m.index - 900);
  const janela = shell.slice(desde, m.index);
  const origens = [...janela.matchAll(/from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/g)].map((x) => x[1]);
  ocorrencias.push({ offset_bytes: Buffer.byteLength(shell.slice(0, m.index), 'utf8'),
    origem_mais_proxima: origens.length ? origens[origens.length - 1] : null,
    origens_na_janela: [...new Set(origens)],
    trecho: shell.slice(Math.max(0, m.index - 120), m.index + 60).replace(/\s+/g, ' ') });
}
const origens = [...new Set(ocorrencias.map((o) => o.origem_mais_proxima).filter(Boolean))];
// (2) o catalogo: existe FK da origem para `schools`? `confrelid`/`attrelid` dao o par exato
const fks = origens.length ? await sql(`select conrelid::regclass::text as de, confrelid::regclass::text as para, conname
  from pg_constraint where contype='f' and confrelid = 'public.schools'::regclass and conrelid::regclass::text in (${origens.map((o) => `'${o}'`).join(',')})
  order by 1`) : [];
const todas = await sql(`select conrelid::regclass::text as de, count(*)::int as fks_para_schools
  from pg_constraint where contype='f' and confrelid = 'public.schools'::regclass group by 1 order by 1`);
// e a existencia da tabela `schools`, ja que o PEN-29 existe justamente porque nomes redondos nao chegam
const existe = await sql(`select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relname='schools' and n.nspname='public'`);

const out = {
  em: new Date().toISOString(),
  metodo: 'GET do shell + fixture da regex + pg_constraint; nenhuma escrita',
  fixture: { texto: FIX, esperado_1: 1, medido: fx },
  contagens: { schools_name_com_fronteira: ocorrencias.length,
    sports_schools_name_com_fronteira: (shell.match(/(?<![a-z0-9_])sports_schools\(name\)/g) || []).length,
    schools_name_por_substring: shell.split('schools(name)').length - 1 },
  ocorrencias, origens,
  fks_das_origens_para_schools: fks,
  fks_para_schools_em_todas_as_tabelas: todas,
  tabela_schools_existe: Number(existe[0].n) === 1,
  leitura: fks.length
    ? `as ${ocorrencias.length} chamadas tem origem em tabela(s) COM FK para public.schools — sao consultas validas, nao o PEN-31`
    : `nenhuma das origens [${origens.join(',')}] tem FK para public.schools — a forma e exatamente a do PEN-31 e a pergunta passa a ser «em que ecrans aparece»`,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`fixture: esperado 1, medido ${fx}`);
console.log(`contagens: ${JSON.stringify(out.contagens)}`);
for (const o of ocorrencias) console.log(`  @${o.offset_bytes}B origem=${o.origem_mais_proxima} | …${o.trecho}`);
console.log(`fks das origens para schools: ${JSON.stringify(fks)}`);
console.log(`tabelas com FK para schools: ${todas.map((x) => `${x.de}=${x.fks_para_schools}`).join(', ') || 'nenhuma'}`);
console.log(out.leitura);
console.log(`\nSM22_ONDE_OK · registo evidence/sm22-onde-sao-as-2-schools-name-18-11.json`);
