#!/usr/bin/env node
// P131 — sonda só de geometria e alcance: A GAVETA DE OPÇÕES DE LEITÃO DO PORTEIRO E ALCANÇÁVEL POR RATO E POR
// TECLADO, E SE NÃO É, POR QUEM.
//
// O diário da v141/v142 registou o sintoma (`evidence/p127-prova-browser-p4-checkin-22-11-h.json`: gaveta
// `aberto:false`, sumário a y=1007 e o formulário a y=1155 contra uma janela de 900, `display_do_form:"grid"`).
// Isto não diz se o alvo é inalcansável pela página ou pelo meu método, e o remendo da v143 não pode nascer do
// texto do CSS: nasce da pilha medida no ponto exacto do clique. Por isso esta peça só lê geometria e só faz o
// que um utilizador faria — rolar, clicar no centro do sumário, tabular, carregar em Enter — e nunca submete.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco, 0 publicação, 0 mint, 0 rotação. Um POST a /rest/ que não seja
// o de auth desta cadeia é aborto declarado no artefacto. Escreve só evidence/p131-*.json.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, createReadStream } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Script } from 'node:vm';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const URL_AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ROTULO = (process.argv[2] || 'a').trim();
const PAPEL = 'gatekeeper';
const LARGURA = parseInt(process.env.P131_LARGURA || '1280', 10);
const ALTURA = parseInt(process.env.P131_ALTURA || '900', 10);
// O veredicto de alcance só é julgado quando a corrida declara a expectativa. `medir` (a do ar, 22/11) imprime
// a prédica sem a julgar; `toda-alcancavel` é o portão da candidata. As duas faces existem porque um portão
// que só tem um sentido não é portão.
const ESPERA = (process.env.P131_ESPERA || 'medir').trim();
// Sem P131_PASTA a sonda lê o ar publicado; com ela, serve a candidata por http em 127.0.0.1 e mede a mesma
// prédica noutro documento — nunca por cima do ar, porque publicar é outro OK.
const PASTA_LOCAL = (process.env.P131_PASTA || '').trim();
const PORT = parseInt(process.env.P131_PORT || '9411', 10);
const SERVE_PORT = parseInt(process.env.P131_SERVE_PORT || '9413', 10);
const PERFIL = DIR + '/.p131-perfil-' + PORT;
const OUT = REPO + '/evidence/p131-prova-alcancao-da-gaveta-' + ROTULO + '.json';
const PARCIAL = REPO + '/evidence/p131-prova-alcancao-da-gaveta-' + ROTULO + '-INTERROMPIDA.json';
// Prazo por família de método, medido no teto do próprio canal: 6 degraus x 60 000 ms de `Runtime.evaluate`
// = 360 s, mais arranque de chrome e uma renovação de cadeia = 120 s.
const WATCHDOG_MS = 480000;
if (existsSync(OUT) || existsSync(PARCIAL)) throw new Error('ABORTA: saida da P131 existe para o rotulo ' + ROTULO + ' - use outro, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();
const inicio = new Date().toISOString();

const saida = {
  peca: 'scripts/p131-prova-alcancao-da-gaveta.mjs', rotulo: ROTULO, em: inicio, duracao_ms: null,
  pergunta: 'no estado em que o porteiro fica, cada <details class="bfr-gate-reader-options"> abre com um clique real no centro do seu sumario, e se nao abre quem esta no ponto e com que caixa',
  metodo: 'CDP headless ' + LARGURA + 'x' + ALTURA + '; Emulation.setDeviceMetricsOverride antes do Page.navigate; prontidao esperada pelo predicado do proprio fonte (gateCentralBound + [data-gate-central-manual]); por gaveta: rect do details e do sumario, document.elementsFromPoint no centro do sumario, escalada directa no primeiro ancestor rolavel com o scrollTop programatico e a roda do rato ambos tentados e medidos, ponto assentado por leituras concordas antes do hit-teste e do despacho, recibo do click lido por uma escuta no documento e recortado pela hora marcada imediatamente antes do despacho (cancelavel e defaultPrevented), travessia por Tab e Enter reais com orcamento vindo do censo dos tabulaveis e o pousio de cada tecla registado; pedidos do fio lidos de Network.requestWillBeSent.',
  espera_declarada: ESPERA,
  janela: { largura: LARGURA, altura: ALTURA },
  gavetas: [], degraus: [], teclado: null, pedidos_no_fio: [], contagem_pedidos: {}, excepcoes_da_pagina: [],
  o_que_prova: [
    'se o centro do sumario esta dentro da janela, que elemento recebe o rato nesse ponto e com que rect, pointer-events e posicao',
    'se um clique real no centro do sumario muda details.open, lido antes e depois na mesma corrida',
    'se o ponto do clique assentou (leituras concordas do centro, com teto) e que elemento o hit-teste devolve no ponto assentado, nao numa leitura envelhecida',
    'se o browser gerou ou nao um click no ponto e se algum handler do app o cancelou (defaultPrevented medido)',
    'se a travessia por Tab chega ao sumario e se Enter/Space o abre no estado inicial recriado pelo reinicio antes do degrau, com o elemento onde cada tecla pousou',
    'que nenhum pedido de escrita saiu pelo fio durante a sonda',
  ],
  o_que_NAO_prova: [
    'o que um utilizador com outro zoom, fonte ou DPI ve - a janela e a do override, medida no artefacto',
    'se abrir a gaveta faz alguma coisa util a seguir: isso e a P127 (submissao) e a candidata, nao esta sonda',
    'o ar com a candidata aplicada: sem P131_PASTA so existe um documento medido, o servido',
    'o estado de uma vista que nao seja a do ' + PAPEL + ': a cadeia lida e a gravada, nunca uma conta nova',
    'que o handler que cancela o click seja ou nao necessario: a escuta ve o defaultPrevented, nao o motivo dele',
    'que o scrollTop programatico chegue a algum lado: a sonda tenta os dois e imprime qual deles moveu',
    'que um leitor de ecran reproduza o Enter medido aqui: o despacho e de tecla por CDP, nao de evento de assistive technology',
  ],
  portoes: { total: 16, falhas: null }, veredito: '',
};

let chrome = null, ws = null, servidor = null;
const grava = (o) => { try { writeFileSync(o, JSON.stringify(saida, null, 2) + '\n'); } catch (e) { console.log('ESCRITA_FALHOU ' + String(e.message).slice(0, 90)); } };
let SESSAO = null;
// Redaccao por fixed text: um erro que ecoe a expressao da injecao nao pode levar a cadeia para o artefacto.
const oculta = (texto) => {
  let s = String(texto || '');
  if (SESSAO && SESSAO.access_token) s = s.split(SESSAO.access_token).join('[REDO-access]');
  if (SESSAO && SESSAO.refresh_token) s = s.split(SESSAO.refresh_token).join('[REDO-refresh]');
  return s.replace(/\s+/g, ' ').slice(0, 200);
};
const fecha = (codigo, motivo) => {
  saida.duracao_ms = Date.now() - t0;
  saida.veredito = 'P131_INTERROMPIDA';
  saida.falha_em = oculta(motivo);
  grava(PARCIAL);
  try { if (ws) { ws.onclose = null; ws.close(); } } catch {}
  try { if (servidor) servidor.close(); } catch {}
  try { if (chrome) spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  console.log('PAROU: ' + oculta(motivo));
  process.exit(codigo);
};
process.on('unhandledRejection', (e) => fecha(7, 'unhandledRejection: ' + oculta((e && e.message) || e)));
process.on('uncaughtException', (e) => fecha(8, 'uncaughtException: ' + oculta((e && e.message) || e)));
const vigilia = setTimeout(() => fecha(3, 'watchdog ' + (WATCHDOG_MS / 1000) + ' s'), WATCHDOG_MS);

// ——— o documento a medir ———
let URL_APP = URL_AR;
const modo_alvo = { modo: 'ar_publicado', pasta: null, url: URL_AR };
if (PASTA_LOCAL) {
  const raiz = resolve(REPO + '/' + PASTA_LOCAL);
  if (!existsSync(raiz + '/index.html')) fecha(1, 'sem index.html em ' + PASTA_LOCAL);
  servidor = createServer((rq, rs) => {
    const pedido = decodeURIComponent(String(rq.url || '/').split('?')[0]);
    const alvo = resolve(raiz, '.' + (pedido === '/' ? '/index.html' : pedido));
    const dentro = normalize(alvo + sep).startsWith(normalize(raiz + sep));
    if (!dentro || !existsSync(alvo)) { rs.statusCode = 404; rs.end('fora'); return; }
    rs.setHeader('content-type', /\.css$/.test(alvo) ? 'text/css' : /\.js$/.test(alvo) ? 'text/javascript' : 'text/html; charset=utf-8');
    rs.setHeader('cache-control', 'no-store');
    createReadStream(alvo).pipe(rs);
  });
  await new Promise((res) => servidor.listen(SERVE_PORT, '127.0.0.1', res));
  URL_APP = 'http://127.0.0.1:' + SERVE_PORT + '/index.html';
  modo_alvo.modo = 'candidata_servida_local'; modo_alvo.pasta = PASTA_LOCAL; modo_alvo.url = URL_APP;
}
saida.alvo = modo_alvo;

const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const publicavel = (shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];
const ref = (shellTxt.match(/https:\/\/([a-z0-9]{12,24})\.supabase\.co/) || [])[1];
if (!publicavel || !ref) fecha(1, 'o alvo nao devolve a referencia nem a publicacao no HTML servido');
const HOST = 'https://' + ref + '.supabase.co';
const STORAGE_KEY = 'sb-' + ref + '-auth-token';
saida.alvo.bytes = Buffer.byteLength(shellTxt);
saida.alvo.md5 = md5(shellTxt);
saida.alvo.tem_a_gaveta_servida = shellTxt.includes('bfr-gate-reader-options');
saida.alvo.tem_o_predicado_de_prontidao = shellTxt.includes('gateCentralBound');

const gravada = JSON.parse(readFileSync(FORA + '/ah2-sessao-' + PAPEL + '.json', 'utf8'))[PAPEL];
if (!gravada || !gravada.access_token) fecha(1, 'sem cadeia gravada para ' + PAPEL);
SESSAO = gravada;
const expiraEm = Number(gravada.expires_at) - Math.floor(Date.now() / 1000);
saida.cadeia = { papel: PAPEL, arrancou_sem_renovar: expiraEm > 60, hash_acesso_antes: md5(gravada.access_token).slice(0, 12), renovou_nesta_corrida: false };
if (expiraEm <= 60) {
  const r = await fetch(HOST + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { 'content-type': 'application/json', apikey: publicavel, authorization: 'Bearer ' + publicavel }, body: JSON.stringify({ refresh_token: gravada.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) {
    saida.cadeia.recusa = { http: r.status, codigo: (j && (j.error_code || j.msg)) || 'sem-corpo' };
    saida.cadeia.proximo_degrau = saida.cadeia.recusa.codigo === 'refresh_token_already_used' ? 'p73-entrar-por-senha ' + PAPEL + ' (login com a senha ja gravada, sem rotacao)' : 'outra causa, ler o codigo';
    fecha(6, 'refresh ' + PAPEL + ' HTTP ' + r.status + ' codigo=' + saida.cadeia.recusa.codigo);
  }
  SESSAO = j;
  saida.cadeia.renovou_nesta_corrida = true;
  saida.cadeia.hash_acesso_depois = md5(j.access_token).slice(0, 12);
}

function portaOcupada(porta) {
  const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const pids = new Set();
  for (const linha of String(q.stdout || '').split(/\r?\n/)) {
    if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
    const pid = linha.trim().split(/\s+/).pop();
    if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  return pids;
}
for (const pid of portaOcupada(PORT)) {
  const dono = spawnSync('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_Process -Filter "ProcessId=$pid").Name'], { encoding: 'utf8' });
  const nome = String(dono.stdout || '').trim();
  if (!/chrome/i.test(nome)) fecha(2, 'PORTA ' + PORT + ': dono (' + pid + ' ' + (nome || 'desconhecido') + ') nao e chrome nosso - usar P131_PORT');
  spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { stdio: 'ignore' });
}
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=' + PORT, '--user-data-dir=' + PERFIL, '--headless=new', '--window-size=' + LARGURA + ',' + ALTURA, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

let alvos = [];
for (let i = 0; i < 60; i++) { try { alvos = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); if (alvos.some((t) => t.type === 'page')) break; } catch {} await new Promise((z) => setTimeout(z, 400)); }
const pagina = alvos.find((t) => t.type === 'page');
if (!pagina) fecha(1, 'sem alvo page no chrome');
ws = new WebSocket(pagina.webSocketDebuggerUrl);
let encerrado = false;
ws.onclose = () => { if (!encerrado) fecha(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => fecha(5, oculta((e && e.message) || e)));

let seq = 0;
const pend = new Map();
let passoAtivo = 'arranque';
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.requestWillBeSent') {
    const rq = m.params.request || {};
    const u = String(rq.url || '');
    const metodo = String(rq.method || 'GET').toUpperCase();
    const h = rq.headers || {};
    const metodo_pedido = String(h['Access-Control-Request-Method'] || h['access-control-request-method'] || '') || null;
    const e_supabase = u.startsWith(HOST);
    const caminho = e_supabase ? String(u.slice(HOST.length)).split('?')[0] : null;
    saida.contagem_pedidos[metodo + ' ' + (e_supabase ? 'supabase' : 'outro')] = (saida.contagem_pedidos[metodo + ' ' + (e_supabase ? 'supabase' : 'outro')] || 0) + 1;
    // Registo integral só do que pode ser escrita: um GET por página do alvo encheria o artefacto sem julgar nada.
    if (metodo !== 'GET') saida.pedidos_no_fio.push({ passo: passoAtivo, metodo, metodo_pedido, origem: u.startsWith(URL_APP) ? 'alvo' : (e_supabase ? 'supabase' : 'outro'), caminho, tem_corpo: m.params.hasPostData === true || Buffer.byteLength(rq.postData || '') > 0 });
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails || {};
    saida.excepcoes_da_pagina.push({ passo: passoAtivo, texto: oculta((d.exception && d.exception.description) || d.text || '') });
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq;
  const prazo = method === 'Runtime.evaluate' ? 60000 : 120000;
  const timer = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta')); } }, prazo);
  pend.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expression) => {
  const x = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (x.exceptionDetails) throw new Error('eval: ' + oculta((x.exceptionDetails.exception && x.exceptionDetails.exception.description) || x.exceptionDetails.text));
  return x.result ? x.result.value : undefined;
};

const dorme = (ms) => new Promise((z) => setTimeout(z, ms));
const waitFor = async (expr, ms) => { const ini = Date.now(); while (Date.now() - ini < ms) { let v; try { v = await E(expr); } catch {} if (v) return Date.now() - ini; await dorme(300); } throw new Error('waitFor: ' + expr.slice(0, 80)); };

// ——— régua da escrita, com os lados provados em fixture ———
// Tres clases distintas de pedido saem do fio e só uma delas escreve numa mesa. O OPTIONS do CORS nao e
// escrita: o que decide e o `Access-Control-Request-Method` que a pagina pediu (a corrida `b` deu vermelho com
// 22 preflights de SELECT, 22/11). O rpc — pelo POST do supabase-js ou pelo preflight dele — nunca e julgado
// pelo transporte: e o `provolatile` do catalogo vivo que o faz (f5), porque o mesmo metodo serve leituras.
const rpc = (p) => /^\/rest\/v1\/rpc\//.test(String(p.caminho || ''));
const ehEscritaDeMesa = (p) => p.origem === 'supabase' && !String(p.caminho || '').startsWith('/auth/') && !rpc(p)
  && (p.metodo === 'OPTIONS' ? !!p.metodo_pedido && p.metodo_pedido !== 'GET' && p.metodo_pedido !== 'HEAD'
    : p.metodo === 'POST' || p.metodo === 'PATCH' || p.metodo === 'PUT' || p.metodo === 'DELETE');
const nomeRpc = (p) => { const m = /^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/.exec(String(p.caminho || '')); return m ? m[1] : null; };
const FIX_POST_MESA = { metodo: 'POST', origem: 'supabase', caminho: '/rest/v1/gate_checkins', metodo_pedido: null };
const FIX_GET_MESA = { metodo: 'GET', origem: 'supabase', caminho: '/rest/v1/profiles', metodo_pedido: null };
const FIX_POST_AUTH = { metodo: 'POST', origem: 'supabase', caminho: '/auth/v1/token', metodo_pedido: null };
const FIX_PREFLIGHT_LEITURA = { metodo: 'OPTIONS', origem: 'supabase', caminho: '/rest/v1/profiles', metodo_pedido: 'GET' };
const FIX_PREFLIGHT_ESCRITA = { metodo: 'OPTIONS', origem: 'supabase', caminho: '/rest/v1/gate_checkins', metodo_pedido: 'POST' };
const FIX_POST_RPC = { metodo: 'POST', origem: 'supabase', caminho: '/rest/v1/rpc/list_current_month_birthdays', metodo_pedido: null };
const FIX_PREFLIGHT_RPC = { metodo: 'OPTIONS', origem: 'supabase', caminho: '/rest/v1/rpc/bfr_is_municipal_authority', metodo_pedido: 'POST' };
const FIX_FORA_DO_BANCO = { metodo: 'POST', origem: 'alvo', caminho: null, metodo_pedido: null };
if (!(ehEscritaDeMesa(FIX_POST_MESA) === true && ehEscritaDeMesa(FIX_GET_MESA) === false && ehEscritaDeMesa(FIX_POST_AUTH) === false
  && ehEscritaDeMesa(FIX_PREFLIGHT_LEITURA) === false && ehEscritaDeMesa(FIX_PREFLIGHT_ESCRITA) === true
  && ehEscritaDeMesa(FIX_POST_RPC) === false && ehEscritaDeMesa(FIX_PREFLIGHT_RPC) === false && ehEscritaDeMesa(FIX_FORA_DO_BANCO) === false)) throw new Error('ABORTA: a regua de escrita nao tem os oito lados - a promessa de so-leitura seria decorativa ou cega');
if (!(nomeRpc(FIX_POST_RPC) === 'list_current_month_birthdays' && nomeRpc(FIX_POST_MESA) === null && nomeRpc({ caminho: '/rest/v1/rpc/Lixo' }) === null)) throw new Error('ABORTA: o extrator do nome do RPC nao tem os tres lados');

// ——— a sonda de geometria, por gaveta ———
const CX = 'const cx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return { no: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/)[0] : ""), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), centro_x: Math.round(r.x + r.width / 2), centro_y: Math.round(r.y + r.height / 2), disp: c.display, vis: c.visibility, pos: c.position, ponteiro: c.pointerEvents, z: c.zIndex, op: c.opacity }; };';
const SONDA = '(() => {' +
  " const v = document.getElementById('gatekeeperView');" +
  ' if (!v) return { vista_existe: false };' +
  CX +
  " const form = v.querySelector('[data-gate-central-manual]');" +
  " const lista = Array.prototype.slice.call(v.querySelectorAll('.bfr-gate-reader-options'));" +
  ' const sum = (f) => { try { return f(); } catch (e) { return { erro: String((e && e.message) || e).slice(0, 70) }; } };' +
  " const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');" +
  ' const gav = lista.map((d, i) => {' +
  '  const s = d.querySelector("summary");' +
  '  const cd = cx(d); const cs = cx(s);' +
  '  const centro = s ? { x: cs.centro_x, y: cs.centro_y } : null;' +
  '  const na_janela = !!centro && centro.x >= 0 && centro.y >= 0 && centro.x <= window.innerWidth && centro.y <= window.innerHeight;' +
  '  const pilha = (!centro || !na_janela) ? null : sum(() => { const l = document.elementsFromPoint(centro.x, centro.y) || []; return { n: l.length, itens: l.slice(0, 5).map(cx), topo: l.length ? cx(l[0]) : null }; });' +
  '  const oclusor = (!centro || !na_janela || !s) ? null : sum(() => {' +
  '    const l = document.elementsFromPoint(centro.x, centro.y) || [];' +
  // `elementsFromPoint` devolve a pilha front-to-back e os ANCESTRAIS do alvo tambem estao nela: sem excluir a
  // cadeia acima, o primeiro «nao-ocluído» era sempre o pai da gaveta e `cobre_a_gaveta` saía sempre verdadeiro,
  // o que denunciava como oclusao o que e simplesmente a propria caixa onde a gaveta vive (22/11, corridas d/e/f).
  '    for (let k = 0; k < l.length; k++) { const el = l[k];' +
  '      if (el === s || el === d || d.contains(el) || s.contains(el) || el.contains(d) || el.contains(s)) continue; const r = el.getBoundingClientRect(); const c = getComputedStyle(el);' +
  '      return { no: nome(el), indice_na_pilha: k, n_na_pilha: l.length, cobre_a_gaveta: (el.compareDocumentPosition(d) & 16) !== 0, anterior_no_dom: (el.compareDocumentPosition(d) & 4) !== 0, w: Math.round(r.width), h: Math.round(r.height), centro_y: Math.round(r.y + r.height / 2), pos: c.position, z: c.zIndex, ponteiro: c.pointerEvents, pai: el.parentElement ? nome(el.parentElement) : null }; }' +
  '    return null;' +
  '  });' +
  '  const rolavel = (() => { let o = d.parentElement; while (o) { const c = getComputedStyle(o); if ((c.overflowY === "auto" || c.overflowY === "scroll" || c.overflowY === "overlay") && o.scrollHeight > o.clientHeight + 1) return o; o = o.parentElement; } return null; })();' +
  '  return { i, classe: String(d.className), aberto: d.open === true, tem_sumario: !!s,' +
  '   dentro_do_formulario_manual: !!(form && d.contains(form)),' +
  '   details: cd, sumario: cs, centro_do_sumario: centro, centro_dentro_da_janela: na_janela,' +
  '   pilha_no_centro: pilha, oclusor_no_ponto: oclusor,' +
  '   topo_do_ponto_e_o_sumario: !!(na_janela && s && document.elementFromPoint(centro.x, centro.y) === s),' +
  '   caixa_do_formulario: cx(form), sumario_e_focusavel: s ? { tabIndex: s.tabIndex, contentEditable: s.isContentEditable } : null,' +
  // O rect de uma subarvore `content-visibility: hidden` mede-se sem ser pintado: e por isso que o diário da
  // v141 dizia «form com display:grid e caixa 64 px dentro de um details fechado». A pergunta pintado-ou-nao
  // tem de ser feita ao `checkVisibility` com a flag do content-visibility, nao ao getBoundingClientRect.
  '   pintado: { details: d.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }),' +
  '     sumario: s ? s.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }) : null,' +
  '     formulario: form ? form.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }) : null },' +
  '   pseudo_details_content: (() => { const c = getComputedStyle(d, "::details-content"); return { disp: c.display, cv: c.contentVisibility, h: Math.round(d.scrollHeight) }; })(),' +
  '   ancestor_rolavel: rolavel ? { no: nome(rolavel), sh: rolavel.scrollHeight, ch: rolavel.clientHeight, top: Math.round(rolavel.scrollTop) } : null' +
  '  }; });' +
  " return { vista_existe: true, vista_escondida: v.classList.contains('hidden'), papel_perfil: (window.BFR_CURRENT_PROFILE && window.BFR_CURRENT_PROFILE.role) || null," +
  "  vista_activa: (window.BFR_APP_RUNTIME || {}).activeView || null, bound: v.dataset.gateCentralBound === 'true'," +
  '  janela: { iw: window.innerWidth, ih: window.innerHeight, cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth },' +
  '  rolavel_do_documento: (() => { const se = document.scrollingElement || document.documentElement; return { no: se.tagName.toLowerCase(), top: Math.round(se.scrollTop), sh: se.scrollHeight, ch: se.clientHeight }; })(),' +
  '  n_gavetas: gav.length, gavetas: gav };' +
  '})()';

// O leitor do `aberto` tem de ter dente: um <details> criado em tempo de execução, nos dois sentidos.
const DENTE_ABERTO = '(() => { const mk = (o) => { const d = document.createElement("details"); if (o) d.setAttribute("open", ""); document.body.appendChild(d); const r = d.open === true; d.remove(); return r; }; return { com_open: mk(true), sem_open: mk(false) }; })()';

// Escalada real: o mesmo que a roda do rato faz. Duas coisas mudaram depois da corrida `m390` (22/11): cada
// tentativa mede o topo ANTES e DEPOIS (um `scrollTop` que não cola era reportado como `ok: true` com o centro
// imóvel), e se o alvo por elemento não rolar tenta-se o da janela, que e o caminho do toque num telemovel.
const ESCALADA = (i) => '(() => {' +
  " const v = document.getElementById('gatekeeperView');" +
  ' const d = v.querySelectorAll(".bfr-gate-reader-options")[' + i + '];' +
  ' if (!d) return { ok: false, motivo: "sem gaveta no indice" };' +
  ' const s = d.querySelector("summary");' +
  " const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');" +
  ' let o = d.parentElement, contentor = null;' +
  ' while (o) { const c = getComputedStyle(o); if ((c.overflowY === "auto" || c.overflowY === "scroll" || c.overflowY === "overlay") && o.scrollHeight > o.clientHeight + 1) { contentor = o; break; } o = o.parentElement; }' +
  ' const alvo = contentor || (document.scrollingElement || document.documentElement);' +
  ' const centro = () => Math.round(s.getBoundingClientRect().y + s.getBoundingClientRect().height / 2);' +
  ' const antes = centro();' +
  ' const dentro = () => { const c = centro(); return c >= 8 && c <= window.innerHeight - 8; };' +
  ' const tentativas = [];' +
  ' const roda = (mt) => {' +
  '   const se = mt === "janela";' +
  '   const topo0 = se ? window.scrollY : alvo.scrollTop;' +
  '   const delta = centro() - Math.round(window.innerHeight * 0.4);' +
  '   if (se) window.scrollTo(0, topo0 + delta); else alvo.scrollTop = topo0 + delta;' +
  '   tentativas.push({ metodo: mt, alvo: nome(alvo), topo_antes: Math.round(topo0), topo_depois: Math.round(se ? window.scrollY : alvo.scrollTop), scroll_y: Math.round(window.scrollY), centro_depois: centro() });' +
  ' };' +
  ' for (let k = 0; k < 5 && !dentro(); k++) roda("elemento");' +
  ' for (let k = 0; k < 5 && !dentro(); k++) roda("janela");' +
  ' const depois = centro();' +
  ' return { ok: true, moveu: depois !== antes, dentro_da_janela: dentro(), contentor: { no: nome(alvo), rolavel: !!contentor, sh: alvo.scrollHeight, ch: alvo.clientHeight }, centro_antes: antes, centro_depois: depois, janela_ih: window.innerHeight, tentativas };' +
  '})()';

// Quando nada rola, o artefacto tem de dizer por que: a cadeia inteira acima da gaveta com overflow, topo,
// scrollHeight e a identidade do scrollingElement, mais o compatMode. Sem isto, «o ponto nao devolve elemento»
// e so a constatacao de que nao cheguei la, nao a causa.
const SONDA_ROLAGEM = '(() => {' +
  " const v = document.getElementById('gatekeeperView');" +
  ' const d = v ? v.querySelector(".bfr-gate-reader-options") : null;' +
  " const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');" +
  ' const cadeia = [];' +
  ' let o = d ? d.parentElement : document.body;' +
  ' while (o) { const c = getComputedStyle(o); cadeia.push({ no: nome(o), overflow_y: c.overflowY, overflow_x: c.overflowX, topo: Math.round(o.scrollTop), sh: o.scrollHeight, ch: o.clientHeight, pos: c.position, caixa_h: Math.round(o.getBoundingClientRect().height) }); o = o.parentElement; }' +
  ' const se = document.scrollingElement || document.documentElement;' +
  ' return { cadeia, scrolling_element: nome(se), scroll_y: Math.round(window.scrollY), compat: document.compatMode, html_overflow: getComputedStyle(document.documentElement).overflow, body_overflow: getComputedStyle(document.body).overflow };' +
  '})()';

// Leitura minima do centro do sumario: serve a cada volta da roda do rato, que e o gesto real de um
// telemovel, sem re-desenhar a sonda inteira. Da tambem o scroll_y, para a roda poder ser julgada.
const CENTRO = (i) => '(() => {' +
  " const v = document.getElementById('gatekeeperView');" +
  ' const d = v ? v.querySelectorAll(".bfr-gate-reader-options")[' + i + '] : null;' +
  ' if (!d) return { ok: false, motivo: "sem gaveta no indice" };' +
  ' const s = d.querySelector("summary");' +
  ' if (!s) return { ok: false, motivo: "sem sumario" };' +
  ' const r = s.getBoundingClientRect(); const c = Math.round(r.y + r.height / 2);' +
  ' return { ok: true, centro: c, scroll_y: Math.round(window.scrollY), dentro: c >= 8 && c <= window.innerHeight - 8, x: Math.round(r.x + r.width / 2) };' +
  '})()';
const PORTEIRO = '(() => { const rt = window.BFR_APP_RUNTIME || {}; const v = document.getElementById("gatekeeperView"); if (v && !v.classList.contains("hidden")) return { necessario: false, activa: rt.activeView || null }; if (typeof rt.navigate !== "function") return { necessario: true, recusado: "sem navigate no fonte" }; const r = rt.navigate("gatekeeper"); return { necessario: true, resultado: String(r), activa: rt.activeView || null }; })()';
const HIT = (x, y) => '(() => { const el = document.elementFromPoint(' + x + ',' + y + '); if (!el) return { no: null }; const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return { no: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/)[0] : ""), disp: c.display, ponteiro: c.pointerEvents, pos: c.position, w: Math.round(r.width), h: Math.round(r.height) }; })()';
const TECLADO_ALVO = (i) => '(() => { const a = document.activeElement; if (a && a.blur) a.blur(); const v = document.getElementById("gatekeeperView"); const d = v.querySelectorAll(".bfr-gate-reader-options")[' + i + ']; const s = d ? d.querySelector("summary") : null; if (!s) return { existe: false }; const r = s.getBoundingClientRect(); return { existe: true, tabIndex: s.tabIndex, no: s.tagName.toLowerCase(), centro_x: Math.round(r.x + r.width / 2), centro_y: Math.round(r.y + r.height / 2) }; })()';
const TECLADO_FOCO = (i) => '(() => { const a = document.activeElement; if (!a) return null; const v = document.getElementById("gatekeeperView"); const d = v.querySelectorAll(".bfr-gate-reader-options")[' + i + ']; return { no: a.tagName.toLowerCase(), id: a.id || null, classe: (typeof a.className === "string" ? a.className.slice(0, 60) : null), e_o_sumario_alvo: !!(d && a === d.querySelector("summary")), dentro_da_vista: v.contains(a) }; })()';
const TECLADO_ABERTO = (i) => 'document.getElementById("gatekeeperView").querySelectorAll(".bfr-gate-reader-options")[' + i + '].open === true';
// O orçamento de Tab tem de vir do censo dos tabuláveis, não de um número que eu lembre: «não chegou em 30
// paragens» só é medida se 30 for maior do que o número de paragens até ao sumário, ou se o sumário não
// estiver de todo no conjunto tabulável — e as duas causas são produto diferente.
const CENSO_TABULAVEIS = (i) => '(() => {' +
  ' const d = document.getElementById("gatekeeperView").querySelectorAll(".bfr-gate-reader-options")[' + i + '];' +
  ' if (!d) return { gaveta_existe: false };' +
  ' const s = d.querySelector("summary");' +
  ' const sel = "a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex=\'-1\']), summary, [contenteditable=\'true\']";' +
  ' const tab = Array.prototype.slice.call(document.querySelectorAll(sel)).filter((el) => el.tabIndex >= 0 && el.offsetWidth + el.offsetHeight > 0);' +
  ' const idx = tab.indexOf(s);' +
  ' return { gaveta_existe: true, n_tabulaveis: tab.length, indice_do_sumario: idx, paragens_ate_ao_sumario: idx >= 0 ? idx + 1 : null, sumario_no_conjunto: idx >= 0, no_sumario: s ? s.tagName.toLowerCase() + \' tabIndex=\' + s.tabIndex : null };' +
  '})()';
const MODAL = '(() => { const abertos = Array.prototype.slice.call(document.querySelectorAll(".modal")).filter((x) => !x.classList.contains("hidden") && getComputedStyle(x).display !== "none" && (x.offsetWidth || x.offsetHeight)); const m = abertos[0] || null; const f = m ? m.querySelector(".modal-close") : null; const r = f ? f.getBoundingClientRect() : null; return { havido: !!m, n_abertos: abertos.length, el: m ? (m.id || String(m.className)) : null, z: m ? getComputedStyle(m).zIndex : null, tem_fecho: !!f, fecho: f ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) } : null }; })()';
// O recibo do clique: «o rato pousou no sumario e nada mudou» e um rotulo para tres causas diferentes — um
// handler da pagina que chama preventDefault no click (o <details> nao abre por decisao do app), o browser que
// nem gera o click, e o no substituido entre o hit-teste e o despacho. A escuta vai ao documento em bolha,
// por isso ve o `defaultPrevented` deixado por qualquer handler anterior no caminho. Nao interfere: so le.
const ARRECADAR_CLIKES = '(() => {' +
  " window.__p131_cliques = [];" +
  " const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');" +
  " document.addEventListener('click', (e) => { const t = e.target; window.__p131_cliques.push({ no: nome(t), cancelavel: e.cancelable === true, anulado: e.defaultPrevented === true, na_gaveta: !!(t && t.closest && t.closest('.bfr-gate-reader-options')), no_sumario: !!(t && t.tagName === 'SUMMARY' && t.closest && t.closest('.bfr-gate-reader-options')), em: Math.round(performance.now()) }); }, false);" +
  ' return { instalado: true };' +
  '})()';
// Amostras do `open` depois do clique, com um observador de mutacoes na vista: se a gaveta abre e se fecha
// antes da leitura final, a causa nao e o clique — e o re-design da vista a recriar a subarvore sem guardar o
// estado. Uma leitura unica aos 400 ms nao distingue as duas coisas, e foi o que as corridas `e` (1280) e
// `m390c` deixaram em aberto: 0/1 com o click gerado e nao anulado.
const OBSERVADOR = "(() => { const v = document.getElementById(\"gatekeeperView\"); window.__p131_mut = { n: 0, childList: 0, atributos: 0, alvos: [] }; if (window.__p131_obs) window.__p131_obs.disconnect(); if (!v) return { instalado: false, motivo: \"sem gatekeeperView\" }; const ob = new MutationObserver((ms) => {  for (const m of ms) { window.__p131_mut.n++;   if (m.type === \"childList\") { window.__p131_mut.childList++;    if (window.__p131_mut.alvos.length < 6) { const c = typeof m.target.className === \"string\" && m.target.className.trim() ? \".\" + m.target.className.trim().split(/\\s+/)[0] : \"\"; window.__p131_mut.alvos.push(String(m.target.nodeName).toLowerCase() + c); }   } else window.__p131_mut.atributos++; } }); window.__p131_obs = ob; ob.observe(v, { childList: true, subtree: true, attributes: true, attributeFilter: [\"open\", \"class\", \"hidden\"] }); return { instalado: true, em: v.id };})()";
const AMOSTRA_ARMA = "(() => { const v = document.getElementById(\"gatekeeperView\"); const l = v.querySelectorAll(\".bfr-gate-reader-options\"); const d = l[__I__]; return { aberto: !!(d && d.open === true), n_gavetas_na_arvore: l.length, mut: (window.__p131_mut || {}).n || 0 };})()";
const AMOSTRA = (i) => AMOSTRA_ARMA.replace('__I__', String(i));
const LER_CLIKES = '(() => { const l = (window.__p131_cliques || []).slice(-3); return { n: (window.__p131_cliques || []).length, ultimos: l }; })()';
// O recibo global nao serve para julgar o MEU clique: na corrida m390d os dois unicos registos depois do reset
// eram o fecho do modal e um h2, e a escada leu-os como se o despacho fosse meu. A leitura recortada so ve o que
// o browser gerou desde a hora que eu marquei, e o dente cobra os dois lados (marca no futuro da, marca na hora
// do despacho da o meu click) sobre um sumario de fixture meu, nao sobre o do app.
const LEITURA_MARCADA_ARMA = '(() => { const l = (window.__p131_cliques || []).filter((x) => x.em >= __DESDE__); return { n: l.length, desde: __DESDE__, pousou_no_sumario: l.some((x) => x.no_sumario === true), algum_anulado: l.some((x) => x.anulado === true), ultimos: l.slice(-6) }; })()';
const LER_CLIKES_DESDE = (desde) => LEITURA_MARCADA_ARMA.replace(/__DESDE__/g, String(desde));
const DENTE_MARCADA = '(() => {' +
  " const l = window.__p131_cliques || [];" +
  ' const agora = Math.round(performance.now());' +
  ' const futuro = l.filter((x) => x.em >= agora + 600000).length;' +
  ' const todos = l.filter((x) => x.em >= 0).length;' +
  " const v = document.getElementById('gatekeeperView');" +
  " const d = document.createElement('details'); d.className = 'bfr-gate-reader-options'; d.id = 'p131-dente-marcada';" +
  " const s = document.createElement('summary'); s.textContent = 'dente-marcada'; d.appendChild(s); v.appendChild(d);" +
  ' const marca = Math.round(performance.now());' +
  ' s.click();' +
  ' const novos = l.filter((x) => x.em >= marca);' +
  " const ultimo = l[l.length - 1] || {};" +
  " d.remove(); s.remove();" +
  ' return { havia: todos, registados: l.length, lado_negativo: futuro, pousou_no_sumario: novos.length > 0 && novos.every((x) => x.no_sumario === true), novos: novos.length, tem_em: typeof ultimo.em === \'number\' };' +
  '})()';
const DENTE_RECIBO = '(() => {' +
  ' const n = () => (window.__p131_cliques || []).length;' +
  ' const antes = n();' +
  ' const d = document.createElement("details"); const s = document.createElement("summary"); s.textContent = "dente"; d.appendChild(s); document.body.appendChild(d);' +
  ' s.click();' +
  ' const depois_click = n(); const visto = (window.__p131_cliques || []).slice(-1)[0] || null; const abriu_sintetico = d.open === true;' +
  ' const sem_nada = n();' +
  ' d.remove();' +
  ' return { antes, depois_click, cresceu: depois_click > antes, abriu_sintetico, lado_negativo_igual: sem_nada === depois_click, visto };' +
  '})()';
// Dente do leitor do oclusor, nos dois lados: um overlay injected por mim por cima do centro do sumario tem de
// aparecer como oclusor, e retirado tem de dar null. Sem o lado negativo, «null» podia ser o leitor mudo.
const FIX_OCLUSOR = (i, por) => '(() => {' +
  " const v = document.getElementById('gatekeeperView');" +
  ' const d = v ? v.querySelectorAll(".bfr-gate-reader-options")[' + i + '] : null;' +
  ' if (!d) return { sem_gaveta: true };' +
  ' const s = d.querySelector("summary");' +
  ' if (!s) return { sem_sumario: true };' +
  ' const r = s.getBoundingClientRect();' +
  ' const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);' +
  (por ? " const o = document.createElement('div'); o.id = 'p131-dente-oclusor'; o.style.cssText = 'position:fixed;left:' + (x - 40) + 'px;top:' + (y - 40) + 'px;width:80px;height:80px;z-index:99999;background:rgba(0,0,0,0.01)'; document.body.appendChild(o);" : " const ant = document.getElementById('p131-dente-oclusor'); if (ant) ant.remove();") +
  " const el = document.elementFromPoint(x, y); return { ponto: { x, y }, no: el ? (el.id ? el.tagName.toLowerCase() + '#' + el.id : el.tagName.toLowerCase()) : null, e_dente: !!(el && el.id === 'p131-dente-oclusor'), na_janela: y >= 0 && y <= window.innerHeight, janela_ih: window.innerHeight }; })();";
const MODAL_ASSSENTOU = '!Array.prototype.slice.call(document.querySelectorAll(".modal")).some((x) => !x.classList.contains("hidden") && getComputedStyle(x).display !== "none" && (x.offsetWidth || x.offsetHeight))';
// Prédica de prontidão tirada do próprio fonte (dataset do módulo + o formulário manual que ele monta): um
// sleep fixo leria o cronómetro, não o estado. Serve à primeira passagem e ao reinício antes do teclado.
const MONTADO = "document.getElementById('gatekeeperView')?.dataset.gateCentralBound === 'true' && !!document.getElementById('gatekeeperView').querySelector('[data-gate-central-manual]')";
// O centro do sumario e uma coordenada viva. Na corrida m390d a roda do rato deixou-o a 598 px e, quando o
// clique saiu, a pagina rolara mais 280 px: o hit-teste devolveu um div e o recibo registou um h2. Clicar num
// ponto envelhecido e o meu defeito, nao o do app, por isso as leituras param ate quatro seguidas baterem com
// dois pixeis, e so depois se hit-testa e se dispara. Os dois lados do predido cobram-se com UM fixture parado e
// o mesmo fixture a animar, no mesmo indice da arvore.
const FIX_ASSENTAR_ARMA = '(() => {' +
  " const v = document.getElementById('gatekeeperView');" +
  " const n = v.querySelectorAll('.bfr-gate-reader-options').length;" +
  " const st = document.createElement('style'); st.id = 'p131-dente-assentar-st';" +
  " st.textContent = '@keyframes p131-dente-move { from { transform: translateY(0px) } to { transform: translateY(320px) } }';" +
  ' document.head.appendChild(st);' +
  " const d = document.createElement('details'); d.id = 'p131-dente-assentar';" +
  " const sum = document.createElement('summary'); sum.id = 'p131-dente-assentar-sum'; sum.textContent = 'dente-assentar'; d.appendChild(sum);" +
  " d.style.cssText = 'position:fixed;left:120px;top:120px;width:90px;height:40px;';" +
  " sum.style.cssText = 'position:fixed;left:120px;top:120px;width:90px;height:40px;';" +
  ' if (__ANIM__) sum.style.animation = \'p131-dente-move 700ms linear infinite alternate\';' +
  ' document.body.appendChild(d);' +
  ' const r = sum.getBoundingClientRect();' +
  ' return { indice: n, montado: !!document.getElementById("p131-dente-assentar"), animado: __ANIM__, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, disp: getComputedStyle(sum).display, disp_pai: getComputedStyle(d).display };' +
  '})()';
const FIX_ASSENTAR = (anim) => FIX_ASSENTAR_ARMA.replace(/__ANIM__/g, anim ? 'true' : 'false');
const ANIMA_ASSENTAR = "(() => { const sum = document.getElementById('p131-dente-assentar-sum'); sum.style.animation = 'p131-dente-move 700ms linear infinite alternate'; return { animado: sum.style.animation.length > 0, texto: sum.style.animation }; })()";
const DESMONTAR_ASSENTAR = "(() => { const d = document.getElementById('p131-dente-assentar'); if (d) d.remove(); const st = document.getElementById('p131-dente-assentar-st'); if (st) st.remove(); const v = document.getElementById('gatekeeperView'); return { retirado: !document.getElementById('p131-dente-assentar'), censo: v.querySelectorAll('.bfr-gate-reader-options').length }; })()";
// Quatro leituras do CENTRO a 200 ms com delta de dois pixeis, em altura e em scroll_y. O teto e o do produto:
// rolagem animada assenta em menos de um segundo; o que passa o teto e dito instavel, nao medido as cegas.
const CENTRO_POR_ID = (id) => '(() => {' +
  ' const d = document.getElementById(' + JSON.stringify(id) + ');' +
  ' if (!d) return { ok: false, motivo: "sem no por id" };' +
  ' const s = d.querySelector("summary");' +
  ' if (!s) return { ok: false, motivo: "sem sumario no fixture" };' +
  ' const r = s.getBoundingClientRect(); const c = Math.round(r.y + r.height / 2);' +
  ' return { ok: true, centro: c, scroll_y: Math.round(window.scrollY), dentro: c >= 8 && c <= window.innerHeight - 8, x: Math.round(r.x + r.width / 2), w: Math.round(r.width), h: Math.round(r.height), disp: getComputedStyle(s).display, disp_pai: getComputedStyle(d).display, cv_pai: getComputedStyle(d).contentVisibility };' +
  '})()';
const assentar = async (corpo, tetoMs) => {
  const leituras = [];
  const t0 = Date.now();
  while (Date.now() - t0 < tetoMs) {
    const e = await E(corpo);
    leituras.push(e && e.ok === true ? { centro: e.centro, scroll_y: e.scroll_y, x: e.x, dentro: e.dentro } : { erro: (e && e.motivo) || 'sem resposta' });
    if (leituras.length >= 4) {
      const u = leituras.slice(-4);
      const cs = u.map((z) => z.centro); const ss = u.map((z) => z.scroll_y);
      const estavel = Math.max.apply(null, cs) - Math.min.apply(null, cs) <= 2 && Math.max.apply(null, ss) - Math.min.apply(null, ss) <= 2;
      if (estavel) return { estavel: true, dentro: u[u.length - 1].dentro === true, centro: u[u.length - 1].centro, x: u[u.length - 1].x, scroll_y: u[u.length - 1].scroll_y, n_leituras: leituras.length, ms: Date.now() - t0, leituras: u };
    }
    await dorme(200);
  }
  const ult = leituras[leituras.length - 1] || {};
  return { estavel: false, dentro: ult.dentro === true, centro: ult.centro, x: ult.x, n_leituras: leituras.length, ms: Date.now() - t0, leituras: leituras.slice(-4), motivo: 'nenhuma janela de quatro leituras a 200 ms dentro de dois pixeis em ' + tetoMs + ' ms' };
};
const toca = async (x, y) => {
  const quem = await E(HIT(x, y));
  if (!quem || !quem.no) return { tentado: false, motivo: 'o ponto nao devolve elemento (fora da janela ou invisivel)', no_ponto: quem ? quem.no : null };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  return { tentado: true, pousou_em: quem.no, no_alvo: quem.no, ponteiro: quem.ponteiro, pos: quem.pos };
};

// Cada corpo injectado e uma string montada por concatenação: um delimitador trocado dentro dela nao e visto
// pelo `node --check` do ficheiro e so rebentaria no Runtime.evaluate. O portao corre antes de qualquer
// trabalho de browser, portanto um corpo partido devolve aborto e nunca uma medida incompleta.
const compila = (corpo) => { try { new Script(corpo); return true; } catch { return false; } };
const CORPOS = { CX: '(function () {' + CX + ' return 1; })()', SONDA, DENTE_ABERTO, PORTEIRO, HIT: HIT(10, 20), ESCALADA: ESCALADA(0), TECLADO_ALVO: TECLADO_ALVO(0), TECLADO_FOCO: TECLADO_FOCO(0), TECLADO_ABERTO: TECLADO_ABERTO(0), MODAL, CENSO_TABULAVEIS: CENSO_TABULAVEIS(0), ARRECADAR_CLIKES, LER_CLIKES, DENTE_RECIBO, MONTADO, SONDA_ROLAGEM, CENTRO: CENTRO(0), OBSERVADOR, AMOSTRA: AMOSTRA(0), "FIX_OCLUSOR_com": FIX_OCLUSOR(0, true), "FIX_OCLUSOR_sem": FIX_OCLUSOR(0, false), LEITURA_MARCADA: LEITURA_MARCADA_ARMA.replace(/__DESDE__/g, '0'), DENTE_MARCADA, CENTRO_POR_ID: CENTRO_POR_ID('x'), FIX_ASSENTAR: FIX_ASSENTAR_ARMA.replace(/__ANIM__/g, 'false'), ANIMA_ASSENTAR, DESMONTAR_ASSENTAR };
const partidos = Object.entries(CORPOS).filter(([, corpo]) => !compila(corpo)).map(([k]) => k);
if (partidos.length) throw new Error('ABORTA: corpo(s) de browser sem compilar: ' + partidos.join(','));
if (compila('(() => { function {')) throw new Error('ABORTA: o verificador de compilacao nao tem dentes');

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 1, mobile: LARGURA < 500 });
passoAtivo = 'shell';
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
passoAtivo = 'injecao';
await E('localStorage.setItem(' + JSON.stringify(STORAGE_KEY) + ',' + JSON.stringify(JSON.stringify(SESSAO)) + ')');
saida.tempos_ms = { injecao: Date.now() - t0 };
await send('Page.navigate', { url: URL_APP });
passoAtivo = 'prontidao';
saida.tempos_ms.shell_ready = await waitFor("!!document.getElementById('appShell')?.classList.contains('ready')", 60000);
passoAtivo = 'vista_porteiro';
const irPorteiro = await E(PORTEIRO);
saida.vista_porteiro = irPorteiro;
passoAtivo = 'modulo_montado';
saida.tempos_ms.modulo_montado = -1;
try { saida.tempos_ms.modulo_montado = await waitFor(MONTADO, 45000); } catch {}
saida.dentes_leitor = await E(DENTE_ABERTO);
passoAtivo = 'recibo_do_clique';
saida.recibo_instalado = await E(ARRECADAR_CLIKES);
saida.observador = await E(OBSERVADOR);
saida.dentes_recibo = await E(DENTE_RECIBO);
await E('window.__p131_cliques = []; 1');

// O modal de primeiro acesso (uma conta sem nome preferido) e `position:fixed`, z=1300, e cobre a janela toda:
// na corrida `b` foi ele que recebeu o clique, nao a gaveta (22/11). Medir o alcance por baixo dele seria
// medir o modal, por isso fecha-se pelo `.modal-close` DO modal — nunca pelo primeiro diálogo do documento.
passoAtivo = 'modal';
saida.modal = { antes: await E(MODAL) };
if (saida.modal.antes.havido === true && saida.modal.antes.fecho && saida.modal.antes.fecho.w > 0) {
  saida.modal.fecho_tocado = await toca(saida.modal.antes.fecho.x, saida.modal.antes.fecho.y);
  saida.modal.assentou = await waitFor(MODAL_ASSSENTOU, 8000).then(() => true).catch(() => false);
} else if (saida.modal.antes.havido === true) {
  saida.modal.assentou = false;
  saida.modal.nota = 'modal aberto sem .modal-close com caixa — nada e tocado as cegas';
} else saida.modal.assentou = null;

passoAtivo = 'dente_do_recibo_recortado';
saida.dentes_marcada = await E(DENTE_MARCADA);
passoAtivo = 'dente_do_assentar';
saida.censo_de_antes_do_dente = await E('document.querySelectorAll("#gatekeeperView .bfr-gate-reader-options").length');
saida.dentes_assentar = { montagem: await E(FIX_ASSENTAR_ARMA.replace(/__ANIM__/g, 'false')) };
saida.dentes_assentar.parado = await assentar(CENTRO_POR_ID('p131-dente-assentar'), 4000);
saida.dentes_assentar.animacao = await E(ANIMA_ASSENTAR);
saida.dentes_assentar.a_animar = await assentar(CENTRO_POR_ID('p131-dente-assentar'), 2500);
saida.dentes_assentar.desmontagem = await E(DESMONTAR_ASSENTAR);
saida.censo_depois_do_dente = await E('document.querySelectorAll("#gatekeeperView .bfr-gate-reader-options").length');

passoAtivo = 'sonda_inicial';
const sondaIni = await E(SONDA);
saida.sonda_inicial = sondaIni;
const sondaPorIndice = new Map((sondaIni.gavetas || []).map((g) => [g.i, g]));

// A roda do rato e o gesto de quem usa o telemovel: dez voltas de 300 px, com o centro relido entre cada
// uma. O scrollTop programatico nao colava a 390 (corrida m390: topo_depois 0 em dez tentativas), por isso
// a pergunta «um utilizador consegue la chegar» tem de ser feita ao input real e nao ao meu setter.
const rodasDoRato = async (i) => {
  const reg = [];
  for (let k = 0; k < 10; k++) {
    const e0 = await E(CENTRO(i));
    if (e0.ok !== true) return { tentadas: reg, ok: false, motivo: e0.motivo };
    if (e0.dentro === true) return { tentadas: reg, ok: true, dentro_da_janela: true, centro: e0.centro };
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(LARGURA / 2), y: Math.round(ALTURA / 2), deltaX: 0, deltaY: 300 });
    await dorme(150);
    const e1 = await E(CENTRO(i));
    reg.push({ k, centro_antes: e0.centro, centro_depois: e1 && e1.centro, scroll_y_antes: e0.scroll_y, scroll_y_depois: e1 && e1.scroll_y });
    if (e1 && e1.dentro === true) return { tentadas: reg, ok: true, dentro_da_janela: true, centro: e1.centro };
  }
  const fim = await E(CENTRO(i));
  return { tentadas: reg, ok: false, dentro_da_janela: !!(fim && fim.dentro), motivo: 'roda do rato dez voltas de 300 px sem trazer o sumario para a janela' };
};
for (const g of sondaIni.gavetas || []) {
  const rec = { i: g.i, classe: g.classe, aberto_inicial: g.aberto === true, centro_dentro_da_janela: g.centro_dentro_da_janela === true, sumario: g.sumario, details: g.details, oclusor_no_ponto_inicial: g.oclusor_no_ponto };
  saida.gavetas.push(rec);
  if (!g.centro_do_sumario) { rec.escala = { ok: false, motivo: 'sem sumario medido' }; continue; }
  passoAtivo = 'escalada_gaveta_' + g.i;
  rec.escala = await E(ESCALADA(g.i));
  if (rec.escala && rec.escala.ok === true && rec.escala.dentro_da_janela === false) {
    rec.rolagem = await E(SONDA_ROLAGEM);
    passoAtivo = 'roda_do_rato_gaveta_' + g.i;
    rec.escala.roda = await rodasDoRato(g.i);
  }
  passoAtivo = 'sonda_gaveta_' + g.i;
  const fres = (await E(SONDA)).gavetas.find((x) => x.i === g.i) || null;
  if (fres) sondaPorIndice.set(g.i, fres);
  rec.sonda_depois_da_escala = fres;
  rec.pintado_depois_da_escala = fres ? fres.pintado : null;
  rec.pseudo_details_content = fres ? fres.pseudo_details_content : null;
  rec.oclusor_no_ponto_depois = fres ? fres.oclusor_no_ponto : null;
  rec.topo_do_ponto_e_o_sumario_depois = !!(fres && fres.topo_do_ponto_e_o_sumario);
  passoAtivo = 'assentar_gaveta_' + g.i;
  rec.assentar = await assentar(CENTRO(g.i), 6000);
  if (rec.assentar.estavel !== true) { rec.clique = { tentado: false, motivo: 'a pagina nao assentou em seis segundos', assentar: rec.assentar }; continue; }
  if (rec.assentar.dentro !== true) { rec.clique = { tentado: false, motivo: 'o sumario assentou fora da janela', assentar: rec.assentar }; continue; }
  rec.ponto_do_clique = { x: rec.assentar.x, y: rec.assentar.centro };
  const noPonto = await E(HIT(rec.assentar.x, rec.assentar.centro));
  rec.hit_test_no_ponto_assentado = noPonto;
  const tagNoPonto = String(noPonto.no || '').split('#')[0].split('.')[0];
  if (tagNoPonto !== 'summary') { rec.clique = { tentado: false, motivo: 'o ponto assentado nao devolve o sumario', pousaria_em: noPonto.no, disp: noPonto.disp, ponteiro: noPonto.ponteiro }; continue; }
  passoAtivo = 'clique_gaveta_' + g.i;
  rec.marca_do_despacho = await E('Math.round(performance.now())');
  const pousou = await toca(rec.assentar.x, rec.assentar.centro);
  rec.hit_test_no_ponto = { no: pousou.no_alvo || pousou.no_ponto || null, ponteiro: pousou.ponteiro || null, pos: pousou.pos || null };
  if (pousou.tentado !== true) { rec.clique = { tentado: false, motivo: pousou.motivo }; continue; }
  const amostras = [];
  for (let k = 0; k < 8; k++) { await dorme(150); amostras.push(Object.assign({ k }, await E(AMOSTRA(g.i)))); }
  rec.amostras_depois_do_clique = amostras;
  rec.abriu_em_alguma_amostra = amostras.some((x) => x.aberto === true);
  rec.mutacoes_na_vista_depois_do_clique = amostras.length ? amostras[amostras.length - 1].mut : null;
  rec.recibo_do_clique = await E(LER_CLIKES_DESDE(rec.marca_do_despacho));
  rec.clicques_globais = await E(LER_CLIKES);
  const depois = (await E(SONDA)).gavetas.find((x) => x.i === g.i) || null;
  if (depois) sondaPorIndice.set(g.i, depois);
  rec.clique = { tentado: true, aberto_antes: g.aberto === true, aberto_depois: !!(depois && depois.aberto === true), mudou: !!(depois && depois.aberto !== g.aberto), pousou_em: pousou.no_alvo, no_alvo: pousou.no_alvo, abriu_em_alguma_amostra: rec.abriu_em_alguma_amostra, mutacoes: rec.mutacoes_na_vista_depois_do_clique };
  rec.sonda_depois_do_clique = depois;
  rec.clique.recibo = { n: (rec.recibo_do_clique || {}).n, pousou_no_sumario: (rec.recibo_do_clique || {}).pousou_no_sumario, algum_anulado: (rec.recibo_do_clique || {}).algum_anulado };
  // «pousou no sumario e nada mudou» tem tres causas diferentes e cada uma puxa um remendo diferente: o browser
  // nem gerou click no ponto, um handler do app cancelou o default, ou o click passou e o details nao mudou.
  if (rec.clique.tentado === true && rec.clique.aberto_depois === false) {
    const cliques = (rec.recibo_do_clique && rec.recibo_do_clique.ultimos) || [];
    rec.causa_do_clique_sem_efeito = !(rec.recibo_do_clique && rec.recibo_do_clique.n > 0)
      ? 'zero_clicks_gerados_pelo_browser_desde_o_despacho'
      : rec.recibo_do_clique.pousou_no_sumario !== true
        ? 'o_click_gerado_pousou_fora_do_sumario_em_' + String(((cliques[cliques.length - 1] || {}).no) || 'nada')
        : rec.recibo_do_clique.algum_anulado === true
          ? 'handler_do_app_cancelou_o_default_do_click'
          : rec.abriu_em_alguma_amostra === true
            ? 'abriu_mas_a_vista_re_desenhou_se_por_cima_com_' + rec.mutacoes_na_vista_depois_do_clique + '_mutacoes'
            : 'click_gerado_no_sumario_e_nao_anulado_mas_o_details_nao_mudou';
  }
}

// O teclado não pode herdar o estado que o rato deixou. Na corrida `f` (22/11) o clique abriu a gaveta e ficou
// com o foco em si: a travessia arrancou DEPOIS do sumario e nunca lhe chegou, enquanto na corrida `e`, em que o
// clique não mudou nada, chegou. Duas faces medidas sobre um estado que uma delas criou não são duas medidas.
// Por isso a página volta a navegar antes do teclado: o sumário é de novo medido no estado fechado, sem foco.
passoAtivo = 'reinicio_para_o_teclado';
saida.reinicio = { antes: { aberto: saida.gavetas.length ? saida.gavetas[0].aberto_inicial === true : null, foco: await E(TECLADO_FOCO(0)) } };
await send('Page.navigate', { url: URL_APP });
saida.reinicio.shell_ready_ms = await waitFor("!!document.getElementById('appShell')?.classList.contains('ready')", 60000);
saida.reinicio.porteiro = await E(PORTEIRO);
saida.reinicio.modulo_montado_ms = -1;
try { saida.reinicio.modulo_montado_ms = await waitFor(MONTADO, 45000); } catch {}
saida.reinicio.recibo_reinstalado = await E(ARRECADAR_CLIKES);
saida.reinicio.dentes_recibo = await E(DENTE_RECIBO);
saida.reinicio.observador_reinstalado = await E(OBSERVADOR);
saida.reinicio.modal = { antes: await E(MODAL) };
if (saida.reinicio.modal.antes.havido === true && saida.reinicio.modal.antes.fecho && saida.reinicio.modal.antes.fecho.w > 0) {
  saida.reinicio.modal.fecho_tocado = await toca(saida.reinicio.modal.antes.fecho.x, saida.reinicio.modal.antes.fecho.y);
  saida.reinicio.modal.assentou = await waitFor(MODAL_ASSSENTOU, 8000).then(() => true).catch(() => false);
} else saida.reinicio.modal.assentou = saida.reinicio.modal.antes.havido === true ? false : null;
const sondaReinicio = await E(SONDA);
saida.reinicio.gavetas = sondaReinicio.gavetas;

// A travessia por teclado corre SEMPRE, e nao só quando o rato falha: julgá-la apenas no ramo em que o rato
// nao abriu nao lhe dá positivo na corrida em que o rato abriu — e foi o que a corrida `c` mostrou, onde
// `por_teclado=false` queria dizer «nunca tentado» e não «tentado e recusado». O `open` lê-se antes e depois.
passoAtivo = 'teclado';
const gavetaAlvo = saida.gavetas.length ? saida.gavetas[0].i : null;
saida.teclado = { tentado: false, chegou_ao_sumario: false, mudou_por_teclado: null, abriu_por_teclado: null, travessia: [], motivo: saida.gavetas.length ? null : 'nenhuma gaveta medida nesta corrida' };
if (typeof gavetaAlvo === 'number') {
  saida.teclado.tentado = true;
  saida.teclado.escalada = await E(ESCALADA(gavetaAlvo));
  if (saida.teclado.escalada && saida.teclado.escalada.ok === true && saida.teclado.escalada.dentro_da_janela === false) {
    passoAtivo = 'roda_para_o_dente_do_oclusor';
    saida.teclado.rolagem = await E(SONDA_ROLAGEM);
    saida.teclado.escalada.roda = await rodasDoRato(gavetaAlvo);
    saida.teclado.assentar = await assentar(CENTRO(gavetaAlvo), 6000);
  }
  // O dente do oclusor corre aqui, com a gaveta fechada e o sumario dentro da janela: e o unico
  // momento da corrida em que a pilha do ponto esta no estado que a face do teclado mede.
  saida.dentes_oclusor = {};
  saida.dentes_oclusor.com = await E(FIX_OCLUSOR(gavetaAlvo, true));
  saida.dentes_oclusor.oclusor_com = (await E(SONDA)).gavetas.map((x) => ({ i: x.i, oclusor: x.oclusor_no_ponto })).find((x) => x.i === gavetaAlvo);
  saida.dentes_oclusor.sem = await E(FIX_OCLUSOR(gavetaAlvo, false));
  saida.dentes_oclusor.oclusor_sem = (await E(SONDA)).gavetas.map((x) => ({ i: x.i, oclusor: x.oclusor_no_ponto })).find((x) => x.i === gavetaAlvo);
  saida.teclado.censo = await E(CENSO_TABULAVEIS(gavetaAlvo));
  saida.teclado.sumario_alvo = await E(TECLADO_ALVO(gavetaAlvo));
  saida.teclado.foco_inicial = await E(TECLADO_FOCO(gavetaAlvo));
  saida.teclado.aberto_antes = await E(TECLADO_ABERTO(gavetaAlvo));
  const paragens = Number(saida.teclado.censo.paragens_ate_ao_sumario || 0);
  const teto = saida.teclado.censo.sumario_no_conjunto === true ? Math.min(400, paragens + 4) : 40;
  saida.teclado.orcamento = { origem: 'censo dos tabulaveis', paragens_ate_ao_sumario: paragens || null, teto };
  for (let k = 0; k < teto; k++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'char', text: '\t' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    const focado = await E(TECLADO_FOCO(gavetaAlvo));
    saida.teclado.travessia.push({ k, focado });
    if (focado && focado.e_o_sumario_alvo) { saida.teclado.chegou_ao_sumario = true; break; }
  }
  if (saida.teclado.chegou_ao_sumario) {
    const contagemDeMutacoes = '(() => { const m = window.__p131_mut || {}; return { n: m.n || 0, alvos: (m.alvos || []).slice(-4) }; })()';
    for (const tecla of ['Enter', 'Space']) {
      const vk = tecla === 'Enter' ? 13 : 32;
      let focoAntes = await E(TECLADO_FOCO(gavetaAlvo));
      let reaprendizagem = 0;
      while (focoAntes && focoAntes.e_o_sumario_alvo !== true && reaprendizagem < 60) {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
        await send('Input.dispatchKeyEvent', { type: 'char', text: String.fromCharCode(9) });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
        reaprendizagem++;
        focoAntes = await E(TECLADO_FOCO(gavetaAlvo));
      }
      saida.teclado.reaprendizagem = (saida.teclado.reaprendizagem || []).concat([{ tecla, paragens: reaprendizagem, pousou_no_sumario: !!(focoAntes && focoAntes.e_o_sumario_alvo), focado_em: focoAntes ? focoAntes.no : null }]);
      const mutAntes = await E(contagemDeMutacoes);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: tecla, code: tecla === 'Enter' ? 'Enter' : 'Space', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'char', text: tecla === 'Enter' ? '\r' : ' ' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: tecla, code: tecla === 'Enter' ? 'Enter' : 'Space', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await dorme(300);
      const est = await E(TECLADO_ABERTO(gavetaAlvo));
      const mutDepois = await E(contagemDeMutacoes);
      saida.teclado.travessia.push({ k: 'tecla-' + tecla, aberto: est === true, pousou_no_sumario: !!(focoAntes && focoAntes.e_o_sumario_alvo), focado_em: focoAntes ? focoAntes.no : null, mutacoes_durante: mutDepois.n - mutAntes.n, alvos: mutDepois.alvos });
      saida.teclado.mudou_por_teclado = est !== saida.teclado.aberto_antes;
      saida.teclado.abriu_por_teclado = saida.teclado.aberto_antes === false && est === true;
      if (saida.teclado.mudou_por_teclado === true) break;
    }
  } else saida.teclado.motivo = saida.teclado.censo.sumario_no_conjunto === true
    ? 'Tab x ' + teto + ' (orcamento = ' + paragens + ' paragens ate ao sumario + 4) sem chegar ao sumario da gaveta ' + gavetaAlvo
    : 'o sumario da gaveta ' + gavetaAlvo + ' nao esta no conjunto tabulavel medido (' + saida.teclado.censo.n_tabulaveis + ' tabulaveis, indice ' + saida.teclado.censo.indice_do_sumario + ')';
}

if (saida.teclado.tentado === true && saida.teclado.chegou_ao_sumario === true && saida.teclado.mudou_por_teclado !== true) {
  const teclas = saida.teclado.travessia.filter((x) => typeof x.k === 'string' && x.k.indexOf('tecla-') === 0);
  const ult = teclas[teclas.length - 1] || null;
  saida.teclado.causa_do_teclado_sem_efeito = !ult
    ? 'nenhuma_tecla_enviada'
    : ult.pousou_no_sumario !== true
      ? 'a_tecla_pousou_fora_do_sumario_em_' + String(ult.focado_em || 'nada')
      : ult.mutacoes_durante > 0
        ? 'tecla_no_sumario_mas_a_vista_mutou_' + ult.mutacoes_durante + '_vezes_no_intervalo'
        : 'tecla_no_sumario_gerada_e_o_details_nao_mudou';
}
passoAtivo = 'sonda_final';
saida.sonda_final = await E(SONDA);

// ——— portões ———
const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 320)); console.log((v ? 'VERDE  ' : 'VERMELHO ') + nome); };
const nG = (saida.sonda_final && saida.sonda_final.n_gavetas) || 0;
g('f1_prontidao_pelo_predicado_do_fonte', saida.tempos_ms.modulo_montado >= 0 && !!(saida.sonda_final && saida.sonda_final.vista_existe && saida.sonda_final.bound === true && saida.sonda_final.vista_escondida === false), { modulo_montado_ms: saida.tempos_ms.modulo_montado, sonda: saida.sonda_final && { vista_existe: saida.sonda_final.vista_existe, bound: saida.sonda_final.bound, escondida: saida.sonda_final.vista_escondida, activa: saida.sonda_final.vista_activa, papel: saida.sonda_final.papel_perfil } });
g('f2_toda_gaveta_chegou_com_as_duas_caras', nG >= 1 && saida.gavetas.length === nG && saida.gavetas.every((r) => r.details && r.sumario && r.sumario.w > 0 && typeof r.aberto_inicial === 'boolean'), { n_gavetas: nG, registadas: saida.gavetas.map((r) => ({ i: r.i, w: r.sumario && r.sumario.w, y: r.sumario && r.sumario.centro_y, aberto: r.aberto_inicial })) });
// Causa nomeada por gaveta que o rato não abriu: fora da janela, elemento por cima com caixa e pointer-events,
// ou clique que pousou e mesmo assim nada mudou. As três têm de ser distinguíveis no registo.
const semCausa = saida.gavetas.filter((r) => {
  if (r.clique && r.clique.tentado === true && r.clique.aberto_depois === true) return false;
  if (r.clique && r.clique.tentado === false) return !(String(r.clique.motivo || '').length > 0);
  if (typeof r.i !== 'number') return true;
  const o = r.oclusor_no_ponto_depois || r.oclusor_no_ponto_inicial;
  const janela = r.centro_dentro_da_janela === false || !(r.sonda_depois_da_escala && r.sonda_depois_da_escala.centro_dentro_da_janela === true);
  if (janela) return false;
  // A terceira causa legitima: o rato pousou no proprio sumario, ficou provado que ele era o topo do ponto, e
  // o fonte nao respondeu. Isso nao e «sem causa» - e causa contraria a oclusao, e distingue-se pelo hit-test.
  const pousou_no_sumario = !!(r.hit_test_no_ponto && typeof r.hit_test_no_ponto.no === 'string' && r.topo_do_ponto_e_o_sumario_depois === true);
  return !(pousou_no_sumario || (o && typeof o.no === 'string' && typeof o.ponteiro === 'string'));
});
g('f3_toda_gaveta_que_o_rato_nao_abriu_tem_causa_nomeada', semCausa.length === 0, { sem_causa: semCausa.map((r) => ({ i: r.i, motivo: r.clique && r.clique.motivo, pousou_em: r.hit_test_no_ponto && r.hit_test_no_ponto.no, oclusor: r.oclusor_no_ponto_depois && r.oclusor_no_ponto_depois.no, na_janela: r.centro_dentro_da_janela })) });
const escritas = saida.pedidos_no_fio.filter(ehEscritaDeMesa);
g('f4_nenhuma_escrita_a_mesa_saiu_pelo_fio', escritas.length === 0, { escritas: escritas.slice(0, 4), total_nao_get: saida.pedidos_no_fio.length, resumo: saida.contagem_pedidos });
// Os RPC de leitura vão pelo mesmo transporte de uma escrita (POST), por isso o método nada julga: o que julga
// e o `provolatile` do catálogo vivo. Um nome que o extrator não resolve, ou que não está no catálogo, conta
// como suspeito (falha fechada) — nunca como «não visto».
const rpcVistos = [...new Set(saida.pedidos_no_fio.filter((p) => p.metodo !== 'OPTIONS').map(nomeRpc).filter((x) => !!x))];
const rpcNaoResolvidos = [...new Set(saida.pedidos_no_fio.filter((p) => p.metodo !== 'OPTIONS' && p.origem === 'supabase' && /^\/rest\/v1\/rpc\//.test(String(p.caminho || '')) && !nomeRpc(p)).map((p) => p.caminho))];
let rpcJulgado = [];
if (rpcVistos.length) {
  const { sql } = await import(pathToFileURL(REPO + '/scripts/c2-lib.mjs').href);
  const lista = rpcVistos.map((x) => "'" + x + "'").join(',');
  const linhas = await sql("select p.proname as nome, p.provolatile as vol, count(*)::int as assinaturas from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (" + lista + ") group by 1, 2 order by 1, 2");
  const porNome = new Map(linhas.map((r) => [String(r.nome), String(r.vol)]));
  rpcJulgado = rpcVistos.map((nome) => ({ nome, vol: porNome.get(nome) || null, assinaturas_no_catalogo: linhas.filter((r) => String(r.nome) === nome).length }));
}
saida.rpc_no_fio = { vistos: rpcVistos, nao_resolvidos: rpcNaoResolvidos, julgado: rpcJulgado };
if (rpcVistos.length + rpcNaoResolvidos.length === 0) { saida.f5_nao_julgado = { predicado: 'todo rpc do fio e stable ou imutable no catalogo vivo', motivo: 'nenhum rpc passou pelo fio nesta corrida' }; console.log('NAO-JULGADO  f5 - nenhum rpc no fio'); }
else g('f5_todo_rpc_do_fio_e_de_leitura_no_catalogo', rpcNaoResolvidos.length === 0 && rpcJulgado.every((r) => r.vol === 'i' || r.vol === 's'), rpcJulgado.concat(rpcNaoResolvidos.map((c) => ({ caminho_nao_resolvido: c }))));
g('f6_o_leitor_do_aberto_tem_os_dois_lados', saida.dentes_leitor && saida.dentes_leitor.com_open === true && saida.dentes_leitor.sem_open === false, saida.dentes_leitor);
// A escuta do click so vale como prova de «cancelado» se tiver dente nos dois lados: cresce com um click e nao
// cresce sem ele. Sem isto, «zero clicks gerados» poderia ser simplesmente a minha escuta mal montada. O dente
// e cobrado nas duas paginas da corrida (a do rato e a do teclado), porque a navegacao deita-a abaixo.
const denteOk = (dt) => !!(dt && dt.cresceu === true && dt.lado_negativo_igual === true && dt.abriu_sintetico === true);
g('f6b_o_recibo_do_clique_tem_os_dois_lados', denteOk(saida.dentes_recibo) && denteOk(saida.reinicio && saida.reinicio.dentes_recibo), { rato: saida.dentes_recibo, teclado: saida.reinicio && saida.reinicio.dentes_recibo });
// Ramo «não havido» imprime-se com a prédica no lugar do veredicto: suprimi-la transformaria «não sei» em
// «não existe», e a conta do porteiro pode ser uma conta antiga sem modal.
if (saida.modal.antes.havido === true) g('f7_o_modal_de_primeiro_acesso_nao_fica_por_fechar', saida.modal.assentou === true, saida.modal);
else { saida.f7_nao_havido = { predicado: 'o modal de primeiro acesso, havido, fica fechado', modal: saida.modal.antes }; console.log('NAO-JULGADO  f7 - sem modal aberto no documento medido'); }
// O teclado so mede a face do teclado se arrancar no estado inicial da gaveta: o reinicio tem de chegar montado,
// com a gaveta como estava antes do rato e sem o foco em cima do sumario. O Chrome retoma o Tab a partir do
// ultimo ponto de clique, e foi isso que na corrida `f` fez a travessia saltar por cima do sumario aberto.
const oclCom = saida.dentes_oclusor && saida.dentes_oclusor.oclusor_com && saida.dentes_oclusor.oclusor_com.oclusor;
const oclSem = saida.dentes_oclusor && saida.dentes_oclusor.oclusor_sem && saida.dentes_oclusor.oclusor_sem.oclusor;
if (saida.teclado.tentado !== true) { saida.f11_nao_julgado = { predicado: "um overlay por cima do sumario aparece como oclusor, retirado nao aparece", motivo: "nenhuma gaveta medida nesta corrida" }; console.log("NAO-JULGADO  f11 - nenhuma gaveta"); }
else if (saida.dentes_oclusor && saida.dentes_oclusor.com && saida.dentes_oclusor.com.na_janela === false) { saida.f11_nao_julgado = { predicado: "um overlay por cima do sumario aparece como oclusor, retirado nao aparece", motivo: "o ponto do sumario estava fora da janela no momento do dente, por isso nem overlay nem leitura sao possiveis", ponto: saida.dentes_oclusor.com.ponto, janela_ih: saida.dentes_oclusor.com.janela_ih || null }; console.log("NAO-JULGADO  f11 - ponto fora da janela em y=" + (saida.dentes_oclusor.com.ponto && saida.dentes_oclusor.com.ponto.y)); }
else g("f11_o_leitor_do_oclusor_tem_os_dois_lados", !!(saida.dentes_oclusor && saida.dentes_oclusor.com && saida.dentes_oclusor.com.e_dente === true && oclCom && String(oclCom.no).indexOf("p131-dente-oclusor") >= 0 && saida.dentes_oclusor.sem && saida.dentes_oclusor.sem.e_dente === false && (oclSem === null || oclSem === undefined)), saida.dentes_oclusor);
// Uma escalada que nao moveu nada e um nao-operador, nao uma medida: na corrida m390 o registo dizia ok:true
// com o centro imovel. A partir de agora um nao-operador so vale se vier com a cadeia de rolagem sondada, e o
// portao julga a presenca da sonda, nunca o numero de pixeis ganhos.
const escaladasMedidas = saida.gavetas.filter((r) => r.escala && r.escala.ok === true);
const semSondaDeRolagem = escaladasMedidas.filter((r) => r.escala.dentro_da_janela === false && !(r.rolagem && r.escala.roda));
if (escaladasMedidas.length > 0) g("f12_toda_escalada_sem_efeito_vem_com_a_rolagem_sondada_e_a_roda_tentada", semSondaDeRolagem.length === 0, { escaladas: escaladasMedidas.map((r) => ({ i: r.i, moveu: r.escala.moveu, dentro_da_janela: r.escala.dentro_da_janela, metodos: r.escala.tentativas.map((t) => t.metodo + ":" + t.topo_antes + "->" + t.topo_depois), tem_rolagem: !!r.rolagem, rodou: r.escala.roda ? { ok: r.escala.roda.ok, voltas: (r.escala.roda.tentadas || []).length } : null })), sem_sonda: semSondaDeRolagem.map((r) => r.i) });
else { saida.f12_nao_julgado = { predicado: "toda escalada sem efeito traz a cadeia de rolagem sondada", motivo: "nenhuma escalada medida nesta corrida" }; console.log("NAO-JULGADO  f12 - nenhuma escalada"); }
const gavetaReinicio = ((saida.reinicio && saida.reinicio.gavetas) || [])[0] || null;
const abertoAntesDoRato = saida.gavetas.length ? saida.gavetas[0].aberto_inicial === true : null;
if (saida.teclado.tentado === true) g('f10_o_teclado_arranca_no_estado_inicial_da_gaveta', saida.reinicio.modulo_montado_ms >= 0 && !!gavetaReinicio && gavetaReinicio.aberto === abertoAntesDoRato && !!saida.teclado.foco_inicial && saida.teclado.foco_inicial.e_o_sumario_alvo === false, { montado_ms: saida.reinicio.modulo_montado_ms, aberto_antes_do_rato: abertoAntesDoRato, aberto_no_reinicio: gavetaReinicio && gavetaReinicio.aberto, foco_inicial: saida.teclado.foco_inicial });
else { saida.f10_nao_julgado = { predicado: 'o teclado arranca no estado inicial medido antes do rato', motivo: 'nenhuma gaveta medida nesta corrida' }; console.log('NAO-JULGADO  f10 - nenhuma gaveta'); }
const alcancaveis = saida.gavetas.filter((r) => r.clique && r.clique.aberto_depois === true).length;
const teclado = saida.teclado.tentado === true ? ('chegou_ao_sumario=' + saida.teclado.chegou_ao_sumario + ' mudou_por_teclado=' + saida.teclado.mudou_por_teclado + (saida.teclado.causa_do_teclado_sem_efeito ? ' causa=' + saida.teclado.causa_do_teclado_sem_efeito : '') + ' reaprendizagem=' + JSON.stringify((saida.teclado.reaprendizagem || []).map((x) => x.paragens + (x.pousou_no_sumario ? '' : ':fora'))) + ' mut=' + JSON.stringify((saida.teclado.travessia || []).filter((x) => typeof x.k === 'string' && x.k.indexOf('tecla-') === 0).map((x) => x.mutacoes_durante))) : 'nao_tentado';
const causa = (saida.gavetas[0] && saida.gavetas[0].causa_do_clique_sem_efeito) || null;
(() => {
  const d = saida.dentes_marcada || {};
  g('f13_o_recibo_recortado_tem_os_dois_lados', d.havia > 0 && d.lado_negativo === 0 && d.novos >= 1 && d.tem_em === true && d.pousou_no_sumario === true, d);
  const a = saida.dentes_assentar || {};
  g('f14_o_assentar_tem_os_dois_lados', a.parado && a.parado.estavel === true && a.parado.dentro === true && a.a_animar && a.a_animar.estavel === false && a.desmontagem && a.desmontagem.retirado === true && saida.censo_depois_do_dente === saida.censo_de_antes_do_dente, { parado: a.parado && { estavel: a.parado.estavel, dentro: a.parado.dentro, centro: a.parado.centro }, a_animar: a.a_animar && { estavel: a.a_animar.estavel, leituras: a.a_animar.leituras }, censo: [saida.censo_de_antes_do_dente, saida.censo_depois_do_dente], montagem: a.montagem, animacao: a.animacao });
})();
(() => {
  const teclas = (saida.teclado.travessia || []).filter((x) => typeof x.k === 'string' && x.k.indexOf('tecla-') === 0);
  if (saida.teclado.tentado !== true || teclas.length === 0) { saida.f15_nao_julgado = { predicado: 'cada tecla registra onde pousou e toda recusa tem causa nomeada', motivo: saida.teclado.motivo || 'nenhuma tecla enviada nesta corrida' }; console.log('NAO-JULGADO  f15 - nenhuma tecla'); return; }
  const pousioRegistado = teclas.every((x) => typeof x.pousou_no_sumario === 'boolean' && typeof x.mutacoes_durante === 'number') && Array.isArray(saida.teclado.reaprendizagem) && saida.teclado.reaprendizagem.length === teclas.length;
  const recusaNomeada = saida.teclado.mudou_por_teclado === true || (typeof saida.teclado.causa_do_teclado_sem_efeito === 'string' && saida.teclado.causa_do_teclado_sem_efeito.length > 0);
  g('f15_o_teclado_regista_onde_pousou_cada_tecla', pousioRegistado && recusaNomeada, { teclas: teclas.map((x) => ({ k: x.k, pousou_no_sumario: x.pousou_no_sumario, focado_em: x.focado_em, mutacoes_durante: x.mutacoes_durante, aberto: x.aberto })), mudou: saida.teclado.mudou_por_teclado, causa: saida.teclado.causa_do_teclado_sem_efeito || null });
})();
const abriuAlguma = saida.gavetas.filter((r) => r.abriu_em_alguma_amostra === true).length;
const face = 'alcancaveis_pelo_rato=' + alcancaveis + '/' + saida.gavetas.length + (abriuAlguma !== alcancaveis ? ' abriu_em_amostra=' + abriuAlguma : '') + (causa ? ' causa=' + causa : '') + ' assentou=' + saida.gavetas.filter((r) => r.assentar && r.assentar.estavel === true).length + '/' + saida.gavetas.length + ' por_teclado(' + teclado + ')';
if (ESPERA === 'toda-alcancavel') g('f8_esperado_declarado_toda-alcancavel', saida.gavetas.length >= 1 && alcancaveis === saida.gavetas.length, { espera: ESPERA, face });
else { saida.f8_nao_julgado = { predicado: 'toda gaveta abre com um clique real no centro do sumario', motivo: 'corrida de declaracao ' + ESPERA + ' (a do ar serve para medir, a da candidata julga)', face }; console.log('NAO-JULGADO  f8 - ' + face); }

saida.face = face;
saida.duracao_ms = Date.now() - t0;
clearTimeout(vigilia);
encerrado = true;
try { ws.onclose = null; ws.close(); } catch {}
try { if (chrome) spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { if (servidor) servidor.close(); } catch {}

if (falhas.length) {
  saida.portoes.falhas = falhas.length;
  saida.veredito = 'P131_GAVETA_VERMELHO ' + falhas.length;
  saida.falhas = falhas;
  grava(OUT.replace('.json', '-VERMELHO.json'));
  console.log(saida.veredito + ' · ' + face);
  process.exit(1);
}
saida.portoes.falhas = 0;
saida.veredito = 'P131_GAVETA_MEDIDO ' + saida.portoes.total + '/0 · esperanca=' + ESPERA;
grava(OUT);
console.log(saida.veredito + ' · ' + face + ' · janelas=' + LARGURA + 'x' + ALTURA + ' gavetas=' + nG);
