// SEG: conferencia pontual do que o censo disse — so contagens, nunca valores.
import { execFileSync } from 'node:child_process';

const sha = process.argv[2];
const out = execFileSync('git', ['cat-file', 'blob', sha], { encoding: 'utf8', maxBuffer: 1 << 28 });
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
console.log('bytes', out.length);
console.log('ocorrencias "refresh_token":', (out.match(/"refresh_token"/g) || []).length);
console.log('refresh_token com valor JWT:', (out.match(/"refresh_token"\s*:\s*"eyJ/g) || []).length);
console.log('access_token com valor JWT:', (out.match(/"access_token"\s*:\s*"eyJ/g) || []).length);
const jwtStr = [...out.matchAll(JWT)].map((m) => m[0]);
console.log('JWTs totais:', jwtStr.length);
const roles = new Set();
for (const j of jwtStr) {
  const b64 = j.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  try {
    const p = Buffer.from(b64, 'base64').toString('utf8');
    for (const m of p.matchAll(/"role"\s*:\s*"([a-z_]+)"/g)) roles.add(m[1]);
  } catch {}
}
console.log('papeis nos payloads:', [...roles].join(',') || '(nenhum)');
console.log('keys (primeiras 40 chars de cada):', [...new Set([...out.matchAll(/"([a-z_]+)"\s*:/gi)].map((m) => m[1]))].slice(0, 30).join(','));
const aiza = [...out.matchAll(/AIza[0-9A-Za-z_-]{30,}/g)];
if (aiza.length) console.log('AIza', aiza.length, 'prefixos:', aiza.map((m) => m[0].slice(0, 8)).join(','));
