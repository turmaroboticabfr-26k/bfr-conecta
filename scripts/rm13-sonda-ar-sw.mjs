// RM-1.3 sonda SOMENTE LEITURA do ar: o SW publicado hoje e identico a algum sw-v4.js do disco?
// Compara por md5 e por igualdade apos normalizar CRLF. Nunca imprime o corpo inteiro.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const md5 = (s) => createHash('md5').update(s).digest('hex');
const no = (s) => s.replace(/\r\n/g, '\n');
const cab = (s) => JSON.stringify(s.slice(0, 180));

const swTxt = no(await (await fetch(AR + '/sw-v4.js?v=45', { headers: { 'cache-control': 'no-cache' } })).text());
const html = await (await fetch(AR + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const fcm = await fetch(AR + '/firebase-messaging-sw.js', { headers: { 'cache-control': 'no-cache' } });
const fcmTxt = await fcm.text();

console.log(`SW do ar:      ${swTxt.length} chars md5=${md5(swTxt)}`);
for (const p of ['app/sw-v4.js', 'bfr-v116-src/sw-v4.js', 'bfr-v115-src/sw-v4.js',
  'bfr-candidata-v114-supervisao/sw-v4.js', '_v115-ar-assets/sw-v4.js']) {
  try {
    const d = readFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/' + p, 'utf8');
    console.log(`  ${p.padEnd(42)} ${no(d).length} chars md5=${md5(no(d))} identicoAoAr=${no(d) === swTxt}`);
  } catch { console.log(`  ${p} (ilegivel)`); }
}
console.log(`\nSW do ar: push=${(swTxt.match(/addEventListener\(['"]push['"]/g) || []).length} click=${(swTxt.match(/addEventListener\(['"]notificationclick['"]/g) || []).length} show=${(swTxt.match(/showNotification/g) || []).length} cache=${(swTxt.match(/bfr-conecta-v\d+/) || ['-'])[0]}`);
console.log(`HTML do ar: ${html.length} B md5=${md5(html)} registrar_sw=${(html.match(/sw-v4\.js\?v=\d+/g) || []).length} handler_push_no_html=${(html.match(/addEventListener\(['"]push['"]/g) || []).length} messaging_sw=${(html.match(/firebase-messaging-sw/g) || []).length} getToken=${(html.match(/getToken\(/g) || []).length} registerPushSubscription=${(html.match(/registerPushSubscription/g) || []).length}`);
console.log(`\n/firebase-messaging-sw.js: HTTP ${fcm.status} ct=${fcm.headers.get('content-type')} cf=${fcm.headers.get('cf-ray') ? 'sim' : 'nao'} bytes=${fcmTxt.length}`);
console.log(`  corpo (180 primeiros chars): ${cab(fcmTxt)}`);
console.log(`  he_pagina_de_erro=${/Error 1101|Internal Server Error|Cloudflare/i.test(fcmTxt)} he_html_do_app=${no(fcmTxt) === no(html.slice(0, fcmTxt.length))}`);
