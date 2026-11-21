#!/usr/bin/env node
// P111 — O ESCRITOR DA ESCONDIDA, ATRIBUIDO POR SIMBOLO RESOLVIDO NOS BYTES (21/11, madrugada).
//
// A P110 respondeu a pergunta mas a sua regua tinha um defeito que so se viu na leitura do artefacto: ela
// comparava a LINHA da pilha contra a faixa do modulo no DOCUMENTO (28663..29404). Isso so vale para moldes cujo
// URL e o do documento — e e exactamente o caso do modulo municipal, que e um script vivo. As moldes do shell
// saem como `at <anonymous>:415:400`, porque o core runtime esta num bloco `type="text/plain"` que o bootstrap
// injecta em tempo de execucao: a numeracao e por bloco, nao por documento. O `actor=shell` da P110 nas celulas
// Professor e Pais estava certo, mas foi obtido por uma comparacao sem sentido (415 fora de 28663..29404).
// Aqui a atribuicao passa a ser por NOME: ajeita-se a primeira mouldura real com funcao, resolve-se o simbolo nos
// bytes servidos, e classifica-se pela regiao do DOCUMENTO onde a definicao vive. Se o simbolo nao resolver, a
// peca da vermelho — «nao sei» nunca se escreve «shell».
//
// O que esta peca tem de discriminar, com os dois lados provados antes de qualquer celula:
//   · function fecharPainelForaDaVista(   resolve dentro da regiao do modulo municipal;
//   · function setProfessionalTeacherSection( resolve fora dela, no bloco do core runtime.
// Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 publicacao. Instrumentacao desta sessao no browser.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p111-ator-da-escondida-por-simbolo-nos-bytes-21-11-${SUF}.json`;
const TXT = `${REPO}/evidence/p111-ator-da-escondida-por-simbolo-nos-bytes-21-11-${SUF}.txt`;
if ([OUT, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto ja existe — corre com SUF novo, nunca por cima');
const ESP = JSON.parse(readFileSync(`${REPO}/worker-deploy-v142-painel-na-troca/esperado-v142.json`, 'utf8'));
const PORT = parseInt(process.env.AH2_PORT || '9417', 10);
const PAPEL = (process.env.P111_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();
const TETO_MS = 300000;
const CELULAS_PLAN = [['Professor', 'a celula que a P105 chumbou na F6'], ['Direção', 'controlo com dentes: aqui fecha o modulo'], ['Pais', 'controlo: outra vista fora do mapa, escritora diferente']];

// ——— predizacao pura: o nome vem da pilha, a regiao vem dos bytes; um booleano nunca e assinado sem resolucao ———
function atorPorSimbolo(res) {
  if (!res || typeof res !== 'object') return 'medicao_incompleta';
  if (typeof res.simbolo !== 'string' || res.simbolo.length === 0) return 'pilha_sem_funcao_lida';
  if (res.padrao === null) return 'simbolo_nao_resolvido_nos_bytes';
  if (res.em_modulo === true) return 'modulo';
  if (res.em_modulo === false && typeof res.bloco === 'string') return 'fora_do_modulo';
  return 'resolucao_sem_bloco_nomeado';
}
const FIXTURES = [
  { nome: 'modulo', res: { simbolo: 'fecharPainelForaDaVista', padrao: 'function X(', em_modulo: true, bloco: 'data-bfr-municipal-module' } },
  { nome: 'fora_do_modulo', res: { simbolo: 'setProfessionalTeacherSection', padrao: 'function X(', em_modulo: false, bloco: 'id=bfr-core-runtime' } },
  { nome: 'simbolo_nao_resolvido_nos_bytes', res: { simbolo: 'qualquerCoisa', padrao: null, em_modulo: null, bloco: null } },
  { nome: 'pilha_sem_funcao_lida', res: { simbolo: null, padrao: null, em_modulo: null, bloco: null } },
  { nome: 'resolucao_sem_bloco_nomeado', res: { simbolo: 'x', padrao: 'function X(', em_modulo: false, bloco: null } },
  { nome: 'medicao_incompleta', res: null },
];
for (const f of FIXTURES) { const d = atorPorSimbolo(f.res); if (d !== f.nome) throw new Error('ABORTA: atorPorSimbolo devolveu ' + JSON.stringify(d) + ' no fixture ' + f.nome); }
if (FIXTURES.filter((f) => f.nome === 'modulo').length !== 1 || FIXTURES.filter((f) => f.nome === 'fora_do_modulo').length !== 1) throw new Error('ABORTA: falta um dos lados do par');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P111_SELFTESTE_OK ' + (FIXTURES.length + 1) + '/0 — atorPorSimbolo nos seus 6 estados, com os dois lados do par e o estado de ignorancia quando o simbolo nao resolve; 0 rede, 0 chrome');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const MD5 = md5(shellTxt);
if (MD5 !== ESP.htmlMd5 || Buffer.byteLength(shellTxt) !== ESP.htmlBytes) throw new Error('ABORTA: o ar nao e a v142 certificada — ' + MD5 + '/' + Buffer.byteLength(shellTxt) + ' vs ' + ESP.htmlMd5 + '/' + ESP.htmlBytes);
const REF = [...new Set([...shellTxt.matchAll(/https:\/\/([a-z0-9]{16,})\.supabase\.co/g)].map((m) => m[1]))];
if (REF.length !== 1) throw new Error('ABORTA: ' + REF.length + ' refs supabase nos bytes servidos');
const nl = (t) => t.split('\n').length - 1;
const linhaDe = (off) => nl(shellTxt.slice(0, off)) + 1;

// ——— todos os blocos <script> do documento, com o que os identifica, para nomear a regiao de cada simbolo ———
const BLOCOS = [];
{
  let i = 0;
  while (true) {
    const ab = shellTxt.indexOf('<script', i);
    if (ab < 0) break;
    const fechoTag = shellTxt.indexOf('>', ab);
    const fim = shellTxt.indexOf('</script>', fechoTag);
    if (fim < 0) break;
    const cab = shellTxt.slice(ab, fechoTag);
    const id = (/id="([^"]+)"/.exec(cab) || [])[1];
    const mod = (/data-bfr-municipal-module="([^"]*)"/.exec(cab) || [])[1];
    const def = (/data-bfr-deferred="([^"]+)"/.exec(cab) || [])[1];
    const src = (/src="([^"]+)"/.exec(cab) || [])[1];
    const tipo = (/type="([^"]+)"/.exec(cab) || [])[1];
    BLOCOS.push({
      nome: id ? 'id=' + id : (mod !== undefined ? 'data-bfr-municipal-module=' + mod : (def ? 'deferred=' + def : (src ? 'src=' + src.split('/').pop() : 'sem nome'))),
      tipo: tipo || null, ini_linha: linhaDe(fechoTag + 1), fim_linha: linhaDe(fim),
      e_modulo: mod !== undefined, e_core: id === 'bfr-core-runtime',
    });
    i = fim + 9;
  }
}
const blocoDe = (L) => BLOCOS.find((b) => L >= b.ini_linha && L <= b.fim_linha) || null;
const MOD_BLOCO = BLOCOS.find((b) => b.e_modulo);
const CORE_BLOCO = BLOCOS.find((b) => b.e_core);
if (!MOD_BLOCO || !CORE_BLOCO) throw new Error('ABORTA: sem regiao do modulo ou do core nos bytes — ' + BLOCOS.map((b) => b.nome).join('|'));
if (MOD_BLOCO.e_core === true || CORE_BLOCO.e_modulo === true) throw new Error('ABORTA: as duas regioes sao a mesma');

const resolve = (funcao) => {
  if (!funcao) return { simbolo: null, padrao: null, linha: null, em_modulo: null, bloco: null };
  const padroes = ['function ' + funcao + '(', 'function ' + funcao + ' (', funcao + ' = function', 'const ' + funcao + ' = ', 'var ' + funcao + ' = ', funcao + ': function'];
  for (const p of padroes) {
    const i = shellTxt.indexOf(p);
    if (i >= 0) {
      const L = linhaDe(i);
      const b = blocoDe(L);
      return { simbolo: funcao, padrao: p, off: i, linha: L, ocorrencias: shellTxt.split(p).length - 1, em_modulo: !!(b && b.e_modulo), bloco: b ? b.nome : null, bloco_tipo: b ? b.tipo : null, pilha_usa_url_anonima: null };
    }
  }
  return { simbolo: funcao, padrao: null, linha: null, em_modulo: null, bloco: null };
};
const R = { dentro: resolve('fecharPainelForaDaVista'), fora: resolve('setProfessionalTeacherSection'), chamada: resolve('setRole'), pais: resolve('setHomeMode') };
if (R.dentro.em_modulo !== true) throw new Error('ABORTA: fecharPainelForaDaVista nao resolve na regiao do modulo — a regua nao tem lado nenhum: ' + JSON.stringify(R.dentro));
if (R.fora.em_modulo !== false || R.fora.bloco !== CORE_BLOCO.nome) throw new Error('ABORTA: setProfessionalTeacherSection nao resolve fora do modulo e no bloco do core — a regua nao distingue: ' + JSON.stringify(R.fora) + ' core=' + CORE_BLOCO.nome);

const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD_TXT = shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD_TXT) || [])[1];
const SECT = (/const SECT = '([^']+)'/.exec(MOD_TXT) || [])[1];
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

const PERFIL = `${REPO}/.p111-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1366,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let out = {}; let encerrado = false; const CELULAS = [];
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, papel: PAPEL, regioes: { core: CORE_BLOCO, modulo: MOD_BLOCO }, resolucoes: R, celulas: CELULAS }, null, 2) + '\n'); } catch {}
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

// ——— a sonda da P110, com o URL de cada mouldura guardado: e o URL que diz se a linha e do documento ou de um
// bloco injectado, e por isso ela passa a ser campo medido e nao suposicao. ———
const INSTALA = `(() => {
  const PID = ${JSON.stringify(VIEW_ID)};
  window.__P111 = window.__P111 || { escritas: [], mutacoes: [], instalacoes: 0 };
  const el0 = document.getElementById(PID);
  if (!el0) return { ok: false, motivo: 'sem painel no DOM com id ' + PID };
  if (window.__P111.marca === DOMTokenList.prototype.add && window.__P111.marca_attr === Element.prototype.setAttribute) {
    window.__P111.escritas.length = 0; window.__P111.mutacoes.length = 0;
    return { ok: true, motivo: 'sonda ja instalada — registos zerados', instalacoes: window.__P111.instalacoes, calibracao: window.__P111.cal };
  }
  const esc = (el) => !!(el && el.classList.contains('hidden'));
  const ehPainel = (dtl) => { try { const el = document.getElementById(PID); return !!el && dtl === el.classList; } catch (e) { return false; } };
  const pilhaTxt = () => String((new Error()).stack || '').split('\\n').slice(2, 10);
  const parse = (l) => {
    const m = /^\\s*at (.*?) \\((.*?):([0-9]+):([0-9]+)\\)\\s*$/.exec(l) || /^\\s*at (.*?):([0-9]+):([0-9]+)\\s*$/.exec(l);
    if (!m) return { texto: l.trim().slice(0, 160), funcao: null, url: null, linha: null, col: null };
    const temUrl = m.length === 5;
    return { texto: l.trim().slice(0, 160), funcao: String(temUrl ? m[1] : m[1]).trim().slice(0, 70), url: temUrl ? String(m[2]).trim() : null, linha: parseInt(temUrl ? m[3] : m[2], 10), col: parseInt(temUrl ? m[4] : m[3], 10) };
  };
  window.__P111_sonda = window.__P111_sonda || [];
  window.__P111_reg = function (mec, det, antes) {
    const el = document.getElementById(PID);
    const txt = pilhaTxt().map(parse);
    if (window.__P111_cal === true) { txt.forEach((f) => { if (f.texto) window.__P111_sonda.push(f.texto); }); }
    window.__P111_sonda = Array.from(new Set(window.__P111_sonda));
    txt.forEach((f) => { f.sonda = window.__P111_sonda.indexOf(f.texto) >= 0; });
    const reais = txt.filter((f) => !f.sonda);
    const comFuncao = reais.filter((f) => f.funcao && f.funcao !== '<anonymous>' && !/^[A-Za-z]+\\./.test(f.funcao));
    window.__P111.escritas.push({ t_ms: Date.now() - (window.__P111_T0 || 0), mecanismo: mec, detalhe: det, antes_escondido: antes, depois_escondido: esc(el), pilha: txt, primeira_real: reais[0] || null, funcao_escritora: (comFuncao[0] || {}).funcao || null, url_da_mouldura: (comFuncao[0] || {}).url || null, linha_da_pilha: (comFuncao[0] || {}).linha ?? null });
  };
  const orig = { add: DOMTokenList.prototype.add, remove: DOMTokenList.prototype.remove, toggle: DOMTokenList.prototype.toggle, replace: DOMTokenList.prototype.replace, setAttribute: Element.prototype.setAttribute };
  ['add', 'remove', 'toggle', 'replace'].forEach((nome) => {
    const f0 = orig[nome];
    const w = function (...a) { const meu = ehPainel(this); const antes = meu ? esc(document.getElementById(PID)) : null; const r = f0.apply(this, a); if (meu) window.__P111_reg('classList.' + nome, a.map(String).join(','), antes); return r; };
    DOMTokenList.prototype[nome] = w;
  });
  Element.prototype.setAttribute = function (nome, valor) { const meu = this.id === PID && String(nome) === 'class'; const antes = meu ? esc(this) : null; const r = orig.setAttribute.apply(this, arguments); if (meu) window.__P111_reg('setAttribute(class)', String(valor).slice(0, 90), antes); return r; };
  const dcn = Object.getOwnPropertyDescriptor(Element.prototype, 'className');
  if (dcn && dcn.set) { const setAntigo = dcn.set; Object.defineProperty(Element.prototype, 'className', { get: dcn.get, set: function (v) { const meu = this.id === PID; const antes = meu ? esc(this) : null; setAntigo.call(this, v); if (meu) window.__P111_reg('className=', String(v).slice(0, 90), antes); }, configurable: true }); }
  const obs = new MutationObserver((lista) => { for (const mu of lista) { if (mu.attributeName === 'class' && mu.target && mu.target.id === PID) window.__P111.mutacoes.push({ t_ms: Date.now() - (window.__P111_T0 || 0), escondido_agora: esc(mu.target) }); } });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.__P111.marca = DOMTokenList.prototype.add; window.__P111.marca_attr = Element.prototype.setAttribute; window.__P111.instalacoes += 1;
  const elC = document.getElementById(PID); const clsAntes = elC.getAttribute('class');
  window.__P111_cal = true; window.__P111_sonda = [];
  elC.classList.add('__p111_cal'); elC.classList.remove('__p111_cal');
  elC.setAttribute('class', String(clsAntes == null ? '' : clsAntes)); elC.className = String(clsAntes == null ? '' : clsAntes);
  window.__P111_cal = false;
  window.__P111.cal = { escritas: window.__P111.escritas.length, assinaturas: window.__P111_sonda.length, classe_restaurada: String(elC.getAttribute('class')) === String(clsAntes), url_do_documento: String(document.URL) };
  window.__P111.escritas.length = 0; window.__P111.mutacoes.length = 0;
  return { ok: true, motivo: 'sonda sobre DOMTokenList.add/remove/toggle/replace, setAttribute, className e MutationObserver, com URL por mouldura', instalacoes: window.__P111.instalacoes, painel_ja_escondido: esc(el0), calibracao: window.__P111.cal };
})()`;
const instalação = await E(INSTALA);
if (!instalação || instalação.ok !== true) { writeFileSync(OUT, JSON.stringify({ aborta: 'sonda nao instalada', instalação }, null, 2) + '\n'); throw new Error('ABORTA: ' + JSON.stringify(instalação)); }
const cal = instalação.calibracao || {};
const URL_DOC = typeof cal.url_do_documento === 'string' ? cal.url_do_documento : null;

const estado = () => E(`(() => { const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL, el = document.getElementById(${JSON.stringify(VIEW_ID)}); return { vista: rt.activeView, seccao: rt.activeSection, escondido: el ? el.classList.contains('hidden') : null, painel_aberto: M.painelAberto(), fecho_id: window.__P111_fid ? window.__P111_fid(M.ultimoFecho()) : null }; })()`);
const weak = await E(`(() => { let k = 0; const map = new WeakMap(); window.__P111_fid = (f) => { if (!f) return null; if (!map.has(f)) map.set(f, 'F' + (++k)); return map.get(f); }; return 'weakmap criado'; })()`);
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
    c.reinstalacao = await E(INSTALA);
    await E(`(() => { window.__P111.escritas.length = 0; window.__P111.mutacoes.length = 0; window.__P111_T0 = Date.now(); window.__P111_fecho_antes = window.__P111_fid(window.BFR_MUNICIPAL.ultimoFecho()); return 1; })()`);
    c.escondido_antes = await E(`document.getElementById(${JSON.stringify(VIEW_ID)}).classList.contains('hidden')`);
    const antes = await estado();
    await vai(alvo);
    await E('new Promise(rz => setTimeout(rz, 3000))', 20000);
    const fim = await estado();
    c.vista_deixada = antes.vista; c.vista_entrante = fim.vista; c.seccao_final = fim.seccao;
    c.escondido_depois = fim.escondido; c.painel_aberto_depois = fim.painel_aberto;
    c.fecho_antes_da_celula = await E('window.__P111_fecho_antes');
    c.fecho_depois_da_celula = fim.fecho_id;
    c.escritas = await E('window.__P111.escritas.slice(0, 30)');
    c.mutacoes = await E('window.__P111.mutacoes.slice(0, 30)');
    c.escondida = (c.escritas || []).filter((w) => w.antes_escondido === false && w.depois_escondido === true)[0] || null;
    c.resolucao = c.escondida ? resolve(c.escondida.funcao_escritora) : null;
    if (c.resolucao && c.escondida) c.resolucao.pilha_usa_url_anonima = c.escondida.url_da_mouldura === '<anonymous>' || c.escondida.url_da_mouldura == null;
    c.ator = c.escondida ? atorPorSimbolo(c.resolucao) : ((c.mutacoes || []).length > 0 ? 'escrita_sem_pilha' : 'escondido_sem_registro_de_escrita');
    c.linha_da_pilha_e_do_documento = !!(c.escondida && c.escondida.url_da_mouldura && URL_DOC && c.escondida.url_da_mouldura === URL_DOC);
    c.pilha_linha_dentro_da_regiao_resolvida = !!(c.escondida && typeof c.escondida.linha_da_pilha === 'number' && c.resolucao && c.resolucao.linha != null && (() => { const bb = blocoDe(c.resolucao.linha); return !!bb && c.escondida.linha_da_pilha >= bb.ini_linha && c.escondida.linha_da_pilha <= bb.fim_linha; })());
    CELULAS.push(c);
    console.log(`${alvo}: ator=${c.ator} escreve=${JSON.stringify(c.escondida ? c.escondida.funcao_escritora : null)} bloco=${JSON.stringify(c.resolucao && c.resolucao.bloco)} doc_linha=${c.resolucao && c.resolucao.linha} pilha_linha=${c.escondida && c.escondida.linha_da_pilha} url=${JSON.stringify(c.escondida && c.escondida.url_da_mouldura)} linha_e_do_documento=${c.linha_da_pilha_e_do_documento} t=${c.escondida && c.escondida.t_ms} fecho=${c.fecho_antes_da_celula}->${c.fecho_depois_da_celula} escondido_depois=${c.escondido_depois} (${motivo})`);
  } catch (e) { c.erro = String(e && e.message || e).split('\n')[0].slice(0, 220); CELULAS.push(c); console.log(`${alvo}: ERRO ${c.erro}`); }
}

const md5Fim = md5(await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text());
const C1 = md5Fim === MD5;
const C2 = !!(MOD_BLOCO && CORE_BLOCO) && MOD_BLOCO.nome !== CORE_BLOCO.nome && !(MOD_BLOCO.ini_linha <= CORE_BLOCO.fim_linha && CORE_BLOCO.ini_linha <= MOD_BLOCO.fim_linha) && MOD_BLOCO.fim_linha > MOD_BLOCO.ini_linha && CORE_BLOCO.fim_linha > CORE_BLOCO.ini_linha;
const C3 = R.dentro.em_modulo === true && R.fora.em_modulo === false && R.fora.bloco === CORE_BLOCO.nome;
const C4 = (cal.escritas || 0) >= 4 && (cal.assinaturas || 0) >= 2 && cal.classe_restaurada === true && typeof cal.url_do_documento === 'string';
const C5 = CELULAS.length === CELULAS_PLAN.length && CELULAS.every((c) => !c.erro && c.painel_aberto_na_origem === true && c.escondido_depois === true);
const C6 = CELULAS.every((c) => c.ator === 'modulo' || c.ator === 'fora_do_modulo');
// O esperado e fixo SO nas celulas que as duas corridas independentes (P110 e P111) ja mediram iguais. Na celula
// Pais as duas corridas dao escritas diferentes — a P110 apanhou setHomeMode do shell (t=448, sem fecho novo) e a
// P111 apanha fecharPainelForaDaVista do modulo (t=541, fecho F1->F2): e uma corrida entre o esconder do shell e a
// vigilia do modulo, e chumba-la aqui seria amaciar o achado. Fica registada como divergencia e o portao exige que
// o actor de cada celula esteja NOMEADO e resolvido, seja qual for o vencedor.
const esperados = { Professor: 'fora_do_modulo', Direção: 'modulo' };
const C7 = CELULAS.every((c) => !c.erro && (esperados[c.alvo] === undefined || c.ator === esperados[c.alvo]) && !!c.resolucao && typeof c.resolucao.bloco === 'string' && c.resolucao.padrao !== null)
  && (() => { const p = CELULAS.find((c) => c.alvo === 'Professor'); const d = CELULAS.find((c) => c.alvo === 'Direção'); return !!p && !!d && p.resolucao.bloco === CORE_BLOCO.nome && d.resolucao.bloco === MOD_BLOCO.nome; })();
const C8 = CELULAS.every((c) => (c.linha_da_pilha_e_do_documento ? c.pilha_linha_dentro_da_regiao_resolvida === true : c.pilha_linha_dentro_da_regiao_resolvida === false));
const atores = CELULAS.reduce((m, c) => { m[c.ator || 'erro'] = (m[c.ator || 'erro'] || 0) + 1; return m; }, {});
out = {
  programa: 'scripts/p111-ator-da-escondida-por-simbolo-nos-bytes.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0, teto_ms: TETO_MS, url: URL_APP,
  pergunta: 'que funcao escreve a classe hidden no painel municipal em cada troca de vista, e em que regiao dos bytes servidos vive essa funcao?',
  ar: { md5_ini: MD5, md5_fim: md5Fim, bytes: Buffer.byteLength(shellTxt), sect: SECT, view_id: VIEW_ID },
  regioes: { blocos_script: BLOCOS.length, core: CORE_BLOCO, modulo: MOD_BLOCO, nota: 'o core runtime esta num bloco type=text/plain injectado em tempo de execucao: por isso as suas moldes saem como <anonymous> e a linha da pilha NAO e linha do documento' },
  resolucoes_de_controle_na_regua: R,
  instalacao_da_sonda: instalação, weakmap: weak,
  celulas: CELULAS, atores,
  portoes: { C1_ar_certificado_estavel: C1, C2_duas_regioes_distintas: C2, C3_regua_tem_dois_lados: C3, C4_calibracao_da_sonda: C4, C5_todas_medidas_e_escondidas: C5, C6_ator_sempre_nomeado: C6, C7_atores_por_celula_e_bloco: C7, C8_linha_da_pilha_so_vale_com_url_do_documento: C8 },
  divergencia_registada_entre_as_duas_corridas: {
    celula: 'Pais',
    p110: 'escondida por setHomeMode do shell com fecho inalterado (F1->F1), t=448 ms',
    p111_medida_aqui: (() => { const p = CELULAS.find((c) => c.alvo === 'Pais'); return p && p.escondida ? 'escondida por ' + p.escondida.funcao_escritora + ' com fecho ' + p.fecho_antes_da_celula + '->' + p.fecho_depois_da_celula + ', t=' + p.escondida.t_ms + ' ms' : 'sem medida'; })(),
    leitura: 'corrida entre o esconder do shell e a vigilia do modulo; ambas escondem o painel, pelo que a promessa da v142 cumpre-se nos dois lados e nenhuma das duas corridas e um vermelho do produto',
    artefactos: ['evidence/p110-actor-da-escondida-por-pilha-21-11-a.json', 'esta corrida'],
  },
  o_que_esta_peca_prova_sobre_a_p110: 'a P110 acertou no actor mas por comparacao de linha da pilha com a faixa do documento, que nao vale para moldes <anonymous>; aqui a mesma conclusao sai por simbolo resolvido nos bytes',
  o_que_esta_peca_nao_prova: 'prova quem escreve a classe; nao prova para onde o produto DEVERIA navegar — isso e decisao registada, nao medicao',
};
const verde = [C1, C2, C3, C4, C5, C6, C7, C8].every((x) => x === true) && excecoes.length === 0;
out.veredito = verde ? 'P111_ATOR_DA_ESCONDIDA_POR_SIMBOLO_OK 8/0' : `P111_ATOR_DA_ESCONDIDA_POR_SIMBOLO_VERMELHO ${[C1, C2, C3, C4, C5, C6, C7, C8].filter((x) => x !== true).length} de 8 · ${JSON.stringify(out.portoes)} · excecoes=${excecoes.length}`;
out.excecoes = excecoes.slice(0, 12);
encerrado = true;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\natores=${JSON.stringify(atores)}\n${CELULAS.map((c) => `${c.alvo}: ${c.ator} escreve=${c.escondida && c.escondida.funcao_escritora} bloco=${c.resolucao && c.resolucao.bloco} doc_linha=${c.resolucao && c.resolucao.linha} pilha_linha=${c.escondida && c.escondida.linha_da_pilha} url=${c.escondida && c.escondida.url_da_mouldura}`).join('\n')}\nexcecoes=${out.excecoes.length}\nnode_exit=${verde ? 0 : 1}\n`);
console.log(out.veredito + ' · ' + out.duracao_ms + ' ms · ' + OUT.replace(REPO + '/', ''));
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
process.exit(verde ? 0 : 1);
