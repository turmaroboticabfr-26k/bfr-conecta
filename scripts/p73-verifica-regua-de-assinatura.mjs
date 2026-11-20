#!/usr/bin/env node
// P73-VERIFICA-REGUA-DE-ASSINATURA — 0 HTTP, 0 banco. Existe porque uma agulha de assinatura que nao pode
// dar verdadeira nao e uma prova: em 20/11 a PEN-38 foi aplicada por completo e a conferencia de saida disse
// o contrario, porque a agulha era uma lista de tipos e este servidor devolve os argumentos com os nomes dos
// parametros. Aqui fixturem-se os dois sentidos da regua nova e mostra-se, calculado e nao afirmado, que a
// regua velha nao tinha positivo possivel.
// Uso: node scripts/p73-verifica-regua-de-assinatura.mjs     (P73_SUF=<rotulo> para nao por cima do anterior)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assinaturaCorresponde, tiposDaAssinatura, tiposDeCreateFunction } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-verifica-regua-de-assinatura-20-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, nao por cima');
const t0 = Date.now();

const cand = readFileSync(join(REPO, 'scripts/p73-pen38-ddl-candidata.sql'), 'utf8');
const sm4 = readFileSync(join(REPO, 'scripts/sm4-ddl-municipal-candidata.sql'), 'utf8');
const AG = {
  set: tiposDeCreateFunction(cand, 'bfr_school_set_municipality'),
  diag: tiposDeCreateFunction(cand, 'bfr_municipal_scope_diagnostico'),
  escopo: tiposDeCreateFunction(sm4, 'bfr_school_in_municipal_scope'),
};
for (const [nome, v] of Object.entries(AG)) {
  if (!v) throw new Error('ABORTA: ' + nome + ' nao tem CREATE FUNCTION legivel nos dois ficheiros certificados.');
}
const reguaAntiga = (agulhaTexto, lido) => new RegExp(agulhaTexto, 'i').test(String(lido).replace(/\s+/g, ' '));

const ASS_NOMES = 'p_school uuid, p_municipality uuid, p_reason text';
const ASS_TIPOS = 'uuid, uuid, text';
const casos = [
  ['a_regua_nova_casa_o_que_a_build_devolve_com_nomes', AG.set, ASS_NOMES, true],
  ['a_regua_nova_casa_a_forma_so_com_tipos', AG.set, ASS_TIPOS, true],
  ['a_regua_nova_chumba_um_tipo_trocado', AG.set, 'p_school uuid, p_municipality uuid, p_reason boolean', false],
  ['a_regua_nova_chumba_uma_aridade_diferente', AG.set, 'p_school uuid, p_municipality uuid', false],
  ['a_regua_nova_chumba_um_parametro_com_default', AG.set, 'p_school uuid, p_municipality uuid, p_reason text default null', false],
  ['a_agulha_vazia_pedida_a_funcao_de_zero_argumentos_bate', AG.diag, '', true],
  ['a_agulha_vazia_pedida_a_funcao_de_zero_argumentos_chumba_quando_ha_argumentos', AG.diag, 'p_qualquer uuid', false],
  ['a_agulha_de_um_tipo_bate_a_funcao_de_um_argumento', AG.escopo, 'p_school uuid', true],
  ['a_agulha_de_um_tipo_chumba_a_funcao_de_tres_argumentos', AG.escopo, ASS_NOMES, false],
  ['sem_agulha_o_nome_basta', null, ASS_NOMES, true],
  ['tipo_de_duas_palavras_bate_com_nomes', ['character varying'], 'p_note character varying', true],
  ['tipo_de_duas_palavras_bate_so_com_tipos', ['character varying'], 'character varying', true],
  ['tipo_de_duas_palavras_chumba_uma_palavra_sozinha', ['character varying'], 'p_note varchar', false],
];
const falhas = [];
const portoes = casos.map(([nome, agulha, lido, esperado]) => {
  const obtido = assinaturaCorresponde(agulha, lido);
  const verde = obtido === esperado;
  if (!verde) falhas.push(nome);
  return { nome, esperado, obtido, verde };
});
const nVerdes = casos.filter(([, a, l, e]) => assinaturaCorresponde(a, l) === e).length;
const nFalsos = casos.filter(([, a, l, e]) => e === false).length;
const prova_de_que_a_regua_velha_nao_tinha_positivo = {
  agulha: ASS_TIPOS,
  lido_devolvido_pela_build: ASS_NOMES,
  regua_velha_casava: reguaAntiga(ASS_TIPOS, ASS_NOMES),
  regua_nova_casa: assinaturaCorresponde(AG.set, ASS_NOMES),
  nota: 'com a regua velha o portao rpc_de_etiquetagem_la estava calculado por baixo e o modo candidata, que o nega, estava verde sem poder jamais ficar vermelho — as duas direcoes mortas.',
};

const out = {
  programa: 'scripts/p73-verifica-regua-de-assinatura.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  agulhas_derivadas_dos_ficheiros: AG,
  casos_medidos: portoes.length, casos_com_esperado_falso: nFalsos, verdes: nVerdes,
  portoes, falhas,
  prova_de_que_a_regua_velha_nao_tinha_positivo,
  o_que_este_verde_nao_autoriza: 'nada autoriza. Prova que a regua de assinatura tem positivos e negativos; o estado vivo de quem e medido pelo preflight.',
};
out.veredito = falhas.length === 0 ? `P73_REGUA_ASSINATURA_VERDE ${portoes.length}/0` : `P73_REGUA_ASSINATURA_VERMELHO_${falhas.length}`;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`P73_REGUA_ASSINATURA_VERMELHO · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`agulhas ${JSON.stringify(AG)}`);
console.log(`regua velha sobre o que a build devolve: casava=${prova_de_que_a_regua_velha_nao_tinha_positivo.regua_velha_casava} · regua nova: casava=${prova_de_que_a_regua_velha_nao_tinha_positivo.regua_nova_casa}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'} (esperado ${p.esperado}, obtido ${p.obtido})`);
console.log(`${out.veredito} · ${out.casos_com_esperado_falso} negativos em ${casos.length} · ${out.duracao_ms} ms · registo ${OUT}`);
