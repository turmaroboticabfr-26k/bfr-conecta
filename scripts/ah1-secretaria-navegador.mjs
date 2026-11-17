// AH-1-N — ciclo autenticado da aba Secretaria: boot REAL de secretary no ar v123 (390 px), navegação
// pelas 11 seções por clique real nos botões [data-section], medição por painel assente (chars, controles,
// nós, tap<44, fonte<11, cortado, estouro, ms) e censo vivo do RM-2.1 (MutationObserver 30 s no menu
// autenticado). Sessão lida de ah1-session.json e injetada pela CDP; nada de token na conversa.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = 'sb-yyzqoxlkcvqpessypfjo-auth-token';
const PORT = 9351;
const PERFIL = `${DIR}/.ah1-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah1-secretaria-navegador-17-11.json`;
const EVID = `${DIR}/bfr-conecta/evidence`;
const SECOES = ['inicio', 'secretaria', 'comunicados', 'escola-historia', 'notificacoes', 'conteudos', 'comunicacao', 'chat-interno', 'coordenacao-chat', 'jogos-escolares', 'fotos'];

const S = JSON.parse(readFileSync(`${DIR}/ah1-session.json`, 'utf8'));
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL, { recursive: true });
if (!existsSync(EVID)) mkdirSync(EVID, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`,
  '--headless=new', '--window-size=390,800', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
], { stdio: 'ignore' });
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
setTimeout(() => abort(3, 'watchdog 480 s — a árvore do chrome morre aqui'), 480000);

let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}
const page = targets.find(t => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome antes do fim'); };
await Promise.race([
  new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout do handshake ws (30 s)')), 30000)),
]).catch(e => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map();
const consoleErros = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    consoleErros.push((m.params.args || []).map(a => String(a.value ?? a.description ?? '')).join(' ').slice(0, 220));
  if (m.method === 'Runtime.exceptionThrown')
    consoleErros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 220));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
  return r.result?.value;
};
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(e)) return Date.now() - t0; await new Promise(r => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 140)); };
const shot = async (nome) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(s.data, 'base64');
  const caminho = `${EVID}/${nome}.png`;
  writeFileSync(caminho, buf);
  return { caminho: caminho.split('/').pop(), bytes_ficheiro: statSync(caminho).size, md5: createHash('md5').update(buf).digest('hex') };
};

const out = { ciclo: 'AH-1-N', em: new Date().toISOString(), url: URL_APP, largura: 390, secoes_esperadas: SECOES, stages: {} };
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

// ═══ boot real da conta secretary ═══
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: URL_APP });
await waitFor(`!!document.getElementById('loginScreen')`, 60000);
const expira_em = S.expires_at - Math.floor(Date.now() / 1000);
gate('token ainda vivo (' + expira_em + ' s)', expira_em > 120, true);
const sessao = { access_token: S.access_token, token_type: 'bearer', expires_in: Math.max(expira_em, 60), expires_at: S.expires_at, refresh_token: S.refresh_token, user: S.user };
await evalJS(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
out.stages.ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === 'secretary'`, 120000);
console.log('[n] ready em ' + out.stages.ms_ready + ' ms');
out.stages.papel = await evalJS(`window.BFR_CURRENT_PROFILE?.role ?? null`);
gate('papel real da sessão = secretary', out.stages.papel, 'secretary');

// ═══ recon do menu: botões [data-section] visíveis e o estado do «Mais» ═══
out.stages.recon_menu = await evalJS(`(() => {
  const botoes = Array.from(document.querySelectorAll('button[data-section]')).map(b => ({
    secao: b.dataset.section, texto: (b.textContent || '').trim().slice(0, 40),
    visivel: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
    rect: (() => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  }));
  const mais = document.querySelector('[data-mobile-more]');
  return {
    n_botoes: botoes.length,
    botoes,
    mais: mais ? { presente: true, visivel: !!(mais.offsetWidth || mais.offsetHeight || mais.getClientRects().length) } : { presente: false },
    sidebar_visivel: Array.from(document.querySelectorAll('nav, aside, [class*="sidebar"], [class*="drawer"]')).filter(e => e.offsetWidth > 0).map(e => (e.className || '').toString().slice(0, 60)),
  };
})()`);
const secEncontradas = new Set(out.stages.recon_menu.botoes.map(b => b.secao));
out.stages.secoes_sem_botao_no_recon = SECOES.filter(s => !secEncontradas.has(s));

// ═══ medição das 11 seções ═══
// Navegação: clique real no botão [data-section] quando ele existe no DOM; para as seções cujo botão
// o app NÃO renderiza em lado nenhum (escola-historia, coordenacao-chat — achado: seções do mapa do
// papel sem entrada de menu no bundle v123), a via é a API pública do próprio app que os botões usam:
// window.BFR_APP_RUNTIME.navigate(secao) === navigateToSection(secao). Não é setRole nem função interna.
const MEDIR = `(async () => {
  const dormir = ms => new Promise(r => setTimeout(r, ms));
  const candidatos = () => Array.from(document.querySelectorAll('[id$="Panel"], [id$="View"], [id$="Section"], section, main')).filter(e => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 50 && r.height > 40 && e.id;
  });
  const caracteresDe = () => {
    const visiveis = candidatos();
    if (!visiveis.length) return { id: null, c: 0 };
    let melhor = null, melhorC = -1;
    for (const e of visiveis) {
      const c = (e.innerText || '').trim().length;
      if (c > melhorC) { melhorC = c; melhor = e; }
    }
    return melhor && melhorC > 0 ? { id: melhor.id, c: melhorC } : { id: null, c: 0 };
  };
  let anterior = -1, estavel = 0, ms = 0;
  const t0 = Date.now();
  while (estavel < 2 && ms < 20000) {
    await dormir(700); ms = Date.now() - t0;
    const atual = caracteresDe();
    if (atual.c === anterior && anterior >= 0) estavel++; else estavel = 0;
    anterior = atual.c;
  }
  const alvo = caracteresDe();
  const el = alvo.id ? document.getElementById(alvo.id) : null;
  if (!el) return { chegou: true, painel: alvo, ms, assentou: estavel >= 2, erro: 'painel sem elemento' };
  const controles = Array.from(el.querySelectorAll('button, input, select, textarea, a, [role="button"]')).filter(c => {
    const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });
  const taps = controles.filter(c => { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; });
  const folhas = Array.from(el.querySelectorAll('*')).filter(f => {
    const direto = Array.from(f.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (!direto) return false;
    const cs = getComputedStyle(f); const fs = parseFloat(cs.fontSize);
    return fs > 0 && fs < 11 && f.getBoundingClientRect().width > 0;
  });
  const cortados = Array.from(el.querySelectorAll('*')).filter(e => {
    const r = e.getBoundingClientRect(); return r.width > 0 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1);
  });
  return {
    chegou: true, painel: alvo, ms, assentou: estavel >= 2,
    controles: controles.length, nos: el.querySelectorAll('*').length,
    tap_menor_44: taps.length,
    taps_amostra: taps.slice(0, 12).map(t => ({ tag: t.tagName, cls: (t.className || '').toString().slice(0, 40), texto: (t.textContent || '').trim().slice(0, 24), rect: (() => { const r = t.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() })),
    fonte_menor_11: folhas.length,
    fontes_amostra: folhas.slice(0, 12).map(f => ({ tag: f.tagName, cls: (f.className || '').toString().slice(0, 40), texto: (f.textContent || '').trim().slice(0, 30), px: parseFloat(getComputedStyle(f).fontSize) })),
    cortados: cortados.length,
    estouro_body: document.body.scrollWidth > window.innerWidth + 1 || document.body.scrollHeight > window.innerHeight + 1,
  };
})()`;
const abrirPorAPI = async (secao) => {
  const r = await evalJS(`(() => {
    if (window.BFR_APP_RUNTIME && typeof window.BFR_APP_RUNTIME.navigate === 'function') {
      window.BFR_APP_RUNTIME.navigate(${JSON.stringify(secao)});
      return { api: true, activeSection: window.BFR_APP_RUNTIME.activeSection ?? null };
    }
    return { api: false };
  })()`);
  await evalJS(`new Promise(r => setTimeout(r, 1200))`);
  return r;
};
out.stages.abas = {};
let inicioRef = null;
for (const secao of SECOES) {
  const viaAPI = ['escola-historia', 'coordenacao-chat'].includes(secao);
  const antes = await evalJS(`(() => {
    const btn = document.querySelector('button[data-section="${secao}"]:not([data-teacher-nav-tab])');
    if (!btn) return { achou: false };
    const mais = document.querySelector('[data-mobile-more]');
    const drawerAberto = mais ? mais.getAttribute('aria-expanded') === 'true' : null;
    btn.click();
    return { achou: true, drawerAberto, visivelAntes: !!(btn.offsetWidth || btn.offsetHeight || btn.getClientRects().length) };
  })()`);
  if (!antes?.achou && !viaAPI) { out.stages.abas[secao] = { chegou: false, motivo: 'botão [data-section] não encontrado e seção não está na lista da API' }; continue; }
  let viaApiRet = null;
  if (viaAPI) viaApiRet = await abrirPorAPI(secao);
  const r = await evalJS(MEDIR);
  r.antes_clique = antes;
  r.via_api = viaApiRet;
  r.navegacao = viaAPI ? 'BFR_APP_RUNTIME.navigate (API pública do app; a seção não tem botão de menu renderizado no v123)' : 'clique real em [data-section]';
  out.stages.abas[secao] = r;
  console.log(`  ${secao}: ${r.chegou && r.painel ? r.painel.id + ' ' + r.painel.c + 'c / ' + r.controles + ' ctl / tap<' + r.tap_menor_44 + ' / fonte<' + r.fonte_menor_11 + ' / ' + r.ms + ' ms' : 'NÃO CHEGOU'}${viaAPI ? ' [API]' : ''}`);
  gate(`${secao}: painel com conteúdo`, r.chegou && r.painel && r.painel.c > 0, true);
  if (secao === 'inicio') inicioRef = r.painel;
  if (viaAPI && inicioRef) gate(`${secao}: a navegação pela API não deixou a página no início (c=${r.painel?.c} vs ${inicioRef.c}, id=${r.painel?.id} vs ${inicioRef.id})`, !(r.painel?.c === inicioRef.c && r.painel?.id === inicioRef.id), true);
}
out.stages.sec_final = await evalJS(`(() => {
  const presentes = new Set(Array.from(document.querySelectorAll('button[data-section]')).map(b => b.dataset.section));
  return { presentes: [...presentes].sort(), sem_botao: ${JSON.stringify(SECOES)}.filter(s => !presentes.has(s)) };
})()`);
gate('no fim do ciclo só escola-historia e coordenacao-chat seguem sem botão de menu', out.stages.sec_final.sem_botao, ['escola-historia', 'coordenacao-chat']);

// ═══ censo vivo RM-2.1 com sessão autenticada (menu armado) ═══
await evalJS(`document.querySelector('button[data-section="inicio"]:not([data-teacher-nav-tab])')?.click()`);
await evalJS(`new Promise(r => setTimeout(r, 1500))`);
out.stages.rm21_censo = await evalJS(`(async () => {
  const dormir = ms => new Promise(r => setTimeout(r, ms));
  const alvos = {}; const tipos = {};
  const obs = new MutationObserver(muts => { for (const m of muts) {
    const a = (m.target.nodeName || '#text') + (m.target.id ? '#' + m.target.id : '') + (m.target.className && typeof m.target.className === 'string' ? '.' + String(m.target.className).split(' ')[0] : '');
    alvos[a] = (alvos[a] || 0) + 1; tipos[m.type] = (tipos[m.type] || 0) + 1;
  } });
  obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  const t0 = Date.now();
  await dormir(30000);
  obs.disconnect();
  return {
    janela_s: (Date.now() - t0) / 1000,
    mutacoes: Object.values(alvos).reduce((a, b) => a + b, 0),
    por_alvo: alvos, por_tipo: tipos,
    papel: window.BFR_CURRENT_PROFILE?.role ?? null,
    seccao_ativa: (document.querySelector('button[data-section].active')?.dataset?.section) ?? null,
  };
})()`);
console.log('  censo RM-2.1 autenticado: ' + out.stages.rm21_censo.mutacoes + ' mutações em ' + out.stages.rm21_censo.janela_s + ' s');

out.stages.capturas = {
  inicio: await shot('ah1-secretaria-inicio-390'),
  comunicados: await shot('ah1-secretaria-comunicados-390'),
  conteudos: await shot('ah1-secretaria-conteudos-390'),
};
const relevantes = consoleErros.filter(t => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource/i.test(t));
out.stages.erros_console = { bruto: consoleErros.length, relevantes: relevantes.slice(0, 15) };
console.log('  erros de console relevantes: ' + relevantes.length);
gate('sem erro de aplicação no console', relevantes.length, 0);

out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? 'AH1_NAVEGADOR_PAROU' : 'AH1_SECRETARIA_MEDIDA';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(out.veredito);
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
