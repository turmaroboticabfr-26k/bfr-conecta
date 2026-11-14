import crypto from 'node:crypto';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const ORIGIN = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const LOCAL = {
  'worker-deploy-v118-csp': '3fcbc3ad52f1a0491362506466c82596',
  'worker-deploy-v118-swclone': '3fcbc3ad52f1a0491362506466c82596',
  'worker-deploy-v118': '7111e4fc3a4069b3df60bc3cfe76ff92',
};

async function get(path) {
  const r = await fetch(ORIGIN + path, { headers: { 'cache-control': 'no-cache' } });
  const buf = Buffer.from(await r.arrayBuffer());
  return { status: r.status, bytes: buf.length, md5: md5(buf), headers: Object.fromEntries(r.headers), body: buf.toString('utf8') };
}

for (const p of ['/', '/sw.js', '/sw-v4.js']) {
  const g = await get(p);
  console.log(`\n${p}: HTTP ${g.status} ${g.bytes} B md5 ${g.md5}`);
  const cspH = g.headers['content-security-policy'];
  console.log(`  header CSP presente? ${cspH ? 'SIM' : 'NAO'}`);
  if (cspH) console.log(`  header CSP: ${cspH.slice(0, 240)}...`);
  if (p !== '/') console.log(`  contem bfr-conecta-v118? ${/bfr-conecta-v118/.test(g.body)} | v117? ${/bfr-conecta-v117/.test(g.body)}`);
  else console.log(`  meta http-equiv CSP no HTML? ${/http-equiv="Content-Security-Policy"/.test(g.body)}`);
}

const swAir = (await get('/sw-v4.js')).md5;
console.log(`\nSW do ar md5 = ${swAir}`);
for (const [d, m] of Object.entries(LOCAL)) console.log(`  ${d} SW md5 ${m} -> ${m === swAir ? 'IGUAL ao ar' : 'diferente'}`);
