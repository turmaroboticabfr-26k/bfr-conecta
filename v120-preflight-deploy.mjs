import fs from 'node:fs';
import crypto from 'node:crypto';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v119`;          // bundle publicado no ar (reversao = redeploy dele)
const OUT = `${DIR}/worker-deploy-v120`;           // bundle candidato a publicar
const CAND = `${DIR}/bfr-candidata-v120-setrole-supervisor/index.html`;

// tudo derivado de artefatos em disco — nada dactilografado
const auditV119 = JSON.parse(fs.readFileSync(`${DIR}/audit-publicacao-v119.json`, 'utf8'));
const URL = auditV119.deploy.url;
const [, arHtmlMd5, arHtmlBytes] = auditV119.md5.shell_depois.match(/^([0-9a-f]{32}) \((\d+) B/);
const [, arSwMd5, arSwBytes] = auditV119.md5.sw_depois.match(/^([0-9a-f]{32}) \((\d+) B/);
const [, baseWorkerMd5, baseWorkerBytes] = auditV119.md5['worker_deploy_v119/worker.mjs'].match(/^([0-9a-f]{32}) \((\d+) B/);
const EXPECT = {
  ...JSON.parse(fs.readFileSync(`${OUT}/esperado-v120.json`, 'utf8')),
  arHtmlMd5, arHtmlBytes: +arHtmlBytes, arSwMd5, arSwBytes: +arSwBytes, baseWorkerMd5, baseWorkerBytes: +baseWorkerBytes,
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
const count = (s, tok) => s.split(tok).length - 1;

function unquote(src, i) {
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') break;
    if (c === '\\') {
      const n = src[i + 1];
      out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
      i += 2; continue;
    }
    out += c; i++;
  }
  return { body: out, quoteEnd: i, closing: src.indexOf(';', i) };
}
function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const u = unquote(src, src.indexOf('"', k + marker.length) + 1);
  return { ...u, markerAt: k };
}
function segments(src) {
  const parts = [grab(src, 'const SW = '), grab(src, 'const HTML = ')].filter(Boolean)
    .sort((a, b) => a.markerAt - b.markerAt);
  if (parts.length !== 2) return null;
  return {
    prefixo: src.slice(0, parts[0].markerAt),
    meio: src.slice(parts[0].closing + 1, parts[1].markerAt),
    cauda: src.slice(parts[1].closing + 1),
    ordem: parts.map(p => src.slice(p.markerAt, p.markerAt + 12).trim()).join(' -> '),
  };
}

const head = async (path) => {
  const r = await fetch(URL + path, { headers: { 'cache-control': 'no-store' } });
  const body = Buffer.from(await r.arrayBuffer());
  const h = {};
  r.headers.forEach((v, k) => { h[k] = v; });
  return { status: r.status, body, h };
};
const HEADERS = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'strict-transport-security'];

// ---------- 1. ar (regua v119) ----------
const shell = await head('/');
gate('ar_http_200', shell.status === 200, `GET / -> ${shell.status}`);
gate('ar_html_regua_v119', md5(shell.body) === EXPECT.arHtmlMd5 && shell.body.length === EXPECT.arHtmlBytes,
  `ar ${shell.body.length} B md5 ${md5(shell.body)} | regua ${EXPECT.arHtmlBytes} B md5 ${EXPECT.arHtmlMd5}`);
const shellTxt = shell.body.toString('utf8');
gate('ar_token_pen31_regra_v119', (shellTxt.match(/school_id,sports_schools\(name\)/g) || []).length === 1
  && (shellTxt.match(/school_id,schools\(name\)/g) || []).length === 0,
  `novo=${(shellTxt.match(/school_id,sports_schools\(name\)/g) || []).length} velho=${(shellTxt.match(/school_id,schools\(name\)/g) || []).length} (PEN-31 continua corrigida no ar)`);
const swAir = await head('/sw-v4.js');
gate('ar_sw_regua_v119', md5(swAir.body) === EXPECT.arSwMd5 && swAir.body.length === EXPECT.arSwBytes,
  `/sw-v4.js ${swAir.body.length} B md5 ${md5(swAir.body)} CACHE=${(swAir.body.toString('utf8').match(/bfr-conecta-v\d+/) || ['?'])[0]}`);
const swLegacy = await head('/sw.js');
gate('ar_sw_legada_identica', md5(swLegacy.body) === md5(swAir.body),
  `/sw.js ${swLegacy.body.length} B md5 ${md5(swLegacy.body)}`);
const shellHdrs = HEADERS.filter(k => shell.h[k]);
const swHdrs = HEADERS.filter(k => swAir.h[k]);
gate('ar_csp_so_no_shell', shellHdrs.length === 4 && swHdrs.length === 0,
  `shell tem [${shellHdrs.join(', ')}]; /sw-v4.js tem [${swHdrs.join(', ') || 'nenhum'}]`);
const cspHd = shell.h['content-security-policy'] || '';
const cspMeta = (() => {
  const m = shellTxt.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]*)"/i)
    || shellTxt.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content='([^']*)'/i);
  if (!m) return '';
  return m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
})();
const directives = s => s.split(';').map(x => x.trim()).filter(Boolean).sort().join('|');
gate('ar_csp_header_e_meta_alinhados', cspHd.length > 0 && cspMeta.length > 0 && directives(cspHd) === directives(cspMeta),
  `header ${cspHd.length} chars, meta ${cspMeta.length} chars, conjunto de directivas identico=${directives(cspHd) === directives(cspMeta)}`);

// ---------- 2. bundle em disco ----------
const baseSrc = fs.readFileSync(`${BASE}/worker.mjs`, 'utf8');
const newSrc = fs.readFileSync(`${OUT}/worker.mjs`, 'utf8');
const newBuf = fs.readFileSync(`${OUT}/worker.mjs`);
gate('worker_v119_intacto', md5(fs.readFileSync(`${BASE}/worker.mjs`)) === EXPECT.baseWorkerMd5
  && newBuf.length !== fs.readFileSync(`${BASE}/worker.mjs`).length && fs.readFileSync(`${BASE}/worker.mjs`).length === EXPECT.baseWorkerBytes,
  `worker-deploy-v119 ${fs.readFileSync(`${BASE}/worker.mjs`).length} B md5 ${md5(fs.readFileSync(`${BASE}/worker.mjs`))} (publicado no ar)`);
gate('worker_v120_intacto', md5(newBuf) === EXPECT.workerMd5 && newBuf.length === EXPECT.workerBytes,
  `worker-deploy-v120/worker.mjs ${newBuf.length} B md5 ${md5(newBuf)} | esperado ${EXPECT.workerBytes} B md5 ${EXPECT.workerMd5}`);

const candTxt = fs.readFileSync(CAND, 'utf8');
gate('candidata_intacta', md5(candTxt) === EXPECT.htmlMd5 && Buffer.byteLength(candTxt) === EXPECT.htmlBytes,
  `candidata v120 ${Buffer.byteLength(candTxt)} B md5 ${md5(candTxt)}`);

const bHtml = grab(baseSrc, 'const HTML = ');
const nHtml = grab(newSrc, 'const HTML = ');
const bSw = grab(baseSrc, 'const SW = ');
const nSw = grab(newSrc, 'const SW = ');
gate('embeds_localizados', bHtml && nHtml && bSw && nSw,
  `HTML base@${bHtml && bHtml.markerAt} novo@${nHtml && nHtml.markerAt}; SW base@${bSw && bSw.markerAt} novo@${nSw && nSw.markerAt}`);

gate('html_embutido_igual_candidata', nHtml.body === candTxt,
  `embutido v120 ${Buffer.byteLength(nHtml.body)} B md5 ${md5(nHtml.body)} == candidata texto=${nHtml.body === candTxt}`);
gate('html_embutido_do_base_igual_ar', bHtml.body === shellTxt,
  `HTML embutido no worker v119 == ar servido agora: ${bHtml.body === shellTxt}`);
gate('tokens_do_html_embutido', (nHtml.body.match(/school_id,sports_schools\(name\)/g) || []).length === 1
  && (nHtml.body.match(/school_id,schools\(name\)/g) || []).length === 0,
  `novo=${(nHtml.body.match(/school_id,sports_schools\(name\)/g) || []).length} velho=${(nHtml.body.match(/school_id,schools\(name\)/g) || []).length} (PEN-31 preservada na v120)`);

const hunkFails = [];
for (const h of HUNKS) {
  const nNovo = count(nHtml.body, h.novo), nVelho = count(nHtml.body, h.velho);
  const bNovo = count(bHtml.body, h.novo), bVelho = count(bHtml.body, h.velho);
  if (!(nNovo === 1 && nVelho === 0 && bNovo === 0 && bVelho === 1)) hunkFails.push(h.id);
  gate(`hunk_${h.id}`, nNovo === 1 && nVelho === 0 && bNovo === 0 && bVelho === 1,
    `embutido v120: novo=${nNovo} velho=${nVelho} | embutido v119: novo=${bNovo} velho=${bVelho}`);
}
let revertido = nHtml.body;
for (const h of HUNKS) revertido = revertido.replace(h.novo, h.velho);
gate('linhagem_reversa_dos_3_hunks', hunkFails.length === 0 && revertido === bHtml.body,
  `v120 - 3 hunks (inverso) == v119 embutido: ${revertido === bHtml.body}${hunkFails.length ? ` (falhas: ${hunkFails.join(',')})` : ''}`);

const swV120 = Buffer.from(nSw.body, 'utf8');
gate('sw_embutido_v120', md5(swV120) === EXPECT.swMd5 && swV120.length === EXPECT.swBytes,
  `SW embutido ${swV120.length} B md5 ${md5(swV120)} CACHE=${(nSw.body.match(/bfr-conecta-v\d+/) || ['?'])[0]}`);
gate('sw_so_mudou_etiqueta', nSw.body.replace('bfr-conecta-v120', 'bfr-conecta-v119') === bSw.body
  && (nSw.body.match(/bfr-conecta-v120/g) || []).length === 1 && (nSw.body.match(/bfr-conecta-v119/g) || []).length === 0,
  `etiqueta v120=${(nSw.body.match(/bfr-conecta-v120/g) || []).length}, v119=${(nSw.body.match(/bfr-conecta-v119/g) || []).length}; revertido o label bate com o SW do ar=${nSw.body.replace('bfr-conecta-v120', 'bfr-conecta-v119') === bSw.body}`);

const segBase = segments(baseSrc);
const segNew = segments(newSrc);
gate('segmentos_localizados', !!segBase && !!segNew && segBase.ordem === segNew.ordem,
  `ordem no worker: ${segNew ? segNew.ordem : '?'} (base igual=${segBase && segNew && segBase.ordem === segNew.ordem})`);
gate('fora_dos_embeds_byte_identico', !!segBase && !!segNew
  && segBase.prefixo === segNew.prefixo && segBase.meio === segNew.meio && segBase.cauda === segNew.cauda,
  `prefijo ${segNew.prefixo.length} chars, meio ${segNew.meio.length} chars, cauda ${segNew.cauda.length} chars — iguais ao worker publicado nos tres: `
  + `${segBase.prefixo === segNew.prefixo}/${segBase.meio === segNew.meio}/${segBase.cauda === segNew.cauda}`);
const cspCount = (s, re) => (s.match(re) || []).length;
gate('spawns_de_csp_preservados', cspCount(newSrc, /Content-Security-Policy/gi) === cspCount(baseSrc, /Content-Security-Policy/gi)
  && cspCount(newSrc, /Content-Security-Policy/gi) >= 2,
  `ocorrencias de "Content-Security-Policy": v119 ${cspCount(baseSrc, /Content-Security-Policy/gi)}, v120 ${cspCount(newSrc, /Content-Security-Policy/gi)} (meta + header)`);

const wrA = fs.readFileSync(`${BASE}/wrangler.toml`);
const wrB = fs.readFileSync(`${OUT}/wrangler.toml`);
gate('wrangler_toml_identico', md5(wrA) === md5(wrB) && wrA.length === wrB.length,
  `${wrB.length} B md5 ${md5(wrB)} (v119 ${md5(wrA)})`);

const pubA = fs.readdirSync(`${BASE}/public`).sort();
const pubB = fs.readdirSync(`${OUT}/public`).sort();
const mismatch = [];
for (const f of pubB) {
  const a = fs.readFileSync(`${BASE}/public/${f}`);
  const b = fs.readFileSync(`${OUT}/public/${f}`);
  if (md5(a) !== md5(b)) mismatch.push(f);
}
gate('assets_12_byte_identico', pubA.length === 12 && pubB.length === 12
  && JSON.stringify(pubA) === JSON.stringify(pubB) && mismatch.length === 0,
  `v119 ${pubA.length} ficheiros, v120 ${pubB.length}, divergentes=${mismatch.length ? mismatch.join(',') : '0'}`);

gate('reversao_pronta_na_disco', md5(fs.readFileSync(`${BASE}/worker.mjs`)) === EXPECT.baseWorkerMd5
  && fs.readFileSync(`${BASE}/worker.mjs`).length === EXPECT.baseWorkerBytes,
  `worker-deploy-v119 pronto para redeploy (reversao) ${EXPECT.baseWorkerBytes} B md5 ${EXPECT.baseWorkerMd5}`);

// ---------- saida ----------
const ruins = gates.filter(g => !g.ok).length;
const diary = {
  kind: 'v120-preflight-deploy', ts: new Date().toISOString(), target: URL,
  published: false, expected: EXPECT, air: {
    htmlBytes: shell.body.length, htmlMd5: md5(shell.body),
    swBytes: swAir.body.length, swMd5: md5(swAir.body),
    swCacheLabel: (swAir.body.toString('utf8').match(/bfr-conecta-v\d+/) || ['?'])[0],
    headers: shell.h,
  },
  gates, total: gates.length, ruins,
  veredito: ruins === 0 ? 'PREFLIGHT_VERDE' : 'PREFLIGHT_ABORTA_DEPLOY',
};
fs.writeFileSync(`${DIR}/v120-preflight-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\n${gates.length} portoes | ${ruins} vermelhos -> ${diary.veredito} (published=false, nenhum deploy rodado)`);
process.exit(ruins === 0 ? 0 : 1);
