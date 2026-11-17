// Porque este programa existe: `scripts/ah2-confere-portas.mjs` deixou 25 linhas `NAO TESTADA — porta
// inexistente` em três classes e não decidiu nenhuma. As bytes servidas dizem que `comunicacao`, `fotos` e
// `jogos-escolares` TÊM botões no markup (4× cada), enquanto `escola-historia`, `coordenacao-chat`,
// `admin-crachas`, `videos-aprender`, `supervisao` e `professor-agenda-hoje` não têm casa nem botão nenhum.
// Mas o que decide se uma porta existe para UMA PESSOA é o DOM daquele papel naquele instante, e a regra do
// produto está escrita em `app/bfr-responsive-presentation.js:71-89` (`drawerItems()`): a gaveta só apanha
// `#appShell .sidebar .nav-item[data-section]:not(.hidden)` e `#mobileMoreMenu
// .mobile-more-option[data-section]:not(.hidden)`, e ainda descarta quem tenha `closest('.hidden')` ou
// texto vazio. «Porta inexistente» pode portanto significar quatro coisas diferentes, e só o browser as
// separa:
//   ITEM_FORA_DOS_DOIS_SELECTORES — o botão existe noutro contentor (a gaveta nunca o pode copiar);
//   ITEM_MAS_ESCONDIDO_POR_CLASSE — `.hidden` em si ou em ancestral: o produto esconde a porta deste papel;
//   ITEM_SEM_TEXTO — `drawerItems()` descarta-o pela régua da etiqueta;
//   ITEM_NA_GAVETA — a porta está lá, e a linha da tabela é do INSTRUMENTO.
// Não escreve em base, não faz DDL, não publica: um `fetch` de token, uma navegação por papel e leitura de
// DOM. A anon key lê-se das bytes servidas (linha ANON de `ah2-mobile2.mjs:44`), nunca escrita aqui.
// Uso: node scripts/ah2-sonda-portas-por-papel.mjs [prefixo=m5] [largura=390] [rotulo=pp1] [papéis…]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const EV = `${DIR}/bfr-conecta/evidence`;
const PREFIXO = process.argv[2] || 'm5';
const LARGURA = parseInt(process.argv[3] || '390', 10);
const ROTULO = process.argv[4] || 'pp1';
const SÓ_PAPEIS = process.argv.slice(5);
const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = parseInt(process.env.AH2_PORT || '9476', 10);
const ALTURA = 720;
const OUT = `${EV}/ah2-sonda-portas-por-papel-${ROTULO}.json`;
const PERFIL = `${DIR}/.ah2pp-${ROTULO}-${PORT}`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');

// — as células em dúvida, recortadas com as regras do produtor (mesma `coerente`, mesmo alias) —
const coerente = (b) => !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
const por_papel = {};
for (const f of readdirSync(EV).filter((x) => new RegExp(`^ah2-mobile2-${PREFIXO}[^/]*\\.json$`).test(x)).sort()) {
  const j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE' || (SÓ_PAPEIS.length && !SÓ_PAPEIS.includes(j.papel))) continue;
  for (const [w, b] of Object.entries(j.bandas || {})) {
    if (b.pela_praga || !coerente(b)) continue;
    for (const r of b.declaradas_sem_rota || []) (por_papel[j.papel] = por_papel[j.papel] || new Set()).add(r);
  }
}
const papeis = Object.keys(por_papel).sort();
if (!papeis.length) throw new Error('ABORTA: nenhuma célula «porta inexistente» com banda coerente');
console.log('papéis a censurar: ' + papeis.map((p) => p + '(' + por_papel[p].size + ')').join(' ') + ' — portas por papel: ' + [...new Set(papeis.map((p) => por_papel[p].size))].join('/'));

const SHELL = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = createHash('md5').update(SHELL).digest('hex');
const ANON = SHELL.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const saida = { ciclo: 'AH-PORTAS-POR-PAPEL', em: new Date().toISOString(), largura: LARGURA, md5_shell: MD5, regra_do_produto: 'app/bfr-responsive-presentation.js:71-89 drawerItems()', papéis: {}, resumo: null };
function grava(codigo) {
  try { writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); console.log('ESCRITO: ' + OUT.split('/').pop()); } catch {}
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  process.exit(codigo);
}
setTimeout(() => grava(3), 540000);
// `pp1` morreu num `readFileSync` e não deixou artefacto: qualquer exceção passa a escrever o meiodo-censo
// com `erro` nomeado, para que a ausência de prova fique registada como ausência e não como resultado.
process.on('uncaughtException', (e) => { saida.erro = String(e && e.message || e).slice(0, 300); console.log('ERRO: ' + saida.erro); grava(2); });
process.on('unhandledRejection', (e) => { saida.erro = String(e && e.message || e).slice(0, 300); console.log('REJEIÇÃO: ' + saida.erro); grava(2); });
let tg = [];
for (let i = 0; i < 80; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await dorme(400); }
const page = tg.find((t) => t.type === 'page');
if (!page) grava(1);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('handshake')), 30000); }).catch(() => grava(5));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(p.method + ': ' + m.error.message)) : p.res(m.result); return; } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej, method }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await dorme(350); } return null; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 2, mobile: true });
const TOQUE = async (x, y) => { if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('TOQUE sem coordenadas: ' + x + ',' + y); await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const centro = async (sel) => E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return {x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height)}; })()`);

// O censo por rota, escrito com os MESMOS selectores da regra do produto: o que aqui se lê é a decisão do
// `drawerItems()`, não uma aproximação minha.
const CENSO = (rotas) => `(() => {
  const classes = (n) => n ? (typeof n.className === 'string' ? n.className.trim() : String(n.className)) : null;
  const id_do_ancestral_escondido = (n) => { let e = n, d = 0; while (e && e !== document.body && d < 24) { if (e.classList && e.classList.contains('hidden')) return (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (classes(e) || '')).slice(0, 70); e = e.parentElement; d++; } return null; };
  const out = {};
  for (const r of ${JSON.stringify(rotas)}) {
    const sels = { sidebar: '#appShell .sidebar .nav-item[data-section="' + r + '"]', mais: '#mobileMoreMenu .mobile-more-option[data-section="' + r + '"]', qualquer: '[data-section="' + r + '"]' };
    const side = document.querySelector(sels.sidebar), mais = document.querySelector(sels.mais);
    const item = side || mais;
    out[r] = {
      na_sidebar: !!side, no_more_menu: !!mais,
      em_qualquer_lugar: document.querySelectorAll(sels.qualquer).length,
      hidden_em_si: item ? item.classList.contains('hidden') : null,
      ancestral_hidden: item ? id_do_ancestral_escondido(item.parentElement) : null,
      texto: item ? (item.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 28) : null,
      na_gaveta: !!document.querySelector('#bfrMobileDrawer [data-bfr-drawer-route="' + r + '"]')
    };
    const sem_texto = out[r].texto === null || out[r].texto === '';
    out[r].classe = !item ? (out[r].em_qualquer_lugar > 0 ? 'ITEM_FORA_DOS_DOIS_SELECTORES' : 'SEM_ITEM_EM_NENHUM_SELECTOR')
      : out[r].hidden_em_si ? 'ITEM_MAS_ESCONDIDO_POR_CLASSE'
      : out[r].ancestral_hidden ? 'ITEM_COM_ANCESTRAL_HIDDEN'
      : sem_texto ? 'ITEM_SEM_TEXTO'
      : out[r].na_gaveta ? 'ITEM_NA_GAVETA' : 'ITEM_VISIVEL_MAS_GAVETA_NAO_O_COPIOU';
  }
  return out; })()`;

for (const papel of papeis) {
 try {
  // Lição das duas corridas que falharam: `pp1` rebentou num `readFileSync` de um ficheiro que não existe e
  // `pp2` calou-se a meio sem deixar artefacto. Os `ah2-sessao-<papel>.json` são cópias por filho da grelha
  // (só o papel dono do ficheiro tem cadeia fresca, e `parent` nem ficheiro tem); o mapa mestre
  // `ah2-sessions.json` traz os 15 papéis com `refresh_token`, e é ele que serve a uma sonda que percorre
  // papéis todos. Um papel que rebente fica registado como falha minha, nunca como porta inexistente.
  const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
  const base = S[papel];
  if (!base?.refresh_token) {
    saida.papeis_nao_cobertos = saida.papeis_nao_cobertos || [];
    saida.papeis_nao_cobertos.push({ papel, motivo: 'sem refresh_token no mapa mestre', portas: [...por_papel[papel]].sort() });
    console.log(`${papel}: SEM SESSÃO NO MAPA MESTRE — não coberto (${por_papel[papel].size} portas)`);
    continue;
  }
  let sessao = base;
  try {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: base.refresh_token }), signal: AbortSignal.timeout(45000) });
    const js = await r.json(); if (js?.access_token) sessao = js; else console.log(`  AVISO ${papel}: refresh ${r.status} — uso a sessão guardada`);
  } catch (e) { console.log(`  AVISO ${papel}: refresh falhou (${String(e.message).slice(0, 60)}) — sessão guardada`); }
  const rotas = [...por_papel[papel]].sort();
  await send('Page.navigate', { url: 'about:blank' }); await dorme(400);
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 45000);
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
  await send('Page.navigate', { url: URL_APP });
  const ms = await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 60000);
  const role_lido = await E(`window.BFR_CURRENT_PROFILE?.role ?? null`);
  // O `pp1` não fazia nada nisto e por isso o censo saiu todo vazio: o modal de primeiro acesso tapa a barra
  // (§AI.27/5 mede isso no apoio), e sem fechar modal nem esperar pela barra não há gaveta para censurar.
  const modal = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? m.id || null : null; })()`);
  if (modal) { const c = await centro('#' + modal + ' .modal-close'); if (c) { await TOQUE(c.x, c.y); await dorme(600); } }
  // Duas coisas que o `pp3` provou que faltavam aqui: (i) o professor NÃO tem «Mais» na barra — abre a
  // gaveta pelo hambúrguer `[data-bfr-open-drawer]`, como o próprio instrumento decide em
  // `ah2-mobile2.mjs:312` — e sem essa segunda afordância o `pedagogical` ficou com a gaveta fechada;
  // (ii) o `monitor` não teve barra aos 30 s e o censo perdeu o papel todo, quando uma recarga chega lá.
  let ms_barra = null, n_section = 0, gaveta_aberta = false, itens_gaveta = 0, afordancia = null;
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    ms_barra = await waitFor("!!document.getElementById('bfrMobileBottomNav')", 30000);
    n_section = await E(`document.querySelectorAll('[data-section]').length`);
    const tem_mais = await E(`(() => { const b = document.querySelector('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]'); const r = b && b.getBoundingClientRect(); return !!(r && r.width && r.height); })()`);
    const sel = tem_mais ? '#bfrMobileBottomNav button[data-bfr-mobile-route="more"]' : '[data-bfr-open-drawer]';
    for (const c of [0, 1]) {
      if (await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`)) break;
      const alvo = await centro(sel); if (!alvo) break;
      await TOQUE(alvo.x, alvo.y); await dorme(700);
    }
    gaveta_aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
    itens_gaveta = await E(`document.querySelectorAll('#bfrMobileDrawer [data-bfr-drawer-route]').length`);
    afordancia = tem_mais ? 'mais' : 'hamburguer';
    if (ms_barra !== null && itens_gaveta > 0) break;
    if (tentativa === 1) { console.log(`  ${papel}: barra=${ms_barra}ms e ${itens_gaveta} itens na gaveta — recarrego uma vez`); await send('Page.navigate', { url: URL_APP }); await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 60000); const m2 = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? m.id || null : null; })()`); if (m2) { const c = await centro('#' + m2 + ' .modal-close'); if (c) { await TOQUE(c.x, c.y); await dorme(600); } } }
  }
  // Portão: com a appShell pronta, a barra montada, itens na gaveta e nós `[data-section]` no DOM. Sem as
  // quatro, o censo diria «não existe» de uma página que não chegou a arrancar — é o erro que o `pp1` fez.
  const boot_ok = ms !== null && n_section > 0 && ms_barra !== null && itens_gaveta > 0;
  const census = await E(CENSO(rotas));
  const cont = {};
  for (const [r, v] of Object.entries(census)) cont[v.classe] = (cont[v.classe] || []).concat(r);
  saida.papéis[papel] = { ms_ready: ms, role_lido, modal_inicial: modal, ms_barra, data_section_no_dom: n_section, afordancia, gaveta_aberta, itens_gaveta, boot_ok, rotas: boot_ok ? census : null, por_classe: boot_ok ? Object.fromEntries(Object.entries(cont).map(([k, v]) => [k, v.sort()])) : null, classe: boot_ok ? null : 'CENSO_INVALIDO_SEM_BOOT' };
  console.log(`${papel} (role=${role_lido}, modal=${modal}, data-section=${n_section}, barra=${ms_barra}ms, afordancia=${afordancia}, gaveta_aberta=${gaveta_aberta}, ${itens_gaveta} itens) → ${boot_ok ? Object.entries(cont).map(([k, v]) => k + '=' + v.length).join(' ') : 'CENSO INVÁLIDO: a app não assentou'}`);
 } catch (e) {
  saida.papéis[papel] = { classe: 'CENSO_FALHOU', erro: String(e && e.message || e).slice(0, 240), boot_ok: false, rotas: null, por_classe: null };
  console.log(`${papel}: CENSO FALHOU — ${saida.papéis[papel].erro}`);
 }
}
const todas = new Set();
const cobertos = papeis.filter((p) => saida.papéis[p]?.boot_ok);
for (const p of cobertos) for (const [r, v] of Object.entries(saida.papéis[p].rotas)) todas.add(v.classe);
saida.resumo = { classes_vistas: [...todas].sort(), por_classe_em_todos_os_papeis: {}, papel_com_lista_vazia: papeis.filter((p) => saida.papéis[p]?.boot_ok === false), invalidos: papeis.filter((p) => saida.papéis[p]?.boot_ok === false).map((p) => p + '(' + saida.papéis[p].classe + ')'), nao_cobertos: saida.papeis_nao_cobertos || [] };
for (const p of cobertos) for (const [r, v] of Object.entries(saida.papéis[p].rotas)) (saida.resumo.por_classe_em_todos_os_papeis[v.classe] = saida.resumo.por_classe_em_todos_os_papeis[v.classe] || new Set()).add(p + '/' + r);
saida.resumo.por_classe_em_todos_os_papeis = Object.fromEntries(Object.entries(saida.resumo.por_classe_em_todos_os_papeis).map(([k, v]) => [k, [...v].sort()]));
console.log('\nCOBERTURA: ' + cobertos.length + '/' + papeis.length + ' papéis com censo válido. ' + JSON.stringify({ invalidos: saida.resumo.invalidos, nao_cobertos: saida.resumo.nao_cobertos.map((x) => x.papel) }, null, 1));
for (const [k, v] of Object.entries(saida.resumo.por_classe_em_todos_os_papeis)) console.log('  ' + k + ' ×' + v.length + ': ' + v.slice(0, 16).join(', ') + (v.length > 16 ? '…' : ''));
grava(0);
