// P73-T-F — o fixture da sonda do timer. A régua que decide a PEN-35 é «quantos dos setTimeout(dispara, PISO)
// do módulo de apresentação venceram». Um veredicto de 0 vencidos só quer dizer estrelação se o instrumento
// souber contar um vencido; e só quer dizer «cego» se um cancelamento for registado como cancelamento. Este
// programa compõe o corpo injectado em tempo de execução (importa PATCH_SRC do módulo partilhado, por isso a
// agulha não é dactilografada aqui) e dispara, num Node comum, os quatro casos que têm de ser distinguíveis:
//   A timer do módulo a PISO VENCE            → armados+1, venceu+1, e o callback corre mesmo (o invólucro
//                                                não pode engolir a função: um contador que contasse sem
//                                                executá-la daria verde e a app nunca montaria nada).
//   B timer do módulo a PISO CANCELADO        → armados+1, cancelados+1, venceu inalterado.
//   C timer a PISO de OUTRO ficheiro          → outros+1, armados inalterado (é isto que impede «a app tem
//                                                muitos timers curtos» de ser lido como estrelação do módulo).
//   D timer do módulo com OUTRO delay         → nada conta (o filtro é delay===PISO E pilha, não pilha só).
// Se algum par de casos der os mesmos números, a régua não discrimina e o programa aborta — e a sonda não
// corre, porque o 0 dela não querería dizer nada. 0 browser, 0 rede, 0 produto.
// Uso: node scripts/p73-fixture-timer-piso.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { PATCH_SRC, NOME_DO_MODULO } from './p73-patch-timer-piso-lib.mjs';

const PISO = 60, FORA_DO_PISO = 250;
const DIR = `${tmpdir()}/p73t-fixture-${process.pid}`;
mkdirSync(DIR, { recursive: true });
// Os dois emissores são ficheiros verdadeiros com os nomes que a pilha mostra: a atribuição é por pilha, logo
// um objeto falso com uma `stack` escrita à mão não prova nada.
writeFileSync(`${DIR}/${NOME_DO_MODULO}.js`, 'export function arma(piso, cb) { return setTimeout(cb, piso); }\nexport const nome = ' + JSON.stringify(NOME_DO_MODULO) + ';\n');
writeFileSync(`${DIR}/fora-do-modulo.js`, 'export function arma(piso, cb) { return setTimeout(cb, piso); }\n');
const dentro = await import(pathToFileURL(`${DIR}/${NOME_DO_MODULO}.js`).href);
const fora = await import(pathToFileURL(`${DIR}/fora-do-modulo.js`).href);
if (!dentro.nome.endsWith(NOME_DO_MODULO)) throw new Error('ABORTA: o emissor do módulo não se chama como a pilha espera');

globalThis.window = globalThis;
const aplica = () => new Function('return (' + PATCH_SRC(PISO, NOME_DO_MODULO) + ');')();
const estado = () => ({ ...globalThis.window.__p73t, marcas: globalThis.window.__p73t.marcas.length, t: globalThis.window.__p73t.t_armados.length });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
if (aplica() !== 'instalado') throw new Error('ABORTA: o patch não se instalou');
if (aplica() !== 'ja_instalado') throw new Error('ABORTA: aplicar duas vezes duplicou o estado — a sonda leria contadores dobrados');

const chamados = { A: 0, C: 0 };
dentro.arma(PISO, () => { chamados.A++; });               // A vence
const id_b = dentro.arma(PISO, () => { }); clearTimeout(id_b); // B cancelado
fora.arma(PISO, () => { chamados.C++; });                 // C fora do módulo
dentro.arma(FORA_DO_PISO, () => { });                     // D delay fora do PISO
const meio = estado();
await espera(PISO + 120);
const fim = estado();

const esperados_meio = { armados: 2, venceu: 0, cancelados: 1, outros: 1 };
for (const k of Object.keys(esperados_meio)) if (meio[k] !== esperados_meio[k]) throw new Error('ABORTA no meio: ' + k + '=' + meio[k] + ' esperado ' + esperados_meio[k] + ' — os quatro casos não são distinguíveis antes de esperar');
const esperados_fim = { armados: 2, venceu: 1, cancelados: 1, outros: 1 };
for (const k of Object.keys(esperados_fim)) if (fim[k] !== esperados_fim[k]) throw new Error('ABORTA no fim: ' + k + '=' + fim[k] + ' esperado ' + esperados_fim[k] + ' — a sonda não sabe contar um timer que vence');
if (chamados.A !== 1) throw new Error('ABORTA: o invólucro contou o timer do módulo mas NÃO executou o callback (chamados.A=' + chamados.A + ') — um contador assim daria «venceu» com a barra por existir');
if (chamados.C !== 1) throw new Error('ABORTA: o invólucro engoliu um timer de fora (chamados.C=' + chamados.C + ')');
if (fim.marcas !== 1 || fim.t !== 2) throw new Error('ABORTA: marcas=' + fim.marcas + ' t_armados=' + fim.t + ' — as listas de tempos não batem com os contadores');
// A divergência exigida à régua: estrelação (venceu=0, cancelados>0) tem de ser um estado alcançável e
// distinguível de «página quieta» (armados=0). Aqui B produziu-o; sem o caso B o 0 da sonda seria ambíguo.
console.log('FIXTURE PASS · meio ' + JSON.stringify(meio) + ' · fim ' + JSON.stringify(fim) + ' · chamados A=' + chamados.A + ' C=' + chamados.C);
console.log('P7T_REGUA_COM_DENTES · venceu/cancelados/outros/delays-fora são quatro estados distinguíveis; armados por segundo = ' + Math.round(fim.t / ((PISO + 120) / 1000)) + '/s');
