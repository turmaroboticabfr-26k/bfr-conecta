// S21-3 — walkthrough AUTENTICADO da aba Supervisão Educacional na v119, com Chrome real.
// O token vive só em s21-session.json e entra no localStorage pela CDP: NADA é impresso.
// Evidência pedida: a chamada que o PRÓPRIO navegador emite para supervision_requests → status + corpo.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const REF = 'yyzqoxlkcvqpessypfjo';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = 9341;
const PERFIL = `${DIR}/.s21-chrome-profile`;
const OUT = `${DIR}/s21-navegador.json`;
const EVID = `${DIR}/bfr-conecta/evidence`;

const S = JSON.parse(readFileSync(`${DIR}/s21-session.json`, 'utf8'));
if (!S.access_token) throw new Error('ABORTA: sem s21-session.json — correr s21-cycle.mjs');
if (existsSync(OUT)) throw new Error('ABORTA: s21-navegador.json já existe — correr com outro nome');
if (!existsSync(EVID)) mkdirSync(EVID, { recursive: true });
if (!existsSync(PERFIL)) mkdirSync(PERFIL, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`,
  '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
], { stdio: 'ignore' });

const abort = (codigo, motivo) => { try { chrome.kill(); } catch {} console.log('PAROU: ' + motivo); process.exit(codigo); };

// espera o alvo CDP subir
let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}
const page = targets.find(t => t.type === 'page');
if (!page) abort(1, 'Chrome não expôs alvo page no CDP');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
const eventos = { network: [], console: [] };
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (/\/rest\/v1\//.test(r.url)) eventos.network.push({ url: r.url, status: r.status, mime: r.mimeType, reqId: m.params.requestId, ts: m.params.timestamp });
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') eventos.console.push((m.params.args || []).map(a => String(a.value ?? a.description ?? '')).join(' ').slice(0, 240));
  if (m.method === 'Runtime.exceptionThrown') eventos.console.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 240));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (expression, awaitPromise = true) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
  return r.result?.value;
};
const waitFor = async (expr, timeout = 90000, step = 400, label = '') => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await evalJS(expr)) return Date.now() - t0; await new Promise(r => setTimeout(r, step)); }
  throw new Error(`waitFor timeout${label ? ' (' + label + ')' : ''}: ` + expr.slice(0, 160));
};

const out = { ciclo: 'S21', em: new Date().toISOString(), url: URL_APP, stages: {} };
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
await waitFor(`!!document.getElementById('loginScreen')`, 60000, 500, 'loginScreen');
console.log('[navegador] shell carregado, página de login presente');

// frescura e integridade da sessão ANTES de injetar (só booleans e segundos, nunca o token)
const agora = Math.floor(Date.now() / 1000);
const expira_em = S.expires_at - agora;
gate('token presente e comprido', typeof S.access_token === 'string' && S.access_token.length > 40, true);
gate(`token ainda não expirou (${expira_em} s restantes)`, expira_em > 120, true);
gate('refresh token presente', typeof S.refresh_token === 'string' && S.refresh_token.length > 10, true);
out.stages.sessao = { expira_em_segundos: expira_em, tem_refresh: typeof S.refresh_token === 'string', uid: S.id ?? S.user?.id ?? null };

// injecção da sessão: objecto montado a partir do FICHEIRO, com os campos que a app espera
const sessaoParaApp = {
  access_token: S.access_token,
  token_type: S.token_type || 'bearer',
  expires_in: S.expires_in ?? Math.max(expira_em, 60),
  expires_at: S.expires_at,
  refresh_token: S.refresh_token,
  user: S.user,
};
const inj = await evalJS(`(() => { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessaoParaApp)})); const g = localStorage.getItem(${JSON.stringify(STORAGE_KEY)}); return { gravou: !!g, bytes: (g||'').length }; })()`);
gate('sessão gravada no localStorage da origem', inj.gravou, true);
console.log(`[navegador] localStorage gravado: ${inj.bytes} B (conteúdo não impresso)`);
await send('Page.navigate', { url: URL_APP });
const prontoExpr = `document.getElementById('appShell')?.classList.contains('ready')`;
const papelExpr = `window.BFR_CURRENT_PROFILE?.role`;
let msReady = null;
try {
  msReady = await waitFor(`${prontoExpr} && ${papelExpr} === 'education_supervisor'`, 120000, 500, 'appShell ready + role');
} catch (e) {
  // diagnóstico do boot falhado: nada de credencial, só estado
  const diag = await evalJS(`({ ready: ${prontoExpr} || false, papel: ${papelExpr} ?? null, loginVisivel: !!document.getElementById('loginScreen')?.offsetParent, views: Array.from(document.querySelectorAll('.view-section')).filter(v=>getComputedStyle(v).display!=='none').map(v=>v.id), href: location.href })`);
  out.stages.boot_falhou = diag;
  console.error('  diagnóstico do boot: ' + JSON.stringify(diag));
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: [...falhas, 'BOOT: ' + e.message], veredito: 'S21_NAVEGADOR_PAROU' }, null, 2) + '\n');
  abort(1, e.message);
}
console.log(`[navegador] appShell ready com role education_supervisor em ${msReady} ms`);
out.stages.boot = { ms_ate_ready: msReady, perfil: await evalJS(`JSON.stringify(window.BFR_CURRENT_PROFILE||{})`), view_ativa: await evalJS(`(document.querySelector('.view-section[style*="display: block"],.view-section.active')?.id)||null`) };
gate('boot autenticado como education_supervisor', out.stages.boot.perfil.includes('education_supervisor'), true);

// onde estamos: a view do supervisor é a secretaryView (mapeamento lido nos bytes da v119)
out.stages.views_visiveis = await evalJS(`Array.from(document.querySelectorAll('.view-section')).filter(v=>getComputedStyle(v).display!=='none').map(v=>v.id)`);
console.log('  views visíveis: ' + JSON.stringify(out.stages.views_visiveis));

// inventário do que serve de navegação nesta build (nada dactilografado: lemos os atributos reais)
out.stages.nav_candidatos = await evalJS(`(() => {
  const attrs = el => Array.from(el.attributes || []).filter(a=>/^(data-(role-)?section|data-sec-tab|data-nav|data-section)/i.test(a.name)).map(a=>a.name+'='+a.value);
  const els = Array.from(document.querySelectorAll('[data-role-section],[data-section],[data-nav],[data-sec-tab],.nav-item'));
  return els.slice(0,60).map(el=>({ tag: el.tagName, marc: attrs(el).join(','), texto: (el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40), visivel: !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length) }));
})()`);
console.log('  candidatos de navegação: ' + out.stages.nav_candidatos.length);

const abaExpr = `document.querySelector('[data-sec-tab="supervisao"]')`;
let abaPresente = await evalJS(`!!${abaExpr}`);
if (!abaPresente) {
  // abre a secção Secretaria pelo item cujo TEXTO casa, sem adivinhar atributo
  const clicado = await evalJS(`(() => {
    const alvos = Array.from(document.querySelectorAll('[data-role-section],[data-section],[data-nav],.nav-item,button,a'))
      .filter(el => /secretaria/i.test((el.textContent||'') + ' ' + Array.from(el.attributes).map(a=>a.value).join(' ')));
    const el = alvos.find(e=>e.offsetWidth||e.offsetHeight) || alvos[0];
    if (!el) return null;
    el.click();
    return { tag: el.tagName, texto: (el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40) };
  })()`);
  out.stages.clique_secretaria = clicado;
  console.log('  clique na Secretaria: ' + JSON.stringify(clicado));
  try { await waitFor(`!!${abaExpr}`, 20000, 400, 'aba supervisao no DOM'); abaPresente = true; }
  catch { abaPresente = await evalJS(`!!${abaExpr}`); }
}
abaPresente = await evalJS(`!!${abaExpr}`);
gate('a aba Supervisão existe no DOM autenticado', abaPresente, true);

const seletorAba = await evalJS(`(() => { const el = ${abaExpr}; if (!el) return null; el.scrollIntoView({block:'center'}); return {tag: el.tagName, texto: (el.textContent||'').trim().slice(0,60), visivel: !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)}; })()`);
out.stages.aba = seletorAba;
console.log('  aba encontrada: ' + JSON.stringify(seletorAba));

const antes = eventos.network.length;
const cliques = [];
for (let tentativa = 1; tentativa <= 3; tentativa++) {
  const c = await evalJS(`(() => { const el = ${abaExpr}; if (!el) return null; el.click(); return { tag: el.tagName, texto: (el.textContent||'').trim().slice(0,40) }; })()`);
  cliques.push(c);
  // dá tempo ao loader e verifica se a chamada já saiu
  let sairam = 0;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    sairam = eventos.network.slice(antes).filter(x => /supervision_requests/.test(decodeURIComponent(x.url))).length;
    if (sairam >= 1) break;
  }
  console.log(`  clique ${tentativa}: ${JSON.stringify(c)} → chamadas supervision_requests = ${sairam}`);
  if (sairam >= 1) break;
}
out.stages.cliques = cliques;

// o que o navegador pediu depois do clique
const chamadas = eventos.network.slice(antes);
out.stages.chamadas_pos_clique = chamadas.map(c => ({ url: decodeURIComponent(c.url).slice(0, 700), status: c.status }));
const sup = chamadas.filter(c => /supervision_requests/.test(decodeURIComponent(c.url)));
console.log(`  chamadas pós-clique: ${chamadas.length}, das quais supervision_requests: ${sup.length}`);
gate('o navegador EMITE a chamada supervision_requests', sup.length >= 1, true);

// corpo real da resposta, relido pelo CDP
const corpos = [];
for (const c of sup) {
  try {
    const b = await send('Network.getResponseBody', { requestId: c.reqId });
    corpos.push({ url: decodeURIComponent(c.url).slice(0, 700), status: c.status, corpo: (b.body || '').slice(0, 600), base64: !!b.base64Encoded });
  } catch (e) { corpos.push({ url: decodeURIComponent(c.url).slice(0, 400), status: c.status, erro: String(e.message).slice(0, 120) }); }
}
out.stages.respostas_supervision = corpos;
corpos.forEach(c => console.log(`  → HTTP ${c.status} corpo=${(c.corpo || c.erro || '').slice(0, 140)}`));
gate('houve corpo lido pelo CDP', corpos.length > 0, true);
gate('nenhuma chamada supervision_requests do navegador deu 400', corpos.length > 0 && corpos.every(c => c.status !== 400), true);
gate('nenhum PGRST200 no corpo visto pelo navegador', corpos.length > 0 && corpos.every(c => !String(c.corpo || '').includes('PGRST200')), true);
gate('a query do navegador traz sports_schools(name)', corpos.length > 0 && corpos.every(c => String(c.url).includes('sports_schools%28name%29') || String(c.url).includes('sports_schools(name)')), true);
gate('nenhuma chamada usa a forma partida schools(name)', sup.every(c => !/(?<![a-z_.])schools(%28|\()name/i.test(decodeURIComponent(c.url).toLowerCase())), true);

// o que a aba pintou
out.stages.pintura = await evalJS(`(() => {
  const painel = document.querySelector('[data-sec-tab="supervisao"]')?.closest('section,div');
  const alvos = ['[data-sec-supervision-list]','.bfr-supervisao-list','[data-supervision-list]'];
  let lista = null, usado = null;
  for (const s of alvos) { const n = document.querySelector(s); if (n) { lista = n; usado = s; break; } }
  const textoPainel = (painel?.innerText || '').replace(/\\s+/g,' ').trim().slice(0, 900);
  return { seletor_lista: usado, linhas: lista ? lista.querySelectorAll('article,li,tr,.bfr-sup-item').length : null,
           texto_painel: textoPainel, tem_vazio: /nenhum|nenhuma|vazio|sem solicita|início/i.test(textoPainel) };
})()`);
console.log('  pintura: ' + JSON.stringify(out.stages.pintura).slice(0, 700));

const errosFinais = eventos.console.filter(t => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker/i.test(t));
out.stages.erros_console = { total_bruto: eventos.console.length, relevantes: errosFinais.slice(0, 20) };
console.log('  erros de console relevantes: ' + errosFinais.length);
gate('sem erro de aplicação no console após abrir a aba', errosFinais.length, 0);

const shot = await send('Page.captureScreenshot', { format: 'png' });
const caminhoShot = `${EVID}/s21--aba-supervisao-v119-logado.png`;
writeFileSync(caminhoShot, Buffer.from(shot.data, 'base64'));
out.stages.captura = { caminho: caminhoShot, bytes: Buffer.byteLength(shot.data), md5: createHash('md5').update(Buffer.from(shot.data, 'base64')).digest('hex') };
console.log('  captura: ' + out.stages.captura.md5 + ' / ' + out.stages.captura.bytes + ' B');

out.portoes = portoes; out.falhas = falhas; out.veredito = falhas.length ? 'S21_NAVEGADOR_PAROU' : 'S21_ABA_LOGADA_OK';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(out.veredito);
abort(0, 'fecho normal');
