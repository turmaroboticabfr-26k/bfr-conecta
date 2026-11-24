#!/usr/bin/env node
// P154 — REMENDO DA v144: AS 13 REFERÊNCIAS VISÍVEIS QUE A PASSAGEM DELIMITADA NÃO APANHOU (24/11).
//
// A prova local (p153) mediu 13 ocorrências visíveis na v144 certificada:
//   (a) 10× «UNIESCO Conecta.» — o RE2 composto exigia lookahead de não-ponto, e «Conecta» seguido de ponto
//       final de frase ficou de fora; a fase simples trocou o «BFR» sozinho e o «Conecta.» sobrou;
//   (b) 2× prefixo do protocolo do comunicado da secretaria (`BFR-${...}`, o `$` está na classe de exclusão);
//   (c) 1× «comunicado BFR.» no texto de erro (o ponto final está na classe).
// O RE delimitado nunca as podia apanhar sem tocar em identificadores técnicos — por isso o remendo é PONTUAL,
// com âncoras exactas e contagens, e a régua de fronteira alargada (sem `-` e `.` na classe) é só RÉGUA:
// deve dar exactamente 13 antes e 0 depois.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco, 0 publicacao. Escreve só bfr-candidata-v144b-uniesco/ e evidence/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ORIGEM = `${REPO}/bfr-candidata-v144-uniesco/index.html`;
const PORTOES = JSON.parse(readFileSync(`${REPO}/bfr-candidata-v144-uniesco/portoes-v144-candidata.json`, 'utf8'));
const NOVO_DIR = `${REPO}/bfr-candidata-v144b-uniesco`;
const SAIDA = `${NOVO_DIR}/index.html`;
const REGISTO = `${NOVO_DIR}/portoes-v144b-candidata.json`;
const SUF = (process.argv[2] || 'a').trim();
const EV = `${REPO}/evidence/p154-deriva-v144b-24-11-${SUF}.json`;
if ([SAIDA, REGISTO, EV].some((f) => existsSync(f))) throw new Error('ABORTA: ja existe saida da v144b — use outro sufixo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const B = (s) => Buffer.byteLength(s);
// régua de fronteira alargada: fora da classe ficam `-` e `.` (protegiam as 13); dentro letras, dígitos, _, $, @, #
const RE_FRONT = /(?<![A-Za-z0-9_$@#])BFR(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])Bfr(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])Conecta(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])CONECTA(?![A-Za-z0-9_$@#])/g;

const txt0 = readFileSync(ORIGEM, 'utf8');
if (!String(PORTOES.veredito).startsWith('P151_CANDIDATA_V144_UNIESCO_OK')) throw new Error('ABORTA: a origem nao tem o veredito da v144: ' + PORTOES.veredito);
if (PORTOES.destino.md5 !== md5(txt0) || PORTOES.destino.bytes !== B(txt0)) throw new Error('ABORTA: a origem foi tocada depois de certificada');

const fronteiraAntes = [...txt0.matchAll(RE_FRONT)].length;
if (fronteiraAntes !== 13) throw new Error('ABORTA: a régua de fronteira mede ' + fronteiraAntes + ' ocorrências (esperava 13) — o remendo perdeu a identidade');

const PARES = [
  ['uniesco_conecta_ponto', 'UNIESCO Conecta.', 'UNIESCO.', 10],
  ['protocolo_secretaria', '|| `BFR-${String(request?.id', '|| `UNIESCO-${String(request?.id', 1],
  ['protocolo_comunicado', 'const protocol = `BFR-${new Date().getFullYear()', 'const protocol = `UNIESCO-${new Date().getFullYear()', 1],
  ['texto_erro_comunicado', "'Não foi possível enviar o comunicado BFR.'", "'Não foi possível enviar o comunicado UNIESCO.'", 1],
];
let txt = txt0;
const subs = [];
for (const [nome, de, para, esperado] of PARES) {
  const vezes = n(txt, de);
  if (vezes !== esperado) throw new Error('ABORTA: ' + nome + ' casa ' + vezes + ' vezes (esperava ' + esperado + ')');
  txt = txt.split(de).join(para);
  subs.push({ nome, vezes: esperado, delta_bytes: (B(para) - B(de)) * esperado });
}

const compila = (corpo) => { try { new Script(corpo); return true; } catch (e) { return false; } };
const corpos = (s) => { const out = []; const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) out.push(m[1]); return out; };
const c0 = corpos(txt0), c1 = corpos(txt);
const falhas = [];
const g = (nome, cond, dado) => { if (cond !== true) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 240)); };
g('r1_as_quatro_substituicoes_casaram_as_vezes_esperadas', subs.length === 4 && subs.every((s) => s.delta_bytes === (s.nome === 'uniesco_conecta_ponto' ? -80 : 4)), subs);
g('r2_fronteira_apos_o_remendo_e_zero', [...txt.matchAll(RE_FRONT)].length === 0, { restantes: [...txt.matchAll(RE_FRONT)].length });
g('r3_a_passagem_original_continua_verde_no_delimitado', n(txt, '<title>UNIESCO | Escola Benício Ferreira Reis</title>') === 1 && n(txt, 'UNIESCO') === n(txt0, 'UNIESCO') + 3, { uniesco_antes: n(txt0, 'UNIESCO'), uniesco_depois: n(txt, 'UNIESCO') });
g('r4_os_corpos_inline_compilam_igual', c0.length === c1.length && c1.every((c, i) => compila(c) === compila(c0[i])), { corpos: c1.length, diffs: c1.filter((c, i) => compila(c) !== compila(c0[i])).length });
g('r5_o_delta_de_bytes_e_a_soma_das_substituicoes', B(txt) - B(txt0) === subs.reduce((a, s) => a + s.delta_bytes, 0), { delta: B(txt) - B(txt0), soma: subs.reduce((a, s) => a + s.delta_bytes, 0) });
g('r6_identificadores_tecnicos_intocados', n(txt, 'window.BFR_') === n(txt0, 'window.BFR_') && n(txt, 'bfr-app-logo.png') === n(txt0, 'bfr-app-logo.png') && n(txt, 'bfr-paint-hold') === n(txt0, 'bfr-paint-hold') && n(txt, 'bfr-conecta') === n(txt0, 'bfr-conecta'), { bfr_: n(txt, 'window.BFR_'), logo: n(txt, 'bfr-app-logo.png'), paint: n(txt, 'bfr-paint-hold'), host: n(txt, 'bfr-conecta') });
if (falhas.length) {
  const RED = `${REPO}/evidence/p154-deriva-v144b-24-11-${SUF}-VERMELHO.json`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo');
  writeFileSync(RED, JSON.stringify({ veredito: 'P154_V144B_VERMELHO ' + falhas.length, sufixo: SUF, falhas }, null, 2) + '\n');
  for (const f of falhas) console.log('VERMELHO ' + f);
  process.exit(1);
}
mkdirSync(NOVO_DIR, { recursive: true });
writeFileSync(SAIDA, txt);
if (md5(readFileSync(SAIDA, 'utf8')) !== md5(txt)) throw new Error('ABORTA: a re-leitura nao bate com a corrida');
const registo = {
  programa: 'scripts/p154-deriva-v144b-uniesco.mjs', em: new Date().toISOString(),
  pergunta: 'as 13 referências visíveis que a passagem delimitada da v144 nao apanhou (10 UNIESCO Conecta. + 2 BFR- protocolo + 1 comunicado BFR.) ficam UNIESCO sem tocar em mais nada?',
  origem: { pasta: 'bfr-candidata-v144-uniesco', md5: md5(txt0), bytes: B(txt0), veredito: PORTOES.veredito },
  destino: { pasta: 'bfr-candidata-v144b-uniesco', md5: md5(txt), bytes: B(txt), delta_bytes: B(txt) - B(txt0) },
  fronteira_antes: fronteiraAntes, fronteira_depois: [...txt.matchAll(RE_FRONT)].length,
  substituicoes: subs, portoes: { total: 6, falhas: 0 }, veredito: '',
};
registo.veredito = 'P154_DERIVA_V144B_OK 6/0';
writeFileSync(REGISTO, JSON.stringify(registo, null, 2) + '\n');
writeFileSync(EV, JSON.stringify(registo, null, 2) + '\n');
console.log(`${registo.veredito} · ${B(txt)} B (delta ${B(txt) - B(txt0)}) · ${md5(txt)} · fronteira 13→0`);
