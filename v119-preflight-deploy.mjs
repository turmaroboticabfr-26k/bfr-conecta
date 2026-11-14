import fs from 'node:fs';
import crypto from 'node:crypto';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v118-csp`;
const OUT = `${DIR}/worker-deploy-v119`;
const CAND = `${DIR}/bfr-candidata-v119-supervisao-embed/index.html`;
const URL = 'https://bfr-conecta.turmaroboticabfr.workers.dev';

const EXPECT = {
  arHtmlMd5: 'ae59d35346b685b2fbf9d18ade4fa5cd', arHtmlBytes: 3489467,
  arSwMd5: '3fcbc3ad52f1a0491362506466c82596', arSwBytes: 3586,
  workerMd5: 'c41eef045d0110124e55d28304a99898', workerBytes: 3550715,
  candMd5: 'a1969cdf023042e7d2a91e7ed9333a05', candBytes: 3489474,
  swV119Md5: '46dfdebbecd3da5f0794f85276179b76',
};

const gates = [];
const gate = (name, ok, detail) => {
  gates.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${name} :: ${detail}`);
};

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

const head = async (path) => {
  const r = await fetch(URL + path, { headers: { 'cache-control': 'no-store' } });
  const body = Buffer.from(await r.arrayBuffer());
  const h = {};
  r.headers.forEach((v, k) => { h[k] = v; });
  return { status: r.status, body, h };
};

const HEADERS = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'strict-transport-security'];

// ---------- 1. ar ----------
const shell = await head('/');
gate('ar_http_200', shell.status === 200, `GET / -> ${shell.status}`);
gate('ar_html_baseline', md5(shell.body) === EXPECT.arHtmlMd5 && shell.body.length === EXPECT.arHtmlBytes,
  `ar ${shell.body.length} B md5 ${md5(shell.body)} | esperado ${EXPECT.arHtmlBytes} B md5 ${EXPECT.arHtmlMd5}`);
const shellTxt = shell.body.toString('utf8');
gate('ar_token_velho_presente', (shellTxt.match(/school_id,schools\(name\)/g) || []).length === 1
  && (shellTxt.match(/school_id,sports_schools\(name\)/g) || []).length === 0,
  `velho=${(shellTxt.match(/school_id,schools\(name\)/g) || []).length} novo=${(shellTxt.match(/school_id,sports_schools\(name\)/g) || []).length} (a regressao PEN-31 continua no ar)`);
const swAir = await head('/sw-v4.js');
gate('ar_sw_baseline', md5(swAir.body) === EXPECT.arSwMd5 && swAir.body.length === EXPECT.arSwBytes,
  `/sw-v4.js ${swAir.body.length} B md5 ${md5(swAir.body)} CACHE=${(swAir.body.toString('utf8').match(/bfr-conecta-v\d+/) || ['?'])[0]}`);
const swLegacy = await head('/sw.js');
gate('ar_sw_legua_identica', md5(swLegacy.body) === md5(swAir.body),
  `/sw.js ${swLegacy.body.length} B md5 ${md5(swLegacy.body)}`);
const shellHdrs = HEADERS.filter(k => shell.h[k]);
const swHdrs = HEADERS.filter(k => swAir.h[k]);
gate('ar_csp_so_no_shell', shellHdrs.length === 4 && swHdrs.length === 0,
  `shell tem [${shellHdrs.join(', ')}]; /sw-v4.js tem [${swHdrs.join(', ') || 'nenhum'}]`);
const cspHd = shell.h['content-security-policy'] || '';
const cspMeta = (() => {
  // o conteudo do CSP tem apostrofos ('self', nonce-...): so aspas DUPLAS funcionam como delimitador
  const m = shellTxt.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]*)"/i)
    || shellTxt.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content='([^']*)'/i);
  if (!m) return '';
  return m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
})();
const directives = s => s.split(';').map(x => x.trim()).filter(Boolean).sort().join('|');
gate('ar_csp_header_e_meta_alinhados', cspHd.length > 0 && cspMeta.length > 0 && directives(cspHd) === directives(cspMeta),
  `header ${cspHd.length} chars, meta ${cspMeta.length} chars, igual apos unescape=${cspHd === cspMeta}, conjunto de directivas identico=${directives(cspHd) === directives(cspMeta)}`);

// ---------- 2. bundle em disco ----------
const baseSrc = fs.readFileSync(`${BASE}/worker.mjs`, 'utf8');
const newSrc = fs.readFileSync(`${OUT}/worker.mjs`, 'utf8');
const newBuf = fs.readFileSync(`${OUT}/worker.mjs`);
gate('worker_intacto', md5(newBuf) === EXPECT.workerMd5 && newBuf.length === EXPECT.workerBytes,
  `worker-deploy-v119/worker.mjs ${newBuf.length} B md5 ${md5(newBuf)} | esperado ${EXPECT.workerBytes} B md5 ${EXPECT.workerMd5}`);

const candTxt = fs.readFileSync(CAND, 'utf8');
gate('candidata_intacta', md5(candTxt) === EXPECT.candMd5 && Buffer.byteLength(candTxt) === EXPECT.candBytes,
  `index.html candidata ${Buffer.byteLength(candTxt)} B md5 ${md5(candTxt)}`);

const bHtml = grab(baseSrc, 'const HTML = ');
const nHtml = grab(newSrc, 'const HTML = ');
const bSw = grab(baseSrc, 'const SW = ');
const nSw = grab(newSrc, 'const SW = ');
gate('embeds_localizados', bHtml && nHtml && bSw && nSw,
  `HTML base@${bHtml && bHtml.markerAt} novo@${nHtml && nHtml.markerAt}; SW base@${bSw && bSw.markerAt} novo@${nSw && nSw.markerAt}`);

gate('html_embutido_igual_candidata', nHtml.body === candTxt,
  `embutido ${Buffer.byteLength(nHtml.body)} B md5 ${md5(nHtml.body)} == candidata texto=${nHtml.body === candTxt}`);
gate('html_embutido_igual_ar_reverso', bHtml.body === shellTxt,
  `HTML embutido no worker-base (-csp) == ar servido agora: ${bHtml.body === shellTxt}`);
gate('tokens_do_html_embutido', (nHtml.body.match(/school_id,sports_schools\(name\)/g) || []).length === 1
  && (nHtml.body.match(/school_id,schools\(name\)/g) || []).length === 0,
  `novo=${(nHtml.body.match(/school_id,sports_schools\(name\)/g) || []).length} velho=${(nHtml.body.match(/school_id,schools\(name\)/g) || []).length}`);

const swV119 = Buffer.from(nSw.body, 'utf8');
gate('sw_embutido_v119', md5(swV119) === EXPECT.swV119Md5 && swV119.length === EXPECT.arSwBytes,
  `SW embutido ${swV119.length} B md5 ${md5(swV119)} CACHE=${(nSw.body.match(/bfr-conecta-v\d+/) || ['?'])[0]}`);
gate('sw_so_mudou_etiqueta', nSw.body.replace('bfr-conecta-v119', 'bfr-conecta-v118') === bSw.body
  && (nSw.body.match(/bfr-conecta-v119/g) || []).length === 1,
  `ocorrencias da etiqueta v119=${(nSw.body.match(/bfr-conecta-v119/g) || []).length}; revertido o label bate com o SW do ar=${nSw.body.replace('bfr-conecta-v119', 'bfr-conecta-v118') === bSw.body}`);

// ordem real no ficheiro: const SW (759) vem ANTES do const HTML (4446) -> segmentar por posicao, nao por nome
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
const segBase = segments(baseSrc);
const segNew = segments(newSrc);
gate('segmentos_localizados', !!segBase && !!segNew && segBase.ordem === segNew.ordem,
  `ordem no worker: ${segNew ? segNew.ordem : '?'} (base igual=${segBase && segNew && segBase.ordem === segNew.ordem})`);
gate('fora_dos_embeds_byte_identico', !!segBase && !!segNew
  && segBase.prefixo === segNew.prefixo && segBase.meio === segNew.meio && segBase.cauda === segNew.cauda,
  `prefijo ${segNew.prefixo.length} chars, meio ${segNew.meio.length} chars, cauda ${segNew.cauda.length} chars — iguais ao worker publicado nos tres: `
  + `${segBase.prefixo === segNew.prefixo}/${segBase.meio === segNew.meio}/${segBase.cauda === segNew.cauda}`);
const count = (s, re) => (s.match(re) || []).length;
gate('spawns_de_csp_preservados', count(newSrc, /Content-Security-Policy/gi) === count(baseSrc, /Content-Security-Policy/gi)
  && count(newSrc, /Content-Security-Policy/gi) >= 2,
  `ocorrencias de "Content-Security-Policy": base ${count(baseSrc, /Content-Security-Policy/gi)}, v119 ${count(newSrc, /Content-Security-Policy/gi)} (meta + header)`);

const wrA = fs.readFileSync(`${BASE}/wrangler.toml`);
const wrB = fs.readFileSync(`${OUT}/wrangler.toml`);
gate('wrangler_toml_identico', md5(wrA) === md5(wrB) && wrA.length === wrB.length,
  `${wrB.length} B md5 ${md5(wrB)} (base ${md5(wrA)})`);

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
  `base ${pubA.length} ficheiros, v119 ${pubB.length}, divergentes=${mismatch.length ? mismatch.join(',') : '0'}`);

// ---------- saida ----------
const ruins = gates.filter(g => !g.ok).length;
const diary = {
  kind: 'v119-preflight-deploy', ts: new Date().toISOString(), target: URL,
  published: false, expected: EXPECT, air: {
    htmlBytes: shell.body.length, htmlMd5: md5(shell.body),
    swBytes: swAir.body.length, swMd5: md5(swAir.body),
    swCacheLabel: (swAir.body.toString('utf8').match(/bfr-conecta-v\d+/) || ['?'])[0],
    headers: shell.h,
  },
  gates, total: gates.length, ruins,
  veredito: ruins === 0 ? 'PREFLIGHT_VERDE' : 'PREFLIGHT_ABORTA_DEPLOY',
};
fs.writeFileSync(`${DIR}/v119-preflight-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\n${gates.length} portoes | ${ruins} vermelhos -> ${diary.veredito} (published=false, nenhum deploy rodado)`);
process.exit(ruins === 0 ? 0 : 1);
