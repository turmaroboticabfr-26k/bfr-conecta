import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/bfr-candidata-v115-supervisao-embed';
const md5 = b => createHash('md5').update(b).digest('hex');

// Alvo e hashes esperados DERIVADOS do diário original (nunca dactilografados).
const prior = JSON.parse(readFileSync(join(DIR, 'prova-http-v115-diary.json'), 'utf8'));
const base = prior.base;
const expRootMd5 = prior.root_md5;
const expRootBytes = prior.root_bytes;
const expSwMd5 = prior.sw_md5;

const port = [];
const gate = (name, ok, detail) => { port.push({ name, ok, detail }); console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name + ' :: ' + detail); };
const get = async p => { const r = await fetch(base + p, { cache: 'no-store' }); return { status: r.status, ct: r.headers.get('content-type'), buf: Buffer.from(await r.arrayBuffer()) }; };

console.log('re-conferência read-only do ar :: base=' + base);

// shell /
const root = await get('/');
gate('reconfer_root_200_html', root.status === 200 && /text\/html/.test(root.ct || ''), 'status=' + root.status + ' ct=' + root.ct);
gate('reconfer_root_md5_eq_publicado', md5(root.buf) === expRootMd5, 'md5=' + md5(root.buf) + ' esperado=' + expRootMd5);
gate('reconfer_root_bytes_eq_publicado', root.buf.length === expRootBytes, 'bytes=' + root.buf.length + ' esperado=' + expRootBytes);
const htmlStr = root.buf.toString('utf8');
gate('reconfer_root_embed_token', htmlStr.includes('sports_schools(name)') && !htmlStr.includes('school_id,schools(name)'), 'sports_schools(name) presente; token antigo ausente');

// SW
const sw = await get('/sw-v4.js');
const swStr = sw.buf.toString('utf8');
gate('reconfer_sw_200_js', sw.status === 200 && /javascript/.test(sw.ct || ''), 'status=' + sw.status + ' ct=' + sw.ct);
gate('reconfer_sw_cache_v115', swStr.includes("const CACHE = 'bfr-conecta-v115';") && !swStr.includes('bfr-conecta-v114'), 'CACHE=v115');
gate('reconfer_sw_md5_eq_publicado', md5(sw.buf) === expSwMd5, 'md5=' + md5(sw.buf) + ' esperado=' + expSwMd5);

const diary = {
  cycle: 'V115-4-reconfer-ar',
  kind: 'read-only-reconference',
  note: 'Não toca no diário original prova-http-v115-diary.json; alvo e hashes derivados dele.',
  base,
  derived_from: 'prova-http-v115-diary.json',
  expected: { root_md5: expRootMd5, root_bytes: expRootBytes, sw_md5: expSwMd5 },
  measured: { root_md5: md5(root.buf), root_bytes: root.buf.length, sw_md5: md5(sw.buf) },
  gates: port,
  ok: port.every(p => p.ok),
  measured_at: new Date().toISOString()
};
writeFileSync(join(DIR, 'reconfer-ar-v115-diary.json'), JSON.stringify(diary, null, 2));
console.log('\n' + (diary.ok ? 'RECONFER_AR_V115_OK' : 'RECONFER_AR_V115_VERMELHO') + ' (' + port.filter(p => p.ok).length + '/' + port.length + ')');
process.exit(diary.ok ? 0 : 1);