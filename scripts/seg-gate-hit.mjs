// Qual literal do ficheiro X casa com o corpus de senhas do portao?
// Imprime apenas numero de linha, comprimento e md5 — nunca o valor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ALVO = process.argv[2];
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const CORPUS_RX = /password\s*[:=]\s*["']([^"'\n]{6,})["']/gi;

const harvest = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...harvest(p, depth - 1));
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name)) {
      out.push(...[...fs.readFileSync(p, 'utf8').matchAll(CORPUS_RX)].map((m) => m[1]).filter((s) => !s.includes('${')));
    }
  }
  return out;
};
const corpus = new Set(harvest(REPO, 3).map(md5));
if (!corpus.size) { console.log('INSTRUMENTO CEGO: corpus vazio'); process.exit(1); }
console.log(`corpus: ${corpus.size} senhas`);

const txt = fs.readFileSync(path.join(REPO, ALVO), 'utf8');
txt.split(/\r?\n/).forEach((linha, i) => {
  for (const m of linha.matchAll(/["']([^"'\n]{6,80})["']/g)) {
    if (corpus.has(md5(m[1]))) {
      console.log(`HIT ${ALVO}:${i + 1} len=${m[1].length} md5=${md5(m[1]).slice(0, 12)} | contexto (mascarado): ${linha.replace(m[1], '«SENHA»').trim().slice(0, 120)}`);
    }
  }
});
