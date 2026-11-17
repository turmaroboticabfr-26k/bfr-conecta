// §6 do briefing: «Investigar especialmente a demora para abrir a página inicial após clicar no ícone
// Home. Identificar a causa real antes de alterar a estrutura.» Este ciclo não altera estrutura nenhuma:
// mede o clique. Para cada clique em Home instala três observadores no mesmo relógio (performance.now):
// long tasks de 50 ms (CPU do próprio browser), recursos de rede iniciados na janela (via
// performance.getEntriesByType('resource'), que é o mesmo relógio e não exige patch à app) e mutações do
// DOM atribuídas ao ancestral com id mais próximo. Assim a resposta «é JS, é rede ou é re-render» sai de
// números, não de opinião.
// Dois cenários, porque o utilizador faz os dois: (A) Home quando já está no Home, (B) Home depois de
// estar noutra seção — que é o «clicar no ícone Home» do briefing.
// Só-leitura no ar: 0 escrita, 0 DDL, 0 deploy. Uso: node scripts/ah2-home-causa.mjs <papel> <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEL = process.argv[2] || 'coordinator';
const ROTULO = process.argv[3] || '17-11';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2hc-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-home-causa-${ROTULO}.json`;
const PORT = 9356;
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
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }) });
      const t = await r.text();
      let js = null; try { js = JSON.parse(t); } catch { ultimo = `HTTP ${r.status} nao-JSON: ${t.slice(0, 80)}`; await new Promise((z) => setTimeout(z, 1500 * (tentativa + 1))); continue; }
      if (!r.ok || !js.access_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(js).slice(0, 160)}`);
      S[PAPEL] = { ...S[PAPEL], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
      writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
      return js;
    } catch (e) {
      ultimo = String(e.message || e).slice(0, 160);
      if (/invalid refresh token/i.test(ultimo)) throw new Error(PAPEL + ': cadeia queimada, é preciso re-mint — ' + ultimo);
      await new Promise((z) => setTimeout(z, 1500 * (tentativa + 1)));
    }
  }
  throw new Error('renova(' + PAPEL + ') esgotou 3 tentativas: ' + ultimo);
};
const sessao = await renova();

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 540 s'), 540000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (!m.id || !pend.has(m.id)) return; const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 75000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 350)); } throw new Error('waitFor: ' + e.slice(0, 110)); };

// O instrumento, montado uma vez por página. Devolve um fecho que recolhe a janela entre dois instantes.
const MONTAR = `(() => {
  window.__HC = { longos: [], muts: [] };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__HC.longos.push({ t0: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { window.__HC.sem_longtask = String(e.message); }
  const caminho = (n) => { let e = n.nodeType === 1 ? n : n.parentElement; while (e && !(e.id && e !== document.body)) e = e.parentElement; return e ? (e.id || e.tagName) : 'body'; };
  const mo = new MutationObserver(rs => { for (const r of rs) window.__HC.muts.push({ t0: Math.round(performance.now()), tipo: r.type, alvo: caminho(r.target) }); });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.__HC.parar = () => { mo.disconnect(); };
  return true;
})()`;

const CLICAR_HOME = `(async (de) => {
  const t0 = performance.now();
  const res0 = performance.getEntriesByType('resource').length;
  const muts0 = window.__HC.muts.length, longos0 = window.__HC.longos.length;
  const antes = window.BFR_APP_RUNTIME?.activeSection ?? null;
  const b = document.querySelector('button[data-section="inicio"]');
  if (!b) return { sem_botao: true };
  b.click();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t_pintura = Math.round(performance.now() - t0);
  const seccao_ja = window.BFR_APP_RUNTIME?.activeSection ?? null;
  // o mesmo teto de 6 s da varredura: «estabilizar» = 2 amostras iguais do maior painel visível
  const candidatos = () => Array.from(document.querySelectorAll('[id$="Panel"], [id$="View"], [id$="Section"], section, main')).filter(e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 50 && r.height > 40 && e.id; });
  const caracteres = () => { let m = null, mc = -1; for (const e of candidatos()) { const c = (e.innerText || '').trim().length; if (c > mc) { mc = c; m = e; } } return { id: m ? m.id : null, c: mc }; };
  let ant = -1, est = 0, ms = 0;
  while (est < 2 && ms < 6000) { await new Promise(r => setTimeout(r, 600)); ms = Math.round(performance.now() - t0); const a = caracteres(); if (a.c === ant && ant >= 0) est++; else est = 0; ant = a.c; }
  const t_estavel = Math.round(performance.now() - t0);
  const res = performance.getEntriesByType('resource').slice(res0).map(r => ({ nome: (r.name || '').replace(/^https?:\\/\\/[^/]+/, '').split('?')[0].slice(0, 70), ini: Math.round(r.startTime - t0), dur: Math.round(r.duration), tipo: r.initiatorType }));
  const longos = window.__HC.longos.slice(longos0);
  const muts = window.__HC.muts.slice(muts0);
  // ancoragem ao clique: o relógio do observador é absoluto (performance.now da página). Sem subtrair t0,
  // «2,2 s até assentar» não se distingue do piso do instrumento (a varredura amostra a cada 600 ms e
  // exige 2 amostras iguais, pelo que 1,2 s são sempre do medidor). Convertidos para relativo, os long
  // tasks e as mutações dizem se há trabalho real depois do piso ou se o platô é só a minha amostragem.
  const rel = (x) => Math.round(x.t0 - t0);
  const longos_r = longos.map((x) => ({ ini: rel(x), d: x.d }));
  const muts_r = muts.map((x) => ({ ini: rel(x), alvo: x.alvo }));
  const por_alvo = {}; muts.forEach(m => { por_alvo[m.alvo] = (por_alvo[m.alvo] || 0) + 1; });
  const t_piso = 1200; // 2 amostras × 600 ms: abaixo disto o «assentou» é do medidor, não da app
  return { de, antes, seccao_apos_segura: caracteres().id, t_pintura, ms_estabilizou: est >= 2, t_estavel, piso_ms: t_piso, trabalho_pos_piso_ms: longos_r.filter(x => x.ini + x.d > t_piso).reduce((a, x) => a + Math.min(x.d, x.ini + x.d - t_piso), 0), mut_pos_piso: muts_r.filter(x => x.ini > t_piso).length, cpu_ms: longos.reduce((a, x) => a + x.d, 0), longos: longos.slice(0, 12), longos_rel: longos_r.slice(0, 12), muts_rel: muts_r.slice(0, 12), n_longos: longos.length, n_mut: muts.length, top_mut: Object.entries(por_alvo).sort((a, b) => b[1] - a[1]).slice(0, 6), rede: res.slice(0, 12), n_rede: res.length };
})`;

const out = { ciclo: 'AH-6-HOME', em: new Date().toISOString(), papel: PAPEL, url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), janela_ms: 6000, cliques: [], contas: { id: conta.id.slice(0, 8) } };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(PAPEL)}`, 75000);
out.boot_ms = await E(`(function(){ const e = performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint'); return { fcp: e ? Math.round(e.startTime) : null, nav: Math.round(performance.now()) }; })()`);
await E(MONTAR);

const OUTRA = PAPEL === 'coordinator' ? 'coordenacao' : 'comunicados';
const cenarios = [
  { nome: 'A_ja_no_inicio', ir_para: 'inicio', clicar: 'inicio' },
  { nome: 'B_de_' + OUTRA, ir_para: OUTRA, clicar: 'inicio' },
  { nome: 'C_volta_rapida', ir_para: OUTRA, clicar: 'inicio' },
];
for (let ronda = 0; ronda < 2; ronda++) {
  for (const c of cenarios) {
    await E(`(() => { const b = document.querySelector('button[data-section="${c.ir_para}"]'); b && b.click(); return !!b; })()`);
    await E(`new Promise(r => setTimeout(r, 2000))`);
    const m = await E(`${CLICAR_HOME}(${JSON.stringify(c.nome + '#' + (ronda + 1))})`);
    m.cenario = c.nome; m.ronda = ronda + 1;
    out.cliques.push(m);
    console.log(`${m.cenario} r${m.ronda}: pintura=${m.t_pintura}ms estavel=${m.t_estavel}ms ${m.ms_estabilizou ? '' : 'NAO-ESTABILIZOU'} cpu=${m.cpu_ms}ms(${m.n_longos}) mut=${m.n_mut} rede=${m.n_rede} pos-piso: trabalho=${m.trabalho_pos_piso_ms}ms mut=${m.mut_pos_piso} seccao=${m.seccao_apos_segura}`);
    if (m.n_mut > 0) console.log('   top mut: ' + JSON.stringify(m.top_mut) + (m.rede.length ? '   rede: ' + m.rede.map((x) => x.nome + '@' + x.ini + '+' + x.dur).slice(0, 4).join(' ') : ''));
  }
  await E(`new Promise(r => setTimeout(r, 1500))`);
}
out.régua_medidor = { amostragem_ms: 600, amostras_para_estavel: 2, piso_ms: 1200, nota: 'abaixo de 1,2 s o «assentou» é do medidor; o trabalho real depois do piso lê-se em trabalho_pos_piso e mut_pos_piso' };
out.resumo = (() => {
  const c = out.cliques.filter((x) => !x.sem_botao);
  const med = (f) => { const v = c.map(f).sort((a, b) => a - b); return v.length ? { mediana: v[Math.floor(v.length / 2)], max: v[v.length - 1] } : null; };
  return { n: c.length, pintura: med((x) => x.t_pintura), estabilizou: med((x) => x.t_estavel), cpu: med((x) => x.cpu_ms), mutacoes: med((x) => x.n_mut), pedidos_rede: med((x) => x.n_rede), trabalho_pos_piso: med((x) => x.trabalho_pos_piso_ms), mut_pos_piso: med((x) => x.mut_pos_piso), nao_estabilizaram: c.filter((x) => !x.ms_estabilizou).map((x) => x.cenario) };
})();
// O veredito tem de dizer o que os números sustentam, não o que a régua esperava. «sem rede e mesmo assim
// 2 s de platô» é o que separa «a app demora» de «a API demora» — e o trabalho depois do piso de 1,2 s é o
// que separa «demora real» de «piso do meu amostrador».
const quentes = out.cliques.filter((c) => !c.sem_botao && c.n_rede === 0);
const comTrabalho = quentes.filter((c) => c.trabalho_pos_piso_ms > 0);
out.veredito = out.resumo.nao_estabilizaram.length ? 'AH2_HOME_CAUSA_INCOMPLETA' : 'AH2_HOME_CAUSA_MEDIDA';
out.diagnostico = `re-render, não rede nem espera do medidor: pintura mediana ${out.resumo.pintura.mediana} ms, platô de estabilização ${out.resumo.estabilizou.mediana} ms com ${out.resumo.pedidos_rede.mediana} pedidos de rede; ${quentes.length} de ${out.cliques.filter((c) => !c.sem_botao).length} cliques sem rede nenhum e ${comTrabalho.length}/${quentes.length} deles com long tasks REAIS depois do piso de 1200 ms do medidor (mediana ${out.resumo.trabalho_pos_piso ? out.resumo.trabalho_pos_piso.mediana : 0} ms de CPU depois do piso, ${out.resumo.cpu.mediana} ms no total do clique)`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\nRESUMO ' + JSON.stringify(out.resumo));
console.log('DIAGNOSTICO: ' + out.diagnostico);
console.log('AH6_HOME_MEDIDO · ' + OUT.split('/').pop());
fecho = true;
abort(0, 'fecho normal');
