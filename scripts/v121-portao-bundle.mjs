// V121-2b — portao de bundle INDEPENDENTE da montagem: re-measure o que esta no disco de
// worker-deploy-v121 e confira contra as reguas dos diarios, sem confiar no script que o gerou.
// Somente leitura. 0 deploy, 0 escrita, 0 DDL, 0 mint.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${dir}/worker-deploy-v121`;
const BASE = `${dir}/worker-deploy-v120-404`;
const V120 = `${dir}/worker-deploy-v120`;
const PRE = `${dir}/evidence/v121-preflight-14-11.json`;
const CAND_DIARY = `${dir}/bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json`;
const DIARIO_404 = `${dir}/audit-publicacao-v120-404.json`;
const OUTDIARIO = `${dir}/evidence/v121-portao-bundle-14-11.json`;
const LABEL_OLD = 'bfr-conecta-v120';
const LABEL_NEW = 'bfr-conecta-v121';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const bytes = s => Buffer.byteLength(s);
const count = (s, t) => s.split(t).length - 1;
const read = p => fs.readFileSync(p, 'utf8');
const parseRegua = s => { const m = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return m ? { md5: m[1], bytes: +m[2] } : null; };

function unquote(src, i) {
  let o = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return { body: o, quoteEnd: i };
    if (c === '\\') { const n = src[i + 1]; o += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n; i += 2; continue; }
    o += c; i++;
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
  return { prefixo: src.slice(0, ps[0].markerAt), meio: src.slice(ps[0].quoteEnd + 1, ps[1].markerAt), cauda: src.slice(ps[1].quoteEnd + 1) };
}

const out = { ciclo: 'V121-PORTAO-BUNDLE', em: new Date().toISOString(), deploy: 0, ddl: 0, escrita_banco: 0, mint: 0 };
const falhas = [];
const gate = (n, ok, d) => { out[n] = { passou: !!ok, ...(d || {}) }; if (!ok) falhas.push(n); };

const pre = JSON.parse(read(PRE));
const cd = JSON.parse(read(CAND_DIARY));
const d404 = JSON.parse(read(DIARIO_404));
const esp = JSON.parse(read(`${OUT}/esperado-v121.json`));
const h1 = (cd.hunks || [])[0] || {};
const parNovo = `education_supervisor:['${h1.rotulo_lido_0}','${h1.rotulo_lido_1}']`;
const reguaCand = { md5: cd.candidate_md5, bytes: cd.candidate_bytes };
const reguaShellAr = parseRegua(d404.md5.shell_antes_e_depois);
const reguaSwAr = parseRegua(d404.md5.sw_antes_e_depois);
const reguaWork404 = parseRegua(d404.md5['worker-deploy-v120-404/worker.mjs_publicado']);

gate('P0_preflight_verde_e_fresco', pre.veredito === 'V121_PREFLIGHT_OK' && pre.totais.vermelhos === 0
  && Math.round((Date.now() - Date.parse(pre.em)) / 60000) <= 90, { veredito: pre.veredito, em: pre.em });
gate('P0b_regua_da_candidata_bate_entre_preflight_e_diario', pre.reguas.candidata.md5 === reguaCand.md5
  && pre.reguas.candidata.bytes === reguaCand.bytes && cd.verdict === 'ROTULOS_OK' && cd.published === false,
  { diario: reguaCand, preflight: pre.reguas.candidata });

const w = read(`${OUT}/worker.mjs`);
const wBuf = fs.readFileSync(`${OUT}/worker.mjs`);
out.disco = { bytes: wBuf.length, md5: md5(wBuf) };
gate('P1_worker_em_disco_igual_ao_esperado', out.disco.md5 === esp.workerMd5 && out.disco.bytes === esp.workerBytes, out.disco);
gate('P1b_delta_sobre_a_base_do_404_e_76', esp.deltaWorkerBytes === 76 && out.disco.bytes === reguaWork404.bytes + 76,
  { esperado_delta: esp.deltaWorkerBytes, medido: out.disco.bytes - reguaWork404.bytes });

const baseW = read(`${BASE}/worker.mjs`);
gate('P2_base_do_bundle_e_o_worker_publicado_do_404', md5(baseW) === reguaWork404.md5 && bytes(baseW) === reguaWork404.bytes,
  { medido: { md5: md5(baseW), bytes: bytes(baseW) }, diario: reguaWork404 });

const nHtml = grab(w, 'const HTML = '), nSw = grab(w, 'const SW = ');
gate('P3_embeds_localizados_no_bundle', !!nHtml && !!nSw);
gate('P4_embed_HTML_igual_a_candidata', !!nHtml && md5(nHtml.body) === reguaCand.md5 && bytes(nHtml.body) === reguaCand.bytes,
  nHtml && { md5: md5(nHtml.body), bytes: bytes(nHtml.body) });
const shellAr = read(`${dir}/bfr-candidata-v120-setrole-supervisor/index.html`);
gate('P5_embed_HTML_contem_o_par_do_diario_uma_vez', !!nHtml && count(nHtml.body, parNovo) === 1
  && count(nHtml.body, "education_supervisor:['") === count(shellAr, "education_supervisor:['") + 1,
  { par: parNovo, ocorrencias: nHtml ? count(nHtml.body, parNovo) : null, na_shell_do_ar: count(shellAr, "education_supervisor:['") });
gate('P6_embed_SW_novo_mudou_apenas_a_etiqueta', !!nSw && bytes(nSw.body) === reguaSwAr.bytes
  && count(nSw.body, LABEL_NEW) === 1 && count(nSw.body, LABEL_OLD) === 0
  && new RegExp(`const CACHE = '${LABEL_NEW}';`).test(nSw.body)
  && md5(nSw.body) !== reguaSwAr.md5,
  nSw && { md5: md5(nSw.body), bytes: bytes(nSw.body), cache: (nSw.body.match(/const CACHE = '([^']+)'/) || [])[1] });
gate('P7_etiqueta_nova_ocorre_so_no_SW', count(w, LABEL_NEW) === 1 && count(w, LABEL_OLD) === 0,
  { nova_no_worker: count(w, LABEL_NEW), velha_no_worker: count(w, LABEL_OLD) });

const sB = segs(baseW), sN = segs(w);
gate('P8_fora_dos_embeds_byte_identico_a_base', sB.prefixo === sN.prefixo && sB.meio === sN.meio && sB.cauda === sN.cauda,
  { prefixo: sB.prefixo === sN.prefixo, meio: sB.meio === sN.meio, cauda: sB.cauda === sN.cauda, cauda_md5: md5(Buffer.from(sN.cauda, 'utf8')) });
gate('P9_handler_do_404_intacto_no_bundle', count(w, 'env.ASSETS.fetch(request)') === 1 && !/ASSETS\.fetch\(\s*assetUrl/.test(w)
  && count(w, "'Not found', { status: 404") === 2 && count(w, 'asset.status !== 404') === 1
  && count(w, 'if (!env.ASSETS)') === 1 && count(w, 'const NOFOUNDR') === 1,
  { request: count(w, 'env.ASSETS.fetch(request)'), respostas: count(w, "'Not found', { status: 404"), sem_assets: count(w, 'if (!env.ASSETS)') });
const cspB = grab(baseW, 'const CSP = '), cspN = grab(w, 'const CSP = ');
gate('P10_CSP_inalterado', !!cspB && !!cspN && cspB.body === cspN.body && count(w, "'content-security-policy': CSP") === count(baseW, "'content-security-policy': CSP"),
  { bytes: cspN && bytes(cspN.body), emissoes: count(w, "'content-security-policy': CSP") });
const precache = ((nSw && nSw.body.match(/const PRECACHE_PATHS = \[([^\]]*)\]/) || ['', ''])[1])
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(s => s.includes('?v='));
const misv = nHtml ? precache.filter(p => !nHtml.body.includes(p.replace(/^\//, ''))) : precache;
gate('P11_precache_alinhado_com_a_HTML_servida', misv.length === 0 && precache.length > 0, { caminhos: precache.length, desalinhados: misv });

const assets = fs.readdirSync(`${OUT}/public`).sort();
const assetsBase = fs.readdirSync(`${BASE}/public`).sort();
const difA = assets.filter(a => assetsBase.includes(a) && md5(fs.readFileSync(`${OUT}/public/${a}`)) !== md5(fs.readFileSync(`${BASE}/public/${a}`)));
gate('P12_assets_byte_iguais_a_base_do_404', assets.length === 12 && assets.join() === assetsBase.join() && difA.length === 0,
  { total: assets.length, divergentes: difA });
gate('P13_assets_tambem_iguais_desde_a_v120', (() => {
  const a120 = fs.readdirSync(`${V120}/public`).sort();
  if (a120.join() !== assets.join()) return false;
  return assets.every(a => md5(fs.readFileSync(`${OUT}/public/${a}`)) === md5(fs.readFileSync(`${V120}/public/${a}`)));
})(), { total: assets.length });
gate('P14_wrangler_toml_identico', md5(read(`${OUT}/wrangler.toml`)) === md5(read(`${BASE}/wrangler.toml`))
  && /^name = "bfr-conecta"/m.test(read(`${OUT}/wrangler.toml`)) && /directory = "\.\/public"/.test(read(`${OUT}/wrangler.toml`))
  && /binding = "ASSETS"/.test(read(`${OUT}/wrangler.toml`)) && /main = "worker\.mjs"/.test(read(`${OUT}/wrangler.toml`)),
  { md5: md5(read(`${OUT}/wrangler.toml`)) });
gate('P15_nao_ha_index_html_no_bundle', !fs.existsSync(`${OUT}/public/index.html`) && !fs.existsSync(`${OUT}/index.html`),
  { public: assets.length });
gate('P16_linhagem_reversa_em_disco', fs.existsSync(`${OUT}/base-v120-shell.html`) && fs.existsSync(`${OUT}/sw-v120-embed.js`)
  && md5(fs.readFileSync(`${OUT}/base-v120-shell.html`)) === reguaShellAr.md5
  && md5(fs.readFileSync(`${OUT}/sw-v120-embed.js`)) === reguaSwAr.md5,
  { shell_v120: reguaShellAr, sw_v120: reguaSwAr });
gate('P17_reversao_disponivel', fs.existsSync(`${BASE}/worker.mjs`) && fs.existsSync(`${V120}/worker.mjs`) && !!d404.reversao,
  { para_onde_volta: 'worker-deploy-v120-404/', versao_anterior: d404.deploy && d404.deploy.version_anterior });
gate('P18_esperado_json_coerente', esp.htmlMd5 === reguaCand.md5 && esp.htmlBytes === reguaCand.bytes
  && esp.cacheLabel === LABEL_NEW && esp.baseWorkerMd5 === reguaWork404.md5 && esp.baseShellMd5 === reguaShellAr.md5
  && esp.baseSwMd5 === reguaSwAr.md5 && esp.swBytes === reguaSwAr.bytes, esp);
gate('P19_delta_vs_v120_medido', bytes(w) - bytes(read(`${V120}/worker.mjs`)) === 606,
  { v120: bytes(read(`${V120}/worker.mjs`)), v121: bytes(w), delta: bytes(w) - bytes(read(`${V120}/worker.mjs`)), nota: '530 do handler 404 + 76 da shell v121' });
gate('P20_dir_higienico', fs.readdirSync(OUT).sort().join() === ['base-v120-shell.html', 'esperado-v121.json', 'public', 'sw-v120-embed.js', 'worker.mjs', 'wrangler.toml'].join(),
  { conteudo: fs.readdirSync(OUT).sort() });

const tmp = `${dir}/evidence/.checa-v121-${process.pid}.mjs`;
fs.writeFileSync(tmp, w, 'utf8');
const { spawnSync } = await import('node:child_process');
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
fs.unlinkSync(tmp);
gate('P21_worker_parseia', chk.status === 0, { status: chk.status, stderr: (chk.stderr || '').slice(0, 200) });

out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'PORTAO_V121_VERDE' : 'PORTAO_V121_VERMELHO';
out.totais = { portoes: Object.keys(out).filter(k => /^P\d/.test(k)).length, vermelhos: falhas.length };
out.resumo = { worker_md5: out.disco.md5, worker_bytes: out.disco.bytes, sw_md5: nSw && md5(nSw.body), html_md5: nHtml && md5(nHtml.body), cache: LABEL_NEW };
fs.writeFileSync(OUTDIARIO, JSON.stringify(out, null, 2), 'utf8');
for (const k of Object.keys(out).filter(k => /^P\d/.test(k))) {
  const g = out[k];
  console.log(`${g.passou ? 'OK  ' : 'RED '} ${k}${g.passou ? '' : ' ' + JSON.stringify(g).slice(0, 320)}`);
}
console.log(`\nveredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
console.log(`bundle=${out.resumo.worker_bytes}B ${out.resumo.worker_md5} | SW ${out.resumo.sw_md5} CACHE=${out.resumo.cache} | HTML ${out.resumo.html_md5}`);
console.log(`diario=${OUTDIARIO}`);
process.exit(falhas.length ? 1 : 0);
