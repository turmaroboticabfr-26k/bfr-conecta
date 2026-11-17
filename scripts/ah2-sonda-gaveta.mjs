// A gaveta mobile não abriu ao toque (ah2-mobile2-calib: «a gaveta abre com um toque real» = false, nas
// duas larguras), mas o handler existe (bfr-responsive-presentation.js:515 trata route==='more' com
// setMenu(toggle)). Antes de chamar isto de defeito da app, é preciso saber se o clique chegou ao
// document: instalo um listener de bolha, disparo o botão de três maneiras (toque sintético no centro do
// retângulo, element.click(), e o hamburger do cabeçalho) e leio o estado real da gaveta depois de cada
// um — classList, aria-hidden, inert e a caixa do painel. Só-leitura no ar.
// Uso: node scripts/ah2-sonda-gaveta.mjs <papel> <largura>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';

const PAPEL = process.argv[2] || 'coordinator';
const W = parseInt(process.argv[3] || '390', 10);
const ROT = process.argv[4] || String(W);
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2sg-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-gaveta-${ROT}.json`;
const ALTURA = 720;
const PORT = 9362;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL, { recursive: true });
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const renova = async () => {
  let ultimo = null;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
      const js = await r.json().catch(() => null);
      if (!r.ok || !js?.access_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(js).slice(0, 120)}`);
      S[PAPEL] = { ...S[PAPEL], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
      writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) { ultimo = String(e.message || e).slice(0, 140); if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada — ' + ultimo); await new Promise((z) => setTimeout(z, 1500 * (t + 1))); }
  }
  throw new Error('renova esgotou: ' + ultimo);
};
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${W},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 200 s'), 200000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (!m.id || !pend.has(m.id)) return; const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
// Modo escolhido por linha: 'toque' = só touchStart/touchEnd (o browser sintetiza UM click); 'duplo' =
// touch + mouse, que é o que o instrumento fazia e que dá DOIS clicks por pressão — num botão toggle como
// o «Mais» (bfr-responsive-presentation.js:515 faz setMenu(!is-open)) abre e fecha na mesma interacção.
// É o MEDIDOR que estava errado; a comparação dos dois modos é o portão.
const toca_duplo = async (x, y) => {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
const toca_toque = async (x, y) => {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const toca_mouse = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
const zera = () => E(`window.__SG = []; true`);
const conta = (a) => (a.clicks_vistos || []).length;
// O resto do script usa o modo limpo: um toque, um click.
const toca = toca_toque;

const ESTADO = `(() => {
  const dr = document.getElementById('bfrMobileDrawer'); const nav = document.getElementById('bfrMobileBottomNav');
  const mais = nav?.querySelector('[data-bfr-mobile-route="more"]'); const hamb = document.querySelector('[data-bfr-open-drawer]');
  const cx = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { cls: (e.className || '').slice(0, 60), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), disp: cs.display, vis: cs.visibility, pe: cs.pointerEvents, z: cs.zIndex, inert: !!e.inert, aria: e.getAttribute('aria-hidden') }; };
  const centro = mais ? { x: Math.round(mais.getBoundingClientRect().x + mais.getBoundingClientRect().width / 2), y: Math.round(mais.getBoundingClientRect().y + mais.getBoundingClientRect().height / 2) } : null;
  const em_cima = centro ? document.elementFromPoint(centro.x, centro.y) : null;
  return { drawer: cx(dr), mais: cx(mais), mais_centro: centro, mais_em_cima: em_cima ? (em_cima.tagName.toLowerCase() + (em_cima.className && typeof em_cima.className === 'string' ? '.' + em_cima.className.trim().split(/\\s+/).slice(0, 3).join('.') : '')) : null, hamb: cx(hamb), clicks_vistos: (window.__SG || []).slice(-6), body_open: document.body.classList.contains('bfr-mobile-drawer-open') };
})()`;

const out = { ciclo: 'AH-7b-SONDA-GAVETA', em: new Date().toISOString(), papel: PAPEL, largura: W, altura: ALTURA, passos: [] };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 70000);
await E(`new Promise(r => setTimeout(r, 1500))`);
// registo de cliques no mesmo sítio onde a app ouve (document, fase de bolha): se o meu toque não aparece
// aqui, o problema é do disparo; se aparece e a gaveta não abre, o handler é que não chegou ao 'more'.
await E(`window.__SG = []; document.addEventListener('click', (e) => { const t = e.target; window.__SG.push((t.tagName || '?').toLowerCase() + '.' + String(t.className || '').split(/\\s+/)[0] + '|more=' + !!(t.closest && t.closest('[data-bfr-mobile-route=\\"more\\"]')) + '|hamb=' + !!(t.closest && t.closest('[data-bfr-open-drawer]'))); }, true); true`);
out.passos.push({ o: 'estado_inicial', e: await E(ESTADO) });
// Fechar o modal de primeiro acesso, como faria um dedo: enquanto ele está por cima (z=1300 vs 1200 da
// barra), nenhum toque chega ao «Mais». Só depois desta linha a pergunta «a gaveta abre ao toque?» é limpa.
const rm = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); if (!m || !m.id) return null; const b = m.querySelector('.modal-close'); if (!b) return null; const r = b.getBoundingClientRect(); return { id: m.id, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
if (rm) { await toca(rm.x, rm.y); await dorme(700); out.passos.push({ o: 'fechar_modal_a_toque', alvo: rm, e: await E(ESTADO) }); }
else out.passos.push({ o: 'fechar_modal_a_toque', alvo: null, e: await E(ESTADO) });
for (const [modo, fn] of [['duplo touch+mouse (como estava)', toca_duplo], ['só toque', toca_toque], ['só mouse', toca_mouse]]) {
  // cada tentativa parte da gaveta FECHADA e do contador a zero, senão o toggle do modo anterior contamina
  await E(`(() => { const d = document.getElementById('bfrMobileDrawer'); if (d?.classList.contains('is-open')) document.querySelector('[data-bfr-close-drawer]')?.click(); return !d?.classList.contains('is-open'); })()`);
  await dorme(400); await zera();
  const r = await E(`(() => { const b = document.querySelector('#bfrMobileBottomNav [data-bfr-mobile-route="more"]'); if (!b) return null; const q = b.getBoundingClientRect(); return { x: Math.round(q.x + q.width / 2), y: Math.round(q.y + q.height / 2) }; })()`);
  if (!r) { out.passos.push({ o: modo, alvo: null, e: await E(ESTADO) }); continue; }
  await fn(r.x, r.y);
  await dorme(600);
  const e = await E(ESTADO);
  out.passos.push({ o: modo, alvo: r, e });
  console.log(`${modo}: gaveta_aberta=${e.drawer.cls.includes('is-open')} clicks_por_toque=${conta(e)} alvos=${JSON.stringify(e.clicks_vistos)}`);
}
const r1 = await E(`(() => { const b = document.querySelector('#bfrMobileBottomNav [data-bfr-mobile-route="more"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
if (r1) { await toca(r1.x, r1.y); await dorme(600); out.passos.push({ o: 'toque_no_mais', alvo: r1, e: await E(ESTADO) }); }
const r2 = await E(`(() => { const b = document.querySelector('#bfrMobileBottomNav [data-bfr-mobile-route="more"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
if (r2) { await toca(r2.x, r2.y); await dorme(600); out.passos.push({ o: 'toque_no_mais_2a_vez_toggle', alvo: r2, e: await E(ESTADO) }); }
if (r1) { await E(`document.querySelector('#bfrMobileBottomNav [data-bfr-mobile-route="more"]').click(); true`); await dorme(600); out.passos.push({ o: 'element_click_no_mais', e: await E(ESTADO) }); }
const rh = await E(`(() => { const b = document.querySelector('[data-bfr-open-drawer]'); if (!b || !(b.offsetWidth || b.offsetHeight)) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
if (rh) { await toca(rh.x, rh.y); await dorme(600); out.passos.push({ o: 'toque_no_hamburguer', alvo: rh, e: await E(ESTADO) }); }
else out.passos.push({ o: 'toque_no_hamburguer', e: { sem_caixa: await E(`(() => { const h = document.querySelector('[data-bfr-open-drawer]'); return h ? { w: h.offsetWidth, h: h.offsetHeight, disp: getComputedStyle(h).display, pai: h.parentElement?.className } : null; })()`) } });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.passos) console.log(p.o + ': ' + JSON.stringify({ aberta: p.e.drawer?.cls.includes('is-open'), drawer: p.e.drawer && { w: p.e.drawer.w, vis: p.e.drawer.vis, pe: p.e.drawer.pe, inert: p.e.drawer.inert }, mais: p.e.mais && { w: p.e.mais.w, h: p.e.mais.h, y: p.e.mais.y, disp: p.e.mais.disp }, em_cima: p.e.mais_em_cima, clicks: p.e.clicks_vistos, body_open: p.e.body_open, hamb: p.e.hamb && { w: p.e.hamb.w, disp: p.e.hamb.disp } }));
console.log('AH7B_SONDA_GAVETA · ' + OUT.split('/').pop());
fecho = true;
abort(0, 'fecho normal');
