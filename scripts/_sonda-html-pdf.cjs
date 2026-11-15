// sonda descartavel: que caminhos .pdf a shell embutida no worker v123 realmente pede
const fs = require('fs'), c = require('crypto');
const w = fs.readFileSync('worker-deploy-v123-pdfs/worker.mjs', 'utf8');
function unquote(src, i) { let o = ''; while (i < src.length) { const ch = src[i]; if (ch === '"') return o; if (ch === '\\') { const n = src[i + 1]; o += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n; i += 2; continue; } o += ch; i++; } return null; }
const k = w.indexOf('const HTML = ');
const q = w.indexOf('"', k + 'const HTML = '.length);
const html = unquote(w, q + 1);
console.log('html bytes', Buffer.byteLength(html), 'md5', c.createHash('md5').update(html).digest('hex'));
console.log('refs pdf', JSON.stringify([...new Set(html.match(/[A-Za-z0-9_./-]*\.pdf(?:\?[A-Za-z0-9._%=-]*)?/g) || [])]));
console.log('refs horario', JSON.stringify([...new Set(html.match(/[A-Za-z0-9_./-]*horario[A-Za-z0-9_./-]*/g) || [])]));
for (const p of ['horario-matutino-2026.png', 'horario-vespertino-2026.png', 'calendario-letivo-2026']) console.log(p, 'ocorrencias', html.split(p).length - 1);
