#!/usr/bin/env node
// P79 — ONDE É QUE A ENTRADA «SECRETARIA MUNICIPAL» CAI, POR BANDA DE JANELA (21/11, noite).
// O print do usuário mostra a topbar com o seletor de personas e nenhuma coluna à esquerda. A P75 prova que o
// botão existe e tem `offsetWidth>0`; isto não diz se ele está dentro da caixa visível nem se o contentor dele
// está no ecrã. A P78 mediu uma banda de cada vez e, a 780 px, o `<aside class="sidebar">` veio `display:none`
// — ou seja, a apresentação do shell troca aos 800 px (e pela cláusula de paisagem) e o item municipal passa a
// viver só na gaveta «Mais». Esta peça percorre várias bandas na MESMA sessão de chrome, lê a apresentação
// declarada pelo próprio shell (`#appShell[data-presentation]` + classes do body), mede o retângulo de cada
// cópia do botão, abre a gaveta quando é preciso, faz hit-teste (`elementFromPoint`) antes de clicar e pergunta
// ao painel se pintou. Só-leitura: 0 DDL, 0 deploy, 0 escrita de produto; a única rede privilegiada é o refresh.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${DIR}/p79-onde-esta-municipal-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usa outro sufixo, nunca por cima');
const PORT = parseInt(process.env.AH2_PORT || '9399', 10);
const PAPEL = (process.env.P79_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

// ——— predicações puras, cada uma com o fixture que prova que discrimina ———
const BANDA = (process.env.P79_BANDAS || '1900x1080,1900x700,1366x768,1100x800,1000x600,950x600,820x900,780x900,780x400,500x900,390x844')
  .split(',').map((s) => { const m = /^(\d+)x(\d+)$/.exec(s.trim()); if (!m) throw new Error('ABORTA: banda malformada em P79_BANDAS: ' + s); return { larg: +m[1], alt: +m[2] }; });
const presentationEsperada = (w, h) => (w <= 800 || (w <= 1000 && h <= 500)) ? 'mobile' : w <= 1100 ? 'tablet' : 'web';
const temCopiaNaGaveta = (navs) => navs.some((n) => /mobile-more-grid/.test(String(n.paiClasse)));
const painelPintado = (vista) => !!vista && vista.existe === true && vista.chars > 200;
if (presentationEsperada(780, 900) !== 'mobile' || presentationEsperada(1000, 480) !== 'mobile' || presentationEsperada(1000, 600) !== 'tablet' || presentationEsperada(1101, 900) !== 'web') throw new Error('ABORTA: presentationEsperada não discrimina as três bandas no fixture');
if (temCopiaNaGaveta([{ paiClasse: 'nav-list bfr-platform-nav' }]) !== false || temCopiaNaGaveta([{ paiClasse: 'nav-list bfr-platform-nav' }, { paiClasse: 'mobile-more-grid' }]) !== true) throw new Error('ABORTA: temCopiaNaGaveta não discrimina os dois hospedeiros no fixture');
if (painelPintado({ existe: true, chars: 900 }) !== true || painelPintado({ existe: true, chars: 12 }) !== false || painelPintado({ existe: false, chars: 0 }) !== false) throw new Error('ABORTA: painelPintado não discrimina chars no fixture');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P79_SELFTESTE_OK 3/0 — presentationEsperada, temCopiaNaGaveta e painelPintado discriminam nos fixtures (0 rede, 0 chrome)');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = md5(shellTxt);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO + ' — cadeia em disco, não dactilografada');
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

const PERFIL = `${DIR}/.p79-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1400,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
let out = {}; let fecho = false;
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, papel: PAPEL, bandas: BANDA.map((b) => b.larg + 'x' + b.alt) }, null, 2) + '\n'); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
const TETO_MS = BANDA.length * 20000 + 120000;
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

const SNAP = `(() => {
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const de = document.documentElement;
  const noEcra = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < de.clientHeight && r.right > 0 && r.left < de.clientWidth; };
  const disp = (el) => getComputedStyle(el).display;
  const navs = [...document.querySelectorAll('[data-bfr-municipal-nav]')].map((b) => ({
    rotulo: String(b.textContent || '').trim().slice(0, 34), hidden: b.classList.contains('hidden'), munApto: b.dataset.munApto || null,
    classe: String(b.className).slice(0, 54), paiClasse: String((b.parentElement && b.parentElement.className) || '').slice(0, 54),
    caixa: caixa(b), noEcra: noEcra(b), display: disp(b), displayPai: b.parentElement ? disp(b.parentElement) : null,
    avoDisplay: (b.parentElement && b.parentElement.parentElement) ? disp(b.parentElement.parentElement) : null
  }));
  const side = document.querySelector('.sidebar');
  const sideItens = [...document.querySelectorAll('.sidebar .nav-item[data-section]')].map((b) => ({ s: b.dataset.section, caixa: caixa(b), noEcra: noEcra(b) }));
  const gavetaEl = document.getElementById('mobileMoreMenu') || document.querySelector('.mobile-more-grid');
  const gatilhos = [...document.querySelectorAll('[data-mobile-more]'), ...document.querySelectorAll('#bfrMobileBottomNav button, .mobile-bottom-nav button')].filter((b) => /mais/i.test(String(b.textContent || '')) || b.hasAttribute('data-mobile-more'));
  const gatilho = gatilhos.find(noEcra) || gatilhos[0] || null;
  const gatilhos_candidatos = gatilhos.map((b) => ({ rot: String(b.textContent || '').trim().slice(0, 20), classe: String(b.className).slice(0, 44), caixa: caixa(b), noEcra: noEcra(b), disp: disp(b) }));
  const vista = document.getElementById('bfrMunicipalView');
  return {
    innerWidth: window.innerWidth, innerHeight: window.innerHeight, clientW: de.clientWidth, clientH: de.clientHeight,
    apresentacao: (document.getElementById('appShell') || {}).dataset ? (document.getElementById('appShell').dataset.presentation || null) : null,
    appShell_classes: String((document.getElementById('appShell') || { className: '' }).className).slice(0, 60),
    body_classes: String(document.body.className).slice(0, 120),
    sidebar_existe: !!side, sidebar_display: side ? disp(side) : null, sidebar_caixa: side ? caixa(side) : null,
    sidebar_scroll: side ? { scrollH: side.scrollHeight, clientH: side.clientHeight, transborda_v: side.scrollHeight > side.clientHeight + 2 } : null,
    itens_sidebar: sideItens.length, itens_sidebar_no_ecra: sideItens.filter((i) => i.noEcra).length,
    municipal_navs: navs, municipal_no_dom: navs.length, municipal_visiveis: navs.filter((n) => n.noEcra).length,
    persona_bar_visiveis: [...document.querySelectorAll('.role-toggle button')].filter(noEcra).length,
    gaveta: gavetaEl ? { id: gavetaEl.id || null, classes: String(gavetaEl.className).slice(0, 54), display: disp(gavetaEl), aberta: !gavetaEl.classList.contains('hidden'), itens: gavetaEl.querySelectorAll('button').length, caixa: caixa(gavetaEl) } : null,
    gatilho_gaveta: gatilho ? { rot: String(gatilho.textContent || '').trim().slice(0, 20), caixa: caixa(gatilho), noEcra: noEcra(gatilho), ariaExpanded: gatilho.getAttribute('aria-expanded') || null } : null,
    gatilhos_candidatos,
    vista: vista ? { existe: true, classes: String(vista.className).slice(0, 54), display: disp(vista), chars: String(vista.innerText || vista.textContent || '').length, abas: vista.querySelectorAll('[data-mun-tab]').length } : { existe: false },
    modal_a_frente: (() => { const m = document.querySelector('.modal, [role=dialog]'); if (!m) return null; const r = m.getBoundingClientRect(); return r.width > 0 ? { classe: String(m.className).slice(0, 44), caixa: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } } : null; })()
  };
})()`;

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 40; i++) { if (await E("!!document.querySelector('[data-bfr-municipal-nav]')")) break; await new Promise((r) => setTimeout(r, 500)); }
await E(`(() => { localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user }))}); return 1; })()`);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 80; i++) { if (await E('!!(window.BFR_MUNICIPAL && document.getElementById("appShell"))')) break; await new Promise((r) => setTimeout(r, 500)); }
await espera(2500);
await E(`(() => { const n = [...document.querySelectorAll('button, a')].find((b) => /agora nao|agora não/i.test(String(b.textContent || '').trim())); if (n) n.click(); const x = document.querySelector('.modal [data-close], .modal .modal-close, [role=dialog] button[aria-label]'); if (x) x.click(); return { dispensado: !!n, fechado: !!x }; })()`);
await espera(1200);

const bandas = [];
for (const b of BANDA) {
  const rec = { banda: `${b.larg}x${b.alt}`, passos: [] };
  await send('Emulation.setDeviceMetricsOverride', { width: b.larg, height: b.alt, deviceScaleFactor: 1, mobile: false }, 20000);
  await espera(1400);
  rec.antes = await E(SNAP);
  rec.apresentacao_medida = rec.antes.apresentacao;
  rec.apresentacao_esperada_pela_media_query = presentationEsperada(b.larg, b.alt);
  const copiaGaveta = temCopiaNaGaveta(rec.antes.municipal_navs);
  rec.copia_na_gaveta_no_dom = copiaGaveta;
  if (rec.antes.municipal_visiveis === 0 && copiaGaveta) {
    const alvo = rec.antes.gatilho_gaveta && rec.antes.gatilho_gaveta.noEcra ? 'gatilho' : (rec.antes.gaveta && rec.antes.gaveta.aberta ? 'ja_aberta' : 'sem_gatilho');
    rec.passos.push({ abrir_gaveta_por: alvo });
    if (alvo === 'gatilho') {
      const cx = Math.round(rec.antes.gatilho_gaveta.caixa.x + rec.antes.gatilho_gaveta.caixa.w / 2);
      const cy = Math.round(rec.antes.gatilho_gaveta.caixa.y + rec.antes.gatilho_gaveta.caixa.h / 2);
      const ponteiro = await E(`(() => { const el = document.elementFromPoint(${cx}, ${cy}); return { no_alvo: ${JSON.stringify('gatilho')}, por_cima: el ? (el.tagName + '.' + String(el.className || '').slice(0, 40)) : null, mesmo: !!(el && (el.closest('[data-mobile-more]') || /mais/i.test(String(el.textContent || '')))) }; })()`);
      rec.passos.push({ hit_teste_gatilho: { x: cx, y: cy, ...ponteiro } });
      await E(`(() => { const cs = [...document.querySelectorAll('[data-mobile-more]'), ...document.querySelectorAll('#bfrMobileBottomNav button, .mobile-bottom-nav button')].filter((b) => /mais/i.test(String(b.textContent || '')) || b.hasAttribute('data-mobile-more')); const g = cs.find((b) => b.getBoundingClientRect().width > 0) || cs[0]; if (g) g.click(); return { clicado: !!g, rot: g ? String(g.textContent || '').trim().slice(0, 20) : null }; })()`);
      await espera(1200);
      rec.depois_abrir = await E(SNAP);
      const rG = await send('Page.captureScreenshot', { format: 'png' }, 40000);
      if (rG && rG.data) { const p = `${DIR}/p79-gaveta-aberta-${b.larg}x${b.alt}-${SUF}.png`; writeFileSync(p, Buffer.from(rG.data, 'base64')); rec.png_gaveta = { caminho: p, bytes: Buffer.from(rG.data, 'base64').length }; }
    } else if (alvo === 'sem_gatilho') {
      rec.depois_abrir = rec.antes;
    }
    const navGaveta = (rec.depois_abrir || rec.antes).municipal_navs.filter((n) => /mobile-more-grid/.test(n.paiClasse))[0] || null;
    rec.gaveta_municipal_caixa = navGaveta ? navGaveta.caixa : null;
    rec.gaveta_municipal_no_ecra = navGaveta ? navGaveta.noEcra : null;
    if (navGaveta && navGaveta.noEcra) {
      const gx = Math.round(navGaveta.caixa.x + navGaveta.caixa.w / 2);
      const gy = Math.round(navGaveta.caixa.y + navGaveta.caixa.h / 2);
      const h = await E(`(() => { const el = document.elementFromPoint(${gx}, ${gy}); const b = document.querySelector('.mobile-more-grid [data-bfr-municipal-nav]'); if (!b) return { no_alvo: 'sem botao', por_cima: null }; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const el2 = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); return { no_alvo: 'gaveta', x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), por_cima: el2 ? (el2.tagName + '.' + String(el2.className || '').slice(0, 40)) : null, e_o_proprio: !!(el2 && (el2 === b || b.contains(el2))) }; })()`);
      rec.passos.push({ hit_teste_item_gaveta: h });
      await E(`(() => { const b = document.querySelector('.mobile-more-grid [data-bfr-municipal-nav]'); if (b) b.click(); return !!b; })()`);
      await espera(3500);
      rec.depois_clique = await E(SNAP);
      rec.clique_atingiu = rec.depois_clique ? rec.depois_clique.vista : null;
    }
  } else if (rec.antes.municipal_visiveis > 0) {
    const vis = rec.antes.municipal_navs.filter((n) => n.noEcra)[0];
    const vx = Math.round(vis.caixa.x + vis.caixa.w / 2);
    const vy = Math.round(vis.caixa.y + vis.caixa.h / 2);
    const h = await E(`(() => { const el = document.elementFromPoint(${vx}, ${vy}); const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => x.getBoundingClientRect().width > 0); if (!b) return { no_alvo: 'sem botao' }; const r = b.getBoundingClientRect(); const el2 = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); return { no_alvo: 'sidebar', x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), por_cima: el2 ? (el2.tagName + '.' + String(el2.className || '').slice(0, 40)) : null, e_o_proprio: !!(el2 && (el2 === b || b.contains(el2))) }; })()`);
    rec.passos.push({ hit_teste_item_sidebar: h });
    await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => x.getBoundingClientRect().width > 0); if (b) b.click(); return !!b; })()`);
    await espera(3500);
    rec.depois_clique = await E(SNAP);
    rec.clique_atingiu = rec.depois_clique ? rec.depois_clique.vista : null;
    await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => x.getBoundingClientRect().width > 0); if (b) b.scrollIntoView({ block: 'center' }); return 1; })()`);
    await espera(600);
  }
  rec.depois = rec.depois_clique || rec.depois_abrir || rec.antes;
  if (rec.depois && rec.depois.modal_a_frente) rec.passos.push({ modal_a_frente: rec.depois.modal_a_frente });
  bandas.push(rec);
  const v = rec.depois || rec.antes;
  console.log(`${rec.banda.padEnd(10)} ap=${String(v.apresentacao).padEnd(7)} sidebar=${String(v.sidebar_display).padEnd(6)} navs_dom=${v.municipal_no_dom} visiveis=${v.municipal_visiveis} gaveta=${v.gaveta ? (v.gaveta.aberta ? 'aberta' : 'fechada') : '-'} painel=${v.vista.chars}B/${v.vista.abas}abas`);
}

const shot = async (nome, larg, alt) => {
  await send('Emulation.setDeviceMetricsOverride', { width: larg, height: alt, deviceScaleFactor: 1, mobile: false }, 20000);
  await espera(1200);
  const r = await send('Page.captureScreenshot', { format: 'png' }, 40000);
  const p = `${DIR}/p79-${nome}-${SUF}.png`;
  if (r && r.data) writeFileSync(p, Buffer.from(r.data, 'base64'));
  return r && r.data ? { caminho: p, bytes: Buffer.from(r.data, 'base64').length } : { caminho: p, bytes: 0 };
};
const pngs = [];
pngs.push({ banda: '1900x1080', ...(await shot('sidebar-larga', 1900, 1080)) });
pngs.push({ banda: '780x900', ...(await shot('gaveta-estreita', 780, 900)) });

fecho = true;
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}

const falhas = [];
for (const rec of bandas) {
  const v = rec.depois || rec.antes;
  if (v.apresentacao !== presentationEsperada(...rec.banda.split('x').map(Number))) falhas.push(`apresentacao nao bate | banda=${rec.banda} medida=${v.apresentacao} esperada=${presentationEsperada(...rec.banda.split('x').map(Number))}`);
  if (v.municipal_no_dom < 1) falhas.push(`nenhuma copia no DOM | banda=${rec.banda}`);
  const alcancavel = v.municipal_visiveis > 0 || (rec.gaveta_municipal_no_ecra === true);
  if (!alcancavel) falhas.push(`entrada nao alcancavel a vista nem por clique | banda=${rec.banda} sidebar=${v.sidebar_display} gaveta_caixa=${JSON.stringify(rec.gaveta_municipal_caixa)}`);
  if (!painelPintado(rec.clique_atingiu || v.vista)) falhas.push(`painel nao pintou depois do clique | banda=${rec.banda} chars_antes=${rec.antes.vista.chars} vista=${JSON.stringify((rec.clique_atingiu || v.vista))}`);
}
out = {
  programa: 'scripts/p79-onde-esta-entrada-municipal-varredura.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'em que banda a entrada «Secretaria Municipal» desaparece da vista, e a que caminho é que ela fica acessível?',
  metodo: 'uma sessão de chrome headless, várias bandas por Emulation.setDeviceMetricsOverride; a apresentação é lida do próprio shell (#appShell[data-presentation]); cada clique é precedido de elementFromPoint. Zero DDL, zero deploy, zero escrita de produto.',
  ar: { url: URL_APP, md5_servido: MD5 },
  media_query_do_shell: '(max-width: 800px), (orientation: landscape) and (max-width: 1000px) and (max-height: 500px) — lida de app/bfr-responsive-presentation.js:7',
  papel: PAPEL, bandas, pngs, excecoes: excecoes.slice(0, 8),
  o_que_este_verde_nao_autoriza: 'Não prova números do painel municipal nem autoriza publicar, DDL ou mudar o bundle: prova só onde a ENTRADA está em cada banda.',
  falhas,
};
out.veredito = falhas.length === 0 ? `P79_ONDE_ESTA_MUNICIPAL_OK ${bandas.length} bandas` : `P79_ONDE_ESTA_MUNICIPAL_VERMELHO ${bandas.length} bandas ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
