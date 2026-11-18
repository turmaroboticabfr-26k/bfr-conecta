#!/usr/bin/env node
// SM-22 (peca 10, SOMENTE LEITURA): confessa e corrige um defeito de instrumento da peca 1.
// A funcao `classif()` da peca 1 assume que todo o marcador e a assinatura de um DEFEITO: `ar>0`
// valia «CONTINUA_NO_AR». Tres dos marcadores nao foram escritos nessa polaridade —
// `pen32_setrole_conhece_supervisor` e `pen33_accountLabels_com_chave_supervisor` descrevem a CORRECAO
// (o papel citado, a chave no mapa), e `pen26_registro_sw_v4` procurava `register('/sw-v4.js'`
// com aspas, forma que o bundle nao usa (la e template literal `${APP_ORIGIN}/sw-v4.js?v=45`).
// Resultado: a peca 1 emitiu vereditos de defeito sobre marcadores de correcao e «SONDA_CEGA» sobre
// um registo de SW que existe. Aqui cada marcador declara a sua polaridade, mas a polaridade so nao
// chega: um veredito de fecho so se escreve se a regua tomar VALORES DIFERENTES entre o corpus anterior
// e o actual. Os seis marcadores que nao discriminam dao `NAO_PROBATARIO_POR_ESTA_REGUA` e apontam para
// a peca que de facto fecha (11 para o SW servido, 12/13 para a escada de geracoes), em vez de
// «CORRIGIDO_NO_AR (1 no ar)», que era a afirmacao que a peca 9 herdava.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-polaridade-18-11f.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);
const md5 = (b) => createHash('md5').update(b).digest('hex');

const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
const shellBuf = Buffer.from(await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).arrayBuffer());
const ar = shellBuf.toString('utf8');
// DUAS bases locais, papeis diferentes: `v133` e o que ja traz as correcoes de PEN-32/33; `v119`
// e anterior a v120/v121, portanto serve de fixture negativo — um marcador de CORRECAO que nao der
// zero na v119 esta a contar qualquer coisa e nao a correcao. A existencia de ambos e verificada
// antes de ler: um caminho gralha daria uma base vazia e um falso «REGRESSAO» em tudo.
const BASES = { v133: 'bfr-candidata-v133-secretaria-municipal/index.html', v119: 'bfr-candidata-v119-supervisao-embed/index.html' };
for (const [p, d] of Object.entries(BASES)) if (!existsSync(join(REPO, d))) throw new Error(`ABORTA: base ${p} ausente em ${d} — a comparacao de polaridade nao pode ser feita com uma das pontas vazia`);
const base = readFileSync(join(REPO, BASES.v133), 'utf8');
const velho = readFileSync(join(REPO, BASES.v119), 'utf8');

// polaridade declarada por marcador: DEFEITO = contar significa continuar; CORRECAO = contar significa fechado
const MARCADORES = [
  { nome: 'pen32_setrole_conhece_supervisor', polaridade: 'CORRECAO', re: /setRole[\s\S]{0,4000}?education_supervisor/ },
  { nome: 'pen33_accountLabels_com_chave_supervisor', polaridade: 'CORRECAO', re: /accountLabels[\s\S]{0,2000}?education_supervisor/ },
  { nome: 'pen33_responsavel_como_rotulo_unico', polaridade: 'DEFEITO', re: /accountLabels\[[^\]]*\]\s*\|\|\s*accountLabels\.parent/g },
  { nome: 'pen26_registro_sw_em_template', polaridade: 'CORRECAO', re: /serviceWorker\.register\(\s*`[^`]*\/sw-v4\.js/g },
  { nome: 'pen26_registro_sw_com_aspas_da_peca1', polaridade: 'CONTROLE_DA_CEGUEIRA', re: /serviceWorker\.register\(['"]\/sw-v4\.js/g },
  { nome: 'pen26_sw_tem_ouvinte_push', polaridade: 'CORRECAO', re: /addEventListener\(['"]push/g },
  { nome: 'pen19_navButton_no_corpo_do_intervalo', polaridade: 'DEFEITO', re: /setInterval\([\s\S]{0,160}?navButton[\s\S]{0,160}?,\s*1200\s*\)/g },
];
const med = MARCADORES.map(({ nome, polaridade, re }) => {
  const noAr = (ar.match(re) || []).length;
  const naBase = (base.match(re) || []).length;
  const noVelho = (velho.match(re) || []).length;
  let veredito;
  if (polaridade === 'CONTROLE_DA_CEGUEIRA') veredito = `a regex da peca 1 da v134=${noAr} e v133=${naBase} e v119=${noVelho} — zero nos tres confirma a cegueira, nao a ausencia do registo`;
  else if (polaridade === 'DEFEITO') veredito = noAr === noVelho
    ? `NAO_PROBATARIO_POR_ESTA_REGUA (${noAr} no ar e ${noVelho} na v119: a regua nao muda entre o corpus antes e depois)`
    : noAr > 0 ? `CONTINUA (${noAr} no ar, ${noVelho} na v119)` : `CORRIGIDO_NO_AR (0 no ar, ${noVelho} na v119)`;
  else veredito = noAr === noVelho
    ? `NAO_PROBATARIO_POR_ESTA_REGUA (${noAr} no ar e ${noVelho} na v119: contar o mesmo nos dois corpus nao prova correcao alguma)`
    : noAr > 0 ? `FECHO_PROVADO_POR_REGUA (${noAr} no ar, ${noVelho} na v119)` : naBase > 0 ? 'REGRESSAO (so na base)' : 'SONDA_CEGA_INDETERMINADA';
  // `discrimina` e o que a peca 1 nao media: o marcador tem de tomar valores DIFERENTES no lado
  // corrigido e no lado anterior a correcao. Sem diferenca, o veredito e uma frase sobre a regex.
  return { nome, polaridade, no_ar: noAr, na_base_v133: naBase, na_base_v119: noVelho,
    discrimina: noAr !== noVelho, poder_de_fogo: noAr > 0 || naBase > 0 || noVelho > 0, veredito };
});

const out = {
  em: new Date().toISOString(),
  metodo: 'GET do shell + duas bases locais; nenhuma escrita; polaridade declarada por marcador antes de qualquer veredito',
  identidade: { ar_md5: md5(shellBuf), ar_bytes: shellBuf.length, base_v133_md5: md5(Buffer.from(base)), base_v119_md5: md5(Buffer.from(velho)) },
  defeito_confessado: 'a peca 1 nao declarava polaridade: treatava todo o marcador como assinatura de defeito',
  marcadores: med,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`ar=${out.identidade.ar_md5} bytes=${out.identidade.ar_bytes} v133=${out.identidade.base_v133_md5} v119=${out.identidade.base_v119_md5}`);
for (const m of med) console.log(`  ${m.nome} [${m.polaridade}]: ar=${m.no_ar} v133=${m.na_base_v133} v119=${m.na_base_v119} discrimina=${m.discrimina ? 'sim' : 'NAO'} → ${m.veredito}`);
console.log(`\nSM22_POLARIDADE_OK · registo evidence/sm22-varre-polaridade-18-11f.json`);
