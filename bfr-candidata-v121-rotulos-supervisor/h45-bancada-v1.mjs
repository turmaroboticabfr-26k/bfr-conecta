// H4/H5-3 (#1168) — bancada A/B OFFLINE: controle v120 (ar) x candidata v121, servidas em http://127.0.0.1.
// 0 deploy, 0 mint, 0 DDL, 0 INSERT, 0 escrita no backend (bloqueio ativo de fetch/xhr nao-GET).
// O que esta bancada fecha de instrumento: a v3 gravou SO a banda desktop (flag do chrome). Aqui o viewport
// e definido por CDP Emulation.setDeviceMetricsOverride e REGISTRADO por mediacao, com boot proprio em 390.
// Medida em cada banda: chip da conta (H5), o item Secretaria no sidebar E na gaveta mobile (H4), e o roteador.
// O papel e injetado so em memoria; o chrome e revelado pelo enterApp() do proprio app (:10405). Trafego = anonimo, so GET.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const B120 = `${DIR}/bfr-conecta/bfr-candidata-v120-setrole-supervisor`;
const B121 = `${DIR}/bfr-conecta/bfr-candidata-v121-rotulos-supervisor`;
const REGUA = JSON.parse(readFileSync(`${B121}/portoes-v121-diary.json`, 'utf8'));
const MED = JSON.parse(readFileSync(`${DIR}/bfr-conecta/evidence/h45-medicao-diary.json`, 'utf8'));
const OUT = `${B121}/h45-bancada-v1-diary.json`;
const EVID = `${DIR}/bfr-conecta/evidence`;
const CDP = 9377;
const SW_NOOP = `self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(self.clients.claim()));`;

// alvo do hunk e os dois rotulos, todos lidos da mediacao, nunca dactilografados
const LINHA_MAPA = MED.h5.linha_accountLabels;
const ROTULO_CHIP = MED.h5.rotulo_oficial_do_app.rotulo;
const FALLBACK_CHIP = MED.h5.rotulo_parent_2o_elemento;

const BANDAS = [
  { id: 'base', nome: 'controle v120 (shell do ar)', arquivo: `${B120}/index.html`, md5_esperado: REGUA.base_md5, porta: 8281 },
  { id: 'cand', nome: 'candidata v121', arquivo: `${B121}/index.html`, md5_esperado: REGUA.candidate_md5, porta: 8282 },
];
const VIEWPORTS = { desktop: { width: 1280, height: 900, mobile: false }, mobile: { width: 390, height: 842, mobile: true } };

if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
if (!existsSync(EVID)) mkdirSync(EVID, { recursive: true });

const md5 = b => createHash('md5').update(b).digest('hex');
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async query => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { authorization: `Bearer ${PAT}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status >= 400) throw new Error(`sql ${r.status}: ${t.slice(0, 220)}`);
  return JSON.parse(t);
};
const TABELAS = ['supervision_requests', 'supervision_audit', 'profiles', 'staff_schools', 'sports_schools'];
const baseline = async () => {
  const linhas = [];
  for (const t of TABELAS) {
    const r = await sql(`select count(*)::int as n, coalesce(md5(string_agg(x::text,'|' order by x::text)),'empty') as h from public.${t} x`);
    linhas.push(`${t} ${r[0].n} ${r[0].h}`);
  }
  return linhas;
};
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
    } else { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('fora da bancada'); }
  });
  return new Promise(resolve => s.listen(banda.porta, '127.0.0.1', () => resolve(s)));
});

const out = {
  ciclo: 'H4-H5-BANCADA-v1', tarefa: '#1168 H4/H5-3', em: new Date().toISOString(),
  escopo: 'bancada A/B offline; 0 deploy, 0 mint, 0 DDL, 0 INSERT; papel injetado so em memoria',
  hunk_em_teste: { linha: LINHA_MAPA, rotulo_esperado_chip: ROTULO_CHIP, fallback_do_controle: FALLBACK_CHIP },
  revelacao: 'chrome revelado por window.enterApp(role) (:10405); nenhuma classe patchada pelo rig',
  viewport: 'definido por CDP Emulation.setDeviceMetricsOverride e REGISTRADO por mediacao (innerWidth real da pagina)',
  limitacao: 'sem sessao real: todo trafego supabase.co desta bancada e anonimo (sem JWT). A prova com JWT e da aba logada e a S21.',
  regua: { base_md5: REGUA.base_md5, candidate_md5: REGUA.candidate_md5, hunks: REGUA.hunks, viewports: VIEWPORTS },
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
  const menu = document.getElementById('mobileMoreMenu');
  let papelCP = null; try { papelCP = (typeof currentProfile === 'undefined' || !currentProfile) ? null : (currentProfile.role ?? null); } catch (e) { papelCP = 'ReferenceError'; }
  let av = null; try { av = (typeof activeView === 'undefined') ? null : activeView; } catch (e) { av = 'ReferenceError'; }
  const sv = document.getElementById('secretaryView');
  const shell = document.getElementById('appShell');
  return {
    innerWidth: window.innerWidth, innerHeight: window.innerHeight, dpr: window.devicePixelRatio,
    papel_currentProfile: papelCP, activeView: av, tipo_enterApp: typeof window.enterApp,
    runtime_papel: window.BFR_APP_RUNTIME?.profile?.role ?? null,
    runtime_activeView: window.BFR_APP_RUNTIME?.activeView ?? null,
    appshell_ready: shell ? shell.classList.contains('ready') : null,
    login_hidden: document.getElementById('loginScreen') ? document.getElementById('loginScreen').classList.contains('hidden') : null,
    secretaryView_hidden: sv ? sv.classList.contains('hidden') : null,
    chip_conta: txt('.mini-person span:not([style])'),
    chip_nome: txt('[data-account-display-name]'),
    sidebar_no_dom: Array.from(document.querySelectorAll('.sidebar .nav-item[data-section]')).map(b => b.dataset.section),
    sidebar_visivel: Array.from(document.querySelectorAll('.sidebar .nav-item[data-section]')).filter(b => b.offsetWidth || b.offsetHeight).map(b => b.dataset.section),
    item_secretaria_sidebar: vis('.sidebar .nav-item[data-section="secretaria"]'),
    rotulo_item_secretaria: txt('.sidebar .nav-item[data-section="secretaria"]'),
    mais_no_dom: Array.from(document.querySelectorAll('.mobile-more-option[data-section]')).map(b => b.dataset.section),
    gaveta_oculta: menu ? menu.classList.contains('hidden') : null,
    item_secretaria_gaveta: vis('#mobileMoreMenu .mobile-more-option[data-section="secretaria"]'),
    rotulo_item_gaveta: txt('#mobileMoreMenu .mobile-more-option[data-section="secretaria"]'),
    toggle_ancora_viva: !!(document.querySelector('[data-section=\\"secretaria\\"]')),
    escritas_bloqueadas: (window.__H45_BLOCKED || []).slice(0),
    rpc_bloqueadas: (window.__H45_RPC || []).slice(0),
  };
})()`;

const ABRIR_MAIS = `(() => {
  const bot = Array.from(document.querySelectorAll('[data-mobile-more],[data-mobile-more-legacy]')).find(b => b.offsetWidth || b.offsetHeight);
  if (!bot) return 'nenhum botao Mais visivel';
  bot.click();
  const menu = document.getElementById('mobileMoreMenu');
  return JSON.stringify({ clicado: (bot.className || '').slice(0, 60), oculto_depois: menu ? menu.classList.contains('hidden') : null });
})()`;

const BLOQUEAR = `(() => {
  window.__H45_BLOCKED = window.__H45_BLOCKED || [];
  window.__H45_RPC = window.__H45_RPC || [];
  if (window.__H45_BLOCKER) return 'ja instalado';
  window.__H45_BLOCKER = true;
  const ehEscrita = m => !['GET', 'HEAD', 'OPTIONS'].includes(String(m || '').toUpperCase());
  const ehAlvo = u => /supabase\\.co/.test(String(u || ''));
  const ehRpc = u => /\\/rest\\/v1\\/rpc\\//.test(String(u || ''));
  const registrar = (metodo, url) => {
    const limpo = String(url).split('?')[0].slice(0, 150);
    (ehRpc(limpo) ? window.__H45_RPC : window.__H45_BLOCKED).push((ehRpc(limpo) ? 'rpc ' : 'fetch ') + metodo + ' ' + limpo);
  };
  const original = window.fetch;
  if (typeof original === 'function') {
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const metodo = (init && init.method) || (input && input.method) || 'GET';
        if (ehEscrita(metodo) && ehAlvo(url)) {
          registrar(metodo, url);
          return Promise.resolve(new Response(JSON.stringify({ message: 'bancada H4/H5: nao-GET bloqueado pelo rig' }), { status: 403, headers: { 'content-type': 'application/json' } }));
        }
      } catch (e) {}
      return original.apply(this, arguments);
    };
  }
  if (window.XMLHttpRequest && XMLHttpRequest.prototype.open) {
    const aberto = XMLHttpRequest.prototype.open;
    const enviado = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (metodo, url) {
      try { this.__h45Bloqueado = ehEscrita(metodo) && ehAlvo(url); if (this.__h45Bloqueado) registrar(metodo, url); } catch (e) {}
      return aberto.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () { if (this.__h45Bloqueado) { try { this.abort(); } catch (e) {} return; } return enviado.apply(this, arguments); };
  }
  return 'instalado';
})()`;

const INJETAR = `(() => {
  const perfil = { id: 'h45-bancada-sintetica', role: 'education_supervisor', name: 'Bancada H4/H5', full_name: 'Bancada H4/H5', display_name: 'Bancada H4/H5', school: 'bancada-local', created_at: new Date().toISOString() };
  try { currentProfile = perfil; } catch (e) { return { escrito: false, leitura: null, erro_binding_papel: String(e && e.message).slice(0, 160) }; }
  try { currentUser = { id: 'h45-bancada-sintetica', role: 'education_supervisor', user_metadata: { full_name: 'Bancada H4/H5', name: 'Bancada H4/H5' } }; } catch (e) { return { escrito: true, leitura: currentProfile?.role ?? null, erro_binding_usuario: String(e && e.message).slice(0, 160) }; }
  return { escrito: true, leitura: currentProfile?.role ?? null, usuario: currentUser?.id ?? null };
})()`;

const CALL = (fn, ...args) => `(() => { try { const r = window.${fn}(${args.map(a => JSON.stringify(a)).join(', ')}); return r === undefined ? 'sem retorno' : JSON.stringify(r).slice(0, 120); } catch (e) { return 'ERRO: ' + String(e && e.message).slice(0, 160); } })()`;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${DIR}/.h45-chrome-bancada-v1`,
  '--headless=new', `--window-size=${VIEWPORTS.desktop.width},${VIEWPORTS.desktop.height}`, '--no-first-run', '--no-default-browser-check',
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
const evalJS = async e => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 260));
  return r.result?.value;
};
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(e)) return Date.now() - t0; await new Promise(r => setTimeout(r, 300)); } throw new Error('waitFor esgotado: ' + e.slice(0, 120)); };
const settle = ms => new Promise(r => setTimeout(r, ms));
const captura = async nome => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(s.data, 'base64');
  const caminho = `${EVID}/${nome}.png`;
  writeFileSync(caminho, buf);
  return { ficheiro: caminho.split('/').pop(), bytes: statSync(caminho).size, md5: md5(buf), largura: null };
};
const setViewport = async v => {
  await send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });
  await settle(900);
};

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
await send('Page.bringToFront');
await serversPromise;

try { out.baseline_antes = await baseline(); }
catch (e) { await encerrar(1, 'baseline ANTES falhou (canal SQL): ' + String(e).slice(0, 200)); }

// boot completo pelo caminho do proprio app, na viewport vigente; devolve a mediacao limpa
const boot = async (url, prefixo) => {
  const P = { passos: {} };
  await send('Page.navigate', { url: 'about:blank' }); await settle(600);
  await send('Page.navigate', { url });
  P.passos.ms_login = await waitFor(`!!document.getElementById('loginScreen')`, 60000);
  await send('Page.bringToFront');
  P.passos.sw_controller = await evalJS(`!!(navigator.serviceWorker && navigator.serviceWorker.controller)`);
  P.s0 = await evalJS(MEDIR);
  P.passos.bloqueio = await evalJS(BLOQUEAR);
  P.passos.gatilho = await evalJS(`(() => { const el = document.getElementById('publicScheduleBtn'); if (!el) return 'ausente'; el.click(); return 'clicado'; })()`);
  P.passos.ms_core = await waitFor(`typeof window.setRole === 'function'`, 60000);
  P.passos.modules = await evalJS(`(async () => { try { const p = window.BFR_AUTH_MODULES_READY ? window.BFR_AUTH_MODULES_READY() : null; if (p && p.then) await p; return 'pronto'; } catch (e) { return 'erro: ' + String(e && e.message).slice(0,140); } })()`);
  P.passos.ms_runtime = await waitFor(`typeof window.BFR_APP_RUNTIME === 'object'`, 60000);
  P.injecao = await evalJS(INJETAR);
  P.passos.setRole = await evalJS(CALL('setRole', 'education_supervisor'));
  await settle(2200);
  P.passos.enterApp = await evalJS(CALL('enterApp', 'education_supervisor'));
  P.passos.ms_chrome = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && document.getElementById('loginScreen')?.classList.contains('hidden')`, 45000);
  await settle(3200);
  P.m = await evalJS(MEDIR);
  P.captura = await captura(prefixo);
  P.rede = rede.slice(); P.excecoes = erros.filter(e => e.startsWith('EXCEPTION')).slice(0, 10);
  return P;
};

for (const banda of BANDAS) {
  const url = `http://127.0.0.1:${banda.porta}/`;
  console.log(`\n=== ${banda.nome}  ${url}`);
  const B = { nome: banda.nome, url, md5_servido: banda.md5_servido, bytes_servidos: banda.bytes_servidos, bandas_viewport: {} };
  out.bandas[banda.id] = B;
  rede = []; erros = []; logErro = []; metodos = new Map();
  gate(`${banda.id} bytes servidos == regua dos portoes`, banda.md5_servido, banda.md5_esperado);

  await setViewport(VIEWPORTS.desktop);
  B.bandas_viewport.desktop = await boot(url, `h45v1--${banda.id}-desktop`);

  await setViewport(VIEWPORTS.mobile);
  B.bandas_viewport['mesma_sessao_390'] = { m: await evalJS(MEDIR) };
  B.bandas_viewport['mesma_sessao_390'].gaveta = await evalJS(ABRIR_MAIS);
  B.bandas_viewport['mesma_sessao_390'].m_gaveta = await evalJS(MEDIR);
  B.bandas_viewport['mesma_sessao_390'].captura = await captura(`h45v1--${banda.id}-390-gaveta`);
  B.bandas_viewport.mobile = await boot(url, `h45v1--${banda.id}-mobile`);
  B.bandas_viewport.mobile.gaveta = await evalJS(ABRIR_MAIS);
  B.bandas_viewport.mobile.m_gaveta = await evalJS(MEDIR);
  B.bandas_viewport.mobile.captura_gaveta = await captura(`h45v1--${banda.id}-mobile-gaveta`);

  // cada boot e um documento novo: as listas de window morrem com a pagina. Agrega todas as
  // leituras gravadas (por boot e por passo) + a leitura final do documento vigente.
  const fold = async key => {
    const seen = new Set();
    const push = arr => { for (const s of arr || []) seen.add(String(s)); };
    for (const vb of ['desktop', 'mesma_sessao_390', 'mobile']) {
      const V = B.bandas_viewport[vb]; if (!V) continue;
      push(V.m?.[key]); push(V.m_gaveta?.[key]);
    }
    push(await evalJS(`(window.${key === 'escritas_bloqueadas' ? '__H45_BLOCKED' : '__H45_RPC'} || []).slice(0)`));
    return [...seen].sort();
  };
  B.escritas_bloqueadas_total = await fold('escritas_bloqueadas');
  B.rpc_bloqueadas_total = await fold('rpc_bloqueadas');
  B.erros_console = erros.slice(0, 20);
  B.log_erros = logErro.slice(0, 10);
  console.log(`  desktop ${banda.id}: ${JSON.stringify(B.bandas_viewport.desktop.m).slice(0, 700)}`);
  console.log(`  mobile  ${banda.id}: ${JSON.stringify(B.bandas_viewport.mobile.m_gaveta).slice(0, 700)}`);
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas }, null, 2));
}

const B = id => out.bandas[id];
const m = (id, vb) => B(id).bandas_viewport[vb].m;
const mg = (id, vb) => (B(id).bandas_viewport[vb].m_gaveta || B(id).bandas_viewport[vb].mesma_sessao_390?.m_gaveta || {});

// --- boot de cada banda nas duas viewport ---
for (const id of ['base', 'cand']) for (const vb of ['desktop', 'mobile']) {
  const P = B(id).bandas_viewport[vb];
  gate(`${id}/${vb} papel injetado lido de volta`, [P.injecao.escrito, P.injecao.leitura], [true, 'education_supervisor']);
  gate(`${id}/${vb} chrome revelado pelo enterApp do app`, [P.m.appshell_ready, P.m.login_hidden], [true, true]);
  gate(`${id}/${vb} 0 escrita de TABELA tentada`, P.m.escritas_bloqueadas, []);
}
gate('desktop roda a 1280 (viewport registrada pela pagina)', [m('base', 'desktop').innerWidth, m('cand', 'desktop').innerWidth], [1280, 1280]);
gate('mobile roda a 390 (viewport registrada pela pagina)', [m('base', 'mobile').innerWidth, m('cand', 'mobile').innerWidth], [390, 390]);

// --- H5: o chip da conta ---
for (const vb of ['desktop', 'mobile']) {
  gate(`controle ${vb} chip cai no fallback do parent`, m('base', vb).chip_conta, FALLBACK_CHIP);
  gate(`candidata ${vb} chip le o rotulo do papel`, m('cand', vb).chip_conta, ROTULO_CHIP);
  gate(`candidata ${vb} chip nao contem 'Responsavel'`, /Respons/.test(m('cand', vb).chip_conta || ''), false);
  gate(`as duas bandas ${vb} mantem a linha de nome do chip (independente do papel)`,
    [m('base', vb).chip_nome, m('cand', vb).chip_nome], ['Bancada H4/H5', 'Bancada H4/H5']);
}
gate('mesma sessao 390 (sem recarregar) candidata ja pinta o rotulo novo', m('cand', 'mesma_sessao_390').chip_conta, ROTULO_CHIP);

// --- H4: o item do menu, nas duas bandas ---
for (const vb of ['desktop', 'mobile']) {
  for (const id of ['base', 'cand']) {
    gate(`${id}/${vb} item Secretaria do sidebar VISIVEL para o supervisor (H4 falso alarme)`, m(id, vb).item_secretaria_sidebar, true);
    gate(`${id}/${vb} Secretaria esta na lista de itens visiveis`, m(id, vb).sidebar_visivel.includes('secretaria'), true);
  }
}
gate('gaveta mobile: controle e candidata mostram o item Secretaria',
  [mg('base', 'mobile').item_secretaria_gaveta, mg('cand', 'mobile').item_secretaria_gaveta], [true, true]);
gate('gaveta mobile: o botao do proprio app abre a gaveta na candidata', mg('cand', 'mobile').gaveta_oculta, false);

// --- o roteador da v120 nao regride na candidata ---
for (const vb of ['desktop', 'mobile']) {
  for (const id of ['base', 'cand']) {
    gate(`${id}/${vb} activeView assenta em education_supervisor (PEN-32)`, [m(id, vb).activeView, m(id, vb).runtime_activeView], ['education_supervisor', 'education_supervisor']);
    gate(`${id}/${vb} secretaryView deixa de estar hidden`, m(id, vb).secretaryView_hidden, false);
  }
}
gate('candidata nao muda nada alem do chip: menu identico ao controle nas duas bandas',
  [m('cand', 'desktop').sidebar_visivel, m('cand', 'mobile').sidebar_visivel],
  [m('base', 'desktop').sidebar_visivel, m('base', 'mobile').sidebar_visivel]);

// --- nao-escrita ---
const escritasTabela = Object.values(out.bandas).flatMap(Bb => Bb.escritas_bloqueadas_total || []);
gate('0 escrita de TABELA tentada ao backend nas duas bandas', escritasTabela, []);
const naoGETqueChegou = Object.values(out.bandas).flatMap(Bb => ['desktop', 'mesma_sessao_390', 'mobile']
  .flatMap(vb => (Bb.bandas_viewport[vb]?.rede || []).filter(r => !['GET', 'OPTIONS', 'HEAD'].includes(r.metodo)).map(r => `${r.metodo} ${r.url}`)));
gate('0 pedido nao-GET chegou ao backend (rede CDP)', [...new Set(naoGETqueChegou)], []);
const nomesRpc = [...new Set(Object.values(out.bandas).flatMap(Bb => Bb.rpc_bloqueadas_total || []).map(s => String(s).split('/rpc/')[1]).filter(Boolean))].sort();
let catalogoRpc = [];
try {
  if (nomesRpc.length) catalogoRpc = await sql(`select p.proname, p.provolatile, pg_get_functiondef(p.oid) as corpo from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname in (${nomesRpc.map(x => `'${x.replace(/[^A-Za-z0-9_]/g, '')}'`).join(', ')}) order by p.proname`);
} catch (e) { catalogoRpc = [{ erro: String(e).slice(0, 200) }]; }
out.rpc_barradas = nomesRpc;
out.catalogo_rpc = catalogoRpc.map(r => r.erro ? { erro: r.erro } : {
  proname: r.proname, provolatile: r.provolatile,
  tem_insert: /insert\s+into/i.test(r.corpo), tem_update: /update\s+["'a-z_.]+\s+set/i.test(r.corpo), tem_delete: /delete\s+from/i.test(r.corpo),
});
gate('todo POST /rpc/ barrado existe no catalogo pg_proc', nomesRpc.filter(x => !catalogoRpc.some(r => r.proname === x)), []);
gate('todo POST /rpc/ barrado e FUNCAO DE LEITURA (sem DML no corpo)', out.catalogo_rpc.filter(r => !r.erro && (r.tem_insert || r.tem_update || r.tem_delete)).map(r => r.proname), []);
try { out.baseline_depois = await baseline(); }
catch (e) { await encerrar(1, 'baseline DEPOIS falhou (canal SQL): ' + String(e).slice(0, 200)); }
gate('baseline das 5 tabelas imutavel (contagem E md5, antes x depois)', out.baseline_depois, out.baseline_antes);
gate('0 excecoes nao tratadas na candidata', Object.values(out.bandas.cand.bandas_viewport).map(P => P.excecoes || []), [[], [], []]);

out.diferencial = {
  chip_conta: { desktop: { base: m('base', 'desktop').chip_conta, cand: m('cand', 'desktop').chip_conta }, mobile: { base: m('base', 'mobile').chip_conta, cand: m('cand', 'mobile').chip_conta } },
  chip_nome: { base: m('base', 'desktop').chip_nome, cand: m('cand', 'desktop').chip_nome },
  item_secretaria_sidebar: { desktop: { base: m('base', 'desktop').item_secretaria_sidebar, cand: m('cand', 'desktop').item_secretaria_sidebar }, mobile: { base: m('base', 'mobile').item_secretaria_sidebar, cand: m('cand', 'mobile').item_secretaria_sidebar } },
  item_secretaria_gaveta: { base: mg('base', 'mobile').item_secretaria_gaveta, cand: mg('cand', 'mobile').item_secretaria_gaveta },
  sidebar_visivel: { desktop: { base: m('base', 'desktop').sidebar_visivel, cand: m('cand', 'desktop').sidebar_visivel }, mobile: { base: m('base', 'mobile').sidebar_visivel, cand: m('cand', 'mobile').sidebar_visivel } },
  activeView: { base: m('base', 'desktop').activeView, cand: m('cand', 'desktop').activeView },
};
out.veredito = falhas.length ? `H45_BANCADA_V1_${falhas.length}_FALHAS` : 'H45_BANCADA_V1_OK';
writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas }, null, 2));
await encerrar(falhas.length ? 1 : 0, `veredito=${out.veredito} portoes=${portoes}`);
