// V121-4 (#1179) — camada 1 da prova: HTTP rig Node contra o ar, SOMENTE LEITURA.
// Regras derivadas dos diarios (nunca dactilografadas). O par de rotulos e lido do
// disco, a partir do proprio hunk do diario da candidata, porque a memoria tem
// "Supervisor Educacional" e o diario tem outro texto — so o ficheiro faz prova.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const D404 = `${dir}/audit-publicacao-v120-404.json`;
const PRE = `${dir}/evidence/v121-preflight-14-11.json`;
const BUNDLE = `${dir}/worker-deploy-v121`;
const DIARIO_CAND = `${dir}/bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json`;
const OUT = `${dir}/evidence/v121-pos-deploy-http-14-11.json`;
const VERSAO = process.argv[2] || null;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const bytes = s => Buffer.byteLength(s);
const parseRegua = s => { const m = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return m ? { md5: m[1], bytes: +m[2] } : null; };
const out = { ciclo: 'V121-POS-DEPLOY-HTTP', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0, versao_id: VERSAO };
const falhas = [];
const gate = (nome, ok, dados) => { out[nome] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(nome); };
const noCache = { headers: { 'Cache-Control': 'no-cache' } };

const d404 = JSON.parse(fs.readFileSync(D404, 'utf8'));
const pre = JSON.parse(fs.readFileSync(PRE, 'utf8'));
const esp = JSON.parse(fs.readFileSync(`${BUNDLE}/esperado-v121.json`, 'utf8'));
const cd = JSON.parse(fs.readFileSync(DIARIO_CAND, 'utf8'));
const URL_AR = d404.medicao.ar_depois.ar;
const depois404 = d404.medicao.ar_depois;
const rotasAntes = Object.entries(depois404.rotas).filter(([, v]) => v.http === 404).map(([k, v]) => ({ caminho: k, ...v }));
const reguaShellAntes = parseRegua(d404.md5.shell_antes_e_depois);
const reguaSwAntes = parseRegua(d404.md5.sw_antes_e_depois);
const cacheVelha = (/CACHE (bfr-conecta-v\d+)/.exec(d404.md5.sw_antes_e_depois) || [])[1];
const h1 = (cd.hunks || [])[0] || {};
const parEsperado = `education_supervisor:['${h1.rotulo_lido_0}','${h1.rotulo_lido_1}']`;
const REVERSA = `${BUNDLE}/base-v120-shell.html`;
out.reguas = { origem: ['audit-publicacao-v120-404.json', 'v121-preflight-14-11.json', 'portoes-v121-diary.json', 'esperado-v121.json'],
  url: URL_AR, par_de_rotulos: parEsperado, cache_velha: cacheVelha, cache_nova: esp.cacheLabel,
  antes: { shell: reguaShellAntes, sw: reguaSwAntes, worker: parseRegua(d404.md5['worker-deploy-v120-404/worker.mjs_publicado']) },
  depois_esperado: { shell: { md5: esp.htmlMd5, bytes: esp.htmlBytes }, sw: { md5: esp.swMd5, bytes: esp.swBytes } } };

// ---------- A1 shell servida == a candidata, com o par do diario no corpo ----------
async function getShell() { const r = await fetch(URL_AR + '/', noCache); return { resp: r, corpo: await r.text() }; }
let A = await getShell();
for (let i = 0; i < 8 && A.resp.status !== 200; i++) {
  await new Promise(s => setTimeout(s, 5000));
  A = await getShell();
}
out.A1_shell = { http: A.resp.status, bytes: bytes(A.corpo), md5: md5(Buffer.from(A.corpo, 'utf8')),
  ocorrencias_do_par: A.corpo.split(parEsperado).length - 1,
  etiquetas: [...new Set(A.corpo.match(/bfr-conecta-v\d+/g) || [])],
  csp_igual_ao_404: A.resp.headers.get('content-security-policy') === depois404.rotas['/'].csp };
gate('A1_shell_servida_igual_a_candidata', A.resp.status === 200 && out.A1_shell.md5 === esp.htmlMd5 && out.A1_shell.bytes === esp.htmlBytes, out.A1_shell);
gate('A1b_par_de_rotulos_no_corpo_servido_uma_sozinho', out.A1_shell.ocorrencias_do_par === 1, { par: parEsperado, medido: out.A1_shell.ocorrencias_do_par });
gate('A1c_csp_inalterada_no_ar', out.A1_shell.csp_igual_ao_404, { header: A.resp.headers.get('content-security-policy') });

// ---------- A2 SW servido com a etiqueta nova e mesmos bytes ----------
const ASw = await fetch(URL_AR + '/sw-v4.js?v=45', noCache);
const corpoSw = await ASw.text();
out.A2_sw = { http: ASw.status, bytes: bytes(corpoSw), md5: md5(Buffer.from(corpoSw, 'utf8')),
  cache: [...new Set(corpoSw.match(/bfr-conecta-v\d+/g) || [])],
  linha_cache: new RegExp(`const CACHE = '${esp.cacheLabel}';`).test(corpoSw),
  sobra_da_velha: corpoSw.split(cacheVelha).length - 1 };
gate('A2_sw_servido_com_a_etiqueta_nova_mesmos_bytes', ASw.status === 200 && out.A2_sw.md5 === esp.swMd5 && out.A2_sw.bytes === esp.swBytes
  && out.A2_sw.linha_cache && out.A2_sw.sobra_da_velha === 0 && out.A2_sw.cache.length === 1 && out.A2_sw.cache[0] === esp.cacheLabel, out.A2_sw);

// ---------- A3 regressao PEN-27: os caminhos fora do bundle continuam 404 ----------
const med = [];
for (const r of rotasAntes) {
  const res = await fetch(URL_AR + r.caminho, noCache);
  const t = await res.text();
  med.push({ caminho: r.caminho, http: res.status, bytes: bytes(t), md5: md5(Buffer.from(t, 'utf8')), tipo: res.headers.get('content-type') });
}
out.A3_404 = med;
gate('A3_404_permanecem_404_com_o_mesmo_corpo_text_plain', med.length === rotasAntes.length
  && med.every((m, i) => m.http === 404 && m.bytes === rotasAntes[i].bytes && m.md5 === rotasAntes[i].md5 && /text\/plain/.test(m.tipo || '')),
  { total: med.length, desvios: med.filter((m, i) => m.http !== 404 || m.md5 !== rotasAntes[i].md5).map(m => `${m.caminho}=${m.http}`) });

// ---------- A4 os 12 assets do bundle permanecem byte-identicos ----------
const assets = fs.readdirSync(`${BUNDLE}/public`).sort();
const medAssets = [];
for (const a of assets) {
  const local = fs.readFileSync(`${BUNDLE}/public/${a}`);
  const res = await fetch(URL_AR + '/' + encodeURIComponent(a), noCache);
  const buf = Buffer.from(await res.arrayBuffer());
  medAssets.push({ ficheiro: a, http: res.status, local_bytes: local.length, local_md5: md5(local), servido_bytes: buf.length, servido_md5: md5(buf) });
}
out.A4_assets = medAssets;
gate('A4_assets_locais_iguais_a_base_do_404', assets.length === 12
  && assets.every(a => md5(fs.readFileSync(`${BUNDLE}/public/${a}`)) === md5(fs.readFileSync(`${dir}/worker-deploy-v120-404/public/${a}`))), { total: assets.length });
gate('A4b_assets_servidos_batem_com_o_disco', medAssets.every(m => m.http === 200 && m.servido_md5 === m.local_md5 && m.servido_bytes === m.local_bytes),
  { total: medAssets.length, desvios: medAssets.filter(m => m.http !== 200 || m.servido_md5 !== m.local_md5).map(m => `${m.ficheiro}=${m.http}/${m.servido_md5}`) });

// ---------- A5 shell servida == embed do worker em disco == candidata do disco ----------
const w = fs.readFileSync(`${BUNDLE}/worker.mjs`, 'utf8');
function unquote(src, i) { let o = ''; while (i < src.length) { const c = src[i]; if (c === '"') return { body: o, quoteEnd: i }; if (c === '\\') { const n = src[i + 1]; o += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n; i += 2; continue; } o += c; i++; } return null; }
function grab(src, marker) { const k = src.indexOf(marker); if (k < 0) return null; const q = src.indexOf('"', k + marker.length); const u = unquote(src, q + 1); return u ? { ...u, markerAt: k, quoteStart: q } : null; }
const nHtml = grab(w, 'const HTML = '), nSw = grab(w, 'const SW = ');
out.A5_linhagem = { embed_html_md5: md5(nHtml.body), embed_html_bytes: bytes(nHtml.body), embed_sw_md5: md5(nSw.body),
  worker_md5: md5(w), worker_bytes: bytes(w), shell_servida_md5: out.A1_shell.md5, sw_servido_md5: out.A2_sw.md5 };
gate('A5_cadeia_inteira_servida_igual_a_disco', out.A1_shell.md5 === out.A5_linhagem.embed_html_md5
  && out.A2_sw.md5 === out.A5_linhagem.embed_sw_md5 && out.A5_linhagem.worker_md5 === esp.workerMd5
  && out.A5_linhagem.embed_html_md5 === pre.reguas.candidata.md5 && out.A5_linhagem.embed_sw_md5 === esp.swMd5, out.A5_linhagem);

// ---------- A6 rotulos: so a linha do accountLabels mudou face ao ar anterior ----------
const servido = A.corpo.split('\n');
const bl = fs.readFileSync(REVERSA, 'utf8').split('\n');
const diffLinhas = [];
for (let i = 0; i < Math.max(bl.length, servido.length); i++) if (bl[i] !== servido[i]) diffLinhas.push(i + 1);
out.A6_linhagem = { linhas_antes: bl.length, linhas_agora: servido.length, alteradas: diffLinhas, diario: h1.line,
  reversa_md5: md5(fs.readFileSync(REVERSA)), reversa_bytes: bytes(fs.readFileSync(REVERSA, 'utf8')), régua_antes: reguaShellAntes };
gate('A6a_reversao_em_disco_igual_a_shell_publicada_antes', out.A6_linhagem.reversa_md5 === reguaShellAntes.md5 && out.A6_linhagem.reversa_bytes === reguaShellAntes.bytes, out.A6_linhagem);
gate('A6b_uma_unica_linha_diferente_da_shell_publicada_antes', diffLinhas.length === 1 && bl.length === servido.length && diffLinhas[0] === h1.line,
  { linhas_antes: bl.length, linhas_agora: servido.length, alteradas: diffLinhas, diario: h1.line });
gate('A6c_a_linha_alterada_e_o_accountLabels', diffLinhas.length === 1 && /const accountLabels = \{/.test(servido[diffLinhas[0] - 1] || ''), { linha: diffLinhas[0] });

const nomes = Object.keys(out).filter(k => /^A\d/.test(k));
const portoes = nomes.filter(k => 'passou' in out[k]);
const blocos = nomes.filter(k => !('passou' in out[k]));
out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'V121_HTTP_OK' : 'V121_HTTP_FALHA';
out.totais = { portoes: portoes.length, blocos_de_evidencia: blocos.length, vermelhos: falhas.length };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
for (const k of portoes) {
  const g = out[k];
  console.log(`${g.passou ? 'OK  ' : 'RED '} ${k}${g.passou ? '' : ' ' + JSON.stringify(g).slice(0, 500)}`);
}
console.log(`\nblocos de evidencia (nao portoes): ${blocos.join(', ')}`);
console.log(`\nveredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
console.log(`shell=${out.A1_shell.bytes}B ${out.A1_shell.md5} etiquetas=${out.A1_shell.etiquetas.join(',')}`);
console.log(`sw=${out.A2_sw.bytes}B ${out.A2_sw.md5} cache=${out.A2_sw.cache.join(',')} | 404=${out.A3_404.length} | assets_ok=${out.A4_assets.filter(m => m.http === 200 && m.servido_md5 === m.local_md5).length}/${out.A4_assets.length}`);
console.log(`par_servido="${parEsperado}" ocorrencias=${out.A1_shell.ocorrencias_do_par}`);
console.log(`diario=${OUT}`);
process.exit(falhas.length ? 1 : 0);
