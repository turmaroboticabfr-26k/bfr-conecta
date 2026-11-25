// Varredura de duas familias dum bloco do diario, por codepoint, com o positivo provado antes de confiar num zero:
// a adjacencia letra-digito (o nome trocado por cifra) e a escrita fora do Latino, que e de onde vem o glifo que o
// teclado do condutor injerta. Os ofensores da segunda familia nomeiam-se por codepoint, nunca pelo glifo, senao a
// captura que denuncia passa a ser a ofensora varrida pelo portao do indice.
// Uso: node scripts/p169-varredura-letra-digito-do-bloco.mjs <caminho-da-captura> [MARCA] [alvo]
//      MARCA default SM.56; o fim do bloco e medido como a mais pequena **SM.N.** seguinte existente no ficheiro.
// Os spans de backtick vao fora antes de contar: e neles que vivem os nomes de peca, os md5 e as cifras citadas.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const destino = process.argv[2];
if (!destino) throw new Error('ABORTA: passe o caminho da captura como argv[2]');
if (existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const MARCA = process.argv[3] || 'SM.56';
const ALVO = process.argv[4] || 'docs/auditoria-bfr-conecta.md';
const RE = /[A-Za-zÀ-ÿ][0-9]|[0-9][A-Za-zÀ-ÿ]/g;
const limpa = (t) => t.replace(/`[^`]*`/g, ' ');
const eu = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };

const FIX_PARTIDO = 'a linha dice 28papeis e 3contas mas devia 28 papeis e 3 contas';
const FIX_LIMPO = 'a linha diz 28 papeis e 3 contas';
const positivo = limpa(FIX_PARTIDO).match(RE) || [];
const negativo = limpa(FIX_LIMPO).match(RE) || [];

const faixasOfensoras = [[0x3000, 0x303f], [0x3040, 0x30ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xac00, 0xd7a3], [0xd800, 0xdfff], [0xff00, 0xffef]];
const ehOfensora = (c) => faixasOfensoras.some((f) => c >= f[0] && c <= f[1]);
function foraDoASCII(t) {
  const ach = [];
  for (let i = 0; i < t.length; ) {
    const c = t.codePointAt(i);
    const pos = i;
    i += c > 0xffff ? 2 : 1;
    if (c < 0x80) continue;
    ach.push({ i: pos, cp: 'U+' + c.toString(16).toUpperCase() });
  }
  return ach;
}
const ofensoras = (t) => foraDoASCII(t).filter((a) => ehOfensora(parseInt(a.cp.slice(2), 16)));
const GLIFO_FORA = String.fromCodePoint(0x79fb, 0x52a8);
const FIX_LIMPO_FORA = 'a linha diz 28 papeis e 3 contas, com plicas «» ‘’ “” – — … , setas -> e <=> , matemática ≥ ≤ ≠ ≈ ± × ÷ ∪ ∩ ∑ ∆ ⋯ , sinais ✓ ✗ ⚠ † ‡ , e o emoji 📷 🏠 🃆 🔔 📅 🔎 📊 ❌ 🎮';
const partidoNaoLatino = ofensoras(GLIFO_FORA + FIX_LIMPO_FORA);
const limpoNaoLatino = ofensoras(FIX_LIMPO_FORA);
say('FAIXAS_OFENSORAS=' + JSON.stringify(faixasOfensoras));
say('PROVA_FIXTURE_NAO_LATINO partido=' + JSON.stringify(partidoNaoLatino.map((a) => a.cp)) + ' limpo=' + JSON.stringify(limpoNaoLatino.map((a) => a.cp)));
if (partidoNaoLatino.length !== 2) throw new Error('ABORTA: a familia do nao-Latino nao deu as duas letras do fixture, deu ' + JSON.stringify(partidoNaoLatino.map((a) => a.cp)));
if (limpoNaoLatino.length !== 0) throw new Error('ABORTA: o fixture limpo do nao-Latino deu ' + JSON.stringify(limpoNaoLatino.map((a) => a.cp)) + ', a familia proibe uma classe legita do diario');


say('alvo=' + ALVO + ' repo=' + REPOReal + ' MARCA=' + MARCA);
say('emissor_bytes=' + Buffer.byteLength(eu, 'utf8') + ' emissor_md5=' + createHash('md5').update(eu).digest('hex'));
say('PROVA_FIXTURE positivo=' + JSON.stringify(positivo) + ' negativo=' + JSON.stringify(negativo));
if (!positivo.includes('8p') || !positivo.includes('3c')) throw new Error('ABORTA: a regua nao dispara no fixture partido — nenhum zero faria sentido');
if (negativo.length !== 0) throw new Error('ABORTA: o fixture limpo nao e limpo, deu ' + JSON.stringify(negativo));

const bruto = readFileSync(REPOReal + '/' + ALVO, 'utf8');
const inicio = bruto.indexOf('**' + MARCA + '.');
if (inicio < 0) throw new Error('ABORTA: o bloco ' + MARCA + ' nao esta no ficheiro');
const numerode = Number(MARCA.split('.')[1]);
const seguintes = [...bruto.matchAll(/\*\*SM\.(\d+)\./g)].map((m) => Number(m[1])).filter((n) => n > numerode).sort((a, b) => a - b);
const marcaSeguinte = seguintes[0];
const fim = marcaSeguinte === undefined ? -1 : bruto.indexOf('**SM.' + marcaSeguinte + '.', inicio);
const bloco = bruto.slice(inicio, fim < 0 ? bruto.length : fim);
const varrido = limpa(bloco);
const achados = varrido.match(RE) || [];
say('bloco_inicio_char=' + inicio + ' marca_seguinte_mais_proxima=' + (marcaSeguinte === undefined ? 'nenhuma' : 'SM.' + marcaSeguinte) + ' bloco_fim_char=' + (fim < 0 ? 'fim_do_ficheiro' : fim));
say('ficheiro_chars=' + bruto.length + ' ficheiro_bytes=' + Buffer.byteLength(bruto, 'utf8') + ' bloco_bytes=' + Buffer.byteLength(bloco, 'utf8') + ' bloco_linhas=' + bloco.split('\n').length);
say('chars_cru=' + bloco.length + ' chars_varridos=' + varrido.length + ' spans_de_backtick_retirados=' + (bloco.length - varrido.length));
say('CANDIDATOS=' + achados.length);
const hist = {};
for (const a of achados) hist[a] = (hist[a] || 0) + 1;
say('HISTOGRAMA ' + JSON.stringify(hist));
say('TODOS_OS_CANDIDITOS=' + achados.length);
for (const a of achados) {
  const n = varrido.indexOf(a);
  say('[' + a + '] x' + hist[a] + ' :: ' + JSON.stringify(varrido.slice(Math.max(0, n - 40), n + 40)));
}
const ofensasNoBloco = ofensoras(bloco);
const mapaDoFicheiro = {};
for (const o of foraDoASCII(bruto)) mapaDoFicheiro[o.cp] = (mapaDoFicheiro[o.cp] || 0) + 1;
const mapaDoBloco = {};
for (const o of foraDoASCII(bloco)) mapaDoBloco[o.cp] = (mapaDoBloco[o.cp] || 0) + 1;
const ofensasNoFicheiro = ofensoras(bruto);
say('CENSO_NAO_LATINO_DO_FICHEIRO=' + JSON.stringify(mapaDoFicheiro));
say('CENSO_NAO_LATINO_DO_BLOCO=' + JSON.stringify(mapaDoBloco));
say('FORA_DA_ESCRITA=' + ofensasNoBloco.length + ' no bloco ' + MARCA + ' · no_ficheiro=' + ofensasNoFicheiro.length);
for (const o of ofensasNoBloco) say('OFENSOR codepoint=' + o.cp + ' indice_char=' + o.i + ' contexto=' + JSON.stringify(bloco.slice(Math.max(0, o.i - 40), o.i + 40)));
writeFileSync(destino, capt.join('\n') + '\n', 'utf8');
if (ofensasNoBloco.length !== 0) throw new Error('ABORTA FORA_DA_ESCRITA=' + ofensasNoBloco.length + ' no bloco ' + MARCA + ', captura guardada em ' + destino);
process.stdout.write('P169_VARREDURA_FEITA candidatos=' + achados.length + ' fora_da_escrita=' + ofensasNoBloco.length + ' captura=' + destino + '\n');
