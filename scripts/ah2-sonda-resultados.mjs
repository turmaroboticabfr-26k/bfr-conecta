// AH-7b-SONDA-RESULTADOS — no calib3, depois do toque em «resultados-aprendizagem» as 6 rotas seguintes
// não mudaram nada: `ativa` ficou resultados-aprendizagem e o painel medido foi sempre resultsLearningView.
// Há duas leituras possíveis e só uma é defeito da app: (1) a vista prende a navegação e o telemóvel fica
// preso nela; (2) a vista tapa a gaveta (z-index) e existe um «voltar» próprio que o meu instrumento não
// apertou. Este programa entra na vista A TOQUE, não por JS, e descreve o que está por cima de tudo, o que
// a vista oferece para sair e o que acontece quando se aperta isso. Só-leitura no ar.
// Uso: node scripts/ah2-sonda-resultados.mjs <papel> <largura> <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const W = parseInt(process.argv[3] || '390', 10);
const ROT = process.argv[4] || 'r1';
const ROTA = process.argv[5] || 'resultados-aprendizagem';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2sr-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-resultados-${ROT}.json`;
const ALTURA = 720;
const PORT = 9364;
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
setTimeout(() => abort(3, 'watchdog 240 s'), 240000);
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
const toca = async (x, y) => { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };

const CENARIO = `(() => {
  const nome = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  const visiveis = Array.from(document.querySelectorAll('#appShell .content, #appShell section')).filter(e => !e.classList.contains('hidden') && (e.offsetWidth || e.offsetHeight) && getComputedStyle(e).display !== 'none').map(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { el: nome(e).slice(0, 46), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), z: c.zIndex, pos: c.position }; });
  const topo_meio = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
  const gaveta = document.getElementById('bfrMobileDrawer');
  const alvo = document.querySelector('#bfrMobileBottomNav [data-bfr-mobile-route="more"]');
  const r_alvo = alvo ? alvo.getBoundingClientRect() : null;
  const em_cima_do_mais = r_alvo ? document.elementFromPoint(Math.round(r_alvo.x + r_alvo.width / 2), Math.round(r_alvo.y + r_alvo.height / 2)) : null;
  return { ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, vista: window.BFR_APP_RUNTIME?.activeView ?? null, visiveis: visiveis.slice(0, 8), topo_meio: nome(topo_meio || document.body), gaveta: { classes: (gaveta?.className || '').slice(0, 40), z: gaveta ? getComputedStyle(gaveta).zIndex : null, vis: gaveta ? getComputedStyle(gaveta).visibility : null, pe: gaveta ? getComputedStyle(gaveta).pointerEvents : null, inert: gaveta ? !!gaveta.inert : null }, em_cima_do_mais: nome(em_cima_do_mais || document.body), escroll_y: Math.round(scrollY), botoes_da_vista: (() => { const v = document.querySelector('#appShell .content:not(.hidden)'); if (!v) return []; return Array.from(v.querySelectorAll('button')).slice(0, 14).map(b => { const r = b.getBoundingClientRect(); return { txt: (b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24), aria: b.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; }); })() };
})()`;
const RET = (sel) => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; const r = b.getBoundingClientRect(); if (!r.width || !r.height) return { invisivel: true }; return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`;

const out = { ciclo: 'AH-7b-SONDA-RESULTADOS', em: new Date().toISOString(), papel: PAPEL, largura: W, rota: ROTA, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), passos: [] };
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
out.passos.push({ o: 'boot', e: await E(CENARIO) });
// fechar o modal de primeiro acesso (senão nada é tocável) — toque no × do próprio modal
const rm = await E(RET('.modal:not(.hidden) .modal-close'));
if (rm && !rm.invisivel) { await toca(rm.x, rm.y); await dorme(600); out.passos.push({ o: 'modal_fechado', e: await E(CENARIO) }); }
// entrar na vista a toque, como um utilizador: primeiro na barra (as 4-5 rotas primárias), só se não
// estiver lá é que se abre a gaveta. No calib5/cov1 o «fotos» entra pela barra e a pergunta é o que
// acontece à navegação DEPOIS — tem de ser medida a partir do mesmo caminho que o utilizador faz.
const rb = await E(RET(`#bfrMobileBottomNav [data-bfr-mobile-route="${ROTA}"]`));
let entrada = null;
if (rb && !rb.invisivel) { await toca(rb.x, rb.y); await E(`new Promise(r => setTimeout(r, 2600))`); entrada = { via: 'barra', alvo: rb }; }
else {
  const rmais = await E(RET('#bfrMobileBottomNav [data-bfr-mobile-route="more"]'));
  if (rmais && !rmais.invisivel) { await toca(rmais.x, rmais.y); await dorme(600); }
  const rl = await E(RET(`#bfrMobileDrawer [data-bfr-drawer-route="${ROTA}"]`));
  if (rl && !rl.invisivel) { await toca(rl.x, rl.y); await E(`new Promise(r => setTimeout(r, 2600))`); entrada = { via: 'gaveta', alvo: rl }; }
}
out.passos.push({ o: 'gaveta_aberta', e: await E(CENARIO) });
out.passos.push({ o: 'entrei_na_rota', alvo: entrada, e: await E(CENARIO) });
// Quem está por cima de cada controlo da barra, no momento em que a vista está aberta. É isto que separa
// «a app enterrou a navegação» de «a sonda não soube ler o ponto»: z-index efectivo + elemento no centro.
out.cobertura_barra = await E(`(() => { const id = (e) => e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/)[0] : '') : null;
  const alvos = Array.from(document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]')).map(b => ['barra:' + b.dataset.bfrMobileRoute, b]).concat(Array.from(document.querySelectorAll('[data-bfr-open-drawer]')).map(b => ['hamburguer', b]));
  return alvos.map(([n, b]) => { const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const topo = document.elementFromPoint(x, y);
    const dentro = topo === b || b.contains(topo); let e = topo, culpado = null;
    while (e && e !== document.body) { const c = getComputedStyle(e); if (c.position === 'fixed' && parseInt(c.zIndex || '0', 10) >= 1000) { culpado = id(e) + ' pos=fixed z=' + c.zIndex; break; } e = e.parentElement; }
    return { n, ponto: { x, y }, livre: dentro, topo: id(topo), culpado }; }); })()`);

// a gaveta abre POR CIMA da vista? medir sem tocar: rect + elementFromPoint no centro de um link da gaveta
const sonda_link = await E(`(() => { const d = document.getElementById('bfrMobileDrawer'); const l = d?.querySelector('[data-bfr-drawer-route="inicio"]'); if (!l) return null; const r = l.getBoundingClientRect(); const topo = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); return { caixa: { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) }, topo_no_link: topo ? topo.tagName.toLowerCase() + (topo.className && typeof topo.className === 'string' ? '.' + topo.className.trim().split(/\\s+/)[0] : '') : null, eh_o_link: topo === l || (l && l.contains(topo)) }; })()`);
out.passos.push({ o: 'link_da_gaveta_sob_a_vista', e: sonda_link });
// tentar sair pelo que a própria vista oferece: qualquer coisa com voltar/fechar/× no rótulo
const saida = await E(`(() => { const v = Array.from(document.querySelectorAll('#appShell .content:not(.hidden)')).sort((a,b)=>b.querySelectorAll('*').length-a.querySelectorAll('*').length)[0]; const b = Array.from((v||document).querySelectorAll('button')).find(x => /voltar|fechar|←|×|sair|início|inicio/i.test((x.textContent || '') + ' ' + (x.getAttribute('aria-label') || ''))); if (!b) return null; const r = b.getBoundingClientRect(); return { txt: (b.textContent || '').trim().slice(0, 24), aria: b.getAttribute('aria-label'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
if (saida) { await toca(saida.x, saida.y); await E(`new Promise(r => setTimeout(r, 2200))`); out.passos.push({ o: 'saida_pela_vista', alvo: saida, e: await E(CENARIO) }); }
else out.passos.push({ o: 'saida_pela_vista', alvo: null, e: null });
// e se a saida não existir ou não chegar: a barra de baixo ainda responde?
const rin = await E(RET('#bfrMobileBottomNav [data-bfr-mobile-route="inicio"]'));
if (rin && !rin.invisivel) { await toca(rin.x, rin.y); await E(`new Promise(r => setTimeout(r, 2200))`); out.passos.push({ o: 'barra_inicio_depois_da_vista', alvo: rin, e: await E(CENARIO) }); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.passos) console.log(p.o + ': ' + JSON.stringify(p.e).slice(0, 460));
console.log('AH7B_SONDA_RESULTADOS · ' + OUT.split('/').pop());
fecho = true;
abort(0, 'fecho normal');
