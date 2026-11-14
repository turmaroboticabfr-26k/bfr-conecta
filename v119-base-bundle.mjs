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
      if (n === 'n') { out += '\n'; i += 2; continue; }
      if (n === 'r') { out += '\r'; i += 2; continue; }
      if (n === 't') { out += '\t'; i += 2; continue; }
      out += n; i += 2; continue;
    }
    out += c; i++;
  }
  return { body: out, end: i };
}

function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const q = src.indexOf('"', k + marker.length);
  return unquote(src, q + 1);
}

const dirs = ['worker-deploy-v118-csp', 'worker-deploy-v118-swclone', 'worker-deploy-v118'];
const info = {};
for (const d of dirs) {
  const p = `${dir}/${d}/worker.mjs`;
  const src = fs.readFileSync(p, 'utf8');
  const html = grab(src, 'const HTML = ');
  const sw = grab(src, 'const SW = ');
  const cspCount = (src.match(/content-security-policy/gi) || []).length;
  const head = src.slice(0, src.indexOf('const HTML = '));
  const tail = html ? src.slice(html.end + 2) : '';
  const tailAfterSW = sw ? src.slice(sw.end + 2) : '';
  info[d] = { src, html, sw, cspCount, head, tailAfterSW };
  console.log(`\n=== ${d} ===`);
  console.log(`  worker bytes ${Buffer.byteLength(src)} md5 ${md5(src)}`);
  console.log(`  HTML  ${html ? Buffer.byteLength(html.body) : 'n/a'} B md5 ${html ? md5(html.body) : '-'}`);
  console.log(`  SW    ${sw ? Buffer.byteLength(sw.body) : 'n/a'} B md5 ${sw ? md5(sw.body) : '-'}`);
  console.log(`  ocorrencias 'content-security-policy' no worker = ${cspCount}`);
  console.log(`  head before HTML constant: ${head.length} chars`);
  console.log(`  cauda apos SW (${tailAfterSW.length} chars):`);
  console.log('  ' + tailAfterSW.replace(/\n/g, '\n  ').slice(0, 1800));
}

const swMd5s = new Set(dirs.map(d => info[d].sw && md5(info[d].sw.body)));
const htmlMd5s = new Set(dirs.map(d => info[d].html && md5(info[d].html.body)));
const tailMd5s = new Set(dirs.map(d => md5(info[d].tailAfterSW)));
console.log(`\nSW distintos entre os tres: ${swMd5s.size}`);
console.log(`HTML distintos entre os tres: ${htmlMd5s.size}`);
console.log(`rotas (cauda) distintas entre os tres: ${tailMd5s.size}`);
