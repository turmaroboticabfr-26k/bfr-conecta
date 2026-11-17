// AH-2-P — RM-2.7 «Telas populadas com vínculo real medido». A conta pedagogical deste ciclo tem o
// vínculo verdadeiro ligado por bfr_teacher_directory.profile_id a um professor da grade publicada
// (30 aulas, 13 turmas, 3 disciplinas — contado no mint). Não se inventou nenhuma linha de horário.
// Medição tripla, porque «populado» tem de significar a mesma coisa dos três lados:
//   1) SQL: quantas turmas/aulas o vínculo realmente dá;
//   2) runtime: os globais que o próprio app publica (BFR_SECURE_TEACHER_SCOPE / BFR_TEACHER_SCHEDULE);
//   3) DOM: as telas professor-* abertas por clique, com caracteres e controles renderizados.
// Sem capturas de tela: são turmas e listas de alunos reais.
// Uso: node scripts/ah2-professor.mjs <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROTULO = process.argv[2] || '17-11';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2p-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-professor-17-11-${ROTULO}.json`;
const VERSAO = '430db726-8a48-4ec8-a6ff-27e05160a420';
const BANDAS = [{ nome: '390', w: 390, h: 800, mobile: true }, { nome: '1280', w: 1280, h: 900, mobile: false }];
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });

const contas = JSON.parse(readFileSync(`${DIR}/bfr-conecta/evidence/ah2-contas-17-11.json`, 'utf8'));
const ped = contas.contas.find((c) => c.papel === 'pedagogical');
const fix = contas.professor;
if (!ped || !fix) throw new Error('ABORTA: registo de contas sem pedagogical ou sem fixture do professor');
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: 'Bearer ' + readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim(), 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const t = await r.text(); if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t);
};
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const rr = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S.pedagogical.refresh_token }) });
const js = await rr.json();
if (!js.access_token) throw new Error('refresh pedagogical falhou: ' + JSON.stringify(js).slice(0, 160));
S.pedagogical = { ...S.pedagogical, access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');

const out = { ciclo: 'AH-2-P', aceite: 'RM-2.7 — telas do professor populadas com vínculo real', em: new Date().toISOString(), director_profile_id: fix.directory_id.slice(0, 8) + '…', stages: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };

// ═══ 1) SQL: a verdade do vínculo ═══
const grd = (await sql(`select count(*)::int as aulas, count(distinct class_id)::int as turmas, count(distinct subject_id)::int as disciplinas, count(distinct weekday) as dias from public.bfr_schedule_entries where teacher_id='${fix.directory_id}'::uuid and version_id='${VERSAO}';`))[0];
out.stages.sql = grd;
console.log(`[sql] aulas=${grd.aulas} turmas=${grd.turmas} disciplinas=${grd.disciplinas} dias=${grd.dias}`);
gate('o vínculo dá aulas suficientes para as telas terem o que mostrar', grd.aulas >= 20 && grd.turmas >= 5, true);

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=9355', `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 600 s'), 600000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch('http://127.0.0.1:9355/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('ws')), 30000))]).catch((e) => abort(5, String(e)));
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
let perdidas = 0;
const E = async (expression, t = 4) => {
  for (let n = 0; n < t; n++) {
    try { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 260)); return r.result?.value; }
    catch (err) { if (transit(err.message) && n < t - 1) { await new Promise((r) => setTimeout(r, 800)); continue; } if (transit(err.message)) { perdidas++; return null; } throw err; }
  }
};
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 120)); };

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(js)}))`);

for (const banda of BANDAS) {
  consoleErros.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width: banda.w, height: banda.h, deviceScaleFactor: 1, mobile: banda.mobile });
  await send('Page.navigate', { url: URL_APP });
  await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === 'pedagogical'`, 120000);
  const lêEscopo = `(() => { const s = window.BFR_SECURE_TEACHER_SCOPE, t = window.BFR_TEACHER_SCHEDULE, st = window.BFR_SECURE_TEACHER_STATE; const f = (v) => v === undefined ? 'undefined' : v === null ? 'null' : Array.isArray(v) ? 'array:' + v.length : typeof v === 'object' ? 'objeto{' + Object.keys(v).slice(0, 12).join(',') + '}' : String(v).slice(0, 24); return { scope: f(s), schedule: f(t), state: f(st), teacher_id_bate_com_a_fixture: !!(s && (s.teacher_id === '${fix.directory_id}' || s.id === '${fix.directory_id}' || s.teacherId === '${fix.directory_id}')) }; })()`;
  // O `exposeScope()` do bundle (app/index.html:17445) corre dentro de `loadSecureTeacherData`, que só é
  // chamado pelas telas docentes — lê-lo ao boot dava «undefined» e o portão ficava vermelho sem defeito.
  // Leio antes E depois da volta, e o portão vale pelo valor de depois; os dois ficam no artefacto.
  const escopo_antes = await E(lêEscopo);
  const r = { escopo_antes: escopo_antes, peca: {}, sem_botao: [] };
  const decl = ['professor-inicio', 'professor-turmas', 'professor-atividades', 'professor-avaliacoes', 'professor-frequencia', 'professor-agenda', 'professor-agenda-hoje', 'professor-biblioteca', 'professor-comunicacao', 'chat-interno', 'professor-espaco', 'professor-conteudos', 'professor-diario', 'professor-planejamento', 'professor-relatorios', 'professor-calendario', 'professor-notificacoes', 'escola-historia', 'notificacoes', 'conteudos', 'jogos-escolares', 'resultados-aprendizagem'];
  for (const s of decl) {
    const tem = await E(`!!document.querySelector('button[data-section="${s}"]')`);
    if (!tem) { r.sem_botao.push(s); continue; }
    await E(`(() => { const m = document.querySelector('[data-mobile-more]'); if (m && m.getAttribute('aria-expanded') !== 'true') m.click(); const b = document.querySelector('button[data-section="${s}"]'); b && b.click(); })()`);
    const m = await E(`(async () => {
      const dormir = ms => new Promise(r => setTimeout(r, ms));
      const vis = () => Array.from(document.querySelectorAll('[id$="Panel"], [id$="View"], [id$="Section"], section, main')).filter(e => { const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 50 && b.height > 40 && e.id; });
      let melhor = null, mc = -1, ms = 0; const t0 = Date.now(); let anterior = -1, estavel = 0;
      while (estavel < 2 && ms < 12000) { await dormir(600); ms = Date.now() - t0; const v = vis(); let c = 0, id = null; for (const e of v) { const k = (e.innerText || '').trim().length; if (k > c) { c = k; id = e.id; } } if (c === anterior && anterior >= 0) estavel++; else estavel = 0; anterior = c; melhor = id; mc = c; }
      const el = melhor ? document.getElementById(melhor) : null; if (!el) return { painel: { id: null, c: 0 }, ms, controles: 0, itens: 0, linhas: 0, estouro_h: (document.body?.scrollWidth || 0) > window.innerWidth + 1 };
      const ctl = Array.from(el.querySelectorAll('button, input, select, textarea, a, [role="button"]')).filter(c => { const b = c.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
      const grupos = Array.from(el.children).map(c => c.querySelectorAll('*').length);
      return { painel: { id: el.id, c: (el.innerText || '').trim().length }, ms, controles: ctl.length, itens: el.querySelectorAll('article, li, tr, [class*="card"], [class*="item"]').length, linhas: grupos.length, tap: ctl.filter(c => { const b = c.getBoundingClientRect(); return Math.min(b.width, b.height) < 44; }).length, fonte: Array.from(el.querySelectorAll('*')).filter(f => { const d = Array.from(f.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim(); if (!d) return false; const fs = parseFloat(getComputedStyle(f).fontSize); return fs > 0 && fs < 11 && f.getBoundingClientRect().width > 0; }).length, cortados: Array.from(el.querySelectorAll('*')).filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1); }).length, estouro_h: (document.body?.scrollWidth || 0) > window.innerWidth + 1 };
    })()`);
    if (!m) continue;
    r.peca[s] = m;
    console.log(`  ${banda.nome}/${s}: ${m.painel.c}c ctl=${m.controles} itens=${m.itens} tap<${m.tap} fonte<${m.fonte}`);
  }
  r.escopo = await E(lêEscopo);
  const relevantes = consoleErros.filter((t) => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource|WebSocket|chunkloaderror/i.test(t));
  r.erros = relevantes.slice(0, 6); r.n_erros = relevantes.length;
  r.vazias = Object.entries(r.peca).filter(([, v]) => v.painel.c === 0).map(([k]) => k);
  r.estouro = Object.entries(r.peca).filter(([, v]) => v.estouro_h).map(([k]) => k);
  r.abertas = Object.keys(r.peca).length;
  out.stages[banda.nome] = r;
  gate(`professor/${banda.nome}: escopo docente exposto pelo app depois de abrir as telas`, r.escopo && r.escopo.scope && r.escopo.scope !== 'undefined' && r.escopo.scope !== 'null' ? 'exposto' : 'undefined', 'exposto');
  gate(`professor/${banda.nome}: 0 erros de console`, r.n_erros, 0);
  gate(`professor/${banda.nome}: 0 telas professor-* vazias`, r.vazias, []);
  gate(`professor/${banda.nome}: 0 estouro horizontal`, r.estouro, []);
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
}
out.stages.perdidas_por_navegacao = perdidas;
out.stages.sem_botao_docente = out.stages['390'].sem_botao;
out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? 'AH2_PROFESSOR_COM_FALHA' : 'AH2_PROFESSOR_POPULADO';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log('seções docentes sem botão:', JSON.stringify(out.stages.sem_botao_docente));
console.log(out.veredito + ' · ' + OUT.split('/').pop());
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
