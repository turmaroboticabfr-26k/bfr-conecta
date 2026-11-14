import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = b => crypto.createHash('md5').update(b).digest('hex');

function unquote(src, strStart) {
  let i = strStart, out = '';
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
  return { body: out, end: i };
}

function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const q = src.indexOf('"', k + marker.length);
  const u = unquote(src, q + 1);
  return { ...u, declStart: k, valueEnd: u.end, closing: src.indexOf(';', u.end) };
}

for (const d of ['worker-deploy-v118-csp', 'worker-deploy-v118-swclone']) {
  const src = fs.readFileSync(`${dir}/${d}/worker.mjs`, 'utf8');
  console.log(`\n=== ${d} === bytes ${Buffer.byteLength(src)} md5 ${md5(src)}`);

  const lower = src.toLowerCase();
  let at = lower.indexOf('content-security-policy');
  let n = 0;
  while (at >= 0 && n < 6) {
    n++;
    console.log(`  ocorrencia ${n} de 'content-security-policy' em char ${at} ::`);
    console.log('    ' + src.slice(Math.max(0, at - 240), at + 620).replace(/\n/g, '\n    '));
    at = lower.indexOf('content-security-policy', at + 1);
  }
  console.log(`  total ocorrencias = ${(lower.match(/content-security-policy/g) || []).length}`);

  const html = grab(src, 'const HTML = ');
  const sw = grab(src, 'const SW = ');
  console.log(`  ordem: ${html.declStart < sw.declStart ? 'HTML antes do SW' : 'SW antes do HTML'}`);
  const last = html.closing > sw.closing ? html : sw;
  const tail = src.slice(last.closing + 1);
  console.log(`  cauda de rotas (${tail.length} chars):`);
  console.log('  ' + tail.replace(/\n/g, '\n  '));
}
