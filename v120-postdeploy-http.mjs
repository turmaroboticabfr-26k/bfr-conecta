import fs from 'node:fs';
import crypto from 'node:crypto';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/worker-deploy-v120`;
const URL = 'https://bfr-conecta.turmaroboticabfr.workers.dev';

const EXPECT = {
  shellMd5: 'a9a76d0e338c2a539135bccce23111b4', shellBytes: 3489649,
  swMd5: '289f1f1dc82a2eb2e091994916af3e97', swBytes: 3586,
  baselineMd5: 'a1969cdf023042e7d2a91e7ed9333a05', baselineBytes: 3489474,
  versionId: '8cad1145-a975-4fd6-8a7b-2fd4e9a4209c',
  previousVersionId: '6aed50af-a8a1-4c2b-84ae-cb6eaec4770b',
};

const HUNKS = [
  { id: 'H1', novo: `: role === 'sports_operator' ? ['sports_operator','developer'].includes(currentProfile?.role) : role === 'education_supervisor' ? ['education_supervisor','developer'].includes(currentProfile?.role) : role === 'admin' && currentProfile?.role === 'developer';`, velho: `: role === 'sports_operator' ? ['sports_operator','developer'].includes(currentProfile?.role) : role === 'admin' && currentProfile?.role === 'developer';` },
  { id: 'H2', novo: `secretaryView.classList.toggle('hidden', role !== 'secretary' && role !== 'education_supervisor');`, velho: `secretaryView.classList.toggle('hidden', role !== 'secretary');` },
  { id: 'H3', novo: `secretary:secretaryView, education_supervisor:secretaryView, aee:aeeView,`, velho: `secretary:secretaryView, aee:aeeView,` },
];

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
gate('http_token_pen31_servido', (txt.match(/school_id,sports_schools\(name\)/g) || []).length === 1
  && (txt.match(/school_id,schools\(name\)/g) || []).length === 0,
  `sports_schools(name)=${(txt.match(/school_id,sports_schools\(name\)/g) || []).length}, velho=${(txt.match(/school_id,schools\(name\)/g) || []).length} — PEN-31 preservada`);

let revertido = txt;
for (const h of HUNKS) revertido = revertido.replace(h.novo, h.velho);
const rev = Buffer.from(revertido, 'utf8');
const baseDisk = fs.readFileSync(`${OUT}/base-v119-shell.html`);
gate('http_linhagem_reversa_3_hunks', md5(rev) === EXPECT.baselineMd5 && rev.length === EXPECT.baselineBytes
  && md5(baseDisk) === EXPECT.baselineMd5,
  `servido - 3 hunks -> ${rev.length} B md5 ${md5(rev)} | base v119 em disco ${baseDisk.length} B md5 ${md5(baseDisk)} | esperado ${EXPECT.baselineBytes} B md5 ${EXPECT.baselineMd5}`);
for (const h of HUNKS) {
  const n = txt.split(h.novo).length - 1, v = txt.split(h.velho).length - 1;
  gate(`http_hunk_${h.id}`, n === 1 && v === 0, `servido: novo=${n} velho=${v}`);
}
const candDisk = fs.readFileSync(`${DIR}/bfr-candidata-v120-setrole-supervisor/index.html`);
gate('http_candidata_igual_disco', md5(candDisk) === md5(shell.body),
  `ar == bfr-candidata-v120-setrole-supervisor/index.html (${candDisk.length} B md5 ${md5(candDisk)}): ${md5(candDisk) === md5(shell.body)}`);

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
    && (s.match(/bfr-conecta-v\d+/) || ['?'])[0] === 'bfr-conecta-v120',
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

// ---------- reversao pronta ----------
const revWorker = fs.readFileSync(`${DIR}/worker-deploy-v119/worker.mjs`);
gate('reversao_pronta_na_disco', md5(revWorker) === 'c41eef045d0110124e55d28304a99898' && revWorker.length === 3550715,
  `worker-deploy-v119/worker.mjs ${revWorker.length} B md5 ${md5(revWorker)} (redeploy = volta ao ar anterior ${EXPECT.previousVersionId})`);

const ruins = gates.filter(g => !g.ok).length;
fs.writeFileSync(`${DIR}/v120-postdeploy-http-diary.json`, JSON.stringify({
  kind: 'v120-postdeploy-http', ts: new Date().toISOString(), url: URL,
  published: true, version_id: EXPECT.versionId, previous_version_id: EXPECT.previousVersionId,
  assets_reuploaded: 0, wrangler: '4.154.0',
  shell: { status: shell.status, bytes: shell.body.length, md5: md5(shell.body) },
  sw: { bytes: EXPECT.swBytes, md5: EXPECT.swMd5, cache: 'bfr-conecta-v120' },
  headers: shell.h, gates, total: gates.length, ruins,
  veredito: ruins === 0 ? 'V120_HTTP_VERDE' : 'V120_HTTP_VERMELHO',
}, null, 2));
console.log(`\n${gates.length} portoes | ${ruins} vermelhos -> ${ruins === 0 ? 'V120_HTTP_VERDE' : 'V120_HTTP_VERMELHO'}`);
process.exit(ruins === 0 ? 0 : 1);
