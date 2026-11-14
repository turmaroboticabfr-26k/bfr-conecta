// #1160 RM-1.7 — bancada A/B OFFLINE: controle v119 (ar) × candidata v120, servidas em http://127.0.0.1.
// 0 deploy, 0 mint, 0 DDL, 0 INSERT. O papel é injetado só em memória, na binding global lida pelo roteador.
// O boot é disparado pelo gatilho benigno #publicScheduleBtn — único bind de loadApplication() que dispensa sessão.
// Todo tráfego para *.supabase.co aqui é ANÔNIMO (sem JWT) e só GET; a meia-prova com JWT é a S21.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const CICLO = `${DIR}/bfr-conecta/bfr-candidata-v120-setrole-supervisor`;
const REGUA = JSON.parse(readFileSync(`${CICLO}/portoes-v120-diary.json`, 'utf8'));
const OUT = `${CICLO}/rm17-bancada-diary.json`;
const EVID = `${DIR}/bfr-conecta/evidence`;
const CDP = 9363;
const SW_NOOP = `self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(self.clients.claim()));`;

const BANDAS = [
  { id: 'base', nome: 'controle v119 (shell do ar)', arquivo: `${DIR}/bfr-conecta/bfr-candidata-v119-supervisao-embed/index.html`, md5_esperado: REGUA.base_md5, porta: 8261 },
  { id: 'cand', nome: 'candidata v120', arquivo: `${CICLO}/index.html`, md5_esperado: REGUA.candidate_md5, porta: 8262 },
];

if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
if (!existsSync(EVID)) mkdirSync(EVID, { recursive: true });

const md5 = (b) => createHash('md5').update(b).digest('hex');
const servidores = BANDAS.map(banda => {
  const corpo = readFileSync(banda.arquivo);
  banda.md5_servido = md5(corpo);
  banda.bytes_servidos = corpo.length;
  const s = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname === '/' || u.pathname === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(corpo);
    } else if (u.pathname === '/sw.js' || u.pathname === '/firebase-messaging-sw.js') {
      res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-store' });
      res.end(SW_NOOP);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('fora da bancada');
    }
  });
  return new Promise(resolve => s.listen(banda.porta, '127.0.0.1', () => resolve(s)));
});

const out = {
  ciclo: 'RM-17-BANCADA', tarefa: '#1158 RM-1.7 / PEN-32', em: new Date().toISOString(),
  escopo: 'bancada A/B offline; 0 deploy, 0 mint, 0 DDL, 0 INSERT; papel injetado so em memoria',
  limitacao: 'sem sessao real: todo tráfego supabase.co desta bancada e anonimo (sem JWT). A prova com JWT e da aba logada e a S21.',
  regua: { base_md5: REGUA.base_md5, candidate_md5: REGUA.candidate_md5, hunks: REGUA.hunks },
  bandas: {},
};
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}${ok ? '' : `  dado=${JSON.stringify(dado)}`}`);
  return ok;
};

const MEDIR = `(() => {
  const vis = sel => { const el = document.querySelector(sel); return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); };
  const txt = sel => { const el = document.querySelector(sel); return el ? (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 140) : null; };
  let tipoSR = 'erro'; try { tipoSR = typeof window.setRole; } catch (e) {}
  let tipoCP = 'erro'; let papelCP = null;
  try { tipoCP = typeof currentProfile; papelCP = (typeof currentProfile === 'undefined' || !currentProfile) ? null : (currentProfile.role ?? null); } catch (e) { tipoCP = 'ReferenceError'; }
  let av = null; try { av = (typeof activeView === 'undefined') ? null : activeView; } catch (e) { av = 'ReferenceError'; }
  const body = document.querySelector('[data-sec-body]');
  const sv = document.getElementById('secretaryView');
  return {
    tipo_setRole: tipoSR, tipo_currentProfile: tipoCP, papel_currentProfile: papelCP, activeView: av,
    runtime_papel: window.BFR_APP_RUNTIME?.profile?.role ?? null,
    runtime_activeView: window.BFR_APP_RUNTIME?.activeView ?? null,
    tem_runtime: typeof window.BFR_APP_RUNTIME === 'object',
    views_visiveis: Array.from(document.querySelectorAll('[id$="View"]')).filter(v => getComputedStyle(v).display !== 'none').map(v => v.id),
    secretaryView_hidden: sv ? sv.classList.contains('hidden') : null,
    central_visivel: vis('[data-secretary-central]'),
    aba_supervisao_no_dom: !!document.querySelector('[data-sec-tab="supervisao"]'),
    aba_supervisao_visivel: vis('[data-sec-tab="supervisao"]'),
    sec_body_len: body ? (body.textContent || '').trim().length : 0,
    menu_visivel: Array.from(document.querySelectorAll('.nav-item[data-section]')).filter(b => b.offsetWidth || b.offsetHeight).map(b => b.dataset.section),
    item_secretaria_visivel: vis('.nav-item[data-section="secretaria"]'),
    supervisao_no_menu: Array.from(document.querySelectorAll('[data-section]')).map(e => e.dataset.section).includes('supervisao'),
    chip_conta: txt('.mini-person span:not([style])'),
    login_visivel: document.getElementById('loginScreen') ? !document.getElementById('loginScreen').classList.contains('hidden') : null,
  };
})()`;

const INJETAR = `(() => {
  const perfil = { id: 'rm17-bancada-sintetica', role: 'education_supervisor', name: 'Bancada RM-1.7', full_name: 'Bancada RM-1.7', display_name: 'Bancada RM-1.7', school: 'bancada-local', created_at: new Date().toISOString() };
  try {
    currentProfile = perfil;
  } catch (e) { return { escrito: false, erro_binding_papel: String(e && e.message).slice(0, 160) }; }
  let usuario = 'ok';
  try {
    currentUser = { id: 'rm17-bancada-sintetica', role: 'education_supervisor' };
  } catch (e) { usuario = 'nao escrito: ' + String(e && e.message).slice(0, 120); }
  return { escrito: true, leitura: currentProfile?.role ?? null, currentUser: usuario };
})()`;

const CALL = (role) => `(() => { try { window.setRole(${JSON.stringify(role)}); return 'ok'; } catch (e) { return 'erro: ' + String(e && e.message).slice(0, 160); } })()`;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${DIR}/.rm17-chrome-bancada`,
  '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
], { stdio: 'ignore' });

let parada = false;
const serversPromise = Promise.all(servidores);
const encerrar = async (codigo, motivo) => {
  if (parada) return; parada = true;
  try { chrome.kill(); } catch {}
  for (const s of await serversPromise) { try { s.close(); } catch {} }
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas, veredito: out.veredito || 'INTERROMPIDA', interrompida: motivo }, null, 2));
  console.log(`\n${motivo}  (portoes=${portoes} falhas=${falhas.length})`);
  process.exit(codigo);
};

let alvo = null;
for (let i = 0; i < 60; i++) {
  try { const ts = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); alvo = ts.find(t => t.type === 'page'); if (alvo) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}
if (!alvo) await encerrar(1, 'sem alvo page no CDP');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pend = new Map();
let rede = [], erros = [], logErro = [], metodos = new Map(), marcaRede = 0;
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.requestWillBeSent') metodos.set(m.params.requestId, m.params.request.method);
  if (m.method === 'Network.responseReceived' && /supabase\.co/.test(m.params.response.url)) {
    const u = decodeURIComponent(m.params.response.url);
    if (/\/(rest|auth|realtime)\//.test(u)) rede.push({ metodo: metodos.get(m.params.requestId) || '?', url: u.split('?')[0].slice(0, 200), status: m.params.response.status });
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    erros.push((m.params.args || []).map(a => String(a.value ?? a.description ?? '')).join(' ').slice(0, 180));
  if (m.method === 'Runtime.exceptionThrown')
    erros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 180));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
    logErro.push(String(m.params.entry.text || '').slice(0, 140));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 260));
  return r.result?.value;
};
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(e)) return Date.now() - t0; await new Promise(r => setTimeout(r, 300)); } throw new Error('waitFor esgotado: ' + e.slice(0, 120)); };
const settle = (ms) => new Promise(r => setTimeout(r, ms));
const captura = async (nome) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(s.data, 'base64');
  const caminho = `${EVID}/${nome}.png`;
  writeFileSync(caminho, buf);
  return { ficheiro: caminho.split('/').pop(), bytes: statSync(caminho).size, md5: md5(buf) };
};

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
await send('Page.bringToFront');
await serversPromise;

for (const banda of BANDAS) {
  const url = `http://127.0.0.1:${banda.porta}/`;
  console.log(`\n=== ${banda.nome}  ${url}`);
  const B = { nome: banda.nome, url, md5_servido: banda.md5_servido, bytes_servidos: banda.bytes_servidos, passos: {} };
  out.bandas[banda.id] = B;
  rede = []; erros = []; logErro = []; marcaRede = 0;
  gate(`${banda.id} bytes servidos == regua dos portoes`, banda.md5_servido, banda.md5_esperado);

  await send('Page.navigate', { url: 'about:blank' }); await settle(600);
  await send('Page.navigate', { url });
  B.passos.ms_login = await waitFor(`!!document.getElementById('loginScreen')`, 60000);
  await send('Page.bringToFront');
  B.passos.sw_controller = await evalJS(`!!(navigator.serviceWorker && navigator.serviceWorker.controller)`);
  B.s0 = await evalJS(MEDIR);
  gate(`${banda.id} core ainda nao reanimado antes do gatilho`, B.s0.tipo_setRole, 'undefined');
  gate(`${banda.id} tela de login visivel`, B.s0.login_visivel, true);

  B.passos.gatilho = await evalJS(`(() => { const el = document.getElementById('publicScheduleBtn'); if (!el) return 'ausente'; el.click(); return 'clicado'; })()`);
  gate(`${banda.id} gatilho benigno presente`, B.passos.gatilho, 'clicado');
  B.passos.ms_core = await waitFor(`typeof window.setRole === 'function'`, 60000);
  B.passos.modules = await evalJS(`(async () => { try { const p = window.BFR_AUTH_MODULES_READY ? window.BFR_AUTH_MODULES_READY() : null; if (p && p.then) await p; return 'pronto'; } catch (e) { return 'erro: ' + String(e && e.message).slice(0,140); } })()`);
  B.passos.ms_runtime = await waitFor(`typeof window.BFR_APP_RUNTIME === 'object'`, 60000);
  B.s1 = await evalJS(MEDIR);
  gate(`${banda.id} roteador reanimado (window.setRole e funcao)`, B.s1.tipo_setRole, 'function');
  gate(`${banda.id} runtime exposto apos os modulos deferred`, B.s1.tem_runtime, true);

  B.injecao = await evalJS(INJETAR);
  gate(`${banda.id} papel injetado lido de volta na mesma binding do roteador`, [B.injecao.escrito, B.injecao.leitura], [true, 'education_supervisor']);
  B.s2 = await evalJS(MEDIR);

  B.passos.setRole_sup = await evalJS(CALL('education_supervisor'));
  await settle(2500);
  B.s3 = await evalJS(MEDIR);

  B.passos.setRole_sec = await evalJS(CALL('secretary'));
  await settle(2500);
  B.s4 = await evalJS(MEDIR);
  gate(`${banda.id} CONTROLE POSITIVO do rig: setRole('secretary') e aceito`, B.s4.activeView, 'secretary');

  B.passos.setRole_sup2 = await evalJS(CALL('education_supervisor'));
  await settle(2500);
  B.s5 = await evalJS(MEDIR);

  if (B.s5.aba_supervisao_visivel) {
    B.passos.clique_aba = await evalJS(`(() => { const el = document.querySelector('[data-sec-tab="supervisao"]'); if (!el) return 'ausente'; el.scrollIntoView({ block: 'center' }); el.click(); return 'clicado'; })()`);
    B.passos.ms_aba = await waitFor(`(() => { const b = document.querySelector('[data-sec-tab="supervisao"]'); if (!b) return false; const ativo = b.classList.contains('is-active') || b.getAttribute('aria-current') !== null; return ativo || (document.querySelector('[data-sec-body]')?.textContent || '').trim().length > 0; })()`, 30000).catch(() => null);
    await settle(3500);
    B.s6 = await evalJS(MEDIR);
    B.pedido_aba = rede.slice().filter(r => /supervision/.test(r.url));
  }
  B.capturas = { apos_setRole_sup: await captura(`rm17--${banda.id}-apos-setrole-education-supervisor`), final: await captura(`rm17--${banda.id}-final`) };
  B.rede = rede.slice();
  B.rede_apos_gatilho = rede.slice(marcaRede);
  B.erros_console = erros.slice();
  B.excecoes = erros.filter(e => e.startsWith('EXCEPTION'));
  B.log_erros = logErro.slice(0, 20);
  if (banda.id === 'base') {
    gate('base activeView segue parent depois de setRole(education_supervisor)', B.s3.activeView, 'parent');
    gate('base secretaryView segue hidden', B.s3.secretaryView_hidden, true);
    gate('base aba Supervisao ausente do DOM', B.s3.aba_supervisao_no_dom, false);
  } else {
    gate('cand activeView assenta em education_supervisor', B.s3.activeView, 'education_supervisor');
    gate('cand runtime_activeView concorda com o roteador', B.s3.runtime_activeView, 'education_supervisor');
    gate('cand secretaryView deixa de estar hidden', B.s3.secretaryView_hidden, false);
    gate('cand views visiveis incluem secretaryView', B.s3.views_visiveis.includes('secretaryView'), true);
    gate('cand aba Supervisao presente no DOM', B.s3.aba_supervisao_no_dom, true);
    gate('cand central da Secretaria visivel', B.s3.central_visivel, true);
    gate('cand 0 excecoes nao tratadas', B.excecoes, []);
  }
  marcaRede = rede.length;
  console.log(`  s3 ${banda.id}: ${JSON.stringify(B.s3).slice(0, 700)}`);
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas }, null, 2));
}

const naoGET = Object.values(out.bandas).flatMap(B => B.rede.filter(r => !['GET', 'OPTIONS', 'HEAD'].includes(r.metodo)).map(r => `${r.metodo} ${r.url}`));
gate('0 pedidos nao-GET ao backend nas duas bandas', naoGET, []);

const base = out.bandas.base.s3, cand = out.bandas.cand.s3;
out.diferencial = {
  activeView: { base: base.activeView, cand: cand.activeView },
  secretaryView_hidden: { base: base.secretaryView_hidden, cand: cand.secretaryView_hidden },
  aba_supervisao_no_dom: { base: base.aba_supervisao_no_dom, cand: cand.aba_supervisao_no_dom },
  views_visiveis: { base: base.views_visiveis, cand: cand.views_visiveis },
};
out.decisao_h4_h5 = {
  menu_visivel: { base: out.bandas.base.s3.menu_visivel, cand: out.bandas.cand.s3.menu_visivel },
  item_secretaria_visivel: { base: out.bandas.base.s3.item_secretaria_visivel, cand: out.bandas.cand.s3.item_secretaria_visivel },
  supervisao_no_menu: { base: out.bandas.base.s3.supervisao_no_menu, cand: out.bandas.cand.s3.supervisao_no_menu },
  chip_conta: { base: out.bandas.base.s3.chip_conta, cand: out.bandas.cand.s3.chip_conta },
  rede_anonima_cand: out.bandas.cand.rede.slice(0, 12),
};
out.veredito = falhas.length ? `RM17_BANCADA_${falhas.length}_FALHAS` : 'RM17_BANCADA_OK';
writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas }, null, 2));
await encerrar(falhas.length ? 1 : 0, `veredito=${out.veredito} portoes=${portoes}`);
