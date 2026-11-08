import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
mkdirSync('_v115-ar-assets', { recursive: true });
const files = ['sw-v4.js','bfr-responsive-presentation.js','bfr-teacher-arrivals.js','bfr-teacher-audit.js','manifest.json','bfr-app-logo.png','lia-avatar.png','lia-avatar.svg','calendario-letivo-2026.pdf','horario-matutino-2026.pdf','horario-vespertino-2026.pdf','horario-matutino-2026.png','horario-vespertino-2026.png'];
const out = [];
for (const f of files) {
  const res = await fetch(base + '/' + f, { cache: 'no-store' });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync('_v115-ar-assets/' + f, buf);
  out.push({ f, status: res.status, bytes: buf.length, md5: createHash('md5').update(buf).digest('hex'), ct: res.headers.get('content-type') });
}
writeFileSync('_v115-ar-assets.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
