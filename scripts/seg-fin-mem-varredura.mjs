// Portao de registos FORA do repo: a memoria do projecto nao passa pelo seg-precommit-gate, e foi
// precisamente la que apareceram 14 senhas em claro (09/11). Um predicado de FORMA e inutil ahi —
// a casa escreve anotacoes `- `nome` (prosa)` em todo o lado, e 10 das 24 linhas assim eram falsos
// positivos. Entao o teste e por CORPUS: colhe as senhas do disco com o mesmo padrao do
// seg-p1-senha-viva.mjs e procura cada literal, por extenso, dentro de cada ficheiro de memoria.
// Nunca imprime um valor: so md5 de 12 hex, comprimento e contagem de ocorrencias.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MEM = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-10-13-28077d9a/memory';
const RX = /password\s*[:=]\s*["']([^"'\n]{4,})["']/gi;
const senhaReal = (s) => !s.includes('${');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);

const corpus = new Set();
const walk = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1);
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name)) {
      for (const m of fs.readFileSync(p, 'latin1').matchAll(RX)) if (senhaReal(m[1])) corpus.add(m[1]);
    }
  }
};
walk(REPO, 3);
if (!corpus.size) { console.log('INSTRUMENTO CEGO: zero senhas colhidas do disco — o portao nao prova nada'); process.exit(1); }
console.log(`corpus de senhas do disco: ${corpus.size}`);

const ficheiros = fs.readdirSync(MEM).filter((f) => f.endsWith('.md')).sort();
let total = 0;
const acusadas = [];
for (const f of ficheiros) {
  const txt = fs.readFileSync(path.join(MEM, f), 'utf8');
  for (const s of corpus) {
    const n = txt.split(s).length - 1;
    if (!n) continue;
    total += n;
    acusadas.push(`${f}: senha md5=${md5(s)} len=${s.length} aparece ${n}x`);
    if (process.argv.includes('--ver')) {
      txt.split(/\r?\n/).forEach((l, i) => {
        if (l.includes(s)) console.log(`  ${f}:${i + 1} | ${l.split(s).join('<VALOR>').slice(0, 220)}`);
      });
    }
  }
}
for (const a of acusadas.slice(0, 20)) console.log(`  ${a}`);
if (acusadas.length > 20) console.log(`  … e mais ${acusadas.length - 20}`);
console.log(`ficheiros de memoria varridos: ${ficheiros.length}`);
console.log(total === 0
  ? 'PORTAO DE MEMORIA OK — nenhuma senha do corpus por extenso num registo fora do repo'
  : `PORTAO DE MEMORIA FALHA — ${total} ocorrencias de senha por extenso`);
process.exit(total === 0 ? 0 : 1);
