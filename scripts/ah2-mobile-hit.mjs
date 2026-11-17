// AH-7b-HIT — «a gaveta não abre ao toque» não é conclusão, é sintoma. Este instrumento não toca: para
// cada controlo de navegação que o telemóvel mostra, pergunta ao browser o que está por cima do ponto onde
// o dedo bate (document.elementFromPoint no centro do retângulo) e, quando não é o próprio botão, sobe a
// cadeia do intruso a ler position/z-index/transform. É a diferença entre «a app tem um bug de empilhamento»
// e «eu bati fora do sítio», e é a pergunta que o §5 exige («a barra é usável a toque?»), não só «existe?».
// Descoberto por ah2-sonda-gaveta: em 390 px, o centro do botão «Mais» responde por p.publish-status.
// Só-leitura no ar: 0 toque, 0 escrita, 0 DDL, 0 deploy, 0 screenshot.
// Uso: node scripts/ah2-mobile-hit.mjs <papel> <larguras csv> <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const LARGURAS = (process.argv[3] || '320,360,375,390,414,430').split(',').map((n) => parseInt(n, 10));
const ROTULO = process.argv[4] || '17-11';
const ROTA = process.argv[5] || null;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2mh-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-mobile-hit-${ROTULO}.json`;
const ALTURA = 720;
const PORT = 9363;
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
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURAS[0]},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 300 s'), 300000);
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

const HIT = `(() => {
  const nome = (e) => e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') : null;
  const caixas = (e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; };
  const alvo = (e) => { const c = getComputedStyle(e); return { pos: c.position, z: c.zIndex, disp: c.display, tf: c.transform === 'none' ? null : c.transform.slice(0, 24), ov: c.overflow }; };
  const barra = document.getElementById('bfrMobileBottomNav');
  const controles = [
    ...(barra ? Array.from(barra.querySelectorAll('button[data-bfr-mobile-route]')).map((b) => ({ nome: 'barra:' + b.dataset.bfrMobileRoute, el: b })) : []),
    ...Array.from(document.querySelectorAll('[data-bfr-open-drawer]')).map((b) => ({ nome: 'hamburguer', el: b })),
  ];
  const saida = controles.map((c) => {
    const r = c.el.getBoundingClientRect();
    const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);
    if (!r.width || !r.height) return { nome: c.nome, sem_caixa: true };
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { nome: c.nome, fora_do_ecra: { x, y, vw: innerWidth, vh: innerHeight } };
    const topo = document.elementFromPoint(x, y);
    const meu = topo === c.el || c.el.contains(topo);
    const encadeados = document.elementsFromPoint(x, y).slice(0, 5).map(nome);
    const cadeia_intruso = (!meu && topo) ? (() => { const l = []; let e = topo; while (e && e !== document.documentElement && l.length < 6) { l.push(nome(e) + ' [' + getComputedStyle(e).position + ' z=' + getComputedStyle(e).zIndex + ']'); e = e.parentElement; } return l; })() : null;
    return { nome: c.nome, ok: meu, ponto: { x, y }, caixa: caixas(c.el), topo: nome(topo), encadeados, cadeia_intruso, alvo_css: alvo(c.el) };
  });
  return { vw: innerWidth, vh: innerHeight, scroll_y: Math.round(scrollY), barra_css: barra ? alvo(barra) : null, barra_caixa: barra ? caixas(barra) : null, controles: saida, modal: (() => {
    // O cobridor é o #preferredNameModal (fixed z=1300, acima dos 1200 da barra). Um modal por cima de tudo
    // é comportamento correcto SE o utilizador o puder fechar com o dedo; se os controlos dele também
    // estiverem tapados, a app fica presa num ecrã que não se fecha a toque — é isso que aqui se mede.
    const m = document.getElementById('preferredNameModal'); if (!m) return { existe: false };
    const c = getComputedStyle(m);
    const botoes = Array.from(m.querySelectorAll('button, input[type=submit], input:not([type=hidden]), select, textarea'));
    return { existe: true, classes: (m.className || '').slice(0, 40), disp: c.display, vis: c.visibility, op: c.opacity, z: c.zIndex, pe: c.pointerEvents,
      caixa: caixas(m), texto: (m.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 120),
      controlos: botoes.map((e) => { const r = e.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const topo = (r.width && r.height && x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight) ? document.elementFromPoint(x, y) : null;
        return { el: nome(e), tipo: e.type || null, nome_attr: e.name || e.dataset ? (e.dataset.accountTool || e.id || null) : null, caixa: { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }, livre: topo === e || e.contains(topo), topo: nome(topo) }; }) };
})() };
})()`;

const out = { ciclo: 'AH-7b-HIT', em: new Date().toISOString(), papel: PAPEL, altura: ALTURA, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), larguras: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d).slice(0, 300)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURAS[0], height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
for (const w of LARGURAS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 45000).catch(() => {});
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
  await send('Page.navigate', { url: URL_APP });
  const ms = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 70000).catch(() => null);
  await E(`new Promise(r => setTimeout(r, 1800))`);
  // Com uma ROTA pedida, este programa deixa de ser só geometria do boot: fecha o modal de primeiro acesso
  // e entra na seção pela API do próprio app. É válido aqui porque o que se mede é EMPILHAMENTO (quem está
  // por cima de quem), que não depende de como se chegou lá; o contrato de toque é o ah2-mobile2.
  if (ROTA) {
    await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none'); m?.querySelector('.modal-close')?.click(); return !!m; })()`);
    await E(`(() => { window.BFR_APP_RUNTIME?.navigate?.(${JSON.stringify(ROTA)}); return true; })()`);
    await E(`new Promise(r => setTimeout(r, 3000))`);
  }
  const h = await E(HIT);
  h.ms_ready = ms;
  h.rota_pedida = ROTA || null;
  h.ativa = await E(`window.BFR_APP_RUNTIME?.activeSection ?? null`);
  h.body_css = await E(`(() => { const c = getComputedStyle(document.body); return { transform: c.transform === 'none' ? null : c.transform.slice(0, 30), filter: c.filter === 'none' ? null : c.filter.slice(0, 30), will: c.willChange, contain: c.contain, position: c.position, isolate: c.isolation }; })()`);
  h.nav_offsetParent = await E(`(() => { const n = document.getElementById('bfrMobileBottomNav'); let e = n?.offsetParent; const l = []; while (e && l.length < 5) { l.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\\s+/)[0] : '')); e = e.offsetParent; } return l; })()`);
  out.larguras[w] = h;
  const cobertos = h.controles.filter((c) => c.ok === false).map((c) => c.nome + '→' + c.topo);
  gate(`${w}px: 0 controlos de navegação tapados por outro elemento`, cobertos, []);
  gate(`${w}px: 0 controlos fora do ecrã`, h.controles.filter((c) => c.fora_do_ecra || c.sem_caixa).map((c) => c.nome), []);
  const m_aberto = h.modal?.existe && h.modal.disp !== 'none' && h.modal.vis !== 'hidden' && h.modal.caixa.w > 0;
  gate(`${w}px: nenhum modal aberto a bloquear a navegação`, m_aberto ? { aberto: true, texto: h.modal.texto.slice(0, 60) } : { aberto: false }, { aberto: false });
  gate(`${w}px: se há modal, os controlos dele estão livres`, m_aberto ? h.modal.controlos.filter((c) => !c.livre && c.caixa.w > 0).map((c) => c.el + '→' + c.topo) : [], []);
  console.log(`${w}px rota=${h.rota_pedida || 'boot'} ativa=${h.ativa} barra=${JSON.stringify(h.barra_css)} caixa=${JSON.stringify(h.barra_caixa)} scroll_y=${h.scroll_y} body=${JSON.stringify(h.body_css)} offsetParent=${JSON.stringify(h.nav_offsetParent)}`);
  console.log(`${w}px modal=${JSON.stringify(h.modal).slice(0, 420)}`);
  for (const c of h.controles) console.log(`   ${c.nome}: ${c.ok ? 'LIVRE' : c.sem_caixa ? 'SEM CAIXA' : c.fora_do_ecra ? 'FORA ' + JSON.stringify(c.fora_do_ecra) : 'TAPADO por ' + c.topo + ' em ' + JSON.stringify(c.ponto) + (c.cadeia_intruso ? ' cadeia=' + c.cadeia_intruso.join(' < ') : '')}`);
}
out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? 'AH7B_HIT_COM_DEFEITOS' : 'AH7B_HIT_LIMPO';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\nPORTÕES: ' + portoes + '  FALHAS: ' + falhas.length);
for (const f of falhas) console.log('  VERMELHO: ' + f.slice(0, 320));
console.log(out.veredito + ' · ' + OUT.split('/').pop());
fecho = true;
abort(0, 'fecho normal');
