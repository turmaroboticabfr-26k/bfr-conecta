#!/usr/bin/env node
// P73-B — bancada offline do remendo PEN-40 (candidata v137, NÃO publicada). A prova de fecho oficial do
// ledger é a re-corrida do ah2-mobile2 no AR depois da publicação; este instrumento corre o que se pode correr
// sem publicar: o mesmo shell que o ar serve hoje (index.html da candidata v136, embed idêntico ao do bundle
// v137) servido por um HTTP local, com o módulo de apresentação trocado por BASE ou CANDIDATA consoante o modo.
// A/B: modo base = app/bfr-responsive-presentation.js (byte-idêntico ao módulo servido no ar, md5 a83f77…);
// modo candidata = bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js (b83b4c26…). Sessões reais
// (ficheiros ah2-sessao-<papel>.json, renovação por refresh_token como na sonda P73-T; nada de mint, nada de
// escrita em banco). O SW do app não existe na bancada (404 no /sw-v4.js): sem cache a interferir, o módulo
// que o browser executa é exatamente o do modo. 0 publicação, 0 DDL, 0 escrita de produto, 0 impressão de token.
// Uso: node scripts/p73-bancada-pen40-navexiste.mjs <base|candidata> [porta-http] [sufixo]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { PATCH_SRC, NOME_DO_MODULO } from './p73-patch-timer-piso-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const PUBLIC = `${REPO}/worker-deploy-v137-remendo-pen40/public`;
const MODO = (process.argv[2] || 'candidata').trim();
if (MODO !== 'base' && MODO !== 'candidata') throw new Error('USO: p73-bancada-pen40-navexiste.mjs <base|candidata> [porta-http] [sufixo]');
const PORT = parseInt(process.argv[3] || '9611', 10);
const SUF = (process.argv[4] || '20-11e').trim();
const PAPEL = 'monitor';
const LARGURAS = [320, 360, 375, 390, 414, 430];
const CONTROLO = 'gatekeeper';
const CONTROLO_LARGURA = 320;
const ALTURA = 720;
const PERFIL = `${DIR}/.ah2nv-chrome-profile-p73b-${MODO}-${SUF}`;
const OUT = `${EV}/p73-bancada-pen40-monitor-${MODO}-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');
const HTML_PATH = `${REPO}/bfr-candidata-v136-secretaria-de-educacao/index.html`;
const HTML_TXT = readFileSync(HTML_PATH, 'utf8');
const HTML_MD5 = md5(HTML_TXT);
const MOD_BASE_TXT = readFileSync(`${REPO}/app/bfr-responsive-presentation.js`, 'utf8');
const MOD_CAND_TXT = readFileSync(`${REPO}/bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js`, 'utf8');
const MD5_BASE = md5(MOD_BASE_TXT);
const MD5_CAND = md5(MOD_CAND_TXT);
const MOD_LEG = MODO === 'base' ? MOD_BASE_TXT : MOD_CAND_TXT;
const MD5_LEG = MODO === 'base' ? MD5_BASE : MD5_CAND;
const SRC_MODULO = (/src="([^"]*bfr-responsive-presentation[^"]*)"/.exec(HTML_TXT) || [])[1];
if (!SRC_MODULO) throw new Error('ABORTA: o shell candidato não referencia bfr-responsive-presentation');
const NOME_SERVIDO = SRC_MODULO.split('?')[0].split('/').pop();
const PISO_MS = parseInt(/const PISO = (\d+), TETO = (\d+)/.exec(MOD_LEG)[1], 10);
const TETO_MS = parseInt(/const PISO = (\d+), TETO = (\d+)/.exec(MOD_LEG)[2], 10);
const REF = (/https:\/\/([a-z0-9.-]+)\.supabase\.co/i.exec(HTML_TXT) || [])[1];
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(HTML_TXT) || [])[1];
if (!REF || !anonKey) throw new Error('ABORTA: sem REF/anonKey nos bytes do shell candidato');
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.pdf': 'application/pdf', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  res.setHeader('Cache-Control', 'no-cache');
  if (p === '/' || p === '/index.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(HTML_TXT); return; }
  if (p.split('/').pop() === NOME_SERVIDO) { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end(MOD_LEG); return; }
  const f = p.replace(/^\//, '');
  if (/^[\w.-]+$/.test(f) && existsSync(`${PUBLIC}/${f}`)) {
    const ext = '.' + (f.split('.').pop() || '');
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(readFileSync(`${PUBLIC}/${f}`));
    return;
  }
  res.statusCode = 404; res.end('nao existe na bancada');
});
await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
const URL_BANCADA = `http://127.0.0.1:${PORT}/`;
const self_html = await (await fetch(URL_BANCADA, { headers: { 'cache-control': 'no-cache' } })).text();
const self_mod = await (await fetch(URL_BANCADA + SRC_MODULO, { headers: { 'cache-control': 'no-cache' } })).text();
if (md5(self_html) !== HTML_MD5) throw new Error('ABORTA: o servidor local não serve o index.html lido (' + md5(self_html) + ' != ' + HTML_MD5 + ')');
if (md5(self_mod) !== MD5_LEG) throw new Error('ABORTA: o servidor local não serve o módulo do modo ' + MODO + ' (' + md5(self_mod) + ' != ' + MD5_LEG + ')');

const exp_de = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString('utf8')).exp; } catch { return 0; } };
const sessoes = {};
const cache_sessao = new Map();
async function sessao_de(papel) {
  if (cache_sessao.has(papel)) return cache_sessao.get(papel);
  const ficheiro = `${DIR}/ah2-sessao-${papel}.json`;
  if (!existsSync(ficheiro)) throw new Error('ABORTA: sem ' + ficheiro.split('/').pop() + ' — corra o condutor deste papel primeiro');
  const sess = JSON.parse(readFileSync(ficheiro, 'utf8'));
  if (!sess[papel]?.refresh_token) throw new Error('ABORTA: sem cadeia de ' + papel + ' no ficheiro do papel');
  let acesso = sess[papel];
  const acesso_antes = acesso.access_token;
  if (exp_de(acesso.access_token) <= Math.floor(Date.now() / 1000) + 120) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: acesso.refresh_token }), signal: AbortSignal.timeout(45000) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.access_token) throw new Error('ABORTA: renovação de ' + papel + ' falhou http=' + r.status + ' code=' + (j?.error_code || j?.error || 'sem-corpo'));
    acesso = { ...acesso, ...j, expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
    sess[papel] = acesso;
    writeFileSync(ficheiro, JSON.stringify(sess, null, 2) + '\n');
  }
  const relido = JSON.parse(readFileSync(ficheiro, 'utf8'))[papel];
  sessoes[papel] = { papel, gravado_em: ficheiro.split('/').pop(), gravado_fiel: relido.access_token === acesso.access_token, renovou: acesso_antes !== acesso.access_token, access_comprimento: String(acesso.access_token || '').length, refresh_comprimento: String(acesso.refresh_token || '').length, expira_em_s: exp_de(acesso.access_token) - Math.floor(Date.now() / 1000) };
  if (!sessoes[papel].gravado_fiel) throw new Error('ABORTA: o ficheiro de ' + papel + ' relido não bate com a sessão em memória');
  cache_sessao.set(papel, acesso);
  return acesso;
}

function liberta_porta(porta) {
  const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const pids = new Set();
  for (const linha of String(q.stdout || '').split(/\r?\n/)) {
    if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
    const pid = linha.trim().split(/\s+/).pop();
    if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const p of pids) {
    const dono = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter \"ProcessId=${p}\").Name`], { encoding: 'utf8' });
    const nome = String(dono.stdout || '').trim();
    if (!/chrome/i.test(nome)) { console.log('PORTA ' + porta + ': o dono (' + p + ' ' + (nome || 'desconhecido') + ') não é Chrome nosso — aborta em vez de matar'); throw new Error('ABORTA: porta ' + porta + ' ocupada por ' + (nome || 'desconhecido')); }
    spawnSync('taskkill', ['/pid', p, '/t', '/f'], { stdio: 'ignore' });
  }
  return pids.size;
}
const CDP_PORT = PORT + 1;
liberta_porta(CDP_PORT);
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + PERFIL, '--headless=new', '--window-size=' + LARGURAS[0] + ',' + ALTURA, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let fecho = false;
const saida = {
  programa: 'scripts/p73-bancada-pen40-navexiste.mjs', em: new Date().toISOString(), modo: MODO, bancada: { url: URL_BANCADA, sw: 'ausente na bancada (404 — sem cache a interferir)', html: { path: HTML_PATH.split('/').pop(), md5: HTML_MD5 }, modulos: { base: { origem: 'app/bfr-responsive-presentation.js', md5: MD5_BASE }, candidata: { origem: 'bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js', md5: MD5_CAND }, leg: MODO, md5_leg: MD5_LEG, selfcheck_servido_igual: md5(self_mod) === MD5_LEG } },
  papel: PAPEL, larguras: LARGURAS, piso_ms: PISO_MS, teto_ms: TETO_MS, sessoes,
  legenda: { leitura: 'nav_existe = #bfrMobileBottomNav presente; botoes_com_caixa = botões data-bfr-mobile-route com caixa de layout; contadores de timer via PATCH (delay=PISO e pilha a nomear o módulo)', veredicto: 'MONTA / MONTA_SO_QUANDO_SOSSEGA / NAO_MONTA (sem_toque, depois 2 resize, depois 5 s de sossego)' },
  resultados: {},
};
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} if (m === 'fecho normal') { console.log('PAROU: ' + m); process.exit(c); } try { saida.em_parcial = true; saida.INTERROMPIDA = m; writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); } catch {} console.log('PAROU: ' + m); console.log('registo ' + OUT); process.exit(c); };
const DEGRAUS = LARGURAS.length + (MODO === 'candidata' ? 1 : 0);
const TETO_GERAL_MS = DEGRAUS * 150000 + 90000;
setTimeout(() => abort(3, 'watchdog ' + Math.round(TETO_GERAL_MS / 1000) + ' s (' + DEGRAUS + ' degraus)'), TETO_GERAL_MS);
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));

let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const alvo = tg.find((t) => t.type === 'page');
if (!alvo) abort(1, 'sem alvo page');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (!m.id || !pend.has(m.id)) return; const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); };
const PRAZO_CDP = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq;
  const t = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + PRAZO_CDP(method) + ' ms')); } }, PRAZO_CDP(method));
  pend.set(i, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(t); pend.delete(i); rej(e); }
});
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };

const LEITURA = `(() => {
  const nav = document.getElementById('bfrMobileBottomNav');
  const bot = nav ? Array.from(nav.querySelectorAll('button[data-bfr-mobile-route]')) : [];
  const t = window.__p73t || null;
  return { nav_existe: !!nav, botoes: bot.length, botoes_com_caixa: bot.filter((b) => b.offsetWidth || b.offsetHeight).length, corpo_mobile: document.body.classList.contains('bfr-mobile-presentation'), shell_ready: !!document.getElementById('appShell')?.classList.contains('ready'), papel: window.BFR_CURRENT_PROFILE?.role || null,
    armados_piso: t ? t.armados : null, venceu_piso: t ? t.venceu : null, cancelados_piso: t ? t.cancelados : null, outros_delays_do_modulo: t ? t.outros : null,
    armados_por_segundo: t && t.t_armados.length > 1 ? Math.round((t.armados * 1000) / ((t.t_armados[t.t_armados.length - 1] - t.t_armados[0]) || 1)) : null,
    sinistros: (window.__p73t_erros || []).slice(0, 3) };
})()`;
const VEREDICTO = (r) => r.sem_toque.nav_existe ? 'MONTA'
  : (r.sossego_5s ? r.sossego_5s.nav_existe : false) ? 'MONTA_SO_QUANDO_SOSSEGA'
    : 'NAO_MONTA';
const PATCH = PATCH_SRC(PISO_MS);

async function degrau(papel, largura) {
  await send('Emulation.setDeviceMetricsOverride', { width: largura, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_BANCADA });
  await waitFor("!!document.getElementById('loginScreen')", 60000);
  const sess_p = await sessao_de(papel);
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sess_p)}))`);
  await send('Page.navigate', { url: URL_BANCADA });
  const ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(papel)}`, 70000);
  const patch = await E(PATCH);
  await E('new Promise(r => setTimeout(r, 3000))');
  const sem_toque = await E(LEITURA);
  await E(`new Promise(r => { window.dispatchEvent(new Event('resize')); setTimeout(() => { window.dispatchEvent(new Event('resize')); r(1); }, 50); })`);
  await E('new Promise(r => setTimeout(r, 1500))');
  const dois_eventos = await E(LEITURA);
  await E('new Promise(r => setTimeout(r, 5000))');
  const sossego_5s = await E(LEITURA);
  return { largura, ms_ready, patch, sem_toque, dois_eventos, sossego_5s };
}

await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: PATCH });
console.log('BANCADA ' + MODO + ': ' + URL_BANCADA + ' · html md5=' + HTML_MD5 + ' · modulo leg=' + MD5_LEG + ' · selfcheck servido igual=' + (md5(self_mod) === MD5_LEG) + ' · PISO=' + PISO_MS + ' ms TETO=' + TETO_MS + ' ms · SW ausente (sem cache)');

if (MODO === 'candidata') {
  const ctl = await degrau(CONTROLO, CONTROLO_LARGURA);
  saida.controlo = { papel: CONTROLO, largura: CONTROLO_LARGURA, ...ctl };
  ctl.veredicto = VEREDICTO(ctl);
  if (!ctl.sem_toque.nav_existe) throw new Error('ABORTA: o controlo (' + CONTROLO + '@' + CONTROLO_LARGURA + ') não montou a barra com a candidata — regressão ou régua sem lado positivo');
  if (ctl.sem_toque.armados_piso === null) throw new Error('ABORTA: o patch não está activo no controlo (armados_piso=null) — instrumento cego');
  if (ctl.sem_toque.armados_piso === 0 && ctl.sem_toque.outros_delays_do_modulo === 0) throw new Error('ABORTA: o controlo nunca armou um setTimeout com delay=' + PISO_MS + ' — a filtragem por pilha não casa nada');
  if (ctl.sem_toque.venceu_piso === 0) throw new Error('ABORTA: o controlo armou ' + ctl.sem_toque.armados_piso + ' timers do módulo e não deixou vencer nenhum — régua sem dentes');
  console.log('CONTROLO ' + CONTROLO + '@' + CONTROLO_LARGURA + ': nav_existe=true botoes_com_caixa=' + ctl.sem_toque.botoes_com_caixa + ' armados=' + ctl.sem_toque.armados_piso + ' venceu=' + ctl.sem_toque.venceu_piso + ' · régua com dentes nos dois lados');
}

for (const w of LARGURAS) {
  const r = await degrau(PAPEL, w);
  saida.resultados[w] = r;
  r.veredicto = VEREDICTO(r);
  const a = r.dois_eventos, c = r.sossego_5s;
  console.log(String(w).padEnd(5) + PAPEL.padEnd(12) + ' nav sem_toque=' + r.sem_toque.nav_existe + ' apos_eventos=' + a.nav_existe + ' apos_5s_sossego=' + c.nav_existe +
    ' botoes_caixa=' + c.botoes_com_caixa + '/' + c.botoes +
    ' · timers do modulo: armados=' + a.armados_piso + ' venceu=' + a.venceu_piso + ' cancelados=' + a.cancelados_piso + ' (fim: armados=' + c.armados_piso + ' venceu=' + c.venceu_piso + ' cancelados=' + c.cancelados_piso + ' armados/s=' + c.armados_por_segundo + ')' +
    ' corpo_mobile=' + c.corpo_mobile + ' sinistros=' + JSON.stringify(c.sinistros) + ' -> ' + r.veredicto);
  if (MODO === 'base' && r.sem_toque.armados_piso === null) throw new Error('ABORTA: patch inactivo na largura ' + w + ' — instrumento cego no modo base');
}
saida.resumo = {};
for (const w of LARGURAS) {
  const r = saida.resultados[w];
  saida.resumo[w] = { veredicto: r.veredicto, sem_toque: r.sem_toque.nav_existe, apos_eventos: r.dois_eventos.nav_existe, apos_sossego: r.sossego_5s.nav_existe, botoes_com_caixa: r.sossego_5s.botoes_com_caixa, venceu_piso: r.sossego_5s.venceu_piso, cancelados_piso: r.sossego_5s.cancelados_piso };
}
fecho = true;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('P73_BANCADA_' + MODO.toUpperCase() + ' · montam=' + LARGURAS.filter((w) => saida.resumo[w].sem_toque).length + '/' + LARGURAS.length + ' · registo ' + OUT);
abort(0, 'fecho normal');
