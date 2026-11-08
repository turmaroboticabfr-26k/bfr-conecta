import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const url = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const res = await fetch(url, { cache: 'no-store' });
const buf = Buffer.from(await res.arrayBuffer());
const md5 = createHash('md5').update(buf).digest('hex');
writeFileSync('_v115-ar-live.html', buf);
console.log(JSON.stringify({
  url, status: res.status, bytes: buf.length, md5,
  ct: res.headers.get('content-type'),
  server: res.headers.get('server'),
  cfCache: res.headers.get('cf-cache-status')
}, null, 2));
