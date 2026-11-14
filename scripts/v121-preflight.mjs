// V121-1 (#1176) — preflight SOMENTE LEITURA antes de publicar a candidata v121 (PEN-33).
// 0 DDL, 0 escrita em banco, 0 mint, 0 deploy. Só HTTP GET e leitura de disco.
// Todas as réguas (URL, md5, bytes, caminhos de 404) são DERIVADAS dos diários, nunca dactilografadas.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_404 = `${dir}/audit-publicacao-v120-404.json`;
const DIARIO_V120 = `${dir}/audit-publicacao-v120.json`;
const BASE_DIR = `${dir}/worker-deploy-v120-404`;
const V120_DIR = `${dir}/worker-deploy-v120`;
const CAND = `${dir}/bfr-candidata-v121-rotulos-supervisor/index.html`;
const CAND_DIARY = `${dir}/bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json`;
const BASE_SHELL = `${dir}/bfr-candidata-v120-setrole-supervisor/index.html`;
const OUT = `${dir}/evidence/v121-preflight-14-11.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const bytes = s => Buffer.byteLength(s);
const count = (s, t) => s.split(t).length - 1;
const parseRegua = s => { const m = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return m ? { md5: m[1], bytes: +m[2] } : null; };
const out = { ciclo: 'V121-PREFLIGHT', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0 };
const falhas = [];
const gate = (nome, ok, dados) => { out[nome] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(nome); };

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

// ---------- réguas derivadas ----------
const d404 = JSON.parse(fs.readFileSync(DIARIO_404, 'utf8'));
const depois = d404.medicao.ar_depois;
const URL_AR = depois.ar;
const reguaShell = parseRegua(d404.md5.shell_antes_e_depois);
const reguaSw = parseRegua(d404.md5.sw_antes_e_depois);
const cacheLabelAr = (/CACHE (bfr-conecta-v\d+)/.exec(d404.md5.sw_antes_e_depois) || [])[1];
const reguaWorkerBase = parseRegua(d404.md5['worker-deploy-v120-404/worker.mjs_publicado']);
const rotas404 = Object.entries(depois.rotas).filter(([, v]) => v.http === 404).map(([k, v]) => ({ caminho: k, ...v }));
const cd = JSON.parse(fs.readFileSync(CAND_DIARY, 'utf8'));
const reguaCand = { md5: cd.candidate_md5, bytes: cd.candidate_bytes, delta: cd.candidate_delta_bytes };
const reguaBase = { md5: cd.base_md5, bytes: cd.base_bytes };
out.reguas = { origem: ['audit-publicacao-v120-404.json', 'portoes-v121-diary.json'], url: URL_AR,
  ar: { worker: reguaWorkerBase, shell: reguaShell, sw: reguaSw, cache: cacheLabelAr, versao: d404.deploy.version_id },
  candidata: reguaCand, base: reguaBase, caminhos_404_no_diario: rotas404.map(r => r.caminho) };

gate('G0_url_unica_e_diario_coerente', typeof URL_AR === 'string' && /^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(URL_AR)
  && !!reguaShell && !!reguaWorkerBase && !!reguaSw && !!cacheLabelAr && rotas404.length >= 5,
  { url: URL_AR, cache: cacheLabelAr, quarenta_e_quatro: rotas404.length, versao: d404.deploy.version_id });
gate('G0b_diario_da_candidata_verde_e_nao_publicada', cd.verdict === 'ROTULOS_OK' && cd.published === false,
  { verdict: cd.verdict, published: cd.published });

// ---------- G1 o ar é mesmo a shell da régua ----------
const resp = await fetch(URL_AR + '/', { headers: { 'Cache-Control': 'no-cache' } });
const corpo = await resp.text();
out.ar = { http: resp.status, bytes: bytes(corpo), md5: md5(Buffer.from(corpo, 'utf8')),
  csp_igual_ao_diario: resp.headers.get('content-security-policy') === depois.rotas['/'].csp,
  cache_label_no_corpo: (corpo.match(/bfr-conecta-v\d+/g) || []).length };
gate('G1_ar_bate_com_a_regua', resp.status === 200 && out.ar.md5 === reguaShell.md5 && out.ar.bytes === reguaShell.bytes
  && out.ar.csp_igual_ao_diario, { esperado: reguaShell, medido: { md5: out.ar.md5, bytes: out.ar.bytes } });

// ---------- G2 regressão PEN-27: os caminhos fora do bundle continuam 404 ----------
const medidos = [];
for (const r of rotas404) {
  const res = await fetch(URL_AR + r.caminho, { headers: { 'Cache-Control': 'no-cache' } });
  const t = await res.text();
  medidos.push({ caminho: r.caminho, http: res.status, bytes: bytes(t), md5: md5(Buffer.from(t, 'utf8')), tipo: res.headers.get('content-type') });
}
out.regressao_404 = medidos;
gate('G2_404_permanecem_404_com_o_mesmo_corpo', medidos.length === rotas404.length
  && medidos.every((m, i) => m.http === 404 && m.bytes === rotas404[i].bytes && m.md5 === rotas404[i].md5),
  { total: medidos.length, esperado_md5_corpo: rotas404[0] && rotas404[0].md5,
    desvios: medidos.filter((m, i) => m.http !== 404 || m.md5 !== rotas404[i].md5).map(m => `${m.caminho}=${m.http}`) });

// ---------- G3 candidata em disco bate com o diário ----------
const candBuf = fs.readFileSync(CAND);
const cand = candBuf.toString('utf8');
out.candidata = { bytes: candBuf.length, md5: md5(candBuf), linhas: cand.split('\n').length };
gate('G3_candidata_na_regua', out.candidata.md5 === reguaCand.md5 && out.candidata.bytes === reguaCand.bytes, out.candidata);

// ---------- G4 linhagem contra o shell publicado ----------
const baseBuf = fs.readFileSync(BASE_SHELL);
const base = baseBuf.toString('utf8');
gate('G4a_base_congelada_e_o_ar', md5(baseBuf) === out.ar.md5 && baseBuf.length === out.ar.bytes
  && md5(baseBuf) === reguaBase.md5 && baseBuf.length === reguaBase.bytes, { base: { md5: md5(baseBuf), bytes: baseBuf.length }, ar: { md5: out.ar.md5, bytes: out.ar.bytes } });
const bl = base.split('\n'), cl = cand.split('\n');
const diff = [];
for (let i = 0; i < Math.max(bl.length, cl.length); i++) if (bl[i] !== cl[i]) diff.push(i + 1);
out.linhagem = { linhas_base: bl.length, linhas_candidata: cl.length, linhas_alteradas: diff, delta_bytes: candBuf.length - baseBuf.length, hunks: cd.hunks };
gate('G4b_uma_unica_linha_alterada_mesmo_total_de_linhas', diff.length === 1 && bl.length === cl.length, { linhas_alteradas: diff, bl: bl.length, cl: cl.length });
gate('G4c_delta_bate_com_o_diario', candBuf.length - baseBuf.length === reguaCand.delta, { medido: candBuf.length - baseBuf.length, diario: reguaCand.delta });
gate('G4d_a_unica_mudanca_e_o_mapa_accountLabels', diff.length === 1 && bl[diff[0] - 1].includes('const accountLabels = {'), { linha: diff[0] });
gate('G4e_fora_dessa_linha_nada_mudou', (() => {
  const semLinha = s => s.split('\n').filter((_, i) => i + 1 !== diff[0]).join('\n');
  return md5(Buffer.from(semLinha(base), 'utf8')) === md5(Buffer.from(semLinha(cand), 'utf8'));
})());

// ---------- G5 worker base == o publicado do 404, com o handler intacto ----------
const baseW = fs.readFileSync(`${BASE_DIR}/worker.mjs`, 'utf8');
out.worker_base = { bytes: bytes(baseW), md5: md5(baseW) };
gate('G5a_worker_base_e_o_do_404', out.worker_base.md5 === reguaWorkerBase.md5 && out.worker_base.bytes === reguaWorkerBase.bytes, out.worker_base);
const bHtml = grab(baseW, 'const HTML = ');
const bSw = grab(baseW, 'const SW = ');
gate('G5b_embeds_localizados_no_worker_base', !!bHtml && !!bSw);
if (bHtml && bSw) {
  out.embeds_base = { html_bytes: bytes(bHtml.body), html_md5: md5(bHtml.body), sw_bytes: bytes(bSw.body), sw_md5: md5(bSw.body) };
  gate('G5c_embed_HTML_igual_ao_ar', out.embeds_base.html_md5 === out.ar.md5 && out.embeds_base.html_bytes === out.ar.bytes, out.embeds_base);
  gate('G5d_embed_SW_igual_ao_servido_e_so_com_a_etiqueta_da_ar', out.embeds_base.sw_md5 === reguaSw.md5 && out.embeds_base.sw_bytes === reguaSw.bytes
    && count(bSw.body, cacheLabelAr) === 1 && count(bSw.body, 'bfr-conecta-v121') === 0, out.embeds_base);
}
gate('G5e_handler_do_404_presente_na_base', count(baseW, 'env.ASSETS.fetch(request)') === 1
  && !/ASSETS\.fetch\(\s*assetUrl/.test(baseW)
  && count(baseW, "'Not found', { status: 404") === 2
  && count(baseW, 'asset.status !== 404') === 1
  && count(baseW, 'if (!env.ASSETS)') === 1
  && count(baseW, 'const NOFOUNDR') === 1,
  { request_form: count(baseW, 'env.ASSETS.fetch(request)'), string_form: /ASSETS\.fetch\(\s*assetUrl/.test(baseW),
    respostas_404: count(baseW, "'Not found', { status: 404"), repasse_asset: count(baseW, 'asset.status !== 404'),
    sem_assets: count(baseW, 'if (!env.ASSETS)'), definicao_NOFOUNDR: count(baseW, 'const NOFOUNDR') });
const respSw = await fetch(URL_AR + '/sw-v4.js?v=45', { headers: { 'Cache-Control': 'no-cache' } });
const corpoSw = await respSw.text();
out.sw_servido = { http: respSw.status, bytes: bytes(corpoSw), md5: md5(Buffer.from(corpoSw, 'utf8')), cache_label: (corpoSw.match(/bfr-conecta-v\d+/g) || []) };
gate('G5f_SW_servido_igual_ao_embed', out.sw_servido.md5 === reguaSw.md5 && out.sw_servido.bytes === reguaSw.bytes, out.sw_servido);

// ---------- G6 bundle: os 12 assets não mudam desde a era v120 ----------
const assets = fs.readdirSync(`${BASE_DIR}/public`).sort();
const difAssets = assets.filter(a => md5(fs.readFileSync(`${BASE_DIR}/public/${a}`)) !== md5(fs.readFileSync(`${V120_DIR}/public/${a}`)));
const tomlIguais = md5(fs.readFileSync(`${BASE_DIR}/wrangler.toml`)) === md5(fs.readFileSync(`${V120_DIR}/wrangler.toml`));
gate('G6_assets_e_toml_byte_identicos_desde_a_v120', assets.length === 12 && difAssets.length === 0 && tomlIguais,
  { total: assets.length, divergentes: difAssets, wrangler_toml_igual: tomlIguais });

// ---------- G7 a candidata é exactamente a mudança pretendida ----------
const ancora = "education_supervisor:['";
gate('G7a_chave_nova_ocorre_acrescida_de_um', count(cand, ancora) === count(base, ancora) + 1 && count(cl[diff[0] - 1] || '', ancora) === 1,
  { na_candidata: count(cand, ancora), na_base: count(base, ancora), na_linha_do_hunk: count(cl[diff[0] - 1] || '', ancora) });
const parNovo = /education_supervisor:\['([^']*)','([^']*)'\]/.exec(diff.length === 1 ? cl[diff[0] - 1] : '');
const h1 = (cd.hunks || [])[0] || {};
gate('G7b_rotulos_sao_os_lidos_pelo_gerador', !!parNovo && parNovo[1] === h1.rotulo_lido_0 && parNovo[2] === h1.rotulo_lido_1,
  { linha: diff[0], no_corpo: parNovo && { aba: parNovo[1], papel: parNovo[2] }, no_diario: { aba: h1.rotulo_lido_0, papel: h1.rotulo_lido_1 } });
gate('G7b2_linha_do_hunk_bate_com_a_differenca', diff.length === 1 && diff[0] === h1.line, { diff: diff[0], diario: h1.line });
const lb0 = [], lc0 = [];
bl.forEach((l, i) => { if (l.includes(ancora)) lb0.push(i + 1); });
cl.forEach((l, i) => { if (l.includes(ancora)) lc0.push(i + 1); });
gate('G7b3_par_novo_e_do_accountLabels_e_a_ocorrencia_antiga_nao_se_toca',
  lc0.length === lb0.length + 1 && lc0.includes(diff[0])
  && /const accountLabels = \{/.test(cl[diff[0] - 1])
  && lb0.every(n => !diff.includes(n) && bl[n - 1] === cl[n - 1]),
  { linhas_na_base: lb0, linhas_na_candidata: lc0, linha_nova: diff[0] });
gate('G7c_candidata_nao_contem_etiqueta_de_cache', count(cand, cacheLabelAr) === 0 && count(cand, 'bfr-conecta-v121') === 0);
gate('G7d_saude_do_html', cand.startsWith('<!') && cand.trimEnd().endsWith('</html>')
  && count(cand, '<script') === count(base, '<script') && count(cand, '</script>') === count(base, '</script>'),
  { scripts_cand: count(cand, '<script'), scripts_base: count(base, '<script') });

// ---------- G8 destino livre + o diário da v120 ainda legível para a reversão ----------
const dV120 = JSON.parse(fs.readFileSync(DIARIO_V120, 'utf8'));
gate('G8_destino_livre', !fs.existsSync(`${dir}/worker-deploy-v121`), { existe: fs.existsSync(`${dir}/worker-deploy-v121`) });
gate('G9_reversao_disponivel_em_disco', fs.existsSync(`${BASE_DIR}/worker.mjs`) && fs.existsSync(`${V120_DIR}/worker.mjs`)
  && !!d404.reversao && !!dV120, { reversao_404_para: d404.deploy.version_anterior, origem: 'worker-deploy-v120-404/' });

out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'V121_PREFLIGHT_OK' : 'V121_PREFLIGHT_FALHA';
out.totais = { portoes: Object.keys(out).filter(k => /^G\d/.test(k)).length, vermelhos: falhas.length };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
for (const k of Object.keys(out).filter(k => /^G\d/.test(k))) {
  const g = out[k];
  console.log(`${g.passou ? 'OK  ' : 'RED '} ${k}${g.passou ? '' : ' ' + JSON.stringify(g).slice(0, 400)}`);
}
console.log(`\nveredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
console.log(`ar=${out.ar.bytes}B ${out.ar.md5} | candidata=${out.candidata.bytes}B ${out.candidata.md5} | worker_base=${out.worker_base.bytes}B ${out.worker_base.md5}`);
console.log(`diario=${OUT}`);
process.exit(falhas.length ? 1 : 0);
