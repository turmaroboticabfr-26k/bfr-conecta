import fs from 'node:fs';
import crypto from 'node:crypto';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/worker-deploy-v119`;
const URL = 'https://bfr-conecta.turmaroboticabfr.workers.dev';

const EXPECT = {
  shellMd5: 'a1969cdf023042e7d2a91e7ed9333a05', shellBytes: 3489474,
  swMd5: '46dfdebbecd3da5f0794f85276179b76', swBytes: 3586,
  baselineMd5: 'ae59d35346b685b2fbf9d18ade4fa5cd', baselineBytes: 3489467,
  versionId: '6aed50af-a8a1-4c2b-84ae-cb6eaec4770b',
};

const gates = [];
const gate = (name, ok, detail) => {
  gates.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${name} :: ${detail}`);
};

const head = async (path) => {
  const r = await fetch(URL + path, { headers: { 'cache-control': 'no-store' } });
  const body = Buffer.from(await r.arrayBuffer());
  const h = {};
  r.headers.forEach((v, k) => { h[k] = v; });
  return { status: r.status, body, h };
};
const HDRS = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'strict-transport-security'];

// ---------- shell ----------
const shell = await head('/');
console.log(`[info] GET / -> ${shell.status}  ${shell.body.length} B  md5 ${md5(shell.body)}`);
gate('http_shell_200', shell.status === 200, `status ${shell.status}`);
gate('http_shell_md5_candidata', md5(shell.body) === EXPECT.shellMd5 && shell.body.length === EXPECT.shellBytes,
  `ar ${shell.body.length} B md5 ${md5(shell.body)} | esperado ${EXPECT.shellBytes} B md5 ${EXPECT.shellMd5}`);
const txt = shell.body.toString('utf8');
gate('http_token_novo_servido', (txt.match(/school_id,sports_schools\(name\)/g) || []).length === 1
  && (txt.match(/school_id,schools\(name\)/g) || []).length === 0,
  `sports_schools(name)=${(txt.match(/school_id,sports_schools\(name\)/g) || []).length} (escolha 1), velho=${(txt.match(/school_id,schools\(name\)/g) || []).length} (escolha 0) — PEN-31`);
{
  const rev = Buffer.from(txt.replace('school_id,sports_schools(name)', 'school_id,schools(name)'), 'utf8');
  const base = fs.readFileSync(`${DIR}/ar-shell.html`);
  gate('http_linhagem_reversa_igual_baseline', md5(rev) === EXPECT.baselineMd5 && rev.length === EXPECT.baselineBytes
    && md5(base) === EXPECT.baselineMd5,
    `revertido 1 token -> ${rev.length} B md5 ${md5(rev)} | baseline em disco ${base.length} B md5 ${md5(base)} | esperado ${EXPECT.baselineBytes} B md5 ${EXPECT.baselineMd5}`);
}
const candDisk = fs.readFileSync(`${DIR}/bfr-candidata-v119-supervisao-embed/index.html`);
gate('http_candidata_igual_disco', md5(candDisk) === md5(shell.body),
  `ar == bfr-candidata-v119-supervisao-embed/index.html (${candDisk.length} B md5 ${md5(candDisk)}): ${md5(candDisk) === md5(shell.body)}`);

// ---------- headers so na rota do shell ----------
const onShell = HDRS.filter(k => shell.h[k]);
gate('http_headers_no_shell', onShell.length === 4, `presentes [${onShell.join(', ')}]`);
gate('http_hsts_sem_includesubdomains', !/includeSubDomains/i.test(shell.h['strict-transport-security'] || ''),
  `strict-transport-security = ${shell.h['strict-transport-security']}`);
const cspHd = shell.h['content-security-policy'] || '';
const cspMeta = (() => {
  const m = txt.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]*)"/i);
  if (!m) return '';
  return m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
})();
gate('http_csp_header_igual_meta', cspHd.length > 0 && cspHd === cspMeta, `header ${cspHd.length} chars, meta ${cspMeta.length} chars, iguais=${cspHd === cspMeta}`);

// ---------- service worker ----------
for (const p of ['/sw-v4.js', '/sw.js']) {
  const sw = await head(p);
  const s = sw.body.toString('utf8');
  gate(`http_sw_${p.replace(/\W/g, '_')}`, sw.status === 200 && md5(sw.body) === EXPECT.swMd5 && sw.body.length === EXPECT.swBytes
    && (s.match(/bfr-conecta-v\d+/) || ['?'])[0] === 'bfr-conecta-v119',
    `${p} ${sw.status} ${sw.body.length} B md5 ${md5(sw.body)} CACHE=${(s.match(/bfr-conecta-v\d+/) || ['?'])[0]}`);
  gate(`http_sw_${p.replace(/\W/g, '_')}_sem_headers`, HDRS.filter(k => sw.h[k]).length === 0,
    `${p} headers de seguranca: [${HDRS.filter(k => sw.h[k]).join(', ') || 'nenhum'}]`);
}
// ---------- 12 assets byte a byte ----------
const files = fs.readdirSync(`${OUT}/public`);
gate('http_assets_censo_12', files.length === 12, `${files.length} ficheiros em public/`);
const off = [];
for (const f of files) {
  const r = await head('/' + f);
  const disk = fs.readFileSync(`${OUT}/public/${f}`);
  const same = r.status === 200 && md5(r.body) === md5(disk);
  if (!same) off.push(`${f}(${r.status} ${md5(r.body)}!=${md5(disk)})`);
  if (HDRS.filter(k => r.h[k]).length) off.push(`${f}:headers`);
}
gate('http_assets_byte_identico_e_sem_headers', off.length === 0,
  off.length ? `divergentes: ${off.join(', ')}` : `12/12 servidos byte-identicos ao disco, nenhum com header de seguranca`);

// ---------- reversao prontas ----------
const revWorker = fs.readFileSync(`${DIR}/worker-deploy-v118-csp/worker.mjs`);
gate('reversao_pronta_na_disco', md5(revWorker) === 'ae115858d263a02bb777cc474ce17297' && revWorker.length === 3550708,
  `worker-deploy-v118-csp/worker.mjs ${revWorker.length} B md5 ${md5(revWorker)} (version anterior 9c467d0e-d16a-4c20-9e69-50ec3b40f433)`);

const ruins = gates.filter(g => !g.ok).length;
fs.writeFileSync(`${DIR}/v119-postdeploy-http-diary.json`, JSON.stringify({
  kind: 'v119-postdeploy-http', ts: new Date().toISOString(), url: URL,
  published: true, version_id: EXPECT.versionId, deployment_created: '2026-11-13T03:45:52.507Z',
  previous_version_id: '9c467d0e-d16a-4c20-9e69-50ec3b40f433',
  assets_reuploaded: 0, wrangler: '4.154.0',
  shell: { status: shell.status, bytes: shell.body.length, md5: md5(shell.body) },
  sw: { bytes: EXPECT.swBytes, md5: EXPECT.swMd5, cache: 'bfr-conecta-v119' },
  headers: shell.h, gates, total: gates.length, ruins,
  veredito: ruins === 0 ? 'V119_HTTP_VERDE' : 'V119_HTTP_VERMELHO',
}, null, 2));
console.log(`\n${gates.length} portoes | ${ruins} vermelhos -> ${ruins === 0 ? 'V119_HTTP_VERDE' : 'V119_HTTP_VERMELHO'}`);
process.exit(ruins === 0 ? 0 : 1);
