import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SRC = join(ROOT, 'bfr-v116-src');
const OUT = join(ROOT, 'worker-deploy-v116');

mkdirSync(join(OUT, 'public'), { recursive: true });

const html = readFileSync(join(SRC, 'index.html'), 'utf8');
let sw = readFileSync(join(SRC, 'sw-v4.js'), 'utf8');
sw = sw.replace(/const CACHE = 'bfr-conecta-v\d+';/, "const CACHE = 'bfr-conecta-v116';");

const worker = `const HTML = ${JSON.stringify(html)};
const SW = ${JSON.stringify(sw)};

const ASSETS = {
  '/sw-v4.js': { content: SW, type: 'application/javascript' },
  '/': { content: HTML, type: 'text/html; charset=utf-8' },
  '/index.html': { content: HTML, type: 'text/html; charset=utf-8' }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (env.ASSETS) {
      const fromAssets = await env.ASSETS.fetch(request);
      if (fromAssets.status !== 404) return fromAssets;
    }
    const asset = ASSETS[url.pathname] || ASSETS['/'];
    return new Response(asset.content, {
      status: 200,
      headers: {
        'Content-Type': asset.type,
        'Cache-Control': url.pathname === '/sw-v4.js' ? 'no-cache' : 'public, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
};`;

writeFileSync(join(OUT, 'worker.mjs'), worker);

const toml = `name = "bfr-conecta"
main = "worker.mjs"
compatibility_date = "2024-01-01"
account_id = "37f5c136a13cbd8f884b94b927da0bbd"

[assets]
binding = "ASSETS"
directory = "./public"
`;
writeFileSync(join(OUT, 'wrangler.toml'), toml);

const assets = [
  'bfr-app-logo.png',
  'bfr-responsive-presentation.js',
  'bfr-teacher-arrivals.js',
  'bfr-teacher-audit.js',
  'calendario-letivo-2026.pdf',
  'horario-matutino-2026.pdf',
  'horario-matutino-2026.png',
  'horario-vespertino-2026.pdf',
  'horario-vespertino-2026.png',
  'lia-avatar.png',
  'lia-avatar.svg',
  'manifest.json'
];

for (const a of assets) {
  copyFileSync(join(SRC, a), join(OUT, 'public', a));
}

console.log('OK worker-deploy-v116 remontado com estrutura correta');
console.log('HTML bytes:', Buffer.byteLength(html, 'utf8'));
console.log('SW bytes:', Buffer.byteLength(sw, 'utf8'));
console.log('Worker bytes:', Buffer.byteLength(worker, 'utf8'));
