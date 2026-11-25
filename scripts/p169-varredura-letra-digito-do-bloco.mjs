// Varredura letra<->digito dum bloco do diario, por codepoint, com o positivo provado antes de confiar num zero.
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
writeFileSync(destino, capt.join('\n') + '\n', 'utf8');
process.stdout.write('P169_VARREDURA_FEITA candidatos=' + achados.length + ' captura=' + destino + '\n');
