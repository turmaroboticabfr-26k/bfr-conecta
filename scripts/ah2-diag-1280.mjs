// AH-2-D — diagnóstico do único ponto da varredura que ainda não sei classificar: coordinator/1280.
// Em duas corridas independentes (c3 e c3b) o coordinator entrou no shell em 846 ms a 390 px e, na
// banda seguinte da MESMA página, nunca ficou ready em 120 s, com papel=null e zero erros de console
// filtrados. Isto ou é defeito do app no layout desktop, ou é o meu instrumento (navegar por cima de
// um boot em curso), ou é ambiente. As três hipóteses separam-se por ordem de boot:
//   A 1280 a frio  B 1280 outra vez  C 390  D 1280 logo a seguir a 390 (reproduz a ordem do varredura)
// Se A abre e D não, o problema é a sequência — logo, do instrumento. Se D abre e c3b não, é flutuação.
// Captura tudo o que o CDP mostra: console em TODOS os níveis, Log.entryAdded (erros de rede que o
// console não mostra), respostas e falhas de pedido. Sem nomes: só caminhos, códigos, contagens e
// frases de arranque. Não renova token — lê o que está gravado, para não rodar o refresh de mais nada.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2d-chrome-profile`;
const PORT = 9357;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-diag-1280-17-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
if (!S.coordinator?.access_token) throw new Error('ABORTA: sem sessão coordinator gravada');
const viveiro = S.coordinator.expires_at - Math.floor(Date.now() / 1000);
if (viveiro < 300) throw new Error(`ABORTA: token coordinator morre em ${viveiro} s — renovar primeiro`);

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 420 s'), 420000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('ws')), 30000))]).catch((e) => abort(5, String(e)));
let seq = 0; const pend = new Map();
let niv = []; let falhasRede = []; let respostas = []; let exceptions = []; let logEntradas = [];
const reqNome = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  const P = m.params || {};
  if (m.method === 'Runtime.consoleAPICalled') niv.push({ nivel: P.type, texto: (P.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 180) });
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(String(P.exceptionDetails?.exception?.description || P.exceptionDetails?.text || '').slice(0, 220));
  if (m.method === 'Log.entryAdded') logEntradas.push({ nivel: P.entry?.level, fonte: P.entry?.source, texto: String(P.entry?.text || '').slice(0, 180), url: String(P.entry?.url || '').split('/').slice(3).join('/').split('?')[0] });
  if (m.method === 'Network.requestWillBeSent') reqNome.set(P.requestId, { caminho: String(P.request.url).split('?')[0].replace(/^https?:\/\/[^/]+/, ''), metodo: P.request.method });
  if (m.method === 'Network.responseReceived') { const r = reqNome.get(P.requestId); respostas.push({ ...(r || { caminho: '?' }), codigo: P.response.status }); }
  if (m.method === 'Network.loadingFailed') { const r = reqNome.get(P.requestId); falhasRede.push({ ...(r || { caminho: '?' }), erro: P.errorText, bloqueado: P.blockedReason || null, cancelado: !!P.canceled }); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 240)); return r.result?.value; };

const out = { ciclo: 'AH-2-D', aceite: 'classificar coordinator/1280: defeito do app, instrumento ou ambiente', em: new Date().toISOString(), token_vive_por_s: viveiro, url: URL_APP, boots: {} };
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 45000) { let v = false; try { v = await E("!!document.getElementById('loginScreen')"); } catch {} if (v) return; await new Promise((r) => setTimeout(r, 300)); } })();
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(S.coordinator)}))`);
const chavePresente = await E(`!!localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
console.log('[pré] chave na localStorage: ' + chavePresente);

const Sondar = `(async () => {
  const dormir = ms => new Promise(r => setTimeout(r, ms));
  const pronto = () => !!document.getElementById('appShell')?.classList.contains('ready');
  const t0 = Date.now(); let ms = null;
  while (Date.now() - t0 < 60000) { if (pronto()) { ms = Date.now() - t0; break; } await dormir(300); }
  const corpo = (document.body?.innerText || '').replace(/\\s+/g, ' ');
  return {
    pronto: pronto(), ms_ready: ms,
    papel: window.BFR_CURRENT_PROFILE?.role ?? null,
    runtime: typeof window.BFR_APP_RUNTIME,
    shell_existe: !!document.getElementById('appShell'),
    classes_shell: Array.from(document.getElementById('appShell')?.classList || []).join(' '),
    login_visivel: !!(document.getElementById('loginScreen')?.offsetWidth || document.getElementById('loginScreen')?.offsetHeight),
    token_la: !!(JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || 'null')?.access_token),
    frases: { bemvindo: /Bem-vindo|Bem vindo/.test(corpo), carregando: /Carregando|Aguarde|preparado/.test(corpo), erro: /erro|Error|falha/i.test(corpo), comeca_por: corpo.slice(0, 60) },
    botoes: document.querySelectorAll('button[data-section]').length,
  };
})()`;
const passos = [
  ['A_1280_frio', 1280, 900, false],
  ['B_1280_outra_vez', 1280, 900, false],
  ['C_390', 390, 800, true],
  ['D_1280_logo_apos_390', 1280, 900, false],
];
for (const [nome, w, h, mobile] of passos) {
  niv = []; falhasRede = []; respostas = []; exceptions = []; logEntradas = [];
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url: URL_APP });
  await new Promise((r) => setTimeout(r, 1500));
  const r = await E(Sondar);
  r.largura = w;
  r.pedidos = respostas.length + falhasRede.length;
  r.http_maus = respostas.filter((x) => x.codigo >= 400);
  r.rede_falhou = falhasRede;
  r.excecoes = exceptions.slice(0, 5);
  r.log_erros = logEntradas.filter((x) => x.nivel === 'error').slice(0, 6);
  r.console_erros = niv.filter((x) => x.nivel === 'error').slice(0, 8);
  r.console_total = niv.length;
  out.boots[nome] = r;
  console.log(`[${nome}] pronto=${r.pronto} ms=${r.ms_ready} papel=${JSON.stringify(r.papel)} login=${r.login_visivel} token_la=${r.token_la} pedidos=${r.pedidos} http>=400=${r.http_maus.length} rede_falha=${r.rede_falhou.length} exc=${r.excecoes.length} log_erro=${r.log_erros.length} cons_erro=${r.console_erros.length}`);
  if (r.http_maus.length) console.log('     http_maus: ' + JSON.stringify(r.http_maus.slice(0, 4)));
  if (r.rede_falhou.length) console.log('     rede_falhou: ' + JSON.stringify(r.rede_falhou.slice(0, 4)));
  if (r.log_erros.length) console.log('     log_erros: ' + JSON.stringify(r.log_erros.slice(0, 3)));
  if (r.console_erros.length) console.log('     cons_erro: ' + JSON.stringify(r.console_erros.slice(0, 3)));
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
}
const a = out.boots.A_1280_frio, d = out.boots.D_1280_logo_apos_390, c = out.boots.C_390;
out.leitura = {
  a_frio_abriu: a.pronto,
  reproduziu_na_ordem_do_varredura: !d.pronto && !!c.pronto,
  a_frio_nao_abriu: !a.pronto,
  frase_de_arranque: a.frases.erro || d.frases.erro ? 'apareceu texto com erro' : 'sem texto de erro no corpo',
};
out.leitura.conclusao = out.leitura.a_frio_abriu && out.leitura.reproduziu_na_ordem_do_varredura
  ? 'INSTRUMENTO: a 1280 px a frio abre; falha só quando a navegação atalha um boot em curso. Não é defeito do app.'
  : (out.leitura.a_frio_nao_abriu ? 'APP: 1280 px a frio também não abre — reproduzível fora do varredura, é defeito do layout desktop do coordinator.' : 'INCONCLUSIVO: a ordem não separou as hipóteses — ver captura crua.');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\n' + JSON.stringify(out.leitura, null, 2));
console.log('md5=' + createHash('md5').update(readFileSync(OUT)).digest('hex'));
fecho = true;
abort(0, 'fecho normal');
