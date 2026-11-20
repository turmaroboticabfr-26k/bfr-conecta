// P73-T — a sonda de estrelação (p73-sonda-starvacao-sync.mjs, 20-11c) deu duas respostas diferentes para o
// mesmo papel: 430 px nunca teve um silêncio >= PISO (0 em 1639 intervalos), mas 320 px teve um (87 ms) e a
// barra nem por isso montou. A divergência não é do produto, é da minha régua: eu media silêncios entre
// LOTES DE MUTAÇÃO, e o `schedule()` do módulo (:633-639) é também chamado por `resize` (:641), `change` da
// media query (:640), `bfr:app-ready` (:642), `bfr:role-change` (:643) e `bfr:navigation` (:649) — nenhuma
// destas escreve uma mutação de classe no corpo, logo um «silêncio de 87 ms» no meu contador pode esconder
// `schedule()`s que cancelarame o `setTimeout(dispara, PISO)` (:636 clearTimeout). Esta sonda mede a coisa em
// si: o timer de 60 ms do próprio módulo. Antes do arranque intercepto `window.setTimeout` e fico só com as
// chamadas em que delay === PISO E a pilha de quem chamou nomeia `bfr-responsive-presentation` — a filtragem é
// pela pilha, não por um contador meu que não distingue quem armou. Conto armados, vencidos e cancelados.
// Previsão falsificável: monitor arma muitos e nunca deixa vencer nenhum; o controlo (gatekeeper) deixa
// vencer pelo menos um. Se o monitor tiver vencidos e a barra mesmo assim não montar, a causa não é o timer.
// O terceiro degrau fecha a pergunta que a pilha não responde: depois de 5 s sem toque, se a barra aparecer,
// o defeito é «a página de trabalho do monitor nunca sossega» e não «o createNav não sabe fazer a barra do
// monitor». A barra do monitor JÁ montou em corridas anteriores (matriz: 360 CORRIDAS, e 430 montou num
// processo que varria 320 antes) — o que exclui markup partido e deixa só o agendamento em causa.
// 0 escrita de produto (a interceptação vive no processo do browser, não no ficheiro servido), 0 DDL,
// 0 publicação, 0 impressão de token. Não toca no registo mestre de sessões.
// Uso: node scripts/p73-sonda-timer-piso.mjs <papel> <larguras csv> <papel de controlo> <porta> <suf>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PATCH_SRC, NOME_DO_MODULO } from './p73-patch-timer-piso-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const PAPEL = (process.argv[2] || 'monitor').trim();
const LARGURAS = (process.argv[3] || '320,430').split(',').map((n) => parseInt(n, 10));
const CONTROLO = (process.argv[4] || 'gatekeeper').trim();
const PORT = parseInt(process.argv[5] || '9491', 10);
const SUF = (process.argv[6] || '20-11d').trim();
const ALTURA = 720;
const PERFIL = `${DIR}/.ah2nv-chrome-profile-p73t`;
const OUT = `${EV}/p73-sonda-timer-piso-${PAPEL}-${LARGURAS.join('-')}px-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');
const diarios = readdirSync(REPO).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10));
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-v*.json em ' + REPO);
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${diarios.slice(-1)[0]}`, 'utf8')) || [])[0] + '/';
const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const AR_MD5 = md5(Buffer.from(shellTxt));
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem SUPABASE_PUBLISHABLE_KEY nos bytes servidos');
// O URL do módulo lê-se do shell servido (nunca dactilografado), e a filtragem por pilha só vale se o ficheiro
// servido for byte-idêntico ao do repo — é o mesmo nome que a pilha vai mostrar.
const SRC_MODULO = (/src="([^"]*bfr-responsive-presentation[^"]*)"/.exec(shellTxt) || [])[1];
if (!SRC_MODULO) throw new Error('ABORTA: o shell servido não referencia bfr-responsive-presentation');
const URL_MODULO = new URL(SRC_MODULO, URL_APP).href;
const MODULO_TXT = await (await fetch(URL_MODULO, { headers: { 'cache-control': 'no-cache' } })).text();
const MODULO_REPO = readFileSync(`${REPO}/app/bfr-responsive-presentation.js`, 'utf8');
const md5_servido = md5(Buffer.from(MODULO_TXT));
const md5_repo = md5(Buffer.from(MODULO_REPO));
if (md5_servido !== md5_repo) throw new Error('ABORTA: modulo servido ' + md5_servido + ' != repo ' + md5_repo + ' — a pilha não atribui ao código que eu li');
const PISO_MS = parseInt(/const PISO = (\d+), TETO = (\d+)/.exec(MODULO_REPO)[1], 10);
const TETO_MS = parseInt(/const PISO = (\d+), TETO = (\d+)/.exec(MODULO_REPO)[2], 10);

const exp_de = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString('utf8')).exp; } catch { return 0; } };
// O REF e a anon key têm de vir da MESMA fonte (os bytes servidos): chave e chave-de-armazenamento são
// dactilografados como par do URL do ar, e um valor lembrado do diário faria o login cair numa chave velha.
const REF = (/https:\/\/([a-z0-9.-]+)\.supabase\.co/i.exec(shellTxt) || [])[1];
if (!REF) throw new Error('ABORTA: sem URL supabase.co nos bytes servidos — não sei que STORAGE_KEY injectar');
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;
const sessoes = {};
const cache_sessao = new Map();
async function sessao_de(papel) {
  if (cache_sessao.has(papel)) return cache_sessao.get(papel);
  const ficheiro = `${DIR}/ah2-sessao-${papel}.json`;
  if (!existsSync(ficheiro)) throw new Error('ABORTA: sem ' + ficheiro.split('/').pop() + ' — corra o condutor deste papel primeiro');
  const sess = JSON.parse(readFileSync(ficheiro, 'utf8'));
  if (!sess[papel]?.refresh_token) throw new Error('ABORTA: sem cadeia de ' + papel + ' no ficheiro do papel');
  let acesso = sess[papel];
  const acesso_antes = acesso.access_token;
  if (exp_de(acesso.access_token) <= Math.floor(Date.now() / 1000) + 120) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: acesso.refresh_token }), signal: AbortSignal.timeout(45000) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.access_token) throw new Error('ABORTA: renovação de ' + papel + ' falhou http=' + r.status + ' code=' + (j?.error_code || j?.error || 'sem-corpo'));
    acesso = { ...acesso, ...j, expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
    sess[papel] = acesso;
    writeFileSync(ficheiro, JSON.stringify(sess, null, 2) + '\n');
  }
  const relido = JSON.parse(readFileSync(ficheiro, 'utf8'))[papel];
  sessoes[papel] = { papel, gravado_em: ficheiro.split('/').pop(), gravado_fiel: relido.access_token === acesso.access_token, renovou: acesso_antes !== acesso.access_token, access_comprimento: String(acesso.access_token || '').length, refresh_comprimento: String(acesso.refresh_token || '').length, expira_em_s: exp_de(acesso.access_token) - Math.floor(Date.now() / 1000) };
  if (!sessoes[papel].gravado_fiel) throw new Error('ABORTA: o ficheiro de ' + papel + ' relido não bate com a sessão em memória — duas vozes a escrever ou o disco não gravou');
  cache_sessao.set(papel, acesso);
  return acesso;
}

function liberta_porta(porta) {
  const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const pids = new Set();
  for (const linha of String(q.stdout || '').split(/\r?\n/)) {
    if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
    const pid = linha.trim().split(/\s+/).pop();
    if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const p of pids) {
    const dono = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter \"ProcessId=${p}\").Name`], { encoding: 'utf8' });
    const nome = String(dono.stdout || '').trim();
    if (!/chrome/i.test(nome)) { console.log('PORTA ' + porta + ': o dono (' + p + ' ' + (nome || 'desconhecido') + ') não é Chrome nosso — aborta em vez de matar'); throw new Error('ABORTA: porta ' + porta + ' ocupada por ' + (nome || 'desconhecido')); }
    spawnSync('taskkill', ['/pid', p, '/t', '/f'], { stdio: 'ignore' });
  }
  return pids.size;
}
liberta_porta(PORT);
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=' + PORT, '--user-data-dir=' + PERFIL, '--headless=new', '--window-size=' + LARGURAS[0] + ',' + ALTURA, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let fecho = false;
const saida = { programa: 'scripts/p73-sonda-timer-piso.mjs', em: new Date().toISOString(), ar: { url: URL_APP, md5: AR_MD5 }, modulo: { url: URL_MODULO, md5_servido, md5_repo, iguais: true, piso_ms: PISO_MS, teto_ms: TETO_MS }, papel: PAPEL, papel_de_controlo: CONTROLO, larguras: LARGURAS, sessoes, leitura_do_codigo: { armador_do_timer: 'schedule -> setTimeout(dispara, PISO)', cancelador: 'clearTimeout no topo do schedule', outros_chamadores_de_schedule: ['media change', 'resize', 'bfr:app-ready', 'bfr:role-change', 'bfr:navigation', 'MutationObserver do corpo'], atribuicao: 'pilha do setTimeout com delay=PISO', ramo_que_nao_chama_createNav: 'pintaSozinho -> paintHighlight' }, resultados: {} };
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} if (!fecho) console.log('PAROU: ' + m); if (m === 'fecho normal') { console.log('PAROU: ' + m); process.exit(c); } try { saida.em_parcial = true; saida.INTERROMPIDA = m; writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); } catch {} console.log('registo ' + OUT); process.exit(c); };
const DEGRAUS = 1 + LARGURAS.length;
const TETO_GERAL_MS = DEGRAUS * 150000 + 90000;
setTimeout(() => abort(3, 'watchdog ' + Math.round(TETO_GERAL_MS / 1000) + ' s (' + DEGRAUS + ' degraus)'), TETO_GERAL_MS);
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));

let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const alvo = tg.find((t) => t.type === 'page');
if (!alvo) abort(1, 'sem alvo page');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (!m.id || !pend.has(m.id)) return; const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); };
const PRAZO_CDP = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq;
  const t = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + PRAZO_CDP(method) + ' ms')); } }, PRAZO_CDP(method));
  pend.set(i, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(t); pend.delete(i); rej(e); }
});
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };

// A pergunta única: o nó existe e quantos dos timers de 60 ms do módulo o produziram.
const LEITURA = `(() => {
  const nav = document.getElementById('bfrMobileBottomNav');
  const bot = nav ? Array.from(nav.querySelectorAll('button[data-bfr-mobile-route]')) : [];
  const t = window.__p73t || null;
  return { nav_existe: !!nav, botoes: bot.length, botoes_com_caixa: bot.filter((b) => b.offsetWidth || b.offsetHeight).length, corpo_mobile: document.body.classList.contains('bfr-mobile-presentation'), shell_ready: !!document.getElementById('appShell')?.classList.contains('ready'), papel: window.BFR_CURRENT_PROFILE?.role || null,
    armados_piso: t ? t.armados : null, venceu_piso: t ? t.venceu : null, cancelados_piso: t ? t.cancelados : null, outros_delays_do_modulo: t ? t.outros : null,
    venceu_ultimo_ha_ms: t && t.marcas.length ? Math.round(performance.now() - t.marcas[t.marcas.length - 1]) : null,
    armados_por_segundo: t && t.t_armados.length > 1 ? Math.round((t.armados * 1000) / ((t.t_armados[t.t_armados.length - 1] - t.t_armados[0]) || 1)) : null,
    sinistros: (window.__p73t_erros || []).slice(0, 3) };
})()`;
const VEREDICTO = (r) => r.sem_toque.nav_existe ? 'MONTA_SEM_TOQUE'
  : (r.sossego_5s ? r.sossego_5s.nav_existe : false) ? 'ESTRELACAO_PROVADA_MONTA_QUANDO_SOSSEGA'
    : r.dois_eventos.venceu_piso === 0 ? 'ESTRELACAO_DO_TIMER_PROVADA_POR_PILHA' : 'NAO_E_O_TIMER_FALHOU_OUTRA_COISA';

// Intercepcção instalada ANTES de qualquer script da página (addScriptToEvaluateOnNewDocument). O corpo vem do
// módulo partilhado — o mesmo texto que o fixture (scripts/p73-fixture-timer-piso.mjs) dispara contra quatro
// casos distinguíveis; reimplementá-lo aqui seria um verde que não mede o instrumento que corre.
const PATCH = PATCH_SRC(PISO_MS);

async function degrau(papel, largura) {
  await send('Emulation.setDeviceMetricsOverride', { width: largura, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 60000);
  const sess_p = await sessao_de(papel);
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sess_p)}))`);
  await send('Page.navigate', { url: URL_APP });
  const ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(papel)}`, 70000);
  const patch = await E(PATCH);
  await E('new Promise(r => setTimeout(r, 3000))');
  const sem_toque = await E(LEITURA);
  await E(`new Promise(r => { window.dispatchEvent(new Event('resize')); setTimeout(() => { window.dispatchEvent(new Event('resize')); r(1); }, 50); })`);
  await E('new Promise(r => setTimeout(r, 1500))');
  const dois_eventos = await E(LEITURA);
  // O degrau que a pilha não responde: 5 s sem eu tocar em nada. Se a barra aparecer aqui, o que faltava era
  // silêncio, e o `createNav` do monitor está bem — a estrelação é do agendamento, não do markup do papel.
  await E('new Promise(r => setTimeout(r, 5000))');
  const sossego_5s = await E(LEITURA);
  return { largura, ms_ready, patch, sem_toque, dois_eventos, sossego_5s };
}

await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: PATCH });
console.log('MODULO: ' + URL_MODULO + ' md5 servido=repo=' + md5_servido + ' PISO=' + PISO_MS + ' ms TETO=' + TETO_MS + ' ms · pilha atribui por nome de ficheiro = ' + NOME_DO_MODULO);

const ctl = await degrau(CONTROLO, LARGURAS[0]);
saida.controlo = ctl;
// Dois lados da régua, ambos medidos no controlo: o nó monta, E o instrumento vê o timer do módulo (senão o
// 0 do monitor seria a minha filtragem cega, não uma estrelação).
if (!ctl.sem_toque.nav_existe) throw new Error('ABORTA: o controlo (' + CONTROLO + '@' + LARGURAS[0] + ') não montou a barra — régua sem lado positivo');
if (ctl.sem_toque.armados_piso === null) throw new Error('ABORTA: o patch não está activo no controlo (armados_piso=null) — instrumento cego');
if (ctl.sem_toque.armados_piso === 0 && ctl.sem_toque.outros_delays_do_modulo === 0) throw new Error('ABORTA: o controlo nunca armou um setTimeout com delay=' + PISO_MS + ' e nem um descarte — a filtragem por pilha não casa nada; 0 no monitor não quereria dizer estrelação');
if (ctl.sem_toque.venceu_piso === 0) throw new Error('ABORTA: o controlo armou ' + ctl.sem_toque.armados_piso + ' timers do módulo e não deixou vencer nenhum — a régua não distingue estrelação de página quieta');
console.log('CONTROLO ' + CONTROLO + '@' + LARGURAS[0] + ': nav_existe=true armados=' + ctl.sem_toque.armados_piso + ' venceu=' + ctl.sem_toque.venceu_piso + ' cancelados=' + ctl.sem_toque.cancelados_piso + ' outros_60ms=' + ctl.sem_toque.outros_delays_do_modulo + ' armados/s=' + ctl.sem_toque.armados_por_segundo + ' · régua com dentes nos dois lados');

for (const w of LARGURAS) {
  const r = await degrau(PAPEL, w);
  saida.resultados[w] = r;
  r.veredicto = VEREDICTO(r);
  const a = r.dois_eventos, c = r.sossego_5s;
  console.log(String(w).padEnd(5) + PAPEL.padEnd(12) + ' nav sem_toque=' + r.sem_toque.nav_existe + ' apos_eventos=' + a.nav_existe + ' apos_5s_sossego=' + c.nav_existe +
    ' · timers do modulo: armados=' + a.armados_piso + ' venceu=' + a.venceu_piso + ' cancelados=' + a.cancelados_piso + ' (fim: armados=' + c.armados_piso + ' venceu=' + c.venceu_piso + ' cancelados=' + c.cancelados_piso + ' armados/s=' + c.armados_por_segundo + ')' +
    ' corpo_mobile=' + c.corpo_mobile + ' sinistros=' + JSON.stringify(c.sinistros) + ' -> ' + r.veredicto);
}
const por_timer = LARGURAS.filter((w) => saida.resultados[w].veredicto === 'ESTRELACAO_DO_TIMER_PROVADA_POR_PILHA');
const sossegam = LARGURAS.filter((w) => saida.resultados[w].veredicto === 'ESTRELACAO_PROVADA_MONTA_QUANDO_SOSSEGA');
fecho = true;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('ESTRELACAO_DO_TIMER 0/VENCIDOS: ' + por_timer.length + '/' + LARGURAS.length + ' · MONTA_SO_QUANDO_SOSSEGA: ' + sossegam.length + '/' + LARGURAS.length);
console.log(por_timer.length + sossegam.length === LARGURAS.length
  ? 'P7T_CONCLUSA · a barra do ' + PAPEL + ' não existe porque o setTimeout(dispara, ' + PISO_MS + ') do módulo é cancelado antes de vencer; em 320 o meu contador de lotes mostrou um silêncio porque `resize`/`bfr:navigation` também chamam schedule() sem escrever classe no corpo — a régua da pilha é a que quer dizer algo'
  : 'P7T_NAO_CONCLUSA · ha larguras onde o timer venceu e a barra mesmo assim nao montou; a causa nao e o agendamento');
console.log('P7T_TIMER_MEDIDO · registo ' + OUT);
abort(0, 'fecho normal');
