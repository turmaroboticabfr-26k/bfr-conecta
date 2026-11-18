// Prova das duas exceções candidatas do portão-indice (18/11, §SM.20):
// 1. os artefactos sm7 v133 nao casam o padrão (so o 390-sm8bar390 casa);
// 2. os valores casados no sm10 sao exatamente as chaves do registo de sessoes fora do repo.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const RE = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;

const v133 = [
  'evidence/sm7-municipal-education_supervisor-390-v133bar390.json',
  'evidence/sm7-municipal-education_supervisor-430-v133bar430.json',
];
for (const f of v133) {
  const t = readFileSync(f, 'utf8');
  let n = 0, m; const comps = [];
  while ((m = RE.exec(t))) { n++; comps.push(m[2].length); }
  console.log(`${f}: n=${n} comprimentos=${comps.join(',')}`);
}

const scr = readFileSync('scripts/sm10-sonda-rls-escopo-18-11.mjs', 'utf8');
let m2; const vals = [];
while ((m2 = RE.exec(scr))) vals.push(m2[2]);

const sm8 = JSON.parse(readFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/sm8-municipal-sessions.json', 'utf8'));
const ah2 = JSON.parse(readFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessions.json', 'utf8'));
const chavesForaDoRepo = [...Object.keys(sm8), ...Object.keys(ah2)];
const md5 = (s) => createHash('md5').update(s).digest('hex');

console.log(`sm10: n=${vals.length} comprimentos=${vals.map((v) => v.length).join(',')}`);
console.log(`sm10: todos os valores casados sao chaves do registo de sessoes fora do repo: ${vals.every((v) => chavesForaDoRepo.includes(v))}`);
console.log(`sm10: igualdade de hash do 1.º valor vs registo: ${md5(vals[0]) === md5(chavesForaDoRepo.find((c) => c === vals[0]) || 'x')}`);
