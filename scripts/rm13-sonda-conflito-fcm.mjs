// RM-1.3: resolve a contradicao entre a memoria da publicacao (FCM embutido no worker)
// e o censo rm13 (rota_fcm 0 em todo worker-deploy-*). Somente-leitura: nada de escrita
// no ar, no banco ou em artefactos de deploy; so grava evidence/rm13-conflito-fcm.json.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const md5 = (b) => createHash('md5').update(b).digest('hex');
const txt = (p) => readFileSync(p).toString('utf8');
const out = { em: new Date().toISOString(), alvo: 'conflito FCM embutido x censo rm13', medido: {} };

// 1. O que a string "firebase-messaging" e' dentro do shell do ar: rota do SW ou config do Firebase?
const shellPath = 'ar-shell.html';
const shell = txt(shellPath);
out.medido.shell = {
  arquivo: shellPath,
  bytes: Buffer.byteLength(shell),
  md5: md5(Buffer.from(shell)),
  firebase_messaging_qquer: (shell.match(/firebase-messaging/g) || []).length,
  rota_sw_fcm: (shell.match(/firebase-messaging-sw\.js/g) || []).length,
  messagingSenderId: (shell.match(/messagingSenderId/g) || []).length,
  sw_v4: (shell.match(/sw-v4\.js/g) || []).length,
  contexto: [...shell.matchAll(/.{40}firebase-messaging.{40}/g)].map((m) => m[0]),
};

// 2. Os worker.mjs de todos os worker-deploy-*: a rota existe como literal, e em que forma?
out.linhagem = [];
for (const dir of readdirSync('.').filter((d) => /^worker-deploy-v\d/.test(d)).sort()) {
  const w = `${dir}/worker.mjs`;
  if (!existsSync(w)) { out.linhagem.push({ dir, erro: 'sem worker.mjs' }); continue; }
  const t = txt(w);
  const swDisk = `${dir}/public/sw-v4.js`;
  const fcmDisk = `${dir}/public/firebase-messaging-sw.js`;
  out.linhagem.push({
    dir,
    worker_bytes: Buffer.byteLength(t),
    worker_md5: md5(t),
    rota_fcm_literal: (t.match(/firebase-messaging/g) || []).length,
    sw_v4_literal: (t.match(/sw-v4\.js/g) || []).length,
    handler_push_no_worker: (t.match(/addEventListener\(['"]push['"]/g) || []).length,
    importScripts_no_worker: (t.match(/importScripts/g) || []).length,
    public_tem_fcm_sw: existsSync(fcmDisk),
    public_tem_sw_v4: existsSync(swDisk),
    public_sw_md5: existsSync(swDisk) ? md5(readFileSync(swDisk)) : null,
    public_sw_push: existsSync(swDisk) ? (txt(swDisk).match(/addEventListener\(['"]push['"]/g) || []).length : null,
    public_assets: readdirSync(`${dir}/public`).length,
  });
}

// 3. Os SW fora dos deploys (src/, app/, snapshot do ar): tamanho e handler.
const swCand = ['app/sw-v4.js', 'bfr-v115-src/sw-v4.js', 'bfr-v116-src/sw-v4.js', 'ar-sw-v113-live.js'];
out.sw_Extras = swCand.filter(existsSync).map((p) => {
  const t = txt(p);
  return { p, bytes: Buffer.byteLength(t), md5: md5(t), push: (t.match(/addEventListener\(['"]push['"]/g) || []).length, cache: (t.match(/bfr-conecta-v\d+/) || ['-'])[0] };
});

// 4. O que os diarios de publicacao da epoca dizem sobre a rota do FCM.
const diaries = [];
const walk = (dir, depth) => {
  if (depth > 2) return;
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    if (it.name === 'node_modules' || it.name.startsWith('.')) continue;
    const p = `${dir}/${it.name}`;
    if (it.isDirectory()) walk(p, depth + 1);
    else if (/audit-publicacao-v\d+.*\.json$/.test(it.name)) diaries.push(p);
  }
};
walk('.', 0);
out.diarios = diaries.sort().map((p) => {
  const t = txt(p);
  return {
    p,
    bytes: Buffer.byteLength(t),
    md5: md5(t),
    menciona_fcm: (t.match(/firebase-messaging/g) || []).length,
    menciona_fcfa8720: t.includes('fcfa8720'),
    menciona_e11fca19: t.includes('e11fca19'),
    menciona_2403: t.includes('2403') || t.includes('2.403'),
  };
});

writeFileSync('evidence/rm13-conflito-fcm.json', JSON.stringify(out, null, 2));
console.log('shell', JSON.stringify(out.medido.shell.rota_sw_fcm), 'firebase_messaging_qquer', out.medido.shell.firebase_messaging_qquer, 'messagingSenderId', out.medido.shell.messagingSenderId);
for (const c of out.medido.shell.contexto) console.log('  ctx:', c.replace(/\s+/g, ' '));
console.log('linhagem', out.linhagem.length, 'diretorios');
for (const l of out.linhagem) console.log(`  ${l.dir} rota_fcm=${l.rota_fcm_literal} sw_lit=${l.sw_v4_literal} push=${l.handler_push_no_worker} public_fcm=${l.public_tem_fcm_sw} assets=${l.public_assets}`);
console.log('SW extras', JSON.stringify(out.sw_Extras));
for (const d of out.diarios) console.log(`  diario ${d.p} fcm=${d.menciona_fcm} fcfa8720=${d.menciona_fcfa8720} e11fca19=${d.menciona_e11fca19} 2403=${d.menciona_2403}`);
console.log('RM13_CONFLITO_FCM_OK');
