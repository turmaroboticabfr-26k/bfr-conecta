// PDF-HOR-2 — monta worker-deploy-v123-pdfs por substituicao cirurgica sobre o bundle v122
// ja conferido byte a byte contra o ar (evidence/pdf-hor-1-preflight-15-11.json).
// Mudam SÓ: os dois .pdf de horario no public/ e a etiqueta CACHE dentro do SW embebido.
// A HTML embed, o handler do 404, a CSP e os restantes 10 assets ficam byte a byte.
// NAO faz deploy. NAO sobrescreve nada que ja exista.
// Reguas lidas dos diarios (nunca dactilografadas): esperado-v122.json +
// bfr-candidata-v122-horarios-pdf/portoes-horarios-pdf-diary.json +
// evidence/pdf-hor-sonda-15-11.json (o miudo falso publicado).
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${dir}/worker-deploy-v122-push`;
const OUT = `${dir}/worker-deploy-v123-pdfs`;
const CAND_DIR = `${dir}/bfr-candidata-v122-horarios-pdf`;
const CAND_DIARY = `${CAND_DIR}/portoes-horarios-pdf-diary.json`;
const Sonda = `${dir}/evidence/pdf-hor-sonda-15-11.json`;
const ESP_BASE = `${BASE}/esperado-v122.json`;
const PDFS_TROCADOS = ['horario-matutino-2026.pdf', 'horario-vespertino-2026.pdf'];

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };
const count = (s, t) => s.split(t).length - 1;

function unquote(src, i) {
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return { body: out, quoteEnd: i };
    if (c === '\\') {
      const n = src[i + 1];
      out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
      i += 2; continue;
    }
    out += c; i++;
  }
  return null;
}
function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const q = src.indexOf('"', k + marker.length);
  const u = unquote(src, q + 1);
  return u ? { ...u, markerAt: k, quoteStart: q } : null;
}
function segs(src) {
  const ps = [grab(src, 'const SW = '), grab(src, 'const HTML = ')].filter(Boolean).sort((a, b) => a.markerAt - b.markerAt);
  if (ps.length !== 2) die('embeds SW/HTML nao localizados');
  return { prefixo: src.slice(0, ps[0].markerAt), meio: src.slice(ps[0].quoteEnd + 1, ps[1].markerAt), cauda: src.slice(ps[1].quoteEnd + 1) };
}
// estrutura minima de PDF: cabecalho, %%EOF no fim, xref e pelo menos uma /MediaBox
function estruturaPdf(buf) {
  const s = buf.toString('latin1');
  return {
    cabecalho: s.slice(0, 8),
    pdf_ok: /^%PDF-1\.\d/.test(s),
    eof: /%%EOF\s*$/.test(s.slice(-1024)),
    xref: /(^|[\r\n])xref[\r\n]/.test(s) || /\/Type\s*\/XRef/.test(s),
    mediabox: /\/MediaBox\s*\[/.test(s),
    paginas: count(s, '/Type /Page') - count(s, '/Type /Pages'),
    imagens: count(s, '/Subtype /Image'),
  };
}

if (fs.existsSync(OUT)) die(`${OUT} ja existe (nao sobrescrever)`);

// ---------- reguas derivadas ----------
const exp = JSON.parse(fs.readFileSync(ESP_BASE, 'utf8'));
if (!/^bfr-conecta-v\d+$/.test(exp.cacheLabel)) die(`etiqueta de cache do esperado-v122 ilegivel: ${exp.cacheLabel}`);
const LABEL_OLD = exp.cacheLabel;
const LABEL_NEW = LABEL_OLD.replace(/v(\d+)$/, (m, d) => `v${Number(d) + 1}`);

const cd = JSON.parse(fs.readFileSync(CAND_DIARY, 'utf8'));
if (cd.porta_ok !== true || cd.nao_sobrescreve !== true) die(`diario da candidata nao autoriza (porta_ok=${cd.porta_ok}, nao_sobrescreve=${cd.nao_sobrescreve})`);
if (cd.alvos.length !== 2) die(`diario da candidata com ${cd.alvos.length} alvos, esperado 2`);
const candRuler = {}, pngRuler = {};
for (const a of cd.alvos) {
  if (a.roundTrip !== 'OK') die(`${a.pdf} sem roundTrip OK`);
  candRuler[a.pdf] = { md5: a.pdfMd5, bytes: a.pdfBytes, png: a.png, pngMd5: a.pngMd5, pngBytes: a.pngBytes, width: a.width, height: a.height };
  pngRuler[a.png] = { md5: a.pngMd5, bytes: a.pngBytes };
}
for (const p of PDFS_TROCADOS) if (!candRuler[p]) die(`candidata nao cobre ${p}`);

const sn = JSON.parse(fs.readFileSync(Sonda, 'utf8'));
const alvoSonda = sn.alvos && sn.alvos.ar_matutino;
if (!alvoSonda) die(`miudo falso nao derivado da sonda: chaves=${Object.keys(sn).join(',')} / alvos=${Object.keys((sn.alvos || {})).join(',')}`);
const fakeMd5 = alvoSonda.md5, fakeBytes = alvoSonda.bytes;
if (!/^[0-9a-f]{32}$/.test(String(fakeMd5)) || /^%PDF/.test(String(alvoSonda.magica))) die(`régua da sonda nao descreve o defeito: ${JSON.stringify(alvoSonda)}`);

// ---------- portoes de entrada ----------
const baseW = fs.readFileSync(`${BASE}/worker.mjs`, 'utf8');
if (md5(Buffer.from(baseW, 'utf8')) !== exp.workerMd5 || Buffer.byteLength(baseW) !== exp.workerBytes)
  die(`worker base md5 ${md5(Buffer.from(baseW, 'utf8'))}/${Buffer.byteLength(baseW)} != esperado ${exp.workerMd5}/${exp.workerBytes}`);
if (count(baseW, LABEL_OLD) !== 1) die(`etiqueta ${LABEL_OLD} no worker base = ${count(baseW, LABEL_OLD)}, esperado 1 (so o SW)`);
if (count(baseW, LABEL_NEW) !== 0) die(`etiqueta ${LABEL_NEW} ja existe no worker base`);

const bHtml = grab(baseW, 'const HTML = ');
const bSw = grab(baseW, 'const SW = ');
if (!bHtml || !bSw) die('embeds nao localizados no worker base');
if (md5(Buffer.from(bHtml.body, 'utf8')) !== exp.htmlMd5 || Buffer.byteLength(bHtml.body) !== exp.htmlBytes) die('HTML embed base != esperado');
if (md5(Buffer.from(bSw.body, 'utf8')) !== exp.swMd5 || Buffer.byteLength(bSw.body) !== exp.swBytes) die('SW embed base != esperado');

const handlerNaBase = count(baseW, 'env.ASSETS.fetch(request)') === 1 && !/ASSETS\.fetch\(\s*assetUrl/.test(baseW)
  && count(baseW, "'Not found', { status: 404") === 2 && count(baseW, 'asset.status !== 404') === 1
  && count(baseW, 'if (!env.ASSETS)') === 1 && count(baseW, 'const NOFOUNDR') === 1;
if (!handlerNaBase) die('handler do 404 nao esta intacto na base');
const rotaSwNaBase = count(baseW, "url.pathname === '/sw.js' || url.pathname === '/sw-v4.js'") === 1
  && count(baseW, 'return new Response(SW, {') === 1;
if (!rotaSwNaBase) die('rota do SW embebido nao esta intacta na base');

// ---------- cirurgia 1: so a etiqueta no embed do SW ----------
const worker = baseW.replace(LABEL_OLD, LABEL_NEW);
if (worker === baseW) die('nenhuma substituicao de etiqueta ocorreu');
if (Buffer.byteLength(worker) !== Buffer.byteLength(baseW)) die(`tamanho do worker mudou: ${Buffer.byteLength(worker)} vs ${Buffer.byteLength(baseW)}`);
if (count(worker, LABEL_OLD) !== 0 || count(worker, LABEL_NEW) !== 1) die(`etiquetas no worker novo: ${LABEL_OLD}=${count(worker, LABEL_OLD)} ${LABEL_NEW}=${count(worker, LABEL_NEW)}`);

const nSw = grab(worker, 'const SW = ');
const nHtml = grab(worker, 'const HTML = ');
if (!nSw || !nHtml) die('embeds nao localizados no worker novo');
if (nHtml.body !== bHtml.body) die('HTML embed mudou');
if (nSw.body !== bSw.body.replace(LABEL_OLD, LABEL_NEW)) die('SW embed novo != SW base com a etiqueta trocada');
if (count(nSw.body, LABEL_NEW) !== 1) die(`etiqueta ${LABEL_NEW} no corpo do SW = ${count(nSw.body, LABEL_NEW)}`);
const sB = segs(baseW), sN = segs(worker);
if (sB.prefixo !== sN.prefixo || sB.meio !== sN.meio || sB.cauda !== sN.cauda) die('segmentos fora dos embeds mudaram');
const cspB = grab(baseW, 'const CSP = '), cspN = grab(worker, 'const CSP = ');
if (!cspB || !cspN || cspB.body !== cspN.body) die('const CSP = mudou');

const precache = (nSw.body.match(/const PRECACHE_PATHS = \[([^\]]*)\]/) || ['', ''])[1]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(s => s.includes('?v='));
const misv = precache.filter(p => !nHtml.body.includes(p.replace(/^\//, '')));
if (misv.length) die(`precache desalinhado com a HTML: ${misv.join(', ')}`);

const tmp = path.join(os.tmpdir(), `checa-worker-v123-${process.pid}.mjs`);
fs.writeFileSync(tmp, worker, 'utf8');
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
fs.unlinkSync(tmp);
if (chk.status !== 0) die(`worker montado nao parseia: ${(chk.stderr || '').slice(0, 300)}`);

// ---------- cirurgia 2: public/ com os dois PDFs trocados ----------
fs.mkdirSync(`${OUT}/public`, { recursive: true });
const assetsBase = fs.readdirSync(`${BASE}/public`).sort();
const copiados = [], substituidos = [];
for (const a of assetsBase) {
  const src = PDFS_TROCADOS.includes(a) ? `${CAND_DIR}/${a}` : `${BASE}/public/${a}`;
  fs.copyFileSync(src, `${OUT}/public/${a}`);
  (PDFS_TROCADOS.includes(a) ? substituidos : copiados).push(a);
}
const reguaAssets = fs.readdirSync(`${OUT}/public`).sort().map(a => {
  const b = fs.readFileSync(`${OUT}/public/${a}`);
  const e = { arquivo: a, bytes: b.length, md5: md5(b) };
  if (/\.pdf$/i.test(a)) Object.assign(e, estruturaPdf(b));
  return e;
});
const porArquivo = Object.fromEntries(reguaAssets.map(r => [r.arquivo, r]));

// ---------- portoes de saida ----------
const falhas = [];
const portoes = {};
const gate = (id, ok, dados) => { portoes[id] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(id); };

gate('S1_lista_de_assets_inalterada', assetsBase.length === 12 && JSON.stringify(fs.readdirSync(`${OUT}/public`).sort()) === JSON.stringify(assetsBase),
  { base: assetsBase.length, novo: fs.readdirSync(`${OUT}/public`).length });
gate('S2_dez_assets_byte_a_byte', copiados.length === 10 && copiados.every(a => md5(fs.readFileSync(`${BASE}/public/${a}`)) === porArquivo[a].md5),
  { copiados: copiados.length });
for (const p of PDFS_TROCADOS) {
  const r = porArquivo[p], c = candRuler[p];
  gate(`S3_pdf_trocado_igual_a_candidata_${p}`, !!r && r.md5 === c.md5 && r.bytes === c.bytes, { medido: r && { md5: r.md5, bytes: r.bytes }, diario: { md5: c.md5, bytes: c.bytes } });
  gate(`S4_pdf_tem_magic_pdf_${p}`, !!r && r.pdf_ok === true && r.eof === true && r.xref === true && r.mediabox === true && r.paginas >= 1 && r.imagens >= 1,
    r && { cabecalho: r.cabecalho, paginas: r.paginas, imagens: r.imagens, eof: r.eof, xref: r.xref, mediabox: r.mediabox });
  gate(`S5_pdf_nao_e_o_miudo_falso_${p}`, !!r && r.md5 !== fakeMd5 && r.bytes !== fakeBytes, r && { medido: { md5: r.md5, bytes: r.bytes }, falso: { md5: fakeMd5, bytes: fakeBytes } });
}
const m = porArquivo['horario-matutino-2026.pdf'], v = porArquivo['horario-vespertino-2026.pdf'];
gate('S6_matutino_diferente_do_vespertino', !!m && !!v && m.md5 !== v.md5, { matutino: m && m.md5, vespertino: v && v.md5 });
const cal = porArquivo['calendario-letivo-2026.pdf'];
gate('S7_calendario_intacto_e_pdf', !!cal && cal.pdf_ok === true && cal.md5 === md5(fs.readFileSync(`${BASE}/public/calendario-letivo-2026.pdf`)), cal && { md5: cal.md5, bytes: cal.bytes, paginas: cal.paginas });
gate('S8_nenhum_asset_com_o_miudo_falso', reguaAssets.every(r => r.md5 !== fakeMd5), { total: reguaAssets.length, falso: fakeMd5 });
gate('S9_pngs_dos_horarios_inalterados', Object.keys(pngRuler).every(p => porArquivo[p] && porArquivo[p].md5 === pngRuler[p].md5 && porArquivo[p].bytes === pngRuler[p].bytes),
  { pngs: Object.keys(pngRuler).map(p => `${p}=${porArquivo[p]?.md5}`), total: Object.keys(pngRuler).length });
gate('S10_html_embed_byte_a_byte_e_worker_do_mesmo_tamanho', nHtml.body === bHtml.body && Buffer.byteLength(worker) === Buffer.byteLength(baseW),
  { bytes: Buffer.byteLength(worker), html: md5(Buffer.from(nHtml.body, 'utf8')) });

if (falhas.length) { console.error(`PORTAO MONTAGEM VERMELHO: ${falhas.join(', ')}`); fs.rmSync(OUT, { recursive: true, force: true }); process.exit(1); }

// ---------- gravacao ----------
fs.writeFileSync(`${OUT}/worker.mjs`, worker, 'utf8');
fs.copyFileSync(`${BASE}/wrangler.toml`, `${OUT}/wrangler.toml`);
const toml = fs.readFileSync(`${OUT}/wrangler.toml`, 'utf8');
if (md5(Buffer.from(toml, 'utf8')) !== md5(fs.readFileSync(`${BASE}/wrangler.toml`))) die('wrangler.toml divergente');
if (!/name\s*=\s*"bfr-conecta"/.test(toml)) die('wrangler.toml sem name = "bfr-conecta"');
fs.writeFileSync(`${OUT}/sw-${LABEL_OLD.replace('bfr-conecta-', '')}-embed.js`, bSw.body, 'utf8');
fs.writeFileSync(`${OUT}/esperado-v123.json`, JSON.stringify({
  workerMd5: md5(Buffer.from(worker, 'utf8')), workerBytes: Buffer.byteLength(worker),
  swMd5: md5(Buffer.from(nSw.body, 'utf8')), swBytes: Buffer.byteLength(nSw.body),
  htmlMd5: md5(Buffer.from(nHtml.body, 'utf8')), htmlBytes: Buffer.byteLength(nHtml.body),
  cacheLabel: LABEL_NEW,
  baseWorkerMd5: exp.workerMd5, baseWorkerBytes: exp.workerBytes,
  baseSwMd5: exp.swMd5, baseSwBytes: exp.swBytes,
  baseHtmlMd5: exp.htmlMd5, baseHtmlBytes: exp.htmlBytes,
  deltaWorkerBytes: Buffer.byteLength(worker) - Buffer.byteLength(baseW),
  precacheAlinhado: misv.length, assetsCopiados: assetsBase.length,
  substituidos: PDFS_TROCADOS.map(p => ({ arquivo: p, md5Antigo: md5(fs.readFileSync(`${BASE}/public/${p}`)), bytesAntigo: fs.statSync(`${BASE}/public/${p}`).size, md5Novo: porArquivo[p].md5, bytesNovo: porArquivo[p].bytes, paginas: porArquivo[p].paginas, imagens: porArquivo[p].imagens })),
  miudoFalso: { md5: fakeMd5, bytes: fakeBytes, origem: 'evidence/pdf-hor-sonda-15-11.json' },
  assets: reguaAssets,
  portoes: Object.keys(portoes).filter(k => /^S\d/.test(k)).length,
  portoesDetalhados: portoes,
  origemReguas: ['worker-deploy-v122-push/esperado-v122.json', 'bfr-candidata-v122-horarios-pdf/portoes-horarios-pdf-diary.json', 'evidence/pdf-hor-sonda-15-11.json'],
  ok_literal: 'substituir os PDFs de horario',
}, null, 2));

console.log(`etiqueta        ${LABEL_OLD} -> ${LABEL_NEW} (1 ocorrencia, so no SW)`);
console.log(`worker          ${Buffer.byteLength(worker)} B md5 ${md5(Buffer.from(worker, 'utf8'))} (delta ${Buffer.byteLength(worker) - Buffer.byteLength(baseW)})`);
console.log(`SW embed        ${Buffer.byteLength(nSw.body)} B md5 ${md5(Buffer.from(nSw.body, 'utf8'))}`);
console.log(`HTML embed      ${Buffer.byteLength(nHtml.body)} B md5 ${md5(Buffer.from(nHtml.body, 'utf8'))} (byte a byte da v122)`);
console.log(`handler 404     intacto | rota do SW intacta | CSP intacta | precache ${precache.length} alinhados`);
for (const p of PDFS_TROCADOS) console.log(`pdf             ${p} ${porArquivo[p].bytes} B ${porArquivo[p].md5} ${porArquivo[p].cabecalho.trim()} paginas=${porArquivo[p].paginas} imagens=${porArquivo[p].imagens}`);
console.log(`portoes         ${Object.keys(portoes).filter(k => /^S\d/.test(k)).length} falhas ${falhas.length}`);
console.log(`\ngravado em ${OUT} (SEM deploy)`);
