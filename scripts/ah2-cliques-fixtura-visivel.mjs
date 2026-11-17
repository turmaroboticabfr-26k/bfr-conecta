// Porque este programa existe: `ah2-cliques.mjs` abriu o painel «Contas e cargos» com a sessão real de
// `developer` e parou — a conta-alvo era uma `@bfr-conecta.test` e a política RESTRITIVA
// `profiles_hide_test_accounts` retira-a do SELECT de qualquer um que não seja ela própria. Medido em
// `evidence/ah2-sonda-limite-17-11e.json`: o developer vê **10 de 24** perfis (`content-range: 0-9/10`),
// e aqui (re-lido do `pg_policies` no portão 2) a prédica é `(id = auth.uid()) OR (email !~~ '%@bfr-conecta.test'
// AND email !~~ 'bfr.qa.email.%')`. As duas saídas que o relatório escreveu eram (a) mudar o cargo de uma
// conta real e reverter, ou (b) criar uma fixtura fora do domínio escondido e apagá-la no fim. Nada de
// conta real é tocado: este programa faz (b), com a fixtura criada por mim, um só ALTER de papel pelo
// painel, o papel revertido pelo mesmo caminho e a conta apagada antes do fim.
// O que se prova NÃO é que a função existe (existe: `set_profile_role`, SECURITY DEFINER, medido no recon
// de RM-1.2) — é que **o rato e o teclado de um developer real a invocam**, porque o único pedido a
// `rpc/set_profile_role` tem de aparecer depois do `keydown`, com o corpo que o app constrói.
// 0 DDL, 0 deploy, 0 publicação. Tokens e senha nunca entram no repositório: o portão final lê o artefacto
// escrito e exige 0 ocorrências deles.
// Uso: node scripts/ah2-cliques-fixtura-visivel.mjs <rótulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const ROTULO = process.argv[2] || 'fv1';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2fv-chrome-profile`;
const PORT = parseInt(process.env.AH2_PORT || '9355', 10);
const OUT = `${DIR}/bfr-conecta/evidence/ah2-cliques-fixtura-visivel-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const md5 = (s) => createHash('md5').update(s).digest('hex');
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(60000) });
  const t = await r.text(); if (!r.ok) throw new Error('sql HTTP ' + r.status + ' ' + t.slice(0, 300)); return JSON.parse(t);
};
const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, { ...init, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) }, signal: AbortSignal.timeout(45000) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 200) }; }
  return { status: r.status, j };
};
const md5tab = async () => (await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from public.profiles) x;`))[0].h;
const md5papel = async () => (await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select id, role, full_name from public.profiles) x;`))[0].h;
const papelDe = async (id) => (await sql(`select role::text as r from public.profiles where id='${id}'::uuid;`))[0]?.r ?? null;

const out = { ciclo: 'AH-CLIVES-FIXTURA-VISIVEL', autoriza: 'Aceitaçao «todos» de 17/11 para AG-6b (RM-1.2), com fixtura criada e apagada por este programa', em: new Date().toISOString(), rotulo: ROTULO, largura: 1280, stages: {}, portoes: 0, falhas: [] };
let portoes = 0; const falhas = [];
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };
const escreve = () => { out.portoes = portoes; out.falhas = falhas; out.em_fim = new Date().toISOString(); writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n'); console.log('ESCRITO: ' + OUT.split('/').pop()); };

// A fixtura não pode casar com nenhum dos dois padrões escondidos pela política — e a afirmação é medida
// por SQL com o `like` do próprio Postgres, não por mim a olhar para a string.
const sufixo = randomBytes(3).toString('hex');
const EMAIL = `ah2f-rm12-${sufixo}@bfr-conecta.midicao`;
const NOME = `AH2F RM-1.2 fixtura (apagar) ${sufixo}`;
const SENHA = randomBytes(18).toString('base64url');
const UID = randomUUID();

let chrome = null, fecho = false, fixturaCriada = false, papelOriginal = null;
const limpa_fissura = async (motivo) => {
  if (!fixturaCriada) return;
  const dele = await admin('/auth/v1/admin/users/' + UID, { method: 'DELETE' });
  const aindaPerfil = (await sql(`select count(*)::int as n from public.profiles where id='${UID}'::uuid;`))[0].n;
  let pelo_sql = false;
  if (aindaPerfil > 0) { await sql(`delete from public.profiles where id='${UID}'::uuid;`); pelo_sql = true; }
  const sobra = (await sql(`select count(*)::int as n from public.profiles where id='${UID}'::uuid;`))[0].n + (await sql(`select count(*)::int as n from auth.users where id='${UID}'::uuid;`))[0].n;
  out.stages.limpeza = { motivo, delete_auth_http: dele.status, perfil_apos_delete_auth: aindaPerfil, apagada_por_sql: pelo_sql, linhas_restantes_da_fissura: sobra };
  console.log(`LIMPEZA (${motivo}): auth DELETE=${dele.status} profiles_apos=${aindaPerfil} sql=${pelo_sql} restante=${sobra}`);
};
const parar = async (codigo, motivo) => {
  clearTimeout(watchdog);
  try { await limpa_fissura(motivo); } catch (e) { out.stages.limpeza = { erro: String(e.message || e).slice(0, 200) }; }
  try { if (chrome) spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  if (codigo !== 0) out.veredito = 'PAROU: ' + motivo;
  try { escreve(); } catch {}
  // O `process.exit` imediato rebentava numa asserção do libuv no Windows (handle async ainda a
  // fechar pelo taskkill), e o código de saída ficava 127 — ilegível como veredito.
  try { await new Promise((r) => setTimeout(r, 300)); } catch {}
  console.log('PAROU: ' + motivo); process.exit(codigo);
};
const abort = (c, m) => { void parar(c, m); };
const watchdog = setTimeout(() => abort(3, 'watchdog 480 s'), 480000);
process.on('uncaughtException', (e) => { out.erro = String(e && e.message || e).slice(0, 260); abort(2, 'uncaughtException: ' + out.erro); });
process.on('unhandledRejection', (e) => { out.erro = String((e && e.message) || e).slice(0, 260); abort(2, 'unhandledRejection: ' + out.erro); });

// ═══ S0: a política, lida do ar ═══
// A vista `pg_policies` (não `pg_policy`: esta última não tem `relname`, e foi assim que a primeira
// corrida morreu, antes de qualquer escrita — ver o artefacto `-fv1`, que não tem nenhum portão medido).
const pol = (await sql(`select policyname as polname, tablename as relname, case when permissive = 'PERMISSIVE' then 'PERMISSIVA' else 'RESTRITIVA' end as tipo, qual as using_ from pg_policies where policyname='profiles_hide_test_accounts';`))[0];
out.stages.politica = pol;
gate('a política existe e é RESTRITIVA', pol?.tipo, 'RESTRITIVA');
const esconde_test = /bfr-conecta\.test/.test(pol?.using_ || ''), esconde_qa = /bfr\.qa\.email\./.test(pol?.using_ || '');
gate('a política esconde os dois domínios medidos', [esconde_test, esconde_qa], [true, true]);
const casa = await sql(`select ('${EMAIL}' like '%@bfr-conecta.test') as escondida_test, ('${EMAIL}' like 'bfr.qa.email.%') as escondida_qa;`);
gate('a fixtura NÃO casa com nenhum dos dois padrões (medido por SQL, não por mim)', casa[0], { escondida_test: false, escondida_qa: false });

// ═══ S1: baseline ═══
const baseline = { profiles_n: (await sql(`select count(*)::int as n from public.profiles;`))[0].n, auth_n: (await sql(`select count(*)::int as n from auth.users;`))[0].n, md5_tabela: await md5tab(), md5_papel: await md5papel() };
out.stages.baseline = baseline;
gate('nenhuma fixtura deste programa antes de eu a criar', (await sql(`select count(*)::int as n from public.profiles where email like 'ah2f-rm12-%';`))[0].n, 0);

// ═══ S2: criar a fixtura e medir a sua visibilidade ═══
const criado = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ id: UID, email: EMAIL, password: SENHA, email_confirm: true, data: { full_name: NOME } }) });
if (![200, 201].includes(criado.status)) { out.stages.create = { status: criado.status, corpo: JSON.stringify(criado.j).slice(0, 200) }; await parar(1, 'mint da fixtura falhou HTTP ' + criado.status); }
fixturaCriada = true;
const linhaPerfil = (await sql(`select id, role::text as r, full_name, email from public.profiles where id='${UID}'::uuid;`))[0];
papelOriginal = linhaPerfil?.r ?? null;
out.stages.fissura = { id: UID.slice(0, 8), email: EMAIL, papel_ao_criar: papelOriginal, perfil_linhas: linhaPerfil ? 1 : 0 };
gate('o gatilho criou 1 linha em profiles', linhaPerfil ? 1 : 0, 1);
gate('papel herdado no create é parent (a régua é o ar medido em §AH.2, não a memória)', papelOriginal, 'parent');
const com_fissura = { md5_papel: await md5papel(), profiles_n: baseline.profiles_n + 1 };
out.stages.baseline_com_fissura = com_fissura;

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const rr = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S.developer.refresh_token }), signal: AbortSignal.timeout(45000) });
const js = await rr.json();
if (!js?.access_token) await parar(1, 'refresh developer falhou HTTP ' + rr.status);
S.developer = { ...S.developer, access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
const DEV_ID = S.developer.id;
const irmatest = (await sql(`select id from public.profiles where email like 'ah2-parent-%@bfr-conecta.test' order by created_at desc limit 1;`))[0];

const rest = async (id) => {
  const r = await fetch(`${HOST}/rest/v1/profiles?id=eq.${id}&select=id,role,email`, { headers: { apikey: ANON, Authorization: `Bearer ${js.access_token}` }, signal: AbortSignal.timeout(30000) });
  const t = await r.text(); let n = null; try { n = JSON.parse(t).length; } catch {}
  return { http: r.status, linhas: n, range: r.headers.get('content-range') };
};
const vFissura = await rest(UID), vIrma = irmatest ? await rest(irmatest.id) : null;
out.stages.visibilidade_rls = { fixtura_fora_do_dominio: vFissura, irma_test_do_ciclo: vIrma, content_range_antes: baseline.profiles_n + ' perfis no banco' };
gate('a fixtura é visível ao developer pela RLS (1 linha)', vFissura.linhas, 1);
gate('a irmã `@bfr-conecta.test` continua invisível (0 linhas) — é isto que bloqueava o `ah2-cliques.mjs`', vIrma?.linhas, 0);

// ═══ S3: browser com sessão real de developer ═══
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page'); if (!page) await parar(1, 'sem alvo page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('ws')), 30000))]).catch((e) => abort(5, 'handshake: ' + String(e.message || e)));
let seq = 0; const pend = new Map(); const rpcs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(p.method + ': ' + m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.requestWillBeSent' && /\/rest\/v1\/rpc\/set_profile_role/.test(m.params.request.url)) rpcs.push({ quando: Date.now(), metodo: m.params.request.method, corpo: m.params.request.postData || null });
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 260)); return r.result?.value; };
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 120)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const clica = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
const tecla = async (key, vk) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const SEL = `[data-role-profile="${UID}"] select[data-profile-role]`;

await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000).catch(() => {});
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(js)}))`);
await send('Page.navigate', { url: URL_APP });
await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === 'developer'`, 120000);

// ═══ S3a: fechar o modal de primeiro acesso A TOQUE, como faria um dedo ═══
// Causa medida da corrida `-fv3`: no ponto do select o `elementFromPoint` devolveu `DIV.modal` (z=1300, por
// cima dos 1200 da navegação). A conta recém-criada abre o modal de nome preferido, e enquanto ele cobre a
// página nenhum toque real chega ao painel — os `.click()` de JavaScript que abrem a secção passam por cima
// dele precisamente porque não são um toque. Fechar pelo `.modal-close` do próprio modal é o caminho que os
// instrumentos já usam (`ah2-sonda-gaveta.mjs:109-112`), e fica portado.
const modal = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); if (!m) return { existe: false }; const b = m.querySelector('.modal-close'); if (!b) return { existe: true, id: m.id || null, sem_boto_de_fecho: true }; const r = b.getBoundingClientRect(); return { existe: true, id: m.id || null, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
out.stages.modal_inicial = modal;
if (modal.existe && modal.x !== undefined && modal.w > 0 && modal.h > 0) { await clica(modal.x, modal.y); await dorme(700); }
const modal_agora = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? { id: m.id || null, texto: (m.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 60) } : null; })()`);
out.stages.modal_depois_do_toque = modal_agora;
gate('o modal de primeiro acesso não cobre a página depois de um toque no seu próprio ×', modal_agora, null);
if (modal.existe && modal_agora) { fecho = true; try { ws.close(); } catch {} await parar(2, 'modal de primeiro acesso resiste ao toque no .modal-close — nada é clicável por baixo'); }
await E(`(() => { document.querySelector('[data-admin-shortcut]')?.click(); const b = document.querySelector('button[data-section="administracao"]'); b && b.click(); })()`);
await waitFor('!!document.querySelector("#roleManagementPanel")', 60000);
await waitFor(`!!document.querySelector(${JSON.stringify(SEL)})`, 60000).catch(() => {});
const painel = await E(`(() => {
  const rows = Array.from(document.querySelectorAll('[data-role-profile]'));
  const meu = document.querySelector(${JSON.stringify(SEL)});
  const minha = document.querySelector('[data-role-profile="' + ${JSON.stringify(DEV_ID)} + '"] select[data-profile-role]');
  const r = meu ? meu.getBoundingClientRect() : null;
  return { linhas: rows.length, alvo_presente: !!meu, caixa: r ? { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height) } : null,
    valor: meu ? meu.value : null, opcoes: meu ? Array.from(meu.options).map(o => o.value) : [],
    developer_na_lista: !!minha, developer_desabilitado: minha ? minha.disabled : null };
})()`);
out.stages.painel = painel;
gate('o painel renderiza a fixtura como linha própria com <select> acessível', painel.alvo_presente, true);
gate('a caixa do select mede >0 (há mesmo onde pousar o rato)', painel.caixa && painel.caixa.w > 0 && painel.caixa.h > 0, true);
gate('a própria linha do developer continua desabilitada (sem autopromoção)', painel.developer_desabilitado, true);
if (!painel.alvo_presente || !painel.caixa) await parar(2, 'fixtura sem select no painel — nada clicável');

// ═══ S3b: pôr a linha DENTRO da vista antes de a tocar ═══
// Foi aqui que a corrida `-fv2` morreu: com a janela a 900 px, o `getBoundingClientRect` do select deu
// `y: -1852` — a página estava percorrida para lá da linha, os dois `Input.dispatchMouseEvent` caíram fora
// do viewport e o painel nunca emitiu RPC nenhum. Os sete VERMELHO não eram defeito do produto: eram o meu
// toque no nada. Um clique fora da vista não prova nada, logo a posição passa a ser corrigida e portada
// ANTES de tocar — e portada pelo navegador (`elementFromPoint`), não por mim a olhar para um número.
const rolar = await E(`(() => { const s = document.querySelector(${JSON.stringify(SEL)}); s.scrollIntoView({ block:'center', inline:'nearest' }); return { scrollY_da_janela: Math.round(window.scrollY), role_painel_scrollTop: Math.round(document.getElementById('roleManagementPanel')?.closest('[class*=scroll], [style*=overflow]')?.scrollTop ?? -1) }; })()`);
await dorme(600);
const caixa = await E(`(() => { const s = document.querySelector(${JSON.stringify(SEL)}); const r = s.getBoundingClientRect(); const cx = Math.round(r.x + r.width/2), cy = Math.round(r.y + r.height/2); const e = document.elementFromPoint(cx, cy); return { x: cx, y: cy, w: Math.round(r.width), h: Math.round(r.height), viewport: { w: window.innerWidth, h: window.innerHeight }, no_ponto: { tag: e ? e.tagName : null, eh_o_select: e === s, classe: (e && e.className ? String(e.className) : '').slice(0,80) } }; })()`);
out.stages.caixa_na_vista = { rolar, caixa, antes_desta_correcao: painel.caixa };
gate('a caixa do select ficou dentro da viewport depois do scrollIntoView', caixa.w > 0 && caixa.h > 0 && caixa.y >= 0 && caixa.y < caixa.viewport.h && caixa.x >= 0 && caixa.x < caixa.viewport.w, true);
gate('o ponto a clicar pertence ao próprio select e não a um elemento sobreposto', caixa.no_ponto.eh_o_select, true);
if (!(caixa.w > 0 && caixa.h > 0 && caixa.y >= 0 && caixa.y < caixa.viewport.h && caixa.x >= 0 && caixa.x < caixa.viewport.w) || !caixa.no_ponto.eh_o_select) { fecho = true; try { ws.close(); } catch {} await parar(2, 'select fora da vista ou tapado — tocar nele seria falso'); }
const idx = painel.opcoes.indexOf(painel.valor);
const para_baixo = idx + 1 < painel.opcoes.length;
const novo = para_baixo ? painel.opcoes[idx + 1] : painel.opcoes[idx - 1];
const IDA = para_baixo ? ['ArrowDown', 40] : ['ArrowUp', 38];
const VOLTA = para_baixo ? ['ArrowUp', 38] : ['ArrowDown', 40];
out.stages.plano = { de: painel.valor, para: novo, tecla_ida: IDA[0], opcoes: painel.opcoes };

// ═══ S4 + S5: o clique real, nas duas direções ═══
// Duas coisas que a corrida `-fv4` ensinou-me e que o instrumento agora faz por medida e não por suposição:
// 1) com o popup nativo ABERTO, as setas mudam a opção destacada mas o `change` só dispara quando o popup
//    fecha — por isso o `s.value` lido 3 s depois do ArrowDown ainda era `parent` e o único POST apareceu no
//    clique seguinte. Um dedo real carrega Enter para escolher; é isso que o tecla_ida faz agora.
// 2) o preflight CORS (`OPTIONS`) viaja no mesmo URL e era contado como segundo pedido. As duas grandezas
//    separam-se: `posts` é o que o app chamou, `opções_cors` é o transporte. Não se somam.
const posts = () => rpcs.filter((r) => r.metodo === 'POST');
const cors = () => rpcs.filter((r) => r.metodo !== 'POST');
const escolhe = async (key, vk) => {
  rpcs.length = 0;
  await clica(caixa.x, caixa.y); await dorme(400);
  const focado = await E(`document.activeElement === document.querySelector(${JSON.stringify(SEL)})`);
  const t_keydown = Date.now();
  await tecla(key, vk); await dorme(400);
  await tecla('Enter', 13); await dorme(3000);
  const lido = await E(`(() => { const s = document.querySelector(${JSON.stringify(SEL)}); return { valor: s ? s.value : null, status: document.querySelector('[data-role-management-status]')?.textContent?.trim() || '', linha: s?.closest('[data-role-profile]')?.querySelector('.role-management-status')?.textContent?.trim() || '' }; })()`);
  return { focado, t_keydown, valor: lido.valor, status_do_painel: lido.status, status_da_linha: lido.linha, rpcs: rpcs.slice(), posts: posts().length, cors: cors().map((r) => r.metodo) };
};

const ida = await escolhe(IDA[0], IDA[1]);
gate('o rato deu foco no select da fixtura', ida.focado, true);
gate('a tecla, com Enter, emitiu exatamente 1 POST a rpc/set_profile_role', ida.posts, 1);
gate('o corpo do POST é o do app (target_profile_id = fixtura, target_role string)', (() => { try { const b = JSON.parse(ida.rpcs.find((r) => r.metodo === 'POST')?.corpo || '{}'); return [b.target_profile_id === UID, typeof b.target_role === 'string']; } catch { return [false, false]; } })(), [true, true]);
gate('o POST só aparece depois do keydown (não fui eu a chamar a função)', (ida.rpcs.find((r) => r.metodo === 'POST')?.quando || 0) >= ida.t_keydown, true);
gate('a tecla mudou o select para o papel seguinte da lista', ida.valor, novo);
out.stages.depois_do_clique = { ...ida, ms_do_keydown_ao_primeiro_post: (ida.rpcs.find((r) => r.metodo === 'POST')?.quando || 0) - ida.t_keydown };
const papelNoAr = await papelDe(UID);
out.stages.papel_no_ar = papelNoAr;
gate('o ar confirmou o papel novo em public.profiles', papelNoAr, novo);

const volta = await escolhe(VOLTA[0], VOLTA[1]);
gate('reverter pelo mesmo caminho emitiu 1 POST', volta.posts, 1);
gate('o select voltou ao papel original', volta.valor, papelOriginal);
out.stages.depois_do_restauro = volta;
const papelFinal = await papelDe(UID);
gate('public.profiles.role da fixtura voltou ao original', papelFinal, papelOriginal);
// A régua do restauro é a baseline **com a fixtura lá dentro**: comparar com o `md5_papel` pré-fissura
// daria VERMELHO por construção (a linha da fixtura ainda existe nesta altura) e leria como incidente.
gate('papel+nome da tabela byte-a-byte como estavam com a fixtura no papel original (md5)', await md5papel(), com_fissura.md5_papel);

// ═══ S6: apagar a fixtura ═══
fecho = true; try { ws.close(); } catch {}
await limpa_fissura('fim normal');
gate('nem auth.users nem profiles têm a fixtura', out.stages.limpeza?.linhas_restantes_da_fissura, 0);
const depoisBaseline = { profiles_n: (await sql(`select count(*)::int as n from public.profiles;`))[0].n, auth_n: (await sql(`select count(*)::int as n from auth.users;`))[0].n, md5_tabela: await md5tab(), md5_papel: await md5papel() };
out.stages.depois_da_limpeza = { ...depoisBaseline, igual_antes: [depoisBaseline.profiles_n === baseline.profiles_n, depoisBaseline.auth_n === baseline.auth_n, depoisBaseline.md5_tabela === baseline.md5_tabela, depoisBaseline.md5_papel === baseline.md5_papel] };
gate('contagem de profiles = baseline', depoisBaseline.profiles_n, baseline.profiles_n);
gate('contagem de auth.users = baseline', depoisBaseline.auth_n, baseline.auth_n);
gate('md5 de papel+nome = baseline depois do apagamento', depoisBaseline.md5_papel, baseline.md5_papel);
gate('md5 da tabela inteira = baseline (se este falhar com os anteriores verdes, mudou um carimbo de tempo)', depoisBaseline.md5_tabela, baseline.md5_tabela);

// Higiene: o artefacto não pode levar nem a senha nem os tokens desta corrida.
escreve();
const corpo = readFileSync(OUT, 'utf8');
const fuga = [['senha', SENHA], ['access_token', js.access_token], ['refresh_token', js.refresh_token], ['service_key', serviceKey], ['sql_token', sqlToken]].filter(([, v]) => v && corpo.includes(v)).map(([k]) => k);
out.stages.higiene = { bytes: corpo.length, padroes_procurados: 5, occurrenncias: fuga.length, nomes_que_fugiram: fuga };
gate('o artefacto escrito não contém senha nem tokens nem chaves lidas do disco', fuga, []);
// O veredito tem de estar no ficheiro e não só no stdout: na primeira versão só `parar()` o escrevia, pelo
// que a corrida verde não tinha campo `veredito` e o `relatorio-14.mjs`, que lê `j.veredito || …`, teve de
// se rabatir a `SEM_FALHAS` — verdadeiro, mas mais fraco do que o que foi medido.
out.veredito = falhas.length ? 'AH2_FIXTURA_COM_FALHA' : 'AH2_CLIQUE_DEVELOPER_PROVADO_COM_FIXTURA';
try { escreve(); } catch {}
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ' · ' + OUT.split('/').pop());
clearTimeout(watchdog);
try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { await new Promise((r) => setTimeout(r, 800)); } catch {}
process.exit(falhas.length ? 1 : 0);
