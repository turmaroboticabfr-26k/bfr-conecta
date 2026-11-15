// RM-1.5 — gera a candidata do SW com ouvintes push/notificationclick ESCRITOS A MAO
// (sem importScripts: a CSP worker-src fica intacta e o gstatic nao entra no SW).
// Base: o SW VIVO da v121, extraido de worker-deploy-v121/worker.mjs (const SW = "..."),
// conferido contra a regua do diario esperado-v121.json (nunca dactilografada).
// NAO faz deploy. NAO sobrescreve nada. Artefactos:
//   bfr-candidata-v122-push-sw/sw-v4.js            (candidata, etiqueta v122)
//   bfr-candidata-v122-push-sw/sw-v4-reversa.js    (base v121, linhagem reversa)
//   bfr-candidata-v122-push-sw/portoes-v122-diary.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE_WORKER = `${dir}/worker-deploy-v121/worker.mjs`;
const ESPERADO = `${dir}/worker-deploy-v121/esperado-v121.json`;
const OUT = `${dir}/bfr-candidata-v122-push-sw`;
const LABEL_OLD = 'bfr-conecta-v121';
const LABEL_NEW = 'bfr-conecta-v122';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };
const count = (s, t) => s.split(t).length - 1;

// ---- reguas do diario (ler, nao dactilografar) ----
const exp = JSON.parse(fs.readFileSync(ESPERADO, 'utf8'));
const baseW = fs.readFileSync(BASE_WORKER, 'utf8');
if (md5(baseW) !== exp.workerMd5 || Buffer.byteLength(baseW) !== exp.workerBytes)
  die(`worker v121 md5 ${md5(baseW)}/${Buffer.byteLength(baseW)} != esperado ${exp.workerMd5}/${exp.workerBytes}`);

function unquote(src, i) {
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return { body: out, quoteEnd: i };
    if (c === '\\') { const n = src[i + 1]; out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n; i += 2; continue; }
    out += c; i++;
  }
  return null;
}
const m = baseW.match(/^const SW = ("(?:[^"\\]|\\.)*");$/m);
if (!m) die('const SW = nao localizada no worker v121');
const swBase = JSON.parse(m[1]);
if (md5(swBase) !== exp.swMd5 || Buffer.byteLength(swBase) !== exp.swBytes)
  die(`SW embed md5 ${md5(swBase)}/${Buffer.byteLength(swBase)} != esperado ${exp.swMd5}/${exp.swBytes}`);
if (count(swBase, LABEL_OLD) !== 1) die(`etiqueta ${LABEL_OLD} no SW base = ${count(swBase, LABEL_OLD)}, esperado 1`);

// ---- o hunk (ASCII, aspas simples, sem barra invertida: forma escapada == forma crua) ----
const hunk = `

// RM-1.5: ouvintes push/notificationclick escritos a mao, sem importScripts (a CSP worker-src
// fica intacta e o gstatic nao entra no SW). O cliente ja passa a registration do proprio
// /sw-v4.js ao getToken, por isso e este ficheiro que recebe o evento push.
// Payload FCM (webpush): { notification:{title,body,icon}, data:{...}, fcm_options:{link} }.
self.addEventListener('push', (event) => {
  let dados = {};
  try { dados = event.data && event.data.json ? event.data.json() : {}; } catch (e) { dados = {}; }
  if (!dados || typeof dados !== 'object') dados = {};
  const nota = dados.notification || {};
  const titulo = nota.title || dados.title || 'BFR Conecta';
  const link = (dados.fcm_options && dados.fcm_options.link) || nota.click_action || dados.click_action || '/';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: nota.body || dados.body || '',
    icon: nota.icon || dados.icon || '/bfr-app-logo.png',
    badge: '/bfr-app-logo.png',
    data: { url: link }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alvo = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const todas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of todas) {
      try { await c.navigate(alvo); await c.focus(); return; } catch (e) {}
    }
    return self.clients.openWindow(alvo);
  })());
});
`;

if (/[\\"]/.test(hunk)) die('hunk contem barra invertida ou aspas duplas (quebraria a forma escapada)');
const swNew = swBase.replace(LABEL_OLD, LABEL_NEW) + hunk;

// ---- portoes estruturais ----
const gates = [];
const gate = (nome, valor, esperado) => gates.push({ nome, valor, esperado, ok: valor === esperado });
gate('base_sw_md5_e_o_da_v121', md5(swBase), exp.swMd5);
gate('base_sw_bytes', Buffer.byteLength(swBase), exp.swBytes);
gate('base_sw_etiqueta_v121', count(swBase, LABEL_OLD), 1);
gate('base_sw_sem_ouvintes_push', count(swBase, "addEventListener('push'"), 0);
gate('base_sw_sem_ouvintes_notificationclick', count(swBase, "addEventListener('notificationclick'"), 0);
gate('nova_sw_etiqueta_v122', count(swNew, LABEL_NEW), 1);
gate('nova_sw_sem_etiqueta_v121', count(swNew, LABEL_OLD), 0);
gate('nova_sw_um_ouvinte_push', count(swNew, "addEventListener('push'"), 1);
gate('nova_sw_um_ouvinte_notificationclick', count(swNew, "addEventListener('notificationclick'"), 1);
// chamada real (com parentese): o comentario do hunk cita a palavra, mas nao invoca
gate('nova_sw_sem_chamada_importScripts', count(swNew, 'importScripts('), 0);
gate('nova_sw_showNotification_uma', count(swNew, 'showNotification('), 1);
gate('nova_sw_openWindow_uma', count(swNew, 'openWindow('), 1);
gate('hunk_so_acrescenta', swNew.startsWith(swBase.replace(LABEL_OLD, LABEL_NEW)), true);
gate('fetch_install_activate_intactos',
  swNew.slice(0, swBase.length - LABEL_OLD.length + LABEL_NEW.length) === swBase.replace(LABEL_OLD, LABEL_NEW), true);

// sintaxe do SW novo
const tmp = path.join(os.tmpdir(), `checa-sw-v122-${process.pid}.js`);
fs.writeFileSync(tmp, swNew, 'utf8');
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
fs.unlinkSync(tmp);
gate('sintaxe_sw_novo', chk.status, 0);
if (chk.status !== 0) console.log((chk.stderr || '').slice(0, 300));

const falhas = gates.filter(g => !g.ok);
for (const g of gates) console.log(`  ${g.ok ? 'OK' : 'FALHA'}  ${g.nome} valor=${g.valor} esperado=${g.esperado}`);
if (falhas.length) die(`${falhas.length} portao(s) vermelho(s)`);

// ---- gravacao ----
if (fs.existsSync(OUT)) die(`${OUT} ja existe (nao sobrescrever)`);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/sw-v4.js`, swNew, 'utf8');
fs.writeFileSync(`${OUT}/sw-v4-reversa.js`, swBase, 'utf8');
fs.writeFileSync(`${OUT}/portoes-v122-diary.json`, JSON.stringify({
  em: new Date().toISOString(),
  verdict: 'V122_SW_ESTRUTURAL_OK',
  published: false,
  base: { workerMd5: exp.workerMd5, workerBytes: exp.workerBytes, swMd5: md5(swBase), swBytes: Buffer.byteLength(swBase) },
  candidata: { swMd5: md5(swNew), swBytes: Buffer.byteLength(swNew), deltaBytes: Buffer.byteLength(swNew) - Buffer.byteLength(swBase) },
  hunk: { bytes: Buffer.byteLength(hunk), rotulos: ['RM-1.5', 'sem importScripts', 'label v121->v122'] },
  portoes: gates,
  bancada: 'pendente (scripts/rm15-bancada-push.mjs)',
}, null, 2));

console.log(`\nbase    sw ${Buffer.byteLength(swBase)} B md5 ${md5(swBase)} (v121 viva)`);
console.log(`candidata sw ${Buffer.byteLength(swNew)} B md5 ${md5(swNew)} (delta +${Buffer.byteLength(hunk)})`);
console.log(`gravado em ${OUT} (SEM deploy)`);
