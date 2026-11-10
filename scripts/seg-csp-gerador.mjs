// Gera worker-deploy-v118-csp/worker.mjs a partir dos BYTES VIVOS publicados,
// acrescentando headers de seguranca apenas na rota do shell HTML.
// Nada e publicado; saida em directorio novo; nao sobrescreve o vivo.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const DIR_SNAPS = 'ar-shell.html';
const SW_SNAPS = 'evidence/ar-sw-v4-2026-11-09.js';
const OUT_DIR = 'worker-deploy-v118-csp';
const md5 = (s) => createHash('md5').update(s).digest('hex');
const gates = [];
const gate = (nome, ok, detalhe = '') => {
  gates.push({ nome, ok, detalhe });
  console.log((ok ? 'VERDE  ' : 'VERMELHO') + ' ' + nome + (detalhe ? ' — ' + detalhe : ''));
  if (!ok) process.exitCode = 1;
};

// 1) bytes vivos, re-medidos agora, sem pipe de shell (o pipe MSYS adicionou 4 bytes numa passada)
const vivo = async (rota) => {
  const res = await fetch(BASE + rota, { cache: 'no-store' });
  return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), headers: res.headers };
};
const [h1, h2] = [await vivo('/'), await vivo('/')];
const sw1 = await vivo('/sw-v4.js');
const idx = await vivo('/index.html');
const swLegado = await vivo('/sw.js');

const shellSnap = readFileSync(DIR_SNAPS);
const swSnap = readFileSync(SW_SNAPS);

gate('shell vivo estavel em 2 fetches', h1.status === 200 && h2.status === 200 && h1.buf.equals(h2.buf),
  `bytes ${h1.buf.length} md5 ${md5(h1.buf)}`);
gate('shell vivo == ar-shell.html (snapshot em disco)', h1.buf.equals(shellSnap),
  `md5 disco ${md5(shellSnap)}`);
gate('/index.html == shell', idx.buf.equals(h1.buf), `md5 ${md5(idx.buf)}`);
gate('sw-v4 vivo == evidence/ar-sw-v4-2026-11-09.js', sw1.buf.equals(swSnap), `bytes ${sw1.buf.length}`);
gate('/sw.js == /sw-v4.js no vivo', swLegado.buf.equals(sw1.buf));
gate('controle negativo: vivo NAO tem CSP header', h1.headers.get('content-security-policy') === null
  && h1.headers.get('x-content-type-options') === null && h1.headers.get('strict-transport-security') === null);

// 2) extrai a CSP do meta do shell vivo — o header vai espelhar o meta, nada mais
const html = h1.buf.toString('utf8');
const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g);
gate('meta CSP existe no shell vivo', meta !== null && meta.length === 1, meta ? '' : '0 matches');
const metaCsp = meta[0].match(/content="([^"]*)"/)[1];
gate('meta CSP tem as directivas esperadas', /default-src 'self'/.test(metaCsp) && /connect-src/.test(metaCsp) && /form-action/.test(metaCsp));
gate('meta CSP nao tem frame-ancestors (header nao vai apertar alem do meta)', !/frame-ancestors/.test(metaCsp));

// 3) monta o worker candidato
const esc = (s) => JSON.stringify(s);
const handler = `export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Service worker
    if (url.pathname === '/sw.js' || url.pathname === '/sw-v4.js') {
      return new Response(SW, {
        headers: {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'max-age=0, no-cache, no-store',
        },
      });
    }

    // HTML shell
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'max-age=0, no-cache, no-store',
          'content-security-policy': CSP,
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'strict-origin-when-cross-origin',
          'strict-transport-security': 'max-age=31536000',
        },
      });
    }

    // Static assets (manifest, images, PDFs, JS libs)
    const assetUrl = url.pathname;
    const asset = env.ASSETS ? await env.ASSETS.fetch(assetUrl) : null;
    if (asset) return asset;

    // Fallback: try to serve from the worker's own assets
    return env.ASSETS.fetch(request);
  },
};`;

const fonte = [
  `const CSP = ${esc(metaCsp)};`,
  `const SW = ${esc(sw1.buf.toString('utf8'))};`,
  `const HTML = ${esc(html)};`,
  handler,
].join('\n\n');

gate('candidata NAO contem includeSubDomains (workers.dev e dominio partilhado)', !/includeSubDomains/i.test(fonte));
gate('candidata tem o header CSP so na rota do shell (1 ocorrencia)', (fonte.match(/'content-security-policy'/g) || []).length === 1);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/worker.mjs`, fonte);
copyFileSync('worker-deploy-v118-swfix/wrangler.toml', `${OUT_DIR}/wrangler.toml`);

// 4) sintaxe
try {
  execFileSync(process.execPath, ['--check', `${OUT_DIR}/worker.mjs`], { stdio: 'pipe' });
  gate('sintaxe node --check', true);
} catch (e) {
  gate('sintaxe node --check', false, String(e.stderr || e).slice(0, 200));
}

// 5) linhagem comportamental: roda o candidato com ASSETS mudo e compara com o vivo
const { default: worker } = await import(pathToFileURL(`${process.cwd()}/${OUT_DIR}/worker.mjs`).href);
const mockEnv = { ASSETS: { fetch: async () => new Response('', { status: 404 }) } };
const cand = async (rota) => {
  const res = await worker.fetch(new Request(BASE + rota), mockEnv, {});
  return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), headers: res.headers };
};
const cSlash = await cand('/');
const cIndex = await cand('/index.html');
const cSw = await cand('/sw-v4.js');
const cSwLeg = await cand('/sw.js');
const c404 = await cand('/nao-existe-xyz.png');

gate('candidata / == vivo / (bytes)', cSlash.status === 200 && cSlash.buf.equals(h1.buf));
gate('candidata /index.html == vivo', cIndex.buf.equals(idx.buf));
gate('candidata /sw-v4.js == vivo', cSw.buf.equals(sw1.buf));
gate('candidata /sw.js == vivo', cSwLeg.buf.equals(swLegado.buf));
gate('candidata / tem CSP header == meta do vivo', cSlash.headers.get('content-security-policy') === metaCsp);
gate('candidata / tem nosniff + referrer + HSTS', cSlash.headers.get('x-content-type-options') === 'nosniff'
  && cSlash.headers.get('referrer-policy') === 'strict-origin-when-cross-origin'
  && cSlash.headers.get('strict-transport-security') === 'max-age=31536000');
gate('candidata /sw-v4.js NAO tem CSP header (rotas de asset inalteradas)', cSw.headers.get('content-security-policy') === null);
gate('candidata mantem 404 do fallback de assets', c404.status === 404);

// 6) reversao: tirar o CSP const e os 4 headers devolve o shell byte a byte
const reverso = [
  `const SW = ${esc(sw1.buf.toString('utf8'))};`,
  `const HTML = ${esc(html)};`,
  handler.replace("          'content-security-policy': CSP,\n", '')
    .replace("          'x-content-type-options': 'nosniff',\n", '')
    .replace("          'referrer-policy': 'strict-origin-when-cross-origin',\n", '')
    .replace("          'strict-transport-security': 'max-age=31536000',\n", ''),
].join('\n\n');
writeFileSync('.tmp-worker-reverso.mjs', reverso);
try {
  execFileSync(process.execPath, ['--check', '.tmp-worker-reverso.mjs'], { stdio: 'pipe' });
  const { default: wRev } = await import(pathToFileURL(`${process.cwd()}/.tmp-worker-reverso.mjs`).href + '?rev=' + Date.now());
  const rSlash = await wRev.fetch(new Request(BASE + '/'), mockEnv, {});
  const rBuf = Buffer.from(await rSlash.arrayBuffer());
  gate('reversao: shell sem headers == vivo byte a byte', rBuf.equals(h1.buf));
} catch (e) {
  gate('reversao: shell sem headers == vivo byte a byte', false, String(e.stderr || e).slice(0, 200));
}

if (existsSync('.tmp-worker-reverso.mjs')) unlinkSync('.tmp-worker-reverso.mjs');

writeFileSync(`${OUT_DIR}/portoes.json`, JSON.stringify({ em: new Date().toISOString(), url: BASE, gates }, null, 2) + '\n');
const falhas = gates.filter((g) => !g.ok).length;
console.log(`\n${gates.length} portoes, ${falhas} falhas.`);
if (falhas > 0) process.exit(1);
