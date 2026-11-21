#!/usr/bin/env node
// P112 — A P105 CORRIGIDA: O MESHO PERCURSO, COM O FECHO ATRIBUIDO CELULA A CELULA (21/11, madrugada).
//
// A P105 chumbou na F6 (`o fecho nomeia o destino que os bytes dao para a vista`) e a P106..P111 mostraram que o
// vermelho era de instrumento, com DOIS defeitos independentes, cada um com a sua medida:
//   D1 — `destino_esperado_dos_bytes` usava uma segunda fonte que eu inventei na P102 (`roleSectionAccess[vista][0]`).
//        Nos bytes servidos a regra e literalmente `const fallback = fallbackByRole[activeView] || 'inicio';` e nao
//        ha nenhuma mutacao de `roleSectionAccess` no ficheiro (medido na P107: 0 atribuicoes). Para `teacher`, a regra
//        do shell da `inicio`; o `professor-inicio` era minha expectativa, nao promessa do produto.
//   D2 — a P105 lia `M.ultimoFecho()`, um GLOBAL do modulo, como se fosse a medida da celula. A P111 mediu, por
//        simbolo resolvido nos bytes, que na celula Professor quem escreve a classe `hidden` e
//        `setProfessionalTeacherSection` (bloco `id=bfr-core-runtime`, linha 5588 do documento) 11 ms depois do
//        clique, sem que o modulo crie objecto de fecho nenhum: nessa celula o fecho lido era de uma célula anterior.
//
// Esta peca nao amacia nada: mantem as 14 portos da P105 e parte a F6 em duas com positivo cada uma —
//   F6a  celula com fecho NOVO (identidade por WeakMap)  -> o destino nomeado tem de ser o da regra do shell para a
//        vista ENTRANTE, lida dos bytes; se nomear outra coisa, e vermelho do produto.
//   F6b  celula sem fecho novo                           -> o painel tem de estar escondido AINDA ASSIM, e o
//        `ultimoFecho()` da celula tem de ser o mesmo objecto de antes (nunca um fecho emprestado); se a celula nao
//        escondeu e nao fechou, e o bug da v141 a voltar-se e da vermelho.
//   F15  em toda a grelha, pelo menos uma celula tem fecho novo com destino = regra do shell E pelo menos uma tem
//        escondida-sem-fecho: sem as duas classes presentes a comparacao seria vacua (era assim que a P105 se
//        escondia). O numero de cada classe imprime-se, nao se resume a um booleano.
// Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 publicacao. A unica rede privilegiada e o refresh da cadeia de
// teste; cada caminho de saida escreve o parcial.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p112-painel-fecha-na-troca-com-ator-por-celula-no-ar-21-11-${SUF}.json`;
const TXT = `${REPO}/evidence/p112-painel-fecha-na-troca-com-ator-por-celula-no-ar-21-11-${SUF}.txt`;
if ([OUT, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto ja existe — corre com SUF novo, nunca por cima');
const ESP = JSON.parse(readFileSync(`${REPO}/worker-deploy-v142-painel-na-troca/esperado-v142.json`, 'utf8'));
const PORT = parseInt(process.env.AH2_PORT || '9420', 10);
const PAPEL = (process.env.P112_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const LARG = parseInt(process.env.P112_LARGURA || '1366', 10);
const ALT = parseInt(process.env.P112_ALTURA || '768', 10);
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const t0 = Date.now();
const TETO_MS = 360000;

// ——— predicoes puras, com os dois lados provados ———
const painelAbertoPeloDom = (p) => !!p && p.oculto_pela_classe === false && p.display !== 'none' && p.abas > 0;
const painelFechadoPeloDom = (p) => !!p && (p.oculto_pela_classe === true || p.display === 'none');
const algumaCoisaPintada = (paineis) => Array.isArray(paineis) && paineis.some((x) => x.visivel === true && x.chars > 0);
const fechoNomeado = (f, sect) => !!f && f.fechado === true && typeof f.destino === 'string' && f.destino.length > 0 && f.destino !== sect;
// A regra do shell, tal como esta nos bytes: primeira fonte o literal, segunda o `'inicio'`. Sem segunda fonte
// inventada; a segunda fonte da P102 fica medida como campo separado para que se veja em que celulas divergiria.
const regraDoShell = (FB, v) => (typeof FB[v] === 'string' ? FB[v] : 'inicio');
const primeiraDoMapaEstatico = (MAPA, v) => (Array.isArray(MAPA[v]) && MAPA[v].length ? String(MAPA[v][0]) : null);
if (painelAbertoPeloDom({ oculto_pela_classe: false, display: 'block', abas: 10 }) !== true) throw new Error('ABORTA: painelAbertoPeloDom chumba o painel aberto');
if (painelAbertoPeloDom({ oculto_pela_classe: true, display: 'none', abas: 10 }) !== false) throw new Error('ABORTA: painelAbertoPeloDom da verde a um painel escondido');
if (painelAbertoPeloDom({ oculto_pela_classe: false, display: 'block', abas: 0 }) !== false) throw new Error('ABORTA: painelAbertoPeloDom conta um painel sem abas');
if (painelFechadoPeloDom({ oculto_pela_classe: true, display: 'none', abas: 0 }) !== true) throw new Error('ABORTA: painelFechadoPeloDom nao reconhece o fecho');
if (painelFechadoPeloDom({ oculto_pela_classe: false, display: 'block', abas: 10 }) !== false) throw new Error('ABORTA: painelFechadoPeloDom da verde a um painel aberto');
if (algumaCoisaPintada([{ visivel: true, chars: 4020 }, { visivel: false, chars: 0 }]) !== true) throw new Error('ABORTA: algumaCoisaPintada chumba um ecrã pintado');
if (algumaCoisaPintada([{ visivel: false, chars: 1819 }]) !== false) throw new Error('ABORTA: algumaCoisaPintada da verde a um ecra em branco com chars escondidos');
if (algumaCoisaPintada([{ visivel: true, chars: 0 }]) !== false) throw new Error('ABORTA: algumaCoisaPintada aceita um painel visivel mas vazio');
if (algumaCoisaPintada([]) !== false) throw new Error('ABORTA: algumaCoisaPintada passa sem paineis (regua vacua)');
if (fechoNomeado({ fechado: true, destino: 'inicio' }, 'secretaria-municipal') !== true) throw new Error('ABORTA: fechoNomeado chumba um fecho com destino do shell');
if (fechoNomeado({ fechado: true, destino: 'secretaria-municipal' }, 'secretaria-municipal') !== false) throw new Error('ABORTA: fechoNomeado aceitaria navegar para o proprio painel');
if (fechoNomeado({ fechado: false, destino: null }, 'secretaria-municipal') !== false) throw new Error('ABORTA: fechoNomeado da verde a um fecho que nao aconteceu');
if (fechoNomeado(null, 'secretaria-municipal') !== false) throw new Error('ABORTA: fechoNomeado da verde sem fecho medido');
if (regraDoShell({ director: 'escola-historia' }, 'director') !== 'escola-historia') throw new Error('ABORTA: regraDoShell ignora o literal dos bytes');
if (regraDoShell({ admin: 'inicio' }, 'teacher') !== 'inicio') throw new Error('ABORTA: regraDoShell nao reproduz a clausula || do shell');
if (primeiraDoMapaEstatico({ teacher: ['professor-inicio'] }, 'teacher') !== 'professor-inicio') throw new Error('ABORTA: primeiraDoMapaEstatica nao espelha a fonte que a P102 inventou');
if (primeiraDoMapaEstatico({}, 'teacher') !== null) throw new Error('ABORTA: primeiraDoMapaEstatica inventa origem');
// As duas classes da F6, cada uma com o seu falso, para que o portao tenha dentes em ambos os lados.
const classeDaCelula = (t) => (t.fecho_novo_nesta_celula === true ? 'fecho_novo' : (t.painel && t.painel.oculto_pela_classe === true ? 'escondida_sem_fecho' : 'nenhuma_das_dois'));
if (classeDaCelula({ fecho_novo_nesta_celula: true, painel: { oculto_pela_classe: true } }) !== 'fecho_novo') throw new Error('ABORTA: classeDaCelula nao ve o fecho novo');
if (classeDaCelula({ fecho_novo_nesta_celula: false, painel: { oculto_pela_classe: true } }) !== 'escondida_sem_fecho') throw new Error('ABORTA: classeDaCelula nao ve a escondida sem fecho');
if (classeDaCelula({ fecho_novo_nesta_celula: false, painel: { oculto_pela_classe: false } }) !== 'nenhuma_das_dois') throw new Error('ABORTA: classeDaCelula da classe a um painel aberto sem fecho — o bug da v141 passaria');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P112_SELFTESTE_OK 20/0 — painelAbertoPeloDom (3), painelFechadoPeloDom (2), algumaCoisaPintada (4), fechoNomeado (4), regraDoShell (2), primeiraDoMapaEstatico (2), classeDaCelula (3, incluido o painel aberto sem fecho); 0 rede, 0 chrome');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const MD5 = md5(shellTxt);
if (MD5 !== ESP.htmlMd5 || Buffer.byteLength(shellTxt) !== ESP.htmlBytes) throw new Error('ABORTA: o ar nao e a v142 certificada — medido ' + MD5 + '/' + Buffer.byteLength(shellTxt) + ', esperado ' + ESP.htmlMd5 + '/' + ESP.htmlBytes);
const REF = [...new Set([...shellTxt.matchAll(/https:\/\/([a-z0-9]{16,})\.supabase\.co/g)].map((m) => m[1]))];
if (REF.length !== 1) throw new Error('ABORTA: ' + REF.length + ' refs supabase nos bytes servidos');
const iniMap = shellTxt.indexOf('roleSectionAccess');
const iniBrace = shellTxt.indexOf('{', iniMap);
let nivel = 0, fimBrace = -1;
for (let i = iniBrace; i < shellTxt.length; i++) { const c = shellTxt[i]; if (c === '{') nivel++; else if (c === '}') { nivel--; if (nivel === 0) { fimBrace = i; break; } } }
if (iniMap === -1 || fimBrace === -1) throw new Error('ABORTA: sem mapa `roleSectionAccess` nos bytes do ar');
const MAPA_ESTATICO = Object.fromEntries([...shellTxt.slice(iniBrace, fimBrace + 1).matchAll(/([a-z_]+)\s*:\s*\[([^\]]*)\]/g)].map((m) => [m[1], [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])]));
if (Object.keys(MAPA_ESTATICO).length < 5) throw new Error('ABORTA: ' + Object.keys(MAPA_ESTATICO).length + ' vistas no mapa estatico');
const iniFb = shellTxt.indexOf('const fallbackByRole = {');
const iniFbBr = shellTxt.indexOf('{', iniFb);
let nf = 0, fimFbBr = -1;
for (let i = iniFbBr; i < shellTxt.length; i++) { const c = shellTxt[i]; if (c === '{') nf++; else if (c === '}') { nf--; if (nf === 0) { fimFbBr = i; break; } } }
if (iniFb === -1 || fimFbBr === -1) throw new Error('ABORTA: sem `fallbackByRole` nos bytes do ar');
const FALLBACKS = Function('return (' + shellTxt.slice(iniFbBr, fimFbBr + 1) + ')')();
const REGUA_LIDA_LITERAL = (shellTxt.match(/const fallback = fallbackByRole\[activeView\][^\n]*/) || [])[0] || null;
if (!REGUA_LIDA_LITERAL || REGUA_LIDA_LITERAL.indexOf("|| 'inicio'") < 0) throw new Error('ABORTA: a linha da regra do shell nao e a que a P111 leu nos bytes — ' + JSON.stringify(REGUA_LIDA_LITERAL));
const mutacoesDoMapa = (shellTxt.match(/roleSectionAccess\s*\[[^\]]+\]\s*=[^=]/g) || []).length + (shellTxt.match(/roleSectionAccess\.[A-Za-z_]+\s*=[^=]/g) || []).length;
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD = iniMod === -1 ? '' : shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1];
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD) || [])[1];
const PAPEIS_MUN = [...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(MOD) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (!SECT || !VIEW_ID || !PAPEIS_MUN.length) throw new Error('ABORTA: SECT/VIEW_ID/PAPEIS_MUNICIPAIS nao resolvidos dos bytes servidos');
const REGUA_V141 = 'const mostrar = veredito.apto && vista.visivel;';
const AGULHAS_V142 = ['function fecharPainelForaDaVista(', 'function painelAberto() {', 'if (!mostrar && painelAberto()) {', 'const CONTEUDOS_ESCONDIDOS = new Set();'];
const contagem = { v141: n(MOD, REGUA_V141), v142: AGULHAS_V142.map((x) => x + '=' + n(MOD, x)) };

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

const PERFIL = `${REPO}/.p112-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARG},${ALT}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
let out = {}; let encerrado = false; const trocas = [];
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, teto_ms: TETO_MS, papel: PAPEL, trocas }, null, 2) + '\n'); } catch {}
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

const SNAP = `(() => {
  const rt = window.BFR_APP_RUNTIME || {}; const M = window.BFR_MUNICIPAL || null;
  const raiz = document.getElementById('${VIEW_ID}');
  const rect = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { w: Math.round(r.width), h: Math.round(r.height), visivel: r.width > 0 && r.height > 0 && cs.display !== 'none' && !el.classList.contains('hidden'), chars: String(el.innerText || '').length }; };
  const paineis = [...document.querySelectorAll('#appShell .content')].map((el) => ({ id: el.id, ...rect(el) }));
  const navs = [...document.querySelectorAll('[data-bfr-municipal-nav]')].map((b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return { w: Math.round(r.width), h: Math.round(r.height), oculto_pela_classe: b.classList.contains('hidden'), display: cs.display, munVista: b.dataset.munVista || null }; });
  const persona = [...document.querySelectorAll('.role-toggle button')].find((b) => b.classList.contains('active'));
  const f = M && M.ultimoFecho ? M.ultimoFecho() : null;
  return {
    rotulo_persona: persona ? String(persona.textContent || '').trim().slice(0, 22) : null,
    active_view: rt.activeView || null, active_section: rt.activeSection || null,
    painel: raiz ? { display: getComputedStyle(raiz).display, oculto_pela_classe: raiz.classList.contains('hidden'), abas: raiz.querySelectorAll('[data-mun-tab]').length, chars: String(raiz.innerText || '').length } : null,
    painel_aberto_pelo_modulo: M && M.painelAberto ? M.painelAberto() : null,
    ultimo_fecho: f, fecho_id: window.__P112_fid ? window.__P112_fid(f) : null,
    paineis, paineis_visiveis: paineis.filter((p) => p.visivel).map((p) => p.id + '(' + p.chars + 'B)'),
    navs, entrada_visiveis: navs.filter((c) => c.w > 0 && c.h > 0 && !c.oculto_pela_classe && c.display !== 'none').length,
    mapa_vivo: rt.roleSectionAccess ? Object.fromEntries(Object.entries(rt.roleSectionAccess).map(([k, v]) => [k, Array.isArray(v) ? v.includes('${SECT}') : null])) : null
  };
})()`;

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', { width: LARG, height: ALT, deviceScaleFactor: 1, mobile: false }, 20000);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 40; i++) { if (await E("!!document.querySelector('[data-bfr-municipal-nav]')")) break; await new Promise((r) => setTimeout(r, 500)); }
await E(`(() => { localStorage.setItem('sb-${REF[0]}-auth-token', ${JSON.stringify(JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user }))}); return 1; })()`);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 80; i++) { if (await E('!!(window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.painelAberto && document.getElementById("appShell"))')) break; await new Promise((r) => setTimeout(r, 500)); }
await espera(2500);
await E(`(() => { const f = [...document.querySelectorAll('button, a')].find((b) => /agora nao|agora não/i.test(String(b.textContent || '').trim())); if (f) f.click(); return !!f; })()`);
await espera(1000);
const weak = await E(`(() => { if (window.__P112_fid) return { ja: true, contagem: window.__P112_k }; let k = 0; const map = new WeakMap(); window.__P112_k = () => k; window.__P112_fid = (f) => { if (!f) return null; if (!map.has(f)) map.set(f, 'F' + (++k)); return map.get(f); }; return { ja: false, contagem: 0 }; })()`);
if (!weak || weak.ja !== false) abort(6, 'weakmap do fecho nao instalado: ' + JSON.stringify(weak));

const frio = await E(SNAP);
const rotulos = await E(`[...document.querySelectorAll('.role-toggle button')].map((b, i) => ({ i, rot: String(b.textContent || '').trim().slice(0,22) }))`);
const vaiCelula = async (i) => { await E(`(() => { const b = document.querySelectorAll('.role-toggle button')[${i}]; if (b) b.click(); return !!b; })()`); await espera(1800); return await E(SNAP); };
const abrePainel = async () => { const c = await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none'; }); if (!b) return false; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); b.click(); return { clicado: true, e_o_proprio: !!(el && (el === b || el.closest && el.closest('[data-bfr-municipal-nav]') === b)) }; })()`); await espera(4000); const s = await E(SNAP); return { clique: c, s }; };

const idxAdmin = rotulos.findIndex((r) => /admin/i.test(r.rot));
const abAdmin = idxAdmin >= 0 ? await vaiCelula(idxAdmin) : null;
const abertoAntes = abAdmin ? await abrePainel() : null;
const paineisAberto = abertoAntes ? abertoAntes.s.paineis.filter((p) => p.visivel).map((p) => p.id) : [];

for (const r of rotulos) {
  if (r.i === idxAdmin) continue;
  await vaiCelula(idxAdmin);
  const op = await abrePainel();
  const fechoAntesDaTroca = op.s.fecho_id;
  const s = await vaiCelula(r.i);
  const regraEntrante = regraDoShell(FALLBACKS, s.active_view);
  const celula = {
    rotulo: r.rot, active_view: s.active_view, active_section: s.active_section,
    painel_antes_da_troca: op.s.painel, aberto_antes_da_troca: painelAbertoPeloDom(op.s.painel) === true && op.s.painel_aberto_pelo_modulo === true,
    painel: s.painel, painel_aberto_pelo_modulo: s.painel_aberto_pelo_modulo,
    ultimo_fecho: s.ultimo_fecho, fecho_antes_da_troca_id: fechoAntesDaTroca, fecho_depois_da_troca_id: s.fecho_id,
    fecho_novo_nesta_celula: fechoAntesDaTroca !== s.fecho_id,
    classe: classeDaCelula({ fecho_novo_nesta_celula: fechoAntesDaTroca !== s.fecho_id, painel: s.painel }),
    regra_do_shell_para_a_entrante: regraEntrante,
    primeira_fonte_do_mapa_estatico_que_a_P102_usava: primeiraDoMapaEstatico(MAPA_ESTATICO, s.active_view),
    paineis_visiveis: s.paineis_visiveis, alguma_coisa_pintada: algumaCoisaPintada(s.paineis),
    entrada_visiveis: s.entrada_visiveis, dentro_do_mapa: (s.mapa_vivo || {})[s.active_view] === true,
    mapa_vivo_com_sect: Object.entries(s.mapa_vivo || {}).filter(([, v]) => v === true).map(([k]) => k).sort().join(','),
  };
  trocas.push(celula);
  console.log(`${String(r.rot).padEnd(13)} view=${String(s.active_view).padEnd(18)} aberto_antes=${celula.aberto_antes_da_troca} depois=${s.painel ? (s.painel.oculto_pela_classe ? 'fechado' : 'ABERTO') : '-'} classe=${celula.classe} fecho=${fechoAntesDaTroca}->${s.fecho_id} destino=${JSON.stringify(s.ultimo_fecho && s.ultimo_fecho.destino)} regra_shell=${regraEntrante} p102_terceirafonte=${celula.primeira_fonte_do_mapa_estatico_que_a_P102_usava} pintados=${(s.paineis_visiveis || []).length}`);
}

await vaiCelula(idxAdmin);
const reaberto = await abrePainel();
const antesSemTroca = reaberto.s;
await espera(4000);
const depoisSemTroca = await E(SNAP);
const saida = await vaiCelula(rotulos.findIndex((r) => r.i !== idxAdmin));
await vaiCelula(idxAdmin);
const volta = await abrePainel();
const md5Fim = md5(await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text());
encerrado = true;
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}

const foraDoMapa = trocas.filter((t) => t.dentro_do_mapa === false);
const comFecho = foraDoMapa.filter((t) => t.classe === 'fecho_novo');
const semFecho = foraDoMapa.filter((t) => t.classe === 'escondida_sem_fecho');
const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 340)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('F1_o_ar_medido_e_a_v142_certificada_do_bundle', MD5 === ESP.htmlMd5 && md5Fim === MD5, { ini: MD5, fim: md5Fim, certificado: ESP.htmlMd5, bytes: Buffer.byteLength(shellTxt) });
g('F2_as_agulhas_da_v142_estao_no_modulo_servido_e_a_regua_da_v141_tambem', contagem.v141 === 1 && AGULHAS_V142.every((x) => n(MOD, x) === 1), contagem);
g('F3_no_estado_frio_o_painel_nao_esta_aberto_e_o_fecho_ainda_nao_aconteceu', !!frio && frio.painel_aberto_pelo_modulo === false && frio.ultimo_fecho === null, { painel_aberto: frio && frio.painel_aberto_pelo_modulo, ultimo_fecho: frio && frio.ultimo_fecho });
g('F4_na_vista_autorizada_o_clique_pinta_o_painel', !!abertoAntes && abertoAntes.s.painel_aberto_pelo_modulo === true && painelAbertoPeloDom(abertoAntes.s.painel) === true, { painel: abertoAntes && abertoAntes.s.painel, modulo: abertoAntes && abertoAntes.s.painel_aberto_pelo_modulo });
g('F5_em_cada_vista_fora_do_mapa_o_painel_estava_aberto_antes_e_fechou_depois', foraDoMapa.length >= 3 && foraDoMapa.every((t) => t.aberto_antes_da_troca === true && painelFechadoPeloDom(t.painel) === true && t.painel_aberto_pelo_modulo === false), foraDoMapa.map((t) => t.rotulo + ' aberto_antes=' + t.aberto_antes_da_troca + ' depois=' + JSON.stringify(t.painel) + '/modulo=' + t.painel_aberto_pelo_modulo));
g('F6a_celula_com_fecho_novo_nomeia_o_destino_da_regra_do_shell_para_a_entrante', comFecho.length >= 1 && comFecho.every((t) => fechoNomeado(t.ultimo_fecho, SECT) && t.ultimo_fecho.destino === t.regra_do_shell_para_a_entrante), { celulas: comFecho.map((t) => t.rotulo + ' vista=' + t.active_view + ' destino=' + JSON.stringify(t.ultimo_fecho && t.ultimo_fecho.destino) + ' regra=' + t.regra_do_shell_para_a_entrante + ' fecho=' + t.fecho_antes_da_troca_id + '->' + t.fecho_depois_da_troca_id) });
g('F6b_celula_escondida_sem_fecho_novo_nao_empresta_fecho_de_outra_celula', semFecho.length >= 1 && semFecho.every((t) => t.fecho_depois_da_troca_id === t.fecho_antes_da_troca_id && painelFechadoPeloDom(t.painel) === true), { celulas: semFecho.map((t) => t.rotulo + ' vista=' + t.active_view + ' fecho=' + t.fecho_antes_da_troca_id + '->' + t.fecho_depois_da_troca_id + ' painel=' + JSON.stringify(t.painel)) });
g('F7_nenhum_fecho_deixou_ecra_em_branco_alguma_coisa_fica_pintada', foraDoMapa.every((t) => t.alguma_coisa_pintada === true), foraDoMapa.map((t) => t.rotulo + ' pintados=' + JSON.stringify(t.paineis_visiveis) + ' active_section=' + t.active_section));
g('F8_o_painel_da_vista_autorizada_nao_se_feche_sem_troca', !!antesSemTroca && !!depoisSemTroca && painelAbertoPeloDom(depoisSemTroca.painel) === true && depoisSemTroca.painel_aberto_pelo_modulo === true && depoisSemTroca.fecho_id === antesSemTroca.fecho_id, { antes: antesSemTroca && antesSemTroca.painel, depois: depoisSemTroca.painel, fecho_antes: antesSemTroca && antesSemTroca.fecho_id, fecho_depois: depoisSemTroca && depoisSemTroca.fecho_id });
g('F9_a_volta_a_autorizada_reabre_o_painel_com_as_mesmas_abas', !!volta && painelAbertoPeloDom(volta.s.painel) === true && volta.s.painel.abas === (abertoAntes ? abertoAntes.s.painel.abas : -1), { abas_depois: volta && volta.s.painel && volta.s.painel.abas, abas_antes: abertoAntes && abertoAntes.s.painel && abertoAntes.s.painel.abas, painel: volta && volta.s.painel });
g('F10_a_escondida_nao_recebe_a_entrada_nem_o_painel_fora_do_mapa', foraDoMapa.every((t) => t.entrada_visiveis === 0 && t.dentro_do_mapa === false) && antesSemTroca.entrada_visiveis > 0, { fora: foraDoMapa.map((t) => t.rotulo + ' entrada=' + t.entrada_visiveis + ' mapa=' + t.dentro_do_mapa), autorizada_entrada: antesSemTroca.entrada_visiveis });
g('F11_o_fecho_e_apresentacao_os_paineis_escondidos_pelo_abrir_reaparecem_ao_reabrir', (() => { if (!saida || !volta) return false; const visiveisAgora = volta.s.paineis.filter((p) => p.visivel).map((p) => p.id).sort().join('|'); return visiveisAgora === paineisAberto.slice().sort().join('|') && visiveisAgora.length > 0; })(), { aberto_em_admin: paineisAberto, depois_do_fecho_e_reaberto: volta ? volta.s.paineis.filter((p) => p.visivel).map((p) => p.id).sort() : null });
g('F12_o_mapa_vivo_so_tem_a_seccao_nas_chaves_declaradas', trocas.length >= 5 && trocas.every((t) => t.mapa_vivo_com_sect === PAPEIS_MUN.slice().sort().join(',')), { esperado_dos_bytes: PAPEIS_MUN.slice().sort().join(','), lido_em_cada_celula: trocas.map((t) => t.rotulo + '=' + t.mapa_vivo_com_sect) });
g('F13_a_caixa_vazia_da_v141_continua_escondida_fora_do_mapa', foraDoMapa.every((t) => t.entrada_visiveis === 0), foraDoMapa.map((t) => t.rotulo + ' entrada=' + t.entrada_visiveis));
g('F14_nenhuma_excecao_js_na_corrida', excecoes.length === 0, excecoes.slice(0, 5));
g('F15_as_duas_classes_de_celula_estao_ambas_presentes_e_nenhuma_celula_fica_fora_das_duas', comFecho.length >= 1 && semFecho.length >= 1 && foraDoMapa.every((t) => t.classe === 'fecho_novo' || t.classe === 'escondida_sem_fecho'), { fecho_novo: comFecho.map((t) => t.rotulo), escondida_sem_fecho: semFecho.map((t) => t.rotulo), outras: foraDoMapa.filter((t) => t.classe === 'nenhuma_das_dois').map((t) => t.rotulo) });
g('F16_a_regra_do_shell_lida_dos_bytes_nao_tem_segunda_fonte_e_o_mapa_nao_e_mutado', REGUA_LIDA_LITERAL.indexOf('||') >= 0 && mutacoesDoMapa === 0 && Object.prototype.hasOwnProperty.call(FALLBACKS, 'teacher') === false, { linha_lida: REGUA_LIDA_LITERAL, mutacoes_do_mapa: mutacoesDoMapa, teacher_no_fallbackByRole: Object.prototype.hasOwnProperty.call(FALLBACKS, 'teacher'), nota: 'e isto que torna a expectativa da P102 para teacher uma invensao minha e nao uma promessa do produto' });

out = {
  programa: 'scripts/p112-painel-fecha-na-troca-com-ator-por-celula-no-ar.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0, teto_ms: TETO_MS,
  pergunta: 'na v142, cada troca de vista fora do mapa esconde o painel municipal sem ecrã vazio — e o destino que o modulo nomeia, quando o modulo fecha, e o da regra do shell lida dos bytes?',
  sucede_a: 'scripts/p105-painel-fecha-na-troca-no-ar.mjs — o seu vermelho esta preservado em evidence/p105-painel-fecha-na-troca-no-ar-21-11-a.json e evidence/p105-painel-fecha-na-troca-no-ar-21-11-a.txt',
  defeitos_corrigidos: { D1_espectativa: 'a P105 comparava com `roleSectionAccess[vista][0]` quando o fallback nao tinha a vista; os bytes dao `|| inicio`', D2_atribuicao: 'a P105 lia `ultimoFecho()` (global do modulo) como medida da celula; aqui a celula so credita o fecho cuja identidade WeakMap mudou entre o abrir e o depois da troca' },
  metodo: `chrome headless ${LARG}x${ALT}, sessao do papel ${PAPEL}; para cada pessoa da barra: voltar ao Admin, reabrir o painel, marcar a identidade do ultimo fecho, trocar e ler painel (classe/display/abas), M.painelAberto(), M.ultimoFecho() e a sua identidade, os paineis pintados e a entrada. O destino esperado le-se dos bytes (fallbackByRole, senao 'inicio'); a segunda fonte da P102 continua registada como campo para se ver onde divergiria. Zero DDL, zero deploy, zero publicacao.`,
  ar: { url: URL_APP, md5_servido: MD5, md5_no_fim: md5Fim, bytes: Buffer.byteLength(shellTxt), certificada_em: 'worker-deploy-v142-painel-na-troca/esperado-v142.json', sect: SECT, view_id: VIEW_ID, papeis_municipais: PAPEIS_MUN },
  regra_do_shell: { linha_dos_bytes: REGUA_LIDA_LITERAL, mutacoes_de_roleSectionAccess_nos_bytes: mutacoesDoMapa, fallbackByRole_chaves: Object.keys(FALLBACKS), teacher_no_fallbackByRole: Object.prototype.hasOwnProperty.call(FALLBACKS, 'teacher') },
  agulhas_no_modulo_servido: contagem, banda: `${LARG}x${ALT}`, papel_sessao: PAPEL, weakmap: weak,
  frio, admin: abAdmin, aberto_antes: abertoAntes, trocas, sem_troca: { antes: antesSemTroca, depois: depoisSemTroca }, saida, volta,
  classes_de_celula: { fecho_novo: comFecho.map((t) => t.rotulo), escondida_sem_fecho: semFecho.map((t) => t.rotulo), total_fora_do_mapa: foraDoMapa.length },
  divergencias_regra_p102_vs_shell: trocas.filter((t) => t.primeira_fonte_do_mapa_estatico_que_a_P102_usava !== null && t.primeira_fonte_do_mapa_estatico_que_a_P102_usava !== t.regra_do_shell_para_a_entrante).map((t) => t.rotulo + ' vista=' + t.active_view + ' p102=' + t.primeira_fonte_do_mapa_estatico_que_a_P102_usava + ' shell=' + t.regra_do_shell_para_a_entrante),
  o_que_esta_peca_nao_autoriza: 'Prova apresentacao na troca de vista nesta sessao de teste. Nao prova os numeros do painel, nao da acesso a nenhuma conta, nao autoriza DDL, concessoes municipais, o rpc como porta, nem reverter PEN-43/44. Publicar seja o que for de novo pede OK literal.',
  excecoes: excecoes.slice(0, 8), falhas,
};
out.veredito = falhas.length === 0 ? 'P112_PAINEL_FECHA_NA_TROCA_COM_ATOR_POR_CELULA_OK 16/0' : `P112_PAINEL_FECHA_NA_TROCA_COM_ATOR_POR_CELULA_VERMELHO ${falhas.length} de 16`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\nfalhas=${falhas.length}\n${falhas.join('\n')}\nclasses=${JSON.stringify(out.classes_de_celula)}\nnode_exit=${falhas.length ? 1 : 0}\n`);
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(REPO + '/', '')}`);
process.exit(falhas.length ? 1 : 0);
