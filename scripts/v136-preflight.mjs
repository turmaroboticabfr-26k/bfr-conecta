// V136 — preflight SOMENTE LEITURA antes do deploy da v136. 0 DDL, 0 escrita no banco, 0 mint, 0 deploy.
// So HTTP GET e leitura de disco. O ar deve ser a v135 (f5c157f2, 19/11) COM os dois defeitos que a v136
// corrige: a consulta de anuncios ordenada por created_at (PEN-30) e os 7 nomes da superficie (aqui
// provados por «Centro de Gestão da Educação» 2x no ar). URL lida do diario pos-deploy da v135, nunca
// dactilografada. Prova ainda que o mecanismo de headers da v135 esta no ar (shell + um PDF).
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V135 = `${DIR}/evidence/v135-pos-deploy-19-11.json`;
const STATUS_DEPOIS_V135 = `${DIR}/evidence/v135-deployments-status-depois-19-11.json`;
const LISTA_DEPOIS_V135 = `${DIR}/evidence/v135-deployments-list-depois-19-11.json`;
const ESP_V135 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v135-headers/esperado-v135.json`, 'utf8'));
const ESP_V136 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`, 'utf8'));
const ESP_BASE = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const OUT = `${DIR}/evidence/v136-preflight-19-11.json`;
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const d135 = JSON.parse(fs.readFileSync(DIARIO_V135, 'utf8'));
const URL_AR = d135.url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const ST = JSON.parse(fs.readFileSync(STATUS_DEPOIS_V135, 'utf8'));
const LD = JSON.parse(fs.readFileSync(LISTA_DEPOIS_V135, 'utf8'));
const VERSAO_AR = ST.versions[0].version_id;

const out = { ciclo: 'V136-PREFLIGHT', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0,
  origem: DIARIO_V135, url: URL_AR, versao_esperada_no_ar: VERSAO_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') };
};

// ---- o que esta no ar ANTES deste deploy deve ser a v135, COM os defeitos ----
const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v136-preflight');
const firebase = await get('/firebase-messaging-sw.js');
const pdf = await get('/calendario-letivo-2026.pdf');
gate('B1_shell_no_ar_e_a_shell_v135', shell.http === 200 && shell.md5 === ESP_V135.htmlMd5 && shell.bytes === ESP_V135.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado_v135: { md5: ESP_V135.htmlMd5, bytes: ESP_V135.htmlBytes } });
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
gate('B2_sw_no_ar_e_o_da_v135', sw.http === 200 && sw.md5 === ESP_V135.swMd5 && sw.bytes === ESP_V135.swBytes && rotuloAr === ESP_V135.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP_V135.swMd5, bytes: ESP_V135.swBytes, rotulo: ESP_V135.cacheLabel } });
const ANUNC_OLD = `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,created_at,important,meeting_id').order('created_at',{ascending:false}).limit(100)`;
gate('B3_os_dois_defeitos_estao_no_ar', n(shell.texto, ANUNC_OLD) === 1 && n(shell.texto, 'Centro de Gestão da Educação') === 2,
  { anuncios_created_at: n(shell.texto, ANUNC_OLD), centro_gestao: n(shell.texto, 'Centro de Gestão da Educação'),
    nota: 'prova que este preflight olha para a versao que contem os defeitos que a v136 corrige' });
gate('B4_headers_da_v135_na_shell_do_ar', shell.xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(shell.csp)),
  { x_frame_options: shell.xfo, csp_tem_frame_ancestors: /frame-ancestors 'self'/.test(String(shell.csp || '')) });
gate('B5_pdf_com_headers_da_v135_no_ar', pdf.http === 200 && pdf.xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(pdf.csp || '')),
  { http: pdf.http, bytes: pdf.bytes, md5: pdf.md5, x_frame_options: pdf.xfo, csp: String(pdf.csp || '').slice(0, 80) });
gate('B6_rota_inexistente_da_404', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('B7_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const assets = ESP_BASE.assets.map((a) => a.arquivo);
const vivos = [];
for (const f of assets) { const r = await get(`/${f}`); vivos.push({ arquivo: f, http: r.http, md5: r.md5, bytes: r.bytes }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== ESP_BASE.assets[i].md5 || v.bytes !== ESP_BASE.assets[i].bytes);
gate('B8_12_assets_no_ar_batem_com_a_base', desvios.length === 0 && vivos.length === 12, { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
const porData = [...LD].sort((x, y) => y.created_on.localeCompare(x.created_on));
gate('B9_versao_no_servidor_e_a_da_v135_a_100', ST.versions[0].percentage === 100
  && porData[0].versions[0].version_id === VERSAO_AR && VERSAO_AR === 'f5c157f2-7b46-447b-88a9-d05cff7c42d2',
  { status: VERSAO_AR, lista_mais_nova: porData[0].versions[0].version_id, trafego: ST.versions[0].percentage, em: porData[0].created_on });
gate('B10_o_ar_nao_e_a_v123_nem_a_v136', shell.md5 !== ESP_BASE.baseHtmlMd5 && shell.md5 !== ESP_V136.htmlMd5,
  { ar: shell.md5, v123: ESP_BASE.baseHtmlMd5, v136: ESP_V136.htmlMd5,
    nota: 'a v135 conservou o HTML da v134, por isso a comparacao util e contra a v123 e contra a candidata v136' });

// ---- o que VAI ser publicado: re-verifica o disco do bundle contra o esperado gateado ----
const workerDisco = fs.readFileSync(`${DIR}/worker-deploy-v136-secretaria-de-educacao/worker.mjs`);
gate('B11_worker_em_disco_bate_com_o_esperado_v136', md5(workerDisco) === ESP_V136.workerMd5 && workerDisco.length === ESP_V136.workerBytes,
  { medido: { md5: md5(workerDisco), bytes: workerDisco.length }, esperado: { md5: ESP_V136.workerMd5, bytes: ESP_V136.workerBytes } });
const candDisco = fs.readFileSync(`${DIR}/bfr-candidata-v136-secretaria-de-educacao/index.html`);
gate('B12_candidata_em_disco_bate_com_o_esperado_v136', md5(candDisco) === ESP_V136.htmlMd5 && candDisco.length === ESP_V136.htmlBytes,
  { medido: { md5: md5(candDisco), bytes: candDisco.length }, esperado: { md5: ESP_V136.htmlMd5, bytes: ESP_V136.htmlBytes } });
gate('B13_bundle_tem_a_correcao_dentro_e_o_defeito_fora', (() => {
  const t = workerDisco.toString('utf8');
  const ANUNC_NEW = `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,important,meeting_id').order('published_at',{ascending:false,nullsFirst:false}).limit(100)`;
  return { pen30_novo: n(t, ANUNC_NEW), pen30_velho: n(t, ANUNC_OLD), centro_gestao: n(t, 'Centro de Gestão da Educação'),
    h1_nome: n(t, '<h1>Secretaria de Educação.</h1>'), etiqueta_v136: n(t, "'bfr-conecta-v136'"), etiqueta_v135: n(t, "'bfr-conecta-v135'") };
})(), { pen30_novo: 1, pen30_velho: 0, centro_gestao: 0, h1_nome: 3, etiqueta_v136: 1, etiqueta_v135: 0 });
gate('B14_portoes_do_gerador_v136_estao_todos_verdes', Object.values(ESP_V136.portoesDetalhados || {}).every((v) => v.passou)
  && Object.keys(ESP_V136.portoesDetalhados || {}).length === ESP_V136.portoes,
  { portoes: ESP_V136.portoes, detalhe: Object.entries(ESP_V136.portoesDetalhados || {}).filter(([, v]) => !v.passou).map(([k]) => k) });
gate('B15_dir_do_deploy_tem_12_assets_headers_e_toml',
  fs.readdirSync(`${DIR}/worker-deploy-v136-secretaria-de-educacao/public`).length === 13
  && fs.readFileSync(`${DIR}/worker-deploy-v136-secretaria-de-educacao/public/_headers`).equals(fs.readFileSync(`${DIR}/worker-deploy-v135-headers/public/_headers`))
  && fs.readFileSync(`${DIR}/worker-deploy-v136-secretaria-de-educacao/wrangler.toml`).equals(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/wrangler.toml`)),
  { assets: fs.readdirSync(`${DIR}/worker-deploy-v136-secretaria-de-educacao/public`).length });

out.medido_antes = { shell, sw: { ...sw, texto: undefined }, notfound, firebase, pdf: { ...pdf }, rotuloAr, assets_vivos: vivos };
out.veredito = out.total.falha ? 'V136_PREFLIGHT_COM_DEFEITOS' : 'V136_PREFLIGHT_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
