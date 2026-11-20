#!/usr/bin/env node
// BU-12 — A SUPERFÍCIE DO TELEMOVÉL: o toque em «Mais» abre a gaveta e a rota municipal está lá?
//
// Existe porque o bu11 (scripts/bu11-porta-municipal-desktop.mjs) mede as duas cópias que o módulo injeta
// — `nav.nav-list` (sidebar) e `.mobile-more-grid` (dentro de `#mobileMoreMenu`) — e a 390 px nenhuma
// delas está num recipiente aberto: a sidebar vai a `display:none` e o gatilho `[data-mobile-more]` do
// `#mobileMoreMenu` tem caixa 0x0 (medido nas três corridas vermelhas preservadas em
// evidence/ANTERIOR-bu11-porta-municipal-desktop-developer-390-*-VERMELHO*.json). O recipiente que o
// telemóvel realmente abre é `#bfrMobileDrawer`, construído pelo aplicativo a partir do mesmo mapa que o
// módulo muta em runtime. Aqui mede-se ESA superfície, por toque, e não por leitura do mapa.
//
// Só-leitura no ar: 0 escrita na base, 0 DDL, 0 deploy. A única escrita é a renovação da sessão GoTrue,
// cujo par rotacionado é gravado de volta em todos os registos ANTES de abrir o browser (o GoTrue roda o
// refresh a cada uso; deitar fora o par novo queima a cadeia do papel — foi o que aconteceu ao developer
// em 20/11 às 21:36Z, registado no bu11:12-14).
//
// Uso: node scripts/bu12-gaveta-municipal-toque.mjs <papel> <largura> <rotulo>
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'developer';
const LARGURA = parseInt(process.argv[3] || '390', 10);
const ROTULO = process.argv[4] || '1';
const ALTO = 720;
if (LARGURA > 430) throw new Error(`ABORTA: este instrumento é da superfície do toque (largura <= 430); ${LARGURA} px mede-se com scripts/bu11-porta-municipal-desktop.mjs`);
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const RAIZ = `${REPO}/bfr-conecta`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ESPERADO = JSON.parse(readFileSync(`${RAIZ}/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`, 'utf8'));
const OUT = `${RAIZ}/evidence/bu12-gaveta-municipal-toque-${PAPEL}-${LARGURA}-${ROTULO}.json`;
const PERFIL = `${REPO}/.bu12-${ROTULO}`;
const PORT = parseInt(process.env.BU12_PORT || '9383', 10);
const SECT = 'secretaria-municipal';
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro rótulo');
const h = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);
const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');

// 1) o ar servido e as chaves que dele se leem — nunca dactilografadas
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const md5Shell = md5(shellTxt);
const ANON = (shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
const REF = (shellTxt.match(/https:\/\/([a-z0-9]{12,24})\.supabase\.co/) || [])[1];
if (!ANON || !REF) throw new Error('ABORTA: o ar não devolve anon key nem referência — nada é tentado às cegas');
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;

// 2) sessão: renova e grava o par rotacionado em TODOS os registos que têm este papel
const registos = readdirSync(REPO).filter((f) => /^ah2-sess/.test(f) && f.endsWith('.json'))
  .map((f) => `${REPO}/${f}`).filter((p) => { const j = JSON.parse(readFileSync(p, 'utf8')); return j[PAPEL] && j[PAPEL].refresh_token; });
if (!registos.length) throw new Error(`ABORTA: nenhum registo local tem cadeia para ${PAPEL}`);
const antesHash = h(JSON.parse(readFileSync(registos[0], 'utf8'))[PAPEL].refresh_token);
const corpo = JSON.stringify({ refresh_token: JSON.parse(readFileSync(registos[0], 'utf8'))[PAPEL].refresh_token });
const rAuth = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: corpo, signal: AbortSignal.timeout(45000) });
const jsAuth = await rAuth.json().catch(() => null);
if (!rAuth.ok || !jsAuth?.access_token) throw new Error(`renova HTTP ${rAuth.status}: ${String(jsAuth && (jsAuth.msg || jsAuth.error_description) || '').slice(0, 140)}`);
for (const p of registos) { const j = JSON.parse(readFileSync(p, 'utf8')); j[PAPEL] = { ...j[PAPEL], access_token: jsAuth.access_token, refresh_token: jsAuth.refresh_token, expires_at: jsAuth.expires_at, user: jsAuth.user }; writeFileSync(p, JSON.stringify(j, null, 2) + '\n'); }
const relido = JSON.parse(readFileSync(registos[0], 'utf8'))[PAPEL];
if (h(relido.refresh_token) !== h(jsAuth.refresh_token)) throw new Error('ABORTA: o par gravado não foi relido igual — não se abre browser com registo incerto');
const SESSAO = { access_token: jsAuth.access_token, token_type: jsAuth.token_type, expires_at: jsAuth.expires_at, expires_in: jsAuth.expires_in, refresh_token: jsAuth.refresh_token, user: jsAuth.user };

// 3) chrome
function portaOcupada(porta) {
  const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const pids = new Set();
  for (const linha of String(q.stdout || '').split(/\r?\n/)) {
    if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
    const pid = linha.trim().split(/\s+/).pop();
    if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  return pids;
}
const donos = portaOcupada(PORT);
for (const pid of donos) {
  const dono = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=$pid").Name`], { encoding: 'utf8' });
  const nome = String(dono.stdout || '').trim();
  if (!/chrome/i.test(nome)) throw new Error(`PORTA ${PORT}: o dono (${pid} ${nome || 'desconhecido'}) não é um chrome nosso — muda-se a porta com BU12_PORT`);
  spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { stdio: 'ignore' });
}
if (donos.size) await new Promise((z) => setTimeout(z, 1200));
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTO}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let fecho = false;
const fecha = (codigo, motivo) => { if (fecho) return; fecho = true; try { ws.close(); } catch {} try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + motivo); process.exit(codigo); };
process.on('unhandledRejection', (e) => fecha(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => fecha(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => fecha(3, 'watchdog 260 s'), 260000);

let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((z) => setTimeout(z, 400)); }
const page = tg.find((t) => t.type === 'page'); if (!page) fecha(1, 'sem alvo page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => fecha(5, String(e.message || e).slice(0, 120)));
ws.onclose = () => { if (!fecho) fecha(4, 'ws fechado pelo chrome'); };
let seq = 0; const pend = new Map(); const consola = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) consola.push((m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 200));
  if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') consola.push('[rede] ' + String(m.params.entry.text || '').slice(0, 180));
};
const PRAZO = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq; const prazo = PRAZO(method);
  const t = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + Math.round(prazo / 1000) + ' s')); } }, prazo);
  pend.set(i, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(t); rej(e); }
});
const E = async (expression) => { const x = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (x.exceptionDetails) throw new Error('eval: ' + String(x.exceptionDetails.exception?.description || x.exceptionDetails.text).slice(0, 300)); return x.result?.value; };
const waitFor = async (expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(expr); } catch {} if (v) return Date.now() - t0; await new Promise((z) => setTimeout(z, 350)); } throw new Error('waitFor: ' + expr.slice(0, 90)); };
const dorme = (ms) => new Promise((z) => setTimeout(z, ms));
const toca = async (x, y) => { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };

// 4) navegação: emulação ANTES do navigate (como scripts/ah2-sonda-gaveta.mjs:97), e espera pelo
//    predicate do produtor — o módulo injeta num `tentar()` de vigília 250 ms até 30 s.
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTO, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
const msLogin = await waitFor("!!document.getElementById('loginScreen')", 60000);
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(SESSAO))})`);
await send('Page.navigate', { url: URL_APP });
const msReady = await waitFor("!!document.getElementById('appShell')?.classList.contains('ready')", 60000);
const msModulo = await waitFor('!!window.BFR_MUNICIPAL', 40000).catch(() => -1);
const msInject = await waitFor(`document.querySelectorAll('#appShell [data-bfr-municipal-nav]').length > 0`, 30000).catch(() => -1);
// A barra de baixo e a gaveta são construídas pelo módulo de apresentação responsiva DEPOIS do
// `appShell.ready`: a corrida 1 censou-as demasiado cedo e apanhou null (`#bfrMobileBottomNav` e
// `#bfrMobileDrawer` ainda não existiam), o que fez todos os portões do toque caírem de arrasto.
// Espera-se pelo predicate do produtor, não por um tempo meu.
const msChrome = await waitFor("!!document.getElementById('bfrMobileBottomNav') && !!document.getElementById('bfrMobileDrawer')", 25000).catch(() => -1);

// 5) o censo: o que o telemóvel mostra, onde a porta vive e o que está por cima de cada alvo
const CENSO = `(() => {
  const cx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { disp: cs.display, vis: cs.visibility, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const id = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');
  const dr = document.getElementById('bfrMobileDrawer');
  const mm = document.getElementById('mobileMoreMenu');
  const nav = document.getElementById('bfrMobileBottomNav');
  const mais = nav ? nav.querySelector('[data-bfr-mobile-route="more"]') : null;
  const item = dr ? dr.querySelector('[data-bfr-drawer-route="' + ${JSON.stringify(SECT)} + '"]') : null;
  const modalAberto = () => [...document.querySelectorAll('.modal')].find((x) => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight));
  return {
    gaveta: dr ? { el: id(dr), aberta: dr.classList.contains('is-open'), aria_hidden: dr.getAttribute('aria-hidden'), inert: !!dr.inert, ...cx(dr) } : null,
    gaveta_itens: dr ? [...dr.querySelectorAll('[data-bfr-drawer-route]')].map((x) => x.getAttribute('data-bfr-drawer-route')) : null,
    item_municipal: item ? { rota: item.getAttribute('data-bfr-drawer-route'), texto: (item.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 34), ...cx(item), centro: { x: Math.round(item.getBoundingClientRect().x + item.getBoundingClientRect().width / 2), y: Math.round(item.getBoundingClientRect().y + item.getBoundingClientRect().height / 2) } } : null,
    more_menu: mm ? { el: id(mm), escondida: mm.classList.contains('hidden'), disp: getComputedStyle(mm).display, n_itens: mm.querySelectorAll('.mobile-more-option').length, ...cx(mm) } : null,
    gatilho_mais: mais ? { ...cx(mais), centro: { x: Math.round(mais.getBoundingClientRect().x + mais.getBoundingClientRect().width / 2), y: Math.round(mais.getBoundingClientRect().y + mais.getBoundingClientRect().height / 2) } } : null,
    barra_rotas: nav ? [...nav.querySelectorAll('[data-bfr-mobile-route]')].map((x) => x.getAttribute('data-bfr-mobile-route')) : null,
    gatilho_more_menu: (() => { const b = document.querySelector('[data-mobile-more]'); return b ? cx(b) : null; })(),
    copia_na_gaveta: item ? !!item.querySelector('[data-bfr-municipal-nav]') : null,
    botoes_municipais: [...document.querySelectorAll('#appShell [data-bfr-municipal-nav]')].map((el) => { const p = el.parentElement; return { dentro: p ? id(p) : null, na_gaveta: !!el.closest('#bfrMobileDrawer'), no_more_menu: !!el.closest('#mobileMoreMenu'), munApto: el.dataset.munApto ?? null, disp: getComputedStyle(el).display, caixa: cx(el) }; }),
    n_botoes: document.querySelectorAll('#appShell [data-bfr-municipal-nav]').length,
    modal: (() => { const m = modalAberto(); if (!m) return { havido: false }; const f = m.querySelector('.modal-close'); const fcx = f ? cx(f) : null; return { havido: true, el: id(m), z: getComputedStyle(m).zIndex, tem_fecho: !!f, fecho: fcx, por_cima_do_gatilho_mais: (() => { const mais2 = document.querySelector('#bfrMobileBottomNav [data-bfr-mobile-route="more"]'); if (!mais2) return null; const r = mais2.getBoundingClientRect(); const e = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); return e ? id(e) : null; })() }; })(),
    apto_para_sessao: (window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.aptoParaSessao) ? window.BFR_MUNICIPAL.aptoParaSessao() : null,
    viewport: { w: innerWidth, h: innerHeight },
  };
})()`;

const med0 = await E(CENSO);
const passos = [{ o: 'estado_inicial', e: med0 }];

// 6) o modal de primeiro acesso: uma conta sem nome preferido abre `#preferredNameModal` (fixed, z=1300)
//    por cima de tudo e os toques na barra de baixo caem no `p.publish-status` do cartão. Fecha-se pelo
//    `.modal-close` DO modal — nunca pelo primeiro diálogo do documento (`section.lia-chat` vem antes no
//    DOM e não é um modal); foi o erro da corrida «a» da sonda de 20/11.
let estadoModal = { havido: false, fechado: null };
if (med0.modal.havido && med0.modal.fecho && med0.modal.fecho.w > 0) {
  await toca(med0.modal.fecho.centro_x ?? (med0.modal.fecho.x + Math.round(med0.modal.fecho.w / 2)), med0.modal.fecho.centro_y ?? (med0.modal.fecho.y + Math.round(med0.modal.fecho.h / 2)));
  const assentou = await waitFor('![...document.querySelectorAll(".modal")].some((x) => !x.classList.contains("hidden") && getComputedStyle(x).display !== "none" && (x.offsetWidth || x.offsetHeight))', 8000).then(() => true).catch(() => false);
  estadoModal = { havido: true, fechado: assentou, alvo: med0.modal.fecho };
  passos.push({ o: 'fechar_modal_a_toque', ...estadoModal, e: await E(CENSO) });
} else if (med0.modal.havido) {
  estadoModal = { havido: true, fechado: false, nota: 'modal aberto sem .modal-close com caixa — nada é tocado às cegas' };
  passos.push({ o: 'fechar_modal_a_toque', ...estadoModal });
}

// 7) um toque, e só um: o ah2-sonda-gaveta registou que touch+mouse no mesmo gesto dão DOIS clicks e o
//    toggle (`setMenu(!is-open)`) abria e fechava na mesma interacção — o instrumento media «a gaveta não
//    abre ao toque» quando era o próprio gesto.
const fresco = await E(CENSO);
passos.push({ o: 'antes_do_toque', e: fresco });
let abriu = false, emCima = null, alvo = null;
if (fresco.gatilho_mais && fresco.gatilho_mais.w > 0) {
  alvo = fresco.gatilho_mais.centro;
  emCima = await E(`(() => { const e = document.elementFromPoint(${alvo.x}, ${alvo.y}); return e ? e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : '') : null; })()`);
  await toca(alvo.x, alvo.y);
  abriu = await waitFor("document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')", 8000).then(() => true).catch(() => false);
  const apAssentada = await waitFor("(() => { const d = document.getElementById('bfrMobileDrawer'); return d.classList.contains('is-open') && getComputedStyle(d).visibility === 'visible'; })()", 8000).then(() => true).catch(() => false);
  const depois = await E(CENSO);
  // rolar como o utilizador: a gaveta tem 26+ itens e 720 px. `inline` fica a 'nearest' porque
  // 'center' empurrou o item para x negativo na corrida «d» da sonda — régua errada, não app.
  const itemRolado = await E(`(() => { const a = document.querySelector('#bfrMobileDrawer [data-bfr-drawer-route="' + ${JSON.stringify(SECT)} + '"]'); if (!a) return null; a.scrollIntoView({ block: 'center', inline: 'nearest' }); const r = a.getBoundingClientRect(); const e = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); return { caixa: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, dentro_do_ecra: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, no_alvo: !!(e && (e === a || a.contains(e))), em_cima: e ? e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : '') : null, rota_do_em_cima: e && e.closest ? (e.closest('[data-bfr-drawer-route]') ? e.closest('[data-bfr-drawer-route]').getAttribute('data-bfr-drawer-route') : null) : null }; })()`).catch(() => null);
  passos.push({ o: 'toque_no_mais', alvo, em_cima_antes_do_toque: emCima, abriu, gaveta_assentada: apAssentada, item_rolado: itemRolado, e: depois });
} else {
  passos.push({ o: 'toque_no_mais', nota: 'sem gatilho «mais» com caixa na barra de baixo', barra_rotas: fresco.barra_rotas });
}

// 8) portões — cada um com valor que pode divergir nos dois sentidos
const ult = passos[passos.length - 1].e || fresco;
const apto = !!(ult.apto_para_sessao && ult.apto_para_sessao.apto === true);
const emAberto = ult.botoes_municipais.filter((b) => b.disp !== 'none' && b.caixa && b.caixa.w > 0);
const portoes = [];
const g = (id, ok, estado) => { portoes.push({ id, ok: !!ok, estado }); if (!ok) falhas.push(id); };
const falhas = [];
g('a_pagina_assentou_na_largura_do_toque', !!(ult.viewport && ult.viewport.w === LARGURA && ult.viewport.h <= ALTO), { viewport: ult.viewport, largura: LARGURA, altura: ALTO });
g('o_ar_servido_e_o_esperado_v136', ESPERADO.htmlMd5 === md5Shell && ESPERADO.htmlBytes === Buffer.byteLength(shellTxt, 'utf8'), { medido_md5: md5Shell, medido_bytes: Buffer.byteLength(shellTxt, 'utf8'), esperado_md5: ESPERADO.htmlMd5, esperado_bytes: ESPERADO.htmlBytes });
g('o_modulo_injetou_as_copias_e_o_estado_e_lido', ult.n_botoes >= 1 && ult.botoes_municipais.every((b) => b.munApto === 'sim' || b.munApto === 'nao'), { n: ult.n_botoes, munApto: ult.botoes_municipais.map((b) => b.munApto) });
g('a_visibilidade_das_copias_bate_com_aptoParaSessao', ult.botoes_municipais.every((b) => (b.munApto === 'sim') === apto), { apto, copias: ult.botoes_municipais.map((b) => `${b.dentro}:${b.munApto}:${b.disp}`) });
g('o_modal_de_primeiro_acesso_nao_fica_por_fechar', estadoModal.havido ? estadoModal.fechado === true : true, estadoModal);
g('a_barra_e_a_gaveta_do_telemovel_foram_construidas', !!(ult.gaveta && ult.barra_rotas && ult.barra_rotas.length >= 1), { gaveta_existe: !!ult.gaveta, barra_rotas: ult.barra_rotas, espera_ms: msChrome });
g('a_barra_de_baixo_tem_o_gatilho_mais_tocavel', !!(ult.gatilho_mais && ult.gatilho_mais.w >= 44 && ult.gatilho_mais.h >= 44), { gatilho: ult.gatilho_mais, barra: ult.barra_rotas });
const passo = passos.find((p) => p.o === 'toque_no_mais');
g('um_toque_abre_a_gaveta', abriu === true && !!(passo && passo.gaveta_assentada), { abriu, assentada: passo ? passo.gaveta_assentada : null, em_cima: emCima, alvo });
g('a_gaveta_aberta_deixa_de_ser_inerte', !!(ult.gaveta && ult.gaveta.aberta && ult.gaveta.inert === false && ult.gaveta.aria_hidden === 'false'), { gaveta: ult.gaveta });
g('a_rota_municipal_na_gaveta_bate_com_aptoParaSessao', ((ult.gaveta_itens || []).includes(SECT)) === apto, { apto, tem_a_rota: (ult.gaveta_itens || []).includes(SECT), n_itens: (ult.gaveta_itens || []).length });
g('o_item_municipal_da_gaveta_e_tocavel', !!(passo && passo.item_rolado && passo.item_rolado.no_alvo === true && Math.min(passo.item_rolado.caixa.w, passo.item_rolado.caixa.h) >= 44 && passo.item_rolado.dentro_do_ecra === true), { item: passo ? passo.item_rolado : null });
g('nenhuma_copia_do_modulo_esta_na_superficie_do_toque', ult.botoes_municipais.every((b) => b.na_gaveta === false) && ult.copia_na_gaveta === false, { copias: ult.botoes_municipais.map((b) => ({ dentro: b.dentro, na_gaveta: b.na_gaveta })), copia_na_gaveta: ult.copia_na_gaveta });
g('as_copias_injetadas_estao_em_recipientes_fechados_a_esta_largura', emAberto.length === 0 && !!(ult.more_menu && ult.more_menu.escondida === true) && !!(ult.gatilho_more_menu && ult.gatilho_more_menu.w === 0), { em_aberto: emAberto.length, more_menu: ult.more_menu && { escondida: ult.more_menu.escondida, disp: ult.more_menu.disp }, gatilho_more_menu: ult.gatilho_more_menu });

const out = {
  programa: 'scripts/bu12-gaveta-municipal-toque.mjs', em: new Date().toISOString(),
  http: 'só GET ao ar + renovação de sessão com gravação do par rotacionado; 0 escrita na base, 0 DDL, 0 deploy',
  pergunta: `no ar publicado, a ${LARGURA}x${ALTO} com o papel ${PAPEL}: um toque real abre a gaveta do telemóvel, e a rota «${SECT}» está nela e é tocável?`,
  metodo: 'fetch do ar + md5 contra esperado-v136; Chrome headless via CDP; Emulation.setDeviceMetricsOverride {width:' + LARGURA + ',height:' + ALTO + ',deviceScaleFactor:2,mobile:true} ANTES do Page.navigate; esperas pelo predicate do produtor (window.BFR_MUNICIPAL e o botão injetado) e pelo estado da gaveta (is-open + visibility), não por cronómetro; toque = touchStart+touchEnd (nunca element.click, nunca touch+mouse no mesmo gesto); hit-test elementFromPoint por alvo, com rolagem block:center/inline:nearest.',
  servido: { url: URL_APP, md5: md5Shell, bytes: Buffer.byteLength(shellTxt, 'utf8'), esperado_md5: ESPERADO.htmlMd5, esperado_bytes: ESPERADO.htmlBytes, bate_com_esperado: ESPERADO.htmlMd5 === md5Shell && ESPERADO.htmlBytes === Buffer.byteLength(shellTxt, 'utf8') },
  sessao: { papel: PAPEL, registos_gravados: registos.length, rodou: antesHash !== h(jsAuth.refresh_token), expira_em: new Date(jsAuth.expires_at * 1000).toISOString(), access_len: String(jsAuth.access_token).length, refresh_len: String(jsAuth.refresh_token).length },
  tempos_ms: { login: msLogin, shell_ready: msReady, modulo: msModulo, inject: msInject, chrome_mobile: msChrome },
  passos, medido: ult, consola: consola.slice(0, 12),
  conclusao: {
    frase_que_esta_corrida_autoriza: abriu && (ult.gaveta_itens || []).includes(SECT) && passo && passo.item_rolado && passo.item_rolado.no_alvo
      ? `a ${LARGURA}px com ${PAPEL}: um toque em «Mais» abriu ${ult.gaveta.el} (${(ult.gaveta_itens || []).length} rotas) e a rota «${SECT}» está lá, caixa ${passo.item_rolado.caixa.w}x${passo.item_rolado.caixa.h} dentro do ecrã, com o toque no centro a cair dentro do próprio item; as ${ult.n_botoes} cópias injetadas pelo módulo (munApto=${JSON.stringify(ult.botoes_municipais.map((b) => b.munApto))}) continuam em recipientes fechados a esta largura — a superfície do telemóvel é a gaveta, não o sidebar nem o #mobileMoreMenu`
      : `a ${LARGURA}px com ${PAPEL}: ${abriu ? 'a gaveta abriu mas a rota/Régua não bateu' : 'a gaveta NÃO abriu ao toque'} — ver passos, em_cima=${JSON.stringify(emCima)}, apto=${apto}, rota_na_gaveta=${(ult.gaveta_itens || []).includes(SECT)}`,
    o_que_nao_prova: 'não prova o que acontece depois do toque no item (o painel que a rota «' + SECT + '" mostra está fora desta corrida); não prova outras larguras de toque (430, 320) nem outros papéis não corridos; e o fecho do modal é medido apenas quando o modal aparece — contas antigas sem #preferredNameModal correm o portão do modal pelo ramo «não havido».',
  },
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `BU12_GAVETA_MUNICIPAL_VERDE ${portoes.length}/0` : `BU12_GAVETA_MUNICIPAL_VERMELHO ${falhas.length} de ${portoes.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`BU12_VERMELHO · registo ${p}`); fecha(1, 'vermelho gravado'); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(out.veredito);
console.log('conclusao: ' + out.conclusao.frase_que_esta_corrida_autoriza);
fecha(0, 'ok gravado');
