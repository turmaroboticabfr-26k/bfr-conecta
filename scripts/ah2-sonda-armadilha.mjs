// AH-7c-ARMADILHA — no cov1 (coordinator @390) o painel «fotos» enterrou a navegação: o contentor
// #bfrStudentPhotoManager é position:fixed com z-index 12000 e cobre o ecrã todo, por cima da barra
// (z 1200) e da gaveta (z 1500), e o toque no «Mais» bate no conteúdo da secção. A pergunta que falta
// para graduar a gravidade não é «tapa?», é «há saída?»: se a própria secção oferecer um controlo visível
// e tocável (× / voltar / fechar), é um diálogo com escape; se não, um dedo que entra em «fotos» só sai
// com o gesto do sistema. Este programa entra na rota A TOQUE, com a mesma régua de ponto tocável do
// instrumento de varredura, e descreve os controlos que a secção oferece e o que acontece depois de os
// apertar. Só-leitura no ar: 0 escrita, 0 DDL, 0 deploy.
// Uso: node scripts/ah2-sonda-armadilha.mjs <papel> <largura> <rotulo> <rota>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const W = parseInt(process.argv[3] || '390', 10);
const ROT = process.argv[4] || 'a1';
const ROTA = process.argv[5] || 'fotos';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2sa-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-armadilha-${ROT}.json`;
const ALTURA = 720;
const PORT = 9366;
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
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }) });
      const js = await r.json().catch(() => null);
      if (!r.ok || !js?.access_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(js).slice(0, 120)}`);
      S[PAPEL] = { ...S[PAPEL], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
      writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) { ultimo = String(e.message || e).slice(0, 140); if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada — ' + ultimo); await new Promise((z) => setTimeout(z, 1800 * (t + 1))); }
  }
  throw new Error('renova esgotou: ' + ultimo);
};
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${W},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 260 s'), 260000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page');
let fecho = false; const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 260)); return r.result?.value; };
const waitFor = async (e, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 90)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
// Só toque (o par toque+ratinho produz dois cliques e desfaz toggles — provado na sonda da gaveta).
const toca = async (x, y) => { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const RET = (sel) => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; const cs = getComputedStyle(b);
  if (!(b.offsetWidth || b.offsetHeight) || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || cs.display === 'none') return { invisivel: true };
  b.scrollIntoView({ block: 'center', inline: 'center' }); const r = b.getBoundingClientRect();
  const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); if (!r.width || !r.height) return { invisivel: true };
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { fora_do_ecra: { x, y } };
  const topo = document.elementFromPoint(x, y); if (!(topo === b || b.contains(topo))) return { tapado: { x, y, topo: topo ? topo.tagName.toLowerCase() + '.' + String(topo.className || '').split(/\\s+/)[0] : null } };
  return { x, y }; })()`;
const tocavel = (r) => r && !r.invisivel && !r.fora_do_ecra && !r.tapado;
// O estado, sempre pelo mesmo canudo: quem está por cima de cada controlo de navegação.
const BARRA = `(() => { const id = (e) => e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/)[0] : '') : null;
  const alvos = Array.from(document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]')).map(b => ['barra:' + b.dataset.bfrMobileRoute, b]).concat(Array.from(document.querySelectorAll('[data-bfr-open-drawer]')).map(b => ['hamburguer', b]));
  const livres = [];
  for (const [n, b] of alvos) { const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const topo = document.elementFromPoint(x, y);
    let e = topo, culpado = null; while (e && e !== document.body) { const c = getComputedStyle(e); if (c.position === 'fixed' && parseInt(c.zIndex || '0', 10) >= 1000) { culpado = id(e) + ' z=' + c.zIndex; break; } e = e.parentElement; }
    livres.push({ n, livre: topo === b || b.contains(topo), topo: id(topo), culpado }); }
  const m = document.getElementById(${JSON.stringify('bfrStudentPhotoManager')}); const cm = m ? getComputedStyle(m) : null;
  return { ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, gaveta_aberta: !!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open'),
    manager: m ? { existe: true, pos: cm.position, z: cm.zIndex, disp: cm.display, vis: cm.visibility, caixa: (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(m.getBoundingClientRect()) } : { existe: false },
    controlos: m ? Array.from(m.querySelectorAll('button, [role="button"], a')).slice(0, 40).map(b => { const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const topo = (x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight) ? document.elementFromPoint(x, y) : null;
      return { txt: (b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 22), aria: b.getAttribute('aria-label'), title: b.getAttribute('title'), classe: String(b.className || '').split(/\\s+/)[0], caixa: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, visivel: !!(b.offsetWidth || b.offsetHeight) && r.width > 0 && r.height > 0, no_ecra: x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight, livre: topo === b || b.contains(topo) }; }) : [], barra: livres }; })()`;

const out = { ciclo: 'AH-7c-ARMADILHA', em: new Date().toISOString(), papel: PAPEL, largura: W, rota: ROTA, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), passos: [] };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 70000);
await dorme(1500);
out.passos.push({ o: 'boot', e: await E(BARRA) });
const rm = await E(RET('.modal:not(.hidden) .modal-close'));
if (tocavel(rm)) { await toca(rm.x, rm.y); await dorme(700); }
out.passos.push({ o: 'modal', tocavel: !!rm, e: await E(BARRA) });
// entrar na rota pelo caminho do utilizador: barra se estiver lá, senão gaveta
const rb = await E(RET(`#bfrMobileBottomNav [data-bfr-mobile-route="${ROTA}"]`));
let via = null;
if (tocavel(rb)) { await toca(rb.x, rb.y); via = 'barra'; }
else {
  const rmais = await E(RET('#bfrMobileBottomNav [data-bfr-mobile-route="more"]'));
  if (tocavel(rmais)) { await toca(rmais.x, rmais.y); await dorme(600); }
  const rl = await E(RET(`#bfrMobileDrawer [data-bfr-drawer-route="${ROTA}"]`));
  if (tocavel(rl)) { await toca(rl.x, rl.y); via = 'gaveta'; } else out.entrada_recusada = rl || { sem_link: true };
}
await E(`new Promise(r => setTimeout(r, 2800))`);
const dentro = await E(BARRA);
out.passos.push({ o: 'dentro_da_rota', via, alvo_do_toque: tocavel(rb) ? rb : null, e: dentro });
out.entrada_efectiva = dentro.ativa === ROTA;
// a secção oferece saída? um botão do próprio manager, visível, no ecrã e livre por cima
const saida = (dentro.controlos || []).find((c) => c.visivel && c.no_ecra && c.livre && /voltar|fechar|sair|×|✕|close|início|inicio/i.test(`${c.txt} ${c.aria || ''} ${c.title || ''} ${c.classe}`));
out.saida_oferecida = saida || null;
// apertar a saída pelo centro do próprio controlo (toque real, não .click())
if (saida) {
  const x = saida.caixa.x + Math.round(saida.caixa.w / 2), y = saida.caixa.y + Math.round(saida.caixa.h / 2);
  await toca(x, y); await E(`new Promise(r => setTimeout(r, 2600))`);
  out.passos.push({ o: 'depois_da_saida', toque: { x, y }, e: await E(BARRA) });
}
// e se não houver saída: a barra de baixo ainda responde a um toque no centro?
const rin = await E(RET('#bfrMobileBottomNav [data-bfr-mobile-route="inicio"]'));
out.barra_inicio_tocavel_agora = rin && !rin.invisivel && !rin.tapado && !rin.fora_do_ecra ? 'sim' : (rin ? (rin.tapado ? 'nao_tapado_por_' + rin.tapado.topo : 'nao_' + (rin.invisivel ? 'invisivel' : 'fora_do_ecra')) : 'nao_sem_botao');
if (tocavel(rin)) { await toca(rin.x, rin.y); await E(`new Promise(r => setTimeout(r, 2400))`); out.passos.push({ o: 'barra_inicio_apertada', e: await E(BARRA) }); }
const final = out.passos[out.passos.length - 1].e;
out.veredito = final.ativa !== ROTA ? 'SAIDA_EXISTE_A_NAVEGACAO_NAO_FICA_PRESA' : (saida ? 'ARMADILHA_A_SAIDA_NAO_CHEGA' : 'ARMADILHA_SEM_SAIDA_TOCAVEL');
console.log('via=' + via + ' dentro.ativa=' + dentro.ativa + ' manager=' + JSON.stringify(dentro.manager));
console.log('barr_livre_ao_entrar=' + dentro.barra.filter((b) => b.livre).length + '/' + dentro.barra.length + ' culpado=' + (dentro.barra.find((b) => !b.livre) || {}).culpado);
(dentro.controlos || []).slice(0, 18).forEach((c) => console.log(`  ctl "${c.txt}" a=${c.aria} cls=${c.classe} ${c.caixa.w}x${c.caixa.h}@${c.caixa.y} vis=${c.visivel} no_ecra=${c.no_ecra} livre=${c.livre}`));
console.log('saida_oferecida=' + JSON.stringify(out.saida_oferecida));
console.log('barra_inicio_tocavel_agora=' + out.barra_inicio_tocavel_agora + ' ativa_final=' + final.ativa);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(out.veredito + ' · ' + OUT.split('/').pop());
fecho = true; abort(0, 'fecho normal');
