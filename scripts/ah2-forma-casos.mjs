// Versão com forma em vez de texto: para decidir se um casamento do portão é credencial ou etiqueta do
// produto basta saber (a) o identificador JSON COMPLETO onde a palavra casa — o regex não ancora no início
// da palavra, portanto `origem_chave` casa pela terminação `chave` — e (b) a forma do valor, com cada letra
// e dígito substituídos por `·` e os espaços/pontuação conservados. Assim a resposta é legível sem que
// nenhum valor seja reproduzido.
// Uso: node scripts/ah2-forma-casos.mjs <caminho> [mais caminhos…]
import { readFileSync } from 'node:fs';
const SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const forma = (s) => s.replace(/[A-Za-z0-9À-ÿ]/g, '·');
for (const c of process.argv.slice(2)) {
  const t = readFileSync(c, 'utf8');
  const por_identificador = new Map();
  for (const m of t.matchAll(SENHA)) {
    // O token identificador apanha-se recuando a partir da palavra que casou: o regex casa no SUFIXO de
    // `origem_chave`, e sem recuar a resposta seria «não sei de onde veio».
    let j = m.index; while (j > 0 && /[A-Za-z0-9_\-]/.test(t[j - 1])) j--;
    const id = t.slice(j, m.index) + m[1];
    const k = id + '  →  valor de forma ' + forma(m[2]) + (/[ ]/.test(m[2]) ? ' (contém espaço)' : '');
    por_identificador.set(k, (por_identificador.get(k) || 0) + 1);
  }
  console.log('\n=== ' + c);
  for (const [k, n] of [...por_identificador.entries()].sort((a, b) => b[1] - a[1])) console.log(`  n=${n}  ${k}`);
}
