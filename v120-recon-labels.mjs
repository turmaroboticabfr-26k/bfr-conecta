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
  return { ...u, markerAt: k, quoteStart: q };
}

const baseW = fs.readFileSync(`${dir}/worker-deploy-v119/worker.mjs`, 'utf8');
const baseHtml = grab(baseW, 'const HTML = ');
const baseSw = grab(baseW, 'const SW = ');
const cand = fs.readFileSync(`${dir}/bfr-candidata-v120-setrole-supervisor/index.html`, 'utf8');

const count = (s, t) => s.split(t).length - 1;
console.log('base worker bytes=%d md5=%s', Buffer.byteLength(baseW), md5(baseW));
console.log('HTML embed bytes=%d md5=%s', Buffer.byteLength(baseHtml.body), md5(baseHtml.body));
console.log('SW embed bytes=%d md5=%s', Buffer.byteLength(baseSw.body), md5(baseSw.body));
console.log('label v119: worker=%d html=%d sw=%d', count(baseW, 'bfr-conecta-v119'), count(baseHtml.body, 'bfr-conecta-v119'), count(baseSw.body, 'bfr-conecta-v119'));
console.log('label v120: worker=%d html=%d sw=%d', count(baseW, 'bfr-conecta-v120'), count(baseHtml.body, 'bfr-conecta-v120'), count(baseSw.body, 'bfr-conecta-v120'));
console.log('cand bytes=%d md5=%s', Buffer.byteLength(cand), md5(cand));
console.log('cand: label v119=%d v120=%d', count(cand, 'bfr-conecta-v119'), count(cand, 'bfr-conecta-v120'));
console.log('cand: education_supervisor=%d sports_schools(name)=%d schools(name)=%d', count(cand, 'education_supervisor'), count(cand, 'school_id,sports_schools(name)'), count(cand, 'school_id,schools(name)'));
console.log('base SW label contexts:');
for (const m of baseSw.body.matchAll(/bfr-conecta-v\d+/g)) console.log('  pos=%d ctx=%s', m.index, JSON.stringify(baseSw.body.slice(Math.max(0, m.index - 40), m.index + 30)));
