import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const base = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const md5 = b => createHash('md5').update(b).digest('hex');
const port = [];
const gate = (name, ok, detail) => { port.push({ name, ok, detail }); console.log((ok?'OK  ':'FAIL') + ' ' + name + ' :: ' + detail); };
const get = async p => { const r = await fetch(base + p, { cache: 'no-store' }); return { status: r.status, ct: r.headers.get('content-type'), buf: Buffer.from(await r.arrayBuffer()) }; };

// shell /
const root = await get('/');
gate('http_root_200_html', root.status === 200 && /text\/html/.test(root.ct||''), 'status=' + root.status + ' ct=' + root.ct);
gate('http_root_md5_eq_candidata', md5(root.buf) === 'aba67956e2952f9f27e217004d028d74', 'md5=' + md5(root.buf) + ' bytes=' + root.buf.length);
gate('http_root_bytes', root.buf.length === 3488135, 'bytes=' + root.buf.length);
const htmlStr = root.buf.toString('utf8');
gate('http_root_embed_token', htmlStr.includes('sports_schools(name)') && !htmlStr.includes('school_id,schools(name)'), 'sports_schools(name) servido');

// /index.html identical
const idx = await get('/index.html');
gate('http_indexhtml_eq_root', md5(idx.buf) === md5(root.buf), 'md5=' + md5(idx.buf));

// SW
const sw = await get('/sw-v4.js');
const swStr = sw.buf.toString('utf8');
gate('http_sw_200_js', sw.status === 200 && /javascript/.test(sw.ct||''), 'status=' + sw.status + ' ct=' + sw.ct);
gate('http_sw_cache_v115', swStr.includes("const CACHE = 'bfr-conecta-v115';") && !swStr.includes('bfr-conecta-v114'), 'CACHE=v115');
gate('http_sw_md5_eq_bundle', md5(sw.buf) === '863660025ed3371859b1546b2a16b26d', 'md5=' + md5(sw.buf));

// 12 assets unchanged vs ar baseline
const arAssets = JSON.parse(readFileSync(join(ROOT, '_v115-ar-assets.json'), 'utf8'));
let assetsOk = true; const rows = [];
for (const a of arAssets) {
  if (a.f === 'sw-v4.js') continue;
  const r = await get('/' + a.f);
  const eq = r.status === 200 && md5(r.buf) === a.md5;
  assetsOk = assetsOk && eq;
  rows.push({ f: a.f, status: r.status, eq_baseline: eq, md5: md5(r.buf) });
}
gate('http_12_assets_intact', assetsOk && rows.length === 12, rows.filter(r=>r.eq_baseline).length + '/12 iguais ao baseline do ar');

const diary = { cycle: 'V115-3-prova-http', base, gates: port, assets: rows, root_md5: md5(root.buf), root_bytes: root.buf.length, sw_md5: md5(sw.buf), ok: port.every(p=>p.ok), measured_at: new Date().toISOString() };
writeFileSync(join(ROOT, 'bfr-candidata-v115-supervisao-embed/prova-http-v115-diary.json'), JSON.stringify(diary, null, 2));
console.log('\n' + (diary.ok ? 'PROVA_HTTP_V115_OK' : 'PROVA_HTTP_V115_VERMELHO') + ' (' + port.filter(p=>p.ok).length + '/' + port.length + ')');
process.exit(diary.ok ? 0 : 1);