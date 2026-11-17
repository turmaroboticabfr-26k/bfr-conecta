// §5 do briefing: o mobile tem de ser testado a 320/360/375/390/414/430 px. A varredura AH-2-V abriu
// seções com element.click() a partir do JS — prova que a seção existe, não que um dedo chega a ela.
// Este instrumento só usa toques reais (Input.dispatchMouseEvent nas coordenadas do retângulo, depois de
// scrollIntoView) e declara INALCANÇÁVEL o botão que não está visível nem com o menu «mais» aberto. É
// essa a pergunta do §1/§11: a funcionalidade aparece no ecrã ou só no DOM?
// Por largura mede ainda: controles de navegação visíveis antes/depois do menu, alvos < 44 px, fontes
// < 11 px, estouro horizontal e tempo até o conteúdo assentar (teto 6 s, o mesmo da varredura).
// Só-leitura no ar: 0 escrita, 0 DDL, 0 deploy. Uso: node scripts/ah2-mobile.mjs <papel> <320,360> <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const LARGURAS = (process.argv[3] || '320,360').split(',').map((n) => parseInt(n, 10));
const ROTULO = process.argv[4] || '17-11';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2m-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-mobile-${ROTULO}.json`;
const PORT = 9357;
const ALTURA = 720;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outra largura ou rótulo');
if (LARGURAS.some((w) => ![320, 360, 375, 390, 412, 414, 430, 360].includes(w)) && LARGURAS.some((w) => w < 300 || w > 500)) throw new Error('ABORTA: larguras fora da banda mobile: ' + LARGURAS.join(','));
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });

const contas = JSON.parse(readFileSync(`${DIR}/bfr-conecta/evidence/ah2-contas-17-11.json`, 'utf8'));
const conta = contas.contas.find((c) => c.papel === PAPEL);
if (!conta) throw new Error('ABORTA: sem conta ' + PAPEL + ' no registo do ciclo');
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
// mapa declarado, lido do ar (o mesmo recorte da varredura, não uma suposição sobre o nome da constante)
const ini = shellTxt.indexOf('roleSectionAccess = {');
if (ini === -1) throw new Error('ABORTA: roleSectionAccess não está nas bytes servidas — o mapa mudou de forma');
const bloco = shellTxt.slice(ini + 'roleSectionAccess = '.length, shellTxt.indexOf('};', ini) + 1);
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const TRADUCAO = { developer: 'admin', pedagogical: 'teacher', social_work: 'multiprofessional', psychology: 'psychology' };
const secoesDe = (role) => {
  const v = TRADUCAO[role] || role;
  if (v === 'admin') return [...new Set([...MAPA.admin, 'psychology', 'multiprofissional'])];
  return MAPA[v] || [];
};
const renova = async () => {
  let ultimo = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }) });
      const t = await r.text(); let js = null; try { js = JSON.parse(t); } catch { ultimo = `HTTP ${r.status} nao-JSON`; await new Promise((z) => setTimeout(z, 1500 * (tentativa + 1))); continue; }
      if (!r.ok || !js.access_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(js).slice(0, 140)}`);
      S[PAPEL] = { ...S[PAPEL], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
      writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) {
      ultimo = String(e.message || e).slice(0, 150);
      if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada, é preciso re-mint — ' + ultimo);
      await new Promise((z) => setTimeout(z, 1500 * (tentativa + 1)));
    }
  }
  throw new Error('renova(' + PAPEL + ') esgotou 3 tentativas: ' + ultimo);
};

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURAS[0]},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
let aperta = false;
setTimeout(() => { aperta = true; console.log('PRAGA 470 s: fechar com o que foi medido'); }, 470000);
setTimeout(() => abort(3, 'watchdog 550 s'), 550000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
const consola = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) consola.push((m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 220));
  if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') consola.push('[rede] ' + String(m.params.entry.text || '').slice(0, 200));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 75000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
// O toque: coordenadas do retângulo, depois de scrollIntoView({block:'center'}). mousePressed +
// mouseReleased no centro — é o mesmo par de eventos que um dedo produz no browser.
const toca = async (x, y) => {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
const RETANGULO = (sel) => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; const vis = !!(b.offsetWidth || b.offsetHeight); if (!vis) return { invisivel: true }; b.scrollIntoView({ block: 'center', inline: 'center' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; })()`;
// Régua do painel visível mais populoso + o que o app declara como seção ativa (a régua da varredura).
const MEDIR = `(async () => {
  const cs = (e) => getComputedStyle(e); const vis = (e) => { const r = e.getBoundingClientRect(); return cs(e).display !== 'none' && cs(e).visibility !== 'hidden' && r.width > 50 && r.height > 40; };
  const cand = () => Array.from(document.querySelectorAll('[id$="Panel"], [id$="View"], [id$="Section"], section, main')).filter(e => e.id && vis(e));
  const car = () => { let m = null, mc = -1; for (const e of cand()) { const c = (e.innerText || '').trim().length; if (c > mc) { mc = c; m = e; } } return { id: m ? m.id : null, c: mc }; };
  let ant = -1, est = 0, ms = 0; const t0 = Date.now();
  while (est < 2 && ms < 6000) { await new Promise(r => setTimeout(r, 600)); ms = Date.now() - t0; const a = car(); if (a.c === ant && ant >= 0) est++; else est = 0; ant = a.c; }
  const alvo = car(); const el = alvo.id ? document.getElementById(alvo.id) : null;
  const ctl = el ? Array.from(el.querySelectorAll('button, input, select, textarea, a, [role="button"]')).filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) : [];
  const taps = ctl.filter(c => { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; });
  const folhas = el ? Array.from(el.querySelectorAll('*')).filter(f => { const d = Array.from(f.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim(); if (!d) return false; const fs = parseFloat(cs(f).fontSize); return fs > 0 && fs < 11 && f.getBoundingClientRect().width > 0; }) : [];
  return { painel: alvo, ms, assentou: est >= 2, controles: ctl.length, tap: taps.length, fonte: folhas.length,
    estouro_h: (document.body?.scrollWidth || 0) > window.innerWidth + 1, largura: window.innerWidth,
    seccao_ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, view_apos: window.BFR_APP_RUNTIME?.activeView ?? null };
})()`;

const out = { ciclo: 'AH-7-MOBILE', em: new Date().toISOString(), papel: PAPEL, larguras: LARGURAS, altura: ALTURA, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), toque: 'Input.dispatchTouchEvent + dispatchMouseEvent nas coordenadas do retângulo', declaradas: secoesDe(PAPEL).length, bandas: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Emulation.setDeviceMetricsOverride', { width: LARGURAS[0], height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
const declaradas = secoesDe(PAPEL);
for (const w of LARGURAS) {
  if (aperta) { (out.faltaram = out.faltaram || []).push('largura ' + w); continue; }
  const b = { toque_em: null };
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 45000).catch(() => {});
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
  await send('Page.navigate', { url: URL_APP });
  let erro_boot = null;
  b.ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 70000).catch((e) => { erro_boot = String(e.message).slice(0, 110); return null; });
  consola.length = 0;
  // 1) o que um dedo vê sem tocar em nada
  b.nav_antes = await E(`(() => { const l = Array.from(document.querySelectorAll('button[data-section]')).filter(x => !x.hasAttribute('data-teacher-nav-tab') && (x.offsetWidth || x.offsetHeight)); return { visiveis: l.length, rotulos: l.slice(0, 14).map(x => (x.textContent || '').trim().slice(0, 18)), tem_menu_mais: !!document.querySelector('[data-mobile-more]'), menu_mais_visivel: !!(document.querySelector('[data-mobile-more]')?.offsetWidth || document.querySelector('[data-mobile-more]')?.offsetHeight), dock: !!document.querySelector('#bfrHomeDock') }; })()`);
  gate(`${w}px: o boot abriu no shell do papel`, erro_boot, null);
  // 2) abrir o menu «mais» com um toque real e contar outra vez
  if (b.nav_antes?.tem_menu_mais && b.nav_antes?.menu_mais_visivel) {
    const r = await E(RETANGULO('[data-mobile-more]'));
    if (r && !r.invisivel) { await toca(r.x, r.y); await dorme(700); b.toque_em = r; }
    b.nav_depois_do_menu = await E(`(() => { const l = Array.from(document.querySelectorAll('button[data-section], .mobile-more-option[data-section]')).filter(x => (x.offsetWidth || x.offsetHeight)); return { visiveis: l.length, rotulos: l.slice(0, 20).map(x => (x.textContent || '').trim().slice(0, 18)) }; })()`);
    gate(`${w}px: o menu «mais» abriu com um toque real`, (b.nav_depois_do_menu?.visiveis || 0) > (b.nav_antes?.visiveis || 0), true);
  }
  // 3) percorrer as seções declaradas só a toque, sem element.click() no JS
  const mapa = {};
  for (const s of declaradas) {
    if (aperta) { (b.pela_praga = b.pela_praga || []).push(s); break; }
    // o menu fecha-se a cada navegação: reabrir sempre que o botão-alvo não estiver visível
    let r = await E(RETANGULO(`button[data-section="${s}"]`));
    if ((!r || r.invisivel) && (b.nav_antes?.tem_menu_mais)) {
      const rm = await E(RETANGULO('[data-mobile-more]'));
      if (rm && !rm.invisivel) { await toca(rm.x, rm.y); await dorme(450); }
      r = await E(RETANGULO(`button[data-section="${s}"], .mobile-more-option[data-section="${s}"]`));
    }
    if (!r) { mapa[s] = { sem_botao: true }; continue; }
    if (r.invisivel) { mapa[s] = { incalcanavel: true }; continue; }
    if (r.y < 0 || r.y > ALTURA || r.x < 0 || r.x > w) { mapa[s] = { fora_do_ecra: r }; continue; }
    const antes = await E(`window.BFR_APP_RUNTIME?.activeSection ?? null`);
    await toca(r.x, r.y);
    const m = await E(MEDIR);
    m.toque = r; m.antes = antes;
    mapa[s] = m;
    const rec = mapa[s];
    console.log(`  ${w}px/${s}: ${rec.painel.c > 0 ? rec.painel.id + ' ' + rec.painel.c + 'c' : 'VAZIO'} ${rec.ms}ms${rec.assentou ? '' : ' NAO-ASSENTOU'} ctl=${rec.controles} tap<${rec.tap} fonte<${rec.fonte}${rec.estouro_h ? ' ESTOURO-H' : ''} ativa=${rec.seccao_ativa}`);
    if (rec.view_apos && rec.view_apos !== PAPEL && PAPEL !== 'developer') { await E(`window.BFR_APP_RUNTIME?.setRole(${JSON.stringify(PAPEL)})`); await dorme(700); }
  }
  b.seccoes = mapa;
  b.abertas = Object.values(mapa).filter((v) => v.painel).length;
  b.vazias = Object.entries(mapa).filter(([, v]) => v.painel && v.painel.c === 0).map(([k]) => k);
  b.inalcancaveis = Object.entries(mapa).filter(([, v]) => v.incalcanavel || v.sem_botao || v.fora_do_ecra).map(([k, v]) => k + ':' + (v.incalcanavel ? 'inalcancavel' : v.sem_botao ? 'sem_botao' : 'fora_do_ecra'));
  b.sem_navegacao = Object.entries(mapa).filter(([, v]) => v.painel && v.seccao_ativa && v.seccao_ativa !== v.painel.id.replace(/View|Panel|Section/, '') && v.antes !== v.seccao_ativa).map(([k, v]) => k + '→' + v.seccao_ativa);
  b.estouro = Object.entries(mapa).filter(([, v]) => v.estouro_h).map(([k]) => k);
  b.nao_assentaram = Object.entries(mapa).filter(([, v]) => v.painel && !v.assentou).map(([k]) => k + '@' + v.ms);
  b.tap_miudo = Object.values(mapa).reduce((a, v) => a + (v.tap || 0), 0);
  b.fonte_miuda = Object.values(mapa).reduce((a, v) => a + (v.fonte || 0), 0);
  b.erros = consola.filter((t) => !/favicon|Google API|installTrigger|Service-Worker|Failed to load resource|WebSocket|chunkloaderror|net::ERR/i.test(t)).slice(0, 8);
  out.bandas[w] = b;
  gate(`${w}px: chegou ao shell e abriu seções a toque`, b.abertas > 0, true);
  gate(`${w}px: 0 seções inalcancáveis a toque`, b.inalcancaveis, []);
  gate(`${w}px: 0 painéis vazios entre as ${b.abertas} abertas`, b.vazias, []);
  gate(`${w}px: 0 estouro horizontal`, b.estouro, []);
  gate(`${w}px: 0 erros de consola de aplicação`, b.erros, []);
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
}
out.portoes = portoes; out.falhas = falhas;
out.medido = { larguras: Object.keys(out.bandas).length, incompleto: (out.faltaram || []).length + Object.values(out.bandas).filter((b) => b.pela_praga).length };
out.veredito = falhas.length ? 'AH7_MOBILE_COM_DEFEITOS' : (out.medido.incompleto ? 'AH7_MOBILE_PARCIAL' : 'AH7_MOBILE_LIMPO');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ` (${PAPEL} @ ${LARGURAS.join('/')})`);
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
