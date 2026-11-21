#!/usr/bin/env node
// P100 — A CAIXA VAZA ESTÁ ESCONDIDA NO AR, E QUEM MANTÉM A ENTRADA? (21/11, tarde)
//
// A P81 mediu, na v140, a entrada municipal a 0x0 com `hidden=false` na persona «Professor» (célula guardada em
// `evidence/p81-pessoa-barra-municipal-21-11-ar-v140-b.json`). A v141 publicou o remendo: `aplicarVisibilidade()`
// passou a casar a decisão da sessão com a regra do shell indexada por `activeView`. Esta peça mede o AR, célula a
// célula, e exige a concordância dos três lados: o que o DOM mostra, o que o módulo servido decide
// (`aptoParaVista()`) e o que o mapa vivo do shell diz dessa vista. Não amacia régua nenhuma da P81 — a P81 fica
// vermelha porque a régua dela pergunta ao papel da SESSÃO, que era precisamente a causa nomeada pela P89.
//
// Só-leitura: 0 DDL, 0 escrita no banco, 0 deploy, 0 publicação. A única rede privilegiada é o refresh da cadeia
// de teste; cada caminho de saída escreve o parcial.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p100-caixa-vazia-escondida-no-ar-21-11-${SUF}.json`;
const TXT = `${REPO}/evidence/p100-caixa-vazia-escondida-no-ar-21-11-${SUF}.txt`;
if ([OUT, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto já existe — corre com SUF novo, nunca por cima');
const ANTES = `${REPO}/evidence/p81-pessoa-barra-municipal-21-11-ar-v140-b.json`;
const DEPOIS = `${REPO}/evidence/p81-pessoa-barra-municipal-21-11-ar-v141-c.json`;
const ESP = JSON.parse(readFileSync(`${REPO}/worker-deploy-v141-caixa-vazia/esperado-v141.json`, 'utf8'));
const PORT = parseInt(process.env.AH2_PORT || '9407', 10);
const PAPEL = (process.env.P100_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const LARG = parseInt(process.env.P100_LARGURA || '1366', 10);
const ALT = parseInt(process.env.P100_ALTURA || '768', 10);
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const t0 = Date.now();
// Teto do watchdog: o mesmo percurso da P81 (10 células + degraus finais) mediu 98 517 ms; 3x de margem com o
// medido e o teto declarados no artefacto, porque um teto fixo sem prova é o que mata filho legítimo.
const TETO_MS = 300000;

// ——— predicações puras, com os dois lados provados ———
// A régua NÃO pode receber o mapa vivo como array: o mapa vivo é lido como vistas→booleano (foi o erro da 1.ª
// corrida: `[...(mapa.admin || [])]` rebentou porque `mapa.admin` era `true`). O esperado deriva dos bytes:
// `registar()` acrescenta SECT exatamente às chaves de PAPEIS_MUNICIPAIS, logo a vista autorizada é essa lista.
const dentroDoMapa = (mapa, vista, sect) => {
  if (!mapa || !vista || !Array.isArray(mapa[vista])) return null;
  return mapa[vista].includes(sect);
};
const esperadoPelosBytes = (papeisMun, vista, aptoSessao) => {
  if (!Array.isArray(papeisMun) || !vista || aptoSessao === null || aptoSessao === undefined) return null;
  return papeisMun.includes(vista) && aptoSessao === true;
};
const copiaVisivel = (c) => c.w > 0 && c.h > 0 && c.oculto_pela_classe === false && c.display !== 'none';
const soEscondidas = (navs) => navs.length > 0 && navs.every((c) => c.oculto_pela_classe === true && c.display === 'none' && c.w === 0 && c.h === 0);
if (dentroDoMapa({ admin: ['x'], teacher: [] }, 'admin', 'x') !== true) throw new Error('ABORTA: dentroDoMapa chumba a vista que contem a secao');
if (dentroDoMapa({ admin: ['x'], teacher: [] }, 'teacher', 'x') !== false) throw new Error('ABORTA: dentroDoMapa da verde a uma vista sem a secao');
if (dentroDoMapa({ parent: ['x'] }, 'sem_chave', 'x') !== null) throw new Error('ABORTA: dentroDoMapa trata vista sem chave como visivel');
if (esperadoPelosBytes(['admin'], 'admin', true) !== true) throw new Error('ABORTA: esperadoPelosBytes chumba a vista registada com sessao apta');
if (esperadoPelosBytes(['admin'], 'teacher', true) !== false) throw new Error('ABORTA: esperadoPelosBytes da verde a vista fora do registo');
if (esperadoPelosBytes(['admin'], 'admin', false) !== false) throw new Error('ABORTA: esperadoPelosBytes ignora a decisao da sessao');
if (esperadoPelosBytes(['admin'], 'admin', null) !== null) throw new Error('ABORTA: esperadoPelosBytes nao devolve null sem apto medido');
if (copiaVisivel({ w: 192, h: 56, oculto_pela_classe: false, display: 'block' }) !== true) throw new Error('ABORTA: copiaVisivel chumba a copia visivel');
if (copiaVisivel({ w: 0, h: 0, oculto_pela_classe: true, display: 'none' }) !== false) throw new Error('ABORTA: copiaVisivel conta uma copia escondida');
if (soEscondidas([{ w: 0, h: 0, oculto_pela_classe: true, display: 'none' }]) !== true) throw new Error('ABORTA: soEscondidas nao reconhece a caixa escondida');
if (soEscondidas([{ w: 0, h: 0, oculto_pela_classe: false, display: 'block' }]) !== false) throw new Error('ABORTA: soEscondidas da verde a uma caixa 0x0 visivel — e esse era o sintoma da v140');
if (soEscondidas([]) !== false) throw new Error('ABORTA: soEscondidas passa com zero copias (regua vacua)');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P100_SELFTESTE_OK 12/0 — dentroDoMapa (3), esperadoPelosBytes (4), copiaVisivel (2), soEscondidas (3, incluido o 0x0 visivel da v140); 0 rede, 0 chrome');
  process.exit(0);
}

// ——— os bytes do ar: proveniência, mapa estático, regra do shell e as duas agulhas ———
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const MD5 = md5(shellTxt);
if (MD5 !== ESP.htmlMd5 || Buffer.byteLength(shellTxt) !== ESP.htmlBytes) throw new Error('ABORTA: o ar nao e a v141 certificada — medido ' + MD5 + '/' + Buffer.byteLength(shellTxt) + ', esperado ' + ESP.htmlMd5 + '/' + ESP.htmlBytes);
const REF = [...new Set([...shellTxt.matchAll(/https:\/\/([a-z0-9]{16,})\.supabase\.co/g)].map((m) => m[1]))];
if (REF.length !== 1) throw new Error('ABORTA: ' + REF.length + ' refs supabase nos bytes servidos — o storage key da sessao nao se resolve');
const iniMap = shellTxt.indexOf('roleSectionAccess');
const iniBrace = shellTxt.indexOf('{', iniMap);
let nivel = 0, fimBrace = -1;
for (let i = iniBrace; i < shellTxt.length; i++) { const c = shellTxt[i]; if (c === '{') nivel++; else if (c === '}') { nivel--; if (nivel === 0) { fimBrace = i; break; } } }
if (iniMap === -1 || fimBrace === -1) throw new Error('ABORTA: sem mapa `roleSectionAccess` nos bytes do ar — nao ha regra independente para comparar');
const MAPA_ESTATICO = Object.fromEntries([...shellTxt.slice(iniBrace, fimBrace + 1).matchAll(/([a-z_]+)\s*:\s*\[([^\]]*)\]/g)].map((m) => [m[1], [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])]));
if (Object.keys(MAPA_ESTATICO).length < 5) throw new Error('ABORTA: ' + Object.keys(MAPA_ESTATICO).length + ' vistas no mapa estatico — a comparacao seria vacua');
const linhaShell = (shellTxt.split('\n').find((l) => /const allowed = viewRole === 'admin'/.test(l)) || '').trim();
const EXTRAS_SHELL = [...new Set([...linhaShell.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).filter((x) => x !== 'admin'))];
const TEM_QUEDA_PARENT = /roleSectionAccess\.parent/.test(linhaShell);
if (EXTRAS_SHELL.length !== 2 || !TEM_QUEDA_PARENT) throw new Error('ABORTA: nao extraí a regra do shell (extras=' + JSON.stringify(EXTRAS_SHELL) + ' parent=' + TEM_QUEDA_PARENT + ')');
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD = iniMod === -1 ? '' : shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1];
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD) || [])[1];
const PAPEIS_MUN = [...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(MOD) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (!SECT || !VIEW_ID || !PAPEIS_MUN.length) throw new Error('ABORTA: SECT/VIEW_ID/PAPEIS_MUNICIPAIS nao resolvidos dos bytes servidos');
const REGUA_NOVA = 'const mostrar = veredito.apto && vista.visivel;';
const REGUA_VELHA = "b.classList.toggle('hidden', !veredito.apto);";
const contagemNoModulo = { nova: n(MOD, REGUA_NOVA), velha: n(MOD, REGUA_VELHA), func: n(MOD, 'function aptoParaVista()') };

const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const renova = async () => {
  for (let k = 0; k < 4; k++) {
    const r = await fetch(`https://${REF[0]}.supabase.co/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1], Authorization: `Bearer ${(/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1]}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { S[PAPEL] = { ...S[PAPEL], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); return j; }
    if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) throw new Error('CADEIA QUEIMADA em ' + PAPEL + ': precisa de re-login com OK, nao desta peca');
    await new Promise((rz) => setTimeout(rz, 2500 * (k + 1)));
  }
  throw new Error('refresh ' + PAPEL + ' falhou 4x');
};
const tok = await renova();

const PERFIL = `${REPO}/.p100-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARG},${ALT}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
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

const SNAP = `(() => {
  const rt = window.BFR_APP_RUNTIME || {}; const M = window.BFR_MUNICIPAL || null;
  const navs = [...document.querySelectorAll('[data-bfr-municipal-nav]')].map((b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), oculto_pela_classe: b.classList.contains('hidden'), display: cs.display, munApto: b.dataset.munApto || null, munVista: b.dataset.munVista || null }; });
  const raiz = document.getElementById('${VIEW_ID}');
  const persona = [...document.querySelectorAll('.role-toggle button')].find((b) => b.classList.contains('active'));
  return {
    rotulo_persona: persona ? String(persona.textContent || '').trim().slice(0, 22) : null,
    active_view: rt.activeView || null, papel_sessao: (rt.profile || {}).role || null,
    decisao_modulo: M && M.aptoParaVista ? M.aptoParaVista() : null,
    apto_sessao: M && M.aptoParaSessao ? M.aptoParaSessao().apto : null,
    mapa_vivo: rt.roleSectionAccess ? Object.fromEntries(Object.entries(rt.roleSectionAccess).map(([k, v]) => [k, Array.isArray(v) ? v.includes('${SECT}') : null])) : null,
    navs, copias_no_dom: navs.length,
    painel: raiz ? { display: getComputedStyle(raiz).display, chars: String(raiz.innerText || '').length, abas: raiz.querySelectorAll('[data-mun-tab]').length } : null
  };
})()`;

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', { width: LARG, height: ALT, deviceScaleFactor: 1, mobile: false }, 20000);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 40; i++) { if (await E("!!document.querySelector('[data-bfr-municipal-nav]')")) break; await new Promise((r) => setTimeout(r, 500)); }
await E(`(() => { localStorage.setItem('sb-${REF[0]}-auth-token', ${JSON.stringify(JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user }))}); return 1; })()`);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 80; i++) { if (await E('!!(window.BFR_MUNICIPAL && window.BFR_APP_RUNTIME && document.getElementById("appShell"))')) break; await new Promise((r) => setTimeout(r, 500)); }
await espera(2500);
await E(`(() => { const f = [...document.querySelectorAll('button, a')].find((b) => /agora nao|agora não/i.test(String(b.textContent || '').trim())); if (f) f.click(); return !!f; })()`);
await espera(1000);

const rotulos = await E(`[...document.querySelectorAll('.role-toggle button')].map((b, i) => ({ i, rot: String(b.textContent || '').trim().slice(0, 22), view: b.dataset.view || b.dataset.role || b.dataset.section || null }))`);
const vaiCelula = async (i) => { await E(`(() => { const b = document.querySelectorAll('.role-toggle button')[${i}]; if (b) b.click(); return !!b; })()`); await espera(1800); return await E(SNAP); };

const celulas = [];
for (const r of rotulos) {
  const s = await vaiCelula(r.i);
  const visiveis = s.navs.filter(copiaVisivel).length;
  const esperado = esperadoPelosBytes(PAPEIS_MUN, s.active_view, s.apto_sessao);
  const mod = s.decisao_modulo ? s.decisao_modulo.visivel === true : null;
  const vivoComSect = Object.entries(s.mapa_vivo || {}).filter(([, v]) => v === true).map(([k]) => k).sort();
  celulas.push({ rotulo: s.rotulo_persona, view_declarada_na_barra: r.view, active_view: s.active_view, copias_no_dom: s.copias_no_dom, visiveis, esperado_pelos_bytes: esperado, dentro_no_mapa_vivo: (s.mapa_vivo || {})[s.active_view] === true, mapa_vivo_com_sect: vivoComSect, decisao_do_modulo: mod, munVista: s.navs.map((c) => c.munVista).join(','), munApto: s.navs.map((c) => c.munApto).join(','), celula: s.navs.map((c) => `${c.w}x${c.h}${c.oculto_pela_classe ? '/hid' : '/vis'}/${c.display}`), painel: s.painel });
  console.log(`${String(s.rotulo_persona).padEnd(13)} view=${String(s.active_view).padEnd(20)} copias=${s.copias_no_dom} visiveis=${visiveis} esperado=${esperado} mapa_vivo=${celulas[celulas.length - 1].dentro_no_mapa_vivo} modulo=${mod} munVista=[${s.navs.map((c) => c.munVista).join(',')}] apto_sessao=${s.apto_sessao}`);
}

// Degrau do acesso preservado: a vista que o mapa autoriza tem de ter entrada visível E clique que pinte painel.
const idxDentro = celulas.findIndex((c) => c.esperado_pelos_bytes === true);
let passoAutorizada = null;
if (idxDentro >= 0) {
  const antes = await vaiCelula(rotulos[idxDentro].i);
  const clicou = await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none'; }); if (!b) return { clicado: false }; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); b.click(); return { clicado: true, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), hit: el ? el.tagName + '.' + String(el.className || '').slice(0, 40) : null, e_o_proprio: !!(el && (el === b || b.contains(el))) }; })()`);
  await espera(4000);
  const depois = await E(SNAP);
  passoAutorizada = { rotulo: celulas[idxDentro].rotulo, antes, clique: clicou, depois };
  console.log(`vista authorizada «${celulas[idxDentro].rotulo}»: visiveis=${antes.navs.filter(copiaVisivel).length} clique=${JSON.stringify(clicou)} painel_depois=${JSON.stringify(depois.painel)}`);
}

// Degrau da reversibilidade + observação do painel aberto: trocar para uma vista fora do mapa esconde a entrada
// sem destruir nada; voltar torna a mostrá-la. O que fica aberto é o painel — observa-se, não se prometeu.
let passoTroca = null;
const idxProf = celulas.findIndex((c) => c.active_view === 'teacher');
if (passoAutorizada && idxProf >= 0) {
  const sai = await vaiCelula(rotulos[idxProf].i);
  const vol = await vaiCelula(rotulos[idxDentro].i);
  passoTroca = { saida: { rotulo: celulas[idxProf].rotulo, visiveis: sai.navs.filter(copiaVisivel).length, todas_escondidas: soEscondidas(sai.navs), painel: sai.painel, munVista: sai.navs.map((c) => c.munVista).join(',') }, volta: { visiveis: vol.navs.filter(copiaVisivel).length, painel: vol.painel } };
  console.log(`troca para «${celulas[idxProf].rotulo}»: visiveis=${passoTroca.saida.visiveis} todas_escondidas=${passoTroca.saida.todas_escondidas} painel=${JSON.stringify(sai.painel)} | volta: visiveis=${passoTroca.volta.visiveis}`);
}

const md5Fim = md5(await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text());
fecho = true;
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}

// Antes/depois por célula: o conjunto de personas tem de ser o mesmo, senão a comparação não é a mesma medida.
const A = JSON.parse(readFileSync(ANTES, 'utf8'));
const B = JSON.parse(readFileSync(DEPOIS, 'utf8'));
const rotA = A.pessoas.map((p) => p.rotulo).sort().join('|');
const rotB = B.pessoas.map((p) => p.rotulo).sort().join('|');
const porCelula = celulas.map((c) => { const a = A.pessoas.find((p) => p.rotulo === c.rotulo); return { rotulo: c.rotulo, copias_dom_antes: a ? a.leitura.navs_no_dom : null, visiveis_antes: a ? a.visiveis : null, visiveis_depois: c.visiveis, escondidas_por_classe_depois: c.celula.filter((s) => /\/hid\//.test(s)).length }; });

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 320)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('S1_ar_medido_e_a_v141_certificada', MD5 === ESP.htmlMd5 && md5Fim === MD5, { medido_ini: MD5, medido_fim: md5Fim, certificado: ESP.htmlMd5, bytes: Buffer.byteLength(shellTxt) });
g('S2_a_regra_do_shell_e_extraida_dos_bytes_dele', EXTRAS_SHELL.length === 2 && TEM_QUEDA_PARENT, { extras: EXTRAS_SHELL, parent: TEM_QUEDA_PARENT, linha: linhaShell.slice(0, 200) });
g('S3_a_regra_velha_saiu_e_a_nova_esta_dos_bytes', contagemNoModulo.nova === 1 && contagemNoModulo.velha === 0 && contagemNoModulo.func === 1, contagemNoModulo);
g('S4_a_barra_de_pessoas_tem_celulas_suficientes_com_view_lida', celulas.length >= 5 && celulas.every((c) => !!c.active_view), { celulas: celulas.length, sem_view: celulas.filter((c) => !c.active_view).map((c) => c.rotulo) });
g('S5_o_DOM_bate_com_os_bytes_e_com_o_mapa_vivo_em_cada_celula', celulas.every((c) => c.esperado_pelos_bytes !== null && (c.visiveis > 0) === c.esperado_pelos_bytes && c.dentro_no_mapa_vivo === c.esperado_pelos_bytes), celulas.map((c) => c.rotulo + ' visiveis=' + c.visiveis + ' bytes=' + c.esperado_pelos_bytes + ' mapa_vivo=' + c.dentro_no_mapa_vivo + ' apto_sessao=' + c.munApto));
g('S6_o_modulo_servido_decide_o_mesmo_que_o_shell_em_cada_celula', celulas.every((c) => c.decisao_do_modulo !== null && c.decisao_do_modulo === (c.esperado_pelos_bytes === true)), celulas.map((c) => c.rotulo + ' modulo=' + c.decisao_do_modulo + ' shell=' + c.esperado_pelos_bytes));
g('S7_uma_copia_visivel_nunca_esta_escondida_e_vice_versa', (() => { for (const c of celulas) { const dentro = c.esperado_pelos_bytes === true; const vista = c.visiveis > 0; if (vista !== dentro) return false; if (vista && !c.celula.some((s) => /\/vis\//.test(s))) return false; if (!vista && c.celula.some((s) => /\/vis\//.test(s))) return false; } return true; })(), celulas.map((c) => c.rotulo + '=' + c.celula.join(' ')));
g('S8_munVista_bate_com_a_decision_em_todas_as_copias', (() => { for (const c of celulas) { const esperado = c.esperado_pelos_bytes === true ? 'dentro' : 'fora'; if (c.munVista.split(',').length !== c.copias_no_dom) return false; if (c.munVista.split(',').some((x) => x !== esperado)) return false; } return true; })(), celulas.map((c) => c.rotulo + ' munVista=' + c.munVista + ' esperado=' + (c.esperado_pelos_bytes === true ? 'dentro' : 'fora')));
g('S9_a_celula_professor_esta_escondida_por_classe_e_display', (() => { const c = celulas.find((x) => x.active_view === 'teacher'); if (!c) return false; const a = A.pessoas.find((p) => p.rotulo === c.rotulo); return c.copias_no_dom >= 1 && c.visiveis === 0 && c.celula.every((s) => /^0x0\/hid\/none$/.test(s)) && a && a.leitura.navs.every((n2) => n2.hidden === false); })(), { depois: (celulas.find((c) => c.active_view === 'teacher') || {}).celula, antes: ((A.pessoas.find((p) => p.rotulo === 'Professor') || {}).leitura || {}).navs });
g('S10_antes_e_depois_sao_a_mesma_medida_por_celula', rotA === rotB && rotB === celulas.map((c) => c.rotulo).sort().join('|') && porCelula.every((c) => c.copias_dom_antes === (B.pessoas.find((p) => p.rotulo === c.rotulo) || {}).leitura.navs_no_dom), { antes_md5: (A.ar || {}).md5_servido, depois_md5: (B.ar || {}).md5_servido, rotulos_antes: A.pessoas.length, rotulos_corrida: celulas.length, divergem: porCelula.filter((c) => c.copias_dom_antes !== ((B.pessoas.find((p) => p.rotulo === c.rotulo) || {}).leitura || {}).navs_no_dom).map((c) => c.rotulo) });
g('S11_a_vista_admin_conserva_a_entrada_e_nenhuma_vista_fora_do_mapa_a_recebeu', (() => { const admin = celulas.find((c) => c.active_view === 'admin'); const estaticoComSect = Object.entries(MAPA_ESTATICO).filter(([, v]) => v.includes(SECT)).map(([k]) => k); return !!admin && admin.visiveis > 0 && estaticoComSect.length === 0 && celulas.filter((c) => c.esperado_pelos_bytes === true).length >= 1; })(), { admin: (celulas.find((c) => c.active_view === 'admin') || {}).celula, vistas_autorizadas_agora: celulas.filter((c) => c.esperado_pelos_bytes === true).map((c) => c.rotulo), sect_no_mapa_estatico: Object.entries(MAPA_ESTATICO).filter(([, v]) => v.includes(SECT)).map(([k]) => k), passaram_a_escondidas_vs_v140: A.pessoas.filter((p) => p.visiveis > 0 && (celulas.find((c) => c.rotulo === p.rotulo) || {}).visiveis === 0).map((p) => p.rotulo) });
g('S12_o_clique_na_vista_authorizada_pinta_o_painel', !!passoAutorizada && passoAutorizada.antes.navs.filter(copiaVisivel).length > 0 && passoAutorizada.clique.clicado === true && passoAutorizada.clique.e_o_proprio === true && !!passoAutorizada.depois.painel && passoAutorizada.depois.painel.display === 'block' && passoAutorizada.depois.painel.abas > 0 && passoAutorizada.depois.painel.chars > 200, { tem: !!passoAutorizada, clique: passoAutorizada && passoAutorizada.clique, painel: passoAutorizada && passoAutorizada.depois.painel });
g('S13_a_escondida_e_apresentacao_reversivel', !!passoTroca && passoTroca.saida.visiveis === 0 && passoTroca.saida.todas_escondidas === true && passoTroca.saida.munVista.split(',').every((x) => x === 'fora') && passoTroca.volta.visiveis > 0, passoTroca);
g('S14_a_sessao_continua_a_decidir_o_apto_e_a_vista_so_a_esconde', celulas.every((c) => c.munApto.split(',').every((x) => x === 'sim')) && celulas.some((c) => c.visiveis === 0), { apto_por_celula: celulas.map((c) => c.rotulo + '=' + c.munApto), alguma_escondida: celulas.some((c) => c.visiveis === 0) });
g('S15_o_mapa_vivo_so_tem_a_secao_nas_chaves_declaradas', celulas.length >= 5 && celulas.every((k) => Array.isArray(k.mapa_vivo_com_sect) && k.mapa_vivo_com_sect.slice().sort().join(',') === PAPEIS_MUN.slice().sort().join(',')), { vivo_com_sect: (celulas[0] || {}).mapa_vivo_com_sect, papeis_municipais_dos_bytes: PAPEIS_MUN, nota: 'se aparecer vista nova, a visibilidade deixou de ser a do shell e esta peca passou a ser o portao' });
g('S16_nenhuma_excecao_js_na_corrida', excecoes.length === 0, excecoes.slice(0, 5));

out = {
  programa: 'scripts/p100-caixa-vazia-escondida-no-ar.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0, teto_ms: TETO_MS,
  pergunta: 'a caixa 0x0 que a P81 mediu visivel na persona Professor esta escondida na v141, e alguma pessoa autorizada perdeu a entrada?',
  metodo: `chrome headless ${LARG}x${ALT}, sessao do papel ${PAPEL}; por cada botao .role-toggle le as duas copias de [data-bfr-municipal-nav] (rect, classe hidden, display computado, munApto, munVista), a decisao viva do modulo (aptoParaVista) e o mapa vivo indexado pela vista; a regra do shell le-se dos bytes servidos, nao da memoria. Clique real na vista authorizada, troca para teacher e volta. Zero DDL, zero deploy, zero publicacao.`,
  ar: { url: URL_APP, md5_servido: MD5, md5_no_fim: md5Fim, bytes: Buffer.byteLength(shellTxt), certificada_em: 'worker-deploy-v141-caixa-vazia/esperado-v141.json', sect: SECT, view_id: VIEW_ID, papeis_municipais: PAPEIS_MUN },
  regra: { extras_admin_lidos_do_shell: EXTRAS_SHELL, queda_em_parent: TEM_QUEDA_PARENT, agulhas_no_modulo: contagemNoModulo, vistas_no_mapa_estatico: Object.keys(MAPA_ESTATICO).length },
  banda: `${LARG}x${ALT}`, papel_sessao: PAPEL, celulas, por_celula_antes_depois: porCelula, passoAutorizada, passoTroca,
  baseline: { antes: 'evidence/p81-pessoa-barra-municipal-21-11-ar-v140-b.json', depois: 'evidence/p81-pessoa-barra-municipal-21-11-ar-v141-c.json', md5_antes: md5(readFileSync(ANTES, 'utf8')), md5_depois: md5(readFileSync(DEPOIS, 'utf8')), veredito_antes: A.veredito, veredito_depois: B.veredito },
  sobre_a_p81_ficar_vermelha: 'A regua `bateComMapaDaSessao` da P81 compara a visibilidade com o papel da SESSAO. Essa era a causa nomeada pela P89, e a v141 mudou-a de proposito: o veredito vermelho da P81-c ja nao descreve um defeito, descreve a regua antiga. Nenhuma linha da P81 foi amaciada — fica vermelha e versionada como esta.',
  o_que_este_verde_nao_autoriza: 'Prova apresentacao por persona nesta sessao de teste. Nao prova os numeros do painel, nao da acesso a nenhuma conta, nao autoriza DDL, concessoes municipais, o rpc como porta, nem reverter PEN-43/44. Publicar seja o que for de novo pede OK literal.',
  excecoes: excecoes.slice(0, 8), falhas,
};
out.veredito = falhas.length === 0 ? 'P100_CAIXA_VAZIA_ESCONDIDA_NO_AR_OK 16/0' : `P100_CAIXA_VAZIA_ESCONDIDA_NO_AR_VERMELHO ${falhas.length} de 16`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\nfalhas=${falhas.length}\n${falhas.join('\n')}\nnode_exit=${falhas.length ? 1 : 0}\n`);
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(REPO + '/', '')}`);
process.exit(falhas.length ? 1 : 0);
