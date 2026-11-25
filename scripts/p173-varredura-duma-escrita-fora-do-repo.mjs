// Varredura duma escrita longa fora do repo — a mensagem dum commit, um verbete de memoria — pelas duas familias que
// o teclado do condutor injerta: adjacencia letra-digito e codepoint fora do Latino. A régua NAO e reescrita aqui:
// os dois predicados, as faixas e a limpeza de backticks sao lidos do fonte do produtor (`p169`) e a peça aborta se
// nao os ler, porque uma copia aproximada passa a medir outra coisa consoante o ficheiro.
// O fixturo esta em tempo de execucao e fora do varrido: um fixture escrito a mao seria tambem varrido, e o verde
// dum instrumento que se denuncia a si proprio nao e verde nenhum.
// Localizacao por OCCORRENCIA, nao por agulha: a 1.ª versao imprimia uma linha por achado mas buscava o contexto com
// `indexOf`, que devolve sempre a PRIMEIRA posicao daquela string. A contagem estava certa e o onde estava errado --
// medido no indice de memoria: 367 linhas de candidatos para 65 contextos distintos (no verbete novo, 4 para 1).
// A regra velha continua no fixture, nao como codigo morto mas como controlo: um fixture em que as duas regras dao o
// mesmo numero nao distingue o conserto do defeito.
// A `linha` impressa e a linha do FICHEIRO e isso e garantido por guarda medida (ver quadroDaLinha), nao por suposto.
// Uso: node scripts/p173-varredura-duma-escrita-fora-do-repo.mjs <caminho> [<caminho-da-captura>]
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const alvo = process.argv[2];
if (!alvo) throw new Error('ABORTA: passe o caminho da escrita como argv[2]');
const destino = process.argv[3];
if (destino && existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };

const produtorCaminho = REPOReal + '/scripts/p169-varredura-letra-digito-do-bloco.mjs';
const produtor = readFileSync(produtorCaminho, 'utf8');
const linhaRE = produtor.split('\n').find((l) => l.startsWith('const RE = '));
const linhaFaixas = produtor.split('\n').find((l) => l.startsWith('const faixasOfensoras = '));
const linhaLimpa = produtor.split('\n').find((l) => l.startsWith('const limpa = '));
if (!linhaRE || !linhaFaixas || !linhaLimpa) throw new Error('ABORTA: a régua do produtor nao foi lida do fonte (RE/faixasOfensoras/limpa), e sem leitura nao ha copia fiel');
const RE = new Function('return ' + linhaRE.slice('const RE = '.length).replace(/;\s*$/, ''))();
const REg = new RegExp(RE.source, RE.flags.indexOf('g') >= 0 ? RE.flags : RE.flags + 'g');
const faixasOfensoras = new Function('return ' + linhaFaixas.slice('const faixasOfensoras = '.length).replace(/;\s*$/, ''))();
const limpa = new Function('return ' + linhaLimpa.slice('const limpa = '.length).replace(/;\s*$/, ''))();
const ehOfensora = (c) => faixasOfensoras.some((f) => c >= f[0] && c <= f[1]);
const nomeiaGlifos = (t) => { let s = ''; for (const ch of t) s += ehOfensora(ch.codePointAt(0)) ? 'U+' + ch.codePointAt(0).toString(16).toUpperCase() : ch; return s; };
const ofensoras = (t) => { const a = []; for (let i = 0; i < t.length;) { const c = t.codePointAt(i); if (c > 0x7f && ehOfensora(c)) a.push({ i, cp: 'U+' + c.toString(16).toUpperCase() }); i += c > 0xffff ? 2 : 1; } return a; };
function linhaEColuna(texto, indice) {
  const ate = texto.slice(0, indice);
  return { linha: ate.split('\n').length, coluna: indice - (ate.lastIndexOf('\n') + 1) + 1 };
}
// A limpa do produtor troca cada span de backtick por UM espaco. Enquanto nenhum span atravessar uma quebra de
// linha, contar novas linhas no texto varrido da-me a linha do ficheiro; se um span levar uma quebra, os totais
// deixam de bater e a linha varrida passa a ser outra coisa. A guarda devolve os dois totais para que o quadro
// declarado seja medido, e os fixtures abaixo provam que ela tem positivo nos dois sentidos.
function quadroDaLinha(bruto, varrido) {
  const nb = (bruto.match(/\n/g) || []).length;
  const nv = (varrido.match(/\n/g) || []).length;
  return { novas_linhas_bruto: nb, novas_linhas_varrido: nv, linha_e_do_ficheiro: nb === nv };
}

say('regua_lida_de=' + 'scripts/p169-varredura-letra-digito-do-bloco.mjs');
say('produtor_bytes=' + Buffer.byteLength(produtor, 'utf8') + ' produtor_md5_8=' + createHash('md5').update(produtor).digest('hex').slice(0, 8));
say('emissor_p173_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_p173_md5=' + createHash('md5').update(EU).digest('hex'));
say('RE=' + String(RE) + ' FAIXAS_OFENSORAS=' + JSON.stringify(faixasOfensoras));

const FIX_PARTIDO = 'a linha dice 28papeis e 3contas com ' + String.fromCharCode(0x6392, 0x7248) + ' no meio';
const FIX_LIMPO = 'a linha diz 28 papeis e 3 contas, com plicas «» ‘’ “” – — …, setas -> e <=>, matematica ≥ ≤ ≠ ≈ ± × ÷, sinais ✓ ✗ ⚠ † ‡ e o emoji 📷 🏠';
const fixAdj = (limpa(FIX_PARTIDO).match(RE) || []).length;
const fixAdjLimpo = (limpa(FIX_LIMPO).match(RE) || []).length;
const fixFora = ofensoras(FIX_PARTIDO).length;
const fixForaLimpo = ofensoras(FIX_LIMPO).length;
say('PROVA_FIXTURE adjacencia_partido=' + fixAdj + ' adjacencia_limpo=' + fixAdjLimpo + ' naoLatino_partido=' + fixFora + ' naoLatino_limpo=' + fixForaLimpo);
if (fixAdj < 2) throw new Error('ABORTA: a régua de adjacencia nao dispara no fixture partido (' + fixAdj + '), nenhum zero do varrido significaria nada');
if (fixAdjLimpo !== 0) throw new Error('ABORTA: a régua de adjacencia chumba o fixture limpo (' + JSON.stringify(limpa(FIX_LIMPO).match(RE)) + '), a familia nao e a que o produtor declara');
if (fixFora !== 2) throw new Error('ABORTA: a familia do nao-Latino nao deu os dois glifos do fixture, deu ' + JSON.stringify(ofensoras(FIX_PARTIDO).map((o) => o.cp)));
if (fixForaLimpo !== 0) throw new Error('ABORTA: a familia do nao-Latino proibe uma classe legitima, o fixture limpo deu ' + JSON.stringify(ofensoras(FIX_LIMPO).map((o) => o.cp)));
if (nomeiaGlifos(FIX_PARTIDO).indexOf(String.fromCharCode(0x6392)) >= 0) throw new Error('ABORTA: a nomeacao por codepoint deixou ficar o glifo, a captura seria a ofensora');

// Os dois fixtures que seguem nao provam a regua de contar (ja provada acima): provam a localizacao, que e o ramo
// novo. O controlo da regra velha e obrigatorio -- se as duas regras dessem o mesmo numero neste fixture, o verde
// do ramo novo nao teria positivo nenhum.
const CRASE = String.fromCharCode(0x60);
const NL = String.fromCharCode(10);
const FIX_ADJ_REPETIDO = 'a primeira 28papeis fica aqui e a segunda 28papeis fica ali';
const varridoFixAdj = limpa(FIX_ADJ_REPETIDO);
const ocsFixAdj = [...varridoFixAdj.matchAll(REg)].map((m) => ({ g: m[0], i: m.index }));
const posNovasFix = new Set(ocsFixAdj.map((o) => o.i)).size;
const posVelhasFix = new Set(ocsFixAdj.map((o) => varridoFixAdj.indexOf(o.g))).size;
const ctxNovasFix = new Set(ocsFixAdj.map((o) => varridoFixAdj.slice(Math.max(0, o.i - 12), o.i + 12))).size;
say('PROVA_FIXTURE_LOCALIZACAO ocorrencias=' + ocsFixAdj.length + ' posicoes_distintas_nova=' + posNovasFix + ' contextos_distintos_nova=' + ctxNovasFix + ' posicoes_distintas_regra_velha=' + posVelhasFix);
if (ocsFixAdj.length < 2) throw new Error('ABORTA: o fixture de localizacao nao tem duas ocorrencias da mesma adjacencia, deu ' + ocsFixAdj.length);
if (posNovasFix !== ocsFixAdj.length) throw new Error('ABORTA: a localizacao por ocorrencia nao deu uma posicao por ocorrencia, deu ' + posNovasFix + ' de ' + ocsFixAdj.length);
if (ctxNovasFix !== ocsFixAdj.length) throw new Error('ABORTA: as posicoes distintas nao chegaram ao contexto impresso, deu ' + ctxNovasFix + ' de ' + ocsFixAdj.length);
if (posVelhasFix !== 1) throw new Error('ABORTA: o fixture nao reproduz o defecto que se consertou (a regra do indexOf deveria dar UMA posicao), deu ' + posVelhasFix);
const FIX_Q_NAO_QUEBRA = 'primeira linha ' + CRASE + 'um_span_de_codigo_28' + CRASE + ' e 28papeis no fim';
const FIX_QUE_QUEBRA = ['linha_um', 'com ' + CRASE + 'abc', 'def' + CRASE + ' aqui', 'linha_quatro'].join(NL);
const qNaoQuebra = quadroDaLinha(FIX_Q_NAO_QUEBRA, limpa(FIX_Q_NAO_QUEBRA));
const qQuebra = quadroDaLinha(FIX_QUE_QUEBRA, limpa(FIX_QUE_QUEBRA));
say('PROVA_FIXTURE_QUADRO span_inline=' + JSON.stringify(qNaoQuebra) + ' span_que_cruza_a_quebra=' + JSON.stringify(qQuebra));
if (qNaoQuebra.linha_e_do_ficheiro !== true) throw new Error('ABORTA: com um span dentro da linha a guarda negou o quadro do ficheiro, deu ' + JSON.stringify(qNaoQuebra));
if (qQuebra.linha_e_do_ficheiro !== false) throw new Error('ABORTA: a guarda nao tem positivo para o span que cruza a quebra, deu ' + JSON.stringify(qQuebra) + ' -- a linha impressa seria uma mentira');

const bruto = readFileSync(alvo, 'utf8');
const varrido = limpa(bruto);
const ocorrencias = [...varrido.matchAll(REg)].map((m) => ({ g: m[0], i: m.index }));
const achados = ocorrencias.map((o) => o.g);
const hist = {};
for (const a of achados) hist[a] = (hist[a] || 0) + 1;
const fora = ofensoras(bruto);
const q = quadroDaLinha(bruto, varrido);
const posDistintas = new Set(ocorrencias.map((o) => o.i)).size;
const porAgulhaVelha = new Set(ocorrencias.map((o) => varrido.indexOf(o.g))).size;
say('alvo=' + alvo + ' bytes=' + Buffer.byteLength(bruto, 'utf8') + ' bytes_md5_8=' + createHash('md5').update(bruto).digest('hex').slice(0, 8) + ' linhas=' + bruto.split('\n').length);
say('chars_cru=' + bruto.length + ' chars_varridos=' + varrido.length + ' chars_a_menos_pela_limpa=' + (bruto.length - varrido.length) + ' backticks_no_bruto=' + (bruto.split(CRASE).length - 1));
say('QUADRO_DA_LINHA ' + JSON.stringify(q));
say('CANDIDATOS_ADJACENCIA=' + achados.length + ' HISTOGRAMA=' + JSON.stringify(hist) + ' POSICOES_DISTINTAS=' + posDistintas + ' se_fosse_por_agulha=' + porAgulhaVelha);
if (ocorrencias.length > 0 && posDistintas !== ocorrencias.length) throw new Error('ABORTA: a localizacao por ocorrencia deu ' + posDistintas + ' posicoes para ' + ocorrencias.length + ' ocorrencias, e sem posicao por linha o onde nao e medido');
ocorrencias.forEach((o, k) => {
  const lc = linhaEColuna(varrido, o.i);
  say('ADJ #' + (k + 1) + '/' + ocorrencias.length + ' [' + o.g + '] x' + hist[o.g] + ' linha=' + lc.linha + ' quadro_linha=' + (q.linha_e_do_ficheiro ? 'ficheiro' : 'texto_varrido') + ' coluna_no_texto_varrido=' + lc.coluna + ' char_varrido=' + o.i + ' :: ' + JSON.stringify(nomeiaGlifos(varrido.slice(Math.max(0, o.i - 40), o.i + 40))));
});
say('FORA_DO_LATINO=' + fora.length + ' codigo=' + JSON.stringify(fora.map((o) => o.cp)));
for (const o of fora) {
  const lc = linhaEColuna(bruto, o.i);
  say('OFENSOR codepoint=' + o.cp + ' linha=' + lc.linha + ' coluna=' + lc.coluna + ' contexto=' + JSON.stringify(nomeiaGlifos(bruto.slice(Math.max(0, o.i - 40), o.i + 40))));
}
if (destino) writeFileSync(destino, capt.join('\n') + '\n');
if (achados.length !== 0 || fora.length !== 0) {
  say('P173_CANDIDATOS_A_LISTAR adjacencia=' + achados.length + ' naoLatino=' + fora.length + ' · a régua e lista de candidatos, nao veredicto');
} else {
  say('P173_ESCRITA_SEM_CANDIDATOS adjacencia=0 naoLatino=0');
}
