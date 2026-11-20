// P73-V — PEN-35 pede a causa, não a contagem: «a barra não monta» é o que o instrumento registra, mas o
// código do próprio módulo de apresentação tem um caminho que explica isso sem invocar defeito de markup.
// `schedule()` (app/bfr-responsive-presentation.js:633-639) só corre o `sync()` inteiro quando um evento chega
// DENTRO da janela do TETO (250 ms) e a página sossega 60 ms; se já passaram 250 ms desde a última pintura, ele
// chama `pintaSozinho()`, que é apenas `paintHighlight()` (:579-587) — e `paintHighlight` nunca cria o nó
// `#bfrMobileBottomNav`, porque a criação é de `createNav()` (:399-413), chamado só no corpo do `sync()` (:612).
// Sob churn contínuo (o comentário do módulo mede ~90 lotes de mutação por segundo) o módulo pinta realces para
// sempre e nunca faz um sync completo: a barra fica por existir mesmo com o shell `ready`.
// Este programa falsifica ou confirma isso por escalada de três degraus, no MESMO processo, sem tocar em
// produto: (0) conta os lotes de mutação nos 3 s seguintes ao ready; (1) lê a barra sem fazer nada; (2) dispara
// UM evento `resize` e relê — a previsão do código é «ainda não monta», porque um evento isolado cai no ramo
// `pintaSozinho`; (3) dispara DOIS eventos a 50 ms e relê 1 s depois — a previsão é «monta», porque o segundo
// evento chega dentro da janela e o `dispara` corre o sync. Se (2) já montar, a minha leitura do código está
// errada e é isso que o registo diz; se (3) não montar, o defeito não é de agendamento.
// O controlo negativo é um papel que monta (gatekeeper): se ele NÃO estiver com a barra presente no passo (1),
// a régua não discrimina nada e o programa aborta em vez de tabelar.
// 0 escrita de produto, 0 DDL, 0 publicação. Não escreve no registo mestre de sessões: usa só o ficheiro do
// papel e renova uma vez, gravando no mesmo ficheiro (quem corre em paralelo tem de ser o único escritor do
// papel). Nunca imprime token: só comprimentos, http e onde ficou gravado.
// Uso: node scripts/p73-sonda-starvacao-sync.mjs <papel> <larguras csv> <papel de controlo> <porta> <suf>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const PAPEL = (process.argv[2] || 'monitor').trim();
const LARGURAS = (process.argv[3] || '320,390').split(',').map((n) => parseInt(n, 10));
const CONTROLO = (process.argv[4] || 'gatekeeper').trim();
const PORT = parseInt(process.argv[5] || '9481', 10);
const SUF = (process.argv[6] || '19-11').trim();
const ALTURA = 720;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PERFIL = `${DIR}/.ah2nv-chrome-profile-p73v`;
const OUT = `${EV}/p73-sonda-starvacao-sync-${PAPEL}-${LARGURAS.join('-')}px-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

// O URL do ar lê-se do diário de publicação mais recente, como no resto da casa (nunca dactilografado).
const diarios = readdirSync(REPO).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10));
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-v*.json em ' + REPO);
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${diarios.slice(-1)[0]}`, 'utf8')) || [])[0] + '/';
if (!/workers\.dev/.test(URL_APP)) throw new Error('ABORTA: sem URL de publicação no diário');
const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const AR_MD5 = createHash('md5').update(Buffer.from(shellTxt)).digest('hex');
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem SUPABASE_PUBLISHABLE_KEY nos bytes servidos');

// Sessão: só o ficheiro do papel. Se o acesso ainda for válido, não renova (não gasta cadeia); se não for,
// renova UMA vez e grava no mesmo ficheiro do papel. Quem corre em paralelo tem de ser o único escritor.
// O controlo negativo precisa da SESSÃO DELE: injectar o token do papel-alvo faria o
// `BFR_CURRENT_PROFILE?.role` do predicado de prontidão nunca bater, e o aborta viria de um defeito meu.
const exp_de = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString('utf8')).exp; } catch { return 0; } };
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
  // `gravado_fiel` compara o relido com a sessão em memória (portão de escrita); `renovou` é a diferença do
  // access token ANTES/depois. Comparar um access token com um refresh token nunca daria positivo.
  sessoes[papel] = { papel, gravado_em: ficheiro.split('/').pop(), gravado_fiel: relido.access_token === acesso.access_token, renovou: acesso_antes !== acesso.access_token, access_comprimento: String(acesso.access_token || '').length, refresh_comprimento: String(acesso.refresh_token || '').length, expira_em_s: exp_de(acesso.access_token) - Math.floor(Date.now() / 1000) };
  if (!sessoes[papel].gravado_fiel) throw new Error('ABORTA: o ficheiro de ' + papel + ' relido não bate com a sessão em memória — duas vozes a escrever ou o disco não gravou');
  cache_sessao.set(papel, acesso);
  return acesso;
}

// O Chrome que o condutor usa nesta porta já pode ser órfão de lançamento cortado: mesmo portão do condutor,
// por PORTA, e recusa matar o que não é Chrome.
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
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} if (!fecho) console.log('PAROU: ' + m); try { writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); } catch {} console.log('registo ' + OUT); process.exit(c); };
// O tecto geral é a conta dos degraus, não um número redondo: cada degrau pode gastar ate 60 s de espera de
// login + 70 s de espera de ready + 5.5 s de medicao. Com 1 controlo + N larguras, o watchdog fica a 90 s
// acima do pior caso e o registo parcial e escrito na saida — uma morte por pendura nunca e silencio.
const DEGRAUS = 1 + LARGURAS.length;
const TETO_GERAL_MS = DEGRAUS * 135000 + 90000;
setTimeout(() => abort(3, 'watchdog ' + Math.round(TETO_GERAL_MS / 1000) + ' s (' + DEGRAUS + ' degraus)'), TETO_GERAL_MS);
// A régua da casa: um programa que morre tem de deixar o registo. Sem isto, o `ReferenceError` de hoje
// (`papel` fora de âmbito na linha de impressão) teria apagado o degrau do controlo já medido.
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
const saida = { programa: 'scripts/p73-sonda-starvacao-sync.mjs', em: new Date().toISOString(), ar: { url: URL_APP, md5: AR_MD5 }, papel: PAPEL, papel_de_controlo: CONTROLO, larguras: LARGURAS, sessoes, leitura_do_codigo: { criadora_da_barra: 'createNav, chamada apenas no corpo de sync', ramo_que_nao_chama_createNav: 'pintaSozinho -> paintHighlight', janela_do_teto_ms: 250, piso_ms: 60 }, resultados: {} };

let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const alvo = tg.find((t) => t.type === 'page');
if (!alvo) abort(1, 'sem alvo page');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (!m.id || !pend.has(m.id)) return; const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 70000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };

// Uma só pergunta, repetida em cada degrau da escada: o nó existe? quantos botões têm caixa? a classe de
// apresentação mobile está no body? O `body_classes` é copiado do instrumento, não inventado aqui.
const LEITURA = `(() => {
  const nav = document.getElementById('bfrMobileBottomNav');
  const bot = nav ? Array.from(nav.querySelectorAll('button[data-bfr-mobile-route]')) : [];
  const com_caixa = bot.filter((b) => b.offsetWidth || b.offsetHeight);
  return { nav_existe: !!nav, botoes: bot.length, botoes_com_caixa: com_caixa.length, corpo_mobile: document.body.classList.contains('bfr-mobile-presentation'), shell_ready: !!document.getElementById('appShell')?.classList.contains('ready'), papel: window.BFR_CURRENT_PROFILE?.role || null, lote_mutacao: window.__p73v_lotes || null, sinistros: (window.__p73v_erros || []).slice(0, 3) };
})()`;

// Contador de lotes de mutação instalado ANTES do boot, para o churn medido ser o do próprio arranque.
// A grandeza que decide a pergunta não é o total de lotes: o `dispara` (sync completo, o único que cria a
// barra) só é marcado por um `setTimeout(..., PISO)` que QUALQUER mutação cancela. Logo o que conta são os
// silêncios: `maior_silencio_ms` e `silencios_ge_60ms_n` (o PISO do módulo, lido dele, não dactilografado).
// Previsão falsificável: monitor tem 0 silêncios ≥ 60 ms e o papel de controlo tem ≥ 1 — se ambos tiverem
// silêncios e mesmo assim a barra não montar, a causa não é o PISO.
const INSTALA_CONTADOR = `(() => {
  if (window.__p73v_ob) return 'ja_instalado';
  window.__p73v_lotes = 0; window.__p73v_erros = []; window.__p73v_t = [];
  window.__p73v_ob = new MutationObserver((ms) => { window.__p73v_lotes += ms.length; window.__p73v_t.push(performance.now()); });
  window.__p73v_ob.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('error', (e) => window.__p73v_erros.push(String(e.message || e).slice(0, 120)));
  return 'instalado';
})()`;

// Estatísticas de silêncio a partir das marcas de tempo do contador, com o PISO copiado do módulo servido
// (lido do ficheiro do repo, byte-idêntico ao ar — conferido por md5 neste ciclo) e não inventado aqui.
const PISO_MS = parseInt(/const PISO = (\d+), TETO = (\d+)/.exec(readFileSync(`${REPO}/app/bfr-responsive-presentation.js`, 'utf8'))[1], 10);
const TETO_MS = parseInt(/const PISO = (\d+), TETO = (\d+)/.exec(readFileSync(`${REPO}/app/bfr-responsive-presentation.js`, 'utf8'))[2], 10);
const SILENCIOS = `(() => {
  const t = window.__p73v_t || [];
  const gaps = []; for (let i = 1; i < t.length; i++) gaps.push(t[i] - t[i-1]);
  const piso = ${PISO_MS};
  const ge = gaps.filter((g) => g >= piso).length;
  return { marcas: t.length, silencios_n: gaps.length, maior_silencio_ms: gaps.length ? Math.round(Math.max(...gaps)) : null, silencios_ge_piso_n: ge, piso_ms: piso };
})()`;

async function degrau(papel, largura) {
  await send('Emulation.setDeviceMetricsOverride', { width: largura, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 60000);
  const sess_p = await sessao_de(papel);
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sess_p)}))`);
  await send('Page.navigate', { url: URL_APP });
  const ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(papel)}`, 70000);
  await E(INSTALA_CONTADOR);
  await E('window.__p73v_lotes = 0');
  await E(`new Promise(r => setTimeout(r, 3000))`);
  const lotes_pos_ready = await E('window.__p73v_lotes');
  const silencias = await E(SILENCIOS);
  const d0 = await E(LEITURA);
  // degrau 2: UM evento isolado — a previsão do código é não montar (cai em pintaSozinho).
  await E("window.dispatchEvent(new Event('resize'))");
  await E('new Promise(r => setTimeout(r, 1000))');
  const d1 = await E(LEITURA);
  // degrau 3: DOIS eventos a 50 ms — o segundo chega dentro da janela de 250 ms e o timer corre o sync inteiro.
  await E("new Promise(r => { window.dispatchEvent(new Event('resize')); setTimeout(() => { window.dispatchEvent(new Event('resize')); r(1); }, 50); })");
  await E('new Promise(r => setTimeout(r, 1500))');
  const d2 = await E(LEITURA);
  const silencias_fim = await E(SILENCIOS);
  return { largura, ms_ready, lotes_mutacao_pos_ready: lotes_pos_ready, silencios_3s: silencias, silencios_no_fim: silencias_fim, sem_toque: d0, um_evento: d1, dois_eventos: d2 };
}

await send('Page.enable'); await send('Runtime.enable');

// O controlo negativo vem primeiro: se o papel que monta não mostrar a barra no degrau 0, a régua não pode
// distinguir «o resize criou» de «já estava lá» — e o programa aborta em vez de emitir veredicto.
const ctl = await degrau(CONTROLO, LARGURAS[0]);
saida.controlo = ctl;
if (!ctl.sem_toque.nav_existe || ctl.sem_toque.papel !== CONTROLO) throw new Error('ABORTA: o papel de controlo (' + CONTROLO + ') não mostrou a barra sem toque — régua sem dentes, nada que eu meça em ' + PAPEL + ' quer dizer');
// A segunda metade da régua: o controlo tem de ter silêncio >= PISO, senão «sem silêncio» também não discrimina
// nada (seria apenas «nenhum papel tem silêncios») e o veredicto de estrelação não querer dizer nada.
if (!ctl.silencios_no_fim.silencios_ge_piso_n) throw new Error('ABORTA: o controlo (' + CONTROLO + ') também não teve nenhum silêncio >= ' + PISO_MS + ' ms — a régua do PISO não tem lado positivo, «sem silêncio» não explica nada');
console.log('CONTROLO ' + CONTROLO + '@' + LARGURAS[0] + ': nav_existe=' + ctl.sem_toque.nav_existe + ' botoes_com_caixa=' + ctl.sem_toque.botoes_com_caixa + ' lotes_3s=' + ctl.lotes_mutacao_pos_ready + ' silencios_ge_' + PISO_MS + 'ms=' + ctl.silencios_no_fim.silencios_ge_piso_n + '/' + ctl.silencios_no_fim.silencios_n + ' maior_silencio=' + ctl.silencios_no_fim.maior_silencio_ms + 'ms · régua com dentes nos dois lados');

for (const w of LARGURAS) {
  const r = await degrau(PAPEL, w);
  saida.resultados[w] = r;
  // Quatro estados, e um deles é a falsificação da minha própria previsão: os dois eventos NÃO chegam porque
  // o teto chama `pintaSozinho`, não `dispara`. O que decide é o silêncio: sem nenhum intervalo >= PISO o
  // `dispara` nunca é armado, e a barra (que só `createNav` cria) nunca nasce — isto é mensurável e divergente.
  const sem_silencio = r.silencios_no_fim.silencios_ge_piso_n === 0;
  r.veredicto = !r.sem_toque.nav_existe && !r.um_evento.nav_existe && r.dois_eventos.nav_existe ? 'ESTRELACAO_DE_SYNC_PROVADA'
    : !r.sem_toque.nav_existe && r.um_evento.nav_existe ? 'ESTRELACAO_DE_SYNC_MAS_UM_EVENTO_CHEGA'
      : r.sem_toque.nav_existe ? 'MONTA_SEM_TOQUE'
        : sem_silencio ? 'ESTRELACAO_PELO_PISO_NUNCA_HOUVE_SILENCIO' : 'NAO_E_O_PISO_FALHOU_OUTRA_COISA';
  console.log(String(w).padEnd(5) + PAPEL.padEnd(12) + ' sem_toque=' + r.sem_toque.nav_existe + ' um_evento=' + r.um_evento.nav_existe + ' dois_eventos=' + r.dois_eventos.nav_existe + ' lotes_3s=' + r.lotes_mutacao_pos_ready + ' silencios_ge_' + PISO_MS + 'ms=' + r.silencios_no_fim.silencios_ge_piso_n + '/' + r.silencios_no_fim.silencios_n + ' maior_silencio=' + r.silencios_no_fim.maior_silencio_ms + 'ms corpo_mobile=' + r.sem_toque.corpo_mobile + ' -> ' + r.veredicto);
}
const provadas = LARGURAS.filter((w) => saida.resultados[w].veredicto.startsWith('ESTRELACAO'));
fecho = true;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('LARGURAS COM ESTRELAÇÃO DE SYNC: ' + provadas.length + '/' + LARGURAS.length + (provadas.length ? ' -> a causa da barra ausente é o agendamento (pintaSozinho nunca chama createNav), não o markup do papel' : ' -> a minha leitura do agendamento NÃO explica estas larguras; a causa está noutro lado'));
console.log('P7V_STARVACAO_MEDIDA · registo ' + OUT);
abort(0, 'fecho normal');
