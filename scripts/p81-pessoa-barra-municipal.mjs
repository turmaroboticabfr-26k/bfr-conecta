#!/usr/bin/env node
// P81 — A ENTRADA MUNICIPAL POR PESSOA DA BARRA DE PERSONAS (21/11, noite).
// O print diz «só a secretaria da escola»: o usuário está na barra de personas (10 botões `.role-toggle`, medida
// na P75) e procura ali a secretaria MUNICIPAL. A P75 respondeu pela sessão (papel da conta); esta peça percorre
// as PESSOAS da barra, uma a uma, e mede o que cada uma faz com a entrada: quantas cópias no DOM, quantas
// visíveis, o que `aptoParaSessao()` responde e o que o mapa vivo diz dessa view. Só-leitura: 0 DDL, 0 deploy,
// 0 escrita de produto; a única rede privilegiada é o refresh da cadeia de teste.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${DIR}/p81-pessoa-barra-municipal-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usa outro sufixo, nunca por cima');
const PORT = parseInt(process.env.AH2_PORT || '9403', 10);
const PAPEL = (process.env.P81_PAPEL || 'developer').trim();
const SESSAO = process.env.AH2_SESSAO || `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${PAPEL}.json`;
const LARG = parseInt(process.env.P81_LARGURA || '1366', 10);
const ALT = parseInt(process.env.P81_ALTURA || '768', 10);
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

// ——— predicações puras + fixture que prova que discriminam ———
const entradaVisivel = (navs) => navs.filter((n) => n.w > 0 && n.h > 0 && !n.hidden).length;
// A visibilidade é decidida pelo mapa da SESSÃO (papel da conta), não pela persona activa: medir 10 personas com
// o mapa indexado pela persona deu 10/10 vermelhos porque `pf.viewRole` não existe nesta build (veio null) e,
// indexado pela persona certa, daria vermelho legítimo em 9 personas — a régua tem de perguntar ao papel da
// sessão e tratar o modo professor como desvio medido, não como exceção lembrada.
const viewDaSessao = (papel) => (papel === 'developer' ? 'admin' : papel === 'pedagogical' ? 'teacher' : papel === 'social_work' ? 'multiprofessional' : papel);
const bateComMapaDaSessao = (visiveis, mapa, papelSessao, teacherMode) => {
  if (!mapa || papelSessao == null) return null;
  const esperado = mapa[viewDaSessao(papelSessao)];
  if (esperado === undefined || esperado === null) return null;
  if (teacherMode === true) return null;
  return (visiveis > 0) === esperado;
};
if (viewDaSessao('developer') !== 'admin' || viewDaSessao('secretary') !== 'secretary' || viewDaSessao('education_supervisor') !== 'education_supervisor') throw new Error('ABORTA: viewDaSessao não discrimina os papéis no fixture');
if (bateComMapaDaSessao(1, { admin: true }, 'developer', false) !== true) throw new Error('ABORTA: bateComMapaDaSessao chumba o caso correto');
if (bateComMapaDaSessao(1, { admin: false }, 'developer', false) !== false) throw new Error('ABORTA: bateComMapaDaSessao aceita entrada visível com mapa a negar');
if (bateComMapaDaSessao(1, { admin: true }, 'developer', true) !== null || bateComMapaDaSessao(1, null, 'developer', false) !== null || bateComMapaDaSessao(1, { admin: true }, null, false) !== null) throw new Error('ABORTA: bateComMapaDaSessao não devolve null nos três casos sem régua');
if (entradaVisivel([{ w: 192, h: 56, hidden: false }, { w: 0, h: 0, hidden: true }]) !== 1) throw new Error('ABORTA: entradaVisivel não discrimina as duas cópias no fixture');
if (entradaVisivel([{ w: 0, h: 0, hidden: true }]) !== 0) throw new Error('ABORTA: entradaVisivel conta uma cópia escondida');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P81_SELFTESTE_OK 5/0 — entradaVisivel (2 casos), viewDaSessao e bateComMapaDaSessao (3 casos) discriminam nos fixtures (0 rede, 0 chrome)');
  process.exit(0);
}

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = md5(shellTxt);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD = iniMod === -1 ? '' : shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1] || 'secretaria-municipal';
const PAPEIS_MUN = [...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(MOD) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (!PAPEIS_MUN.length) throw new Error('ABORTA: sem PAPEIS_MUNICIPAIS nos bytes servidos');

const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);
const renova = async () => {
  for (let n = 0; n < 4; n++) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { S[PAPEL] = { ...S[PAPEL], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); return j; }
    if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) throw new Error('CADEIA QUEIMADA em ' + PAPEL + ': precisa de re-login com OK, não desta peça');
    await new Promise((rz) => setTimeout(rz, 2500 * (n + 1)));
  }
  throw new Error('refresh ' + PAPEL + ' falhou 4x');
};
const tok = await renova();

const PERFIL = `${DIR}/.p81-perfil-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARG},${ALT}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
let out = {}; let fecho = false;
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true, papel: PAPEL }, null, 2) + '\n'); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, 'watchdog 240 s'), 240000);

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
  const de = document.documentElement;
  const navs = [...document.querySelectorAll('[data-bfr-municipal-nav]')].map((b) => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), hidden: b.classList.contains('hidden'), pai: String((b.parentElement && b.parentElement.className) || '').slice(0, 40), aptoAttr: b.dataset.munApto || null, ariaCurrent: b.getAttribute('aria-current') || null }; });
  const rt = window.BFR_APP_RUNTIME || {}; const pf = window.BFR_CURRENT_PROFILE || {}; const M = window.BFR_MUNICIPAL || null;
  const vista = document.getElementById('bfrMunicipalView');
  const personaAtiva = [...document.querySelectorAll('.role-toggle button')].find((b) => b.classList.contains('active'));
  return {
    apresentacao: (document.getElementById('appShell') || {}).dataset ? (document.getElementById('appShell').dataset.presentation || null) : null,
    pessoa_rotulo: personaAtiva ? String(personaAtiva.textContent || '').trim().slice(0, 22) : null,
    persona_ativa_view: personaAtiva ? (personaAtiva.dataset.view || personaAtiva.dataset.role || personaAtiva.dataset.section || null) : null,
    papel_sessao: pf.role || null, view_role_sessao: pf.viewRole || pf.view_role || null, active_view: rt.activeView || null,
    body_classes: String(document.body.className).slice(0, 140), teacher_mode: document.body.classList.contains('teacher-mode'),
    mapa_vivo_para_a_view: rt.roleSectionAccess && pf.role !== undefined ? Object.fromEntries(Object.entries(rt.roleSectionAccess).map(([k, v]) => [k, Array.isArray(v) ? v.includes('${SECT}') : null])) : null,
    apto: M ? M.aptoParaSessao() : null,
    navs, navs_no_dom: navs.length,
    sidebar_display: document.querySelector('.sidebar') ? getComputedStyle(document.querySelector('.sidebar')).display : null,
    gaveta_movel: (() => { const d = document.getElementById('bfrMobileDrawer'); return d ? { is_open: d.classList.contains('is-open'), links: d.querySelectorAll('[data-bfr-drawer-route]').length, tem_municipal: [...d.querySelectorAll('[data-bfr-drawer-route]')].some((b) => b.dataset.bfrDrawerRoute === '${SECT}') } : null; })(),
    vista: vista ? { display: getComputedStyle(vista).display, chars: String(vista.innerText || '').length, abas: vista.querySelectorAll('[data-mun-tab]').length } : null
  };
})()`;

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', { width: LARG, height: ALT, deviceScaleFactor: 1, mobile: false }, 20000);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 40; i++) { if (await E("!!document.querySelector('[data-bfr-municipal-nav]')")) break; await new Promise((r) => setTimeout(r, 500)); }
await E(`(() => { localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user }))}); return 1; })()`);
await send('Page.navigate', { url: URL_APP }, 60000);
for (let i = 0; i < 80; i++) { if (await E('!!(window.BFR_MUNICIPAL && document.getElementById("appShell"))')) break; await new Promise((r) => setTimeout(r, 500)); }
await espera(2500);
await E(`(() => { const n = [...document.querySelectorAll('button, a')].find((b) => /agora nao|agora não/i.test(String(b.textContent || '').trim())); if (n) n.click(); return !!n; })()`);
await espera(1000);

const rotulos = await E(`[...document.querySelectorAll('.role-toggle button')].map((b,i) => ({ i, rot: String(b.textContent || '').trim().slice(0,22), view: b.dataset.view || b.dataset.role || b.dataset.section || null }))`);
const pessoas = [];
for (const r of rotulos) {
  const clicado = await E(`(() => { const b = document.querySelectorAll('.role-toggle button')[${r.i}]; if (!b) return false; const rect = b.getBoundingClientRect(); b.click(); return { clicado: true, rotulo: String(b.textContent || '').trim().slice(0,22), x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) }; })()`);
  await espera(1800);
  const s = await E(SNAP);
  pessoas.push({ rotulo: r.rot, view_declarada: r.view, clique: clicado, leitura: s, visiveis: entradaVisivel(s.navs), bate_com_o_mapa: bateComMapaDaSessao(entradaVisivel(s.navs), s.mapa_vivo_para_a_view, s.papel_sessao, s.teacher_mode) });
  console.log(`${String(r.rot).padEnd(14)} view=${String(s.active_view).padEnd(20)} papel_sessao=${String(s.papel_sessao).padEnd(20)} navs_dom=${s.navs_no_dom} visiveis=${entradaVisivel(s.navs)} teacher_mode=${s.teacher_mode} mapa_sessao=${s.mapa_vivo_para_a_view ? String(s.mapa_vivo_para_a_view[viewDaSessao(s.papel_sessao)]) : '-'} painel=${s.vista ? s.vista.chars + 'B/' + s.vista.abas + 'abas' : '-'}`);
}

// Degrau final: a persona que o usuário usa quando diz «só a secretaria da escola». Se a entrada está visível
// aqui, o clique nela tem de pintar o painel — é a pergunta dele, não uma pergunta minha.
const idxSecretaria = rotulos.findIndex((r) => /secretaria/i.test(r.rot));
let passoSecretaria = null;
if (idxSecretaria >= 0) {
  await E(`(() => { const b = document.querySelectorAll('.role-toggle button')[${idxSecretaria}]; if (b) b.click(); return !!b; })()`);
  await espera(1800);
  const antes = await E(SNAP);
  const vis = entradaVisivel(antes.navs);
  const clicou = await E(`(() => { const b = [...document.querySelectorAll('[data-bfr-municipal-nav]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.classList.contains('hidden'); }); if (!b) return { clicado: false }; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)); b.click(); return { clicado: true, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), hit: el ? el.tagName + '.' + String(el.className || '').slice(0, 40) : null, e_o_proprio: !!(el && (el === b || b.contains(el))) }; })()`);
  await espera(4000);
  const depois = await E(SNAP);
  passoSecretaria = { rotulo_persona: rotulos[idxSecretaria].rot, entrada_visiveis_antes: vis, clique: clicou, antes, depois };
  console.log(`persona «${rotulos[idxSecretaria].rot}»: entrada_visiveis=${vis} clique=${JSON.stringify(clicou)} painel_depois=${depois.vista ? depois.vista.chars + 'B/' + depois.vista.abas + 'abas display=' + depois.vista.display : '-'}`);
}

fecho = true;
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}

const falhas = [];
if (pessoas.length < 2) falhas.push(`a barra de personas nao tinha pessoas suficientes | pessoas=${pessoas.length}`);
for (const p of pessoas) if (p.bate_com_o_mapa === false) falhas.push(`entrada visivel nao bate com o mapa da sessao | pessoa=${p.rotulo} visiveis=${p.visiveis} esperado=${p.leitura.mapa_vivo_para_a_view ? p.leitura.mapa_vivo_para_a_view[viewDaSessao(p.leitura.papel_sessao)] : null} papel_sessao=${p.leitura.papel_sessao} view_sessao=${viewDaSessao(p.leitura.papel_sessao)}`);
const teacher = pessoas.filter((p) => p.leitura.teacher_mode === true);
if (!teacher.length) falhas.push(`nenhuma pessoa deu teacher_mode medido, logo a excecao do modo professor nao esta exercida nesta corrida | teacher=${teacher.length}`);
if (!passoSecretaria) falhas.push('a persona «Secretaria» nao estava na barra, o passo final nao pode correr');
else if (passoSecretaria.entrada_visiveis_antes < 1) falhas.push(`na persona Secretaria a entrada nao esta visivel | visiveis=${passoSecretaria.entrada_visiveis_antes} mapa=${JSON.stringify(passoSecretaria.antes.mapa_vivo_para_a_view)}`);
else if (!(passoSecretaria.depois.vista && passoSecretaria.depois.vista.display === 'block' && passoSecretaria.depois.vista.abas > 0)) falhas.push(`o clique na entrada a partir da persona Secretaria nao pintou o painel | clique=${JSON.stringify(passoSecretaria.clique)} antes=${JSON.stringify(passoSecretaria.antes.vista)} depois=${JSON.stringify(passoSecretaria.depois.vista)}`);
out = {
  programa: 'scripts/p81-pessoa-barra-municipal.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'quando troco de pessoa na barra de personas, a entrada «Secretaria Municipal» aparece ou desaparece — e quem decide?',
  metodo: `chrome headless ${LARG}x${ALT}, sessao do papel ${PAPEL}; percorre cada botao .role-toggle, clique real, e pergunta ao modulo servido (aptoParaSessao) e ao mapa vivo (roleSectionAccess) indexado pelo papel da SESSAO; o modo professor e tratado como desvio medido. Zero DDL, zero deploy, zero escrita de produto.`,
  ar: { url: URL_APP, md5_servido: MD5, sect: SECT, papeis_municipais_lidos_dos_bytes: PAPEIS_MUN },
  papel: PAPEL, banda: `${LARG}x${ALT}`, pessoas, passoSecretaria, excecoes: excecoes.slice(0, 8),
  o_que_este_verde_nao_autoriza: 'Prova o estado da ENTRADA por pessoa nesta sessao; nao prova numeros do painel nem autoriza publicar, DDL, concessao municipal ou mudar PAPEIS_MUNICIPAIS.',
  falhas,
};
out.veredito = falhas.length === 0 ? `P81_PESSOA_BARRA_MUNICIPAL_OK ${pessoas.length} pessoas` : `P81_PESSOA_BARRA_MUNICIPAL_VERMELHO ${pessoas.length} pessoas ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
