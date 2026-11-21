#!/usr/bin/env node
// P88 — A TRILHA É CHAMADA, E NÃO CHEGA AO BANCO (21/11, noite). A P87 provou por estática que a v140 chama
// `registrarTrilha` com as quatro colunas e a guarda `autorizada === true`. Falta a frase que só uma corrida dá:
// «na sessão a quem o backend nega, o painel não tenta escrever; na sessão autorizada tenta, e o payload é só o
// que a política permite.» Para isso o `from(...)` do cliente é INTERCEPTADO no browser: a INSERT é registada e
// devolvida falsamente sem rede, portanto esta peça não escreve uma linha em `bfr_municipal_audit` — e prova que
// não escreveu pelo censo SELECT-only antes e depois. 0 publicação, 0 DDL, 0 INSERT de verdade.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { sql } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const PAPEIS = (process.argv[3] || 'developer,education_supervisor').split(',').map((x) => x.trim()).filter(Boolean);
const OUT = `${DIR}/p88-trilha-interceptada-${SUF}.json`;
const TXT = `${DIR}/p88-trilha-interceptada-${SUF}.txt`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const PORTA_HTTP = parseInt(process.env.P88_HTTP || '8933', 10);
const PORTA_CDP = parseInt(process.env.P88_CDP || '9393', 10);
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

// ——— predicações puras, com os dois lados provados ———
const ninguemEscreveu = (antes, depois) => Number(antes) === Number(depois);
const tentouApenasNaAutorizada = (lidos) => {
  const negadas = lidos.filter((l) => l.sonda_autorizada === false);
  const autorizadas = lidos.filter((l) => l.sonda_autorizada === true);
  return negadas.length > 0 && autorizadas.length > 0 && negadas.every((l) => l.insert_registadas === 0) && autorizadas.every((l) => l.insert_registadas >= 1);
};
if (ninguemEscreveu('7', '7') !== true || ninguemEscreveu('7', '8') !== false) throw new Error('ABORTA: ninguemEscreveu não discrimina 0 de +1 linha');
if (tentouApenasNaAutorizada([{ sonda_autorizada: false, insert_registadas: 0 }, { sonda_autorizada: true, insert_registadas: 1 }]) !== true) throw new Error('ABORTA: tentouApenasNaAutorizada chumba o par legítimo');
if (tentouApenasNaAutorizada([{ sonda_autorizada: false, insert_registadas: 1 }, { sonda_autorizada: true, insert_registadas: 1 }]) !== false) throw new Error('ABORTA: tentouApenasNaAutorizada deixa passar a sessão negada a escrever');
if (tentouApenasNaAutorizada([{ sonda_autorizada: true, insert_registadas: 0 }]) !== false) throw new Error('ABORTA: tentouApenasNaAutorizada dá verde sem sessão negada — o portão seria vacuo');

if (process.argv.includes('--selfteste')) { console.log('P88_SELFTESTE_OK — ninguemEscreveu e tentouApenasNaAutorizada discriminam nos seus fixtures (0 browser, 0 banco)'); process.exit(0); }

const CAND = `${REPO}/bfr-candidata-v140-trilha-de-acesso/index.html`;
const PORTOES_CAND = `${REPO}/bfr-candidata-v140-trilha-de-acesso/portoes-v140-candidata.json`;
if (!existsSync(CAND)) throw new Error('ABORTA: sem candidata v140 — gere-a primeiro com a P87');
const registoP87 = JSON.parse(readFileSync(PORTOES_CAND, 'utf8'));
if (!/OK/.test(String(registoP87.veredito))) throw new Error('ABORTA: portões da v140 não verdes (' + registoP87.veredito + ')');
if (String(registoP87.destino.md5) !== md5(readFileSync(CAND, 'utf8'))) throw new Error('ABORTA: o index.html em disco não é o certificada pela P87 — não medir sobre bytes tocados à mão');
const MESA = String(registoP87.trilha.mesa_lida_do_ddl);
if (!MESA || MESA === 'undefined') throw new Error('ABORTA: a mesa de auditoria não veio no registo da P87');
const COLUNAS = registoP87.trilha.colunas_do_ddl;
const BASE_ASSETS = `${REPO}/worker-deploy-v136-secretaria-de-educacao/public`;
if (!existsSync(`${BASE_ASSETS}/bfr-responsive-presentation.js`)) throw new Error('ABORTA: sem ' + BASE_ASSETS);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(readFileSync(CAND, 'utf8')) || [])[1];
const REF = (/https:\/\/([a-z0-9]{12,24})\.supabase\.co/.exec(readFileSync(CAND, 'utf8')) || [])[1];
if (!ANON || !REF) throw new Error('ABORTA: sem chave publishable ou referência de projecto na candidata');
const HOST = `https://${REF}.supabase.co`;

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
  if (/^\/p88-v140\.html$/.test(req.url || '')) { res.writeHead(200, { 'Content-Type': TIPO['.html'], 'Cache-Control': 'no-store' }); return createReadStream(CAND).pipe(res); }
  const nome = String(req.url || '/').split('?')[0].replace(/^\/+/, '');
  const f = `${BASE_ASSETS}/${nome}`.replace(/\/+/g, '/');
  if (nome && !nome.includes('..') && existsSync(f)) { res.writeHead(200, { 'Content-Type': TIPO['.' + nome.split('.').pop()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); return createReadStream(f).pipe(res); }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('p88: 404 ' + nome);
});
await new Promise((r) => servidor.listen(PORTA_HTTP, '127.0.0.1', r));

// ——— o banco, antes: só um count ———
const linhasAntes = (await sql(`select count(*)::text as n from public.${MESA}`))[0]?.n ?? null;
if (linhasAntes === null) throw new Error('ABORTA: o censo de ' + MESA + ' não respondeu — sem «antes» não há «não escrevi»');

const PERFI = `${DIR}/.p88-chrome-${SUF}`;
if (existsSync(PERFI)) rmSync(PERFI, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFI, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${PERFI}`, '--headless=new', '--window-size=1366,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
const registros = [];
let saidaEscrita = false;
// O `taskkill` no fim é PLANEADO: fechar o websocket dispara este mesmo handler, e foi isso que escreveu o
// parcial por cima do veredicto na corrida a. Só uma morte involuntária do browser pode abortar.
let fechoPlaneado = false;
const abort = (c, m) => {
  if (saidaEscrita) return;
  saidaEscrita = true;
  try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { servidor.close(); } catch {}
  writeFileSync(OUT, JSON.stringify({ programa: 'scripts/p88-trilha-interceptada-no-browser.mjs', em: new Date().toISOString(), INTERROMPIDA: m, duracao_ms: Date.now() - t0, linhas_antes: linhasAntes, registros }, null, 2) + '\n');
  writeFileSync(TXT, `P88_TRILHA_INTERROMPIDA ${m}\nregistros=${registros.length}\nnode_exit=${c}\n`);
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, `watchdog ${PAPEIS.length} sessoes x 165 s`), PAPEIS.length * 165000 + 90000);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fechoPlaneado) abort(4, 'ws fechado'); };
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

// O interceptador: substitui `client().from(nome)` por um proxy que DEVOLVE a mesa real para leitura e trava a
// INSERT da mesa de auditoria. Fica registada em window.__P88 com o payload exacto que o bundle passou.
const INSTALAR = `(() => {
  const rt = window.BFR_APP_RUNTIME; if (!rt || !rt.client || typeof rt.client.from !== 'function') return 'sem_cliente';
  if (rt.__P88_INSTALADO) return 'ja_instalado';
  const origin = rt.client.from.bind(rt.client);
  window.__P88 = { interceptado: true, leituras: [], inserts_travados: [] };
  rt.client.from = (nome) => {
    const t = origin(nome);
    if (String(nome) === ${JSON.stringify(MESA)}) {
      return { insert: async (payload) => { window.__P88.inserts_travados.push({ mesa: String(nome), payload, em: Date.now() }); return { data: null, error: null }; } };
    }
    window.__P88.leituras.push(String(nome));
    return t;
  };
  rt.__P88_INSTALADO = 1;
  return 'instalado';
})()`;
const LER = `(() => {
  const v = document.getElementById('bfrMunicipalView');
  const s = window.BFR_MUNICIPAL ? window.BFR_MUNICIPAL.sonda : null;
  const tr = window.BFR_MUNICIPAL ? window.BFR_MUNICIPAL.trilha : null;
  const p = window.__P88 || null;
  const dg = v ? v.querySelector('.mun-danger') : null, ok = v ? v.querySelector('.mun-ok') : null;
  return { existe_painel: !!v, chars: v ? String(v.textContent || '').length : 0, abas: v ? v.querySelectorAll('.mun-tab').length : 0,
    tem_trilha_no_objeto: !!tr && typeof tr === 'object', trilha_tentada: tr ? tr.tentada ?? null : null, trilha_escrita: tr ? tr.escrita ?? null : null, trilha_erro: tr ? String(tr.erro || '') : null, trilha_acoes: tr ? tr.acoes : null,
    sonda_feita: s ? s.feita ?? null : null, sonda_autorizada: s ? s.autorizada ?? null : null, sonda_resposta: s ? s.resposta ?? null : null,
    faixa_danger: !!dg, faixa_ok: !!ok, texto_danger: dg ? String(dg.textContent).replace(/\\s+/g, ' ').trim().slice(0, 140) : null,
    interceptador: p ? p.interceptado === true : false, insert_registadas: p ? p.inserts_travados.length : null,
    payloads: p ? p.inserts_travados.map((x) => ({ mesa: x.mesa, chaves: Object.keys(x.payload || {}), actor_forma: typeof (x.payload || {}).actor, detail: (x.payload || {}).detail, action: (x.payload || {}).action, entity: (x.payload || {}).entity })) : null,
    mesas_lidas: p ? [...new Set(p.leituras)].sort() : null, n_leituras: p ? p.leituras.length : null };
})()`;

for (const papel of PAPEIS) {
  const SESSAO = `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${papel}.json`;
  if (!existsSync(SESSAO)) { registros.push({ papel, falha: 'sem_ficheiro_de_sessao', caminho: SESSAO }); continue; }
  const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
  if (!S[papel]?.refresh_token) { registros.push({ papel, falha: 'sem_refresh_token' }); continue; }
  let tok = null;
  for (let n = 0; n < 4 && !tok; n++) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[papel].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { tok = j; S[papel] = { ...S[papel], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); }
    else if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) { registros.push({ papel, falha: 'CADEIA_QUEIMADA' }); tok = 'queimada'; }
    else await new Promise((rz) => setTimeout(rz, 2500 * (n + 1)));
  }
  if (!tok || tok === 'queimada') continue;
  const payloadSessao = JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user });
  const url = `http://127.0.0.1:${PORTA_HTTP}/p88-v140.html`;
  await send('Page.navigate', { url }, 60000);
  await new Promise((r) => setTimeout(r, 1500));
  await E(`(() => { localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(payloadSessao)}); return 1; })()`);
  await send('Page.navigate', { url }, 60000);
  for (let i = 0; i < 90; i++) { if (await E('!!(window.BFR_MUNICIPAL && window.BFR_MUNICIPAL.sonda)')) break; await new Promise((r) => setTimeout(r, 500)); }
  await new Promise((r) => setTimeout(r, 2000));
  const instalar = await E(INSTALAR);
  const abrirs = await E(`(() => { if (!window.BFR_MUNICIPAL || typeof window.BFR_MUNICIPAL.abrir !== 'function') return 'sem_abrir'; window.BFR_MUNICIPAL.abrir(); return 'abrir_chamado'; })()`);
  const tEspera = Date.now(); let lido = await E(LER);
  // Espera pela FAIXA pintada (chars > 1000), não pela sonda: a sonda já respondeu ao boot (`sondarBackend()`
  // na linha 680 do módulo), por isso sair logo que `autorizada` é conhecida media o placeholder de 389 chars.
  while (Date.now() - tEspera < 25000 && !(lido.chars > 1000 && (lido.insert_registadas >= 1 || lido.sonda_autorizada === false))) { await new Promise((r) => setTimeout(r, 500)); lido = await E(LER); }
  const reg = { papel, instalar, abrirs, espera_ms: Date.now() - tEspera, ...lido };
  registros.push(reg);
  console.log(`${papel}: autorizada=${JSON.stringify(lido.sonda_autorizada)} instalar=${JSON.stringify(lido.instalar)} interceptador=${JSON.stringify(lido.interceptador)} trilha_tentada=${JSON.stringify(lido.trilha_tentada)} inserts_na_mesa=${JSON.stringify(lido.insert_registadas)} leituras=${JSON.stringify(lido.n_leituras)} chars=${lido.chars} espera_ms=${reg.espera_ms}`);
  if (lido.payloads?.length) console.log(`   payloads: ${JSON.stringify(lido.payloads).slice(0, 300)}`);
}

fechoPlaneado = true;
try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { servidor.close(); } catch {}
const linhasDepois = (await sql(`select count(*)::text as n from public.${MESA}`))[0]?.n ?? null;
const porPapel = {}; for (const r of registros) porPapel[r.papel] = r;

const falhas = []; const portoes = [];
const g = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(`${nome} | ${JSON.stringify(dado).slice(0, 300)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('todas_as_sessoes_autenticaram', PAPEIS.every((p) => porPapel[p] && !porPapel[p].falha), PAPEIS.map((p) => p + '=' + (porPapel[p] ? (porPapel[p].falha || 'ok') : 'sem_registro')));
g('o_interceptador_foi_instalado_antes_da_abertura', registros.length > 0 && registros.every((r) => r.instalar === 'instalado' && r.interceptador === true), registros.map((r) => r.papel + ':' + r.instalar + '/vivo=' + r.interceptador));
g('a_trilha_existe_no_objeto_publico_da_v140', registros.length > 0 && registros.every((r) => r.tem_trilha_no_objeto === true), registros.map((r) => r.papel + ':tem_trilha=' + r.tem_trilha_no_objeto));
g('a_sessao_negada_nao_tenta_escrever', PAPEIS.every((p) => !porPapel[p] || porPapel[p].sonda_autorizada !== false || (porPapel[p].trilha_tentada === false && porPapel[p].insert_registadas === 0)), PAPEIS.map((p) => p + ':' + JSON.stringify({ a: porPapel[p]?.sonda_autorizada, t: porPapel[p]?.trilha_tentada, i: porPapel[p]?.insert_registadas })));
g('a_sessao_autorizada_tenta_e_so_escreve_as_colunas_da_mesa', (() => { const ls = PAPEIS.map((p) => porPapel[p]).filter((r) => r && r.sonda_autorizada === true); return ls.length > 0 && ls.every((r) => r.insert_registadas >= 1 && (r.payloads || []).every((x) => x.mesa === MESA && x.chaves.every((k) => COLUNAS.includes(k)) && x.actor_forma === 'string')); })(), PAPEIS.map((p) => p + ':' + JSON.stringify({ a: porPapel[p]?.sonda_autorizada, i: porPapel[p]?.insert_registadas, payloads: porPapel[p]?.payloads })).slice(0, 4));
g('o_par_negada_autorizada_separa_se_pela_guarda_do_backend', tentouApenasNaAutorizada(registros), registros.map((r) => r.papel + ': autorizada=' + r.sonda_autorizada + ', inserts=' + r.insert_registadas));
g('as_leituras_do_painel_continuaram_reais', registros.every((r) => r.chars > 1000 && r.abas >= 1 && (r.mesas_lidas || []).length > 0), registros.map((r) => r.papel + ':chars=' + r.chars + ',mesas=' + (r.mesas_lidas || []).length));
g('nenhuma_linha_chegou_ao_banco', ninguemEscreveu(linhasAntes, linhasDepois), { mesa: MESA, antes: linhasAntes, depois: linhasDepois, nota: 'o interceptador devolve {data:null,error:null} sem rede: se a contagem mexesse, a escrita teria saído do browser' });
g('o_portao_tem_dentes_a_insert_foi_registada_pelo_interceptador', (() => { const total = registros.reduce((a, r) => a + (r.insert_registadas || 0), 0); return total >= 1; })(), { total_registradas: registros.reduce((a, r) => a + (r.insert_registadas || 0), 0), por_papel: registros.map((r) => r.papel + '=' + r.insert_registadas), nota: 'verde sem positivo possível era o defeito que a P82 tinha: sem esta contagem o portão 7 seria vacuo' });

const out = {
  programa: 'scripts/p88-trilha-interceptada-no-browser.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'a v140 chama mesmo a trilha, só na sessão autorizada, e sem que esta corrida deixe uma linha no banco?',
  metodo: 'candidata v140 servida por 127.0.0.1 com a sessão de teste; `client().from` é substituído ANTES de abrir o painel, por isso o INSERT da mesa de auditoria é registado e travado no browser. O count de ' + MESA + ' é lido por SELECT antes e depois. 0 publicação, 0 DDL, 0 INSERT de verdade.',
  candidata: { ficheiro: 'bfr-candidata-v140-trilha-de-acesso/index.html', md5: md5(readFileSync(CAND, 'utf8')), veredito_p87: registoP87.veredito, mesa: MESA, colunas_do_ddl: COLUNAS },
  banco: { antes: linhasAntes, depois: linhasDepois },
  erros_do_browser: erros.slice(0, 8),
  registros,
  o_que_este_verde_nao_autoriza: 'Nada. A escrita real só acontece com a v140 publicada, e publicar pede OK literal. Esta corrida prova o caminho do código, não a trilha de ninguém.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P88_TRILHA_INTERCEPTADA_OK ' + portoes.length + '/0' : `P88_TRILHA_INTERCEPTADA_VERMELHO ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\nbanco_antes=${linhasAntes} depois=${linhasDepois}\n${registros.map((r) => r.papel + ': autorizada=' + r.sonda_autorizada + ' tentada=' + r.trilha_tentada + ' inserts=' + r.insert_registadas).join('\n')}\nnode_exit=0\n`);
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · banco ${linhasAntes} → ${linhasDepois}`);
process.exit(falhas.length ? 1 : 0);
