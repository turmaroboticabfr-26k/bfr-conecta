// AH-2-SONDA pending (v2) — dois lados da mesma verdade: (1) no bundle, quem chama enterApp() e o que
// filtra o papel; (2) no ar, o que a conta pending vê aos 5/15/30 s. Amostragem feita do lado do Node,
// porque o app recarrega sozinho e um setTimeout dentro da página morre com a navegação.
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2sonda-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-pending-17-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro nome');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const rr = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S.pending.refresh_token }) });
const sessao = await rr.json();
if (!sessao.access_token) throw new Error('refresh falhou: ' + JSON.stringify(sessao).slice(0, 160));

// (1) lado estático: call sites de enterApp e o teste de papel que o antecede
const occ = []; let i = -1;
while ((i = shellTxt.indexOf('enterApp', i + 1)) >= 0 && occ.length < 12) occ.push({ pos: i, trecho: shellTxt.slice(Math.max(0, i - 220), i + 60).replace(/\s+/g, ' ') });
const estatico = occ.map((o) => o.trecho);
console.log('=== ocorrências de enterApp no bundle: ' + occ.length + ' ===');
estatico.forEach((t, n) => console.log(`[${n}] …${t.slice(-190)}`));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=9353', `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=390,800', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const fim = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log(m); process.exit(c); };
setTimeout(() => fim(3, 'watchdog 240 s'), 240000);
let tg = [];
for (let n = 0; n < 50; n++) { try { tg = await (await fetch('http://127.0.0.1:9353/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const alvo = tg.find((t) => t.type === 'page');
let ws, seq = 0, pen = new Map(), vivo = true;
const erros = [];
const liga = () => new Promise((res, rej) => {
  ws = new WebSocket(alvo.webSocketDebuggerUrl);
  ws.onopen = () => res(); ws.onerror = (e) => rej(e);
  ws.onclose = () => { vivo = false; };
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pen.has(m.id)) { const p = pen.get(m.id); pen.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
});
await liga().catch(() => fim(4, 'sem ws'));
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pen.set(id, { res, rej }); try { ws.send(JSON.stringify({ id, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200)); return r.result?.value; };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

const MED = `(() => {
  const shell = document.getElementById('appShell'); const login = document.getElementById('loginScreen');
  const visiveis = Array.from(document.body.querySelectorAll('*')).filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 40 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden'; });
  const comTexto = visiveis.filter(e => (e.innerText || '').trim().length > 12).slice(0, 12).map(e => ({ tag: e.tagName, id: e.id || null, chars: (e.innerText || '').trim().length, inicio: (e.innerText || '').trim().slice(0, 60).replace(/\\s+/g, ' ') }));
  return { papel: window.BFR_CURRENT_PROFILE?.role ?? null, appShell_ready: shell ? shell.classList.contains('ready') : null, loginScreen_visivel: login ? !!(login.offsetWidth || login.offsetHeight) : null, n_visiveis: visiveis.length, body_chars: (document.body.innerText || '').trim().length, com_texto: comTexto };
})()`;

await send('Page.enable');
await send('Page.navigate', { url: URL_APP });
for (let n = 0; n < 80; n++) { try { if (await E("!!document.getElementById('loginScreen')")) break; } catch (e) { erros.push('esp:' + String(e.message).slice(0, 60)); } await dorme(400); }
try { await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`); } catch (e) { erros.push('ls:' + String(e.message).slice(0, 60)); }
const t0 = Date.now();
const series = [];
for (const m of [2000, 6000, 12000, 20000, 32000]) {
  await dorme(Math.max(0, t0 + m - (Date.now() - t0)));
  try { const v = await E(MED); series.push({ ms: m, ...v }); console.log(`  @${m} ms: papel=${v.papel} ready=${v.appShell_ready} login_visivel=${v.loginScreen_visivel} visiveis=${v.n_visiveis} chars=${v.body_chars}`); }
  catch (e) { series.push({ ms: m, erro: String(e.message).slice(0, 90) }); console.log(`  @${m} ms: eval falhou (${String(e.message).slice(0, 60)})`); }
}
const ultimo = series[series.length - 1];
const out = { em: new Date().toISOString(), papel_testado: 'pending', bundle_enterApp: estatico, series, veredito: null, erros_resiliencia: erros.slice(0, 6) };
out.veredito = ultimo.appShell_ready === true ? 'pending ENTRA no app' : (ultimo.loginScreen_visivel ? 'pending fica RETIDO no ecrã de login' : 'pending fica numa tela sem shell nem login');
console.log('\n=== veredito ===\n' + out.veredito + '\n' + JSON.stringify(ultimo, null, 1));
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
fim(0, 'AH2_SONDA_PENDING_FEITA · ' + OUT.split('/').pop());
