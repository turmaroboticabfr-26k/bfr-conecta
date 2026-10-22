// E2E-2 · Chat interno — envio real pela conta pedagogical e recepção pela coordinator.
// v60: o módulo vivo é o chat v3 (BFRInternalChat reatribuído no fim do bundle; os balões
// renderizam em [data-chat-messages], não no [data-chat-message-list] da cópia morta).
// Fase A (desktop 1280, sessão pedagogical): navega em Chat interno → abre a conversa do fixture →
// digita no composer real → envia → confirma o balão na tela → prova no banco (internal_chat_messages).
// Fase B (mobile 390, sessão coordinator, porta 9362): a sidebar colapsa inteira a 390 —
// a entrada real é a barra inferior (#bfrMobileBottomNav) → "more" abre o #bfrMobileDrawer →
// link [data-bfr-drawer-route="chat-interno"] → mesma conversa → mensagem da fase A visível
// → prova do recibo (last_read_at no membro).
import fs from 'node:fs';
import { abrirApp, fecharApp, clicar, preencher, sleep, esperarTexto, salvarJson } from './manual-v59-e2e-lib.mjs';
import { ligarChrome, conectar, Pagina, desligar } from './cdp.mjs';
import { HOST } from './manual-v59-e2e-lib.mjs';

const DIR = 'C:/Users/pcmac/.kiro/crew/uploads';
const REF = 'yyzqoxlkcvqpessypfjo';
const SQL_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const token = fs.readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const KEY = `sb-${REF}-auth-token`;
const fix = JSON.parse(fs.readFileSync(`${DIR}/e2e2-fixture.json`, 'utf8')).fixture;
const contas = JSON.parse(fs.readFileSync(`${DIR}/e2e2-fixture.json`, 'utf8')).contas;
const MENSAGEM = `Mensagem E2E-2 do chat interno ${Date.now()}`;

const diario = { em: new Date().toISOString(), ref: REF, fixture: fix, mensagem: MENSAGEM };
const rodarSql = async (query) => {
  const r = await fetch(SQL_URL, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 500)}`);
  return JSON.parse(t);
};
const falhar = (msg) => { diario.falha = msg; salvarJson(`${DIR}/e2e2-chat.json`, diario); throw new Error(msg); };

async function abrirSessao(arquivoSessao, { largura, altura, porta }) {
  const sessTxt = fs.readFileSync(`${DIR}/${arquivoSessao}`, 'utf8');
  const sess = JSON.parse(sessTxt);
  const uid = sess?.user?.id || sess?.session?.user?.id || null;
  const skipKey = uid ? `bfr-pn-skipped:${uid}` : null;
  const proc = await ligarChrome({ cabeca: true, porta });
  const cdp = conectar(proc.ws); await cdp.pronto;
  const p = await Pagina.abrir(cdp, HOST);
  await sleep(900);
  await p.avaliar(`
    localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(sessTxt)});
    ${skipKey ? `localStorage.setItem(${JSON.stringify(skipKey)}, '1');` : ''}
    return 1;
  `);
  await p.largura(largura, altura); await sleep(400);
  await p.avaliar(`location.reload(); return 1;`).catch(() => {});
  const ini = Date.now();
  let boot = null;
  while (Date.now() - ini < 70000) {
    boot = await p.avaliar(`
      const nav = document.querySelectorAll('#appShell .sidebar .nav-item[data-section]').length;
      return { ready: !!document.getElementById('appShell')?.classList.contains('ready'),
               login: !document.getElementById('loginScreen')?.classList.contains('hidden'), nav,
               modal: !!document.getElementById('preferredNameModal') && !document.getElementById('preferredNameModal').classList.contains('hidden') };
    `).catch(() => null);
    if (boot && boot.ready && !boot.login && boot.nav >= 10) break;
    await sleep(700); await p.desgelo();
  }
  await sleep(1200);
  return { p, cdp, proc, uid, boot };
}

async function abrirChatVisivel(p) {
  // espera a view do chat interna ficar visível com a lista de conversas montada
  const ini = Date.now();
  let st = null;
  while (Date.now() - ini < 20000) {
    st = await p.avaliar(`
      const view = document.getElementById('internalChatView');
      return { vis: !!view && !view.classList.contains('hidden'),
               lista: !!view?.querySelector('[data-chat-room-list]'),
               salas: [...(view?.querySelectorAll('[data-chat-room]') || [])].map(b => b.dataset.chatRoom) };
    `).catch(() => null);
    if (st?.vis && st?.lista) break;
    await sleep(700); await p.desgelo();
  }
  return st;
}

// v60: o chat vivo é o módulo v3, que renderiza os balões em [data-chat-messages].
// Há dois .nav-item[data-section="chat-interno"] no shell; clica o que está de fato visível.
// O nav do coordinator é montado de forma assíncrona após o boot: a sondagem precisa de janela longa.
async function clicarNavChat(p, { tempo = 20000, pausa = 700 } = {}) {
  const ini = Date.now();
  while (Date.now() - ini < tempo) {
    const q = await p.avaliar(`
      const items = [...document.querySelectorAll('#appShell .sidebar .nav-item[data-section="chat-interno"]')];
      const b = items.find(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && !el.classList.contains('hidden'); });
      if (!b) return null;
      b.scrollIntoView({ block:'center', inline:'center' });
      await new Promise(r => setTimeout(r, 180));
      const q = b.getBoundingClientRect();
      const a = document.elementFromPoint(q.x + q.width/2, q.y + q.height/2);
      return { x: q.x + q.width/2, y: q.y + q.height/2, w: Math.round(q.width), h: Math.round(q.height),
               vis: q.width > 0 && q.height > 0 && q.x + q.width/2 >= 0 && q.y + q.height/2 >= 0 && q.x + q.width/2 < innerWidth && q.y + q.height/2 < innerHeight,
               coberto: !(a && (b === a || b.contains(a))), n: items.length };
    `).catch(() => null);
    if (q && q.vis && !q.coberto) {
      await p.clique(q.x, q.y);
      return { ok: true, rect: q, ms: Date.now() - ini };
    }
    await sleep(pausa); await p.desgelo();
  }
  return { ok: false };
}

// Caminho mobile provado pela sonda E (22/10, v60): a 390 a sidebar colapsa inteira
// (todos os nav-items ficam 0×0, inclusive [data-mobile-more]); a entrada real é a barra
// inferior #bfrMobileBottomNav (injetada por bfr-responsive-presentation.js): rota "more"
// abre o #bfrMobileDrawer e o link [data-bfr-drawer-route="chat-interno"] navega para o chat.
async function entrarChatMobile(p) {
  const ini = Date.now();
  let barra = null;
  while (Date.now() - ini < 45000) {
    barra = await p.avaliar(`
      const el = document.getElementById('bfrMobileBottomNav');
      if (!el) return { existe: false };
      const r = el.getBoundingClientRect();
      const rotas = [...el.querySelectorAll('[data-bfr-mobile-route]')].map(b => { const q = b.getBoundingClientRect(); return { r: b.dataset.bfrMobileRoute, w: Math.round(q.width), h: Math.round(q.height) }; });
      return { existe: true, w: Math.round(r.width), h: Math.round(r.height), rotas };
    `).catch(() => null);
    if (barra?.existe && barra.w > 0 && barra.rotas.some(r => r.r === 'more' && r.w > 0)) break;
    await sleep(1000); await p.desgelo();
  }
  if (!barra?.existe || !barra.rotas.some(r => r.r === 'more' && r.w > 0)) return { ok: false, passo: 'barra', detalhe: barra };
  const clMore = await clicar(p, '#bfrMobileBottomNav [data-bfr-mobile-route="more"]', { tentativas: 4, pausa: 600 });
  if (!clMore.ok) return { ok: false, passo: 'clique-more', detalhe: clMore };
  const iniDrawer = Date.now();
  let drawer = null;
  while (Date.now() - iniDrawer < 15000) {
    drawer = await p.avaliar(`
      const dr = document.getElementById('bfrMobileDrawer');
      if (!dr) return null;
      const panel = dr.querySelector('.bfr-mobile-drawer-panel');
      const pr = panel ? panel.getBoundingClientRect() : null;
      const link = dr.querySelector('[data-bfr-drawer-route="chat-interno"]');
      const lr = link ? link.getBoundingClientRect() : null;
      return { aberto: dr.classList.contains('is-open'), panelX: pr ? Math.round(pr.x) : null,
               link: link ? { w: Math.round(lr.width), h: Math.round(lr.height), x: Math.round(lr.x), y: Math.round(lr.y), hidden: link.classList.contains('hidden') } : null };
    `).catch(() => null);
    if (drawer?.aberto && drawer.link && drawer.link.w > 0 && drawer.link.x >= 0 && drawer.panelX >= -5) break;
    await sleep(700); await p.desgelo();
  }
  if (!drawer?.aberto || !drawer?.link) return { ok: false, passo: 'drawer', detalhe: drawer };
  const clLink = await clicar(p, '#bfrMobileDrawer [data-bfr-drawer-route="chat-interno"]', { tentativas: 4, pausa: 700 });
  if (!clLink.ok) return { ok: false, passo: 'clique-link', detalhe: clLink };
  return { ok: true, via: 'drawer', ms: Date.now() - ini, barra, drawer, clMore, clLink };
}

// Diagnóstico dos candidatos de entrada do chat (para o diário em caso de falha).
async function candidatosChat(p) {
  return await p.avaliar(`
    const dump = sel => [...document.querySelectorAll(sel)].map(el => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, hidden: el.classList.contains('hidden'),
               dentro: r.width > 0 && r.height > 0 };
    });
    const barra = document.getElementById('bfrMobileBottomNav');
    const dr = document.getElementById('bfrMobileDrawer');
    return { navItems: dump('#appShell .sidebar .nav-item[data-section="chat-interno"]'),
             platformItem: dump('[data-internal-chat-nav]'),
             mobileOption: dump('[data-mobile-chat-option]'),
             mobileMore: dump('[data-mobile-more]'),
             bottomNav: barra ? { existe: true, w: Math.round(barra.getBoundingClientRect().width),
               rotas: dump('#bfrMobileBottomNav [data-bfr-mobile-route]') } : { existe: false },
             drawerLink: dr ? dump('#bfrMobileDrawer [data-bfr-drawer-route="chat-interno"]') : null,
             drawerAberto: dr ? dr.classList.contains('is-open') : null };
  `).catch(() => null);
}

let ctx = null, ctxB = null;
try {
  console.log('[A1] abre o app (sessão pedagogical sintética, 1280)');
  ctx = await abrirApp({ largura: 1280, altura: 900, porta: 9361 });
  const { p } = ctx;
  diario.boot_a = ctx.boot;
  if (!ctx.boot?.ready) falhar('boot A não assentou: ' + JSON.stringify(ctx.boot));

  console.log('[A2] clica Chat interno no menu do professor');
  const navClick = await clicar(p, '#appShell .sidebar [data-teacher-nav] .nav-item[data-section="chat-interno"]', { tentativas: 4, pausa: 700 });
  diario.clique_nav_a = navClick;
  if (!navClick.ok) falhar('clique no menu Chat interno falhou: ' + JSON.stringify(navClick));
  const chatA = await abrirChatVisivel(p);
  diario.chat_aberto_a = chatA;
  if (!chatA?.vis) falhar('view do chat não ficou visível (fase A): ' + JSON.stringify(chatA));

  console.log('[A3] abre a conversa sintética');
  const iniSalaA = Date.now();
  let salaA = null;
  while (Date.now() - iniSalaA < 20000) {
    salaA = await p.avaliar(`
      const b = document.querySelector('[data-chat-room-list] [data-chat-room="${fix.thread}"]');
      return b ? { achou: true, ativa: b.classList.contains('is-active') } : null;
    `).catch(() => null);
    if (salaA?.achou) break;
    await sleep(700); await p.desgelo();
  }
  diario.sala_a = salaA;
  if (!salaA?.achou) falhar('conversa do fixture não apareceu na lista (fase A): ' + JSON.stringify(salaA));
  const clicSalaA = await clicar(p, `[data-chat-room-list] [data-chat-room="${fix.thread}"]`);
  diario.clique_sala_a = clicSalaA;
  if (!clicSalaA.ok) falhar('clique na conversa falhou (fase A): ' + JSON.stringify(clicSalaA));
  const iniCompA = Date.now();
  let compA = null;
  while (Date.now() - iniCompA < 15000) {
    compA = await p.avaliar(`
      const t = document.querySelector('[data-chat-form] textarea');
      const b = document.querySelector('[data-chat-form] button[type="submit"]');
      return { habilitado: !!t && !t.disabled && !!b && !b.disabled, titulo: document.querySelector('[data-chat-title]')?.textContent || '' };
    `).catch(() => null);
    if (compA?.habilitado) break;
    await sleep(700); await p.desgelo();
  }
  diario.composer_a = compA;
  if (!compA?.habilitado) falhar('composer não habilitou (fase A): ' + JSON.stringify(compA));

  console.log('[A4] digita e envia a mensagem');
  const pre = await preencher(p, '[data-chat-form] textarea[name="body"]', MENSAGEM);
  diario.preenchimento_a = pre;
  if (!pre?.ok) falhar('preenchimento do composer falhou: ' + JSON.stringify(pre));
  const envio = await clicar(p, '[data-chat-form] button[type="submit"]', { tentativas: 4, pausa: 700 });
  diario.clique_enviar_a = envio;
  if (!envio.ok) falhar('clique em Enviar falhou: ' + JSON.stringify(envio));
  const alvoA = MENSAGEM.slice(-15);
  const balao = await esperarTexto(p, '[data-chat-messages]', alvoA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 45000);
  diario.balao_a = balao;
  if (!balao.ok) {
    diario.toast_a = await p.avaliar(`return document.querySelector('[data-chat-toast]')?.textContent || null;`).catch(() => null);
    falhar('mensagem não apareceu no balão (fase A): ' + JSON.stringify({ balao, toast: diario.toast_a }));
  }

  console.log('[A5] prova no banco (mensagem do pedagogical)');
  const provaA = await rodarSql(`select json_build_object(
    'msg', (select json_agg(json_build_object('id',id,'room_id',room_id,'sender_id',sender_id,'body',body) order by created_at desc) from public.internal_chat_messages where room_id='${fix.thread}' and sender_id='${contas.pedagogical}' limit 3),
    'total_thread', (select count(*)::int from public.internal_chat_messages where room_id='${fix.thread}')
  ) as dados;`);
  diario.prova_a = provaA[0].dados;
  const msgA = (provaA[0].dados.msg || []).find(m => m.body === MENSAGEM);
  if (!msgA || msgA.room_id !== fix.thread || msgA.sender_id !== contas.pedagogical) {
    falhar('mensagem não está no banco com os campos esperados: ' + JSON.stringify(provaA[0].dados));
  }
  diario.msg_a_id = msgA.id;

  console.log('[B1] abre o app com a sessão coordinator (mobile 390, porta 9362)');
  ctxB = await abrirSessao('bfr-audit-session-coordinator.json', { largura: 390, altura: 844, porta: 9362 });
  const q = ctxB.p;
  diario.boot_b = ctxB.boot;
  if (!ctxB.boot?.ready) falhar('boot B não assentou: ' + JSON.stringify(ctxB.boot));

  console.log('[B2] entra no chat: sidebar se visível, senão barra inferior → more → drawer');
  diario.estado_menu_b = await q.avaliar(`
    const opt = document.querySelector('[data-mobile-chat-option]');
    const item = document.querySelector('[data-internal-chat-nav]');
    return { chatOptionHidden: opt?.classList.contains('hidden') ?? null, platformItemHidden: item?.classList.contains('hidden') ?? null };
  `).catch(() => null);
  let viaB = 'nav';
  const navB = await clicarNavChat(q, { tempo: 8000 });
  diario.clique_nav_b = navB;
  if (!navB.ok) {
    const mobileB = await entrarChatMobile(q);
    diario.entrada_mobile_b = mobileB;
    if (!mobileB.ok) {
      diario.candidatos_b = await candidatosChat(q);
      falhar('nenhuma entrada de chat-interno clicável para a coordinator (fase B): ' + JSON.stringify({ navB, mobileB, candidatos: diario.candidatos_b }));
    }
    viaB = 'drawer';
  }
  diario.via_b = viaB;
  const chatB = await abrirChatVisivel(q);
  diario.chat_aberto_b = chatB;
  if (!chatB?.vis) falhar('view do chat não ficou visível (fase B): ' + JSON.stringify(chatB));

  console.log('[B3] abre a mesma conversa e confere a mensagem recebida');
  const iniSalaB = Date.now();
  let salaB = null;
  while (Date.now() - iniSalaB < 20000) {
    salaB = await q.avaliar(`
      const b = document.querySelector('[data-chat-room-list] [data-chat-room="${fix.thread}"]');
      return b ? { achou: true } : null;
    `).catch(() => null);
    if (salaB?.achou) break;
    await sleep(700); await q.desgelo();
  }
  diario.sala_b = salaB;
  if (!salaB?.achou) falhar('conversa do fixture não apareceu para a coordinator (fase B): ' + JSON.stringify(salaB));
  const clicSalaB = await clicar(q, `[data-chat-room-list] [data-chat-room="${fix.thread}"]`);
  diario.clique_sala_b = clicSalaB;
  if (!clicSalaB.ok) falhar('clique na conversa falhou (fase B): ' + JSON.stringify(clicSalaB));
  const alvoB = MENSAGEM.slice(-15);
  const balaoB = await esperarTexto(q, '[data-chat-messages]', alvoB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 45000);
  diario.balao_b = balaoB;
  if (!balaoB.ok) {
    diario.toast_b = await q.avaliar(`return document.querySelector('[data-chat-toast]')?.textContent || null;`).catch(() => null);
    falhar('coordinator não viu a mensagem do pedagogical (fase B): ' + JSON.stringify({ balao: balaoB, toast: diario.toast_b }));
  }

  console.log('[B4] prova do recibo de leitura no banco');
  const iniRecibo = Date.now();
  let provaB = null;
  while (Date.now() - iniRecibo < 30000) {
    provaB = await rodarSql(`select json_build_object(
      'membro', (select json_agg(json_build_object('profile_id',profile_id,'last_read_at',last_read_at) order by profile_id) from public.internal_chat_room_members where room_id='${fix.thread}'),
      'msg_criada', (select created_at from public.internal_chat_messages where id='${msgA.id}')
    ) as dados;`).catch(() => null);
    const mQ = provaB?.[0]?.dados?.membro?.find(m => m.profile_id === contas.coordinator);
    const criada = provaB?.[0]?.dados?.msg_criada ? new Date(provaB[0].dados.msg_criada) : null;
    const lida = mQ?.last_read_at ? new Date(mQ.last_read_at) : null;
    if (lida && criada && !isNaN(lida) && lida >= criada) break;
    await sleep(1000);
  }
  diario.prova_b = provaB?.[0]?.dados;
  const membroQ = provaB?.[0]?.dados?.membro?.find(m => m.profile_id === contas.coordinator);
  const criada = provaB?.[0]?.dados?.msg_criada ? new Date(provaB[0].dados.msg_criada) : null;
  const lida = membroQ?.last_read_at ? new Date(membroQ.last_read_at) : null;
  if (!lida || !criada || isNaN(lida) || lida < criada) {
    falhar(`recibo de leitura da coordinator ausente ou anterior à mensagem: ${JSON.stringify(provaB)}`);
  }
  diario.recibo_b = { last_read_at: membroQ.last_read_at, msg_criada: provaB[0].dados.msg_criada, ok: lida >= criada };

  diario.veredito = 'APROVADO';
  console.log('CHAT E2E APROVADO');
} catch (e) {
  diario.falha = String(e?.message || e);
  diario.veredito = 'FALHOU';
  console.error('FALHOU:', diario.falha);
} finally {
  try { if (ctx) await fecharApp(ctx); } catch {}
  try { if (ctxB) await fecharApp(ctxB); } catch {}
  salvarJson(`${DIR}/e2e2-chat.json`, diario);
  if (diario.falha) process.exitCode = 1;
}
