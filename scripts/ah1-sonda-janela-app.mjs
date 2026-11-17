// Sonda de instrumento, anónima e só de leitura: qual das quatro réguas vale a largura PEDIDA numa página
// REAL do bfr-conecta, servida com a mesma ordem de CDP do `ah2-mobile2.mjs` (emulação → navigate, :212-216).
// Por que existe: o fixture de predicado provou num ficheiro local que `window.innerWidth` NÃO é a janela
// emulada (deu 1400 com conteúdo largo e 504 com --window-size=390,800), enquanto
// `documentElement.clientWidth` e `visualViewport.width` davam 390. Os instrumentos da banda mobile
// (`ah2-mobile.mjs:114`, `ah2-mobile2.mjs:159`, `ah2-varredura.mjs:177`) gravam `largura: window.innerWidth`
// e comparam `estouro_h` com ela. Antes de dizer seja o que for sobre os «0 estouro» dessas passadas, tenho
// de medir o que essa régua vale numa página do app.
// Nota 17/11 posterior: foi esta sonda que autorizou corrigir os emissores para `documentElement.clientWidth`
// (§AI.32, PEN-35). As linhas citadas acima são o estado ANTERIOR, não o do ficheiro hoje.
// Nada aqui escreve: sessão nenhuma é injetada, o tráfego é o do boot anónimo (GET), nenhum token é lido.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const PORT = 9354;
const PERFIL = `${DIR}/.ah1-sonda-janela-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah1-sonda-janela-app-17-11.json`;
const LARGURAS = [390, 320, 430];
const ALTURA = 800;

if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
const md5 = (b) => createHash('md5').update(b).digest('hex');

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`,
  '--headless=new', '--window-size=390,800', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
setTimeout(() => abort(3, 'watchdog 420 s'), 420000);

let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await new Promise(r => setTimeout(r, 400));
}
const page = targets.find(t => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => abort(4, 'ws fechado pelo chrome');
await Promise.race([
  new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('handshake 30 s')), 30000)),
]);
let seq = 0; const pending = new Map(); const respostas = [];
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } if (m.method) respostas.push(m.method); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200)); return r.result.value; };

const LER = `({
  window_innerWidth: window.innerWidth,
  window_innerHeight: window.innerHeight,
  doc_clientWidth: document.documentElement.clientWidth,
  doc_clientHeight: document.documentElement.clientHeight,
  visualViewport_width: visualViewport.width,
  visualViewport_scale: visualViewport.scale,
  body_scrollWidth: document.body ? document.body.scrollWidth : null,
  body_scrollHeight: document.body ? document.body.scrollHeight : null,
  screen_width: screen.width,
  appShell_ready: !!(document.getElementById('appShell') && document.getElementById('appShell').classList.contains('ready')),
  login_visivel: !!document.getElementById('loginScreen') && !!(document.getElementById('loginScreen').offsetWidth || document.getElementById('loginScreen').getClientRects().length),
})`;

await send('Page.enable'); await send('Runtime.enable');
const out = {
  programa: 'scripts/ah1-sonda-janela-app.mjs', em: new Date().toISOString(), url: URL_APP,
  ordem_cdp: 'Emulation.setDeviceMetricsOverride → Page.navigate (a do ah2-mobile2.mjs:212-216), deviceScaleFactor 2',
  o_que_prova: 'qual régua devolve a largura pedida numa página real do app, e se body.scrollWidth ultrapassa essa régua',
  o_que_NAO_prova: 'nada autenticado: sem sessão, os painéis não montam — por isso o valor das réguas DENTRO de uma vista de papel real continua por medir, e o que isto decide é o instrumento, não a tela',
  por_largura: {},
};
for (const w of LARGURAS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_APP });
  let pronto = null;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await ev(`!!document.getElementById('loginScreen') || !!document.getElementById('appShell')`);
      if (r) { pronto = i * 250; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  if (!pronto) abort(6, 'a página do app não montou a largura ' + w);
  await new Promise(r => setTimeout(r, 2500));
  const sem_relayout = await ev(LER);
  await ev(`document.getElementById('loginScreen')?.style.setProperty('--sonda','1'); void document.body.offsetHeight;`);
  const com_relayout = await ev(LER);
  out.por_largura[w] = { ms_ate_montar: pronto, sem_relayout, com_relayout };
  const que_bate = Object.entries(com_relayout).filter(([k, v]) => v === w).map(([k]) => k);
  out.por_largura[w].reguas_iguais_a_largura_pedida = que_bate;
  console.log(`\n── largura pedida ${w}`);
  console.log('   sem relayout :', JSON.stringify(sem_relayout));
  console.log('   com relayout :', JSON.stringify(com_relayout));
  console.log('   batem com ' + w + ':', JSON.stringify(que_bate));
}
out.veredito = {
  regua_do_ar_com_relayout: out.por_largura[390].reguas_iguais_a_largura_pedida,
  window_innerWidth_igual_ao_pedido: Object.entries(out.por_largura).map(([w, v]) => [w, v.com_relayout.window_innerWidth === Number(w)]),
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\nVEREDITO:', JSON.stringify(out.veredito));
console.log('artefacto: ' + OUT);
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
process.exit(0);
