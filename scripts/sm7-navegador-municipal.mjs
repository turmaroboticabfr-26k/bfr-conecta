// SM-7-N — ciclo autenticado do MÓDULO 2: serve a CANDIDATA v127 em 127.0.0.1 (nada é publicado),
// entra com uma conta test já existente, clica o botão «Secretaria Municipal», percorre as 10 abas por
// clique real e opera filtros/detalhe/export/PDF, contando o que o backend devolve de facto.
// 0 DDL, 0 publicação, 0 push. Não imprime tokens: só md5 de 8 do access token e o resto da validade.
//
// Uso:  node scripts/sm7-navegador-municipal.mjs <papel> <largura> <rotulo>
//        p.ex.: node scripts/sm7-navegador-municipal.mjs education_supervisor 1366 sup
//              node scripts/sm7-navegador-municipal.mjs secretary 1366 sec-negativo
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync, createReadStream } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import vm from 'node:vm';

const PAPEL = process.argv[2] || 'education_supervisor';
const LARGURA = parseInt(process.argv[3] || '1366', 10);
const ROTULO = process.argv[4] || 'p1';
const ALTO = LARGURA <= 430 ? 800 : 900;
const MOBILE = LARGURA <= 430;

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const RAIZ = `${DIR}/bfr-conecta`;
const V = process.env.SM6_V || '129';
const CANDIDATA = `${RAIZ}/bfr-candidata-v${V}-secretaria-municipal`;
const BASE = `${RAIZ}/bfr-candidata-v121-rotulos-supervisor`;
const OUT = `${RAIZ}/evidence/sm7-municipal-${PAPEL}-${LARGURA}-${ROTULO}.json`;
const PERFIL = `${DIR}/.sm7-chrome-${ROTULO}`;
const PORTA_HTTP = parseInt(process.env.SM7_HTTP || '8913', 10);
const PORTA_CDP = parseInt(process.env.SM7_CDP || '9361', 10);
const SECT = 'secretaria-municipal';
const VIEW_ID = 'bfrMunicipalView';
// Selector construído do lado de Node e interpolado por JSON.stringify: escrito com as aspas
// dentro do template, o delimitador fecha a string injectada antes do fim (SyntaxError no browser).
const SEL_NAV = `.sidebar .nav-item[data-section="${SECT}"], .mobile-more-option[data-section="${SECT}"], button[data-section="${SECT}"]`;
const ABAS = ['painel', 'escolas', 'alunos', 'profissionais', 'pedagogico', 'frequencia', 'processos', 'comunicacao', 'infraestrutura', 'relatorios'];

if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro rótulo');
const html = readFileSync(`${CANDIDATA}/index.html`, 'utf8');
const ANON = (html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
if (!ANON) throw new Error('ABORTA: sem anon key no bundle servido — não se injeta sessão às cegas');
const REF = (html.match(/https:\/\/([a-z0-9]{12,24})\.supabase\.co/) || [])[1];
if (!REF) throw new Error('ABORTA: nenhuma referência de projecto no bundle — a chave de sessão não pode ser adivinhada');
const STORAGE_KEY = `sb-${REF}-auth-token`;
const HOST = `https://${REF}.supabase.co`;
const URL_APP = `http://127.0.0.1:${PORTA_HTTP}/index.html`;

// ── porta livre antes de abrir browser: um Chrome órfão na porta faz esta corrida falar com um morto
function liberta(porta, esperado) {
  const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const pids = new Set();
  for (const linha of String(q.stdout || '').split(/\r?\n/)) {
    if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
    const pid = linha.trim().split(/\s+/).pop();
    if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const p of pids) {
    const dono = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=$pid").Name`], { encoding: 'utf8' });
    const nome = String(dono.stdout || '').trim();
    const nosso = esperado === 'chrome' ? /chrome/i.test(nome) : /node\.exe/i.test(nome);
    if (!nosso) throw new Error(`PORTA ${porta}: o dono (${pid} ${nome || 'desconhecido'}) não é um ${esperado} nosso — não mato, muda-se a porta`);
    spawnSync('taskkill', ['/pid', p, '/t', '/f'], { stdio: 'ignore' });
    console.log(`  porta ${porta}: ${esperado} órfão ${pid} parado`);
  }
  return pids.size;
}
liberta(PORTA_CDP, 'chrome');
liberta(PORTA_HTTP, 'node');

// ── servidor estático da candidata (só leitura do disco; fallback para a pasta-base, que é de onde
//    vêm os assets irmãos que a candidata não duplica)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };
const recursos404 = [];
const servidor = createServer((req, res) => {
  const caminho = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = caminho === '/' ? 'index.html' : caminho.replace(/^\/+/, '');
  for (const dir of [CANDIDATA, BASE]) {
    const f = `${dir}/${rel}`;
    if (existsSync(f) && statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      createReadStream(f).pipe(res);
      return;
    }
  }
  recursos404.push(rel);
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404');
});
await new Promise((r) => servidor.listen(PORTA_HTTP, '127.0.0.1', r));

if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${PERFIL}`,
  '--headless=new', `--window-size=${LARGURA},${ALTO}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
const abort = (c, m) => {
  try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { servidor.close(); } catch {}
  try { grava('PAROU: ' + m); } catch {} // antes de `out` existir o TDZ rebenta, e o catch é o sinal de que não havia nada a gravar
  console.log('PAROU: ' + m); process.exit(c);
};
setTimeout(() => abort(3, 'watchdog 540 s'), 540000);

let targets = [];
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const alvo = targets.find((t) => t.type === 'page');
if (!alvo) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
let fecho = false;
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome antes do fim'); };
await Promise.race([
  new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws (30 s)')), 30000)),
]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map(); const consoleErros = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErros.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 200));
  if (m.method === 'Runtime.exceptionThrown') consoleErros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (e) => {
  // Compila antes de enviar: um delimitador a mais dentro da string injectada rebenta no browser,
  // longe da linha do programa que a escreveu. Aqui o erro aponta para a expressão inteira.
  try { new vm.Script(e); } catch (err) { throw new Error('INJECAO_INVALIDA ' + String(err.message).slice(0, 120) + ' :: ' + e.slice(0, 300)); }
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 260));
  return r.result?.value;
};
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(e)) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 120)); };
const navega = async (u) => { try { await send('Page.navigate', { url: u }); return { ok: true }; } catch (e) { return { ok: false, falha: String(e.message).slice(0, 120) }; } };
// Clique REAL: coordenadas do centro do elemento, com scroll prévio. `element.click()` sintético não
// prova que um humano consegue chegar lá, e é isso que o §10 pergunta. O `elementFromPoint` do ponto
// pedido acompanha cada clique: se o browser entrega outro elemento (uma camada por cima), o resto
// do instrumento tem de o dizer em vez de contar zeros. Comentário fora do template porque dentro
// um backtick fecha o literal — foi assim que se perderam três corridas.
const cliqueReal = async (sel) => {
  // O rect só vale depois de a rolagem ter chegado E de o ponto pertencer ao alvo. Em 390 px (sup390r10)
  // a janela de espera parava no primeiro rect «dentro da janela», que ainda era o rect velho antes do
  // smooth-scroll: um botão a y=779 ficou debaixo da barra fixa do shell e o clique ia para o `SPAN`
  // dessa barra. A régua agora exige as duas coisas, e um rect repetido em três amostras consecutivas
  // antes de disparar o clique.
  const caixa = await evalJS(`(async () => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
    const centro = () => { const r = e.getBoundingClientRect(); return { cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height) }; };
    e.scrollIntoView({ block: 'center', inline: 'center' });
    const t0 = Date.now(); let c = centro(), dentro = false, noAlvo = false, estabil = false, amostras = 0, porCima = null;
    // Duas amostras iguais não chegam: a 430 px o rect parou um instante ainda dentro da cauda do
    // smooth-scroll, o clique saiu para o ponto já deslocado e aterrou na célula do nome em vez do
    // botão «abrir unidade» — o detalhe não abria e a régua acusava a app. Exijo agora trêz amostras
    // consecutivas no mesmo sítio, todas com o alvo por cima.
    let iguais = 0, ult = { cx: -1, cy: -1 };
    while (Date.now() - t0 < 3000) {
      c = centro();
      dentro = c.cx >= 0 && c.cy >= 0 && c.cx < document.documentElement.clientWidth && c.cy < document.documentElement.clientHeight;
      porCima = document.elementFromPoint(c.cx, c.cy);
      noAlvo = !!porCima && (porCima === e || e.contains(porCima));
      amostras++;
      iguais = (c.cx === ult.cx && c.cy === ult.cy) ? iguais + 1 : 0;
      ult = c;
      if (dentro && noAlvo && iguais >= 2) { estabil = true; break; }
      e.scrollIntoView({ block: 'center', inline: 'center' });
      await new Promise((r) => setTimeout(r, 120));
    }
    const cadeia = []; for (let n = porCima; n && cadeia.length < 5; n = n.parentElement) cadeia.push(String(n.tagName) + '.' + String(n.className||'').slice(0,26) + (getComputedStyle(n).position === 'fixed' ? '[fixed ' + Math.round(n.getBoundingClientRect().top) + '+' + Math.round(n.getBoundingClientRect().height) + ']' : ''));
    return { x: c.cx, y: c.cy, w: c.w, h: c.h, visivel: !!(c.w && c.h),
      no_alvo: noAlvo, na_janela: dentro, rect_estavel: estabil, amostras_da_espera: amostras,
      ms_para_chegar_ao_alvo: Date.now() - t0,
      transborda_horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scroll_width: document.documentElement.scrollWidth,
      estilo: (() => { const cs = getComputedStyle(e); const p = e.offsetParent; return { pos: cs.position, top: cs.top, bottom: cs.bottom, offset_parent: p ? String(p.tagName || '') + '.' + String(p.className || '').slice(0, 24) : null }; })(),
      scroll: (() => { const de = document.scrollingElement || document.documentElement; return { alt: de.scrollHeight, janela: de.clientHeight, deslocavel: de.scrollHeight - de.clientHeight > de.clientHeight, transbordado: de.scrollHeight - de.clientHeight }; })(),
      overflow_body: getComputedStyle(document.body).overflow,
      janela: { l: document.documentElement.clientWidth, a: document.documentElement.clientHeight },
      por_cima: porCima ? String(porCima.tagName) + '.' + String(porCima.className).slice(0, 40) : null,
      cadeia_de_quem_esta_por_cima: cadeia }; })()`);
  if (!caixa || !caixa.visivel) return { ok: false, motivo: 'sem elemento visível', sel };
  if (!caixa.na_janela) return { ok: false, motivo: 'alvo fora da janela depois de 3 s de scroll', sel, ...caixa };
  if (!caixa.no_alvo) return { ok: false, motivo: 'outra camada ocupa o centro do alvo depois de 3 s', sel, ...caixa };
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: caixa.x, y: caixa.y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 });
  }
  return { ok: true, ...caixa };
};

// Escrever num campo como um utilizador, não como um script. Duas razões medidas:
// 1) o módulo escuta `change` (sm6-modulo-municipal.txt:560) e o `change` nativo só dispara quando
//    HOUVE edição real; `e.value = x` por script não marca o valor como sujo, e foi por isso que o
//    `dispatchEvent(new Event('change'))` das corridas antigas deixou `estado.busca` vazio e as 6
//    escolas na tela — um filtro que «não filtrava» era o instrumento, não a aplicação;
// 2) o que o §4.2 pede é o gesto («filtros funcionais»), não a minha capacidade de chamar um handler.
// Daqui em diante: foco, selecção, Backspace, `Input.insertText` (commit de IME, marca como editado),
// Enter, e por fim blur. O `estado.busca` do produtor é lido depois, para confirmar que chegou.
const teclaReal = async (key, code, vk) => {
  for (const type of ['rawKeyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
};
const escreveNoCampo = async (sel, termo) => {
  const r = { sel, pedido: termo };
  r.foco = await evalJS(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return {no_field:true}; e.focus(); if(e.select) e.select(); return { ativo: document.activeElement===e, elemento: e.tagName, valor_antes: (e.value||'').slice(0,60) }; })()`);
  if (!r.foco || r.foco.no_field) return { ...r, ok: false, motivo: 'sem campo no DOM' };
  await teclaReal('Backspace', 'Backspace', 8);
  if (termo) await send('Input.insertText', { text: termo });
  r.valor_no_campo = await evalJS(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); return e ? (e.value||'').slice(0,80) : null; })()`);
  await teclaReal('Enter', 'Enter', 13);
  await evalJS(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(e) e.blur(); return true; })()`);
  await new Promise((x) => setTimeout(x, 350));
  r.estado_do_produtor = await evalJS(`(() => { const s = window.BFR_MUNICIPAL?.estado; return { busca: s ? String(s.busca ?? '') : null, tab: s ? s.tab : null }; })()`);
  r.ok = true;
  return r;
};

// ── sessão: renova com o refresh do registo mestre (único escritor nesta corrida) e injeta de novo
const REGISTO = `${DIR}/ah2-sessions.json`;
const S = JSON.parse(readFileSync(REGISTO, 'utf8'));
if (!S[PAPEL]) abort(2, `o registo mestre não tem sessão do papel «${PAPEL}» — não se forja sessão`);
const renova = async () => {
  for (let n = 0; n < 5; n++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000) });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch { continue; }
      if (!j.access_token) throw new Error(`refresh ${PAPEL} HTTP ${r.status} — cadeia queimada, era preciso re-mint (não se faz aqui)`);
      S[PAPEL] = { ...S[PAPEL], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user };
      writeFileSync(REGISTO, JSON.stringify(S, null, 2) + '\n');
      return { access_token: j.access_token, token_type: 'bearer', expires_in: j.expires_in, expires_at: j.expires_at, refresh_token: j.refresh_token, user: j.user };
    } catch (e) { if (/queimada/.test(e.message)) throw e; await new Promise((r) => setTimeout(r, 2000 * (n + 1))); }
  }
  throw new Error('refresh falhou 5 vezes (beirada)');
};

const out = {
  ciclo: 'SM-7-N', programa: 'scripts/sm7-navegador-municipal.mjs', em: new Date().toISOString(),
  // A régua também se firma: sem a pegada do instrumento, um veredito verde não diz qual das versões
  // dele o produziu, e este instrumento mudou três vezes dentro do mesmo dia.
  instrumento_md5: createHash('md5').update(readFileSync(new URL(import.meta.url), 'utf8')).digest('hex'),
  publicacao: false, ddl_aplicada: false, escrita_no_banco: false,
  papel: PAPEL, url_servida: URL_APP, largura: LARGURA, banda_alto: ALTO, mobile: MOBILE,
  candidata_md5: createHash('md5').update(html).digest('hex'),
  // `html.length` contava CARACTERES com o nome de bytes, e a diferença é real: 3 527 189 caracteres
  // contra 3 545 225 bytes no mesmo ficheiro. As duas grandezas vão as duas, cada uma com o seu nome.
  candidata_caracteres: html.length, candidata_bytes: Buffer.byteLength(html),
  o_que_prova: 'a candidata escrita é a que o browser executa: boot real com conta test, clique real no botão «Secretaria Municipal», as 10 abas abertas por clique, e as operações (filtro, detalhe, export, PDF) medidas pelo que o backend devolve.',
  o_que_NAO_prova: 'o app publicado (continua a ser o ar de sempre); o comportamento de utilizadores reais em dispositivo físico; o que o DDL SM4 mudaria no escopo, porque nada foi aplicado.',
  stages: {},
};
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

// Uma corrida que rebenta tem de deixar artefacto: sem ele o vermelho não é prova de nada, e a
// única testemunha ficava a ser o stdout. O handler escreve o estado medido até ao ponto do throw.
const grava = (motivo) => {
  out.veredito = 'SM7_INTERROMPIDA'; out.falha_em = motivo; out.falhas = falhas; out.erros_de_consola = consoleErros.slice(-12);
  out.stages.portoes = portoes;
  try { writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n'); console.log(`artefacto ${OUT}`); } catch {}
};
process.on('uncaughtException', (e) => { grava(String((e && e.stack) || e).slice(0, 500)); process.exit(1); });
process.on('unhandledRejection', (e) => { grava(String((e && e.stack) || e).slice(0, 500)); process.exit(1); });

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTO, deviceScaleFactor: 1, mobile: MOBILE });
await navega(URL_APP);
await waitFor("!!document.getElementById('loginScreen')", 60000);
const sessao = await renova();
const carimbo = { expira_em_s: sessao.expires_at - Math.floor(Date.now() / 1000), acesso_md5_8: createHash('md5').update(sessao.access_token).digest('hex').slice(0, 8) };
out.stages.injecao = carimbo;
await evalJS(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
const nav = await navega(URL_APP);
out.stages.navegacao = nav;
const PRONTO = `document.getElementById('appShell')?.classList.contains('ready')`;
let ms_ready = null, erro_boot = null;
if (!nav.ok) erro_boot = 'a navegação não respondeu: ' + nav.falha;
else { try { ms_ready = await waitFor(PRONTO, 75000); } catch (e) { erro_boot = String(e.message).slice(0, 140); } }
out.stages.ms_ready = ms_ready; out.stages.erro_boot = erro_boot;
out.stages.janela = await evalJS(`({ innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth, dpr: window.devicePixelRatio })`);
out.stages.papel_real = await evalJS(`window.BFR_CURRENT_PROFILE?.role ?? null`);
out.stages.mapa_papel = await evalJS(`(() => { const m = window.BFR_APP_RUNTIME?.roleSectionAccess || {}; const v = window.BFR_CURRENT_PROFILE?.role; return { papel: v ?? null, tem_chave: Object.prototype.hasOwnProperty.call(m, String(v)), declarado: (m[String(v)]||[]).length }; })()`);

// O módulo fabrica a vista e o botão num ciclo próprio de 400 ms, e o `abrir()` do caminho direto
// tem uma porta pequena: `if (!view) return`. Medir antes do registo mede o cronómetro, não a
// aplicação — foi exactamente isso que as duas primeiras corridas fizeram (botoes_nav=0, vista vazia).
// A prédica é a do `garantir()` do produtor, lida sem efeitos: existirem a vista E o botão na sidebar.
let ms_registo = null, erro_registo = null;
const PRONTO_MODULO = `!!document.getElementById(${JSON.stringify(VIEW_ID)}) && !!document.querySelector('.sidebar [data-bfr-municipal-nav]')`;
try { ms_registo = await waitFor(PRONTO_MODULO, 30000); } catch (e) { erro_registo = String(e.message).slice(0, 140); }
out.stages.ms_registo_municipal = ms_registo; out.stages.erro_registo_municipal = erro_registo;
console.log(`registo municipal: ${ms_registo === null ? 'NAO SE REGISTOU em 30 s — ' + erro_registo : ms_registo + ' ms'}`);

if (erro_boot) {
  out.veredito = 'SM7_BOOT_FALHOU';
  out.falhas = falhas; writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  abort(6, 'boot falhou — ver artefacto');
}
gate('papel real da sessão bate o pedido', out.stages.papel_real, PAPEL);
gate('largura de layout = pedida (documentElement.clientWidth, não innerWidth)', out.stages.janela.clientWidth, LARGURA);

// ── sondas do módulo: está registado? o botão existe? a vista existe?
out.stages.modulo = await evalJS(`(() => ({
  runtime_presente: !!window.BFR_MUNICIPAL,
  versao_constante: window.BFR_MUNICIPAL?.SECT ?? null,
  papeis_municipais: window.BFR_MUNICIPAL?.PAPEIS_MUNICIPAIS ?? null,
  apto_para_sessao: window.BFR_MUNICIPAL?.aptoParaSessao ? window.BFR_MUNICIPAL.aptoParaSessao() : null,
  vista_no_dom: !!document.getElementById(${JSON.stringify(VIEW_ID)}),
  botao_nav: Array.from(document.querySelectorAll(${JSON.stringify(SEL_NAV)})).map(b => ({
    classe: String(b.className).slice(0, 40), texto: (b.textContent||'').trim().slice(0,40),
    na_sidebar: !!b.closest('.sidebar'), no_drawer: !!b.closest('.mobile-more-grid,[class*="more"]'),
    visivel: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
    rect: (() => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  })),
  aria_atual_antes: document.querySelector(${JSON.stringify('#' + VIEW_ID)})?.dataset?.munApto ?? null,
}))()`);

// traço no stdout do que decide tudo o que vem a seguir: se o módulo não está montado, os zeros
// das abas são do leitor, não da aplicação — e isso tem de se poder ler sem o artefacto.
const mm = out.stages.modulo;
console.log(`modulo: presente=${mm.runtime_presente} vista_no_dom=${mm.vista_no_dom} botoes_nav=${mm.botao_nav.length} visiveis=${mm.botao_nav.filter((b) => b.visivel).length} papeis=${JSON.stringify(mm.papeis_municipais)} apto=${JSON.stringify(mm.apto_para_sessao)}`);

const aptoEsperado = PAPEL === 'education_supervisor' || PAPEL === 'developer' || PAPEL === 'admin';
// O predido lê-se duas vezes porque o perfil chega mais tarde que o boot: aos olhos do instante da
// sonda o mapa ainda não tem a sessão, e isso é um facto do cronómetro, não o veredicto que o §5.381 pede.
console.log(`aptoParaSessao na sonda: ${JSON.stringify(out.stages.modulo.apto_para_sessao)}`);

// ── o clique real no botão do menu. Em banda mobile o botão vive dentro da gaveta «Mais», e uma
//    gaveta fechada mantém os nós no DOM: por isso o `is-open` verifica-se a cada passo, e não uma
//    só vez. Sem botão (papel sem direito) usa-se o caminho direto, que é exactamente o teste §10.4.
// ── o que está POR CIMA da janela no instante do clique. Um modal tapado a vista inteira faz cada
//    clique real bater nele, e o instrumento leria zeros da aplicação quando são zeros do hit-teste.
//    Foi exactamente assim que a corrida sup1366f passou a ter portões verdes por construção.
out.stages.modal_antes_do_clique = await evalJS(`(() => {
  const abertos = Array.from(document.querySelectorAll('.modal')).filter(m => !m.classList.contains('hidden') && (m.offsetWidth || m.offsetHeight));
  const t = abertos.map(m => ({
    id: m.id || null,
    dataset: Object.keys(m.dataset).join(','),
    texto: (m.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 160),
    fechaveis: Array.from(m.querySelectorAll('.modal-close,[class*=modal-close],[aria-label],[data-close]')).filter(e => !!(e.offsetWidth || e.offsetHeight)).length,
    rotulos_fecho: Array.from(m.querySelectorAll('button,.modal-close')).map(e => (e.textContent || '').trim().slice(0, 24)).filter(Boolean).slice(0, 8),
    cobre_a_janela: (() => { const r = m.getBoundingClientRect(); return r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2; })(),
  }));
  return { n: abertos.length, modais: t };
})()`);
console.log(`modal antes do clique: ${JSON.stringify(out.stages.modal_antes_do_clique).slice(0, 420)}`);

// Se um modal cobre a janela, fecha-se pelo controlo de fecho DELE, por clique real, e volta a
// medir-se: é o que um utilizador faz, e é o que o §6 exige («alternar sem perder contexto»).
out.stages.fecho_do_modal = null;
if (out.stages.modal_antes_do_clique.n > 0) {
  const alvo = await evalJS(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && (x.offsetWidth || x.offsetHeight)); if (!m) return null; const c = Array.from(m.querySelectorAll('.modal-close,[class*=modal-close],[aria-label],[data-close]')).find(e => !!(e.offsetWidth || e.offsetHeight)); if (!c) return { sem_fecho: true }; const r = c.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), rotulo: (c.textContent || c.getAttribute('aria-label') || '').trim().slice(0, 40) }; })()`);
  if (alvo && !alvo.sem_fecho) {
    out.stages.fecho_do_modal = { clique: await cliqueReal('.modal:not(.hidden) .modal-close, .modal:not(.hidden) [aria-label], .modal:not(.hidden) [data-close]'), alvo };
  } else out.stages.fecho_do_modal = alvo || { nenhum_modal_visivel: true };
  out.stages.modal_depois_do_fecho = await evalJS(`Array.from(document.querySelectorAll('.modal')).filter(m => !m.classList.contains('hidden') && (m.offsetWidth || m.offsetHeight)).length`);
  console.log(`fecho do modal: ${JSON.stringify(out.stages.fecho_do_modal).slice(0, 260)} | modais abertos depois=${out.stages.modal_depois_do_fecho}`);
}

const NAV_MEDIDO = `Array.from(document.querySelectorAll(${JSON.stringify(SEL_NAV)})).map(b => ({
  classe: String(b.className).slice(0, 40), texto: (b.textContent||'').trim().slice(0,40),
  na_sidebar: !!b.closest('.sidebar'), no_drawer: !!b.closest('.mobile-more-grid,[class*="more"]'),
  visivel: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
  rect: (() => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
}))`;
let gaveta = null;
const nav_medido = () => out.stages.modulo.botao_nav_com_gaveta_aberta || out.stages.modulo.botao_nav;
// A gaveta «Mais» mantém os nós no DOM enquanto está fechada. Em 390 px (sup390r2) a lista de botões
// foi lida antes de a abrir, os dois nós vieram 0×0 e o instrumento concluiu «papel sem botão» — um
// vermelho meu, medido dentro de um recipiente fechado. Em mobile abre-se primeiro e lê-se depois.
if (MOBILE) {
  gaveta = { antes: await evalJS(`(() => { const g = document.querySelector('.mobile-more-grid')?.closest('[class*="more"],[id]'); const t = document.querySelector('[data-mobile-more]'); return { gaveta_antes: g ? String(g.className) : null, tem_gatilho: !!t, gatilho_visivel: !!(t && (t.offsetWidth || t.offsetHeight)) }; })()`) };
  gaveta.clique_gatilho = await cliqueReal('[data-mobile-more]');
  if (gaveta.clique_gatilho.ok === false) {
    // O gatilho não entrou na janela com scrollIntoView. Antes de chamar isto «defeito do módulo»,
    // pergunta-se ao browser o que segura o elemento: a cadeia de posicionados, o resultado dum
    // scrollTo explícito e o viewport visual. Sem esta sonda, o vermelho não teria dono.
    gaveta.sonda_gatilho = await evalJS(`(async () => {
      const t = document.querySelector('[data-mobile-more]'); if (!t) return { ausente: true };
      const antes = t.getBoundingClientRect();
      window.scrollTo(0, document.body.scrollHeight); document.documentElement.scrollTop = document.body.scrollHeight;
      await new Promise((r) => setTimeout(r, 400));
      const depois = t.getBoundingClientRect();
      const cadeia = []; let n = t;
      while (n && n !== document.documentElement) { const cs = getComputedStyle(n); if (cs.position !== 'static') cadeia.push({ el: String(n.tagName) + '.' + String(n.className).slice(0, 26), pos: cs.position, top: cs.top, bottom: cs.bottom, altura: Math.round(n.getBoundingClientRect().height) }); n = n.parentElement; }
      return { y_antes: Math.round(antes.y), y_depois: Math.round(depois.y), scroll_y: Math.round(window.scrollY),
        visual_viewport: { a: Math.round(window.visualViewport ? window.visualViewport.height : -1), topo: Math.round(window.visualViewport ? window.visualViewport.offsetTop : -1), escala: window.visualViewport ? window.visualViewport.scale : null },
        vh_100: (() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;top:0;height:100vh;visibility:hidden'; document.body.appendChild(d); const h = Math.round(d.getBoundingClientRect().height); d.remove(); return h; })(),
        cadeia_de_posicionados: cadeia.slice(0, 5) }; })()`);
    // Dono do transbordo: a minha entrada é o 11.º item duma barra fixa de 78 px, e pode ser ela a
    // empurrar o «Mais» para fora. Tiram-se só os nós do módulo, re-mede-se o y do gatilho e
    // re-inserem-se — sem isto, a culpa seria atribuída por hipótese.
    // O censo da barra diz QUANTOS itens a lista realmente mostra a 390 px e em que linha cada um
    // cai; é a diferença entre «a barra fixa do shell tem mais itens do que caem na janela» e uma
    // suposição minha sobre o `order` do CSS.
    gaveta.sonda_gatilho.censo_da_barra = await evalJS(`(() => {
      const bar = document.querySelector('aside.sidebar'); if (!bar) return { sem_barra: true };
      const listas = Array.from(bar.children).map((c) => ({ elemento: String(c.tagName) + '.' + String(c.className).slice(0,30), estilo: (() => { const s = getComputedStyle(c); return { display: s.display, colunas: s.gridTemplateColumns, wrap: s.flexWrap, gap: s.gap, altura: Math.round(c.getBoundingClientRect().height) }; })() }));
      const itens = Array.from(bar.querySelectorAll('.nav-item')).map((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return { texto: (b.textContent||'').trim().slice(0,22), seccao: b.dataset.section || b.dataset.mobileMore || null, exibe: s.display, visivel: !!(b.offsetWidth || b.offsetHeight), y: Math.round(r.y), x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; });
      const cs = getComputedStyle(bar);
      return { barra: { top: Math.round(bar.getBoundingClientRect().top), altura: Math.round(bar.getBoundingClientRect().height), pos: cs.position, overflow: cs.overflow }, listas, itens_visiveis: itens.filter((i) => i.visivel), n_itens_no_dom: itens.length }; })()`);
    gaveta.sonda_gatilho.ab_teste_entrada_municipal = await evalJS(`(async () => {
      const meus = Array.from(document.querySelectorAll('[data-bfr-municipal-nav]'));
      const guarda = meus.map((b) => ({ p: b.parentElement, texto: (b.textContent || '').trim().slice(0, 24) }));
      meus.forEach((b) => b.remove());
      await new Promise((r) => setTimeout(r, 350));
      const t = document.querySelector('[data-mobile-more]');
      const y_sem = t ? Math.round(t.getBoundingClientRect().y) : null;
      const altura_barra = Math.round((document.querySelector('aside.sidebar') || document.body).getBoundingClientRect().height);
      const n_itens_sem = document.querySelectorAll('aside.sidebar .nav-item').length;
      window.BFR_MUNICIPAL?.registrar?.();
      await new Promise((r) => setTimeout(r, 350));
      const y_com = t ? Math.round(t.getBoundingClientRect().y) : null;
      return { y_do_gatilho_sem_a_minha_entrada: y_sem, y_do_gatilho_com: y_com, altura_da_barra: altura_barra, itens_na_barra_sem: n_itens_sem, re_inserido: !!document.querySelector('[data-bfr-municipal-nav]') }; })()`);
    console.log(`A/B da entrada municipal: ${JSON.stringify(gaveta.sonda_gatilho.ab_teste_entrada_municipal)}`);
    console.log(`sonda do gatilho «Mais»: ${JSON.stringify(gaveta.sonda_gatilho).slice(0, 420)}`);
  }
  try { await waitFor(`(/is-open|open/.test(String(document.querySelector('.mobile-more-grid')?.closest('[class*="more"]')?.className || '')) || getComputedStyle(document.querySelector('.mobile-more-grid') || document.body).display !== 'none')`, 8000); } catch (e) { gaveta.abriu = false; }
  gaveta.depois = await evalJS(`(() => { const g = document.querySelector('.mobile-more-grid')?.closest('[class*="more"],[id]'); const o = document.querySelector('.mobile-more-option[data-section="${SECT}"]'); return { classe_gaveta: g ? String(g.className).slice(0,60) : null, opcao_visivel: !!(o && (o.offsetWidth || o.offsetHeight)) }; })()`);
  out.stages.modulo.botao_nav_com_gaveta_aberta = await evalJS(NAV_MEDIDO);
}
out.stages.gaveta = gaveta;
const botao = nav_medido().find((b) => b.visivel);
out.stages.clique_nav = botao
  ? await cliqueReal(MOBILE && botao.na_sidebar === false ? `.mobile-more-option[data-section="${SECT}"]` : `.nav-item[data-section="${SECT}"]`)
  : { ok: false, motivo: 'papel sem botão no menu — vai-se pelo caminho direto (teste §10.4)' };
if (!botao) await evalJS(`window.BFR_MUNICIPAL?.abrir?.() || null`);
// Depois do clique espera-se pelo critério do produtor (vista construída: munBuilt OU faixa de
// negação), e o tempo é medido — não um sleep fixo que aprovava um painel que nunca se desenha.
let ms_construcao = null, nao_construiu = false;
try {
  ms_construcao = await waitFor(`(() => { const v = document.getElementById(${JSON.stringify(VIEW_ID)}); if (!v) return false; return v.dataset.munBuilt === '1' || /Acesso não concedido/.test(v.innerText || ''); })()`, 12000);
} catch { nao_construiu = true; }
out.stages.ms_construcao_da_vista = ms_construcao; out.stages.vista_nao_construiu = nao_construiu;
console.log(`construção da vista: ${nao_construiu ? 'NAO CONSTRUIU em 12 s' : ms_construcao + ' ms'}`);
// Um clique que não constrói pode falhar em três sítios diferentes, e a correcção não é a mesma para
// cada um: o hit-teste do rato, o listener delegado do módulo, ou o desenhador. Sobe-se os três
// degraus e mede-se a construção em cada um — é a escada que separa «não se chega ao botão» de
// «o botão não trata» de «trata e não desenha».
const CONSTRUINDO = `(() => { const v = document.getElementById(${JSON.stringify(VIEW_ID)}); if (!v) return false; return v.dataset.munBuilt === '1' || /Acesso não concedido/.test(v.innerText || ''); })()`;
const degraus = {};
if (nao_construiu) {
  degraus.sintetico = await evalJS(`(() => { const b = document.querySelector('.sidebar [data-section=${JSON.stringify(SECT)}]'); if (!b) return { ok: false, motivo: 'sem item na sidebar' }; b.click(); return { ok: true, texto: (b.textContent || '').trim().slice(0, 40) }; })()`);
  try { degraus.ms_sintetico = await waitFor(CONSTRUINDO, 8000); } catch { degraus.sintetico_construiu = false; }
  if (degraus.sintetico_construiu === false) {
    degraus.direto = await evalJS(`(() => { if (!window.BFR_MUNICIPAL?.abrir) return { ok: false, motivo: 'sem BFR_MUNICIPAL.abrir' }; window.BFR_MUNICIPAL.abrir(); return { ok: true }; })()`);
    try { degraus.ms_direto = await waitFor(CONSTRUINDO, 8000); } catch { degraus.direto_construiu = false; }
  }
  out.stages.degraus = degraus;
  console.log(`degraus: ${JSON.stringify(degraus)}`);
}
out.stages.depois_do_clique = await evalJS(`(() => { const v = document.getElementById(${JSON.stringify(VIEW_ID)}); return {
  vista_existe: !!v, oculta: v ? v.classList.contains('hidden') : null,
  munApto: v?.dataset?.munApto ?? null, routed_by: v?.dataset?.municipalRoutedBy ?? null,
  // O flag munBuilt e a presença do contentor separam «desenhar correu» de «o ciclo do boot só
  // pintou o dataset»: é essa a diferença entre um defeito da aplicação e um clique que não chegou,
  // e os zeros sozinhos não a dizem. Comentário sem backticks porque vive dentro de um template.
  built_flag: v?.dataset?.munBuilt ?? null,
  contentor_no_dom: (v?.querySelectorAll('[data-mun-conteudo]') || []).length,
  contentor_global: document.querySelectorAll('[data-mun-conteudo]').length,
  gatilho_do_registro: !!document.querySelector('.sidebar [data-bfr-municipal-nav]'),
  aba_do_estado: (window.BFR_MUNICIPAL?.estado?.tab) ?? null,
  html_cabeca: String(v?.innerHTML || '').slice(0, 180),
  titulo_aba: (v?.querySelector('[data-mun-tab][aria-current="page"]')?.textContent || '').trim().slice(0,40),
  tabs_no_dom: (v?.querySelectorAll('[data-mun-tab]') || []).length,
  chars: (v?.innerText || '').length,
  faixa_negacao: /Acesso não concedido/.test(v?.innerText || ''),
}; })()`);
console.log(`depois do clique: ${JSON.stringify(out.stages.depois_do_clique)}`);
// O portão do direito lê-se aqui, com o perfil já carregado, e guarda o `por` do próprio módulo.
out.stages.apto_depois_do_boot = await evalJS(`(() => { const r = window.BFR_MUNICIPAL?.aptoParaSessao?.() ?? null; return { apto: r ? r.apto : null, por: r ? String(r.por).slice(0,140) : null }; })()`);
gate(`aptoParaSessao() com a sessão carregada = ${aptoEsperado}`, out.stages.apto_depois_do_boot.apto, aptoEsperado);

// ── contadores de chamada ao backend. Colados no PROTÓTIPO do client, porque `get client()` pode
//    devolver uma instância nova a cada leitura: envolvido na instância, os contadores ficariam
//    sempre em zero e o verde da negação seria verdade por construção — o pior verde que há.
out.stages.instrumento_contadores = await evalJS(`(() => {
  const rt = window.BFR_APP_RUNTIME; if (!rt) return { ok: false, motivo: 'sem runtime' };
  const c1 = rt.client, c2 = rt.client;
  window.__sm7 = { de: [], rpc: [], downloads: [], blobs: [], prints: 0, this_preservado: null };
  const proto = Object.getPrototypeOf(c1) || {};
  const onde = typeof proto.from === 'function' ? 'prototipo' : 'instancia';
  // O contador tem de viver na INSTÂNCIA e encaminhar com f.call(this, …). Ligado ao protótipo
  // (bind(proto)), o this interno do supabase-js passa a ser o protótipo, that.rest é undefined
  // e todo client.from() rebenta: o instrumento torna-se a causa do erro que ia registrar.
  const f = onde === 'prototipo' ? proto.from : c1.from;
  c1.from = function (t) { window.__sm7.de.push(t); window.__sm7.this_preservado = this === c1; return f.call(this, t); };
  const g = onde === 'prototipo' ? proto.rpc : c1.rpc;
  if (typeof g === 'function') c1.rpc = function (n, p) { window.__sm7.rpc.push(n); return g.call(this, n, p); };
  const oc = URL.createObjectURL; URL.createObjectURL = (b) => { window.__sm7.blobs.push({ tipo: b?.type, bytes: b?.size }); return oc.call(URL, b); };
  const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__sm7.downloads.push(this.download); return ac.apply(this, arguments); };
  window.print = () => { window.__sm7.prints++; };
  return { ok: true, singleton_do_client: c1 === c2, onde, contador_na_instancia: Object.prototype.hasOwnProperty.call(c1, 'from'), this_preservado_apos_prova: (() => { try { c1.from('schools'); return window.__sm7.this_preservado; } catch (e) { return 'lançou: ' + String(e.message).slice(0, 60); } })() };
})()`);

const contagens = () => evalJS(`(() => ({ de_brutas: window.__sm7.de.slice(), n_de: window.__sm7.de.length, rpc_brutas: window.__sm7.rpc.slice(), n_rpc: window.__sm7.rpc.length, downloads: window.__sm7.downloads.slice(), blobs: window.__sm7.blobs.slice(), prints: window.__sm7.prints, this_preservado: window.__sm7.this_preservado }))()`);

// O primeiro desenho do painel aconteceu ANTES dos contadores estarem colados (abrir() corre-os por
// dentro). Sem limpar a cache do módulo, a aba «painel» seria medida com zero chamadas — um verde por
// temporização e não por comportamento. Limpa-se e volta-se a abrir, e é isso que se conta.
out.stages.cache_limpo_antes_das_abas = null;
if (out.stages.depois_do_clique.munApto === 'sim') {
  out.stages.cache_limpo_antes_das_abas = await cliqueReal(`[data-mun-cache]`);
  await new Promise((r) => setTimeout(r, 500));
}

const estavel = async (expr, teto_ms = 8000) => {
  // amostras iguais duas vezes com 500 ms: «assentou» é o que a casa mede, não um sleep fixo
  const t0 = Date.now(); let ult = null, n = 0;
  while (Date.now() - t0 < teto_ms) { const v = await evalJS(expr); n++; if (ult !== null && JSON.stringify(v) === JSON.stringify(ult)) return { valor: v, amostras: n, ms: Date.now() - t0 }; ult = v; await new Promise((r) => setTimeout(r, 500)); }
  return { valor: ult, amostras: n, ms: Date.now() - t0, nao_assentou: true };
};

const abas = {};
for (const aba of ABAS) {
  if (!out.stages.depois_do_clique.vista_existe || out.stages.depois_do_clique.munApto !== 'sim') { abas[aba] = { saltada: `munApto=${String(out.stages.depois_do_clique.munApto)} — nada é carregado por desenho`, }; continue; }
  const antes = await contagens();
  const cli = await cliqueReal(`[data-mun-tab="${aba}"]`);
  // O `estavel` de duas amostras iguales assentava no ESQUELETO de carregamento (23 caracteres, duas
  // amostras identicas) e media «painel» dez vezes. Espera-se pelo predicate do produtor —
  // estado.carregando sem nenhuma chave a true — e só depois se mede o conteúdo.
  let ms_espera_carregamento = null, carregamento_nao_assentou = false;
  try { ms_espera_carregamento = await waitFor(`(() => { const c = (window.BFR_MUNICIPAL?.estado?.carregando) || {}; return !Object.values(c).some(Boolean); })()`, 15000); }
  catch { carregamento_nao_assentou = true; }
  const med = await estavel(`(() => { const c = document.querySelector('#${VIEW_ID} [data-mun-conteudo]'); return { chars: (c?.innerText||'').length, linhas: (c?.querySelectorAll('tbody tr')||[]).length, cabecalhos: (c?.querySelectorAll('th')||[]).length, botoes: (c?.querySelectorAll('button')||[]).length, campos_filtro: (c?.querySelectorAll('[data-mun-filtro]')||[]).length, cartoes: (c?.querySelectorAll('.mun-card')||[]).length, faixas: Array.from(c?.querySelectorAll('.mun-warn')||[]).map(w=>(w.innerText||'').trim().slice(0,110)), vazia: !!c?.querySelector('.mun-empty'), assinatura: (() => { const s = (c?.innerText||'').replace(/\\s+/g,' ').trim(); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return s.length + ':' + h; })(), aba_do_estado: (window.BFR_MUNICIPAL?.estado?.tab) ?? null, tab_ativa: document.querySelector('#${VIEW_ID} [data-mun-tab][aria-current=\\"page\\"]')?.dataset?.munTab ?? null }; })()`);
  const depois = await contagens();
  abas[aba] = { clique: cli, assentou: !med.nao_assentou, ms_assentamento: med.ms, ms_espera_carregamento, carregamento_nao_assentou, ...med.valor, chamadas_novas: depois.n_de - antes.n_de, tabelas_pedidas: [...new Set(depois.de_brutas.slice(antes.n_de))], rpc_novo: [...new Set(depois.rpc_brutas.slice(antes.n_rpc))] };
  console.log(`  [${aba}] chars=${med.valor.chars} linhas=${med.valor.linhas} cartoes=${med.valor.cartoes} faixas=${med.valor.faixas.length} chamadas=${abas[aba].chamadas_novas} pedidas=${JSON.stringify(abas[aba].tabelas_pedidas)}${med.nao_assentou ? ' NAO ASSENTOU' : ''}`);
}
out.stages.abas = abas;
out.stages.sonda = await evalJS(`({ feita: window.BFR_MUNICIPAL?.sonda?.feita ?? null, executavel: window.BFR_MUNICIPAL?.sonda?.executavel ?? null, nota: String(window.BFR_MUNICIPAL?.sonda?.nota ?? '').slice(0,160), erro: String(window.BFR_MUNICIPAL?.sonda?.erro ?? '').slice(0,160) })`);
out.stages.faixa_escopo = await evalJS(`Array.from(document.querySelectorAll('#${VIEW_ID} .mun-warn')).map(w => (w.innerText||'').trim().slice(0,220))`);
// As chaves de cache do módulo incorporam o texto pesquisado (nomes de alunos), por isso o artefacto
// guarda só a família da chave, o prefixo antes do primeiro underscore: a classe do erro sem o dado.
out.stages.erros_do_modulo = await evalJS(`(() => { const e = (window.BFR_MUNICIPAL?.estado?.erros) || {}; return Object.entries(e).map(([k, v]) => { const familia = String(k).split('_')[0]; return { familia, chave: familia === 'alunos' ? 'alunos_<filtro redigido>' : String(k), erro: String(v).slice(0, 170) }; }); })()`);
// O «reading 'from'» não é do módulo: o produtor só usa c.from.bind(c). Repete-se a mesma query com o
// mesmo cliente e guarda-se a PILHA, que é o único modo de saber em que camada do bundle ela nasce.
out.stages.causa_do_erro_from = await evalJS(`(async () => {
  const c = window.BFR_APP_RUNTIME?.client;
  if (!c || typeof c.from !== 'function') return { sem_cliente: true, tem_from: typeof (c || {}).from };
  const linha = {};
  try { const r = await c.from('students').select('id,official_name').limit(3); linha.ok = true; linha.n = ((r && r.data) || []).length; linha.erro = r && r.error ? String(r.error.message || r.error.code).slice(0, 160) : null; }
  catch (e) { linha.ok = false; linha.mensagem = String((e && e.message) || e).slice(0, 170); linha.pilha = String((e && e.stack) || '').split('\\n').slice(0, 6).map(s => s.trim().slice(0, 150)); }
  return linha;
})()`);
// «schools» respondeu 6 linhas e «students» rebentou na mesma sessão: ou o cliente parti-se no meio,
// ou só certas tabelas falham. Repete-se o mesmo `from` por tabela, tarde, com o mesmo cliente da
// app, e guarda-se a identidade do objecto — é o que discrimina as duas hipóteses.
out.stages.sonda_por_tabela = await evalJS(`(async () => {
  const c = window.BFR_APP_RUNTIME?.client;
  if (!c || typeof c.from !== 'function') return { sem_cliente: true, tem_from: typeof (c || {}).from };
  const TABELAS = ['schools', 'students', 'classes', 'staff_schools', 'grades', 'supervision_requests', 'announcements'];
  const linhas = [];
  for (const t of TABELAS) {
    const r = { tabela: t };
    try { const x = await c.from(t).select('id').limit(1); r.ok = true; r.n = ((x && x.data) || []).length; r.erro = x && x.error ? String(x.error.message || x.error.code).slice(0, 130) : null; }
    catch (e) { r.ok = false; r.mensagem = String((e && e.message) || e).slice(0, 140); }
    linhas.push(r);
  }
  return { linhas, cliente: { construtor: (c.constructor && c.constructor.name) || null, tem_rest: typeof c.rest, chaves: Object.keys(c).slice(0, 14) } };
})()`);
console.log(`erros do módulo: ${JSON.stringify(out.stages.erros_do_modulo).slice(0, 300)}`);
console.log(`causa do erro from: ${JSON.stringify(out.stages.causa_do_erro_from).slice(0, 420)}`);
console.log(`sonda por tabela: ${JSON.stringify(out.stages.sonda_por_tabela).slice(0, 700)}`);
// O cache é a única origem possível dos números impressos, e «Erro anterior» vive em estado.erros para
// sempre: sem esta medição não se sabe se uma linha vem de uma chamada limpa ou de uma entrada que
// rebentou. É a diferença entre «números reais» (§4.1) e «números de origem desconhecida» (§11).
out.stages.cache_do_modulo = await evalJS(`(() => { const c = (window.BFR_MUNICIPAL?.cache) || {}; return Object.entries(c).map(([k, v]) => ({ familia: String(k).split('_')[0], linhas: Array.isArray(v && v.linhas) ? v.linhas.length : null, total: (v && v.total) ?? null, tem_erro: !!(v && v.erro), escolas_distintas: (v && v.escolasDistintas) ?? null })); })()`);
const cache_partido = (out.stages.cache_do_modulo || []).filter((e) => e.tem_erro && (e.linhas || 0) > 0);
console.log(`cache do módulo: ${JSON.stringify(out.stages.cache_do_modulo).slice(0, 500)}`);
if (aptoEsperado) {
  gate('nenhum número impresso vem de uma entrada de cache com erro', cache_partido, []);
  gate('pelo menos uma entrada do cache tem linhas sem erro', (out.stages.cache_do_modulo || []).filter((e) => !e.tem_erro && (e.linhas || 0) > 0).length > 0, true);
}

// ── operações reais, só quando o papel tem a área aberta
const ops = {};
// Esperar por «innerText com alguma coisa» não prova que a aba NOVA foi desenhada: o contentor da aba
// anterior já tem texto, e em 390 px (sup390r3) foi assim que `exports` apanhou zero botões e `print`,
// dezasseis milissegundos depois, apanhou o botão da mesma barra. Lê-se o estado do produtor.
const esperaAba = async (id, ms = 10000) => {
  const sonda = `(() => ({ tab: window.BFR_MUNICIPAL?.estado?.tab ?? null, contentor: !!document.querySelector('#${VIEW_ID} [data-mun-conteudo]'), botoes_export: document.querySelectorAll('#${VIEW_ID} [data-mun-export]').length }))()`;
  try { const m = await waitFor(`window.BFR_MUNICIPAL?.estado?.tab === ${JSON.stringify(id)} && !!document.querySelector('#${VIEW_ID} [data-mun-conteudo]')`, ms); return { ms: m, ...(await evalJS(sonda)) }; }
  catch { return { ms: null, nao_assentou: true, ...(await evalJS(sonda)) }; }
};
// Um clique que não troca de aba é defeito ou é temporização? Para não responder por suposição, dá-se
// um segundo toque como o utilizador daria e guarda-se o estado do produtor em cada tentativa.
const irParaAba = async (id) => {
  const uma = { toque: 1, clique: await cliqueReal(`[data-mun-tab="${id}"]`) };
  uma.espera = await esperaAba(id, 8000);
  if (uma.espera.ms !== null) return { tentativas: [uma], assentou: true };
  const duas = { toque: 2, clique: await cliqueReal(`[data-mun-tab="${id}"]`) };
  duas.espera = await esperaAba(id, 8000);
  return { tentativas: [uma, duas], assentou: duas.espera.ms !== null };
};
if (out.stages.depois_do_clique.munApto === 'sim') {
  ops.navegacao_escolas = await irParaAba('escolas'); await estavel(`document.querySelector('#${VIEW_ID} [data-mun-conteudo]')?.innerText.length > 0`, 8000);
  // A régua conta linhas SEM a banda de vazio: o produtor desenha «Sem escolas devolvidas por este
  // acesso» dentro de um `<tr><td colspan=7>` da mesma tabela, por isso `tbody tr` nunca chega a zero
  // — contar o tronco daria verde a um filtro que não filtra e vermelho a um filtro que filtra.
  // O filtro mede-se pelos dois lados: primeiro um termo que não existe em parte nenhuma tem de deixar
  // a lista vazia, depois o nome real de uma escola tem de deixar só linhas que contêm esse nome.
  const LINHAS_REAIS = `Array.from(document.querySelectorAll('#${VIEW_ID} [data-mun-conteudo] tbody tr')).filter(r => !r.querySelector('.mun-empty'))`;
  const CAMPO_BUSCA = `#${VIEW_ID} [data-mun-filtro="busca"]`;
  const sondaLista = `(() => { const ls = (${LINHAS_REAIS}); const c=document.querySelector('#${VIEW_ID} [data-mun-conteudo]'); return { linhas_reais: ls.length, nomes: ls.map(l => ((l.querySelector('td b')?.innerText)||'').trim().slice(0,44)).slice(0,12), banda_vazia: !!document.querySelector('#${VIEW_ID} [data-mun-conteudo] .mun-empty'), texto_banda: (document.querySelector('#${VIEW_ID} [data-mun-conteudo] .mun-empty')?.innerText||'').slice(0,90), chars: (c?.innerText||'').length }; })()`;
  ops.escolas_sem_filtro = await evalJS(sondaLista);
  // O termo digitado é o nome INTEIRO da primeira linha, lido da lista antes de qualquer filtro: é o
  // produtor que diz o que casa (`name.includes(busca)`), e um prefixo lembrado por mim não prova nada.
  const primeiro_nome = await evalJS(`(() => { const b = (${LINHAS_REAIS})[0]?.querySelector('td b'); return (b?.innerText||'').trim(); })()`);
  ops.filtro_inexistente = await escreveNoCampo(CAMPO_BUSCA, 'zzqqx-nada-assim');
  let ms_inexistente = null;
  try { ms_inexistente = await waitFor(`(${LINHAS_REAIS}).length === 0 && !!document.querySelector('#${VIEW_ID} [data-mun-conteudo] .mun-empty')`, 6000); } catch { ms_inexistente = null; }
  ops.filtro_inexistente.assentou_em_ms = ms_inexistente;
  ops.filtro_inexistente.medido = await evalJS(sondaLista);
  ops.filtro_nome = await escreveNoCampo(CAMPO_BUSCA, primeiro_nome);
  let ms_nome = null;
  try { ms_nome = await waitFor(`(${LINHAS_REAIS}).length >= 1 && (${LINHAS_REAIS}).length < (${String(ops.escolas_sem_filtro.linhas_reais)}) && (${LINHAS_REAIS}).every(r => ((r.querySelector('td b')?.innerText)||'').toLowerCase().includes(${JSON.stringify(String(primeiro_nome).toLowerCase())}))`, 6000); } catch { ms_nome = null; }
  ops.filtro_nome.assentou_em_ms = ms_nome;
  ops.escolas_depois_filtro = await evalJS(`(() => { const ls = (${LINHAS_REAIS}); const termo = ${JSON.stringify(String(primeiro_nome).toLowerCase())}; return { linhas_reais: ls.length, nomes: ls.map(l => ((l.querySelector('td b')?.innerText)||'').trim().slice(0,44)), todas_contem_o_termo: ls.length > 0 && ls.every(l => (((l.querySelector('td b')?.innerText)||'').toLowerCase().includes(termo))), menos_que_antes: ls.length < (${String(ops.escolas_sem_filtro.linhas_reais)}), banda_vazia: !!document.querySelector('#${VIEW_ID} [data-mun-conteudo] .mun-empty') }; })()`);
  ops.filtro_limpo = await escreveNoCampo(CAMPO_BUSCA, '');
  let ms_limpo = null;
  try { ms_limpo = await waitFor(`(${LINHAS_REAIS}).length === (${String(ops.escolas_sem_filtro.linhas_reais)})`, 6000); } catch { ms_limpo = null; }
  ops.filtro_limpo.assentou_em_ms = ms_limpo;
  ops.escolas_depois_de_limpar = await evalJS(sondaLista);
  // O portão de escrita: para cada um dos três gestos, exige-se que o campo tenha recebido o foco,
  // que a aplicação tenha ficado com `estado.busca` igual ao termo que eu dactilografei (vazio no
  // limpar). É isto que separa «o filtro da app não funciona» de «eu bati no sítio errado».
  ops.escritas = [['filtro_inexistente', 'zzqqx-nada-assim'], ['filtro_nome', primeiro_nome], ['filtro_limpo', '']]
    .map(([k, esperado]) => ({ escrita: k, esperado, obtido: ops[k]?.estado_do_produtor?.busca ?? null, foco: ops[k]?.foco?.ativo ?? null, ok: ops[k]?.ok === true }));
  ops.escritas_emErro = ops.escritas.filter((l) => l.ok !== true || l.foco !== true || (l.esperado === '' ? !!l.obtido : l.obtido !== l.esperado));
  // Clique REAL na linha e espera pelo critério do produtor: a leitura síncrona a seguir a `click()`
  // apanhava o contentor ainda com o desenho da lista, e dava `h3: ""` / `tem_volta: false` — que é o
  // defeito de quem mede, não o da aplicação, e foi assim que o detalhe ficou por provar.
  ops.detalhe = { clique: await cliqueReal(`[data-mun-escola]`) };
  let ms_detalhe = null;
  try { ms_detalhe = await waitFor(`!!document.querySelector('#${VIEW_ID} [data-mun-volta]') && /resumo da unidade/i.test(document.querySelector('#${VIEW_ID} [data-mun-conteudo]')?.innerText||'')`, 8000); } catch { ms_detalhe = null; }
  ops.detalhe.assentou_em_ms = ms_detalhe;
  ops.detalhe.medido = await evalJS(`(() => { const c=document.querySelector('#${VIEW_ID} [data-mun-conteudo]'); return c ? { tem_volta: !!c.querySelector('[data-mun-volta]'), h3: (c.querySelector('h3')?.innerText||'').slice(0,64), chars: (c.innerText||'').length, cartoes: c.querySelectorAll('.mun-card').length, tabela: !!c.querySelector('table tbody tr') } : { contentor: false }; })()`);
  ops.volta = { clique: await cliqueReal(`[data-mun-volta]`) };
  let ms_volta = null;
  try { ms_volta = await waitFor(`!document.querySelector('#${VIEW_ID} [data-mun-volta]') && (${LINHAS_REAIS}).length >= 1`, 8000); } catch { ms_volta = null; }
  ops.volta.assentou_em_ms = ms_volta;
  ops.volta.medido = await evalJS(sondaLista);
  ops.navegacao_relatorios = await irParaAba('relatorios'); await estavel(`document.querySelector('#${VIEW_ID} [data-mun-conteudo]')?.innerText.length > 0`, 8000);
  ops.exports = await evalJS(`(() => { const bs=Array.from(document.querySelectorAll('#${VIEW_ID} [data-mun-export]')); bs.forEach(b=>b.click()); return { botoes: bs.map(b=>b.dataset.munExport), n: bs.length }; })()`);
  await new Promise((r) => setTimeout(r, 700));
  ops.print = await evalJS(`(() => { const p=document.querySelector('#${VIEW_ID} [data-mun-print]'); if(!p) return {ok:false}; p.click(); return {ok:true}; })()`);
  ops.contadores_finais = await contagens();
}
out.stages.operacoes = ops;

// ── a negação, medida quando o papel NÃO tem direito: zero leituras de tabela, zero abas montadas
if (!aptoEsperado) {
  // As sondas de diagnóstico acima chamam client.from() directamente, com o token autenticado, para
  // dizer se o cliente responde. Isso é comportamento do INSTRUMENTO, não do módulo: sem zerar aqui,
  // o portão «negação não lê nenhuma tabela» coraria pelas minhas próprias sondas. O que se mede a
  // partir daqui é só o que o clique no menu fez.
  out.stages.zeramento_antes_da_negacao = await evalJS(`(() => { if (!window.__sm7) return { zerado: false }; const n = window.__sm7.de.length; window.__sm7.de.length = 0; window.__sm7.rpc.length = 0; return { zerado: true, leituras_descontadas: n }; })()`);
  out.stages.negacao = {
    painel: out.stages.depois_do_clique.faixa_negacao,
    munApto: out.stages.depois_do_clique.munApto,
    botao_no_menu: nav_medido().filter((b) => b.visivel).length,
    botoes_no_dom: nav_medido().length,
    // Com a visibilidade governada pelo módulo, o clique real deixa de existir para este papel: o painel
    // medido aqui foi montado por `BFR_MUNICIPAL.abrir()` chamado direto, que é justamente a rota
    // municipal invocada sem passar pelo menu (§10.4). Guardar o caminho distingue as duas entradas.
    caminho: botao ? 'clique no menu' : 'BFR_MUNICIPAL.abrir() chamado direto',
    rotulos_nav: nav_medido().map((b) => ({ texto: b.texto.slice(0, 24), visivel: b.visivel })),
    contadores: await contagens(),
    tabs_no_dom: out.stages.depois_do_clique.tabs_no_dom,
    chars: out.stages.depois_do_clique.chars,
  };
  gate('papel sem direito não tem botão visível no menu', out.stages.negacao.botao_no_menu, 0);
  gate('negação mostra a faixa de acesso não concedido', out.stages.negacao.painel, true);
  gate('negação não monta nenhuma aba', out.stages.negacao.tabs_no_dom, 0);
  gate('negação não lê nenhuma tabela', out.stages.negacao.contadores.n_de, 0);
  gate('a raiz municipal nunca se marca como apta para este papel', out.stages.negacao.munApto, 'nao');
}

out.stages.console_erros = consoleErros.slice(0, 20);
out.stages.recursos_404 = { n: recursos404.length, nomes: [...new Set(recursos404)].slice(0, 12) };
// O total de portões fecha-se na escrita, não aqui: esta linha existia no meio do ficheiro e os 26
// portões seguintes (os dos cliques, dos exports, das operações) nunca entravam no artefacto — em
// 18/11 o stdout dizia «portões=31» e o JSON gravava 5, que é exactamente o género de divergência
// que faz alguém acusar o produto com base numa contagem minha parada a meio.

// Dois portões que faltavam, e sem eles a corrida sup1366f deu verde a mais:
// (1) cada clique tem de aterrar no elemento pedido — um modal por cima transforma cliques reais
//     em nada, e o resto do instrumento passa a medir o painel dez vezes;
// (2) as dez abas têm de mostrar dez conteúdos diferentes — «chars >= 40» não distingue isso.
const cliques_sem_alvo = [];
const registra_clique = (nome, c) => {
  if (!c) return;
  if (c.ok === true && c.no_alvo === false) cliques_sem_alvo.push({ clique: nome, por_cima: c.por_cima });
  // Um clique que desiste porque o alvo nunca entrou na janela, ou porque uma camada fixa lhe tapa o
  // centro, também não aterrou. Desde que a espera passou a exigir as duas coisas, nenhum `ok:true`
  // chega com `no_alvo:false` — o que aparece aqui é `ok:false` com um dos dois motivos, e os dois
  // pertencem a este portão (em 390 px é a barra `ASIDE.sidebar` do shell que os produz).
  if (c.ok === false && /fora da janela|outra camada/.test(String(c.motivo || ''))) cliques_sem_alvo.push({ clique: nome, motivo: c.motivo, y: c.y, por_cima: c.por_cima, cadeia: c.cadeia_de_quem_esta_por_cima, janela: c.janela });
};
registra_clique('nav', out.stages.clique_nav);
registra_clique('cache', out.stages.cache_limpo_antes_das_abas);
for (const a of ABAS) registra_clique('aba:' + a, abas[a]?.clique);
gate('todo clique real aterrou no elemento pedido (sem camada por cima)', cliques_sem_alvo, []);
// Verificação do PRÓPRIO instrumento: um contador que parte o this do cliente fabrica um defeito na
// app e um vermelho alheio. A prova chama client.from() com o contador colado e exige that===instância.
gate('o contador do instrumento preserva o this do cliente', out.stages.instrumento_contadores.this_preservado_apos_prova, true);
// Os dois portões abaixo falam das dez abas montadas, e uma sessão sem direito não monta nenhuma:
// correram-nos no caso negativo (sec129) e deram dois vermelhos que descreviam o instrumento, não a
// app. A régua não foi aliviada — passou a declarar o caso a que se aplica, e o caso negativo tem os
// seus próprios portões em `if (!aptoEsperado)`.
if (aptoEsperado) {
  gate('cada aba mostra a própria vista: estado.tab bate com a aba pedida', ABAS.filter((a) => abas[a]?.aba_do_estado !== a), []);
  gate('as dez abas mostram conteúdos distintos', [...new Set(ABAS.map((a) => abas[a]?.assinatura))].length, ABAS.length);
}
gate('0 erros de consola', consoleErros.length, 0);

if (aptoEsperado) {
  gate('as dez abas estão no DOM', out.stages.depois_do_clique.tabs_no_dom, 10);
  gate('a entrada do menu está alcançável para este papel (em mobile, com a gaveta aberta)', nav_medido().filter((b) => b.visivel).length > 0, true);
  gate('a vista fica visível após o clique', out.stages.depois_do_clique.oculta, false);
  gate('nenhuma aba ficou por montar', ABAS.filter((a) => !abas[a]?.chars || abas[a]?.chars < 40), []);
  gate('nenhuma aba foi medida no esqueleto de carregamento', ABAS.filter((a) => abas[a]?.carregamento_nao_assentou === true), []);
  gate('nenhuma aba assentou em mais de 8 s', ABAS.filter((a) => abas[a]?.nao_assentou === true || (abas[a]?.ms_assentamento ?? 0) > 8000), []);
  gate('as faixas que aparecem são só as esperadas (erro de escopo/sonda), nunca erro de sintaxe', ABAS.flatMap((a) => abas[a]?.faixas || []).filter((f) => /Unexpected|SyntaxError|is not a function/.test(f)), []);
  // O «nenhuma aba ficou por montar» por chars passa com um painel que só mostra a faixa de erro: é
  // conteúdo, mas não são dados. Este portão exige que a aba carregue, não que a aba exista.
  gate('nenhuma aba mostra banda de erro de carregamento', ABAS.filter((a) => (abas[a]?.faixas || []).some((f) => /Erro anterior|Falha ao carregar/.test(f))), []);
  gate('o cliente responde para todas as tabelas que o módulo usa', ((out.stages.sonda_por_tabela || {}).linhas || []).filter((l) => l.ok !== true).map((l) => l.tabela), []);
  gate('exportar produz pelo menos um ficheiro com bytes', (ops.contadores_finais?.blobs || []).some((b) => b.bytes > 0), true);
  // Sem este portão, um `exports: {n: 0}` lido na aba errada passava por «a app não exporta»: as duas
  // abas das operações têm de estar montadas antes de se clicar em qualquer botão delas.
  gate('as abas das operações montaram-se depois do toque', ['navegacao_escolas', 'navegacao_relatorios'].filter((k) => ops[k]?.assentou !== true), []);
  gate('o PDF chama window.print()', (ops.contadores_finais?.prints || 0) > 0, true);
  // ── §4.2: a lista de escolas tem de responder ao filtro pelos dois lados, e o detalhe de uma
  // unidade tem de abrir e fechar por clique real. Sem estes portões, «o filtro funciona» era uma
  // frase minha sobre um `input` que eu próprio disparava, e o detalhe media-se no esqueleto.
  gate('o filtro com termo inexistente não deixa linhas reais na lista', ops.filtro_inexistente?.medido?.linhas_reais, 0);
  gate('o filtro com termo inexistente mostra a banda de vazio', ops.filtro_inexistente?.medido?.banda_vazia, true);
  gate('o filtro com o nome real deixa só linhas que contêm esse nome', ops.escolas_depois_filtro?.todas_contem_o_termo, true);
  gate('o filtro com o nome real estreita a lista', ops.escolas_depois_filtro?.menos_que_antes, true);
  gate('limpar o filtro devolve a lista toda', ops.escolas_depois_de_limpar?.linhas_reais, ops.escolas_sem_filtro?.linhas_reais);
  gate('o detalhe da escola abre por clique real', ops.detalhe?.assentou_em_ms !== null && ops.detalhe?.assentou_em_ms !== undefined, true);
  gate('o detalhe mostra o nome da unidade e não uma faixa de erro', ops.detalhe?.medido?.h3 && /unidade/i.test(ops.detalhe.medido.h3), true);
  gate('a volta ao lista devolve linhas por clique real', ops.volta?.assentou_em_ms !== null && ops.volta?.assentou_em_ms !== undefined, true);
  // Antes de acusar a aplicação de «não filtrar», prova-se que a escrita chegou ao estado do próprio
  // módulo: sem esta linha, um `insertText` que não apanhasse foco daria o mesmo vermelho que um
  // filtro partido, e eu estaria a chamar defeito ao produto por causa do meu gesto.
  gate('o teclado do instrumento chegou ao campo de busca (estado.busca do módulo bate o termo)', ops.escritas_emErro, []);
}
out.stages.portoes = portoes;
out.veredito = falhas.length ? 'SM7_COM_DEFEITOS' : (aptoEsperado ? 'SM7_MUNICIPAL_FUNCIONANDO' : 'SM7_NEGACAO_CORRETA');
out.falhas = falhas;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nVEREDITO ${out.veredito}  portões=${portoes} falhas=${falhas.length}`);
for (const f of falhas) console.log('  ' + f);
console.log(`artefacto ${OUT}`);
fecho = true; try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { servidor.close(); } catch {}
process.exit(0);
