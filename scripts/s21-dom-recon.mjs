// S21-3b — RECON do DOM autenticado do supervisor na v119 (somente leitura; nada de token impresso).
// Pergunta: por que o item "secretaria" está oculto e qual é o caminho REAL que pinta a aba Supervisão.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const REF = 'yyzqoxlkcvqpessypfjo';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = 9342;
const PERFIL = `${DIR}/.s21-chrome-profile-b`;
const OUT = `${DIR}/s21-dom-recon.json`;

const S = JSON.parse(readFileSync(`${DIR}/s21-session.json`, 'utf8'));
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' já existe');
if (!existsSync(PERFIL)) mkdirSync(PERFIL, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`,
  '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
], { stdio: 'ignore' });
const abort = (c, m) => { try { chrome.kill(); } catch {} console.log('PAROU: ' + m); process.exit(c); };

let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}
const page = targets.find(t => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map(); const redes = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.responseReceived' && /\/rest\/v1\//.test(m.params.response.url))
    redes.push({ url: decodeURIComponent(m.params.response.url).slice(0, 400), status: m.params.response.status, reqId: m.params.requestId });
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
  return r.result?.value;
};
const waitFor = async (expr, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(expr)) return Date.now() - t0; await new Promise(r => setTimeout(r, 400)); } throw new Error('waitFor: ' + expr.slice(0, 140)); };

const out = { em: new Date().toISOString(), stages: {} };
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
await waitFor(`!!document.getElementById('loginScreen')`, 60000);
const sessao = { access_token: S.access_token, token_type: 'bearer', expires_in: Math.max(S.expires_at - Math.floor(Date.now() / 1000), 60), expires_at: S.expires_at, refresh_token: S.refresh_token, user: S.user };
await evalJS(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
out.stages.ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === 'education_supervisor'`);
console.log('[recon] ready em ' + out.stages.ms_ready + ' ms');

// 1) os itens de menu e por que cada um está oculto
out.stages.menu = await evalJS(`(() => {
  const cadeia = el => { const v = []; let n = el; while (n && n !== document.documentElement) { const cs = getComputedStyle(n); v.push({ tag: n.tagName, id: n.id||null, cls: (n.className||'').toString().slice(0,60), display: cs.display, hidden: n.hidden===true, vis: !!(n.offsetWidth||n.offsetHeight||n.getClientRects().length) }); n = n.parentElement; if (v.length>6) break; } return v; };
  return Array.from(document.querySelectorAll('[data-section]')).map(el => ({
    sec: el.dataset.section, texto: (el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,30),
    visivel: !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length),
    aria_current: el.getAttribute('aria-current'), oculto_por: cadeia(el).filter(a=>a.display==='none'||a.hidden).map(a=>(a.tag+(a.id?'#'+a.id:'')+(a.cls?'.'+a.cls.split(' ')[0]:''))).join(' <- '),
    cadeia: cadeia(el).map(a=>a.tag+(a.id?'#'+a.id:'')).join(' < ')
  }));
})()`);
console.log('  itens [data-section]: ' + out.stages.menu.length);
out.stages.menu.forEach(m => console.log(`   ${m.sec} | visivel=${m.visivel} | oculto_por=${m.oculto_por || '-'} | ${m.texto}`));

// 2) views e o que está de facto visível no corpo
out.stages.views = await evalJS(`(() => {
  const v = Array.from(document.querySelectorAll('.view-section,[id$="View"]')).map(el => ({ id: el.id, cls: (el.className||'').toString().slice(0,50), display: getComputedStyle(el).display, vis: !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length), filhos: el.children.length, texto: (el.innerText||'').replace(/\\s+/g,' ').trim().slice(0,80) }));
  const visiveisTopo = Array.from(document.body.children).map(el => ({ tag: el.tagName, id: el.id||null, display: getComputedStyle(el).display, vis: !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length) }));
  return { views: v, corpo: visiveisTopo };
})()`);
console.log('  views com id *View: ' + out.stages.views.views.length + '; visíveis: ' + JSON.stringify(out.stages.views.views.filter(x => x.vis).map(x => x.id)));

// 3) globais do app que governam papel/seção
out.stages.globais = await evalJS(`(() => {
  const nomes = Object.keys(window).filter(k => /^(setRole|showSection|switch|navigate|openSection|roleSectionAccess|viewIds|BFR_[A-Z_]+|currentProfile|activeSection)$/i.test(k));
  const probe = {};
  for (const k of nomes) { try { const v = window[k]; probe[k] = (typeof v === 'function') ? 'function' : (v && typeof v === 'object' ? JSON.stringify(v).slice(0, 500) : String(v).slice(0, 120)); } catch { probe[k] = 'erro'; } }
  return { nomes, probe };
})()`);
console.log('  globais: ' + JSON.stringify(out.stages.globais.nomes));
out.stages.roleSectionAccess = await evalJS(`(() => { const r = window.roleSectionAccess || (typeof roleSectionAccess!=='undefined' ? roleSectionAccess : null); return r? JSON.stringify(r).slice(0,1200) : null; })()`);
console.log('  roleSectionAccess: ' + String(out.stages.roleSectionAccess).slice(0, 600));

// 4) existe a aba em algum lugar do DOM, mesmo oculta?
out.stages.aba = await evalJS(`(() => {
  const el = document.querySelector('[data-sec-tab="supervisao"]');
  if (!el) return { presente: false, todos_data_sec_tab: Array.from(document.querySelectorAll('[data-sec-tab]')).map(x=>x.dataset.secTab) };
  return { presente: true, visivel: !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length), texto: (el.textContent||'').trim().slice(0,40) };
})()`);
console.log('  aba supervisao: ' + JSON.stringify(out.stages.aba).slice(0, 300));

// 5) sonda do caminho do app: chama a própria função de seção se ela existir (sem adivinhar nome)
const antes = redes.length;
out.stages.tentativas = {};
for (const algo of [
  `(() => { const el = document.querySelector('[data-section="secretaria"]'); if (!el) return 'sem-item'; el.click(); return 'clicado-hidden'; })()`,
  `(() => { if (typeof window.setRole === 'function') { window.setRole('secretary'); return 'setRole(secretary)'; } return 'sem setRole'; })()`,
  `(() => { if (typeof window.showSection === 'function') { window.showSection('secretaria'); return 'showSection'; } return 'sem showSection'; })()`,
]) {
  out.stages.tentativas[algo.slice(0, 40)] = await evalJS(algo);
  await new Promise(r => setTimeout(r, 4000));
  const achou = await evalJS(`!!document.querySelector('[data-sec-tab="supervisao"]')`);
  out.stages.tentativas[algo.slice(0, 40)] += ' | aba=' + achou;
  console.log('  tentativa → ' + out.stages.tentativas[algo.slice(0, 40)]);
  if (achou) break;
}
out.stages.redes_depois = redes.slice(antes);
const sup = out.stages.redes_depois.filter(r => /supervision_requests/.test(r.url));
out.stages.supervisao_urls = sup;
sup.forEach(s => console.log(`   → HTTP ${s.status} ${s.url.slice(0, 300)}`));
const corpos = [];
for (const c of sup) {
  try { const b = await send('Network.getResponseBody', { requestId: c.reqId }); corpos.push({ url: c.url.slice(0, 500), status: c.status, corpo: (b.body || '').slice(0, 500) }); }
  catch (e) { corpos.push({ url: c.url.slice(0, 300), status: c.status, erro: String(e.message).slice(0, 100) }); }
}
out.stages.corpos = corpos;
corpos.forEach(c => console.log('   corpo: ' + JSON.stringify(c).slice(0, 320)));

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('escrito ' + OUT);
abort(0, 'fecho normal');
