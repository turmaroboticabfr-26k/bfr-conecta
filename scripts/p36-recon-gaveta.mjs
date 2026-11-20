// P36-G — recon Só-LEITURA de como a shell servida abre a seccao `secretaria` a 390 px, depois do
// primeiro P36_BROWSER_COM_PORTOES_VERMELHOS (registo ANTERIOR-runtime-nao-exposto-e-gaveta-fechada).
// Duas hipoteses a falsificar antes de reescrever o instrumento: (1) `window.BFR_APP_RUNTIME`, que a
// candidata expoe na linha 16943, nao existe no ar — a minha classificacao positiva/negativa dependia
// dele e ficou null para os tres perfis; (2) o botao `[data-section="secretaria"]` esta no DOM mas com
// `visivel:false` porque a gaveta mobile esta fechada (a regra da casa: gaveta fechada mantem os nos).
// Este recon nao afirma nada: conta, nomeia e grava. 0 escrita, 0 DDL, 0 mint.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const STORAGE_KEY = 'sb-yyzqoxlkcvqpessypfjo-auth-token';
const PORT = 9371;
const PERFIL_DIR = `${FORA}/.p36-gaveta-chrome`;
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8')) || [])[0] + '/';
const OUT = join(REPO, 'evidence/p36-recon-gaveta-secretaria-19-11.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const ah2 = JSON.parse(readFileSync(`${FORA}/ah2-sessions.json`, 'utf8'));
const alvo = ah2.secretary;
const papel = (await sql(`select role::text as r from public.profiles where id='${alvo.id}'::uuid`))[0].r;
const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
const refresh = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  body: JSON.stringify({ refresh_token: alvo.refresh_token }),
});
const jRefresh = await refresh.json().catch(() => null);
if (!jRefresh || !jRefresh.access_token) throw new Error('ABORTA: refresh HTTP ' + refresh.status);
const access = jRefresh.access_token;

if (existsSync(PERFIL_DIR)) rmSync(PERFIL_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL_DIR, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL_DIR}`, '--headless=new', '--window-size=390,900',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
], { stdio: 'ignore' });
const matamos = () => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} };
const vigia = setTimeout(matamos, 200000);
let alvos = [];
for (let i = 0; i < 60; i++) {
  try { alvos = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (alvos.some((t) => t.type === 'page')) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const page = alvos.find((t) => t.type === 'page');
if (!page) { matamos(); clearTimeout(vigia); throw new Error('ABORTA: sem alvo page no CDP'); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map(); const erros = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') erros.push(String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 240));
  return r.result?.value;
};
const waitFor = async (e, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(e)) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 120)); };

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor(`!!document.getElementById('loginScreen')`, 60000);
const sessao = { access_token: access, token_type: 'bearer', expires_in: jRefresh.expires_in || 3600, expires_at: Math.floor(Date.now() / 1000) + (jRefresh.expires_in || 3600), refresh_token: jRefresh.refresh_token, user: jRefresh.user };
await ev(`(() => { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)})); localStorage.setItem('bfr-pn-skipped:' + ${JSON.stringify(alvo.id)}, '1'); return true; })()`);
await send('Page.navigate', { url: URL_APP });
const ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(papel)}`, 120000);

const out = { programa: 'scripts/p36-recon-gaveta.mjs', em: new Date().toISOString(), url: URL_APP, largura: 390, papel, ms_ready, janela: await ev(`({ innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth })`) };

// (1) O que o ar expoe realmente.
out.globais = await ev(`(() => {
  const chaves = Object.keys(window).filter(k => /^BFR/.test(k)).sort();
  return {
    chaves_bfr: chaves,
    app_runtime: typeof window.BFR_APP_RUNTIME,
    app_runtime_chaves: window.BFR_APP_RUNTIME ? Object.keys(window.BFR_APP_RUNTIME) : null,
    secretary_central: typeof window.BFRSecretaryCentral,
    municipal: typeof window.BFRMunicipalView,
  };
})()`);

// (2) A gaveta: seletores vivos, estado e o que muda com um clique de rato.
const estadoGaveta = `(function () {
  const mais = document.querySelector('[data-mobile-more]');
  const gavetas = Array.from(document.querySelectorAll('nav, aside, [class*="sidebar"], [class*="drawer"], [data-mobile-nav]')).filter(function (e) { return e.offsetWidth > 0 || e.getAttribute && e.getAttribute('aria-expanded') !== null; }).slice(0, 8).map(function (e) {
    return { no: e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(' ').slice(0, 3).join('.') : ''), isOpen: e.classList.contains('is-open'), aria: e.getAttribute('aria-expanded'), visivel: !!(e.offsetWidth || e.offsetHeight), cls: (e.className || '').toString().slice(0, 60) };
  });
  const b = document.querySelector('button[data-section="secretaria"]:not([data-teacher-nav-tab])');
  const r = b ? b.getBoundingClientRect() : null;
  return {
    botao_mais: mais ? { presente: true, visivel: !!(mais.offsetWidth || mais.offsetHeight), aria: mais.getAttribute('aria-expanded'), texto: (mais.textContent || '').trim().slice(0, 20), centro: (function () { const q = mais.getBoundingClientRect(); return [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)]; })() } : { presente: false },
    contentores: gavetas,
    botao_secretaria: b ? { presente: true, visivel: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length), rect: [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)], centro: [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)], dentro_da_janela: r.width > 0 && (r.left + r.width / 2) >= 0 && (r.top + r.height / 2) >= 0 && (r.left + r.width / 2) <= window.innerWidth && (r.top + r.height / 2) <= window.innerHeight } : { presente: false },
    seccoes_visiveis: Array.from(document.querySelectorAll('button[data-section]')).filter(function (x) { return !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length); }).map(function (x) { return x.dataset.section; }),
  };
})()`;
out.gaveta_antes = await ev(estadoGaveta);
const mais = out.gaveta_antes.botao_mais;
if (mais.presente && mais.visivel) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mais.centro[0], y: mais.centro[1] });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mais.centro[0], y: mais.centro[1], button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mais.centro[0], y: mais.centro[1], button: 'left', clickCount: 1 });
  await ev(`new Promise(r => setTimeout(r, 900))`);
}
out.gaveta_depois_do_clique_no_mais = await ev(estadoGaveta);

// (3) Abrir a seccao pelo caminho que o browser permite, e ver o que fica assente.
const depois = out.gaveta_depois_do_clique_no_mais;
const podeRato = depois.botao_secretaria.dentro_da_janela === true;
out.clique_secretaria = { camada: podeRato ? 'rato' : 'sintetico' };
if (podeRato) {
  const c = depois.botao_secretaria.centro;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c[0], y: c[1] });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: c[0], y: c[1], button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c[0], y: c[1], button: 'left', clickCount: 1 });
} else await ev(`(function () { const b = document.querySelector('button[data-section="secretaria"]:not([data-teacher-nav-tab])'); if (!b) return false; b.click(); return true; })()`);
await ev(`new Promise(r => setTimeout(r, 2500))`);
out.central = await ev(`(function () {
  const central = document.querySelector('[data-secretary-central]');
  const tabs = Array.from(document.querySelectorAll('[data-secretary-central] [data-sec-tab]'));
  const nav = document.querySelector('[data-secretary-central] .bfr-secretary-tabs');
  const sup = document.querySelector('[data-secretary-central] button[data-sec-tab="supervisao"]');
  const rs = sup ? sup.getBoundingClientRect() : null;
  return {
    central_no_dom: !!central,
    central_visivel: central ? !!(central.offsetWidth || central.offsetHeight) : false,
    n_tabs: tabs.length,
    tabs_visiveis: tabs.filter(function (t) { return !!(t.offsetWidth || t.offsetHeight || t.getClientRects().length); }).length,
    nav_scroll: nav ? { scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth, overflow_x: getComputedStyle(nav).overflowX } : null,
    supervisao: sup ? { presente: true, visivel: !!(sup.offsetWidth || sup.offsetHeight || sup.getClientRects().length), rect: rs ? [Math.round(rs.width), Math.round(rs.height)] : null, centro: rs ? [Math.round(rs.left + rs.width / 2), Math.round(rs.top + rs.height / 2)] : null, dentro_da_janela: rs ? (rs.width > 0 && rs.left >= 0 && rs.top >= 0 && rs.left + rs.width / 2 <= window.innerWidth && rs.top + rs.height / 2 <= window.innerHeight) : false } : { presente: false },
    activeSection: (document.querySelector('button[data-section].active') || {}).dataset ? document.querySelector('button[data-section].active').dataset.section : null,
    seccoes_visiveis_agora: Array.from(document.querySelectorAll('button[data-section]')).filter(function (x) { return !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length); }).map(function (x) { return x.dataset.section; }),
  };
})()`);

// (4) As duas regras, lidas dos BYTES SERVIDOS: nem toda a classificacao precisa de um global do app.
const linhaMapa = (papelNome) => {
  const re = new RegExp('^\\s*' + papelNome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*\\[([^\\]]*)\\]', 'm');
  const m = re.exec(shellTxt);
  return m ? m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : null;
};
out.regras_lidas_dos_bytes_servidos = {
  secretary: linhaMapa('secretary'),
  education_supervisor: linhaMapa('education_supervisor'),
  director: linhaMapa('director'),
  lista_do_allowed: (() => { const m = /const allowed = \(\) => \[([^\]]*)\]\.includes\(profile\(\)\?\.role\)/.exec(shellTxt); return m ? m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : null; })(),
  lista_do_allowed_viewrole: (() => { const m2 = /\[([^\]]*)\]\.includes\(role\(\)\)/.exec(shellTxt); return m2 ? m2[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : null; })(),
};
out.erros_excepcion = erros.slice(0, 10);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('globais: ' + JSON.stringify(out.globais.app_runtime) + '/' + out.globais.chaves_bfr.join(','));
console.log('gaveta antes: mais=' + JSON.stringify(out.gaveta_antes.botao_mais.visivel) + ' secretaria_visivel=' + JSON.stringify(out.gaveta_antes.botao_secretaria.visivel) + ' seccoes_visiveis=' + out.gaveta_antes.seccoes_visiveis.length);
console.log('gaveta depois: mais=' + JSON.stringify(out.gaveta_depois_do_clique_no_mais.botao_mais.aria) + ' secretaria_visivel=' + out.gaveta_depois_do_clique_no_mais.botao_secretaria.visivel + ' dentro_da_janela=' + out.gaveta_depois_do_clique_no_mais.botao_secretaria.dentro_da_janela + ' seccoes=' + out.gaveta_depois_do_clique_no_mais.seccoes_visiveis.length);
console.log('central: ' + JSON.stringify(out.central));
console.log('regras: ' + JSON.stringify(out.regras_lidas_dos_bytes_servidos));
console.log('P36_GAVETA_OK · registo ' + OUT);
matamos(); ws.close(); clearTimeout(vigia);
process.exit(0);
