#!/usr/bin/env node
// P110 — QUEM ESCREVE A CLASSE `hidden` NO PAINEL, E COM QUE PILHA (21/11, madrugada).
//
// A P108 classificou por AUSENCIA: `actor=shell` queria dizer «o painel ficou escondido sem que o modulo
// registasse navigate nem criasse objecto de fecho». E uma inferencia, e a memoria deste projecto nao assinam
// inferencias quando ha uma medida possivel. Ha: a escondida é uma escrita na lista de classes do painel, por
// isso embrulha-se `DOMTokenList.prototype.add/remove/toggle/replace`, `Element.prototype.setAttribute` e o
// `set className`, e cada escrita no no painel guarda a pilha do chamador. A pilha tem numero de linha do
// documento servido; a regiao do modulo municipal resolve-se dos proprios bytes (28663..29404 no par de
// <script data-bfr-municipal-module>), logo «dentro do modulo» deixa de ser uma suposicao minha.
//
// O que esta peca tem de discriminar, com os dois lados provados:
//   · Admin -> Direcao   — a P107 apanhou o modulo (fecharPainelForaDaVista); tem de dar `modulo`.
//     Se der outra coisa, a regua de faixa esta errada e nenhuma das celulas prova seja o que for.
//   · Admin -> Professor — a P105 chumbou aqui (F6): ou o modulo esconde por um caminho que nao regista fecho
//     (achado de produto: a trilha fica muda), ou esconde o shell (achado de instrumento: a P105 leu o global
//     ULTIMO_FECHO como se fosse a medida da celula).
// Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 publicacao. Instrumentacao desta sessao no browser.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p110-actor-da-escondida-por-pilha-21-11-${SUF}.json`;
const TXT = `${REPO}/evidence/p110-actor-da-escondida-por-pilha-21-11-${SUF}.txt`;
if ([OUT, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto ja existe — corre com SUF novo, nunca por cima');
const ESP = JSON.parse(readFileSync(`${REPO}/worker-deploy-v142-painel-na-troca/esperado-v142.json`, 'utf8'));
const PORT = parseInt(process.env.AH2_PORT || '9416', 10);
const PAPEL = (process.env.P110_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();
const TETO_MS = 300000;
const CELULAS_PLAN = [['Professor', 'a celula que a P105 chumbou na F6'], ['Direção', 'controlo com dentes: a P107 apanhou aqui o fecho do modulo'], ['Pais', 'controlo: outra vista fora do mapa']];

function recortaObjecto(txt, marcador) {
  const i = txt.indexOf(marcador);
  if (i < 0) return null;
  const b = txt.indexOf('{', i);
  let nv = 0, fim = -1;
  for (let k = b; k < txt.length; k++) { const c = txt[k]; if (c === '{') nv++; else if (c === '}') { nv--; if (nv === 0) { fim = k; break; } } }
  if (fim < 0) return null;
  return { literal: txt.slice(b, fim + 1), objecto: Function('return (' + txt.slice(b, fim + 1) + ')')() };
}
const regraDoShell = (FB, v) => (typeof FB[v] === 'string' ? FB[v] : 'inicio');

// ——— a classificacao, pura: recebe a celula medida e devolve um nome de actor, nunca um booleano opaco ———
function actorDaEscondida(c) {
  if (!c || typeof c !== 'object') return 'medicao_incompleta';
  if (c.escondido_antes !== false) return 'ja_escondido_antes_do_clique';
  if (c.escondido_depois !== true) return 'nao_escondeu_na_janela';
  const esc = (c.escritas || []).filter((w) => w.antes_escondido === false && w.depois_escondido === true);
  if (esc.length === 0) return ((c.mutacoes || []).length > 0 ? 'escrita_sem_pilha' : 'escondido_sem_registro_de_escrita');
  const p = esc[0].primeiro_frame;
  if (!p || typeof p.linha !== 'number') return 'pilha_sem_linha_lida';
  return p.dentro_do_modulo === true ? 'modulo' : 'shell';
}
const F = (linha, dentro) => ({ linha, dentro_do_modulo: dentro, texto: 'frame' });
const FIXTURES = [
  { nome: 'modulo', celula: { escondido_antes: false, escondido_depois: true, escritas: [{ antes_escondido: false, depois_escondido: true, primeiro_frame: F(29348, true) }], mutacoes: [{}] } },
  { nome: 'shell', celula: { escondido_antes: false, escondido_depois: true, escritas: [{ antes_escondido: false, depois_escondido: true, primeiro_frame: F(10022, false) }], mutacoes: [{}] } },
  { nome: 'escrita_sem_pilha', celula: { escondido_antes: false, escondido_depois: true, escritas: [], mutacoes: [{ t: 1 }] } },
  { nome: 'escondido_sem_registro_de_escrita', celula: { escondido_antes: false, escondido_depois: true, escritas: [], mutacoes: [] } },
  { nome: 'nao_escondeu_na_janela', celula: { escondido_antes: false, escondido_depois: false, escritas: [], mutacoes: [] } },
  { nome: 'ja_escondido_antes_do_clique', celula: { escondido_antes: true, escondido_depois: true, escritas: [], mutacoes: [] } },
  { nome: 'pilha_sem_linha_lida', celula: { escondido_antes: false, escondido_depois: true, escritas: [{ antes_escondido: false, depois_escondido: true, primeiro_frame: null }], mutacoes: [{}] } },
  { nome: 'medicao_incompleta', celula: null },
];
for (const f of FIXTURES) { const dado = actorDaEscondida(f.celula); if (dado !== f.nome) throw new Error('ABORTA: actorDaEscondida devolveu ' + JSON.stringify(dado) + ' no fixture ' + f.nome); }
const lados = ['modulo', 'shell'].map((n) => FIXTURES.filter((f) => f.nome === n).length);
if (lados.some((x) => x !== 1)) throw new Error('ABORTA: o actor precisa de um fixture por cada lado da saida');
if (regraDoShell({ admin: 'inicio', director: 'inicio' }, 'director') !== 'inicio') throw new Error('ABORTA: regraDoShell ignora o literal');
if (regraDoShell({ admin: 'inicio' }, 'teacher') !== 'inicio') throw new Error('ABORTA: regraDoShell nao reproduz a cláusula || do shell');
if (regraDoShell({ director: 'escola-historia' }, 'director') !== 'escola-historia') throw new Error('ABORTA: regraDoShell nao le o valor do literal');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P110_SELFTESTE_OK ' + (FIXTURES.length + 3) + '/0 — actorDaEscondida nos seus 8 estados (um fixture por lado do par modulo/shell) + regraDoShell nos 3 lados; 0 rede, 0 chrome');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const MD5 = md5(shellTxt);
if (MD5 !== ESP.htmlMd5 || Buffer.byteLength(shellTxt) !== ESP.htmlBytes) throw new Error('ABORTA: o ar nao e a v142 certificada — ' + MD5 + '/' + Buffer.byteLength(shellTxt) + ' vs ' + ESP.htmlMd5 + '/' + ESP.htmlBytes);
const REF = [...new Set([...shellTxt.matchAll(/https:\/\/([a-z0-9]{16,})\.supabase\.co/g)].map((m) => m[1]))];
if (REF.length !== 1) throw new Error('ABORTA: ' + REF.length + ' refs supabase nos bytes servidos');
const nlinhas = (t) => t.split('\n').length - 1;
const linhaDe = (off) => nlinhas(shellTxt.slice(0, off)) + 1;
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const fimMod = shellTxt.indexOf('</script>', iniMod);
if (iniMod < 0 || fimMod < 0) throw new Error('ABORTA: sem regiao do modulo municipal nos bytes servidos');
const FAIXA = { ini: linhaDe(iniMod), fim: linhaDe(fimMod) };
const dentroDoModulo = (L) => typeof L === 'number' && Number.isFinite(L) && L >= FAIXA.ini && L <= FAIXA.fim;
const simbolo = (s) => { const i = shellTxt.indexOf(s); return { procura: s, encontrado: i >= 0, linha: i < 0 ? null : linhaDe(i), dentro_do_modulo: i < 0 ? null : dentroDoModulo(linhaDe(i)) }; };
const REGUA = { dentro: simbolo('function fecharPainelForaDaVista('), fora: simbolo('function navigateToSection(') };
if (REGUA.dentro.encontrado !== true || REGUA.dentro.dentro_do_modulo !== true) throw new Error('ABORTA: a faixa nao contem fecharPainelForaDaVista — a regua nao distingue nada: ' + JSON.stringify(REGUA.dentro));
if (REGUA.fora.encontrado !== true || REGUA.fora.dentro_do_modulo !== false) throw new Error('ABORTA: a faixa contem navigateToSection, que e do shell — a regua nao distingue nada: ' + JSON.stringify(REGUA.fora));
const FB = recortaObjecto(shellTxt, 'const fallbackByRole = ');
if (!FB) throw new Error('ABORTA: sem fallbackByRole nos bytes servidos — nao ha regra para comparar');
const MAPA_DECL = recortaObjecto(shellTxt, 'const roleSectionAccess = {');
const MOD = shellTxt.slice(iniMod, fimMod);
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD) || [])[1];
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1];
if (!VIEW_ID || !SECT) throw new Error('ABORTA: VIEW_ID/SECT nao resolvidos dos bytes servidos');

const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const renova = async () => {
  for (let k = 0; k < 4; k++) {
    const r = await fetch(`https://${REF[0]}.supabase.co/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { S[PAPEL] = { ...S[PAPEL], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); return j; }
    if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) throw new Error('CADEIA QUEIMADA em ' + PAPEL + ': precisa de re-login com OK, nao desta peca');
    await new Promise((rz) => setTimeout(rz, 2500 * (k + 1)));
  }
  throw new Error('refresh ' + PAPEL + ' falhou 4x');
};
const tok = await renova();

const PERFIL = `${REPO}/.p110-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1366,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let out = {}; let encerrado = false; const CELULAS = [];
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, papel: PAPEL, celulas: CELULAS }, null, 2) + '\n'); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, 'watchdog ' + (TETO_MS / 1000) + ' s'), TETO_MS);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!encerrado) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map(); const excecoes = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') excecoes.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 180));
};
const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
  const i = ++seq; const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method)); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expr, ms) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ms || 25000); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const espera = (ms) => E(`new Promise(rz => setTimeout(rz, ${ms}))`, ms + 15000);

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 40; i++) { if (await E("!!document.querySelector('[data-bfr-municipal-nav]')")) break; await new Promise((r) => setTimeout(r, 500)); }
await E(`(() => { localStorage.setItem('sb-${REF[0]}-auth-token', ${JSON.stringify(JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user }))}); return 1; })()`);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 80; i++) { if (await E('!!(window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.painelAberto && document.getElementById("appShell"))')) break; await new Promise((r) => setTimeout(r, 500)); }
await espera(2500);
await E(`(() => { const f = [...document.querySelectorAll('button, a')].find((b) => /agora nao|agora não/i.test(String(b.textContent || '').trim())); if (f) f.click(); return !!f; })()`);
await espera(1000);

const FAIXA_JSON = JSON.stringify(FAIXA);
// ——— a sonda: cada escrita de classe no painel guarda a pilha do chamador; o observador apanha a mudanca seja
// qual for o mecanismo, para que uma escrita sem pilha apareca como ignorancia e nunca como verde. ———
const INSTALA = `(() => {
  const PAINEL_ID = ${JSON.stringify(VIEW_ID)};
  const FAIXA = ${FAIXA_JSON};
  window.__P110 = window.__P110 || { escritas: [], mutacoes: [], instalada_em: null, instalacoes: 0 };
  const el0 = document.getElementById(PAINEL_ID);
  if (!el0) return { ok: false, motivo: 'sem painel no DOM com id ' + PAINEL_ID };
  if (window.__P110.marca === DOMTokenList.prototype.add && window.__P110.marca_attr === Element.prototype.setAttribute) {
    window.__P110.escritas.length = 0; window.__P110.mutacoes.length = 0;
    return { ok: true, motivo: 'sonda ja instalada — registos zerados', instalacoes: window.__P110.instalacoes };
  }
  const eEscondido = (el) => !!(el && el.classList.contains('hidden'));
  const ehPainel = (dtl) => { try { const el = document.getElementById(PAINEL_ID); return !!el && dtl === el.classList; } catch (e) { return false; } };
  const pilha = () => String((new Error()).stack || '').split('\\n').slice(2, 9);
  window.__P110_sonda = window.__P110_sonda || [];
  window.__P110_registra = function (mecanismo, detalhe, antes) {
    const el = document.getElementById(PAINEL_ID);
    const txt = pilha().map((l) => {
      const m = /at (.*?) \\((?:[^)]*?):([0-9]+):([0-9]+)\\)/.exec(l) || /at (.*?)(?::([0-9]+):([0-9]+))?$/.exec(l);
      const L = m ? parseInt(m[2], 10) : NaN;
      return { texto: l.trim().slice(0, 150), funcao: m ? String(m[1] || '').trim().slice(0, 60) : null, linha: Number.isFinite(L) ? L : null, dentro_do_modulo: Number.isFinite(L) ? (L >= FAIXA.ini && L <= FAIXA.fim) : null };
    });
    const sonda = window.__P110_cal === true;
    if (sonda) window.__P110_sonda = Array.from(new Set(window.__P110_sonda.concat(txt.map((f) => f.texto))));
    txt.forEach((f) => { f.sonda = (window.__P110_sonda || []).indexOf(f.texto) >= 0; });
    const primeiro = txt.filter((f) => !f.sonda)[0] || null;
    window.__P110.escritas.push({ t_ms: Date.now() - (window.__P110_T0 || 0), mecanismo, detalhe, antes_escondido: antes, depois_escondido: eEscondido(el), pilha: txt, primeiro_frame: primeiro });
  };
  const orig = { add: DOMTokenList.prototype.add, remove: DOMTokenList.prototype.remove, toggle: DOMTokenList.prototype.toggle, replace: DOMTokenList.prototype.replace, setAttribute: Element.prototype.setAttribute };
  ['add', 'remove', 'toggle', 'replace'].forEach((nome) => {
    const f = orig[nome];
    const w = function (...a) { const meu = ehPainel(this); const antes = meu ? eEscondido(document.getElementById(PAINEL_ID)) : null; const r = f.apply(this, a); if (meu) window.__P110_registra('classList.' + nome, a.map(String).join(','), antes); return r; };
    w.__P110 = nome; DOMTokenList.prototype[nome] = w;
  });
  Element.prototype.setAttribute = function (nome, valor) { const meu = this.id === PAINEL_ID && String(nome) === 'class'; const antes = meu ? eEscondido(this) : null; const r = orig.setAttribute.apply(this, arguments); if (meu) window.__P110_registra('setAttribute(class)', String(valor).slice(0, 80), antes); return r; };
  Element.prototype.setAttribute.__P110 = 'setAttribute';
  const dcn = Object.getOwnPropertyDescriptor(Element.prototype, 'className');
  if (dcn && dcn.set) { const setAntigo = dcn.set; Object.defineProperty(Element.prototype, 'className', { get: dcn.get, set: function (v) { const meu = this.id === PAINEL_ID; const antes = meu ? eEscondido(this) : null; setAntigo.call(this, v); if (meu) window.__P110_registra('className=', String(v).slice(0, 80), antes); }, configurable: true }); }
  const obs = new MutationObserver((lista) => { for (const mu of lista) { if (mu.type === 'attributes' && mu.attributeName === 'class' && mu.target && mu.target.id === PAINEL_ID) window.__P110.mutacoes.push({ t_ms: Date.now() - (window.__P110_T0 || 0), escondido_agora: eEscondido(mu.target) }); } });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.__P110.marca = DOMTokenList.prototype.add; window.__P110.marca_attr = Element.prototype.setAttribute; window.__P110.instalacoes += 1; window.__P110.instalada_em = Date.now();
  window.__P110.escritas.length = 0; window.__P110.mutacoes.length = 0;
  const elC = document.getElementById(PAINEL_ID); const clsAntes = elC.getAttribute('class');
  window.__P110_cal = true;
  elC.classList.add('__p110_cal'); elC.classList.remove('__p110_cal');
  elC.setAttribute('class', String(clsAntes == null ? '' : clsAntes)); elC.className = String(clsAntes == null ? '' : clsAntes);
  window.__P110_cal = false;
  const cal = { escritas_da_calibracao: window.__P110.escritas.length, assinaturas_da_sonda: (window.__P110_sonda || []).length, classe_restaurada: String(elC.getAttribute('class')) === String(clsAntes) };
  window.__P110.escritas.length = 0; window.__P110.mutacoes.length = 0;
  return { ok: true, motivo: 'sonda instalada sobre DOMTokenList.add/remove/toggle/replace, setAttribute, className e MutationObserver', instalacoes: window.__P110.instalacoes, painel_ja_escondido: eEscondido(el0), classlist_estavel: (el0.classList === el0.classList), calibracao: cal };
})()`;
const instalação = await E(INSTALA);
if (!instalação || instalação.ok !== true) { writeFileSync(OUT, JSON.stringify({ aborta: 'sonda nao instalada', instalação }, null, 2) + '\n'); throw new Error('ABORTA: ' + JSON.stringify(instalação)); }

const estado = () => E(`(() => { const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL, el = document.getElementById(${JSON.stringify(VIEW_ID)}); return { vista: rt.activeView, seccao: rt.activeSection, escondido: el ? el.classList.contains('hidden') : null, painel_aberto: M.painelAberto(), fecho_id: window.__P110_fid ? window.__P110_fid(M.ultimoFecho()) : null }; })()`);
const ids = await E(`(() => { const M = window.BFR_MUNICIPAL; let k = 0; const map = new WeakMap(); window.__P110_fid = (f) => { if (!f) return null; if (!map.has(f)) map.set(f, 'F' + (++k)); return map.get(f); }; return 'weakmap criado'; })()`);
const rotulos = await E(`[...document.querySelectorAll('.role-toggle button')].map((b, i) => ({ i, rot: String(b.textContent || '').trim().slice(0,22) }))`);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const vai = async (nome) => { const i = rotulos.findIndex((r) => norm(r.rot) === norm(nome)); if (i < 0) throw new Error('ABORTA: sem pessoa com rotulo ' + JSON.stringify(nome) + ' — existentes: ' + rotulos.map((r) => r.rot).join('|')); await E(`(() => { document.querySelectorAll('.role-toggle button')[${i}].click(); return true; })()`); await espera(2200); return await estado(); };
const abre = async () => { await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none'; }); if (!b) return false; b.click(); return true; })()`); await espera(3200); return await estado(); };

for (const [alvo, motivo] of CELULAS_PLAN) {
  const c = { alvo, motivo_celula: motivo };
  try {
    const o = await vai('Admin');
    if (o.escondido === false) { await E(`(() => { const b = document.querySelector('[data-bfr-municipal-nav]'); if (b) b.click(); return true; })()`); await espera(1500); }
    const a = await abre();
    c.painel_aberto_na_origem = a.escondido === false && a.painel_aberto === true;
    const re = await E(INSTALA);
    c.reinstalacao = re;
    await E(`(() => { const el = document.getElementById(${JSON.stringify(VIEW_ID)}); window.__P110.escritas.length = 0; window.__P110.mutacoes.length = 0; window.__P110_T0 = Date.now(); window.__P110_fecho_antes = window.__P110_fid(window.BFR_MUNICIPAL.ultimoFecho()); return 1; })()`);
    c.escondido_antes = (await E(`(() => { const el = document.getElementById(${JSON.stringify(VIEW_ID)}); return el.classList.contains('hidden'); })()`));
    c.vista_deixada = (await estado()).vista;
    await vai(alvo);
    await E(`new Promise(rz => setTimeout(rz, 3000))`, 20000);
    const fim = await estado();
    c.vista_entrante = fim.vista; c.seccao_final = fim.seccao; c.escondido_depois = fim.escondido; c.painel_aberto_depois = fim.painel_aberto;
    c.fecho_antes_da_celula = await E('window.__P110_fecho_antes');
    c.fecho_depois_da_celula = fim.fecho_id;
    c.escritas = await E('window.__P110.escritas.slice(0, 24)');
    c.mutacoes = await E('window.__P110.mutacoes.slice(0, 24)');
    c.esperado_pela_regra_do_shell_para_a_entrante = regraDoShell(FB.objecto, c.vista_entrante);
    c.actor = actorDaEscondida(c);
    c.escondida = (c.escritas || []).filter((w) => w.antes_escondido === false && w.depois_escondido === true)[0] || null;
    c.pilha_da_escondida = (c.escondida || {}).pilha || [];
    c.mecanismo_da_escondida = (c.escondida || {}).mecanismo || null;
    c.primeiro_frame_da_escondida = (c.escondida || {}).primeiro_frame || null;
    c.mutacoes_antes_do_frame = c.escondida ? (c.mutacoes || []).filter((x) => x.t_ms <= c.escondida.t_ms).length : null;
    CELULAS.push(c);
    console.log(`${alvo}: actor=${c.actor} escondido_antes=${c.escondido_antes} depois=${c.escondido_depois} escritas=${(c.escritas || []).length} mutacoes=${(c.mutacoes || []).length} fecho_antes=${c.fecho_antes_da_celula}/depois=${c.fecho_depois_da_celula} 1_frame=${JSON.stringify((c.primeiro_frame_da_escondida || {}).texto)} esperado_shell=${c.esperado_pela_regra_do_shell_para_a_entrante} (${motivo})`);
  } catch (e) { c.erro = String(e && e.message || e).split('\n')[0].slice(0, 220); CELULAS.push(c); console.log(`${alvo}: ERRO ${c.erro}`); }
}

const md5Fim = md5(await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text());
out = {
  programa: 'scripts/p110-actor-da-escondida-por-pilha.mjs', em: new Date().toISOString(), duracao_ms: 0, url: URL_APP,
  pergunta: 'que codigo escreve a classe hidden no painel municipal quando a troca de vista nao deixa registo de fecho no modulo?',
  ar: { md5_ini: MD5, md5_fim: md5Fim, bytes: Buffer.byteLength(shellTxt), sect: SECT, view_id: VIEW_ID },
  regua_da_faixa: { faixa: FAIXA, dentro: REGUA.dentro, fora: REGUA.fora, nota: 'a faixa le-se dos bytes servidos; os dois simbolos provam que a regua distingue as duas regies antes de qualquer celula' },
  instalacao_da_sonda: instalação, weakmap: ids, regra_do_shell_lida_dos_bytes: (shellTxt.match(/const fallback = fallbackByRole\[activeView\][^\n]*/) || [])[0] || null,
  celulas: CELULAS,
  atores: CELULAS.reduce((m, c) => { m[c.actor || 'erro'] = (m[c.actor || 'erro'] || 0) + 1; return m; }, {}),
  o_que_esta_peca_nao_prova: 'prova quem escreveu a classe e em que linha; nao prova qual destino o produto DEVERIA usar para a vista — isso e decisao de produto registada, nao medicao',
};
out.duracao_ms = Date.now() - t0;
out.excecoes = excecoes.slice(0, 12);
const contagemPorActor = out.atores;
const cal = instalação.calibracao || {};
const calibracaoOk = cal.escritas_da_calibracao >= 4 && cal.assinaturas_da_sonda >= 2 && cal.classe_restaurada === true;
const controloComDentes = (() => { const d = CELULAS.find((c) => norm(c.alvo) === 'direcao'); return !!d && d.actor === 'modulo' && String((d.primeiro_frame_da_escondida || {}).funcao || '').includes('fecharPainelForaDaVista'); })();
const todasMedidas = CELULAS.length === CELULAS_PLAN.length && CELULAS.every((c) => !c.erro && c.painel_aberto_na_origem === true);
const actoresNomeados = CELULAS.every((c) => c.actor === 'modulo' || c.actor === 'shell');
const escondeuSempre = CELULAS.every((c) => c.escondido_depois === true);
out.veredito = controloComDentes && calibracaoOk && todasMedidas && actoresNomeados && escondeuSempre && md5Fim === MD5 && excecoes.length === 0
  ? 'P110_ACTOR_DA_ESCONDIDA_POR_PILHA_OK 7/0'
  : `P110_ACTOR_DA_ESCONDIDA_POR_PILHA_VERMELHO controlo_dentes=${controloComDentes} calibracao=${calibracaoOk} todas_medidas=${todasMedidas} actores_nomeados=${actoresNomeados} escondeu_sempre=${escondeuSempre} ar_estavel=${md5Fim === MD5} excecoes=${excecoes.length}`;
encerrado = true;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\natores=${JSON.stringify(contagemPorActor)}\n${CELULAS.map((c) => `${c.alvo}: ${c.actor} mecanismo=${c.mecanismo_da_escondida} 1_frame=${(c.primeiro_frame_da_escondida || {}).texto} t=${(c.escondida || {}).t_ms} fecho=${c.fecho_antes_da_celula}->${c.fecho_depois_da_celula}`).join('\n')}\nexcecoes=${out.excecoes.length}\nnode_exit=${out.veredito.endsWith('OK 7/0') ? 0 : 1}\n`);
console.log(out.veredito + ' · ' + out.duracao_ms + ' ms · ' + OUT.replace(REPO + '/', ''));
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
process.exit(out.veredito.endsWith('OK 7/0') ? 0 : 1);
