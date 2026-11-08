import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(ROOT, 'worker-deploy-v115');
const md5 = b => createHash('md5').update(b).digest('hex');
const port = [];
const gate = (name, ok, detail) => { port.push({ name, ok, detail }); console.log((ok?'OK  ':'FAIL') + ' ' + name + ' :: ' + detail); };

const worker = readFileSync(join(OUT, 'worker.mjs'), 'utf8');
const lines = worker.split('\n');
function decodeLiteral(prefix) {
  const line = lines.find(l => l.startsWith(prefix));
  if (!line) throw new Error('literal não encontrado: ' + prefix);
  const json = line.slice(prefix.length).replace(/;\s*$/, '');
  return JSON.parse(json);
}
const html = decodeLiteral('const HTML = ');
const sw = decodeLiteral('const SW = ');

gate('worker_html_md5_eq_candidata', md5(Buffer.from(html,'utf8')) === 'aba67956e2952f9f27e217004d028d74', 'md5=' + md5(Buffer.from(html,'utf8')) + ' bytes=' + Buffer.byteLength(html,'utf8'));
gate('worker_html_bytes', Buffer.byteLength(html,'utf8') === 3488135, 'bytes=' + Buffer.byteLength(html,'utf8'));
const srcSw = readFileSync(join(ROOT, 'bfr-v115-src/sw-v4.js'), 'utf8');
gate('worker_sw_eq_src', sw === srcSw, 'md5=' + md5(Buffer.from(sw,'utf8')));
gate('worker_sw_cache_v115', sw.includes("const CACHE = 'bfr-conecta-v115';") && !sw.includes('bfr-conecta-v114'), 'CACHE=v115');
gate('worker_html_supervisao_token', html.includes('sports_schools(name)') && !html.includes('school_id,schools(name)'), 'embed sports_schools(name)');

// 12 assets public/ == ar
const arAssets = JSON.parse(readFileSync(join(ROOT, '_v115-ar-assets.json'), 'utf8'));
const pubFiles = readdirSync(join(OUT, 'public')).sort();
gate('public_12_files', pubFiles.length === 12, pubFiles.length + ' files');
let assetsOk = true; const assetRows = [];
for (const a of arAssets) {
  if (a.f === 'sw-v4.js') continue; // SW é literal, não asset de public/
  const p = join(OUT, 'public', a.f);
  const eq = md5(readFileSync(p)) === a.md5;
  assetsOk = assetsOk && eq;
  assetRows.push({ f: a.f, eq_ar: eq, md5: md5(readFileSync(p)) });
}
gate('public_12_assets_eq_ar', assetsOk && assetRows.length === 12, assetRows.filter(r=>r.eq_ar).length + '/12 batem com o ar');

// wrangler.toml
const toml = readFileSync(join(OUT, 'wrangler.toml'), 'utf8');
gate('toml_name_bfr_conecta', /^name = "bfr-conecta"$/m.test(toml), 'name=bfr-conecta');
gate('toml_account', toml.includes('account_id = "37f5c136a13cbd8f884b94b927da0bbd"'), 'account_id ok');
gate('toml_assets_binding', toml.includes('binding = "ASSETS"') && toml.includes('directory = "./public"'), 'ASSETS ./public');

// sintaxe do worker (ES module)
let syntaxOk = true, syntaxErr = '';
try { execFileSync(process.execPath, ['--check', join(OUT, 'worker.mjs')], { encoding: 'utf8' }); }
catch (e) { syntaxOk = false; syntaxErr = String(e.stderr || e.message).slice(0, 300); }
gate('worker_syntax_check', syntaxOk, syntaxOk ? 'node --check OK' : syntaxErr);

const diary = { cycle: 'V115-2-confere-bundle', out: OUT, worker_bytes: Buffer.byteLength(worker,'utf8'), worker_md5: md5(Buffer.from(worker,'utf8')), html_md5: md5(Buffer.from(html,'utf8')), sw_md5: md5(Buffer.from(sw,'utf8')), gates: port, assets: assetRows, ok: port.every(p=>p.ok) };
writeFileSync(join(ROOT, 'bfr-candidata-v115-supervisao-embed/confere-bundle-v115-diary.json'), JSON.stringify(diary, null, 2));
console.log('\n' + (diary.ok ? 'PORTAO_BUNDLE_V115_OK' : 'PORTAO_BUNDLE_V115_VERMELHO') + ' (' + port.filter(p=>p.ok).length + '/' + port.length + ') worker md5=' + diary.worker_md5);
process.exit(diary.ok ? 0 : 1);