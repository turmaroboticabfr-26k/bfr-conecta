// V133 — preflight SOMENTE LEITURA antes do deploy. 0 DDL, 0 escrita no banco, 0 mint, 0 deploy.
// So HTTP GET e leitura de disco. A URL vem do diario da v122 (evidence/v122-pos-deploy-http-15-11.json),
// nunca dactilografada. Prova que o ar e a v123 (299eadd0) e que nada mudou desde o ultimo deploy.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V122 = `${DIR}/evidence/v122-pos-deploy-http-15-11.json`;
const ESP_BASE = JSON.parse(fs.readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const LISTA = JSON.parse(fs.readFileSync(`${DIR}/evidence/v133-deployments-list-antes-18-11.json`, 'utf8'));
const STATUS = JSON.parse(fs.readFileSync(`${DIR}/evidence/v133-deployments-status-antes-18-11.json`, 'utf8'));
const OUT = `${DIR}/evidence/v133-preflight-18-11.json`;

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const d122 = JSON.parse(fs.readFileSync(DIARIO_V122, 'utf8'));
const URL_AR = d122.reguas.url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);

const out = { ciclo: 'V133-PREFLIGHT', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0,
  origem: DIARIO_V122, url: URL_AR, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy') };
};

const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const notfound = await get('/rota-inexistente-v133-preflight');
const firebase = await get('/firebase-messaging-sw.js');
gate('A1_shell_no_ar_e_a_v123_base', shell.http === 200 && shell.md5 === ESP_BASE.baseHtmlMd5 && shell.bytes === ESP_BASE.baseHtmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado: { md5: ESP_BASE.baseHtmlMd5, bytes: ESP_BASE.baseHtmlBytes } });
const rotuloAr = (await (await fetch(URL_AR + '/sw-v4.js?v=45', { cache: 'no-store' })).text()).match(/const CACHE = '([^']+)'/)?.[1];
gate('A2_sw_no_ar_e_a_v123', sw.http === 200 && sw.md5 === ESP_BASE.swMd5 && sw.bytes === ESP_BASE.swBytes && rotuloAr === 'bfr-conecta-v123',
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: ESP_BASE.swMd5, bytes: ESP_BASE.swBytes, rotulo: 'bfr-conecta-v123' } });
gate('A3_csp_da_shell_permite_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)),
  { csp_presente: String(shell.csp || '').slice(0, 120) + '...' });
gate('A4_rota_inexistente_da_404', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes, md5: notfound.md5 });
gate('A4b_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
// os 12 assets servidos contra o esperado-v123 (a regua do deploy vivo)
const assets = ESP_BASE.assets.map((a) => a.arquivo);
const vivos = [];
for (const f of assets) {
  const r = await get(`/${f}`);
  vivos.push({ arquivo: f, http: r.http, md5: r.md5, bytes: r.bytes });
}
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== ESP_BASE.assets[i].md5 || v.bytes !== ESP_BASE.assets[i].bytes);
gate('A5_12_assets_no_ar_batem_com_o_esperado_v123', desvios.length === 0 && vivos.length === 12,
  { total: vivos.length, desvios: desvios.map((d) => d.arquivo) });
// o servidor concorda com o disco: lista/status de deployments gravadas antes desta corrida
const porData = [...LISTA].sort((x, y) => y.created_on.localeCompare(x.created_on));
const maisNova = porData[0];
gate('A6_versao_no_servidor_e_a_v123', maisNova.versions[0].version_id === '299eadd0-2b57-4149-a9ab-bb2f253f0649'
  && STATUS.versions[0].version_id === '299eadd0-2b57-4149-a9ab-bb2f253f0649' && STATUS.versions[0].percentage === 100,
  { lista_mais_nova: maisNova.versions[0].version_id, status: STATUS.versions[0].version_id, trafego: STATUS.versions[0].percentage, em: maisNova.created_on });

out.veredito = out.total.falha ? 'V133_PREFLIGHT_COM_DEFEITOS' : 'V133_PREFLIGHT_OK';
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} ${out.total.ok}/${out.total.falha}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
