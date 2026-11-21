#!/usr/bin/env node
// P78 — ONDE É QUE O UTILIZADOR VÊ (OU NÃO VÊ) A ENTRADA «SECRETARIA MUNICIPAL». A pergunta do print é de
// geometria, não de grau: a P75 afirma que o botão existe e tem offsetWidth>0, mas `visivel` por offsetWidth
// não diz se ele cai dentro da caixa visível do contentor nem se o contentor está no ecrã. Esta peça mede
// retângulos, a cadeia de antepassados com overflow, e dispara um PNG do topo e da página inteira, na banda
// do ecrã do usuário. Só-leitura: 0 DDL, 0 deploy, 0 escrita de produto; a única rede privilegiada é o
// refresh da cadeia de teste, como na P75.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const LARG = parseInt(process.argv[2] || '1900', 10);
const ALT = parseInt(process.argv[3] || '1080', 10);
const PAPEL = (process.argv[4] || 'developer').trim();
const SUF = (process.argv[5] || 'a').trim();
const OUT = `${DIR}/p78-geometria-${PAPEL}-${LARG}x${ALT}-${SUF}.json`;
const PNG_TOPO = `${DIR}/p78-topo-${PAPEL}-${LARG}x${ALT}-${SUF}.png`;
const PNG_PAGINA = `${DIR}/p78-pagina-${PAPEL}-${LARG}x${ALT}-${SUF}.png`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usa outro sufixo, nunca por cima');
const PORT = parseInt(process.env.AH2_PORT || '9388', 10);
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = md5(shellTxt);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const renova = async () => {
  for (let n = 0; n < 4; n++) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { S[PAPEL] = { ...S[PAPEL], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); return j; }
    if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) throw new Error('CADEIA QUEIMADA em ' + PAPEL + ' — precisa de re-login com OK');
    await new Promise((rz) => setTimeout(rz, 2500 * (n + 1)));
  }
  throw new Error('refresh falhou 4x');
};
const tok = await renova();

const PERFIL = `${DIR}/.p78-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARG},${ALT}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
let out = {};
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0 }, null, 2) + '\n'); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, 'watchdog 200 s'), 200000);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => abort(4, 'ws fechado');
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map(); const erros = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') erros.push(String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 180));
};
const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
  const i = ++seq; const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method)); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: LARG, height: ALT, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 40; i++) { if (await E('!!document.querySelector("#bfrMunicipalView, [data-bfr-municipal-nav]")')) break; await new Promise((r) => setTimeout(r, 500)); }
await E(`(() => { localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user }))}); return 1; })()`);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 60; i++) { if (await E('!!(window.BFR_MUNICIPAL)')) break; await new Promise((r) => setTimeout(r, 500)); }
await new Promise((r) => setTimeout(r, 3000));

const GEOM = `(() => {
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const noEcra = (el) => { const r = el.getBoundingClientRect(); const de = document.documentElement; return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < de.clientHeight && r.right > 0 && r.left < de.clientWidth; };
  const estilo = (el) => { const c = getComputedStyle(el); return { display: c.display, visibility: c.visibility, opacity: c.opacity, overflowX: c.overflowX, position: c.position }; };
  const cadeia = (el) => { const out = []; let p = el; for (let i = 0; i < 9 && p && p.nodeType === 1; i++) { const c = getComputedStyle(p); out.push({ nome: (p.tagName + '.' + String(p.className || '').split(/\\s+/).slice(0, 3).join('.') + (p.id ? '#' + p.id : '')).slice(0, 70), caixa: caixa(p), display: c.display, overflowX: c.overflowX, scrollW: p.scrollWidth, clientW: p.clientWidth, transborda: p.scrollWidth > p.clientWidth }); p = p.parentElement; } return out; };
  const navs = [...document.querySelectorAll('[data-bfr-municipal-nav]')].map((b) => ({ rotulo: String(b.textContent || '').trim().slice(0, 40), classe: String(b.className).slice(0, 60), hidden: b.classList.contains('hidden'), munApto: b.dataset.munApto || null, caixa: caixa(b), noEcra: noEcra(b), estilo: estilo(b), cadeia: cadeia(b), paiDireto: (b.parentElement && b.parentElement.tagName + '.' + String(b.parentElement.className || '')).slice(0, 70) }));
  const side = document.querySelector('.sidebar') || document.querySelector('nav.bfr-platform-nav') || document.querySelector('.bfr-platform-nav');
  const itensSide = [...document.querySelectorAll('.sidebar .nav-item[data-section]')].map((b) => ({ s: b.dataset.section, caixa: caixa(b), noEcra: noEcra(b), hidden: b.classList.contains('hidden') }));
  const pills = [...document.querySelectorAll('.bfr-platform-nav button, .nav-list button')].map((b) => ({ rot: String(b.textContent || '').trim().slice(0, 26), sec: b.dataset.section || b.getAttribute('data-bfr-municipal-nav') || null, caixa: caixa(b), noEcra: noEcra(b) }));
  const gaveta = document.querySelector('.mobile-more-grid, #bfrMoreDrawer, [data-more-grid]');
  const de = document.documentElement;
  return {
    innerWidth: window.innerWidth, clientWidth_de: de.clientWidth, scrollWidth_de: de.scrollWidth, clienteH_de: de.clientHeight,
    persona_bar: [...document.querySelectorAll('.role-toggle button')].map((b) => ({ rot: String(b.textContent || '').trim().slice(0, 22), activo: b.classList.contains('active'), caixa: caixa(b), noEcra: noEcra(b) })),
    sidebar_existe: !!side, sidebar_caixa: side ? caixa(side) : null, sidebar_estilo: side ? estilo(side) : null, sidebar_cadeia: side ? cadeia(side) : null,
    itens_sidebar_total: itensSide.length, itens_sidebar_no_ecra: itensSide.filter((i) => i.noEcra).length,
    municipal_navs: navs, pills_total: pills.length, pills_no_ecra: pills.filter((p) => p.noEcra).length, pills_fora: pills.filter((p) => !p.noEcra).slice(0, 12),
    gaveta: gaveta ? { classe: String(gaveta.className).slice(0, 50), estilo: estilo(gaveta), itens: gaveta.querySelectorAll('button').length } : null,
    vista_municipal: (() => { const v = document.getElementById('bfrMunicipalView'); return v ? { existe: true, caixa: caixa(v), display: getComputedStyle(v).display, chars: (v.textContent || '').length } : { existe: false }; })(),
  };
})()`;
const g = await E(GEOM);
out = { programa: 'scripts/p78-geometria-entrada-municipal.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0, banda: `${LARG}x${ALT}`, papel: PAPEL, ar: { url: URL_APP, md5_servido: MD5 }, pergunta: 'a entrada municipal existe no DOM mas onde é que ela cai no ecrã do usuario?', leitura: g, excecoes: erros.slice(0, 6) };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

const shot = async (path, full) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full }, 40000); if (r && r.data) writeFileSync(path, Buffer.from(r.data, 'base64')); return r && r.data ? Buffer.from(r.data, 'base64').length : 0; };
const b1 = await shot(PNG_TOPO, false);
const b2 = await shot(PNG_PAGINA, true);
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
console.log(`ar ${MD5} · banda ${LARG}x${ALT} · innerWidth=${g.innerWidth} clientWidth_de=${g.clientWidth_de}`);
console.log(`sidebar_existe=${g.sidebar_existe} itens=${g.itens_sidebar_total} no_ecra=${g.itens_sidebar_no_ecra} · pills=${g.pills_total} no_ecra=${g.pills_no_ecra}`);
for (const n of g.municipal_navs) console.log(`  nav "${n.rotulo}" hidden=${n.hidden} apto=${n.munApto} caixa=${JSON.stringify(n.caixa)} noEcra=${n.noEcra} pai=${n.paiDireto}`);
console.log(`vista=${JSON.stringify(g.vista_municipal)} gaveta=${JSON.stringify(g.gaveta)}`);
console.log(`png topo ${b1} B ${PNG_TOPO} · pagina ${b2} B ${PNG_PAGINA}`);
console.log('registo ' + OUT);
process.exit(0);
