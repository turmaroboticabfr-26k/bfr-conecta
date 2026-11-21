#!/usr/bin/env node
// P108 — QUEM ESCONDE O PAINEL NA TROCA, E EM QUE INSTANTE (21/11, madrugada).
//
// Porquê: a P105 deixou F6 vermelho com `Professor: obtido=inicio, esperado=professor-inicio`. A P107 mostrou
// que `ULTIMO_FECHO` e um global: na celula Professor nao houve fecho nenhum (`fecho:null`, zero `navigate`
// registados) e o painel ainda assim acabou com a classe `hidden`. Logo a P105 comparou o fecho de uma celula
// ANTERIOR com a expectativa desta — Vermelho real, causa instrumentral: variavel global lida como medida por
// célula. Falta nomear o actor: se quem esconde e o modulo (com destino navegado) ou o `switchView` do shell.
// Esta peça amostra a 20 ms, dentro da pagina, e marca cadainstante com: classe do painel, display calculado,
// `ultimoFecho()` por IDENTIDADE de objecto (nao por valor), comprimento do registo de navegacoes e a vista do
// runtime. O par `Admin -> Professor` e o caso que a P105 chumbou; `Admin -> Direção` e o controlo em que a P107
// apanhou o fecho do modulo.
// Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 publicacao. A sonda e desta sessao, no browser.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p108-actor-do-fecho-na-troca-no-ar-21-11-${SUF}.json`;
const TXT = `${REPO}/evidence/p108-actor-do-fecho-na-troca-no-ar-21-11-${SUF}.txt`;
if ([OUT, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto já existe — corre com SUF novo, nunca por cima');
const ESP = JSON.parse(readFileSync(`${REPO}/worker-deploy-v142-painel-na-troca/esperado-v142.json`, 'utf8'));
const P107 = JSON.parse(readFileSync(`${REPO}/evidence/p107-instante-do-navigate-do-fecho-no-ar-21-11-b.json`, 'utf8'));
const PORT = parseInt(process.env.AH2_PORT || '9415', 10);
const PAPEL = (process.env.P108_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();
const TETO_MS = 300000;

// ——— predicação pura do actor, com os três lados provados ———
// actor = 'modulo' se o fecho mudou de identidade NESTA célula e houve navigate; 'shell' se o painel passou a
// hidden sem qualquer mudança de identidade do fecho; 'ninguem' se nunca fechou.
function actorDoFecho(m) {
  if (!m || typeof m !== 'object') return 'medicao_incompleta';
  const fechou = m.antes_escondido === false && m.depois_escondido === true;
  if (!fechou) return m.depois_escondido === true ? 'ja_venha_escondido' : 'nao_fechou';
  const fecho_novo = m.identidade_fecho_antes !== m.identidade_fecho_depois;
  const houve_navigate = m.navegacoes_nesta_celula > 0;
  if (fecho_novo && houve_navigate) return 'modulo';
  if (!fecho_novo && !houve_navigate) return 'shell';
  return 'inconsistente_' + (fecho_novo ? 'fecho_sem_navigate' : 'navigate_sem_fecho');
}
if (actorDoFecho({ antes_escondido: false, depois_escondido: true, identidade_fecho_antes: 'A', identidade_fecho_depois: 'B', navegacoes_nesta_celula: 1 }) !== 'modulo') throw new Error('ABORTA: actorDoFecho nao reconhece o fecho do modulo');
if (actorDoFecho({ antes_escondido: false, depois_escondido: true, identidade_fecho_antes: 'A', identidade_fecho_depois: 'A', navegacoes_nesta_celula: 0 }) !== 'shell') throw new Error('ABORTA: actorDoFecho nao reconhece o fecho do shell');
if (actorDoFecho({ antes_escondido: false, depois_escondido: false, identidade_fecho_antes: 'A', identidade_fecho_depois: 'A', navegacoes_nesta_celula: 0 }) !== 'nao_fechou') throw new Error('ABORTA: actorDoFecho da um actor a quem nao fechou');
if (actorDoFecho({ antes_escondido: false, depois_escondido: true, identidade_fecho_antes: 'A', identidade_fecho_depois: 'B', navegacoes_nesta_celula: 0 }) !== 'inconsistente_fecho_sem_navigate') throw new Error('ABORTA: actorDoFecho esconde a incoerencia (fecho sem navigate)');
if (actorDoFecho(null) !== 'medicao_incompleta') throw new Error('ABORTA: actorDoFecho decide sem medida');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P108_SELFTESTE_OK 5/0 — actorDoFecho: modulo, shell, nao_fechou, inconsistente (fecho sem navigate), sem medida; 0 rede, 0 chrome');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const MD5 = md5(shellTxt);
if (MD5 !== ESP.htmlMd5 || Buffer.byteLength(shellTxt) !== ESP.htmlBytes) throw new Error('ABORTA: o ar nao e a v142 certificada — ' + MD5 + '/' + Buffer.byteLength(shellTxt) + ' vs ' + ESP.htmlMd5 + '/' + ESP.htmlBytes);
const REF = [...new Set([...shellTxt.matchAll(/https:\/\/([a-z0-9]{16,})\.supabase\.co/g)].map((m) => m[1]))];
const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD = shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD) || [])[1];
if (!VIEW_ID || !ANON) throw new Error('ABORTA: VIEW_ID/ANON nao resolvidos');

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

const PERFIL = `${REPO}/.p108-perfil-${PORT}`;
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

// identidade de objecto do fecho: o modulo devolve o objecto guardado; guardar-lhe o id num fraco-mapa permite
// dizer se ULTIMO_FECHO mudou de OBJECTO nesta celula, que e o que a P105 nao pode fazer.
const SONDA = () => E(`(() => {
  if (window.__P108_PROXIED === window.BFR_APP_RUNTIME) return { ok: true, motivo: 'proxy ainda no sitio' };
  const d = Object.getOwnPropertyDescriptor(window, 'BFR_APP_RUNTIME');
  if (!d || typeof d.value !== 'object' || !d.value) return { ok: false, motivo: 'runtime nao e objecto gravavel' };
  const o = d.value; const nv = o.navigate;
  if (typeof nv !== 'function') return { ok: false, motivo: 'navigate nao e funcao' };
  window.__P108 = window.__P108 || [];
  window.BFR_APP_RUNTIME = new Proxy(o, {
    get(t, k) {
      if (k === 'navigate') return function (sec) {
        window.__P108.push({ t_ms: Date.now(), destino: sec, vista_lida: o.activeView, seccao_lida: o.activeSection,
          painel_escondido_no_instante: (function () { const el = document.getElementById('${VIEW_ID}'); return el ? el.classList.contains('hidden') : null; })() });
        return nv.apply(this, arguments);
      };
      return Reflect.get(t, k);
    },
    set(t, k, v) { return Reflect.set(t, k, v); }
  });
  window.__P108_PROXIED = window.BFR_APP_RUNTIME;
  return { ok: true, motivo: 'proxy instalado' };
})()`);
const instalação = await SONDA();
if (!instalação || instalação.ok !== true) throw new Error('ABORTA: sonda nao instalada: ' + JSON.stringify(instalação));

const rotulos = await E(`[...document.querySelectorAll('.role-toggle button')].map((b, i) => ({ i, rot: String(b.textContent || '').trim().slice(0,22) }))`);
const idx = (re) => rotulos.findIndex((r) => re.test(r.rot));
const vai = async (re) => { const i = idx(re); if (i < 0) throw new Error('ABORTA: sem pessoa /' + re.source + '/'); await E(`(() => { document.querySelectorAll('.role-toggle button')[${i}].click(); return true; })()`); await espera(2200); };
const abre = async () => { await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none'; }); if (!b) return false; b.click(); return true; })()`); await espera(3200); return await E(`(() => { const M = window.BFR_MUNICIPAL; const el = document.getElementById('${VIEW_ID}'); return { aberto: M.painelAberto(), escondido: el ? el.classList.contains('hidden') : null }; })()`); };

// O amostrador: um só evaluate, 20 ms, com identidade do fecho por WeakMap e o registro das navegacoes.
const amostraTroca = (iAlvo) => E(`(async () => {
  const rt = window.BFR_APP_RUNTIME, M = window.BFR_MUNICIPAL;
  const ids = (window.__P108_IDS = window.__P108_IDS || (typeof WeakMap === 'function' ? new WeakMap() : null));
  let contador = (window.__P108_CONT = window.__P108_CONT || 0);
  const ident = (f) => { if (!f || typeof f !== 'object') return f === null ? 'null' : 'nao-objeto'; if (!ids) return 'sem-weakmap'; if (!ids.has(f)) { ids.set(f, 'F' + (++contador)); window.__P108_CONT = contador; } return ids.get(f); };
  const navAntes = window.__P108.length;
  const el0 = document.getElementById('${VIEW_ID}');
  const antes = { escondido: el0 ? el0.classList.contains('hidden') : null, display: el0 ? getComputedStyle(el0).display : null, fecho: ident(M.ultimoFecho()) };
  document.querySelectorAll('.role-toggle button')[${iAlvo}].click();
  const seq = [];
  const ini = Date.now();
  while (Date.now() - ini < 3000) {
    const el = document.getElementById('${VIEW_ID}');
    seq.push({ t: Date.now() - ini, escondido: el ? el.classList.contains('hidden') : null, display: el ? getComputedStyle(el).display : null, aberto_pelo_modulo: M.painelAberto(), fecho: ident(M.ultimoFecho()), vista: rt.activeView, seccao: rt.activeSection, navegacoes: window.__P108.length - navAntes });
    await new Promise((rz) => setTimeout(rz, 20));
  }
  const depois = { escondido: (function () { const el = document.getElementById('${VIEW_ID}'); return el ? el.classList.contains('hidden') : null; })(), fecho: ident(M.ultimoFecho()) };
  const novos = window.__P108.slice(navAntes);
  return { antes, depois, amostras: seq.length, seq: seq.filter((s, i) => i < 3 || i % 8 === 0 || s.escondido !== seq[Math.max(0, i - 1)].escondido || s.fecho !== antes.fecho), seq_completa: seq, navegacoes_novos: novos, primeira_mudanca_de_escondido: (() => { const i = seq.findIndex((s) => s.escondido === true); return i < 0 ? null : seq[i]; })(), primeiro_instante_do_fecho: (() => { const i = seq.findIndex((s) => s.fecho !== antes.fecho); return i < 0 ? null : seq[i]; })() };
})()`, 90000);

const CELULAS = [];
for (const par of [[/^admin$/i, /professor/i, 'o caso que a P105 chumbou'], [/^admin$/i, /dire/i, 'controlo: a P107 apanhou aqui o fecho do modulo'], [/^admin$/i, /coordena/i, 'controlo 2: outra vista fora do mapa']]) {
  const c = { origem: (rotulos[idx(par[0])] || {}).rot, alvo: (rotulos[idx(par[1])] || {}).rot, motivo_da_escolha: par[2] };
  try {
    await vai(par[0]);
    const a = await abre();
    c.aberto_na_origem = a.aberto === true && a.escondido === false;
    if (!c.aberto_na_origem) { c.bloqueado = 'o painel nao abriu na origem: ' + JSON.stringify(a); CELULAS.push(c); continue; }
    c.sonda = await SONDA();
    c.am = await amostraTroca(idx(par[1]));
    const med = {
      antes_escondido: c.am.antes.escondido, depois_escondido: c.am.depois.escondido,
      identidade_fecho_antes: c.am.antes.fecho, identidade_fecho_depois: c.am.depois.fecho,
      navegacoes_nesta_celula: (c.am.navegacoes_novos || []).length,
    };
    c.medida = med;
    c.actor = actorDoFecho(med);
    c.navegacoes = c.am.navegacoes_novos;
    c.vista_no_instante_da_primeira_escondida = (c.am.primeira_mudanca_de_escondido || {}).vista ?? null;
    c.t_ms_da_primeira_escondida = (c.am.primeira_mudanca_de_escondido || {}).t ?? null;
    c.t_ms_do_primeiro_fecho = (c.am.primeiro_instante_do_fecho || {}).t ?? null;
    c.vista_final = (c.am.seq_completa[c.am.seq_completa.length - 1] || {}).vista;
    c.seccao_final = (c.am.seq_completa[c.am.seq_completa.length - 1] || {}).seccao;
  } catch (e) { c.erro = String(e && e.message || e).split('\n')[0].slice(0, 240); }
  CELULAS.push(c);
  console.log(`${c.origem} -> ${c.alvo}: aberto_antes=${c.aberto_na_origem} actor=${c.actor} escondido_antes=${c.medida ? c.medida.antes_escondido : '?'} depois=${c.medida ? c.medida.depois_escondido : '?'} fecho_antes=${c.am ? c.am.antes.fecho : '?'} fecho_depois=${c.am ? c.am.depois.fecho : '?'} navegacoes=${(c.navegacoes || []).length} t_esconde=${c.t_ms_da_primeira_escondida} t_fecho=${c.t_ms_do_primeiro_fecho} vista_final=${c.vista_final} seccao_final=${c.seccao_final}${c.erro ? ' ERRO ' + c.erro : ''}`);
}

const porActor = {};
for (const c of CELULAS) porActor[c.actor || (c.erro ? 'erro' : 'bloqueado')] = (porActor[c.actor || (c.erro ? 'erro' : 'bloqueado')] || 0) + 1;
out = {
  programa: 'scripts/p108-actor-do-fecho-na-troca-no-ar.mjs', em: new Date().toISOString(), duracao_ms: 0, url: URL_APP,
  pergunta: 'quem esconde o painel municipal na troca de vista: o fecho do modulo ou o switchView do shell?',
  ar: { md5: MD5, bytes: Buffer.byteLength(shellTxt), view_id: VIEW_ID },
  sonda: { instalacao: instalação, metodo: 'Proxy sobre window.BFR_APP_RUNTIME para os navigates; WeakMap para a identidade do objecto ultimoFecho; amostragem a 20 ms dentro da pagina' },
  por_que_esta_peca_exists: 'a P105 leu ULTIMO_FECHO (global) como se fosse a medida da celula: na celula Professor a P107 nao registou fecho nenhum nem um navigate, e o painel acabou escondido',
  p107_relida: { url_md5_na_p107: P107.ar ? P107.ar.md5 : null, celulas: (P107.celulas || []).length, professora_navegacoes: ((P107.celulas || [])[0] || {}).navigate_log ? ((P107.celulas || [])[0] || {}).navigate_log.length : null },
  celulas: CELULAS, por_actor: porActor,
  o_que_esta_peca_nao_prova: 'prova o actor e o instante nesta sessao; nao prova o que o produto DEVERIA fazer — isso e decisao com OK dele',
};
out.duracao_ms = Date.now() - t0;
out.excecoes = excecoes.slice(0, 12);
out.veredito = 'P108_ACTOR_DO_FECHO_MEDIDO ' + CELULAS.length + '/3 celulas · ' + JSON.stringify(porActor);
fecho = true;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const L = [
  out.veredito,
  ...CELULAS.map((c) => `${c.origem}->${c.alvo}: actor=${c.actor || (c.erro ? 'erro' : 'bloqueado')} navegacoes=${(c.navegacoes || []).length} t_esconde=${c.t_ms_da_primeira_escondida} t_fecho=${c.t_ms_do_primeiro_fecho} fecho_antes/depois=${c.am ? c.am.antes.fecho + '/' + c.am.depois.fecho : '-'}`),
  `excecoes=${out.excecoes.length} · ${out.duracao_ms} ms`,
];
writeFileSync(TXT, L.join('\n') + '\nnode_exit=0\n');
console.log(L.join('\n'));
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
process.exit(0);
