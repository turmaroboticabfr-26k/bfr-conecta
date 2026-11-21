#!/usr/bin/env node
// P106 — QUE VISTA O FECHO LEU? (21/11, madrugada). A P105 ficou vermelha num portão de nome: trocando de
// `admin` (painel aberto) para Professor, o módulo navegou para `inicio`; a régua da P102/P105 esperava
// `professor-inicio`. Três hipóteses estavam vivas e nenhuma se resolve por prosa:
//   H-a) a segunda fonte injectada (`rt.roleSectionAccess[vista][0]`) está morta porque no ar isso é um ARRAY;
//   H-b) o literal `FALBACKS_DOS_BYTES` injectado difere do `fallbackByRole` do shell;
//   H-c) o fecho corre num instante em que `rt.activeView` ainda é a vista QUE SE DEIXA (`admin` → `inicio`),
//        e não a que se entra (`teacher` → sem chave no literal → mapa → `professor-inicio`).
// Medida prévia, offline, nos mesmos bytes: não há nenhuma atribuição a `roleSectionAccess.teacher` nem mutação
// do mapa depois do boot, e o `fallbackByRole` do shell não tem chave para `teacher` nem para
// `education_supervisor` — a sua regra é `const fallback = fallbackByRole[activeView] || 'inicio';`.
// Esta peça separa as três com um amostrador de 20 ms no instante do fecho natural e uma chamada DIRECTA da
// mesma função com a vista conhecida (degraus nomeados: clique → estado vivo → chamada directa).
// Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 publicação. A única rede privilegiada é o refresh da cadeia.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p106-vista-do-instante-do-fecho-no-ar-21-11-${SUF}.json`;
const TXT = `${REPO}/evidence/p106-vista-do-instante-do-fecho-no-ar-21-11-${SUF}.txt`;
if ([OUT, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto já existe — corre com SUF novo, nunca por cima');
const ESP = JSON.parse(readFileSync(`${REPO}/worker-deploy-v142-painel-na-troca/esperado-v142.json`, 'utf8'));
const PORT = parseInt(process.env.AH2_PORT || '9413', 10);
const PAPEL = (process.env.P106_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const t0 = Date.now();
const TETO_MS = 420000;

// ——— a régua: a regra do shell, lida dos bytes, nunca lembrada ———
function recortaObjecto(txt, marcador) {
  const i = txt.indexOf(marcador);
  if (i < 0) return null;
  const b = txt.indexOf('{', i);
  let nv = 0, fim = -1;
  for (let k = b; k < txt.length; k++) { const c = txt[k]; if (c === '{') nv++; else if (c === '}') { nv--; if (nv === 0) { fim = k; break; } } }
  if (fim < 0) return null;
  const literal = txt.slice(b, fim + 1);
  return { literal, objecto: Function('return (' + literal + ')')() };
}
const regraDoShell = (FB, vista) => (typeof FB[vista] === 'string' ? FB[vista] : 'inicio');

// ——— predicações puras dos lados da promessa, com os dois lados provados ———
const fechoNaturalUsouVistaDeixada = (c) => !!c && typeof c.vista_no_instante === 'string' && c.vista_no_instante === c.vista_deixada && c.vista_no_instante !== c.vista_entrante;
const destinoIgualARegraDoShellParaAEntrante = (c, FB) => !!c && c.destino === regraDoShell(FB, c.vista_entrante);
const painelAbertoPeloDom = (p) => !!p && p.oculto_pela_classe === false && p.display !== 'none';
if (fechoNaturalUsouVistaDeixada({ vista_no_instante: 'admin', vista_deixada: 'admin', vista_entrante: 'teacher' }) !== true) throw new Error('ABORTA: o discriminante da H-c chumba o caso que existe para discriminar');
if (fechoNaturalUsouVistaDeixada({ vista_no_instante: 'teacher', vista_deixada: 'admin', vista_entrante: 'teacher' }) !== false) throw new Error('ABORTA: o discriminante da H-c dá verde a um fecho que leu a vista entrante');
if (fechoNaturalUsouVistaDeixada(null) !== false) throw new Error('ABORTA: o discriminante da H-c dá verde sem fecho medido');
if (destinoIgualARegraDoShellParaAEntrante({ destino: 'inicio', vista_entrante: 'teacher' }, { admin: 'inicio', teacher: undefined }) !== true) throw new Error('ABORTA: a regra do shell para teacher nao deu inicio (falta o || inicio)');
if (destinoIgualARegraDoShellParaAEntrante({ destino: 'professor-inicio', vista_entrante: 'teacher' }, { admin: 'inicio' }) !== false) throw new Error('ABORTA: a regra do shell aceitaria o primeiro elemento do mapa, que o shell nunca usa');
if (painelAbertoPeloDom({ oculto_pela_classe: true, display: 'none' }) !== false) throw new Error('ABORTA: painelAbertoPeloDom da verde a um painel escondido');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P106_SELFTESTE_OK 7/0 — fechoNaturalUsouVistaDeixada (3), destinoIgualARegraDoShellParaAEntrante (2), painelAbertoPeloDom (1), recortaObjecto (1 por uso); 0 rede, 0 chrome');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const MD5 = md5(shellTxt);
if (MD5 !== ESP.htmlMd5 || Buffer.byteLength(shellTxt) !== ESP.htmlBytes) throw new Error('ABORTA: o ar nao e a v142 certificada — medido ' + MD5 + '/' + Buffer.byteLength(shellTxt) + ' vs ' + ESP.htmlMd5 + '/' + ESP.htmlBytes);
const REF = [...new Set([...shellTxt.matchAll(/https:\/\/([a-z0-9]{16,})\.supabase\.co/g)].map((m) => m[1]))];
const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

// H-b: o literal injectado vs o do shell — offline, nos bytes servidos.
const FB_SHELL = recortaObjecto(shellTxt, 'const fallbackByRole = ');
const FB_INJ = recortaObjecto(shellTxt, 'const FALBACKS_DOS_BYTES = ');
if (!FB_SHELL || !FB_INJ) throw new Error('ABORTA: nao recortei um dos literais — shell=' + !!FB_SHELL + ' injectado=' + !!FB_INJ);
const LIT_IGUAIS = FB_SHELL.literal === FB_INJ.literal;
const LINHA_REGUA = (shellTxt.match(/const fallback = fallbackByRole\[activeView\][^\n]*/) || [])[0] || null;
if (!LINHA_REGUA) throw new Error('ABORTA: nenhuma linha `const fallback = fallbackByRole[activeView]` nos bytes — sem regra do shell nao ha regua');
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD = shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1];
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD) || [])[1];
if (!SECT || !VIEW_ID) throw new Error('ABORTA: SECT/VIEW_ID nao resolvidos dos bytes servidos');
const H_A = await (async () => {
  const i = shellTxt.indexOf('const roleSectionAccess = {');
  if (i < 0) return { veredito: 'sem declaracao' };
  const o = recortaObjecto(shellTxt, 'const roleSectionAccess = ');
  return { e_objecto_na_declaracao: !!o, chaves: o ? Object.keys(o.objecto) : [], teacher_primeiro: o && Array.isArray(o.objecto.teacher) ? o.objecto.teacher[0] : null, mutacoes_do_mapa: (shellTxt.match(/roleSectionAccess(?:\.\w+|\[[^\]]+\])\s*=[^=]/g) || []).length };
})();

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

const PERFIL = `${REPO}/.p106-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1366,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let out = {}; let fecho = false;
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, teto_ms: TETO_MS, papel: PAPEL }, null, 2) + '\n'); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, 'watchdog ' + (TETO_MS / 1000) + ' s'), TETO_MS);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
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

// O amostrador vive DENTRO da página: um só `evaluate` que clica e amostra a 20 ms, para que o instante do fecho
// não dependa do ida-e-volta do CDP (que é de dezenas de ms e não nomearia o instante).
const AMOSTRA = (iBotao) => E(`(async () => {
  const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL;
  const bot = document.querySelectorAll('.role-toggle button')[${iBotao}];
  if (!bot) return { erro: 'sem botao ' + ${iBotao} };
  const antes = { vista: rt.activeView, seccao: rt.activeSection, painel: M.painelAberto(), fecho: M.ultimoFecho() };
  const amostras = [];
  bot.click();
  const ini = Date.now();
  while (Date.now() - ini < 4000) {
    amostras.push({ t: Date.now() - ini, vista: rt.activeView, seccao: rt.activeSection, aberto: M.painelAberto(), fecho: M.ultimoFecho() });
    if (rt.activeView && rt.activeView !== antes.vista) { const f = amostras.filter((a) => a.fecho && a.fecho.fechado === true); if (f.length) break; }
    await new Promise((rz) => setTimeout(rz, 20));
  }
  const primeiro = amostras.find((a) => a.fecho && a.fecho.fechado === true) || null;
  const fim = { vista: rt.activeView, seccao: rt.activeSection, aberto: M.painelAberto(), fecho: M.ultimoFecho() };
  const vistas_vistas = [...new Set(amostras.map((a) => a.vista))];
  return { antes, primeiro, fim, amostras: amostras.length, vistas_vistas, trocou_de_painel_aberto_para_fechado_em_ms: (() => { const a = amostras.findIndex((x) => x.aberto === false); return a < 0 ? null : amostras[a].t; })() };
})()`, 60000);

const rotulos = await E(`[...document.querySelectorAll('.role-toggle button')].map((b, i) => ({ i, rot: String(b.textContent || '').trim().slice(0,22) }))`);
const vaiCelula = async (i) => { await E(`(() => { const b = document.querySelectorAll('.role-toggle button')[${i}]; if (b) b.click(); return !!b; })()`); await espera(1800); return await E(`(() => { const rt = window.BFR_APP_RUNTIME; return { vista: rt.activeView, seccao: rt.activeSection, aberto: window.BFR_MUNICIPAL.painelAberto() }; })()`); };
const abrePainel = async () => { await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none'; }); if (b) b.click(); return !!b; })()`); await espera(3500); return await E(`(() => { const rt = window.BFR_APP_RUNTIME; const p = document.getElementById('${VIEW_ID}'); return { vista: rt.activeView, aberto: window.BFR_MUNICIPAL.painelAberto(), display: p ? getComputedStyle(p).display : null, oculto: p ? p.classList.contains('hidden') : null }; })()`); };

const idxAdmin = rotulos.findIndex((r) => /admin/i.test(r.rot));
const CELULAS = [];
for (const r of rotulos) {
  if (r.i === idxAdmin) continue;
  await vaiCelula(idxAdmin);
  const op = await abrePainel();
  if (op.aberto !== true) { CELULAS.push({ rotulo: r.rot, bloqueado: 'o painel nao abriu na origem admin', op }); continue; }
  const am = await AMOSTRA(r.i);
  const p = await E(`(() => { const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL; const el = document.getElementById('${VIEW_ID}'); return { vista: rt.activeView, seccao: rt.activeSection, aberto: M.painelAberto(), fecho: M.ultimoFecho(), pintados: [...document.querySelectorAll('#appShell .content')].filter((v) => !v.classList.contains('hidden') && v.id !== '${VIEW_ID}').length }; })()`);
  CELULAS.push({
    rotulo: r.rot, vista_deixada: op.vista, vista_entrante: p.vista, seccao_final: p.seccao,
    destino: (p.fecho || {}).destino ?? null, fechado: (p.fecho || {}).fechado ?? null,
    amostra_primeiro: am.primeiro, amostra_fim: am.fim, vistas_vistas_na_troca: am.vistas_vistas, amostras: am.amostras,
    painel_fechado_no_fim: p.aberto === false && (await E(`(() => { const el = document.getElementById('${VIEW_ID}'); return el ? el.classList.contains('hidden') : null; })()`)) === true,
    pintados_no_fim: p.pintados,
    regra_do_shell_para_a_entrante: regraDoShell(FB_SHELL.objecto, p.vista),
    regra_do_shell_para_a_deixada: regraDoShell(FB_SHELL.objecto, op.vista),
    usou_a_vista_deixada: fechoNaturalUsouVistaDeixada({ vista_no_instante: (am.primeiro || {}).vista, vista_deixada: op.vista, vista_entrante: p.vista }),
  });
  console.log(`${String(r.rot).padEnd(13)} deixada=${op.vista} entrante=${p.vista} instante_fecho=${JSON.stringify((am.primeiro || {}).vista)} destino=${JSON.stringify((p.fecho || {}).destino)} regras[entrante]=${CELULAS[CELULAS.length - 1].regra_do_shell_para_a_entrante} regras[deixada]=${CELULAS[CELULAS.length - 1].regra_do_shell_para_a_deixada} usou_deixada=${CELULAS[CELULAS.length - 1].usou_a_vista_deixada} vistas_na_troca=${JSON.stringify(am.vistas_vistas)} pintados=${p.pintados}`);
}

// Degrau da chamada directa: com a vista jA assentada (Portador=null -> professor), chamar a MESMA função e ver
// que destino nomeia quando a vista lida é, sem ambiguidade, a entrante. Isto falsifica H-a e H-b por estado.
const directCall = await E(`(async () => {
  const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL;
  const alv = rt.activeView;
  const antes = { vista: alv, aberto: M.painelAberto(), fecho: M.ultimoFecho() };
  const res = M.fecharPainelForaDaVista('sonda de chamada directa com vista conhecida');
  await new Promise((rz) => setTimeout(rz, 1200));
  return { vista: rt.activeView, seccao: rt.activeSection, antes, res, depois: { aberto: M.painelAberto(), fecho: M.ultimoFecho() }, tipo_roleSectionAccess: Object.prototype.toString.call(rt.roleSectionAccess), teacher_primeiro_vivo: (function () { const r = rt.roleSectionAccess; if (!r) return null; const t = Array.isArray(r) ? null : r.teacher; return Array.isArray(t) ? t[0] : null; })() };
})()`, 60000);

const idxTeacher = rotulos.findIndex((r) => /professor/i.test(r.rot));
const teacherAssentado = idxTeacher >= 0 ? await vaiCelula(idxTeacher) : null;
const directTeacher = teacherAssentado && teacherAssentado.vista === 'teacher' ? await E(`(() => { const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL; const antes = { vista: rt.activeView, aberto: M.painelAberto() }; const res = M.fecharPainelForaDaVista('sonda directa com activeView=teacher'); return { antes, res, vista: rt.activeView, tipo: Object.prototype.toString.call(rt.roleSectionAccess), teacher_vivo: Array.isArray(rt.roleSectionAccess) ? null : (rt.roleSectionAccess.teacher || [])[0] }; })()`, 40000) : { bloqueado: 'a vista teacher nao assentou' };

out = {
  programa: 'scripts/p106-vista-do-instante-do-fecho-no-ar.mjs', em: new Date().toISOString(), duracao_ms: 0, url: URL_APP,
  pergunta: 'o fecho nomeia o destino a partir da vista que se entra ou da que se deixa?',
  ar: { md5: MD5, bytes: Buffer.byteLength(shellTxt) }, sect: SECT, view_id: VIEW_ID, papel: PAPEL,
  regra_do_shell_lida_dos_bytes: LINHA_REGUA,
  H_a_estado_do_mapa_no_ar: H_A,
  H_b_liteais: { shell_e_injectado_byte_a_byte: LIT_IGUAIS, md5_shell: md5(FB_SHELL.literal), md5_injectado: md5(FB_INJ.literal), chaves_shell: Object.keys(FB_SHELL.objecto), chaves_injectadas: Object.keys(FB_INJ.objecto), teacher_no_shell: 'teacher' in FB_SHELL.objecto, teacher_no_injectado: 'teacher' in FB_INJ.objecto },
  celulas: CELULAS,
  degrau_chamada_directa_no_instante_da_troca: directCall,
  degrau_chamada_directa_com_teacher_assentado: directTeacher,
};
const foraDoMapa = CELULAS.filter((c) => c.fechado === true);
out.sintese = {
  celulas: CELULAS.length, com_fecho: foraDoMapa.length,
  destinos_mediados: CELULAS.map((c) => c.vista_entrante + ':' + c.destino),
  iguais_a_regra_do_shell_para_a_entrante: CELULAS.filter((c) => c.destino === c.regra_do_shell_para_a_entrante).length,
  iguais_a_regra_do_shell_para_a_deixada: CELULAS.filter((c) => c.destino === c.regra_do_shell_para_a_deixada).length,
  fechos_que_lem_a_vista_deixada: CELULAS.filter((c) => c.usou_a_vista_deixada === true).length,
};
out.duracao_ms = Date.now() - t0;
out.excecoes = excecoes.slice(0, 12);
fecho = true;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const L = [
  `P106 celulas=${out.sintese.celulas} com_fecho=${out.sintese.com_fecho} · entrante=${out.sintese.iguais_a_regra_do_shell_para_a_entrante}/${out.sintese.celulas} deixada=${out.sintese.iguais_a_regra_do_shell_para_a_deixada}/${out.sintese.celulas} leu_deixada=${out.sintese.fechos_que_lem_a_vista_deixada}/${out.sintese.com_fecho}`,
  `H-a mapa no ar: ${JSON.stringify(out.H_a_estado_do_mapa_no_ar).slice(0, 220)}`,
  `H-b literais iguais=${LIT_IGUAIS} teacher_shell=${out.H_b_liteais.teacher_no_shell} teacher_injectado=${out.H_b_liteais.teacher_no_injectado}`,
  `directa no instante: ${JSON.stringify(directCall).slice(0, 320)}`,
  `directa com teacher assentado: ${JSON.stringify(directTeacher).slice(0, 320)}`,
  `excecoes=${out.excecoes.length} · ${out.duracao_ms} ms`,
];
writeFileSync(TXT, L.join('\n') + '\nnode_exit=0\n');
console.log(L.join('\n'));
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
process.exit(0);
