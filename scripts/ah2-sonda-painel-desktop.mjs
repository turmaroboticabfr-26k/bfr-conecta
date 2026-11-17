// Porque este programa existe: a tabela desktop (§6 do briefing, 1366/1440/1920) deixa
// `chat-interno@education_supervisor` como painel vazio com a assinatura de tempo do `MEDIR` e diz, no rodapé,
// que «estas linhas do desktop NÃO foram sondadas». Essa frase é uma pendência, não um resultado: a sonda com o
// painel por parâmetro (ah2-sonda-painel-tempo.mjs) já falsificou a hipótese do tempo no telemóvel, mas as
// bandas desktop têm emulação própria — `deviceScaleFactor:1, mobile:false` e cliques de rato, não toque — e
// uma leitura a 390 px não se pode assinar por uma a 1366. Este programa é o irmão desktop: escreve de propósito
// um ficheiro novo em vez de editar o instrumento que produziu os artefactos já assinados, para que os dois
// conjuntos continuem comparáveis. Não escreve em base, não faz DDL, não publica.
// Uso: node scripts/ah2-sonda-painel-desktop.mjs <papel> <largura=1366> <rotulo> <rota> <id_do_painel>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PAPEL = process.argv[2] || 'education_supervisor';
const LARGURA = parseInt(process.argv[3] || '1366', 10);
const ROTULO = process.argv[4] || 'v1';
const ROTA = process.argv[5] || 'chat-interno';
const PAINEL = process.argv[6] || 'internalChatView';
const AMOSTRAS = parseInt(process.env.AH2_AMOSTRAS || '50', 10);
// As três bandas do briefing, com a altura que o instrumento da grelha usa (ah2-varredura.mjs:30) — copiar a
// altura é o que torna as duas leituras comparáveis, não um «desktop» inventado.
const ALTURA = ({ 1366: 768, 1440: 900, 1920: 1080 })[LARGURA] || 768;
const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = parseInt(process.env.AH2_PORT || '9462', 10);
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-painel-tempo-${ROTULO}.json`;
const PERFIL = `${DIR}/.ah2pdesk-${ROTULO}-${PORT}`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
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
let saida = { ciclo: 'AH-PAINEL-DESKTOP', em: new Date().toISOString(), papel: PAPEL, largura: LARGURA, altura: ALTURA, rota: ROTA, painel: PAINEL, regexa: 'desktop', md5_shell: null, toque: null, serie: [], erros_janela: [], consola: [], veredito: null };
function grava(codigo) {
  try { saida.em_fim = new Date().toISOString(); writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); console.log('ESCRITO: ' + OUT.split('/').pop()); } catch {}
  process.exit(codigo);
}
setTimeout(() => abort(3, 'teto 200 s'), 200000);
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
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) saida.consola.push((m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 240));
  if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') saida.consola.push('[log] ' + String(m.params.entry.text || '').slice(0, 240));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await dorme(350); } throw new Error('waitFor: ' + e.slice(0, 90)); };
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
// O que distingue este programa do irmão de telemóvel, e é exactamente a régua da grelha desktop: sem emulação
// de toque, `deviceScaleFactor:1`, `mobile:false`.
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000).catch(() => {});
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
saida.ms_ready = await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 70000).catch(() => null);
saida.md5_shell = MD5;
if ((await E(`window.BFR_CURRENT_PROFILE?.role ?? null`)) !== PAPEL) { await E(`window.BFR_APP_RUNTIME?.setRole(${JSON.stringify(PAPEL)})`); await dorme(900); }
saida.papel_lido = await E(`window.BFR_CURRENT_PROFILE?.role ?? null`);
await E(`window.__sonda = { erros: [], rede: [] };
  window.addEventListener('error', e => window.__sonda.erros.push('error: ' + (e.message || '?') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', e => window.__sonda.erros.push('rejeicao: ' + String(e.reason && (e.reason.message || e.reason) || '?').slice(0, 200)));
  const f = window.fetch; window.fetch = async (...a) => { const u = String(a[0] && a[0].url || a[0]); const t0 = performance.now(); try { const r = await f(...a); window.__sonda.rede.push({ u: u.slice(0, 90), st: r.status, ms: Math.round(performance.now() - t0) }); if (!r.ok) { const c = r.clone(); c.text().then(x => { const l = window.__sonda.rede[window.__sonda.rede.length - 1]; if (l && l.u === u.slice(0, 90)) l.corpo = String(x).slice(0, 160); }).catch(() => {}); } return r; } catch (e) { window.__sonda.rede.push({ u: u.slice(0, 90), erro: String(e.message || e).slice(0, 120) }); throw e; } };
  'ok'`);
const ID = JSON.stringify(PAINEL);
const ONDE = `(document.getElementById(${ID}) ? (() => { const e = document.getElementById(${ID}); return { existe: true, oculto: e.classList.contains('hidden'), classes: e.className, c: (e.innerText || '').trim().length, html: e.outerHTML.length }; })() : { existe: false })`;
saida.antes = await E(ONDE);
// Onde se toca, e porquê este selector: o alvo tem de ser o MESMO botão que a grelha desktop toca
// (`button[data-section="<rota>"]`, ah2-varredura.mjs:244), senão a leitura não é da célula em falta. A
// diferença é que aqui o clique é de rato confiável, não `b.click()` sintético — mais forte, e se um dos dois
// mentir este não mente.
const SEL = `#appShell button[data-section="${ROTA}"], button[data-section="${ROTA}"]`;
const RET = `(() => { const b = document.querySelector(${JSON.stringify(SEL)}); if (!b) return null;
  const cs = getComputedStyle(b);
  if (!(b.offsetWidth || b.offsetHeight) || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || cs.display === 'none') return { invisivel: true };
  b.scrollIntoView({ block: 'center', inline: 'center' });
  const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);
  if (!r.width || !r.height) return { invisivel: true };
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { fora_do_ecra: { x, y } };
  const topo = document.elementFromPoint(x, y);
  if (!(topo === b || b.contains(topo))) return { tapado: true, em_cima: topo.tagName.toLowerCase() + (topo.id ? '#' + topo.id : '') };
  return { x, y, texto: (b.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 40) }; })()`;
const clique_em = async (sel) => {
  const r = await E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; b.scrollIntoView({block:'center'}); const x = b.getBoundingClientRect(); return JSON.stringify({x: Math.round(x.x + x.width/2), y: Math.round(x.y + x.height/2)}); })()`);
  if (!r || !r.startsWith('{')) return false;
  const p = JSON.parse(r);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1, buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await dorme(700);
  return true;
};
// O modal de primeiro acesso também existe a 1366 e tapa o alvo; fecha-se a clique confiável, como no irmão.
saida.modal = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? { id: m.id || null, texto: (m.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 60) } : null; })()`);
if (saida.modal?.id) { saida.modal_fechado_a_clique = await clique_em('#' + saida.modal.id + ' .modal-close'); saida.modal_agora = await E(`(() => { const m = document.getElementById(${JSON.stringify(saida.modal.id)}); return m ? { oculto: m.classList.contains('hidden'), display: getComputedStyle(m).display } : 'removido'; })()`); }
saida.alvo_censo = await E(RET);
saida.botoes_no_dom = await E(`[...new Set(Array.from(document.querySelectorAll('button[data-section]')).filter(b => !b.hasAttribute('data-teacher-nav-tab') && (b.offsetWidth || b.offsetHeight)).map(b => b.dataset.section))].sort()`);
const alvo = saida.alvo_censo;
if (!alvo || alvo.x == null) { saida.veredito = `não consegui clicar em ${ROTA} na banda ${LARGURA}x${ALTURA}: ${JSON.stringify(alvo)}`; grava(2); }
const t_toque = Date.now();
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: alvo.x, y: alvo.y, button: 'left', clickCount: 1, buttons: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: alvo.x, y: alvo.y, button: 'left', clickCount: 1 });
saida.toque = { x: alvo.x, y: alvo.y, texto: alvo.texto };
for (let i = 0; i < AMOSTRAS; i++) {
  await dorme(500);
  const s = await E(`(() => { const e = document.getElementById(${ID}); const vis = (n) => { if (!n) return false; const c = getComputedStyle(n); const r = n.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 50 && r.height > 40; };
    return { c: e ? (e.innerText || '').trim().length : null, html: e ? e.outerHTML.length : null, oculto: e ? e.classList.contains('hidden') : null, visivel: vis(e), ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, n_filhos: e ? e.children.length : null, c_total_pagina: (document.body.innerText || '').trim().length }; })()`);
  s.t_ms_apos_toque = Date.now() - t_toque;
  saida.serie.push(s);
  if (i > 6 && s.c && s.c > 0) break;
}
saida.erros_janela = await E('window.__sonda ? window.__sonda.erros.slice(0, 20) : null');
saida.rede_janela = await E('window.__sonda ? window.__sonda.rede.slice(0, 40) : null');
saida.painel_maior = await E(`(() => { let m = null, mc = -1; for (const e of Array.from(document.querySelectorAll('[id$="View"], [id$="Panel"], section, main'))) { if (!e.id) continue; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); if (c.display === 'none' || c.visibility === 'hidden' || r.width < 50 || r.height < 40) continue; const n = (e.innerText || '').trim().length; if (n > mc) { mc = n; m = e.id; } } return { id: m, c: mc }; })()`);
const primeiro = saida.serie.find((s) => s.c > 0);
saida.veredito = primeiro
  ? `o painel ${PAINEL} ENCHE a ${LARGURA}px: ${primeiro.c} caracteres aos ${primeiro.t_ms_apos_toque} ms do clique em ${ROTA} — o 0 da grelha desktop é a janela de assentamento do instrumento, não uma porta fechada`
  : (saida.erros_janela || []).length
    ? `a ${LARGURA}px o painel ${PAINEL} permanece a 0 caracteres durante ${AMOSTRAS * 0.5} s e a janela regista exceção: ${JSON.stringify(saida.erros_janela.slice(0, 3))}`
    : `a ${LARGURA}px o painel ${PAINEL} abre e permanece a 0 caracteres durante ${AMOSTRAS * 0.5} s SEM exceção lançada — a banda desktop repete o telemóvel: não é tempo, é o render a não produzir conteúdo para este papel`;
grava(0);
