// PEN/RM-1.5 — monta worker-deploy-v122-push por substituicao cirurgica do embed do SW
// dentro de uma copia do worker-deploy-v121. SO o SW muda (candidata v122 com ouvintes
// push/notificationclick): a HTML fica byte a byte a da v121, o handler do 404 nao pode perder-se.
// NAO faz deploy. NAO sobrescreve nada que ja exista.
// Reguas lidas dos diarios (nunca dactilografadas): esperado-v121.json +
// bfr-candidata-v122-push-sw/portoes-v122-diary.json + portoes-v122-bancada.json.
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${dir}/worker-deploy-v121`;
const OUT = `${dir}/worker-deploy-v122-push`;
const candPath = `${dir}/bfr-candidata-v122-push-sw/sw-v4.js`;
const CAND_DIARY = `${dir}/bfr-candidata-v122-push-sw/portoes-v122-diary.json`;
const BANCADA = `${dir}/bfr-candidata-v122-push-sw/portoes-v122-bancada.json`;
const LABEL_OLD = 'bfr-conecta-v121';
const LABEL_NEW = 'bfr-conecta-v122';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };
const count = (s, t) => s.split(t).length - 1;
const esc = s => JSON.stringify(s).slice(1, -1);   // JSON escapado SEM as aspas

function unquote(src, i) {
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return { body: out, quoteEnd: i };
    if (c === '\\') {
      const n = src[i + 1];
      out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
      i += 2; continue;
    }
    out += c; i++;
  }
  return null;
}
function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const q = src.indexOf('"', k + marker.length);
  const u = unquote(src, q + 1);
  return u ? { ...u, markerAt: k, quoteStart: q } : null;
}

if (fs.existsSync(OUT)) die(`${OUT} ja existe (nao sobrescrever)`);

// ---------- reguas dos diarios ----------
const exp = JSON.parse(fs.readFileSync(`${BASE}/esperado-v121.json`, 'utf8'));
if (exp.cacheLabel !== LABEL_OLD) die(`etiqueta do esperado ${exp.cacheLabel} != LABEL_OLD ${LABEL_OLD}`);
const cd = JSON.parse(fs.readFileSync(CAND_DIARY, 'utf8'));
if (cd.verdict !== 'V122_SW_ESTRUTURAL_OK' || cd.published !== false) die(`diario da candidata nao autoriza (${cd.verdict}, published=${cd.published})`);
const bd = JSON.parse(fs.readFileSync(BANCADA, 'utf8'));
if (bd.verdict !== 'V122_BANCADA_OK' || bd.published !== false) die(`bancada nao autoriza (${bd.verdict}, published=${bd.published})`);

// ---------- portoes de entrada ----------
const baseW = fs.readFileSync(`${BASE}/worker.mjs`, 'utf8');
const cand = fs.readFileSync(candPath, 'utf8');
if (md5(baseW) !== exp.workerMd5 || Buffer.byteLength(baseW) !== exp.workerBytes) die(`worker base md5 ${md5(baseW)}/${Buffer.byteLength(baseW)} != esperado ${exp.workerMd5}/${exp.workerBytes}`);
if (md5(cand) !== cd.candidata.swMd5 || Buffer.byteLength(cand) !== cd.candidata.swBytes) die(`candidata md5 ${md5(cand)}/${Buffer.byteLength(cand)} != diario ${cd.candidata.swMd5}/${cd.candidata.swBytes}`);
if (count(cand, LABEL_OLD) !== 0) die(`candidata contem etiqueta ${LABEL_OLD}`);
if (count(cand, LABEL_NEW) !== 1) die(`candidata sem etiqueta ${LABEL_NEW} unica: ${count(cand, LABEL_NEW)}`);
if (count(baseW, LABEL_OLD) !== 1) die(`etiqueta ${LABEL_OLD} no worker base = ${count(baseW, LABEL_OLD)}, esperado 1 (so o SW)`);
if (count(baseW, LABEL_NEW) !== 0) die(`etiqueta ${LABEL_NEW} ja existe no worker base`);

const bHtml = grab(baseW, 'const HTML = ');
const bSw = grab(baseW, 'const SW = ');
if (!bHtml || !bSw) die('embeds nao localizados no worker base');
if (md5(bHtml.body) !== exp.htmlMd5 || Buffer.byteLength(bHtml.body) !== exp.htmlBytes) die(`HTML embed base md5 ${md5(bHtml.body)}/${Buffer.byteLength(bHtml.body)} != esperado ${exp.htmlMd5}/${exp.htmlBytes}`);
if (md5(bSw.body) !== exp.swMd5 || Buffer.byteLength(bSw.body) !== exp.swBytes) die(`SW embed base md5 ${md5(bSw.body)}/${Buffer.byteLength(bSw.body)} != esperado ${exp.swMd5}/${exp.swBytes}`);

// o handler do 404 tem de estar na base (PEN-27 nao pode regredir)
const handlerNaBase = count(baseW, 'env.ASSETS.fetch(request)') === 1 && !/ASSETS\.fetch\(\s*assetUrl/.test(baseW)
  && count(baseW, "'Not found', { status: 404") === 2 && count(baseW, 'asset.status !== 404') === 1
  && count(baseW, 'if (!env.ASSETS)') === 1 && count(baseW, 'const NOFOUNDR') === 1;
if (!handlerNaBase) die(`handler do 404 nao esta intacto na base: request=${count(baseW, 'env.ASSETS.fetch(request)')} respostas=${count(baseW, "'Not found', { status: 404")}`);

// a rota que serve o SW embebido tem de estar na base
const rotaSwNaBase = count(baseW, "url.pathname === '/sw.js' || url.pathname === '/sw-v4.js'") === 1
  && count(baseW, 'return new Response(SW, {') === 1
  && count(baseW, "'application/javascript; charset=utf-8'") >= 1;
if (!rotaSwNaBase) die('rota do SW embebido nao esta intacta na base');

// ---------- cirurgia: so o embed do SW ----------
const worker = baseW.slice(0, bSw.quoteStart + 1) + esc(cand) + baseW.slice(bSw.quoteEnd);

// ---------- portoes de saida ----------
const nSw = grab(worker, 'const SW = ');
const nHtml = grab(worker, 'const HTML = ');
if (!nSw || !nHtml) die('embeds nao localizados no worker novo');
if (nSw.body !== cand) die('SW embed novo != candidata (texto)');
if (md5(nSw.body) !== md5(cand)) die('SW embed novo md5 != candidata');
if (nHtml.body !== bHtml.body || md5(nHtml.body) !== exp.htmlMd5) die('HTML embed mudou');
if (count(worker, LABEL_NEW) !== 1) die(`etiqueta ${LABEL_NEW} no worker inteiro = ${count(worker, LABEL_NEW)}, esperado 1`);
if (count(worker, LABEL_OLD) !== 0) die(`etiqueta ${LABEL_OLD} ainda no worker inteiro = ${count(worker, LABEL_OLD)}`);

const delta = Buffer.byteLength(worker) - Buffer.byteLength(baseW);
// o delta do worker e o delta da forma ESCAPADA do embed (newlines viram \n), nao do SW cru
const escDelta = Buffer.byteLength(esc(cand)) - Buffer.byteLength(esc(bSw.body));
if (delta !== escDelta) die(`delta do worker = ${delta}, esperado ${escDelta} (so o SW, forma escapada)`);

// segmentos fora dos embeds byte a byte (e aqui que o handler do 404 mora)
function segs(src) {
  const ps = [grab(src, 'const SW = '), grab(src, 'const HTML = ')].filter(Boolean).sort((a, b) => a.markerAt - b.markerAt);
  return { prefixo: src.slice(0, ps[0].markerAt), meio: src.slice(ps[0].quoteEnd + 1, ps[1].markerAt), cauda: src.slice(ps[1].quoteEnd + 1) };
}
const sB = segs(baseW), sN = segs(worker);
if (sB.prefixo !== sN.prefixo || sB.meio !== sN.meio || sB.cauda !== sN.cauda)
  die(`segmentos fora dos embeds mudaram: prefixo ${sB.prefixo === sN.prefixo} meio ${sB.meio === sN.meio} cauda ${sB.cauda === sN.cauda}`);

// CSP intocada
const cspB = grab(baseW, 'const CSP = '), cspN = grab(worker, 'const CSP = ');
if (!cspB || !cspN || cspB.body !== cspN.body) die('const CSP = mudou');
if (count(worker, "'content-security-policy': CSP") !== count(baseW, "'content-security-policy': CSP")) die('emissao do header CSP mudou');

// precache alinhado com o que a HTML pede (armadilha documentada)
const precache = (nSw.body.match(/const PRECACHE_PATHS = \[([^\]]*)\]/) || ['', ''])[1]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(s => s.includes('?v='));
const misv = precache.filter(p => !nHtml.body.includes(p.replace(/^\//, '')));
if (misv.length) die(`precache desalinhado com a HTML: ${misv.join(', ')}`);

// sintaxe do worker montado: node --check numa copia temporaria (mesma meta ESM do .mjs)
const tmp = path.join(os.tmpdir(), `checa-worker-v122-${process.pid}.mjs`);
fs.writeFileSync(tmp, worker, 'utf8');
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
fs.unlinkSync(tmp);
if (chk.status !== 0) die(`worker montado nao parseia: ${(chk.stderr || '').slice(0, 300)}`);

// ---------- gravacao ----------
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/worker.mjs`, worker, 'utf8');
fs.copyFileSync(`${BASE}/wrangler.toml`, `${OUT}/wrangler.toml`);
fs.mkdirSync(`${OUT}/public`, { recursive: true });
const assets = fs.readdirSync(`${BASE}/public`).sort();
for (const a of assets) fs.copyFileSync(`${BASE}/public/${a}`, `${OUT}/public/${a}`);
const mism = assets.filter(a => md5(fs.readFileSync(`${BASE}/public/${a}`)) !== md5(fs.readFileSync(`${OUT}/public/${a}`)));
if (mism.length) die(`assets copiados divergentes: ${mism.join(', ')}`);
// SW v121 em disco para o portao de linhagem reversa do pos-deploy
fs.writeFileSync(`${OUT}/sw-v121-embed.js`, bSw.body, 'utf8');
fs.writeFileSync(`${OUT}/esperado-v122.json`, JSON.stringify({
  workerMd5: md5(worker), workerBytes: Buffer.byteLength(worker),
  swMd5: md5(nSw.body), swBytes: Buffer.byteLength(nSw.body),
  htmlMd5: md5(nHtml.body), htmlBytes: Buffer.byteLength(nHtml.body),
  cacheLabel: LABEL_NEW,
  baseWorkerMd5: md5(baseW), baseWorkerBytes: Buffer.byteLength(baseW),
  baseSwMd5: md5(bSw.body), baseSwBytes: Buffer.byteLength(bSw.body),
  baseHtmlMd5: md5(bHtml.body), baseHtmlBytes: Buffer.byteLength(bHtml.body),
  deltaWorkerBytes: delta, precacheAlinhado: misv.length, assetsCopiados: assets.length,
  origemReguas: ['worker-deploy-v121/esperado-v121.json', 'bfr-candidata-v122-push-sw/portoes-v122-diary.json', 'bfr-candidata-v122-push-sw/portoes-v122-bancada.json'],
  ok_literal: 'publicar v122',
}, null, 2));

console.log(`worker base     ${Buffer.byteLength(baseW)} B md5 ${md5(baseW)} (v121)`);
console.log(`worker v122     ${Buffer.byteLength(worker)} B md5 ${md5(worker)} (delta +${delta})`);
console.log(`SW embed        ${Buffer.byteLength(nSw.body)} B md5 ${md5(nSw.body)} CACHE=${LABEL_NEW}`);
console.log(`HTML embed      ${Buffer.byteLength(nHtml.body)} B md5 ${md5(nHtml.body)} (identica a v121)`);
console.log(`handler 404     intacto na cauda | rota do SW embebido intacta | CSP intacta`);
console.log(`precache        ${precache.length} caminhos alinhados | assets ${assets.length} byte a byte | wrangler.toml copiado`);
console.log(`\ngravado em ${OUT} (SEM deploy)`);
