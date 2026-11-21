#!/usr/bin/env node
// P86 — PROVA DE COMPORTAMENTO DA FAIXA, FORA DO AR (21/11, noite): a P85 gerou a v139 e 11 portões estáticos
// provam o CÓDIGO; falta a frase que só uma corrida dá — «uma sessão a quem o backend nega ainda lê
// Controle no backend confirmado?» E a mesma corrida serve de controlo: no mesmo browser, com a mesma sessão, o
// ar publicado (v136) pinta o verde errado e a candidata local pinta a negação. 100 por cento local: os dois
// HTML são servidos por 127.0.0.1, nada é publicado, nada é escrito no banco a não ser a rotação da cadeia de
// teste (o mesmo refresh que a P75/P78 fazem, gravado de volta no ficheiro de sessão).
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const PAPEIS = (process.argv[3] || 'developer,education_supervisor').split(',').map((x) => x.trim()).filter(Boolean);
const OUT = `${DIR}/p86-faixa-municipal-antes-depois-${SUF}.json`;
const TXT = `${DIR}/p86-faixa-municipal-antes-depois-${SUF}.txt`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const PORTA_HTTP = parseInt(process.env.P86_HTTP || '8931', 10);
const PORTA_CDP = parseInt(process.env.P86_CDP || '9391', 10);
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

// ——— predicações puras, com os dois lados provados ———
const pintouVerde = (l) => l.existe_mun_ok === true;
const pintouNegacao = (l) => l.existe_mun_danger === true;
const faixaUnica = (l) => !(l.existe_mun_ok === true && l.existe_mun_danger === true);
if (faixaUnica({ existe_mun_ok: true, existe_mun_danger: true }) !== false || faixaUnica({ existe_mun_ok: true, existe_mun_danger: false }) !== true) throw new Error('ABORTA: faixaUnica não discrimina o fixture das duas faixas');
const controluloMostraOBug = (l) => l.existe_mun_ok === true && l.sonda_tem_autorizada === false;
if (controluloMostraOBug({ existe_mun_ok: true, sonda_tem_autorizada: false }) !== true || controluloMostraOBug({ existe_mun_ok: true, sonda_tem_autorizada: true }) !== false) throw new Error('ABORTA: controlo da v136 não discrimina — o portão seria vacuo');

if (process.argv.includes('--selfteste')) { console.log('P86_SELFTESTE_OK 2/0 — faixaUnica e controlo da v136 discriminam nos fixtures (0 browser, 0 banco)'); process.exit(0); }

// ——— os dois HTML: o publicado e a candidata local ———
const FICHEIROS = {
  v136: { caminho: `${REPO}/bfr-candidata-v136-secretaria-de-educacao/index.html`, rotulo: 'ar_publicado_v136' },
  v139: { caminho: `${REPO}/bfr-candidata-v139-sonda-honesta/index.html`, rotulo: 'candidata_local_v139' },
};
const MD5_LOCAL = { v136: md5(readFileSync(FICHEIROS.v136.caminho, 'utf8')), v139: md5(readFileSync(FICHEIROS.v139.caminho, 'utf8')) };
if (MD5_LOCAL.v136 === MD5_LOCAL.v139) throw new Error('ABORTA: a candidata é idêntica ao ar — não há antes/depois para medir');
const BASE_ASSETS = `${REPO}/worker-deploy-v136-secretaria-de-educacao/public`;
if (!existsSync(`${BASE_ASSETS}/bfr-responsive-presentation.js`)) throw new Error('ABORTA: sem ' + BASE_ASSETS + ' — o boot da candidata precisa dos irmãos');
const REF = (/https:\/\/([a-z0-9]{12,24})\.supabase\.co/.exec(readFileSync(FICHEIROS.v136.caminho, 'utf8')) || [])[1];
if (!REF) throw new Error('ABORTA: nenhuma referência de projecto nos HTML — a chave de sessão não pode ser adivinhada');
const HOST = `https://${REF}.supabase.co`;
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(readFileSync(FICHEIROS.v136.caminho, 'utf8')) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos HTML');

// ——— servidor local: candidata no topo, irmãos do pacote publicado por path ———
function liberta(porta) {
  const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  for (const linha of String(q.stdout || '').split(/\r?\n/)) {
    if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
    try { spawnSync('taskkill', ['/pid', linha.trim().split(/\s+/).pop(), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  }
}
liberta(PORTA_HTTP); liberta(PORTA_CDP);
const TIPO = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.css': 'text/css', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const servidor = createServer((req, res) => {
  const m = /^\/p86-(v136|v139)\.html$/.exec(req.url || '/');
  if (m) { res.writeHead(200, { 'Content-Type': TIPO['.html'], 'Cache-Control': 'no-store' }); return createReadStream(FICHEIROS[m[1]].caminho).pipe(res); }
  const nome = String(req.url || '/').split('?')[0].replace(/^\/+/, '');
  const candid = `${BASE_ASSETS}/${nome}`.replace(/\/+/g, '/');
  if (nome && !nome.includes('..') && existsSync(candid)) { res.writeHead(200, { 'Content-Type': TIPO['.' + nome.split('.').pop()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); return createReadStream(candid).pipe(res); }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('p86: 404 ' + nome);
});
await new Promise((r) => servidor.listen(PORTA_HTTP, '127.0.0.1', r));

const PERFI = `${DIR}/.p86-chrome-${SUF}`;
if (existsSync(PERFI)) rmSync(PERFI, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFI, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${PERFI}`, '--headless=new', '--window-size=1366,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
const registros = [];
let saidaEscrita = false;
const abort = (c, m) => {
  if (saidaEscrita) return;
  saidaEscrita = true;
  try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { servidor.close(); } catch {}
  const corpo = { programa: 'scripts/p86-faixa-municipal-antes-depois.mjs', em: new Date().toISOString(), INTERROMPIDA: m, duracao_ms: Date.now() - t0, registros };
  writeFileSync(OUT, JSON.stringify(corpo, null, 2) + '\n');
  writeFileSync(TXT, `P86_FAIXA_INTERROMPIDA ${m}\nregistros=${registros.length}\nnode_exit=${c}\n`);
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, `watchdog ${PAPEIS.length * 2} sessoes x 135 s`), PAPEIS.length * 2 * 135000 + 90000);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => abort(4, 'ws fechado');
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map(); const erros = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') erros.push(String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 180));
};
const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
  const i = ++seq; const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method)); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
await send('Page.enable'); await send('Runtime.enable');

for (const papel of PAPEIS) {
  const SESSAO = `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${papel}.json`;
  if (!existsSync(SESSAO)) { registros.push({ papel, falha: 'sem_ficheiro_de_sessao', caminho: SESSAO }); continue; }
  const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
  if (!S[papel]?.refresh_token) { registros.push({ papel, falha: 'sem_refresh_token' }); continue; }
  const renova = async () => {
    for (let n = 0; n < 4; n++) {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[papel].refresh_token }), signal: AbortSignal.timeout(45000) });
      const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
      if (j && j.access_token) { S[papel] = { ...S[papel], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); return j; }
      if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) throw new Error('CADEIA QUEIMADA em ' + papel + ' — precisa de re-login com OK');
      await new Promise((rz) => setTimeout(rz, 2500 * (n + 1)));
    }
    throw new Error('refresh falhou 4x');
  };
  let tok;
  try { tok = await renova(); } catch (e) { registros.push({ papel, falha: 'auth: ' + String(e.message || e).slice(0, 120) }); continue; }
  const payloadSessao = JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user });

  for (const chave of ['v136', 'v139']) {
    const url = `http://127.0.0.1:${PORTA_HTTP}/p86-${chave}.html`;
    // A origem tem de estar aberta antes de se tocar em localStorage: em about:blank o acesso é negado
    // (mesmo SecurityError que abortou a 1.ª corrida da P75). Primeiro abre-se, injeta-se, e só então se
    // recarrega com a sessão dentro.
    await send('Page.navigate', { url }, 60000);
    await new Promise((r) => setTimeout(r, 1500));
    await E(`(() => { localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(payloadSessao)}); return 1; })()`);
    await send('Page.navigate', { url }, 60000);
    for (let i = 0; i < 90; i++) { if (await E('!!(window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.sonda)')) break; await new Promise((r) => setTimeout(r, 500)); }
    await new Promise((r) => setTimeout(r, 2500));
    // Escada de clique (rato → sintético → chamada directa): um só clique sintético não roteou em P75/P81, e
    // sem painel desenhado não há faixa para ler. Cada degrau regrava e nomeia o que pintou.
    const ESTADO = `(() => {
      const v = document.getElementById('bfrMunicipalView');
      const ok = v ? v.querySelector('.mun-ok') : null, dg = v ? v.querySelector('.mun-danger') : null, wn = v ? v.querySelector('.mun-warn') : null;
      const s = window.BFR_MUNICIPAL ? window.BFR_MUNICIPAL.sonda : null;
      const caixa = (el) => { if (!el || typeof el.getBoundingClientRect !== 'function') return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
      const nav = [...document.querySelectorAll('button[data-bfr-municipal-nav], [data-section="secretaria-municipal"]')];
      const pintado = !!(ok || dg || wn);
      // O painel desenha primeiro «Carregando dados reais…» (mod:570) e só pinta a faixa quando o carregador
      // e a sonda resolvem. Ler logo a seguir ao clique mede o placeholder, não a faixa: é o que deu o
      // vermelho da corrida e, e é defeito do instrumento.
      const carregando = v ? /Carregando dados reais/.test(String(v.textContent || '')) : null;
      return { existe_painel: !!v, display: v ? getComputedStyle(v).display : null, chars: v ? String(v.textContent || '').length : 0, abas: v ? v.querySelectorAll('.mun-tab').length : 0,
        carregando, texto_painel: v ? String(v.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 140) : null,
        existe_mun_ok: !!ok, existe_mun_danger: !!dg, existe_mun_warn: !!wn,
        textos_warn: v ? [...v.querySelectorAll('.mun-warn')].map((w) => String(w.textContent).replace(/\\s+/g, ' ').trim().slice(0, 110)) : null,
        texto_ok: ok ? String(ok.textContent).replace(/\\s+/g, ' ').trim().slice(0, 160) : null,
        texto_danger: dg ? String(dg.textContent).replace(/\\s+/g, ' ').trim().slice(0, 160) : null,
        navs: nav.length, nav_caixas: nav.map(caixa), sonda_tem_autorizada: !!s && Object.prototype.hasOwnProperty.call(s, 'autorizada'),
        sonda_feita: s ? s.feita ?? null : null, sonda_executavel: s ? s.executavel ?? null : null,
        sonda_autorizada: s && Object.prototype.hasOwnProperty.call(s, 'autorizada') ? s.autorizada : 'CAMPO_INEXISTENTE_NESTE_AR',
        sonda_resposta: s && Object.prototype.hasOwnProperty.call(s, 'resposta') ? s.resposta : 'CAMPO_INEXISTENTE_NESTE_AR',
        apto_para_sessao: (window.BFR_MUNICIPAL && typeof window.BFR_MUNICIPAL.aptoParaSessao === 'function') ? window.BFR_MUNICIPAL.aptoParaSessao() : null,
        tem_abrir: !!(window.BFR_MUNICIPAL && typeof window.BFR_MUNICIPAL.abrir === 'function'), pintado };
    })()`;
    let est = await E(ESTADO);
    const degraus = [];
    // Espera com teto: sai quando há faixa, mas também quando o placeholder acabou sem faixa (nesse caso o
    // registo traz `carregando:false` + `texto_painel`, e o vermelho é do produto, não do relógio.
    const esperarFaixa = async (tetoMs) => {
      const t = Date.now(); let e = await E(ESTADO);
      while (!e.pintado && Date.now() - t < tetoMs) { await new Promise((r) => setTimeout(r, 400)); e = await E(ESTADO); }
      return { e, espera_ms: Date.now() - t };
    };
    const clicarEm = async (cx) => {
      const x = cx.x + Math.round(cx.w / 2), y = cx.y + Math.round(cx.h / 2);
      for (const tipo of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: tipo, x, y, button: 'left', clickCount: 1, buttons: tipo === 'mousePressed' ? 1 : 0 });
    };
    const abrirSintetico = `(() => { const b = [...document.querySelectorAll('button[data-bfr-municipal-nav], [data-section="secretaria-municipal"]')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || document.querySelector('button[data-bfr-municipal-nav]'); if (!b) return 'sem_botao'; b.click(); return 'clicado'; })()`;
    const chamarAbrir = `(() => { if (!window.BFR_MUNICIPAL || typeof window.BFR_MUNICIPAL.abrir !== 'function') return 'sem_abrir'; window.BFR_MUNICIPAL.abrir(); return 'abrir_chamado'; })()`;
    for (let degrau = 1; degrau <= 3 && !est.pintado; degrau++) {
      let accao = null;
      if (degrau === 1) { const cx = est.nav_caixas.find((c) => c && c.w > 0 && c.h > 0); accao = cx ? (await clicarEm(cx), 'rato@' + cx.x + ',' + cx.y) : 'sem_caixa_visivel'; }
      else if (degrau === 2) accao = await E(abrirSintetico);
      else accao = await E(chamarAbrir);
      await new Promise((r) => setTimeout(r, 1400));
      const antes = est;
      const esper = await esperarFaixa(12000);
      est = esper.e;
      degraus.push({ degrau, accao, passou_de_pintado: antes.pintado, passou_para_pintado: est.pintado, espera_ms: esper.espera_ms, carregando_ao_sair: est.carregando, display: est.display, chars: est.chars, texto_painel: est.texto_painel });
      if (est.sonda_feita !== true) { const mais = await esperarFaixa(8000); est = mais.e; degraus[degraus.length - 1].espera_ms += mais.espera_ms; }
    }
    const lido = { papel, ar: chave, url_servida: url, ...est, degraus, painel_chars: est.chars, painel_display: est.display };
    registros.push(lido);
    console.log(`${chave} ${papel}: autorizada=${JSON.stringify(est.sonda_autorizada)} ok=${est.existe_mun_ok} danger=${est.existe_mun_danger} warn=${est.existe_mun_warn} chars=${est.chars} espera_ms=${degraus.reduce((a, d) => a + (d.espera_ms || 0), 0)} degrau=${(est.pintado ? degraus : []).length}`);
    if (est.texto_danger) console.log(`   faixa_danger: ${est.texto_danger}`);
    if (est.texto_ok) console.log(`   faixa_ok:     ${est.texto_ok}`);
  }
}

try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { servidor.close(); } catch {}
const porChavePapel = {};
for (const r of registros) porChavePapel[`${r.ar}|${r.papel}`] = r;
const negada = (papel) => porChavePapel[`v139|${papel}`] && porChavePapel[`v139|${papel}`].sonda_autorizada === false;
const autorizada = (papel) => porChavePapel[`v139|${papel}`] && porChavePapel[`v139|${papel}`].sonda_autorizada === true;

const falhas = []; const portoes = [];
const g = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(`${nome} | ${JSON.stringify(dado).slice(0, 300)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('todas_as_sessoes_autenticaram', PAPEIS.every((p) => registros.some((r) => r.papel === p && !r.falha)), PAPEIS.map((p) => p + '=' + (registros.filter((r) => r.papel === p && !r.falha).length ? 'ok' : (registros.find((r) => r.papel === p) || {}).falha || 'sem_registro')));
g('o_controlo_na_v136_repete_o_erro_medido', PAPEIS.some((p) => controluloMostraOBug(porChavePapel[`v136|${p}`] || {})), { v136: PAPEIS.map((p) => p + ': ok=' + (porChavePapel[`v136|${p}`] || {}).existe_mun_ok + ' tem_autorizada=' + (porChavePapel[`v136|${p}`] || {}).sonda_tem_autorizada) });
g('na_v139_a_sessao_negada_ve_a_negacao_e_nao_o_verde', PAPEIS.filter(negada).length > 0 && PAPEIS.filter(negada).every((p) => pintouNegacao(porChavePapel[`v139|${p}`]) && !pintouVerde(porChavePapel[`v139|${p}`])), { negadas: PAPEIS.filter(negada), lido: PAPEIS.filter(negada).map((p) => p + ': danger=' + (porChavePapel[`v139|${p}`] || {}).existe_mun_danger + ' ok=' + (porChavePapel[`v139|${p}`] || {}).existe_mun_ok) });
g('na_v139_a_sessao_autorizada_continua_a_ver_o_verde', PAPEIS.filter(autorizada).length > 0 && PAPEIS.filter(autorizada).every((p) => pintouVerde(porChavePapel[`v139|${p}`]) && !pintouNegacao(porChavePapel[`v139|${p}`])), { autorizadas: PAPEIS.filter(autorizada), lido: PAPEIS.filter(autorizada).map((p) => p + ': ok=' + (porChavePapel[`v139|${p}`] || {}).existe_mun_ok + ' danger=' + (porChavePapel[`v139|${p}`] || {}).existe_mun_danger) });
g('nenhuma_pintura_tem_as_duas_faixas_ao_mesmo_tempo', registros.filter((r) => !r.falha).every(faixaUnica), registros.filter((r) => !r.faixa && !(r.existe_mun_ok || r.existe_mun_danger || r.existe_mun_warn)).map((r) => r.ar + '|' + r.papel));
g('a_candidata_local_ainda_nao_foi_publicada', md5(readFileSync(FICHEIROS.v136.caminho, 'utf8')) === MD5_LOCAL.v136 && !existsSync(`${REPO}/audit-publicacao-v139.json`), { md5_v136_local: MD5_LOCAL.v136, md5_v139_local: MD5_LOCAL.v139, diario_v139_existe: existsSync(`${REPO}/audit-publicacao-v139.json`) });

saidaEscrita = true;
const out = {
  programa: 'scripts/p86-faixa-municipal-antes-depois.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'a faixa da sonda diz a verdade na sessão a quem o backend nega — e o que é que o ar publicado diz hoje na mesma sessão?',
  metodo: 'os dois HTML (publicado v136 e candidata local v139) servidos por 127.0.0.1; a sessão de teste é a mesma nos dois, obtida pelo refresh habitual da cadeia do papel, gravado de volta no ficheiro de sessão. 0 publicação, 0 DDL, 0 escrita de produto. Não se imprime token: só os campos da sonda.',
  ar: { url_servida_local: `http://127.0.0.1:${PORTA_HTTP}/p86-<arn>.html`, ref_projecto: REF, md5: MD5_LOCAL },
  papeis: PAPEIS, registros, portoes, falhas,
  o_que_este_verde_nao_autoriza: 'Nada fora do browser. Nada foi publicado: a v139 continua em disco. Publicar, aplicar DDL, conceder acesso ou escrever municipality_id pedem cada um o seu OK literal.',
  excecoes: erros.slice(0, 8),
};
out.veredito = falhas.length === 0 ? 'P86_FAIXA_MUNICIPAL_ANTES_DEPOIS_OK ' + portoes.length + '/0' : `P86_FAIXA_MUNICIPAL_ANTES_DEPOIS_VERMELHO ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\nfalhas=${falhas.length}\nregistros=${registros.length}\nnode_exit=${falhas.length ? 1 : 0}\n` + falhas.map((f) => '  FALTA ' + f).join('\n') + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
