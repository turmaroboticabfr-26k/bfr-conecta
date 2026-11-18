// V133 — pos-deploy: prova HTTP de que o ar serve exatamente o bundle gateado.
// 0 DDL, 0 escrita no banco, 0 mint. So HTTP GET. URL derivada do diario da v122.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V122 = `${DIR}/evidence/v122-pos-deploy-http-15-11.json`;
const ESP = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v133-municipal/esperado-v133.json`, 'utf8'));
const LISTA = JSON.parse(fs.readFileSync(`${DIR}/evidence/v133-deployments-list-depois-18-11.json`, 'utf8'));
const STATUS = JSON.parse(fs.readFileSync(`${DIR}/evidence/v133-deployments-status-depois-18-11.json`, 'utf8'));
const STDOUT = fs.readFileSync(`${DIR}/evidence/v133-deploy-stdout-18-11.txt`, 'utf8');
const OUT = `${DIR}/evidence/v133-pos-deploy-18-11.json`;

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const URL_AR = JSON.parse(fs.readFileSync(DIARIO_V122, 'utf8')).reguas.url;

const out = { ciclo: 'V133-POS-DEPLOY', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0,
  origem: DIARIO_V122, url: URL_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy') };
};

const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v133-pos');
const firebase = await get('/firebase-messaging-sw.js');

gate('B1_shell_no_ar_e_a_candidata_v133', shell.http === 200 && shell.md5 === ESP.htmlMd5 && shell.bytes === ESP.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
const rotuloAr = sw.texto.match(/const CACHE = '([^']+)'/)?.[1];
gate('B2_sw_no_ar_e_o_novo_com_etiqueta_v133', sw.http === 200 && sw.md5 === ESP.swMd5 && sw.bytes === ESP.swBytes && rotuloAr === ESP.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP.swMd5, bytes: ESP.swBytes, rotulo: ESP.cacheLabel } });
gate('B3_csp_no_ar_intacta_com_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)),
  { ok: /\*\.supabase\.co/.test(String(shell.csp)) });
gate('B4_rota_inexistente_da_404_ainda', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('B4b_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
// o shell servido traz o modulo municipal e o fix da barra
gate('B5_shell_servida_tem_o_modulo_municipal', /SECRETARIA MUNICIPAL|municipal-scope|mun-tab/i.test(shell.texto),
  { marcadores: ['mun-tab', 'SECRETARIA MUNICIPAL'].filter((m) => shell.texto.includes(m)) });
gate('B5b_shell_servida_tem_o_fix_da_barra', shell.texto.includes('bfr-mobile-nav-sm8-fix'), {});
gate('B5c_shell_servida_tem_a_gaveta_reparada', /getElementById\('mobileMoreMenu'\)/.test(shell.texto), {});
// os 12 assets continuam byte-identicos aos da v123 (nao reenviados no deploy)
const vivos = [];
for (const a of ESP.assets || JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8')).assets) {
  const r = await get(`/${a.arquivo}`);
  vivos.push({ arquivo: a.arquivo, http: r.http, md5: r.md5, bytes: r.bytes });
}
const baseAssets = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8')).assets;
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== baseAssets[i].md5 || v.bytes !== baseAssets[i].bytes);
gate('B6_12_assets_no_ar_identicos_a_v123', desvios.length === 0 && vivos.length === 12,
  { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
// o servidor diz que a versao nova e a unica com trafego
const porData = [...LISTA].sort((x, y) => y.created_on.localeCompare(x.created_on));
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
gate('B7_servidor_concorda_com_o_deploy', porData[0].versions[0].version_id === versaoNoStdout
  && STATUS.versions[0].version_id === versaoNoStdout && STATUS.versions[0].percentage === 100,
  { lista: porData[0].versions[0].version_id, status: STATUS.versions[0].version_id, stdout: versaoNoStdout, trafego: STATUS.versions[0].percentage, em: porData[0].created_on });
const anterior = porData[1];
gate('B7b_versao_anterior_e_a_v123', anterior.versions[0].version_id, '299eadd0-2b57-4149-a9ab-bb2f253f0649');

out.veredito = out.total.falha ? 'V133_POS_DEPLOY_COM_DEFEITOS' : 'V133_POS_DEPLOY_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
