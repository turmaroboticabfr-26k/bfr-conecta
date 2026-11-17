// AH-2-C — RM-1.2: fechar o «clique com conta real de developer por medir». Uma conta developer
// sintética (deste ciclo) abre «Contas e cargos», e EU NÃO CHAMO A FUNÇÃO: pouso o rato no <select> da
// linha de outra conta sintética e tecla, com Input.dispatchMouseEvent / dispatchKeyEvent — eventos que
// entram pela fila de input do browser. A prova de que foi a interação e não o meu código é a rede: o
// único pedido a rpc/set_profile_role tem de aparecer depois do keydown, com o corpo do app.
// Escrita: 1 ALTER de papel em public.profiles, na conta sintética do próprio ciclo, desfeita pelo
// mesmo caminho (novo clique real) e conferida pelo md5 da tabela contra o antes. 0 DDL, 0 deploy.
// Uso: node scripts/ah2-cliques.mjs <rotulo>
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROTULO = process.argv[2] || '17-11';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const PERFIL = `${DIR}/.ah2c-chrome-profile`;
const OUT = `${DIR}/bfr-conecta/evidence/ah2-cliques-17-11-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });

const contas = JSON.parse(readFileSync(`${DIR}/bfr-conecta/evidence/ah2-contas-17-11.json`, 'utf8'));
const dev = contas.contas.find((c) => c.papel === 'developer');
const alvo = contas.contas.find((c) => c.papel === 'parent');
if (!dev || !alvo) throw new Error('ABORTA: o registo de contas não tem developer nem parent');
const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: 'Bearer ' + readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim(), 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const t = await r.text(); if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t);
};
const md5tab = async () => (await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from public.profiles) x;`))[0].h;
// Dois réguas, porque um VERMELHO no md5 completo tem de se interpretar sem adivinhação: se só a
// primeira diferir, o que mudou foi carimbo de tempo e não autorização; se ambas diferirem, o papel
// ficou trocado e isso é incidente.
const md5papel = async () => (await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select id, role, full_name from public.profiles) x;`))[0].h;
const papelDe = async (id) => (await sql(`select role::text as r from public.profiles where id='${id}'::uuid;`))[0]?.r;

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const rr = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S.developer.refresh_token }) });
const js = await rr.json();
if (!js.access_token) throw new Error('refresh developer falhou: ' + JSON.stringify(js).slice(0, 160));
S.developer = { ...S.developer, access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
writeFileSync(`${DIR}/ah2-sessions.json`, JSON.stringify(S, null, 2) + '\n');
const sessao = js;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=9354', `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('PAROU: ' + m); process.exit(c); };
setTimeout(() => abort(3, 'watchdog 480 s'), 480000);
let tg = [];
for (let i = 0; i < 60; i++) { try { tg = await (await fetch('http://127.0.0.1:9354/json')).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 400)); }
const page = tg.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('ws')), 30000))]).catch((e) => abort(5, String(e)));
let seq = 0; const pend = new Map();
const rpcs = [];
const respostas = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Network.requestWillBeSent' && /\/rest\/v1\/rpc\/set_profile_role/.test(m.params.request.url)) rpcs.push({ when: Date.now(), metodo: m.params.request.method, corpo: m.params.request.postData || null, url: m.params.request.url.split('/').pop() });
  if (m.method === 'Network.responseReceived' && /\/rest\/v1\/rpc\/set_profile_role/.test(m.params.response.url)) respostas.set(m.params.requestId, m.params.response.status);
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, { res, rej }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { rej(e); } });
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 260)); return r.result?.value; };
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 120)); };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

// rato e teclado de verdade, pela fila de input do browser
const clica = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
const tecla = async (key, code, vk) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
};

const out = { ciclo: 'AH-2-C', Aceitaçao: 'RM-1.2 — clique com conta real de developer', em: new Date().toISOString(), developer: dev.id.slice(0, 8), alvo: { id: alvo.id.slice(0, 8), papel_antes: null }, stages: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };

const antes = await md5tab();
const antesPapel = await md5papel();
out.stages.baseline_profiles = { md5_antes: antes, papel_do_alvo: await papelDe(alvo.id) };
gate('o alvo começa como parent (conta deste ciclo)', out.stages.baseline_profiles.papel_do_alvo, 'parent');

await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
await send('Page.navigate', { url: URL_APP });
await waitFor("!!document.getElementById('loginScreen')", 60000);
await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
await send('Page.navigate', { url: URL_APP });
await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === 'developer'`, 120000);
out.stages.boot = await E(`({ papel: window.BFR_CURRENT_PROFILE?.role ?? null, nome: window.BFR_CURRENT_PROFILE?.full_name ?? null })`);
gate('sessão real de developer bootada', out.stages.boot.papel, 'developer');

// abrir «Contas e cargos»: a seção administrativa monta o painel; o atalho existe para developer
await E(`(() => { document.querySelector('[data-admin-shortcut]')?.click(); const b = document.querySelector('button[data-section="administracao"]'); b && b.click(); })()`);
await waitFor(`!!document.querySelector('#roleManagementPanel')`, 60000);
await waitFor(`!!document.querySelector('[data-role-profile="${alvo.id}"]')`, 60000).catch(() => {});
out.stages.painel = await E(`(() => {
  const p = document.querySelector('#roleManagementPanel');
  const rows = Array.from(document.querySelectorAll('[data-role-profile]'));
  const meu = document.querySelector('[data-role-profile="${alvo.id}"] select[data-profile-role]');
  const minha = document.querySelector('[data-role-profile="${dev.id}"] select[data-profile-role]');
  const r = meu ? meu.getBoundingClientRect() : null;
  return { painel: !!p, linhas: rows.length, alvo_na_lista: !!meu,
    select_box: r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) } : null,
    valor_no_select: meu ? meu.value : null,
    opcoes: meu ? Array.from(meu.options).map(o => o.value) : [],
    linha_do_developer_desabilitada: minha ? minha.disabled : null,
    linha_do_developer_presente: !!minha,
    indices: meu ? Array.from(meu.options).findIndex(o => o.value === meu.value) : null };
})()`);
gate('painel «Contas e cargos» renderizado', out.stages.painel.painel, true);
gate('a conta-alvo tem linha própria na lista do painel', out.stages.painel.alvo_na_lista, true);
gate('o select da conta-alvo está habilitado e mede >0', out.stages.painel.select_box && out.stages.painel.select_box.w > 0 && out.stages.painel.select_box.h > 0, true);
// propriedade de segurança medida, não assumida: ninguém se promove a si mesmo pelo painel
gate('a própria linha do developer vem desabilitada (sem autopromoção pelo painel)', out.stages.painel.linha_do_developer_desabilitada, true);
if (!out.stages.painel.alvo_na_lista || !out.stages.painel.select_box) { out.falhas = falhas; out.portoes = portoes; writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n'); abort(2, 'sem select-alvo: impossível clicar'); }

const idx = out.stages.painel.indices;
// A seta escolhe-se pela lista real de opções, não por suposição: se o valor atual for o último,
// ArrowDown não muda nada e o ciclo inteiro se lia como «o clique não fez nada».
const para_baixo = idx + 1 < out.stages.painel.opcoes.length;
const novo = para_baixo ? out.stages.painel.opcoes[idx + 1] : out.stages.painel.opcoes[idx - 1];
const IDA = para_baixo ? ['ArrowDown', 40] : ['ArrowUp', 38];
const VOLTA = para_baixo ? ['ArrowUp', 38] : ['ArrowDown', 40];
out.stages.plano = { de: out.stages.painel.valor_no_select, para: novo, tecla_ida: IDA[0], tecla_volta: VOLTA[0] };
const peca = out.stages.painel.select_box;

// ═══ o clique real ═══
rpcs.length = 0;
await clica(peca.x, peca.y);
await dorme(350);
const focado = await E(`document.activeElement === document.querySelector('[data-role-profile="${alvo.id}"] select[data-profile-role]')`);
gate('o rato pousou no select (foco do browser no elemento-alvo)', focado, true);
await tecla(IDA[0], IDA[0], IDA[1]);
await dorme(2500);
const depois = await E(`(() => { const s = document.querySelector('[data-role-profile="${alvo.id}"] select[data-profile-role]'); return { valor: s ? s.value : null, status: document.querySelector('[data-role-management-status]')?.textContent?.trim() || '', linha: document.querySelector('[data-role-profile="${alvo.id}"] .role-management-status')?.textContent?.trim() || '' }; })()`);
out.stages.depois_do_clique = { rpcs: rpcs.slice(), valor_no_select: depois.valor, status_do_painel: depois.status, status_da_linha: depois.linha };
gate('o clique emitiu exatamente 1 pedido a rpc/set_profile_role', rpcs.length, 1);
gate('o corpo do pedido é o do app (target_profile_id + target_role)', (() => { try { const b = JSON.parse(rpcs[0].corpo || '{}'); return [b.target_profile_id === alvo.id, typeof b.target_role === 'string']; } catch { return [false, false]; } })(), [true, true]);
gate('a tecla mudou o select para o papel seguinte da lista', depois.valor, novo);
const papelNoAr = await papelDe(alvo.id);
out.stages.papel_no_ar = papelNoAr;
gate('o ar confirmou a mudança de papel (profiles.role = ' + papelNoAr + ')', papelNoAr, novo);

// ═══ desfazer pelo mesmo caminho: outro rato real, tecla no sentido inverso ═══
rpcs.length = 0;
await clica(peca.x, peca.y);
await dorme(350);
await tecla(VOLTA[0], VOLTA[0], VOLTA[1]);
await dorme(2500);
const restaurado = await E(`document.querySelector('[data-role-profile="${alvo.id}"] select[data-profile-role]')?.value`);
out.stages.depois_do_restauro = { rpcs: rpcs.slice(), valor_no_select: restaurado };
gate('restaurar pelo clique emitiu 1 rpc', rpcs.length, 1);
gate('o select voltou a parent', restaurado, 'parent');
const papelFinal = await papelDe(alvo.id);
gate('profiles.role do alvo voltou a parent', papelFinal, 'parent');
const depoisMd5 = await md5tab();
const depoisMd5Papel = await md5papel();
out.stages.md5_depois = { tabela_inteira: depoisMd5, papel_e_nome: depoisMd5Papel, igual_antes: [depoisMd5 === antes, depoisMd5Papel === antesPapel] };
gate('papel+nome de public.profiles byte-a-byte como estavam (md5)', depoisMd5Papel, antesPapel);
gate('a tabela inteira voltou a byte-a-byte (se falhar com o anterior verde, mudou só um carimbo de tempo)', depoisMd5, antes);

out.stages.observado = { linhas_na_lista: out.stages.painel.linhas, opcoes_do_select: out.stages.painel.opcoes.length, atalho_admin: true };
out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? 'AH2_CLIVES_COM_FALHA' : 'AH2_CLIQUE_DEVELOPER_PROVADO';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ' · ' + OUT.split('/').pop());
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
