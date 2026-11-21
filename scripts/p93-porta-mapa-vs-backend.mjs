#!/usr/bin/env node
// P93 — O MAPA DEIXA VER O QUE O BACKEND NEGA? (21/11, noite; só-leitura, no ar publicado).
//
// A pendência de §5.381/§7.453 é «controle no backend, não filtro visual». Hoje a entrada «Secretaria
// Municipal» é pintada por `aptoParaSessao()`, que lê `roleSectionAccess[viewRole]` do bundle (P89 nomeou a
// causa do colapso do `teacher` exatamente aí). Antes de escrever uma candidata que passa a porta para o rpc,
// tenho de medir quantas sessões estão hoje numa das duas divergências:
//   (D1) o mapa diz que sim e o backend nega  → é o que a porta pelo rpc passa a esconder;
//   (D2) o mapa diz que não e o backend autoriza → é o que a porta passaria a MOSTRAR a mais, e é o caso do
//        `secretaria-municipal` ausente do array do `teacher` (P89) se o backend algum dia o autorizar.
// Se D1 for 0 em todas as sessões, publicar a v141 não muda comportamento nenhum e eu digo isso em vez de
// publicar por inércia. O `developer` fica de fora da negação porque `bfr_is_platform_admin()` é a cláusula
// que decide mantê-lo dentro (é o dono), e isso mede-se aqui, não se afirma.
//
// Regras: 0 escrita no banco, 0 publicação, 0 DDL. Só navego e leio o ar publicado; a única escrita é a
// rotação da cadeia de teste no seu próprio ficheiro de sessão (o mesmo que P75/P86/P88 fazem) e o registo.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { HOST, REF } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const SUF = (process.argv[2] || 'a').trim();
const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const BASE = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
// Personas: lidas do disco, nunca dactilografadas. As `v133` são a variante velha e ficam fora.
const DA_LISTA = (process.argv[3] || '').split(',').map((x) => x.trim()).filter(Boolean);
const DAS_SESSOES = readdirSync(BASE).filter((f) => /^ah2-sessao-[a-z_]+\.json$/.test(f)).map((f) => /ah2-sessao-([a-z_]+)\.json/.exec(f)[1]).sort();
const PAPEIS = DA_LISTA.length ? DA_LISTA : DAS_SESSOES;
if (PAPEIS.length === 0) throw new Error('ABORTA: 0 personas descobertas em disco — os portões ficariam vacuos');
const PORTA_CDP = parseInt(process.env.P93_CDP || '9441', 10);
// A chave publishable lê-se dos bytes do ar que vou medir, nunca dactilografada (é a mesma fonte de P86).
// Não entra no artefacto: é configuração do cliente, e o portão do índice chumba portadores por nome de campo.
const AR_TXT = await (await fetch(AR, { signal: AbortSignal.timeout(45000) })).text();
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(AR_TXT) || [])[1];
if (!ANON) throw new Error('ABORTA: o ar medido não traz SUPABASE_PUBLISHABLE_KEY — as duas rpc não assinariam');

const OUT = `${REPO}/evidence/p93-porta-mapa-vs-backend-${SUF}.json`;
const TXT = `${DIR}/p93-porta-mapa-vs-backend-${SUF}.txt`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const registros = [];
const t0 = Date.now();

// ——— predicações puras, com os dois lados provados ———
const d1 = (r) => r.mapa_apto === true && r.backend_autorizada === false && r.backend_admin === false;
const d2 = (r) => r.mapa_apto === false && (r.backend_autorizada === true || r.backend_admin === true);
// Prontidão = o predicado do produtor, não um tempo: o veredicto do mapa só existe depois de `currentProfile`
// estar carregado, e o item municipal só está no DOM depois do shell pintar a navegação. Sem isto, a amostra
// apanha «sem perfil carregado» + nav_qtd=0 e os dois contadores de divergência ficam medidos sobre o boot.
const pronto = (x) => !!(x && x.modulo_presente && x.papel_sessao && x.nav_qtd > 0 && x.backend_autorizada !== null && x.backend_admin !== null);
if (d1({ mapa_apto: true, backend_autorizada: false, backend_admin: false }) !== true) throw new Error('ABORTA: d1 chumba o caso visível-mas-negado');
if (d1({ mapa_apto: true, backend_autorizada: true, backend_admin: false }) !== false) throw new Error('ABORTA: d1 conta uma sessão autorizada como divergência');
if (d1({ mapa_apto: true, backend_autorizada: false, backend_admin: true }) !== false) throw new Error('ABORTA: d1 ignora a cláusula de admin de plataforma, que é a que mantém o developer dentro');
if (d2({ mapa_apto: false, backend_autorizada: true, backend_admin: false }) !== true) throw new Error('ABORTA: d2 chumba o caso escondido-mas-autorizado');
if (d2({ mapa_apto: false, backend_autorizada: false, backend_admin: false }) !== false) throw new Error('ABORTA: d2 contaria uma sessão negada como escondido-mas-autorizado');
// O predicate de prontidão tambem discrimina nos dois lados: a amostra do boot (perfil nulo, item ausente)
// nao pode contar como medida, e o estado completo nao pode ser chumbado.
const LEIGO = { modulo_presente: true, papel_sessao: 'secretary', nav_qtd: 1, backend_autorizada: false, backend_admin: false };
if (pronto(LEIGO) !== true) throw new Error('ABORTA: pronto chumba o estado completo — os contadores ficariam sempre vazios');
if (pronto({ ...LEIGO, papel_sessao: null }) !== false) throw new Error('ABORTA: pronto deixaria passar uma amostra sem perfil carregado');
if (pronto({ ...LEIGO, nav_qtd: 0 }) !== false) throw new Error('ABORTA: pronto deixaria passar uma amostra sem o item no DOM');
if (pronto({ ...LEIGO, backend_autorizada: null }) !== false) throw new Error('ABORTA: pronto deixaria passar rpc ainda sem resposta');

const PERFI = `${DIR}/.p93-chrome-${SUF}`;
if (existsSync(PERFI)) rmSync(PERFI, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFI, { recursive: true });
function liberta(p) {
  const r = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
  for (const linha of String(r.stdout || '').split('\n')) {
    if (!linha.includes(':' + p)) continue;
    const pid = linha.trim().split(/\s+/).pop();
    if (!/^\d+$/.test(pid) || pid === String(process.pid)) continue;
    try { spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { stdio: 'ignore' }); } catch {}
  }
}
liberta(PORTA_CDP);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${PERFI}`, '--headless=new', '--window-size=1366,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let saidaEscrita = false, fechoPlaneado = false;
const abort = (c, m) => {
  if (saidaEscrita) return;
  saidaEscrita = true;
  try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  writeFileSync(OUT, JSON.stringify({ programa: 'scripts/p93-porta-mapa-vs-backend.mjs', em: new Date().toISOString(), INTERROMPIDA: m, duracao_ms: Date.now() - t0, registros }, null, 2) + '\n');
  writeFileSync(TXT, `P93_INTERROMPIDA ${m}\nregistros=${registros.length}\nnode_exit=${c}\n`);
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, `watchdog ${PAPEIS.length} sessoes x 60 s`), PAPEIS.length * 60000 + 90000);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fechoPlaneado) abort(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
  const i = ++seq; const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method)); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, 60000); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
await send('Page.enable'); await send('Runtime.enable');

// Uma única expressão assíncrona por persona: as duas rpc, o veredicto do mapa, e o estado pintado do botão.
const LER = `(async () => {
  const M = window.BFR_MUNICIPAL || null;
  const rt = window.BFR_APP_RUNTIME || null;
  const c = (window.BFR_SUPABASE_CLIENT || null) || (rt && rt.client) || null;
  const out = { modulo_presente: !!M, cliente_presente: !!c };
  if (M) { try { const v = M.aptoParaSessao(); out.mapa_apto = v.apto === true; out.mapa_por = String(v.por || '').slice(0, 160); } catch (e) { out.mapa_erro = String(e.message || e).slice(0, 120); } }
  const b = document.querySelector('[data-bfr-municipal-nav]');
  out.nav_qtd = document.querySelectorAll('[data-bfr-municipal-nav]').length;
  out.nav_existe = !!b;
  if (b) { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b);
    out.nav_display = cs.display; out.nav_hidden_class = b.classList.contains('hidden'); out.nav_caixa = { w: Math.round(r.width), h: Math.round(r.height) };
    out.nav_visivel = cs.display !== 'none' && r.width > 0 && r.height > 0; out.mun_apto_dataset = b.dataset.munApto || null; }
  out.backend_autorizada = null; out.backend_admin = null; out.rpc_erro = null;
  if (c) {
    try { const a = await c.rpc('bfr_is_municipal_authority'); out.backend_autorizada = a.error ? null : a.data; if (a.error) out.rpc_erro = 'authority: ' + String(a.error.code || a.error.message).slice(0, 80); } catch (e) { out.rpc_erro = 'authority throw ' + String(e.message || e).slice(0, 80); }
    try { const p = await c.rpc('bfr_is_platform_admin'); out.backend_admin = p.error ? null : p.data; if (p.error) out.rpc_erro = (out.rpc_erro || '') + ' admin: ' + String(p.error.code || p.error.message).slice(0, 80); } catch (e) { out.rpc_erro = (out.rpc_erro || '') + ' admin throw'; }
  }
  out.papel_sessao = (window.BFR_CURRENT_PROFILE && window.BFR_CURRENT_PROFILE.role) || (rt && rt.profile && rt.profile.role) || null;
  return out; })()`;

for (const papel of PAPEIS) {
  const SESSAO = `${BASE}/ah2-sessao-${papel}.json`;
  if (!existsSync(SESSAO)) { registros.push({ papel, falha: 'sem_ficheiro_de_sessao' }); continue; }
  const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
  if (!S[papel]?.refresh_token) { registros.push({ papel, falha: 'sem_refresh_token' }); continue; }
  let tok = null;
  for (let n = 0; n < 4 && !tok; n++) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[papel].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { tok = j; S[papel] = { ...S[papel], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); }
    else if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || ''))) { registros.push({ papel, falha: 'CADEIA_QUEIMADA' }); tok = 'queimada'; }
    else await new Promise((rz) => setTimeout(rz, 2500 * (n + 1)));
  }
  if (!tok || tok === 'queimada') continue;
  const payloadSessao = JSON.stringify({ currentSession: 'access_token', access_token: tok.access_token, token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, expires_in: 3600, user: tok.user });
  await send('Page.navigate', { url: AR }, 60000);
  await new Promise((r) => setTimeout(r, 1500));
  await E(`(() => { localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(payloadSessao)}); return 1; })()`);
  await send('Page.navigate', { url: AR }, 60000);
  const tEspera = Date.now();
  let lido = null, tentativas = 0;
  for (let i = 0; i < 24; i++) { tentativas = i + 1; lido = await E(LER); if (pronto(lido)) break; await new Promise((r) => setTimeout(r, 500)); }
  const reg = { papel, espera_ms: Date.now() - tEspera, tentativas, pronto: pronto(lido), ...(lido || {}), d1_visivel_mas_negado: d1(lido || {}), d2_escondido_mas_autorizado: d2(lido || {}) };
  registros.push(reg);
  console.log(`${papel}: mapa=${JSON.stringify(reg.mapa_apto)} nav_visivel=${JSON.stringify(reg.nav_visivel)} caixa=${JSON.stringify(reg.nav_caixa)} backend_autorizada=${JSON.stringify(reg.backend_autorizada)} admin=${JSON.stringify(reg.backend_admin)} D1=${reg.d1_visivel_mas_negado} D2=${reg.d2_escondido_mas_autorizado} papel_sessao=${reg.papel_sessao}`);
}

fechoPlaneado = true;
try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
// Uma leitura feita antes do perfil carregar não é uma divergência: é o boot. Os contadores só aceitam o pronto.
const semFalha = registros.filter((r) => !r.falha);
const medidos = registros.filter((r) => r.pronto === true);
const D1 = medidos.filter(d1), D2 = medidos.filter(d2);

const falhas = []; const portoes = [];
const g = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(`${nome} | ${JSON.stringify(dado).slice(0, 300)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('todas_as_personas_foram_medidas_sem_nulo', medidos.length === semFalha.length && medidos.length > 0, { pedidas: PAPEIS.length, registradas: registros.length, prontas: medidos.length, com_falha: semFalha.filter((r) => !r.pronto).map((r) => r.papel + ': perfil=' + JSON.stringify(r.papel_sessao) + ' nav_qtd=' + r.nav_qtd + ' tentativas=' + r.tentativas), abortadas: registros.filter((r) => r.falha).map((r) => r.papel + ':' + r.falha) });
g('o_papel_da_sessão_bate_com_a_persona', medidos.every((r) => r.papel_sessao === r.papel || r.papel === 'admin'), { trocados: medidos.filter((r) => r.papel_sessao !== r.papel && r.papel !== 'admin').map((r) => r.papel + '→' + r.papel_sessao) });
g('o_developer_é_admin_de_plataforma_e_por_isso_fica', medidos.filter((r) => r.papel === 'developer').every((r) => r.backend_admin === true), { developer: medidos.filter((r) => r.papel === 'developer').map((r) => ({ admin: r.backend_admin, autorizada: r.backend_autorizada })) });
g('a_supervisão_educativa_é_autorizada_pelo_backend', medidos.filter((r) => r.papel === 'education_supervisor').every((r) => r.backend_autorizada === true), { edsup: medidos.filter((r) => r.papel === 'education_supervisor').map((r) => r.backend_autorizada) });
g('a_veredicto_do_mapa_e_a_pintura_do_botão_batem_por_persona', medidos.every((r) => (r.mapa_apto === true) === (r.nav_visivel === true)), { divergentes: medidos.filter((r) => (r.mapa_apto === true) !== (r.nav_visivel === true)).map((r) => r.papel + ': mapa=' + r.mapa_apto + ' visivel=' + r.nav_visivel + ' display=' + r.nav_display + ' caixa=' + JSON.stringify(r.nav_caixa)) });
g('nenhuma_sessão_tem_as_duas_rpc_em_erro', medidos.every((r) => r.rpc_erro === null && r.backend_autorizada !== null && r.backend_admin !== null), { com_erro: medidos.filter((r) => r.rpc_erro).map((r) => r.papel + ': ' + r.rpc_erro) });
g('a_divergência_D1_que_a_porta_pelo_rpc_fecharia_está_contada', true, { d1: D1.map((r) => r.papel), n_d1: D1.length, nota: 'contador, não régua: 0 D1 significa que publicar a v141 não esconderia nada, e é isso que reporto' });
g('a_divergência_D2_que_a_porta_pelo_rpc_abriria_está_contada', true, { d2: D2.map((r) => r.papel), n_d2: D2.length, nota: 'contador, não régua: D2>0 significa entrada escondida pelo mapa a quem o backend autoriza' });

const out = {
  programa: 'scripts/p93-porta-mapa-vs-backend.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  ar: AR, personas: PAPEIS, registros,
  resumo: { pedidas: PAPEIS.length, sem_falha: semFalha.length, prontas: medidos.length, com_defeito_de_leitura: registros.filter((r) => !r.falha && r.pronto !== true).map((r) => r.papel), d1_visivel_mas_negado: D1.map((r) => r.papel), d2_escondido_mas_autorizado: D2.map((r) => r.papel) },
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P93_PORTA_MAPA_VS_BACKEND_OK ' + portoes.length + '/0 · D1=' + D1.length + ' D2=' + D2.length : 'P93_PORTA_MAPA_VS_BACKEND_VERMELHO ' + falhas.length + ' de ' + portoes.length;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\nmedidas=${medidos.length}\nD1=${D1.map((r) => r.papel).join(',')}\nD2=${D2.map((r) => r.papel).join(',')}\nnode_exit=${falhas.length ? 1 : 0}\n`);
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(REPO + '/', '')}`);
console.log(`D1 (visível e negado) = ${D1.map((r) => r.papel).join(', ') || 'NENHUMA'} · D2 (escondido e autorizado) = ${D2.map((r) => r.papel).join(', ') || 'NENHUMA'}`);
process.exit(falhas.length ? 1 : 0);
