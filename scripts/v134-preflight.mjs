// V134 — preflight SOMENTE LEITURA antes do deploy da v134. 0 DDL, 0 escrita no banco, 0 mint, 0 deploy.
// So HTTP GET e leitura de disco. Diferenca face ao preflight da v133: o ar ja nao e a v123, e a v133
// (de82cec5, 18/11 05:21:18Z), pelo que as reguas de «antes» vem de worker-deploy-v133-municipal/
// esperado-v133.json + evidence/v133-{deployments-status,pos-deploy}-depois-18-11.json. A URL e lida do
// diario da v133, nunca dactilografada. Este ciclo prova ainda que a ofensora (o bloco sm8-fix) ESTA
// na shell servida — se nao estiver, o preflight esta a olhar para outra versao e o deploy aborta.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V133 = `${DIR}/evidence/v133-pos-deploy-18-11.json`;
const STATUS_DEPOIS_V133 = `${DIR}/evidence/v133-deployments-status-depois-18-11.json`;
const LISTA_DEPOIS_V133 = `${DIR}/evidence/v133-deployments-list-depois-18-11.json`;
const ESP_V133 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v133-municipal/esperado-v133.json`, 'utf8'));
const ESP_V134 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v134-sidebar/esperado-v134.json`, 'utf8'));
const ESP_BASE = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const OUT = `${DIR}/evidence/v134-preflight-18-11.json`;
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const d133 = JSON.parse(fs.readFileSync(DIARIO_V133, 'utf8'));
const URL_AR = d133.url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const ST = JSON.parse(fs.readFileSync(STATUS_DEPOIS_V133, 'utf8'));
const LD = JSON.parse(fs.readFileSync(LISTA_DEPOIS_V133, 'utf8'));
const VERSAO_AR = ST.versions[0].version_id;

const out = { ciclo: 'V134-PREFLIGHT', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0,
  origem: DIARIO_V133, url: URL_AR, versao_esperada_no_ar: VERSAO_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy') };
};

// ---- o que esta no ar ANTES deste deploy deve ser a v133 ----
const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v134-preflight');
const firebase = await get('/firebase-messaging-sw.js');
gate('B1_shell_no_ar_e_a_v133', shell.http === 200 && shell.md5 === ESP_V133.htmlMd5 && shell.bytes === ESP_V133.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado_v133: { md5: ESP_V133.htmlMd5, bytes: ESP_V133.htmlBytes } });
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
gate('B2_sw_no_ar_e_o_da_v133', sw.http === 200 && sw.md5 === ESP_V133.swMd5 && sw.bytes === ESP_V133.swBytes && rotuloAr === ESP_V133.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP_V133.swMd5, bytes: ESP_V133.swBytes, rotulo: ESP_V133.cacheLabel } });
const ofensoraNoAr = (shell.texto.split('bfr-mobile-nav-sm8-fix').length - 1);
gate('B3_a_ofensora_esta_mesmo_na_shell_servida', ofensoraNoAr === 1,
  { ocorrencias_na_shell_v133: ofensoraNoAr, nota: 'prova que este preflight olha para a versao que contem o bloco que a v134 remove' });
gate('B4_csp_da_shell_permite_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)),
  { csp_presente: String(shell.csp || '').slice(0, 120) + '...' });
gate('B5_rota_inexistente_da_404', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('B6_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const assets = ESP_BASE.assets.map((a) => a.arquivo);
const vivos = [];
for (const f of assets) { const r = await get(`/${f}`); vivos.push({ arquivo: f, http: r.http, md5: r.md5, bytes: r.bytes }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== ESP_BASE.assets[i].md5 || v.bytes !== ESP_BASE.assets[i].bytes);
gate('B7_12_assets_no_ar_batem_com_a_base', desvios.length === 0 && vivos.length === 12, { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
const porData = [...LD].sort((x, y) => y.created_on.localeCompare(x.created_on));
gate('B8_versao_no_servidor_e_a_da_v133_a_100', ST.versions[0].percentage === 100
  && porData[0].versions[0].version_id === VERSAO_AR && VERSAO_AR === 'de82cec5-6422-47ce-b34b-a499fd2a2a17',
  { status: VERSAO_AR, lista_mais_nova: porData[0].versions[0].version_id, trafego: ST.versions[0].percentage, em: porData[0].created_on });
gate('B9_o_ar_nao_e_a_base_v123_nem_a_v134', shell.md5 !== ESP_BASE.baseHtmlMd5 && shell.md5 !== ESP_V134.htmlMd5,
  { ar: shell.md5, v123: ESP_BASE.baseHtmlMd5, v134: ESP_V134.htmlMd5 });

// ---- o que VAI ser publicado: re-verifica o disco do bundle contra o esperado gateado ----
const workerDisco = fs.readFileSync(`${DIR}/worker-deploy-v134-sidebar/worker.mjs`);
gate('B10_worker_em_disco_bate_com_o_esperado_v134', md5(workerDisco) === ESP_V134.workerMd5 && workerDisco.length === ESP_V134.workerBytes,
  { medido: { md5: md5(workerDisco), bytes: workerDisco.length }, esperado: { md5: ESP_V134.workerMd5, bytes: ESP_V134.workerBytes } });
const candDisco = fs.readFileSync(`${DIR}/bfr-candidata-v134-sidebar-escondida/index.html`);
gate('B11_candidata_em_disco_bate_com_o_esperado_v134', md5(candDisco) === ESP_V134.htmlMd5 && candDisco.length === ESP_V134.htmlBytes,
  { medido: { md5: md5(candDisco), bytes: candDisco.length }, esperado: { md5: ESP_V134.htmlMd5, bytes: ESP_V134.htmlBytes } });
gate('B12_bundle_tem_a_ofensora_fora_e_o_resto_dentro', (() => {
  const t = workerDisco.toString('utf8');
  const n = (x) => t.split(x).length - 1;
  return { sm8: n('bfr-mobile-nav-sm8-fix'), municipal: n('data-bfr-municipal-nav'), gaveta: n('fecharGaveta'),
    safe_area: n('bfr-mobile-nav-safe-area-fix'), etiqueta_v134: n(ESP_V134.cacheLabel), etiqueta_v133: n('bfr-conecta-v133'), etiqueta_v123: n('bfr-conecta-v123') };
})(), { sm8: 0, municipal: 3, gaveta: 2, safe_area: 1, etiqueta_v134: 1, etiqueta_v133: 0, etiqueta_v123: 0 });
gate('B13_portoes_do_gerador_v134_estao_todos_verdes', Object.values(ESP_V134.portoesDetalhados || {}).every((v) => v.passou)
  && Object.keys(ESP_V134.portoesDetalhados || {}).length === ESP_V134.portoes,
  { portoes: ESP_V134.portoes, detalhe: Object.entries(ESP_V134.portoesDetalhados || {}).filter(([, v]) => !v.passou).map(([k]) => k) });
gate('B14_dir_do_deploy_tem_12_assets_e_toml', fs.readdirSync(`${DIR}/worker-deploy-v134-sidebar/public`).length === 12
  && fs.readFileSync(`${DIR}/worker-deploy-v134-sidebar/wrangler.toml`).equals(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/wrangler.toml`)),
  { assets: fs.readdirSync(`${DIR}/worker-deploy-v134-sidebar/public`).length });

out.medido_antes = { shell, sw: { ...sw, texto: undefined }, notfound, firebase, rotuloAr, ofensoraNoAr, assets_vivos: vivos };
out.veredito = out.total.falha ? 'V134_PREFLIGHT_COM_DEFEITOS' : 'V134_PREFLIGHT_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
