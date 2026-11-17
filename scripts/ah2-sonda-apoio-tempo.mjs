// Porque este programa existe: o «Espaço de Apoio» saiu com 0 caracteres em developer/secretary em TODAS as
// seis larguras, mas NÃO é regra de papel — a tabela lida do disco (scripts/ah2-m5-apoio-tabela.mjs) mostra
// `supportView` com 3001 c no `aee` (que é staff) e 2791 c no `student`, e o `student` a 320 px com 0. A
// hipótese da base já foi falsificada (`ah2-sonda-apoio-razao.mjs`: 0 linhas com `reason IS NULL`), e a
// hipótese «o papel não tem direito» cai com o `aee`. O que separa as duas explicações que ficam é o TEMPO:
// `openSupport()` des-esconde a vista e o `render()` escreve depois, portanto um 0 medido pode ser «ainda
// não chegou» em vez de «nunca chega». Este programa mede isso explicitamente: toca `apoio` UMA vez e amostra
// `#supportView` a cada 500 ms durante 25 s, com os coletores de exceção montados ANTES do toque, e grava a
// série. Não escreve em base, não faz DDL, não publica.
// Uso: node scripts/ah2-sonda-apoio-tempo.mjs <papel> [largura=390] [rotulo=v1]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PAPEL = process.argv[2] || 'secretary';
const LARGURA = parseInt(process.argv[3] || '390', 10);
const ROTULO = process.argv[4] || 'v1';
const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = parseInt(process.env.AH2_PORT || '9451', 10);
const ALTURA = 720;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-apoio-tempo-${ROTULO}.json`;
const PERFIL = `${DIR}/.ah2apoio-${ROTULO}-${PORT}`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessao-${PAPEL}.json`, 'utf8'));
const sessao = S[PAPEL] || S;
if (!sessao?.access_token) throw new Error('ABORTA: sem sessão guardada para ' + PAPEL);
// As bytes servidas identificam a versão medida (a mesma coluna `md5_shell` dos artefactos da grelha); a
// chave anónima não é preciso lê-la aqui, porque esta sonda não fala com a base — fala com o browser.
const SHELL = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = createHash('md5').update(SHELL).digest('hex');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); grava(c); };
let saida = { ciclo: 'AH-M5-APOIO-TEMPO', em: new Date().toISOString(), papel: PAPEL, largura: LARGURA, md5_shell: null, toque: null, serie: [], erros_janela: [], consola: [], veredito: null };
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
// Coletores montados ANTES do toque: uma exceção dentro de render() não pode escapar à medição.
await E(`window.__apoio = { erros: [], rede: [] };
  window.addEventListener('error', e => window.__apoio.erros.push('error: ' + (e.message || '?') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', e => window.__apoio.erros.push('rejeicao: ' + String(e.reason && (e.reason.message || e.reason) || '?').slice(0, 200)));
  const f = window.fetch; window.fetch = async (...a) => { const u = String(a[0] && a[0].url || a[0]); const t0 = performance.now(); try { const r = await f(...a); window.__apoio.rede.push({ u: u.slice(0, 90), st: r.status, ms: Math.round(performance.now() - t0) }); if (!r.ok) { const c = r.clone(); c.text().then(x => { const l = window.__apoio.rede[window.__apoio.rede.length - 1]; if (l && l.u === u.slice(0, 90)) l.corpo = String(x).slice(0, 160); }).catch(() => {}); } return r; } catch (e) { window.__apoio.rede.push({ u: u.slice(0, 90), erro: String(e.message || e).slice(0, 120) }); throw e; } };
  'ok'`);
const ONDE = `(document.getElementById('supportView') ? (() => { const e = document.getElementById('supportView'); return { existe: true, oculto: e.classList.contains('hidden'), classes: e.className, c: (e.innerText || '').trim().length, html: e.outerHTML.length }; })() : { existe: false })`;
saida.antes = await E(ONDE);
// Onde se toca: o mesmo alvo que o instrumento usa. Se o item da sidebar não for tocável, abre-se a gaveta.
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
// O censo do chrome mobile, tirado NO INSTANTE do toque: a primeira versão desta sonda devolvia
// «nenhum dos três caminhos» sem dizer PORQUÊ, e isso não fecha o #33 — só muda de pergunta. `apoio` pode
// não estar na barra (que só leva as quickRoutes), pode estar na gaveta sem ela estar montada, ou estar lá
// com caixa zero. As três listas separam-se aqui.
const CENSO = `(() => { const d = (sel, attr) => { const n = document.querySelector(sel); return { existe: !!n, classes: n ? n.className : null, rotas: n ? Array.from(n.querySelectorAll('[' + attr + ']')).map(x => x.getAttribute(attr)) : [], apoio: (() => { const b = n && n.querySelector('[' + attr + '="' + 'apoio' + '"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), display: getComputedStyle(b).display }; })() }; };
  return { barra: d('#bfrMobileBottomNav', 'data-bfr-mobile-route'), gaveta: d('#bfrMobileDrawer', 'data-bfr-drawer-route'), sidebar: (() => { const b = document.querySelector('#appShell [data-section="apoio"]'); if (!b) return { existe: false }; const r = b.getBoundingClientRect(); return { existe: true, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), display: getComputedStyle(b).display, hidden: b.classList.contains('hidden') }; })() }; })()`;
// O chrome mobile NÃO existe nas bytes servidas e ainda não está montado quando `#appShell.ready` aparece:
// a primeira versão desta sonda censurava aos 784 ms do ready, não encontrava nem barra nem gaveta, e o
// veredicto era «não consegui tocar» — que é buraco do instrumento, não resposta ao #33. `createNav()` e o
// `drawer.innerHTML` correm depois do ready, por isso aqui se espera pela barra, abre-se a gaveta A TOQUE
// (o botão «Mais», como no instrumento — nunca por classe, que era o caminho que falsificava o gesto) e só
// então se procura o item `apoio`.
const toque_em = async (sel) => {
  const r = await E(RET(sel));
  if (!r || r.x == null) return { alvo: r };
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await dorme(650);
  return { alvo: r, tocado: true };
};
saida.ms_barra = await waitFor("!!document.getElementById('bfrMobileBottomNav')", 30000).catch(() => null);
// O modal de primeiro acesso COBRE a barra: no instrumento ele é fechado antes do censo
// (`ah2-mobile2.mjs:262-269`) e aqui esse passo faltava — o «Mais» saía `tapado`, a gaveta não abria e o
// `apoio` não aparecia na lista. Fecha-se pelo `.modal-close` do próprio modal, a toque, e fica registado.
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
    // Quem está em cima do «Mais»: a causa tinha de ser medida, não assumida como modal.
    saida.gaveta.em_cima = await E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const e = document.elementFromPoint(x, y); const pilha = []; let n = e; for (let i = 0; i < 7 && n; i++) { const c = getComputedStyle(n); pilha.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + ' z' + (c.zIndex || 'auto') + ' pe' + c.pointerEvents); n = n.parentElement; } return { x, y, pilha }; })()`);
  }
  aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
}
saida.gaveta.aberta = aberta;
saida.ms_item_apoio_na_gaveta = aberta ? await waitFor(`!!document.querySelector('#bfrMobileDrawer [data-bfr-drawer-route="apoio"]')`, 20000).catch(() => null) : null;
saida.censo_antes_do_toque = await E(CENSO);
const tentativas = [];
const inutil = (r) => !r || r.invisivel || r.fora_do_ecra || r.tapado;
let alvo = null, por = null;
for (const [nome, sel] of [['gaveta', '#bfrMobileDrawer [data-bfr-drawer-route="apoio"]'], ['barra', '#bfrMobileBottomNav [data-bfr-mobile-route="apoio"]'], ['sidebar', '#appShell [data-section="apoio"]']]) {
  alvo = await E(RET(sel)); por = nome;
  tentativas.push({ por: nome, alvo });
  if (!inutil(alvo)) break;
}
saida.toque = { por, alvo, censo_apos_tentativas: await E(CENSO) };
saida.tentativas = tentativas;
if (inutil(alvo)) { saida.veredito = 'não consegui tocar em apoio por nenhum dos caminhos: ' + tentativas.map((t) => t.por + '=' + JSON.stringify(t.alvo)).join(' · '); grava(2); }
const t_toque = Date.now();
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: alvo.x, y: alvo.y }] });
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
for (let i = 0; i < 50; i++) {
  await dorme(500);
  const s = await E(`(() => { const e = document.getElementById('supportView'); const vis = (n) => { if (!n) return false; const c = getComputedStyle(n); const r = n.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 50 && r.height > 40; };
    return { c: e ? (e.innerText || '').trim().length : null, html: e ? e.outerHTML.length : null, oculto: e ? e.classList.contains('hidden') : null, visivel: vis(e), ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, n_filhos: e ? e.children.length : null }; })()`);
  // O relógio é o do processo: a página e o node estão na mesma máquina, e misturar os dois dava uma
  // série com `t` a contar duas vezes.
  s.t_ms_apos_toque = Date.now() - t_toque;
  saida.serie.push(s);
  if (i > 6 && s.c && s.c > 0) break;
}
saida.erros_janela = await E('window.__apoio ? window.__apoio.erros.slice(0, 20) : null');
saida.rede_janela = await E('window.__apoio ? window.__apoio.rede.slice(0, 40) : null');
saida.painel_maior = await E(`(() => { let m = null, mc = -1; for (const e of Array.from(document.querySelectorAll('[id$="View"], [id$="Panel"], section, main'))) { if (!e.id) continue; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); if (c.display === 'none' || c.visibility === 'hidden' || r.width < 50 || r.height < 40) continue; const n = (e.innerText || '').trim().length; if (n > mc) { mc = n; m = e.id; } } return { id: m, c: mc }; })()`);
const primeiro = saida.serie.find((s) => s.c > 0);
saida.veredito = primeiro
  ? `o painel ENCHE: ${primeiro.c} caracteres aos ${primeiro.t_ms_apos_toque} ms do toque — um 0 medido pela varredura é a janela de assentamento do instrumento, não uma porta fechada`
  : (saida.erros_janela || []).length
    ? `o painel permanece a 0 caracteres durante 25 s e a janela regista exceção: ${JSON.stringify(saida.erros_janela.slice(0, 3))}`
    : 'o painel permanece a 0 caracteres durante 25 s SEM exceção lançada — não é tempo e não é erro: é o render a não produzir conteúdo para este papel';
grava(0);
