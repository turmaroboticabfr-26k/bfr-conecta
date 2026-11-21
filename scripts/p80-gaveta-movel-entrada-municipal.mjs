#!/usr/bin/env node
// P80 — A GAVETA MÓVEL («MAIS») TEM A ENTRADA MUNICIPAL? (21/11, noite)
// A P79 provou o facto de banda: com `#appShell[data-presentation]="mobile"` (media query `(max-width:800px)` ou
// paisagem ≤1000×≤500, lida de app/bfr-responsive-presentation.js:7) o `<aside class="sidebar">` vai a
// `display:none` e as duas cópias do botão municipal ficam 0×0. Mas a P79 procurou a gaveta errada: o shell móvel
// não abre `#mobileMoreMenu` (legado), abre `#bfrMobileDrawer`, cuja lista é construída por `drawerItems()`
// (linhas 71-92) a partir de `.sidebar .nav-item[data-section]:not(.hidden)` e `#mobileMoreMenu .mobile-more-option`.
// Esta peça abre a gaveta certa, enumera as ligações, faz hit-teste (`elementFromPoint`) da ligação municipal,
// clica nela e pergunta ao painel se pintou. Só-leitura: 0 DDL, 0 deploy, 0 escrita de produto.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${DIR}/p80-gaveta-movel-municipal-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usa outro sufixo, nunca por cima');
const PORT = parseInt(process.env.AH2_PORT || '9401', 10);
const PAPEL = (process.env.P80_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

const BANDAS = (process.env.P80_BANDAS || '780x900,390x844,500x900')
  .split(',').map((s) => { const m = /^(\d+)x(\d+)$/.exec(s.trim()); if (!m) throw new Error('ABORTA: banda malformada em P80_BANDAS: ' + s); return { larg: +m[1], alt: +m[2] }; });

// ——— predicações puras, com o fixture que prova que discriminam ———
const estaNaGaveta = (links, sect) => links.some((l) => l.route === sect);
const gavetaAberta = (d) => !!d && d.existe === true && d.is_open === true;
// `chars` não é sinal de pintura: com o painel em `display:none`, `innerText` cai no texto cru e devolve 1 212
// caracteres de um painel que não está no ecrã (medido 21/11, bandas 2 e 3 da corrida b). O sinal é o par
// `display` + `abas` + conteúdo mínimo.
const painelVisivel = (v) => !!v && v.existe === true && v.display === 'block' && v.chars > 200 && v.abas > 0;
const painelEscondido = (v) => !!v && v.existe === true && v.display === 'none';
if (estaNaGaveta([{ route: 'inicio' }, { route: 'secretaria-municipal' }], 'secretaria-municipal') !== true || estaNaGaveta([{ route: 'inicio' }], 'secretaria-municipal') !== false) throw new Error('ABORTA: estaNaGaveta não discrimina a rota no fixture');
if (gavetaAberta({ existe: true, is_open: true }) !== true || gavetaAberta({ existe: true, is_open: false }) !== false || gavetaAberta(null) !== false) throw new Error('ABORTA: gavetaAberta não discrimina is-open no fixture');
if (painelVisivel({ existe: true, display: 'block', chars: 900, abas: 10 }) !== true || painelVisivel({ existe: true, display: 'none', chars: 1212, abas: 10 }) !== false || painelVisivel({ existe: true, display: 'block', chars: 900, abas: 0 }) !== false) throw new Error('ABORTA: painelVisivel não discrimina display no fixture (o caso chars=1212 com display:none é o medido)');
if (painelEscondido({ existe: true, display: 'none', chars: 1212, abas: 10 }) !== true || painelEscondido({ existe: true, display: 'block', chars: 0, abas: 0 }) !== false) throw new Error('ABORTA: painelEscondido não discrimina display no fixture');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P80_SELFTESTE_OK 4/0 — estaNaGaveta, gavetaAberta, painelVisivel e painelEscondido discriminam nos fixtures (0 rede, 0 chrome)');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = md5(shellTxt);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const SECT = (/const SECT = '([^']+)'/.exec(shellTxt.slice(shellTxt.indexOf('<script data-bfr-municipal-module="1"'), shellTxt.indexOf('</script>', shellTxt.indexOf('<script data-bfr-municipal-module="1"')))) || [])[1];
if (!SECT) throw new Error('ABORTA: sem SECT nos bytes servidos — a régua da gaveta não tem alvo');

const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const renova = async () => {
  for (let n = 0; n < 4; n++) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { S[PAPEL] = { ...S[PAPEL], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); return j; }
    if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) throw new Error('CADEIA QUEIMADA em ' + PAPEL + ': precisa de re-login com OK, não desta peça');
    await new Promise((rz) => setTimeout(rz, 2500 * (n + 1)));
  }
  throw new Error('refresh ' + PAPEL + ' falhou 4x');
};
const tok = await renova();

const PERFIL = `${DIR}/.p80-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
let out = {}; let fecho = false;
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, papel: PAPEL }, null, 2) + '\n'); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
const TETO_MS = BANDAS.length * 60000 + 90000;
setTimeout(() => abort(3, `watchdog ${TETO_MS} ms`), TETO_MS);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map(); const excecoes = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') excecoes.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 180));
};
const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
  const i = ++seq; const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method)); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expr, ms) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ms || 25000); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const espera = (ms) => E(`new Promise(rz => setTimeout(rz, ${ms}))`, ms + 15000);

const SNAP = (sect) => `(() => {
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const de = document.documentElement;
  const noEcra = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < de.clientHeight && r.right > 0 && r.left < de.clientWidth; };
  const disp = (el) => getComputedStyle(el).display;
  const drawer = document.getElementById('bfrMobileDrawer');
  const links = drawer ? [...drawer.querySelectorAll('[data-bfr-drawer-route]')] : [];
  const bottom = [...document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]')];
  const burger = document.querySelector('[data-bfr-open-drawer]');
  const vista = document.getElementById('bfrMunicipalView');
  const rt = window.BFR_APP_RUNTIME || {}; const pf = window.BFR_CURRENT_PROFILE || {};
  return {
    innerWidth: window.innerWidth, innerHeight: window.innerHeight,
    apresentacao: (document.getElementById('appShell') || {}).dataset ? (document.getElementById('appShell').dataset.presentation || null) : null,
    body_classes: String(document.body.className).slice(0, 130),
    papel_sessao: pf.role || null, active_view: rt.activeView || null,
    sidebar_display: document.querySelector('.sidebar') ? disp(document.querySelector('.sidebar')) : null,
    municipal_navs: [...document.querySelectorAll('[data-bfr-municipal-nav]')].map((b) => ({ classe: String(b.className).slice(0, 50), pai: String((b.parentElement && b.parentElement.className) || '').slice(0, 44), caixa: caixa(b), noEcra: noEcra(b), disp: disp(b) })),
    gatilho_bottom: bottom.map((b) => ({ route: b.dataset.bfrMobileRoute, rot: String(b.textContent || '').trim().slice(0, 18), caixa: caixa(b), noEcra: noEcra(b), ariaExpanded: b.getAttribute('aria-expanded') || null })),
    gatilho_burger: burger ? { caixa: caixa(burger), noEcra: noEcra(burger), ariaExpanded: burger.getAttribute('aria-expanded') || null } : null,
    gaveta: drawer ? { existe: true, classes: String(drawer.className).slice(0, 44), is_open: drawer.classList.contains('is-open'), ariaHidden: drawer.getAttribute('aria-hidden') || null, inert: drawer.inert === true, caixa: caixa(drawer), painel_caixa: (() => { const p = drawer.querySelector('.bfr-mobile-drawer-panel'); return p ? caixa(p) : null; })() } : { existe: false },
    gaveta_links: links.map((b) => ({ route: b.dataset.bfrDrawerRoute, rot: String(b.textContent || '').trim().slice(0, 30), caixa: caixa(b), noEcra: noEcra(b), ariaCurrent: b.getAttribute('aria-current') || null })),
    gaveta_link_alvo: (() => { const b = links.find((x) => x.dataset.bfrDrawerRoute === ${JSON.stringify(sect)}); return b ? { caixa: caixa(b), noEcra: noEcra(b), rot: String(b.textContent || '').trim().slice(0, 30) } : null; })(),
    vista: vista ? { existe: true, classes: String(vista.className).slice(0, 44), display: disp(vista), chars: String(vista.innerText || vista.textContent || '').length, abas: vista.querySelectorAll('[data-mun-tab]').length, escolas: vista.querySelectorAll('[data-mun-escola], .mun-school-row').length } : { existe: false },
    modal_a_frente: (() => { const m = document.querySelector('.modal:not([hidden]), [role=dialog]:not(#bfrMobileDrawer)'); if (!m) return null; const r = m.getBoundingClientRect(); return r.width > 0 ? { classe: String(m.className).slice(0, 40), caixa: caixa(m) } : null; })()
  };
})()`;

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 40; i++) { if (await E("!!document.querySelector('[data-bfr-municipal-nav]')")) break; await new Promise((r) => setTimeout(r, 500)); }
await E(`(() => { localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user }))}); return 1; })()`);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 80; i++) { if (await E('!!(window.BFR_MUNICIPAL && document.getElementById("appShell"))')) break; await new Promise((r) => setTimeout(r, 500)); }
await espera(2500);
await E(`(() => { const n = [...document.querySelectorAll('button, a')].find((b) => /agora nao|agora não/i.test(String(b.textContent || '').trim())); if (n) n.click(); return !!n; })()`);
await espera(1000);

const bandas = [];
for (const b of BANDAS) {
  const rec = { banda: `${b.larg}x${b.alt}`, passos: [] };
  await send('Emulation.setDeviceMetricsOverride', { width: b.larg, height: b.alt, deviceScaleFactor: 1, mobile: false }, 20000);
  await espera(1500);
  // Reset entre bandas: sem isto, a 2.ª e 3.ª bandas começariam com o painel já pintado pela 1.ª e o gate
  // «painel pintou depois do clique» não teria positivo possível por banda. Vai a «Início» pelo gatilho
  // pintado nessa banda e exige `chars === 0` antes de medir.
  const reinicio = await E(`(() => { const cs = [...document.querySelectorAll('#appShell .sidebar .nav-item[data-section="inicio"], #bfrMobileBottomNav [data-bfr-mobile-route="inicio"], #bfrMobileBottomNav [data-bfr-mobile-route="home"]')].filter((x) => x.getBoundingClientRect().width > 0); if (!cs.length) return { clicado: false }; cs[0].click(); return { clicado: true, rotulo: String(cs[0].textContent || '').trim().slice(0, 18) }; })()`);
  await espera(1500);
  rec.reinicio = reinicio;
  rec.antes = await E(SNAP(SECT));
  const mais = rec.antes.gatilho_bottom.filter((g) => /more|mais/i.test(g.route + g.rot)).find((g) => g.noEcra) || null;
  const burger = rec.antes.gatilho_burger && rec.antes.gatilho_burger.noEcra ? rec.antes.gatilho_burger : null;
  rec.abre_por = mais ? 'bottom-nav mais' : (burger ? 'burger' : 'nenhum gatilho pintado');
  if (rec.abre_por !== 'nenhum gatilho pintado') {
    const alvo = mais ? `[data-bfr-mobile-route="${mais.route}"]` : '[data-bfr-open-drawer]';
    const cx = mais ? Math.round(mais.caixa.x + mais.caixa.w / 2) : Math.round(burger.caixa.x + burger.caixa.w / 2);
    const cy = mais ? Math.round(mais.caixa.y + mais.caixa.h / 2) : Math.round(burger.caixa.y + burger.caixa.h / 2);
    rec.passos.push({ hit_teste_gatilho: { alvo, x: cx, y: cy, por_cima: await E(`(() => { const el = document.elementFromPoint(${cx}, ${cy}); return el ? el.tagName + '.' + String(el.className || '').slice(0, 40) : null; })()`) } });
    // Escada de abertura: (1) rato real por CDP (evento de confiança), (2) `.click()` sintético, (3) a mesma
    // chamada que o handler do shell faria. Cada degrau é medido a 0/400/1400 ms, porque um fecho assíncrono
    // só se vê na diferença entre os instantâneos — um único snapshot depois não distingue «não abriu» de
    // «abriu e fechou».
    const insta = async () => { const s = await E(SNAP(SECT)); return { is_open: s.gaveta.is_open, aria_hidden: s.gaveta.ariaHidden, inert: s.gaveta.inert, classes: s.gaveta.classes, painel_x: s.gaveta.painel_caixa ? s.gaveta.painel_caixa.x : null }; };
    const degraus = [];
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 }, 20000);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 }, 20000);
    degraus.push({ degrau: 'rato_real_cdp', instantaneos: [{ em_ms: 0, ...(await insta()) }] });
    await espera(400);
    degraus[0].instantaneos.push({ em_ms: 400, ...(await insta()) });
    if (!degraus[0].instantaneos.some((i) => i.is_open)) {
      await E(`(() => { const g = document.querySelector(${JSON.stringify(alvo)}); if (g) g.click(); return !!g; })()`);
      degraus.push({ degrau: 'click_sintetico', instantaneos: [{ em_ms: 0, ...(await insta()) }] });
      await espera(400);
      degraus[1].instantaneos.push({ em_ms: 400, ...(await insta()) });
    }
    await espera(1000);
    degraus.push({ degrau: 'ultimo_instantaneo', instantaneos: [{ em_ms: 1400, ...(await insta()) }] });
    rec.passos.push({ escada_abertura: degraus });
    await espera(1400);
    rec.gaveta_aberta = await E(SNAP(SECT));
    rec.passos.push({ gaveta: rec.gaveta_aberta.gaveta, links: rec.gaveta_aberta.gaveta_links.length });
    const link = rec.gaveta_aberta.gaveta_link_alvo;
    if (link && link.noEcra) {
      const lx = Math.round(link.caixa.x + link.caixa.w / 2);
      const ly = Math.round(link.caixa.y + link.caixa.h / 2);
      const h = await E(`(() => { const b = document.querySelector('[data-bfr-drawer-route="${SECT}"]'); if (!b) return { no_alvo: 'sem link' }; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const el = document.elementFromPoint(x, y); return { x, y, por_cima: el ? el.tagName + '.' + String(el.className || '').slice(0, 40) : null, e_o_proprio: !!(el && (el === b || b.contains(el))) }; })()`);
      rec.passos.push({ hit_teste_link: h });
      const rG = await send('Page.captureScreenshot', { format: 'png' }, 40000);
      if (rG && rG.data) { const p = `${DIR}/p80-gaveta-aberta-${b.larg}x${b.alt}-${SUF}.png`; writeFileSync(p, Buffer.from(rG.data, 'base64')); rec.png_gaveta = { caminho: p, bytes: Buffer.from(rG.data, 'base64').length }; }
      await E(`(() => { const b = document.querySelector('[data-bfr-drawer-route="${SECT}"]'); if (b) b.scrollIntoView({ block: 'center' }); return 1; })()`);
      await espera(500);
      const lc = await E(`(() => { const b = document.querySelector('[data-bfr-drawer-route="${SECT}"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), noEcra: r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom < document.documentElement.clientHeight }; })()`);
      rec.passos.push({ link_centro_para_rato: lc });
      if (lc && lc.noEcra) {
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: lc.x, y: lc.y, button: 'left', clickCount: 1 }, 20000);
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: lc.x, y: lc.y, button: 'left', clickCount: 1 }, 20000);
        await espera(1200);
        const aindaAberta = await E(`(() => { const d = document.getElementById('bfrMobileDrawer'); return d ? d.classList.contains('is-open') : null; })()`);
        if (!painelVisivel((await E(SNAP(SECT))).vista)) {
          rec.passos.push({ fallback_click_sintetico_link: await E(`(() => { const b = document.querySelector('[data-bfr-drawer-route="${SECT}"]'); if (b) b.click(); return !!b; })()`), gaveta_ainda_aberta_antes: aindaAberta });
        }
      } else {
        await E(`(() => { const b = document.querySelector('[data-bfr-drawer-route="${SECT}"]'); if (b) b.click(); return !!b; })()`);
      }
      await espera(4000);
      rec.depois_clique = await E(SNAP(SECT));
      const rP = await send('Page.captureScreenshot', { format: 'png' }, 40000);
      if (rP && rP.data) { const p = `${DIR}/p80-painel-apos-clique-${b.larg}x${b.alt}-${SUF}.png`; writeFileSync(p, Buffer.from(rP.data, 'base64')); rec.png_painel = { caminho: p, bytes: Buffer.from(rP.data, 'base64').length }; }
    }
  }
  rec.depois = rec.depois_clique || rec.gaveta_aberta || rec.antes;
  bandas.push(rec);
  const d = rec.depois;
  console.log(`${rec.banda.padEnd(10)} ap=${String(d.apresentacao).padEnd(7)} sidebar=${String(d.sidebar_display).padEnd(6)} links=${d.gaveta_links.length} municipal_na_gaveta=${estaNaGaveta(d.gaveta_links, SECT)} link_caixa=${JSON.stringify(d.gaveta_link_alvo ? d.gaveta_link_alvo.caixa : null)} gaveta=${d.gaveta.is_open ? 'aberta' : 'fechada'} painel=${d.vista.chars}B/${d.vista.abas}abas abre_por=${rec.abre_por}`);
}

fecho = true;
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}

const falhas = [];
for (const rec of bandas) {
  const aberta = rec.gaveta_aberta || rec.antes;
  const d = rec.depois_clique || rec.depois;
  if (d.apresentacao !== 'mobile') falhas.push(`banda nao esta em apresentacao mobile | banda=${rec.banda} ap=${d.apresentacao}`);
  if (!gavetaAberta(aberta.gaveta)) falhas.push(`gaveta nao abriu | banda=${rec.banda} gaveta=${JSON.stringify(aberta.gaveta)} abre_por=${rec.abre_por}`);
  if (!estaNaGaveta(aberta.gaveta_links, SECT)) falhas.push(`a ligacao municipal nao esta na lista da gaveta | banda=${rec.banda} links=${JSON.stringify(aberta.gaveta_links.map((l) => l.route))}`);
  else if (!aberta.gaveta_link_alvo || aberta.gaveta_link_alvo.noEcra !== true) falhas.push(`a ligacao municipal esta na gaveta mas sem caixa visivel | banda=${rec.banda} alvo=${JSON.stringify(aberta.gaveta_link_alvo)}`);
  if (!painelVisivel(d.vista)) falhas.push(`o painel nao passou a visivel depois do clique na gaveta | banda=${rec.banda} antes=${JSON.stringify(rec.antes.vista)} vista=${JSON.stringify(d.vista)}`);
  if (rec.reinicio.clicado !== true || !painelEscondido(rec.antes.vista)) falhas.push(`o reset antes da banda nao escondeu o painel, logo o gate de pintura e degenerado | banda=${rec.banda} reinicio=${JSON.stringify(rec.reinicio)} antes=${JSON.stringify(rec.antes.vista)}`);
}
out = {
  programa: 'scripts/p80-gaveta-movel-entrada-municipal.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'apresentacao mobile: a gaveta do shell movele tem a ligacao «Secretaria Municipal» e o clique nela pinta o painel?',
  metodo: 'chrome headless por banda; a gaveta aberta é a do shell movele (#bfrMobileDrawer, lista vinda de drawerItems()), nao o #mobileMoreMenu legado; cada clique tem hit-teste elementFromPoint antes. Zero DDL, zero deploy, zero escrita de produto.',
  ar: { url: URL_APP, md5_servido: MD5, sect: SECT },
  papel: PAPEL, bandas, excecoes: excecoes.slice(0, 8),
  o_que_este_verde_nao_autoriza: 'Prova so o caminho de acesso na apresentacao movele; nao prova numeros do painel nem autoriza publicar, DDL ou mudar o bundle.',
  falhas,
};
out.veredito = falhas.length === 0 ? `P80_GAVETA_MOVEL_MUNICIPAL_OK ${BANDAS.length} bandas` : `P80_GAVETA_MOVEL_MUNICIPAL_VERMELHO ${BANDAS.length} bandas ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
