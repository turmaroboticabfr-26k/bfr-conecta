import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const p = `${DIR}/bfr-candidata-v120-setrole-supervisor/index.html`;
const buf = fs.readFileSync(p);
console.log('md5 espacado: ' + crypto.createHash('md5').update(buf).digest('hex').split('').join(' '));
console.log('bytes:', buf.length, 'bytes espalhado:', String(buf.length).split('').join(' '));

const s = buf.toString('utf8');
const lines = s.split('\n');

// 1. os alvos lexicaos da bancada sao mesmo top-level de script classico? (coluna 0)
for (const ln of [5286, 10306, 9901]) {
  const raw = lines[ln - 1] || '';
  console.log(`\nlinha ${ln}: indent ${raw.length - raw.trimStart().length} | ${raw.slice(0, 90)}`);
}

// 2. em que bloco <script> vivem cada linha-alvo
const blocks = [];
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(s)) !== null) {
  const bodyStart = m.index + m[0].indexOf('>') + 1;
  blocks.push({ startLine: s.slice(0, bodyStart).split('\n').length, endLine: s.slice(0, m.index + m[0].length).split('\n').length, attrs: m[1].replace(/\s+/g, ' ').trim().slice(0, 120), kind: /data-bfr-deferred/.test(m[1]) ? 'deferred' : /src\s*=/.test(m[1]) ? 'src' : 'classic' });
}
console.log(`\nblocos <script>: ${blocks.length}`);
for (const ln of [5286, 9018, 9901, 10145, 10306, 10443, 16943, 23631, 23708]) {
  const b = blocks.find(x => ln >= x.startLine && ln <= x.endLine);
  console.log(`  linha ${ln} -> bloco ${b ? `${b.kind} ${b.startLine}-${b.endLine} [${b.attrs}]` : 'FORA de script'}`);
}

// 3. como o deferred e ativado?
console.log('\n### mecanismo deferred');
for (const k of ['data-bfr-deferred', 'bfr-deferred', 'deferredDisabled', 'activateDeferred', 'loadDeferred']) {
  const c = s.split(k).length - 1;
  console.log(`  marcador ${k}: ${c}`);
}
let i = -1, shown = 0;
while ((i = s.indexOf('data-bfr-deferred', i + 1)) >= 0 && shown < 6) {
  console.log(`  @${i}: ${s.slice(Math.max(0, i - 200), i + 120).replace(/\s+/g, ' ')}`.slice(0, 340));
  shown++;
}
