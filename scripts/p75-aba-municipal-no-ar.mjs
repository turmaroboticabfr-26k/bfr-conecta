#!/usr/bin/env node
// P75 — A ENTRADA «SECRETARIA MUNICIPAL» NO AR SERVIDO (21/11): medida, não explicada.
// O usuário vê só a «Secretaria» da escola. O bundle servido (v136) traz o invólucro
// `<script data-bfr-municipal-module="1">`, que se auto-regista em tempo de execução: por isso o mapa
// ESTÁTICO de `roleSectionAccess` não contém `secretaria-municipal` e a varredura P74 (que lê o mapa
// estático) nunca percorreu essa seção — o zero dela não prova que a aba funciona nem que não aparece.
// Esta peça abre o ar com a sessão de um papel e pergunta ao próprio módulo: o botão existe no DOM? está
// escondido por quem? o predicado `aptoParaSessao()` diz o quê? a sonda `bfr_is_municipal_authority()`
// respondeu? Só-leitura: 0 DDL, 0 deploy, 0 escrita de produto; a única rede privilegiada é o refresh.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');

// ——— pure predicates, with the fixture that proves they discriminate ———
const viewDe = (role) => (role === 'developer' ? 'admin' : role === 'pedagogical' ? 'teacher' : role === 'social_work' ? 'multiprofessional' : role);
const esperadoNoDom = (papel, papeisMun) => papeisMun.includes(viewDe(papel));
const visibilidadeOk = (navs, apto) => navs.length > 0 ? navs.every((n) => n.hidden === !apto) : null;
if (viewDe('developer') !== 'admin' || viewDe('secretary') !== 'secretary') throw new Error('ABORTA: a tradução de papéis não discrimina no fixture');
if (esperadoNoDom('developer', ['admin', 'education_supervisor']) !== true || esperadoNoDom('secretary', ['admin', 'education_supervisor']) !== false) throw new Error('ABORTA: esperadoNoDom não discrimina admin de secretary no fixture');
if (visibilidadeOk([{ hidden: true }], false) !== true || visibilidadeOk([{ hidden: false }], false) !== false) throw new Error('ABORTA: visibilidadeOk não discrimina no fixture');

if ((process.argv[2] || '').trim() === '--selfteste') {
  console.log('P75_SELFTESTE_OK 3/0 — viewDe, esperadoNoDom e visibilidadeOk discriminam nos fixtures (0 rede, 0 chrome)');
  process.exit(0);
}

const PAPEL = (process.argv[2] || 'developer').trim();
const SUF = process.env.P75_SUF || '21-11a';
const OUT = `${EV}/p75-aba-municipal-${PAPEL}-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P75_SUF=novo, nunca por cima');
const PORT = parseInt(process.env.AH2_PORT || '9377', 10);
const SESSAO = process.env.AH2_SESSAO || `${DIR}/ah2-sessao-${PAPEL}.json`;
const TETO = Math.min(240000, Math.max(60000, parseInt(process.env.P75_TETO_MS || '240000', 10)));
const t0 = Date.now();

const por_versao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = por_versao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
if (!DIARIO) throw new Error('ABORTA: nenhum audit-publicacao-v*.json em ' + REPO);
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${DIARIO}`, 'utf8')) || [])[0] + '/';
const V_PUBLICADA = /v(\d+)/.exec(DIARIO)[1];
const PASTA_DEPLOY = por_versao(new RegExp('^worker-deploy-v' + V_PUBLICADA + '(?!\\d)')).slice(-1)[0];
if (!PASTA_DEPLOY) throw new Error('ABORTA: nenhum worker-deploy-v' + V_PUBLICADA + ' para o diário ' + DIARIO + ' — candidata em disco não é ar publicado');
const FICHEIRO_ESPERADO = readdirSync(`${REPO}/${PASTA_DEPLOY}`).filter((f) => /^esperado-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const ESPERADO_MD5 = String(JSON.parse(readFileSync(`${REPO}/${PASTA_DEPLOY}/${FICHEIRO_ESPERADO}`, 'utf8')).htmlMd5 || '').toLowerCase();

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = md5(shellTxt);
const ANON = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"`]([^'"`]+)['"`]/.exec(shellTxt) || [])[1];
if (!ANON) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const iniMod = shellTxt.indexOf('<script data-bfr-municipal-module="1">');
const MOD = iniMod === -1 ? '' : shellTxt.slice(iniMod, shellTxt.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1] || null;
const PAPEIS_MUN = [...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(MOD) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
const iniMapa = shellTxt.indexOf('roleSectionAccess = {');
const bloco = shellTxt.slice(iniMapa + 'roleSectionAccess = '.length, shellTxt.indexOf('};', iniMapa) + 1);
const MAPA_ESTATICO = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA_ESTATICO[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const chaves_com_sect_estaticamente = Object.entries(MAPA_ESTATICO).filter(([, v]) => SECT && v.includes(SECT)).map(([k]) => k);

const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO + ' — cadeia em disco, não dactilografada');
const renova = async (p) => {
  for (let n = 0; n < 4; n++) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[p].refresh_token }), signal: AbortSignal.timeout(45000) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = null; }
    if (j && j.access_token) { S[p] = { ...S[p], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user }; writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n'); return j; }
    if (j && /already_used|invalid_grant/i.test(String(j.error_code || j.error || j.msg || ''))) throw new Error('CADEIA QUEIMADA em ' + p + ': ' + String(j.error_code || j.error) + ' — precisa de re-login com OK, não desta peça');
    await new Promise((rz) => setTimeout(rz, 2500 * (n + 1)));
  }
  throw new Error('refresh ' + p + ' falhou 4x');
};

const PERFIL = `${DIR}/.p75-mun-${PAPEL}-${PORT}`;
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
let out = {}, fecho = false;
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, duracao_ms: Date.now() - t0, em_parcial: true }, null, 2) + '\n'); } catch {}
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
setTimeout(() => abort(3, `watchdog ${TETO + 90000} ms`), TETO + 90000);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page'); if (!page) abort(1, 'sem alvo page no CDP');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map();
const consoleErros = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') consoleErros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
};
const send = (method, params = {}, ms = 25000) => new Promise((res, rej) => {
  const i = ++seq; const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method)); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const E = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (expr, ms) => { const c0 = Date.now(); while (Date.now() - c0 < ms) { let v = false; try { v = await E(expr); } catch {} if (v) return Date.now() - c0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor expirou: ' + expr.slice(0, 90)); };

const SNAPSHOT = `(() => {
  const M = window.BFR_MUNICIPAL || null; const rt = window.BFR_APP_RUNTIME || {}; const pf = window.BFR_CURRENT_PROFILE || {};
  const navs = [...document.querySelectorAll('[data-bfr-municipal-nav]')].map((b) => ({ host: String((b.parentElement && (b.parentElement.id || b.parentElement.className)) || '').slice(0, 60), classe: String(b.className), hidden: b.classList.contains('hidden'), display: b.style.display || '', visivel: !!(b.offsetWidth || b.offsetHeight), munApto: b.dataset.munApto || null, rotulo: String(b.textContent || '').trim().slice(0, 40) }));
  const vista = document.getElementById('bfrMunicipalView');
  const topo = [...document.querySelectorAll('.role-toggle button')].map((b) => String(b.textContent || '').trim().slice(0, 24));
  const sidebar = [...document.querySelectorAll('.sidebar .nav-item[data-section]')].map((b) => ({ s: b.dataset.section, visivel: !!(b.offsetWidth || b.offsetHeight), hidden: b.classList.contains('hidden') }));
  return {
    modulo_exposto: !!M, sect_da_module: M ? M.SECT || null : null, papeis_municipais_da_module: M ? M.PAPEIS_MUNICIPAIS || null : null,
    papel_da_sessao: pf.role || null, active_view: rt.activeView || null,
    apto: M ? M.aptoParaSessao() : null,
    mapa_vivo_com_sect: rt.roleSectionAccess ? Object.fromEntries(Object.entries(rt.roleSectionAccess).map(([k, v]) => [k, Array.isArray(v) ? v.includes((M && M.SECT) || 'secretaria-municipal') : null])) : null,
    navs, navs_no_dom: navs.length, navs_visiveis: navs.filter((n) => n.visivel).length,
    vista: vista ? { existe: true, classes: String(vista.className).slice(0, 60), munApto: vista.dataset.munApto || null, built: vista.dataset.munBuilt || null, chars: String(vista.innerText || '').length } : { existe: false },
    abas_do_topo: topo, abas_do_topo_com_municipal: topo.filter((t) => /municipal/i.test(t)),
    sidebar_visiveis: sidebar.filter((x) => x.visivel).map((x) => x.s), sidebar_total: sidebar.length,
    estouro_horizontal: (document.body && document.body.scrollWidth || 0) > (document.documentElement && document.documentElement.clientWidth || 0) + 1
  };
})()`;

await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
// Primeiro navega-se para a origem do app: `localStorage` numa página `about:blank` é SecurityError, e foi
// exatamente o que a 1.ª corrida apanhou. Só depois do shell aparecer é que a sessão é injetada.
await send('Page.navigate', { url: URL_APP });
try { await waitFor("!!document.getElementById('loginScreen')", 60000); } catch (e) { console.log('  (loginScreen não apareceu: ' + String(e.message).slice(0, 80) + ')'); }
const sessao = await renova(PAPEL);
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify({ access_token: sessao.access_token, token_type: 'bearer', expires_in: sessao.expires_in, expires_at: sessao.expires_at, refresh_token: sessao.refresh_token, user: sessao.user })}))`);
await send('Page.navigate', { url: URL_APP });
let erro_boot = null;
try { await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 75000); } catch (e) { erro_boot = String(e.message).slice(0, 120); }
await E(`new Promise(rz => setTimeout(rz, 2500))`);
const antes = erro_boot ? null : await E(SNAPSHOT);
const sonda = antes ? await E(`(async () => { const M = window.BFR_MUNICIPAL; if (!M) return null; const r = await M.sondarBackend(); return { feita: r.feita, executavel: r.executavel, erro: String(r.erro || '').slice(0, 160), nota: String(r.nota || '').slice(0, 160) }; })()`) : null;
let depois_clique = null, clique = null;
if (antes && antes.navs_visiveis > 0) {
  clique = await E(`(() => { const b = document.querySelector('[data-bfr-municipal-nav]'); if (!b) return 'sem botão'; b.click(); return 'clicado'; })()`);
  await E(`new Promise(rz => setTimeout(rz, 6000))`);
  depois_clique = await E(SNAPSHOT);
}
const txt_sonda = depois_clique ? await E(`String((document.querySelector('#bfrMunicipalView [data-mun-sonda]')?.parentElement?.innerText) || '').slice(0, 300)`) : null;
const rotulosInternos = depois_clique ? await E(`[...document.querySelectorAll('#bfrMunicipalView [data-mun-tab]')].map(b => String(b.textContent || '').trim().slice(0, 26))`) : null;
fecho = true;
try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
try { rmSync(PERFIL, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}

const falhas = []; const portoes = [];
const g = (nome, cond, detalhe) => { const v = !!cond; portoes.push({ nome, verde: v, detalhe }); if (!v) falhas.push(`${nome} | dado=${JSON.stringify(detalhe).slice(0, 260)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('o_ar_medido_e_o_publicado_no_diario_mais_novo', MD5 === ESPERADO_MD5, { medido: MD5, esperado: ESPERADO_MD5, diario: DIARIO });
g('o_involucrio_municipal_esta_nos_bytes_servidos', MOD.length > 10000 && SECT !== null && PAPEIS_MUN.length > 0, { bytes_modulo: MOD.length, sect: SECT, papeis: PAPEIS_MUN });
g('a_seccao_municipal_nao_esta_no_mapa_estatico_do_bundle', chaves_com_sect_estaticamente.length === 0, { chaves_com_sect_estaticamente });
g('a_sessao_e_do_papel_pedido', !!antes && [PAPEL, viewDe(PAPEL)].includes(antes.papel_da_sessao), { pedido: PAPEL, view: viewDe(PAPEL), lido: antes && antes.papel_da_sessao, erro_boot });
g('o_modulo_esta_exposto_na_janela', !!antes && antes.modulo_exposto === true, { modulo_exposto: antes && antes.modulo_exposto });
g('o_modulo_insere_o_botao_no_dom_seja_qual_for_o_papel', !!antes && antes.navs_no_dom >= 1, { navs_no_dom: antes && antes.navs_no_dom, hosts: antes && (antes.navs || []).map((n) => n.host) });
g('o_botao_so_e_visivel_para_os_papeis_municipais_lidos_do_bundle', !!antes && (antes.navs_visiveis >= 1) === esperadoNoDom(PAPEL, PAPEIS_MUN), { pedido: PAPEL, view: viewDe(PAPEL), esperado_visivel: esperadoNoDom(PAPEL, PAPEIS_MUN), navs_visiveis: antes && antes.navs_visiveis });
g('a_visibilidade_do_botao_bate_com_o_predicado_do_modulo', !!antes && visibilidadeOk(antes.navs, !!(antes.apto && antes.apto.apto)) === true, { navs: antes && antes.navs, apto: antes && antes.apto });
g('a_entrada_municipal_nao_e_uma_aba_do_seletor_de_papel', !!antes && antes.abas_do_topo_com_municipal.length === 0, { abas_do_topo: antes && antes.abas_do_topo });
g('o_backend_respondeu_a_sonda_de_autorizacao', !!sonda && sonda.feita === true, { sonda });

out = {
  programa: 'scripts/p75-aba-municipal-no-ar.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'a entrada «Secretaria Municipal» aparece no ar servido para o papel ' + PAPEL + '? se não, qual predicado a esconde?',
  metodo: 'chrome headless 1280 com a sessão do papel renovada por refresh; as perguntas vão ao próprio módulo servido (window.BFR_MUNICIPAL), nunca a uma versão minha da régua. Zero DDL, zero deploy, zero escrita de produto, zero endpoint de admin.',
  ar: { url: URL_APP, diario: DIARIO, md5_servido: MD5, md5_esperado: ESPERADO_MD5, pasta_deploy: PASTA_DEPLOY },
  leitura_do_bundle: { sect: SECT, papeis_municipais: PAPEIS_MUN, bytes_do_modulo: MOD.length, chaves_no_mapa_estatico_com_sect: chaves_com_sect_estaticamente, papeis_no_mapa_estatico: Object.keys(MAPA_ESTATICO).length },
  alvo: { papel: PAPEL, view_role: viewDe(PAPEL), esperado_no_dom: esperadoNoDom(PAPEL, PAPEIS_MUN) },
  erro_boot, injecao: { acesso_md5_8: md5(sessao.access_token).slice(0, 8), expira_em_s: sessao.expires_at - Math.floor(Date.now() / 1000) },
  antes, sonda, clique, depois_clique, faixa_sonda_no_painel: txt_sonda, abas_internas_do_painel: rotulosInternos,
  excecoes: consoleErros.slice(0, 8),
  o_que_este_verde_nao_autoriza: 'Não prova que o painel municipal mostra números corretos, nem autoriza publicar v138, aplicar DDL ou escrever concessões: prova só o estado da ENTRADA no ar de hoje para este papel.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P75_ABA_MUNICIPAL_OK ${PAPEL}` : `P75_ABA_MUNICIPAL_VERMELHO ${PAPEL} ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`\nPapel=${PAPEL} view=${viewDe(PAPEL)} apto=${antes && antes.apto ? JSON.stringify(antes.apto) : '(sem snapshot)'} botao_no_dom=${antes && antes.navs_no_dom} botao_visivel=${antes && antes.navs_visiveis} hidden=${antes && JSON.stringify((antes.navs || []).map((n) => n.hidden))}`);
console.log(`sonda_backend=${JSON.stringify(sonda)} abas_topo=${JSON.stringify(antes && antes.abas_do_topo)}`);
console.log(`sidebar_visiveis=${JSON.stringify(antes && antes.sidebar_visiveis)}`);
if (depois_clique) console.log(`depois do clique: vista=${JSON.stringify(depois_clique.vista)} abas_internas=${JSON.stringify(rotulosInternos)}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
