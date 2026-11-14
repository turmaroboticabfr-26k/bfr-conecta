import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
const bytes = (p) => fs.statSync(p).size;

const diaries = [
  ['portoes-v119-diary.json', DIR + '/bfr-candidata-v119-supervisao-embed/portoes-v119-diary.json'],
  ['worker-v119-diary.json', DIR + '/bfr-candidata-v119-supervisao-embed/worker-v119-diary.json'],
];

for (const [label, p] of diaries) {
  if (!fs.existsSync(p)) { console.log(`${label}: AUSENTE`); continue; }
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const gates = Array.isArray(d.gates) ? d.gates : [];
  const ok = gates.filter((g) => g.ok === true).length;
  const bad = gates.filter((g) => g.ok !== true).map((g) => g.name);
  console.log(`${label}: gates=${gates.length} ok=${ok} ruins=${bad.length} [${bad.join(', ')}] published=${JSON.stringify(d.published)} veredito=${JSON.stringify(d.verdict ?? d.verdict_line ?? null)}`);
}

const files = {
  'candidata index.html': DIR + '/bfr-candidata-v119-supervisao-embed/index.html',
  'worker-deploy-v119/worker.mjs': DIR + '/worker-deploy-v119/worker.mjs',
  'ar-shell (base)': DIR + '/ar-shell.html',
};
for (const [k, p] of Object.entries(files)) {
  console.log(fs.existsSync(p) ? `${k}: ${bytes(p)} B md5 ${md5(p)}` : `${k}: AUSENTE`);
}

function unquote(src, i) {
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') break;
    if (c === '\\') {
      const n = src[i + 1];
      out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
      i += 2; continue;
    }
    out += c; i++;
  }
  return out;
}
const grab = (src, marker) => {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  return unquote(src, src.indexOf('"', k + marker.length) + 1);
};

const w = fs.readFileSync(DIR + '/worker-deploy-v119/worker.mjs', 'utf8');
const base = fs.readFileSync(DIR + '/worker-deploy-v118-csp/worker.mjs', 'utf8');
const sw = grab(w, 'const SW = ');
const swBase = grab(base, 'const SW = ');
const html = grab(w, 'const HTML = ');
const candTxt = fs.readFileSync(DIR + '/bfr-candidata-v119-supervisao-embed/index.html', 'utf8');
const h = (s) => crypto.createHash('md5').update(s).digest('hex');
console.log(`SW embutido v119: ${Buffer.byteLength(sw)} B md5 ${h(sw)} cache=${(sw.match(/bfr-conecta-v\d+/) || [null])[0]}`);
console.log(`SW embutido base (v118-csp): ${Buffer.byteLength(swBase)} B md5 ${h(swBase)} cache=${(swBase.match(/bfr-conecta-v\d+/) || [null])[0]}`);
console.log('HTML embutido == candidata (texto): ' + (html === candTxt) + ` | md5 embutido ${h(html)} candidata ${h(candTxt)}`);
console.log(`tokens no HTML embutido: sports_schools(name)=${(html.match(/sports_schools\(name\)/g) || []).length} velho=${(html.match(/school_id,schools\(name\)/g) || []).length}`);
console.log(`worker delta vs base: ${Buffer.byteLength(w) - Buffer.byteLength(base)} B`);
console.log(`etiqueta v118 no worker v119: ${(w.match(/bfr-conecta-v118/g) || []).length} | v119: ${(w.match(/bfr-conecta-v119/g) || []).length}`);
console.log('worker-deploy-v119/public: ' + fs.readdirSync(DIR + '/worker-deploy-v119/public').length + ' ficheiros');
