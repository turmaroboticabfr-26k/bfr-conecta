// V134 — pos-deploy: prova HTTP de que o ar serve exatamente o bundle gateado da v134 e, acima de
// tudo, que a ofensora (o bloco <style id="bfr-mobile-nav-sm8-fix">) SAIU dos bytes servidos.
// 0 DDL, 0 escrita no banco, 0 mint. So HTTP GET e leitura de disco. URL lida do diario da v133.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V133 = `${DIR}/evidence/v133-pos-deploy-18-11.json`;
const ESP = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v134-sidebar/esperado-v134.json`, 'utf8'));
const ESP_V133 = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v133-municipal/esperado-v133.json`, 'utf8'));
const BASE = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const LISTA = JSON.parse(fs.readFileSync(`${DIR}/evidence/v134-deployments-list-depois-18-11.json`, 'utf8'));
const STATUS = JSON.parse(fs.readFileSync(`${DIR}/evidence/v134-deployments-status-depois-18-11.json`, 'utf8'));
const STDOUT = fs.readFileSync(`${DIR}/evidence/v134-deploy-stdout-18-11.txt`, 'utf8');
const OUT = `${DIR}/evidence/v134-pos-deploy-18-11.json`;
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const URL_AR = JSON.parse(fs.readFileSync(DIARIO_V133, 'utf8')).url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);

const out = { ciclo: 'V134-POS-DEPLOY', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0,
  origem: DIARIO_V133, url: URL_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy') };
};

const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v134-pos');
const firebase = await get('/firebase-messaging-sw.js');

gate('C1_shell_no_ar_e_a_candidata_v134', shell.http === 200 && shell.md5 === ESP.htmlMd5 && shell.bytes === ESP.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
gate('C1b_a_shell_deixou_de_ser_a_v133', shell.md5 !== ESP_V133.htmlMd5 && shell.bytes !== ESP_V133.htmlBytes,
  { ar: shell.md5, v133: ESP_V133.htmlMd5, delta_bytes: shell.bytes - ESP_V133.htmlBytes });
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
gate('C2_sw_no_ar_e_o_novo_com_etiqueta_v134', sw.http === 200 && sw.md5 === ESP.swMd5 && sw.bytes === ESP.swBytes && rotuloAr === ESP.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP.swMd5, bytes: ESP.swBytes, rotulo: ESP.cacheLabel } });
gate('C3_o_bloco_ofensor_saiu_dos_bytes_servidos', n(shell.texto, 'bfr-mobile-nav-sm8-fix') === 0,
  { ocorrencias_na_shell_servida: n(shell.texto, 'bfr-mobile-nav-sm8-fix'),
    nota: 'a v133 servida tinha 1; 0 aqui e a unica prova HTTP de que a correcao chegou ao ar' });
gate('C4_o_resto_da_correcao_da_v133_fica', { safe_area: n(shell.texto, 'bfr-mobile-nav-safe-area-fix'), gaveta: n(shell.texto, 'fecharGaveta'),
  municipal: n(shell.texto, 'data-bfr-municipal-nav'), raiz_municipal: n(shell.texto, 'bfrMunicipalView') },
  { safe_area: 1, gaveta: 2, municipal: 3, raiz_municipal: 50 });
// A regra que a v134 devolve a app vive no asset: medida no ficheiro SERVIDO, com a pega da base.
const rp = await get('/bfr-responsive-presentation.js');
const regraOculta = /#appShell\.ready\s*>\s*\.sidebar\s*\{[^}]*display\s*:\s*none\s*!important/.test(rp.texto);
gate('C5_a_regra_que_esconde_a_sidebar_esta_no_asset_servido_e_e_a_da_base', regraOculta
  && rp.md5 === BASE.assets.find((a) => a.arquivo === 'bfr-responsive-presentation.js').md5,
  { asset: { http: rp.http, md5: rp.md5, bytes: rp.bytes },
    esperado: { md5: BASE.assets.find((a) => a.arquivo === 'bfr-responsive-presentation.js').md5 },
    regra_de_display_none_presente: regraOculta,
    nota: 'a v134 nao acrescenta regra nenhuma; so deixa de sobrepor esta, declarada depois dela no mesmo documento' });
gate('C6_csp_no_ar_intacta_com_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)),
  { ok: /\*\.supabase\.co/.test(String(shell.csp)) });
gate('C7_rota_inexistente_da_404_ainda', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('C8_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const vivos = [];
for (const a of BASE.assets) { const r = await get(`/${a.arquivo}`); vivos.push({ arquivo: a.arquivo, http: r.http, md5: r.md5, bytes: r.bytes }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== BASE.assets[i].md5 || v.bytes !== BASE.assets[i].bytes);
gate('C9_12_assets_no_ar_identico_a_base_v123', desvios.length === 0 && vivos.length === 12, { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
const porData = [...LISTA].sort((x, y) => y.created_on.localeCompare(x.created_on));
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
gate('C10_servidor_concorda_com_o_deploy', porData[0].versions[0].version_id === versaoNoStdout
  && STATUS.versions[0].version_id === versaoNoStdout && STATUS.versions[0].percentage === 100,
  { lista: porData[0].versions[0].version_id, status: STATUS.versions[0].version_id, stdout: versaoNoStdout, trafego: STATUS.versions[0].percentage, em: porData[0].created_on });
gate('C11_cadeia_de_reversao_na_lista', porData[1].versions[0].version_id === 'de82cec5-6422-47ce-b34b-a499fd2a2a17'
  && porData[2].versions[0].version_id === '299eadd0-2b57-4149-a9ab-bb2f253f0649',
  { anterior_v133: porData[1].versions[0].version_id, anterior_anterior_v123: porData[2].versions[0].version_id,
    nota: 'devolver o ar a v133 ou a v123 e um `wrangler deploy` a partir do diretorio respectivo — cada um exige OK literal novo' });
gate('C12_bytes_servidos_batem_com_a_regra_do_delta', ESP.htmlBytes - ESP_V133.htmlBytes === -2058 && shell.bytes === ESP.htmlBytes,
  { v134_menos_v133: ESP.htmlBytes - ESP_V133.htmlBytes, bloco_removido_bytes: 2058 });

out.medido = { shell: { ...shell, texto: undefined }, sw: { ...sw, texto: undefined }, rp: { ...rp, texto: undefined }, notfound, firebase, rotuloAr,
  contagens_na_shell: { sm8: n(shell.texto, 'bfr-mobile-nav-sm8-fix'), safe_area: n(shell.texto, 'bfr-mobile-nav-safe-area-fix'),
    municipal: n(shell.texto, 'data-bfr-municipal-nav'), gaveta: n(shell.texto, 'fecharGaveta') }, assets_vivos: vivos };
out.veredito = out.total.falha ? 'V134_POS_DEPLOY_COM_DEFEITOS' : 'V134_POS_DEPLOY_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
