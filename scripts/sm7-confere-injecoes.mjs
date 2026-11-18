#!/usr/bin/env node
// SM-7-C — varredura ESTÁTICA das strings injectadas no browser.
// Cada `evalJS`/`waitFor`/`cliqueReal`/`estavel` escreve código-fonte dentro de um template literal.
// Um backtick ou uma aspa a mais não rebenta no programa: rebenta no browser, longe da linha que o
// escreveu — foi assim que duas corridas se perderam. Aqui cada corpo compila sem abrir browser:
// as interpolações `${…}` viram uma string neutra e o texto à volta delas tem de bater sozinho.
//
// Uso: node scripts/sm7-confere-injecoes.mjs [ficheiro]   (por omissão: o instrumento SM-7-N)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ALVO = process.argv[2] ? fileURLToPath(new URL(process.argv[2], `file:///${process.cwd().replace(/\\/g, '/')}/`))
  : fileURLToPath(new URL('sm7-navegador-municipal.mjs', import.meta.url));
const src = readFileSync(ALVO, 'utf8');
const linhaDe = (i) => src.slice(0, i).split('\n').length;

function salta_aspa(t, p) { // p na aspa; devolve o índice depois do fecho
  const q = t[p]; p++;
  while (p < t.length) { if (t[p] === '\\') { p += 2; continue; } if (t[p] === q) return p + 1; p++; }
  return p;
}
function salta_interpolacao(t, p) { // p no '$' de `${`; devolve o índice depois do `}`
  let n = 1; p += 2;
  while (p < t.length && n > 0) {
    const c = t[p];
    if (c === "'" || c === '"' || c === '`') { p = c === '`' ? salta_template(t, p) : salta_aspa(t, p); continue; }
    if (c === '{') n++; else if (c === '}') n--;
    p++;
  }
  return p;
}
function salta_template(t, p) { // p no backtick de abertura; devolve o índice depois do fecho
  p++;
  while (p < t.length) {
    const c = t[p];
    if (c === '\\') { p += 2; continue; }
    if (c === '$' && t[p + 1] === '{') { p = salta_interpolacao(t, p); continue; }
    if (c === '`') return p + 1;
    p++;
  }
  return p;
}

const CHAMADAS = ['evalJS', 'waitFor', 'cliqueReal', 'estavel'];
const corpos = []; let variaveis = 0;
for (const nome of CHAMADAS) {
  for (let de = 0;;) {
    const i = src.indexOf(nome + '(', de);
    if (i < 0) break;
    de = i + nome.length + 1;
    if (src[i - 1] === '.') continue; // `x.evalJS(` não é uma chamada nossa; `await evalJS(` é
    let p = i + nome.length + 1;
    while (p < src.length && /\s/.test(src[p])) p++;
    if (src[p] !== '`') { variaveis++; continue; } // chamada com variável: nada a conferir aqui
    const fecho = salta_template(src, p);
    corpos.push({ nome, linha: linhaDe(i), corpo: src.slice(p + 1, fecho - 1) });
    de = fecho;
  }
}

function neutro(t) {
  let s = '', p = 0;
  while (p < t.length) {
    const c = t[p];
    if (c === '\\') { s += c + (t[p + 1] || ''); p += 2; continue; }
    if (c === '$' && t[p + 1] === '{') { s += '"X"'; p = salta_interpolacao(t, p); continue; }
    s += c; p++;
  }
  return s;
}

let maus = 0, bons = 0;
// Duas regras, conforme ao que cada função injeta: `cliqueReal` envia um SELETOR (vai para
// querySelectorAll como dado), os restantes enviam CÓDIGO. Validar um seletor como código dá
// vermelho falso, e foi exactamente isso que esta varredura fez na primeira corrida.
const SELETOR = new Set(['cliqueReal']);
function confere_seletor(t) {
  const aspas = (t.match(/(?<!\\)"/g) || []).length, apos = (t.match(/(?<!\\)'/g) || []).length;
  const colchetes = (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length;
  const parenteses = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
  if (!t.trim()) return 'seletor vazio';
  if (aspas % 2) return 'aspas duplas impares';
  if (apos % 2) return 'aspas simples impares';
  if (colchetes !== 0) return 'colchetes desequilibrados';
  if (parenteses !== 0) return 'parenteses desequilibrados';
  return null;
}
for (const c of corpos) {
  const t = c.corpo;
  if (SELETOR.has(c.nome)) {
    const motivo = confere_seletor(neutro(t));
    if (motivo) { maus++; console.log(`  SELETOR_INVALIDO ${c.nome} :${c.linha} ${motivo} :: ${neutro(t).slice(0, 100).replace(/\s+/g, ' ')}`); }
    else bons++;
    continue;
  }
  const cod = neutro(t);
  try { new vm.Script('(' + cod + ')'); bons++; }
  catch (e) { maus++; console.log(`  INJECAO_INVALIDA ${c.nome} :${c.linha} ${String(e.message).slice(0, 52)} :: ${cod.slice(0, 100).replace(/\s+/g, ' ')}`); }
}
// 3. colisão de identificadores de topo: `const REGISTO` duas vezes não é erro de sintaxe, é erro de
//    carregamento do módulo — e rebenta ANTES de qualquer medição, por isso também é régua daqui.
const decls = new Map();
src.split('\n').forEach((l, k) => {
  const m = l.match(/^(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  if (!m) return;
  if (!decls.has(m[1])) decls.set(m[1], []);
  decls.get(m[1]).push(k + 1);
});
const duplicadas = [...decls].filter(([, v]) => v.length > 1);
for (const [nome, linhas] of duplicadas) console.log(`  IDENTIFICADOR_DUPLOCNOME ${nome} linhas=${linhas.join(',')}`);

console.log(`alvo=${ALVO}`);
console.log(`corpos_litigicos=${corpos.length} compila=${bons} invalidos=${maus} chamadas_com_variavel=${variaveis}`);
const verde = maus === 0;
console.log(verde ? 'SM7_INJECOES_VERDES' : 'SM7_INJECOES_VERMELHAS');
process.exit(verde ? 0 : 1);
