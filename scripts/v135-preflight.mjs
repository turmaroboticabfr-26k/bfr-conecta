// V135 — preflight SOMENTE LEITURA antes do deploy da v135 (headers anti-cliquejacking).
// 0 DDL, 0 escrita no banco, 0 mint, 0 deploy. So HTTP GET e leitura de disco.
// O ar e a v134 (8600fc3d): este preflight prova que a v134 servida NAO tem os headers —
// se os tiver, o preflight esta a olhar para outra versao e o deploy aborta (a prova e a
// AUSENCIA do x-frame-options e do frame-ancestors, que o PEN-24 mediu nos assets).
// A URL e lida do diario da v134, nunca dactilografada.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V134 = `${DIR}/evidence/v134-pos-deploy-18-11.json`;
const STATUS_V134 = `${DIR}/evidence/v134-deployments-status-depois-18-11.json`;
const LISTA_V134 = `${DIR}/evidence/v134-deployments-list-depois-18-11.json`;
const ESP_V134 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v134-sidebar/esperado-v134.json`, 'utf8'));
const ESP_V135 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v135-headers/esperado-v135.json`, 'utf8'));
const ESP_BASE = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const OUT = `${DIR}/evidence/v135-preflight-19-11.json`;
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const d134 = JSON.parse(fs.readFileSync(DIARIO_V134, 'utf8'));
const URL_AR = d134.url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const ST = JSON.parse(fs.readFileSync(STATUS_V134, 'utf8'));
const LD = JSON.parse(fs.readFileSync(LISTA_V134, 'utf8'));
const VERSAO_AR = ST.versions[0].version_id;
const PDF_ARQUIVO = 'calendario-letivo-2026.pdf';

const out = { ciclo: 'V135-PREFLIGHT', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0,
  origem: DIARIO_V134, url: URL_AR, versao_esperada_no_ar: VERSAO_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'),
    x_frame: r.headers.get('x-frame-options') };
};

// ---- o que esta no ar ANTES deste deploy deve ser a v134, SEM os headers ----
const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v135-preflight');
const firebase = await get('/firebase-messaging-sw.js');
gate('B1_shell_no_ar_e_a_v134', shell.http === 200 && shell.md5 === ESP_V134.htmlMd5 && shell.bytes === ESP_V134.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado_v134: { md5: ESP_V134.htmlMd5, bytes: ESP_V134.htmlBytes } });
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
gate('B2_sw_no_ar_e_o_da_v134', sw.http === 200 && sw.md5 === ESP_V134.swMd5 && sw.bytes === ESP_V134.swBytes && rotuloAr === ESP_V134.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP_V134.swMd5, bytes: ESP_V134.swBytes, rotulo: ESP_V134.cacheLabel } });
gate('B3_a_shell_no_ar_ainda_nao_tem_os_headers', shell.x_frame === null && !/frame-ancestors/.test(String(shell.csp || '')),
  { x_frame_no_ar: shell.x_frame, csp_com_frame_ancestors: /frame-ancestors/.test(String(shell.csp || '')),
    nota: 'prova de que o defeito do PEN-24 esta no ar antes do deploy; se os headers ja existissem, este preflight estaria a olhar para a versao errada' });
const pdf = await get(`/${PDF_ARQUIVO}`);
gate('B4_o_pdf_no_ar_ainda_sai_sem_os_dois_headers', pdf.http === 200 && pdf.md5 === ESP_BASE.assets.find((a) => a.arquivo === PDF_ARQUIVO).md5
  && pdf.x_frame === null && pdf.csp === null,
  { http: pdf.http, md5: pdf.md5, x_frame: pdf.x_frame, csp: pdf.csp,
    nota: 'o defeito medido pelo PEN-24: um PDF e um documento framavel e saia sem qualquer cabecalho de enquadramento' });
gate('B5_csp_da_shell_permite_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)),
  { csp_presente: String(shell.csp || '').slice(0, 120) + '...' });
gate('B6_rota_inexistente_da_404', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('B7_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const assets = ESP_BASE.assets.map((a) => a.arquivo);
const vivos = [];
for (const f of assets) { const r = await get(`/${f}`); vivos.push({ arquivo: f, http: r.http, md5: r.md5, bytes: r.bytes }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== ESP_BASE.assets[i].md5 || v.bytes !== ESP_BASE.assets[i].bytes);
gate('B8_12_assets_no_ar_batem_com_a_base', desvios.length === 0 && vivos.length === 12, { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
const porData = [...LD].sort((x, y) => y.created_on.localeCompare(x.created_on));
gate('B9_versao_no_servidor_e_a_da_v134_a_100', ST.versions[0].percentage === 100
  && porData[0].versions[0].version_id === VERSAO_AR,
  { status: VERSAO_AR, lista_mais_nova: porData[0].versions[0].version_id, trafego: ST.versions[0].percentage, em: porData[0].created_on });

// ---- o que VAI ser publicado: re-verifica o disco do bundle contra o esperado gateado ----
const workerDisco = fs.readFileSync(`${DIR}/worker-deploy-v135-headers/worker.mjs`);
gate('B10_worker_em_disco_bate_com_o_esperado_v135', md5(workerDisco) === ESP_V135.workerMd5 && workerDisco.length === ESP_V135.workerBytes,
  { medido: { md5: md5(workerDisco), bytes: workerDisco.length }, esperado: { md5: ESP_V135.workerMd5, bytes: ESP_V135.workerBytes } });
gate('B11_marcadores_do_patch_em_disco', (() => {
  const t = workerDisco.toString('utf8');
  const n = (x) => t.split(x).length - 1;
  return { frame_ancestors: n('frame-ancestors'), frame_guard: n('FRAME_GUARD'), x_frame: n('x-frame-options'),
    h_set: n("h.set('content-security-policy', FRAME_GUARD)"), etiqueta_v135: n('bfr-conecta-v135'), etiqueta_v134: n('bfr-conecta-v134') };
})(), { frame_ancestors: 2, frame_guard: 2, x_frame: 2, h_set: 1, etiqueta_v135: 1, etiqueta_v134: 0 });
gate('B12_portoes_do_gerador_v135_estao_todos_verdes', Object.values(ESP_V135.portoesDetalhados || {}).every((v) => v.passou)
  && Object.keys(ESP_V135.portoesDetalhados || {}).length === ESP_V135.portoes,
  { portoes: ESP_V135.portoes, detalhe: Object.entries(ESP_V135.portoesDetalhados || {}).filter(([, v]) => !v.passou).map(([k]) => k) });
gate('B13_dir_do_deploy_tem_12_assets_headers_e_toml', fs.readdirSync(`${DIR}/worker-deploy-v135-headers/public`).sort().join(',') === [...ESP_BASE.assets.map((a) => a.arquivo), '_headers'].sort().join(',')
  && fs.readFileSync(`${DIR}/worker-deploy-v135-headers/wrangler.toml`).equals(fs.readFileSync(`${DIR}/worker-deploy-v134-sidebar/wrangler.toml`)),
  { ficheiros_no_public: fs.readdirSync(`${DIR}/worker-deploy-v135-headers/public`).sort() });
gate('B14_html_do_bundle_nao_mudou', ESP_V135.htmlMd5 === ESP_V134.htmlMd5 && ESP_V135.htmlBytes === ESP_V134.htmlBytes,
  { v135: { md5: ESP_V135.htmlMd5, bytes: ESP_V135.htmlBytes }, v134: { md5: ESP_V134.htmlMd5, bytes: ESP_V134.htmlBytes } });

out.medido_antes = { shell: { ...shell, texto: undefined }, sw: { ...sw, texto: undefined }, notfound, firebase, pdf: { ...pdf, texto: undefined },
  rotuloAr, assets_vivos: vivos };
out.veredito = out.total.falha ? 'V135_PREFLIGHT_COM_DEFEITOS' : 'V135_PREFLIGHT_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
