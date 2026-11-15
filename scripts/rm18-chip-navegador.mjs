// RM-1.8-N — prova do chip no navegador: boot REAL do education_supervisor no ar (v123) e leitura do
// chip da conta (.mini-person). Nada de token na conversa: sessão lida de rm18-session.json e injetada
// pela CDP. Sem setRole: na v120+ o roteador já tem ramo para education_supervisor.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = 'sb-yyzqoxlkcvqpessypfjo-auth-token';
const PORT = 9347;
const PERFIL = `${DIR}/.rm18-chrome-profile`;
const OUT = process.env.RM18_OUT || `${DIR}/bfr-conecta/evidence/rm18-navegador.json`;
const SHOT = process.env.RM18_SHOT || 'rm18--chip-supervisor';
const EVID = `${DIR}/bfr-conecta/evidence`;

const S = JSON.parse(readFileSync(`${DIR}/rm18-session.json`, 'utf8'));
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL, { recursive: true });
if (!existsSync(EVID)) mkdirSync(EVID, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`,
  '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
], { stdio: 'ignore' });
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
setTimeout(() => abort(3, 'watchdog 300 s — a árvore do chrome morre aqui'), 300000);

let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}
const page = targets.find(t => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome antes do fim'); };
await Promise.race([
  new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout do handshake ws (30 s)')), 30000)),
]).catch(e => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map();
const consoleErros = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    consoleErros.push((m.params.args || []).map(a => String(a.value ?? a.description ?? '')).join(' ').slice(0, 220));
  if (m.method === 'Runtime.exceptionThrown')
    consoleErros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 220));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
  return r.result?.value;
};
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(e)) return Date.now() - t0; await new Promise(r => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 140)); };
const shot = async (nome) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(s.data, 'base64');
  const caminho = `${EVID}/${nome}.png`;
  writeFileSync(caminho, buf);
  return { caminho: caminho.split('/').pop(), bytes_ficheiro: statSync(caminho).size, md5: createHash('md5').update(buf).digest('hex') };
};

const out = { ciclo: 'RM-1.8-N', em: new Date().toISOString(), url: URL_APP, stages: {} };
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
await waitFor(`!!document.getElementById('loginScreen')`, 60000);
const expira_em = S.expires_at - Math.floor(Date.now() / 1000);
gate('token ainda vivo (' + expira_em + ' s)', expira_em > 120, true);
const sessao = { access_token: S.access_token, token_type: 'bearer', expires_in: Math.max(expira_em, 60), expires_at: S.expires_at, refresh_token: S.refresh_token, user: S.user };
await evalJS(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
out.stages.ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === 'education_supervisor'`, 120000);
console.log('[n] ready em ' + out.stages.ms_ready + ' ms');

// ── o chip da conta, sem nenhum toque de setRole ──
// Predicado extraído dos bytes do bundle (worker.mjs): o pinta faz
//   .mini-person span:not([style]) ← account[1]   (substituição integral do span)
//   [data-account-display-name]   ← preferredDisplayName() = official.split(' ')[0]
out.stages.chip = await evalJS(`(() => {
  const mini = document.querySelector('.mini-person');
  const chipSpan = mini?.querySelector('span:not([style])');
  return {
    mini_presente: !!mini,
    chip: chipSpan ? chipSpan.textContent.trim() : null,
    nome: document.querySelector('[data-account-display-name]')?.textContent.trim() ?? null,
    spans_todos: Array.from((mini?.querySelectorAll('span') || [])).map(s => s.textContent.trim()).filter(Boolean),
    papel: window.BFR_CURRENT_PROFILE?.role ?? null,
    views_visiveis: Array.from(document.querySelectorAll('[id$="View"]')).filter(v=>getComputedStyle(v).display!=='none').map(v=>v.id),
  };
})()`);
console.log('  chip: ' + JSON.stringify(out.stages.chip).slice(0, 500));
gate('papel real da sessão = education_supervisor', out.stages.chip.papel, 'education_supervisor');
gate('mini-person presente', out.stages.chip.mini_presente, true);
gate('chip da conta = «Supervisor(a) de ensino»', out.stages.chip.chip, 'Supervisor(a) de ensino');
gate('nome pintado = 1.º token do full_name («RM18»)', out.stages.chip.nome, 'RM18');
gate('nenhum span do mini-person diz «Responsável»', out.stages.chip.spans_todos.includes('Responsável'), false);

out.stages.captura = await shot(SHOT);
const relevantes = consoleErros.filter(t => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource/i.test(t));
out.stages.erros_console = { bruto: consoleErros.length, relevantes: relevantes.slice(0, 15) };
console.log('  erros de console relevantes: ' + relevantes.length);
gate('sem erro de aplicação no console', relevantes.length, 0);

out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? 'RM18_NAVEGADOR_PAROU' : 'RM18_CHIP_OK';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(out.veredito);
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
