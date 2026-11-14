// S21-3d — prova final no navegador: boot REAL do supervisor na v119, os DOIS estados da aba.
//  A) papel real sem caminho: o menu não expõe Secretaria/Supervisão (causa: setRole sem ramo para education_supervisor)
//  B) caminho admitido pelo próprio app: setRole('secretary') → aba Supervisão → a chamada que o navegador EMITE
// Nada de token na conversa: sessão lida do ficheiro e injetada pela CDP.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = 'sb-yyzqoxlkcvqpessypfjo-auth-token';
const PORT = 9343;
const PERFIL = `${DIR}/.s21-chrome-profile-c`;
const OUT = `${DIR}/s21-navegador-b.json`;
const EVID = `${DIR}/bfr-conecta/evidence`;

const S = JSON.parse(readFileSync(`${DIR}/s21-session.json`, 'utf8'));
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
if (!existsSync(PERFIL)) mkdirSync(PERFIL, { recursive: true });
if (!existsSync(EVID)) mkdirSync(EVID, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`,
  '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
], { stdio: 'ignore' });
const abort = (c, m) => { try { chrome.kill(); } catch {} console.log('PAROU: ' + m); process.exit(c); };

let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}
const page = targets.find(t => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
const redes = [], consoleErros = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.responseReceived' && /\/rest\/v1\//.test(m.params.response.url))
    redes.push({ url: decodeURIComponent(m.params.response.url), status: m.params.response.status, reqId: m.params.requestId });
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

const out = { ciclo: 'S21-3d', em: new Date().toISOString(), url: URL_APP, stages: {} };
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
console.log('[b] ready em ' + out.stages.ms_ready + ' ms');

// ── A) estado do papel real, sem nenhum toque
out.stages.A_papel_real = await evalJS(`(() => ({
  papel: window.BFR_CURRENT_PROFILE?.role ?? null,
  views_visiveis: Array.from(document.querySelectorAll('[id$="View"]')).filter(v=>getComputedStyle(v).display!=='none').map(v=>v.id),
  menu_visivel: Array.from(document.querySelectorAll('.nav-item[data-section]')).filter(b=>b.offsetWidth||b.offsetHeight).map(b=>b.dataset.section),
  secretaria_visivel: !!(document.querySelector('[data-section="secretaria"]')?.offsetWidth),
  aba_supervisao_no_dom: !!document.querySelector('[data-sec-tab="supervisao"]'),
  items_data_section_unicos: [...new Set(Array.from(document.querySelectorAll('[data-section]')).map(e=>e.dataset.section))].length,
  tem_secao_supervisao_no_menu: [...new Set(Array.from(document.querySelectorAll('[data-section]')).map(e=>e.dataset.section))].includes('supervisao')
}))()`);
console.log('  A: ' + JSON.stringify(out.stages.A_papel_real).slice(0, 600));
out.stages.A_captura = await shot('s21--A-papel-real-v119');
gate('A: papel real boota como education_supervisor', out.stages.A_papel_real.papel, 'education_supervisor');
gate('A: a aba Supervisão NÃO está no DOM com o papel real', out.stages.A_papel_real.aba_supervisao_no_dom, false);

// B) o caminho que o próprio app admite: setRole('secretary') permite education_supervisor
const antes = redes.length;
out.stages.setRole_retorno = await evalJS(`(() => { try { window.setRole('secretary'); return 'chamado'; } catch (e) { return 'erro: ' + String(e.message).slice(0,80); } })()`);
const achouAba = await waitFor(`!!document.querySelector('[data-sec-tab="supervisao"]')`, 30000).catch(() => null);
out.stages.B_ms_ate_aba = achouAba;
console.log('[b] setRole(' + out.stages.setRole_retorno + ') → aba presente em ' + achouAba + ' ms');

const marcaAntes = redes.length;
await evalJS(`(() => { const el = document.querySelector('[data-sec-tab="supervisao"]'); el.scrollIntoView({block:'center'}); el.click(); return true; })()`);
let sup = [];
for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 1000));
  sup = redes.slice(marcaAntes).filter(r => /supervision_requests/.test(r.url));
  if (sup.length >= 1) break;
}
if (!sup.length) { const t0 = Date.now(); while (Date.now() - t0 < 20000) { await new Promise(r => setTimeout(r, 1000)); sup = redes.slice(antes).filter(r => /supervision_requests/.test(r.url)); if (sup.length) break; } }
out.stages.B_pintura = await evalJS(`(() => {
  const aba = document.querySelector('[data-sec-tab="supervisao"]');
  const vis = !!(aba?.offsetWidth || aba?.offsetHeight || aba?.getClientRects().length);
  const painel = aba?.closest('section,div');
  const lista = document.querySelector('[data-sec-supervision-list]');
  return { aba_visivel: vis, lista_presente: !!lista, linhas: lista ? lista.querySelectorAll('article,li,tr,.bfr-sup-item').length : null,
           texto: (painel?.innerText || '').replace(/\\s+/g,' ').trim().slice(0, 500) };
})()`);
console.log('  B: ' + JSON.stringify(out.stages.B_pintura).slice(0, 500));
gate('B: a aba Supervisão fica visível após o caminho do app', out.stages.B_pintura.aba_visivel, true);

const corpos = [];
for (const c of sup) {
  try { const b = await send('Network.getResponseBody', { requestId: c.reqId }); corpos.push({ url: c.url.slice(0, 700), status: c.status, corpo: (b.body || '').slice(0, 600) }); }
  catch (e) { corpos.push({ url: c.url.slice(0, 700), status: c.status, erro_leitura: String(e.message).slice(0, 90) }); }
}
out.stages.B_respostas = corpos;
corpos.forEach(c => console.log(`  → HTTP ${c.status} ${String(c.corpo || c.erro_leitura).slice(0, 120)}`));
gate('B: o navegador EMITE a chamada supervision_requests', sup.length >= 1, true);
gate('B: houve resposta lida pelo CDP', corpos.length >= 1, true);
gate('B: nenhuma resposta 400', corpos.every(c => c.status !== 400), true);
gate('B: nenhum PGRST200 no corpo', corpos.every(c => !String(c.corpo || '').includes('PGRST200')), true);
gate('B: URL usa sports_schools(name)', corpos.every(c => c.url.includes('sports_schools(name)')), true);
gate('B: nenhuma URL usa a forma partida schools(name)', corpos.every(c => !/(?<![a-z_.])schools\(/i.test(c.url)), true);
gate('B: HTTP 200 em todas as respostas do embed', corpos.every(c => c.status === 200), true);

out.stages.B_captura = await shot('s21--B-aba-supervisao-v119-logado');
const relevantes = consoleErros.filter(t => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource/i.test(t));
out.stages.erros_console = { bruto: consoleErros.length, relevantes: relevantes.slice(0, 15) };
console.log('  erros de console relevantes: ' + relevantes.length);
gate('sem erro de aplicação no console', relevantes.length, 0);

out.stages.redes_resto = redes.slice(antes).filter(r => !/supervision_requests/.test(r.url)).map(r => ({ url: r.url.slice(0, 160), status: r.status }));
out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? 'S21_NAVEGADOR_B_PAROU' : 'S21_ABA_LOGADA_OK';
out.regua = { shell_md5_esperado: 'a1969cdf023042e7d2a91e7ed9333a05', shell_bytes_esperado: 3489474 };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(out.veredito);
abort(0, 'fecho normal');
