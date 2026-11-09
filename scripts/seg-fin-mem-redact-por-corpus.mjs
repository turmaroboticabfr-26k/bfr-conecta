// Redaccao por CORPUS (complemento do seg-fin-mem-redact.mjs, que so conhecia a forma
// `- `ficheiro` (senha)` do registo do P1). Aqui a regra e ao contrario: colhe as senhas reais do
// disco com o padrao do seg-p1-senha-viva.mjs e substitui cada ocorrencia delas em QUALQUER
// ficheiro de memoria, seja qual for a grafia da linha. Assim apanha tambem `- **Password**: \`x\``.
// Dry-run por omissao; --apply escreve e congela uma copia por ficheiro alterado em os.tmpdir().
// Nunca imprime o valor: so ficheiro, linha, len e md5 de 12 hex.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MEM = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-10-13-28077d9a/memory';
const RX = /password\s*[:=]\s*["']([^"'\n]{4,})["']/gi;
const senhaReal = (s) => !s.includes('${');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
const apply = process.argv.includes('--apply');

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
if (!corpus.size) { console.log('INSTRUMENTO CEGO: zero senhas colhidas do disco — nao ha o que redigir'); process.exit(1); }
console.log(`corpus de senhas do disco: ${corpus.size}`);

const alterados = [];
let total = 0;
for (const f of fs.readdirSync(MEM).filter((x) => x.endsWith('.md')).sort()) {
  const p = path.join(MEM, f);
  const txt = fs.readFileSync(p, 'utf8');
  let novo = txt;
  for (const s of corpus) {
    const n = novo.split(s).length - 1;
    if (!n) continue;
    total += n;
    novo.split(/\r?\n/).forEach((l, i) => { if (l.includes(s)) console.log(`  ${f}:${i + 1} -> len=${s.length} md5=${md5(s)} (${n}x)`); });
    novo = novo.split(s).join(`(md5 ${md5(s)} len=${s.length})`);
  }
  if (novo !== txt) alterados.push([p, novo]);
}
console.log(`\nocorrencias de senha por extenso nos registos: ${total}`);
if (!total) { console.log('nada a redigir (esperado depois de um --apply). seco.'); process.exit(0); }
if (!apply) { console.log('dry-run: nada escrito. Use --apply.'); process.exit(0); }

const bakdir = path.join(os.tmpdir(), `bfr-mem-redact-corpus-${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(bakdir, { recursive: true });
for (const [p, novo] of alterados) {
  fs.copyFileSync(p, path.join(bakdir, path.basename(p)));
  fs.writeFileSync(p, novo, 'utf8');
}
console.log(`aplicado: ${total} ocorrencias redigidas em ${alterados.length} ficheiro(s); copias em ${bakdir}`);
