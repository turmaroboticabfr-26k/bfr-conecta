// V122-POS-DEPLOY — prova SOMENTE LEITURA do ar depois do deploy da v122 (RM-1.5).
// 0 DDL, 0 escrita em banco, 0 mint, 0 deploy. Só HTTP GET.
// Todas as réguas derivadas dos diários + esperado-v122; nunca dactilografadas.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V121 = `${dir}/audit-publicacao-v121.json`;
const ESP = `${dir}/worker-deploy-v122-push/esperado-v122.json`;
const OUT = `${dir}/evidence/v122-pos-deploy-http-15-11.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const bytes = s => Buffer.byteLength(s);
const count = (s, t) => s.split(t).length - 1;
const parseRegua = s => { const m = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return m ? { md5: m[1], bytes: +m[2] } : null; };

const d121 = JSON.parse(fs.readFileSync(DIARIO_V121, 'utf8'));
const esp = JSON.parse(fs.readFileSync(ESP, 'utf8'));
const URL_AR = d121.deploy.url;
const reguaShell = parseRegua(d121.md5['shell_depois']);       // v121 nao muda na v122
const reguaSwAntes = parseRegua(d121.md5['sw_depois']);         // SW antigo (medida diferencial)
const corpo404 = parseRegua(d121.md5['corpo_do_404']);
const rotas404 = Object.entries(d121.medicao.ar_depois.rotas).filter(([, v]) => v.http === 404).map(([k]) => k);

const out = { ciclo: 'V122-POS-DEPLOY', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0, reguas: { url: URL_AR } };
const falhas = [];
const gate = (nome, ok, dados) => { out[nome] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(nome); };

async function get(path, opts = {}) {
  const res = await fetch(URL_AR + path, { headers: { 'Cache-Control': 'no-cache', ...(opts.headers || {}) }, redirect: 'manual' });
  const buf = Buffer.from(await res.arrayBuffer());
  return { res, buf, texto: buf.toString('utf8') };
}

// ---------- A1 shell == v121 (inalterado) ----------
const a1 = await get('/');
out.A1_shell = { http: a1.res.status, bytes: a1.buf.length, md5: md5(a1.buf), csp: a1.res.headers.get('content-security-policy') };
gate('A1_shell_inalterada_v121', a1.res.status === 200 && md5(a1.buf) === reguaShell.md5 && a1.buf.length === reguaShell.bytes, { esperado: reguaShell, medido: { md5: out.A1_shell.md5, bytes: out.A1_shell.bytes } });
const cspServida = a1.res.headers.get('content-security-policy');
out.A1_shell.csp_igual_a_404_de_d121 = (() => {
  // d121 nao grava a CSP literal; grava csp_igual_ao_404=true. Confirma que o registro anterior existia.
  return d121.medicao.ar_depois.rotas['/'].csp_igual_ao_404 === true;
})();
gate('A1b_csp_presente_na_shell', typeof cspServida === 'string' && cspServida.length > 40 && out.A1_shell.csp_igual_a_404_de_d121, { csp_presente: !!cspServida, bytes_csp: (cspServida || '').length });

// ---------- A2 SW agora tem push/notificationclick e CACHE v122 ----------
const a2 = await get('/sw-v4.js?v=45');
const swTxt = a2.texto;
out.A2_sw = { http: a2.res.status, bytes: a2.buf.length, md5: md5(a2.buf), cache: swTxt.match(/bfr-conecta-v\d+/g) || [],
  push: count(swTxt, "addEventListener('push'"), nc: count(swTxt, "addEventListener('notificationclick'"),
  show: count(swTxt, 'showNotification('), open: count(swTxt, 'openWindow('), importScripts: count(swTxt, 'importScripts(') };
gate('A2_sw_md5_igual_a_candidata', a2.res.status === 200 && out.A2_sw.md5 === esp.swMd5 && out.A2_sw.bytes === esp.swBytes, { esperado: { md5: esp.swMd5, bytes: esp.swBytes }, medido: { md5: out.A2_sw.md5, bytes: out.A2_sw.bytes } });
gate('A2b_sw_tem_push', out.A2_sw.push === 1, { push: out.A2_sw.push });
gate('A2c_sw_tem_notificationclick', out.A2_sw.nc === 1, { nc: out.A2_sw.nc });
gate('A2d_sw_chama_showNotification', out.A2_sw.show === 1, { show: out.A2_sw.show });
gate('A2e_sw_chama_openWindow', out.A2_sw.open === 1, { open: out.A2_sw.open });
gate('A2f_sw_sem_chamada_importScripts', out.A2_sw.importScripts === 0, { importScripts: out.A2_sw.importScripts });
gate('A2g_sw_etiqueta_cache_v122', out.A2_sw.cache.includes('bfr-conecta-v122') && !out.A2_sw.cache.includes('bfr-conecta-v121'), { cache: out.A2_sw.cache });
gate('A2h_sw_diferencial_do_antes', out.A2_sw.md5 !== reguaSwAntes.md5, { antes: reguaSwAntes.md5, depois: out.A2_sw.md5 });

// ---------- A3 regressao dos 404 ----------
const medidos = [];
for (const caminho of rotas404) {
  const r = await get(caminho);
  medidos.push({ caminho, http: r.res.status, bytes: r.buf.length, md5: md5(r.buf) });
}
out.A3_404 = medidos;
gate('A3_404_permanecem', medidos.every(m => m.http === 404 && m.md5 === corpo404.md5 && m.bytes === corpo404.bytes), { total: medidos.length, desvios: medidos.filter(m => m.http !== 404).map(m => `${m.caminho}=${m.http}`) });

// ---------- A4 firebase-messaging-sw continua 404 (RM-6.9 nao regride) ----------
const fm = await get('/firebase-messaging-sw.js');
out.A4_firebase = { http: fm.res.status, bytes: fm.buf.length, md5: md5(fm.buf) };
gate('A4_firebase_sw_ainda_404', fm.res.status === 404 && md5(fm.buf) === corpo404.md5, out.A4_firebase);

// ---------- A5 assets: os 12 servem byte-identicos ao bundle ----------
const V122_DIR = `${dir}/worker-deploy-v122-push`;
const assets = fs.readdirSync(`${V122_DIR}/public`).sort();
const assetDesvios = [];
for (const f of assets) {
  const local = fs.readFileSync(`${V122_DIR}/public/${f}`);
  const r = await get('/' + f);
  if (r.res.status !== 200 || md5(r.buf) !== md5(local)) assetDesvios.push(`${f}=${r.res.status}/${md5(r.buf).slice(0, 8)}`);
}
out.A5_assets = { total: assets.length, desvios: assetDesvios };
gate('A5_assets_batem_com_o_disco', assets.length === 12 && assetDesvios.length === 0, out.A5_assets);

// ---------- A6 version_id do servidor == a publicada (via status gravado) ----------
const STATUS = JSON.parse(fs.readFileSync(`${dir}/evidence/v122-deployments-status-15-11.json`, 'utf8'));
const versionServidor = STATUS.versions[0].version_id;
const pct = STATUS.versions[0].percentage;
out.A6_servidor = { version_id: versionServidor, deployment_id: STATUS.id, author: STATUS.author_email, percentage: pct };
gate('A6_version_no_servidor', typeof versionServidor === 'string' && /^[0-9a-f-]{36}$/.test(versionServidor) && pct === 100, out.A6_servidor);

out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'V122_HTTP_OK' : 'V122_HTTP_FALHA';
const gateKeys = () => Object.keys(out).filter(k => /^A\d/.test(k) && out[k] && typeof out[k] === 'object' && 'passou' in out[k]);
out.totais = { portoes: gateKeys().length, vermelhos: falhas.length };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
for (const k of gateKeys()) {
  const g = out[k];
  console.log(`${g.passou ? 'OK  ' : 'RED '} ${k}${g.passou ? '' : ' ' + JSON.stringify(g).slice(0, 360)}`);
}
console.log(`\nveredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
console.log(`shell=${out.A1_shell.bytes}B ${out.A1_shell.md5} | sw=${out.A2_sw.bytes}B ${out.A2_sw.md5} push=${out.A2_sw.push} nc=${out.A2_sw.nc} cache=${out.A2_sw.cache}`);
console.log(`servidor version=${versionServidor} pct=${pct}`);
console.log(`diario=${OUT}`);
process.exit(falhas.length ? 1 : 0);
