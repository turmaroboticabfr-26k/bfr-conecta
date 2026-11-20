// P36-B2 — PROVA DE BROWSER COM SESSÃO do sub-aba «Supervisão» do módulo Secretaria de Educação (PEN-36).
// Sucessora do `scripts/p36-navegador-supervisao.mjs`, cujo primeiro registo ficou vermelho por dois
// defeitos MEUS, medidos em evidence/p36-browser-supervisao-ANTERIOR-runtime-nao-exposto-e-gaveta-fechada-390px.json
// e explicados pelo recon evidence/p36-recon-gaveta-secretaria-19-11.json:
//   (1) eu classificava persona positiva/negativa por `window.BFR_APP_RUNTIME.roleSectionAccess`, e esse
//       global NAO EXISTE no ar: `typeof window.BFR_APP_RUNTIME === 'undefined'`, idem BFRSecretaryCentral
//       e BFRMunicipalView, com `BFR_CURRENT_PROFILE` presente como controlo positivo. A expectativa ficou
//       null para os tres perfis e os dois positivos caíram no ramo negativo (o verde do director foi
//       acccidental). Agora a régua lê-se dos BYTES SERVIDOS: a linha do papel em `roleSectionAccess` e a
//       cláusula distintiva do `allowed()` do modulo — texto que o proprio deploy publicou, nao uma lista
//       minha. O browser teste a regra, nao a minha suposicao.
//   (2) a 390 px o `button[data-section]` esta no DOM com `visivel:false` (gaveta fechada mantem os nos) e
//       o `[data-mobile-more]` tambem nao esta hit-testavel. Agora ha censo de entradas (bottom nav, drawer,
//       barra lateral, «Mais») com elementFromPoint por entrada, e a camada usada fica nomeada.
// O painel e o que o PEN-36 pede: clique de rato no `data-sec-tab="supervisao"` e o que fica assente, com
// cada contagem do DOM confrontada com o que A MESMA sessao le por PostgREST dentro da pagina (o recon
// `scripts/p36-recon-linhas-supervisao.mjs` mediu 0 linhas em supervision_requests e 6 em schools, mas só
// education_supervisor ve as 6 — secretary ve 0). 0 escrita, 0 DDL, 0 mint; tokens so em memoria.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const STORAGE_KEY = 'sb-yyzqoxlkcvqpessypfjo-auth-token';
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8')) || [])[0] + '/';
if (!/workers\.dev/.test(URL_APP)) throw new Error('ABORTA: sem URL de publicacao no diario da v136');
const ESP = JSON.parse(readFileSync(join(REPO, 'worker-deploy-v136-secretaria-de-educacao/esperado-v136.json'), 'utf8'));
const PERFIS = (process.env.P36_PERFIS || 'secretary').split(',');
const LARGURAS = (process.env.P36_LARGURAS || '390,1280').split(',').map(Number);
const SUF = process.env.P36_SUF ? '-' + process.env.P36_SUF : '';
const EVID = join(REPO, 'evidence');
const OUT = join(EVID, `p36-browser-supervisao-${PERFIS.join('-')}-${LARGURAS.join('-')}px-19-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P36_SUF=novo, nao por cima');
const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');
const COLUNAS = 'id,indicator,motive,description,questions,deadline_at,priority,status,created_by,closed_by,closed_at,created_at,updated_at,school_id,sports_schools(name)';

const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const shellMd5 = md5(shellTxt);
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const ocorrenciasSubAba = shellTxt.split('data-sec-tab="supervisao"').length - 1;

// A regra do produtor, extraida dos bytes servidos. `roleSectionAccess` e um objecto literal com uma
// linha por papel; a do `allowed()` do modulo localiza-se pela sua clausula distintiva, porque ha varios
// `const allowed` no bundle (o recon provou: o primeiro e o do painel de coordenação).
const linhaDoMapa = (papelNome) => {
  const re = new RegExp('^\\s*' + papelNome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*\\[([^\\]]*)\\]', 'm');
  const m = re.exec(shellTxt);
  return m ? m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : null;
};
const assinaturaAllowed = "['secretary','education_supervisor'].includes(role())";
const listaAllowed = (() => {
  const i = shellTxt.indexOf(assinaturaAllowed);
  if (i < 0) return null;
  const m = /const allowed = \(\) => \[([^\]]*)\]/.exec(shellTxt.slice(Math.max(0, i - 400), i + assinaturaAllowed.length));
  return m ? m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : null;
})();

const ah2 = JSON.parse(readFileSync(`${FORA}/ah2-sessions.json`, 'utf8'));
const papelPorUid = Object.fromEntries((await sql(`select id::text as uid, role::text as papel from public.profiles`)).map((x) => [x.uid, x.papel]));
const unidades = [];
for (const perfil of PERFIS) {
  const s = ah2[perfil];
  if (!s) throw new Error(`ABORTA: sem sessao local para ${perfil}`);
  const papel = papelPorUid[s.id] || 'SEM-PERFIL';
  let access = s.access_token, renovou = false, expira = Number(s.expires_at);
  if (!(expira * 1000 > Date.now() + 30_000)) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.access_token) throw new Error(`ABORTA: refresh ${perfil} HTTP ${r.status}`);
    access = j.access_token; renovou = true; expira = Math.floor(Date.now() / 1000) + (j.expires_in || 3600);
  }
  const mapa = linhaDoMapa(papel);
  unidades.push({ perfil, uid: s.id, papel, access, expira, renovou, refresh: s.refresh_token, user: s.user,
    mapa_do_papel_servido: mapa, tem_secretaria_no_mapa: Array.isArray(mapa) ? mapa.includes('secretaria') : null, permitido_pelo_allowed: Array.isArray(listaAllowed) ? listaAllowed.includes(papel) : null });
}

const out = {
  programa: 'scripts/p36-navegador-supervisao.mjs', versao_do_instrumento: 'P36-B2', em: new Date().toISOString(), url: URL_APP,
  metodo: 'Chrome headless + CDP; sessao injetada no localStorage da origem; clique de rato (Input.dispatchMouseEvent) com hit-test elementFromPoint por entrada; contagens do DOM confrontadas com PostgREST na mesma pagina; nenhuma dependencia de globais do bundle',
  preflight_ar: { md5: shellMd5, esperado_v136: ESP.htmlMd5, bytes: Buffer.byteLength(shellTxt), ocorrencias_do_sub_aba_na_shell: ocorrenciasSubAba },
  regua_lida_dos_bytes_servidos: { assinatura_permitida_do_allowed: assinaturaAllowed, lista_do_allowed: listaAllowed, mapas: Object.fromEntries(unidades.map((u) => [u.papel, u.mapa_do_papel_servido])) },
  unidades: [],
};
const falhas = []; let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};
gate('ar servido = v136 (md5 do esperado)', shellMd5, ESP.htmlMd5);
gate('o sub-aba existe 1x na shell servida', ocorrenciasSubAba, 1);
gate('a assinatura do allowed() do modulo esta nos bytes servidos (a regua dispara)', Boolean(shellTxt.includes(assinaturaAllowed) && Array.isArray(listaAllowed) && listaAllowed.length), true);

let porta = 9401;
for (const u of unidades) {
  for (const largura of LARGURAS) {
    const rotulo = `${u.perfil}/${largura}px`;
    const positivo = u.tem_secretaria_no_mapa === true && u.permitido_pelo_allowed === true;
    const dirPerfil = `${FORA}/.p36b2-${u.perfil}-${largura}`;
    if (existsSync(dirPerfil)) rmSync(dirPerfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    mkdirSync(dirPerfil, { recursive: true });
    const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
      `--remote-debugging-port=${porta}`, `--user-data-dir=${dirPerfil}`, '--headless=new', `--window-size=${largura},900`,
      '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
    ], { stdio: 'ignore' });
    const pid = chrome.pid; porta++;
    const mate = () => { try { spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} };
    const vigia = setTimeout(mate, 210000);
    const reg = { perfil: u.perfil, papel: u.papel, uid: u.uid, largura_declarada: largura, token_renovado: u.renovou,
      expectativa_da_regua: { secretaria_no_mapa_do_papel: u.tem_secretaria_no_mapa, esperado_positivo: positivo }, etapas: {} };
    out.unidades.push(reg);
    try {
      let alvos = [];
      for (let i = 0; i < 60; i++) {
        try { alvos = await (await fetch(`http://127.0.0.1:${porta - 1}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (alvos.some((t) => t.type === 'page')) break; } catch {}
        await new Promise((r) => setTimeout(r, 500));
      }
      const page = alvos.find((t) => t.type === 'page'); if (!page) throw new Error('sem alvo page no CDP');
      let fecho = false; const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('handshake 30 s')), 30000); });
      ws.onclose = () => { if (!fecho) throw new Error('ws fechado pelo chrome'); };
      let seq = 0; const pending = new Map(); const erros = [];
      ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 220));
        if (m.method === 'Runtime.exceptionThrown') erros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 220));
      };
      const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
      const evalJS = async (e) => {
        const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
        return r.result?.value;
      };
      const waitFor = async (e, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(e)) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor expirou: ' + e.slice(0, 120)); };
      await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
      await send('Emulation.setDeviceMetricsOverride', { width: largura, height: 900, deviceScaleFactor: 1, mobile: largura <= 500 });
      await send('Page.navigate', { url: URL_APP });
      await waitFor(`!!document.getElementById('loginScreen')`, 60000);
      const sessao = { access_token: u.access, token_type: 'bearer', expires_in: Math.max(u.expira - Math.floor(Date.now() / 1000), 60), expires_at: u.expira, refresh_token: u.refresh, user: u.user };
      await evalJS(`(() => { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)})); localStorage.setItem('bfr-pn-skipped:' + ${JSON.stringify(u.uid)}, '1'); return true; })()`);
      await send('Page.navigate', { url: URL_APP });
      reg.etapas.ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(u.papel)}`, 120000);
      reg.etapas.janela = await evalJS(`({ innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight })`);
      gate(rotulo + ' · largura real da janela de layout (documentElement.clientWidth)', reg.etapas.janela.clientWidth, largura);
      reg.etapas.globais_do_bundle = await evalJS(`({ current_profile: typeof window.BFR_CURRENT_PROFILE, app_runtime: typeof window.BFR_APP_RUNTIME, secretary_central: typeof window.BFRSecretaryCentral, municipal: typeof window.BFRMunicipalView })`);

      const estado = `(function (sel) {
        const b = document.querySelector(sel);
        if (!b) return { sel: sel, presente: false };
        b.scrollIntoView({ block: 'center', inline: 'nearest' });
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const em = document.elementFromPoint(cx, cy);
        return { sel: sel, presente: true, visivel: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
          rect: [Math.round(r.width), Math.round(r.height)], centro: [Math.round(cx), Math.round(cy)],
          dentro_da_janela: r.width > 0 && r.height > 0 && cx >= 0 && cy >= 0 && cx <= window.innerWidth && cy <= window.innerHeight,
          no_ponto: em ? em.tagName + (typeof em.className === 'string' && em.className ? '.' + em.className.trim().split(' ').slice(0, 2).join('.') : '') : null,
          alvo_contem: !!em && (b === em || b.contains(em)), texto: (b.textContent || '').trim().slice(0, 34) };
      })`;
      const ENTRADAS = [`#bfrMobileBottomNav [data-bfr-mobile-route="secretaria"]`, `#bfrMobileDrawer .bfr-mobile-drawer-link[data-bfr-drawer-route="secretaria"]`, `[data-mobile-more]`, `button[data-section="secretaria"]:not([data-teacher-nav-tab])`];
      const censo = async () => await evalJS(`(function () { const f = ${estado}; return [${ENTRADAS.map((s) => JSON.stringify(s)).join(', ')}].map(function (s) { return f(s); }); })()`);
      const ratoEm = async (e) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: e.centro[0], y: e.centro[1] }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: e.centro[0], y: e.centro[1], button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: e.centro[0], y: e.centro[1], button: 'left', clickCount: 1 }); };
      const apta = (e) => e && e.presente && e.dentro_da_janela && e.alvo_contem;

      reg.etapas.entradas_antes = await censo();
      let escolhida = reg.etapas.entradas_antes.find(apta);
      const trilha = [];
      if (!escolhida) {
        const mais = reg.etapas.entradas_antes.find((e) => e.sel === '[data-mobile-more]');
        if (apta(mais)) { await ratoEm(mais); trilha.push('rato em [data-mobile-more]'); await evalJS(`new Promise(r => setTimeout(r, 900))`); reg.etapas.entradas_apos_mais = await censo(); reg.etapas.menu_mais = await evalJS(`({ presente: !!document.getElementById('mobileMoreMenu'), oculto: !!document.getElementById('mobileMoreMenu') && document.getElementById('mobileMoreMenu').classList.contains('hidden'), links: Array.from(document.querySelectorAll('#mobileMoreMenu [data-section], #mobileMoreMenu [data-bfr-drawer-route], #mobileMoreMenu a, #mobileMoreMenu button')).slice(0, 40).map(function (x) { return (x.dataset.section || x.dataset.bfrDrawerRoute || x.tagName) + ':' + (x.textContent || '').trim().slice(0, 24) + ':vis=' + !!(x.offsetWidth || x.offsetHeight); }) })`);
          escolhida = reg.etapas.entradas_apos_mais.find(apta) || null;
        } else trilha.push('[data-mobile-more] nao hit-testavel: ' + JSON.stringify(mais));
      }
      let camada = null;
      if (escolhida) { await ratoEm(escolhida); camada = 'rato'; }
      else {
        const botao = reg.etapas.entradas_antes.find((e) => e.sel.startsWith('button[data-section')) || null;
        const ok = await evalJS(`(function () { const b = document.querySelector('button[data-section="secretaria"]:not([data-teacher-nav-tab])'); if (!b) return false; b.click(); return true; })()`);
        camada = ok ? 'sintetico' : 'sem-entrada';
        trilha.push('sintetico porque nenhuma entrada estava hit-testavel: ' + JSON.stringify(reg.etapas.entradas_antes.map((e) => [e.sel, e.presente, e.visivel, e.dentro_da_janela])));
      }
      reg.etapas.abertura = { camada, escolhida: escolhida ? { sel: escolhida.sel, centro: escolhida.centro, no_ponto: escolhida.no_ponto } : null, trilha };
      await evalJS(`new Promise(r => setTimeout(r, 2200))`);
      reg.etapas.depois_da_abertura = await evalJS(`({ central: !!document.querySelector('[data-secretary-central]'), n_tabs: document.querySelectorAll('[data-secretary-central] [data-sec-tab]').length, activeSection: (document.querySelector('button[data-section].active') || {}).dataset ? document.querySelector('button[data-section].active').dataset.section : null })`);

      if (positivo) {
        gate(rotulo + ' · a central abre com o clique na entrada (' + camada + ')', [reg.etapas.depois_da_abertura.central, reg.etapas.depois_da_abertura.n_tabs], [true, 13]);
        const sub = `[data-secretary-central] button[data-sec-tab="supervisao"]`;
        reg.etapas.sub_aba_antes = await evalJS(`(function () { const f = ${estado}; return f(${JSON.stringify(sub)}); })()`);
        await evalJS(`new Promise(function (r) { setTimeout(r, 450); })`);
        reg.etapas.sub_aba_estabilizada = await evalJS(`(function () { const f = ${estado}; return f(${JSON.stringify(sub)}); })()`);
        const q1 = reg.etapas.sub_aba_antes.centro; const q2 = reg.etapas.sub_aba_estabilizada.centro;
        reg.etapas.centro_derivou = { derivou: !!(q1 && q2 && (q1[0] !== q2[0] || q1[1] !== q2[1])), primeira: q1, estabilizada: q2 };
        // A amostra nao depende do meu centro guardado: vai buscar o rect no instante, testa o ponto e diz o painel.
        // So assim «o rato nao chegou» se distingue de «o centro que eu guardei ja nao era do alvo».
        const amostra = () => evalJS(`(function () {
          const b = document.querySelector(${JSON.stringify(sub)});
          const r = b ? b.getBoundingClientRect() : null;
          const cx = r ? Math.round(r.left + r.width / 2) : -1, cy = r ? Math.round(r.top + r.height / 2) : -1;
          const em = r ? document.elementFromPoint(cx, cy) : null;
          const a = document.querySelector('[data-secretary-central] [data-sec-tab].is-active');
          const body = document.querySelector('[data-secretary-central] [data-sec-body]');
          const um = body ? body.querySelector('.bfr-secretary-label') : null; const dois = body ? body.querySelector('h2') : null;
          return { ativa: a ? a.dataset.secTab : null, n_ativas: document.querySelectorAll('[data-secretary-central] [data-sec-tab].is-active').length,
            centro: r ? [cx, cy] : null, no_ponto: em ? em.tagName : null, alvo_contem: !!em && !!b && (b === em || b.contains(em)),
            painel: [um ? String(um.textContent).trim() : null, dois ? String(dois.textContent).trim() : null],
            scroll: [Math.round(window.scrollY || 0), Math.round((document.scrollingElement || document.documentElement).scrollTop)],
            scroll_behavior_html: getComputedStyle(document.documentElement).scrollBehavior };
        })()`);
        const rastreio = async () => { const v = []; let t = 0; for (const d of [120, 280, 500, 700, 1000]) { await evalJS(`new Promise(function (r) { setTimeout(r, ${d}); })`); t += d; const a = await amostra(); a.desde_o_clique_ms = t; v.push(a); } return v; };
        let camada_sub = null;
        if (apta(reg.etapas.sub_aba_estabilizada)) {
          await ratoEm(reg.etapas.sub_aba_estabilizada);
          reg.etapas.rastreio_apos_rato = await rastreio();
          if (reg.etapas.rastreio_apos_rato.some((a) => a.ativa === 'supervisao')) camada_sub = 'rato';
        } else reg.etapas.rato_impossivel = reg.etapas.sub_aba_estabilizada;
        if (!camada_sub) {
          await evalJS(`(function () { const b = document.querySelector(${JSON.stringify(sub)}); if (!b) return false; b.click(); return true; })()`);
          reg.etapas.rastreio_apos_sintetico = await rastreio();
          if (reg.etapas.rastreio_apos_sintetico.some((a) => a.ativa === 'supervisao')) camada_sub = 'sintetico';
        }
        reg.etapas.camada_efetiva_sub_aba = camada_sub;
        const serie = reg.etapas.rastreio_apos_sintetico || reg.etapas.rastreio_apos_rato || [];
        const fim = serie.length ? serie[serie.length - 1] : null;
        reg.etapas.abas_ativas = { ativa: fim ? fim.ativa : null, todas: fim && fim.ativa ? [fim.ativa] : [], n_ativas: fim ? fim.n_ativas : null, camada: camada_sub,
          assentou_em_ms: serie.reduce(function (acc, a) { return acc === null && a.ativa === 'supervisao' ? a.desde_o_clique_ms : acc; }, null) };
        gate(rotulo + ' · a sub-aba ativa no fim e supervisao e so ela', [reg.etapas.abas_ativas.ativa, reg.etapas.abas_ativas.n_ativas], ['supervisao', 1]);
        gate(rotulo + ' · o clique de RATO sozinho assenta a sub-aba nesta largura', Boolean(reg.etapas.rastreio_apos_rato && reg.etapas.rastreio_apos_rato.some((a) => a.ativa === 'supervisao')), true);

        reg.etapas.painel = await evalJS(`(function () {
          const body = document.querySelector('[data-secretary-central] [data-sec-body]');
          if (!body) return { body: false };
          const q = function (s) { return Array.from(body.querySelectorAll(s)); };
          const art = q('.bfr-secretary-list > article');
          const selEscola = body.querySelector('select[data-sec-supervision-school-filter]');
          const selStatus = body.querySelector('select[data-sec-supervision-filter]');
          const controles = q('button, input, select, textarea, a, [role="button"]').filter(function (c) { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
          const taps = controles.filter(function (c) { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; });
          const folhas = Array.from(body.querySelectorAll('*')).filter(function (f) {
            const direto = Array.from(f.childNodes).filter(function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent.trim(); }).join('').trim();
            if (!direto) return false;
            const px = parseFloat(getComputedStyle(f).fontSize);
            return px > 0 && px < 11 && f.getBoundingClientRect().width > 0;
          });
          const cortados = Array.from(body.querySelectorAll('*')).filter(function (e) { const r = e.getBoundingClientRect(); return r.width > 0 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1); });
          return {
            body: true, classe_do_painel: body.firstElementChild ? body.firstElementChild.className : null,
            label: (body.querySelector('.bfr-secretary-label') || {}).textContent || null,
            h2: (body.querySelector('h2') || {}).textContent || null,
            chip: (body.querySelector('.bfr-secretary-status') || {}).textContent || null,
            vazias: q('.bfr-secretary-empty').length,
            texto_vazio: (body.querySelector('.bfr-secretary-empty') || {}).textContent ? body.querySelector('.bfr-secretary-empty').textContent.trim() : null,
            linhas_dom: art.length,
            rotulos_das_linhas: art.slice(0, 8).map(function (a) { return { indicador: ((a.querySelector('strong') || {}).textContent || '').trim().slice(0, 60), detalhe: ((a.querySelector('span') || {}).textContent || '').trim().slice(0, 90), botao_abrir: !!a.querySelector('[data-sec-open-supervision]') }; }),
            metricas: q('.bfr-secretary-detail-metrics article').map(function (a) { return { rotulo: ((a.querySelector('span') || {}).textContent || '').trim(), valor: ((a.querySelector('strong') || {}).textContent || '').trim() }; }),
            opcoes_status: selStatus ? Array.from(selStatus.options).map(function (o) { return o.value; }) : null,
            opcoes_escola: selEscola ? Array.from(selEscola.options).map(function (o) { return o.value; }) : null,
            nomes_escolas: selEscola ? Array.from(selEscola.options).slice(1, 8).map(function (o) { return o.textContent.trim(); }) : null,
            chars: (body.innerText || '').trim().length, controles: controles.length,
            tap_menor_44: taps.length, taps_amostra: taps.slice(0, 10).map(function (t) { const r = t.getBoundingClientRect(); return { tag: t.tagName, cls: (t.className || '').toString().slice(0, 30), rect: [Math.round(r.width), Math.round(r.height)], texto: (t.textContent || '').trim().slice(0, 20) }; }),
            fonte_menor_11: folhas.length, fontes_amostra: folhas.slice(0, 10).map(function (f) { return { tag: f.tagName, px: parseFloat(getComputedStyle(f).fontSize), texto: (f.textContent || '').trim().slice(0, 30) }; }),
            cortados: cortados.length,
            cortados_amostra: cortados.slice(0, 6).map(function (e) { const r = e.getBoundingClientRect(); return { no: e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(' ').slice(0, 2).join('.') : ''), caixa: [Math.round(r.width), Math.round(r.height)], scroll: [e.scrollWidth, e.scrollHeight], cliente: [e.clientWidth, e.clientHeight] }; }),
            estouro_horizontal: document.body.scrollWidth > document.documentElement.clientWidth + 1,
            reguas: { innerWidth: window.innerWidth, body_scrollWidth: document.body.scrollWidth, clientWidth: document.documentElement.clientWidth },
          };
        })()`);
        gate(rotulo + ' · o painel assente e o do sub-aba', [reg.etapas.painel.label && reg.etapas.painel.label.trim(), reg.etapas.painel.h2 && reg.etapas.painel.h2.trim()], ['Supervisão Educacional', 'Solicitações de Supervisão']);
        reg.etapas.api_na_pagina = await evalJS(`(async function () {
          const s = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
          const h = { apikey: ${JSON.stringify(anonKey)}, Authorization: 'Bearer ' + s.access_token, accept: 'application/json' };
          const um = await fetch(${JSON.stringify(HOST)} + '/rest/v1/supervision_requests?select=' + encodeURIComponent(${JSON.stringify(COLUNAS)}) + '&order=created_at.desc&limit=200', { headers: h });
          const dois = await fetch(${JSON.stringify(HOST)} + '/rest/v1/schools?select=id,name,active&order=name&limit=50', { headers: h });
          const a = await um.json().catch(function () { return null; });
          const b = await dois.json().catch(function () { return null; });
          return { supervisao_http: um.status, supervisao_linhas: Array.isArray(a) ? a.length : null, schools_http: dois.status, schools_linhas: Array.isArray(b) ? b.length : null, schools_visiveis: Array.isArray(b) ? b.filter(function (x) { return x.active !== false; }).length : null };
        })()`);
        gate(rotulo + ' · linhas do DOM = linhas que ESTA sessao le por PostgREST', [reg.etapas.painel.linhas_dom, reg.etapas.api_na_pagina.supervisao_linhas], [reg.etapas.api_na_pagina.supervisao_linhas, reg.etapas.api_na_pagina.supervisao_linhas]);
        gate(rotulo + ' · o chip «N registro(s)» bate com o DOM', reg.etapas.painel.chip && reg.etapas.painel.chip.trim(), reg.etapas.painel.linhas_dom + ' registro(s)');
        gate(rotulo + ' · a aula vazia printa com o predicado (empty === 0 linhas lidas)', reg.etapas.painel.vazias, reg.etapas.api_na_pagina.supervisao_linhas === 0 ? 1 : 0);
        gate(rotulo + ' · filtro de escola = escolas que esta sessao le (RLS, nao o censo do banco)', (reg.etapas.painel.opcoes_escola || []).length - 1, reg.etapas.api_na_pagina.schools_visiveis);
        gate(rotulo + ' · sem estouro horizontal do painel contra documentElement.clientWidth', reg.etapas.painel.estouro_horizontal, false);
        gate(rotulo + ' · as 8 opcoes de status do sub-aba', (reg.etapas.painel.opcoes_status || []).length, 8);
        reg.etapas.operacao_filtro = await evalJS(`(function () {
          const sel = document.querySelector('[data-sec-body] select[data-sec-supervision-filter]');
          if (!sel) return { aplicou: false };
          const conta = function () { return document.querySelectorAll('[data-sec-body] .bfr-secretary-list > article').length; };
          const antes = conta();
          sel.value = 'Concluída'; sel.dispatchEvent(new Event('change', { bubbles: true }));
          const depois = conta(); const vazia = !!document.querySelector('[data-sec-body] .bfr-secretary-empty');
          sel.value = 'all'; sel.dispatchEvent(new Event('change', { bubbles: true }));
          return { aplicou: true, antes, depois_do_filtro: depois, vazia_depois_do_filtro: vazia, restaurado: conta() };
        })()`);
        gate(rotulo + ' · mexer o filtro nao parte o painel e voltar a all restaura', [reg.etapas.operacao_filtro.aplicou, reg.etapas.operacao_filtro.restaurado], [true, reg.etapas.operacao_filtro.antes]);
        // Os dois controles que o bind() do bundle tambe sem debounce: `input` em [data-sec-supervision-query]
        // e `change` em [data-sec-supervision-school-filter] — ambos escrevem no state comum e dao render().
        // O query e o filtro de escola partilham `state.query`/`state.supervisionSchoolFilter` com as outras
        // abas, por isso a passada restaura o valor vazio/all e gateia a restauracao, nao o efeito (0 linhas).
        reg.etapas.operacao_busca = await evalJS(`(async function () {
          const inp = document.querySelector('[data-sec-body] input[data-sec-supervision-query]');
          if (!inp) return { presente: false };
          const espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
          const conta = function () { return document.querySelectorAll('[data-sec-body] .bfr-secretary-list > article').length; };
          const chip = function () { return ((document.querySelector('[data-sec-body] .bfr-secretary-status') || {}).textContent || '').trim(); };
          const antes = { linhas: conta(), chip: chip(), placeholder: inp.getAttribute('placeholder'), tipo: inp.getAttribute('type') };
          inp.value = 'zzqqx'; inp.dispatchEvent(new Event('input', { bubbles: true })); await espera(700);
          const durante = { linhas: conta(), chip: chip() };
          inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); await espera(700);
          return { presente: true, antes, durante, depois: { linhas: conta(), chip: chip() } };
        })()`);
        gate(rotulo + ' · a caixa Buscar existe no sub-aba e escrever+limpar restaura linhas e chip', [reg.etapas.operacao_busca.presente, reg.etapas.operacao_busca.depois && reg.etapas.operacao_busca.depois.linhas, reg.etapas.operacao_busca.depois && reg.etapas.operacao_busca.depois.chip], [true, reg.etapas.operacao_busca.antes && reg.etapas.operacao_busca.antes.linhas, reg.etapas.operacao_busca.antes && reg.etapas.operacao_busca.antes.chip]);
        reg.etapas.operacao_escola = await evalJS(`(async function () {
          const sel = document.querySelector('[data-sec-body] select[data-sec-supervision-school-filter]');
          if (!sel) return { presente: false };
          const espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
          const conta = function () { return document.querySelectorAll('[data-sec-body] .bfr-secretary-list > article').length; };
          const opcoes = function () { return Array.from(sel.options).map(function (o) { return o.value; }).length; };
          const antes = { linhas: conta(), opcoes: opcoes(), valor: sel.value };
          if (sel.options.length > 1) { sel.value = sel.options[1].value; sel.dispatchEvent(new Event('change', { bubbles: true })); await espera(700); }
          const durante = { linhas: conta(), valor: sel.value, rotulo: sel.options.length > 1 ? sel.options[1].textContent.trim() : null };
          sel.value = 'all'; sel.dispatchEvent(new Event('change', { bubbles: true })); await espera(700);
          return { presente: true, antes, durante, depois: { linhas: conta(), opcoes: opcoes(), valor: sel.value } };
        })()`);
        gate(rotulo + ' · o filtro de escola aceita mudanca para uma escola real e volta a all intacto', [reg.etapas.operacao_escola.presente, reg.etapas.operacao_escola.depois && reg.etapas.operacao_escola.depois.valor, reg.etapas.operacao_escola.depois && reg.etapas.operacao_escola.depois.opcoes, reg.etapas.operacao_escola.depois && reg.etapas.operacao_escola.depois.linhas], [true, 'all', reg.etapas.operacao_escola.antes && reg.etapas.operacao_escola.antes.opcoes, reg.etapas.operacao_escola.antes && reg.etapas.operacao_escola.antes.linhas]);
        if (u.papel === 'education_supervisor') reg.etapas.entradas_alternativas = await evalJS(`({ botao_secao_supervisao: !!document.querySelector('button[data-section="supervisao"]:not([data-teacher-nav-tab])'), texto: ((document.querySelector('button[data-section="supervisao"]:not([data-teacher-nav-tab])') || {}).textContent || '').trim().slice(0, 40) })`);
        reg.etapas.capturas = {};
        for (const nome of ['central', 'supervisao']) {
          const alvo = nome === 'central' ? '[data-secretary-central] button[data-sec-tab="overview"]' : sub;
          await evalJS(`document.querySelector(${JSON.stringify(alvo)})?.click()`);
          await evalJS(`new Promise(function (r) { setTimeout(r, 1400); })`);
          const s = await send('Page.captureScreenshot', { format: 'png' });
          const buf = Buffer.from(s.data, 'base64');
          const caminho = join(EVID, `p36b2-${u.perfil}-${largura}-${nome}.png`);
          writeFileSync(caminho, buf);
          reg.etapas.capturas[nome] = { ficheiro: caminho.split('/').pop(), bytes: buf.length, md5: md5(buf) };
        }
      } else {
        reg.etapas.controlo_negativo = await evalJS(`(function () {
          const antes = { central: !!document.querySelector('[data-secretary-central]'), sub_aba: !!document.querySelector('button[data-sec-tab="supervisao"]'), botao_secao: !!document.querySelector('button[data-section="secretaria"]') };
          const b = document.querySelector('button[data-section="secretaria"]:not([data-teacher-nav-tab])');
          if (b) b.click();
          return { antes, tentativa_de_clique_na_seccao_havia_botao: !!b };
        })()`);
        await evalJS(`new Promise(function (r) { setTimeout(r, 2500); })`);
        reg.etapas.controlo_negativo.depois = await evalJS(`({ central: !!document.querySelector('[data-secretary-central]'), sub_aba: !!document.querySelector('button[data-sec-tab="supervisao"]') })`);
        gate(rotulo + ' · controlo negativo: sem `secretaria` no mapa, a central e o sub-aba nunca aparecem nem por clique sintetico', [reg.etapas.controlo_negativo.antes.central, reg.etapas.controlo_negativo.depois.central, reg.etapas.controlo_negativo.depois.sub_aba], [false, false, false]);
      }
      const relevantes = erros.filter((t) => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource/i.test(t));
      reg.etapas.erros_console = { bruto: erros.length, relevantes: relevantes.slice(0, 10) };
      gate(rotulo + ' · sem erro de aplicacao no console', relevantes.length, 0);
      fecho = true; ws.close(); mate();
    } catch (e) {
      reg.erro = String(e && (e.message || e) || e).slice(0, 300);
      falhas.push(rotulo + ' | excecao: ' + reg.erro); portoes++;
      console.log('VERMELHO  ' + rotulo + ' · excecao: ' + reg.erro.slice(0, 200));
      mate();
    } finally { clearTimeout(vigia); }
    writeFileSync(OUT, JSON.stringify(Object.assign(out, { portoes, falhas: falhas.slice(), veredito: falhas.length ? 'P36B2_COM_PORTOES_VERMELHOS' : 'P36B2_SUPERVISAO_MEDIDA' }), null, 2) + '\n');
    console.log('  ' + rotulo + ' painel=' + ((reg.etapas.painel || {}).linhas_dom ?? '-') + ' api=' + ((reg.etapas.api_na_pagina || {}).supervisao_linhas ?? '-') + ' escolas=' + (((reg.etapas.painel || {}).opcoes_escola || []).length - 1) + ' chars=' + ((reg.etapas.painel || {}).chars ?? '-') + ' camada=' + ((reg.etapas.abertura || {}).camada ?? '-'));
  }
}
out.portoes = portoes; out.falhas = falhas;
out.achado_sobre_globais = 'Os tres globais que instrumentos antigos usavam (BFR_APP_RUNTIME, BFRSecretaryCentral, BFRMunicipalView) devolvem typeof=undefined no ar, com BFR_CURRENT_PROFILE presente. Este instrumento nao depende de nenhum deles: navega por DOM e clique de rato. Consequencia a verificar: as duas seccoes que o ciclo AH-1 abriu por BFR_APP_RUNTIME.navigate (escola-historia, coordenacao-chat) precisam de re-prova se esse caminho nao existia na versao servida.';
out.veredito = falhas.length ? `P36B2_COM_PORTOES_VERMELHOS ${portoes}/${falhas.length}` : `P36B2_SUPERVISAO_MEDIDA ${portoes}/${falhas.length}`;
out.nao_gateado_aqui = { tap_menor_44_e_fonte_menor_11: 'pertencem a PEN-35 (tarefa 73, re-medicao de bandas); aqui sao registados com amostra, sem limiar', bandas: 'larguras desta corrida: ' + LARGURAS.join(',') + ', cada uma declarada E medida por portao' };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\nPORTOES: ' + portoes + '  FALHAS: ' + falhas.length);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ' · registo ' + OUT);
process.exit(falhas.length ? 1 : 0);
