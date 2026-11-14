// RM-1.7 bancada — recon: em qual bloco <script> vive cada linha-chave e quais ganchos o runtime expõe. Somente leitura.
import { readFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const F = `${DIR}/bfr-candidata-v120-setrole-supervisor/index.html`;
const text = readFileSync(F, 'utf8');
const bl = text.split('\n');

const tags = [];
const re = /<script\b[^>]*>|<\/script>/g;
let m;
while ((m = re.exec(text))) {
  const line = text.slice(0, m.index).split('\n').length;
  tags.push({ open: /^<script/.test(m[0]), line, attr: /^<script/.test(m[0]) ? m[0] : '' });
}
const blocks = [];
let stack = [];
for (const t of tags) {
  if (t.open) stack.push(t);
  else if (stack.length) { const o = stack.pop(); blocks.push({ from: o.line, to: t.line, attr: o.attr }); }
}
const find = (line) => blocks.filter(b => line >= b.from && line <= b.to)
  .sort((a, b) => (b.to - b.from) - (a.to - a.from))[0] || null;

const alvos = { 'guard setRole': 9901, 'ativoView?': 5286, 'BFR_APP_RUNTIME': 16943, 'boot router setRole': 10443, 'modulo supervisao': 23632 };
for (const [nome, linha] of Object.entries(alvos)) {
  const b = find(linha);
  console.log(`${nome.padEnd(22)} :${linha}  bloco ${b ? b.from + '–' + b.to : 'FORA'}  ${b ? b.attr.slice(0, 120) : ''}`);
}

console.log('\n── BFR_APP_RUNTIME literal (linhas 16943–16985):');
for (let i = 16943; i <= 16985; i++) console.log(String(i).padStart(6) + ' | ' + (bl[i - 1] || '').slice(0, 190));

console.log('\n── ocorrencias de setter/gancho exposto:');
for (const token of ['window.BFR_SET', 'window.BFR_BOOT', 'window.BFR_DEBUG', 'set activeView', 'set profile', 'window.setRole', 'window.bfrSetRole']) {
  const n = text.split(token).length - 1;
  console.log(`  ${token.padEnd(22)} ${n}x`);
}
