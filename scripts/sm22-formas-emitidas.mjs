#!/usr/bin/env node
// SM-22 (peca 16, SOMENTE LEITURA): distingue «a forma falha» de «o ar emite a forma».
// A peca 5 re-sondou as NOVE formas falhadas do censo da v118 e as nove continuam a falhar — o que
// prova que o catalogo nao mudou, nao que o bundle ainda as emita. A diferenca e material para o
// PEN-31: a query `supervision_requests … schools(name)` foi trocada por `sports_schools(name)` na
// v119, logo a forma PGRST200 permanece falsa no banco mas JA NAO SAI DO AR. Contar as nove como
// «ruinas do ar» re-abriria uma pendencia fechada por publicacao.
// Aqui cada uma das nove formas se procura nos bytes servidos, pela string de embed que a define, e
// o artefacto diz quantas sao emitidas hoje — com a contagem do par `schools(name)`/`sports_schools(name)`
// que e a régua com que o PEN-31 foi fechado.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-formas-emitidas-no-ar-18-11d.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
const shell = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
if (shell.length < 100000) throw new Error(`ABORTA: o shell servido tem ${shell.length} caracteres — nao e o bundle, a contagem seria falsa`);

const censo118 = JSON.parse(readFileSync(join(REPO, 'evidence/fin2a-censo-embeds-v118.json'), 'utf8'));
const ruins = censo118.sonda.ruins;
if (!Array.isArray(ruins) || !ruins.length) throw new Error('ABORTA: o censo da v118 nao traz formas falhadas');
const reProbe = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-formas-pen-18-11.json'), 'utf8')).pen28.formas;

// a «impressao digital» de cada forma e o par (tabela de origem, expressao de embed) que o bundle
// contem literalmente; sem isto, «ainda e emitida» seria uma opiniao sobre o erro do PostgREST
// ATENCAO, e o que a versao anterior desta peca nao via, em dois sentidos:
//  · `schools(name)` e substring de `sports_schools(name)` — contar por substring dava 4 e lia-se
//    «o ar ainda emite a forma do PEN-31», quando o que la esta e so a forma corrigida. O nome
//    pelado exige fronteira: nada de [a-z_] antes.
//  · cinco das nove formas NAO tem embed nenhum (sao tabelas inexistentes e uma coluna em falta);
//    exigir embed para dizer «emitida» manda-as todas para «nao emitida», que e o erro contrario.
const comFronteira = (nome) => new RegExp(`(?<![a-z0-9_])${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
// VINCULO POR CHAMADA: o embed so vale se estiver dentro do `select` da MESMA chamada
// `from('origem')`. A versao anterior procurava o texto no ficheiro inteiro e por isso atribuia ao
// par `supervision_requests → schools(name)` duas ocorrencias que sao, lidas no contexto, de
// `from('classes').select('…schools(name)')` — chamada valida, com FK propria, e nada do PEN-31.
// Dai a extraccao abaixo: recolhe-se o par (origem, select) de cada chamada do bundle.
const CHAMADAS = /from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)(?:\.select\(\s*['"`]([^'"`]*)['"`])?/g;
const chamadas = [];
for (const c of shell.matchAll(CHAMADAS)) chamadas.push({ de: c[1], select: c[2] || '' });
const selectsDaOrigem = (origem) => chamadas.filter((x) => x.de === origem).map((x) => x.select);
const emitidas = ruins.map((r) => {
  const origem = r.de;
  const select = String(r.select || '');
  const embeds = [...new Set((select.match(/[a-z_]+\([^()]*\)/g) || []))];
  const noAr = (shell.match(new RegExp(`from\\(\\s*['"]${origem}['"]\\s*\\)`, 'g')) || []).length;
  const selects = selectsDaOrigem(origem);
  const select_exato_no_ar = selects.filter((s) => s === select).length;
  const embedsNoAr = embeds.map((e) => ({ embed: e,
    em_chamadas_da_mesma_origem: selects.filter((s) => (s.match(comFronteira(e)) || []).length > 0).length,
    no_ficheiro_inteiro_com_fronteira: (shell.match(comFronteira(e)) || []).length }));
  return { de: origem, select_censo_v118: select, code_v118: r.code, tem_embed: embeds.length > 0,
    chamadas_from_no_ar: noAr, select_exato_na_mesma_chamada: select_exato_no_ar,
    embeds: embedsNoAr,
    emitida_no_ar_hoje: embeds.length > 0
      ? embedsNoAr.some((x) => x.em_chamadas_da_mesma_origem > 0)
      : select_exato_no_ar > 0,
    re_sonda_de_hoje: (reProbe.find((f) => f.de === origem && (f.alvo_embed || '') === (embeds[0] || '').replace(/\(.*/, '')) || {}).code || null };
});
// as duas formas contam-se com fronteira, uma ao lado da outra, precisamente porque `schools(name)`
// e substring de `sports_schools(name)`: sem fronteira, os 4 `sports_schools(name)` do ar alimentam
// o contador do nome pelado e o PEN-31 reabre por erro de régua
const reguaPen31 = { sports_schools_name_com_fronteira: (shell.match(comFronteira('sports_schools(name)')) || []).length,
  schools_name_com_fronteira: (shell.match(comFronteira('schools(name)')) || []).length,
  schools_name_por_substring: shell.split('schools(name)').length - 1 };
const ambiguaPen28 = { guardian_students_emitidas: emitidas.filter((e) => e.de === 'guardian_students' && e.emitida_no_ar_hoje).length };

const out = {
  em: new Date().toISOString(),
  metodo: 'GET do shell servido + procura literal da origem e do embed com fronteira; nenhuma escrita; nenhum segredo',
  shell_caracteres: shell.length,
  nove_formas_do_censo_v118: emitidas,
  resumo: { emitidas_no_ar_hoje: emitidas.filter((e) => e.emitida_no_ar_hoje).length,
    nao_emitidas_mas_ainda_falsas_no_catalogo: emitidas.filter((e) => !e.emitida_no_ar_hoje).length,
    re_sonda_de_hoje_coincide_com_a_de_12_11: emitidas.every((e) => !e.re_sonda_de_hoje || e.re_sonda_de_hoje === e.code_v118) },
  regua_do_PEN31_no_ar: reguaPen31,
  contagem_guardian_students_emitida: ambiguaPen28,
  leitura: `das ${emitidas.length} formas falhadas do censo da v118, ${emitidas.filter((e) => e.emitida_no_ar_hoje).length} sao emitidas pelo shell servido hoje; as restantes continuam falsas no catalogo mas ja nao saem do ar`,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const e of emitidas) console.log(`  ${e.de} [${e.code_v118}] from()=${e.chamadas_from_no_ar} select_exato_na_mesma_chamada=${e.select_exato_na_mesma_chamada} embeds=${JSON.stringify(e.embeds)} emitida_hoje=${e.emitida_no_ar_hoje} re_sonda=${e.re_sonda_de_hoje || '-'}`);
console.log(`resumo: ${JSON.stringify(out.resumo)}`);
console.log(`regua PEN-31 no ar: ${JSON.stringify(reguaPen31)}`);
console.log(out.leitura);
console.log(`\nSM22_EMITIDAS_OK · registo evidence/sm22-formas-emitidas-no-ar-18-11d.json`);
