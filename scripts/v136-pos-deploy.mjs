// V136 — pos-deploy: prova HTTP de que o ar serve exatamente o bundle gateado da v136: a consulta
// de anuncios por published_at (PEN-30), o nome único «Secretaria de Educação», e os headers da v135
// intactos na shell e nos 12 assets. 0 DDL, 0 escrita no banco, 0 mint. So HTTP GET e leitura de disco.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V135 = `${DIR}/evidence/v135-pos-deploy-19-11.json`;
const STATUS_DEPOIS_V135 = `${DIR}/evidence/v135-deployments-status-depois-19-11.json`;
const STATUS_V135_PRIMEIRO = `${DIR}/evidence/v135-deployments-status-depois-19-11-ANTERIOR-primeiro-deploy.json`;
const ESP = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`, 'utf8'));
const ESP_V135 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v135-headers/esperado-v135.json`, 'utf8'));
const BASE = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const LISTA = JSON.parse(fs.readFileSync(`${DIR}/evidence/v136-deployments-list-depois-19-11.json`, 'utf8'));
const STATUS = JSON.parse(fs.readFileSync(`${DIR}/evidence/v136-deployments-status-depois-19-11.json`, 'utf8'));
const STDOUT = fs.readFileSync(`${DIR}/evidence/v136-deploy-stdout-19-11.txt`, 'utf8');
const OUT = `${DIR}/evidence/v136-pos-deploy-19-11.json`;
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const URL_AR = JSON.parse(fs.readFileSync(DIARIO_V135, 'utf8')).url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const FRAME_GUARD_ESPERADO = "frame-ancestors 'self'; base-uri 'self'; form-action 'self'";

const out = { ciclo: 'V136-POS-DEPLOY', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0,
  origem: DIARIO_V135, url: URL_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') };
};

const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v136-pos');
const firebase = await get('/firebase-messaging-sw.js');

const ANUNC_OLD = `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,created_at,important,meeting_id').order('created_at',{ascending:false}).limit(100)`;
const ANUNC_NEW = `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,important,meeting_id').order('published_at',{ascending:false,nullsFirst:false}).limit(100)`;
gate('C1_shell_no_ar_e_a_candidata_v136', shell.http === 200 && shell.md5 === ESP.htmlMd5 && shell.bytes === ESP.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
gate('C1b_a_shell_deixou_de_ser_a_v135', shell.md5 !== ESP_V135.htmlMd5, { ar: shell.md5, v135: ESP_V135.htmlMd5, delta_bytes: shell.bytes - ESP_V135.htmlBytes });
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
gate('C2_sw_no_ar_e_o_novo_com_etiqueta_v136', sw.http === 200 && sw.md5 === ESP.swMd5 && sw.bytes === ESP.swBytes && rotuloAr === ESP.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP.swMd5, bytes: ESP.swBytes, rotulo: ESP.cacheLabel } });
gate('C3_pen30_no_ar', n(shell.texto, ANUNC_NEW) === 1 && n(shell.texto, ANUNC_OLD) === 0,
  { novo: n(shell.texto, ANUNC_NEW), velho: n(shell.texto, ANUNC_OLD) });
gate('C4_nome_unico_no_ar', {
  centro_gestao: n(shell.texto, 'Centro de Gestão da Educação'),
  h1_nome: n(shell.texto, '<h1>Secretaria de Educação.</h1>'),
  secretaria_digital: n(shell.texto, 'Secretaria digital'),
  nav: n(shell.texto, '<span class="nav-icon">▥</span>Secretaria de Educação</button>') },
  { centro_gestao: 0, h1_nome: 3, secretaria_digital: 1, nav: 1,
    nota: 'secretaria_digital=1 e o rotulo do PAPEL secretary no mapa de chips, preservado pela regra' });
gate('C5_headers_da_v135_na_shell_do_ar', shell.xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(shell.csp)),
  { x_frame_options: shell.xfo, csp_frame_ancestors: /frame-ancestors 'self'/.test(String(shell.csp || '')) });
gate('C6_csp_no_ar_intacta_com_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)),
  { ok: /\*\.supabase\.co/.test(String(shell.csp)) });
gate('C7_rota_inexistente_da_404_ainda', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('C8_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const vivos = [];
for (const a of BASE.assets) { const r = await get(`/${a.arquivo}`); vivos.push({ arquivo: a.arquivo, http: r.http, md5: r.md5, bytes: r.bytes, xfo: r.xfo, csp: r.csp }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== BASE.assets[i].md5 || v.bytes !== BASE.assets[i].bytes);
const semHeaders = vivos.filter((v) => v.xfo !== 'SAMEORIGIN' || v.csp !== FRAME_GUARD_ESPERADO);
gate('C9_12_assets_identicos_a_base_v123', desvios.length === 0 && vivos.length === 12, { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
gate('C10_os_12_assets_com_os_dois_headers', semHeaders.length === 0, { sem_headers: semHeaders.map((d) => d.arquivo), esperado: { xfo: 'SAMEORIGIN', csp: FRAME_GUARD_ESPERADO } });
const porData = [...LISTA].sort((x, y) => y.created_on.localeCompare(x.created_on));
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
const ST135 = JSON.parse(fs.readFileSync(STATUS_DEPOIS_V135, 'utf8'));
const ST135_P = JSON.parse(fs.readFileSync(STATUS_V135_PRIMEIRO, 'utf8'));
gate('C11_servidor_concorda_com_o_deploy', porData[0].versions[0].version_id === versaoNoStdout
  && STATUS.versions[0].version_id === versaoNoStdout && STATUS.versions[0].percentage === 100,
  { lista: porData[0].versions[0].version_id, status: STATUS.versions[0].version_id, stdout: versaoNoStdout, trafego: STATUS.versions[0].percentage, em: porData[0].created_on });
gate('C12_cadeia_de_reversao_na_lista', porData[1].versions[0].version_id === ST135.versions[0].version_id
  && porData[2].versions[0].version_id === ST135_P.versions[0].version_id,
  { v135: porData[1].versions[0].version_id, primeiro_v135: porData[2].versions[0].version_id,
    nota: 'devolver o ar a v135 ou a v134 e um `wrangler deploy` a partir do diretorio respectivo — cada um exige OK literal novo' });
gate('C13_bytes_servidos_batem_com_a_regra_do_delta', ESP.htmlBytes - ESP_V135.htmlBytes === 612 && shell.bytes === ESP.htmlBytes,
  { v136_menos_v135: ESP.htmlBytes - ESP_V135.htmlBytes });
gate('C14_sw_mesmos_bytes_etiqueta_diferente', sw.bytes === ESP_V135.swBytes && sw.md5 !== ESP_V135.swMd5,
  { bytes: sw.bytes, v135_bytes: ESP_V135.swBytes, md5: sw.md5, v135_md5: ESP_V135.swMd5 });

out.medido = { shell: { ...shell, texto: undefined }, sw: { ...sw, texto: undefined }, notfound, firebase, rotuloAr,
  contagens_na_shell: { pen30_novo: n(shell.texto, ANUNC_NEW), pen30_velho: n(shell.texto, ANUNC_OLD),
    centro_gestao: n(shell.texto, 'Centro de Gestão da Educação'), secretaria_de_educacao: n(shell.texto, 'Secretaria de Educação') },
  assets_vivos: vivos };
out.veredito = out.total.falha ? 'V136_POS_DEPLOY_COM_DEFEITOS' : 'V136_POS_DEPLOY_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
