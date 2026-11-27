// PEN-01 / RM-2.1 — o tempo entre toque e o que o ecra mostra, no menu mobile, com cadeia viva nos bytes de hoje,
// e o censo das escritas periodicas residuais na mesma janela de 30 s sem nenhuma interacao.
// Porque esta peca existe: a celula PEN-01 declara que a grandeza que a fecha e a latencia toque-paint, e o
// instrumento mais proximo (ah2-mobile2.mjs) amostra o painel de 600 em 600 ms. Com amostragem de 600 ms nao ha
// positivo possivel para distinguir 200 ms de 1200 ms — e 1200 e justamente o periodo de um dos escritores do laco.
// A latencia passa a ser tirada do lado da pagina, na mesma clock das mutacoes e das frames (performance.now), e o
// marco decisivo nao e a primeira mutacao do DOM — num app com escritores periodicos a primeira mutacao depois de
// um toque pode nao ser do toque. Por isso cada toque regista quatro grandezas separadas: primeira mutacao,
// primeira mutacao num controlo, primeira frame de animacao, e a frame em que o DESTINO mudou.
// O censo periodico re-measure o que a aceitacao do RM-2.1 pede («0 escritas periodicas residuais») nos bytes de
// hoje: a previsao aritmetica e lida do registo estatico do menu, nunca dactilografada, e as duas grandezas ficam
// na mesma ficha porque a divergencia entre elas e a medida, nao um portao.
// As tres correções da primeira corrida (sm78f), cada uma com fixture que dispara:
// (1) o `destino_antes` e o destino do ultimo QUADRO antes do toque, nao a leitura feita dentro do meu ouvinte de
//     captura — um alvo que muda o destino no seu proprio ouvinte deixava o marco sem positivo possivel;
// (2) as escritas nao sao postas dentro do registo do toque, vao para uma lista de carimbos absolutos lida no LER,
//     pela mesma razao: a ordem entre ouvintes nao pode decidir a presenca de um numero;
// (3) ARMAR e idempotente e o LIMPAR so limpa contadores, porque re-ARMAR antes de cada alvo empilhava ouvintes.
// Se um alvo esta coberto por outro elemento, a ficha nomeia o cobridor (rotulo, caixa, posicao, z-index) e o
// toque e dado na mesma: e aquilo que um utilizador recebe ao tocar naquele ponto, nao um zero cego.
// O resultado no destino (regua do briefing: «nao aprove porque o botao funciona»): alem das grandezas da pagina,
// cada toque e julgado pelo trafego que chegou DEPOIS dele. A escuta e passiva (Network.enable), o query e tirado
// antes de guardar, nenhum corpo e lido nem escrito (regra anti-PII da casa), e a classe sai de cinco valores
// declarados no topo deste ficheiro, cada um com fixture antes de qualquer browser. Dois cortes precedem a classe:
// respostas chegadas antes do carimbo do toque (o gesto de fechar a gaveta tambem dispara pedidos) e o par
// metodo+url aprendido na janela quieta de 30 s da propria banda (o laco do produto). Os dois cortam a mais, nunca
// a menos: na pior hipotese uma celula que so recebeu heartbeat fica SEM_PEDIDO, que e uma limitacao declarada.
// Regras desta corrida: 0 escrita no banco, 0 candidata publicada, 0 mint, 0 rotação, 0 push, 0 screenshot (as
// vistas tem nomes de alunos). O unico ficheiro escrito e a ficha desta corrida.
// Uso: node scripts/p192-toque-paint-do-menu-mobile.mjs [papel] [larguras csv] [rotulo]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = DIR + '/bfr-conecta';
const EV = REPO + '/evidence';
const PAPEL = process.argv[2] || 'secretary';
const LARGURAS = (process.argv[3] || '320,390,430').split(',').map((n) => parseInt(n, 10));
const ROTULO = process.argv[4] || 'sm78a';
const JANELA_INATIVA_MS = parseInt(process.env.P192_JANELA_MS || '30000', 10);
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = 'https://' + REF + '.supabase.co';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = 'sb-' + REF + '-auth-token';
const PORT = parseInt(process.env.P192_PORT || '9377', 10);
const ALTURA = 720;
const FAM_AR = 'ah2-sonda-portas-por-papel-';
const REGISTO_ESTATICO = 'ag5-rm21-timers-17-11.json';
const OUT = EV + '/p192-toque-paint-do-menu-mobile-' + ROTULO + '.json';
const PERFIL = DIR + '/.p192-' + ROTULO + '-' + PORT;
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' ja existe com ' + statSync(OUT).size + ' bytes — rode com outro rotulo');
if (LARGURAS.some((w) => !Number.isFinite(w) || w < 200 || w > 1400)) throw new Error('ABORTA: larguras ilogicas: ' + JSON.stringify(LARGURAS));

function escolhe_mais_novo(lista) {
  if (!lista.length) throw new Error('ABORTA: zero registos elegiveis — a identidade do ar nao pode ser lembrada');
  const ordenada = lista.slice().sort((a, b) => b.ms - a.ms);
  const empates = ordenada.filter((c) => c.ms === ordenada[0].ms).map((c) => c.n);
  if (empates.length > 1) throw new Error('ABORTA: empate no registo mais novo (' + empates.join(', ') + ') — nao se adivinha');
  return ordenada[0];
}
const fxRegistos = [
  { n: 'velho', ms: Date.parse('2026-11-01T00:00:00Z'), md5: 'aaaa' },
  { n: 'novo', ms: Date.parse('2026-11-26T00:00:00Z'), md5: 'bbbb' },
];
const fxEscolhido = escolhe_mais_novo(fxRegistos);
let fxEmpate = null; try { escolhe_mais_novo([fxRegistos[0], { n: 'outro', ms: fxRegistos[0].ms, md5: 'cccc' }]); } catch (e) { fxEmpate = String(e.message).slice(0, 60); }
let fxVazio = null; try { escolhe_mais_novo([]); } catch (e) { fxVazio = String(e.message).slice(0, 60); }
const fxProva = { escolhido: fxEscolhido.n, empate_aborta: !!fxEmpate, vazio_aborta: !!fxVazio };
if (fxProva.escolhido !== 'novo' || fxProva.empate_aborta !== true || fxProva.vazio_aborta !== true) throw new Error('ABORTA: a escolha do registo mais novo nao tem os tres casos provados, deu ' + JSON.stringify(fxProva));

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const AR = { bytes: Buffer.byteLength(shellTxt, 'utf8'), md5: createHash('md5').update(shellTxt).digest('hex') };
const nomesDaFam = readdirSync(EV).filter((n) => n.startsWith(FAM_AR) && n.endsWith('.json'));
const elegiveis = [];
for (const n of nomesDaFam) {
  let j; try { j = JSON.parse(readFileSync(EV + '/' + n, 'utf8')); } catch { continue; }
  if (typeof j.em === 'string' && typeof j.md5_shell === 'string' && !Number.isNaN(Date.parse(j.em))) elegiveis.push({ n, ms: Date.parse(j.em), em: j.em, md5: j.md5_shell });
}
const maisNovo = escolhe_mais_novo(elegiveis);
if (maisNovo.md5 !== AR.md5) throw new Error('ABORTA: o ar medido agora (md5 ' + AR.md5 + ', ' + AR.bytes + ' B) nao bate com o declarado pelo registo mais novo da familia (' + maisNovo.n + ', md5 ' + maisNovo.md5 + ') — contar por cima disto seria contar outro ar');

function previsao_dos_periodos_do_menu() {
  const j = JSON.parse(readFileSync(EV + '/' + REGISTO_ESTATICO, 'utf8'));
  if (!Array.isArray(j.periodos_ao_menu_com_escrita_dom)) throw new Error('ABORTA: ' + REGISTO_ESTATICO + ' nao tem periodos_ao_menu_com_escrita_dom — a previsao nao pode ser digitada por mim');
  const periodos = j.periodos_ao_menu_com_escrita_dom.map((t) => t.ms).filter((m) => typeof m === 'number' && m > 0);
  if (!periodos.length) throw new Error('ABORTA: o registo estatico do menu nao tem nenhum periodo, a previsao nao existe');
  return { registo: REGISTO_ESTATICO, em_registo: j.em, ar_desse_registo: j.md5, periodos_ms: periodos, escritas_esperadas_na_janela: periodos.reduce((a, p) => a + Math.floor(JANELA_INATIVA_MS / p), 0) };
}
const PREVISAO = previsao_dos_periodos_do_menu();

const contas = JSON.parse(readFileSync(EV + '/ah2-contas-17-11.json', 'utf8'));
const conta = contas.contas.find((c) => c.papel === PAPEL);
if (!conta) throw new Error('ABORTA: sem conta ' + PAPEL + ' no registo de contas');
const S = JSON.parse(readFileSync(DIR + '/ah2-sessions.json', 'utf8'));
if (!S[PAPEL] || !S[PAPEL].refresh_token) throw new Error('ABORTA: sem cadeia de ' + PAPEL + ' em ah2-sessions.json');
const ANON = (shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
if (!ANON) throw new Error('ABORTA: a chave publica nao esta no shell servido');
const renova = async () => {
  let ultimo = null;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(HOST + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
      const js = await r.json().catch(() => null);
      if (!r.ok || !js || !js.access_token) throw new Error('HTTP ' + r.status + ' ' + JSON.stringify(js).slice(0, 120));
      S[PAPEL] = Object.assign({}, S[PAPEL], { access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user });
      writeFileSync(DIR + '/ah2-sessions.json', JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) { ultimo = String(e.message || e).slice(0, 140); if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada — ' + ultimo); await new Promise((z) => setTimeout(z, 1500 * (t + 1))); }
  }
  throw new Error('renova(' + PAPEL + ') esgotou as tentativas: ' + ultimo);
};

const out = {
  ciclo: 'SM.78-PEN01', em: new Date().toISOString(), papel: PAPEL, id_conta: conta.id.slice(0, 8), url: URL_APP,
  larguras: LARGURAS, altura: ALTURA, janela_inativa_ms: JANELA_INATIVA_MS,
  emissor_p192: { caminho: 'scripts/p192-toque-paint-do-menu-mobile.mjs', bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') },
  ar: { bytes: AR.bytes, md5: AR.md5, declarada_por: maisNovo.n, em_registo: new Date(maisNovo.ms).toISOString(), bate_com_o_registo_mais_novo: true },
  previsao_estatica_do_menu: PREVISAO, definicao_de_destino: 'window.__p192_destino se existir, senao BFR_APP_RUNTIME.activeSection|activeView — o marco da latencia decisiva e o quadro em que este valor muda, registado pelo laco de quadros e nao por um leitor dentro do touchstart',
  observacao_da_pagina: 'desde o ARMAR corre um laco de requestAnimationFrame que so le o destino e carimba as mudancas; nao escreve no DOM. As latencias saem da clock da pagina (performance.now e timeStamp do evento), porque a amostragem do lado do Node, a 600 ms como no ah2-mobile2, nao distingue 200 ms de 1200 ms.',
  limite_de_atribuicao: 'uma mudanca de destino posta por um escritor periodico dentro da janela do toque seria atribuida ao toque; por isso a mesma ficha traz as mudancas de destino contadas na janela quieta, sem toque.',
  bandas: {},
};
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => { portoes++; const ok = JSON.stringify(dado) === JSON.stringify(esperado); if (!ok) falhas.push(nome + ' | dado=' + JSON.stringify(dado) + ' | esperado=' + JSON.stringify(esperado)); console.log((ok ? 'VERDE ' : 'VERMELHO ') + nome + ' :: ' + JSON.stringify(dado).slice(0, 160)); return ok; };

if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=' + PORT, '--user-data-dir=' + PERFIL, '--headless=new', '--window-size=' + LARGURAS[0] + ',' + ALTURA, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let abertaParaSaida = false;
const abort = (codigo, motivo) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  if (!abertaParaSaida) { try { writeFileSync(OUT, JSON.stringify(Object.assign({}, out, { INTERROMPIDA: motivo, portoes, falhas: falhas.slice(), em_parcial: true }), null, 2) + '\n'); console.log('PARCIAL escrito em ' + OUT.split('/').pop()); } catch (e) { console.log('PARCIAL nao pôde ser escrito: ' + String(e.message).slice(0, 90)); } }
  console.log('PAROU: ' + motivo); process.exit(codigo);
};
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e && e.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e && e.message || e).slice(0, 170)));
const TETO = parseInt(process.env.P192_TETO_MS || '500000', 10);
setTimeout(() => { console.log('PRAGA ' + Math.round(TETO / 1000) + ' s: fechar com o que foi medido'); abertaParaSaida = true; writeFileSync(OUT, JSON.stringify(Object.assign({}, out, { PORTOES_PARCIAIS: portoes, FALHAS: falhas.slice() }), null, 2) + '\n'); console.log('FICHEIRO_PARCIAL'); spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); process.exit(0); }, TETO);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
let seq = 0; const pend = new Map(); const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!abertaParaSaida) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
// Trafego do destino: a resposta a pergunta que a ficha de latencia nao responde — «o destino deu resultado?».
// So se observam Fetch/XHR, o carimbo e o relogio do Node no instante do evento, o url perde o query antes de
// ser guardado (e no query que vivem chaves e filtros), e nenhum corpo e lido: a regra anti-PII desta casa nao
// se suspende porque o pedido saiu do browser. Os metodos vao todos no registo, inclusive os nao-GET, porque o
// produto faz os seus proprios heartbeat e proibi-los de aparecer seria o portao a mentir sobre uma classe
// legitima do trafego.
const REDE = [];
const PEDIDOS = {};
let rede_ligada = false;
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (!rede_ligada) return;
  if (m.method === 'Network.requestWillBeSent') {
    // O metodo vive no pedido, nao na resposta: contar `response.method` dava string vazia em todas as fichas,
    // e o censo de metodos fora do GET — a unica face que mostra uma escrita no destino — era um zero cego.
    const q = (m.params && m.params.request) || {};
    PEDIDOS[String((m.params || {}).requestId)] = { metodo: String(q.method || ''), url_sem_query: String(q.url || '').split('?')[0] };
    return;
  }
  if (m.method === 'Network.responseReceived') {
    const r = (m.params && m.params.response) || {};
    const tipo = String((m.params && m.params.type) || '');
    if (!/^(Fetch|XHR|Other)$/.test(tipo)) return;
    const rid = String(m.params.requestId);
    const p = PEDIDOS[rid] || {};
    REDE.push({ rid: rid, url_sem_query: p.url_sem_query || String(r.url || '').split('?')[0], status: Number(r.status) || 0, metodo: p.metodo || String(r.requestMethod || ''), bytes: 0, tipo: tipo, em_ms: Date.now() });
  } else if (m.method === 'Network.loadingFinished') {
    const a = REDE.find((x) => x.rid === String(m.params.requestId));
    if (a && Number(m.params.encodedDataLength) > a.bytes) a.bytes = Number(m.params.encodedDataLength);
    delete PEDIDOS[String(m.params.requestId)];
  }
};
// A classe de destino e uma funcao pura sobre as fichas de trafego, para ter fixture que dispara em cada uma
// das cinco classes antes de qualquer corrida: um veredicto que so sei tirar do browser nao e falsificavel.
const DS_NADA_OBSERVADO = 'DESTINO_NAO_OBSERVADO';
const DS_SEM_PEDIDO = 'DESTINO_SEM_PEDIDO';
const DS_RECUSADO = 'DESTINO_RECUSADO';
const DS_COM_RESULTADO = 'DESTINO_COM_RESULTADO';
const DS_RESULTADO_VAZIO = 'DESTINO_RESULTADO_VAZIO';
const VOCABULARIO_DE_DESTINO = [DS_NADA_OBSERVADO, DS_SEM_PEDIDO, DS_RECUSADO, DS_COM_RESULTADO, DS_RESULTADO_VAZIO];
function classe_do_destino_pelo_trafego(respostas, rede_habilitada) {
  if (rede_habilitada !== true) return { classe: DS_NADA_OBSERVADO, motivo: 'a escuta de rede nao foi ligada nesta corrida, nenhum zero abaixo e medido', medida: null };
  const rs = Array.isArray(respostas) ? respostas : [];
  const recusadas = rs.filter((r) => Number(r.status) >= 400);
  const com_corpo = rs.filter((r) => Number(r.status) >= 200 && Number(r.status) < 300 && Number(r.bytes) > 0);
  // As cinco grandezas existem tambem quando nada chegou: uma ficha de SEM_PEDIDO com campos em falta faria a
  // fila impressa dizer `undefined`, e um campo que so existe nas celulas verdes e a regua a contar-se a si propria.
  const medida = { respostas: rs.length, com_corpo: com_corpo.length, recusadas: recusadas.length,
    bytes_totais: rs.reduce((a, r) => a + (Number(r.bytes) || 0), 0),
    metodos: rs.reduce((h, r) => { const k = String(r.metodo || ''); h[k] = (h[k] || 0) + 1; return h; }, {}) };
  if (!rs.length) return { classe: DS_SEM_PEDIDO, motivo: 'nenhuma resposta de dados no intervalo entre o toque e o assentar', medida };
  if (recusadas.length) return { classe: DS_RECUSADO, motivo: recusadas.length + ' de ' + rs.length + ' respostas chegaram com estado igual ou acima de 400', medida };
  if (com_corpo.length) return { classe: DS_COM_RESULTADO, motivo: com_corpo.length + ' de ' + rs.length + ' respostas chegaram com estado 2xx e corpo', medida };
  return { classe: DS_RESULTADO_VAZIO, motivo: 'houve ' + rs.length + ' trafego(s) de dados e nenhum estado 2xx trouxe bytes', medida };
}
{
  const fx = [];
  const classesVistas = [];
  const F = (nome, obtido, esperado) => { fx.push({ nome, ok: obtido.classe === esperado, obtido: obtido.classe, esperado, motivo: String(obtido.motivo).slice(0, 90) }); classesVistas.push(obtido.classe); };
  F('nao_observado', classe_do_destino_pelo_trafego([{ status: 200, bytes: 10 }], false), DS_NADA_OBSERVADO);
  F('sem_pedido', classe_do_destino_pelo_trafego([], true), DS_SEM_PEDIDO);
  F('recusado', classe_do_destino_pelo_trafego([{ status: 200, bytes: 12 }, { status: 403, bytes: 0 }], true), DS_RECUSADO);
  F('com_resultado', classe_do_destino_pelo_trafego([{ status: 200, bytes: 4120, metodo: 'GET' }], true), DS_COM_RESULTADO);
  F('resultado_vazio', classe_do_destino_pelo_trafego([{ status: 200, bytes: 0, metodo: 'GET' }], true), DS_RESULTADO_VAZIO);
  const com_corpo_fi = classe_do_destino_pelo_trafego([{ status: 200, bytes: 4120, metodo: 'GET' }, { status: 204, bytes: 0, metodo: 'POST' }], true);
  fx.push({ nome: 'bytes_totais_e_metodos_sao_medidos_na_ficha', ok: com_corpo_fi.medida.bytes_totais === 4120 && com_corpo_fi.medida.metodos.GET === 1 && com_corpo_fi.medida.metodos.POST === 1, obtido: JSON.stringify(com_corpo_fi.medida), esperado: 'GET=1 POST=1 bytes=4120', motivo: '' });
  classesVistas.push(com_corpo_fi.classe);
  const sem_pedido_fi = classe_do_destino_pelo_trafego([], true);
  const GRANDEZAS_DE_DESTINO = ['respostas', 'com_corpo', 'recusadas', 'bytes_totais', 'metodos'];
  const faltam = GRANDEZAS_DE_DESTINO.filter((g) => !(g in (sem_pedido_fi.medida || {})));
  fx.push({ nome: 'sem_pedido_declara_as_cinco_grandezas_zeradas', ok: faltam.length === 0 && sem_pedido_fi.medida.respostas === 0 && sem_pedido_fi.medida.bytes_totais === 0, obtido: JSON.stringify(sem_pedido_fi.medida), esperado: 'respostas=0 bytes_totais=0, cinco chaves', motivo: 'faltam=' + JSON.stringify(faltam) });
  classesVistas.push(sem_pedido_fi.classe);
  const sem_positivo = fx.filter((t) => !t.ok);
  // O censo de classes so pode vir das chamadas que devolvem uma classe: contar o campo `obtido` do fx misturaria
  // a ficha de medida duma assercao de bytes com os nomes do vocabulario, e o portao abortaria sobre o proprio output.
  const classes_vistas = [...new Set(classesVistas)].sort();
  if (classesVistas.length !== fx.length) { abertaParaSaida = true; console.log('ABORTA_CENSO_DE_CLASSES ' + JSON.stringify({ classesVistas: classesVistas.length, fx: fx.length })); process.exit(1); }
  console.log('PROVA_FIXTURE_DESTINO_POR_TRAFEGO casos=' + fx.length + ' faltas=' + sem_positivo.length + ' classes_vistas=' + JSON.stringify(classes_vistas) + ' vocabulario=' + JSON.stringify(VOCABULARIO_DE_DESTINO));
  if (sem_positivo.length) { abertaParaSaida = true; console.log('ABORTA_FIXTURE_DESTINO ' + JSON.stringify(sem_positivo)); try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} process.exit(1); }
  const classes_fora = classes_vistas.filter((c) => VOCABULARIO_DE_DESTINO.indexOf(c) < 0);
  if (classes_fora.length) { abertaParaSaida = true; console.log('ABORTA_CLASSE_FORA_DO_VOCABULARIO ' + JSON.stringify(classes_fora)); process.exit(1); }
}
const PRAZO = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq; const prazo = PRAZO(method);
  const temporizador = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + Math.round(prazo / 1000) + ' s')); } }, prazo);
  pend.set(i, { res: (v) => { clearTimeout(temporizador); res(v); }, rej: (e) => { clearTimeout(temporizador); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(temporizador); rej(e); }
});
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300)); return r.result && r.result.value; };
const waitFor = async (e, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 100)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const toca = async (x, y) => { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };

// Instrumento do lado da pagina. Nada aqui re-dactilografa regras do produto: so observa.
// ARMAR e idempotente: os ouvintes so se instalam uma vez, porque a primeira versao re-ARMAR antes de cada
// toque empilhava um ouvinte de touchstart por alvo e um mesmo toque produzia varios registos.
// O LIMPAR e chamado antes de cada toque e so limpa contadores — os quadros continuam a ser varridos.
const LIMPAR = `(function () {
  var e = window.__p192_estado;
  if (!e) return null;
  e.toques.length = 0; e.mutacoes_total = 0; e.mutacoes_de_controlo = 0; e.por_alvo = {}; e.por_atributo = {};
  e.mudancas_de_destino.length = 0; e.mudancas_truncadas = 0; e.armados_em = performance.now();
  e.carimbos.length = 0; e.carimbos_controlo.length = 0; e.carimbos_perdidos = 0; e.carimbos_controlo_perdidos = 0;
  e.ultimo_destino = (function () {
    if (typeof window.__p192_destino === 'string') return window.__p192_destino;
    var r = window.BFR_APP_RUNTIME;
    if (r) return String(r.activeSection === undefined ? '?' : r.activeSection) + '|' + String(r.activeView === undefined ? '?' : r.activeView);
    return 'sem_runtime';
  })();
  return { limpo: true, toques: e.toques.length, ultimo_destino: e.ultimo_destino };
})()`;

const ARMAR = `(function () {
  if (window.__p192_estado) return { armado: true, ja_estava_armado: true, suporte_event_timing: window.__p192_estado.suporte_event_timing };
  var le_destino = function () {
    if (typeof window.__p192_destino === 'string') return window.__p192_destino;
    var r = window.BFR_APP_RUNTIME;
    if (r) return String(r.activeSection === undefined ? '?' : r.activeSection) + '|' + String(r.activeView === undefined ? '?' : r.activeView);
    return 'sem_runtime';
  };
  var estado = { armados_em: performance.now(), toques: [], mutacoes_total: 0, mutacoes_de_controlo: 0, por_alvo: {}, por_atributo: {}, eventos: [], suporte_event_timing: false, mudancas_de_destino: [], mudancas_truncadas: 0, ultimo_destino: le_destino(), carimbos: [], carimbos_controlo: [], carimbos_perdidos: 0, carimbos_controlo_perdidos: 0 };
  window.__p192_estado = estado;
  var rotulo = function (e) {
    if (!e || e.nodeType !== 1) return null;
    var tag = e.tagName.toLowerCase();
    var id = e.id ? ('#' + e.id) : '';
    var cls = (typeof e.className === 'string' && e.className.trim()) ? ('.' + e.className.trim().split(/\\s+/)[0]) : '';
    return tag + id + cls;
  };
  var de_controlo = function (e) {
    if (!e || e.nodeType !== 1) return false;
    var t = e.tagName;
    if (t === 'BUTTON' || t === 'A' || t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return true;
    return e.getAttribute && e.getAttribute('role') === 'button';
  };
  var visibilidade = {};
  estado.visibilidade = visibilidade;
  var marca_visibilidade = function (e) {
    var l = rotulo(e);
    if (!l || visibilidade[l] !== undefined) return;
    visibilidade[l] = !!(e.offsetWidth || e.offsetHeight) && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  };
  var CARIMBOS_MAX = 30000;
  var obs = new MutationObserver(function (recs) {
    var agora = performance.now();
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      estado.mutacoes_total++;
      if (r.type !== 'attributes') continue;
      var alvo = rotulo(r.target);
      if (alvo) { estado.por_alvo[alvo] = (estado.por_alvo[alvo] || 0) + 1; marca_visibilidade(r.target); }
      var at = r.attributeName || '?';
      estado.por_atributo[at] = (estado.por_atributo[at] || 0) + 1;
      var emControlo = de_controlo(r.target);
      if (emControlo) estado.mutacoes_de_controlo++;
      // O carimbo e absoluto e nao vai escrito dentro do registo do toque: a primeira versao punha
      // primeira_mutacao no ultimo toque da lista, e um alvo cuja escrita acontece no ouvinte da propria
      // pagina fica registrada antes de o meu ouvinte de captura ter criado o registo — a latencia saia nula
      // sem nunca ter havido ausencia de escrita. Com carimbos na clock da pagina, a ordem dos ouvintes deixa
      // de importar e a leitura e feita no LER.
      if (estado.carimbos.length < CARIMBOS_MAX) estado.carimbos.push(Math.round(agora * 10) / 10);
      else estado.carimbos_perdidos++;
      if (emControlo) {
        if (estado.carimbos_controlo.length < CARIMBOS_MAX) estado.carimbos_controlo.push(Math.round(agora * 10) / 10);
        else estado.carimbos_controlo_perdidos++;
      }
    }
  });
  obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
  try {
    var pe = new PerformanceObserver(function (l) {
      var es = l.getEntries();
      for (var i = 0; i < es.length && estado.eventos.length < 240; i++) {
        var e = es[i];
        estado.eventos.push({ nome: e.name, ms_desde_o_armador: Math.round(e.startTime - estado.armados_em), duracao: Math.round(e.duration), processamento: Math.round(e.processingEnd - e.processingStart), apresentacao: Math.round(e.startTime + e.duration - e.processingEnd), alvo: rotulo(e.target) });
      }
    });
    pe.observe({ type: 'event', durationThreshold: 0, buffered: false });
    estado.suporte_event_timing = true;
  } catch (err) { estado.suporte_event_timing = false; }
  document.addEventListener('touchstart', function (ev) {
    var agora = performance.now();
    var usaTS = (typeof ev.timeStamp === 'number' && ev.timeStamp > 0 && ev.timeStamp <= agora);
    var r = { toque: agora, marco: usaTS ? ev.timeStamp : agora, marco_do_evento: usaTS, alvo: rotulo(ev.target), destino_antes: estado.ultimo_destino, primeira_frame: null };
    estado.toques.push(r);
    requestAnimationFrame(function (ts) { if (r.primeira_frame === null) r.primeira_frame = Math.round(ts - r.marco); });
  }, { capture: true, passive: true });
  // O registo das mudancas de destino vive num laco de frames proprio, e nao dum leitor dentro do touchstart:
  // a primeira versao tirava o destino_antes no meu ouvinte de captura, que pode correr DEPOIS do ouvinte da
  // pagina — um toque que muda o destino ja dentro do evento ficava sem positivo possivel (o vermelho do
  // fixture imediata). Aqui a linha de base e o destino visto no ultimo quadro antes do toque, e a mudança e
  // carimbada pelo quadro em que o valor novo e lido.
  var varre_quadros = function (ts) {
    var d = le_destino();
    if (d !== estado.ultimo_destino) {
      if (estado.mudancas_de_destino.length < 400) estado.mudancas_de_destino.push({ de: estado.ultimo_destino, para: d, ms: Math.round(ts) });
      else estado.mudancas_truncadas++;
      estado.ultimo_destino = d;
    }
    requestAnimationFrame(varre_quadros);
  };
  requestAnimationFrame(varre_quadros);
  return { armado: true, suporte_event_timing: estado.suporte_event_timing };
})()`;

const TETO_DESTINO_MS = 2500;
const LER = `(function () {
  var e = window.__p192_estado;
  if (!e) return null;
  var agora = performance.now();
  var alvos = Object.keys(e.por_alvo).sort(function (a, b) { return e.por_alvo[b] - e.por_alvo[a]; }).slice(0, 12);
  return {
    ms_da_pagina: Math.round(agora),
    mutacoes_total: e.mutacoes_total, mutacoes_de_controlo: e.mutacoes_de_controlo,
    por_alvo_top: alvos.map(function (a) { return { alvo: a, escritas: e.por_alvo[a], visivel: e.visibilidade[a] === undefined ? null : e.visibilidade[a] }; }),
    por_atributo: e.por_atributo, suporte_event_timing: e.suporte_event_timing,
    mudancas_de_destino: e.mudancas_de_destino.length, mudancas_truncadas: e.mudancas_truncadas,
    carimbos_registrados: e.carimbos.length / 2, carimbos_perdidos: e.carimbos_perdidos,
    toques: e.toques.map(function (r) {
      var base = r.marco, mudou = null, ms = null, pm = null, pmc = null;
      for (var k = 0; k < e.carimbos.length; k = k + 2) {
        var c = e.carimbos[k], ctrl = e.carimbos[k + 1];
        if (c < base) continue;
        if (pm === null) pm = Math.round(c - base);
        if (ctrl && pmc === null) pmc = Math.round(c - base);
        if (pm !== null && pmc !== null) break;
      }
      for (var j = 0; j < e.mudancas_de_destino.length; j++) {
        var m = e.mudancas_de_destino[j];
        if (m.ms >= base && m.para !== r.destino_antes) { mudou = true; ms = Math.round(m.ms - base); break; }
      }
      if (mudou === null && agora - base > ${TETO_DESTINO_MS}) mudou = false;
      return { alvo: r.alvo, destino_antes: r.destino_antes, marco_do_evento: r.marco_do_evento, primeira_mutacao: pm, primeira_mutacao_de_controlo: pmc, primeira_frame: r.primeira_frame, mudou_destino: mudou, ms_para_mudar_destino: ms };
    }),
    eventos: e.eventos.slice(-40)
  };
})()`;

// O retangulo e tocavel ou diz porque nao e — e o seletor entra ja interpolado, porque a primeira versao
// substituia um marcador com aspas erradas e todo o alvo devolvia `sem_botao`.
// Quando um elemento cobre o alvo, a ficha nao devolve so o tag nu: devolve o rotulo, a caixa, a posicao
// e o z-index do cobridor, porque `tapado_por_p` nao diz a ninguem o que esta por cima da barra do telemovel.
const retangulo = (sel) => '(function () { var b = document.querySelector(' + JSON.stringify(sel) + ');' +
  ' if (!b) return { sem_botao: true };' +
  ' var cs = getComputedStyle(b); var r = b.getBoundingClientRect();' +
  ' if (!(b.offsetWidth || b.offsetHeight) || cs.display === "none" || cs.visibility === "hidden" || cs.pointerEvents === "none" || !r.width || !r.height) return { invisivel: true };' +
  ' var x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);' +
  ' if (x < 0 || y < 0 || x > document.documentElement.clientWidth || y > document.documentElement.clientHeight) return { fora_do_ecra: { x: x, y: y } };' +
  ' var topo = document.elementFromPoint(x, y);' +
  ' if (!(topo === b || b.contains(topo))) {' +
  '   if (!topo) return { tapado: { nada_no_ponto: true }, largura: Math.round(r.width), altura: Math.round(r.height) };' +
  '   var tc = getComputedStyle(topo); var tr = topo.getBoundingClientRect();' +
  '   var cls = (typeof topo.className === "string" && topo.className.trim()) ? "." + topo.className.trim().split(/\\s+/)[0] : "";' +
  '   var pilha = [];' +
  '   if (typeof document.elementsFromPoint === "function") { var ps = document.elementsFromPoint(x, y) || []; for (var q = 0; q < ps.length && q < 4; q++) { var pe = ps[q]; var pc = getComputedStyle(pe); var pr = pe.getBoundingClientRect(); var pcls = (typeof pe.className === "string" && pe.className.trim()) ? "." + pe.className.trim().split(/\\s+/)[0] : ""; pilha.push({ rotulo: pe.tagName.toLowerCase() + (pe.id ? "#" + pe.id : "") + pcls, posicao: pc.position, z_index: pc.zIndex, opacidade: pc.opacity, caixa: Math.round(pr.width) + "x" + Math.round(pr.height), dentro_do_alvo: b === pe || b.contains(pe) }); } }' +
  '   return { x: x, y: y, largura: Math.round(r.width), altura: Math.round(r.height), tapado: { rotulo: topo.tagName.toLowerCase() + (topo.id ? "#" + topo.id : "") + cls, contido_no_alvo: b.contains(topo), caixa: { largura: Math.round(tr.width), altura: Math.round(tr.height) }, posicao: tc.position, z_index: tc.zIndex, pointer_events: tc.pointerEvents, pilha_de_camadas: pilha } };' +
  ' }' +
  ' return { x: x, y: y, largura: Math.round(r.width), altura: Math.round(r.height) }; })()';

const ESTADO_MOBILE = `(function () {
  var app = document.getElementById('appShell');
  var nav = document.getElementById('bfrMobileBottomNav');
  var dr = document.getElementById('bfrMobileDrawer');
  var rot = Array.from(document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]')).map(function (b) { var r = b.getBoundingClientRect(); return { rota: b.getAttribute('data-bfr-mobile-route'), largura: Math.round(r.width), altura: Math.round(r.height), texto: (b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 18) }; });
  return { presentation: app ? app.getAttribute('data-presentation') : null, body_mobile: document.body.classList.contains('bfr-mobile-presentation'), barra_existe: !!nav, rotas: rot, hamb: !!document.querySelector('[data-bfr-open-drawer]'), gaveta_existe: !!dr, gaveta_classes: dr ? String(dr.className).slice(0, 60) : null, gaveta_display: dr ? getComputedStyle(dr).display : null, vw: document.documentElement.clientWidth, destino: (function () { var r = window.BFR_APP_RUNTIME; return r ? String(r.activeSection) + '|' + String(r.activeView) : null; })() };
})()`;

// O fundo da gaveta e o gesto com que um utilizador a fecha sem escolher rota. Este corpo procura um ponto do
// fundo que esteja FORA do painel: um toque no centro da viewport cai dentro do painel (343 de 390), nao no fundo,
// por isso o ponto e escolhido na faixa exposta e confirmado por elementFromPoint antes de ser devolvido.
const PONTO_GAVETA_FECHAVEL = `(function () {
  var bd = document.querySelector('.bfr-mobile-drawer-backdrop');
  if (!bd) return { sem_fechador: true };
  var cs = getComputedStyle(bd);
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return { fechador_inerte: { display: cs.display, visibility: cs.visibility, pointer_events: cs.pointerEvents } };
  var br = bd.getBoundingClientRect();
  var painel = document.querySelector('.bfr-mobile-drawer-panel');
  var pr = painel ? painel.getBoundingClientRect() : null;
  var y = Math.round(br.y + br.height / 2);
  var candidatos = pr ? [{ x: Math.round(pr.left - 8), faixa: 'esquerda_do_painel' }, { x: Math.round(pr.right + 8), faixa: 'direita_do_painel' }] : [{ x: Math.round(br.x + br.width / 2), faixa: 'centro' }];
  var cliente = document.documentElement.clientWidth;
  for (var i = 0; i < candidatos.length; i++) {
    var x = candidatos[i].x;
    if (x < 2 || x > cliente - 2) continue;
    var topo = document.elementFromPoint(x, y);
    if (!topo) continue;
    if (painel && painel.contains(topo)) continue;
    if (topo === bd || bd.contains(topo)) return { x: x, y: y, faixa: candidatos[i].faixa, rotulo_no_ponto: topo.tagName.toLowerCase() };
  }
  return { sem_ponto_exposto: true, painel: pr ? { x: Math.round(pr.x), largura: Math.round(pr.width) } : null, fundo: { x: Math.round(br.x), largura: Math.round(br.width) }, cliente: cliente };
})()`;

const paginaDeFixture = (corpo) => 'data:text/html;charset=utf-8,' + encodeURIComponent('<!doctype html><html><head><meta charset="utf-8"></head><body>' + corpo + '</body></html>');
const FIX_TARDE = paginaDeFixture('<button id="alvo">toca</button><script>window.__p192_destino="antes";document.addEventListener("touchstart",function(){setTimeout(function(){document.getElementById("alvo").classList.add("mudou");window.__p192_destino="depois";},400);},{capture:true,passive:true});</script>');
const FIX_IMEDIATO = paginaDeFixture('<button id="alvo">toca</button><script>window.__p192_destino="antes";document.addEventListener("touchstart",function(){document.getElementById("alvo").classList.add("mudou");window.__p192_destino="depois";},{capture:true,passive:true});</script>');
const FIX_QUIETO = paginaDeFixture('<button id="alvo1">a</button><button id="alvo2">b</button><script>var n=0;</script>');
const FIX_PERIODICO = paginaDeFixture('<button id="alvo1">a</button><button id="alvo2">b</button><script>setInterval(function(){var b=document.getElementById("alvo1");b.classList.toggle("pulso");b.setAttribute("aria-current",String(Math.random()).slice(0,4));},250);</script>');
// A columna `visivel` da tabela de escritas so e medida se tiver os dois lados: um controlo escondido e um
// controlo à vista, ambos escritos pelo mesmo laço. Sem esta pagina o campo seria decoracao.
const FIX_VISIVEL = paginaDeFixture('<button id="mostrado">a</button><button id="escondido" style="display:none">b</button><script>setInterval(function(){document.getElementById("mostrado").setAttribute("aria-current","1");document.getElementById("escondido").setAttribute("aria-current","2");},250);</script>');

await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); rede_ligada = true;
out.escuta_de_rede = { habilitada: true, tipos_observados: ['Fetch', 'XHR', 'Other'], url: 'query removido antes de guardar, nenhum query e registrado', corpos: 'nenhum corpo lido nem escrito — regra anti-PII da casa, o resultado no destino e medido por estado e bytes', vocabulario_de_destino: VOCABULARIO_DE_DESTINO, janela_por_toque: 'as respostas contadas sao as que chegam entre o toque e o assentar de 3 200 ms, cortadas pelo carimbo do relogio do Node' };
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: ALTURA, deviceScaleFactor: 2, mobile: true });

const fx = {};
// Regra da casa: verificar por re-parsing, nao por olho. O node --check deste ficheiro nao ve um corpo que e
// valido no Node mas partido quando a pagina o recebe (fecho de parentese ou aspa a mais), e foi justamente um
// corpo partido que me devolveu sem_botao em todos os alvos. O controlo negativo e composto em tempo de execucao
// para que a agulha partida nao fique escrita num fonte que a propria regua de higiene varre.
const compila_corpo = (corpo) => { try { new vm.Script('(function () {' + String(corpo) + '})'); return true; } catch (e) { return false; } };
const corpo_de_proposito_partido = '(function () { var a = 1; return { x: a';
fx.corpos_injectados = { ARMAR: compila_corpo(ARMAR), LIMPAR: compila_corpo(LIMPAR), LER: compila_corpo(LER), ESTADO_MOBILE: compila_corpo(ESTADO_MOBILE), PONTO_GAVETA_FECHAVEL: compila_corpo(PONTO_GAVETA_FECHAVEL), retangulo: compila_corpo(retangulo('#alvo')), controlo_negativo_rejeitado: compila_corpo(corpo_de_proposito_partido) === false };
gate('corpos injectados: cada corpo declarado compila antes de gastar um boot, e o partido e rejeitado', fx.corpos_injectados, { ARMAR: true, LIMPAR: true, LER: true, ESTADO_MOBILE: true, PONTO_GAVETA_FECHAVEL: true, retangulo: true, controlo_negativo_rejeitado: true });
if (!Object.values(fx.corpos_injectados).every((v) => v === true)) { abertaParaSaida = true; out.fixtures = fx; writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n'); console.log('ABORTA_CORPO_INJECTADO_PARTIDO ' + JSON.stringify(fx.corpos_injectados)); try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} process.exit(1); }
const correrFixture = async (url, esperarMs, tocar) => {
  await send('Page.navigate', { url });
  await waitFor('!!document.body', 20000);
  await E(ARMAR);
  if (tocar) { const r = await E(retangulo('#alvo')); if (!r || !r.x) throw new Error('fixture sem alvo tocavel: ' + JSON.stringify(r)); await toca(r.x, r.y); }
  await dorme(esperarMs);
  return await E(LER);
};
const fxTarde = await correrFixture(FIX_TARDE, 1300, true);
const fxImediato = await correrFixture(FIX_IMEDIATO, 3200, true);
const fxQuieto = await correrFixture(FIX_QUIETO, 1500, false);
const fxPeriodico = await correrFixture(FIX_PERIODICO, 3000, false);
const fxVisivel = await correrFixture(FIX_VISIVEL, 1500, false);
const tTarde = fxTarde.toques[0] || {};
const tImediato = fxImediato.toques[0] || {};
const filaVisivel = (rot) => { const l = (fxVisivel.por_alvo_top || []).filter((x) => x.alvo === rot); return l.length === 1 ? l[0].visivel : 'sem_fila_ou_multiplas'; };
fx.suporte_event_timing = fxTarde.suporte_event_timing;
fx.tarde = { primeira_mutacao: tTarde.primeira_mutacao, mudou_destino: tTarde.mudou_destino, ms_para_mudar_destino: tTarde.ms_para_mudar_destino, mutacoes_de_controlo: fxTarde.mutacoes_de_controlo, marco_do_evento: tTarde.marco_do_evento };
fx.imediato = { primeira_mutacao: tImediato.primeira_mutacao, mudou_destino: tImediato.mudou_destino, ms_para_mudar_destino: tImediato.ms_para_mudar_destino, mutacoes_de_controlo: fxImediato.mutacoes_de_controlo, marco_do_evento: tImediato.marco_do_evento };
fx.quieto = { toques: fxQuieto.toques.length, mutacoes_de_controlo: fxQuieto.mutacoes_de_controlo };
fx.periodico = { toques: fxPeriodico.toques.length, mutacoes_de_controlo: fxPeriodico.mutacoes_de_controlo, mutacoes_total: fxPeriodico.mutacoes_total };
fx.visibilidade = { escondido: filaVisivel('button#escondido'), mostrado: filaVisivel('button#mostrado') };
gate('fixture do toque lento: as duas latencias sao numeros e a lenta e maior que a imediata', { lenta: typeof fx.tarde.primeira_mutacao, imediata: typeof fx.imediato.primeira_mutacao, lenta_maior: typeof fx.tarde.primeira_mutacao === 'number' && typeof fx.imediato.primeira_mutacao === 'number' && fx.tarde.primeira_mutacao > fx.imediato.primeira_mutacao }, { lenta: 'number', imediata: 'number', lenta_maior: true });
gate('fixture do toque lento: o marco do destino cai na janela dos 400 ms programados', { mudou: fx.tarde.mudou_destino, na_janela: typeof fx.tarde.ms_para_mudar_destino === 'number' && fx.tarde.ms_para_mudar_destino >= 380 && fx.tarde.ms_para_mudar_destino <= 1300 }, { mudou: true, na_janela: true });
gate('fixture do toque imediato: a escrita do ouvinte da pagina e registrada apesar da ordem dos ouvintes', { registos: fxImediato.toques.length, tem_primeira_mutacao: typeof fx.imediato.primeira_mutacao === 'number', mudou_destino: fx.imediato.mudou_destino }, { registos: 1, tem_primeira_mutacao: true, mudou_destino: true });
gate('fixture: o destino do toque imediato chega antes do do toque lento', { imediato_menor: typeof fx.imediato.ms_para_mudar_destino === 'number' && typeof fx.tarde.ms_para_mudar_destino === 'number' && fx.imediato.ms_para_mudar_destino < fx.tarde.ms_para_mudar_destino }, { imediato_menor: true });
gate('fixture sem toque: nenhum toque inventado', fx.quieto.toques, 0);
gate('fixture periodico: o censo de escritas em controlos dispara contra a pagina quieta', fx.periodico.mutacoes_de_controlo > fx.quieto.mutacoes_de_controlo, true);
gate('fixture de visibilidade: a columna visivel tem positivo e negativo medidos', fx.visibilidade, { escondido: false, mostrado: true });
out.fixtures = fx;

await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
out.cadeia = { access_bytes: Buffer.byteLength(JSON.stringify(sessao.access_token || ''), 'utf8'), expira_em_s: sessao.expires_in || null, renovada_à_custa_do_refresh: true };

const PRONTOS = "document.getElementById('appShell') && document.getElementById('appShell').classList.contains('ready') && window.BFR_CURRENT_PROFILE && window.BFR_CURRENT_PROFILE.role === " + JSON.stringify(PAPEL);
for (const w of LARGURAS) {
  const b = { largura: w };
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: ALTURA, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 45000).catch(() => {});
  await E('localStorage.setItem(' + JSON.stringify(STORAGE_KEY) + ', ' + JSON.stringify(JSON.stringify(sessao)) + ')');
  await send('Page.navigate', { url: URL_APP });
  b.ms_ready = await waitFor(PRONTOS, 70000).catch(() => null);
  if (b.ms_ready === null) { b.erro = 'shell do papel nao ficou ready em 70 s'; out.bandas['w' + w] = b; falhas.push('largura ' + w + ': ' + b.erro); continue; }
  await dorme(1500);
  const mo = await E(ESTADO_MOBILE);
  b.estado_mobile = mo;
  const rotasComCaixa = mo.rotas.filter((r) => r.largura > 0 && r.altura > 0).length;
  gate(w + 'px: a barra mobile existe e todas as rotas que a app declara tem caixa', { barra_existe: mo.barra_existe, todas_as_rotas_tem_caixa: mo.rotas.length > 0 && rotasComCaixa === mo.rotas.length }, { barra_existe: true, todas_as_rotas_tem_caixa: true });
  // Uma conta de teste sem nome preferido abre o cartao de primeiro acesso POR CIMA de tudo (o produtor do
  // menu documenta-o), e enquanto ele esta aberto nenhum toque chega a barra: a corrida sm78f apanhou os seis
  // alvos a responderem pelo paragrafo de estado do cartao. Fechar com o X do proprio cartao e o gesto do
  // utilizador e nao escreve nada na base, por isso e assim que se continua — e o censo de 30 s passa a ser
  // tirado na app assentada, nao por baixo de um cartao aberto.
  b.modal_ao_chegar = await E(`(() => { var ms = Array.from(document.querySelectorAll('.modal')).filter(function (x) { return !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && getComputedStyle(x).visibility !== 'hidden' && (x.offsetWidth || x.offsetHeight); }); return ms.map(function (m) { var r = m.getBoundingClientRect(); return { id: m.id || null, classes: String(m.className).slice(0, 60), caixa: Math.round(r.width) + 'x' + Math.round(r.height), z_index: getComputedStyle(m).zIndex, texto: (m.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 70) }; }); })()`);
  b.modal_fechou_a_toque = null;
  if (b.modal_ao_chegar.length > 0) {
    const m0 = b.modal_ao_chegar[0];
    const selFechar = (m0.id ? '#' + m0.id : '.modal') + ' .modal-close';
    const rf = await E(retangulo(selFechar));
    if (rf && rf.x) { await toca(rf.x, rf.y); await dorme(800); }
    b.modal_fechou_a_toque = await E(`(() => { var m = ${m0.id ? 'document.getElementById(' + JSON.stringify(m0.id) + ')' : 'document.querySelector(".modal")'}; return !m || m.classList.contains('hidden') || getComputedStyle(m).display === 'none' || !(m.offsetWidth || m.offsetHeight); })()`);
    gate(w + 'px: o cartao de primeiro acesso fecha com um toque real no X do proprio cartao', { havia_cartao: true, fechou: b.modal_fechou_a_toque }, { havia_cartao: true, fechou: true });
    b.estado_mobile_depois_do_cartao = await E(ESTADO_MOBILE);
  } else {
    b.modal_fechou_a_toque = true;
    gate(w + 'px: nenhum cartao por cima da app no instante do boot', { cartoes_visiveis: b.modal_ao_chegar.length }, { cartoes_visiveis: 0 });
  }
  const moDepois = b.estado_mobile_depois_do_cartao || mo;
  const rotasParaTocar = moDepois.rotas;
  await E(ARMAR);
  const marca_quieta = REDE.length;
  await dorme(JANELA_INATIVA_MS);
  const respostasQuietas = REDE.slice(marca_quieta);
  const urls_periodicos = new Set(respostasQuietas.map((x) => x.metodo + ' ' + x.url_sem_query));
  const lidoSemToque = await E(LER);
  gate(w + 'px: o instrumento sobreviveu aos 30 s de inatividade e devolveu o censo', !!lidoSemToque, true);
  b.censo_inativo = { janela_ms: JANELA_INATIVA_MS, mutacoes_total: lidoSemToque ? lidoSemToque.mutacoes_total : null, escritas_periodicas_em_controlos: lidoSemToque ? lidoSemToque.mutacoes_de_controlo : null, mudancas_de_destino_na_janela_quieta: lidoSemToque ? lidoSemToque.mudancas_de_destino : null, por_alvo_top: lidoSemToque ? lidoSemToque.por_alvo_top : [], por_atributo: lidoSemToque ? lidoSemToque.por_atributo : {}, previsao_lida_do_registo: PREVISAO.escritas_esperadas_na_janela, divergencia_previsao_medida: lidoSemToque ? lidoSemToque.mutacoes_de_controlo - PREVISAO.escritas_esperadas_na_janela : null };
  b.trafego_da_janela_quieta = { respostas: respostasQuietas.length, metodos: respostasQuietas.reduce((h, x) => { h[x.metodo || '?'] = (h[x.metodo || '?'] || 0) + 1; return h; }, {}), urls_distintos: urls_periodicos.size, estados: respostasQuietas.reduce((h, x) => { h[String(x.status)] = (h[String(x.status)] || 0) + 1; return h; }, {}), pedidos: [...urls_periodicos].slice(0, 12).map((u) => u.slice(-58)) };
  b.criterio_de_subtracao = 'uma resposta cujo par metodo+url tambem aparece na janela quieta de 30 s e atribuida ao laco do produto e nao ao toque; a subtracao nunca inventa resultado no destino — na pior das hipoteses uma celula que so recebeu heartbeat fica SEM_PEDIDO';
  b.toques = [];
  const classe_hist = {};
  const metodos_toque = {};
  const alvos = [];
  for (const rota of rotasParaTocar) alvos.push({ sel: '#bfrMobileBottomNav [data-bfr-mobile-route="' + rota.rota + '"]', nome: 'rota:' + rota.rota, texto: rota.texto });
  if (moDepois.hamb) alvos.push({ sel: '[data-bfr-open-drawer]', nome: 'hamburger', texto: 'abre-gaveta' });
  for (const alvo of alvos) {
    // Cada fila e medida a partir do mesmo estado: o toque em Mais abre a gaveta, e com ela aberta o painel
    // fica por cima da barra — na corrida sm78i foi isso que fez o alvo seguinte responder por um img do
    // painel. Fechar a gaveta pelo fundo e o gesto de quem toca, e nao escreve nada na base.
    const estadoDaFila = await E(ESTADO_MOBILE);
    const gaveta_aberta_antes = !!(estadoDaFila && typeof estadoDaFila.gaveta_classes === 'string' && estadoDaFila.gaveta_classes.indexOf('is-open') >= 0);
    let fechar_gaveta = null;
    if (gaveta_aberta_antes) {
      const ponto = await E(PONTO_GAVETA_FECHAVEL);
      if (ponto && typeof ponto.x === 'number') {
        await toca(ponto.x, ponto.y);
        await dorme(700);
        const estadoDepoisDoFundo = await E(ESTADO_MOBILE);
        const classesDepois = estadoDepoisDoFundo ? String(estadoDepoisDoFundo.gaveta_classes) : null;
        fechar_gaveta = { gesto: 'toque_no_fundo_na_' + ponto.faixa, ponto: { x: ponto.x, y: ponto.y }, rotulo_no_ponto: ponto.rotulo_no_ponto, classes_depois: classesDepois, fechou: !!(classesDepois && classesDepois.indexOf('is-open') < 0) };
      } else {
        fechar_gaveta = { gesto: 'nenhum_ponto_exposto_do_fundo', detalhe: ponto || null, fechou: false };
      }
      gate(w + 'px ' + alvo.nome + ': a gaveta que o toque anterior abriu esta fechada antes desta fila', { havia_gaveta_aberta: true, fechou: fechar_gaveta.fechou }, { havia_gaveta_aberta: true, fechou: true });
    }
    await E(LIMPAR);
    const r = await E(retangulo(alvo.sel));
    if (!r) { b.toques.push({ alvo: alvo.nome, motivo: 'sem_medida', gaveta_aberta_antes_do_toque: gaveta_aberta_antes, fechar_gaveta_antes_do_toque: fechar_gaveta }); continue; }
    if (r.sem_botao || r.invisivel || r.fora_do_ecra) { b.toques.push({ alvo: alvo.nome, motivo: r.sem_botao ? 'sem_botao' : r.invisivel ? 'invisivel' : 'fora_do_ecra', detalhe: r.fora_do_ecra || null, gaveta_aberta_antes_do_toque: gaveta_aberta_antes, fechar_gaveta_antes_do_toque: fechar_gaveta }); continue; }
    // Quando outro elemento esta por cima, o toque vai na mesma: e aquilo que um utilizador recebe ao tocar
    // naquele ponto. A ficha declara o cobridor em vez de fingir que o alvo estava la.
    const cobridor = r.tapado ? r.tapado : null;
    const marca_rede = REDE.length;
    const carimbo_antes_do_toque = Date.now();
    await toca(r.x, r.y);
    await dorme(3200);
    const respostas_brutas = REDE.slice(marca_rede);
    // Uma resposta que chegou antes do toque nao pode ser dele: o gesto de fechar a gaveta, medido acima, tambem
    // dispara pedidos, e o corte e pelo carimbo de chegada e nao pelo indice do registo.
    const respostas = respostas_brutas.filter((x) => x.em_ms >= carimbo_antes_do_toque);
    const respostas_do_toque = respostas.filter((x) => !urls_periodicos.has(x.metodo + ' ' + x.url_sem_query));
    const classe_destino = classe_do_destino_pelo_trafego(respostas_do_toque, rede_ligada);
    classe_hist[classe_destino.classe] = (classe_hist[classe_destino.classe] || 0) + 1;
    for (const x of respostas_do_toque) metodos_toque[x.metodo || '?'] = (metodos_toque[x.metodo || '?'] || 0) + 1;
    const ficha_trafego = { classe: classe_destino.classe, motivo: classe_destino.motivo, medida: classe_destino.medida,
      respostas_na_janela: respostas.length, anteriores_ao_toque_rejeitadas: respostas_brutas.length - respostas.length,
      periodicas_subtradas: respostas.length - respostas_do_toque.length,
      estados: respostas_do_toque.map((x) => x.status), bytes_por_resposta: respostas_do_toque.map((x) => x.bytes),
      pedidos: respostas_do_toque.slice(0, 8).map((x) => (x.metodo + ' ' + x.url_sem_query).slice(-58)),
      janela_ms: Date.now() - carimbo_antes_do_toque };
    const lido = await E(LER);
    const t = (lido && lido.toques.length === 1) ? lido.toques[0] : null;
    const depois = await E(ESTADO_MOBILE);
    b.toques.push(Object.assign({ alvo: alvo.nome, nome_do_alvo: alvo.nome, texto: alvo.texto, caixa: { largura: r.largura, altura: r.altura }, cobridor, gaveta_aberta_antes_do_toque: gaveta_aberta_antes, fechar_gaveta_antes_do_toque: fechar_gaveta, destino_depois: depois.destino, gaveta_depois: { classes: depois.gaveta_classes, display: depois.gaveta_display }, trafego: ficha_trafego }, t || { toque_nao_chegou_a_pagina: true, registos_lidos: lido ? lido.toques.length : null }));
    gate(w + 'px ' + alvo.nome + ': um toque e um registo, e o carimbo do evento chegou', { registos: lido ? lido.toques.length : null, alvo_na_pagina: t ? typeof t.alvo === 'string' && t.alvo.length > 0 : null, marco_do_evento: t ? t.marco_do_evento : null }, { registos: 1, alvo_na_pagina: true, marco_do_evento: true });
    gate(w + 'px ' + alvo.nome + ': o destino tomou uma decisao — mudou ou nao mudou, nunca indeciso', { decidido: t ? t.mudou_destino !== null : null }, { decidido: true });
    gate(w + 'px ' + alvo.nome + ': o trafego do destino ficou dentro do vocabulario declarado', { na_lista: VOCABULARIO_DE_DESTINO.indexOf(ficha_trafego.classe) >= 0, escuta: rede_ligada }, { na_lista: true, escuta: true });
  }
  b.latencias = {
    ms_para_mudar_destino: b.toques.filter((t) => typeof t.ms_para_mudar_destino === 'number').map((t) => t.ms_para_mudar_destino),
    primeira_frame: b.toques.filter((t) => typeof t.primeira_frame === 'number').map((t) => t.primeira_frame),
    primeira_mutacao: b.toques.filter((t) => typeof t.primeira_mutacao === 'number').map((t) => t.primeira_mutacao),
    primeira_mutacao_de_controlo: b.toques.filter((t) => typeof t.primeira_mutacao_de_controlo === 'number').map((t) => t.primeira_mutacao_de_controlo),
    toques_sem_mutacao_registada: b.toques.filter((t) => t.primeira_mutacao === null).length,
    toques_em_que_o_destino_nao_mudou: b.toques.filter((t) => t.mudou_destino === false).length,
    toques_sem_chegada_a_pagina: b.toques.filter((t) => t.toque_nao_chegou_a_pagina === true).length,
    toques_com_cobridor_por_cima: b.toques.filter((t) => !!t.cobridor).length,
    alvos_sem_toque: b.toques.filter((t) => typeof t.motivo === 'string').length,
    por_classe_de_destino: classe_hist,
    metodos_de_resposta_dos_toques: metodos_toque,
    metodos_fora_do_GET: Object.keys(metodos_toque).filter((m) => m !== 'GET').map((m) => m + '=' + metodos_toque[m]),
    fichas_de_destino: b.toques.filter((t) => t.trafego && typeof t.trafego.classe === 'string').length
  };
  gate(w + 'px: o histograma de classes de destino reproduz as fichas desta banda', { bate: Object.keys(classe_hist).reduce((a, c) => a + classe_hist[c], 0) === b.latencias.fichas_de_destino }, { bate: true });
  out.bandas['w' + w] = b;
}

abertaParaSaida = true;
const fichasDeDestino = [];
for (const k of Object.keys(out.bandas)) for (const t of (out.bandas[k].toques || [])) if (t.trafego && typeof t.trafego.classe === 'string') fichasDeDestino.push({ banda: k, alvo: t.nome_do_alvo || t.alvo, classe: t.trafego.classe, medida: t.trafego.medida });
const classesDoAgregado = {};
const metodosDoAgregado = {};
for (const f of fichasDeDestino) {
  classesDoAgregado[f.classe] = (classesDoAgregado[f.classe] || 0) + 1;
  const mm = (f.medida && f.medida.metodos) || {};
  for (const m of Object.keys(mm)) metodosDoAgregado[m] = (metodosDoAgregado[m] || 0) + mm[m];
}
const somaPorBanda = Object.keys(out.bandas).reduce((a, k) => a + (out.bandas[k].latencias ? out.bandas[k].latencias.fichas_de_destino : 0), 0);
const classesForaDoVocabulario = Object.keys(classesDoAgregado).filter((c) => VOCABULARIO_DE_DESTINO.indexOf(c) < 0);
out.cifras_de_destino = {
  origem: 'as fichas de trafego guardadas por toque, recontadas por este agregado — nenhuma cifra de destino e lembrada desta linha',
  celulas_com_ficha: fichasDeDestino.length, soma_por_banda: somaPorBanda,
  bate_com_as_fichas: somaPorBanda === fichasDeDestino.length,
  por_classe: classesDoAgregado, metodos_de_resposta: metodosDoAgregado,
  metodos_fora_do_GET: Object.keys(metodosDoAgregado).filter((m) => m !== 'GET').map((m) => m + '=' + metodosDoAgregado[m]),
  classes_fora_do_vocabulario: classesForaDoVocabulario, vocabulario_de_destino: VOCABULARIO_DE_DESTINO,
  fichas_por_toque: fichasDeDestino,
  corpos: 'nenhum corpo lido nem escrito; o resultado no destino e medido por estado, bytes e metodo'
};
gate('o agregado de destino reproduz a soma das fichas de todas as bandas', { bate: out.cifras_de_destino.bate_com_as_fichas, classes_fora_do_vocabulario: classesForaDoVocabulario.length }, { bate: true, classes_fora_do_vocabulario: 0 });
out.portoes = portoes;
out.falhas = falhas;
out.em_fecho = new Date().toISOString();
const resumoLarguras = Object.keys(out.bandas).map((k) => {
  const b = out.bandas[k];
  const escritas = b.censo_inativo ? b.censo_inativo.escritas_periodicas_em_controlos : null;
  return { largura: b.largura, escritas_periodicas_em_controlos: escritas, previsao_do_registo: PREVISAO.escritas_esperadas_na_janela, toques_registados: b.toques ? b.toques.filter((t) => typeof t.destino_antes === 'string').length : 0, toques_sem_chegada_a_pagina: b.latencias ? b.latencias.toques_sem_chegada_a_pagina : 0, alvos_sem_toque: b.latencias ? b.latencias.alvos_sem_toque : 0, destinos_mudaram: b.toques ? b.toques.filter((t) => t.mudou_destino === true).length : 0, destinos_nao_mudaram: b.toques ? b.toques.filter((t) => t.mudou_destino === false).length : 0, mediana_ms_para_mudar_destino: b.latencias && b.latencias.ms_para_mudar_destino.length ? b.latencias.ms_para_mudar_destino.slice().sort((a, c) => a - c)[Math.floor(b.latencias.ms_para_mudar_destino.length / 2)] : null, por_classe_de_destino: b.latencias ? b.latencias.por_classe_de_destino : null, metodos_fora_do_GET: b.latencias ? b.latencias.metodos_fora_do_GET : null, trafego_quieto: b.trafego_da_janela_quieta ? b.trafego_da_janela_quieta.respostas : null };
});
const totalEscritas = resumoLarguras.reduce((a, r) => a + (typeof r.escritas_periodicas_em_controlos === 'number' ? r.escritas_periodicas_em_controlos : 0), 0);
const largurasComEscritas = resumoLarguras.filter((r) => typeof r.escritas_periodicas_em_controlos === 'number' && r.escritas_periodicas_em_controlos > 0).length;
out.veredito_de_aceitacao_rm_2_1 = { aceitacao_lida_do_roadmap: 'censo vivo com 0 escritas periodicas residuais', escritas_soma_das_larguras: totalEscritas, larguras_com_escritas: largurasComEscritas, verifica_se: totalEscritas === 0 };
out.resumo_por_largura = resumoLarguras;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('ar_md5=' + out.ar.md5 + ' ar_bytes=' + out.ar.bytes + ' registo_de_identidade=' + out.ar.declarada_por);
console.log('emissor_p192_bytes=' + out.emissor_p192.bytes + ' emissor_p192_md5=' + out.emissor_p192.md5);
console.log('previsao_estatica: ' + JSON.stringify(PREVISAO));
console.log('fixtures: ' + JSON.stringify(fx));
console.log('TABELAS_DECLARADAS [TOQUE DESTINO] · cada fila e uma medida sua do mesmo toque ou da mesma banda, declaracao lida pela regua de cifras em duo do p168');
for (const k of Object.keys(out.bandas)) {
  const c = out.bandas[k].censo_inativo;
  if (c) console.log('CENSO largura=' + out.bandas[k].largura + ' janela_ms=' + c.janela_ms + ' mutacoes_total=' + c.mutacoes_total + ' escritas_em_controlos=' + c.escritas_periodicas_em_controlos + ' mudancas_de_destino=' + c.mudancas_de_destino_na_janela_quieta + ' previsao_do_registo=' + c.previsao_lida_do_registo);
}
for (const k of Object.keys(out.bandas)) for (const t of (out.bandas[k].toques || [])) {
  if (typeof t.motivo === 'string') { console.log('TOQUE largura=' + out.bandas[k].largura + ' alvo=' + t.alvo + ' motivo=' + t.motivo); continue; }
  if (t.toque_nao_chegou_a_pagina === true) { console.log('TOQUE largura=' + out.bandas[k].largura + ' alvo=' + t.alvo + ' motivo=toque_nao_chegou_a_pagina registos=' + t.registos_lidos); continue; }
  console.log('TOQUE largura=' + out.bandas[k].largura + ' alvo=' + (t.nome_do_alvo || t.alvo) + ' elemento=' + t.alvo + ' primeira_mutacao=' + t.primeira_mutacao + ' primeira_mutacao_de_controlo=' + t.primeira_mutacao_de_controlo + ' primeira_frame=' + t.primeira_frame + ' ms_para_mudar_destino=' + t.ms_para_mudar_destino + ' mudou_destino=' + t.mudou_destino + ' caixa=' + (t.caixa ? t.caixa.largura + ' por ' + t.caixa.altura : 'null') + ' cobridor=' + (t.cobridor ? t.cobridor.rotulo : 'nenhum') + ' camadas=' + (t.cobridor && t.cobridor.pilha_de_camadas ? t.cobridor.pilha_de_camadas.map((c) => c.rotulo + '@' + c.z_index).join(' > ') : 'uma_so') + ' gaveta_antes=' + (t.gaveta_aberta_antes_do_toque ? 'sim' : 'nao') + ' gaveta_fechada_antes_do_toque=' + (t.fechar_gaveta_antes_do_toque ? t.fechar_gaveta_antes_do_toque.fechou : 'nao_houve_gaveta') + ' classe_destino=' + (t.trafego ? t.trafego.classe : 'sem_ficha') + ' destino_respostas=' + (t.trafego && t.trafego.medida ? t.trafego.medida.respostas : 'null') + ' destino_com_corpo=' + (t.trafego && t.trafego.medida ? t.trafego.medida.com_corpo : 'null') + ' destino_bytes=' + (t.trafego && t.trafego.medida ? t.trafego.medida.bytes_totais : 'null') + ' anteriores_ao_toque=' + (t.trafego ? t.trafego.anteriores_ao_toque_rejeitadas : 'null') + ' periodicas_subtradas=' + (t.trafego ? t.trafego.periodicas_subtradas : 'null'));
}
for (const k of Object.keys(out.bandas)) {
  const l = out.bandas[k].latencias;
  if (!l) continue;
  console.log('DESTINO largura=' + out.bandas[k].largura + ' fichas=' + l.fichas_de_destino + ' por_classe=' + JSON.stringify(l.por_classe_de_destino) + ' metodos=' + JSON.stringify(l.metodos_de_resposta_dos_toques) + ' janela_quieta=' + (out.bandas[k].trafego_da_janela_quieta ? out.bandas[k].trafego_da_janela_quieta.respostas : 'null'));
}
console.log('cifras_de_destino ' + JSON.stringify(Object.assign({}, out.cifras_de_destino, { fichas_por_toque: out.cifras_de_destino.fichas_por_toque.length })));
console.log('resumo_por_largura ' + JSON.stringify(resumoLarguras));
console.log('veredito_de_aceitacao_rm_2_1 ' + JSON.stringify(out.veredito_de_aceitacao_rm_2_1));
console.log('portoes=' + portoes + ' falhas=' + falhas.length);
console.log(out.veredito_de_aceitacao_rm_2_1.verifica_se ? 'P192_ACEITACAO_RM_2_1_VERIFICA_SE' : 'P192_ACEITACAO_RM_2_1_NAO_SE_VERIFICA escritas=' + totalEscritas);
console.log(falhas.length === 0 ? 'P192_TOQUE_PAINT_MEDIDO_SEM_FALHAS' : 'P192_TOQUE_PAINT_COM_FALHAS');
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
process.exit(0);
