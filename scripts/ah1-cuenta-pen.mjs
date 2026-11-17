// Conta as linhas PEN do roadmap com a PREDICA DO PRODUTOR: pipes escapados (`\|`) nao separam celulas,
// pelo que um code span com `||` dentro nao parte a linha. A conta feita inline em `node -e` foi
// corrompida pela shell antes de chegar ao JS -- por isso o medidor vive num ficheiro.
import { readFileSync } from 'node:fs';

const CAMINHO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/docs/roadmap-master.md';
const ESCAPADO = String.fromCharCode(92) + '|';
const L = readFileSync(CAMINHO, 'utf8').split('\n');
const rows = L.filter((l) => /^\| PEN-\d+ \|/.test(l));
const c = { A: 0, M: 0, B: 0 };
const fora = [];
for (const r of rows) {
  const p = r.split(ESCAPADO).join('@@').split('|');
  if (p.length !== 7) { fora.push((r.match(/^\| PEN-\d+/)[0]) + ' colunas=' + (p.length - 2)); continue; }
  const pri = p[4].trim();
  if (pri in c) c[pri]++; else fora.push((r.match(/^\| PEN-\d+/)[0]) + ' pri=[' + pri + ']');
}
console.log('linhas PEN:', rows.length, '| A', c.A, '· M', c.M, '· B', c.B, '· soma', c.A + c.M + c.B);
console.log('fora de forma:', fora.length ? fora.join(' · ') : 'nenhuma');
const ids = [...new Set(rows.map((r) => r.match(/^\| (PEN-\d+)/)[1]))];
console.log('únicas:', ids.length, '| maior:', ids.sort((a, b) => +b.slice(4) - +a.slice(4))[0]);
