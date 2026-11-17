// §6, segunda pergunta: a causa medida em ah2-home-causa-17-11.json é re-render (pintura ~400 ms, platô
// ~2,2 s, CPU 335-931 ms, rede 0 em 5 de 6 cliques). Mas o log mostrou os ids `bfr-coord-panel-content-N`
// a subir 12→31→47→63→79→95 — +16 por clique. Isto são duas causas com remédios opostos:
//   (a) VAZAMENTO: cada clique deixa 16 painéis órfãos no documento → a vista cresce sem teto e o
//       re-render fica mais caro a cada clique; remédio = limpar nós;
//   (b) TROCA: o re-render da vista de coordenação substitui a marcação, `enhanceSection()`
//       (app/index.html:24911-24927) cria o `<div id=bfr-coord-panel-content-N>` novo e o velho sai com a
//       marcação antiga — o contador sobe, a contagem não; remédio = não re-construir o que já está igual.
// O discriminador é só um: quantos nós `[id^="bfr-coord-panel-content-"]` existem no documento depois de
// 12 cliques em Home. Se sobe ~16 por clique, é (a); se fica no número de painéis da tela, é (b).
// Mede também o total de elementos do documento e a heap JS por clique, para o vazamento não se esconder
// num contador de ids. Só-leitura no ar: 0 escrita, 0 DDL, 0 deploy.
// Uso: node scripts/ah2-home-nodos.mjs <papel> <rotulo> [n-cliques]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const ROTULO = process.argv[3] || '17-11';
const N = Math.min(24, parseInt(process.argv[4] || '12', 10));
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2hn-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-home-nodos-${ROTULO}.json`;
const PORT = 9358;
const RÉGUA_ELEM_POR_CLIQUE = 5;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });

const contas = JSON.parse(readFileSync(`${DIR}/bfr-conecta/evidence/ah2-contas-17-11.json`, 'utf8'));
const conta = contas.contas.find((c) => c.papel === PAPEL);
if (!conta) throw new Error('ABORTA: sem conta ' + PAPEL + ' no registo do ciclo');
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const renova = async () => {
  let ultimo = null;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(20000) });
      const t = await r.text();
      let js = null; try { js = JSON.parse(t); } catch { ultimo = `HTTP ${r.status} nao-JSON: ${t.slice(0, 80)}`; await new Promise((z) => setTimeout(z, 2000 * (tentativa + 1))); continue; }
      if (!r.ok || !js.access_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(js).slice(0, 160)}`);
      S[PAPEL] = { ...S[PAPEL], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
      writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) {
      ultimo = String(e.message || e).slice(0, 160);
      if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada, é preciso re-mint — ' + ultimo);
      await new Promise((z) => setTimeout(z, 2000 * (tentativa + 1)));
    }
  }
  throw new Error('renova(' + PAPEL + ') esgotou 5 tentativas: ' + ultimo);
};
const sessao = await renova();

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--enable-precise-memory-info', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, `watchdog ${Math.max(540, N * 30)} s`), Math.max(540000, N * 30000));
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
const consoleErros = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErros.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 200));
  if (m.method === 'Runtime.exceptionThrown') consoleErros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const transit = (m) => /navigated or closed|target closed|not attached|Cannot find context/i.test(String(m || ''));
const E = async (expression, t = 4) => {
  for (let n = 0; n < t; n++) {
    try { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; }
    catch (err) { if (transit(err.message) && n < t - 1) { await new Promise((r) => setTimeout(r, 800)); continue; } if (transit(err.message)) return null; throw err; }
  }
};
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };

// O censo de nós, uma função só: é isto que separa vazamento de troca.
const CENSO = `(() => {
  const ids = Array.from(document.querySelectorAll('[id^="bfr-coord-panel-content-"]')).map(e => e.id);
  const num = ids.map(s => parseInt(s.split('-').pop(), 10)).filter(n => !isNaN(n));
  const v = document.getElementById('coordinatorView');
  return {
    elementos: document.getElementsByTagName('*').length,
    paineis_content: ids.length,
    id_max: num.length ? Math.max(...num) : null,
    ids_amostra: ids.slice(0, 4),
    filhos_coordinatorView: v ? v.children.length : null,
    schedule_panels: document.querySelectorAll('[id^="bfr-schedule-panel-"]').length,
    heap_mb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
  };
})()`;

const out = { ciclo: 'AH-6-HOME-NODOS', em: new Date().toISOString(), papel: PAPEL, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), n_cliques: N, janela_ms: 6000, régua: { teto_elementos_por_clique: RÉGUA_ELEM_POR_CLIQUE, nota: 'um vazamento de painéis acrescentaria ~16 nós por clique; a troca mantém a contagem no número de painéis da tela' }, contas: { id: conta.id.slice(0, 8) }, cliques: [] };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };

await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 90000);
out.censo_ao_boot = await E(CENSO);
console.log(`boot: elementos=${out.censo_ao_boot.elementos} paineis=${out.censo_ao_boot.paineis_content} heap=${out.censo_ao_boot.heap_mb}MB`);

const OUTRA = PAPEL === 'coordinator' ? 'coordenacao' : 'comunicados';
for (let k = 1; k <= N; k++) {
  await E(`(() => { const b = document.querySelector('button[data-section="${OUTRA}"]'); b && b.click(); return !!b; })()`);
  await E(`new Promise(r => setTimeout(r, 1500))`);
  const antes = await E(CENSO);
  const r = await E(`(async (antes) => {
    const t0 = performance.now();
    const res0 = performance.getEntriesByType('resource').length;
    const b = document.querySelector('button[data-section="inicio"]');
    if (!b) return { sem_botao: true };
    b.click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t_pintura = Math.round(performance.now() - t0);
    const candidatos = () => Array.from(document.querySelectorAll('[id$="Panel"], [id$="View"], [id$="Section"], section, main')).filter(e => { const cs = getComputedStyle(e); const rc = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && rc.width > 50 && rc.height > 40 && e.id; });
    const caracteres = () => { let m = null, mc = -1; for (const e of candidatos()) { const c = (e.innerText || '').trim().length; if (c > mc) { mc = c; m = e; } } return { id: m ? m.id : null, c: mc }; };
    let ant = -1, est = 0, ms = 0;
    while (est < 2 && ms < 6000) { await new Promise(r => setTimeout(r, 600)); ms = Math.round(performance.now() - t0); const a = caracteres(); if (a.c === ant && ant >= 0) est++; else est = 0; ant = a.c; }
    const t_estavel = Math.round(performance.now() - t0);
    const n_rede = performance.getEntriesByType('resource').length - res0;
    return { t_pintura, ms_estabilizou: est >= 2, t_estavel, n_rede };
  })(${JSON.stringify(antes)})`);
  const depois = await E(CENSO);
  const linha = { k, antes, depois, delta_elementos: depois.elementos - antes.elementos, delta_paneis: depois.paineis_content - antes.paineis_content, clique: r };
  out.cliques.push(linha);
  console.log(`#${k}: antes ${antes.elementos}el/${antes.paineis_content}p(id_max=${antes.id_max}) -> depois ${depois.elementos}el/${depois.paineis_content}p(id_max=${depois.id_max}) delta=${linha.delta_elementos}el ${linha.delta_paneis}p  pintura=${r.t_pintura}ms estavel=${r.t_estavel}ms rede=${r.n_rede} heap=${depois.heap_mb}MB`);
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
}

const me = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)) : null; };
const dEl = out.cliques.map((c) => c.delta_elementos);
const pCount = out.cliques.map((c) => c.depois.paineis_content);
const crescimento = (() => { const n = out.cliques.length; if (n < 2) return null; const xs = out.cliques.map((_, i) => i + 1), ys = out.cliques.map((c) => c.depois.elementos); const mx = me(xs), my = me(ys); const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0); const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0); return Math.round((num / den) * 100) / 100; })();
out.resumo = {
  paineis: { primeiro: pCount[0], ultimo: pCount[pCount.length - 1], min: Math.min(...pCount), max: Math.max(...pCount) },
  elementos: { primeiro: out.cliques[0].depois.elementos, ultimo: out.cliques[out.cliques.length - 1].depois.elementos, mediana_delta_por_clique: me(dEl), max_delta_por_clique: Math.max(...dEl) },
  id_max: { primeiro: out.cliques[0].depois.id_max, ultimo: out.cliques[out.cliques.length - 1].depois.id_max },
  heap_mb: { primeiro: out.cliques[0].depois.heap_mb, ultimo: out.cliques[out.cliques.length - 1].depois.heap_mb },
  elementos_por_clique: crescimento,
  pintura_mediana_ms: me(out.cliques.map((c) => c.clique.t_pintura)),
  estavel_mediana_ms: me(out.cliques.map((c) => c.clique.t_estavel)),
  rede_mediana: me(out.cliques.map((c) => c.clique.n_rede)),
  nao_estabilizaram: out.cliques.filter((c) => !c.clique.ms_estabilizou).map((c) => c.k),
};
const relevantes = consoleErros.filter((t) => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource|WebSocket|chunkloaderror|bfr_school_calendar_days|bfr_school_shift_settings|gate_checkins/i.test(t));
out.erros_console = relevantes.slice(0, 6);
out.n_erros_cutados = out.cliques.filter((c) => c.depois.elementos > 20000).length;

gate('a contagem de painéis NÃO cresce com o Home repetido (troca, não vazamento)', out.resumo.paineis.max <= out.resumo.paineis.primeiro + 2 ? 'troca' : 'vazamento', 'troca');
gate('o documento não ganha mais de ' + RÉGUA_ELEM_POR_CLIQUE + ' elementos por clique em Home', out.resumo.elementos_por_clique <= RÉGUA_ELEM_POR_CLIQUE ? 'dentro' : 'fora', 'dentro');
gate('o contador de ids sobe mesmo com a contagem fixa (prova que é re-construção)', out.resumo.id_max.ultimo > out.resumo.id_max.primeiro ? 'sobe' : 'parado', 'sobe');
gate('Home quente não pede rede (a demora não é espera de API)', out.resumo.rede_mediana, 0);
gate('mesmo sem rede, o platô de estabilização persiste (é re-render/CPU)', out.resumo.estavel_mediana_ms >= 1500 ? 'platô' : 'sem-platô', 'platô');
gate('0 erros de console não-atribuídos', relevantes.length, 0);

out.veredito = falhas.length ? 'AH2_HOME_NODOS_COM_FALHA' : 'AH2_HOME_NODOS_MEDIDO';
out.diagnostico = (() => {
  if (out.resumo.paineis.max > out.resumo.paineis.primeiro + 2) return 'VAZAMENTO: cada clique em Home deixa painéis órfãos no documento — a causa do platô é o DOM a crescer.';
  if (out.resumo.rede_mediana > 0) return 'MISTO: há rede na janela quente além do re-render.';
  return 'TROCA: o platô de ~2 s vem de re-construir a vista de coordenação a cada clique (enhanceSection + observer), não de rede nem de DOM acumulado.';
})();
out.portoes = portoes; out.falhas = falhas;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\nRESUMO ' + JSON.stringify(out.resumo));
console.log('DIAGNOSTICO: ' + out.diagnostico);
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ' · ' + OUT.split('/').pop());
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
