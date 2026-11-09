// P2-3 medido nos bytes PUBLICADOS, não só no disco.
// A URL é derivada do diário de publicação mais recente (nunca dactilografada) e o passe falha
// em alto se o fetch não der 200. Só conta estruturas: não imprime o corpo.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

// 1. derivar o host do diário de publicação, não da memória
const fonte = path.join(REPO, 'audit-publicacao-v117.json');
if (!fs.existsSync(fonte)) { console.log('INSTRUMENTO CEGO: diário de publicação ausente'); process.exit(1); }
const m = fs.readFileSync(fonte, 'utf8').match(/https:\/\/[a-z0-9.-]+\.workers\.dev/);
if (!m) { console.log('INSTRUMENTO CEGO: nenhum workers.dev no diário ' + path.basename(fonte)); process.exit(1); }
const URL_AR = m[0];
console.log(`alvo derivado de ${path.basename(fonte)}: ${URL_AR}`);

// 2. fetch + headers
const res = await fetch(URL_AR + '/', { headers: { 'cache-control': 'no-cache' } });
const html = await res.text();
if (res.status !== 200) { console.log(`FALHA: HTTP ${res.status}`); process.exit(1); }
const hdr = {};
for (const [k, v] of res.headers) hdr[k.toLowerCase()] = v;
const seg = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security', 'cross-origin-opener-policy', 'server'];
console.log(`\n=== headers HTTP (${Object.keys(hdr).length} recebidos) ===`);
for (const s of seg) console.log(`   ${s}: ${hdr[s] ?? 'AUSENTE'}`);

const mede = (txt, rotulo) => {
  const scripts = [...txt.matchAll(/<script\b([^>]*)>/gi)].map((x) => x[1]);
  const ext = scripts.filter((a) => /\bsrc\s*=/i.test(a)).length;
  const evalC = (txt.match(/[^A-Za-z0-9_$.]eval\s*\(/g) || []).length;
  const newFn = (txt.match(/new\s+Function\s*\(/g) || []).length;
  const inner = (txt.match(/innerHTML[^;]{0,400}?<script/gi) || []).length;
  const onAttr = new Map();
  for (const a of txt.matchAll(/\son([a-z]+)\s*=\s*"/gi)) onAttr.set(a[1].toLowerCase(), (onAttr.get(a[1].toLowerCase()) || 0) + 1);
  const metaTag = (txt.match(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/i) || [null])[0];
  let meta = null;
  if (metaTag) {
    const c = metaTag.match(/content="([^"]*)"/i) || metaTag.match(/content='([^']*)'/i);
    meta = c ? [null, c[1]] : null;
  }
  const grav = (txt.match(/javascript:/gi) || []).length;
  const out = {
    rotulo,
    bytes: Buffer.byteLength(txt),
    md5: md5(txt).slice(0, 12),
    scriptTotal: scripts.length,
    scriptExterno: ext,
    scriptInline: scripts.length - ext,
    styleBlocos: (txt.match(/<style\b/gi) || []).length,
    styleAtributos: (txt.match(/\sstyle\s*=\s*["']/gi) || []).length,
    onHandlers: Object.fromEntries([...onAttr.entries()].sort((a, b) => b[1] - a[1])),
    onHandlersTotal: [...onAttr.values()].reduce((a, b) => a + b, 0),
    eval: evalC,
    newFunction: newFn,
    innerHTMLComScript: inner,
    javascriptURL: grav,
    metaCSP: meta ? meta[1] : null,
    scriptSrc: meta ? (meta[1].match(/script-src[^;]*/i) || [null])[0] : null,
    headerCSP: null,
  };
  console.log(`\n=== ${rotulo} ===`);
  console.log(`   bytes=${out.bytes} md5=${out.md5}`);
  console.log(`   <script> total=${out.scriptTotal} (externo ${out.scriptExterno} / inline ${out.scriptInline})`);
  console.log(`   <style> blocos=${out.styleBlocos} | atributos style=""=${out.styleAtributos}`);
  console.log(`   atributos on*= ${out.onHandlersTotal} -> ${JSON.stringify(out.onHandlers)}`);
  console.log(`   eval=${out.eval} new Function=${out.newFunction} innerHTML→<script>=${out.innerHTMLComScript} javascript:${out.javascriptURL}`);
  console.log(`   meta CSP presente? ${out.metaCSP ? 'SIM' : 'NAO'}`);
  if (out.scriptSrc) console.log(`   script-src: ${out.scriptSrc}`);
  return out;
};

const ar = mede(html, 'AR (bytes publicados)');
ar.headerCSP = hdr['content-security-policy'] ?? null;

const discoP = path.join(REPO, 'app/index.html');
const disco = fs.existsSync(discoP) ? mede(fs.readFileSync(discoP, 'utf8'), 'DISCO app/index.html') : null;

console.log('\n=== divergência ar × disco ===');
if (!disco) console.log('   disco ausente');
else {
  for (const k of ['bytes', 'md5', 'scriptTotal', 'scriptInline', 'styleAtributos', 'onHandlersTotal', 'eval'])
    console.log(`   ${k}: ar=${ar[k]} disco=${disco[k]} ${ar[k] === disco[k] ? 'IGUAL' : 'DIVERGE'}`);
}

// versão publicada (marca CACHE no shell) + rotas do Service Worker
const cache = (html.match(/CACHE\s*=\s*['"`]v?(\d+)['"`]/i) || [])[1];
console.log(`\n   marca CACHE no shell do ar: ${cache ?? 'nao encontrada'}`);
const swRois = {};
for (const rota of ['/sw.js', '/sw-v4.js?v=45']) {
  const r = await fetch(URL_AR + rota, { headers: { 'cache-control': 'no-cache' } }).catch(() => null);
  if (!r) continue;
  const t = await r.text();
  const nomes = [...t.matchAll(/(const|var|let)\s+(CACHE_NAME|CACHE_VERSION|VERSION|CACHE_KEY|SW_VERSION)\s*=\s*['"`]([^'"`]+)['"`]/g)].map((x) => `${x[2]}=${x[3]}`);
  const pres = (t.match(/PRECACHE|precacheAndRoute|caches\.open/gi) || []).length;
  swRois[rota] = { status: r.status, bytes: t.length, md5: md5(t).slice(0, 12), nomes: [...new Set(nomes)], marcasDeCache: pres, cspHeader: r.headers.get('content-security-policy') };
  console.log(`   ${rota}: HTTP ${r.status} bytes=${t.length} md5=${md5(t).slice(0, 12)} | versoes ${[...new Set(nomes)].join(', ') || 'nenhuma'} | caminhos-de-cache=${pres} | header CSP=${r.headers.get('content-security-policy') ?? 'AUSENTE'}`);
}
ar.sw = swRois;

fs.writeFileSync(path.join(REPO, 'evidence/p23-csp-live.json'), JSON.stringify({
  medidoEm: new Date().toISOString(),
  alvoDerivadoDe: path.basename(fonte),
  url: URL_AR,
  headersDeSeguranca: Object.fromEntries(seg.map((s) => [s, hdr[s] ?? null])),
  politicaMetaCompleta: ar.metaCSP,
  ar, disco,
}, null, 2) + '\n');
console.log('\ndiário: evidence/p23-csp-live.json');
