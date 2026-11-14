import fs from 'node:fs';
const p = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/bfr-candidata-v120-setrole-supervisor/index.html';
const s = fs.readFileSync(p, 'utf8');
const lineOf = i => s.slice(0, i).split('\n').length;
let i = -1, k = 0;
while ((i = s.indexOf('bfr-core-runtime', i + 1)) >= 0) {
  console.log(`\n=== ocorrencia ${++k} pos ${i} linha ${lineOf(i)}`);
  console.log(s.slice(Math.max(0, i - 700), i + 900).replace(/\s+/g, ' '));
}
console.log('\n=== contexto de bfr-inline-module-bootstrap');
i = s.indexOf('bfr-inline-module-bootstrap');
console.log(`pos ${i} linha ${lineOf(i)}`);
console.log(s.slice(Math.max(0, i - 900), i + 1400).replace(/\s+/g, ' '));
