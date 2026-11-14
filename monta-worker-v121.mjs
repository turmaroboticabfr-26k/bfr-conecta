// PEN-33 / RM-1.8 — monta worker-deploy-v121 por substituicao cirurgica dos DOIS embeds
// (HTML inteira + etiqueta CACHE do SW) dentro de uma copia do worker-deploy-v120-404.
// A base e o worker do 404 (RM-6.9) de proposito: o handler nao pode perder-se.
// NAO faz deploy. NAO sobrescreve nada que ja exista.
// Reguas lidas dos diarios (nunca dactilografadas): evidence/v121-preflight-14-11.json +
// bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json.
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${dir}/worker-deploy-v120-404`;
const OUT = `${dir}/worker-deploy-v121`;
const candPath = `${dir}/bfr-candidata-v121-rotulos-supervisor/index.html`;
const PRE = `${dir}/evidence/v121-preflight-14-11.json`;
const CAND_DIARY = `${dir}/bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json`;
const LABEL_OLD = 'bfr-conecta-v120';
const LABEL_NEW = 'bfr-conecta-v121';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };
const count = (s, t) => s.split(t).length - 1;
const esc = s => JSON.stringify(s).slice(1, -1);   // JSON escapado SEM as aspas
const parseRegua = s => { const m = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return m ? { md5: m[1], bytes: +m[2] } : null; };

if (fs.existsSync(OUT)) die(`${OUT} ja existe (nao sobrescrever)`);
if (!fs.existsSync(PRE)) die(`preflight ainda nao gravado: ${PRE}`);

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

// ---------- reguas derivadas dos diarios ----------
const pre = JSON.parse(fs.readFileSync(PRE, 'utf8'));
if (pre.veredito !== 'V121_PREFLIGHT_OK' || pre.totais?.vermelhos !== 0) die(`preflight nao esta verde (${pre.veredito}, vermelhos=${pre.totais?.vermelhos})`);
const idadeMin = Math.round((Date.now() - Date.parse(pre.em)) / 60000);
if (idadeMin > 90) die(`preflight velha demais: ${idadeMin} min`);
const cd = JSON.parse(fs.readFileSync(CAND_DIARY, 'utf8'));
if (cd.verdict !== 'ROTULOS_OK' || cd.published !== false) die(`diario da candidata nao autoriza (${cd.verdict}, published=${cd.published})`);
const R = {
  workerBase: parseRegua(pre.reguas.ar.worker ? `${pre.reguas.ar.worker.md5} (${pre.reguas.ar.worker.bytes} B)` : ''),
  shellAr: parseRegua(`${pre.reguas.ar.shell.md5} (${pre.reguas.ar.shell.bytes} B)`),
  swAr: parseRegua(`${pre.reguas.ar.sw.md5} (${pre.reguas.ar.sw.bytes} B)`),
  cand: parseRegua(`${pre.reguas.candidata.md5} (${pre.reguas.candidata.bytes} B)`),
  cacheLabelAr: pre.reguas.ar.cache,
};
if (R.cacheLabelAr !== LABEL_OLD) die(`etiqueta do ar ${R.cacheLabelAr} != LABEL_OLD ${LABEL_OLD}`);
if (pre.reguas.candidata.delta !== 76) die(`delta da candidata no diario = ${pre.reguas.candidata.delta}, esperado 76`);
const h1 = (cd.hunks || [])[0] || {};
const parNovo = `education_supervisor:['${h1.rotulo_lido_0}','${h1.rotulo_lido_1}']`;
if (!h1.rotulo_lido_0 || !h1.rotulo_lido_1) die('rotais do hunk H nao lidos no diario');

// ---------- portoes de entrada ----------
const baseW = fs.readFileSync(`${BASE}/worker.mjs`, 'utf8');
const cand = fs.readFileSync(candPath, 'utf8');
if (md5(baseW) !== R.workerBase.md5) die(`worker base md5 ${md5(baseW)} != regua do 404 ${R.workerBase.md5}`);
if (Buffer.byteLength(baseW) !== R.workerBase.bytes) die(`worker base bytes ${Buffer.byteLength(baseW)} != ${R.workerBase.bytes}`);
if (md5(cand) !== R.cand.md5) die(`candidata md5 ${md5(cand)} != regua ${R.cand.md5}`);
if (Buffer.byteLength(cand) !== R.cand.bytes) die(`candidata bytes ${Buffer.byteLength(cand)} != ${R.cand.bytes}`);
if (count(cand, parNovo) !== 1) die(`par novo do accountLabels no corpo = ${count(cand, parNovo)}, esperado 1`);

const bHtml = grab(baseW, 'const HTML = ');
const bSw = grab(baseW, 'const SW = ');
if (!bHtml || !bSw) die('embeds nao localizados no worker base');
if (md5(bHtml.body) !== R.shellAr.md5) die(`HTML embed base md5 ${md5(bHtml.body)} != shell do ar ${R.shellAr.md5}`);
if (Buffer.byteLength(bHtml.body) !== R.shellAr.bytes) die(`HTML embed base bytes ${Buffer.byteLength(bHtml.body)} != ${R.shellAr.bytes}`);
if (md5(bSw.body) !== R.swAr.md5) die(`SW embed base md5 ${md5(bSw.body)} != regua ${R.swAr.md5}`);
if (Buffer.byteLength(bSw.body) !== R.swAr.bytes) die(`SW embed base bytes ${Buffer.byteLength(bSw.body)} != ${R.swAr.bytes}`);
if (count(baseW, LABEL_OLD) !== 1) die(`etiqueta ${LABEL_OLD} no worker base = ${count(baseW, LABEL_OLD)}, esperado 1 (so o SW)`);
if (count(baseW, LABEL_NEW) !== 0) die(`etiqueta ${LABEL_NEW} ja existe no worker base`);
if (count(cand, LABEL_OLD) !== 0 || count(cand, LABEL_NEW) !== 0) die(`candidata contem etiqueta de cache (${LABEL_OLD}=${count(cand, LABEL_OLD)} ${LABEL_NEW}=${count(cand, LABEL_NEW)})`);

// o handler do 404 tem de estar na base (PEN-27 nao pode regredir)
const handlerNaBase = count(baseW, 'env.ASSETS.fetch(request)') === 1 && !/ASSETS\.fetch\(\s*assetUrl/.test(baseW)
  && count(baseW, "'Not found', { status: 404") === 2 && count(baseW, 'asset.status !== 404') === 1
  && count(baseW, 'if (!env.ASSETS)') === 1 && count(baseW, 'const NOFOUNDR') === 1;
if (!handlerNaBase) die(`handler do 404 nao esta intacto na base: request=${count(baseW, 'env.ASSETS.fetch(request)')} respostas=${count(baseW, "'Not found', { status: 404")}`);

// ---------- cirurgia ----------
const order = [bSw, bHtml].sort((a, b) => a.markerAt - b.markerAt);
const parts = order.map((e, i) => ({
  start: e.quoteStart + 1,
  end: e.quoteEnd,
  isHtml: e.markerAt === bHtml.markerAt,
  next: order[i + 1] ? order[i + 1].markerAt : baseW.length,
}));

const pieces = [];
let cursor = 0;
for (const p of parts) {
  pieces.push(baseW.slice(cursor, p.start));
  if (p.isHtml) {
    pieces.push(esc(cand));
    pieces.push(baseW.slice(p.end));
    cursor = baseW.length;
  } else {
    if (count(bSw.body, LABEL_OLD) !== 1) die(`etiqueta no SW base = ${count(bSw.body, LABEL_OLD)}, esperado 1`);
    const swNew = bSw.body.replace(LABEL_OLD, LABEL_NEW);
    if (count(swNew, LABEL_NEW) !== 1 || count(swNew, LABEL_OLD) !== 0) die('etiqueta do SW nao trocou de forma limpa');
    if (Buffer.byteLength(swNew) !== Buffer.byteLength(bSw.body)) die('troca de etiqueta mudou o tamanho do SW');
    pieces.push(esc(swNew));
    pieces.push(baseW.slice(p.end, p.next));
    cursor = p.next;
  }
}
if (cursor !== baseW.length) die('splice inconsistente');
const worker = pieces.join('');

// ---------- portoes de saida ----------
const nHtml = grab(worker, 'const HTML = ');
const nSw = grab(worker, 'const SW = ');
if (!nHtml || !nSw) die('embeds nao localizados no worker novo');
if (nHtml.body !== cand) die('HTML embed novo != candidata (texto)');
if (md5(nHtml.body) !== md5(cand)) die('HTML embed novo md5 != candidata');
if (Buffer.byteLength(nSw.body) !== R.swAr.bytes) die(`SW embed novo bytes ${Buffer.byteLength(nSw.body)} != ${R.swAr.bytes}`);
if (md5(nSw.body) === R.swAr.md5) die('SW embed novo IDENTICO ao do ar: a etiqueta nao mudou');
if (count(nSw.body, LABEL_NEW) !== 1 || count(nSw.body, LABEL_OLD) !== 0) die('SW novo com etiqueta errada');
if (!new RegExp(`const CACHE = '${LABEL_NEW}';`).test(nSw.body)) die(`const CACHE = '${LABEL_NEW}'; ausente no SW novo`);
if (count(nHtml.body, parNovo) !== 1) die('par do accountLabels nao esta no HTML embed servido');
if (count(worker, LABEL_NEW) !== 1) die(`etiqueta ${LABEL_NEW} no worker inteiro = ${count(worker, LABEL_NEW)}, esperado 1`);

const delta = Buffer.byteLength(worker) - Buffer.byteLength(baseW);
if (delta !== 76) die(`delta do worker = ${delta}, esperado +76 (so o HTML da candidata v121)`);

// segmentos fora dos embeds byte a byte (e aqui que o handler do 404 mora)
function segs(src) {
  const ps = [grab(src, 'const SW = '), grab(src, 'const HTML = ')].filter(Boolean).sort((a, b) => a.markerAt - b.markerAt);
  return { prefixo: src.slice(0, ps[0].markerAt), meio: src.slice(ps[0].quoteEnd + 1, ps[1].markerAt), cauda: src.slice(ps[1].quoteEnd + 1) };
}
const sB = segs(baseW), sN = segs(worker);
if (sB.prefixo !== sN.prefixo || sB.meio !== sN.meio || sB.cauda !== sN.cauda)
  die(`segmentos fora dos embeds mudaram: prefixo ${sB.prefixo === sN.prefixo} meio ${sB.meio === sN.meio} cauda ${sB.cauda === sN.cauda}`);
if (md5(Buffer.from(sN.cauda, 'utf8')) !== md5(Buffer.from(sB.cauda, 'utf8'))) die('cauda (handler do 404) divergente');

// CSP e rotas intocadas
const cspB = grab(baseW, 'const CSP = '), cspN = grab(worker, 'const CSP = ');
if (!cspB || !cspN || cspB.body !== cspN.body) die('const CSP = mudou');
if (count(worker, "'content-security-policy': CSP") !== count(baseW, "'content-security-policy': CSP")) die('emissao do header CSP mudou');

// precache alinhado com o que a HTML pede (armadilha documentada)
const precache = (nSw.body.match(/const PRECACHE_PATHS = \[([^\]]*)\]/) || ['', ''])[1]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(s => s.includes('?v='));
const misv = precache.filter(p => !cand.includes(p.replace(/^\//, '')));
if (misv.length) die(`precache desalinhado com a candidata: ${misv.join(', ')}`);

// sintaxe do worker montado: node --cheque um copia temporaria (mesma meta ESM do .mjs)
const tmp = path.join(os.tmpdir(), `checa-worker-v121-${process.pid}.mjs`);
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
// shell v120 em disco para o portao de linhagem reversa do pos-deploy
fs.writeFileSync(`${OUT}/base-v120-shell.html`, bHtml.body, 'utf8');
fs.writeFileSync(`${OUT}/sw-v120-embed.js`, bSw.body, 'utf8');
fs.writeFileSync(`${OUT}/esperado-v121.json`, JSON.stringify({
  workerMd5: md5(worker), workerBytes: Buffer.byteLength(worker),
  swMd5: md5(nSw.body), swBytes: Buffer.byteLength(nSw.body),
  htmlMd5: md5(cand), htmlBytes: Buffer.byteLength(cand),
  cacheLabel: LABEL_NEW,
  baseWorkerMd5: md5(baseW), baseWorkerBytes: Buffer.byteLength(baseW),
  baseShellMd5: md5(bHtml.body), baseShellBytes: Buffer.byteLength(bHtml.body),
  baseSwMd5: md5(bSw.body), baseSwBytes: Buffer.byteLength(bSw.body),
  deltaWorkerBytes: delta, precacheAlinhado: misv.length, assetsCopiados: assets.length,
  origemReguas: ['evidence/v121-preflight-14-11.json', 'bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json'],
  preflightEm: pre.em, ok_literal: 'publicar v121',
}, null, 2));

console.log(`worker base     ${Buffer.byteLength(baseW)} B md5 ${md5(baseW)} (v120-404)`);
console.log(`worker v121     ${Buffer.byteLength(worker)} B md5 ${md5(worker)} (delta +${delta})`);
console.log(`HTML embed      ${Buffer.byteLength(cand)} B md5 ${md5(cand)} (candidata v121)`);
console.log(`SW embed        ${Buffer.byteLength(nSw.body)} B md5 ${md5(nSw.body)} CACHE=${LABEL_NEW}`);
console.log(`handler 404     intacto na cauda (md5 ${md5(Buffer.from(sN.cauda, 'utf8'))})`);
console.log(`precache        ${precache.length} caminhos alinhados | assets ${assets.length} byte a byte | wrangler.toml copiado`);
console.log(`linhagem        base-v120-shell.html + sw-v120-embed.js gravados`);
console.log(`\ngravado em ${OUT} (SEM deploy)`);
