import fs from 'node:fs';
import crypto from 'node:crypto';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';

const res = await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'cache-control': 'no-store' } });
const air = Buffer.from(await res.arrayBuffer());
console.log('AIR  http=%d  bytes=%d  md5=%s', res.status, air.length, md5(air));
const hdr = {};
res.headers.forEach((v, k) => { hdr[k] = v; });
console.log('AIR  headers=%s', JSON.stringify(hdr));
console.log('DISCO ar-shell.html bytes=%d md5=%s  IGUAL_AO_AR=%s',
  fs.statSync(`${dir}/ar-shell.html`).size, md5(fs.readFileSync(`${dir}/ar-shell.html`)),
  md5(fs.readFileSync(`${dir}/ar-shell.html`)) === md5(air));

// desempota uma string JS entre aspas duplas com escapes \x, começando em `from` (posição da abre-aspas)
function unquote(src, from) {
  let i = from + 1;
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const n = src[i + 1];
      if (n === 'n') { out += '\n'; i += 2; continue; }
      if (n === 'r') { out += '\r'; i += 2; continue; }
      if (n === 't') { out += '\t'; i += 2; continue; }
      out += n; i += 2; continue;
    }
    if (c === '"') return { value: out, end: i };
    out += c; i += 1;
  }
  return { value: null, end: -1 };
}

const needles = ['school_id,schools(name)', 'school_id,sports_schools(name)'];
for (const rel of ['worker-deploy-v118-csp/worker.mjs', 'worker-deploy-v118-swclone/worker.mjs', 'worker-deploy-v118/worker.mjs', 'worker-deploy-v115/worker.mjs']) {
  const p = `${dir}/${rel}`;
  if (!fs.existsSync(p)) { console.log(`\n${rel}  AUSENTE`); continue; }
  const src = fs.readFileSync(p, 'utf8');
  const at = src.indexOf('const HTML = "');
  if (at < 0) { console.log(`\n${rel}  sem const HTML`); continue; }
  const { value } = unquote(src, at + 'const HTML = '.length);
  if (value === null) { console.log(`\n${rel}  HTML nao terminou`); continue; }
  const buf = Buffer.from(value, 'utf8');
  const swAt = src.indexOf('const SW = "');
  const sw = unquote(src, swAt + 'const SW = '.length).value || '';
  console.log(`\n${rel}`);
  console.log('  html_bytes=%d md5=%s igual_ao_ar=%s', buf.length, md5(buf), md5(buf) === md5(air));
  console.log('  nu=%d sports=%d   CACHE=%s  CSP_no_worker=%s',
    (value.match(/school_id,schools\(name\)/g) || []).length,
    (value.match(/school_id,sports_schools\(name\)/g) || []).length,
    (sw.match(/bfr-conecta-v\d+/) || ['?'])[0],
    /Content-Security-Policy/.test(src));
}
