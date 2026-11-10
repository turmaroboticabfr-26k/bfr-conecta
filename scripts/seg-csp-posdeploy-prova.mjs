// Prova HTTP pos-deploy da candidata CSP: shell byte-identico + 4 headers so na rota do shell;
// SW e assets inalterados e sem CSP. URL derivado do portoes.json, nunca dactilografado.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const md5 = (s) => createHash('md5').update(s).digest('hex');
const base = JSON.parse(readFileSync('worker-deploy-v118-csp/portoes.json', 'utf8')).url;
const MD5_SHELL = 'ae59d35346b685b2fbf9d18ade4fa5cd';
const BYTES_SHELL = 3489467;
const MD5_SW = '3fcbc3ad52f1a0491362506466c82596';
const BYTES_SW = 3586;
const gates = [];
const gate = (nome, ok, detalhe = '') => {
  gates.push({ nome, ok, detalhe });
  console.log((ok ? 'VERDE  ' : 'VERMELHO') + ' ' + nome + (detalhe ? ' — ' + detalhe : ''));
  if (!ok) process.exitCode = 1;
};

const vivo = async (rota) => {
  const res = await fetch(new URL(rota, base).href, { cache: 'no-store' });
  return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), headers: res.headers };
};

const [h1, h2] = [await vivo('/'), await vivo('/')];
const idx = await vivo('/index.html');
const sw4 = await vivo('/sw-v4.js');
const sw = await vivo('/sw.js');
const png = await vivo('/bfr-app-logo.png');

gate('shell 200 e byte-identico ao pre-deploy (md5 ' + MD5_SHELL.slice(0, 8) + ')',
  h1.status === 200 && h1.buf.length === BYTES_SHELL && md5(h1.buf) === MD5_SHELL,
  `bytes ${h1.buf.length} md5 ${md5(h1.buf)}`);
gate('shell estavel em 2 fetches', h1.buf.equals(h2.buf));
gate('/index.html == shell (bytes)', idx.buf.equals(h1.buf));

const meta = h1.buf.toString('utf8').match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g);
gate('meta CSP presente no shell (1 ocorrencia)', meta !== null && meta.length === 1);
const metaCsp = meta ? meta[0].match(/content="([^"]*)"/)[1] : '';

gate('header CSP == meta do shell', h1.headers.get('content-security-policy') === metaCsp,
  `len header ${h1.headers.get('content-security-policy') ? h1.headers.get('content-security-policy').length : 0} len meta ${metaCsp.length}`);
gate('nosniff na rota do shell', h1.headers.get('x-content-type-options') === 'nosniff');
gate('referrer-policy na rota do shell', h1.headers.get('referrer-policy') === 'strict-origin-when-cross-origin');
gate('HSTS max-age=31536000 sem includeSubDomains', h1.headers.get('strict-transport-security') === 'max-age=31536000');
gate('/index.html tambem tem os 4 headers', idx.headers.get('content-security-policy') === metaCsp
  && idx.headers.get('x-content-type-options') === 'nosniff'
  && idx.headers.get('referrer-policy') === 'strict-origin-when-cross-origin'
  && idx.headers.get('strict-transport-security') === 'max-age=31536000');

gate('sw-v4 200 e byte-identico (md5 ' + MD5_SW.slice(0, 8) + ')',
  sw4.status === 200 && sw4.buf.length === BYTES_SW && md5(sw4.buf) === MD5_SW,
  `bytes ${sw4.buf.length} md5 ${md5(sw4.buf)}`);
gate('/sw.js == /sw-v4.js', sw.buf.equals(sw4.buf));
gate('sw-v4 NAO tem CSP header', sw4.headers.get('content-security-policy') === null);
gate('sw-v4 NAO tem nosniff/HSTS', sw4.headers.get('x-content-type-options') === null
  && sw4.headers.get('strict-transport-security') === null);
gate('asset png NAO tem CSP header', png.headers.get('content-security-policy') === null
  && png.status === 200 && png.buf.length === 448736);

const falhas = gates.filter((g) => !g.ok).length;
console.log(`\n${gates.length} portoes, ${falhas} falhas.`);
if (falhas > 0) process.exit(1);
