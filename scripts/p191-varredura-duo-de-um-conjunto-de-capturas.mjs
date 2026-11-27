// Varre um CONJUNTO de capturas com a regua de cifras em duo do p168 e imprime o tally por classe, com os ofensores
// nomeados. Existe porque a cifra «N vermelhos em M capturas» foi citada em prosa antes de haver quem a produzisse.
// As tres classes de veredicto sao lidas do fonte do produtor por regex e a lista tem de ter exactamente tres nomes:
// se alguém acrescentar uma quarta classe ao p168, esta peça aborta em vez de a contar como NENHUM.
// O conjunto e um diretorio mais um prefixo, nunca uma lista lembrada, e zero ficheiros aborta — um tally de nada
// nao e medida. Os fixtures vivem num diretorio temporario FORA do repo, compostos em tempo de execucao, porque um
// fixture escrito a mao no repo seria varrido pela volta seguinte.
// Uso: node scripts/p191-varredura-duo-de-um-conjunto-de-capturas.mjs <diretorio> <prefixo> [<caminho-da-captura>]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const DIRarg = process.argv[2];
const PREFIXO = process.argv[3];
const destino = process.argv[4];
if (!DIRarg || !PREFIXO) throw new Error('ABORTA: passe <diretorio> e <prefixo> como argv[2] e argv[3]');
if (destino && existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const PECA_P168 = join(REPOReal, 'scripts', 'p168-prova-de-edicao-sem-corte.mjs');
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const produtorSrc = readFileSync(PECA_P168, 'utf8');
const vereditos = Array.from(new Set(produtorSrc.match(/P168_DUO_[A-Z_]+/g) || [])).sort();
if (vereditos.length !== 3) throw new Error('ABORTA: li ' + vereditos.length + ' vereditos do p168 (' + JSON.stringify(vereditos) + '), esperava tres classes — o tally nao pode inventar nem fundir uma');
const [ACHADO, NENHUM, FORA] = vereditos.includes('P168_DUO_DE_CIFRAS_ACHADO') && vereditos.includes('P168_DUO_DE_CIFRAS_NENHUM') && vereditos.includes('P168_DUO_FORA_DO_DOMINIO')
  ? ['P168_DUO_DE_CIFRAS_ACHADO', 'P168_DUO_DE_CIFRAS_NENHUM', 'P168_DUO_FORA_DO_DOMINIO']
  : (() => { throw new Error('ABORTA: os tres vereditos lidos nao sao os esperados, deu ' + JSON.stringify(vereditos)); })();

const capt = [];
const say = (s) => { capt.push(s); console.log(s); };

function duomar(caminho) {
  const saida = execFileSync('node', [PECA_P168, '--duo', caminho], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const linhas = saida.split('\n').filter((l) => l.trim().length > 0);
  const veredicto = linhas.length ? linhas[linhas.length - 1].trim() : '';
  if (!vereditos.includes(veredicto)) throw new Error('ABORTA: ' + caminho + ' nao terminou com um dos tres vereditos do produtor, terminou com ' + JSON.stringify(veredicto));
  const detalhe = linhas.find((l) => l.startsWith('DUO em=')) || '';
  return { veredicto, detalhe };
}

// Fixtures compostos em runtime, fora do repo: as tres classes tenem de aparecer por construção, senão o tally de
// um conjunto real poderia ser um verde de regex cego.
const tmp = mkdtempSync(join(tmpdir(), 'p191-fix-'));
const F_ACHADO = join(tmp, 'fixture-achado.txt');
const F_NENHUM = join(tmp, 'fixture-nenhum.txt');
const F_FORA = join(tmp, 'fixture-fora-do-dominio.txt');
writeFileSync(F_ACHADO, 'alvo=x linhas=10\nADJ #1/2 [2a] linha=5\nADJ #2/2 [3b] linha=9\nP190_FIM\n');
writeFileSync(F_NENHUM, 'alvo=x linhas=10\nCANDIDATOS=2 POSICOES=2\nFORA=0\nP190_FIM\n');
writeFileSync(F_FORA, 'caso,a,b\num,1,2\ndois,3,4\n');
const fxA = duomar(F_ACHADO), fxN = duomar(F_NENHUM), fxNoDom = duomar(F_FORA);
say('PROVA_FIXTURE achado=' + fxA.veredicto + ' nenhum=' + fxN.veredicto + ' fora_do_dominio=' + fxNoDom.veredicto);
if (fxA.veredicto !== ACHADO) throw new Error('ABORTA: o fixture com a mesma chave em duas linhas de caso nao deu ACHADO, deu ' + fxA.veredicto + ' — a régua nao distingue as duas classes');
if (fxN.veredicto !== NENHUM) throw new Error('ABORTA: o fixture duma medida unica nao deu NENHUM, deu ' + fxN.veredicto);
if (fxNoDom.veredicto !== FORA) throw new Error('ABORTA: o fixture duma tabela sem cabecalho de medida nao deu FORA_DO_DOMINIO, deu ' + fxNoDom.veredicto);

// Onde vivem os ofensores: para cada nome da classe ACHADO, le-se no PROPRIO ficheiro a linha que declara o emissor
// (alvo=, peca= ou emissor_<x>_bytes=). A classe nao e minha: um ficheiro sem linha legivel fica em sem_emissor_lido,
// e essa lista imprime-se mesmo vazia, porque zero ofensores sem emissor e o resultado honesto e nao uma venda.
const RE_EMITOR = /^(?:alvo|peca)=([^\s]+)|^emissor_([a-z0-9]+)_bytes=/;
function emissorDe(caminho) {
  for (const l of readFileSync(caminho, 'utf8').split('\n')) {
    const m = l.match(RE_EMITOR);
    if (m) return m[1] || ('emissor_' + m[2]);
  }
  return null;
}
function particaoPorEmissor(nomes, dir) {
  const por = {};
  const sem = [];
  for (const n of nomes) {
    const e = emissorDe(join(dir, n));
    if (e === null) sem.push(n);
    else por[e] = (por[e] || 0) + 1;
  }
  const chaves = Object.keys(por).sort();
  const soma = chaves.reduce((a, k) => a + por[k], 0);
  return { por, chaves, soma, sem };
}
// O fixture da particao tem de ter as duas caras: um ficheiro com emissor legivel e um sem nenhum. Sem o segundo,
// a classe sem_emissor_lido era um ramo morto, e um ramo morto e a regua que so pode dar verde.
const F_EMIT_SIM = join(tmp, 'fixture-emissor-com.txt');
const F_EMIT_NAO = join(tmp, 'fixture-emissor-sem.txt');
writeFileSync(F_EMIT_SIM, 'alvo=scripts/peca-exemplo.mjs bytes=1\nportao_x=OK obtido=1\nP168_DUO_DE_CIFRAS_NENHUM\n');
writeFileSync(F_EMIT_NAO, 'uma tabela de casos qualquer\nx,1\ny,2\n');
const fxPart = particaoPorEmissor(['fixture-emissor-com.txt', 'fixture-emissor-sem.txt'], tmp);
say('PROVA_PARTICAO_DE_EMISSOR com=' + fxPart.soma + ' sem=' + fxPart.sem.length + ' nomes_sem=' + JSON.stringify(fxPart.sem) + ' soma_bate=' + (fxPart.soma + fxPart.sem.length === 2));
if (fxPart.soma !== 1 || fxPart.sem.length !== 1 || fxPart.sem[0] !== 'fixture-emissor-sem.txt') throw new Error('ABORTA: a particao por emissor nao separou os dois fixtures, deu com=' + fxPart.soma + ' sem=' + JSON.stringify(fxPart.sem));

const st = statSync(DIRarg);
if (!st.isDirectory()) throw new Error('ABORTA: argv[2] nao e um diretorio — ' + DIRarg + ' e um ficheiro, e o prefixo apanharia o proprio nome');
const nomes = readdirSync(DIRarg).filter((n) => n.startsWith(PREFIXO) && n.endsWith('.txt')).sort();
if (nomes.length === 0) throw new Error('ABORTA: zero capturas com o prefixo ' + PREFIXO + ' em ' + DIRarg + ' — um tally de nada nao e medida');
say('regua_lida_de=scripts/p168-prova-de-edicao-sem-corte.mjs');
say('produtor_bytes=' + Buffer.byteLength(produtorSrc, 'utf8') + ' produtor_md5=' + createHash('md5').update(produtorSrc).digest('hex'));
say('emissor_p191_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_p191_md5=' + createHash('md5').update(EU).digest('hex'));
say('conjunto_diretorio=' + DIRarg + ' prefixo=' + PREFIXO + ' capturas=' + nomes.length);
say('peca=' + relative(REPOReal, fileURLToPath(import.meta.url)).split(sep).join('/') + ' · quem emite esta saida, lido do proprio modulo e nao dactilografado');
say('alvo=' + DIRarg + ' · o conjunto varrido; sem esta linha esta propria corrida ficava FORA_DO_DOMINIO da regua que ela aplica, e o tally de um conjunto nao mediria a si mesmo');
say('TABELAS_DECLARADAS [DUO_ACHADO] · cada fila e uma medida sua, declaracao lida pela regua de cifras em duo do p168');

const tally = { [ACHADO]: [], [NENHUM]: [], [FORA]: [] };
for (const n of nomes) {
  const r = duomar(join(DIRarg, n));
  tally[r.veredicto].push(n);
  if (r.veredicto === ACHADO) say('DUO_ACHADO ' + n + ' :: ' + r.detalhe);
}
const histograma = {};
for (const v of vereditos) histograma[v] = tally[v].length;
const soma = vereditos.reduce((a, v) => a + tally[v].length, 0);
say('TALLY por_classe=' + JSON.stringify(histograma) + ' soma_das_tres_classes=' + soma + ' capturas=' + nomes.length);
say('CLASSES_IMPRESSAS_SEM_OCORRENCIA=' + JSON.stringify(vereditos.filter((v) => tally[v].length === 0)));
say('LISTA_ACHADO=' + JSON.stringify(tally[ACHADO]));
say('LISTA_FORA_DO_DOMINIO=' + JSON.stringify(tally[FORA]));
const fxPartReal = particaoPorEmissor(tally[ACHADO], DIRarg);
say('ONDE_POR_EMISSOR=' + JSON.stringify(fxPartReal.por) + ' emissores_distintos=' + fxPartReal.chaves.length +
  ' somados=' + fxPartReal.soma + ' sem_emissor_lido=' + fxPartReal.sem.length + ' lista_sem_emissor=' + JSON.stringify(fxPartReal.sem));
if (fxPartReal.soma + fxPartReal.sem.length !== tally[ACHADO].length) throw new Error('ABORTA: a particao por emissor soma ' + (fxPartReal.soma + fxPartReal.sem.length) + ' contra ' + tally[ACHADO].length + ' ofensores — nao e particao');
if (soma !== nomes.length) throw new Error('ABORTA: as tres classes somam ' + soma + ' contra ' + nomes.length + ' capturas — o tally nao e uma particao');
say(nomes.length === soma && tally[ACHADO].length === 0 ? 'P191_DUO_CONJUNTO_VERDE' : tally[ACHADO].length > 0 ? 'P191_DUO_CONJUNTO_ACHADO' : 'P191_DUO_CONJUNTO_INCOMPLETO');
if (destino) writeFileSync(destino, capt.join('\n') + '\n');
