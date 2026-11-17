// Sonda de instrumento: o que cada forma de fixar a janela do Chrome headless DEVOLVE em window.innerWidth,
// numa página cujo CSS declara width=device-width e cujo conteúdo faz 1400 px de largura. Rodada porque a
// régua do fixture pressupunha 390 e nunca bateu: reenviar setDeviceMetricsOverride não mudou nada.
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9353;
const FIX = join(tmpdir(), 'ah1-sonda-janela.html');
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head>
<body style="margin:0"><div id="empurra" style="width:1400px;height:40px"></div>
<div style="height:2000px"></div></body></html>`;
writeFileSync(FIX, HTML, 'utf8');

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), 'ah1-sonda-janela-profile')}`,
  '--headless=new', '--window-size=390,800', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
const sayo = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} try { unlinkSync(FIX); } catch {} console.log(m); process.exit(c); };
setTimeout(() => sayo(3, 'PAROU: watchdog 90 s'), 90000);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {} await new Promise(r => setTimeout(r, 300)); }
const page = targets.find(t => t.type === 'page');
if (!page) sayo(1, 'PAROU: sem alvo page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('handshake')), 20000); });
let seq = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 160)); return r.result.value; };

await send('Page.enable'); await send('Runtime.enable');
const url = 'file:///' + FIX.replace(/\\/g, '/');
const LER = `({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, clientWidth: document.documentElement.clientWidth, bodyScrollWidth: document.body.scrollWidth, vvWidth: visualViewport.width, vvScale: visualViewport.scale })`;
let METR = null;
try { METR = await send('Emulation.getDeviceMetricsOverride'); } catch (e) { METR = 'Metodo_inexistente_nesta_Chrome: ' + String(e.message).slice(0, 60); }
const resultado = { emulacao_atual_que_o_CDP_devolve: METR };

async function rota(nome, passos) {
  await send('Emulation.clearDeviceMetricsOverride');
  await send('Page.navigate', { url });
  await (async () => { for (let i = 0; i < 40; i++) { try { if (await ev(`!!document.getElementById('empurra')`)) return; } catch {} await new Promise(r => setTimeout(r, 150)); } })();
  const antes = await ev(LER);
  await passos();
  const depois = await ev(LER);
  resultado[nome] = { antes, depois };
  console.log(`\n── ${nome}`);
  console.log('   antes :', JSON.stringify(antes));
  console.log('   depois:', JSON.stringify(depois));
}

await rota('A_reenviar_emulacao_depois_da_navigate', async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  for (let i = 0; i < 12; i++) await ev(`document.documentElement.style.setProperty('--p', '${i}'); void document.body.offsetHeight;`);
});
await rota('B_only_window_size_sem_emulacao', async () => {
  for (let i = 0; i < 4; i++) await ev(`void document.body.offsetHeight;`);
});
await rota('C_emulacao_antes_da_navigate_com_relayout', async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  await (async () => { for (let i = 0; i < 40; i++) { try { if (await ev(`!!document.getElementById('empurra')`)) return; } catch {} await new Promise(r => setTimeout(r, 150)); } })();
  await ev(`document.getElementById('empurra').style.height = '41px'`);
  await ev(`void document.body.offsetHeight`);
});
await rota('D_emulacao_com_desvio_de_altura_grande', async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await ev(`void document.body.offsetHeight`);
});
console.log('\ngetDeviceMetricsOverride no início:', JSON.stringify(METR));
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { unlinkSync(FIX); } catch {}
console.log('SONDA_JANELA_FEITA');
process.exit(0);
