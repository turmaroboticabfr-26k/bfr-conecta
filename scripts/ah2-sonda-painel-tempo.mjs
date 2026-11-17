// Mesma prédica da sonda de apoio, mas com a rota e o painel por parâmetro: §AI.24 ponto 4 deixou as 6
// células `chat-interno@education_supervisor` «sob a mesma dúvida» e disse que a sonda que fecha isso é a
// mesma com o id parametrizado — este ficheiro é essa sonda, para não editar a que produziu os artefactos
// já assinados (comparabilidade). O `painel` lê-se do artefacto da grelha, nunca se adivinha.
// Uso: node scripts/ah2-sonda-painel-tempo.mjs <papel> <largura> <rotulo> <rota> <id_do_painel>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PAPEL = process.argv[2] || 'education_supervisor';
const LARGURA = parseInt(process.argv[3] || '390', 10);
const ROTULO = process.argv[4] || 'v1';
const ROTA = process.argv[5] || 'apoio';
const PAINEL = process.argv[6] || 'supportView';
const AMOSTRAS = parseInt(process.env.AH2_AMOSTRAS || '50', 10);
const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = parseInt(process.env.AH2_PORT || '9461', 10);
const ALTURA = 720;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-painel-tempo-${ROTULO}.json`;
const PERFIL = `${DIR}/.ah2painel-${ROTULO}-${PORT}`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessao-${PAPEL}.json`, 'utf8'));
const sessao = S[PAPEL] || S;
if (!sessao?.access_token) throw new Error('ABORTA: sem sessão guardada para ' + PAPEL);
const SHELL = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = createHash('md5').update(SHELL).digest('hex');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); grava(c); };
let saida = { ciclo: 'AH-PAINEL-TEMPO', em: new Date().toISOString(), papel: PAPEL, largura: LARGURA, rota: ROTA, painel: PAINEL, md5_shell: null, toque: null, serie: [], erros_janela: [], consola: [], veredito: null };
function grava(codigo) {
  try { saida.em_fim = new Date().toISOString(); writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); console.log('ESCRITO: ' + OUT.split('/').pop()); } catch {}
  process.exit(codigo);
}
setTimeout(() => abort(3, 'teto 180 s'), 180000);
let tg = [];
for (let i = 0; i < 80; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await dorme(400); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) saida.consola.push((m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 240));
  if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') saida.consola.push('[log] ' + String(m.params.entry.text || '').slice(0, 240));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await dorme(350); } throw new Error('waitFor: ' + e.slice(0, 90)); };
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000).catch(() => {});
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
saida.ms_ready = await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 70000).catch(() => null);
saida.md5_shell = MD5;
if ((await E(`window.BFR_CURRENT_PROFILE?.role ?? null`)) !== PAPEL) { await E(`window.BFR_APP_RUNTIME?.setRole(${JSON.stringify(PAPEL)})`); await dorme(900); }
await E(`window.__sonda = { erros: [], rede: [] };
  window.addEventListener('error', e => window.__sonda.erros.push('error: ' + (e.message || '?') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', e => window.__sonda.erros.push('rejeicao: ' + String(e.reason && (e.reason.message || e.reason) || '?').slice(0, 200)));
  const f = window.fetch; window.fetch = async (...a) => { const u = String(a[0] && a[0].url || a[0]); const t0 = performance.now(); try { const r = await f(...a); window.__sonda.rede.push({ u: u.slice(0, 90), st: r.status, ms: Math.round(performance.now() - t0) }); if (!r.ok) { const c = r.clone(); c.text().then(x => { const l = window.__sonda.rede[window.__sonda.rede.length - 1]; if (l && l.u === u.slice(0, 90)) l.corpo = String(x).slice(0, 160); }).catch(() => {}); } return r; } catch (e) { window.__sonda.rede.push({ u: u.slice(0, 90), erro: String(e.message || e).slice(0, 120) }); throw e; } };
  'ok'`);
const ID = JSON.stringify(PAINEL);
const ONDE = `(document.getElementById(${ID}) ? (() => { const e = document.getElementById(${ID}); return { existe: true, oculto: e.classList.contains('hidden'), classes: e.className, c: (e.innerText || '').trim().length, html: e.outerHTML.length }; })() : { existe: false })`;
saida.antes = await E(ONDE);
const RET = (sel) => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null;
  const cs = getComputedStyle(b);
  if (!(b.offsetWidth || b.offsetHeight) || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || cs.display === 'none') return { invisivel: true };
  b.scrollIntoView({ block: 'center', inline: 'center' });
  const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);
  if (!r.width || !r.height) return { invisivel: true };
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { fora_do_ecra: { x, y } };
  const topo = document.elementFromPoint(x, y);
  if (!(topo === b || b.contains(topo))) return { tapado: true };
  return { x, y }; })()`;
const selBarra = `#bfrMobileBottomNav [data-bfr-mobile-route="${ROTA}"]`;
const selGaveta = `#bfrMobileDrawer [data-bfr-drawer-route="${ROTA}"]`;
const selSidebar = `#appShell [data-section="${ROTA}"]`;
const CENSO = `(() => { const cx = (n, sel) => { const b = n && n.querySelector(sel); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), display: getComputedStyle(b).display }; };
  const d = (sel, attr, alvoSel) => { const n = document.querySelector(sel); return { existe: !!n, classes: n ? n.className : null, rotas: n ? Array.from(n.querySelectorAll('[' + attr + ']')).map(x => x.getAttribute(attr)) : [], alvo: cx(n, alvoSel) }; };
  return { barra: d('#bfrMobileBottomNav', 'data-bfr-mobile-route', ${JSON.stringify(selBarra)}), gaveta: d('#bfrMobileDrawer', 'data-bfr-drawer-route', ${JSON.stringify(selGaveta)}), sidebar: (() => { const b = document.querySelector(${JSON.stringify(selSidebar)}); if (!b) return { existe: false }; const r = b.getBoundingClientRect(); return { existe: true, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), display: getComputedStyle(b).display, hidden: b.classList.contains('hidden') }; })() }; })()`;
const toque_em = async (sel) => {
  const r = await E(RET(sel));
  if (!r || r.x == null) return { alvo: r };
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await dorme(650);
  return { alvo: r, tocado: true };
};
saida.ms_barra = await waitFor("!!document.getElementById('bfrMobileBottomNav')", 30000).catch(() => null);
const modal = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? { id: m.id || null, texto: (m.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 60) } : null; })()`);
saida.modal = modal;
if (modal?.id) {
  saida.modal_fechado_a_toque = await E(`(() => { const b = document.querySelector(${JSON.stringify('#' + modal.id + ' .modal-close')}); if (!b) return 'sem .modal-close'; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }); })()`);
  if (saida.modal_fechado_a_toque && saida.modal_fechado_a_toque.startsWith('{')) {
    const p = JSON.parse(saida.modal_fechado_a_toque);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await dorme(700);
    saida.modal_agora = await E(`(() => { const m = document.getElementById(${JSON.stringify(modal.id)}); return m ? { oculto: m.classList.contains('hidden'), display: getComputedStyle(m).display } : 'removido'; })()`);
  }
}
let aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
saida.gaveta = { ja_aberta_antes: aberta };
if (!aberta) {
  const tem_mais = await E(`!!document.querySelector('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]')`);
  const sel = tem_mais ? '#bfrMobileBottomNav button[data-bfr-mobile-route="more"]' : '[data-bfr-open-drawer]';
  saida.gaveta.tentativa = { sel, ...(await toque_em(sel)) };
  if (saida.gaveta.tentativa.alvo && saida.gaveta.tentativa.alvo.tapado) {
    saida.gaveta.em_cima = await E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const e = document.elementFromPoint(x, y); const pilha = []; let n = e; for (let i = 0; i < 7 && n; i++) { const c = getComputedStyle(n); pilha.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + ' z' + (c.zIndex || 'auto') + ' pe' + c.pointerEvents); n = n.parentElement; } return { x, y, pilha }; })()`);
  }
  aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
}
saida.gaveta.aberta = aberta;
saida.ms_item_na_gaveta = aberta ? await waitFor(`!!document.querySelector(${JSON.stringify(selGaveta)})`, 20000).catch(() => null) : null;
saida.censo_antes_do_toque = await E(CENSO);
const tentativas = [];
const inutil = (r) => !r || r.invisivel || r.fora_do_ecra || r.tapado;
let alvo = null, por = null;
for (const [nome, sel] of [['gaveta', selGaveta], ['barra', selBarra], ['sidebar', selSidebar]]) {
  alvo = await E(RET(sel)); por = nome;
  tentativas.push({ por: nome, alvo });
  if (!inutil(alvo)) break;
}
saida.toque = { por, alvo, censo_apos_tentativas: await E(CENSO) };
saida.tentativas = tentativas;
if (inutil(alvo)) { saida.veredito = `não consegui tocar em ${ROTA} por nenhum dos caminhos: ` + tentativas.map((t) => t.por + '=' + JSON.stringify(t.alvo)).join(' · '); grava(2); }
const t_toque = Date.now();
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: alvo.x, y: alvo.y }] });
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
for (let i = 0; i < AMOSTRAS; i++) {
  await dorme(500);
  const s = await E(`(() => { const e = document.getElementById(${ID}); const vis = (n) => { if (!n) return false; const c = getComputedStyle(n); const r = n.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 50 && r.height > 40; };
    return { c: e ? (e.innerText || '').trim().length : null, html: e ? e.outerHTML.length : null, oculto: e ? e.classList.contains('hidden') : null, visivel: vis(e), ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, n_filhos: e ? e.children.length : null, c_total_pagina: (document.body.innerText || '').trim().length }; })()`);
  s.t_ms_apos_toque = Date.now() - t_toque;
  saida.serie.push(s);
  if (i > 6 && s.c && s.c > 0) break;
}
saida.erros_janela = await E('window.__sonda ? window.__sonda.erros.slice(0, 20) : null');
saida.rede_janela = await E('window.__sonda ? window.__sonda.rede.slice(0, 40) : null');
saida.painel_maior = await E(`(() => { let m = null, mc = -1; for (const e of Array.from(document.querySelectorAll('[id$="View"], [id$="Panel"], section, main'))) { if (!e.id) continue; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); if (c.display === 'none' || c.visibility === 'hidden' || r.width < 50 || r.height < 40) continue; const n = (e.innerText || '').trim().length; if (n > mc) { mc = n; m = e.id; } } return { id: m, c: mc }; })()`);
const primeiro = saida.serie.find((s) => s.c > 0);
saida.veredito = primeiro
  ? `o painel ${PAINEL} ENCHE: ${primeiro.c} caracteres aos ${primeiro.t_ms_apos_toque} ms do toque em ${ROTA} — um 0 medido pela varredura é a janela de assentamento do instrumento, não uma porta fechada`
  : (saida.erros_janela || []).length
    ? `o painel ${PAINEL} permanece a 0 caracteres durante ${AMOSTRAS * 0.5} s e a janela regista exceção: ${JSON.stringify(saida.erros_janela.slice(0, 3))}`
    : `o painel ${PAINEL} permanece a 0 caracteres durante ${AMOSTRAS * 0.5} s SEM exceção lançada — não é tempo e não é erro: é o render a não produzir conteúdo para este papel`;
grava(0);
