// RM-1.7 / PEN-32 — monta worker-deploy-v120 por substituicao cirurgica dos DOIS embeds
// (HTML inteiro + etiqueta CACHE do SW) dentro de uma copia do worker-deploy-v119.
// NAO faz deploy. NAO sobrescreve nada que ja exista.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${dir}/worker-deploy-v119`;
const OUT = `${dir}/worker-deploy-v120`;
const candPath = `${dir}/bfr-candidata-v120-setrole-supervisor/index.html`;
const LABEL_OLD = 'bfr-conecta-v119';
const LABEL_NEW = 'bfr-conecta-v120';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };
const count = (s, t) => s.split(t).length - 1;
// conteudo JSON escapado SEM as aspas (o worker ja tem as aspas do embed)
const esc = s => JSON.stringify(s).slice(1, -1);

if (fs.existsSync(OUT)) die(`${OUT} ja existe (nao sobrescrever)`);

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

// ---------- portoes de entrada ----------
const baseW = fs.readFileSync(`${BASE}/worker.mjs`, 'utf8');
const cand = fs.readFileSync(candPath, 'utf8');
if (md5(baseW) !== 'c41eef045d0110124e55d28304a99898') die(`worker base md5 ${md5(baseW)} != regua v119`);
if (Buffer.byteLength(baseW) !== 3550715) die(`worker base bytes ${Buffer.byteLength(baseW)} != 3550715`);
if (md5(cand) !== 'a9a76d0e338c2a539135bccce23111b4') die(`candidata md5 ${md5(cand)} != regua v120`);
if (Buffer.byteLength(cand) !== 3489649) die(`candidata bytes ${Buffer.byteLength(cand)} != 3489649`);

const bHtml = grab(baseW, 'const HTML = ');
const bSw = grab(baseW, 'const SW = ');
if (!bHtml || !bSw) die('embeds nao localizados no worker base');
if (md5(bHtml.body) !== 'a1969cdf023042e7d2a91e7ed9333a05') die(`HTML embed base md5 ${md5(bHtml.body)} != regua da shell v119`);
if (Buffer.byteLength(bHtml.body) !== 3489474) die(`HTML embed base bytes ${Buffer.byteLength(bHtml.body)} != 3489474`);
if (md5(bSw.body) !== '46dfdebbecd3da5f0794f85276179b76') die(`SW embed base md5 ${md5(bSw.body)} != regua`);
if (Buffer.byteLength(bSw.body) !== 3586) die(`SW embed base bytes ${Buffer.byteLength(bSw.body)} != 3586`);
if (count(baseW, LABEL_OLD) !== 1) die(`etiqueta ${LABEL_OLD} no worker base = ${count(baseW, LABEL_OLD)}, esperado 1 (so o SW)`);
if (count(baseW, LABEL_NEW) !== 0) die(`etiqueta ${LABEL_NEW} ja existe no worker base`);
if (count(cand, LABEL_OLD) !== 0 || count(cand, LABEL_NEW) !== 0) die(`candidata contem etiqueta de cache (v119=${count(cand, LABEL_OLD)} v120=${count(cand, LABEL_NEW)})`);

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
    const swNew = bSw.body.replace(LABEL_OLD, LABEL_NEW);
    if (count(bSw.body, LABEL_OLD) !== 1) die(`etiqueta no SW base = ${count(bSw.body, LABEL_OLD)}, esperado 1`);
    if (count(swNew, LABEL_NEW) !== 1 || count(swNew, LABEL_OLD) !== 0) die('etiqueta do SW nao trocou de forma limpa');
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
if (Buffer.byteLength(nSw.body) !== 3586) die(`SW embed novo bytes ${Buffer.byteLength(nSw.body)} != 3586`);
if (count(nSw.body, LABEL_NEW) !== 1 || count(nSw.body, LABEL_OLD) !== 0) die('SW novo com etiqueta errada');
if (!/const CACHE = 'bfr-conecta-v120';/.test(nSw.body)) die("const CACHE = 'bfr-conecta-v120'; ausente no SW novo");

const delta = Buffer.byteLength(worker) - Buffer.byteLength(baseW);
if (delta !== 175) die(`delta do worker = ${delta}, esperado +175 (so o HTML da candidata)`);

// segmentos fora dos embeds byte a byte
function segs(src) {
  const ps = [grab(src, 'const SW = '), grab(src, 'const HTML = ')].filter(Boolean).sort((a, b) => a.markerAt - b.markerAt);
  return {
    prefixo: src.slice(0, ps[0].markerAt),
    meio: src.slice(ps[0].quoteEnd + 1, ps[1].markerAt),
    cauda: src.slice(ps[1].quoteEnd + 1),
  };
}
const sB = segs(baseW), sN = segs(worker);
if (sB.prefixo !== sN.prefixo || sB.meio !== sN.meio || sB.cauda !== sN.cauda)
  die(`segmentos fora dos embeds mudaram: prefixo ${sB.prefixo === sN.prefixo} meio ${sB.meio === sN.meio} cauda ${sB.cauda === sN.cauda}`);

// CSP e rotas intocadas
const cspB = grab(baseW, 'const CSP = ');
const cspN = grab(worker, 'const CSP = ');
if (!cspB || !cspN || cspB.body !== cspN.body) die('const CSP = mudou');
if (count(worker, /'content-security-policy': CSP/g) !== count(baseW, /'content-security-policy': CSP/g)) die('emissao do header CSP mudou');

// precache alinhado com o que a HTML pede (armadilha documentada)
const precache = (nSw.body.match(/const PRECACHE_PATHS = \[([^\]]*)\]/) || ['', ''])[1]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(s => s.includes('?v='));
const misv = precache.filter(p => !cand.includes(p.replace(/^\//, '')));
if (misv.length) die(`precache desalinhado com a candidata: ${misv.join(', ')}`);

// ---------- gravacao ----------
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/worker.mjs`, worker, 'utf8');
fs.copyFileSync(`${BASE}/wrangler.toml`, `${OUT}/wrangler.toml`);
fs.mkdirSync(`${OUT}/public`, { recursive: true });
const assets = fs.readdirSync(`${BASE}/public`).sort();
for (const a of assets) fs.copyFileSync(`${BASE}/public/${a}`, `${OUT}/public/${a}`);
const mism = assets.filter(a => md5(fs.readFileSync(`${BASE}/public/${a}`)) !== md5(fs.readFileSync(`${OUT}/public/${a}`)));
if (mism.length) die(`assets copiados divergentes: ${mism.join(', ')}`);
// shell v119 em disco para o portao de linhagem reversa do pos-deploy
fs.writeFileSync(`${OUT}/base-v119-shell.html`, bHtml.body, 'utf8');
fs.writeFileSync(`${OUT}/esperado-v120.json`, JSON.stringify({
  workerMd5: md5(worker), workerBytes: Buffer.byteLength(worker),
  swMd5: md5(nSw.body), swBytes: Buffer.byteLength(nSw.body),
  htmlMd5: md5(cand), htmlBytes: Buffer.byteLength(cand),
  cacheLabel: 'bfr-conecta-v120',
  baseWorkerMd5: md5(baseW), baseWorkerBytes: Buffer.byteLength(baseW),
}, null, 2));

console.log(`worker base    ${Buffer.byteLength(baseW)} B md5 ${md5(baseW)}`);
console.log(`worker v120    ${Buffer.byteLength(worker)} B md5 ${md5(worker)} (delta +${delta})`);
console.log(`HTML embed     ${Buffer.byteLength(cand)} B md5 ${md5(cand)} (candidata v120)`);
console.log(`SW embed       ${Buffer.byteLength(nSw.body)} B md5 ${md5(nSw.body)} CACHE=bfr-conecta-v120`);
console.log(`assets         ${assets.length} copiados byte a byte | wrangler.toml copiado`);
console.log(`shell v119     guardada em ${OUT}/base-v119-shell.html (linhagem reversa)`);
console.log(`\ngravado em ${OUT} (SEM deploy)`);
