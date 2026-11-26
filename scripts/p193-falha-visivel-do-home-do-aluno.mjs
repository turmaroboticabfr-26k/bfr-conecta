// PEN-04 — «Home do aluno: falha silenciosa»: medir se uma falha de carga chega ao ecra de um aluno ou não.
//
// Porque esta peça existe: a célula PEN-04 ficou com uma pergunta em aberto — os dois carregadores que falam com
// o aluno põem estado de erro nos bytes servidos, mas «pôr estado.error» não é «o utilizador vê o erro». Este
// instrumento responde no browser, com cadeia viva de aluno, e responde por observação e não por leitura de código:
// cada célula monta o documento com uma falha sintética armada sobre UMA tabela, entra na área como um utilizador
// (toque no botão da área, com o cartão de primeiro acesso fechado antes), e mede o que ficou visível.
//
// Como a falha é armada: o patch instala-se com Page.addScriptToEvaluateOnNewDocument, antes de qualquer script da
// página, e envolve window.fetch. O modo vivo lê-se de sessionStorage a cada pedido, por isso uma recarga a frio
// chega ao documento já com a falha activa no primeiro pedido. Uma falha sintética é sempre um GET respondido com
// 503 JSON: nunca POST, nunca PUT, nunca DELETE — o instrumento não escreve em lado nenhum, nem no banco, nem na
// app, nem noutra ficha que não a sua.
//
// O que é «visível»: cada nó devolvido traz caixa (largura x altura), offsetParent, display, visibility, opacity,
// pointer-events e a nota de alcançabilidade por toque (o ponto central tem o próprio nó por cima). Uma mensagem
// dentro de uma caixa 0x0 não é vista por ninguém, e é justamente a classe de defeito que já apanhei noutro papel.
//
// O degrau de recuperação vive DENTRO da célula: se a própria célula desenhou o botão de repetir alcançável a
// toque, desarmo a falha nesse documento, toco no botão do produto e leio de novo o mesmo documento. Correr o
// degrau depois do ciclo de células mediria um ecrã que já não é o da falha — foi o vermelho que apanhei na
// primeira versão desta peça.
//
// O que NÃO é provado por esta peça, declarado no artefacto: o conteúdo das listas de alunos não é capturado
// (regra anti-PII do briefing) — das regiões guardo bytes, contagem de elementos, um hash djb2 do texto e as
// chaves do vocabulário do produto que lá aparecem, nunca o texto; nas superfícies de erro guardo o texto só
// quando ele casa com uma mensagem do produto lida dos bytes servidos, e caso contrário fica o hash e a label
// `fora_do_vocabulario_do_produto`.
//
// Uso: node scripts/p193-falha-visivel-do-home-do-aluno.mjs [papel] [rotulo] [largura] [altura]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = DIR + '/bfr-conecta';
const EV = REPO + '/evidence';
const PAPEL = process.argv[2] || 'student';
const ROTULO = process.argv[3] || 'sm79a';
const LARGURA = parseInt(process.argv[4] || '1280', 10);
const ALTURA = parseInt(process.argv[5] || '900', 10);
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = 'https://' + REF + '.supabase.co';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = 'sb-' + REF + '-auth-token';
const PORT = parseInt(process.env.P193_PORT || '9393', 10);
const ESPERA_MS = parseInt(process.env.P193_ESPERA_MS || '5000', 10);
const TETO = parseInt(process.env.P193_TETO_MS || '540000', 10);
const FAM_AR = 'ah2-sonda-portas-por-papel-';
const SERVIDO_LOCAL = REPO + '/bfr-candidata-v144c-uniesco/index.html';
const OUT = EV + '/p193-falha-visivel-do-home-do-aluno-' + ROTULO + '.json';
const PERFIL = DIR + '/.p193-' + ROTULO + '-' + PORT;
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const PECA = 'scripts/p193-falha-visivel-do-home-do-aluno.mjs';
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' já existe com ' + statSync(OUT).size + ' bytes — rode com rótulo novo');
if (!['student', 'parent'].includes(PAPEL)) throw new Error('ABORTA: esta peça só foi desenhada para os papéis com área de espaço do aluno, veio ' + PAPEL);
if (!(LARGURA >= 320 && LARGURA <= 1920 && ALTURA >= 400 && ALTURA <= 1200)) throw new Error('ABORTA: banda ilógica ' + LARGURA + 'x' + ALTURA);

const out = {
  peca: PECA, emissor: { caminho: PECA, bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') },
  em: new Date().toISOString(), ciclo: ROTULO, papel: PAPEL, largura: LARGURA, altura: ALTURA, espera_ms: ESPERA_MS,
  ar: {}, alvos: {}, celulas: {}, definicoes: {},
};
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => { portoes++; const ok = JSON.stringify(dado) === JSON.stringify(esperado); if (!ok) falhas.push(nome + ' | dado=' + JSON.stringify(dado) + ' | esperado=' + JSON.stringify(esperado)); console.log((ok ? 'VERDE ' : 'VERMELHO ') + nome + ' :: ' + JSON.stringify(dado).slice(0, 190)); return ok; };

function escolhe_mais_novo(lista) {
  if (!lista.length) throw new Error('ABORTA: zero registos elegíveis — a identidade do ar não pode ser lembrada');
  const o = lista.slice().sort((a, b) => b.ms - a.ms);
  const emp = o.filter((c) => c.ms === o[0].ms).map((c) => c.n);
  if (emp.length > 1) throw new Error('ABORTA: empate no registo mais novo (' + emp.join(', ') + ') — não se adivinha');
  return o[0];
}
{
  const fx = escolhe_mais_novo([{ n: 'a', ms: 1 }, { n: 'b', ms: 2 }]);
  let emp = null, vaz = null;
  try { escolhe_mais_novo([{ n: 'a', ms: 5 }, { n: 'b', ms: 5 }]); } catch (e) { emp = true; }
  try { escolhe_mais_novo([]); } catch (e) { vaz = true; }
  if (fx.n !== 'b' || emp !== true || vaz !== true) throw new Error('ABORTA: a escolha do registo mais novo não tem os três casos provados');
}

// A regra da falha sintética vive AQUI e é transcrita para a página em texto; os dois lados têm de concordar,
// por isso o fixture corre esta função e o texto injectado é comparado com ela célula a célula (`bate_com_a_regua`).
function deve_falhar(url, metodo, modo) {
  if (!modo || modo === 'controle') return false;
  if (String(metodo || 'GET').toUpperCase() !== 'GET') return false;
  return String(url).indexOf(modo) >= 0;
}
const FIX_FALHA = [
  { url: HOST + '/rest/v1/guardian_students?select=x', metodo: 'GET', modo: 'rest/v1/guardian_students', esperado: true },
  { url: HOST + '/rest/v1/guardian_students?select=x', metodo: 'GET', modo: 'rest/v1/students', esperado: false },
  { url: HOST + '/rest/v1/students?id=eq.1', metodo: 'POST', modo: 'rest/v1/students', esperado: false },
  { url: HOST + '/auth/v1/token?grant_type=refresh_token', metodo: 'POST', modo: 'auth/v1/token', esperado: false },
  { url: HOST + '/rest/v1/students?id=eq.1', metodo: 'DELETE', modo: 'rest/v1/students', esperado: false },
  { url: HOST + '/rest/v1/students?id=eq.1', metodo: 'GET', modo: 'controle', esperado: false },
  { url: HOST + '/rest/v1/students?id=eq.1', metodo: 'GET', modo: '', esperado: false },
].map((f) => ({ caso: f.metodo + ' ' + (f.modo || 'sem_modo'), medido: deve_falhar(f.url, f.metodo, f.modo), esperado: f.esperado, bate: deve_falhar(f.url, f.metodo, f.modo) === f.esperado }));

const compila_corpo = (c) => { try { new vm.Script('(function () {' + String(c) + '})'); return true; } catch (e) { return false; } };
const corpo_de_proposito_partido = '(function () { var a = 1; return { x: a';

// — ar: medido, conferido com o registo mais novo da família do mapa e com os bytes locais de onde leio as agulhas
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const AR = { bytes: Buffer.byteLength(shellTxt, 'utf8'), md5: createHash('md5').update(shellTxt).digest('hex') };
const elegiveis = [];
for (const n of readdirSync(EV).filter((x) => x.startsWith(FAM_AR) && x.endsWith('.json'))) {
  let j; try { j = JSON.parse(readFileSync(EV + '/' + n, 'utf8')); } catch { continue; }
  if (typeof j.em === 'string' && typeof j.md5_shell === 'string' && !Number.isNaN(Date.parse(j.em))) elegiveis.push({ n, ms: Date.parse(j.em), md5: j.md5_shell });
}
const maisNovo = escolhe_mais_novo(elegiveis);
if (maisNovo.md5 !== AR.md5) throw new Error('ABORTA: o ar medido agora (md5 ' + AR.md5 + ') não bate com o declarado pelo registo mais novo da família (' + maisNovo.n + ', md5 ' + maisNovo.md5 + ')');
const LOCAL = readFileSync(SERVIDO_LOCAL, 'utf8');
const LOCAL_MD5 = createHash('md5').update(LOCAL, 'utf8').digest('hex');
if (LOCAL_MD5 !== AR.md5) throw new Error('ABORTA: os bytes de onde leio as mensagens do produto (' + SERVIDO_LOCAL + ', md5 ' + LOCAL_MD5 + ') não são o ar (' + AR.md5 + ') — as agulhas seriam de outra versão');
out.ar = { url: URL_APP, bytes: AR.bytes, md5: AR.md5, declarado_por: maisNovo.n, bytes_locais: Buffer.byteLength(LOCAL, 'utf8'), md5_local: LOCAL_MD5, bate_com_o_registo_mais_novo: true, bate_com_os_bytes_locais: true };

// — agulhas do produto: selector e mensagem lidos dos bytes servidos, com a linha declarante marcada
const SEL = { //AGULHA-DECLARADA
  espaco_erro: '.bfr-student-error', espaco_refresh: '[data-student-refresh]',
  aprender_alerta_host: '[data-results-alert]', aprender_alerta: '.bfr-results-alert', aprender_pill: '.bfr-results-pill',
  regiao_espaco: '#platformSpaceView', regiao_aprender: '#platformLearnView', regiao_home: '#appShell .content:not(.hidden)',
  nav_espaco: '[data-platform-area="meu-espaco"]', nav_aprender: '[data-platform-area="aprender"]', nav_inicio: '[data-platform-area="inicio"]',
}; //AGULHA-DECLARADA
const MSG = { //AGULHA-DECLARADA
  espaco_vinculo: 'Não foi possível verificar seu vínculo escolar.',
  espaco_cadastro: 'O cadastro do aluno não está disponível neste momento.',
  espaco_atualizar: 'Não foi possível atualizar seu espaço agora.',
  espaco_parcial: 'Alguns blocos não puderam ser atualizados. Os demais dados continuam disponíveis.',
  espaco_sem_vinculo: 'Ainda não encontramos um aluno vinculado a esta conta.',
  espaco_carregando: 'Carregando seus dados escolares com segurança.',
  espaco_painel_pendente: 'Seu painel pessoal ficará disponível assim que a escola concluir o vínculo do seu cadastro.',
  espaco_sem_vinculo_fala: 'Ainda não encontramos um aluno vinculado a esta conta. Fale com a secretaria para conferir seu cadastro.',
  aprender_vinculo: 'Não foi possível confirmar o vínculo escolar.',
  aprender_cadastro: 'O cadastro do estudante não pôde ser carregado.',
  aprender_turma: 'A turma do estudante não pôde ser carregada.',
  aprender_oficiais: 'Alguns registros oficiais ainda não estão disponíveis.',
  aprender_geral: 'Alguns dados não puderam ser carregados. A tela não inventa números',
  pill_faltando: 'com dados faltando', pill_carregados: 'dados carregados', pill_atualizando: 'atualizando',
  botao_repetir: 'Tentar novamente',
}; //AGULHA-DECLARADA
const ausentes = [];
function agulhas_ausentes(pairs, txt) { const omissas = []; for (const [k, v] of pairs) if (v && txt.indexOf(v) < 0) omissas.push(k); return omissas; }
const SEL_AUSENTES = agulhas_ausentes(Object.entries(SEL).filter(([k]) => !(k.startsWith('regiao_') || k.startsWith('nav_'))), LOCAL);
const MSG_AUSENTES = agulhas_ausentes(Object.entries(MSG), LOCAL);
if (SEL_AUSENTES.length || MSG_AUSENTES.length) throw new Error('ABORTA: as agulhas não estão nos bytes servidos de onde disse lê-las: ' + SEL_AUSENTES.concat(MSG_AUSENTES).slice(0, 6).join(' · '));
const FIX_AGULHAS = [
  { rotulo: 'agulha_que_existe', lista: [['x', SEL.espaco_erro]], txt: LOCAL, esperado: 0 },
  { rotulo: 'agulha_fabricada_dispara', lista: [['x', SEL.espaco_erro], ['y', 'bfr-selector-que-a-app-nao-tem-p193']], txt: LOCAL, esperado: 1 },
  { rotulo: 'texto_vazio_nao_casa', lista: [['vazio', '']], txt: LOCAL, esperado: 0 },
].map((f) => ({ rotulo: f.rotulo, medido: agulhas_ausentes(f.lista, f.txt).length, bate: agulhas_ausentes(f.lista, f.txt).length === f.esperado }));
const CONTADORAS = (txt, s) => txt.split(s).length - 1;
out.alvos = { selectors: SEL, mensagens: MSG, contagens_nos_bytes_servidos: Object.fromEntries(Object.entries(MSG).map(([k, v]) => [k, CONTADORAS(LOCAL, v)])) };
// Os ids das duas regiões do aluno não são dactilografados por mim: vêm do mapa `views={...}` dos bytes servidos,
// e o `SEL` acima é confrontado com ele. Se a app mudar o id, esta vara fica vermelha em vez de eu procurar outro.
const VIEWS_MAP = (LOCAL.match(/views=\{([^}]*)\}/) || [])[1];
if (!VIEWS_MAP) throw new Error('ABORTA: o mapa views={...} não foi lido dos bytes servidos — a região de cada área teria de ser lembrada');
const MAPA_VIEWS = {};
for (const m of VIEWS_MAP.matchAll(/'?([a-z-]+)'?\s*:\s*'([A-Za-z]+)'/g)) MAPA_VIEWS[m[1]] = m[2];
if (!MAPA_VIEWS['meu-espaco'] || !MAPA_VIEWS.aprender) throw new Error('ABORTA: o mapa views lido dos bytes não traz as duas áreas do aluno: ' + JSON.stringify(MAPA_VIEWS));
const FIX_MAPA_VIEWS = [
  { rotulo: 'id_verdadeiro_casa', lido: '#' + MAPA_VIEWS['meu-espaco'], esperado: true },
  { rotulo: 'id_fabricado_nao_casa', lido: '#platformSpaceViewEscritaPorMim', esperado: false },
].map((f) => ({ rotulo: f.rotulo, medido: f.lido === SEL.regiao_espaco, bate: (f.lido === SEL.regiao_espaco) === f.esperado }));
const MSG_LISTA = Object.entries(MSG).map(([k, v]) => ({ chave: k, texto: v }));
function classifica_mensagem(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!t) return { conhecida: null, casa: false };
  const hits = MSG_LISTA.filter((m) => t.indexOf(m.texto.replace(/\s+/g, ' ').trim()) >= 0 || m.texto.replace(/\s+/g, ' ').trim().indexOf(t) >= 0);
  if (!hits.length) return { conhecida: 'fora_do_vocabulario_do_produto', casa: false };
  const melhor = hits.sort((a, b) => b.texto.length - a.texto.length)[0];
  return { conhecida: melhor.chave, casa: true };
}
const FORA = 'fora_do_vocabulario_do_produto';
const FIX_MSG = [
  { rotulo: 'mensagem_do_produto', texto: 'Não foi possível verificar seu vínculo escolar.', deve_casar: true, espera_nome: 'espaco_vinculo' },
  { rotulo: 'mensagem_do_produto_dentro_de_frase_maior', texto: 'Erro: Alguns blocos não puderam ser atualizados. Os demais dados continuam disponíveis. (código 7)', deve_casar: true, espera_nome: 'espaco_parcial' },
  { rotulo: 'nome_de_aluno_nao_casa', texto: 'Ana Beatriz Souza Lima 42', deve_casar: false, espera_nome: FORA },
  { rotulo: 'uuid_de_linha_nao_casa', texto: '3f1c0a2b-77d2-4bc1-9d11-000000000000', deve_casar: false, espera_nome: FORA },
  { rotulo: 'vazio_nao_casa', texto: '   ', deve_casar: false, espera_nome: null },
].map((f) => { const m = classifica_mensagem(f.texto); return { rotulo: f.rotulo, medido: { casa: m.casa, conhecida: m.conhecida }, bate: m.casa === f.deve_casar && (m.conhecida || null) === f.espera_nome }; });

// Uma tabela alvo pode ter sido pedida por GET (e então a minha falha sintética alcança-a) ou só por POST
// (e então não alcança: falhar um POST seria escrever no banco, e isso não está no escopo). São duas classes
// legítimas e cada uma tem o seu predicado — dobrá-las dava vermelho onde nada havia a medir.
function alvo_da_tabela(tabelas, modo) {
  const t = (tabelas || {})[modo] || { total: 0, get: 0, post: 0 };
  return { pedida: t.total > 0, por_get: t.get > 0, so_por_post: t.total > 0 && t.get === 0, get: t.get, post: t.post };
}
const FIX_ALVO = [
  { rotulo: 'get_pedido_casa', t: { 'rest/v1/students': { total: 3, get: 3, post: 0 } }, modo: 'rest/v1/students', esperado: { pedida: true, por_get: true, so_por_post: false } },
  { rotulo: 'so_post_e_classe_a_parte', t: { 'rest/v1/rpc': { total: 5, get: 0, post: 5 } }, modo: 'rest/v1/rpc', esperado: { pedida: true, por_get: false, so_por_post: true } },
  { rotulo: 'tabela_nao_pedida_nao_casa', t: { 'rest/v1/students': { total: 1, get: 1, post: 0 } }, modo: 'rest/v1/grades', esperado: { pedida: false, por_get: false, so_por_post: false } },
].map((f) => { const a = alvo_da_tabela(f.t, f.modo); const m = { pedida: a.pedida, por_get: a.por_get, so_por_post: a.so_por_post }; return { rotulo: f.rotulo, medido: m, bate: JSON.stringify(m) === JSON.stringify(f.esperado) }; });

// — corpos injectados (texto puro, sem backticks, compilados antes de gastar um boot)
const PATCH = '(function () {' +
  ' if (window.__p193_armado) return { ja_armado: true, pedidos: window.__p193_pedidos.length };' +
  ' window.__p193_armado = true; window.__p193_pedidos = []; window.__p193_falhas_servidas = 0; window.__p193_falhas_por_modo = {};' +
  ' var f = window.fetch;' +
  ' if (!f) return { sem_fetch_global: true };' +
  ' window.fetch = function (input, init) {' +
  '   var url = typeof input === "string" ? input : (input && input.url ? String(input.url) : String(input));' +
  '   var metodo = (init && init.method) || (input && input.method) || "GET";' +
  '   metodo = String(metodo).toUpperCase();' +
  '   var modo = ""; try { modo = sessionStorage.getItem("p193_modo") || ""; } catch (e) { modo = ""; }' +
  '   var falha = !!(modo && modo !== "controle" && metodo === "GET" && url.indexOf(modo) >= 0);' +
  '   var sem_query = url.replace(/^https?:\\/\\/[^\\/]+/, ""); var i = sem_query.indexOf("?");' +
  '   var caminho = i < 0 ? sem_query : sem_query.slice(0, i);' +
  '   if (window.__p193_pedidos.length < 6000) window.__p193_pedidos.push({ caminho: caminho.slice(0, 120), com_query: i >= 0, query_bytes: i < 0 ? 0 : sem_query.length - i - 1, metodo: metodo, falha: falha, em_ms: Math.round(performance.now()) });' +
  '   if (falha) {' +
  '     window.__p193_falhas_servidas++; window.__p193_falhas_por_modo[modo] = (window.__p193_falhas_por_modo[modo] || 0) + 1;' +
  '     return Promise.resolve(new Response(JSON.stringify({ message: "servico indisponivel para a medicao p193", code: "P193_FALTA_SIMULADA", hint: "", details: "" }), { status: 503, headers: { "Content-Type": "application/json" } }));' +
  '   }' +
  '   return f.apply(window, arguments);' +
  ' };' +
  ' return { armado: true };' +
  '})()';

const PEDIDOS = '(function () {' +
  ' var p = window.__p193_pedidos || []; var por = {}; var resto = 0;' +
  ' for (var i = 0; i < p.length; i++) {' +
  '   var c = p[i].caminho || ""; var m = c.match(/^\\/rest\\/v1\\/([a-z_]+)/);' +
  '   if (m) { var k = "rest/v1/" + m[1]; if (!por[k]) por[k] = { total: 0, get: 0, post: 0 }; por[k].total++; if (p[i].metodo === "GET") por[k].get++; else por[k].post++; } else resto++;' +
  ' }' +
  ' return { total: p.length, fora_do_rest: resto, tabelas: por, falhas_servidas: (window.__p193_falhas_servidas || 0), falhas_por_modo: (window.__p193_falhas_por_modo || {}), armado: !!window.__p193_armado };' +
  '})()';

const SUPERFICIES = '(function (alvos, mensagens) {' +
  ' function djb2(s) { var h = 5381; for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; } return ("0000000" + h.toString(16)).slice(-8); }' +
  ' function norm(s) { return String(s || "").replace(/\\s+/g, " ").trim(); }' +
  ' function estado(no) {' +
  '   var cs = getComputedStyle(no); var r = no.getBoundingClientRect();' +
  '   var w = Math.round(r.width), hgt = Math.round(r.height);' +
  '   var oculto = (!no.offsetParent && getComputedStyle(no).position !== "fixed") || cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0 || (w === 0 && hgt === 0);' +
  '   var x = Math.round(r.left + w / 2), y = Math.round(r.top + hgt / 2);' +
  '   var topo = (w > 0 && hgt > 0 && x >= 0 && y >= 0 && x <= document.documentElement.clientWidth && y <= document.documentElement.clientHeight) ? document.elementFromPoint(x, y) : null;' +
  '   var alcancavel = !!topo && (topo === no || no.contains(topo));' +
  '   return { caixa: w + "x" + hgt, largura: w, altura: hgt, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointer_events: cs.pointerEvents, offset_parent: !!no.offsetParent, aria_live: no.getAttribute("aria-live") || null, papel_aria: no.getAttribute("role") || null, visivel: !oculto, texto_bytes: new TextEncoder().encode(norm(no.innerText || no.textContent || "")).length, texto_hash: djb2(norm(no.innerText || no.textContent || "")), texto_vazio: norm(no.innerText || no.textContent || "") === "", tocavel: alcancavel, ponto_fora_ou_tapado: alcancavel ? null : (x < 0 || y < 0 || x > document.documentElement.clientWidth || y > document.documentElement.clientHeight ? "fora_da_janela" : "por_cima_esta_outra_coisa") };' +
  ' }' +
  ' function casada(t) {' +
  '   var s = norm(t); if (!s) return null;' +
  '   var melhor = null;' +
  '   for (var i = 0; i < mensagens.length; i++) {' +
  '     var m = norm(mensagens[i].texto);' +
  '     if (s.indexOf(m) >= 0 || m.indexOf(s) >= 0) { if (!melhor || mensagens[i].texto.length > melhor.texto.length) melhor = mensagens[i]; }' +
  '   }' +
  '   return melhor ? melhor.chave : "fora_do_vocabulario_do_produto";' +
  ' }' +
  ' var fora = [];' +
  ' for (var a = 0; a < alvos.length; a++) {' +
  '   var alvo = alvos[a]; var nos = []; try { nos = Array.prototype.slice.call(document.querySelectorAll(alvo.sel)); } catch (e) { fora.push({ nome: alvo.nome, erro_no_selector: true }); continue; }' +
  '   var medidos = nos.slice(0, 4).map(function (no) { var m = estado(no); m.mensagem_conhecida = casada(norm(no.innerText || no.textContent || "")); return m; });' +
  '   var visiveis = medidos.filter(function (m) { return m.visivel; }).length;' +
  '   var zero_caixa = medidos.filter(function (m) { return m.largura === 0 && m.altura === 0; }).length;' +
  '   fora.push({ nome: alvo.nome, selector: alvo.sel, nos: nos.length, visiveis: visiveis, zero_caixa: zero_caixa, medidos: medidos });' +
  ' }' +
  ' return fora;' +
  '})(' + JSON.stringify([
    { nome: 'espaco_erro', sel: SEL.espaco_erro },
    { nome: 'espaco_botao_repetir', sel: SEL.espaco_refresh },
    { nome: 'aprender_alerta', sel: SEL.aprender_alerta },
    { nome: 'aprender_pill', sel: SEL.aprender_pill },
  ]) + ',' + JSON.stringify(MSG_LISTA) + ')';

const REGIOES = '(function (regioes, mensagens) {' +
  ' function djb2(s) { var h = 5381; for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; } return ("0000000" + h.toString(16)).slice(-8); }' +
  ' function norm(s) { return String(s || "").replace(/\\s+/g, " ").trim(); }' +
  ' function achadas(t) { var s = norm(t); var sim = []; if (!s) return sim; for (var j = 0; j < mensagens.length; j++) { var m = norm(mensagens[j].texto); if (m && s.indexOf(m) >= 0) sim.push(mensagens[j].chave); } return sim; }' +
  ' var saida = [];' +
  ' for (var i = 0; i < regioes.length; i++) {' +
  '   var no = document.querySelector(regioes[i].sel);' +
  '   if (!no) { saida.push({ nome: regioes[i].nome, selector: regioes[i].sel, existe: false }); continue; }' +
  '   var cs = getComputedStyle(no); var t = String(no.innerText || no.textContent || "");' +
  '   saida.push({ nome: regioes[i].nome, selector: regioes[i].sel, existe: true, class_hidden: no.classList.contains("hidden"), display: cs.display,' +
  '     caixa: Math.round(no.getBoundingClientRect().width) + "x" + Math.round(no.getBoundingClientRect().height),' +
  '     elementos: no.querySelectorAll("*").length,' +
  '     texto_bytes: new TextEncoder().encode(t).length, texto_hash: djb2(norm(t)), linhas: (t.match(/\\n/g) || []).length + 1, mensagens_conhecidas: achadas(t) });' +
  ' }' +
  ' var r = window.BFR_APP_RUNTIME || null;' +
  ' return { regioes: saida, destino: r ? { activeSection: r.activeSection === undefined ? null : String(r.activeSection), activeView: r.activeView === undefined ? null : String(r.activeView) } : null, perfil: window.BFR_CURRENT_PROFILE ? String(window.BFR_CURRENT_PROFILE.role) : null };' +
  '})(' + JSON.stringify([
    { nome: 'home', sel: SEL.regiao_home },
    { nome: 'espaco', sel: SEL.regiao_espaco },
    { nome: 'aprender', sel: SEL.regiao_aprender },
  ]) + ',' + JSON.stringify(MSG_LISTA) + ')';

const MODO = (m) => 'sessionStorage.setItem("p193_modo", ' + JSON.stringify(m) + '); 1';
const CARTAO = '(function () { var ms = Array.prototype.slice.call(document.querySelectorAll(".modal")).filter(function (x) { return !x.classList.contains("hidden") && getComputedStyle(x).display !== "none" && (x.offsetWidth || x.offsetHeight); }); return ms.map(function (m) { var r = m.getBoundingClientRect(); return { id: m.id || null, caixa: Math.round(r.width) + "x" + Math.round(r.height), z_index: getComputedStyle(m).zIndex }; }); })()';
const retangulo = (sel) => '(function () { var b = document.querySelector(' + JSON.stringify(sel) + ');' +
  ' if (!b) return { sem_botao: true };' +
  ' var cs = getComputedStyle(b); var r = b.getBoundingClientRect();' +
  ' if (!(b.offsetWidth || b.offsetHeight) || cs.display === "none" || cs.visibility === "hidden" || !r.width || !r.height) return { invisivel: true };' +
  ' var x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);' +
  ' if (x < 0 || y < 0 || x > document.documentElement.clientWidth || y > document.documentElement.clientHeight) return { fora_do_ecra: { x: x, y: y } };' +
  ' var topo = document.elementFromPoint(x, y);' +
  ' if (!(topo === b || b.contains(topo))) return { tapado: { por: (topo && (topo.id || topo.className)) ? String(topo.id || topo.className).slice(0, 60) : "sem_nome" } };' +
  ' return { x: x, y: y, caixa: Math.round(r.width) + "x" + Math.round(r.height) };' +
  '})()';
const NAV = { inicio: SEL.nav_inicio, 'meu-espaco': SEL.nav_espaco, aprender: SEL.nav_aprender };

const fxCorpos = { PATCH: compila_corpo(PATCH), PEDIDOS: compila_corpo(PEDIDOS), SUPERFICIES: compila_corpo(SUPERFICIES), REGIOES: compila_corpo(REGIOES), retangulo: compila_corpo(retangulo('#x')), MODO: compila_corpo(MODO('a')), CARTAO: compila_corpo(CARTAO), partido_rejeitado: compila_corpo(corpo_de_proposito_partido) === false };
gate('corpos injectados: cada corpo compila antes de gastar um boot e o partido é rejeitado', fxCorpos, { PATCH: true, PEDIDOS: true, SUPERFICIES: true, REGIOES: true, retangulo: true, MODO: true, CARTAO: true, partido_rejeitado: true });

const contas = JSON.parse(readFileSync(EV + '/ah2-contas-17-11.json', 'utf8'));
const conta = contas.contas.find((c) => c.papel === PAPEL);
if (!conta) throw new Error('ABORTA: sem conta ' + PAPEL + ' no registo de contas');
const S = JSON.parse(readFileSync(DIR + '/ah2-sessions.json', 'utf8'));
if (!S[PAPEL] || !S[PAPEL].refresh_token) throw new Error('ABORTA: sem cadeia de ' + PAPEL + ' em ah2-sessions.json — e esta peça não mintar nem rodar nada');
const ANON = (LOCAL.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
if (!ANON) throw new Error('ABORTA: a chave pública não está no shell servido');
const renova = async () => {
  let ultimo = null;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(HOST + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
      const js = await r.json().catch(() => null);
      if (!r.ok || !js || !js.access_token) throw new Error('HTTP ' + r.status + ' ' + JSON.stringify(js).slice(0, 110));
      S[PAPEL] = Object.assign({}, S[PAPEL], { access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user });
      writeFileSync(DIR + '/ah2-sessions.json', JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) { ultimo = String(e.message || e).slice(0, 130); if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada — ' + ultimo); await new Promise((z) => setTimeout(z, 1500 * (t + 1))); }
  }
  throw new Error('renova(' + PAPEL + ') esgotou as tentativas: ' + ultimo);
};

if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=' + PORT, '--user-data-dir=' + PERFIL, '--headless=new', '--window-size=' + LARGURA + ',' + ALTURA, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let abertaParaSaida = false;
const abort = (codigo, motivo) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  if (!abertaParaSaida) { try { writeFileSync(OUT, JSON.stringify(Object.assign({}, out, { INTERROMPIDA: motivo, portoes, falhas: falhas.slice(), em_parcial: true }), null, 2) + '\n'); console.log('PARCIAL escrito em ' + OUT.split('/').pop()); } catch (e) { console.log('PARCIAL não pôde ser escrito: ' + String(e.message).slice(0, 90)); } }
  console.log('PAROU: ' + motivo); process.exit(codigo);
};
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String((e && e.message) || e).slice(0, 170)));
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String((e && e.message) || e).slice(0, 170)));
setTimeout(() => { console.log('PRAGA ' + Math.round(TETO / 1000) + ' s: fechar com o que foi medido'); abertaParaSaida = true; writeFileSync(OUT, JSON.stringify(Object.assign({}, out, { PORTOES_PARCIAIS: portoes, FALHAS_PARCIAIS: falhas.slice() }), null, 2) + '\n'); console.log('FICHEIRO_PARCIAL'); try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} process.exit(0); }, TETO);

let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
let seq = 0; const pend = new Map(); const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!abertaParaSaida) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const PRAZO = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq; const prazo = PRAZO(method);
  const temporizador = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + Math.round(prazo / 1000) + ' s')); } }, prazo);
  pend.set(i, { res: (v) => { clearTimeout(temporizador); res(v); }, rej: (e) => { clearTimeout(temporizador); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(temporizador); rej(e); }
});
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 300)); return r.result && r.result.value; };
const waitFor = async (e, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 90)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const clica = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };

await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: PATCH });

// login de aluno, com o modo desarmado
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
await E('localStorage.setItem(' + JSON.stringify(STORAGE_KEY) + ', ' + JSON.stringify(JSON.stringify(sessao)) + ')');
await E(MODO('controle'));
out.cadeia = { papel: PAPEL, access_bytes: Buffer.byteLength(String(sessao.access_token || ''), 'utf8'), expira_em_s: sessao.expires_in || null, renovada_a_custa_do_refresh: true };

const PRONTOS = "document.getElementById('appShell') && document.getElementById('appShell').classList.contains('ready') && window.BFR_CURRENT_PROFILE && window.BFR_CURRENT_PROFILE.role === " + JSON.stringify(PAPEL);
await send('Page.navigate', { url: URL_APP });
out.ms_ready_login = await waitFor(PRONTOS, 70000).catch(() => null);
if (out.ms_ready_login === null) abort(2, 'a shell do papel ' + PAPEL + ' não ficou ready em 70 s');
await dorme(1200);
out.cartao_ao_chegar = await E(CARTAO);
out.cartao_fechado = null;
if (Array.isArray(out.cartao_ao_chegar) && out.cartao_ao_chegar.length) {
  const sel = (out.cartao_ao_chegar[0].id ? '#' + out.cartao_ao_chegar[0].id : '.modal') + ' .modal-close';
  const rf = await E(retangulo(sel));
  if (rf && rf.x) { await clica(rf.x, rf.y); await dorme(800); }
  out.cartao_fechado = (await E(CARTAO)).length === 0;
}

// Chegar à área é por toque no botão da barra. O splash do produto cobre a barra nos primeiros instantes,
// por isso o hit-test é repetido até o botão estar alcançável: renderizar o overlay e chamar-lhe «sem
// movimento» era o vermelho que a régua de toque do ciclo anterior apanhou. O fallback por API da app só
// existe quando o teto de espera se esgota, e registra porquê.
const TETO_TOQUE_MS = parseInt(process.env.P193_TOQUE_MS || '15000', 10);
function motivo_de(r) { if (!r) return 'sem_rect'; return r.sem_botao ? 'sem_botao' : r.invisivel ? 'invisivel' : r.tapado ? 'tapado_por_' + String(r.tapado.por).slice(0, 40) : r.fora_do_ecra ? 'fora_do_ecra' : 'sem_rect'; }
// Fechar o cartão é o que o utilizador faz: o × do próprio produto, sem enviar nada. A app abre o cartão
// depois de o documento estar ready, por isso o fecho é chamado dentro da espera de toque e não só uma vez.
async function fechar_cartao() {
  const ms = await E(CARTAO);
  const cartoes = Array.isArray(ms) ? ms.map((m) => (m.id || 'sem_id') + '@' + m.caixa) : [];
  if (!Array.isArray(ms) || !ms.length) return { cartoes, tocado: false, fecho: 'sem_cartao' };
  const sel = (ms[0].id ? '#' + ms[0].id : '.modal') + ' .modal-close';
  const rf = await E(retangulo(sel));
  if (rf && rf.x) { await clica(rf.x, rf.y); await dorme(700); return { cartoes, tocado: true, fecho: 'botao_tocado' }; }
  return { cartoes, tocado: false, fecho: 'botao_' + motivo_de(rf) };
}

async function entrar(area) {
  const sel = NAV[area];
  const t0 = Date.now();
  let r = null, tentativas = 0, fechou = 0;
  const fecho_inicial = await fechar_cartao();
  while (Date.now() - t0 < TETO_TOQUE_MS) {
    r = await E(retangulo(sel));
    tentativas++;
    if (r && r.x) break;
    if (r && r.tapado && (await fechar_cartao()).tocado) fechou++;
    await dorme(500);
  }
  const ms = Date.now() - t0;
  if (r && r.x) { await clica(r.x, r.y); return { via: 'toque_no_botao_da_area', caixa_do_botao: r.caixa, tentativas, cartoes_fechados_no_toque: fechou, cartao_ao_chegar: fecho_inicial.cartoes, fecho_do_cartao: fecho_inicial.fecho, ms_ate_alcancar: ms }; }
  const api = await E('(function(){ try { if (window.BFR_APP_RUNTIME && typeof window.BFR_APP_RUNTIME.navigate === "function") return String(window.BFR_APP_RUNTIME.navigate(' + JSON.stringify(area) + ')); if (window.BFRPlatform && typeof window.BFRPlatform.open === "function") return String(window.BFRPlatform.open(' + JSON.stringify(area) + ')); return "sem_api_de_rota"; } catch (e) { return "erro:" + String(e.message).slice(0,60); } })()');
  return { via: 'fallback_api', resultado_da_api: api, tentativas, cartoes_fechados_no_toque: fechou, cartao_ao_chegar: fecho_inicial.cartoes, fecho_do_cartao: fecho_inicial.fecho, ms_ate_alcancar: ms, motivo: motivo_de(r) };
}

// O degrau de recuperação corre DENTRO da célula que desenhou o botão: medir noutro documento seria
// contar nós de um ecrã que já não é o da falha. Confirmar o destino depois do toque, não o toque.
async function recuperacao_da_celula(c) {
  const botao = (c.mensagens_visiveis || []).find((m) => m.superficie === 'espaco_botao_repetir' && m.tocavel);
  if (!botao) return null;
  const rec = { antes_superficies: c.superficies, antes_regioes: c.regioes, falhas_no_documento_antes: c.pedidos.falhas_servidas };
  await E(MODO('controle'));
  rec.modo_lido_no_documento = await E('sessionStorage.getItem("p193_modo")');
  const r = await E(retangulo(SEL.espaco_refresh));
  rec.botao_alcancavel = !!(r && r.x);
  rec.tapado_por = r && r.tapado ? r.tapado.por : null;
  if (!rec.botao_alcancavel) return rec;
  await clica(r.x, r.y);
  await dorme(ESPERA_MS);
  rec.depois_superficies = await E(SUPERFICIES);
  rec.depois_pedidos = await E(PEDIDOS);
  rec.depois_regioes = await E(REGIOES);
  const vis = (arr, nome) => { const s = (arr || []).find((q) => q.nome === nome) || {}; return s.visiveis == null ? null : s.visiveis; };
  const hash = (obj, nome) => { const x = ((obj || {}).regioes || []).find((q) => q.nome === nome) || {}; return x.texto_hash == null ? null : x.texto_hash; };
  const e0 = vis(c.superficies, 'espaco_erro');
  const e1 = vis(rec.depois_superficies, 'espaco_erro');
  rec.erro_sumiu = e0 != null && e1 != null ? (e0 > 0 && e1 === 0) : null;
  const h0 = hash(c.regioes, 'espaco');
  const h1 = hash(rec.depois_regioes, 'espaco');
  rec.texto_da_regiao_mudou = h0 != null && h1 != null ? h0 !== h1 : null;
  rec.falhas_servidas_depois = rec.depois_pedidos.falhas_servidas;
  // O contador do documento é acumulado: o que diz se o toque foi servido sem falha é o delta, não o total.
  rec.falhas_novas_depois_do_toque = typeof rec.falhas_servidas_depois === 'number' && typeof rec.falhas_no_documento_antes === 'number' ? rec.falhas_servidas_depois - rec.falhas_no_documento_antes : null;
  rec.mensagens_visiveis_depois = [];
  for (const s of rec.depois_superficies) for (const m of (s.medidos || [])) if (m.visivel) rec.mensagens_visiveis_depois.push({ superficie: s.nome, mensagem: m.mensagem_conhecida, tocavel: m.tocavel });
  return rec;
}

async function celula(id, area, modo) {
  await E(MODO(modo));
  await send('Page.navigate', { url: URL_APP });
  const c = { id, area, modo, ms_ready: null };
  c.ms_ready = await waitFor(PRONTOS, 70000).catch(() => null);
  if (c.ms_ready === null) { c.erro = 'shell não ficou ready'; out.celulas[id] = c; falhas.push(id + ': ' + c.erro); return c; }
  // O cartão de registo do responsável cobre a barra por cima do botão da área, e abre-se depois do documento
  // estar ready: por isso o fecho é repetido dentro da espera de toque. Fico com o que aconteceu por célula,
  // para que «o toque não alcançou o botão» tenha causa entre cartão, splash e botão ausente.
  c.armado_no_documento = await E('!!window.__p193_armado');
  c.chegada = await entrar(area);
  c.cartao_ao_chegar = c.chegada.cartao_ao_chegar;
  c.fecho_do_cartao = c.chegada.fecho_do_cartao;
  c.cartoes_fechados_antes_de_tocar = c.chegada.cartoes_fechados_no_toque;
  c.cartao_aberto_na_medicao = ((await E(CARTAO)) || []).length > 0;
  await dorme(ESPERA_MS);
  c.pedidos = await E(PEDIDOS);
  const alvo = modo === 'controle' ? { pedida: null, por_get: null, so_por_post: null, get: null, post: null } : alvo_da_tabela(c.pedidos.tabelas, modo);
  c.alvo_pedido = alvo.pedida;
  c.alvo_por_get = alvo.por_get;
  c.alvo_so_por_post = alvo.so_por_post;
  c.alvo_contagens = { get: alvo.get, post: alvo.post };
  c.falhas_no_alvo = (c.pedidos.falhas_por_modo || {})[modo] || 0;
  c.regioes = await E(REGIOES);
  c.mensagens_por_regiao = (c.regioes.regioes || []).map((r) => r.nome + ':' + ((r.mensagens_conhecidas || []).length ? r.mensagens_conhecidas.join('+') : 'nenhuma'));
  c.superficies = await E(SUPERFICIES);
  c.mensagens_visiveis = [];
  for (const s of c.superficies) for (const m of (s.medidos || [])) if (m.visivel) c.mensagens_visiveis.push({ superficie: s.nome, mensagem: m.mensagem_conhecida, bytes: m.texto_bytes, hash: m.texto_hash, tocavel: m.tocavel });
  c.recuperacao = await recuperacao_da_celula(c);
  out.celulas[id] = c;
  console.log('CELULA ' + id + ' modo=' + modo + ' pedidos=' + c.pedidos.total + ' falhas=' + c.pedidos.falhas_servidas + ' alvo_pedido=' + c.alvo_pedido + ' visiveis=' + c.mensagens_visiveis.length + ' recuperacao=' + (c.recuperacao ? JSON.stringify({ alc: c.recuperacao.botao_alcancavel, sumiu: c.recuperacao.erro_sumiu, mudou: c.recuperacao.texto_da_regiao_mudou }) : 'nenhuma') + ' destino=' + JSON.stringify(c.regioes.destino));
  return c;
}

// Os alvos de cada área não são listas lembradas por mim: são as tabelas que a própria célula de controlo pediu,
// ordenadas pelo número de pedidos. As pedidas só por POST saem do alvo da falha sintética e ficam registadas
// como classe à parte — falhar um POST seria escrever no banco, o que não está no escopo desta ronda.
const ALVOS_CAP = 3;
function alvos_de(tabelas) {
  const e = Object.entries(tabelas || {}).sort((a, b) => (b[1].total - a[1].total) || (a[0] < b[0] ? -1 : 1));
  return { todas: Object.fromEntries(e.map((x) => [x[0], x[1]])), aplicaveis: e.filter((x) => x[1].get > 0).slice(0, ALVOS_CAP).map((x) => x[0]), so_post: e.filter((x) => x[1].get === 0 && x[1].post > 0).map((x) => x[0]), nao_pedidas: e.filter((x) => x[1].total === 0).map((x) => x[0]) };
}
async function area_com_falhas(id_controle, area) {
  const c = await celula(id_controle, area, 'controle');
  const a = alvos_de(c.pedidos.tabelas);
  out.alvos[area] = a;
  const saida = [c];
  for (const t of a.aplicaveis) saida.push(await celula(id_controle.replace('-controle', '') + '-falha-' + t.replace(/\W+/g, '_'), area, t));
  return saida;
}
out.alvos = {};
const base = await celula('inicio-controle', 'inicio', 'controle');
out.alvos.inicio = alvos_de(base.pedidos.tabelas);
const alvosInicio = out.alvos.inicio.aplicaveis;
const celulas = [base];
for (const t of alvosInicio) celulas.push(await celula('inicio-falha-' + t.replace(/\W+/g, '_'), 'inicio', t));
for (const c of await area_com_falhas('espaco-controle', 'meu-espaco')) celulas.push(c);
for (const c of await area_com_falhas('aprender-controle', 'aprender')) celulas.push(c);

// — varas
function area_na_tela(c) {
  const nome = c.area === 'meu-espaco' ? 'espaco' : c.area === 'aprender' ? 'aprender' : 'home';
  const r = ((c.regioes && c.regioes.regioes) || []).find((x) => x.nome === nome);
  if (!r || !r.existe) return false;
  const larg = parseInt(String(r.caixa || '0x0').split('x')[0], 10) || 0;
  return nome === 'home' ? larg > 0 : (r.class_hidden === false && larg > 0);
}
const FIX_AREA = [
  { rotulo: 'regiao_fora_de_hidden_casa', c: { area: 'meu-espaco', regioes: { regioes: [{ nome: 'espaco', existe: true, class_hidden: false, caixa: '1200x600' }] } }, esperado: true },
  { rotulo: 'regiao_com_hidden_nao_casa', c: { area: 'meu-espaco', regioes: { regioes: [{ nome: 'espaco', existe: true, class_hidden: true, caixa: '1200x600' }] } }, esperado: false },
  { rotulo: 'regiao_com_caixa_zero_nao_casa', c: { area: 'aprender', regioes: { regioes: [{ nome: 'aprender', existe: true, class_hidden: false, caixa: '0x0' }] } }, esperado: false },
  { rotulo: 'regiao_que_nao_existe_nao_casa', c: { area: 'inicio', regioes: { regioes: [] } }, esperado: false },
].map((f) => ({ rotulo: f.rotulo, medido: area_na_tela(f.c), bate: area_na_tela(f.c) === f.esperado }));
const controlos = celulas.filter((c) => c.modo === 'controle');
const com_alvo = celulas.filter((c) => c.alvo_por_get === true);
const so_post = celulas.filter((c) => c.alvo_so_por_post === true).map((c) => c.id + '@' + c.modo);
const alvo_sem_falha = com_alvo.filter((c) => !(c.falhas_no_alvo > 0));
const visiveis_por_celula = celulas.map((c) => (c.mensagens_visiveis || []).length);
const fora_do_vocabulario = celulas.flatMap((c) => (c.mensagens_visiveis || []).map((m) => m.mensagem)).filter((x) => x === FORA).length;
const superficies_incompletas = celulas.filter((c) => !Array.isArray(c.superficies) || c.superficies.length !== 4).length;
const regioes_sem_classificacao = celulas.filter((c) => !Array.isArray(c.mensagens_por_regiao) || c.mensagens_por_regiao.length !== 3).length;
const desarmadas = celulas.filter((c) => c.armado_no_documento !== true).length;
const areas_fora_da_tela = celulas.filter((c) => !area_na_tela(c)).map((c) => c.id);
const celulas_sem_papel = celulas.filter((c) => c.ms_ready === null || c.regioes.perfil !== PAPEL).map((c) => c.id);
const com_botao = celulas.filter((c) => (c.mensagens_visiveis || []).some((m) => m.superficie === 'espaco_botao_repetir' && m.tocavel === true));
const sem_registro_de_recuperacao = com_botao.filter((c) => !c.recuperacao).map((c) => c.id);
const recuperacoes = celulas.filter((c) => c.recuperacao).map((c) => ({ celula: c.id, modo: c.modo, alcancavel: c.recuperacao.botao_alcancavel, tapado_por: c.recuperacao.tapado_por || null, modo_lido_no_documento: c.recuperacao.modo_lido_no_documento === undefined ? null : c.recuperacao.modo_lido_no_documento, visiveis_depois: (c.recuperacao.mensagens_visiveis_depois || []).map((m) => m.superficie + ':' + m.mensagem), erro_sumiu: c.recuperacao.erro_sumiu === undefined ? null : c.recuperacao.erro_sumiu, texto_da_regiao_mudou: c.recuperacao.texto_da_regiao_mudou === undefined ? null : c.recuperacao.texto_da_regiao_mudou, falhas_no_documento_antes: c.recuperacao.falhas_no_documento_antes === undefined ? null : c.recuperacao.falhas_no_documento_antes, falhas_servidas_depois: c.recuperacao.falhas_servidas_depois === undefined ? null : c.recuperacao.falhas_servidas_depois, falhas_novas_depois_do_toque: c.recuperacao.falhas_novas_depois_do_toque === undefined ? null : c.recuperacao.falhas_novas_depois_do_toque }));
// A guarda do degrau tem de ter positivo e negativo medidos: sem isto, «nenhuma célula pediu degrau»
// e «o degrau nunca foi chamado onde devia» dão o mesmo verde.
const FIX_REC = [
  { rotulo: 'botao_tocavel_sem_registro_pede_degrau', c: { mensagens_visiveis: [{ superficie: 'espaco_botao_repetir', tocavel: true }], recuperacao: null }, esperado: true },
  { rotulo: 'botao_visivel_nao_tocavel_nao_pede', c: { mensagens_visiveis: [{ superficie: 'espaco_botao_repetir', tocavel: false }], recuperacao: null }, esperado: false },
  { rotulo: 'botao_tocavel_com_registro_nao_pede', c: { mensagens_visiveis: [{ superficie: 'espaco_botao_repetir', tocavel: true }], recuperacao: { botao_alcancavel: true } }, esperado: false },
].map((f) => ({ rotulo: f.rotulo, medido: (f.c.mensagens_visiveis || []).some((m) => m.superficie === 'espaco_botao_repetir' && m.tocavel === true) && !f.c.recuperacao, bate: ((f.c.mensagens_visiveis || []).some((m) => m.superficie === 'espaco_botao_repetir' && m.tocavel === true) && !f.c.recuperacao) === f.esperado }));

gate('identidade do ar: o md5 medido agora é o declarado pelo registo mais novo da família do mapa', { md5_igual: maisNovo.md5 === AR.md5, declarado_por: maisNovo.n }, { md5_igual: true, declarado_por: maisNovo.n });
gate('bytes locais: os mesmos bytes de onde li as agulhas têm o md5 e o comprimento do ar', { md5_igual: LOCAL_MD5 === AR.md5, bytes_locais: Buffer.byteLength(LOCAL, 'utf8') }, { md5_igual: true, bytes_locais: AR.bytes });
gate('agulhas: zero selectors e zero mensagens fora dos bytes servidos, com a vara a disparar em agulha fabricada', { selectors_omitidos: SEL_AUSENTES.length, mensagens_omitidas: MSG_AUSENTES.length, fixture_dispara: FIX_AGULHAS.filter((f) => f.bate).length }, { selectors_omitidos: 0, mensagens_omitidas: 0, fixture_dispara: 3 });
gate('os ids das duas regiões do aluno batem com o mapa views lido dos bytes servidos', { batem: FIX_MAPA_VIEWS.filter((f) => f.bate).length }, { batem: 2 });
gate('regua da falha sintética: sete casos, todos do lado certo, e só GET falha', { casos: FIX_FALHA.length, batem: FIX_FALHA.filter((f) => f.bate).length }, { casos: 7, batem: 7 });
gate('classificador anti-PII: mensagem do produto casa, nome de aluno e uuid não casam, vazio não casa', FIX_MSG.map((f) => f.bate), [true, true, true, true, true]);
gate('a vara de área na tela tem um positivo e três negativos medidos em fichas fabricadas', FIX_AREA.map((f) => f.bate), [true, true, true, true]);
gate('a derivação do alvo separa GET de POST, com os três casos medidos em tabelas fabricadas', FIX_ALVO.map((f) => f.bate), [true, true, true]);
gate('o patch estava armado em todos os documentos, inclusive no de controlo', { desarmadas, celulas: celulas.length }, { desarmadas: 0, celulas: celulas.length });
gate('as três células de controlo não serviram nenhuma falha sintética', { controles: controlos.length, com_falha_servida: controlos.filter((c) => ((c.pedidos || {}).falhas_servidas || 0) > 0).length }, { controles: 3, com_falha_servida: 0 });
gate('nenhuma célula em que a tabela alvo foi pedida por GET ficou sem falha servida (zero cego)', alvo_sem_falha.map((c) => c.id), []);
gate('toda célula imprime as quatro superfícies, mesmo quando nenhuma está visível', { celulas: celulas.length, com_menos_de_quatro: superficies_incompletas }, { celulas: celulas.length, com_menos_de_quatro: 0 });
gate('toda célula classifica as três regiões, mesmo quando nenhuma tem mensagem conhecida', regioes_sem_classificacao, 0);
gate('nenhum texto de superfície foi guardado sem ter casado com o vocabulário do produto', fora_do_vocabulario, 0);
gate('a área pedida está na tela em todas as células', areas_fora_da_tela, []);
gate('a shell montou com o papel certo em todas as células', celulas_sem_papel, []);
gate('o degrau de recuperação corre em toda célula que desenhou o botão tocável, com os três casos fabricados do lado certo', { sem_registro: sem_registro_de_recuperacao, fixture_bate: FIX_REC.filter((f) => f.bate).length }, { sem_registro: [], fixture_bate: 3 });
gate('onde o degrau toca, o modo lido no documento é o de controlo: a falha sintética está desarmada antes do toque', celulas.filter((c) => c.recuperacao && c.recuperacao.botao_alcancavel && c.recuperacao.modo_lido_no_documento !== 'controle').map((c) => c.id), []);
// Chegada por toque na barra versus recurso à API: o fallback é classe legítima (o botão estava tapado por
// overlay do próprio produto ao fim do meu teto de espera) e por isso imprime-se com as células, nunca se proíbe.
const por_via = {};
for (const c of celulas) { const v = (c.chegada || {}).via || 'sem_chegada'; por_via[v] = (por_via[v] || 0) + 1; }
// O que tem vara é a completude do degrau: se toquei, tenho de ter lido os dois lados e o delta das falhas.
// Uma régua sobre «somada = número de células» seria tautologia — o contador é por definição um por célula.
const degrau_incompleto = celulas.filter((c) => c.recuperacao && c.recuperacao.botao_alcancavel && !(c.recuperacao.depois_superficies && c.recuperacao.depois_regioes && typeof c.recuperacao.falhas_novas_depois_do_toque === 'number')).map((c) => c.id);
gate('o degrau que tocou lê os dois lados do mesmo documento e o delta das falhas', degrau_incompleto, []);
// Toda célula declara o cartão que encontrou, o fecho tentado e se ele ainda estava aberto na medição: sem esta
// declaração, «o botão da barra não era alcançável» fica sem causa atribuível entre splash e cartão.
const cartoes_sem_declaracao = celulas.filter((c) => c.ms_ready !== null && (typeof c.cartao_aberto_na_medicao !== 'boolean' || typeof c.fecho_do_cartao !== 'string' || !Array.isArray(c.cartao_ao_chegar))).map((c) => c.id);
gate('toda célula declara o cartão de registo encontrado, o fecho tentado e o estado na medição', cartoes_sem_declaracao, []);
out.medido = { celulas: celulas.length, alvos_por_area: out.alvos, visiveis_por_celula, com_alvo_pedido_por_get: com_alvo.length, alvo_so_por_post: so_post, celulas_com_botao_repetir_tocavel: com_botao.map((c) => c.id), recuperacoes, chegada_por_via: por_via, cartoes_por_celula: celulas.map((c) => c.id + '=' + JSON.stringify(c.cartao_ao_chegar || null) + '/fecho=' + (c.fecho_do_cartao === undefined ? '?' : c.fecho_do_cartao) + '/fechados=' + (c.cartoes_fechados_antes_de_tocar === undefined ? '?' : c.cartoes_fechados_antes_de_tocar) + '/aberto_na_medicao=' + (c.cartao_aberto_na_medicao === undefined ? '?' : c.cartao_aberto_na_medicao)), ms_ate_alcancar_por_celula: celulas.map((c) => c.id + '=' + ((c.chegada || {}).ms_ate_alcancar == null ? '?' : c.chegada.ms_ate_alcancar) + '/' + ((c.chegada || {}).tentativas == null ? '?' : c.chegada.tentativas)), celulas_por_via: Object.fromEntries(Object.keys(por_via).map((v) => [v, celulas.filter((c) => ((c.chegada || {}).via || 'sem_chegada') === v).map((c) => c.id)])) };

const resumo = celulas.map((c) => { const rr = ((c.regioes || {}).regioes || []); const hash = (nome) => { const x = rr.find((q) => q.nome === nome) || {}; return x.texto_hash == null ? null : x.texto_hash; }; return { id: c.id, modo: c.modo, alvo_pedido: c.alvo_pedido, alvo_por_get: c.alvo_por_get, alvo_so_por_post: c.alvo_so_por_post, falhas_no_alvo: c.falhas_no_alvo, pedidos: ((c.pedidos || {}).total) == null ? null : c.pedidos.total, area_na_tela: area_na_tela(c), visiveis: (c.mensagens_visiveis || []).map((m) => m.superficie + ':' + m.mensagem), na_regiao: c.mensagens_por_regiao || [], regiao_home_hash: hash('home'), regiao_espaco_hash: hash('espaco'), regiao_aprender_hash: hash('aprender'), chegada: (c.chegada || {}).via || null, recuperacao: c.recuperacao ? { alcancavel: c.recuperacao.botao_alcancavel, erro_sumiu: c.recuperacao.erro_sumiu === undefined ? null : c.recuperacao.erro_sumiu, texto_mudou: c.recuperacao.texto_da_regiao_mudou === undefined ? null : c.recuperacao.texto_da_regiao_mudou } : null }; });
out.celulas_resumo = resumo;
out.resumo_por_celula = resumo.map((r) => r.id + ' | ' + r.modo + ' | pedido_get=' + r.alvo_por_get + ' | falhas=' + r.falhas_no_alvo + ' | superficies_visiveis=' + (r.visiveis.length ? r.visiveis.join(',') : 'nenhuma') + ' | regioes=' + (r.na_regiao.length ? r.na_regiao.join(',') : 'nenhuma'));
out.definicoes = {
  visivel: 'largura e altura medidas do rect, sem display:none, sem visibility:hidden, sem opacity 0, com offsetParent (salvo posição fixa) — a caixa 0x0 é contada à parte, porque uma mensagem dentro de um caixa zero não é vista',
  falha_sintetica: 'GET cujo caminho contém o modo é respondido localmente com 503 JSON; nenhum outro método é tocado; nada é escrito no banco nem na app',
  anti_PII: 'das regiões só guardo bytes, contagem de elementos, linhas, um hash djb2 do texto e a lista das chaves do vocabulário do produto que lá aparecem; o texto bruto não é guardado, e uma frase que não está no vocabulário fica fora da ficha',
  alvo_da_area: 'as tabelas onde a falha é aplicada são as que a própria célula de controlo pediu por GET, ordenadas por número de pedidos, com o meu limite de ' + ALVOS_CAP + ' por área; as pedidas só por POST ficam registadas como classe à parte porque falhá-las seria escrever no banco',
  degrau_de_recuperacao: 'onde a célula desenhou o botão de repetir tocável, o mesmo documento é lido outra vez depois de desarmar a falha sintética e tocar no botão do produto; o degrau vive na célula porque medido noutro documento contaria nós de um ecrã que já não é o da falha',
  chegada: 'chegar à área é pelo toque no botão da barra; quando o hit-test diz que o botão está tapado, uso a API do próprio produto e registro a célula como fallback, com o motivo — o número de células por via é impresso, não escondido',
};
out.o_que_prova = [
  'que cada célula existiu: o ar é o do registo mais novo da família do mapa, o documento tem o patch armado, a shell montou com o papel ' + PAPEL + ', e a área foi alcançada pelo botão da área (ou pelo fallback declarado)',
  'para cada tabela onde o carregador do aluno foi realmente chamado por GET, se a app mostrou alguma coisa na superfície (com caixa, visível, e alcançável a toque) ou se ficou tudo como antes',
  'se o texto de cada região contém alguma das mensagens de erro do próprio produto — o que responde à pergunta «o utilizador vê?» também quando a mensagem não vive numa das superfícies que eu nomeei',
  'a diferença entre «o carregador pôs estado de erro» e «o utilizador vê o erro», que é exactamente a pergunta que ficou aberta na célula PEN-04',
  'se o botão que o produto desenha para repetir alcança o destino: o degrau lê o mesmo documento antes e depois do toque e registra se o erro sumiu, se o texto da região mudou e se alguma falha sintética voltou a ser servida',
];
out.o_que_NAO_prova = [
  'o conteúdo das listas não foi capturado, por regra do briefing contra expor dados pessoais: prové que a superfície mudou ou não mudou (hash do texto da região) e se lá aparece uma frase do vocabulário do produto, não o que lá estava escrito',
  'a falha sintética é uma falta de serviço simulada no meu browser; não prova que o catálogo ou o RLS estejam em falta — prova apenas o que a interface faz quando um pedido de leitura falha',
  'o meu limite de ' + ALVOS_CAP + ' tabelas por área deixa de fora as restantes GET da mesma célula: é amostra, não censo, e as tabelas não escolhidas estão impressas em alvos_por_area com as suas contagens',
  'uma tabela pedida só por POST não é alcançada pela falha sintética e por isso não tem veredicto nesta corrida; está em alvo_so_por_post, não contada como zero meu',
  'esta peça corre com uma só largura e um só papel; a mesma régua em 320/390/430 ou noutro papel é outra corrida',
  'o degrau de recuperação só existe onde o produto desenha o botão: uma área que fica muda perante a falha não tem nada a repetir, e a ausência do degrau lá é o achado, não a minha omissão',
];
out.portoes = portoes;
out.duracao_ms = Date.now() - Date.parse(out.em);
out.falhas = falhas.slice();
abertaParaSaida = true;
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 }); } catch {}
console.log('FICHEIRO ' + OUT.split('/').pop() + ' bytes=' + statSync(OUT).size + ' celulas=' + celulas.length);
console.log('VEREDITO P193 ' + (falhas.length ? 'VERMELHO ' : 'VERDE ') + portoes + '/' + falhas.length);
for (const l of out.resumo_por_celula) console.log('  ' + l);
process.exit(falhas.length ? 1 : 0);
