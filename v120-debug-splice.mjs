import fs from 'node:fs';
import crypto from 'node:crypto';
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
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
console.log('markers: SW@%d HTML@%d | SW quoteEnd@%d HTML quoteStart@%d quoteEnd@%d',
  bSw.markerAt, bHtml.markerAt, bSw.quoteEnd, bHtml.quoteStart, bHtml.quoteEnd);

// reproduce splice
const swNew = bSw.body.replace('bfr-conecta-v119', 'bfr-conecta-v120');
const worker = baseW.slice(0, bSw.quoteStart + 1) + JSON.stringify(swNew)
  + baseW.slice(bSw.quoteEnd, bHtml.markerAt)
  + baseW.slice(bHtml.markerAt, bHtml.quoteStart + 1) + JSON.stringify(cand)
  + baseW.slice(bHtml.quoteEnd);

const nHtml = grab(worker, 'const HTML = ');
console.log('nHtml bytes=%d cand bytes=%d equal=%s', Buffer.byteLength(nHtml.body), Buffer.byteLength(cand), nHtml.body === cand);
if (nHtml.body !== cand) {
  const a = nHtml.body, b = cand;
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  console.log('first diff at %d', i);
  console.log('embed :', JSON.stringify(a.slice(Math.max(0, i - 60), i + 80)));
  console.log('cand  :', JSON.stringify(b.slice(Math.max(0, i - 60), i + 80)));
  // decode errors? compare codepoints
  const cp = (s, k) => s.codePointAt(k);
  console.log('cp embed@%d=%s cp cand@%d=%s', i, cp(a, i), i, cp(b, i));
}
// where else does 'const HTML = ' occur in the new worker?
let idx = -1, hits = [];
while ((idx = worker.indexOf('const HTML = ', idx + 1)) >= 0 && hits.length < 5) hits.push(idx);
console.log('occurrences of "const HTML = " in worker: %s', hits.join(','));
console.log('worker bytes=%d delta=%d md5=%s', Buffer.byteLength(worker), Buffer.byteLength(worker) - Buffer.byteLength(baseW), md5(worker));
