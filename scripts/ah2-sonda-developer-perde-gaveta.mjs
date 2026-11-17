// Porque este programa existe: o §AI.18 deixou escrito que a causa do `sem_botao` do developer é «a primeira
// rota que for aee/psychology/secretaria chama setRole(...) e atira o developer para outra pessoa; as
// entradas de apoio que vêm a seguir desaparecem da gaveta reconstruída», e assinou como NÃO provado «que a
// ordem no varrimento seja essa». A ordem lida no artefacto (scripts/ah2-ordem-developer.mjs) refuta a frase
// tal como está: `monitor` e `gate` são tocados ANTES de `aee` e `psychology`, portanto nenhum deles pode ser
// a consequência de `aee`. O que se mantém é o mecanismo com outra antecedente, e há uma pista forte: o
// instrumento repõe o papel depois de cada clique **excepto para o developer** (ah2-mobile2.mjs:304, :334 —
// `&& PAPEL !== 'developer'`), e as três rotas que abrem a vista administrativa do developer
// (`cadastro-alunos`, `direcao`, `administracao`) vêm logo no início do varrimento. Este programa mede isso
// explicitamente: reproduz a MESMA ordem do artefacto, não repõe papel nenhum (para não inventar um
// instrumento que não é o que produziu a linha), e rele o censo da gaveta depois de cada toque. Não escreve
// em base, não faz DDL, não publica.
// Uso: node scripts/ah2-sonda-developer-perde-gaveta.mjs [largura=390] [rótulo=dv1]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const LARGURA = parseInt(process.argv[2] || '390', 10);
const ROTULO = process.argv[3] || 'dv1';
const PAPEL = 'developer';
const TRES = ['monitor', 'gate', 'psychology'];
const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = parseInt(process.env.AH2_PORT || '9465', 10);
const ALTURA = 720;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-developer-perde-gaveta-${ROTULO}.json`;
const PERFIL = `${DIR}/.ah2dv-${ROTULO}-${PORT}`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
// A ordem vem do artefacto que produz a linha, não da minha memória do varrimento.
const ORIGEM = `${DIR}/bfr-conecta/evidence/ah2-mobile2-m5-developer-4.json`;
const ART = JSON.parse(readFileSync(ORIGEM, 'utf8'));
const ORDEM = Object.keys((ART.bandas || {})['390']?.seccoes || {});
if (ORDEM.length < 10) throw new Error('ABORTA: não consegui ler a ordem de ' + ORIGEM);
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessao-${PAPEL}.json`, 'utf8'));
const sessao = S[PAPEL] || S;
if (!sessao?.access_token) throw new Error('ABORTA: sem sessão guardada para ' + PAPEL);
const SHELL = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = createHash('md5').update(SHELL).digest('hex');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); grava(c); };
let saida = { ciclo: 'AH-DV-GAVETA', em: new Date().toISOString(), papel: PAPEL, largura: LARGURA, origem_da_ordem: ORIGEM.split('/').pop(), ordem: ORDEM, md5_shell: null, passos: [], veredito: null };
function grava(codigo) {
  try { saida.em_fim = new Date().toISOString(); writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); console.log('ESCRITO: ' + OUT.split('/').pop()); } catch {}
  process.exit(codigo);
}
setTimeout(() => abort(3, 'teto 240 s'), 240000);
let tg = [];
for (let i = 0; i < 80; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await dorme(400); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await dorme(350); } throw new Error('waitFor: ' + e.slice(0, 90)); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000).catch(() => {});
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
saida.ms_ready = await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 70000).catch(() => null);
saida.md5_shell = MD5;
saida.papel_inicial = await E(`window.BFR_CURRENT_PROFILE?.role ?? null`);
const TOQUE = async (x, y) => { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const CENTRA = (sel) => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return JSON.stringify({x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2)}); })()`;
const clica = async (sel) => { const r = await E(CENTRA(sel)); if (!r || !r.startsWith('{')) return false; const p = JSON.parse(r); await TOQUE(p.x, p.y); await dorme(700); return true; };
saida.modal = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? { id: m.id || null } : null; })()`);
if (saida.modal?.id) saida.modal_fechado = await clica('#' + saida.modal.id + ' .modal-close');
saida.ms_barra = await waitFor("!!document.getElementById('bfrMobileBottomNav')", 30000).catch(() => null);
saida.gaveta_aberta = await clica('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]');
saida.gaveta_estado = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
// O censo que interessa: para cada uma das três, se ela está NA GAVETA, se o botão da sidebar existe, se está
// `.hidden` (por classe própria ou herdada de um ancestral `.hidden` — a regra do `drawerItems()` em
// bfr-responsive-presentation.js:74-79 é exatamente `:not(.hidden)` + `closest('.hidden')`), e o `signature`
// que decide se o `renderDrawer()` reescreve a lista.
const CENSO = `(() => { const d = (r) => { const item = document.querySelector('#bfrMobileDrawer [data-bfr-drawer-route="' + r + '"]'); const nav = document.querySelector('#appShell button[data-section="' + r + '"]') || document.querySelector('[data-monitor-nav] , [data-gate-nav] , [data-psychology-nav]'); const sel = { monitor: '[data-monitor-nav]', gate: '[data-gate-nav]', psychology: '[data-psychology-nav]' }[r]; const b = document.querySelector(sel) || nav; return { gaveta: !!item, nav_existe: !!b, nav_hidden: b ? b.classList.contains('hidden') : null, ancestro_hidden: b ? !!b.closest('.hidden') : null }; };
  const links = document.querySelector('#bfrMobileDrawer .bfr-drawer-links, #bfrMobileDrawer');
  return { aberta: !!(document.getElementById('bfrMobileDrawer') || {}).classList?.contains('is-open'), papeis: { sessao: window.BFR_CURRENT_PROFILE?.role ?? null, view: window.BFR_APP_RUNTIME?.activeView ?? null, ativa: window.BFR_APP_RUNTIME?.activeSection ?? null }, gaveta_itens: Array.from(document.querySelectorAll('#bfrMobileDrawer [data-bfr-drawer-route]')).map(x => x.getAttribute('data-bfr-drawer-route')), html_links: links ? links.innerHTML.length : null, tres: ${JSON.stringify(TRES)}.map(d) }; })()`;
saida.censo_antes = await E(CENSO);
if (!saida.censo_antes || !saida.censo_antes.gaveta_itens.length) { saida.veredito = 'a gaveta não abriu ou não tem itens — nada a medir'; grava(2); }
const presente = (c, r) => c.gaveta_itens.includes(r);
let anterior = saida.censo_antes;
// Espelha `abre_gaveta` do instrumento (ah2-mobile2.mjs:309-319): lê o `is-open` antes, e só toca o «Mais» se
// ela estiver fechada — porque o hamburger é toggle, e tocar às cegas fecha-a. A primeira versão desta sonda
// abria a gaveta UMA vez e percorria as rotas com ela fechada a partir do segundo toque: os nós continuam no
// DOM de uma gaveta fechada, pelo que «nada sumiu» media a persistência do DOM e não a lista reconstruída. O
// `sem_botao` da grelha nasce precisamente do `renderDrawer()` que corre em cada reabertura.
const abre_gaveta = async (rota) => {
  if (await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`)) return 'ja_aberta';
  const sel = await E(`!!document.querySelector('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]')`) ? '#bfrMobileBottomNav button[data-bfr-mobile-route="more"]' : '[data-bfr-open-drawer]';
  const alvo = await E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width/2), y = Math.round(r.y + r.height/2); const topo = document.elementFromPoint(x, y); const pilha = []; let n = topo; for (let i = 0; i < 6 && n; i++) { const c = getComputedStyle(n); pilha.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' z' + c.zIndex + ' pe' + c.pointerEvents + ' disp' + c.display); n = n.parentElement; } return { x, y, w: Math.round(r.width), h: Math.round(r.height), dentro: topo === b || b.contains(topo), em_cima: pilha }; })()`);
  if (!alvo || !alvo.dentro || !alvo.w || !alvo.h) {
    (saida.diagnostico_mais = saida.diagnostico_mais || []).push({ antes_de: rota, porque: 'MAIS_NAO_TOCAVEL', sel, alvo });
    return 'MAIS_NAO_TOCAVEL';
  }
  await TOQUE(alvo.x, alvo.y);
  await dorme(600);
  const aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
  if (!aberta) (saida.diagnostico_mais = saida.diagnostico_mais || []).push({ antes_de: rota, porque: 'toque_nao_abriu', sel, alvo });
  return aberta ? 'abriu_a_toque' : 'toque_nao_abriu';
};
for (const rota of saida.ordem) {
  const sel = `#bfrMobileDrawer [data-bfr-drawer-route="${rota}"]`;
  const abriu = await abre_gaveta(rota);
  const existia = await E(`!!document.querySelector(${JSON.stringify(sel)})`);
  const t0 = Date.now();
  let tocado = false;
  if (existia && abriu !== 'MAIS_NAO_TOCAVEL' && abriu !== 'toque_nao_abriu') { tocado = await clica(sel); await dorme(500); }
  const c = await E(CENSO);
  saida.passos.push({ rota, gaveta: abriu, estava_na_gaveta: existia, tocado, ms: Date.now() - t0, papel: c?.papeis, sumiram: TRES.filter((r) => presente(anterior, r) && !presente(c, r)), ainda_la: TRES.filter((r) => presente(c, r)), tres: c?.tres, itens: c?.gaveta_itens?.length, html_links: c?.html_links });
  if (!c) { saida.veredito = 'censo falhou em ' + rota; grava(4); }
  anterior = c;
  if (!TRES.some((r) => presente(c, r)) && saida.passos.some((p) => p.sumiram.length)) break;
}
const primeiro = saida.passos.find((p) => p.sumiram.length);
const no_antes = TRES.filter((r) => !presente(saida.censo_antes, r));
const no_fim = TRES.filter((r) => !presente(anterior, r));
const tocados = saida.passos.filter((p) => p.tocado).length;
saida.veredito = !primeiro && no_antes.length === TRES.length
  ? `as três (${TRES.join('/')}) JÁ NÃO ESTAVAM na lista da gaveta quando ela abriu, antes de qualquer toque — o ` +
    '`sem_botao` da grelha conta-as noutro censo que não a lista do `renderDrawer`, e a causa é do instrumento'
  : !primeiro
    ? `nenhum dos ${tocados} toques válidos da lista de ${saida.passos.length} passos tirou seja que entrada da gaveta${tocados < saida.passos.length ? ` — e o varrimento ficou TRUNCADO: a partir de \`${(saida.diagnostico_mais || [])[0]?.antes_de || '?'}\` o «Mais» deixou de abrir a gaveta (${saida.passos.length - tocados} passos sem toque possível, diagnóstico em \`diagnostico_mais\`), pelo que as rotas seguintes não foram medidas` : ''}: as três mantiveram-se na lista (${no_fim.length ? 'faltavam ' + no_fim.join('/') : 'todas presentes'}) — o ` +
      '`sem_botao` medido pela grelha não é a lista a reconstruir-se, é outra coisa e fica por provar'
    : `o toque em \`${primeiro.rota}\` (passo ${saida.passos.indexOf(primeiro) + 1} de ${saida.passos.length}) faz sair ${primeiro.sumiram.join('/')}` +
      `; papel lido logo depois = ${JSON.stringify(primeiro.papel)}; depois disso ${TRES.filter((r) => !primeiro.ainda_la.includes(r)).join('/')} nunca mais reaparecem na lista — ` +
      (primeiro.papel?.view && primeiro.papel.view !== PAPEL
        ? 'a vista trocou de PESSOA, e como o instrumento não repõe o papel no developer (ah2-mobile2.mjs:304, :334 — `&& PAPEL !== \'developer\'`) o resto do varrimento é feito como outro utilizador'
        : 'a vista NÃO trocou de pessoa (activeView continua ' + primeiro.papel?.view + '), logo o que esconde as entradas é outra sincronização de navegação, não o setRole');
grava(0);
