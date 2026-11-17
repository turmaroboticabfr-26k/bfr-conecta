// AH-1-F — prova de que os dois predicados de layout do MEDIR da secretaria discriminam, medida numa
// página cuja geometria é conhecida POR CONSTRUÇÃO (cada caso tem o CSS escrito aqui, e o valor esperado
// é lido do CSS do próprio caso — nada de régua dactilografada contra o app).
// Por que existe: `estouro_body` era `scrollWidth>innerWidth || scrollHeight>innerHeight`. A segunda
// cláusula é verdade em qualquer página que faz scroll vertical, e o campo dava `true` nas 11 abas do
// ciclo AH-1 (17/11) — sinal cego, não medida. E `cortados` gravava só a contagem, sem identidade, pelo
// que um contentor com `max-height` legítimo e um texto realmente cortado eram o mesmo número.
// Isto NÃO mede o bfr-conecta: o ficheiro é local, o chrome nunca sai dele, e nenhuma rede é tocada.
// O que fica por provar é o valor dos novos campos no ar — isso exige sessão real (mint) e OK próprio.
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9352;
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah1-predicado-fixture-17-11.json';
const FIX = join(tmpdir(), 'ah1-predicado-fixture.html');

// ── porta livre antes de abrir: se estiver ocupada, o passo grava-se como NÃO RODADO (nunca reentrar
//    num chrome de outra sessão — é a lição do porto 9333) ──
let porta_livre = false;
for (let i = 0; i < 10; i++) {
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(1200) }); await new Promise(r => setTimeout(r, 300)); }
  catch { porta_livre = true; break; }
}
if (!porta_livre) { console.log('PORTA_OCUPADA ' + PORT + ' — nada foi medido.'); process.exit(9); }

const ALTURA_VISIVEL = 800;
// O meta viewport é o do shell real (`bfr-candidata-v121-rotulos-supervisor/index.html`, 1 ocorrência),
// copiado literal: sem ele o Chrome Headless alarga a janela de layout ao conteúdo (medido na 1.ª corrida:
// innerWidth=1400, innerHeight=2872) e as duas cláusulas de estouro saem false — um verde vazio.
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>
html,body{margin:0;padding:0}
#so_vertical{width:200px;height:120px;overflow-y:auto}
#so_vertical div{height:600px}
#so_horizontal{width:200px;height:120px;overflow-x:auto;white-space:nowrap}
#so_horizontal span{display:inline-block;width:900px;height:20px}
#limpo{width:200px;height:120px;overflow:hidden}
#rolavel_legitimo{max-height:100px;overflow-y:auto}
#cortado_de_verdade{width:200px;height:40px;overflow:hidden}
</style></head><body>
<div id="so_vertical"><div></div></div>
<div id="so_horizontal"><span></span></div>
<div id="limpo"></div>
<div id="rolavel_legitimo">${'<p style="margin:0">linha</p>'.repeat(40)}</div>
<div id="cortado_de_verdade"><div style="width:300px;height:10px"></div></div>
<div id="empurra_corpo" style="width:1400px;height:40px"></div>
<div id="rolavel_corpo" style="height:2000px"></div>
</body></html>`;
writeFileSync(FIX, HTML, 'utf8');

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), 'ah1-fixture-profile')}`,
  '--headless=new', '--window-size=390,800', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { unlinkSync(FIX); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
setTimeout(() => abort(3, 'watchdog 120 s'), 120000);

let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await new Promise(r => setTimeout(r, 400));
}
const page = targets.find(t => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([
  new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout handshake ws')), 30000)),
]);
let seq = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200));
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: ALTURA_VISIVEL, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: 'file:///' + FIX.replace(/\\/g, '/') });
await (async () => { for (let i = 0; i < 40; i++) { try { if (await evalJS(`document.body?.id !== undefined && document.getElementById('so_vertical') !== null`)) return; } catch {} await new Promise(r => setTimeout(r, 250)); } abort(2, 'fixture não montou'); })();

// Precondition do instrumento, medida com a RÉGUA CERTA. A 1.ª e a 2.ª corridas abortaram porque exigiam
// `window.innerWidth === 390`: neste Chrome Headless o `innerWidth` DILATA-SE até à largura do conteúdo
// transbordante (medido aqui: 1400 com um filho de 1400 px; 504 sem emulação nenhuma) enquanto
// `document.documentElement.clientWidth` vale 390 e, na página real do app, vale exatamente a largura
// pedida nas três bandas (`evidence/ah1-sonda-janela-app-17-11.json`). Logo: clientWidth é a régua,
// innerWidth não é, e a comparação antiga `body.scrollWidth > innerWidth` é degenerada — nunca dá true.
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: ALTURA_VISIVEL, deviceScaleFactor: 1, mobile: true });
const LER_JANELA = `({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight })`;
let janela_estavel = false; let tentativas = 0; let regua = null;
for (let i = 0; i < 8 && !janela_estavel; i++) {
  regua = await evalJS(LER_JANELA);
  tentativas = i + 1;
  janela_estavel = regua.clientWidth === 390 && regua.clientHeight === ALTURA_VISIVEL;
  if (!janela_estavel) await new Promise(r => setTimeout(r, 250));
}
const precondition = { janela_assentou: janela_estavel, tentativas, regua };
if (!janela_estavel) abort(7, 'clientWidth/clientHeight nunca assentaram em 390×' + ALTURA_VISIVEL + ' — nada foi medido | ' + JSON.stringify(regua));

const innerWidth = await evalJS(`window.innerWidth`);
const innerHeight = await evalJS(`window.innerHeight`);

// O corpo do MEDIR patchado, isolado para poder ser confrontado caso a caso. A varredura é de
// DESCENDENTES de `el` — igual à passada da secretaria, onde `el` é o painel: por isso o contentor
// rolável só é apanhado quando existe um ancestral por cima dele (aqui, o body).
const PRED = `(() => {
  const filtar = (el) => Array.from(el.querySelectorAll('*')).filter(e => {
    const r = e.getBoundingClientRect(); return r.width > 0 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1);
  });
  const amostra = (el) => filtar(el).map(e => {
    const cs = getComputedStyle(e);
    return {
      no: e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
      transborda: [e.scrollWidth > e.clientWidth + 1, e.scrollHeight > e.clientHeight + 1],
      overflow: [cs.overflowX, cs.overflowY],
    };
  });
  return {
    reguas: (function () { return { innerWidth: window.innerWidth, innerHeight: window.innerHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight }; })(),
    desde_body: amostra(document.body),
    dentro_de_so_vertical: amostra(document.getElementById('so_vertical')),
    corpo: {
      cortados: filtar(document.body).length,
      scroll_body: [document.body.scrollWidth, document.body.scrollHeight],
      // A régua certa: clientWidth/clientHeight do documento. Com um filho de 1400 px a 390 de janela,
      // isto dá true; com a régua antiga dava false, porque o innerWidth tinha-se dilatado até 1400.
      estouro_horizontal: document.body.scrollWidth > document.documentElement.clientWidth + 1,
      estouro_vertical: document.body.scrollHeight > document.documentElement.clientHeight + 1,
      // O campo como era no ciclo AH-1 (innerWidth + as duas cláusulas juntas), para a comparação sair do
      // artefacto e não da minha memória.
      estouro_body_ANTIGO: document.body.scrollWidth > window.innerWidth + 1 || document.body.scrollHeight > window.innerHeight + 1,
    },
    scroll: [document.body.scrollWidth, document.body.scrollHeight],
  };
})()`;
const med = await evalJS(PRED);

const out = {
  programa: 'scripts/ah1-predicado-fixture.mjs', em: new Date().toISOString(),
  viewport: { innerWidth, innerHeight },
  precondition,
  o_que_prova: 'três coisas, todas por construção: (1) com a régua certa (documentElement.clientWidth/clientHeight) os dois eixos separam o que o CSS declara; (2) a amostra dos cortados distingue nó cortado (overflow:hidden) de contentor rolável (auto), o que a contagem sozinha não dizia; (3) o campo como era no ciclo AH-1 (innerWidth, duas cláusulas juntas) diz false numa página que transborda 1010 px por fora da janela',
  o_que_NAO_prova: 'nada sobre o bfr-conecta: nenhuma rota, nenhum painel real, nenhuma sessão. Os valores novos no ar só saem de uma passagem com mint e OK próprios; o `cortados=3` do artefacto de 17/11 continua sem identidade conhecida; e os `estouro_h`/`largura` já gravados pelas passadas mobile ficam desprovados de força probatória, não refutados — o predicado não podia detectar o que procurava.',
  casos: med,
};
let portoes = 0; const falhas = [];
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
};

// Expectativas lidas do CSS escrito acima, não do que o app devolve.
const nomes = med.desde_body.map(x => x.no);
const eixo = id => (med.desde_body.find(x => x.no.endsWith('#' + id)) || {}).transborda;
const overflow = id => (med.desde_body.find(x => x.no.endsWith('#' + id)) || {}).overflow;
const E = {
  largura_janela: innerWidth, altura_janela: innerHeight,
  corpo: '#so_vertical 120/600 em Y · #so_horizontal 200/900 em X · #cortado_de_verdade 200/300 em X com overflow:hidden · #rolavel_legitimo 100/40×40 linhas em Y com overflow:auto · #limpo sem transbordo',
};
gate('réguas do documento no instante da medida (client 390×800)', [med.reguas.clientWidth, med.reguas.clientHeight], [390, 800]);
gate('os 4 nós com transbordo próprio são apanhados, e #limpo fica fora', nomes.slice().sort(), ['DIV#cortado_de_verdade', 'DIV#rolavel_legitimo', 'DIV#so_horizontal', 'DIV#so_vertical']);
gate('#so_vertical: apanhado só em Y', eixo('so_vertical'), [false, true]);
gate('#so_horizontal: apanhado só em X', eixo('so_horizontal'), [true, false]);
gate('#cortado_de_verdade: apanhado só em X', eixo('cortado_de_verdade'), [true, false]);
gate('#rolavel_legitimo: apanhado só em Y', eixo('rolavel_legitimo'), [false, true]);
// `overflow-x` especificado é `visible`, mas quando o outro eixo é `auto` o valor COMPUTADO passa a `auto`
// (CSS Overflow 3 §3.3); é o computado que o predicado lê, por isso a régua é essa, não a dactilografada.
gate('a amostra distingue nó cortado (hidden) de contentor rolável (auto) — o que a contagem não dizia',
  { cortado: overflow('cortado_de_verdade'), rolavel: overflow('rolavel_legitimo') }, { cortado: ['hidden', 'hidden'], rolavel: ['auto', 'auto'] });
gate('descendentes do próprio #so_vertical: nenhum (o contentor rolável é o pai, não o filho)', med.dentro_de_so_vertical, []);
gate('body: estouro_horizontal = true com a régua certa (scrollWidth 1400 > clientWidth 390)', [med.corpo.estouro_horizontal, med.corpo.scroll_body[0] - med.reguas.clientWidth], [true, 1010]);
gate('body: estouro_vertical = true com a régua certa (body mais alto que os 800 px)', [med.corpo.estouro_vertical, med.corpo.scroll_body[1] > 801], [true, true]);
// A prova da cegueira, não a minha memória: com o campo como era no AH-1, o transbordo de 1010 px não aparece.
gate('o AH-1 não via este transbordo: estouro_body_ANTIGO = false com scrollWidth 1400', med.corpo.estouro_body_ANTIGO, false);
gate('e o motivo é a régua: innerWidth dilatou-se até ao conteúdo', med.reguas.innerWidth >= med.corpo.scroll_body[0], true);

// O caso que interessa: uma página que APENAS faz scroll vertical. Construído ao desligar o empurrador.
await evalJS(`document.getElementById('empurra_corpo').style.width = '100%'`);
const soVertical = await evalJS(`(function () {
  const cw = document.documentElement.clientWidth, ch = document.documentElement.clientHeight;
  return {
    reguas: { innerWidth: window.innerWidth, innerHeight: window.innerHeight, clientWidth: cw, clientHeight: ch },
    scroll_body: [document.body.scrollWidth, document.body.scrollHeight],
    estouro_horizontal: document.body.scrollWidth > cw + 1,
    estouro_vertical: document.body.scrollHeight > ch + 1,
  };
})()`);
gate('sem transbordo horizontal: clientWidth continua 390', soVertical.reguas.clientWidth, 390);
gate('página que só rola: estouro_horizontal = false', soVertical.estouro_horizontal, false);
gate('página que só rola: estouro_vertical = true', [soVertical.estouro_vertical, soVertical.scroll_body[1] > soVertical.reguas.clientHeight + 1], [true, true]);
out.caso_so_scroll_vertical = { construcao: 'empurrador de 1400 px reduzido a 100 %; fica só a altura do body acima da janela', medido: soVertical };
out.expectativas_lidas_do_css = E;

out.veredito = falhas.length === 0 ? 'AH1_PREDICADO_OK' : 'AH1_PREDICADO_VERMELHO';
out.portoes = portoes; out.falhas = falhas;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(out.veredito + '  ·  artefacto: ' + OUT);
fecho = true;
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { unlinkSync(FIX); } catch {}
process.exit(falhas.length ? 1 : 0);
