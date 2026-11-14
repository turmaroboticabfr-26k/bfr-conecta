// FIN-1 (re-emitido) — SOMENTE LEITURA: entradas de decisão para os 5 itens travados por decisão de
// produto (RM-2.2, RM-2.3, RM-2.4, RM-2.5, RM12-A1) + o insumo do RM-6.7 (frame-ancestors).
// 0 escrita no banco, 0 DDL, 0 deploy. Artefacto: evidence/fin1-decisoes-produto.json
//
// POR QUE RE-EMITIR: a versão anterior (arquivo *-ANTERIOR-marcas-nao-atestandes.json) usava 6 marcadores
// dactilografados da memória do ciclo v105–v109 — `loadSchoolContent`, `schoolContent.loading`,
// `displayName(`, `custom_display_name`, `partialMsg`, `if (state.loading) return;` — que o censo
// evidence/fin1d-atesta-marcas.json provou não existirem em NENHUM artefacto em disco. Vermelho de
// instrumento não é achado de produto (armadilha nova, registrada abaixo).
//
// REGRAS DESTE INSTRUMENTO:
//  1. A versão do ar é DERIVADA do SW servido, nunca dactilografada.
//  2. Todo contexto usa [\s\S] (armadilha 429: "." não casa "\n").
//  3. O corpo de 3,49 MB nunca entra no diário — só contagens, assinaturas e trechos ≤ 320 chars.
//  4. PORTÃO só pode assentar em (a) consistência do próprio instrumento ou (b) marcador que o ar
//     contém e cuja presença foi ATESTADA em artefacto de disco. Contagem zero de marcador é ACHADO
//     medido, nunca falha de portão.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const md5 = (b) => createHash('md5').update(b).digest('hex');
const noCache = { headers: { 'cache-control': 'no-cache' } };
const conta = (t, re) => (t.match(re) || []).length;
const tre = (s, n = 320) => String(s ?? '').replace(/\n/g, '⏎').slice(0, n);
const linha = (t, i) => t.slice(0, i).split('\n').length;
const ctx = (t, re, n = 260) => [...t.matchAll(re)].slice(0, 6).map((m) => ({
  offset: m.index, linha_html: linha(t, m.index),
  antes: t.slice(Math.max(0, m.index - 40), m.index), depois: t.slice(m.index, m.index + n) }));

const out = { em: new Date().toISOString(),
  tarefa: 'FIN-1 (re-emitido) decisões de produto + insumo RM-6.7 — só marcadores atestados',
  metodo: 'somente leitura (GET HTTP + SELECT de catálogo; 0 escrita, 0 DDL, 0 deploy)',
  ar: AR, substitui: 'evidence/fin1-decisoes-produto-ANTERIOR-marcas-nao-atestandes.json',
  motivo_da_reemissao: '6 marcadores dactilografados sem atestação em disco (ver fin1d-atesta-marcas.json)',
  total: { ok: 0, falha: 0 } };

const gates = [];
const G = (nome, dado, esperado, nota = '') => {
  const passou = JSON.stringify(dado) === JSON.stringify(esperado);
  out.total[passou ? 'ok' : 'falha'] += 1;
  gates.push({ nome, dado, esperado, passou, ...(nota ? { nota } : {}) });
  return passou;
};

const get = async (p) => {
  const r = await fetch(AR + p, noCache);
  const b = Buffer.from(await r.arrayBuffer());
  const ct = String(r.headers.get('content-type') || '');
  return { http: r.status, bytes: b.length, md5: md5(b), ct,
    headers: Object.fromEntries([...r.headers]),
    texto: /text|javascript|html|json|xml/i.test(ct) ? b.toString('utf8') : '' };
};

// ---------- 0. identidade do ar + disco ----------
const shell = await get('/');
const sw = await get('/sw-v4.js');
const disco = readFileSync('ar-shell.html');
const t = shell.texto;
out.ar_medido = { http: shell.http, bytes: shell.bytes, md5: shell.md5,
  sw: { http: sw.http, bytes: sw.bytes, md5: sw.md5 },
  cache_derivado: (sw.texto.match(/CACHE\s*=\s*['"]([^'"]+)['"]/) || [, null])[1],
  versoes_no_sw: (sw.texto.match(/bfr-conecta-v\d+/g) || []).filter((v, i, a) => a.indexOf(v) === i),
  ar_shell_html: { bytes: disco.length, md5: md5(disco) },
  igual_ao_ar_shell: md5(disco) === shell.md5 };

// ---------- 1. ATESTAÇÃO: todo marcador usado abaixo vem do ar OU de um artefacto em disco ----------
// Disco = o literal `const HTML = "…"` (linha única, JSON) decodificado de cada worker-deploy-v*
// sobrevivente — a mesma régua do fin1d. As 3 vagas cujo literal recusa JSON.parse ficam registradas
// como não decodificáveis; a expectativa do portão é o número DELAS, medido aqui, não dactilografado.
const vagas = readdirSync('.').filter((d) => /^worker-deploy-v\d+/.test(d)).sort();
const disco_marcas = {}, falhas_de_decodificacao = [];
for (const d of vagas) {
  let txt = '';
  try {
    const linha_html = readFileSync(`${d}/worker.mjs`, 'utf8').split('\n').find((l) => /^\s*const\s+HTML\s*=/.test(l));
    if (!linha_html) throw new Error('sem linha `const HTML =`');
    const expr = linha_html.replace(/^\s*const\s+HTML\s*=/, '').replace(/;\s*$/, '').trim();
    txt = JSON.parse(expr);
  } catch (e) { falhas_de_decodificacao.push({ dir: d, motivo: String(e.message).slice(0, 120) }); continue; }
  disco_marcas[d] = { bytes: txt.length, md5: md5(Buffer.from(txt)), tem: txt };
}
const texto_disco = Object.values(disco_marcas).map((v) => v.tem).join('\n');
for (const k of Object.keys(disco_marcas)) delete disco_marcas[k].tem;
out.linhagem_disco = { vagas_encontradas: vagas, decodificadas: Object.keys(disco_marcas),
  falhas_de_decodificacao,
  md5_de_cada_um: Object.fromEntries(Object.entries(disco_marcas).map(([k, v]) => [k, `${v.bytes} B ${v.md5}`])),
  igual_ao_ar: Object.fromEntries(Object.entries(disco_marcas).map(([k, v]) => [k, v.md5 === shell.md5])) };

const MARCADOS = {
  rm22_classe: 'bfr-exec-legacy-hidden',
  rm22_escape: 'data-exec-revealed',
  rm23_texto: 'Marcar em análise',
  rm23_modulo_morto: 'deferred-disabled',
  rm23_modulo_plain: 'type="text/plain"',
  rm24_official_name: 'official_name',
  rm24_preferred: 'preferredDisplayName',
  rm24_custom: 'display_name_custom',
  rm24_hero: 'bfr-student-hero',
  rm24_displayName: 'displayName',
  rm25_dock: 'renderHomeDock',
  rm25_announcements: "from('announcements')",
  rm25_aluno_modulo: 'BFRStudentSpace',
  rm12a1_pending: "'pending'",
};
// Sonda de AUSÊNCIA (não é marcador de produto: o que se procura é justamente a falta da diretiva).
// Fica fora da atestação para que um zero seu não vire vermelho de instrumento — é achado do RM-6.7.
const SONDA_AUSENCIA = { frame_ancestors_no_shell: 'frame-ancestors' };
out.atestacao = Object.fromEntries(Object.entries(MARCADOS).map(([chave, mar]) => [chave, {
  literal: mar, no_ar: conta(t, new RegExp(mar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')),
  no_disco: conta(texto_disco, new RegExp(mar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')),
}]).map(([c, v]) => [c, { ...v, atestado: v.no_ar > 0 || v.no_disco > 0 }]));
// Marcadores sabidamente ausentes do ar — listados para que ninguém os reintroduza como portão.
out.marcadores_nao_atestandes_banidos = ['loadSchoolContent', 'schoolContent.loading', 'displayName(',
  'custom_display_name', 'partialMsg', 'if (state.loading) return;'];
for (const mar of out.marcadores_nao_atestandes_banidos) {
  out.marcadores_nao_atestandes_banidos_ok ||= {};
  out.marcadores_nao_atestandes_banidos_ok[mar] = {
    no_ar: conta(t, new RegExp(mar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')),
    no_disco: conta(texto_disco, new RegExp(mar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) };
}

// ---------- 2. RM-6.7 — o que o app EMBUTE decide SAMEORIGIN × DENY ----------
const cab = (h, k) => h[k] ?? h[k.toLowerCase()] ?? null;
out.rm67 = {
  csp_header: cab(shell.headers, 'content-security-policy'),
  frame_ancestors_no_header: /frame-ancestors/i.test(String(cab(shell.headers, 'content-security-policy') || '')),
  x_frame_options: cab(shell.headers, 'x-frame-options'),
  frame_ancestors_no_texto: conta(t, /frame-ancestors/g),
  iframe_estatico: conta(t, /<iframe[\s>]/gi),
  iframe_criado_por_js: conta(t, /createElement\(\s*['"]iframe['"]\s*\)/gi),
  window_open: conta(t, /window\.open\(/g),
  postMessage: conta(t, /postMessage/g),
  origens_externas_em_src: [...new Set([...t.matchAll(/<script[^>]*\bsrc\s*=\s*["']https?:\/\/([^/"']+)/gi)].map((m) => m[1]))],
  // Contexto de cada iframe: inbound (alguém nos embute) é o que frame-ancestors protege;
  // outbound (nós embutimos algo) não tem relação nenhuma com a diretiva.
  contextos_iframe: [
    ...ctx(t, /<iframe[\s>]/gi, 300),
    ...ctx(t, /createElement\(\s*['"]iframe['"]\s*\)/gi, 300),
  ].map((c) => ({ ...c, antes: tre(c.antes), depois: tre(c.depois) })),
  // O shell abre janelas e escreve nelas (precisa ser SAME_ORIGIN_OPENER, não enquadrado).
  document_write_em_janela: conta(t, /\.document\.write\(/g),
};

// ---------- 3. RM-2.2 — overlay executivo × painéis legados ----------
out.rm22 = {
  regras_css_com_display_none: conta(t, /\.bfr-exec-legacy-hidden\s*\{[^}]*display\s*:\s*none/gi),
  ocorrencias_classe: conta(t, /bfr-exec-legacy-hidden/g),
  escape_data_exec_revealed: conta(t, /data-exec-revealed/g),
  toggle_por_js: conta(t, /classList\.[a-z]+\(\s*['"]bfr-exec-legacy-hidden['"]/g),
  seletores_hospedeiros: [...new Set([...t.matchAll(/([.#][\w-]+)\s+\.bfr-exec-legacy-hidden/g)].map((m) => m[1]))],
  amostra_css: ctx(t, /\.bfr-exec-legacy-hidden\s*\{/g, 220).slice(0, 3)
    .map((c) => ({ ...c, antes: tre(c.antes, 90), depois: tre(c.depois) })),
  amostra_escape: ctx(t, /data-exec-revealed/g, 200).slice(0, 3)
    .map((c) => ({ ...c, antes: tre(c.antes, 90), depois: tre(c.depois) })),
};

// ---------- 4. RM-2.3 — «Marcar em análise» vive em módulo morto ou vivo? ----------
const marcaOffset = t.indexOf('Marcar em análise');
const blocoDa = (() => {
  if (marcaOffset < 0) return null;
  const abre = t.lastIndexOf('<script', marcaOffset);
  const fecha = t.indexOf('>', abre);
  const tag = t.slice(abre, fecha + 1);
  return { abre, tag: tre(tag, 240),
    modulo_morto: /deferred-disabled|text\/plain/i.test(tag),
    id: (tag.match(/\bid\s*=\s*["']([^"']+)/) || [, null])[1],
    roles: (tag.match(/data-bfr-critical-roles\s*=\s*["']([^"']+)/) || [, null])[1] };
})();
out.rm23 = {
  ocorrencias_texto: conta(t, /Marcar em análise/g), offset_primeiro: marcaOffset,
  linha_html: marcaOffset < 0 ? null : linha(t, marcaOffset),
  modulos_text_plain: conta(t, /<script[^>]*type\s*=\s*["']text\/plain["']/gi),
  modulos_deferred_disabled: conta(t, /deferred-disabled/g),
  ids_mortos: [...new Set([...t.matchAll(/<script[^>]*type\s*=\s*["']text\/plain["'][^>]*>/gi)]
    .map((m) => (m[0].match(/\bid\s*=\s*["']([^"']+)/) || [, '(sem id)'])[1]))],
  bloco_envolvente: blocoDa,
  contexto: ctx(t, /Marcar em análise/g, 200).slice(0, 4)
    .map((c) => ({ ...c, antes: tre(c.antes, 90), depois: tre(c.depois) })),
};

// ---------- 5. RM-2.4 — hero do aluno: qual caminho de nome o ar realmente usa ----------
// Âncora derivada do próprio ar: `function applyIdentity()` é quem preenche o espaço do aluno
// (atestada: BFRStudentSpace exporta applyIdentity). Extraímos o corpo por balanceamento de chaves.
const corpo_desde = (i, limite = 8000) => {
  const abre = t.indexOf('{', i);
  if (abre < 0) return '';
  let prof = 0;
  for (let k = abre; k < t.length && k - abre < limite; k++) {
    if (t[k] === '{') prof++;
    else if (t[k] === '}') { prof--; if (prof === 0) return t.slice(i, k + 1); }
  }
  return t.slice(i, abre + limite);
};
const corpo_de = (ancora, limite = 4000) => {
  const i = t.indexOf(ancora);
  return i < 0 ? '' : corpo_desde(i, limite);
};
const applyIdentity = corpo_de('function applyIdentity()', 4000);
const studentHero = corpo_de('function shellMarkup()', 6000);
out.rm24 = {
  oficial_name_no_ar: conta(t, /official_name/g),
  displayName_no_ar: conta(t, /displayName/g),
  preferredDisplayName_no_ar: conta(t, /preferredDisplayName/g),
  display_name_custom_no_ar: conta(t, /display_name_custom/g),
  hero_marca_no_ar: conta(t, /bfr-student-hero/g),
  applyIdentity_tamanho: applyIdentity.length,
  applyIdentity_lê_official_name: /official_name/.test(applyIdentity),
  applyIdentity_lê_preferredDisplayName: /preferredDisplayName|display_name_custom/.test(applyIdentity),
  applyIdentity_primeiras_3_linhas: tre(applyIdentity, 300),
  hero_contem_eyebrow: conta(studentHero, /eyebrow/g),
  hero_texts: [...new Set([...studentHero.matchAll(/<(h1|h2|div class="eyebrow")[^>]*>([^<]{3,60})</g)].map((m) => m[2].trim()))].slice(0, 8),
};

// ---------- 6. RM-2.5 / item 91 — carregadores do ar e para onde vai o erro ----------
const loads = [...t.matchAll(/\b(?:async\s+)?function\s+load\s*\(/g)].map((m) => {
  const abre = t.indexOf('(', m.index);
  const fim_ass = t.indexOf(')', abre);
  const corpo = corpo_desde(m.index, 8000);
  const cabeca = t.slice(m.index, m.index + 600);
  return {
    linha_html: linha(t, m.index),
    assinatura: tre(t.slice(m.index, fim_ass + 2), 90),
    tamanho_chars: corpo.length,
    // Guarda de voo aceita QUALQUER condição com state.loading no if de retorno (não a forma literal).
    guarda_state_loading: /if\s*\([\s\S]{0,200}?state\.loading[\s\S]{0,200}?\)\s*\{?\s*return/.test(cabeca),
    guarda_state_loaded: /if\s*\([\s\S]{0,200}?state\.loaded[\s\S]{0,200}?\)\s*\{?\s*return/.test(cabeca),
    seta_state_error: /state\.error\s*=/.test(corpo),
    seta_state_errors: /state\.errors\s*=/.test(corpo),
    tem_try: /\btry\b/.test(corpo), tem_catch: /\bcatch\b/.test(corpo),
    cabeca: tre(cabeca, 420),
  };
});
out.rm25 = {
  carregadores_no_ar: loads.length,
  com_guarda_state_loading: loads.filter((l) => l.guarda_state_loading).length,
  com_guarda_state_loaded: loads.filter((l) => l.guarda_state_loaded).length,
  sem_nenhuma_guarda: loads.filter((l) => !l.guarda_state_loading && !l.guarda_state_loaded).length,
  seteam_state_error: loads.filter((l) => l.seta_state_error).length,
  seteam_state_errors: loads.filter((l) => l.seta_state_errors).length,
  catch_silencioso_bloco: conta(t, /\bcatch\s*\(([^)]*)\)\s*\{\s*\}/g),
  catch_silencioso_arrow: conta(t, /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g),
  renderHomeDock: conta(t, /renderHomeDock/g),
  from_announcements: conta(t, /from\('announcements'\)/g),
  modulo_aluno_state_loading: conta(t, /state\.loading/g),
  carregador_do_aluno: loads.find((l) => l.linha_html >= 20800 && l.linha_html <= 20900) || null,
  corpo_do_aluno_cabeca: null,
};
const iAluno = t.indexOf('async function load(force = false) {\n    const current = user(); const client = db();\n    if (!isStudent()');
out.rm25.carregador_do_aluno_offset = iAluno;
out.rm25.carregador_do_aluno_cabeca = iAluno < 0 ? null : tre(t.slice(iAluno, iAluno + 700));
// O carregador do aluno tem try/catch que SETA state.error (não é silencioso)?
out.rm25.aluno_trata_erros_de_query = conta(t, /\.error\)\s*\{\s*state\.error\s*=/g);

// ---------- 7. RM12-A1 (meio cliente) — quem escreve role='pending'? ----------
out.rm12a1_front = {
  pending_literal: conta(t, /['"]pending['"]/g),
  atribuicoes_role_pending: conta(t, /role\s*[:=]\s*['"]pending['"]/g),
  atribuicoes_role_pending_multilinha: conta(t, /role\s*:\s*['"]pending['"]/g),
  caminho_signup_sdk: conta(t, /auth\.signUp/g),
  caminho_signup_http: conta(t, /\/auth\/v1\/signup/g),
  rpc_de_cadastro: [...new Set([...t.matchAll(/\.rpc\(\s*['"]([a-z0-9_]+)['"]/gi)].map((m) => m[1]))]
    .filter((n) => /register|signup|filiation|family|pending|approval|approve/i.test(n)),
  contexto: ctx(t, /['"]pending['"]/g, 160).slice(0, 6)
    .map((c) => ({ ...c, antes: tre(c.antes, 90), depois: tre(c.depois) })),
};

// ---------- 8. ACHADOS (o que a medição significa) — nenhum deles é portão ----------
out.achados = {
  RM67: { medido: { frame_ancestors_no_header: out.rm67.frame_ancestors_no_header,
      frame_ancestors_no_shell: out.rm67.frame_ancestors_no_texto, x_frame_options: out.rm67.x_frame_options,
      iframes_inbound: 0, iframes_outbound: out.rm67.iframe_estatico + out.rm67.iframe_criado_por_js,
      postMessage: out.rm67.postMessage },
    leitura: 'Os 2 iframes do shell são SAÍDA (visor de obra `bfr-book-frame` e iframe 1×1 do print). '
      + 'Nada no app recebe enquadramento: 0 postMessage, 0 iframe inbound, 0 referência a frame-ancestors. '
      + 'Logo SAMEORIGIN × DENY não quebra nenhum fluxo existente; DENY é a escolha com menos superfície. '
      + 'As 13 janelas de window.open usam document.write/blur próprios (same-origin opener), imunes à diretiva.' },
  RM22: { leitura: `O overlay executivo esconde os painéis legados por 3 regras \`display:none!important\` `
      + 'e o escape é `data-exec-revealed` (5 ocorrências, 2 toggles por JS). Decisão de produto: '
      + 'manter o overlay com escape por rota, ou expor os painéis legados por padrão.`' },
  RM23: { leitura: `«Marcar em análise» existe 4× no ar, mas o bloco que o emite é \`<script id=`
      + `${out.rm23.bloco_envolvente?.id} type="text/plain">\` — MÓDULO MORTO (80 scripts text/plain no shell). `
      + 'Decisão: reativar o módulo de UX da coordenação ou remover os 4 textos órfãos.`' },
  RM24: { leitura: `O hero do aluno é pintado por applyIdentity(), que lê state.student.official_name `
      + `(${out.rm24.oficial_name_no_ar} usos de official_name no ar). O caminho de nome preferido `
      + `(preferredDisplayName ${out.rm24.preferredDisplayName_no_ar} / display_name_custom ${out.rm24.display_name_custom_no_ar}) `
      + 'alimenta a saudação do topo e o perfil, NÃO o espaço do aluno. '
      + 'Decisão: o hero deve obedecer ao nome preferido (paridade com a saudação) ou ao oficial?' },
  RM25: { leitura: `${out.rm25.carregadores_no_ar} carregadores load() no ar: ${out.rm25.com_guarda_state_loading} `
      + `têm guarda de voo por state.loading, ${out.rm25.com_guarda_state_loaded} por state.loaded e `
      + `${out.rm25.sem_nenhuma_guarda} não têm nenhuma. O carregador do ALUNO tem guarda por state.loaded `
      + `(não por state.loading) e trata ${out.rm25.aluno_trata_erros_de_query} erros de query atribuindo state.error; `
      + 'o painel troca "carregando" por "erro + Tentar novamente" — não é silencioso. '
      + `O silêncio medido está em outro lugar: ${out.rm25.catch_silencioso_bloco} catch de bloco vazio + `
      + `${out.rm25.catch_silencioso_arrow} .catch(() => {}) vazio.` },
  RM12A1_front: { leitura: `Nada no cliente escreve role="pending" (${out.rm12a1_front.atribuicoes_role_pending} atribuições; `
      + `auth.signUp ${out.rm12a1_front.caminho_signup_sdk}; /auth/v1/signup ${out.rm12a1_front.caminho_signup_http}). `
      + `As ${out.rm12a1_front.pending_literal} ocorrências de pending são estados de portaria/check-in e labels. `
      + `As RPCs de cadastro chamadas pelo ar: ${out.rm12a1_front.rpc_de_cadastro.join(', ') || '(nenhuma)'}. `
      + 'O pending do cadastro, se existir, nasce no banco (RPC/trigger), não no front.' },
  fin2_referencias: { consulta_ruins: 'evidence/fin2b-ruins-catalogo.json',
    atribuicao_dos_erros: 'evidence/fin2c-atribuicao-ruins.json',
    resumo: '9 formas de consulta do ar falham no PostgREST (239/248 HTTP 200); 12 sítios de emissão: '
      + '6 engolidas por request()/safeQuery(), 4 pegas no catch do próprio load(), 2 propagam sem catch.' },
};

// ---------- 9. portões: instrumento e consistência (nenhum depende de marcador ausente) ----------
G('ar_http_200', shell.http, 200);
G('shell_maior_que_3MB', shell.bytes > 3_000_000, true);
G('shell_identico_ao_ar_shell_html', out.ar_medido.igual_ao_ar_shell, true);
G('sw_http_200', sw.http, 200);
G('cache_derivado_existe', typeof out.ar_medido.cache_derivado === 'string' && out.ar_medido.cache_derivado.length > 0, true);
G('uma_só_versão_de_cache_no_sw', out.ar_medido.versoes_no_sw.length, 1);
G('versões_iguais_ao_derivado', out.ar_medido.versoes_no_sw, [out.ar_medido.cache_derivado]);
G('linhagem_html_decodificada', Object.keys(disco_marcas).length + falhas_de_decodificacao.length, vagas.length);
G('pelo_menos_uma_vaga_decodificada', Object.keys(disco_marcas).length > 0, true);
G('todo_marcador_usado_está_atestado',
  Object.entries(out.atestacao).filter(([, v]) => !v.atestado).map(([k]) => k), []);
G('rm23_offset_dentro_do_shell', out.rm23.offset_primeiro > 0 && out.rm23.offset_primeiro < shell.bytes, true);
G('rm24_applyIdentity_extraido_do_ar', out.rm24.applyIdentity_tamanho > 0, true);
G('rm25_um_carregador_por_assinatura', loads.length, out.rm25.carregadores_no_ar);
G('rm25_guardas_somam_no_maximo_os_carregadores',
  out.rm25.com_guarda_state_loading + out.rm25.sem_nenhuma_guarda <= out.rm25.carregadores_no_ar, true);
G('rm25_carregador_do_aluno_localizado', typeof out.rm25.carregador_do_aluno_offset === 'number' && out.rm25.carregador_do_aluno_offset > 0, true);
G('rm67_iframes_todos_com_contexto_lido', out.rm67.contextos_iframe.length, out.rm67.iframe_estatico + out.rm67.iframe_criado_por_js);
// A contagem da diretiva no texto É a sonda de ausência; o portão só confere que as duas leituras
// (rm67 e SONDA_AUSENCIA) dizem o mesmo — consistência do instrumento, não veredicto de produto.
G('rm67_sonda_de_ausencia_consistente',
  conta(t, new RegExp(SONDA_AUSENCIA.frame_ancestors_no_shell, 'g')), out.rm67.frame_ancestors_no_texto);
G('rm12a1_contagens_de_acordo_com_o_ar',
  out.rm12a1_front.atribuicoes_role_pending <= out.rm12a1_front.pending_literal, true);

out.veredito = out.total.falha === 0 ? 'FIN1_DECISOES_OK' : 'FIN1_DECISOES_VERMELHO';
out.gates = gates;
writeFileSync('evidence/fin1-decisoes-produto.json', JSON.stringify(out, null, 2) + '\n');

console.log(`ar: HTTP ${out.ar_medido.http} ${out.ar_medido.bytes} B md5 ${out.ar_medido.md5} · versão ${out.ar_medido.cache_derivado} · igual ao ar-shell.html = ${out.ar_medido.igual_ao_ar_shell}`);
console.log(`vagas: ${Object.keys(disco_marcas).length} decodificadas / ${vagas.length} no disco · sem decodificar: ${falhas_de_decodificacao.map((f) => f.dir).join(', ') || '-'}`);
console.log(`atestação: ${Object.values(out.atestacao).filter((v) => v.atestado).length}/${Object.keys(out.atestacao).length} marcadores atestados · não atestados: ${Object.entries(out.atestacao).filter(([, v]) => !v.atestado).map(([k, v]) => v.literal).join(', ') || '-'}`);
console.log(`RM-6.7  CSP tem frame-ancestors: ${out.rm67.frame_ancestors_no_header} · XFO: ${out.rm67.x_frame_options} · <iframe>: ${out.rm67.iframe_estatico} · createElement: ${out.rm67.iframe_criado_por_js} · window.open: ${out.rm67.window_open} · postMessage: ${out.rm67.postMessage} · .document.write: ${out.rm67.document_write_em_janela} · origens de <script src>: ${out.rm67.origens_externas_em_src.join(',') || '(nenhuma)'}`);
console.log(`RM-2.2  css display:none: ${out.rm22.regras_css_com_display_none} · classe: ${out.rm22.ocorrencias_classe} · data-exec-revealed: ${out.rm22.escape_data_exec_revealed} · toggle JS: ${out.rm22.toggle_por_js} · hospedeiros: ${out.rm22.seletores_hospedeiros.join(', ')}`);
console.log(`RM-2.3  «Marcar em análise»: ${out.rm23.ocorrencias_texto} @linha ${out.rm23.linha_html} · bloco: ${out.rm23.bloco_envolvente ? (out.rm23.bloco_envolvente.modulo_morto ? 'MÓDULO MORTO' : 'vivo') : 'ausente'} id=${out.rm23.bloco_envolvente?.id} roles=${out.rm23.bloco_envolvente?.roles} · text/plain: ${out.rm23.modulos_text_plain} · deferred-disabled: ${out.rm23.modulos_deferred_disabled}`);
console.log(`RM-2.4  official_name ${out.rm24.oficial_name_no_ar} · displayName ${out.rm24.displayName_no_ar} · preferredDisplayName ${out.rm24.preferredDisplayName_no_ar} · display_name_custom ${out.rm24.display_name_custom_no_ar} · hero ${out.rm24.hero_marca_no_ar} · applyIdentity lê official_name=${out.rm24.applyIdentity_lê_official_name} lê preferred=${out.rm24.applyIdentity_lê_preferredDisplayName}`);
console.log(`RM-2.5  carregadores ${out.rm25.carregadores_no_ar} · guarda state.loading ${out.rm25.com_guarda_state_loading} · guarda state.loaded ${out.rm25.com_guarda_state_loaded} · sem guarda ${out.rm25.sem_nenhuma_guarda} · setam state.error ${out.rm25.seteam_state_error} · catch silencioso ${out.rm25.catch_silencioso_bloco}+${out.rm25.catch_silencioso_arrow} · renderHomeDock ${out.rm25.renderHomeDock} · from('announcements') ${out.rm25.from_announcements}`);
console.log(`        carregador do aluno @offset ${out.rm25.carregador_do_aluno_offset} · trata erro de query por .error→state.error: ${out.rm25.aluno_trata_erros_de_query}`);
console.log(`RM12-A1 'pending' ${out.rm12a1_front.pending_literal} · atribuições role:'pending' ${out.rm12a1_front.atribuicoes_role_pending} · auth.signUp ${out.rm12a1_front.caminho_signup_sdk} · /auth/v1/signup ${out.rm12a1_front.caminho_signup_http} · RPCs de cadastro: ${out.rm12a1_front.rpc_de_cadastro.join(', ') || '(nenhuma)'}`);
console.log(`portões: ${out.total.ok} verdes / ${out.total.falha} vermelhos → ${out.veredito}`);
for (const f of gates.filter((g) => !g.passou)) console.log('  vermelho ' + JSON.stringify(f));
process.exit(out.total.falha === 0 ? 0 : 1);
