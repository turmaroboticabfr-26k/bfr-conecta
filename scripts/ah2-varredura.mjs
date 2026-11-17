// AH-2-V — varredura RM-6.3: os 15 papéis do enum, bootados com conta REAL, nas 2 bandas (390/1280),
// navegando pelas seções que o PRÓPRIO BUNDLE declara para o papel (roleSectionAccess + a tradução
// developer→admin / pedagogical→teacher / social_work→multiprofessional, parseada dos bytes servidos).
// Por que não o DOM: a 390 px todos os [data-section] medem 0×0 com a gaveta fechada — «visível» não
// serve de régua. O AH-1 navegou a secretaria por uma lista de 11 escrita à mão; as 11 declaradas no
// mapa batem com ela, o que valida as duas fontes.
// Aceitação «15×2 com 0 defeitos novos»: defeito novo = painel que não renderiza, erro de console de
// aplicação, ou estouro horizontal. alvo<44 px e fonte<11 px são CONTADOS (são a herança que a
// candidata v126 trata), não novidade. Sem captura de tela: 400 painéis com nomes reais de alunos.
// Uso: node scripts/ah2-varredura.mjs <papeis|TODOS> <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAPEIS_ARG = process.argv[2] || 'TODOS';
const ROTULO = process.argv[3] || 'chunk';
// Banda avulsa: com as duas bandas no mesmo processo, uma 1280 instável esticava a corrida para além do
// teto do chamador e o artefacto ficava sem veredito. «390» ou «1280» no 4.º argumento corre uma só.
const SO_BANDA = process.argv[4] || null;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-varredura-17-11-${ROTULO}.json`;
// As três larguras desktop do §6 do briefing entram como bandas: mesmo instrumento, mesma régua, só
// muda o viewport. Sem banda explícita correm as duas originais (390/1280) para não alterar o que já
// foi comparado.
const TODAS_BANDAS = [{ nome: '390', w: 390, h: 800, mobile: true }, { nome: '1280', w: 1280, h: 900, mobile: false }, { nome: '1366', w: 1366, h: 768, mobile: false }, { nome: '1440', w: 1440, h: 900, mobile: false }, { nome: '1920', w: 1920, h: 1080, mobile: false }];
const BANDAS = SO_BANDA ? TODAS_BANDAS.filter((b) => b.nome === SO_BANDA) : TODAS_BANDAS;
if (!BANDAS.length) throw new Error('ABORTA: banda desconhecida «' + SO_BANDA + '» — só 390 ou 1280');
const TODOS = ['pending', 'parent', 'student', 'pedagogical', 'developer', 'monitor', 'gatekeeper', 'coordinator', 'secretary', 'aee', 'director', 'psychology', 'social_work', 'sports_operator', 'education_supervisor'];
const PAPEIS = PAPEIS_ARG === 'TODOS' ? TODOS : PAPEIS_ARG.split(',');

if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL, { recursive: true });

const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const regua = JSON.parse(readFileSync(`${DIR}/bfr-conecta/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];

// mapa declarado, lido do ar
const ini = shellTxt.indexOf('roleSectionAccess = {');
const bloco = shellTxt.slice(ini + 'roleSectionAccess = '.length, shellTxt.indexOf('};', ini) + 1);
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
// a tradução de rótulo também é lida do bundle, não assumida
const exprTraducao = shellTxt.match(/viewRole\s*=\s*[^;]+?role;/)?.[0] || '';
const TRADUCAO = { developer: 'admin', pedagogical: 'teacher', social_work: 'multiprofessional', psychology: 'psychology' };
const secoesDe = (role) => {
  if (role === 'pending') return [];
  const v = TRADUCAO[role] || role;
  if (v === 'admin') return [...new Set([...MAPA.admin, 'psychology', 'multiprofissional'])];
  return MAPA[v] || MAPA.parent;
};

const renova = async (p) => {
  // O c5 morreu aqui: a beirada devolveu texto plano «upstream request timeout» e o .json() estourou.
  // Se for 5xx/telemetria de beira, o GoTrue provavelmente nem viu o pedido — tentar de novo com o
  // MESMO refresh_token é seguro. Se a cadeia estiver mesmo queimada, o invalid_grant diz logo qual é
  // a conta: as palavras-passe morrem com o mint, por isso uma cadeia perdida significa re-mint, não retry.
  let ultimo = null;
  for (let n = 0; n < 5; n++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[p].refresh_token }), signal: AbortSignal.timeout(45000) });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch { ultimo = `HTTP ${r.status} corpo não-JSON: ${txt.slice(0, 60)}`; await new Promise((rz) => setTimeout(rz, 2000 * (n + 1))); continue; }
      if (!j.access_token) throw new Error(`refresh ${p} HTTP ${r.status} ${JSON.stringify(j).slice(0, 160)} — cadeia de tokens desta conta está queimada, é preciso re-mint`);
      S[p] = { ...S[p], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user };
      writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
      if (n > 0) console.log(`  (renova ${p}: ${n + 1}.ª tentativa depois de «${ultimo}»)`) ;
      return { access_token: j.access_token, token_type: 'bearer', expires_in: j.expires_in, expires_at: j.expires_at, refresh_token: j.refresh_token, user: j.user };
    } catch (err) {
      if (/CADEIA|queimada|invalid_grant/i.test(err.message)) throw err;
      ultimo = err.message; await new Promise((rz) => setTimeout(rz, 2000 * (n + 1)));
    }
  }
  throw new Error(`refresh ${p} falhou 5x (último: ${ultimo})`);
};

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=9352', `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
// O chamador corta chamadas de fundo aos 10 min. Um watchdog que só mata deixa artefacto sem veredito
// (aconteceu em c3b/c3, ambos INCOMPLETO). Aqui a praga é suave: para de abrir bandas novas, o ciclo
// fecha e escreve veredito; o watchdog duro fica como rede de segurança 90 s depois.
let aperta = false;
setTimeout(() => { aperta = true; console.log('PRAGA 470 s: fechar com veredito antes do teto do chamador'); }, 470000);
setTimeout(() => abort(3, 'watchdog 560 s — a árvore do chrome morre aqui'), 560000);
let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch('http://127.0.0.1:9352/json', { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome antes do fim'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws (30 s)')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map();
let consoleErros = [];
let logRede = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErros.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 200));
  if (m.method === 'Runtime.exceptionThrown') consoleErros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
  // O que o console da página não vê: falhas ao nível do browser (pedido ao /auth ou /rest que não
  // chega, DNS, timeout de beira). Foi em Log.entryAdded que o «upstream request timeout» apareceu.
  if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') logRede.push({ fonte: m.params.entry.source, texto: String(m.params.entry.text || '').slice(0, 160), url: String(m.params.entry.url || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0] });
};
// O send sem teto foi como o coordinator/1280 comeu 7 minutos em silêncio: quando a página deixa de
// responder ao CDP (main thread ocupado), o Runtime.evaluate NUNCA resolve e nem o timeout do waitFor
// é avaliado, porque o `await` anterior está pendurado. 25 s por chamada passa a ser uma medição com
// fim, e «o browser não respondeu» passa a ser dado em vez de ausência de dado.
const send = (method, params = {}, ms = 25000) => new Promise((res, rej) => {
  const i = ++seq;
  const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method + ' ' + ms + 'ms')); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
// O app recarrega-se a si mesmo em certos papéis; um evaluate a meio da navegação rejeita com
// «Inspected target navigated or closed». Tolero isso, mas CONTO (portão medições_perdidas) para que a
// tolerância nunca sirva de esconderijo a defeito.
// Navegar deixou de ser invisível: o dev1280 apanhou um 504 «upstream request timeout» na beirada e o
// Page.navigate nunca respondeu. Com send sem teto isso era um hang silencioso; agora é acontecimento
// contado e tentado de novo, e a causa fica no artefacto em vez de ficar atribuída à app.
const navega = async (url, tentativas = 3) => {
  for (let n = 1; n <= tentativas; n++) {
    const t0 = Date.now();
    try { await send('Page.navigate', { url }, 25000); return { tentativas: n, ms: Date.now() - t0, ok: true }; }
    catch (e) {
      if (!/cdp_timeout/.test(String(e && e.message))) throw e;
      console.log(`  Page.navigate sem resposta (${n}/${tentativas}) — ${e.message}`);
      await send('Page.stopLoading', {}, 8000).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000 * n));
    }
  }
  return { tentativas, ok: false, falha: 'nenhuma resposta a Page.navigate em ' + tentativas + ' tentativas' };
};
const transit = (m) => /navigated or closed|target closed|not attached|Cannot find context/i.test(String(m || ''));
const evalJS = async (e, tentativas = 4) => {
  for (let n = 0; n < tentativas; n++) {
    try {
      const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
      return r.result?.value;
    } catch (err) {
      // sem resposta do browser não é «a página navigou»: é o main thread ocupado. Registo como medição
      // perdida e devolvo null — quem chama tem de distinguish null (não sei) de false (não existe).
      if (/cdp_timeout/.test(String(err.message))) { perdidas++; return null; }
      if (transit(err.message) && n < tentativas - 1) { await new Promise((r) => setTimeout(r, 800)); continue; }
      if (transit(err.message)) { perdidas++; return null; }
      throw err;
    }
  }
};
let perdidas = 0;
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v = false; try { v = await evalJS(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 120)); };

const MEDIR = `(async () => {
  const dormir = ms => new Promise(r => setTimeout(r, ms));
  const candidatos = () => Array.from(document.querySelectorAll('[id$="Panel"], [id$="View"], [id$="Section"], section, main')).filter(e => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 50 && r.height > 40 && e.id;
  });
  const caracteresDe = () => { const v = candidatos(); if (!v.length) return { id: null, c: 0 }; let melhor = null, mc = -1;
    for (const e of v) { const c = (e.innerText || '').trim().length; if (c > mc) { mc = c; melhor = e; } } return melhor && mc > 0 ? { id: melhor.id, c: mc } : { id: null, c: 0 }; };
  // Teto 6 s, não 12: com 12 s a banda de 1280 px do coordinator comeu 8 min e 30 s e o watchdog duro
  // matou o processo a meio — sem veredito nem artefacto final. Ultrapassar o teto passa a ser DADO
  // medido (nao_estabilizou) e portão vermelho, que é exatamente o sintoma do §6 do briefing.
  let anterior = -1, estavel = 0, ms = 0; const t0 = Date.now();
  while (estavel < 2 && ms < 6000) { await dormir(600); ms = Date.now() - t0; const a = caracteresDe(); if (a.c === anterior && anterior >= 0) estavel++; else estavel = 0; anterior = a.c; }
  const nao_estabilizou = estavel < 2;
  const alvo = caracteresDe(); const el = alvo.id ? document.getElementById(alvo.id) : null;
  const REGUA = { seccao_ativa: window.BFR_APP_RUNTIME?.activeSection ?? null, papel_apos: window.BFR_CURRENT_PROFILE?.role ?? null, view_apos: window.BFR_APP_RUNTIME?.activeView ?? null, nao_estabilizou, botao_attivo: (document.querySelector('button[data-section].active, .nav-item.active, [data-section][aria-current="page"]')?.dataset || {}).section ?? null };
  // §AI.32: innerWidth dilata-se até ao conteúdo transbordante neste chrome; clientWidth é a banda.
  const estouro = (document.body?.scrollWidth || 0) > (document.documentElement?.clientWidth || 0) + 1;
  if (!el) return { painel: alvo, ms, controles: 0, nos: 0, tap: 0, fonte: 0, cortados: 0, estouro_h: estouro, ...REGUA };
  const ctl = Array.from(el.querySelectorAll('button, input, select, textarea, a, [role="button"]')).filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const taps = ctl.filter(c => { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; });
  const folhas = Array.from(el.querySelectorAll('*')).filter(f => { const d = Array.from(f.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim(); if (!d) return false; const fs = parseFloat(getComputedStyle(f).fontSize); return fs > 0 && fs < 11 && f.getBoundingClientRect().width > 0; });
  const cortados = Array.from(el.querySelectorAll('*')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1); });
  return { painel: alvo, ms, controles: ctl.length, nos: el.querySelectorAll('*').length, tap: taps.length, fonte: folhas.length, cortados: cortados.length, estouro_h: estouro, ...REGUA };
})()`;

const out = { ciclo: 'AH-2-V', em: new Date().toISOString(), tetos: { boot_s: 75, estabilizacao_ms: 6000, cdp_timeout_ms: 25000, praga_s: 470, watchdog_s: 560 }, papeis: PAPEIS, bandas: BANDAS.map((b) => b.nome), url: URL_APP, md5_shell: createHash('md5').update(shellTxt).digest('hex'), mapa_declarado: Object.fromEntries(Object.entries(MAPA).map(([k, v]) => [k, v.length])), traducao_lida_do_bundle: exprTraducao.slice(0, 220), stages: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Page.bringToFront');
const relevantes = () => consoleErros.filter((t) => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource|WebSocket|chunkloaderror/i.test(t));
gate('o ar varrido é a v123 da régua', createHash('md5').update(shellTxt).digest('hex'), regua.htmlMd5);
gate('mapa declarado lido do bundle tem as 14 chaves', Object.keys(MAPA).length, 14);
gate('a tradução de rótulos está no bundle (developer/pedagogical/social_work)', ['developer', 'pedagogical', 'social_work'].every((r) => exprTraducao.includes(r)), true);
gate('secretary declarado = as 11 do ciclo AH-1 (duas fontes batem)', MAPA.secretary, ['inicio', 'secretaria', 'comunicados', 'escola-historia', 'notificacoes', 'conteudos', 'comunicacao', 'chat-interno', 'coordenacao-chat', 'jogos-escolares', 'fotos']);
// nenhum papel pode apontar para seção que nenhum botão atende: a lista tem de ser de strings
gate('todas as seções declaradas são rótulos não vazios', Object.values(MAPA).flat().filter((s) => typeof s !== 'string' || !s).length, 0);

for (const papel of PAPEIS) {
  if (aperta) { (out.faltaram = out.faltaram || []).push(papel); console.log('  (praga) ' + papel + ' não correu nesta chamada'); continue; }
  // Renovação por PAPEL deixava a 2.ª banda com um par de tokens que a 1.ª banda já podia ter girado
  // em silêncio (o app faz refresh sozinho; o GoTrue roda o refresh_token a cada uso). O c7 apanhou
  // isso: a 390 px abriu aos 928 ms, perdeu a classe `ready` a meio, e a 1280 px caiu no login.
  // Agora cada banda entra com um par acabado de emitir e injetado de novo — o app não tem de refreshar.
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await navega(URL_APP);
  await waitFor("!!document.getElementById('loginScreen')", 60000);
  const declaradas = secoesDe(papel);
  out.stages[papel] = { declaradas: declaradas.length, secoes: declaradas };
  for (const banda of BANDAS) {
    if (aperta) { (out.faltaram = out.faltaram || []).push(papel + '/' + banda.nome); continue; }
    const t0_banda = Date.now();
    const sessao = await renova(papel);
    const carimbo = { expira_em_s: sessao.expires_at - Math.floor(Date.now() / 1000), acesso_md5_8: createHash('md5').update(sessao.access_token).digest('hex').slice(0, 8) };
    out.stages[papel]['injecao_' + banda.nome] = carimbo;
    await evalJS(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
    consoleErros = []; logRede = [];
    await send('Emulation.setDeviceMetricsOverride', { width: banda.w, height: banda.h, deviceScaleFactor: 1, mobile: banda.mobile });
    const nav = await navega(URL_APP);
    let ms_ready = null, erro_boot = null;
    const PRONTO = `document.getElementById('appShell')?.classList.contains('ready') || /Aguarde a aprova|ainda está sendo preparado/.test(document.body?.innerText || '')`;
    // Teto de arranque 75 s: 120 s × 2 bandas + walk não cabiam no teto do chamador, e foi assim que o
    // r1 morreu sem veredito. Uma banda que precisa de mais de 75 s já é uma falha para o utilizador.
    if (!nav.ok) erro_boot = 'a própria navegação não respondeu: ' + nav.falha + ' (beirada, não app)';
    else try { ms_ready = await waitFor(PRONTO, 75000); } catch (e) { erro_boot = String(e.message).slice(0, 120); }
    const papelReal = await evalJS(`window.BFR_CURRENT_PROFILE?.role ?? null`);
    // null ≠ «papel errado»: null quer dizer que a página não respondeu. Sem esta linha a banda aparecia
    // como «sessão não reconhecida», que é uma acusação diferente da que os dados sustentam.
    if (papelReal === null && !erro_boot) erro_boot = 'o browser não respondeu ao Runtime.evaluate em 25 s (main thread ocupado)';
    const estado = (await evalJS(`({ entrou: !!document.getElementById('appShell')?.classList.contains('ready'), aviso_pendencia: /Aguarde a aprova|ainda está sendo preparado/.test(document.body?.innerText || ''), login_visivel: !!(document.getElementById('loginScreen')?.offsetWidth || document.getElementById('loginScreen')?.offsetHeight), nav_visiveis: Array.from(document.querySelectorAll('.sidebar .nav-item[data-section], .mobile-more-option[data-section], button[data-section]')).filter(b => !b.hasAttribute('data-teacher-nav-tab') && (b.offsetWidth || b.offsetHeight)).length })`) || { entrou: null, aviso_pendencia: null, login_visivel: null, nav_visiveis: null });
    const r = { nav, ms_ready, erro_boot, estado, papel_da_sessao: papelReal, botoes_no_dom: await evalJS(`[...new Set(Array.from(document.querySelectorAll('button[data-section]')).filter(b=>!b.hasAttribute('data-teacher-nav-tab')).map(b=>b.dataset.section))].length`), peca: {}, sem_botao: [] };
    // Sem shell não há painéis a medir: percorrer as seções de uma banda que não abriu só produz
    // «PAINEL VAZIO» ruidoso e queima ~160 s. O portão «entrou no shell» fica VERMELHO e o registo
    // diz porquê, por omissão explícita em vez de evidência fingida.
    if (erro_boot) r.pula_secoes = 'boot não completou — nada para medir';
    for (const s of erro_boot ? [] : declaradas) {
      // A praga tem de valer também DENTRO do walk: foi uma banda instável a meio que esticou o r1 até
      // ao watchdog duro e me deixou sem veredito. Parar cedo e finalizar vale mais que medir tudo a meio.
      if (aperta) { r.pela_praga = (r.pela_praga || []).concat(s); break; }
      const tinhaBotao = await evalJS(`!!document.querySelector('button[data-section="${s}"]')`);
      if (tinhaBotao === null) { (r.medicoes_perdidas = r.medicoes_perdidas || []).push(s + ':browser sem resposta'); console.log(`  ${papel}/${banda.nome}/${s}: BROWSER SEM RESPOSTA — não sei se há botão`); continue; }
      if (!tinhaBotao) { r.sem_botao.push(s); continue; }
      const viewAntes = await evalJS(`window.BFR_APP_RUNTIME?.activeView ?? null`);
      await evalJS(`(() => { const m = document.querySelector('[data-mobile-more]'); if (m && m.getAttribute('aria-expanded') !== 'true') m.click(); const b = document.querySelector('button[data-section="${s}"]'); b && b.click(); })()`);
      const m = await evalJS(MEDIR);
      if (!m) { (r.medicoes_perdidas = r.medicoes_perdidas || []).push(s); console.log(`  ${papel}/${banda.nome}/${s}: SEM MEDIÇÃO (evaluate não devolveu — navegação ou context perdido)`); continue; }
      m.view_antes = viewAntes;
      r.peca[s] = m;
      // Certas seções trocam de persona por desenho (navigateToSection chama setRole quando o papel
      // real da conta tem permissão: aee para coordinator/director/developer, etc.). Sem restauro,
      // tudo o que viesse a seguir nessa banda seria medido como outra pessoa — era o falso verde.
      if (m.view_apos && viewAntes && m.view_apos !== viewAntes) {
        (r.trocas_de_persona = r.trocas_de_persona || []).push({ secao: s, de: viewAntes, para: m.view_apos, papel_apos: m.papel_apos });
        await evalJS(`window.BFR_APP_RUNTIME?.setRole(${JSON.stringify(viewAntes)})`);
        await evalJS(`new Promise(rz => setTimeout(rz, 800))`);
        m.view_reposta = await evalJS(`window.BFR_APP_RUNTIME?.activeView ?? null`);
        if (m.view_reposta !== viewAntes) (r.restauros_falhados = r.restauros_falhados || []).push({ secao: s, ficou_em: m.view_reposta });
      }
      // régua do app, não a minha: activeSection é o que o próprio navigateToSection declara
      if (m.seccao_ativa && m.seccao_ativa !== s && m.botao_attivo !== s) (r.sem_navegacao = r.sem_navegacao || []).push({ secao: s, ativa: m.seccao_ativa, painel: m.painel.id });
      console.log(`  ${papel}/${banda.nome}/${s}: ${m.painel.c > 0 ? m.painel.id + ' ' + m.painel.c + 'c' : 'PAINEL VAZIO'} ctl=${m.controles} tap<${m.tap} fonte<${m.fonte} ${m.ms}ms${m.nao_estabilizou ? ' NAO-ESTABILIZOU' : ''}${m.estouro_h ? ' ESTOURO-H' : ''}`);
    }
    r.erros_console = relevantes().slice(0, 8);
    r.erros_brutos = consoleErros.length;
    r.log_rede_erros = logRede.length;
    r.log_rede_amostra = logRede.slice(0, 6);
    // só conta os que interessam para autorização/dados: /auth/ e /rest/. O /cdn-cgi/rum da beirada
    // dá 404 em todo o lado e não é sinal de nada.
    r.falhas_api_rede = logRede.filter((x) => /\/auth\/|\/rest\//.test(x.url) || /err_(timed_out|connection|name_not_resolved|internet)/i.test(x.texto)).slice(0, 6);
    r.erros_brutos_amostra = consoleErros.slice(0, 8);
    r.n_erros = relevantes().length;
    r.painel_vazio = Object.entries(r.peca).filter(([, v]) => v.painel.c === 0).map(([k]) => k);
    r.estouro = Object.entries(r.peca).filter(([, v]) => v.estouro_h).map(([k]) => k);
    r.tap_total = Object.values(r.peca).reduce((a, v) => a + v.tap, 0);
    r.fonte_total = Object.values(r.peca).reduce((a, v) => a + v.fonte, 0);
    r.abertas = Object.keys(r.peca).length;
    // O §6 do briefing pergunta POR QUE demora o Home. Isto responde à parte da pergunta que é medida
    // sem tocar na estrutura: quanto tempo o conteúdo continua a mudar depois do clique.
    const instaveis = Object.entries(r.peca).filter(([, v]) => v.nao_estabilizou).map(([k, v]) => k + '@' + v.ms + 'ms');
    r.instaveis = instaveis;
    r.ms_max = Object.values(r.peca).reduce((a, v) => Math.max(a, v.ms), 0);
    r.ms_de_inicio = r.peca.inicio ? r.peca.inicio.ms : null;
    r.seg_banda = Math.round((Date.now() - t0_banda) / 100) / 10;
    if (r.pela_praga) (out.faltaram = out.faltaram || []).push(`${papel}/${banda.nome}: walk parado em ${r.pela_praga[0]}`);
    out.stages[papel][banda.nome] = r;
    gate(`${papel}/${banda.nome}: sessão do papel reconhecida`, papelReal === papel && !erro_boot, true);
    gate(`${papel}/${banda.nome}: 0 erros de console de aplicação`, r.n_erros, 0);
    gate(`${papel}/${banda.nome}: 0 medições perdidas por navegação`, (r.medicoes_perdidas || []).length, 0);
    // corre também nas bandas que não arrancaram: foi precisamente numa dessas que quis ver o pedido
    // que falhou, e o console da página estava limpo porque a falha era ao nível do browser.
    gate(`${papel}/${banda.nome}: 0 falhas de rede em /auth/ ou /rest/`, r.falhas_api_rede, []);
    if (papel === 'pending') {
      gate(`${papel}/${banda.nome}: barreira de pendência visível, sem entrar mudo`, estado.aviso_pendencia && !estado.entrou && estado.login_visivel, true);
      gate(`${papel}/${banda.nome}: nenhuma seção declarada (nada exposto antes da aprovação)`, declaradas.length, 0);
    } else if (erro_boot) {
      // os portões de painel não correm: sem shell, «0 vazios» seria verdade por construção.
      gate(`${papel}/${banda.nome}: o registo diz que o boot não completou`, r.pula_secoes, 'boot não completou — nada para medir');
    } else {
      gate(`${papel}/${banda.nome}: entrou no shell`, estado.entrou, true);
      gate(`${papel}/${banda.nome}: 0 painéis vazios entre as ${Object.keys(r.peca).length} seções abertas`, r.painel_vazio, []);
      gate(`${papel}/${banda.nome}: 0 estouro horizontal`, r.estouro, []);
      gate(`${papel}/${banda.nome}: toda a troca de persona foi desfeita pela API do app`, (r.restauros_falhados || []).length, 0);
      gate(`${papel}/${banda.nome}: 0 seções cujo conteúdo não assenta em 6 s`, r.instaveis, []);
    }
    writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
  }
  await evalJS(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
}
out.portoes = portoes; out.falhas = falhas;
const somas = Object.values(out.stages).flatMap((p) => BANDAS.map((b) => p[b.nome]).filter(Boolean));
// Contagem agnóstica da banda: com as larguras desktop acrescentadas, «bandas: 2» e a lista ['390','1280']
// passariam a mentir sobre o que a corrida mediu.
const nomes_bandas = Object.keys(out.stages).flatMap((p) => Object.keys(out.stages[p]).filter((k) => out.stages[p][k] && out.stages[p][k].peca));
out.medido = { papeis: PAPEIS.length, bandas: [...new Set(nomes_bandas)].length, banda_nomes: [...new Set(nomes_bandas)], paineis_abertos: somas.reduce((a, r) => a + (r.abertas || 0), 0), secoes_sem_botao: Object.fromEntries(Object.entries(out.stages).map(([p, v]) => [p, [...new Set(Object.keys(v).filter((k) => v[k] && v[k].peca).flatMap((b) => v[b].sem_botao || []))]]).filter(([, l]) => l.length)) };
out.medido.completa = !(out.faltaram || []).length;
out.veredito = (falhas.length ? 'AH2_VARREDURA_COM_DEFEITOS' : (out.medido.completa ? 'AH2_VARREDURA_LIMPA' : 'AH2_VARREDURA_PARCIAL'));
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}  painéis: ${out.medido.paineis_abertos}  completa: ${out.medido.completa}`);
if ((out.faltaram || []).length) console.log('  NÃO CORRIDO NESTA CHAMADA: ' + out.faltaram.join(', '));
console.log('seções declaradas sem botão de menu:', JSON.stringify(out.medido.secoes_sem_botao));
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ` (${PAPEIS.join(',')})`);
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
