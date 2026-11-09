// SEG: contexto de um padrao num blob — mostra 60 chars antes/depois, com o valor mascarado.
import { execFileSync } from 'node:child_process';

const [sha, re] = [process.argv[2], new RegExp(process.argv[3], 'g')];
const body = execFileSync('git', ['cat-file', 'blob', sha], { encoding: 'utf8', maxBuffer: 1 << 28 });
const hits = [...body.matchAll(re)];
console.log('ocorrencias:', hits.length);
for (const h of hits.slice(0, 6)) {
  const i = h.index;
  const ctx = body.slice(Math.max(0, i - 70), i + 90).replace(/\s+/g, ' ');
  const masked = ctx.replace(h[0], h[0].slice(0, 8) + '…[' + h[0].length + ' chars]');
  console.log('---', masked);
}
