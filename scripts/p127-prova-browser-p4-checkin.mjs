#!/usr/bin/env node
// P127 — prova de browser do degrau §8-P4 do plano da RM-5.2 (docs/plano-rm52-conteudo-calendario-20-11.md:202).
// O que faltava: o fio entre o controlo que o porteiro ve e o nome do RPC que sai, e a pergunta explicita
// do plano — se algum ouvinte da base (o shell legado, que so sabe chamar o v1) ainda esta ligado ao
// controlo visivel depois de o modulo diferido ter tomado o contentor. O preflight da PEN-48 recusa-se a
// provar isso e diz-o no campo proprio (scripts/p73-pen48-preflight.mjs:310).
// Metodo: sessao de gatekeeper no ar medido; censos do contentor; ouvintes enumerados por
// DOMDebugger.getEventListeners e classificados pela camada do fonte em torno da declaracao
// (scriptId + lineNumber/columnNumber com Debugger.getScriptSource), porque este build nao devolve o
// handler; clique real com hit-test antes de cada Input.dispatchMouseEvent; nome do RPC lido de
// Network.requestWillBeSent; gate_checkins e as outras tres mesas conferidos por SELECT so-leitura antes e
// depois. O cracha submetido e de controlo e inexistente por construcao.
// Nao faz: DDL, publicacao, mint, rotacao de senha, push.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ROTULO = process.argv[2] || 'a';
const PAPEL = 'gatekeeper';
const CRACHA = 'P4CONTROLEINEXISTENTE0123456789';
const MOTIVO = 'P4 controle de prova';
const PORT = parseInt(process.env.P127_PORT || '9401', 10);
const PERFIL = DIR + '/.p127-perfil-' + PORT;
const OUT = REPO + '/evidence/p127-prova-browser-p4-checkin-' + ROTULO + '.json';
const PARCIAL = REPO + '/evidence/p127-prova-browser-p4-checkin-' + ROTULO + '-INTERROMPIDA.json';
const WATCHDOG_MS = 540000;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe - corra com outro rotulo');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();
const inicio = new Date().toISOString();

const MARCA_MODULO = 'registerGateToken';
const MARCA_LEGADO = 'registerGateCheckin';
const NOME_V1 = 'register_gate_checkin';
const NOME_V2 = 'register_gate_checkin_v2';
const NOMES_CHECKIN = [NOME_V1, NOME_V2];

// Camada de um ouvinte: os dois nomes de funcao que produzem os dois pedidos possiveis. A presenca de
// ambos nos bytes servidos e portao (R3), nao pressuposto.
const camadaDoFonte = (fonte) => {
  const texto = String(fonte || '');
  const m = texto.includes(MARCA_MODULO);
  const l = texto.includes(MARCA_LEGADO);
  if (m && l) return 'ambigua';
  if (m) return 'modulo_diferido';
  if (l) return 'legado_shell';
  return 'desconhecida';
};

// Regua de escrita: tres lados independentes, porque uma linha nova com checked_at no passado deixaria o
// maximo igual. O esperado e derivado do par medida-antes, nunca de um numero lembrado.
const reguaEscrita = (a, d) => [d.linhas === a.linhas, d.ultimo === a.ultimo, d.novas === 0];
// Regua de atribuicao, POR PASSO. A versao anterior julgava a lista inteira de pedidos e, quando a lista
// vinha vazia, `[].every()` dava verde sem nada ter sido medido — o defeito da régua sem positivo.
// O esperado de cada passo deriva de tres medidas desta corrida: a camada do ouvinte que pode ter agido,
// o modo legado medido no canal por fora, e o motivo excepcional realmente lido no campo. O nome do RPC
// depende so do modo legado; o que o guarda decide e se o pedido sai, nunca qual nome sai.
const reguaPasso = (camada, tentado, motivoLidoOk, nomesUnicos, modoLegado) => {
  if (!tentado) return { esperado: null, bate: null, motivo: 'nenhum degrau da escada emitiu um dos dois RPC neste passo' };
  if (camada === 'legado_shell') return { esperado: [NOME_V1], bate: JSON.stringify(nomesUnicos) === JSON.stringify([NOME_V1]), motivo: 'o shell chama sempre o wrapper base' };
  const admitido = modoLegado ? NOME_V1 : NOME_V2;
  if (motivoLidoOk || modoLegado) return { esperado: [admitido], bate: JSON.stringify(nomesUnicos) === JSON.stringify([admitido]), motivo: 'passo com motivo (ou modulo em modo legado): um pedido, com o nome do modo medido' };
  if (nomesUnicos.length === 0) return { esperado: null, bate: null, motivo: 'sem motivo e fora do modo legado: o guarda pode suprimir o pedido, logo so o nome, se sair, e julgavel' };
  return { esperado: [admitido], bate: JSON.stringify(nomesUnicos) === JSON.stringify([admitido]), motivo: 'saiu um pedido apesar de o motivo nao ter sido lido: o nome e julgavel' };
};
// Regua das quatro mesas de referencia: se uma linha aparece numa mesa que nao a gate_checkins, a corrida
// escreveu no banco e o artefacto nao pode dizer «nada foi escrito». Tres lados porque o par de contagens
// so nao detecta uma substituicao (entra uma linha, sai outra).
const reguaBaselines = (a, d) => [
  !!a && !!d,
  JSON.stringify(a) === JSON.stringify(d),
  !!a && !!d && a.checkins === d.checkins && a.schools === d.schools && a.profiles === d.profiles && a.students === d.students,
];
// Regua de classificacao: nenhum ouvinte de submissao pode ficar sem camada.
const reguaCamadas = (lista) => lista.map((o) => o.camada !== 'desconhecida' && o.camada !== 'ambigua');
// Regua da nao-alcancabilidade: um passo que nao se pode clicar so vale como medida se o registo disser POR
// QUE e com que o confirmou. Sem isso, «nao alcancavel» e apenas o instrumento a renderizar-se a si mesmo,
// e a hipotese viva — pagina sem contentor rolavel — fica por falsificar.
const reguaCausaNaoAlcancavel = (p, censoCaixa, escaladaTentada) => {
  if (p.alcancavel === true) return [true, true, true];
  const motivo = String(p.motivo || '');
  const g = (p.geo && p.geo.entrada) || null;
  const semCaixa = !!(g && g.w <= 0);
  const abaixoDaDobra = !!(g && g.janela && g.y >= g.janela.ih);
  const testemunhaDeCaixa = semCaixa ? !!(censoCaixa && censoCaixa.w <= 0) : true;
  return [motivo.length > 0, semCaixa || abaixoDaDobra, abaixoDaDobra ? escaladaTentada === true : testemunhaDeCaixa];
};

// Regua do legado: duas implicacoes honestas, em vez de exigir que o legado tenha ouvinte (isso nao e
// promessa do fonte). (i) um ouvinte legado so pode existir se o node legado existe no contentor;
// (ii) um ouvinte legado NUM node pintado obriga a corrida a ter tentado por ele — senao a conclusao
// «a base ja nao alcanca o botao» seria inferida e nao medida.
const reguaLegado = (nLegado, temOuvinte, caixa, tentado) => {
  const oculto = !caixa || caixa.w <= 0 || caixa.disp === 'none' || caixa.vis === 'hidden';
  return [nLegado >= 1 || !temOuvinte, !temOuvinte || oculto || tentado === true];
};

// Regua da oclusao: um passo alcancavel cujo rato nao pousou no botao so e aceitavel se a oclusao for MEDIDA
// no ponto exato do clique — quem esta por cima, com que caixa, e se o alvo ainda tem la o seu centro. Sem
// as tres leituraes, «a grade cobre o botao» e uma frase minha e nao um facto reproduzivel.
const reguaOclusao = (pousou, oclusao) => {
  if (pousou === true) return [true, true, true];
  const o = oclusao || {};
  const quem = typeof o.no_ponto === 'string' && o.no_ponto.length > 0;
  const caixa = !!(o.ocupante && typeof o.ocupante.w === 'number' && o.ocupante.w > 0 && typeof o.ocupante.posicao === 'string');
  return [quem, caixa, o.alvo_e_mesmo_ponto === true];
};

const saida = {
  peca: 'scripts/p127-prova-browser-p4-checkin.mjs', rotulo: ROTULO, em: inicio, duracao_ms: null,
  pergunta: 'com sessao de ' + PAPEL + ' no ar medido: que ouvintes estao ligados ao controlo de leitura manual da portaria, que nome de RPC sai quando se submete, e o que nao saiu',
  metodo: 'CDP headless 1280x900; Emulation.setDeviceMetricsOverride antes do Page.navigate; cadeia injectada so no localStorage; prontidao esperada pelo predicado do proprio fonte (gateCentralBound + [data-gate-central-manual]) antes de enumerar ouvintes; clique real com elementFromPoint antes de cada Input.dispatchMouseEvent; submissao por escada de degraus nomeados (rato com hit-test -> teclado Tab/Enter -> form.requestSubmit como ultimo recurso) e census do ponto do alvo quando o rato nao pousa no botao; ouvintes por DOMDebugger.getEventListeners, camada lida do trecho do fonte via Debugger.getScriptSource; pedidos lidos de Network.requestWillBeSent e Network.responseReceived.',
  http: 'GET ao ar; POST de auth apenas se a cadeia estiver vencida; dois GET so-leitura das mesas de configuracao para medir o modo legado; POST de submissao como o utilizador faria; SELECT so-leitura de gate_checkins',
  ar_esperado_de: 'worker-deploy-v142-painel-na-troca/esperado-v142.json',
  passos: [], pedidos_no_fio: [], excepcoes_da_pagina: [],
  o_que_este_registo_nao_cobre: [
    'o que acontece com um cracha verdadeiro: o cracha submetido e de controlo e nao existe na mesa de badges',
    'o grau de EXECUTE de anon na viva, que e a PEN-48 e pede APLICAR PEN-48 NO BANCO',
    'o conteudo do calendario letivo: as tres mesas da RM-5.2 continuam sem linhas ate que a semente seja autorizada',
    'campos pessoais: de gate_checkins so sao lidos a contagem, a marca do ultimo checked_at e o numero de linhas novas',
    'o nome no fio pelo caminho legado: o shell exige a forma UUID antes de chamar o RPC e recusa o cracha de controlo, pelo que a camada legado fica julgada pelo fonte servido e pela recusa medida, nao por um pedido emitido',
  ],
};

let chrome = null;
let ws = null;
const grava = (o) => { try { writeFileSync(o, JSON.stringify(saida, null, 2) + '\n'); } catch (e) { console.log('ESCRITA_FALHOU ' + String(e.message).slice(0, 90)); } };
const fecha = (codigo, motivo) => {
  saida.duracao_ms = Date.now() - t0;
  saida.veredito = 'P127_P4_INTERROMPIDA';
  saida.falha_em = motivo;
  grava(PARCIAL);
  try { if (ws) { ws.onclose = null; ws.close(); } } catch {}
  try { if (chrome) spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  console.log('PAROU: ' + motivo);
  process.exit(codigo);
};
process.on('unhandledRejection', (e) => fecha(7, 'unhandledRejection: ' + String((e && e.message) || e).slice(0, 200)));
process.on('uncaughtException', (e) => fecha(8, 'uncaughtException: ' + String((e && e.message) || e).slice(0, 200)));
const vigilia = setTimeout(() => fecha(3, 'watchdog ' + (WATCHDOG_MS / 1000) + ' s'), WATCHDOG_MS);

const { sql } = await import(pathToFileURL(REPO + '/scripts/c2-lib.mjs').href);
const contaCheckins = async () => (await sql("select count(*)::int as linhas, coalesce(max(checked_at)::text, '<vazio>') as ultimo, count(*) filter (where checked_at >= '" + inicio + "')::int as novas from public.gate_checkins"))[0];
// Fecho de escrita largo: o modal de primeiro acesso e fechado por clique, e a diferenca entre «escreve no
// browser» e «escreve no banco» tem de ser medida, nao afirmada. Baseline de quatro mesas, antes e depois.
const baselines = async () => (await sql("select (select count(*)::int from public.schools) as schools, (select count(*)::int from public.profiles) as profiles, (select count(*)::int from public.students) as students, (select count(*)::int from public.gate_checkins) as checkins"))[0];

const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const anon = (shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];
const ref = (shellTxt.match(/https:\/\/([a-z0-9]{12,24})\.supabase\.co/) || [])[1];
if (!anon || !ref) fecha(1, 'o ar nao devolve a chave publishable nem a referencia');
const HOST = 'https://' + ref + '.supabase.co';
const STORAGE_KEY = 'sb-' + ref + '-auth-token';
saida.ar = { bytes: Buffer.byteLength(shellTxt), md5: md5(shellTxt), tem_marca_modulo: shellTxt.includes(MARCA_MODULO), tem_marca_legado: shellTxt.includes(MARCA_LEGADO) };
saida.ar_registo_versionado = (() => {
  const j = JSON.parse(readFileSync(REPO + '/worker-deploy-v142-painel-na-troca/esperado-v142.json', 'utf8'));
  return { htmlMd5: j.htmlMd5, htmlBytes: j.htmlBytes };
})();

const gravada = JSON.parse(readFileSync(FORA + '/ah2-sessao-' + PAPEL + '.json', 'utf8'))[PAPEL];
if (!gravada || !gravada.access_token) fecha(1, 'sem cadeia gravada para ' + PAPEL);
const expiraEm = Number(gravada.expires_at) - Math.floor(Date.now() / 1000);
let SESSAO = gravada;
saida.cadeia = { arrancou_sem_renovar: expiraEm > 60, exp_mais_tarde_s: expiraEm, hash_acesso_antes: md5(gravada.access_token).slice(0, 12), hash_refresh_antes: md5(gravada.refresh_token).slice(0, 12), renovou_nesta_corrida: false };
if (expiraEm <= 60) {
  const r = await fetch(HOST + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { 'content-type': 'application/json', apikey: anon, authorization: 'Bearer ' + anon }, body: JSON.stringify({ refresh_token: gravada.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) {
    saida.cadeia.recusa = { http: r.status, codigo: (j && (j.error_code || j.msg)) || 'sem-corpo' };
    saida.cadeia.proximo_degrau = saida.cadeia.recusa.codigo === 'refresh_token_already_used' ? 'p73-entrar-por-senha ' + PAPEL + ' (login com a senha ja gravada, sem rotacao)' : 'outra causa, ler o codigo';
    fecha(6, 'refresh ' + PAPEL + ' HTTP ' + r.status + ' codigo=' + saida.cadeia.recusa.codigo);
  }
  SESSAO = j;
  saida.cadeia.renovou_nesta_corrida = true;
  saida.cadeia.hash_refresh_depois = md5(j.refresh_token).slice(0, 12);
}

const cabecalhos = { apikey: anon, authorization: 'Bearer ' + SESSAO.access_token, prefer: 'count=exact' };
const medeModoLegado = async () => {
  const mesas = ['bfr_school_calendar_days', 'bfr_school_shift_settings'];
  const saida2 = [];
  for (const mesa of mesas) {
    try {
      const r = await fetch(HOST + '/rest/v1/' + mesa + '?select=*&limit=1', { headers: cabecalhos, signal: AbortSignal.timeout(30000) });
      const corpo = await r.text();
      saida2.push({ mesa, http: r.status, ok: r.status === 200, lista_vazia: r.status === 200 && corpo.trim() === '[]', caracteres_do_corpo: corpo.length });
    } catch (e) { saida2.push({ mesa, http: null, ok: false, lista_vazia: null, erro: String(e.message || e).slice(0, 90) }); }
  }
  return saida2;
};
saida.modo_legado_medido_no_canal = await medeModoLegado();
const modoLegadoMedido = saida.modo_legado_medido_no_canal.some((m) => !m.ok);
// As duas mesas que o guarda do modulo le: se as duas dao 200 e lista vazia, nao ha dia lectivo nem turno
// confirmado — e isso e medido, nao suposto, para a leitura do passo «sem motivo».
const calendarioMedidoVazio = saida.modo_legado_medido_no_canal.length === 2 && saida.modo_legado_medido_no_canal.every((m) => m.ok && m.lista_vazia === true);

const antes = await contaCheckins();
saida.gate_checkins = { antes, depois: null, medido_em: inicio };
saida.baselines = { antes: await baselines(), depois: null };

// Pre-condicao medida de que nenhuma submissao desta corrida PODE escrever: o parametro do RPC e uuid e o
// cracha submetido nao tem forma de uuid. A assinatura le-se do catalogo vivo, nunca do texto lembrado; o
// discriminador tem fixture nos dois sentidos, porque uma regex que nunca da verdadeira nao prova nada.
const ehUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));
const FIX_UUID_BOM = '11111111-2222-4333-8444-555555555555';
const assinatura = (await sql("select coalesce(pg_get_function_identity_arguments(to_regproc('public.register_gate_checkin_v2')),'<sem_funcao>') as args_v2, coalesce(pg_get_function_identity_arguments(to_regproc('public.register_gate_checkin')),'<sem_funcao>') as args_v1, (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('register_gate_checkin','register_gate_checkin_v2')) as funcoes_do_par"))[0];
saida.cracha_de_controlo = { texto_bytes: CRACHA.length, tem_forma_de_uuid: ehUuid(CRACHA), motivo_submetido_caracteres: MOTIVO.length, motivo_passa_o_porta_de_oito: MOTIVO.length >= 8 };
saida.assinatura_no_catalogo = assinatura;

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
for (const pid of donos) {
  const dono = spawnSync('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_Process -Filter "ProcessId=$pid").Name'], { encoding: 'utf8' });
  const nome = String(dono.stdout || '').trim();
  if (!/chrome/i.test(nome)) fecha(2, 'PORTA ' + PORT + ': dono (' + pid + ' ' + (nome || 'desconhecido') + ') nao e chrome nosso - usar P127_PORT');
  spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { stdio: 'ignore' });
}
if (donos.size) await new Promise((z) => setTimeout(z, 1200));
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=' + PORT, '--user-data-dir=' + PERFIL, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

let alvos = [];
for (let i = 0; i < 60; i++) { try { alvos = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); if (alvos.some((t) => t.type === 'page')) break; } catch {} await new Promise((z) => setTimeout(z, 400)); }
const pagina = alvos.find((t) => t.type === 'page');
if (!pagina) fecha(1, 'sem alvo page no chrome');
ws = new WebSocket(pagina.webSocketDebuggerUrl);
let encerrado = false;
ws.onclose = () => { if (!encerrado) fecha(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => fecha(5, String((e && e.message) || e).slice(0, 120)));

let seq = 0;
const pend = new Map();
const rpcPorRequestId = new Map();
let passoAtivo = 'arranque';
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.requestWillBeSent') {
    const u = String((m.params.request || {}).url || '');
    const nome = /\/rest\/v1\/rpc\/([a-zA-Z0-9_]+)/.exec(u);
    if (nome) {
      let corpo = null;
      try { corpo = JSON.parse(m.params.request.postData || 'null'); } catch {}
      const reg = { passo: passoAtivo, nome: nome[1], http: null, corpo_bytes: Buffer.byteLength(m.params.request.postData || ''), corpo_campos: corpo && typeof corpo === 'object' ? Object.keys(corpo).sort() : [], cracha_e_o_de_controlo: !!(corpo && String(corpo.target_badge_token || '') === CRACHA) };
      rpcPorRequestId.set(m.params.requestId, reg);
      saida.pedidos_no_fio.push(reg);
    }
  } else if (m.method === 'Network.responseReceived') {
    const reg = rpcPorRequestId.get(m.params.requestId);
    if (reg) reg.http = m.params.response.status;
  } else if (m.method === 'Network.loadingFinished') {
    const reg = rpcPorRequestId.get(m.params.requestId);
    if (reg && !reg.corpo_resumo) {
      send('Network.getResponseBody', { requestId: m.params.requestId }).then((b) => {
        const bruto = b && b.base64Encoded ? Buffer.from(b.body || '', 'base64').toString('utf8') : String((b && b.body) || '');
        reg.corpo_bytes_resposta = Buffer.byteLength(bruto);
        let j = null;
        try { j = JSON.parse(bruto); } catch {}
        if (j && typeof j === 'object') {
          reg.corpo_resumo = { chaves: Object.keys(j).sort(), ok: j.ok === undefined ? null : j.ok, motivo: j.reason === undefined ? null : String(j.reason).slice(0, 90), codigo_de_erro: j.error ? String(j.error.code || '').slice(0, 40) : null, mensagem_de_erro: j.error ? String(j.error.message || '').slice(0, 160) : null, entrada_status: j.entry_status === undefined ? null : String(j.entry_status) };
        } else reg.corpo_resumo = { nao_parseavel: true, md5: md5(bruto).slice(0, 12) };
      }).catch(() => { reg.corpo_resumo = { leitura_falhou: true }; });
    }
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails || {};
    saida.excepcoes_da_pagina.push({ passo: passoAtivo, texto: String((d.exception && d.exception.description) || d.text || '').replace(/\s+/g, ' ').slice(0, 200) });
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq;
  const prazo = method === 'Runtime.evaluate' ? 60000 : 120000;
  const timer = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta')); } }, prazo);
  pend.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expression) => {
  const x = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (x.exceptionDetails) throw new Error('eval: ' + String((x.exceptionDetails.exception && x.exceptionDetails.exception.description) || x.exceptionDetails.text).slice(0, 300));
  return x.result ? x.result.value : undefined;
};
const dorme = (ms) => new Promise((z) => setTimeout(z, ms));
const waitFor = async (expr, ms) => { const ini = Date.now(); while (Date.now() - ini < ms) { let v; try { v = await E(expr); } catch {} if (v) return Date.now() - ini; await dorme(300); } throw new Error('waitFor: ' + expr.slice(0, 80)); };

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
const depuracao = await send('Debugger.enable').then(() => ({ ok: true })).catch((e) => ({ ok: false, erro: String((e && e.message) || e).slice(0, 90) }));
saida.depuracao_disponivel = depuracao.ok;
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_APP });
passoAtivo = 'shell';
await waitFor("!!document.getElementById('loginScreen')", 60000);
passoAtivo = 'injecao';
await E('localStorage.setItem(' + JSON.stringify(STORAGE_KEY) + ',' + JSON.stringify(JSON.stringify(SESSAO)) + ')');
await send('Page.navigate', { url: URL_APP });
passoAtivo = 'prontidao';
saida.tempos_ms = { shell_ready: await waitFor("!!document.getElementById('appShell')?.classList.contains('ready')", 60000) };

const SELETOR_CONTENTOR = "document.getElementById('gatekeeperView')";
const SELETOR_LEGADO = "document.getElementById('gatekeeperView').querySelector('[data-gate-manual-form]')";
const SELETOR_MODULO = "document.getElementById('gatekeeperView').querySelector('[data-gate-central-manual]')";
const CENSO = '(() => {' +
  ' const v = document.getElementById(\'gatekeeperView\');' +
  ' const cx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, vis: cs.visibility, oculto: el.classList.contains(\'hidden\') }; };' +
  ' const q = (s) => v ? v.querySelector(s) : null;' +
  ' const leg = q(\'[data-gate-manual-form]\');' +
  ' const mod = q(\'[data-gate-central-manual]\');' +
  ' const st = q(\'.bfr-gate-scan-status\');' +
  ' const rt = window.BFR_APP_RUNTIME || {};' +
  ' return {' +
  '  vista_existe: !!v, vista_escondida: !!v && v.classList.contains(\'hidden\'), vista_cls: v ? String(v.className).slice(0, 70) : null,' +
  '  bound_modulo: !!(v && v.dataset.gateCentralBound === \'true\'),' +
  '  papel_perfil: (window.BFR_CURRENT_PROFILE && window.BFR_CURRENT_PROFILE.role) || null,' +
  '  vista_activa: rt.activeView || null,' +
  '  api_modulo_registrada: !!window.BFR_GATEKEEPER_API,' +
  '  n_legado: v ? v.querySelectorAll(\'[data-gate-manual-form]\').length : 0,' +
  '  n_modulo: v ? v.querySelectorAll(\'[data-gate-central-manual]\').length : 0,' +
  '  legado_pronto: leg ? leg.dataset.ready === \'true\' : null,' +
  '  legado_caixa: cx(leg), legado_botao: leg ? cx(leg.querySelector(\'button\')) : null,' +
  '  modulo_caixa: cx(mod),' +
  '  modulo_botao: mod ? cx(mod.querySelector(\'button[type=submit]\')) : null,' +
  '  modulo_entrada: mod ? cx(mod.querySelector(\'[data-gate-token]\')) : null,' +
  // O campo de motivo NAO vive dentro do formulario manual: e injectado em .bfr-gate-reader-options e lido
  // por state.view?.querySelector(...) — varre-se a vista, porque e la que o fonte o procura.
  '  modulo_motivo: cx(v ? v.querySelector(\'[data-gate-exception-reason]\') : null),' +
  '  status: st ? String(st.textContent || \'\').replace(/\\s+/g, \' \').trim().slice(0, 220) : null,' +
  ' };' +
  '})()';

passoAtivo = 'censo_ao_pronto';
saida.censo_ao_pronto = await E(CENSO);
// O modulo diferido monta DEPOIS do `appShell.ready`. Na corrida 22-11-a o contentor ainda so tinha o
// formulario do shell (n_modulo=0, bound=false) e o tempo de espera era uma espera apanhada pelo seletor
// OR do legado — ou seja, a corrida media o transitorio e nao o estado em que o porteiro fica. A prontidao
// passa a ser o predicado do proprio fonte: gateCentralBound e o node do modulo.
saida.tempos_ms.modulo_montado = -1;
try {
  saida.tempos_ms.modulo_montado = await waitFor("document.getElementById('gatekeeperView')?.dataset.gateCentralBound === 'true' && !!document.getElementById('gatekeeperView').querySelector('[data-gate-central-manual]')", 60000);
} catch {}
passoAtivo = 'censo_apos_modulo';
saida.censo_apos_modulo = await E(CENSO);
saida.modulo_montado = saida.censo_apos_modulo.bound_modulo === true && saida.censo_apos_modulo.n_modulo >= 1;
saida.transitorio = { ao_pronto_so_legado: saida.censo_ao_pronto.n_legado >= 1 && saida.censo_ao_pronto.n_modulo === 0, legado_ao_pronto_tem_caixa: !!(saida.censo_ao_pronto.legado_caixa && saida.censo_ao_pronto.legado_caixa.w > 0) };
// A gaveta onde o modulo poe o campo do motivo e a entrada manual: um <details> cuja caixa pode ser muito
// mais baixa que o conteudo que ela contem. Isto e o que decide se o alvo abaixo da dobra e um defeito da
// pagina ou do meu metodo, por isso mede-se e nao se infere.
passoAtivo = 'gaveta';
saida.gaveta = await E('(() => { const v = document.getElementById("gatekeeperView"); const f = v ? v.querySelector("[data-gate-central-manual]") : null; const d = f ? f.closest("details") : null; const mot = v ? v.querySelector("[data-gate-exception-reason]") : null; const cx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { centro_y: Math.round(r.y + r.height / 2), h: Math.round(r.height), sh: el.scrollHeight, ch: el.clientHeight }; }; return { form_existe: !!f, details_existe: !!d, aberto: d ? d.open === true : null, tem_sumario: !!(d && d.querySelector("summary")), caixa_details: cx(d), caixa_form: cx(f), caixa_motivo: cx(mot), display_do_form: f ? getComputedStyle(f).display : null, janela_ih: window.innerHeight }; })()');

// Geometria fresca por clique: um censo velho serve para descrever o estado, nunca para apontar um rato.
// A janela e a do `Emulation.setDeviceMetricsOverride`, e o que se confere e o centro do elemento depois
// de o por em vista — se cair fora, a conclusao e «fora da janela», nao «botao morto».
// O `behavior:'instant'` e medido, nao decorativo: com `scroll-behavior:smooth` no CSS, o rect lido no mesmo
// tick do scrollIntoView e o de ANTES do movimento, e isso produziria um «fora da janela» falso. Por isso o
// rect antes e o depois vao ambos para o registo, com a cadeia de ancestes rolaveis.
// Porque o `comScroll` e uma flag e nao um acaso (medido na sonda 21/11): o campo manual do modulo vive num
// <details> FECHADO cujo box e de 21 px enquanto o form dentro dele mede 64 px. O scrollIntoView centra-se
// na caixa do ancestor colapsado e para o `main` rolavel em 62 px, deixando o botao a y=1209; um
// `scrollTop` directo no mesmo contentor coloca-o a y=509. O metodo tem de poder distinguir os dois.
const MEDIDE = (exprSel, comScroll = true) => '(() => { const el = (function(){ try { return (' + exprSel + '); } catch (e) { return null; } })();' +
  ' if (!el) return null;' +
  ' const b = el.getBoundingClientRect();' +
  (comScroll ? ' el.scrollIntoView({ block: \'center\', inline: \'center\', behavior: \'instant\' });' : '') +
  ' const cadeia = []; let o = el;' +
  ' for (let i = 0; i < 12 && o; i++) { const c = getComputedStyle(o); cadeia.push({ no: o.tagName.toLowerCase() + (o.id ? \'#\' + o.id : \'\') + (typeof o.className === \'string\' && o.className.trim() ? \'.\' + o.className.trim().split(/\\s+/)[0] : \'\'), overflow_y: c.overflowY, posicao: c.position, sh: o.scrollHeight, ch: o.clientHeight, top: Math.round(o.scrollTop), rolavel: o.scrollHeight > o.clientHeight + 1 && (c.overflowY === \'auto\' || c.overflowY === \'scroll\' || c.overflowY === \'overlay\') }); o = o.parentElement; }' +
  ' const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);' +
  ' const se = document.scrollingElement || document.documentElement;' +
  ' return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, vis: cs.visibility, ancestor_unico: !!el.closest(\'[data-gate-manual-form],[data-gate-central-manual]\'),' +
  '   antes: { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }, movido_por_scroll: Math.round(r.y + r.height / 2) !== Math.round(b.y + b.height / 2),' +
  '   scroll_behaviour_do_html: getComputedStyle(document.documentElement).scrollBehavior,' +
  '   rolagem_do_documento: { no: se.tagName.toLowerCase() + (se.id ? \'#\' + se.id : \'\'), top: Math.round(se.scrollTop), sh: se.scrollHeight, ch: se.clientHeight },' +
  '   cadeia_rolavel: cadeia,' +
  '   janela: { iw: window.innerWidth, ih: window.innerHeight, cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth } };' +
  '})()';
// Escalada directa no primeiro ancestor rolavel: e exactamente o que a roda do rato de um utilizador faz,
// e nao toca em nada alem do scroll da pagina.
const ROLAR_PARA = (exprSel) => '(() => {' +
  ' const el = (function(){ try { return (' + exprSel + '); } catch (e) { return null; } })();' +
  ' if (!el) return { ok: false, motivo: \'sem node\' };' +
  ' let o = el.parentElement, contentor = null;' +
  ' while (o) { const c = getComputedStyle(o); if ((c.overflowY === \'auto\' || c.overflowY === \'scroll\' || c.overflowY === \'overlay\') && o.scrollHeight > o.clientHeight + 1) { contentor = o; break; } o = o.parentElement; }' +
  ' const centroAntes = Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2);' +
  ' if (!contentor) return { ok: false, motivo: \'nenhum ancestor rolavel\', centro_antes: centroAntes };' +
  ' const nome = contentor.tagName.toLowerCase() + (contentor.id ? \'#\' + contentor.id : \'\');' +
  ' const antes = Math.round(contentor.scrollTop);' +
  ' for (let k = 0; k < 4; k++) { const r = el.getBoundingClientRect(); const centro = r.y + r.height / 2; if (centro >= 0 && centro <= window.innerHeight) break; contentor.scrollTop = antes + Math.round(centro - window.innerHeight * 0.4); }' +
  ' const rr = el.getBoundingClientRect();' +
  ' return { ok: true, contentor: { no: nome, antes, depois: Math.round(contentor.scrollTop), sh: contentor.scrollHeight, ch: contentor.clientHeight }, centro_antes: centroAntes, centro_depois: Math.round(rr.y + rr.height / 2) };' +
  '})()';
const alcanca = async (sel) => {
  const tenta = async (comScroll) => {
    const g = await E(MEDIDE(sel, comScroll));
    if (!g) return { ok: false, motivo: 'sem node', g: null };
    if (g.w <= 0 || g.h <= 0 || g.disp === 'none' || g.vis === 'hidden') return { ok: false, motivo: 'no DOM sem caixa pintada', g };
    if (g.x < 0 || g.y < 0 || g.x >= g.janela.cw || g.y >= g.janela.ih) return { ok: false, motivo: 'centro fora da janela', g };
    return { ok: true, g };
  };
  let a = await tenta(true);
  const registos = [{ k: 0, metodo: 'scrollIntoView', ok: a.ok, motivo: a.motivo || null, y: a.g ? a.g.y : null }];
  if (!a.ok && a.g && a.g.w > 0) {
    const rol = await E(ROLAR_PARA(sel));
    registos.push({ k: 1, metodo: 'scrollTop no ancestor rolavel', resultado: rol });
    await dorme(250);
    a = await tenta(false);
    registos.push({ k: 2, metodo: 'releitura sem scroll novo', ok: a.ok, motivo: a.motivo || null, y: a.g ? a.g.y : null });
  }
  if (a.g) a.g.atingibilidade = registos;
  return a;
};
// O modal de primeiro acesso pousa por cima da portaria e foi medido na corrida 22-11-a a receber o clique
// destinado ao botao de registo. O fecho pelo proprio botao e o ato de um utilizador real e nao escreve no
// banco: a prova de que nada foi escrito e o par de baselines deste artefacto, nao uma promessa.
const SEL_FECHAR_MODAL = "(() => { const m = document.querySelector('.modal:not(.hidden)'); return m ? m.querySelector('[data-preferred-name-close],[data-preferred-name-skip]') : null; })()";
const resolverModal = async (selAlvo) => {
  const reg = { tentativas: [], resolvido: false, motivo: null };
  for (let k = 0; k < 3; k++) {
    const ge = await alcanca(selAlvo);
    if (!ge.ok) { reg.motivo = 'alvo nao alcancavel antes do modal: ' + ge.motivo; return reg; }
    const hit = await hitTest(ge.g.x, ge.g.y, selAlvo);
    if (hit.no_alvo || hit.por_cima) { reg.resolvido = true; reg.tentativas.push({ k, hit }); return reg; }
    const fechar = await alcanca(SEL_FECHAR_MODAL);
    if (!fechar.ok) { reg.motivo = 'por_cima=' + hit.no_ponto + ' e sem botao de fecho pintado (' + fechar.motivo + ')'; return reg; }
    const h2 = await hitTest(fechar.g.x, fechar.g.y, SEL_FECHAR_MODAL);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fechar.g.x, y: fechar.g.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fechar.g.x, y: fechar.g.y, button: 'left', clickCount: 1 });
    reg.tentativas.push({ k, tapou: hit.no_ponto, fecho: h2.no_ponto, fecho_no_alvo: h2.no_alvo });
    await dorme(900);
  }
  const depois = await alcanca(selAlvo);
  const hit = depois.ok ? await hitTest(depois.g.x, depois.g.y, selAlvo) : null;
  reg.resolvido = !!(hit && (hit.no_alvo || hit.por_cima));
  if (!reg.resolvido) reg.motivo = 'modal por cima depois de ' + reg.tentativas.length + ' tentativas';
  return reg;
};

// Como se classifica um ouvinte neste build de Chrome (medido na sonda, nao suposto): o campo `handler` do
// DOMDebugger.getEventListeners NAO e devolvido — `tem_handler:false` nos 5 ouvintes da vista e do legado —
// pelo que String(this) do handler esta morto. O que existe e scriptId + lineNumber + columnNumber, e
// Debugger.getScriptSource da o texto. A camada resolve-se pelo trecho em torno da posicao declarada, que e
// o proprio registo do addEventListener: o do shell diz registerGateCheckin(...) e o do modulo diz
// registerGateToken(...). O censo do script inteiro guarda-se como evidencia secundaria e nao decide: o
// script do modulo contem os dois nomes, logo e ambiguo por construcao.
const cacheScripts = new Map();
const infoScript = async (scriptId) => {
  const k = String(scriptId);
  if (cacheScripts.has(k)) return cacheScripts.get(k);
  let info;
  try {
    const texto = String((await send('Debugger.getScriptSource', { scriptId: k })).scriptSource || '');
    const posicoes = [];
    let acc = 0;
    for (const linha of texto.split('\n')) { posicoes.push(acc); acc += linha.length + 1; }
    // `texto` fica em memoria para o recorte por ouvinte; nao vai para o artefacto senao o trecho recortado.
    info = { leu: true, texto, bytes: Buffer.byteLength(texto), tem_marca_modulo: texto.includes(MARCA_MODULO), tem_marca_legado: texto.includes(MARCA_LEGADO), posicoes };
  } catch (e) { info = { leu: false, erro: String((e && e.message) || e).slice(0, 90) }; }
  cacheScripts.set(k, info);
  return info;
};
const ouvintesDe = async (exprEl) => {
  const r = await send('Runtime.evaluate', { expression: exprEl, returnByValue: false });
  const res = r.result || {};
  if (!res.objectId) return { presente: false, n: 0, ouvintes: [], submissao: [] };
  const gl = await send('DOMDebugger.getEventListeners', { objectId: res.objectId, depth: 0 });
  const lista = [];
  for (const l of (gl.listeners || [])) {
    const info = l.scriptId ? await infoScript(l.scriptId) : { leu: false, erro: 'sem scriptId' };
    let trecho = null;
    if (info.leu && Array.isArray(info.posicoes)) {
      const ini = Math.max(0, (info.posicoes[Number(l.lineNumber) || 0] || 0) - Number(l.columnNumber || 0) - 60);
      trecho = info.texto.slice(ini, ini + 420);
    }
    lista.push({
      tipo: l.type, e_de_submissao: l.type === 'submit', usa_capture: !!l.useCapture, script_id: l.scriptId || null,
      linha: Number.isFinite(l.lineNumber) ? l.lineNumber : null, coluna: Number.isFinite(l.columnNumber) ? l.columnNumber : null,
      handler_devolvido_pelo_cdp: !!(l.handler && l.handler.objectId),
      fonte_bytes: trecho === null ? null : Buffer.byteLength(trecho), fonte_md5: trecho ? md5(trecho).slice(0, 12) : null,
      trecho: trecho === null ? null : trecho.slice(0, 220),
      camada: camadaDoFonte(trecho), censo_do_script: info.leu ? { bytes: info.bytes, tem_marca_modulo: info.tem_marca_modulo, tem_marca_legado: info.tem_marca_legado } : { leu: false, erro: info.erro },
    });
  }
  return { presente: true, n: lista.length, ouvintes: lista, submissao: lista.filter((o) => o.e_de_submissao).map((o) => o.camada) };
};
const enumeraOuvintes = async () => ({
  contentor: await ouvintesDe(SELETOR_CONTENTOR),
  formulario_legado: await ouvintesDe(SELETOR_LEGADO),
  formulario_modulo: await ouvintesDe(SELETOR_MODULO),
});
passoAtivo = 'ouvintes';
saida.ouvintes = await enumeraOuvintes();
saida.transitorio.legado_tem_ouvinte_na_enumacao = saida.ouvintes.formulario_legado.submissao.length >= 1;

const hitTest = async (x, y, exprEl) => {
  const alvo = '(function(){ try { return (' + exprEl + '); } catch (e) { return null; } })()';
  return await E('(() => { const el = ' + alvo + '; const e = document.elementFromPoint(' + x + ',' + y + '); if (!e) return { no_ponto: null, no_alvo: false, por_cima: false, contem_o_alvo: false, relacao: \'sem_elemento_no_ponto\' }; const classe = typeof e.className === \'string\' && e.className.trim() ? \'.\' + e.className.trim().split(/\\s+/)[0] : \'\'; const no_alvo = !!(el && e === el); const por_cima = !!(el && el.contains(e) && e !== el); const contem_o_alvo = !!(el && e !== el && e.contains(el)); return { no_ponto: e.tagName.toLowerCase() + (e.id ? \'#\' + e.id : \'\') + classe, no_alvo, por_cima, contem_o_alvo, relacao: no_alvo ? \'no_alvo\' : (por_cima ? \'descendente_do_alvo\' : (contem_o_alvo ? \'ascendente_do_alvo\' : \'outro_elemento\')) }; })()');
};
const cliqueEm = async (x, y, exprEl) => {
  const hit = await hitTest(x, y, exprEl);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  return hit;
};
// O rect lido antes de um clique e uma previsao: focar o campo, inserir texto e o re-render do modulo
// movem o botao. Na submissao o centro e re-medido instantes antes do disparo e a deriva fica registrada;
// so assim «o clique nao pousou no botao» distingue metodo envelhecido de oclusao real do produto.
const clicar_no_alvo = async (exprSel, g_antes) => {
  const re = await alcanca(exprSel);
  if (!re.ok) return { alcancavel_no_momento: false, motivo: re.motivo || null, ponto: null, deriva: null, clique: null, registos: (re.g && re.g.atingibilidade) || [] };
  const clique = await cliqueEm(re.g.x, re.g.y, exprSel);
  return { alcancavel_no_momento: true, motivo: null, ponto: { x: re.g.x, y: re.g.y }, deriva: g_antes ? { dx: re.g.x - g_antes.x, dy: re.g.y - g_antes.y } : null, clique, registos: (re.g && re.g.atingibilidade) || [] };
};
// Census do ponto do clique quando o rato nao pousou no alvo: quem esta por cima, com que caixa, com que
// posicionamento, e se o alvo ainda tem o mesmo centro. Sem isto «ocluido» e uma frase minha; com isto e uma
// medida reproduzivel por quem corrigir o CSS.
const sondaOclusao = async (ponto, exprSel) => await E(
  '(() => { const el = (function(){ try { return (' + exprSel + '); } catch (e) { return null; } })();' +
  ' if (!el) return { no_ponto: null, ocupante: null, alvo: null, alvo_e_mesmo_ponto: false, cadeia_do_ponto: [] };' +
  ' const e = document.elementFromPoint(' + ponto.x + ',' + ponto.y + '); const r = el.getBoundingClientRect();' +
  ' const no = (x) => x ? x.tagName.toLowerCase() + (x.id ? "#" + x.id : "") + (typeof x.className === "string" && x.className.trim() ? "." + x.className.trim().split(/\\s+/)[0] : "") : null;' +
  ' const b = e ? e.getBoundingClientRect() : null; const cs = e ? getComputedStyle(e) : null;' +
  ' const cadeia = []; let n = e; while (n && cadeia.length < 8) { cadeia.push(no(n)); n = n.parentElement; }' +
  ' return { ponto: { x: ' + ponto.x + ', y: ' + ponto.y + ' }, no_ponto: no(e),' +
  ' ocupante: b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), posicao: cs.position, z_index: cs.zIndex, opacidade: cs.opacity, pointer_events: cs.pointerEvents } : null,' +
  ' alvo: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), centro_x: Math.round(r.x + r.width / 2), centro_y: Math.round(r.y + r.height / 2) },' +
  ' alvo_e_mesmo_ponto: Math.round(r.x + r.width / 2) === ' + ponto.x + ' && Math.round(r.y + r.height / 2) === ' + ponto.y + ',' +
  ' cadeia_do_ponto: cadeia }; })()'
);
// Degrau 2 da escada: o teclado e um caminho de utilizador real (Tab para o campo, escreve, Enter), nao uma
// chamada de programa. O Enter e despachado com o foco no CAMPO, porque se o foco ficou na textarea do
// motivo o Enter insere uma linha e nao submete nada.
const focar = async (sel) => await E('(() => { const e = (' + sel + '); if (!e) return { existe: false, focado: false }; e.focus(); return { existe: true, focado: document.activeElement === e, no: e.tagName.toLowerCase(), tipo: e.getAttribute("type") || null, readOnly: !!e.readOnly, disabled: !!e.disabled }; })()');
const lerValor = async (sel) => await E('(() => { const e = (' + sel + '); return e ? e.value : null; })()');
// Escrever por cima nao e o que um utilizador faz num campo que ja tem texto: a corrida 22-11-g deixou 62
// caracteres no campo (o cracha de 31 duas vezes) e o corpo do pedido passou a nao ser o cracha de controlo.
// Select-all + Delete pelo teclado e o caminho real e nao apaga estado de outros campos.
const limparCampo = async (sel) => {
  const f = await focar(sel);
  if (!f.focado) return { focado: false, length_depois: null };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46, nativeVirtualKeyCode: 46 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46, nativeVirtualKeyCode: 46 });
  const v = await lerValor(sel);
  return { focado: true, length_antes: null, length_depois: typeof v === 'string' ? v.length : v };
};
const submeter_por_teclado = async (a, comMotivo) => {
  const reg = { degrau: 'teclado' };
  if (comMotivo && a.selMotivo) {
    reg.foco_motivo = await focar(a.selMotivo);
    if (reg.foco_motivo.focado) { reg.limpeza_motivo = await limparCampo(a.selMotivo); await send('Input.insertText', { text: MOTIVO }); reg.motivo_lido = await lerValor(a.selMotivo); }
  }
  reg.foco_entrada = await focar(a.selEntrada);
  if (reg.foco_entrada.focado) { reg.limpeza_entrada = await limparCampo(a.selEntrada); await send('Input.insertText', { text: CRACHA }); reg.cracha_lido = await lerValor(a.selEntrada); }
  reg.primeiro_token_da_vista = await E("(() => { const e = document.getElementById('gatekeeperView').querySelector('[data-gate-token]'); return e ? e.value : null; })()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  reg.enter_despachado = true;
  return reg;
};
// Degrau 3, ultimo recurso: pedir ao proprio formulario que submeta. Nao e um ato de rato nem de teclado, e
// por isso o nome do pedido que daqui sair so vale como comportamento do ouvinte, nunca como alcanca-se.
const submeter_por_request_submit = async (a) => await E(
  '(() => { const e = (' + a.selEntrada + '); const f = e ? e.form : null; if (!f) return { ok: false, degrau: "requestSubmit", motivo: "sem form pai do campo" };' +
  ' try { f.requestSubmit(); return { ok: true, degrau: "requestSubmit", form: f.tagName.toLowerCase() + (f.id ? "#" + f.id : ""), acoes: f.getAttribute("action") || null }; }' +
  ' catch (err) { return { ok: false, degrau: "requestSubmit", motivo: String(err && err.message || err).slice(0, 90) }; } })()'
);
const nomesCheckinEntre = (desde, ate) => [...new Set(saida.pedidos_no_fio.slice(desde, ate).filter((r) => NOMES_CHECKIN.includes(r.nome)).map((r) => r.nome))];
// Degrau zero, e o unico que um utilizador real usa antes de escrever seja o que for: abrir a gaveta de
// leituras. O contentor e um <details> fechado cujo conteudo a CSS pinta na mesma — pintado mas nao
// focalizavel nem atingivel pelo rato, como mediram as corridas 22-11-e e 22-11-f. O clique vai ao
// <summary>, com hit-test como qualquer outro; se o summary tambem estiver ocluido, fica registrado.
const SEL_SUMARIO = (selConteudo) => '(function(){ const n = (' + selConteudo + '); const d = n && n.closest ? n.closest("details") : null; return d ? d.querySelector("summary") : null; })()';
const estadoDaGaveta = async (selConteudo) => await E(
  '(() => { const n = (' + selConteudo + '); const d = n && n.closest ? n.closest("details") : null; if (!d) return { em_details: false, aberto: null, sumario_existe: null, sumario_caixa: null };' +
  ' const s = d.querySelector("summary"); const r = s ? s.getBoundingClientRect() : null;' +
  ' return { em_details: true, aberto: !!d.open, sumario_existe: !!s, sumario_caixa: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null }; })()'
);
const abrirGaveta = async (selConteudo) => {
  const antes = await estadoDaGaveta(selConteudo);
  if (!antes.em_details || antes.aberto === true) return { antes, depois: antes, click: null, tentado: false, motivo: antes.em_details ? 'ja_aberta' : 'o_controlo_nao_esta_dentro_de_um_details' };
  if (!antes.sumario_existe) return { antes, depois: antes, click: null, tentado: false, motivo: 'details_sem_summary' };
  const gs = await alcanca(SEL_SUMARIO(selConteudo));
  if (!gs.ok) return { antes, depois: await estadoDaGaveta(selConteudo), click: null, tentado: false, motivo: 'summary_nao_alcancavel: ' + gs.motivo };
  const sub = await clicar_no_alvo(SEL_SUMARIO(selConteudo), gs.g);
  await dorme(900);
  const depois = await estadoDaGaveta(selConteudo);
  return { antes, depois, click: sub.clique, ponto: sub.ponto, tentado: true, motivo: depois.aberto === true ? null : 'o_clique_no_summary_nao_abriu_a_gaveta' };
};

// Cada alvo de submissao e descrito pelos seletores do fonte que o produz, nao por um caminho lembrado:
// o modulo renderiza [data-gate-central-manual] e o shell estatico renderiza [data-gate-manual-form].
const ALVOS = {
  modulo: {
    camada_esperada: 'modulo_diferido',
    n: (c) => c.n_modulo,
    selEntrada: "document.getElementById('gatekeeperView').querySelector('[data-gate-central-manual] [data-gate-token]')",
    selBotao: "document.getElementById('gatekeeperView').querySelector('[data-gate-central-manual] button[type=submit]')",
    selMotivo: "document.getElementById('gatekeeperView').querySelector('[data-gate-exception-reason]')",
  },
  legado: {
    camada_esperada: 'legado_shell',
    n: (c) => c.n_legado,
    selEntrada: "document.getElementById('gatekeeperView').querySelector('[data-gate-manual-form] input')",
    selBotao: "document.getElementById('gatekeeperView').querySelector('[data-gate-manual-form] button')",
    selMotivo: null,
  },
};

const submeter = async (nomePasso, chave, comMotivo) => {
  passoAtivo = nomePasso;
  const a = ALVOS[chave];
  const p = { passo: nomePasso, camada_alvo: a.camada_esperada, no_dom: a.n(saida.censo_apos_modulo), pedidos_antes: saida.pedidos_no_fio.length };
  if (!p.no_dom) { p.alcancavel = false; p.motivo = 'nenhum formulario desta camada no contentor de ' + PAPEL; return p; }
  p.modal = await resolverModal(a.selEntrada);
  p.gaveta = await abrirGaveta(a.selEntrada);
  const ge = await alcanca(a.selEntrada);
  const gb = await alcanca(a.selBotao);
  if (!ge.ok || !gb.ok) {
    p.alcancavel = false;
    p.motivo = 'entrada: ' + ge.motivo + ' | botao: ' + gb.motivo;
    p.geo = { entrada: ge.g, botao: gb.g };
    const semCaixa = !!((gb.g && gb.g.w <= 0) || (ge.g && ge.g.w <= 0));
    p.degraus_tentaveis = semCaixa ? 'no_node_sem_caixa_pintada_pelo_rato_nem_pelo_teclado_fica_a_chamada_direta_ao_form' : 'node_pintado_fora_da_janela_a_escada_para_no_rato';
    if (semCaixa) {
      p.chamada_direta_preparacao = await E(
        '(() => { const i = (' + a.selEntrada + '); const m = document.querySelector("[data-gate-central-manual] [data-gate-token]");' +
        ' if (i) i.value = ' + JSON.stringify(CRACHA) + '; if (m) m.value = ' + JSON.stringify(CRACHA) + ';' +
        ' return { proprio_len: i ? String(i.value).length : null, primeiro_da_vista_len: m ? String(m.value).length : null, mesmo_no: i === m, pai_do_proprio: i && i.parentElement ? i.parentElement.tagName.toLowerCase() + (i.parentElement.className && typeof i.parentElement.className === "string" ? "." + i.parentElement.className.trim().split(/\\s+/)[0] : "") : null }; })()'
      );
      p.degrau_request_submit = await submeter_por_request_submit(a);
      await dorme(5000);
      p.emissao_por_degrau = { rato: [], teclado: [], request_submit: nomesCheckinEntre(p.pedidos_antes, saida.pedidos_no_fio.length) };
      p.submetido_por = p.emissao_por_degrau.request_submit.length ? 'requestSubmit' : null;
      p.pedidos_do_passo = saida.pedidos_no_fio.slice(p.pedidos_antes);
      p.status = (await E(CENSO)).status;
      p.cracha_lido = p.chamada_direta_preparacao.proprio_len;
    }
    return p;
  }
  p.alcancavel = true;
  p.geo = { entrada: ge.g, botao: gb.g };
  const sube = await clicar_no_alvo(a.selEntrada, ge.g);
  p.foco = sube.clique;
  p.ponto_de_entrada = sube.ponto;
  p.entrada_derivada = sube.deriva;
  p.limpeza_entrada_rato = await limparCampo(a.selEntrada);
  await send('Input.insertText', { text: CRACHA });
  p.cracha_lido = await E('(() => { const e = (' + a.selEntrada + '); return e ? e.value : null; })()');
  // O ouvinte legado le view.querySelector('[data-gate-token]') — o PRIMEIRO da vista, que e o campo do
  // modulo porque o shell diferido e injectado com afterbegin. Se os dois divergirem, a divergencia e medida.
  p.primeiro_input_da_vista_valor = await E("(() => { const e = document.getElementById('gatekeeperView').querySelector('[data-gate-token]'); return e ? e.value : null; })()");
  if (comMotivo) {
    if (!a.selMotivo) p.motivo_excepcional = 'esta camada nao tem campo de motivo no fonte';
    else {
      const gm = await alcanca(a.selMotivo);
      if (!gm.ok) { p.motivo_excepcional = 'sem campo de motivo excepcional pintado: ' + gm.motivo; p.motivo_lido = null; p.geo_motivo = gm.g; }
      else {
        const subm = await clicar_no_alvo(a.selMotivo, gm.g);
        p.foco_motivo = subm.clique;
        p.motivo_ponto = subm.ponto;
        p.motivo_derivado = subm.deriva;
        p.registo_de_atingibilidade_do_motivo = subm.registos;
        p.limpeza_motivo_rato = await limparCampo(a.selMotivo);
        await send('Input.insertText', { text: MOTIVO });
        p.motivo_lido = await E('(() => { const e = (' + a.selMotivo + '); return e ? e.value : null; })()');
      }
    }
  }
  const subs = await clicar_no_alvo(a.selBotao, gb.g);
  p.alcancavel_no_momento = subs.alcancavel_no_momento;
  p.ponto_de_submissao = subs.ponto;
  p.deriva_do_rect_lido_antes = subs.deriva;
  p.registo_de_atingibilidade_do_botao = subs.registos;
  p.clique = subs.clique;
  p.rato_pousou_no_alvo = !!(subs.clique && (subs.clique.no_alvo === true || subs.clique.por_cima === true));
  p.oclusao = subs.clique && !p.rato_pousou_no_alvo && subs.ponto ? await sondaOclusao(subs.ponto, a.selBotao) : null;
  await dorme(5000);
  const marco_rato = saida.pedidos_no_fio.length;
  // Escada de degraus, cada um nomeado: 1) rato; 2) teclado (Tab/Enter, caminho de utilizador real);
  // 3) requestSubmit (ultimo recurso, so prova o ouvinte, nunca a alcanca-se). O degrau seguinte so corre
  // quando o anterior nao emitiu nenhum dos dois RPC da portaria.
  p.degrau_teclado = p.rato_pousou_no_alvo ? null : await submeter_por_teclado(a, comMotivo);
  if (!p.rato_pousou_no_alvo) await dorme(5000);
  const marco_teclado = saida.pedidos_no_fio.length;
  const nomes_do_teclado = nomesCheckinEntre(marco_rato, marco_teclado);
  p.degrau_request_submit = !p.rato_pousou_no_alvo && nomes_do_teclado.length === 0 ? await submeter_por_request_submit(a) : null;
  if (p.degrau_request_submit) await dorme(5000);
  const marco_rs = saida.pedidos_no_fio.length;
  p.emissao_por_degrau = {
    rato: nomesCheckinEntre(p.pedidos_antes, marco_rato),
    teclado: nomes_do_teclado,
    request_submit: nomesCheckinEntre(marco_teclado, marco_rs),
  };
  p.submetido_por = p.emissao_por_degrau.rato.length ? 'rato' : (p.emissao_por_degrau.teclado.length ? 'teclado' : (p.emissao_por_degrau.request_submit.length ? 'requestSubmit' : null));
  p.pedidos_do_passo = saida.pedidos_no_fio.slice(p.pedidos_antes);
  const depois = await E(CENSO);
  p.status = depois.status;
  return p;
};

passoAtivo = 'submissao';
// Sonda de rolagem, uma vez, antes de qualquer clique: se o `scrollIntoView` nao moveu o alvo, a pergunta e
// «que contentor rolavel existe?» — porque um alvo abaixo da dobra num contentor sem scroll e um defeito de
// acessibilidade real, e num contentor rolavel e defeito do meu metodo. A sonda resolve os dois.
saida.sonda_rolagem = await E('(() => { const se = document.scrollingElement || document.documentElement; const v = document.getElementById("gatekeeperView"); const cs = getComputedStyle(document.documentElement), cb = getComputedStyle(document.body), cv = v ? getComputedStyle(v) : null; const antes = { se_top: Math.round(se.scrollTop), se_sh: se.scrollHeight, se_ch: se.clientHeight, corpo_top: Math.round(document.body.scrollTop), overflow_html: cs.overflowY, overflow_corpo: cb.overflowY, vista: v ? { top: Math.round(v.scrollTop), sh: v.scrollHeight, ch: v.clientHeight, overflow_y: cv.overflowY, posicao: cv.position } : null }; se.scrollTop = antes.se_top + 600; const depois_se = Math.round(se.scrollTop); if (depois_se === antes.se_top && v) { v.scrollTop = antes.vista.top + 600; } return { antes, depois: { se_top: depois_se, vista_top: v ? Math.round(v.scrollTop) : null }, rolavel: { documento: depois_se > antes.se_top, vista: !!(v && v.scrollTop > antes.vista.top) }, scroll_y_da_janela: Math.round(window.scrollY || 0) }; })()');
saida.passos.push(await submeter('modulo_sem_motivo_excepcional', 'modulo', false));
saida.passos.push(await submeter('modulo_com_motivo_de_oito_caracteres', 'modulo', true));
saida.passos.push(await submeter('legado_com_cracha', 'legado', false));

passoAtivo = 'censo_final';
saida.censo_final = await E(CENSO);
saida.ouvintes_apos_submissao = await enumeraOuvintes();
await dorme(1500);
const depoisDoBanco = await contaCheckins();
saida.gate_checkins.depois = depoisDoBanco;
saida.baselines.depois = await baselines();

encerrado = true;
clearTimeout(vigilia);
try { ws.onclose = null; ws.close(); } catch {}
try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
saida.duracao_ms = Date.now() - t0;
saida.modo_legado_medido = modoLegadoMedido;
saida.pedidos_do_fio_aguardados_antes_da_escrita = saida.pedidos_no_fio.filter((p) => !p.corpo_resumo).length;

const camadasLegado = saida.ouvintes.formulario_legado.submissao;
const camadasContentor = saida.ouvintes.contentor.submissao;
// Uma lista vazia faria de `[].every()` um verde sem medida: o numero de ouvintes enumerados e clausula,
// nao pano de fundo.
const todosOuvintes = [saida.ouvintes.contentor, saida.ouvintes.formulario_legado, saida.ouvintes.formulario_modulo]
  .reduce((acc, o) => acc.concat(o.ouvintes), []);
const podeLegado = saida.censo_final.n_legado > 0 && camadasLegado.includes('legado_shell');
const podeModulo = saida.censo_final.n_modulo > 0 && camadasContentor.includes('modulo_diferido');
const nomesDePasso = new Set(saida.passos.map((p) => p.passo));
const pedidosDeSubmissao = saida.pedidos_no_fio.filter((p) => nomesDePasso.has(p.passo));
// So os dois RPC da portaria tem um nome esperado por camada; os restantes pedidos do passo (nascidos de
// re-render) registram-se mas nao se julgam — senao a regua seria vermelha por ruido do painel.
const esperados = [NOME_V1, NOME_V2];
const pedidosDeCheckin = pedidosDeSubmissao.filter((p) => esperados.includes(p.nome));
const outrosPedidosDoPasso = [...new Set(pedidosDeSubmissao.filter((p) => !esperados.includes(p.nome)).map((p) => p.nome))];
// Julgamento por passo: o que torna a regua nao-vazia e um degrau da escada ter emitido (ou pedido) um dos
// dois RPC da portaria.
const julgamento = saida.passos.map((p) => {
  // «Tentado» e ter saido (ou ter sido pedido) um dos dois RPC da portaria por um degrau nomeado da escada.
  // O ponto do clique sobre um overlay nao conta como tentativa: nesse caso o que julga e o degrau seguinte,
  // registrado em `submetido_por`, e a oclusao fica medida em `oclusao`.
  const tentado = !!p.submetido_por || (p.alcancavel === true && !!(p.clique && (p.clique.no_alvo === true || p.clique.por_cima === true)));
  const motivoLidoOk = [p.motivo_lido, p.degrau_teclado && p.degrau_teclado.motivo_lido].some((v) => typeof v === 'string' && v.length >= 8);
  const nomesUnicos = [...new Set((p.pedidos_do_passo || []).filter((r) => esperados.includes(r.nome)).map((r) => r.nome))];
  const j = reguaPasso(p.camada_alvo, tentado, motivoLidoOk, nomesUnicos, modoLegadoMedido);
  return { passo: p.passo, camada: p.camada_alvo, tentado, motivo_lido_ok: motivoLidoOk, nomes_obtidos: nomesUnicos, esperado: j.esperado, bate: j.bate, motivo: j.motivo, status: p.status };
});
const passosJulgaveis = julgamento.filter((j) => j.esperado !== null);
saida.atribuicao = {
  podeLegado, podeModulo, modoLegadoMedido, calendario_medido_vazio: calendarioMedidoVazio,
  nomes_vistos_em_todo_o_passo: [...new Set(pedidosDeSubmissao.map((p) => p.nome))],
  outros_nomes_que_nao_sao_da_portaria: outrosPedidosDoPasso,
  nomes_de_checkin: [...new Set(pedidosDeCheckin.map((p) => p.nome))],
  por_passo: julgamento,
  n_julgaveis: passosJulgaveis.length,
};

const falhas = [];
// O desalinhamento entre clausulas e esperado e um vermelho proprio: uma clausula a mais ficaria fora da
// comparacao e o portao daria verde sem julgar essa clausula.
const gate = (nome, obtido, esperadoV) => {
  const alinhadas = Array.isArray(obtido) && obtido.length === esperadoV.length;
  const ok = alinhadas && JSON.stringify(obtido) === JSON.stringify(esperadoV);
  if (!ok) falhas.push(nome + ': ' + JSON.stringify(alinhadas ? { obtido } : { desalinhamento_de_clausulas: [Array.isArray(obtido) ? obtido.length : null, esperadoV.length], obtido }).slice(0, 700));
  return { nome, verde: ok, alinhadas, obtido, esperado: esperadoV };
};

const FIX_ESCRRITA_PARTE = [{ linhas: 10, ultimo: 'x', novas: 0 }, { linhas: 11, ultimo: 'x', novas: 1 }];
const FIX_ESCRITA_MUDOU_MARCA = [{ linhas: 10, ultimo: 'x', novas: 0 }, { linhas: 10, ultimo: 'y', novas: 0 }];
const FIX_ESCRITA_IDEAL = [{ linhas: 10, ultimo: 'x', novas: 0 }, { linhas: 10, ultimo: 'x', novas: 0 }];
const FIX_CAMADAS = [{ camada: 'modulo_diferido' }, { camada: 'desconhecida' }, { camada: 'ambigua' }, { camada: 'legado_shell' }];
// Fixtures da regua por passo: dois verdes e quatro vermelhos, porque a regua antiga dava verde com a lista
// de pedidos vazia. O caso indecidivel tem de dar `esperado:null`, nao `bate:true`.
const FIX_ATRIB_MODULO_FORA_LEGADO_COM_V2 = ['modulo_diferido', true, true, [NOME_V2], false];
const FIX_ATRIB_MODULO_FORA_LEGADO_COM_V1 = ['modulo_diferido', true, true, [NOME_V1], false];
const FIX_ATRIB_LEGADO_COM_V2 = ['legado_shell', true, false, [NOME_V2], false];
const FIX_ATRIB_MODULO_COM_MOTIVO_SEM_PEDIDO = ['modulo_diferido', true, true, [], false];
const FIX_ATRIB_MODULO_SEM_MOTIVO_SEM_PEDIDO = ['modulo_diferido', true, false, [], false];
const FIX_ATRIB_PASSO_NAO_TENTADO = ['modulo_diferido', false, true, [], false];
const FIX_BAS_LINES_IGUAIS = [{ schools: 3, profiles: 40, students: 5, checkins: 272 }, { schools: 3, profiles: 40, students: 5, checkins: 272 }];
const FIX_BAS_LINES_TROCOU_ALUNOS = [{ schools: 3, profiles: 40, students: 5, checkins: 272 }, { schools: 3, profiles: 40, students: 6, checkins: 272 }];
const FIX_BAS_LINES_FALTA_DEPOIS = [FIX_BAS_LINES_IGUAIS[0], null];
const FIX_OCL_POUSOU = [true, null];
const FIX_OCL_SEM_MEDICAO = [false, null];
const FIX_OCL_MEDIDA = [false, { no_ponto: 'section.bfr-gate-overview-grid', ocupante: { w: 952, h: 34, posicao: 'static' }, alvo_e_mesmo_ponto: true }];

const portoes = [];
portoes.push(gate('o_ar_medido_bate_com_o_v142_do_registo_versionado',
  [saida.ar.md5 === saida.ar_registo_versionado.htmlMd5, saida.ar.bytes === saida.ar_registo_versionado.htmlBytes], [true, true]));
portoes.push(gate('a_sessao_e_de_gatekeeper_e_a_vista_da_portaria_e_a_pintada',
  [saida.censo_final.papel_perfil, saida.censo_final.vista_activa, saida.censo_final.vista_existe, saida.censo_final.vista_escondida === false],
  [PAPEL, PAPEL, true, true]));
portoes.push(gate('os_dois_discriminadores_de_camada_existem_nos_bytes_servidos',
  [saida.ar.tem_marca_modulo, saida.ar.tem_marca_legado], [true, true]));
portoes.push(gate('nenhum_ouvinte_de_submissao_alcanavel_fica_sem_camada_resolvida',
  [camadasLegado.length + camadasContentor.length >= 1,
    reguaCamadas(saida.ouvintes.contentor.ouvintes.filter((o) => o.e_de_submissao).concat(saida.ouvintes.formulario_legado.ouvintes.filter((o) => o.e_de_submissao))).every((x) => x === true),
    reguaCamadas(FIX_CAMADAS).join(',') === 'true,false,false,true'],
  [true, true, true]));
const legadoTemOuvinte = camadasLegado.includes('legado_shell');
const legadoTentado = saida.passos.some((p) => p.camada_alvo === 'legado_shell' && p.alcancavel === true);
const FIX_LEGADO_SEM_NODE_COM_OUVINTE = [0, true, null, false];
const FIX_LEGADO_PINTADO_E_NAO_TENTADO = [1, true, { w: 120, h: 22, disp: 'block', vis: 'visible' }, false];
const FIX_LEGADO_OCULTO = [1, true, { w: 0, h: 0, disp: 'none', vis: 'visible' }, false];
const FIX_LEGADO_TENTADO = [1, true, { w: 120, h: 22, disp: 'block', vis: 'visible' }, true];
portoes.push(gate('o_ouvinte_legado_sobre_com_o_no_que_o_legado_pinta_e_com_o_que_a_corrida_tentou',
  [reguaLegado(saida.censo_final.n_legado, legadoTemOuvinte, saida.censo_final.legado_caixa, legadoTentado).join(',') === 'true,true',
    reguaLegado(...FIX_LEGADO_SEM_NODE_COM_OUVINTE).join(',') === 'false,true',
    reguaLegado(...FIX_LEGADO_PINTADO_E_NAO_TENTADO).join(',') === 'true,false',
    reguaLegado(...FIX_LEGADO_OCULTO).join(',') === 'true,true',
    reguaLegado(...FIX_LEGADO_TENTADO).join(',') === 'true,true',
    saida.passos.some((p) => p.camada_alvo === 'legado_shell')],
  [true, true, true, true, true, true]));
portoes.push(gate('o_nome_do_rpc_no_fio_bate_com_a_camada_e_com_o_motivo_que_o_declaradamente_produz',
  [saida.atribuicao.n_julgaveis >= 1,
    julgamento.every((j) => j.bate !== false),
    passosJulgaveis.every((j) => JSON.stringify(j.esperado) === JSON.stringify(j.nomes_obtidos) && j.bate === true),
    reguaPasso(...FIX_ATRIB_MODULO_FORA_LEGADO_COM_V2).bate === true,
    reguaPasso(...FIX_ATRIB_MODULO_FORA_LEGADO_COM_V1).bate === false,
    reguaPasso(...FIX_ATRIB_LEGADO_COM_V2).bate === false,
    reguaPasso(...FIX_ATRIB_MODULO_COM_MOTIVO_SEM_PEDIDO).bate === false,
    reguaPasso(...FIX_ATRIB_MODULO_SEM_MOTIVO_SEM_PEDIDO).esperado === null,
    reguaPasso(...FIX_ATRIB_PASSO_NAO_TENTADO).esperado === null],
  [true, true, true, true, true, true, true, true, true]));
portoes.push(gate('a_enumacao_de_ouvintes_aconteceu_depois_de_o_modulo_diferido_montar_e_com_o_depurador_activo',
  [saida.tempos_ms.modulo_montado >= 0, saida.modulo_montado === true,
    saida.censo_apos_modulo.bound_modulo === true, saida.censo_apos_modulo.n_modulo >= 1,
    saida.depuracao_disponivel === true,
    saida.ouvintes.contentor.submissao.includes('modulo_diferido'),
    saida.ouvintes.contentor.ouvintes.length >= 1],
  [true, true, true, true, true, true, true]));
const ouvintesDeSubmissao = todosOuvintes.filter((o) => o.e_de_submissao);
portoes.push(gate('a_classificacao_de_camada_nao_dependeu_de_um_handler_que_este_build_nao_devolve',
  [ouvintesDeSubmissao.length >= 1,
    todosOuvintes.every((o) => typeof o.camada === 'string'),
    ouvintesDeSubmissao.every((o) => o.handler_devolvido_pelo_cdp === false),
    ouvintesDeSubmissao.every((o) => o.camada !== 'desconhecida' && o.camada !== 'ambigua'),
    camadaDoFonte(MARCA_MODULO + '(a)') === 'modulo_diferido',
    camadaDoFonte(MARCA_LEGADO + '(a)') === 'legado_shell',
    camadaDoFonte(MARCA_MODULO + '(a); ' + MARCA_LEGADO + '(b);') === 'ambigua',
    camadaDoFonte('nada a ver') === 'desconhecida'],
  [true, true, true, true, true, true, true, true]));
portoes.push(gate('nenhuma_das_quatro_mesas_de_referencia_se_moveu_por_esta_corrida',
  [reguaBaselines(saida.baselines.antes, saida.baselines.depois).join(',') === 'true,true,true',
    reguaBaselines(FIX_BAS_LINES_IGUAIS[0], FIX_BAS_LINES_IGUAIS[1]).join(',') === 'true,true,true',
    reguaBaselines(FIX_BAS_LINES_TROCOU_ALUNOS[0], FIX_BAS_LINES_TROCOU_ALUNOS[1]).join(',') === 'true,false,false',
    reguaBaselines(FIX_BAS_LINES_FALTA_DEPOIS[0], FIX_BAS_LINES_FALTA_DEPOIS[1]).join(',') === 'false,false,false'],
  [true, true, true, true]));
portoes.push(gate('nenhuma_linha_de_gate_checkins_foi_escrita_por_esta_corrida',
  [reguaEscrita(antes, depoisDoBanco).join(',') === 'true,true,true',
    reguaEscrita(FIX_ESCRITA_IDEAL[0], FIX_ESCRITA_IDEAL[1]).join(',') === 'true,true,true',
    reguaEscrita(FIX_ESCRRITA_PARTE[0], FIX_ESCRRITA_PARTE[1]).join(',') === 'false,true,false',
    reguaEscrita(FIX_ESCRITA_MUDOU_MARCA[0], FIX_ESCRITA_MUDOU_MARCA[1]).join(',') === 'true,false,true'],
  [true, true, true, true]));
const caixaPorCamada = (p) => (p.camada_alvo === 'legado_shell' ? saida.censo_final.legado_caixa : saida.censo_final.modulo_caixa);
const escaladaTentada = (p) => {
  const at = p.geo && p.geo.entrada && p.geo.entrada.atingibilidade;
  return Array.isArray(at) && at.some((r) => r.metodo === 'scrollTop no ancestor rolavel');
};
const FIX_CAUSA_ALCANCE = [{ alcancavel: true }, null, false];
const FIX_CAUSA_SEM_MOTIVO = [{ alcancavel: false, motivo: '', geo: { entrada: { w: 944, h: 34, y: 1209, janela: { ih: 900 } } } }, { w: 952 }, true];
const FIX_CAUSA_ABAIXO_SEM_ESCALADA = [{ alcancavel: false, motivo: 'centro fora da janela', geo: { entrada: { w: 944, h: 34, y: 1209, janela: { ih: 900 } } } }, { w: 952 }, false];
const FIX_CAUSA_ABAIXO_COM_ESCALADA = [{ alcancavel: false, motivo: 'centro fora da janela', geo: { entrada: { w: 944, h: 34, y: 1209, janela: { ih: 900 } } } }, { w: 952 }, true];
const FIX_CAUSA_ZERO_COM_TESTEMUNHA = [{ alcancavel: false, motivo: 'no DOM sem caixa pintada', geo: { entrada: { w: 0, h: 0, y: 0, janela: { ih: 900 } } } }, { w: 0 }, false];
const FIX_CAUSA_ZERO_SEM_TESTEMUNHA = [{ alcancavel: false, motivo: 'no DOM sem caixa pintada', geo: { entrada: { w: 0, h: 0, y: 0, janela: { ih: 900 } } } }, { w: 474 }, false];
portoes.push(gate('cada_passo_nao_alcancavel_tem_causa_nomeada_com_testemunha_independente',
  [saida.passos.every((p) => reguaCausaNaoAlcancavel(p, caixaPorCamada(p), escaladaTentada(p)).join(',') === 'true,true,true'),
    reguaCausaNaoAlcancavel(...FIX_CAUSA_ALCANCE).join(',') === 'true,true,true',
    reguaCausaNaoAlcancavel(...FIX_CAUSA_SEM_MOTIVO).join(',') === 'false,true,true',
    reguaCausaNaoAlcancavel(...FIX_CAUSA_ABAIXO_SEM_ESCALADA).join(',') === 'true,true,false',
    reguaCausaNaoAlcancavel(...FIX_CAUSA_ABAIXO_COM_ESCALADA).join(',') === 'true,true,true',
    reguaCausaNaoAlcancavel(...FIX_CAUSA_ZERO_COM_TESTEMUNHA).join(',') === 'true,true,true',
    reguaCausaNaoAlcancavel(...FIX_CAUSA_ZERO_SEM_TESTEMUNHA).join(',') === 'true,true,false'],
  [true, true, true, true, true, true, true]));
const passosAlcancaveis = saida.passos.filter((p) => p.alcancavel === true);
portoes.push(gate('cada_passo_alcancavel_ous_tem_o_clique_no_botao_ous_tem_a_oclusao_medida_no_ponto',
  [passosAlcancaveis.length >= 1 && passosAlcancaveis.every((p) => reguaOclusao(p.rato_pousou_no_alvo, p.oclusao).join(',') === 'true,true,true'),
    reguaOclusao(...FIX_OCL_POUSOU).join(',') === 'true,true,true',
    reguaOclusao(...FIX_OCL_SEM_MEDICAO).join(',') === 'false,false,false',
    reguaOclusao(...FIX_OCL_MEDIDA).join(',') === 'true,true,true'],
  [true, true, true, true]));
portoes.push(gate('o_cracha_de_controlo_nao_podia_resolver_em_linha_de_nenhum_dos_dous_rpc',
  [saida.cracha_de_controlo.tem_forma_de_uuid === false,
    ehUuid(FIX_UUID_BOM) === true,
    /target_badge_token\s+uuid/.test(String(assinatura.args_v2)) === true,
    /target_badge_token\s+uuid/.test('target_badge_token text') === false,
    assinatura.funcoes_do_par === 2],
  [true, true, true, true, true]));
portoes.push(gate('o_passo_de_submissao_foi_tentado_e_a_recusa_ficou_registrada',
  [saida.passos.length === 3,
    saida.passos.every((p) => p.alcancavel === true || (typeof p.motivo === 'string' && p.motivo.length > 0)),
    saida.passos.every((p) => p.alcancavel !== true || (p.clique && typeof p.clique.no_ponto === 'string')),
    saida.pedidos_no_fio.every((p) => p.cracha_e_o_de_controlo === true || p.corpo_campos.indexOf('target_badge_token') < 0),
    [MOTIVO.length >= 8, '1234567'.length >= 8].join(',') === 'true,false'],
  [true, true, true, true, true]));
portoes.push(gate('nenhum_valor_real_de_cadeia_chega_ao_artefacto', (() => {
  const corpo = JSON.stringify(saida);
  const valores = [gravada.access_token, gravada.refresh_token, SESSAO.access_token, SESSAO.refresh_token, anon].filter((s) => typeof s === 'string' && s.length >= 12);
  return [valores.filter((s) => corpo.includes(s)).length === 0, valores.length >= 3];
})(), [true, true]));
portoes.push(gate('o_registo_declara_o_que_nao_cobre', [saida.o_que_este_registo_nao_cobre.length >= 3, saida.ar_esperado_de.length > 0], [true, true]));

saida.portoes = portoes.map((p) => ({ nome: p.nome, verde: p.verde, obtido: p.verde ? undefined : p.obtido }));
saida.falhas = falhas;
saida.veredito = falhas.length === 0 ? 'P127_P4_PROVA_BROWSER_OK ' + portoes.length + '/0' : 'P127_P4_PROVA_BROWSER_VERMELHO ' + falhas.length;
grava(OUT);
for (const p of portoes) console.log((p.verde ? 'VERDE  ' : 'VERMELHO ') + p.nome + (p.verde ? '' : ' | ' + JSON.stringify(p.obtido).slice(0, 400)));
console.log('CAMADAS ' + JSON.stringify({ contentor: camadasContentor, formulario_legado: camadasLegado, n_legado: saida.censo_final.n_legado, n_modulo: saida.censo_final.n_modulo, bound: saida.censo_final.bound_modulo, api: saida.censo_final.api_modulo_registrada }));
console.log('NOMES_NO_FIO ' + JSON.stringify(saida.atribuicao.nomes_de_checkin) + ' modo_legado_medido=' + modoLegadoMedido + ' calendario_vazio=' + calendarioMedidoVazio + ' julgaveis=' + saida.atribuicao.n_julgaveis);
console.log('POR_PASSO ' + JSON.stringify(saida.atribuicao.por_passo.map((j) => ({ p: j.passo, tentado: j.tentado, esperado: j.esperado, obtido: j.nomes_obtidos, bate: j.bate }))));
console.log('CLIQUE_PONTO ' + JSON.stringify(saida.passos.map((p) => ({ p: p.passo, no_momento: p.alcancavel_no_momento, deriva: p.deriva_do_rect_lido_antes, relacao: p.clique && p.clique.relacao, no_ponto: p.clique && p.clique.no_ponto, entrada_lida: typeof p.cracha_lido === 'string' ? p.cracha_lido.length : p.cracha_lido, motivo_lido: typeof p.motivo_lido === 'string' ? p.motivo_lido.length : p.motivo_lido }))));
console.log('GATE_CHECKINS ' + JSON.stringify({ antes, depois: depoisDoBanco }));
console.log('DEGRAUS ' + JSON.stringify(saida.passos.map((p) => ({ p: p.passo, pousou: p.rato_pousou_no_alvo, teclado: p.degrau_teclado ? { entrada_focada: p.degrau_teclado.foco_entrada && p.degrau_teclado.foco_entrada.focado, motivo_focado: p.degrau_teclado.foco_motivo && p.degrau_teclado.foco_motivo.focado, cracha: typeof p.degrau_teclado.cracha_lido === 'string' ? p.degrau_teclado.cracha_lido.length : p.degrau_teclado.cracha_lido, motivo: typeof p.degrau_teclado.motivo_lido === 'string' ? p.degrau_teclado.motivo_lido.length : p.degrau_teclado.motivo_lido } : null, request_submit: p.degrau_request_submit || null, emissao: p.emissao_por_degrau, submetido_por: p.submetido_por, gaveta: p.gaveta && { antes: p.gaveta.antes.aberto, depois: p.gaveta.depois.aberto, relacao_do_clique: p.gaveta.click && p.gaveta.click.relacao, motivo: p.gaveta.motivo }, oclusao: p.oclusao && { no_ponto: p.oclusao.no_ponto, w: p.oclusao.ocupante && p.oclusao.ocupante.w, posicao: p.oclusao.ocupante && p.oclusao.ocupante.posicao, mesmo_ponto: p.oclusao.alvo_e_mesmo_ponto } }))));
console.log('STATUS ' + JSON.stringify(saida.passos.map((p) => ({ passo: p.passo, alcancavel: p.alcancavel, status: p.status, n_pedidos: (p.pedidos_do_passo || []).length }))));
console.log(saida.veredito + ' · ' + saida.duracao_ms + ' ms · ' + OUT.replace(REPO + '/', ''));
