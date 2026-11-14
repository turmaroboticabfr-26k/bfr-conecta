// RM-1.4 sonda: que marcadores de versão e de rota realmente existem nos bytes publicados?
const ALVO = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const html = await (await fetch(ALVO + '/', { headers: { 'cache-control': 'no-cache' } })).text();
console.log(`bytes=${html.length}`);
for (const re of [/\bCACHE[A-Z_]*\s*=\s*['"`][^'"`]{1,28}['"`]/g, /\bVERSION\s*=\s*['"`][^'"`]{1,28}['"`]/g,
  /sw-v\d+\.js\?v=\d+/g, /v1[0-9]{2}\b/g]) {
  const hits = [...new Set(html.match(re) || [])].slice(0, 12);
  console.log(`${re.source.slice(0, 30)}… -> ${hits.length ? hits.join(' | ') : 'nenhum'}`);
}
const sw = await fetch(ALVO + '/sw-v4.js?v=45', { headers: { 'cache-control': 'no-cache' } });
const swtxt = await sw.text();
console.log(`\nsw-v4.js: HTTP ${sw.status} ct=${sw.headers.get('content-type')} bytes=${swtxt.length}`);
console.log(`   versoes: ${[...new Set(swtxt.match(/(CACHE_NAME|CACHE_VERSION|VERSION|CACHE)\s*=\s*['"`][^'"`]+['"`]/g) || [])].slice(0, 8).join(' | ') || 'nenhuma'}`);
console.log(`   push handlers: ${['push', 'notificationclick', 'firebase-messaging-sw'].map((k) => `${k}=${(swtxt.match(new RegExp(k, 'g')) || []).length}`).join(' ')}`);
for (const rota of ['/firebase-messaging-sw.js', '/sw.js', '/manifest.webmanifest', '/manifest.json']) {
  const r = await fetch(ALVO + rota, { headers: { 'cache-control': 'no-cache' } });
  await r.text();
  console.log(`   ${rota}: HTTP ${r.status} ct=${r.headers.get('content-type')}`);
}
