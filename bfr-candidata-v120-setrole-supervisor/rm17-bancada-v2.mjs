// #1160 RM-1.7 — bancada A/B OFFLINE v2: controle v119 (ar) × candidata v120, servidas em http://127.0.0.1.
// 0 deploy, 0 mint, 0 DDL, 0 INSERT, 0 escrita no backend (bloqueio ativo de fetch/xhr nao-GET).
// Correcao da v1: a 1a passada mediu o chrome NUNCA revelado (sem sessao, #loginScreen fica visivel e
// #appShell nunca ganha .ready), entao central/aba/menu/chip nao tinham caixa de layout e eram falsos-negativos.
// Aqui a revelacao e feita por `window.enterApp(role)` — a FUNCAO DO PROPRIO APP (:10405) que o boot real chama
// apos a sessao. Nao ha patch de classe pelo rig: o que se mede e codigo dos bytes sob teste.
// O papel e injetado so em memoria, na binding global que o roteador le. Tráfego supabase.co = ANONIMO, so GET.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const CICLO = `${DIR}/bfr-conecta/bfr-candidata-v120-setrole-supervisor`;
const REGUA = JSON.parse(readFileSync(`${CICLO}/portoes-v120-diary.json`, 'utf8'));
const OUT = `${CICLO}/rm17-bancada-v2-diary.json`;
const EVID = `${DIR}/bfr-conecta/evidence`;
const CDP = 9366;
const SW_NOOP = `self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(self.clients.claim()));`;

const BANDAS = [
  { id: 'base', nome: 'controle v119 (shell do ar)', arquivo: `${DIR}/bfr-conecta/bfr-candidata-v119-supervisao-embed/index.html`, md5_esperado: REGUA.base_md5, porta: 8271 },
  { id: 'cand', nome: 'candidata v120', arquivo: `${CICLO}/index.html`, md5_esperado: REGUA.candidate_md5, porta: 8272 },
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
  ciclo: 'RM-17-BANCADA-v2', tarefa: '#1158 RM-1.7 / PEN-32', em: new Date().toISOString(),
  escopo: 'bancada A/B offline; 0 deploy, 0 mint, 0 DDL, 0 INSERT; papel injetado so em memoria',
  revelacao: 'o chrome e revelado por window.enterApp(role), funcao propria do app (:10405) chamada pelo boot real; o rig nao patcha classes',
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
  let tipoEA = 'erro'; try { tipoEA = typeof window.enterApp; } catch (e) {}
  let papelCP = null; try { papelCP = (typeof currentProfile === 'undefined' || !currentProfile) ? null : (currentProfile.role ?? null); } catch (e) { papelCP = 'ReferenceError'; }
  let av = null; try { av = (typeof activeView === 'undefined') ? null : activeView; } catch (e) { av = 'ReferenceError'; }
  const body = document.querySelector('[data-sec-body]');
  const sv = document.getElementById('secretaryView');
  const shell = document.getElementById('appShell');
  const aba = document.querySelector('[data-sec-tab="supervisao"]');
  return {
    tipo_setRole: tipoSR, tipo_enterApp: tipoEA, papel_currentProfile: papelCP, activeView: av,
    runtime_papel: window.BFR_APP_RUNTIME?.profile?.role ?? null,
    runtime_activeView: window.BFR_APP_RUNTIME?.activeView ?? null,
    tem_runtime: typeof window.BFR_APP_RUNTIME === 'object',
    appshell_ready: shell ? shell.classList.contains('ready') : null,
    login_hidden: document.getElementById('loginScreen') ? document.getElementById('loginScreen').classList.contains('hidden') : null,
    views_visiveis: Array.from(document.querySelectorAll('[id$="View"]')).filter(v => getComputedStyle(v).display !== 'none').map(v => v.id),
    secretaryView_hidden: sv ? sv.classList.contains('hidden') : null,
    central_visivel: vis('[data-secretary-central]'),
    aba_supervisao_no_dom: !!aba,
    aba_supervisao_visivel: vis('[data-sec-tab="supervisao"]'),
    aba_supervisao_ativa: aba ? (aba.classList.contains('is-active') || aba.getAttribute('aria-current') !== null) : null,
    sec_body_len: body ? (body.textContent || '').trim().length : 0,
    sec_body_ini: body ? (body.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160) : null,
    abas_no_dom: Array.from(document.querySelectorAll('[data-sec-tab]')).map(b => b.dataset.secTab),
    menu_visivel: Array.from(document.querySelectorAll('.nav-item[data-section]')).filter(b => b.offsetWidth || b.offsetHeight).map(b => b.dataset.section),
    item_secretaria_visivel: vis('.nav-item[data-section="secretaria"]'),
    supervisao_no_menu: Array.from(document.querySelectorAll('[data-section]')).map(e => e.dataset.section).includes('supervisao'),
    chip_conta: txt('.mini-person span:not([style])'),
    breadcrumb: txt('.breadcrumb b'),
    escritas_bloqueadas: (window.__RM17_BLOCKED || []).slice(0),
  };
})()`;

const BLOQUEAR = `(() => {
  window.__RM17_BLOCKED = window.__RM17_BLOCKED || [];
  if (window.__RM17_BLOCKER) return 'ja instalado';
  window.__RM17_BLOCKER = true;
  const ehEscrita = m => !['GET', 'HEAD', 'OPTIONS'].includes(String(m || '').toUpperCase());
  const ehAlvo = u => /supabase\\.co/.test(String(u || ''));
  const original = window.fetch;
  if (typeof original === 'function') {
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const metodo = (init && init.method) || (input && input.method) || 'GET';
        if (ehEscrita(metodo) && ehAlvo(url)) {
          window.__RM17_BLOCKED.push('fetch ' + metodo + ' ' + url.split('?')[0].slice(0, 150));
          return Promise.resolve(new Response(JSON.stringify({ message: 'bancada RM-1.7: escrita bloqueada pelo rig' }), { status: 403, headers: { 'content-type': 'application/json' } }));
        }
      } catch (e) {}
      return original.apply(this, arguments);
    };
  }
  if (window.XMLHttpRequest && XMLHttpRequest.prototype.open) {
    const aberto = XMLHttpRequest.prototype.open;
    const enviado = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (metodo, url) {
      try { this.__rm17Bloqueado = ehEscrita(metodo) && ehAlvo(url); if (this.__rm17Bloqueado) window.__RM17_BLOCKED.push('xhr ' + metodo + ' ' + String(url).split('?')[0].slice(0, 150)); } catch (e) {}
      return aberto.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () { if (this.__rm17Bloqueado) { try { this.abort(); } catch (e) {} return; } return enviado.apply(this, arguments); };
  }
  return 'instalado';
})()`;

const INJETAR = `(() => {
  const perfil = { id: 'rm17-bancada-sintetica', role: 'education_supervisor', name: 'Bancada RM-1.7', full_name: 'Bancada RM-1.7', display_name: 'Bancada RM-1.7', school: 'bancada-local', created_at: new Date().toISOString() };
  try {
    currentProfile = perfil;
  } catch (e) { return { escrito: false, leitura: null, erro_binding_papel: String(e && e.message).slice(0, 160) }; }
  try {
    currentUser = { id: 'rm17-bancada-sintetica', role: 'education_supervisor', user_metadata: { full_name: 'Bancada RM-1.7', name: 'Bancada RM-1.7' } };
  } catch (e) { return { escrito: true, leitura: currentProfile?.role ?? null, erro_binding_usuario: String(e && e.message).slice(0, 160) }; }
  return { escrito: true, leitura: currentProfile?.role ?? null, usuario: currentUser?.id ?? null };
})()`;

const CALL = (fn, ...args) => `(() => { try { const r = window.${fn}(${args.map(a => JSON.stringify(a)).join(', ')}); return r === undefined ? 'sem retorno' : JSON.stringify(r).slice(0, 120); } catch (e) { return 'ERRO: ' + String(e && e.message).slice(0, 160); } })()`;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${DIR}/.rm17-chrome-bancada-v2`,
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
let rede = [], erros = [], logErro = [], metodos = new Map();
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
  rede = []; erros = []; logErro = []; metodos = new Map();
  gate(`${banda.id} bytes servidos == regua dos portoes`, banda.md5_servido, banda.md5_esperado);

  await send('Page.navigate', { url: 'about:blank' }); await settle(700);
  await send('Page.navigate', { url });
  B.passos.ms_login = await waitFor(`!!document.getElementById('loginScreen')`, 60000);
  await send('Page.bringToFront');
  B.passos.sw_controller = await evalJS(`!!(navigator.serviceWorker && navigator.serviceWorker.controller)`);
  B.s0 = await evalJS(MEDIR);
  gate(`${banda.id} core ainda nao reanimado antes do gatilho`, B.s0.tipo_setRole, 'undefined');
  gate(`${banda.id} tela de login visivel antes do boot`, B.s0.login_hidden, false);

  B.passos.bloqueio = await evalJS(BLOQUEAR);
  gate(`${banda.id} bloqueio de escrita nao-GET instalado`, B.passos.bloqueio, 'instalado');

  B.passos.gatilho = await evalJS(`(() => { const el = document.getElementById('publicScheduleBtn'); if (!el) return 'ausente'; el.click(); return 'clicado'; })()`);
  gate(`${banda.id} gatilho benigno presente`, B.passos.gatilho, 'clicado');
  B.passos.ms_core = await waitFor(`typeof window.setRole === 'function'`, 60000);
  B.passos.modules = await evalJS(`(async () => { try { const p = window.BFR_AUTH_MODULES_READY ? window.BFR_AUTH_MODULES_READY() : null; if (p && p.then) await p; return 'pronto'; } catch (e) { return 'erro: ' + String(e && e.message).slice(0,140); } })()`);
  B.passos.ms_runtime = await waitFor(`typeof window.BFR_APP_RUNTIME === 'object'`, 60000);
  B.s1 = await evalJS(MEDIR);
  gate(`${banda.id} roteador reanimado (window.setRole e funcao)`, B.s1.tipo_setRole, 'function');
  gate(`${banda.id} enterApp do proprio app acessivel`, B.s1.tipo_enterApp, 'function');
  gate(`${banda.id} runtime exposto apos os modulos deferred`, B.s1.tem_runtime, true);

  B.injecao = await evalJS(INJETAR);
  gate(`${banda.id} papel injetado lido de volta na mesma binding do roteador`, [B.injecao.escrito, B.injecao.leitura], [true, 'education_supervisor']);

  B.passos.setRole_sup = await evalJS(CALL('setRole', 'education_supervisor'));
  await settle(2500);
  B.s2 = await evalJS(MEDIR);

  B.passos.enterApp = await evalJS(CALL('enterApp', 'education_supervisor'));
  B.passos.ms_chrome = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && document.getElementById('loginScreen')?.classList.contains('hidden')`, 45000);
  await settle(3500);
  B.s3 = await evalJS(MEDIR);
  gate(`${banda.id} chrome revelado pelo enterApp do app (appShell ready + login hidden)`, [B.s3.appshell_ready, B.s3.login_hidden], [true, true]);
  gate(`${banda.id} 0 escrita bloqueada pelo rig (so GET anonimo ao backend)`, B.s3.escritas_bloqueadas, []);

  B.passos.setRole_sec = await evalJS(CALL('setRole', 'secretary'));
  await settle(2500);
  B.s4 = await evalJS(MEDIR);
  gate(`${banda.id} CONTROLE POSITIVO do rig: setRole('secretary') e aceito`, B.s4.activeView, 'secretary');

  B.passos.setRole_sup2 = await evalJS(CALL('setRole', 'education_supervisor'));
  await settle(2500);
  B.s5 = await evalJS(MEDIR);

  if (B.s5.aba_supervisao_visivel) {
    B.passos.clique_aba = await evalJS(`(() => { const el = document.querySelector('[data-sec-tab="supervisao"]'); if (!el) return 'ausente'; el.scrollIntoView({ block: 'center' }); el.click(); return 'clicado'; })()`);
    await settle(4000);
    B.s6 = await evalJS(MEDIR);
    B.pedidos_supervisao = rede.filter(r => /supervision/.test(r.url));
    B.pedidos_supervisao_status = B.pedidos_supervisao.map(r => `${r.metodo} ${r.url.split('/').pop()} ${r.status}`).slice(0, 8);
  } else {
    B.passos.clique_aba = 'pulado: aba sem caixa de layout nesta banda';
    B.s6 = null;
  }
  B.escritas_bloqueadas_total = await evalJS(`(window.__RM17_BLOCKED || []).slice(0)`);
  B.capturas = {
    apos_enterApp: await captura(`rm17v2--${banda.id}-apos-enterapp`),
    final: await captura(`rm17v2--${banda.id}-final`),
  };
  B.rede = rede.slice();
  B.erros_console = erros.slice(0, 20);
  B.excecoes = erros.filter(e => e.startsWith('EXCEPTION')).slice(0, 10);
  B.log_erros = logErro.slice(0, 10);
  console.log(`  s3 ${banda.id}: ${JSON.stringify(B.s3).slice(0, 780)}`);
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas }, null, 2));
}

const base = out.bandas.base.s3, cand = out.bandas.cand.s3;
const candFinal = out.bandas.cand.s6 || cand;
gate('base activeView segue parent depois de setRole + enterApp', base.activeView, 'parent');
gate('base secretaryView segue hidden', base.secretaryView_hidden, true);
gate('base aba Supervisao ausente do DOM', base.aba_supervisao_no_dom, false);
gate('base central da Secretaria sem caixa de layout', base.central_visivel, false);
gate('cand activeView assenta em education_supervisor', cand.activeView, 'education_supervisor');
gate('cand runtime_activeView concorda com o roteador', cand.runtime_activeView, 'education_supervisor');
gate('cand secretaryView deixa de estar hidden', cand.secretaryView_hidden, false);
gate('cand views visiveis incluem secretaryView', cand.views_visiveis.includes('secretaryView'), true);
gate('cand aba Supervisao presente no DOM', cand.aba_supervisao_no_dom, true);
gate('cand central da Secretaria VISIVEL com chrome revelado', cand.central_visivel, true);
gate('cand aba Supervisao VISIVEL (caixa de layout)', cand.aba_supervisao_visivel, true);
gate('cand painel da Supervisão pinta apos clique na aba', [candFinal.aba_supervisao_ativa, candFinal.sec_body_len > 400], [true, true]);
gate('cand 0 excecoes nao tratadas', out.bandas.cand.excecoes, []);
gate('base 0 excecoes nao tratadas', out.bandas.base.excecoes, []);
const naoGET = Object.values(out.bandas).flatMap(B => B.rede.filter(r => !['GET', 'OPTIONS', 'HEAD'].includes(r.metodo)).map(r => `${r.metodo} ${r.url}`).concat(B.escritas_bloqueadas_total));
gate('0 pedidos nao-GET ao backend nas duas bandas', naoGET, []);

out.diferencial = {
  activeView: { base: base.activeView, cand: cand.activeView },
  secretaryView_hidden: { base: base.secretaryView_hidden, cand: cand.secretaryView_hidden },
  central_visivel: { base: base.central_visivel, cand: cand.central_visivel },
  aba_supervisao_no_dom: { base: base.aba_supervisao_no_dom, cand: cand.aba_supervisao_no_dom },
  aba_supervisao_visivel: { base: base.aba_supervisao_visivel, cand: cand.aba_supervisao_visivel },
  views_visiveis: { base: base.views_visiveis, cand: cand.views_visiveis },
  abas_no_dom: { base: base.abas_no_dom, cand: cand.abas_no_dom },
  sec_body_len: { base: base.sec_body_len, cand: candFinal.sec_body_len },
};
out.decisao_h4_h5 = {
  nota: 'H4 (:10425 toggle do item Secretaria do menu) e H5 (:10437 accountLabels sem a chave education_supervisor) NAO entraram na v120. Medido aqui com o chrome revelado pelo enterApp.',
  menu_visivel: { base: base.menu_visivel, cand: cand.menu_visivel },
  item_secretaria_visivel: { base: base.item_secretaria_visivel, cand: cand.item_secretaria_visivel },
  supervisao_no_menu: { base: base.supervisao_no_menu, cand: cand.supervisao_no_menu },
  chip_conta: { base: base.chip_conta, cand: cand.chip_conta },
  runtime_papel: { base: base.runtime_papel, cand: cand.runtime_papel },
  rede_anonima_cand: out.bandas.cand.rede.slice(0, 14),
  pedidos_supervisao_cand: out.bandas.cand.pedidos_supervisao_status ?? null,
};
out.veredito = falhas.length ? `RM17_BANCADA_V2_${falhas.length}_FALHAS` : 'RM17_BANCADA_V2_OK';
writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas }, null, 2));
await encerrar(falhas.length ? 1 : 0, `veredito=${out.veredito} portoes=${portoes}`);
