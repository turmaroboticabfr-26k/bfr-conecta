import fs from 'node:fs';
const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';

function unquote(src, i) {
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return { body: out, quoteEnd: i };
    if (c === '\\') {
      const n = src[i + 1];
      out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
      i += 2; continue;
    }
    out += c; i++;
  }
  return null;
}
function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const q = src.indexOf('"', k + marker.length);
  const u = unquote(src, q + 1);
  return u ? { ...u, markerAt: k, quoteStart: q } : null;
}

const baseW = fs.readFileSync(`${dir}/worker-deploy-v119/worker.mjs`, 'utf8');
const cand = fs.readFileSync(`${dir}/bfr-candidata-v120-setrole-supervisor/index.html`, 'utf8');
const bHtml = grab(baseW, 'const HTML = ');
const bSw = grab(baseW, 'const SW = ');

// JSON original (texto cru entre aspas)
const swJsonRaw = baseW.slice(bSw.quoteStart + 1, bSw.quoteEnd);
const htmlJsonRaw = baseW.slice(bHtml.quoteStart + 1, bHtml.quoteEnd);
console.log('SW  json original=%d B | JSON.stringify(body)=%d B | diff=%d',
  swJsonRaw.length, JSON.stringify(bSw.body).length, JSON.stringify(bSw.body).length - swJsonRaw.length);
console.log('HTML json original=%d B | JSON.stringify(cand)=%d B | diff=%d',
  htmlJsonRaw.length, JSON.stringify(cand).length, JSON.stringify(cand).length - htmlJsonRaw.length);

// onde as escapagens divergem no SW?
const a = swJsonRaw, b = JSON.stringify(bSw.body);
let i = 0;
while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
console.log('SW json: primeira divergencia em %d', i);
console.log('  original:', JSON.stringify(a.slice(Math.max(0, i - 30), i + 40)));
console.log('  stringify:', JSON.stringify(b.slice(Math.max(0, i - 30), i + 40)));

// inventario de escapes usados no original
const esc = {};
for (let k = 0; k < swJsonRaw.length; k++) {
  if (swJsonRaw[k] === '\\' && k + 1 < swJsonRaw.length) {
    const n = swJsonRaw[k + 1];
    esc[n] = (esc[n] || 0) + 1; k++;
  }
}
console.log('SW original: inventario de escapes %j', esc);
const esc2 = {};
for (let k = 0; k < htmlJsonRaw.length; k++) {
  if (htmlJsonRaw[k] === '\\' && k + 1 < htmlJsonRaw.length) {
    const n = htmlJsonRaw[k + 1];
    esc2[n] = (esc2[n] || 0) + 1; k++;
  }
}
console.log('HTML original: inventario de escapes %j', esc2);
// roundtrip do stringify: confirma que o MEU stringify+unquote fecha
const rt = (() => { const s = JSON.stringify(bSw.body); return unquote(s, 1); })();
console.log('roundtrip stringify->unquote do SW: body igual=%s bytes=%d', rt.body === bSw.body, Buffer.byteLength(rt.body));
