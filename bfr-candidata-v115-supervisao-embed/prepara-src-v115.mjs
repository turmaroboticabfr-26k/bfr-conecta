import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const CAND = join(ROOT, 'bfr-candidata-v115-supervisao-embed/index.html');
const AR_ASSETS = join(ROOT, '_v115-ar-assets');
const SRC = join(ROOT, 'bfr-v115-src');
const md5 = b => createHash('md5').update(b).digest('hex');

const ASSETS = ['bfr-app-logo.png','lia-avatar.png','lia-avatar.svg','manifest.json','calendario-letivo-2026.pdf','horario-matutino-2026.pdf','horario-vespertino-2026.pdf','horario-matutino-2026.png','horario-vespertino-2026.png','bfr-responsive-presentation.js','bfr-teacher-arrivals.js','bfr-teacher-audit.js'];

const port = [];
const gate = (name, ok, detail) => { port.push({ name, ok, detail }); console.log((ok?'OK  ':'FAIL') + ' ' + name + ' :: ' + detail); };

mkdirSync(SRC, { recursive: true });
for (const f of readdirSync(SRC)) rmSync(join(SRC, f), { force: true, recursive: true });

// index.html = candidata v115
const candBuf = readFileSync(CAND);
writeFileSync(join(SRC, 'index.html'), candBuf);
gate('src_index_eq_candidata', md5(candBuf) === 'aba67956e2952f9f27e217004d028d74', 'md5=' + md5(candBuf) + ' bytes=' + candBuf.length);

// sw-v4.js = SW do ar com CACHE v114 -> v115 (1 linha)
const arSw = readFileSync(join(AR_ASSETS, 'sw-v4.js'), 'utf8');
gate('ar_sw_md5_v114', md5(Buffer.from(arSw,'utf8')) === 'e82b762bef48b6772bd7bdec011d2e30', 'md5=' + md5(Buffer.from(arSw,'utf8')));
const occurrences = arSw.split("const CACHE = 'bfr-conecta-v114';").length - 1;
gate('cache_v114_token_unique', occurrences === 1, 'ocorrencias=' + occurrences);
const newSw = arSw.replace("const CACHE = 'bfr-conecta-v114';", "const CACHE = 'bfr-conecta-v115';");
writeFileSync(join(SRC, 'sw-v4.js'), newSw, 'utf8');
gate('sw_cache_bumped', newSw.includes("const CACHE = 'bfr-conecta-v115';") && !newSw.includes("bfr-conecta-v114"), 'CACHE=v115');
// reverse lineage: reverter o bump reproduz o SW do ar byte a byte
const reverted = newSw.replace("const CACHE = 'bfr-conecta-v115';", "const CACHE = 'bfr-conecta-v114';");
gate('sw_reverse_lineage', reverted === arSw, 'revertido==ar');
// delta de 1 linha apenas
const arLines = arSw.split('\n').length, newLines = newSw.split('\n').length;
gate('sw_line_count_same', arLines === newLines, arLines + '->' + newLines);
// PRECACHE alinhado com as queries que a candidata pede
gate('precache_rp_v14', newSw.includes('/bfr-responsive-presentation.js?v=14') && readFileSync(CAND,'utf8').includes('bfr-responsive-presentation.js?v=14'), 'rp ?v=14');
gate('precache_arrivals_v2', newSw.includes('/bfr-teacher-arrivals.js?v=2') && readFileSync(CAND,'utf8').includes('bfr-teacher-arrivals.js?v=2'), 'arrivals ?v=2');

// 12 assets = bytes do ar
let assetsOk = true; const assetRows = [];
for (const f of ASSETS) {
  const b = readFileSync(join(AR_ASSETS, f));
  copyFileSync(join(AR_ASSETS, f), join(SRC, f));
  const eq = md5(readFileSync(join(SRC, f))) === md5(b);
  assetsOk = assetsOk && eq;
  assetRows.push({ f, bytes: b.length, md5: md5(b) });
}
gate('src_12_assets_eq_ar', assetsOk && assetRows.length === 12, assetRows.length + ' assets copied byte-for-byte from ar');

const diary = { cycle: 'V115-2-prepara-src', src: SRC, gates: port, assets: assetRows, sw_md5_novo: md5(Buffer.from(newSw,'utf8')), index_md5: md5(candBuf), ok: port.every(p=>p.ok) };
writeFileSync(join(ROOT, 'bfr-candidata-v115-supervisao-embed/prepara-src-v115-diary.json'), JSON.stringify(diary, null, 2));
console.log('\nSRC pronta: ' + SRC + ' | ' + (diary.ok ? 'PREPARA_SRC_V115_OK' : 'PREPARA_SRC_V115_VERMELHO') + ' (' + port.filter(p=>p.ok).length + '/' + port.length + ')');
process.exit(diary.ok ? 0 : 1);