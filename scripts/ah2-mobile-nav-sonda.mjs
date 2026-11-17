// AH-7-SONDA — o instrumento de toque (§5) devolveu «0 botões de navegação visíveis» em 320/360/375/390/
// 414/430, enquanto a varredura abriu 9-13 painéis nas mesmas larguras a partir do DOM. Uma das coisas é
// verdade e a resposta não se adivinha: este instrumento não toca em nada, só pergunta ao DOM. Para cada
// largura: quantos `button[data-section]` existem, quantos têm caixa, o que o computed style diz do primeiro
// invisível e de cada ancestral até ao body, e o que existe de facto como navegação móvel (qualquer elemento
// com nav/dock/menu/tab no id ou classe que tenha caixa e botões lá dentro). Se aos 390 px a barra existir
// mas com outro markup, o defeito é meu; se não existir caixa nenhuma, o defeito é da app.
// Só-leitura no ar: 0 escrita, 0 DDL, 0 deploy, 0 screenshot (as vistas têm nomes de alunos).
// Uso: node scripts/ah2-mobile-nav-sonda.mjs <papel> <larguras csv> <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const LARGURAS = (process.argv[3] || '390,1280').split(',').map((n) => parseInt(n, 10));
const ROTULO = process.argv[4] || 'nav';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2nv-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-mobile-nav-${ROTULO}.json`;
const ALTURA = 720;
const PORT = 9359;
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
  throw new Error('renova(' + PAPEL + ') esgotou: ' + ultimo);
};
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURAS[0]},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 300 s'), 300000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const alvo = tg.find((t) => t.type === 'page');
if (!alvo) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (!m.id || !pend.has(m.id)) return; const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };

const SONDA = `(() => {
  const cs = (e) => getComputedStyle(e);
  const caixa = (e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; };
  const nome = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 4).join('.') : '');
  const por_que_invisivel = (e) => { const c = cs(e); const r = e.getBoundingClientRect(); if (c.display === 'none') return 'display:none'; if (c.visibility === 'hidden' || c.visibility === 'collapse') return 'visibility:' + c.visibility; if (c.opacity === '0') return 'opacity:0'; if (!r.width || !r.height) return 'caixa ' + Math.round(r.width) + 'x' + Math.round(r.height); if (r.bottom < 0 || r.top > innerHeight) return 'fora do ecra y=' + Math.round(r.top); const p = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + Math.min(r.height / 2, 10))); if (r.width && r.height && p && p !== e && !e.contains(p)) return 'coberto por ' + nome(p); return 'visivel'; };
  const botoes = Array.from(document.querySelectorAll('button[data-section]'));
  const com_caixa = botoes.filter((b) => b.offsetWidth || b.offsetHeight);
  const amostra = botoes.slice(0, 6).map((b) => { const c = cs(b); return { sec: b.dataset.section, estado: por_que_invisivel(b), display: c.display, pos: c.position, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), y: Math.round(b.getBoundingClientRect().top), classe: (b.className || '').slice(0, 40) }; });
  const cadeia = (b) => { const l = []; let e = b; while (e && e !== document.documentElement) { const c = cs(e); l.push(nome(e).slice(0, 60) + ' [' + c.display + '/' + c.visibility + '/' + c.position + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ']'); e = e.parentElement; } return l; };
  const nav = Array.from(document.querySelectorAll('*')).filter((e) => e.id && /nav|dock|menu|tab|bar/i.test(e.id) || (typeof e.className === 'string' && /nav|dock|menu|bottom|tab/i.test(e.className))).filter((e) => (e.offsetWidth || e.offsetHeight) && e.querySelector('button[data-section], [data-section]')).slice(0, 10).map((e) => ({ el: nome(e).slice(0, 70), caixa: caixa(e), opacidade: cs(e).opacity, z: cs(e).zIndex, botoes: e.querySelectorAll('[data-section]').length, visiveis: Array.from(e.querySelectorAll('[data-section]')).filter((x) => x.offsetWidth || x.offsetHeight).length }));
  const mais = Array.from(document.querySelectorAll('[data-mobile-more], .mobile-more-option')).slice(0, 6).map((e) => ({ el: nome(e).slice(0, 60), estado: por_que_invisivel(e), sec: e.dataset.section || null }));
  return { vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, mq_768: matchMedia('(max-width: 768px)').matches, appShell_classes: document.getElementById('appShell')?.className || null, body_classes: document.body.className || null, botoes_total: botoes.length, botoes_com_caixa: com_caixa.length, rotulos_visiveis: com_caixa.slice(0, 16).map((b) => (b.textContent || '').trim().slice(0, 14)), amostra, cadeia_primeiro_invisivel: cadeia(botoes.find((b) => !(b.offsetWidth || b.offsetHeight)) || botoes[0]), contentores_nav: nav, mobile_more: mais };
})()`;

const out = { ciclo: 'AH-7-SONDA-NAV', em: new Date().toISOString(), papel: PAPEL, altura: ALTURA, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), larguras: {}, nota: 'nenhum toque, nenhuma escrita; a pergunta é «existe caixa navegável a esta largura»' };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: LARGURAS[0], height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
for (const w of LARGURAS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: ALTURA, deviceScaleFactor: 2, mobile: w < 1000 });
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 45000).catch(() => {});
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
  await send('Page.navigate', { url: URL_APP });
  const ms = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 70000).catch(() => null);
  await E(`new Promise(r => setTimeout(r, 2500))`);
  const s = await E(SONDA);
  s.ms_ready = ms;
  // segunda leitura, três segundos depois: se a barra nascer tarde, «0 visíveis» era a minha pressa
  await E(`new Promise(r => setTimeout(r, 3000))`);
  const s2 = await E(SONDA);
  s.apos_3s_botoes_com_caixa = s2.botoes_com_caixa;
  out.larguras[w] = s;
  console.log(`${w}px: botoes=${s.botoes_total} com_caixa=${s.botoes_com_caixa} (apos_3s=${s.apos_3s_botoes_com_caixa}) contentores_nav=${s.contentores_nav.length} mobile_more=${JSON.stringify(s.mobile_more).slice(0, 110)} mq768=${s.mq_768} shell="${(s.appShell_classes || '').slice(0, 40)}"`);
  console.log(`   amostra: ${JSON.stringify(s.amostra).slice(0, 300)}`);
  if (s.contentores_nav.length) console.log(`   nav: ${JSON.stringify(s.contentores_nav.slice(0, 3)).slice(0, 300)}`);
  console.log(`   cadeia: ${s.cadeia_primeiro_invisivel.join(' < ').slice(0, 320)}`);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AH7_SONDA_NAV_MEDIDO · ' + OUT.split('/').pop());
fecho = true;
abort(0, 'fecho normal');
