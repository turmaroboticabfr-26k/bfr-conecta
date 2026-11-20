// P36-B — PROVA DE BROWSER COM SESSÃO do sub-aba «Supervisão» do módulo Secretaria de Educação (PEN-36).
// O DDL e as medições de catálogo já fecharam a outra metade do PEN-36 (os sete nomes, pela v136); o que
// faltava era um browser real, autenticado, a clicar `data-sec-tab="supervisao"` e a dizer o que fica
// assente. A shell decide a superfície em dois sitios que este instrumento respeita: o mapa
// `roleSectionAccess` (linha 9013/9018 do index.html servido — `secretaria` está em secretary E em
// education_supervisor, não está em director) e `allowed()` (linha 23632 — `['secretary','developer',
// 'education_supervisor'].includes(profile()?.role)`). Logo: secretary e education_supervisor são as
// personas positivas e director é o controlo negativo real, não uma suposição.
// O painel lê-se de `supervision_requests` + `schools` (linhas 23684/23685). A sonda
// `scripts/p36-recon-linhas-supervisao.mjs` mediu 0 linhas na primeira e 6 na segunda para
// education_supervisor / 0 para secretary — por isso cada contagem do DOM é confrontada com o que a
// MESMA sessão lê por PostgREST dentro da página, para «0 registro(s)» ser leitura provada e não silêncio.
// 0 escrita no banco, 0 DDL, 0 mint; token renovado em memória por refresh token e injetado no
// localStorage da origem; nenhuma credencial vai para o artefacto. Clique pela escada da casa:
// rato (Input.dispatchMouseEvent) precedido de elementFromPoint, depois sintético, com camada nomeada.
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
const PERFIS = (process.env.P36_PERFIS || 'secretary,education_supervisor,director').split(',');
const LARGURAS = (process.env.P36_LARGURAS || '390').split(',').map(Number);
const SUF = process.env.P36_SUF ? '-' + process.env.P36_SUF : '';
const EVID = join(REPO, 'evidence');
const OUT = join(EVID, `p36-browser-supervisao-${PERFIS.join('-')}-${LARGURAS.join('-')}px-19-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P36_SUF=novo, nao por cima');
const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');

// O select é o do próprio módulo (linha 23684), não um meu: é isso que a página vai buscar.
const COLUNAS = 'id,indicator,motive,description,questions,deadline_at,priority,status,created_by,closed_by,closed_at,created_at,updated_at,school_id,sports_schools(name)';

// ═══ preflight do ar ANTES de abrir browser nenhum ═══
const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const shellMd5 = md5(shellTxt);
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const ocorrenciasSubAba = shellTxt.split('data-sec-tab="supervisao"').length - 1;

// ═══ sessões: papéis lidos do banco, tokens renovados por refresh (0 mint) ═══
const ah2 = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8'));
const papelPorUid = Object.fromEntries((await sql(`select id::text as uid, role::text as papel from public.profiles`)).map((x) => [x.uid, x.papel]));
const unidades = [];
for (const perfil of PERFIS) {
  const s = ah2[perfil];
  if (!s) throw new Error(`ABORTA: sem sessao local para ${perfil} em ah2-sessions.json`);
  const papel = papelPorUid[s.id] || 'SEM-PERFIL';
  let access = s.access_token, renovou = false;
  if (!(Number(s.expires_at) * 1000 > Date.now() + 30_000)) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.access_token) throw new Error(`ABORTA: refresh ${perfil} HTTP ${r.status} ${(j && (j.msg || j.error_description)) || ''}`.trim());
    access = j.access_token; renovou = true;
    unidades.push({ perfil, uid: s.id, papel, access, expira_em_epoch: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), renovou });
  } else unidades.push({ perfil, uid: s.id, papel, access, expira_em_epoch: s.expires_at, renovou });
}

const out = {
  programa: 'scripts/p36-navegador-supervisao.mjs', em: new Date().toISOString(), url: URL_APP,
  metodo: 'Chrome headless + CDP; sessao injetada no localStorage da origem; clique por Input.dispatchMouseEvent com hit-test elementFromPoint; contagens do DOM confrontadas com PostgREST na mesma pagina',
  preflight_ar: { md5: shellMd5, esperado_v136: ESP.htmlMd5, bytes: Buffer.byteLength(shellTxt), ocorrencias_do_sub_aba_na_shell: ocorrenciasSubAba },
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

// Abortar sem registo deixa o vermelho como anedota: qualquer excepcao fora do try das unidades escreve
// o parcial com o nome INTERROMPIDA e o ponto da queda.
const escreverParcial = (motivo, e) => {
  try {
    writeFileSync(OUT.replace(/\.json$/, '-INTERROMPIDA.json'), JSON.stringify({
      programa: 'scripts/p36-navegador-supervisao.mjs', veredito: 'P36_BROWSER_' + motivo, em: new Date().toISOString(),
      falha_em: String((e && (e.stack || e.message)) || e).slice(0, 700), preflight_ar: out.preflight_ar, portoes, falhas: falhas.slice(), unidades: out.unidades,
    }, null, 2) + '\n');
  } catch {}
  console.log('VERMELHO ' + motivo + ': ' + String((e && (e.stack || e.message)) || e).slice(0, 300));
  process.exit(2);
};
process.on('uncaughtException', (e) => escreverParcial('INTERROMPIDA', e));
process.on('unhandledRejection', (e) => escreverParcial('INTERROMPIDA_REJECTION', e));

let portaBase = 9381;
for (const u of unidades) {
  for (const largura of LARGURAS) {
    const rotulo = `${u.perfil}/${largura}px`;
    const perfil = `${FORA}/.p36-chrome-${u.perfil}-${largura}`;
    if (existsSync(perfil)) rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    mkdirSync(perfil, { recursive: true });
    const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
      `--remote-debugging-port=${portaBase}`, `--user-data-dir=${perfil}`,
      '--headless=new', `--window-size=${largura},900`, '--no-first-run', '--no-default-browser-check',
      '--disable-gpu', '--ignore-certificate-errors', 'about:blank',
    ], { stdio: 'ignore' });
    portaBase++;
    const reg = { perfil: u.perfil, papel_no_perfil: u.papel, uid: u.uid, largura_declarada: largura, token_renovado: u.renovou, etapas: {} };
    const abortar = (c, m) => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} throw new Error(rotulo + ' PAROU: ' + m); };
    const vigia = setTimeout(() => { try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {} console.log('VERMELHO ' + rotulo + ' · watchdog 240 s'); }, 240000);
    try {
      let targets = [];
      for (let i = 0; i < 60; i++) {
        try { targets = await (await fetch(`http://127.0.0.1:${portaBase - 1}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {}
        await new Promise((r) => setTimeout(r, 500));
      }
      const page = targets.find((t) => t.type === 'page'); if (!page) abortar(1, 'sem alvo page no CDP');
      let fecho = false; const ws = new WebSocket(page.webSocketDebuggerUrl);
      ws.onclose = () => { if (!fecho) abortar(4, 'ws fechado pelo chrome'); };
      await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake 30 s')), 30000))]).catch((e) => abortar(5, String(e.message || e)));
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
      const waitFor = async (e, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJS(e)) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 140)); };
      await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
      await send('Emulation.setDeviceMetricsOverride', { width: largura, height: 900, deviceScaleFactor: 1, mobile: largura <= 500 });
      await send('Page.navigate', { url: URL_APP });
      await waitFor(`!!document.getElementById('loginScreen')`, 60000);
      const sessao = { access_token: u.access, token_type: 'bearer', expires_in: Math.max(u.expira_em_epoch - Math.floor(Date.now() / 1000), 60), expires_at: u.expira_em_epoch, refresh_token: ah2[u.perfil].refresh_token, user: ah2[u.perfil].user };
      await evalJS(`(() => { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)})); localStorage.setItem('bfr-pn-skipped:' + ${JSON.stringify(u.uid)}, '1'); return true; })()`);
      await send('Page.navigate', { url: URL_APP });
      reg.etapas.ms_ready = await waitFor(`document.getElementById('appShell')?.classList.contains('ready') && window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(u.papel)}`);
      reg.etapas.janela = await evalJS(`({ innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight, dpr: window.devicePixelRatio })`);
      gate(rotulo + ' · largura real da janela de layout', reg.etapas.janela.clientWidth, largura);

      // O mapa do papel, lido do objeto do proprio bundle (roleSectionAccess) — a minha expectativa nao
      // e uma lista lembrada: e a regra do produtor, exposta em BFR_APP_RUNTIME.roleSectionAccess.
      reg.etapas.mapa_do_papel = await evalJS(`(() => {
        const m = (window.BFR_APP_RUNTIME && window.BFR_APP_RUNTIME.roleSectionAccess) || null;
        const lista = m ? (m[${JSON.stringify(u.papel)}] || null) : null;
        return { runtime_exposto: !!m, entrada_no_mapa: lista, tem_secretaria: Array.isArray(lista) ? lista.includes('secretaria') : null, tem_supervisao_secao: Array.isArray(lista) ? lista.includes('supervisao') : null };
      })()`);

      // ═══ degrau 1: abrir a seccao `secretaria` pela escada, com hit-teste ═══
      const hit = async (sel) => await evalJS(`(() => {
        const b = document.querySelector(${JSON.stringify(sel)});
        if (!b) return { no_alvo: false };
        b.scrollIntoView({ block: 'center', inline: 'center' });
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const em = document.elementFromPoint(cx, cy);
        return { no_alvo: true, dentro_da_janela: cx >= 0 && cy >= 0 && cx <= window.innerWidth && cy <= window.innerHeight,
          centro: [Math.round(cx), Math.round(cy)], rect: [Math.round(r.width), Math.round(r.height)],
          no_ponto: em ? em.tagName + (em.className && typeof em.className === 'string' ? '.' + em.className.trim().split(' ').slice(0, 2).join('.') : '') : null,
          alvo_contem: !!em && (b === em || b.contains(em)), por_cima: !!em && !b.contains(em) };
      })()`);
      const rato = async (sel) => {
        const h = await hit(sel);
        if (!h.no_alvo || !h.dentro_da_janela || !h.alvo_contem) return { camada: 'rato-impossivel', hit: h };
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: h.centro[0], y: h.centro[1] });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: h.centro[0], y: h.centro[1], button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: h.centro[0], y: h.centro[1], button: 'left', clickCount: 1 });
        return { camada: 'rato', hit: h };
      };
      const secao = `button[data-section="secretaria"]:not([data-teacher-nav-tab])`;
      reg.etapas.botao_secao_secretaria = await evalJS(`(() => {
        const b = document.querySelector(${JSON.stringify(secao)});
        return b ? { presente: true, visivel: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length), texto: (b.textContent || '').trim().slice(0, 40) } : { presente: false };
      })()`);
      const positivo = reg.etapas.mapa_do_papel.tem_secretaria === true;
      if (!positivo) {
        reg.etapas.controlo_negativo = await evalJS(`(() => {
          const antes = { central: !!document.querySelector('[data-secretary-central]'), sub_aba: !!document.querySelector('button[data-sec-tab="supervisao"]') };
          if (window.BFRSecretaryCentral && typeof window.BFRSecretaryCentral.ensure === 'function') window.BFRSecretaryCentral.ensure();
          return { antes, depois_de_chamada_direta_do_ensure: { central: !!document.querySelector('[data-secretary-central]'), sub_aba: !!document.querySelector('button[data-sec-tab="supervisao"]') }, allow_perfil: ['secretary','developer','education_supervisor'].includes((window.BFR_CURRENT_PROFILE && window.BFR_CURRENT_PROFILE.role) || '') };
        })()`);
        gate(rotulo + ' · sem `secretaria` no mapa: nem a central nem o sub-aba aparecem mesmo por chamada direta ao ensure()', [reg.etapas.controlo_negativo.antes.central, reg.etapas.controlo_negativo.depois_de_chamada_direta_do_ensure.central, reg.etapas.controlo_negativo.allow_perfil], [false, false, false]);
      } else {
        reg.etapas.clique_secao = await rato(secao);
        if (reg.etapas.clique_secao && reg.etapas.clique_secao.camada === 'rato-impossivel') {
          reg.etapas.clique_secao.sintetico = await evalJS(`(() => { const b = document.querySelector(${JSON.stringify(secao)}); if (!b) return false; b.click(); return true; })()`);
        }
        reg.etapas.ms_ate_central = await waitFor(`!!document.querySelector('[data-secretary-central]')`, 30000).catch((e) => ({ falha: String(e.message).slice(0, 160) }));
        gate(rotulo + ' · a central da Secretaria aparece apos o clique na seccao', typeof reg.etapas.ms_ate_central, 'number');
        reg.etapas.nav = await evalJS(`Array.from(document.querySelectorAll('[data-secretary-central] [data-sec-tab]')).map(b => b.dataset.secTab)`);
        gate(rotulo + ' · as 13 sub-abas estao no DOM e a Supervisao e uma delas', { n: reg.etapas.nav.length, tem_supervisao: reg.etapas.nav.filter((t) => t === 'supervisao').length }, { n: 13, tem_supervisao: 1 });

        // ═══ degrau 2: o clique que o PEN-36 pedia ═══
        const subAba = `[data-secretary-central] button[data-sec-tab="supervisao"]`;
        reg.etapas.sub_aba_antes = await hit(subAba);
        reg.etapas.clique_sub_aba = await rato(subAba);
        if (reg.etapas.clique_sub_aba.camada === 'rato-impossivel') {
          reg.etapas.clique_sub_aba.sintetico = await evalJS(`(() => { const b = document.querySelector(${JSON.stringify(subAba)}); if (!b) return false; b.click(); return true; })()`);
          reg.etapas.clique_sub_aba.camada_aplicada = 'sintetico';
        } else reg.etapas.clique_sub_aba.camada_aplicada = 'rato';
        await evalJS(`new Promise(r => setTimeout(r, 1500))`);
        reg.etapas.abas_ativas = await evalJS(`({ ativa: document.querySelector('[data-secretary-central] [data-sec-tab].is-active')?.dataset.secTab || null, todas: Array.from(document.querySelectorAll('[data-secretary-central] [data-sec-tab].is-active')).map(b => b.dataset.secTab) })`);
        gate(rotulo + ' · a sub-aba ativa depois do clique e supervisao (e so ela)', [reg.etapas.abas_ativas.ativa, reg.etapas.abas_ativas.todas.length], ['supervisao', 1]);

        // ═══ o painel assentado ═══
        reg.etapas.painel = await evalJS(`(() => {
          const body = document.querySelector('[data-secretary-central] [data-sec-body]');
          if (!body) return { body: false };
          const q = (s) => Array.from(body.querySelectorAll(s));
          const art = q('.bfr-secretary-list > article');
          const label = body.querySelector('.bfr-secretary-label')?.textContent?.trim() || null;
          const h2 = body.querySelector('h2')?.textContent?.trim() || null;
          const chip = body.querySelector('.bfr-secretary-status')?.textContent?.trim() || null;
          const selects = { status: body.querySelector('select[data-sec-supervision-filter]'), escola: body.querySelector('select[data-sec-supervision-school-filter]') };
          const metricas = q('.bfr-secretary-detail-metrics article').map(a => ({ rotulo: (a.querySelector('span')?.textContent || '').trim(), valor: (a.querySelector('strong')?.textContent || '').trim() }));
          const controles = q('button, input, select, textarea, a, [role="button"]').filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
          const taps = controles.filter(c => { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; });
          const folhas = Array.from(body.querySelectorAll('*')).filter(f => {
            const direto = Array.from(f.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
            if (!direto) return false;
            const fs = parseFloat(getComputedStyle(f).fontSize);
            return fs > 0 && fs < 11 && f.getBoundingClientRect().width > 0;
          });
          const cortados = Array.from(body.querySelectorAll('*')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1); });
          return {
            body: true, id_do_painel: body.firstElementChild ? body.firstElementChild.className : null,
            label, h2, chip, vazias: q('.bfr-secretary-empty').length, texto_vazio: body.querySelector('.bfr-secretary-empty')?.textContent?.trim() || null,
            linhas_dom: art.length,
            rotulos_das_linhas: art.slice(0, 8).map(a => ({ indicador: a.querySelector('strong')?.textContent?.trim().slice(0, 60) || null, detalhe: a.querySelector('span')?.textContent?.trim().slice(0, 90) || null, tem_botao_abrir: !!a.querySelector('[data-sec-open-supervision]') })),
            opcoes_filtro_status: selects.status ? Array.from(selects.status.options).map(o => o.value) : null,
            opcoes_filtro_escola: selects.escola ? Array.from(selects.escola.options).map(o => o.value) : null,
            nomes_das_escolas: selects.escola ? Array.from(selects.escola.options).slice(1, 8).map(o => o.textContent.trim()) : null,
            metricas,
            chars: (body.innerText || '').trim().length, controles: controles.length,
            tap_menor_44: taps.length, taps_amostra: taps.slice(0, 10).map(t => ({ tag: t.tagName, cls: (t.className || '').toString().slice(0, 34), rect: (() => { const r = t.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() })),
            fonte_menor_11: folhas.length, fontes_amostra: folhas.slice(0, 10).map(f => ({ tag: f.tagName, px: parseFloat(getComputedStyle(f).fontSize), texto: (f.textContent || '').trim().slice(0, 30) })),
            cortados: cortados.length,
            cortados_amostra: cortados.slice(0, 6).map(e => ({ no: e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(' ').slice(0, 2).join('.') : ''), caixa: [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)], scroll: [e.scrollWidth, e.scrollHeight], cliente: [e.clientWidth, e.clientHeight] })),
            estouro_horizontal: document.body.scrollWidth > document.documentElement.clientWidth + 1,
            reguas: { innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth },
          };
        })()`);
        gate(rotulo + ' · o painel assente e o do sub-aba (label + h2)', [reg.etapas.painel.label, reg.etapas.painel.h2], ['Supervisão Educacional', 'Solicitações de Supervisão']);

        // ═══ a mesma sessao, pela PostgREST de dentro da pagina: nada de contagem lembrada ═══
        reg.etapas.api_na_pagina = await evalJS(`(async () => {
          const s = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
          const h = { apikey: ${JSON.stringify(anonKey)}, Authorization: 'Bearer ' + s.access_token, accept: 'application/json' };
          const um = await fetch(${JSON.stringify(HOST)} + '/rest/v1/supervision_requests?select=' + encodeURIComponent(${JSON.stringify(COLUNAS)}) + '&order=created_at.desc&limit=200', { headers: h });
          const dois = await fetch(${JSON.stringify(HOST)} + '/rest/v1/schools?select=id,name,active&order=name&limit=50', { headers: h });
          const a = await um.json().catch(() => null); const b = await dois.json().catch(() => null);
          return { supervisao_http: um.status, supervisao_linhas: Array.isArray(a) ? a.length : null, schools_http: dois.status, schools_linhas: Array.isArray(b) ? b.length : null, schools_visiveis_no_filtro: Array.isArray(b) ? b.filter(function (x) { return x.active !== false; }).length : null };
        })()`);
        gate(rotulo + ' · linhas do DOM = linhas que esta sessao le por PostgREST', [reg.etapas.painel.linhas_dom, reg.etapas.api_na_pagina.supervisao_linhas], [reg.etapas.api_na_pagina.supervisao_linhas, reg.etapas.api_na_pagina.supervisao_linhas]);
        gate(rotulo + ' · o chip «N registro(s)» bate com o DOM', reg.etapas.painel.chip, `${reg.etapas.painel.linhas_dom} registro(s)`);
        gate(rotulo + ' · a aula vazia printa com o predicado no lugar (0 linhas => bfr-secretary-empty)', reg.etapas.painel.vazias === 1, reg.etapas.api_na_pagina.supervisao_linhas === 0);
        gate(rotulo + ' · filtro de escola = escolas que esta sessao le (nao as 6 do banco para toda a gente)', reg.etapas.painel.opcoes_filtro_escola.length - 1, reg.etapas.api_na_pagina.schools_visiveis_no_filtro);
        gate(rotulo + ' · sem estouro horizontal do painel contra documentElement.clientWidth', reg.etapas.painel.estouro_horizontal, false);
        if (reg.etapas.painel.opcoes_filtro_status) gate(rotulo + ' · as 8 opcoes de status do painel', reg.etapas.painel.opcoes_filtro_status.length, 8);

        // Operar com 0 linhas so pode provar que mexer o filtro nao parte nada: registo, nao asserto de conteudo.
        reg.etapas.operacao_filtro = await evalJS(`(() => {
          const sel = document.querySelector('[data-sec-body] select[data-sec-supervision-filter]');
          if (!sel) return { aplicou: false };
          const antes = document.querySelectorAll('[data-sec-body] .bfr-secretary-list > article').length;
          sel.value = 'Concluída'; sel.dispatchEvent(new Event('change', { bubbles: true }));
          const depois = document.querySelectorAll('[data-sec-body] .bfr-secretary-list > article').length;
          const vazia = !!document.querySelector('[data-sec-body] .bfr-secretary-empty');
          sel.value = 'all'; sel.dispatchEvent(new Event('change', { bubbles: true }));
          const restaurado = document.querySelectorAll('[data-sec-body] .bfr-secretary-list > article').length;
          return { aplicou: true, antes, depois, vazia_depois_do_filtro: vazia, restaurado };
        })()`);
        gate(rotulo + ' · trocar o filtro nao parte o painel e voltar a all restaura', [reg.etapas.operacao_filtro.aplicou, reg.etapas.operacao_filtro.restaurado], [true, reg.etapas.operacao_filtro.antes]);

        if (u.papel === 'education_supervisor') reg.etapas.secao_supervisao_topo = await evalJS(`(() => {
          const b = document.querySelector('button[data-section="supervisao"]:not([data-teacher-nav-tab])');
          return { presente: !!b, texto: b ? (b.textContent || '').trim().slice(0, 40) : null, tem_entrada_propria_no_menu: !!b };
        })()`);

        reg.etapas.capturas = {};
        for (const nome of ['central', 'supervisao']) {
          const alvo = nome === 'central' ? `[data-secretary-central] button[data-sec-tab="overview"]` : subAba;
          await evalJS(`document.querySelector(${JSON.stringify(alvo)})?.click(); new Promise(r => setTimeout(r, 1200));`);
          await evalJS(`new Promise(r => setTimeout(r, 800))`);
          const s = await send('Page.captureScreenshot', { format: 'png' });
          const buf = Buffer.from(s.data, 'base64');
          const caminho = join(EVID, `p36-${u.perfil}-${largura}-${nome}.png`);
          writeFileSync(caminho, buf);
          reg.etapas.capturas[nome] = { ficheiro: caminho.split('/').pop(), bytes: statSync(caminho).size, md5: md5(buf) };
        }
      }
      const relevantes = erros.filter((t) => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource/i.test(t));
      reg.etapas.erros_console = { bruto: erros.length, relevantes: relevantes.slice(0, 10) };
      gate(rotulo + ' · sem erro de aplicacao no console', relevantes.length, 0);
      fecho = true; ws.close();
      try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
    } catch (e) {
      reg.erro = String(e.message || e).slice(0, 300);
      falhas.push(rotulo + ' | excecao: ' + reg.erro);
      portoes++;
      console.log('VERMELHO  ' + rotulo + ' · excecao: ' + reg.erro.slice(0, 160));
      try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
    } finally { clearTimeout(vigia); }
    out.unidades.push(reg);
    writeFileSync(OUT, JSON.stringify(Object.assign(out, { portoes, falhas: falhas.slice(), veredito: falhas.length ? 'P36_BROWSER_COM_PORTOES_VERMELHOS' : 'P36_BROWSER_SUPERVISAO_MEDIDA' }), null, 2) + '\n');
    console.log(`  ${rotulo}: painel=${reg.etapas?.painel?.linhas_dom ?? '-'} api=${reg.etapas?.api_na_pagina?.supervisao_linhas ?? '-'} escolas=${(reg.etapas?.painel?.opcoes_filtro_escola || []).length - 1} chars=${reg.etapas?.painel?.chars ?? '-'}`);
  }
}
out.portoes = portoes; out.falhas = falhas;
out.veredito = falhas.length ? `P36_BROWSER_COM_PORTOES_VERMELHOS ${portoes}/${falhas.length}` : `P36_BROWSER_SUPERVISAO_MEDIDA ${portoes}/${falhas.length}`;
out.nao_gateado_aqui = { tap_menor_44_e_fonte_menor_11: 'pertencem a PEN-35 (re-medicao de bandas, tarefa 73); aqui sao registados com amostra, sem limiar', bandas: 'esta corrida corre a(s) largura(s) ' + LARGURAS.join(',') + ' declarada(s) e medida(s) por portao' };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTOES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ' · registo ' + OUT);
process.exit(falhas.length ? 1 : 0);
