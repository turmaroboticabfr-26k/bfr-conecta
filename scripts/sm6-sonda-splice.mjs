// SM6-SPLICE — prova de que o que está DENTRO da candidata é byte a byte o módulo escrito em disco.
// A régua do construtor verifica o payload original; esta verifica o resultado: extrai o <script
// injetado>, compila (sem executar) e compara o md5 com `scripts/sm6-modulo-municipal.txt`. Sem isto,
// um <\/script> ou um `${}` no meio do caminho daria uma candidata «verde» que o browser nunca parseia.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const CAND = `${DIR}/bfr-candidata-v127-secretaria-municipal/index.html`;
const FONTE = `${DIR}/scripts/sm6-modulo-municipal.txt`;
const OUT = `${DIR}/evidence/sm6-sonda-splice-17-11.json`;
if (!existsSync(CAND) || !existsSync(FONTE)) { console.log('VERMELHO  falta candidata ou módulo em disco'); process.exit(1); }
if (existsSync(OUT)) { console.log(`VERMELHO  já existe ${OUT} — correr com outro nome`); process.exit(1); }

const md5 = (b) => createHash('md5').update(b).digest('hex');
const html = readFileSync(CAND, 'utf8');
const fonte = readFileSync(FONTE, 'utf8');
const marcador = '<script data-bfr-municipal-module="1">';
const i = html.indexOf(marcador);
const bloqueios = [];
if (i < 0) bloqueios.push('marcador do módulo ausente da candidata');
let extraido = '';
let compilado = { ok: false, erro: '' };
let posicaoRelativa = null;
if (i >= 0) {
  const inicio = i + marcador.length + 1;
  const fim = html.indexOf('\n</script>', inicio);
  if (fim < 0) bloqueios.push('o <script> injetado não tem fecho');
  else {
    extraido = html.slice(inicio, fim);
    posicaoRelativa = i - html.lastIndexOf('</body>', i);
    try { new vm.Script(extraido, { filename: 'splice' }); compilado = { ok: true, erro: '' }; }
    catch (e) { compilado = { ok: false, erro: String(e.message || e) }; bloqueios.push('o trecho injetado não compila: ' + compilado.erro); }
    if (md5(Buffer.from(extraido, 'utf8')) !== md5(Buffer.from(fonte, 'utf8'))) {
      bloqueios.push(`conteúdo injetado difere da fonte: ${md5(Buffer.from(extraido))} != ${md5(Buffer.from(fonte))}`);
    }
  }
  if (html.split(marcador).length - 1 !== 1) bloqueios.push(`esperava 1 script injetado, há ${html.split(marcador).length - 1}`);
  const body_seguinte = html.indexOf('</body>', i);
  posicaoRelativa = body_seguinte < 0 ? null : body_seguinte - i;
}
// FIXTURE da régua de igualdade: uma única letra mudada no meio do recorte TÊM de ser apanhada. Sem o
// vermelho demonstrado, «md5 igual» pode ser só as duas strings serem ambas vazias.
const fixture = extraido ? (() => { const corrompido = extraido.slice(0, Math.floor(extraido.length / 2)) + 'x' + extraido.slice(Math.floor(extraido.length / 2) + 1); return {
  detetou_diferenca: md5(Buffer.from(corrompido, 'utf8')) !== md5(Buffer.from(extraido, 'utf8')),
  nao_compile_ou_mudou: md5(Buffer.from(corrompido)) !== md5(Buffer.from(fonte))
}; })() : { detetou_diferenca: false, nota: 'sem recorte; a régua não pôde ser autotestada' };
if (!fixture.detetou_diferenca) bloqueios.push('AUTOTESTE splice: a régua de igualdade não acusou 1 byte mudado — não vale nada');

const diario = {
  programa: 'scripts/sm6-sonda-splice.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  publicacao: false,
  o_que_prova: 'que a candidata contém exatamente um <script data-bfr-municipal-module>, que o texto dentro dele compila com vm.Script, e que esse texto tem o mesmo md5 de scripts/sm6-modulo-municipal.txt — ou seja, a candidata é o módulo, não uma versão dele que se desfez no caminho.',
  o_que_NAO_prova: 'que o browser executa o módulo: vm.Script é o parser do Node, não o do chrome, e nada aqui cria DOM, sessão ou clique. O teste de abrir/carregar/renderizar por papel continua a pedir OK.',
  candidata: 'bfr-candidata-v127-secretaria-municipal/index.html',
  candidata_bytes: Buffer.byteLength(html), candidata_md5: md5(Buffer.from(html, 'utf8')),
  fonte_bytes: Buffer.byteLength(fonte), fonte_md5: md5(Buffer.from(fonte, 'utf8')),
  recorte_bytes: Buffer.byteLength(extraido), recorte_md5: md5(Buffer.from(extraido, 'utf8')),
  compilado: compilado,
  distancia_do_marcador_ao_ultimo_body_na_saida: posicaoRelativa,
  autoteste_de_igualdade: fixture,
  bloqueios,
  veredito: bloqueios.length ? 'SPLICE_VERMELHO' : 'SPLICE_OK'
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(diario.veredito, '| recorte', diario.recorte_bytes, 'bytes', diario.recorte_md5);
console.log('compila', JSON.stringify(compilado), '| autoteste', JSON.stringify(fixture));
if (bloqueios.length) console.log(JSON.stringify(bloqueios, null, 1));
process.exit(bloqueios.length ? 1 : 0);
