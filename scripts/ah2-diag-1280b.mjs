// AH-2-D2 — a segunda metade do coordinator/1280. A primeira (ah2-diag-1280.mjs) refutou a hipótese da
// ordem: 1280 a frio, 1280 repetido, 390 e 1280-logo-após-390 abriram TODOS o shell. Dentro do
// varredura, o mesmo coordinator/1280 não abriu em 120 s em duas corridas (c3, c3b). A única
// diferença que sobra entre as duas situações é o que o varredura faz ANTES: percorre as 16 seções da
// banda de 390, uma a uma, com cliques reais.
// Esta experiência repõe essa diferença e responde a três perguntas separadas, porque «não abriu» é uma
// só frase para três factos diferentes:
//   1) ESTÁ LENTO ou ESTÁ MORTO? — sonda a cada 2 s durante 210 s, com série temporal.
//   2) QUE PEDIDO não termina? — emparelha requestWillBeSent com loadingFinished/Failed e lista os
//      pendurados no fim; um boot preso num pedido que nunca responde é defeito do app, não da máquina.
//   3) O DOCUMENTO AO MENOS AVANÇA? — document.readyState e nº de nós, para não confundir «página em
//      branco» com «página viva à espera de dados».
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2d2-chrome-profile`;
const PORT = 9358;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-diag-1280b-17-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const viveiro = S.coordinator.expires_at - Math.floor(Date.now() / 1000);
if (viveiro < 420) throw new Error(`ABORTA: token coordinator morre em ${viveiro} s — renovar primeiro`);
const SECOES = ['inicio', 'coordenacao', 'horarios', 'cadastro-alunos', 'comunicados', 'ocorrencias', 'atividades', 'notificacoes', 'conteudos', 'relatorios', 'comunicacao', 'chat-interno', 'jogos-escolares', 'aee', 'fotos', 'resultados-aprendizagem'];

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 560 s'), 560000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('ws')), 30000))]).catch((e) => abort(5, String(e)));
let seq = 0; const pend = new Map();
const vivos = new Map(); let resposta = []; let terminados = new Set(); let fracassados = []; let exc = [];
let janela = 0;
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  const P = m.params || {};
  if (m.method === 'Network.requestWillBeSent' && P.frameId === pageFrame) vivos.set(P.requestId, { caminho: String(P.request.url).split('?')[0].replace(/^https?:\/\/[^/]+/, ''), metodo: P.request.method, desde: Date.now() - janela });
  if (m.method === 'Network.responseReceived' && P.frameId === pageFrame) resposta.push({ caminho: String(P.response.url).split('?')[0].replace(/^https?:\/\/[^/]+/, ''), codigo: P.response.status });
  if (m.method === 'Network.loadingFinished') terminados.add(P.requestId);
  if (m.method === 'Network.loadingFailed') { const q = vivos.get(P.requestId); fracassados.push({ ...(q || {}), erro: P.errorText }); terminados.add(P.requestId); }
  if (m.method === 'Runtime.exceptionThrown') exc.push(String(P.exceptionDetails?.exception?.description || P.exceptionDetails?.text || '').slice(0, 200));
};
let pageFrame = null;
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 240)); return r.result?.value; };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const amostra = `(async () => ({ pronto: !!document.getElementById('appShell')?.classList.contains('ready'), papel: window.BFR_CURRENT_PROFILE?.role ?? null, botoes: document.querySelectorAll('button[data-section]').length, nos: document.querySelectorAll('*').length, chars: (document.body?.innerText || '').trim().length, readyState: document.readyState }))()`;

const out = { ciclo: 'AH-2-D2', aceite: 'coordinator/1280: lento, morto ou pendurado num pedido', em: new Date().toISOString(), token_vive_por_s: viveiro, secoes_percorridas: SECOES.length, url: URL_APP, stages: {} };
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
for (let i = 0; i < 150; i++) { let v = false; try { v = await E("!!document.getElementById('loginScreen')"); } catch {} if (v) break; await dorme(300); }
out.stages.frame = pageFrame = (await send('Page.getFrameTree')).frameTree.frame.id;
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(S.coordinator)}))`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: URL_APP });
let t0 = Date.now(), abriu390 = null;
while (Date.now() - t0 < 60000) { const a = await E(amostra); if (a?.pronto) { abriu390 = Date.now() - t0; break; } await dorme(300); }
console.log('[390] pronto em ' + abriu390 + ' ms · papel=' + JSON.stringify((await E(amostra)).papel));
out.stages.boot_390 = { ms: abriu390, ...(await E(amostra)) };
// percorrer as 16 seções como o varredura as percorre (clique + esperar assentar)
const perc = [];
for (const s of SECOES) {
  const ti = await E(`!!document.querySelector('button[data-section="${s}"]')`);
  if (!ti) { perc.push({ s, botao: false }); continue; }
  await E(`(() => { const m = document.querySelector('[data-mobile-more]'); if (m && m.getAttribute('aria-expanded') !== 'true') m.click(); document.querySelector('button[data-section="${s}"]').click(); })()`);
  let c = 0, anterior = -1, estavel = 0, ms = 0; const p0 = Date.now();
  while (estavel < 2 && ms < 9000) { await dorme(600); ms = Date.now() - p0; c = await E(`(() => { const v = Array.from(document.querySelectorAll('[id$="Panel"],[id$="View"],section,main')).filter(e => { const cs=getComputedStyle(e); const b=e.getBoundingClientRect(); return cs.display!=='none' && b.width>50 && b.height>40 && e.id; }); let mc=0; for(const e of v) mc=Math.max(mc,(e.innerText||'').trim().length); return mc; })()`) || 0; if (c === anterior && anterior >= 0) estavel++; else estavel = 0; anterior = c; }
  perc.push({ s, botao: true, chars: c, ms });
}
out.stages.percorso_390 = { secoes: perc, segundos: Math.round(perc.reduce((a, x) => a + (x.ms || 0), 0) / 1000), nos_no_fim: (await E(amostra)).nos };
console.log('[percurso] ' + out.stages.percorso_390.secoes.length + ' seções em ' + out.stages.percorso_390.segundos + ' s · nós no fim=' + out.stages.percorso_390.nos_no_fim);

// ═══ a navegação que no varredura não abriu: mesma ordem, mesmo estado anterior ═══
vivos.clear(); terminados = new Set(); resposta = []; fracassados = []; exc = []; janela = Date.now();
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_APP });
const serie = []; let ms_pronto = null; const t1 = Date.now();
while (Date.now() - t1 < 210000) {
  const a = await E(amostra);
  serie.push({ t_s: Math.round((Date.now() - t1) / 1000), ...(a || { erro: 'sonda falhou' }) });
  if (a?.pronto && ms_pronto === null) ms_pronto = Date.now() - t1;
  if (ms_pronto !== null && Date.now() - t1 > (ms_pronto + 15000)) break;
  await dorme(2000);
}
const pendurados = [...vivos.entries()].filter(([id]) => !terminados.has(id)).map(([, q]) => q);
out.stages.boot_1280 = { ms_pronto, serie, pedidos_vistos: vivos.size, respostas: resposta.length, http_maus: resposta.filter((x) => x.codigo >= 400), falhados: fracassados.slice(0, 12), pendurados: pendurados.slice(0, 12), excecoes: exc.slice(0, 5), auth_token_pedido: [...vivos.values()].some((q) => /\/auth\/v1\/token/.test(q.caminho)), rest_perfil: [...vivos.values()].filter((q) => /\/rest\/v1\/(profiles|staff_schools)/.test(q.caminho)).map((q) => q.caminho) };
console.log('[1280] pronto=' + (ms_pronto === null ? 'NUNCA (210 s)' : ms_pronto + ' ms') + ' · pendurados=' + pendurados.length + ' · falhados=' + fracassados.length + ' · excecoes=' + exc.length);
if (pendurados.length) console.log('  pendurados: ' + JSON.stringify(pendurados.slice(0, 6)));
if (fracassados.length) console.log('  falhados: ' + JSON.stringify(fracassados.slice(0, 6)));
out.stages.serie_ultima = serie[serie.length - 1];
out.leitura = {
  reproduziu: ms_pronto === null,
  classificacao: ms_pronto === null ? (pendurados.length ? 'PENDURADO NUM PEDIDO (defeito do app): o boot espera resposta que não chega' : 'SEM PEDIDO PENDURADO E SEM READY: ou o app desiste em silêncio, ou é o ambiente') : (ms_pronto > 120000 ? 'LENTO, não morto: abriu aos ' + ms_pronto + ' ms — o timeout de 120 s do varredura é que era curto' : 'ABRIU DEPRESSA: a ordem com percurso de seções não é a diferença'),
  ms_pronto, pendurados: pendurados.length, nos_no_fim: serie[serie.length - 1]?.nos,
};
out.md5_arte = createHash('md5').update(JSON.stringify(out)).digest('hex');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\n' + JSON.stringify(out.leitura, null, 1));
fecho = true;
abort(0, 'fecho normal');
