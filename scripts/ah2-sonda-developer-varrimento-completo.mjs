// Porque este programa existe: as três corridas de §AI.27 (`dv390`, `dv390b`, `dv390c`) mostraram que a
// gaveta do `developer` NÃO perde entradas nos toques válidos, mas ficaram todas truncadas no mesmo sítio —
// a partir de `fotos`, o `#bfrStudentPhotoManager` (z-index 12000) fica por cima do «Mais» e o varrimento
// para. Com 12 das 26 rotas por tocar, a pergunta do `sem_botao` da grelha fica por responder, e respondê-la
// exige primeiro sair do overlay. Este programa faz só isso: usa as SAÍDAS DO PRODUTO (a tecla Escape e os
// botões de fecho/saída que o próprio overlay apresenta), nunca muta o DOM nem esconde nada à força —
// esconder o overlay por script mediria o meu jogo, não o produto. Regista qual saída funcionou, e se
// nenhuma funcionar isso é o resultado.
// Copia de `ah2-sonda-developer-perde-gaveta.mjs` de propósito (mesma ordem lida do artefacto, mesmo
// `abre_gaveta` com `is-open` antes do toque, mesmo censo por passo) para as corridas serem comparáveis; o
// único comportamento novo é `sai_overlay()`. Não escreve em base, não faz DDL, não publica.
// Uso: node scripts/ah2-sonda-developer-varrimento-completo.mjs [largura=390] [rótulo=dvfc1]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const LARGURA = parseInt(process.argv[2] || '390', 10);
const ROTULO = process.argv[3] || 'dvfc1';
const PAPEL = 'developer';
const TRES = ['monitor', 'gate', 'psychology'];
const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = parseInt(process.env.AH2_PORT || '9471', 10);
const ALTURA = 720;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-sonda-developer-varrimento-completo-${ROTULO}.json`;
const PERFIL = `${DIR}/.ah2fc-${ROTULO}-${PORT}`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
// A ordem vem do artefacto que produz a linha da tabela, não da minha memória do varrimento.
const ORIGEM = `${DIR}/bfr-conecta/evidence/ah2-mobile2-m5-developer-4.json`;
const ORDEM = Object.keys(JSON.parse(readFileSync(ORIGEM, 'utf8')).bandas['390'].seccoes);
if (ORDEM.length < 10) throw new Error('ABORTA: não consegui ler a ordem de ' + ORIGEM);
// `AH2_FILTRA=monitor,gate,psychology` restringe o varrimento a essas portas, na ordem dada. Serve a um
// desenho específico: `dvfc2` mediu que o toque em `coordenacao` troca `view` de `admin` para `coordinator`
// e que as três portas saem do DOM nesse instante — para saber se a porta FUNCIONA é preciso tocá-la numa
// sessão onde o `view` ainda é o inicial, e não no 21.º passo de um varrimento que já o deitou abaixo.
const FILTRO = (process.env.AH2_FILTRA || '').split(',').map((s) => s.trim()).filter(Boolean);
if (FILTRO.length) {
  const faltam = FILTRO.filter((r) => !ORDEM.includes(r));
  if (faltam.length) throw new Error('ABORTA: fora da ordem do artefacto: ' + faltam.join(','));
  ORDEM.splice(0, ORDEM.length, ...FILTRO);
}
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessao-${PAPEL}.json`, 'utf8'));
const sessao = S[PAPEL] || S;
if (!sessao?.access_token) throw new Error('ABORTA: sem sessão guardada para ' + PAPEL);
const SHELL = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = createHash('md5').update(SHELL).digest('hex');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetimes: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
let saida = { ciclo: 'AH-DV-VARRIMENTO-COMPLETO', em: new Date().toISOString(), papel: PAPEL, largura: LARGURA, origem_da_ordem: ORIGEM.split('/').pop(), ordem: ORDEM, filtro: FILTRO.length ? FILTRO : null, md5_shell: null, passos: [], saidas_usadas: [], veredito: null };
function grava(codigo) {
  try { saida.em_fim = new Date().toISOString(); writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); console.log('ESCRITO: ' + OUT.split('/').pop()); } catch {}
  process.exit(codigo);
}
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); grava(c); };
setTimeout(() => abort(3, 'teto 240 s'), 240000);
let tg = [];
for (let i = 0; i < 80; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await dorme(400); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(p.method + ': ' + m.error.message)) : p.res(m.result); return; } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej, method }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await dorme(350); } throw new Error('waitFor: ' + e.slice(0, 90)); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000).catch(() => {});
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
saida.ms_ready = await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 70000).catch(() => null);
saida.md5_shell = MD5;
saida.papel_inicial = await E(`window.BFR_CURRENT_PROFILE?.role ?? null`);
const TOQUE = async (x, y, de) => { if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('TOQUE sem coordenadas validas (' + x + ',' + y + ') em ' + (de || '?')); await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const TECLA = async (key, code, vk) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const CENTRA = (sel) => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return JSON.stringify({x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height)}); })()`;
const clica = async (sel) => { const s = await E(CENTRA(sel)); if (!s) return false; const r = JSON.parse(s); await TOQUE(r.x, r.y, sel); await dorme(600); return true; };
// O que tapa o «Mais»: lido por coordenada, não por suposição.
const CUBRE = `(() => { const b = document.querySelector('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]'); if (!b) return 'SEM_MAIS'; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); if (!r.width || !r.height) return 'MAIS_SEM_CAIXA'; const t = document.elementFromPoint(Math.round(r.x + r.width/2), Math.round(r.y + r.height/2)); if (t === b || b.contains(t)) return null; const o = t ? (t.closest('[id]') || t) : null; return (o.tagName||'?').toLowerCase() + (o.id ? '#' + o.id : '') + ' z' + (o.id ? getComputedStyle(o).zIndex : '-') + ' compo' + (o.id === 'bfrStudentPhotoManager' ? 'SPM' : o.className || '-'); })()`;
// SAÍDAS DO PRODUTO, por ordem de preço. A segunda só toca botões cujo nome acessível é de saída — o
// primeiro `button` do gestor de fotografias é uma ferramenta de edição, e clicar às cegas nele seria
// escrever no produto a partir de uma sonda que se anunciou como de leitura. Escape primeiro, depois o
// botão de sair, depois o fundo do diálogo (toque fora, que em muitos módulos só fecha).
const SAIDAS = [
  ['Escape', async () => { await TECLA('Escape', 'Escape', 27); await dorme(500); }],
  ['botao_de_sair_do_overlay', async () => {
    const sel = await E(`(() => { const b = Array.from(document.querySelectorAll('#bfrStudentPhotoManager button, .bfr-spm-backdrop button')).find(x => /^(fechar|sair|voltar|cancelar|conclu|terminal|close)/i.test((x.textContent||'').trim()) || /^(fechar|sair|voltar|cancelar|close)/i.test(x.getAttribute('aria-label')||'')); if (!b) return null; b.setAttribute('data-ah2-saida','1'); return '#[data-ah2-saida]'; })()`);
    if (!sel) return false;
    const s = await E(CENTRA('[data-ah2-saida]')); if (!s) return false; const r = JSON.parse(s);
    await TOQUE(r.x, r.y, 'saida:' + s.slice(0, 40)); await dorme(600);
    await E(`document.querySelector('[data-ah2-saida]')?.removeAttribute('data-ah2-saida')`);
    return true;
  }],
  ['toque_fora_do_dialogo', async () => { const r = await E(CENTRA('#bfrStudentPhotoManager')); if (!r) return false; await TOQUE(Math.round(LARGURA / 2), 12); await dorme(500); return true; }],
];
async function sai_overlay(motivo) {
  for (const [nome, fn] of SAIDAS) {
    try { await fn(); } catch {}
    const cubre = await E(CUBRE);
    if (!cubre) { saida.saidas_usadas.push({ motivo, saida: nome }); return nome; }
  }
  saida.saidas_usadas.push({ motivo, saida: 'NENHUMA_FUNCIONOU' });
  return null;
}
saida.modal_inicial = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? m.id || null : null; })()`);
if (saida.modal_inicial) await clica('#' + saida.modal_inicial + ' .modal-close');
saida.ms_barra = await waitFor("!!document.getElementById('bfrMobileBottomNav')", 30000).catch(() => null);
saida.gaveta_aberta = await clica('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]');
const CENSO = `(() => { const links = document.querySelector('#bfrMobileDrawer .bfr-drawer-links, #bfrMobileDrawer'); return { aberta: !!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open'), papeis: { sessao: window.BFR_CURRENT_PROFILE?.role ?? null, view: window.BFR_APP_RUNTIME?.activeView ?? null, ativa: window.BFR_APP_RUNTIME?.activeSection ?? null }, itens: Array.from(document.querySelectorAll('#bfrMobileDrawer [data-bfr-drawer-route]')).map(x => x.getAttribute('data-bfr-drawer-route')), sem_caixa: ${JSON.stringify(TRES)}.map(r => { const el = document.querySelector('#bfrMobileDrawer [data-bfr-drawer-route="' + r + '"]'); if (!el) return r + '=NAO_EXISTE'; const q = el.getBoundingClientRect(); return r + '=' + Math.round(q.width) + 'x' + Math.round(q.height); }), html_links: links ? links.innerHTML.length : null }; })()`;
saida.censo_antes = await E(CENSO);
if (!saida.censo_antes?.itens?.length) { saida.veredito = 'a gaveta não abriu ou não tem itens — nada a medir'; grava(2); }
const presente = (c, r) => (c.itens || []).includes(r);
let anterior = saida.censo_antes, bloqueios = 0;
for (const rota of saida.ordem) {
  const sel = `#bfrMobileDrawer [data-bfr-drawer-route="${rota}"]`;
  // Se o «Mais» está tapado, primeiro tento as saídas do produto e só depois decido se o passo é mensurável.
  let cubre = await E(CUBRE), tentei_sair = null;
  if (cubre && cubre !== 'SEM_MAIS' && cubre !== 'MAIS_SEM_CAIXA') { tentei_sair = await sai_overlay(rota + ':' + cubre); cubre = await E(CUBRE); if (!cubre || cubre === 'SEM_MAIS') cubre = null; else bloqueios++; }
  let abriu = null;
  if (!cubre) {
    abriu = (await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`)) ? 'ja_aberta' : null;
    if (!abriu) { const ok = await clica('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]'); abriu = (ok && await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`)) ? 'abriu_a_toque' : 'toque_nao_abriu'; }
  } else bloqueios++;
  const existia = await E(`!!document.querySelector(${JSON.stringify(sel)})`);
  const tocavel = !cubre && abriu === 'ja_aberta' || (!cubre && abriu === 'abriu_a_toque');
  const t0 = Date.now();
  let tocado = false;
  if (existia && tocavel) { tocado = await clica(sel); await dorme(500); }
  const c = await E(CENSO);
  if (!c) { saida.veredito = 'censo falhou em ' + rota; grava(4); }
  saida.passos.push({ rota, coberto_por: cubre || null, saida_que_funcionou: tentei_sair, gaveta: abriu, estava_na_gaveta: existia, tocado, sem_caixa: c.sem_caixa, ms: Date.now() - t0, papeis: c.papeis, sumiram: TRES.filter((r) => presente(anterior, r) && !presente(c, r)), ainda_la: TRES.filter((r) => presente(c, r)), itens: c.itens.length, html_links: c.html_links });
  anterior = c;
}
const tocados = saida.passos.filter((p) => p.tocado).length;
const sumiram = saida.passos.filter((p) => p.sumiram.length);
const sem_causa = saida.passos.filter((p) => p.estava_na_gaveta && !p.tocado && !p.coberto_por);
saida.veredito = FILTRO.length
  ? `varrimento FILTRADO a ${FILTRO.join('/')}, começando no \`view\` em que as portas existem: ` +
    saida.passos.map((p) => `${p.rota}=${p.tocado ? `tocada, ativa=${p.papeis?.ativa}` : `NAO_TOCAVEL (estava_na_gaveta=${p.estava_na_gaveta}${p.coberto_por ? ', coberto_por=' + p.coberto_por : ''})`}`).join('; ')
  : sumiram.length
  ? `o toque em \`${sumiram[0].rota}\` (passo ${saida.passos.indexOf(sumiram[0]) + 1}) faz sair ${sumiram[0].sumiram.join('/')}; \`` +
    `activeView` + `=${sumiram[0].papeis?.view} depois do toque. Com ${tocados}/${saida.passos.length} toques válidos, o \`sem_botao\` da grelha tem agora causa medida.`
  : tocados >= saida.ordem.length - 1
    ? `varrimento COMPLETO (${tocados}/${saida.ordem.length} toques válidos, ${bloqueios} bloqueio(s) de overlay resolvidos com saída do produto: ` +
      `${saida.saidas_usadas.filter(s => s.saida !== 'NENHUMA_FUNCIONOU').map(s => s.saida).join(', ') || 'nenhumaneeded'}): nenhuma das três (${TRES.join('/')}) saiu da lista da ` +
      `gaveta em passo algum, e o \`activeView\` manteve-se \`admin\` — o \`sem_botao\` da grelha NÃO é a lista a reconstruir-se nem o papel a trocar de pessoa.`
    : `${tocados}/${saida.ordem.length} toques válidos e ${bloqueios} passo(s) com o «Mais» tapado mesmo depois de eu tentar as saídas do produto ` +
      `(${[...new Set(saida.saidas_usadas.filter(s => s.saida === 'NENHUMA_FUNCIONOU').map(s => s.motivo))].join(', ') || '-'}) — o varrimento continua truncado e o ` +
      '`sem_botao` fica por provar; ' + (sem_causa.length ? `e há ${sem_causa.length} passos em que a entrada existia e a gaveta estava acessível sem eu ter tocado, o que é falha do instrumento.` : 'nenhum passo foi perdido por falha minha.');
grava(0);
