// Contagem de pipes escapados em células de tabela do ledger: usa String.raw para não depender de escapes
// dentro de aspas, e conta a sequência de DOIS bytes (backslash, pipe) contra o ficheiro lido em utf8.
import { readFileSync } from 'node:fs';
const t = readFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/docs/roadmap-master.md', 'utf8');
const par = String.raw`\|`;
let n = 0, i = 0;
while ((i = t.indexOf(par, i)) !== -1) { n++; i += par.length; }
console.log('sequencias_backslash_pipe:', n);
const linhas = t.split('\n');
const primeira = linhas.findIndex((l) => l.includes(par));
console.log('primeira_linha_com_escapado:', primeira + 1, JSON.stringify(linhas[primeira] ? linhas[primeira].slice(0, 120) : null));
const linhaResumo = linhas.findIndex((l) => l.startsWith('| Pendências registradas |'));
const celula = linhas[linhaResumo];
console.log('pipes_cruas_na_linha_do_resumo:', [...celula].filter((c, k) => c === '|' && celula[k - 1] !== '\\').length, 'pipes_totais:', (celula.match(/\|/g) || []).length);
const linhasPen = linhas.filter((l) => l.startsWith('| PEN-'));
console.log('linhas_PEN:', linhasPen.length, 'com_pipe_cru_a_mais_de_5:', linhasPen.filter((l) => [...l].filter((c, k) => c === '|' && l[k - 1] !== '\\').length > 5).length);
