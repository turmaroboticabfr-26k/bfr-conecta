// LIMITES DA CAMADA D: o portao de memoria conta 8 senhas no disco e a conferencia conta 6 no
// diario S7. Os dois numeros sao verdade e medem corpus diferentes — este instrumento so mostra
// QUAL senha do disco nunca entrou no conjunto que o bcrypt comparou, porque isso e o tecto do
// assert "N senhas x 17 hashes = 0". Leitura pura: nada de escrita, nada de edicao de predicado.
// Nunca imprime um valor: md5 de 12 hex, comprimento e caminho do ficheiro de origem.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '').replace(/\/$/, '');
const RX = /password\s*[:=]\s*["']([^"'\n]{4,})["']/gi;
const senhaReal = (s) => !s.includes('${');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);

// mesmo walk, mesma profundidade, mesmas extensoes do seg-fin-mem-varredura.mjs
const origem = new Map();
const walk = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1);
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name)) {
      const rel = path.relative(REPO, p).replace(/\\/g, '/');
      for (const m of fs.readFileSync(p, 'latin1').matchAll(RX)) {
        if (!senhaReal(m[1])) continue;
        if (!origem.has(m[1])) origem.set(m[1], new Set());
        origem.get(m[1]).add(rel);
      }
    }
  }
};
walk(REPO, 3);
if (!origem.size) { console.log('INSTRUMENTO CEGO: zero senhas colhidas do disco'); process.exit(1); }

// corpus que o bcrypt realmente comparou: as etiquetas do diario S7, antes da seccao 10
const log = fs.readFileSync(`${REPO}/evidence/seg-fin-2026-11-09.log`, 'utf8');
const seco = log.split('================ 10.')[0];
const diario = new Set([...seco.matchAll(/senha md5=([0-9a-f]{12}) len=(\d+)/g)].map((m) => m[1]));
const logInteiro = new Set([...log.matchAll(/senha md5=([0-9a-f]{12}) len=(\d+)/g)].map((m) => m[1]));

console.log(`disco: ${origem.size} | diario S7: ${diario.size} | diario inteiro: ${logInteiro.size}`);
const soDisco = [...origem.keys()].filter((s) => !diario.has(md5(s)));
const soDiario = [...diario].filter((h) => ![...origem.keys()].some((s) => md5(s) === h));
for (const s of soDisco) {
  const emLog = logInteiro.has(md5(s)) ? 'aparece NO diario, mas depois da seccao 10' : 'nunca apareceu no diario';
  console.log(`  SO_NO_DISCO md5=${md5(s)} len=${s.length} ${emLog} | origem: ${[...origem.get(s)].join(', ')}`);
}
for (const h of soDiario) console.log(`  SO_NO_DIARIO md5=${h}`);
console.log(soDisco.length + soDiario.length === 0
  ? 'CORPUS IGUAIS — o assert do bcrypt cobre todo o disco'
  : `COBERTURA PARCIAL — ${soDisco.length} senha(s) do disco fora do conjunto que o bcrypt comparou`);
