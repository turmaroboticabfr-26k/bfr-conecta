#!/usr/bin/env node
// BU-11 — A PORTA MUNICIPAL EXISTE NO DOM A LARGURAS DE ECRÃ? (só leitura no ar: 0 DDL, 0 deploy, 0 escrita na base)
//
// Existe porque a pergunta do utilizador foi «ainda não acho a aba da secretaria municipal» e as respostas
// disponíveis eram de duas espécies que nenhuma cobre o caso: leitura estática do `roleSectionAccess` (que
// NÃO contém a secção — ela é acrescentada em runtime por `registar()`, já registado em
// docs/auditoria-bfr-conecta.md:4443) e contagens de rotas por papel (ah2-mobile2/sm25), que não trazem o
// `data-mun-apto` nem a caixa do botão. Aqui mede-se o estado vivo: se o botão foi injetado, com que
// `munApto`, com que `display`, em que recipiente, e se o que o DOM mostra bate com o que a própria
// função do módulo decide.
//
// A sessão é renovada do registo local e o par rotacionado é GRAVADO de volta antes de qualquer outra
// coisa: o GoTrue roda o refresh a cada uso, e deitar fora o par novo queima a cadeia do papel (foi
// precisamente o que aconteceu ao developer em 20/11, às 21:36Z). A gravação é verificada por relitura.
//
// Uso: node scripts/bu11-porta-municipal-desktop.mjs <papel> <largura> <rotulo>
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'developer';
const LARGURA = parseInt(process.argv[3] || '1280', 10);
const ROTULO = process.argv[4] || '1';
const ALTO = LARGURA <= 430 ? 720 : 900;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const RAIZ = `${DIR}/bfr-conecta`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ESPERADO = JSON.parse(readFileSync(`${RAIZ}/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`, 'utf8'));
const OUT = `${RAIZ}/evidence/bu11-porta-municipal-desktop-${PAPEL}-${LARGURA}-${ROTULO}.json`;
const PERFIL = `${DIR}/.bu11-${ROTULO}`;
const PORT = parseInt(process.env.BU11_PORT || '9377', 10);
const SECT = 'secretaria-municipal';
const VIEW_ID = 'bfrMunicipalView';
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro rótulo');
const h = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);
const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');

// 1) o ar servido, e as chaves que dele se leem — nunca dactilografadas
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const md5Shell = md5(shellTxt);
const ANON = (shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
const REF = (shellTxt.match(/https:\/\/([a-z0-9]{12,24})\.supabase\.co/) || [])[1];
if (!ANON || !REF) throw new Error('ABORTA: o ar não devolve anon key nem referência — nada é tentado às cegas');
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;

// 2) sessão: renova e grava o par rotacionado em TODOS os registos que têm este papel
const registos = readdirSync(DIR).filter((f) => /^ah2-sess/.test(f) && f.endsWith('.json'))
  .map((f) => `${DIR}/${f}`).filter((p) => { const j = JSON.parse(readFileSync(p, 'utf8')); return j[PAPEL] && j[PAPEL].refresh_token; });
if (!registos.length) throw new Error(`ABORTA: nenhum registo local tem cadeia para ${PAPEL}`);
const antesHash = h(JSON.parse(readFileSync(registos[0], 'utf8'))[PAPEL].refresh_token);
const renova = async () => {
  const corpo = JSON.stringify({ refresh_token: JSON.parse(readFileSync(registos[0], 'utf8'))[PAPEL].refresh_token });
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: corpo, signal: AbortSignal.timeout(45000) });
  const js = await r.json().catch(() => null);
  if (!r.ok || !js?.access_token) throw new Error(`renova HTTP ${r.status}: ${String(js && (js.msg || js.error_description) || '').slice(0, 140)}`);
  for (const p of registos) { const j = JSON.parse(readFileSync(p, 'utf8')); j[PAPEL] = { ...j[PAPEL], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user }; writeFileSync(p, JSON.stringify(j, null, 2) + '\n'); }
  const relido = JSON.parse(readFileSync(registos[0], 'utf8'))[PAPEL];
  if (h(relido.refresh_token) !== h(js.refresh_token)) throw new Error('ABORTA: o par gravado não foi relido igual — não se abre browser com registo incerto');
  return { js, gravados: registos.length, rodou: antesHash !== h(js.refresh_token) };
};
const sess = await renova();
const SESSAO = { access_token: sess.js.access_token, token_type: sess.js.token_type, expires_at: sess.js.expires_at, expires_in: sess.js.expires_in, refresh_token: sess.js.refresh_token, user: sess.js.user };

// 3) chrome
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
const donos = portaOcupada(PORT);
if (donos.size) {
  for (const pid of donos) {
    const dono = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=$pid").Name`], { encoding: 'utf8' });
    const nome = String(dono.stdout || '').trim();
    if (!/chrome/i.test(nome)) throw new Error(`PORTA ${PORT}: o dono (${pid} ${nome || 'desconhecido'}) não é um chrome nosso — muda-se a porta com BU11_PORT`);
    spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { stdio: 'ignore' });
  }
  await new Promise((r) => setTimeout(r, 1200));
}
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTO}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const fecha = (codigo, motivo) => { try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + motivo); process.exit(codigo); };
process.on('unhandledRejection', (e) => fecha(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => fecha(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => fecha(3, 'watchdog 240 s'), 240000);

let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) fecha(1, 'sem alvo page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let fecho = false;
ws.onclose = () => { if (!fecho) fecha(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => fecha(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map(); const consola = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) consola.push((m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 200));
  if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') consola.push('[rede] ' + String(m.params.entry.text || '').slice(0, 180));
};
const PRAZO = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq; const prazo = PRAZO(method);
  const t = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + Math.round(prazo / 1000) + ' s')); } }, prazo);
  pend.set(i, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(t); rej(e); }
});
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (expr, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(expr); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + expr.slice(0, 100)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: URL_APP });
const msLogin = await waitFor("!!document.getElementById('loginScreen')", 60000);
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(SESSAO))})`);
await send('Page.navigate', { url: URL_APP });
const msReady = await waitFor("!!document.getElementById('appShell')?.classList.contains('ready')", 60000);
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTO, deviceScaleFactor: LARGURA <= 430 ? 2 : 1, mobile: LARGURA <= 430 });
await dorme(1500);
// O módulo tenta registar-se durante 30 s (`setTimeout(clearInterval(timer), 30000)`), e a vigília é de 600 ms.
// Espera-se pelo predicate do produtor, não por um cronómetro meu.
let msModulo = null;
try { msModulo = await waitFor(`!!window.BFR_MUNICIPAL && !!document.querySelector('[data-bfr-municipal-nav]')`, 40000); } catch { msModulo = -1; }

// A 390 px a única cópia da porta vive dentro de #mobileMoreMenu, e uma gaveta fechada não tem caixa por
// desenho. BU11_ABRE_GAVETA=1 faz o gesto do utilizador — toque no gatilho do «Mais» — antes da leitura, para
// que «pintada em recipiente aberto» signifique o que o utilizador vê e não o que o CSS esconde.
// O gatilho é escolhido por caixa medida entre três grafias, porque `[data-mobile-more]` é o da barra de
// desktop e a ≤800 px está `display:none`: foi o defeito da corrida 1 deste mesmo instrumento, e o
// ah2-mobile2.mjs:1-9 já o documenta. O que se usou fica registado, com as caixas de todos os candidatos.
let gaveta_aberta_por_toque = null;
if (process.env.BU11_ABRE_GAVETA === '1') {
  const GATILHOS = ['#bfrMobileBottomNav button[data-bfr-mobile-route="more"]', '[data-mobile-more]', '[data-bfr-open-drawer]'];
  const cand = await E(`(() => { const alvos = ${JSON.stringify(GATILHOS)};
    const vistos = alvos.map((s) => { const b = document.querySelector(s); if (!b) return { sel: s, existe: false };
      const r = b.getBoundingClientRect(); const c = getComputedStyle(b);
      return { sel: s, existe: true, disp: c.display, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; });
    return vistos; })()`);
  const bom = cand.find((v) => v.existe && v.w > 0 && v.h > 0) || null;
  if (!bom) { gaveta_aberta_por_toque = { candidatos: cand, gatilho: null, entrou: false, causa: 'nenhum_gatilho_com_caixa' }; }
  else {
    // Rolar antes de exigir o ponto: a mesma razão que o ah2-mobile2 documenta (os últimos itens têm caixa
    // mas ficam fora do viewport, e o toque nesse y não bate em lado nenhum). O hit-test é feito DEPOIS de
    // rolar e ANTES do toque, e o que estiver por cima fica registado em vez de virar vermelho às cegas.
    const alme = await E(`(() => { const b = document.querySelector(${JSON.stringify(bom.sel)}); b.scrollIntoView({ block: 'center', inline: 'center' });
      const r = b.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);
      const topo = document.elementFromPoint(x, y);
      const id = (n) => n ? n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '') : null;
      return { x, y, w: Math.round(r.width), h: Math.round(r.height), no_ecra: x >= 0 && y >= 0 && x <= document.documentElement.clientWidth && y <= document.documentElement.clientHeight,
        no_alvo: topo === b || b.contains(topo), por_cima: id(topo), scroll_y: Math.round(scrollY) }; })()`);
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    let aberta = false;
    if (alme.no_ecra && alme.no_alvo) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: alme.x, y: alme.y }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      try { await waitFor("!document.getElementById('mobileMoreMenu')?.classList.contains('hidden')", 8000); aberta = true; } catch {}
    }
    const depois = await E(`(() => { const menu = document.getElementById('mobileMoreMenu'); const hit = menu ? menu.querySelector('[data-bfr-municipal-nav]') : null;
      const r = hit ? hit.getBoundingClientRect() : null; const c = hit ? getComputedStyle(hit) : null;
      const topo = document.elementFromPoint(${alme.x}, ${alme.y});
      const id = (n) => n ? n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '') : null;
      return { menu_display: menu ? getComputedStyle(menu).display : null, em_cima: id(topo),
        copia: hit ? { disp: c.display, vis: c.visibility, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), rotulo: (hit.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) } : null }; })()`);
    gaveta_aberta_por_toque = { candidatos: cand, gatilho: bom, alvo_do_toque: alme, entrou: !!(alme.no_ecra && alme.no_alvo), aberta, depois_do_toque: depois };
  }
}

const PROBE = `(() => {
  const rt = window.BFR_APP_RUNTIME || {};
  const mapa = rt.roleSectionAccess || {};
  const cs = (e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { disp: c.display, vis: c.visibility, pe: c.pointerEvents, op: c.opacity, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), offsetParent_nulo: e.offsetParent === null }; };
  const nome = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  const botoes = Array.from(document.querySelectorAll('[data-bfr-municipal-nav]')).map((b) => ({
    el: nome(b), host: b.parentElement ? nome(b.parentElement) : null, indice: b.parentElement ? Array.from(b.parentElement.children).indexOf(b) : -1,
    irmaos: b.parentElement ? b.parentElement.children.length : -1, munApto: b.dataset.munApto ?? null, sec: b.dataset.section,
    rotulo: (b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40), dentro_do_mapa: !!(b.closest('.sidebar')), na_gaveta: !!(b.closest('.mobile-more-grid')),
    caixa: cs(b) }));
  const vista = document.getElementById(${JSON.stringify(VIEW_ID)});
  const sidebar = document.querySelector('.sidebar');
  const gaveta = document.getElementById('mobileMoreMenu');
  // Dois recipientes, dois estados de abertura: a cópia dentro de #mobileMoreMenu não tem caixa enquanto a
  // gaveta estiver fechada, e isso NÃO é a porta escondida — é o recipiente fechado. A prédica é por
  // recipiente aberto; a caixa da cópia fechada continua registada, com o estado do pai ao lado.
  const gaveta_aberta = !!gaveta && !gaveta.classList.contains('hidden');
  const sidebar_aberta = !!sidebar && (() => { const c = getComputedStyle(sidebar); const r = sidebar.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 0 && r.height > 0; })();
  let veredito = null, erroFuncao = null;
  try { veredito = window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.aptoParaSessao ? window.BFR_MUNICIPAL.aptoParaSessao() : null; } catch (e) { erroFuncao = String(e.message || e).slice(0, 160); }
  const sonda = window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.sonda ? { feita: sonda_ref().feita, executavel: sonda_ref().executavel, erro: String(sonda_ref().erro || '').slice(0, 160), nota: String(sonda_ref().nota || '').slice(0, 160) } : null;
  function sonda_ref() { return window.BFR_MUNICIPAL.sonda; }
  const botoes2 = botoes.map((b) => ({ ...b, recipiente: b.na_gaveta ? 'gaveta' : 'sidebar', recipiente_aberto: b.na_gaveta ? gaveta_aberta : sidebar_aberta }));
  return {
    viewport: { inner_width: window.innerWidth, doc_client_width: document.documentElement.clientWidth, media_max_800: matchMedia('(max-width: 800px)').matches, dpr: window.devicePixelRatio },
    papel: { runtime_role: (rt.profile || {}).role ?? null, active_view: rt.activeView ?? null, active_section: rt.activeSection ?? null },
    mapa: { chaves: Object.keys(mapa), admin_tem_sect: Array.isArray(mapa.admin) && mapa.admin.includes(${JSON.stringify(SECT)}),
      education_supervisor_tem_sect: Array.isArray(mapa.education_supervisor) && mapa.education_supervisor.includes(${JSON.stringify(SECT)}),
      secretary_tem_sect: Array.isArray(mapa.secretary) && mapa.secretary.includes(${JSON.stringify(SECT)}),
      n_de_admin: Array.isArray(mapa.admin) ? mapa.admin.length : null },
    modulo: { existe: !!window.BFR_MUNICIPAL, sect: window.BFR_MUNICIPAL ? window.BFR_MUNICIPAL.SECT : null,
      papeis: window.BFR_MUNICIPAL ? window.BFR_MUNICIPAL.PAPEIS_MUNICIPAIS : null,
      vista_existe: !!vista, vista_hidden: vista ? vista.classList.contains('hidden') : null, vista_munApto: vista ? (vista.dataset.munApto ?? null) : null,
      vista_caixa: vista ? cs(vista) : null },
    apto_para_sessao: veredito, erro_funcao: erroFuncao, sonda,
    botoes: botoes2, n_botoes: botoes.length, aberturas: { gaveta_aberta, sidebar_aberta },
    recipiente: { sidebar: sidebar ? cs(sidebar) : null, sidebar_nav_itens: document.querySelectorAll('.sidebar .nav-item[data-section]').length,
      gaveta: gaveta ? { ...cs(gaveta), aberta: !gaveta.classList.contains('hidden') } : null,
      mobile_bottom_nav: !!document.getElementById('bfrMobileBottomNav') },
    barra_papeis: Array.from(document.querySelectorAll('.role-toggle [data-preview-role]')).map((b) => b.dataset.previewRole),
  };
})()`;
const med = await E(PROBE);
// a sonda do backend é assíncrona: se ainda não respondeu, espera-se pelo predicate, não por um palpite
if (med.sonda && med.sonda.feita === false) { try { await waitFor('window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.sonda && window.BFR_MUNICIPAL.sonda.feita === true', 20000); const outra = await E(PROBE); med.sonda = outra.sonda; } catch { /* fica registada como não respondida */ } }

const visivel = (b) => b.caixa.disp !== 'none' && b.caixa.vis !== 'hidden' && b.caixa.w > 0 && b.caixa.h > 0;
const apto = med.apto_para_sessao && med.apto_para_sessao.apto === true;
const emAberto = med.botoes.filter((b) => b.recipiente_aberto);
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('a_pegada_servida_e_a_shell_publicada_da_v136', md5Shell === ESPERADO.htmlMd5, { servido: md5Shell, esperado: ESPERADO.htmlMd5 }),
  g('a_cadeia_foi_renovada_e_gravada_em_todos_os_registos', gravados_esteao_iguais(registos, PAPEL), { registos: sess.gravados, rodou: sess.rodou, expira_em: new Date(sess.js.expires_at * 1000).toISOString() }),
  g('a_sessao_monta_a_shell', !!(med.papel.runtime_role), { ms_login: msLogin, ms_ready: msReady, ms_modulo: msModulo, papel: med.papel.runtime_role }),
  g('o_modulo_esta_presente', !!med.modulo.existe && med.modulo.sect === SECT, { sect: med.modulo.sect, papeis: med.modulo.papeis }),
  g('o_botao_municipal_foi_injetado_no_dom', med.n_botoes >= 1, { n_botoes: med.n_botoes, hosts: med.botoes.map((b) => b.host) }),
  g('o_estado_no_dom_bate_com_a_funcao_do_modulo', med.n_botoes >= 1 && med.botoes.every((b) => b.munApto === (apto ? 'sim' : 'nao')), { funcao: med.apto_para_sessao, botoes: med.botoes.map((b) => ({ host: b.host, munApto: b.munApto })) }),
  g('a_porta_pintada_em_cada_recipiente_aberto', emAberto.length >= 1 && emAberto.every((b) => visivel(b) === apto), { apto, aberturas: med.aberturas,
    em_aberto: emAberto.map((b) => ({ recipiente: b.recipiente, disp: b.caixa.disp, caixa: b.caixa.w + 'x' + b.caixa.h + '@' + b.caixa.y, visivel: visivel(b) })),
    em_fechado: med.botoes.filter((b) => !b.recipiente_aberto).map((b) => ({ recipiente: b.recipiente, disp: b.caixa.disp, caixa: b.caixa.w + 'x' + b.caixa.h })) }),
  g('a_seccao_registada_apenas_nos_papeis_municipais', med.mapa.admin_tem_sect === (med.modulo.papeis || []).includes('admin') && med.mapa.education_supervisor_tem_sect === (med.modulo.papeis || []).includes('education_supervisor') && med.mapa.secretary_tem_sect === false, { mapa: med.mapa, papeis: med.modulo.papeis }),
  g('a_sonda_do_backend_respondeu_ou_foi_registada_como_nao_respondida', !!(med.sonda && med.sonda.feita === true), { sonda: med.sonda }),
];
function gravados_esteao_iguais(lista, papel) { const hs = new Set(lista.map((p) => h(JSON.parse(readFileSync(p, 'utf8'))[papel].refresh_token))); return hs.size === 1 && !hs.has(antesHash); }

const out = {
  programa: 'scripts/bu11-porta-municipal-desktop.mjs', em: new Date().toISOString(),
  http: 'só GET ao ar + renovação de sessão; 0 escrita na base, 0 DDL, 0 deploy',
  pergunta: `no ar publicado, a largura ${LARGURA} com o papel ${PAPEL}: o botão «Secretaria Municipal» está injetado, com que munApto, e está pintado?`,
  metodo: 'fetch do ar + md5 contra esperado-v136; sessão renovada e gravada nos registos antes do browser; Chrome headless via CDP; Emulation.setDeviceMetricsOverride com ' + JSON.stringify({ width: LARGURA, height: ALTO, deviceScaleFactor: LARGURA <= 430 ? 2 : 1, mobile: LARGURA <= 430 }) + ' (a mesma régua de estreitamento do scripts/ah2-mobile2.mjs versionado); espera pelo predicate do produtor (BFR_MUNICIPAL + o botão municipal no DOM), não por cronómetro; leitura do estado vivo do DOM comparada com aptoParaSessao()',
  servido: { url: URL_APP, md5: md5Shell, bytes: Buffer.byteLength(shellTxt, 'utf8') },
  sessao: { papel: PAPEL, registos_gravados: sess.gravados, rodou: sess.rodou, expira_em: new Date(sess.js.expires_at * 1000).toISOString(), access_len: String(sess.js.access_token).length, refresh_len: String(sess.js.refresh_token).length },
  tempos_ms: { login: msLogin, shell_ready: msReady, modulo: msModulo },
  gaveta_aberta_por_toque: gaveta_aberta_por_toque,
  medido: med, consola: consola.slice(0, 12),
  conclusao: {
    frase_que_esta_corrida_autoriza: med.n_botoes === 0
      ? `a ${LARGURA}px com ${PAPEL}: nenhum botão municipal no DOM — o módulo não injetou a entrada nesta sessão`
      : apto
        ? `a ${LARGURA}px com ${PAPEL}: ${med.n_botoes} botão(ões) injetado(s), munApto=sim, ${emAberto.filter(visivel).length} pintado(s) nos ${emAberto.length} recipiente(s) aberto(s) (${JSON.stringify(med.botoes.map((b) => `${b.recipiente}:${b.recipiente_aberto ? 'aberto' : 'fechado'}`))}); recipientes: ${JSON.stringify(med.botoes.map((b) => b.host))}`
        : `a ${LARGURA}px com ${PAPEL}: o botão está injetado mas munApto=${med.botoes[0].munApto} e aptoParaSessao diz ${JSON.stringify(med.apto_para_sessao)} — a entrada está escondida por decisão do mapa de papéis`,
    o_que_nao_prova: 'não prova o que acontece depois do clique (as rotas medidas por toque estão em ah2-mobile2); não prova larguras intermédias não corridas; e a barra de troca de papel só existe para developer, por isso noutro papel o recipiente pode ser outro.',
  },
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `BU11_PORTA_MUNICIPAL_VERDE ${portoes.length}/0` : `BU11_PORTA_MUNICIPAL_VERMELHO ${falhas.length} de ${portoes.length}`;
fecho = true; try { ws.close(); } catch {}
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`BU11_VERMELHO · registo ${p}`); fecha(1, 'vermelho gravado'); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`AR ${md5Shell} ${out.servido.bytes} B · papel=${med.papel.runtime_role} · viewport inner=${med.viewport.inner_width} doc=${med.viewport.doc_client_width} media<=800=${med.viewport.media_max_800}`);
console.log(`BOTÕES ${med.n_botoes} · ${JSON.stringify(med.botoes.map((b) => `${b.host}:apto=${b.munApto}:disp=${b.caixa.disp}:caixa=${b.caixa.w}x${b.caixa.h}@${b.caixa.y}:ind=${b.indice}/${b.irmaos}`))}`);
console.log(`MAPA admin_tem_sect=${med.mapa.admin_tem_sect} es_tem_sect=${med.mapa.education_supervisor_tem_sect} secretary_tem_sect=${med.mapa.secretary_tem_sect} n_admin=${med.mapa.n_de_admin}`);
console.log('FUNCAO ' + JSON.stringify(med.apto_para_sessao) + ' · SONDA ' + JSON.stringify(med.sonda));
console.log('CONCLUSAO ' + out.conclusao.frase_que_esta_corrida_autoriza);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · registo ${OUT}`);
fecha(0, 'fecho normal');
