// V135 — pos-deploy: prova HTTP de que o ar serve o bundle gateado da v135 e que os headers
// anti-cliquejacking estao nos 3 sitios do patch: shell HTML (x-frame-options + CSP com
// frame-ancestors) e cada asset pelo fallback ASSETS (CSP=FRAME_GUARD + x-frame-options).
// 0 DDL, 0 escrita no banco, 0 mint. So HTTP GET e leitura de disco. URL lida do diario da v134.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V134 = `${DIR}/evidence/v134-pos-deploy-18-11.json`;
const ESP = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v135-headers/esperado-v135.json`, 'utf8'));
const ESP_V134 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v134-sidebar/esperado-v134.json`, 'utf8'));
const BASE = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const LISTA = JSON.parse(fs.readFileSync(`${DIR}/evidence/v135-deployments-list-depois-19-11.json`, 'utf8'));
const STATUS = JSON.parse(fs.readFileSync(`${DIR}/evidence/v135-deployments-status-depois-19-11.json`, 'utf8'));
const STDOUT = fs.readFileSync(`${DIR}/evidence/v135-deploy-stdout-19-11.txt`, 'utf8');
const OUT = `${DIR}/evidence/v135-pos-deploy-19-11.json`;
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const URL_AR = JSON.parse(fs.readFileSync(DIARIO_V134, 'utf8')).url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const FRAME_GUARD_ESPERADO = "frame-ancestors 'self'; base-uri 'self'; form-action 'self'";

const out = { ciclo: 'V135-POS-DEPLOY', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0,
  origem: DIARIO_V134, url: URL_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'),
    x_frame: r.headers.get('x-frame-options') };
};

const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v135-pos');
const firebase = await get('/firebase-messaging-sw.js');

gate('C1_shell_no_ar_e_a_shell_v135', shell.http === 200 && shell.md5 === ESP.htmlMd5 && shell.bytes === ESP.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
gate('C2_a_shell_ganhou_os_dois_headers', shell.x_frame === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(shell.csp || '')),
  { x_frame: shell.x_frame, csp_frame_ancestors: /frame-ancestors 'self'/.test(String(shell.csp || '')),
    csp_cauda: String(shell.csp || '').slice(-80) });
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
gate('C3_sw_no_ar_e_o_novo_com_etiqueta_v135', sw.http === 200 && sw.md5 === ESP.swMd5 && sw.bytes === ESP.swBytes && rotuloAr === ESP.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP.swMd5, bytes: ESP.swBytes, rotulo: ESP.cacheLabel } });
gate('C4_csp_no_ar_intacta_com_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)),
  { ok: /\*\.supabase\.co/.test(String(shell.csp)) });
const vivos = [];
for (const a of BASE.assets) { const r = await get(`/${a.arquivo}`); vivos.push({ arquivo: a.arquivo, http: r.http, md5: r.md5, bytes: r.bytes, x_frame: r.x_frame, csp: r.csp }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== BASE.assets[i].md5 || v.bytes !== BASE.assets[i].bytes);
gate('C5_12_assets_no_ar_identicos_a_base_v123', desvios.length === 0 && vivos.length === 12, { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
const semHeaders = vivos.filter((v) => v.x_frame !== 'SAMEORIGIN' || v.csp !== FRAME_GUARD_ESPERADO);
gate('C6_todos_os_assets_carregam_os_dois_headers', semHeaders.length === 0 && vivos.length === 12,
  { total: vivos.length, sem_headers: semHeaders.map((v) => `${v.arquivo}: x_frame=${JSON.stringify(v.x_frame)} csp=${JSON.stringify(String(v.csp).slice(0, 60))}`),
    pdf_exemplo: { arquivo: 'calendario-letivo-2026.pdf', x_frame: (vivos.find((v) => v.arquivo === 'calendario-letivo-2026.pdf') || {}).x_frame, csp: (vivos.find((v) => v.arquivo === 'calendario-letivo-2026.pdf') || {}).csp } });
gate('C7_rota_inexistente_da_404_ainda', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('C8_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const porData = [...LISTA].sort((x, y) => y.created_on.localeCompare(x.created_on));
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
gate('C9_servidor_concorda_com_o_deploy', porData[0].versions[0].version_id === versaoNoStdout
  && STATUS.versions[0].version_id === versaoNoStdout && STATUS.versions[0].percentage === 100,
  { lista: porData[0].versions[0].version_id, status: STATUS.versions[0].version_id, stdout: versaoNoStdout, trafego: STATUS.versions[0].percentage, em: porData[0].created_on });
const STATUS_V134 = JSON.parse(fs.readFileSync(`${DIR}/evidence/v134-deployments-status-depois-18-11.json`, 'utf8'));
const STATUS_V133 = JSON.parse(fs.readFileSync(`${DIR}/evidence/v133-deployments-status-depois-18-11.json`, 'utf8'));
// O primeiro deploy da v135 (f824a488, sem o mecanismo _headers) ficou na cadeia como degrau
// intermedio; o id le-se do ficheiro de estado preservado dessa corrida, nunca dactilografado.
const STATUS_V135_1 = JSON.parse(fs.readFileSync(`${DIR}/evidence/v135-deployments-status-depois-19-11-ANTERIOR-primeiro-deploy.json`, 'utf8'));
gate('C10_cadeia_de_reversao_na_lista', porData[1].versions[0].version_id === STATUS_V135_1.versions[0].version_id && porData[2].versions[0].version_id === STATUS_V134.versions[0].version_id,
  { anterior_v135_primeiro_deploy: porData[1].versions[0].version_id, anterior_anterior_v134: porData[2].versions[0].version_id,
    esperado_v135_1: STATUS_V135_1.versions[0].version_id, esperado_v134: STATUS_V134.versions[0].version_id, esperado_v133: STATUS_V133.versions[0].version_id,
    nota: 'devolver o ar a v134 ou a v133 e um `wrangler deploy` a partir do diretorio respectivo — cada um exige OK literal novo' });
gate('C11_a_shell_nao_mudou_um_byte', shell.bytes === ESP_V134.htmlBytes && shell.md5 === ESP_V134.htmlMd5,
  { v135: { md5: shell.md5, bytes: shell.bytes }, v134: { md5: ESP_V134.htmlMd5, bytes: ESP_V134.htmlBytes },
    nota: 'a v135 so muda headers; o corpo da shell e byte-identico ao da v134' });
gate('C12_o_sw_nao_mudou_de_tamanho_so_de_etiqueta', ESP.swBytes === ESP_V134.swBytes && ESP.swMd5 !== ESP_V134.swMd5,
  { sw_v135: { md5: ESP.swMd5, bytes: ESP.swBytes }, sw_v134: { md5: ESP_V134.swMd5, bytes: ESP_V134.swBytes },
    nota: 'v134->v135 e a mesma etiqueta com o mesmo comprimento: so muda o texto, nao o tamanho' });

out.medido = { shell: { ...shell, texto: undefined }, sw: { ...sw, texto: undefined }, notfound, firebase, rotuloAr, assets_vivos: vivos };
out.veredito = out.total.falha ? 'V135_POS_DEPLOY_COM_DEFEITOS' : 'V135_POS_DEPLOY_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
