// AH-7b — §5 do briefing corrido com o markup CERTO. A primeira passagem (ah2-mobile.mjs, rótulo m-coord)
// procurou `button[data-section]` e `[data-mobile-more]`: isso é a barra do DESKTOP, que em ≤800 px está
// `display:none` por decisão do próprio app. O que um telemóvel tem, lido em app/bfr-responsive-presentation.js
// (createNav, :399-419; routes, :384-397; drawer, :130-190), é `#bfrMobileBottomNav
// button[data-bfr-mobile-route]` (4 rotas primárias + «Mais»), o hamburger `[data-bfr-open-drawer]` e os
// links `#bfrMobileDrawer [data-bfr-drawer-route]`. Medir com o markup errado deu 12 portões vermelhos e
// zero seções abertas — era o medidor, não a app. Este instrumento toca só no que o telemóvel mostra, e
// prova antes que a app se declarou em modo «mobile».
// Toque real: Emulation.setTouchEmulationEnabled + Input.dispatchTouchEvent/mousePressed no centro do
// retângulo; nunca element.click() nem BFR_APP_RUNTIME.navigate.
// Só-leitura no ar: 0 escrita, 0 DDL, 0 deploy, 0 screenshot (as vistas têm nomes de alunos).
// Uso: node scripts/ah2-mobile2.mjs <papel> <larguras csv> <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const LARGURAS = (process.argv[3] || '320,360,375,390,414,430').split(',').map((n) => parseInt(n, 10));
const ROTULO = process.argv[4] || '17-11';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PORT = parseInt(process.env.AH2_PORT || '9361', 10);
// Um Chrome órfão de um lançamento cortado deixa a directoria de perfil bloqueada (EPERM no rmSync) e a
// série inteira morre no arranque — foi o que aconteceu nas duas janelas de 9 minutos. Perfil único por
// rótulo e por porta: nunca há lock partilhado a herdar de uma execução anterior.
const PERFIL = `${DIR}/.ah2m2-${ROTULO}-${PORT}`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-mobile2-${ROTULO}.json`;
const ALTURA = 720;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const contas = JSON.parse(readFileSync(`${DIR}/bfr-conecta/evidence/ah2-contas-17-11.json`, 'utf8'));
const conta = contas.contas.find((c) => c.papel === PAPEL);
if (!conta) throw new Error('ABORTA: sem conta ' + PAPEL + ' no registo do ciclo');
// O GoTrue roda o refresh token a cada uso e o instrumento escreve o par novo de volta. Com vários papéis
// em paralelo, dois processos a reescrever o mesmo ficheiro queimam a cadeia um do outro — por isso a
// grelha passa a cada filho o seu próprio ficheiro de sessão (AH2_SESSAO) e é o condutor a fundi-los.
const SESSAO = process.env.AH2_SESSAO || `${DIR}/ah2-sessions.json`;
const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
// O mapa declarado vem das bytes servidas (mesmo recorte da varredura): é o contrato do que o papel tem
// direito a abrir, e serve para dizer se alguma seção declarada não tem rota nenhuma no telemóvel.
const ini = shellTxt.indexOf('roleSectionAccess = {');
if (ini === -1) throw new Error('ABORTA: roleSectionAccess não está nas bytes servidas — o mapa mudou de forma');
const bloco = shellTxt.slice(ini + 'roleSectionAccess = '.length, shellTxt.indexOf('};', ini) + 1);
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const TRADUCAO = { developer: 'admin', pedagogical: 'teacher', social_work: 'multiprofessional', psychology: 'psychology' };
const secoesDe = (role) => { const v = TRADUCAO[role] || role; if (v === 'admin') return [...new Set([...(MAPA.admin || []), 'psychology', 'multiprofissional'])]; return MAPA[v] || []; };

const renova = async () => {
  let ultimo = null;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
      const js = await r.json().catch(() => null);
      if (!r.ok || !js?.access_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(js).slice(0, 140)}`);
      S[PAPEL] = { ...S[PAPEL], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
      writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) { ultimo = String(e.message || e).slice(0, 150); if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada — ' + ultimo); await new Promise((z) => setTimeout(z, 1500 * (t + 1))); }
  }
  throw new Error('renova(' + PAPEL + ') esgotou 3 tentativas: ' + ultimo);
};

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURAS[0]},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
// O watchdog NÃO pode sair sem artefacto. Foi assim que a vaga 5 (sports_operator, education_supervisor, 511 s
// cada) e o `m5-coordinator-9` (praga aos 229 s, watchdog aos 314 s) deixaram 0 células e 0 pistas: `abort()`
// era só taskkill + exit. Escreve o parcial com `INTERROMPIDA` e `falha_em`; as bandas já medidas ficam lá, e
// `out`/`falhas`/`portoes` podem ainda não existir (o abort da linha 82 dispara antes da declaração de `out`,
// e um `const` em TDZ rebenta a corrida — por isso o try/catch, não por prudência estética).
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  // `fecho normal` é a saída limpa: o artefacto bom já foi escrito logo acima, e re-escrevê-lo com
  // `INTERROMPIDA`/`em_parcial` mentiria sobre a identidade da corrida — os leitores (e a matriz de repetição)
  // usam `em_parcial` precisamente para separar «morreu a meio» de «acabou».
  if (m === 'fecho normal') { console.log('PAROU: ' + m); process.exit(c); }
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, portoes, falhas: falhas.slice(), em_parcial: true }, null, 2) + '\n'); console.log('PARCIAL escrito em ' + OUT.split('/').pop()); }
  catch (e) { try { writeFileSync(OUT, JSON.stringify({ ciclo: 'AH-7b-MOBILE', papel: PAPEL, larguras: LARGURAS, INTERROMPIDA: m, falha_em: String(e.message || e).slice(0, 120), em_parcial: true }, null, 2) + '\n'); } catch {} }
  console.log('PAROU: ' + m); process.exit(c);
};
// Nenhum `await` do laço por largura tem try/catch próprio, e uma rejeição que escapa mata o processo ANTES de
// chegar ao watchdog — foi precisamente assim que `m5-pending-13` (CDP `Page.navigate` sem ack) deixou 0
// artefacto e 0 pista, o defeito que a vaga 5 tinha denunciado. Os dois fechos globais chamam o mesmo `abort`,
// que escreve o parcial com `INTERROMPIDA` e sai com código não-zero.
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
let aperta = false;
// O condutor da grelha (§5) corre um processo por célula dentro de uma janela de shell limitada; sem isto
// o processo-filho arrancado aos 400 s ultrapassaria a janela e seria morto sem escrever artefacto. Com
// AH2_TETO_MS o filho fecha-se sozinho com o que mediu e o condutor retoma a lista no lançamento a seguir.
const TETO = Math.min(455000, Math.max(45000, parseInt(process.env.AH2_TETO_MS || '455000', 10)));
setTimeout(() => { aperta = true; console.log(`PRAGA ${Math.round(TETO / 1000)} s: fechar com o que foi medido`); }, TETO);
setTimeout(() => abort(3, `watchdog ${Math.round((TETO + 85000) / 1000)} s`), TETO + 85000);
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
// Chamada CDP sem resposta pendurava o processo para sempre: a promessa de `send` não tinha limite, o `waitFor`
// faz `try { await E() } catch {}` e por isso nunca sairia do loop se o evaluate não regressasse (contexto
// destruído por navegação). O teto é POR MÉTODO, porque as duas famílias têm naturezas de ack diferentes:
// `Runtime.evaluate` é a chamada que o `waitFor` repete de 350 em 350 ms e a espera mais longa pedida à página
// foi medida em 1 200 ms — 60 s é > 50x isso e não amacia régua nenhuma. `Page.navigate` não tem ack até a
// navegação assentar; um 60 s igual ao do evaluate matou `m5-pending-13` no `navigate` da barreira de
// pendência, sem banda escrita. Erro nomeado continua a ser o objectivo: o `abort` grava o parcial.
const PRAZO_CDP = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq;
  const prazo = PRAZO_CDP(method);
  const temporizador = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + Math.round(prazo / 1000) + ' s (id ' + i + ')')); } }, prazo);
  pend.set(i, { res: (v) => { clearTimeout(temporizador); res(v); }, rej: (e) => { clearTimeout(temporizador); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(temporizador); rej(e); }
});
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
// UM toque = UMA pressão de dedo. A versão anterior enviava touchStart/touchEnd e depois
// mousePressed/mouseReleased: o browser sintetiza o click do touchEnd, pelo que os dois pares dão DOIS
// clicks por gesto. Em botões de navegação isso é invisível (navegar para a mesma seção é idempotente) mas
// num botão toggle é fatal — o «Mais» da barra inferior (bfr-responsive-presentation.js:515 faz
// setMenu(!is-open)) abria e fechava no mesmo gesto e o instrumento media «a gaveta não abre ao toque».
// ah2-sonda-gaveta-390e mede os dois modos: só toque → aberta=true; touch+mouse → aberta=false.
const toca = async (x, y) => {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
// Retângulo TOCÁVEL: a gaveta é `overflow:auto` com 17 links e o ecrã tem 720 px — os últimos têm caixa,
// têm offsetHeight, mas ficam FORA do viewport e o toque nesse y não bate em lado nenhum (foi assim que o
// calib3 perdeu 6 rotas depois de «resultados-aprendizagem» sem que a app tivesse qualquer defeito: a sonda
// ah2-sonda-resultados-res1 mostra a barra e a gaveta a responder depois da vista). Por isso: rolar como o
// dedo faria, e só depois exigir que o ponto esteja dentro do viewport e que elementFromPoint devolva o
// próprio alvo. O que falhar qualquer teste devolve a razão em vez de um ponto cego.
const RET = (sel) => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null;
  const cs = getComputedStyle(b);
  if (!(b.offsetWidth || b.offsetHeight) || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || cs.display === 'none') return { invisivel: true };
  b.scrollIntoView({ block: 'center', inline: 'center' });
  const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);
  if (!r.width || !r.height) return { invisivel: true };
  if (x < 0 || y < 0 || x > document.documentElement.clientWidth || y > document.documentElement.clientHeight) return { fora_do_ecra: { x, y, vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight } };
  const topo = document.elementFromPoint(x, y);
  if (!(topo === b || b.contains(topo))) return { tapado: { x, y, topo: topo ? topo.tagName.toLowerCase() + '.' + String(topo.className || '').split(/\\s+/)[0] : null } };
  return { x, y, w: Math.round(r.width), h: Math.round(r.height) }; })()`;
const nao_tocavel = (r) => !r || r.invisivel || r.fora_do_ecra || r.tapado;
const porque = (r) => !r ? 'sem_botao' : r.invisivel ? 'invisivel' : r.fora_do_ecra ? 'fora_do_ecra' : 'tapado_por_' + (r.tapado?.topo || '?');
// Por cima: quem está no ponto, com posição/z-index próprios e dos 4 antepassados, e o estado da barra no
// momento exacto em que o toque falha. É esta prova (e não uma suposição sobre o CSS) que distingue
// «a app tem um overlay» de «a barra deixou de estar fixa» de «a sonda mediu depois de a página ter rolado».
const GEOMETRIA = (x, y) => `(() => { const id = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '');
  const css = (e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { el: id(e), pos: c.position, z: c.zIndex, disp: c.display, vis: c.visibility, pe: c.pointerEvents, tf: c.transform === 'none' ? null : c.transform.slice(0, 24), op: c.opacity, caixa: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }; };
  const pilha = document.elementsFromPoint(${x}, ${y}).slice(0, 6).map(id);
  const topo = document.elementFromPoint(${x}, ${y}); const cadeia = []; let e = topo;
  while (e && cadeia.length < 6) { const c = getComputedStyle(e); cadeia.push(css(e)); if (c.position !== 'static') { const p = c.zIndex; cadeia[cadeia.length - 1].posicionado = id(e) + ' z=' + p; } e = e.parentElement; }
  const nav = document.getElementById('bfrMobileBottomNav'); const dr = document.getElementById('bfrMobileDrawer');
  return { ponto: { x: ${x}, y: ${y} }, pilha, cadeia, barra: nav ? css(nav) : null, gaveta: dr ? { ...css(dr), aberta: dr.classList.contains('is-open') } : null, scroll_y: Math.round(scrollY), shell: (() => { const s = document.getElementById('appShell'); return s ? { el: id(s), ...css(s) } : null; })(), corpo_tf: getComputedStyle(document.body).transform, filtro: getComputedStyle(document.body).filter === 'none' ? null : getComputedStyle(document.body).filter }; })()`;
// O que um telemóvel tem, perguntado ao DOM e não assumido.
const CENSO = `(() => {
  const app = document.getElementById('appShell'); const nav = document.getElementById('bfrMobileBottomNav'); const dr = document.getElementById('bfrMobileDrawer');
  const cx = (e) => { const r = e.getBoundingClientRect(); return { rot: (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 16), route: e.dataset.bfrMobileRoute || e.dataset.bfrDrawerRoute || null, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), x: Math.round(r.x) }; };
  const bot = nav ? Array.from(nav.querySelectorAll('button[data-bfr-mobile-route]')) : [];
  return { presentation: app?.getAttribute('data-presentation') || null, body_mobile: document.body.classList.contains('bfr-mobile-presentation'),
    barra_existe: !!nav, barra: bot.map(cx), gaveta_existe: !!dr, gaveta_aberta: !!dr?.classList.contains('is-open'),
    gaveta: dr ? Array.from(dr.querySelectorAll('[data-bfr-drawer-route]')).map(cx) : [], hamb: !!document.querySelector('[data-bfr-open-drawer]'),
    sidebar_caixa: !!document.querySelector('#appShell .sidebar')?.offsetWidth, vw: document.documentElement.clientWidth, vh: innerHeight };
})()`;
// Régua do painel visível mais populoso (a mesma da varredura), com o assentamento de 2 amostras × 600 ms.
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
    // §AI.32: innerWidth dilata-se até ao conteúdo transbordante neste chrome, pelo que a comparação
    // contra ele não tem positivo possível; clientWidth é a régua que vale a banda pedida.
    estouro_h: (document.body?.scrollWidth || 0) > (document.documentElement?.clientWidth || 0) + 1, largura: document.documentElement?.clientWidth || window.innerWidth,
    seccao_ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, view_apos: window.BFR_APP_RUNTIME?.activeView ?? null };
})()`;

// Algumas seções são diálogo de ecrã inteiro por decisão do app (fixed, z >= 1000) e tapam a barra: as
// «fotos» do coordenador são `#bfrStudentPhotoManager` com z-index 12000 a cobrir os 390×720. Isso não é
// uma armadilha se o diálogo oferecer saída; é uma armadilha se não oferecer. A pergunta é feita aqui, a
// dedo: encontrar o contentor culpado, procurar-lhe dentro um controlo de fecho visível, no ecrã e livre
// por cima, tocá-lo e exigir que a barra volte a responder. (ah2-sonda-armadilha-fotos provou que o
// «Fechar» de 60×32 px existe e devolve o utilizador à barra — e que é um alvo abaixo dos 44 px.)
const DIALOGO = `(() => { const id = (e) => e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + String(e.className).trim().split(/\\s+/)[0] : '') : null;
  const centro = (b) => { const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; };
  const cobertos = () => Array.from(document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]')).filter(b => { const c = centro(b); const t = document.elementFromPoint(c.x, c.y); return !(t === b || b.contains(t)); });
  const alvos = Array.from(document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]')); if (!alvos.length) return { sem_barra: true };
  const tapadas = cobertos(); if (!tapadas.length) return { tapa_barra: false, total: alvos.length };
  const c0 = centro(tapadas[0]); let e = document.elementFromPoint(c0.x, c0.y), culpado = null;
  while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.position === 'fixed' && parseInt(cs.zIndex || '0', 10) >= 1000 && !e.classList.contains('bfr-mobile-drawer')) { culpado = e; break; } e = e.parentElement; }
  if (!culpado) return { tapa_barra: true, tapadas: tapadas.length, total: alvos.length, culpado_elemento: id(document.elementFromPoint(c0.x, c0.y)), saida: null };
  const cs = getComputedStyle(culpado); const ra = culpado.getBoundingClientRect();
  const cand = Array.from(culpado.querySelectorAll('button, [role="button"], a')).map((b) => { const c = centro(b); const r = b.getBoundingClientRect(); const no_ecra = c.x >= 0 && c.y >= 0 && c.x <= document.documentElement.clientWidth && c.y <= innerHeight;
    const t = no_ecra ? document.elementFromPoint(c.x, c.y) : null;
    return { rot: ((b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24) || b.getAttribute('aria-label') || b.getAttribute('title') || ''), aria: b.getAttribute('aria-label'), el: id(b), w: Math.round(r.width), h: Math.round(r.height), x: c.x, y: c.y, no_ecra, livre: t === b || b.contains(t), visivel: !!(b.offsetWidth || b.offsetHeight) && r.width > 0 && r.height > 0 }; });
  const s = cand.find((c) => c.visivel && c.no_ecra && c.livre && /voltar|fechar|sair|close|×|✕|início|inicio/i.test(c.rot + ' ' + (c.aria || '') + ' ' + c.el));
  return { tapa_barra: true, tapadas: tapadas.length, total: alvos.length, culpado: id(culpado), z: cs.zIndex, caixa: { w: Math.round(ra.width), h: Math.round(ra.height) }, controles: cand.length,
    saida: s ? { rot: s.rot, aria: s.aria, el: s.el, x: s.x, y: s.y, w: s.w, h: s.h, alvo_miudo: Math.min(s.w, s.h) < 44 } : null }; })()`;

const out = { ciclo: 'AH-7b-MOBILE', em: new Date().toISOString(), papel: PAPEL, larguras: LARGURAS, altura: ALTURA, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), contas: { id: conta.id.slice(0, 8) }, markup: 'toque em #bfrMobileBottomNav button[data-bfr-mobile-route] e #bfrMobileDrawer [data-bfr-drawer-route]; a barra do desktop está display:none abaixo de 800px por decisão do app (bfr-responsive-presentation.js:233)', declaradas: secoesDe(PAPEL), bandas: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURAS[0], height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);

const PRONTOS = `document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`;
for (const w of LARGURAS) {
  if (aperta) { (out.faltaram = out.faltaram || []).push('largura ' + w); continue; }
  const b = { width: w };
  // Depois de cada painel: se a seção enterrou a barra, é um diálogo de ecrã inteiro e a varredura tem de o
  // fechar como um dedo faria — sem isto as rotas seguintes ficam «inalcançáveis» por culpa do instrumento.
  const trata_dialogo = async (rota) => {
    const d = await E(DIALOGO);
    if (!d.tapa_barra) return;
    const reg = { rota, ...d };
    if (d.saida) { await toca(d.saida.x, d.saida.y); await dorme(900); reg.fechou_a_toque = !(await E(DIALOGO)).tapa_barra; }
    else reg.fechou_a_toque = false;
    (b.dialogos = b.dialogos || []).push(reg);
    console.log(`  ${w}px/${rota}: DIÁLOGO ${d.culpado || d.culpado_elemento} z=${d.z || '-'} tapa ${d.tapadas}/${d.total}; saida=${d.saida ? '"' + d.saida.rot + '" ' + d.saida.w + 'x' + d.saida.h + (d.saida.alvo_miudo ? ' <44px' : '') : 'NENHUMA'} fechou_a_toque=${reg.fechou_a_toque}`);
  };
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 45000).catch(() => {});
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
  await send('Page.navigate', { url: URL_APP });
  let erro_boot = null;
  b.ms_ready = await waitFor(PRONTOS, 70000).catch((e) => { erro_boot = String(e.message).slice(0, 110); return null; });
  b.erro_boot = erro_boot;
  await E(`new Promise(r => setTimeout(r, 1200))`);
  consola.length = 0;
  b.censo = await E(CENSO);
  gate(`${w}px: o boot abriu no shell do papel`, erro_boot, null);
  // Conta não aprovada não tem shell para varrer: a varredura desktop provou o estado
  // {entrou:false, aviso_pendencia:true, login_visivel:true, nav_visiveis:0} e o mapa de acessos servido tem
  // 14 papéis sem `pending`. As bandas a zeros que o pending produzia eram o instrumento a procurar uma barra
  // que não existe por decisão do produto; ficam registadas como célula bloqueada, com a causa, e a banda
  // não é escrita — relançar o condutor não gasta seis larguras outra vez a olhar para o mesmo ecrã.
  if (erro_boot) {
    const est = await E(`({ entrou: !!document.getElementById('appShell')?.classList.contains('ready'), aviso_pendencia: /Aguarde a aprova|ainda está sendo preparado/.test(document.body?.innerText || ''), login_visivel: !!(document.getElementById('loginScreen')?.offsetWidth || document.getElementById('loginScreen')?.offsetHeight), texto: (document.body?.innerText || '').trim().replace(/\\s+/g,' ').slice(0,90) })`);
    if (est.aviso_pendencia && !est.entrou) {
      (out.bloqueadas = out.bloqueadas || []).push({ largura: w, causa: 'conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)', estado: est, erro_boot });
      console.log(`  ${w}px: BLOQUEADA — barreira de pendência («${est.texto}») — não contado como medido`);
      writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
      continue;
    }
    // Sem shell por TEMPO é outra coisa, e foi isto (coordinator@360, social_work@390 com ms_ready=null) que
    // encheu a grelha de bandas ocas: varreu-se uma página que ainda não tinha arrancado. Rechega uma vez com
    // a mesma sessão de localStorage; se o boot estourar outra vez a célula trava com a causa.
    await send('Page.navigate', { url: URL_APP });
    b.ms_ready = await waitFor(PRONTOS, 70000).catch(() => null);
    b.rechegada_boot = true;
    erro_boot = b.ms_ready ? null : erro_boot;
    b.erro_boot = erro_boot;
    await E(`new Promise(r => setTimeout(r, 1200))`);
    b.censo = await E(CENSO);
    if (erro_boot) {
      (out.bloqueadas = out.bloqueadas || []).push({ largura: w, causa: 'boot não abriu o shell do papel em 70 s nem à 2.ª tentativa', erro_boot });
      console.log(`  ${w}px: TRAVADA — boot não completou à 2.ª tentativa`);
      writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
      continue;
    }
    console.log(`  ${w}px: rechega do boot resolveu (${b.ms_ready} ms até ready)`);
  }
  gate(`${w}px: a app declarou-se em apresentação mobile`, { presentation: b.censo.presentation, body_mobile: b.censo.body_mobile, sidebar_escondida: b.censo.sidebar_caixa === false }, { presentation: 'mobile', body_mobile: true, sidebar_escondida: true });
  gate(`${w}px: a barra inferior tem botões com caixa`, b.censo.barra.filter((x) => x.w > 0 && x.h > 0).length > 0, true);
  gate(`${w}px: 0 botões da barra com alvo de toque < 44 px`, b.censo.barra.filter((x) => x.w > 0 && Math.min(x.w, x.h) < 44).map((x) => `${x.route}:${x.w}x${x.h}`), []);
  // Conta recém-criada sem nome preferido abre o #preferredNameModal (fixed, z=1300) por cima de tudo, e
  // enquanto ele está aberto nenhum toque chega à barra: ah2-mobile-hit-hit2 apanhou os 5 botões a
  // responderem por `p.publish-status`, que é filho do cartão do modal. Fechar com o × do próprio modal é o
  // gesto do utilizador e não escreve nada na base — por isso é assim que se continua, e não com JS.
  b.modal = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? { id: m.id || null, texto: (m.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 70) } : null; })()`);
  if (b.modal?.id) {
    const rm = await E(RET(`#${b.modal.id} .modal-close`));
    if (rm && !nao_tocavel(rm)) { await toca(rm.x, rm.y); await dorme(600); }
    b.modal_fechou_a_toque = rm && !nao_tocavel(rm) ? await E(`(() => { const m = document.getElementById(${JSON.stringify(b.modal.id)}); return !m || m.classList.contains('hidden') || getComputedStyle(m).display === 'none'; })()`) : false;
    b.censo = await E(CENSO);
  } else b.modal_fechou_a_toque = b.modal ? null : true;
  gate(`${w}px: o modal de primeiro acesso fecha com um toque real`, b.modal ? b.modal_fechou_a_toque : null, b.modal ? true : null);
  // Um shell ready SEM barra montada não é um defeito de navegação — é o módulo de apresentação que não
  // correu nesse carregamento: #bfrMobileBottomNav e a classe bfr-mobile-presentation do body são criados
  // SÓ por createNav (app/bfr-responsive-presentation.js:412 e :417-418), a que o sync() chega depois do
  // portão de `ready` (:592). Medir por cima disto fabrica falsos vermelhos — foi assim que
  // pedagogical@320/360 saíram com «a gaveta não abre ao toque» e 0 abertas, e a célula ainda contou como
  // medido. Rechega uma vez; se persistir, a célula fica BLOQUEADA com causa e NÃO é escrita como banda.
  if (!erro_boot && b.censo.barra_existe === false) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: ALTURA, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: URL_APP });
    await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 60000).catch(() => {});
    const m2 = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && (x.offsetWidth || x.offsetHeight)); const c = m && m.querySelector('.modal-close'); if (!c) return null; const r = c.getBoundingClientRect(); return r.width && r.height ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null; })()`);
    if (m2) { await toca(m2.x, m2.y); await dorme(600); }
    b.censo = await E(CENSO);
    if (b.censo.barra_existe === false) {
      (out.bloqueadas = out.bloqueadas || []).push({ largura: w, causa: 'shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra', censo: b.censo, ms_ready: b.ms_ready });
      console.log(`  ${w}px: BLOQUEADA — sem barra mobile com shell ready (não é contado como medido)`);
      writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
      continue;
    }
    console.log(`  ${w}px: rechega resolveu — barra montada à 2.ª tentativa`);
  }
  const mapa = {};
  // 1) as rotas primárias, tal como aparecem na barra
  for (const item of b.censo.barra) {
    if (aperta) { (b.pela_praga = b.pela_praga || []).push('barra ' + item.route); break; }
    if (item.route === 'more') continue;
    const r = await E(RET(`#bfrMobileBottomNav button[data-bfr-mobile-route="${item.route}"]`));
    if (nao_tocavel(r)) { mapa[item.route] = { nao_tocavel: porque(r), ...(r?.tapado ? { geo: await E(GEOMETRIA(r.tapado.x, r.tapado.y)) } : {}) }; continue; }
    const antes = await E(`window.BFR_APP_RUNTIME?.activeSection ?? null`);
    await toca(r.x, r.y);
    const m = await E(MEDIR);
    m.toque = r; m.antes = antes; m.via = 'barra';
    mapa[item.route] = m;
    await trata_dialogo(item.route);
    if (m.view_apos && m.view_apos !== PAPEL && PAPEL !== 'developer') { await E(`window.BFR_APP_RUNTIME?.setRole(${JSON.stringify(PAPEL)})`); await dorme(700); }
  }
  // 2) a gaveta: abrir pelo que o telemóvel mostra, sempre com leitura de estado antes (o hamburger é toggle,
  //    tocar às cegas fecha-a — foi assim que a primeira leitura chamou «inalcançável» a tudo)
  const diagnostico_gaveta = [];
  const abre_gaveta = async () => {
    const ja_aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
    if (ja_aberta) return true;
    const sel = b.censo.barra.some((x) => x.route === 'more' && x.w > 0) ? '#bfrMobileBottomNav button[data-bfr-mobile-route="more"]' : '[data-bfr-open-drawer]';
    const r = await E(RET(sel));
    if (nao_tocavel(r)) { if (diagnostico_gaveta.length < 6) diagnostico_gaveta.push({ o: 'mais_nao_tocavel', sel, r, ativa: await E(`window.BFR_APP_RUNTIME?.activeSection ?? null`), geo: r?.tapado ? await E(GEOMETRIA(r.tapado.x, r.tapado.y)) : (r?.fora_do_ecra ? { fora_do_ecra: r.fora_do_ecra, scroll_y: await E('Math.round(scrollY)') } : null) }); return false; }
    await toca(r.x, r.y); await dorme(500);
    const aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
    if (!aberta && diagnostico_gaveta.length < 6) diagnostico_gaveta.push({ o: 'toque_nao_abriu', sel, r, em_cima: await E(`(() => { const e = document.elementFromPoint(${r.x}, ${r.y}); return e ? e.tagName.toLowerCase() + '.' + String(e.className || '').split(/\\s+/)[0] : null; })()`), classes: await E(`document.getElementById('bfrMobileDrawer')?.className || null`), ativa: await E(`window.BFR_APP_RUNTIME?.activeSection ?? null`) });
    return aberta;
  };
  b.gaveta_aberta_a_toque = await abre_gaveta();
  gate(`${w}px: a gaveta abre com um toque real`, b.gaveta_aberta_a_toque, true);
  for (const item of (b.censo.gaveta || [])) {
    if (aperta) { (b.pela_praga = b.pela_praga || []).push('gaveta ' + item.route); break; }
    if (mapa[item.route]) continue;
    if (!(await abre_gaveta())) { mapa[item.route] = { gaveta_nao_abriu: true }; continue; }
    const r = await E(RET(`#bfrMobileDrawer [data-bfr-drawer-route="${item.route}"]`));
    if (nao_tocavel(r)) { mapa[item.route] = { nao_tocavel: porque(r), detalhe: r }; continue; }
    const antes = await E(`window.BFR_APP_RUNTIME?.activeSection ?? null`);
    await toca(r.x, r.y);
    const m = await E(MEDIR);
    m.toque = r; m.antes = antes; m.via = 'gaveta';
    mapa[item.route] = m;
    await trata_dialogo(item.route);
    if (m.view_apos && m.view_apos !== PAPEL && PAPEL !== 'developer') { await E(`window.BFR_APP_RUNTIME?.setRole(${JSON.stringify(PAPEL)})`); await dorme(700); }
    console.log(`  ${w}px/${item.route}: ${m.painel.c > 0 ? m.painel.id + ' ' + m.painel.c + 'c' : 'VAZIO'} ${m.ms}ms${m.assentou ? '' : ' NAO-ASSENTOU'} ctl=${m.controles} tap<${m.tap} fonte<${m.fonte}${m.estouro_h ? ' ESTOURO-H' : ''} ativa=${m.seccao_ativa}`);
  }
  b.seccoes = mapa;
  const tocadas = Object.values(mapa).filter((v) => v.painel);
  b.abertas = tocadas.length;
  b.vazias = Object.entries(mapa).filter(([, v]) => v.painel && v.painel.c === 0).map(([k]) => k);
  b.nao_assentaram = Object.entries(mapa).filter(([, v]) => v.painel && !v.assentou).map(([k, v]) => k + '@' + v.ms);
  b.estouro = Object.entries(mapa).filter(([, v]) => v.estouro_h).map(([k]) => k);
  b.tap_miudo = tocadas.reduce((a, v) => a + (v.tap || 0), 0);
  b.fonte_miuda = tocadas.reduce((a, v) => a + (v.fonte || 0), 0);
  // Uma seção declarada no mapa do papel que não tem rota nem na barra nem na gaveta não é «inalcançável por
  // azar»: é uma porta que o telemóvel não tem. As rotas do professor têm prefixo próprio (professor-*), por
  // isso a comparação é por sobreposição e não por igualdade.
  // A fonte das rotas é o CENSO (a barra e a gaveta construídas), não o `mapa` do que se conseguiu tocar:
  // medir por `mapa` fez o student@390 — com barra de 5 botões e gaveta de 18 itens presentes — declarar 18
  // seções «sem rota tocável» só porque a praga o apanhou depois de uma. O que se tocou é inalcancáveis; o
  // que existe como porta é censo.
  const rotas = new Set([...(b.censo.barra || []), ...(b.censo.gaveta || [])].map((x) => x.route).filter((r) => r && r !== 'more'));
  // Só uma direção de sobreposição é legítima: a rota mobile pode ter o prefixo da seção («professor-agenda»
  // para a seção «agenda»). A direção contrária — perdoar uma seção porque começa como alguma rota — apagou
  // «coordenacao-chat» do vermelho quando a rota «coordenacao» existe: duas portas diferentes no mapa do
  // papel, e o instrumento fez de conta que era a mesma. Fica a pergunta no site certo.
  b.declaradas_sem_rota = out.declaradas.filter((s) => !rotas.has(s) && ![...rotas].some((r) => r === s || r.endsWith(':' + s) || r.endsWith('-' + s) || r.startsWith(s + '-')));
  b.rotas_fora_do_mapa = [...rotas].filter((r) => !out.declaradas.some((s) => r === s || r.endsWith(':' + s) || r.endsWith('-' + s) || r.startsWith(s + '-')));
  b.inalcancaveis = Object.entries(mapa).filter(([, v]) => !v.painel).map(([k, v]) => k + ':' + (v.gaveta_nao_abriu ? 'gaveta_nao_abriu' : v.nao_tocavel || 'sem_painel'));
  // Uma rota tapada que deixa a seção ativa onde estava não abriu nada: o painel mais populoso que a MEDIR
  // devolve pode ser o da seção anterior. Sem este portão, «4 abertas» era verde mesmo com o toque perdido.
  b.sem_efeito = Object.entries(mapa).filter(([rota, v]) => v.painel && v.antes && v.antes !== rota && v.seccao_ativa === v.antes).map(([rota, v]) => rota + ':' + v.antes);
  b.erros = consola.filter((t) => !/favicon|Google API|installTrigger|Service-Worker|Failed to load resource|WebSocket|chunkloaderror|net::ERR/i.test(t)).slice(0, 8);
  b.diagnostico_gaveta = diagnostico_gaveta;
  b.dialogos_sem_saida = (b.dialogos || []).filter((d) => !d.fechou_a_toque).map((d) => d.rota + ':' + (d.saida ? 'saida_nao_chegou' : 'sem_saida_toqueavel'));
  b.dialogos_miudos = (b.dialogos || []).filter((d) => d.saida?.alvo_miudo).map((d) => d.rota + ':' + d.saida.w + 'x' + d.saida.h);
  out.bandas[w] = b;
  gate(`${w}px: chegou ao shell e abriu seções a toque`, b.abertas > 0, true);
  gate(`${w}px: 0 toques que não mudaram a seção ativa`, b.sem_efeito, []);
  gate(`${w}px: 0 seções do papel sem rota tocável`, b.declaradas_sem_rota, []);
  gate(`${w}px: 0 links de navegação fora do mapa do papel`, b.rotas_fora_do_mapa, []);
  gate(`${w}px: 0 rotas que não abriram painel`, b.inalcancaveis, []);
  gate(`${w}px: 0 painéis vazios entre as ${b.abertas} abertas`, b.vazias, []);
  gate(`${w}px: 0 seções cujo conteúdo não assenta em 6 s`, b.nao_assentaram, []);
  gate(`${w}px: 0 estouro horizontal`, b.estouro, []);
  gate(`${w}px: 0 erros de consola de aplicação`, b.erros, []);
  gate(`${w}px: toda a seção-diálogo que tapa a barra tem saída tocável`, b.dialogos_sem_saida, []);
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
}
out.portoes = portoes; out.falhas = falhas;
out.medido = { larguras: Object.keys(out.bandas).length, rotas_tocadas: Object.values(out.bandas).reduce((a, b) => a + (b.abertas || 0), 0), incompleto: (out.faltaram || []).length + Object.values(out.bandas).filter((b) => b.pela_praga).length };
out.veredito = falhas.length ? 'AH7b_MOBILE_COM_DEFEITOS' : (out.medido.incompleto ? 'AH7b_MOBILE_PARCIAL' : 'AH7b_MOBILE_LIMPO');
out.diagnostico = `a barra de baixo tem ${Object.values(out.bandas)[0]?.censo?.barra?.length || 0} rotas e a gaveta ${Object.values(out.bandas)[0]?.censo?.gaveta?.length || 0}; toque real abriu ${out.medido.rotas_tocadas} painéis nas ${out.medido.larguras} larguras; alvos <44px na barra: ${Object.entries(out.bandas).map(([k, b]) => k + 'px=' + (b.censo?.barra || []).filter((x) => x.w > 0 && Math.min(x.w, x.h) < 44).length).join(', ')}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\nPORTÕES: ' + portoes + '  FALHAS: ' + falhas.length);
for (const f of falhas) console.log('  VERMELHO: ' + f.slice(0, 260));
console.log('DIAGNOSTICO: ' + out.diagnostico);
console.log(out.veredito + ' · ' + OUT.split('/').pop());
fecho = true;
abort(0, 'fecho normal');
