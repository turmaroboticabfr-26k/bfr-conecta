#!/usr/bin/env node
// P107 — O QUE O MÓDULO VIU NO INSTANTE EM QUE NAVEGOU (21/11, madrugada).
//
// A P106 deixou duas medidas que não se explicam uma pela outra:
//   · troca real (clique), vista entrante `teacher`: o fecho nomeou `inicio`;
//   · chamada directa da MESMA função com `teacher` assentado: nomeou `professor-inicio`, e o mapa vivo tinha
//     `roleSectionAccess.teacher[0] === 'professor-inicio'`.
// Logo a régua da P102 (nomear o destino pela vista que se entra) não é o que o ar faz no clique. Só há uma
// maneira de saber o que o módulo lia no instante: envolver o `navigate` que ele chama. `window.BFR_APP_RUNTIME`
// é um GETTER que devolve um literal novo a cada leitura, por isso envolve-se o getter — instrumentação desta
// sessão, no browser, sem tocar no produto, sem publicar nada, sem escrever no banco.
// A célula que discrimina é origem `secretaria da escola` -> `Professor`: as duas vistas têm destinos diferentes
// (`secretaria`/primeira secção do supervisor vs `professor-inicio`), e `inicio` não serve a nenhuma delas.
// Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 publicação.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p107-instante-do-navigate-do-fecho-no-ar-21-11-${SUF}.json`;
const TXT = `${REPO}/evidence/p107-instante-do-navigate-do-fecho-no-ar-21-11-${SUF}.txt`;
if ([OUT, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto já existe — corre com SUF novo, nunca por cima');
const ESP = JSON.parse(readFileSync(`${REPO}/worker-deploy-v142-painel-na-troca/esperado-v142.json`, 'utf8'));
const PORT = parseInt(process.env.AH2_PORT || '9414', 10);
const PAPEL = (process.env.P107_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();
const TETO_MS = 300000;

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
// O modulo publicado: primeira fonte o literal, segunda fonte o PRIMEIRO elemento do mapa vivo daquela vista.
const regraDoModulo = (FB, MAPA, v) => (typeof FB[v] === 'string' ? FB[v] : (Array.isArray(MAPA[v]) && MAPA[v].length ? String(MAPA[v][0]) : null));
if (regraDoModulo({ admin: 'inicio' }, { teacher: ['professor-inicio'] }, 'teacher') !== 'professor-inicio') throw new Error('ABORTA: regraDoModulo nao espelha a segunda fonte');
if (regraDoModulo({ admin: 'inicio' }, { teacher: ['professor-inicio'] }, 'admin') !== 'inicio') throw new Error('ABORTA: regraDoModulo ignora a primeira fonte');
if (regraDoModulo({ admin: 'inicio' }, {}, 'desconhecida') !== null) throw new Error('ABORTA: regraDoModulo inventaria destino sem fonte');
if ((process.argv[3] || '').trim() === '--selfteste') { console.log('P107_SELFTESTE_OK 3/0 — regraDoModulo espelha as duas fontes e o aborta; 0 rede, 0 chrome'); process.exit(0); }

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const MD5 = md5(shellTxt);
if (MD5 !== ESP.htmlMd5 || Buffer.byteLength(shellTxt) !== ESP.htmlBytes) throw new Error('ABORTA: o ar nao e a v142 certificada — ' + MD5 + '/' + Buffer.byteLength(shellTxt) + ' vs ' + ESP.htmlMd5 + '/' + ESP.htmlBytes);
const REF = [...new Set([...shellTxt.matchAll(/https:\/\/([a-z0-9]{16,})\.supabase\.co/g)].map((m) => m[1]))];
const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
const FB = recortaObjecto(shellTxt, 'const fallbackByRole = ').objecto;
const MAPA_DECL = recortaObjecto(shellTxt, 'const roleSectionAccess = {').objecto;
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD = shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1];
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD) || [])[1];
if (!SECT || !VIEW_ID || !ANON) throw new Error('ABORTA: SECT/VIEW_ID/ANON nao resolvidos');

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

const PERFIL = `${REPO}/.p107-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1366,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let out = {}; let fecho = false;
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, papel: PAPEL }, null, 2) + '\n'); } catch {}
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

// ——— a sonda: substitui o objecto por um Proxy sobre o MESMO objecto e regista cada navigate com o estado LIDO
// NA HORA. O runtime e um valor simples (medido: descriptor.get === undefined), por isso o Proxy e visivel para
// quem le `window.BFR_APP_RUNTIME` a cada chamada — como faz o modulo. ———
const SONDA = () => E(`(() => {
  if (window.__P107_PROXIED === window.BFR_APP_RUNTIME) return { ok: true, motivo: 'proxy ainda no sitio', instalacoes: window.__P107_instalacoes || 0 };
  const d = Object.getOwnPropertyDescriptor(window, 'BFR_APP_RUNTIME');
  if (!d || typeof d.value !== 'object' || !d.value) return { ok: false, motivo: 'BFR_APP_RUNTIME nao e um objecto gravavel: ' + JSON.stringify(d && { get: typeof d.get, valor: typeof d.value }) };
  const o = d.value;
  const nv = o.navigate;
  if (typeof nv !== 'function') return { ok: false, motivo: 'navigate nao e funcao: ' + typeof nv };
  window.__P107 = window.__P107 || [];
  window.__P107_instalacoes = (window.__P107_instalacoes || 0) + 1;
  window.BFR_APP_RUNTIME = new Proxy(o, {
    get(t, k) {
      if (k === 'navigate') return function (sec) {
        window.__P107.push({
          t_ms: Date.now(), destino_navegado: sec, lido_activeView: o.activeView, lido_activeSection: o.activeSection,
          tipo_mapa: Object.prototype.toString.call(o.roleSectionAccess),
          mapa_eh_array: Array.isArray(o.roleSectionAccess),
          mapa_primeiro_elemento_teacher: (function () { const m = o.roleSectionAccess; if (!m || Array.isArray(m)) return null; const t2 = m.teacher; return Array.isArray(t2) ? t2[0] : null; })(),
          mapa_tem_a_vista_lida: (function () { const m = o.roleSectionAccess; return !!(m && !Array.isArray(m) && Object.prototype.hasOwnProperty.call(m, String(o.activeView))); })(),
          painel_aberto_antes: (function () { const el = document.getElementById('${VIEW_ID}'); return el ? !el.classList.contains('hidden') : null; })(),
          pilha: String((new Error()).stack || '').split('\\n').slice(1, 6).join(' | ').slice(0, 420)
        });
        return nv.apply(this, arguments);
      };
      return Reflect.get(t, k);
    },
    set(t, k, v) {
      if (k === 'activeView' || k === 'activeSection') (window.__P107_vistas = window.__P107_vistas || []).push({ t_ms: Date.now(), chave: k, valor: String(v).slice(0, 40) });
      return Reflect.set(t, k, v);
    }
  });
  window.__P107_PROXIED = window.BFR_APP_RUNTIME;
  return { ok: true, motivo: 'proxy instalado sobre o valor do runtime', instalacoes: window.__P107_instalacoes };
})()`);
const instalação = await SONDA();
if (!instalação || instalação.ok !== true) { out = { instalacao_da_sonda: instalação }; writeFileSync(OUT, JSON.stringify({ ...out, aborta: 'sonda nao instalada' }, null, 2) + '\n'); throw new Error('ABORTA: ' + JSON.stringify(instalação)); }

const LOG = () => E('window.__P107.slice()');
const zera = () => E("window.__P107 = []; window.__P107.length");
const estado = () => E(`(() => { const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL; const el = document.getElementById('${VIEW_ID}'); return { vista: rt.activeView, seccao: rt.activeSection, painel_aberto: M.painelAberto(), oculto_pela_classe: el ? el.classList.contains('hidden') : null, fecho: M.ultimoFecho() }; })()`);

const rotulos = await E(`[...document.querySelectorAll('.role-toggle button')].map((b, i) => ({ i, rot: String(b.textContent || '').trim().slice(0,22) }))`);
const vai = async (nome) => { const i = rotulos.findIndex((r) => String(r.rot).toLowerCase() === String(nome).toLowerCase() || new RegExp('^' + String(nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(r.rot)); if (i < 0) throw new Error('ABORTA: sem pessoa com rotulo ' + JSON.stringify(nome) + ' — existentes: ' + rotulos.map((r) => r.rot).join('|')); await E(`(() => { document.querySelectorAll('.role-toggle button')[${i}].click(); return true; })()`); await espera(2200); return await estado(); };
const abre = async () => { await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none'; }); if (!b) return false; b.click(); return true; })()`); await espera(3200); return await estado(); };

const CELULAS = [];
for (const par of [['Admin', 'Professor'], ['Admin', 'Direção'], ['Secretaria da escola', 'Professor'], ['Admin', 'Pais']]) {
  const [origem, alvo] = par;
  const c = { origem, alvo };
  try {
    const o = await vai(origem);
    c.origem_estado = o;
    if (o.painel_aberto === true) { await E(`(() => { const b = document.querySelector('[data-bfr-municipal-nav]'); if (b) b.click(); return true; })()`); await espera(1500); }
    const a = await abre();
    c.painel_aberto_na_origem = a.painel_aberto;
    if (a.painel_aberto !== true) { c.bloqueado = 'o painel nao abriu na origem ' + origem; CELULAS.push(c); continue; }
    await zera();
    c.sonda_antes_da_troca = await SONDA();
    await E('window.__P107_vistas = []; 1');
    await vai(alvo);
    c.vistas_registadas_na_troca = await E('window.__P107_vistas.slice(-12)');
    c.estado_final = await estado();
    c.navigate_log = await LOG();
    c.vista_lida_no_instante = (c.navigate_log[0] || {}).lido_activeView ?? null;
    c.destino_navegado = (c.navigate_log[0] || {}).destino_navegado ?? null;
    c.esperado_pela_regra_do_modulo_com_a_vista_entrante = regraDoModulo(FB, MAPA_DECL, c.estado_final.vista);
    c.esperado_pela_regra_do_modulo_com_a_vista_deixada = regraDoModulo(FB, MAPA_DECL, o.vista);
    c.esperado_pela_regra_do_shell_para_a_entrante = regraDoShell(FB, c.estado_final.vista);
    c.esperado_pela_regra_do_shell_para_a_deixada = regraDoShell(FB, o.vista);
    c.tipo_mapa_no_instante = (c.navigate_log[0] || {}).tipo_mapa ?? null;
    c.pilha_do_navigate = (c.navigate_log[0] || {}).pilha ?? null;
  } catch (e) { c.erro = String(e && e.message || e).split('\n')[0].slice(0, 220); }
  CELULAS.push(c);
  console.log(`${origem} -> ${alvo}: lida_no_instante=${JSON.stringify(c.vista_lida_no_instante)} navegado=${JSON.stringify(c.destino_navegado)} modulo[entrante]=${c.esperado_pela_regra_do_modulo_com_a_vista_entrante} modulo[deixada]=${c.esperado_pela_regra_do_modulo_com_a_vista_deixada} shell[entrante]=${c.esperado_pela_regra_do_shell_para_a_entrante} tipo_mapa=${c.tipo_mapa_no_instante} navegados=${(c.navigate_log || []).length} painel_fechado=${c.estado_final ? c.estado_final.oculto_pela_classe : '?'}`);
}

const desinstala = await E(`(() => { try { delete window.BFR_APP_RUNTIME; return 'tentada'; } catch (e) { return 'nao removivel'; } })()`);
out = {
  programa: 'scripts/p107-instante-do-navigate-do-fecho-no-ar.mjs', em: new Date().toISOString(), duracao_ms: 0, url: URL_APP,
  pergunta: 'que activeView o modulo lia no instante em que o fecho chamou navigate?',
  ar: { md5: MD5, bytes: Buffer.byteLength(shellTxt), sect: SECT, view_id: VIEW_ID },
  regra_do_shell_lida_dos_bytes: (shellTxt.match(/const fallback = fallbackByRole\[activeView\][^\n]*/) || [])[0] || null,
  instalacao_da_sonda: instalação, desinstalacao: desinstala,
  literais: { fallback_chaves: Object.keys(FB), teacher_no_fallback: 'teacher' in FB, education_supervisor_no_fallback: 'education_supervisor' in FB, mapa_vias: Object.keys(MAPA_DECL), teacher_primeiro: (MAPA_DECL.teacher || [])[0], education_supervisor_primeiro: (MAPA_DECL.education_supervisor || [])[0] },
  celulas: CELULAS,
  o_que_esta_peca_nao_prova: 'prova o que o modulo lia no instante; nao prova qual dessas duas vistas o produto DEVERIA usar — isso e decisao de produto, nao medicao',
};
out.sintesis = CELULAS.filter((c) => c.destino_navegado).map((c) => ({
  par: c.origem + '->' + c.alvo, lida: c.vista_lida_no_instante, navegado: c.destino_navegado,
  igual_a_regra_do_modulo_sobre_a_entrante: c.destino_navegado === c.esperado_pela_regra_do_modulo_com_a_vista_entrante,
  igual_a_regra_do_modulo_sobre_a_deixada: c.destino_navegado === c.esperado_pela_regra_do_modulo_com_a_vista_deixada,
}));
out.duracao_ms = Date.now() - t0;
out.excecoes = excecoes.slice(0, 12);
fecho = true;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const L = [
  `P107 celulas=${CELULAS.length} · ${out.duracao_ms} ms · sonda: ${instalação.motivo}`,
  ...out.sintesis.map((s) => `${s.par}: lida=${s.lida} navegado=${s.navegado} modulo_entrante=${s.igual_a_regra_do_modulo_sobre_a_entrante} modulo_deixada=${s.igual_a_regra_do_modulo_sobre_a_deixada}`),
  `excecoes=${out.excecoes.length}`,
];
writeFileSync(TXT, L.join('\n') + '\nnode_exit=0\n');
console.log(L.join('\n'));
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
process.exit(0);
