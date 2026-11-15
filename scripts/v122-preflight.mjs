// V122-PREFLIGHT — preflight SOMENTE LEITURA antes de publicar a candidata v122 (RM-1.5).
// 0 DDL, 0 escrita em banco, 0 mint, 0 deploy. Só HTTP GET e leitura de disco.
// Todas as réguas (URL, md5, bytes, caminhos de 404) são DERIVADAS dos diários, nunca dactilografadas.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V121 = `${dir}/audit-publicacao-v121.json`;
const V122_DIR = `${dir}/worker-deploy-v122-push`;
const V121_DIR = `${dir}/worker-deploy-v121`;
const ESP = `${V122_DIR}/esperado-v122.json`;
const CAND_SW = `${dir}/bfr-candidata-v122-push-sw/sw-v4.js`;
const REVERSA_SW = `${dir}/bfr-candidata-v122-push-sw/sw-v4-reversa.js`;
const DIARIO_CAND = `${dir}/bfr-candidata-v122-push-sw/portoes-v122-diary.json`;
const DIARIO_BANC = `${dir}/bfr-candidata-v122-push-sw/portoes-v122-bancada.json`;
const OUT = `${dir}/evidence/v122-preflight-15-11.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const bytes = s => Buffer.byteLength(s);
const read = p => fs.readFileSync(p, 'utf8');
const count = (s, t) => s.split(t).length - 1;
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
  return u ? { ...u, markerAt: k } : null;
}

const out = { ciclo: 'V122-PREFLIGHT', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0 };
const falhas = [];
const gate = (nome, ok, dados) => { out[nome] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(nome); };

// ---------- réguas derivadas ----------
const d121 = JSON.parse(read(DIARIO_V121));
const URL_AR = d121.deploy.url;
const reguaShell = parseRegua(d121.md5['shell_depois']);        // v121 publicada = base da v122
const reguaSwV121 = parseRegua(d121.md5['sw_depois']);
const corpo404 = parseRegua(d121.md5['corpo_do_404']);
const cacheLabelAr = (/CACHE (bfr-conecta-v\d+)/.exec(String(d121.md5['sw_depois'])) || [])[1];
const rotas404 = Object.entries(d121.medicao.ar_depois.rotas).filter(([, v]) => v.http === 404).map(([k, v]) => ({ caminho: k, ...v }));
const esp = JSON.parse(read(ESP));

out.reguas = {
  origem: ['audit-publicacao-v121.json', 'worker-deploy-v122-push/esperado-v122.json'],
  url: URL_AR,
  ar_v121: { worker: parseRegua(d121.md5['worker-deploy-v121/worker.mjs_publicado']), shell: reguaShell, sw: reguaSwV121, versao: d121.deploy.version_id },
  candidata_v122: { worker: { md5: esp.workerMd5, bytes: esp.workerBytes }, sw: { md5: esp.swMd5, bytes: esp.swBytes }, html: { md5: esp.htmlMd5, bytes: esp.htmlBytes }, cache: esp.cacheLabel, delta: esp.deltaWorkerBytes },
  caminhos_404_no_diario: rotas404.map(r => r.caminho),
};

gate('G0_url_unica_e_diario_coerente', typeof URL_AR === 'string' && /^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(URL_AR)
  && !!reguaShell && !!reguaSwV121 && !!corpo404 && !!cacheLabelAr && rotas404.length >= 5,
  { url: URL_AR, cache_ar: cacheLabelAr, quarenta_e_quatro: rotas404.length, versao: d121.deploy.version_id });
gate('G0b_esperado_v122_pede_ok_literal', esp.ok_literal === 'publicar v122', { ok_literal: esp.ok_literal });

// ---------- D1 worker candidata bate com o esperado ----------
const wBuf = fs.readFileSync(`${V122_DIR}/worker.mjs`);
const w = read(`${V122_DIR}/worker.mjs`);
out.worker = { bytes: wBuf.length, md5: md5(wBuf) };
gate('D1_worker_igual_ao_esperado', out.worker.md5 === esp.workerMd5 && out.worker.bytes === esp.workerBytes, out.worker);

// ---------- D2/ D3 embed SW do worker candidata ----------
const swG = grab(w, 'const SW = ');
const htmlG = grab(w, 'const HTML = ');
gate('D2a_embeds_localizados', !!swG && !!htmlG);
const swBody = swG ? swG.body : '';
const htmlBody = htmlG ? htmlG.body : '';
out.embed_sw = { bytes: bytes(swBody), md5: md5(Buffer.from(swBody, 'utf8')) };
gate('D2_embed_sw_igual_a_candidata', out.embed_sw.md5 === esp.swMd5 && out.embed_sw.bytes === esp.swBytes, out.embed_sw);
gate('D3a_sw_tem_ouvinte_push', count(swBody, "addEventListener('push'") === 1, { push: count(swBody, "addEventListener('push'") });
gate('D3b_sw_tem_ouvinte_notificationclick', count(swBody, "addEventListener('notificationclick'") === 1, { nc: count(swBody, "addEventListener('notificationclick'") });
gate('D3c_sw_chama_showNotification', count(swBody, 'showNotification(') === 1, { showNotification: count(swBody, 'showNotification(') });
gate('D3d_sw_chama_openWindow', count(swBody, 'openWindow(') === 1, { openWindow: count(swBody, 'openWindow(') });
gate('D3e_sw_sem_chamada_importScripts', count(swBody, 'importScripts(') === 0, { importScripts_chamada: count(swBody, 'importScripts('), importScripts_palavra: count(swBody, 'importScripts') });
gate('D3f_sw_etiqueta_cache_sozinha_v122', count(swBody, `CACHE = '${esp.cacheLabel}'`) === 1
  && (swBody.match(/bfr-conecta-v\d+/g) || []).every(t => t === 'bfr-conecta-v122' || t === 'bfr-conecta-'),
  { rotulos: [...new Set(swBody.match(/bfr-conecta-v\d+/g) || [])] });

// ---------- D4 embed HTML inalterado = shell v121 publicada ----------
out.embed_html = { bytes: bytes(htmlBody), md5: md5(Buffer.from(htmlBody, 'utf8')) };
gate('D4_embed_html_igual_a_shell_v121_no_ar', out.embed_html.md5 === reguaShell.md5 && out.embed_html.bytes === reguaShell.bytes
  && out.embed_html.md5 === esp.htmlMd5 && out.embed_html.bytes === esp.htmlBytes, out.embed_html);

// ---------- D5 base do worker = v121 publicada ----------
const wBaseBuf = fs.readFileSync(`${V121_DIR}/worker.mjs`);
const reguaBase = parseRegua(d121.md5['worker-deploy-v121/worker.mjs_publicado']);
out.worker_base = { bytes: wBaseBuf.length, md5: md5(wBaseBuf) };
gate('D5_base_e_a_v121_publicada', out.worker_base.md5 === reguaBase.md5 && out.worker_base.bytes === reguaBase.bytes
  && out.worker_base.md5 === esp.baseWorkerMd5 && out.worker_base.bytes === esp.baseWorkerBytes, { base: out.worker_base, esperado: esp.baseWorkerMd5 });

// ---------- D6 delta do worker bate com o esperado (escapado) ----------
const delta = out.worker.bytes - out.worker_base.bytes;
gate('D6_delta_do_worker_bate', delta === esp.deltaWorkerBytes, { medido: delta, esperado: esp.deltaWorkerBytes });

// ---------- D7 handler do 404 intacto na candidata ----------
gate('D7_handler_do_404_intacto', count(w, 'env.ASSETS.fetch(request)') === 1
  && !/ASSETS\.fetch\(\s*assetUrl/.test(w)
  && count(w, "'Not found', { status: 404") === 2
  && count(w, 'asset.status !== 404') === 1
  && count(w, 'if (!env.ASSETS)') === 1
  && count(w, 'const NOFOUNDR') === 1,
  { request_form: count(w, 'env.ASSETS.fetch(request)'), respostas_404: count(w, "'Not found', { status: 404"), repasse_asset: count(w, 'asset.status !== 404'), sem_assets: count(w, 'if (!env.ASSETS)'), definicao_NOFOUNDR: count(w, 'const NOFOUNDR') });

// ---------- D8 12 assets + wrangler.toml byte-identicos a base v121 ----------
const assetsNovos = fs.readdirSync(`${V122_DIR}/public`).sort();
const assetsBase = fs.readdirSync(`${V121_DIR}/public`).sort();
const assetsIguais = assetsNovos.length === assetsBase.length && assetsNovos.every(f => read(`${V122_DIR}/public/${f}`) === read(`${V121_DIR}/public/${f}`));
const tomlIguais = md5(fs.readFileSync(`${V122_DIR}/wrangler.toml`)) === md5(fs.readFileSync(`${V121_DIR}/wrangler.toml`));
gate('D8_assets_e_toml_identicos_a_v121', assetsNovos.length === 12 && assetsIguais && tomlIguais, { total: assetsNovos.length, desvios: assetsIguais ? [] : 'divergem', toml: tomlIguais });

// ---------- D9 reversao do SW byte-identicamente a base v121 ----------
const revBuf = fs.readFileSync(REVERSA_SW);
gate('D9_sw_reversa_igual_a_base_v121', md5(revBuf) === reguaSwV121.md5 && revBuf.length === reguaSwV121.bytes, { reversa: { md5: md5(revBuf), bytes: revBuf.length }, base: reguaSwV121 });

// ---------- D10 diarias da candidata verdes e nao publicadas ----------
const cd = JSON.parse(read(DIARIO_CAND));
const bd = JSON.parse(read(DIARIO_BANC));
const redsOf = d => (Array.isArray(d.portoes) ? d.portoes.filter(p => p.ok === false).length : (d.totais?.vermelhos ?? d.vermelhos ?? -1));
gate('D10a_diario_candidata_verde_nao_publicada', cd.verdict === 'V122_SW_ESTRUTURAL_OK' && cd.published === false && redsOf(cd) === 0, { verdict: cd.verdict, published: cd.published, portoes: Array.isArray(cd.portoes) ? cd.portoes.length : null, vermelhos: redsOf(cd) });
gate('D10b_bancada_verde', bd.verdict === 'V122_BANCADA_OK' && redsOf(bd) === 0, { verdict: bd.verdict, portoes: Array.isArray(bd.portoes) ? bd.portoes.length : null, vermelhos: redsOf(bd) });
gate('D10c_candidata_sw_disk_igual_a_esperada', md5(fs.readFileSync(CAND_SW)) === esp.swMd5, { sw_disco: md5(fs.readFileSync(CAND_SW)) });

// ---------- A1 ar ainda e a shell v121 ----------
const resp = await fetch(URL_AR + '/', { headers: { 'Cache-Control': 'no-cache' } });
const corpo = await resp.text();
out.ar_shell = { http: resp.status, bytes: bytes(corpo), md5: md5(Buffer.from(corpo, 'utf8')) };
gate('A1_ar_ainda_v121', out.ar_shell.http === 200 && out.ar_shell.md5 === reguaShell.md5 && out.ar_shell.bytes === reguaShell.bytes, out.ar_shell);

// ---------- A2 SW servido ainda SEM handlers push (o "antes") ----------
const respSw = await fetch(URL_AR + '/sw-v4.js?v=45', { headers: { 'Cache-Control': 'no-cache' } });
const corpoSw = await respSw.text();
out.ar_sw = { http: respSw.status, bytes: bytes(corpoSw), md5: md5(Buffer.from(corpoSw, 'utf8')), cache: corpoSw.match(/bfr-conecta-v\d+/g) || [], push: count(corpoSw, "addEventListener('push'"), nc: count(corpoSw, "addEventListener('notificationclick'") };
gate('A2_sw_ar_ainda_v121_sem_push', out.ar_sw.md5 === reguaSwV121.md5 && out.ar_sw.bytes === reguaSwV121.bytes
  && out.ar_sw.push === 0 && out.ar_sw.nc === 0 && (out.ar_sw.cache || []).includes('bfr-conecta-v121'), out.ar_sw);

// ---------- A3 regressao dos 404 permanece ----------
const medidos = [];
for (const r of rotas404) {
  const res = await fetch(URL_AR + r.caminho, { headers: { 'Cache-Control': 'no-cache' } });
  const t = await res.text();
  medidos.push({ caminho: r.caminho, http: res.status, bytes: bytes(t), md5: md5(Buffer.from(t, 'utf8')) });
}
out.regressao_404 = medidos;
gate('A3_404_permanecem', medidos.length === rotas404.length && medidos.every((m, i) => m.http === 404 && m.md5 === corpo404.md5 && m.bytes === corpo404.bytes),
  { total: medidos.length, desvios: medidos.filter(m => m.http !== 404).map(m => `${m.caminho}=${m.http}`) });

out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'V122_PREFLIGHT_OK' : 'V122_PREFLIGHT_FALHA';
out.totais = { portoes: Object.keys(out).filter(k => /^(G|D|A)\d/.test(k)).length, vermelhos: falhas.length };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
for (const k of Object.keys(out).filter(k => /^(G|D|A)\d/.test(k))) {
  const g = out[k];
  console.log(`${g.passou ? 'OK  ' : 'RED '} ${k}${g.passou ? '' : ' ' + JSON.stringify(g).slice(0, 360)}`);
}
console.log(`\nveredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
console.log(`ar_shell=${out.ar_shell.bytes}B ${out.ar_shell.md5} | candidata worker=${out.worker.bytes}B ${out.worker.md5} sw=${out.embed_sw.bytes}B ${out.embed_sw.md5}`);
console.log(`ar_sw=${out.ar_sw.bytes}B ${out.ar_sw.md5} push=${out.ar_sw.push} nc=${out.ar_sw.nc} cache=${out.ar_sw.cache}`);
console.log(`diario=${OUT}`);
process.exit(falhas.length ? 1 : 0);
