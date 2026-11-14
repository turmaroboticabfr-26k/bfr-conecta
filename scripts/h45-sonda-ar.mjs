import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = (b) => createHash('md5').update(b).digest('hex');

const diary = JSON.parse(readFileSync(`${ROOT}/audit-publicacao-v120.json`, 'utf8'));
const URL_AR = diary.deploy.url;
const [md5Esperado, tamEsperado] = [
  diary.md5.shell_depois.split(' ')[0],
  Number(diary.md5.shell_depois.match(/\((\d+) B\)/)[1]),
];

const res = await fetch(URL_AR, { headers: { 'cache-control': 'no-cache' } });
const buf = Buffer.from(await res.arrayBuffer());
mkdirSync(`${ROOT}/evidence`, { recursive: true });
writeFileSync(`${ROOT}/evidence/h45-ar-v120-shell.html`, buf);

const out = {
  quando: new Date().toISOString(),
  url: URL_AR,
  url_derivada_de: 'audit-publicacao-v120.json -> deploy.url',
  status: res.status,
  bytes: buf.length,
  md5: md5(buf),
  esperados_no_diario: { bytes: tamEsperado, md5: md5Esperado },
  bate_bytes: buf.length === tamEsperado,
  bate_md5: md5(buf) === md5Esperado,
};

const lines = buf.toString('utf8').split('\n');
out.total_linhas = lines.length;
out.ctx_10415_10445 = Object.fromEntries(
  Array.from({ length: 31 }, (_, i) => [10415 + i, lines[10414 + i]]),
);

const idxs = [];
lines.forEach((l, i) => {
  if (l.includes('accountLabels')) idxs.push(i + 1);
});
out.accountLabels_linhas = idxs;

console.log(JSON.stringify(out, null, 1));
