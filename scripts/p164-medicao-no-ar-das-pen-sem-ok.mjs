#!/usr/bin/env node
// p164 (SOMENTE LEITURA; 0 banco, 0 publicacao, 0 push) — re-medicao no ar das PEN abertas que nao pedem OK
// nenhum e se decidem nos bytes servidos: PEN-01, PEN-02, PEN-03, PEN-04, PEN-05, PEN-06, PEN-07, PEN-13, PEN-16.
// Ciclo §SM.54, a pedido da escolha de escopo «As 15 PEN sem OK».
//
// REGRAS DESTA PECA
//  1. A identidade do ar prova-se ANTES de contar qualquer coisa: a URL e as pegadas leem-se do diario de
//     publicacao mais novo em disco. O NOME do campo de pegada mudou entre geracoes de diario (v142 usa
//     `md5_agora`/`bytes_agora`; v144 usa `shell_md5`/`shell_bytes`), por isso a peca procura o campo POR
//     FORMA (32 hex; inteiro acima de 100 000) e regista qual leu — um nome lembrado envelhece, como o
//     §SM.37 mostrou com o sufixo de corrida.
//  2. Nenhuma regua e re-dactilografada: os marcadores leem-se do bloco MARCADOS do produtor, as predicas
//     leem-se linha a linha dos produtores, e o codigo da cadeia literal→constante→helper→call site (PEN-16)
//     e o extrator de corpo por balanceamento (PEN-03/04) sao RECORTADOS do ficheiro do produtor e compilados
//     com new Function. Se a peca nao ler uma regua, ABORTA.
//  3. Baseline e sempre lida de um artefacto em disco, com caminho e campo registados; a peca aborta se nao
//     a ler. Nada de cifra lembrada.
//  4. Cada predicado novo (PEN-02, PEN-05 por ocorrencia, PEN-07 offline) tem fixture nos dois sentidos,
//     montado em tempo de execucao — um `true` sem caso falso e so a expectativa escrita em outro sitio.
//  5. Onde a grandeza nao e de bytes, diz-se: PEN-01 e tempo entre toque e paint (RM-2.1), PEN-12 e render
//     autenticado, PEN-21 e carga. A massa estatica mede-se, mas nao fecha essas linhas.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p164-medicao-no-ar-das-pen-sem-ok.mjs';
const SUF = process.env.P164_SUF ? '-' + process.env.P164_SUF : '-24-11';
const OUT = join(REPO, 'evidence/p164-medicao-no-ar-das-pen-sem-ok' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P164_SUF=novo, nao por cima');
const t0 = Date.now();

const md5 = (b) => createHash('md5').update(b).digest('hex');
const linha = (t, i) => t.slice(0, i).split('\n').length;
const tre = (s, n = 200) => String(s ?? '').replace(/\n/g, '⏎').slice(0, n);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = (corpo, flags) => new RegExp(corpo, flags);
const conta = (t, r) => (t.match(RE(r.corpo, r.flags)) || []).length;

// ---------- 0. produtores ----------
const PRODUTORES = {
  fin1: 'scripts/fin1-decisoes-produto.mjs',
  sm22t: 'scripts/sm22-varre-timers.mjs',
  sm22sw: 'scripts/sm22-varre-sw-servido.mjs',
  p119: 'scripts/p119-agregados-no-ar.mjs',
  p126: 'scripts/p126-censo-rpc-do-bundle-servido.mjs',
  ddl39: 'scripts/p73-pen39-ddl-candidata.sql',
};
const src = Object.fromEntries(Object.entries(PRODUTORES).map(([k, p]) => [k, readFileSync(join(REPO, p), 'utf8')]));
const reguas_lidas = [];
const reguas_sem_flag_global = [];
const reguas_nao_classificadas = [];
// Tres classes de uso, com regras OPOSTAS, medidas no texto da linha do produtor:
//  contagem — `conta(` / `.matchAll(` sobre o corpo inteiro: sem flag g a regua so ve a primeira ocorrencia;
//  predicado_booleano — `.test(` sobre uma janela: presence, a g e irrelevante e exigi-la era o meu erro;
//  extracao — `.exec(` ou `(... || [])[1]`: pede UM grupo a uma janela recortada, idem.
// Uma regra de forma unica sobre as classes deu dois falsos vermelhos nesta peca (PEN-05 e PEN-03/04).
const CLASSES_DE_REGUA = ['contagem', 'predicado_booleano', 'extracao', 'nao_classificada'];
const tem_match = (l) => /\.match\(/.test(l);
const classe_de_uso = (l) => {
  if (/conta\(|\.matchAll\(/.test(l) || (tem_match(l) && /\|\|\s*\[\s*\]\s*\)?\.length/.test(l))) return 'contagem';
  if (/\.test\(/.test(l)) return 'predicado_booleano';
  if (/\.exec\(/.test(l) || (tem_match(l) && /\)\s*\|\|[^)]*\)\[[01]\]/.test(l))) return 'extracao';
  return 'nao_classificada';
};

function linhaUnica(de, agulha) {
  const hits = src[de].split('\n').map((l, n) => ({ l, n: n + 1 })).filter((x) => x.l.includes(agulha));
  if (hits.length !== 1) {
    throw new Error('ABORTA: agulha [' + agulha + '] em ' + PRODUTORES[de] + ' casou ' + hits.length + ' linhas, esperava 1');
  }
  return hits[0];
}
// Extrai o primeiro literal de regex de uma linha, com escape e classe de caracteres respeitados: um `/`
// dentro de `[^/"']` nao fecha o literal, e e isso que faz um extrator ingenuo devolver uma regua cortada.
function pegaPrimeiroRegex(l) {
  const precede = new Set(['(', ',', ':', '=', '[', '!', '&', '|', '?', '{', ';', '+', '~']);
  for (let i = 0; i < l.length; i++) {
    if (l[i] !== '/') continue;
    let k = i - 1;
    while (k >= 0 && /\s/.test(l[k])) k--;
    if (k >= 0 && !precede.has(l[k])) continue;
    let j = i + 1, corpo = '', emClasse = false;
    while (j < l.length) {
      const c = l[j];
      if (c === '\\') { corpo += c + (l[j + 1] ?? ''); j += 2; continue; }
      if (c === '[' && !emClasse) { emClasse = true; corpo += c; j++; continue; }
      if (c === ']' && emClasse) { emClasse = false; corpo += c; j++; continue; }
      if (c === '/' && !emClasse) break;
      corpo += c; j++;
    }
    if (j >= l.length) continue;
    let f = '', m = j + 1;
    while (m < l.length && /[gimsuy]/.test(l[m])) { f += l[m]; m++; }
    return { corpo, flags: f, texto: '/' + corpo + '/' + f };
  }
  throw new Error('ABORTA: nenhum literal de regex na linha: ' + l.slice(0, 140));
}
function regexDe(de, agulha, para) {
  const { l, n } = linhaUnica(de, agulha);
  const r = pegaPrimeiroRegex(l);
  reguas_lidas.push({ peca: PRODUTORES[de], linha: n, para, regua: r.texto, flags: r.flags, classe_de_uso: classe_de_uso(l) });
  if (reguas_lidas[reguas_lidas.length - 1].classe_de_uso === 'nao_classificada') reguas_nao_classificadas.push({ para, regua: r.texto, linha: n });
  if (classe_de_uso(l) === 'contagem' && !r.flags.includes('g')) reguas_sem_flag_global.push({ para, regua: r.texto });
  return r;
}
function stringENumeroDe(de, agulha, para) {
  const { l } = linhaUnica(de, agulha);
  const m = /'([^']*)'\s*,\s*(\d+)/.exec(l) || /"([^"]*)"\s*,\s*(\d+)/.exec(l);
  if (!m) throw new Error('ABORTA: nao li (string, numero) na linha de ' + PRODUTORES[de] + ': ' + l.slice(0, 140));
  reguas_lidas.push({ peca: PRODUTORES[de], linha: -1, para, ancara: m[1], limite: Number(m[2]) });
  return { ancara: m[1], limite: Number(m[2]) };
}
// MARCADOS do fin1: nomes de grandeza lidos do produtor, nunca da minha memoria.
const blocoMarc = (() => {
  const i = src.fin1.indexOf('const MARCADOS = {');
  if (i < 0) throw new Error('ABORTA: fin1 nao tem bloco MARCADOS');
  const abre = src.fin1.indexOf('{', i);
  const fecha = src.fin1.indexOf('\n};', abre);
  return src.fin1.slice(abre, fecha);
})();
const MARCADOS = new Function('return ' + blocoMarc + '\n}')();
// O extractor por regex de aspas simples perdeu o `rm25_announcements: "from('announcements')"` (duplas
// aspas) e eu so o descobri ao abortar: agora avalio o bloco do proprio fin1 e confiro o numero de
// entradas contra as linhas do bloco, para que uma chave perdida aborte em vez de dar zero mudo.
const chaves_no_bloco = [...blocoMarc.matchAll(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*:/gm)].length;
if (Object.keys(MARCADOS).length !== chaves_no_bloco) {
  throw new Error('ABORTA: o bloco MARCADOS do fin1 tem ' + chaves_no_bloco + ' entradas e eu li ' + Object.keys(MARCADOS).length + ' — o extractor perdeu uma');
}
const marcadores_pedidos = [...new Set([...readFileSync(new URL(import.meta.url), 'utf8').matchAll(/\bmarca\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]))];
// So o ramo do tipo tem positivo: a chave em falta ja aborta em `marca`, por isso nao a digo aqui.
const marcadores_nao_lidos = marcadores_pedidos.filter((k) => k in MARCADOS && typeof MARCADOS[k] !== 'string');
const marca = (k) => {
  if (!(k in MARCADOS)) throw new Error('ABORTA: marcador ' + k + ' nao esta no MARCADOS do fin1');
  reguas_lidas.push({ peca: PRODUTORES.fin1, linha: -1, para: 'MARCADOS.' + k, literal: MARCADOS[k] });
  return MARCADOS[k];
};

// ---------- 1. identidade do ar, lida do diario mais novo ----------
const diarios = readdirSync(REPO)
  .filter((f) => /^audit-publicacao-v\d+\.json$/.test(f))
  .map((f) => ({ f, v: Number(/v(\d+)\.json$/.exec(f)[1]) }))
  .sort((a, b) => b.v - a.v);
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-vNNN.json no disco');
const DIARIO = diarios[0].f;
const d = JSON.parse(readFileSync(join(REPO, DIARIO), 'utf8'));
const url = d.deploy && d.deploy.url;
if (!url) throw new Error('ABORTA: ' + DIARIO + ' nao tem deploy.url');
const conf = d.conferencia_no_ar || {};
const campos_md5 = Object.entries(conf).filter(([, v]) => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v));
const campos_bytes = Object.entries(conf).filter(([, v]) => typeof v === 'number' && v > 100000);
if (campos_md5.length !== 1 || campos_bytes.length !== 1) {
  throw new Error('ABORTA: a pegada do ar nao resolve em um par unico em ' + DIARIO + ' — md5:' + campos_md5.map((x) => x[0]).join(',') + ' bytes:' + campos_bytes.map((x) => x[0]).join(','));
}
const [CAMPO_MD5, MD5_REG] = campos_md5[0];
const [CAMPO_BYTES, BYTES_REG] = campos_bytes[0];
const bundle = d.bundle || {};
const par_sw = Object.entries(bundle).filter(([k]) => /sw/i.test(k));
const sw_md5_reg = par_sw.map(([, v]) => v).find((v) => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v));
const sw_bytes_reg = par_sw.map(([, v]) => v).find((v) => typeof v === 'number');
if (!sw_md5_reg || !sw_bytes_reg) throw new Error('ABORTA: ' + DIARIO + ' nao tem bundle com md5 e bytes do SW');

const get = async (p) => {
  const r = await fetch(url + p, { headers: { 'cache-control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  const ct = String(r.headers.get('content-type') || '');
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), ct, texto: b.toString('utf8') };
};
const shell = await get('/');
const identidade = {
  diario: DIARIO, versao: diarios[0].v, url_lida_do_diario: url,
  campo_de_pegada_lido: CAMPO_MD5 + '/' + CAMPO_BYTES,
  shell: { http: shell.http, bytes: shell.bytes, md5: shell.md5,
    registado: MD5_REG + '/' + BYTES_REG, byte_identico_ao_registado: shell.md5 === MD5_REG && shell.bytes === BYTES_REG },
};
if (!identidade.shell.byte_identico_ao_registado) {
  writeFileSync(OUT, JSON.stringify({ identidade, estado: 'DIVERGE_DO_AR_REGISTRADO — nenhuma regua contou nada', em: new Date().toISOString() }, null, 2) + '\n');
  console.log('DIVERGE: apanhado ' + shell.md5 + '/' + shell.bytes + ' vs registado ' + MD5_REG + '/' + BYTES_REG);
  process.exit(1);
}
const T = shell.texto;

// A candidata em disco que e byte-identica ao ar: a casa chama-lhe "a mesma medicao" so depois de conferir.
const dirs_cand = readdirSync(REPO).filter((e) => /^bfr-candidata-v\d+/.test(e) && existsSync(join(REPO, e, 'index.html')));
const batentes = dirs_cand.filter((e) => md5(readFileSync(join(REPO, e, 'index.html'))) === shell.md5);

// ---------- 2. SW servido, com o caminho derivado dos bytes do shell ----------
const re_sw = regexDe('sm22sw', 'const brutos = [...new Set([...shellTxt.matchAll(', 'caminho do SW no shell');
const brutos_no_shell = [...new Set([...T.matchAll(RE(re_sw.corpo, re_sw.flags))].map((m) => m[1]))];
const resolvidos = [...new Set(brutos_no_shell.map((b) => b.replace(RE(/\$\{[^}]*\}/g, ''), '')))];
const caminhos_sw = [...new Set([...resolvidos, ...resolvidos.map((c) => c.split('?')[0])])];
const sw_medidos = [];
for (const c of caminhos_sw) {
  const alvo = new URL(c, url + '/').toString();
  const r = await fetch(alvo, { headers: { 'cache-control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  sw_medidos.push({ caminho: c, url_medida: alvo, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8') });
}
const sw_que_bate = sw_medidos.filter((m) => m.md5 === sw_md5_reg && m.bytes === sw_bytes_reg).map((m) => m.caminho);
const sw_oficial = sw_medidos.find((m) => m.md5 === sw_md5_reg && m.bytes === sw_bytes_reg) || sw_medidos[0];
// O shell registra dois caminhos para o mesmo recurso (`/sw-v4.js?v=45` e `/sw-v4.js`), e os dois dao o
// mesmo byte. Pedir `sw_que_bate.length === 1` era pedir o que o shell nao promete: a grandura certa e
// quantos CONTEUDOS distintos o servidor devolve para os caminhos que ele proprio anuncia.
const sw_conteudos_distintos = [...new Set(sw_medidos.map((m) => m.md5 + '/' + m.bytes))];

// ---------- 3. baselines lidas de artefactos em disco ----------
const baseline_fin1_path = 'evidence/fin1-decisoes-produto.json';
const baseline_fin1 = JSON.parse(readFileSync(join(REPO, baseline_fin1_path), 'utf8'));
const baseline_tk_path = 'evidence/sm22-varre-timers-18-11d.json';
const baseline_tk = JSON.parse(readFileSync(join(REPO, baseline_tk_path), 'utf8'));
const baseline_p119_path = 'evidence/p119-agregados-no-ar-21-11-B.json';
const baseline_p119 = JSON.parse(readFileSync(join(REPO, baseline_p119_path), 'utf8'));
const le_campo = (obj, caminho, de) => {
  const v = caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  if (v === undefined) throw new Error('ABORTA: nao li ' + caminho + ' em ' + de);
  return v;
};

// ---------- 4. PEN-01 — massa estatica de timers (a grandeza que fecha e de runtime) ----------
const re_int = regexDe('sm22t', 'intervalos_totais_no_ar:', 'PEN-01 setInterval');
const re_raf = regexDe('sm22t', 'mencoes_requestAnimationFrame_no_ar:', 'PEN-01 requestAnimationFrame');
const re_mo = regexDe('sm22t', 'mencoes_MutationObserver_no_ar:', 'PEN-01 MutationObserver');
const pen01 = {
  pergunta: 'a massa estatica de timers do ar mudou desde 18/11, e isso decide a PEN-01?',
  grandeza_que_fecha_a_linha: 'tempo entre o toque e o paint (RM-2.1) — medicao de browser com sessao viva',
  decidivel_em_leitura: false,
  medido_no_ar: { setInterval: conta(T, re_int), requestAnimationFrame: conta(T, re_raf), new_MutationObserver: conta(T, re_mo) },
  baseline: {
    artefacto: baseline_tk_path, em: baseline_tk.em, ar_md5_da_baseline: le_campo(baseline_tk, 'identidade.ar_md5', baseline_tk_path),
    igual_ao_ar_de_hoje: le_campo(baseline_tk, 'identidade.ar_md5', baseline_tk_path) === shell.md5,
    valores: {
      setInterval: le_campo(baseline_tk, 'pen01_massa_de_codigo.intervalos_totais_no_ar', baseline_tk_path),
      requestAnimationFrame: le_campo(baseline_tk, 'pen01_massa_de_codigo.mencoes_requestAnimationFrame_no_ar', baseline_tk_path),
      new_MutationObserver: le_campo(baseline_tk, 'pen01_massa_de_codigo.mencoes_MutationObserver_no_ar', baseline_tk_path),
    },
  },
};
pen01.delta = Object.fromEntries(Object.keys(pen01.medido_no_ar).map((k) => [k, pen01.medido_no_ar[k] - pen01.baseline.valores[k]]));

// ---------- 5. PEN-02 — defaultState literal vs alimentado por query ----------
const ANCARA_DS = 'const defaultState=';
const corpo_de_chavetas = (t, desde) => {
  const abre = t.indexOf('{', desde);
  if (abre < 0) return '';
  let prof = 0;
  for (let k = abre; k < t.length && k - abre < 20000; k++) {
    if (t[k] === '{') prof++;
    else if (t[k] === '}') { prof--; if (prof === 0) return t.slice(abre, k + 1); }
  }
  return t.slice(abre, abre + 20000);
};
const pos_ds = [];
for (let i = T.indexOf(ANCARA_DS); i >= 0; i = T.indexOf(ANCARA_DS, i + 1)) pos_ds.push(i);
const corpo_ds = pos_ds.length ? corpo_de_chavetas(T, pos_ds[0]) : '';
const re_par_escalar = RE('([A-Za-z_][A-Za-z0-9_]*)\\s*:\\s*([^,{}\\[\\]]{1,40})', 'g');
const pares_ds = [...corpo_ds.matchAll(re_par_escalar)].map((m) => [m[1], m[2].trim()]);
const numericos = pares_ds.filter(([, v]) => /^-?\d+(\.\d+)?$/.test(v));
const campos_unicos = [...new Set(numericos.map(([k]) => k))];
const alim_by_query = (t, K) => RE('(?:^|[^A-Za-z0-9_$])(?:[A-Za-z_$][A-Za-z0-9_$]*\\.)?' + esc(K) + '\\s*=(?!=)[^;\\n]{0,220}(?:await|\\.data\\b|\\.rpc\\(|\\.from\\()', 'g').test(t);
const alimentados_por_query = campos_unicos.filter((K) => alim_by_query(T, K));
const FIX_LIT = 'const defaultState={xp:180,streak:4,trailStep:1,quiz:{index:0}};\nfunction p(){ state.xp = 200; state.streak = 9; }';
const FIX_QUERY = "const defaultState={xp:180,streak:4,trailStep:1};\nasync function q(){ const r = await cli.from('progresso').select(); state.xp = r.data[0].value; }";
const campos_fix = (t) => {
  const corpo = corpo_de_chavetas(t, t.indexOf(ANCARA_DS));
  const cs = [...new Set([...corpo.matchAll(re_par_escalar)].map((m) => [m[1], m[2].trim()]).filter(([, v]) => /^-?\d+(\.\d+)?$/.test(v)).map(([k]) => k))];
  return { campos: cs, da_query: cs.filter((K) => alim_by_query(t, K)) };
};
const fx_lit = campos_fix(FIX_LIT), fx_query = campos_fix(FIX_QUERY);
const pen02 = {
  pergunta: 'o que o painel de XP/Trilhas/Conquistas mostra vem de uma literal no byte ou de uma consulta?',
  decidivel_em_leitura: true,
  medido_no_ar: {
    ocorrencias_da_ancara: pos_ds.length, linha_html: pos_ds.length ? linha(T, pos_ds[0]) : null,
    corpo_bytes: corpo_ds.length, campos_numericos: numericos.map(([k, v]) => k + '=' + v),
    campos_alimentados_por_query: alimentados_por_query,
    veredito_eixo: alimentados_por_query.length === 0 ? 'LITERAL_NO_BYTE (hardcoded confirmado por medida)' : 'PARCIALMENTE_ALIMENTADO',
  },
  baseline: { nota: 'o fin1 nao conta este eixo; a baseline de 12/11 e a alegacao textual do ledger, nao um numero — por isso nao ha delta aqui', artefacto_sem_numero: baseline_fin1_path },
  fixtures: {
    literal_da_query_zero: { campos: fx_lit.campos, da_query: fx_lit.da_query, passa_como_hardcoded: fx_lit.da_query.length === 0 },
    literal_alimentado_por_query: { campos: fx_query.campos, da_query: fx_query.da_query, chumba_hardcoded: fx_query.da_query.length > 0 },
  },
};

// ---------- 6. PEN-03 — applyIdentity × official_name (corpo extraido pelo codigo do produtor) ----------
const recorte = (texto, desde, ate, de) => {
  const i = texto.indexOf(desde);
  const j = texto.indexOf(ate, i);
  if (i < 0 || j <= i) throw new Error('ABORTA: recorte [' + desde + ' .. ' + ate + '] nao resolve em ' + de);
  return texto.slice(i, j);
};
const fin1_corpos_src = recorte(src.fin1, 'const corpo_desde = ', 'out.rm24 = {', PRODUTORES.fin1);
const fab_fin1 = new Function('t', fin1_corpos_src + '\nreturn { corpo_desde, corpo_de, applyIdentity, studentHero };');
const hoje = fab_fin1(T);
const anc_off = regexDe('fin1', 'oficial_name_no_ar:', 'PEN-03 official_name');
const anc_disp = regexDe('fin1', 'displayName_no_ar:', 'PEN-03 displayName');
const anc_pref = regexDe('fin1', 'preferredDisplayName_no_ar:', 'PEN-03 preferredDisplayName');
const anc_cust = regexDe('fin1', 'display_name_custom_no_ar:', 'PEN-03 display_name_custom');
const anc_hero = regexDe('fin1', 'hero_marca_no_ar:', 'PEN-03 bfr-student-hero');
const anc_eyeb = regexDe('fin1', 'hero_contem_eyebrow:', 'PEN-03 eyebrow do hero');
const bool_off = regexDe('fin1', 'applyIdentity_lê_official_name:', 'PEN-03 applyIdentity le official_name');
const bool_pref = regexDe('fin1', 'applyIdentity_lê_preferredDisplayName:', 'PEN-03 applyIdentity le preferred');
const anc_ai = stringENumeroDe('fin1', 'const applyIdentity = corpo_de(', 'PEN-03 ancora applyIdentity');
const anc_sh = stringENumeroDe('fin1', 'const studentHero = corpo_de(', 'PEN-03 ancora shellMarkup');
const corpo_ai = hoje.applyIdentity;
const pen03 = {
  pergunta: 'o hero do aluno obedece ao nome oficial ou ao nome preferido, nos bytes de hoje?',
  decidivel_em_leitura: true,
  ancora_lida_do_produtor: anc_ai.ancara,
  medido_no_ar: {
    official_name: conta(T, anc_off), displayName: conta(T, anc_disp), preferredDisplayName: conta(T, anc_pref),
    display_name_custom: conta(T, anc_cust), bfr_student_hero: conta(T, anc_hero),
    applyIdentity_bytes: corpo_ai.length,
    applyIdentity_lê_official_name: RE(bool_off.corpo, bool_off.flags).test(corpo_ai),
    applyIdentity_lê_preferred: RE(bool_pref.corpo, bool_pref.flags).test(corpo_ai),
    applyIdentity_cabeca: tre(corpo_ai, 260),
    hero_eyebrow: conta(hoje.studentHero, anc_eyeb),
  },
  baseline: { artefacto: baseline_fin1_path, em: baseline_fin1.em, ar_md5_da_baseline: baseline_fin1.ar_medido.md5,
    igual_ao_ar_de_hoje: baseline_fin1.ar_medido.md5 === shell.md5,
    valores: {
      official_name: le_campo(baseline_fin1, 'rm24.oficial_name_no_ar', baseline_fin1_path),
      displayName: le_campo(baseline_fin1, 'rm24.displayName_no_ar', baseline_fin1_path),
      preferredDisplayName: le_campo(baseline_fin1, 'rm24.preferredDisplayName_no_ar', baseline_fin1_path),
      display_name_custom: le_campo(baseline_fin1, 'rm24.display_name_custom_no_ar', baseline_fin1_path),
      bfr_student_hero: le_campo(baseline_fin1, 'rm24.hero_marca_no_ar', baseline_fin1_path),
      applyIdentity_bytes: le_campo(baseline_fin1, 'rm24.applyIdentity_tamanho', baseline_fin1_path),
      applyIdentity_lê_official_name: le_campo(baseline_fin1, 'rm24.applyIdentity_lê_official_name', baseline_fin1_path),
      applyIdentity_lê_preferred: le_campo(baseline_fin1, 'rm24.applyIdentity_lê_preferredDisplayName', baseline_fin1_path),
    } },
};
pen03.delta = Object.fromEntries(Object.keys(pen03.medido_no_ar)
  .filter((k) => typeof pen03.medido_no_ar[k] === 'number' && typeof pen03.baseline.valores[k] === 'number')
  .map((k) => [k, pen03.medido_no_ar[k] - pen03.baseline.valores[k]]));
pen03.booleans_moveram = Object.keys(pen03.medido_no_ar)
  .filter((k) => typeof pen03.medido_no_ar[k] === 'boolean' && pen03.medido_no_ar[k] !== pen03.baseline.valores[k]);

// ---------- 7. PEN-04 — carregadores, guardas e catch silencioso ----------
const re_loads = regexDe('fin1', 'const loads = [...t.matchAll(', 'PEN-04 assinaturas de load()');
const re_g_loading = regexDe('fin1', 'guarda_state_loading: /if', 'PEN-04 guarda state.loading');
const re_g_loaded = regexDe('fin1', 'guarda_state_loaded: /if', 'PEN-04 guarda state.loaded');
const re_s_error = regexDe('fin1', 'seta_state_error:', 'PEN-04 state.error no corpo');
const re_catch_bloco = regexDe('fin1', 'catch_silencioso_bloco:', 'PEN-04 catch de bloco vazio');
const re_catch_arrow = regexDe('fin1', 'catch_silencioso_arrow:', 'PEN-04 catch de arrow vazio');
const re_dock = regexDe('fin1', 'renderHomeDock:', 'PEN-04 renderHomeDock');
const re_ann = RE(esc(marca('rm25_announcements')), 'g');
const loads = [...T.matchAll(RE(re_loads.corpo, re_loads.flags))].map((m) => {
  const corpo = hoje.corpo_desde(m.index, 8000);
  const cabeca = T.slice(m.index, m.index + 600);
  return {
    linha_html: linha(T, m.index), bytes_corpo: corpo.length,
    guarda_state_loading: RE(re_g_loading.corpo, re_g_loading.flags).test(cabeca),
    guarda_state_loaded: RE(re_g_loaded.corpo, re_g_loaded.flags).test(cabeca),
    seta_state_error: RE(re_s_error.corpo, re_s_error.flags).test(corpo),
    tem_catch: /\bcatch\b/.test(corpo),
    catch_vazios_no_corpo: (corpo.match(RE(re_catch_bloco.corpo, re_catch_bloco.flags)) || []).length,
    fala_com_o_aluno: /\bisStudent\(\)/.test(corpo),
  };
});
const sem_guarda = loads.filter((l) => !l.guarda_state_loading && !l.guarda_state_loaded);
const aluno = loads.filter((l) => l.fala_com_o_aluno);
const catch_pos = [...T.matchAll(RE(re_catch_bloco.corpo, re_catch_bloco.flags))].map((m) => linha(T, m.index));
const FIX_CB = 'try { await q(); } catch (e) {}';
const FIX_OK = 'try { await q(); } catch (e) { state.error = e.message; }';
const pen04 = {
  pergunta: 'a falha silenciosa do Home do aluno continua nos bytes, e em que linha vive hoje?',
  decidivel_em_leitura: 'em parte: os bytes doem onde o erro e engolido; se o utilizador VE o erro e de browser',
  medido_no_ar: {
    carregadores: loads.length,
    com_guarda_state_loading: loads.filter((l) => l.guarda_state_loading).length,
    com_guarda_state_loaded: loads.filter((l) => l.guarda_state_loaded).length,
    sem_nenhuma_guarda: sem_guarda.length,
    seteam_state_error: loads.filter((l) => l.seta_state_error).length,
    catch_silencioso_bloco: (T.match(RE(re_catch_bloco.corpo, re_catch_bloco.flags)) || []).length,
    catch_silencioso_arrow: (T.match(RE(re_catch_arrow.corpo, re_catch_arrow.flags)) || []).length,
    renderHomeDock: conta(T, re_dock),
    from_announcements: (T.match(re_ann) || []).length,
    carregadores_que_falam_com_o_aluno: aluno.map((l) => ({ linha_html: l.linha_html, catch_vazios_no_corpo: l.catch_vazios_no_corpo, seta_state_error: l.seta_state_error, bytes_corpo: l.bytes_corpo })),
    linhas_dos_catch_silenciosos: { total: catch_pos.length, primeiras_10: catch_pos.slice(0, 10) },
  },
  baseline: { artefacto: baseline_fin1_path, em: baseline_fin1.em,
    valores: {
      carregadores: le_campo(baseline_fin1, 'rm25.carregadores_no_ar', baseline_fin1_path),
      com_guarda_state_loading: le_campo(baseline_fin1, 'rm25.com_guarda_state_loading', baseline_fin1_path),
      com_guarda_state_loaded: le_campo(baseline_fin1, 'rm25.com_guarda_state_loaded', baseline_fin1_path),
      sem_nenhuma_guarda: le_campo(baseline_fin1, 'rm25.sem_nenhuma_guarda', baseline_fin1_path),
      seteam_state_error: le_campo(baseline_fin1, 'rm25.seteam_state_error', baseline_fin1_path),
      catch_silencioso_bloco: le_campo(baseline_fin1, 'rm25.catch_silencioso_bloco', baseline_fin1_path),
      catch_silencioso_arrow: le_campo(baseline_fin1, 'rm25.catch_silencioso_arrow', baseline_fin1_path),
      renderHomeDock: le_campo(baseline_fin1, 'rm25.renderHomeDock', baseline_fin1_path),
      from_announcements: le_campo(baseline_fin1, 'rm25.from_announcements', baseline_fin1_path),
    } },
  nota_amarra_velha: 'o titulo da linha cita a linha 9392 (build antiga) e o fin1 localizava o carregador do aluno por janela de linhas 20800-20900; nenhuma das duas amarras vale na byte-count de hoje, por isso a peca procura o carregador por predicado (isStudent) e devolve a linha medida.',
  fixtures: {
    catch_vazio_casado: (FIX_CB.match(RE(re_catch_bloco.corpo, re_catch_bloco.flags)) || []).length === 1,
    catch_tratado_nao_casado: (FIX_OK.match(RE(re_catch_bloco.corpo, re_catch_bloco.flags)) || []).length === 0,
  },
};
pen04.delta = Object.fromEntries(Object.keys(pen04.medido_no_ar)
  .filter((k) => typeof pen04.medido_no_ar[k] === 'number' && typeof pen04.baseline.valores[k] === 'number')
  .map((k) => [k, pen04.medido_no_ar[k] - pen04.baseline.valores[k]]));

// ---------- 8. PEN-05 — «Marcar em analise» por ocorrencia, com o bloco envolvente ----------
const re_marca = regexDe('fin1', 'ocorrencias_texto:', 'PEN-05 ocorrencias do texto');
const re_plain = regexDe('fin1', 'modulos_text_plain:', 'PEN-05 modulos text/plain');
const re_defd = regexDe('fin1', 'modulos_deferred_disabled:', 'PEN-05 deferred-disabled');
const re_morto = regexDe('fin1', 'modulo_morto: /', 'PEN-05 tag de modulo morto');
const re_tag_id = regexDe('fin1', '(tag.match(/\\bid', 'PEN-05 id do bloco');
const re_tag_roles = regexDe('fin1', 'critical-roles', 'PEN-05 roles do bloco');
const texto_marca = MARCADOS.rm23_texto;
const ocorrencias_marca = [];
for (let i = T.indexOf(texto_marca); i >= 0; i = T.indexOf(texto_marca, i + 1)) {
  const abre = T.lastIndexOf('<script', i);
  const tag = abre < 0 ? '' : T.slice(abre, T.indexOf('>', abre) + 1);
  ocorrencias_marca.push({
    linha_html: linha(T, i), offset_bytes: i,
    tag_resumida: tre(tag, 160),
    modulo_morto: RE(re_morto.corpo, re_morto.flags).test(tag),
    id: (tag.match(RE(re_tag_id.corpo, re_tag_id.flags)) || [, null])[1],
    roles: (tag.match(RE(re_tag_roles.corpo, re_tag_roles.flags)) || [, null])[1],
  });
}
const no_morto = ocorrencias_marca.filter((o) => o.modulo_morto).length;
const FIX_TAG_MORTA = '<script id="bfr-coordination-ux" type="text/plain" data-bfr-critical-roles="coordinator">Marcar em análise</script>';
const FIX_TAG_VIVA = '<script id="bfr-coordination-ux" type="module">Marcar em análise</script>';
const pen05 = {
  pergunta: 'todas as ocorrencias do texto vivem em modulo morto, ou so a primeira (como mediu o fin1)?',
  decidivel_em_leitura: true,
  medido_no_ar: {
    ocorrencias: ocorrencias_marca.length,
    em_modulo_morto: no_morto,
    em_modulo_vivo: ocorrencias_marca.length - no_morto,
    modulos_text_plain: conta(T, re_plain),
    modulos_deferred_disabled: conta(T, re_defd),
    por_ocorrencia: ocorrencias_marca,
    veredito_eixo: ocorrencias_marca.length > 0 && no_morto === ocorrencias_marca.length
      ? 'TODAS as ocorrencias estao em modulo morto (a alegicao da linha e reproduzida por medida)'
      : no_morto + '/' + ocorrencias_marca.length + ' em modulo morto — a alegicao «so no modulo morto» NAO se reproduz',
  },
  baseline: { artefacto: baseline_fin1_path, em: baseline_fin1.em,
    valores: {
      ocorrencias: le_campo(baseline_fin1, 'rm23.ocorrencias_texto', baseline_fin1_path),
      modulos_text_plain: le_campo(baseline_fin1, 'rm23.modulos_text_plain', baseline_fin1_path),
      modulos_deferred_disabled: le_campo(baseline_fin1, 'rm23.modulos_deferred_disabled', baseline_fin1_path),
      primeira_em_modulo_morto: le_campo(baseline_fin1, 'rm23.bloco_envolvente.modulo_morto', baseline_fin1_path),
      primeira_id: le_campo(baseline_fin1, 'rm23.bloco_envolvente.id', baseline_fin1_path),
      primeira_linha: le_campo(baseline_fin1, 'rm23.linha_html', baseline_fin1_path),
    } },
  fixtures: {
    tag_com_text_plain_da_morta: RE(re_morto.corpo, re_morto.flags).test(FIX_TAG_MORTA),
    tag_module_nao_da_morta: !RE(re_morto.corpo, re_morto.flags).test(FIX_TAG_VIVA),
  },
};

// ---------- 9. PEN-06 — overlay executivo × paineis legados ----------
const re_css_none = regexDe('fin1', 'regras_css_com_display_none:', 'PEN-06 regras display:none');
const re_classe = regexDe('fin1', 'ocorrencias_classe:', 'PEN-06 ocorrencias da classe');
const re_esc = regexDe('fin1', 'escape_data_exec_revealed:', 'PEN-06 escape data-exec-revealed');
const re_tog = regexDe('fin1', 'toggle_por_js:', 'PEN-06 toggle por JS');
const re_hosp = regexDe('fin1', 'seletores_hospedeiros:', 'PEN-06 seletores hospedeiros');
const pen06 = {
  pergunta: 'o overlay continua a esconder os paineis legados e com quantas regras/escapes?',
  decidivel_em_leitura: true,
  medido_no_ar: {
    regras_css_com_display_none: conta(T, re_css_none),
    ocorrencias_da_classe: conta(T, re_classe),
    escape_data_exec_revealed: conta(T, re_esc),
    toggle_por_js: conta(T, re_tog),
    seletores_hospedeiros: [...new Set([...T.matchAll(RE(re_hosp.corpo, re_hosp.flags))].map((m) => m[1]))],
  },
  baseline: { artefacto: baseline_fin1_path, em: baseline_fin1.em,
    valores: {
      regras_css_com_display_none: le_campo(baseline_fin1, 'rm22.regras_css_com_display_none', baseline_fin1_path),
      ocorrencias_da_classe: le_campo(baseline_fin1, 'rm22.ocorrencias_classe', baseline_fin1_path),
      escape_data_exec_revealed: le_campo(baseline_fin1, 'rm22.escape_data_exec_revealed', baseline_fin1_path),
      toggle_por_js: le_campo(baseline_fin1, 'rm22.toggle_por_js', baseline_fin1_path),
    } },
};
pen06.delta = Object.fromEntries(Object.keys(pen06.medido_no_ar)
  .filter((k) => typeof pen06.medido_no_ar[k] === 'number' && typeof pen06.baseline.valores[k] === 'number')
  .map((k) => [k, pen06.medido_no_ar[k] - pen06.baseline.valores[k]]));

// ---------- 10. PEN-07 — offline da portaria, nos bytes do SW e do shell ----------
const ouvintes_do_produtor = (() => {
  const { l: ln, n: nl } = linhaUnica('sm22sw', 'const NOMES = [');
  const { l: lr } = linhaUnica('sm22sw', 'const regua = (t) =>');
  // A primeira versao desta linha re-parseri o template com `"([^"]*)" + n + "([^"]*)"` e abortou: o
  // literal do produtor contem aspa escapada (`['\"`]`), que corta o `[^"]*`. Compilar as duas linhas
  // do produtor da-me o algoritmo dele, nao a minha copia partida.
  const f = new Function(ln + '\n' + lr + '\nreturn { NOMES, regua };')();
  reguas_lidas.push({ peca: PRODUTORES.sm22sw, linha: nl, para: 'PEN-07 ouvintes do SW', texto: 'NOMES + regua do produtor compilados (' + f.NOMES.length + ' nomes), nao re-dactilografados' });
  return f;
})();
const ouvintes_em = (t) => ouvintes_do_produtor.regua(t);
const sintetico_produtor = (() => {
  const { l } = linhaUnica('sm22sw', 'const sintetico = ');
  const m = /`([^`]*)`/.exec(l);
  if (!m) throw new Error('ABORTA: nao li o controlo negativo do produtor');
  return m[1];
})();
const OFF = {
  sync_listener: RE('addEventListener\\(\\s*["\'\\x60]sync["\'\\x60]', 'g'),
  sync_manager: RE('SyncManager|registration\\.sync|\\.sync\\.register', 'g'),
  caches_open: RE('caches\\.open', 'g'),
  caches_match: RE('caches\\.match', 'g'),
  add_all: RE('addAll\\s*\\(', 'g'),
  catch_no_sw: RE('\\.catch\\s*\\(', 'g'),
  offline_ficheiro: RE('["\'][^"\']*offline[^"\']*\\.html["\']', 'gi'),
  navigator_onLine: RE('navigator\\.onLine', 'g'),
  online_offline_listener: RE('addEventListener\\(\\s*["\'\\x60](?:online|offline)["\'\\x60]', 'g'),
  localStorage_set: RE('localStorage\\.setItem', 'g'),
  indexedDB_open: RE('indexedDB\\.open', 'g'),
};
const mede_off = (t) => Object.fromEntries(Object.entries(OFF).map(([k, r]) => [k, (t.match(r) || []).length]));
const sw_off = mede_off(sw_oficial ? sw_oficial.texto : '');
const shell_off = mede_off(T);
const FIX_SW_ON = "self.addEventListener('install',e=>{});self.addEventListener('sync',e=>{});self.registration.sync.register('fila');caches.match(req);navigator.onLine;localStorage.setItem('fila',x);";
const pen07 = {
  pergunta: 'que mecanismo de offline existe hoje nos bytes servidos (SW e shell) para a portaria?',
  decidivel_em_leitura: true,
  caminho_do_sw_lido_do_shell: { brutos: brutos_no_shell, resolvidos: caminhos_sw },
  sw_servidos: sw_medidos.map((m) => ({ caminho: m.caminho, http: m.http, bytes: m.bytes, md5: m.md5 })),
  ouvintes_por_nome: sw_medidos.map((m) => ({ caminho: m.caminho, ouvintes: ouvintes_em(m.texto) })),
  medido_no_ar: { sw: sw_off, shell: shell_off },
  baseline: { artefacto: 'evidence/sm22-varre-sw-servido-18-11.json',
    nota: 'o produtor de 18/11 so contava ouvintes (5 nomes); as grandezas de offline (sync, caches, fila em localStorage) nunca tiveram baseline, por isso esta e a primeira corrida com elas' },
  fixtures: {
    ouvintes_do_produtor_no_sintetico: ouvintes_em(sintetico_produtor),
    sintetico_chumba_push_e_notificationclick: ouvintes_em(sintetico_produtor).push === false && ouvintes_em(sintetico_produtor).notificationclick === false,
    sintetico_com_offline_passa: mede_off(FIX_SW_ON).sync_listener > 0 && mede_off(FIX_SW_ON).navigator_onLine > 0,
    ar_de_hoje_chumba_onde_nao_ha: mede_off(sintetico_produtor).sync_listener === 0,
  },
};

// ---------- 11. PEN-16 — agregados municipais chamados no ar, com o codigo do produtor ----------
const re_ddl = regexDe('p119', 'ddl.matchAll(', 'PEN-16 CREATE FUNCTION do DDL da PEN-39');
const nomes_ddl = [...new Set([...src.ddl39.matchAll(RE(re_ddl.corpo, re_ddl.flags))].map((m) => m[1]))];
const p119_trecho = recorte(src.p119, 'const corpo_de = ', 'const por_nome =', PRODUTORES.p119);
const resolve119 = new Function(p119_trecho + '\nreturn { corpo_de, args_de, resolve };')().resolve;
const v142_dirs = readdirSync(REPO).filter((e) => /^bfr-candidata-v142/.test(e) && existsSync(join(REPO, e, 'index.html')));
if (v142_dirs.length !== 1) throw new Error('ABORTA: candidatas v142 em disco = ' + v142_dirs.length + ', esperava 1 para o controlo do p119');
const t_v142 = readFileSync(join(REPO, v142_dirs[0], 'index.html'), 'utf8');
const resolve_em = (t) => nomes_ddl.map((n) => {
  const c = resolve119(t, n);
  return { nome: n, fechado: c.fechado, passo: c.passo, ocorrencias_do_literal: c.ocorrencias_do_literal,
    callsites_com_a_constante: (c.cadeia || []).map((x) => x.callsites_com_a_constante_naquela_posicao ?? null) };
});
const controlo_v142 = resolve_em(t_v142);
const hoje_v16 = resolve_em(T);
const assinatura = (a) => a.map((x) => [x.nome, x.fechado, x.ocorrencias_do_literal, JSON.stringify(x.callsites_com_a_constante)].join('|')).join(';;');
const controlo_esperado = baseline_p119.por_nome.map((p) => {
  const c = p.cadeia || {};
  return { nome: p.nome, fechado: c.fechado, passo: c.passo, ocorrencias_do_literal: c.ocorrencias_do_literal,
    callsites_com_a_constante: (c.cadeia || []).map((x) => x.callsites_com_a_constante_naquela_posicao ?? null) };
});
const pen16 = {
  pergunta: 'os dois agregados municipais da PEN-39 continuam a ser chamados nos bytes servidos?',
  decidivel_em_leitura: true,
  nomes_lidos_do_ddl: nomes_ddl,
  controlo_da_regua: {
    ficheiro: v142_dirs[0] + '/index.html', bytes: Buffer.byteLength(t_v142), md5: md5(Buffer.from(t_v142)),
    artefacto_confrontado: baseline_p119_path, md5_do_artefacto: baseline_p119.ar.md5,
    byte_identico_ao_artefacto: md5(Buffer.from(t_v142)) === baseline_p119.ar.md5,
    reproduz_o_artefacto: assinatura(controlo_v142) === assinatura(controlo_esperado),
    dado: controlo_v142, esperado: controlo_esperado,
  },
  medido_no_ar: hoje_v16,
  veredito_eixo: hoje_v16.every((x) => x.fechado) ? 'AMBOS CHAMADOS NO AR' : (hoje_v16.filter((x) => x.fechado).length + '/' + hoje_v16.length + ' fecham a cadeia'),
};

// ---------- 11b. PEN-13 — a funcao do catalogo que escreve profiles.role, contada nos bytes servidos ----------
// A celula de 18/11 escreveu que «nada no app transiciona pending→papel». Isso é uma afirmação sobre bytes
// servidos, e bytes servidos medem-se. Duas coisas tinham de ser lidas de fora, e são: a régua é o extractor
// do p126 (recorte do ficheiro dele + new Function, nunca re-dactilografado) e o nome vem da ficha do p165,
// que o leu do catalogo vivo. O controlo da regua corre sobre a candidata v142, byte-identica ao ar que o
// p140 mediu em 23/11: se os dois numeros nao baterem, a culpa e da regua, nao do ar.
const FICHA_P140 = 'evidence/p140-superficie-rpc-das-duas-formas-sm37g.json';
// A ficha do p165 nao e lembrada por sufixo de corrida: escolhe-se por estado medido no proprio artefacto
// (estado MEDIDO e zero falhas) e, entre as verdes, pela mais nova pelo campo `em`. Um nome de corrida
// dactilografado envelhece — foi o defeito que o §SM.37 registou.
const fichas_p165 = readdirSync(join(REPO, 'evidence'))
  .filter((f) => /^p165-censo-em-leitura-das-pen-de-catalogo-.*\.json$/.test(f))
  .map((f) => {
    const j = JSON.parse(readFileSync(join(REPO, 'evidence', f), 'utf8'));
    return { caminho: 'evidence/' + f, em: j.em || '', verde: j.estado === 'MEDIDO' && j.portoes && j.portoes.falhas === 0 };
  })
  .sort((a, b) => (a.em < b.em ? 1 : -1));
const verdes165 = fichas_p165.filter((f) => f.verde);
if (verdes165.length === 0) throw new Error('ABORTA: nenhuma ficha de ' + fichas_p165.length + ' p165 em disco esta verde (estado MEDIDO e 0 falhas)');
const FICHA_P165 = verdes165[0].caminho;
const ficha_p140 = JSON.parse(readFileSync(join(REPO, FICHA_P140), 'utf8'));
const ficha_p165 = JSON.parse(readFileSync(join(REPO, FICHA_P165), 'utf8'));
const ancora_unica = (texto, agulha, de) => {
  const n = texto.split(agulha).length - 1;
  if (n !== 1) throw new Error('ABORTA: a ancora [' + agulha + '] casou ' + n + ' linhas em ' + de + ', esperava 1');
};
ancora_unica(src.p126, 'const RE_RPC =', PRODUTORES.p126);
ancora_unica(src.p126, '\nconst md5 =', PRODUTORES.p126);
const trecho_p126 = recorte(src.p126, 'const RE_RPC =', '\nconst md5 =', PRODUTORES.p126);
const fab_p126 = new Function(trecho_p126 + '\nreturn { extrai, RE_RPC };');
const { extrai: extrai_rpc, RE_RPC: RE_RPC_DO_P126 } = fab_p126();
const transicoes = le_campo(ficha_p165, 'pen13.funcao_de_transicao_no_catalogo', FICHA_P165);
if (!Array.isArray(transicoes) || transicoes.length !== 1) {
  throw new Error('ABORTA: ' + FICHA_P165 + ' devolve ' + (Array.isArray(transicoes) ? transicoes.length : 'nao-array') + ' funcoes de transicao, esperava exactamente 1');
}
if (transicoes[0].escreve_em_profiles !== true) throw new Error('ABORTA: a funcao de transicao da ficha nao declara escrita em profiles: ' + JSON.stringify(transicoes[0]));
const RE_ASSINATURA = RE('^public\\.([a-z_][a-z0-9_]*)\\(', '');
const nome_em = (s) => (RE_ASSINATURA.exec(String(s)) || [])[1] || null;
const nome_da_transicao = nome_em(transicoes[0].assinatura);
if (!nome_da_transicao) throw new Error('ABORTA: nao li o nome da funcao na assinatura: ' + transicoes[0].assinatura);
// Os dois sentidos, em fixture montado em tempo de execucao: a chamada por variavel nao e literal e a
// assinatura sem qualificacao nao e o que a ficha do catalogo devolve.
const FIX_CHAMADA_LITERAL = "a.rpc('" + nome_da_transicao + "',{x:1}); b.rpc( 'outro_nome' );";
const FIX_CHAMADA_SEM_FORMA = 'c.rpc(nomeVariavel); d.rpc(`' + nome_da_transicao + '`);';
const fix_chamada = [...extrai_rpc(FIX_CHAMADA_LITERAL).keys()].sort();
const fix_sem_forma = [...extrai_rpc(FIX_CHAMADA_SEM_FORMA).keys()];
const FIX_NOMES_ESPERADOS = ['outro_nome', nome_da_transicao].sort().join(',');
const FIX_ASS_BOA = 'public.' + nome_da_transicao + '(p uuid)';
const FIX_ASS_SEM_QUALIFICACAO = nome_da_transicao + '(p uuid)';
const pedidos_no_ar = extrai_rpc(T);
const sites_no_ar = [...pedidos_no_ar.values()].reduce((a, x) => a + x, 0);
const chamadas_da_transicao = pedidos_no_ar.get(nome_da_transicao) || 0;
// Segunda rota, independente do extractor do produtor: varrer as POSICOES byte da chamada. O nome e o que a
// ficha do catalogo deu, interpolado com esc(); a regua de posicao e outra implementacao, logo pode divergir.
const RE_POSICAO = RE('\\brpc\\(\\s*' + "'" + esc(nome_da_transicao) + "'", 'g');
const posicoes_da_transicao = [...T.matchAll(RE_POSICAO)].map((m) => m.index);
const contextos_da_transicao = posicoes_da_transicao.map((i) => tre(T.slice(Math.max(0, i - 60), i + 130)));
const md5_v142 = md5(Buffer.from(t_v142));
const md5_no_p140 = le_campo(ficha_p140, 'identidade_do_medido.md5_apanhado', FICHA_P140);
if (md5_v142 !== md5_no_p140) {
  throw new Error('ABORTA: a candidata v142 em disco (' + md5_v142 + ') nao e o ar que ' + FICHA_P140 + ' mediu (' + md5_no_p140 + ') — o controlo nao teria significado');
}
const pedidos_v142 = extrai_rpc(t_v142);
const dado_controlo = { sitios: [...pedidos_v142.values()].reduce((a, x) => a + x, 0), nomes: pedidos_v142.size };
const nomes_lit_p140 = le_campo(ficha_p140, 'resumo_dos_sitios.literal.nomes', FICHA_P140);
const esperado_controlo = { sitios: le_campo(ficha_p140, 'resumo_dos_sitios.literal.total', FICHA_P140), nomes: nomes_lit_p140.length };
const controlo_reproduz = dado_controlo.sitios === esperado_controlo.sitios
  && dado_controlo.nomes === esperado_controlo.nomes
  && [...pedidos_v142.keys()].sort().join(',') === [...nomes_lit_p140].sort().join(',');
const posicoes_v142 = [...t_v142.matchAll(RE_POSICAO)].map((m) => m.index);
const chamadas_v142 = pedidos_v142.get(nome_da_transicao) || 0;
// As duas rotas sao implementacoes independentes da mesma pergunta (recorte compilado do produtor vs varredura
// de posicoes construida aqui). Sao constantes e nao um truque de ordem de array: um `false` tem de poder nascer
// de as rotas divergirem, e os numeros vivem no artefacto.
const rotas_batem_no_ar = chamadas_da_transicao === posicoes_da_transicao.length;
const rotas_batem_na_v142 = chamadas_v142 === posicoes_v142.length;
const pen13 = {
  pergunta: 'a funcao do catalogo que escreve profiles.role e chamada pelos bytes servidos, hoje?',
  decidivel_em_leitura: true,
  regua: {
    via: 'recorte do ficheiro do produtor + new Function (o proprio ficheiro aborta se o extractor nao disparar no fixture dele)',
    ficheiro: PRODUTORES.p126, ancora_desde: 'const RE_RPC =', ate: 'const md5 =',
    recorte_bytes: Buffer.byteLength(trecho_p126), recorte_md5: md5(Buffer.from(trecho_p126)),
    texto_lido: String(RE_RPC_DO_P126), flags: RE_RPC_DO_P126.flags,
    regua_de_posicao_construida_a_partir_do_nome: String(RE_POSICAO),
  },
  nome_da_transicao_lido_da_ficha: {
    ficha: FICHA_P165, em: ficha_p165.em, campo: 'pen13.funcao_de_transicao_no_catalogo[0]',
    escolha_da_ficha: 'a mais nova pelo campo `em` entre as verdes', fichas_p165_varridas: fichas_p165.length, fichas_p165_verdes: verdes165.length,
    assinatura: transicoes[0].assinatura, corpo_bytes: transicoes[0].corpo_bytes, corpo_chars: transicoes[0].corpo_chars,
    escreve_em_profiles: transicoes[0].escreve_em_profiles, nome_extraido: nome_da_transicao,
  },
  medido_no_ar: {
    nomes_distintos_chamados: pedidos_no_ar.size, sitios_literais: sites_no_ar,
    chamadas_da_transicao_pela_regua_do_p126: chamadas_da_transicao,
    chamadas_da_transicao_pela_regua_de_posicoes: posicoes_da_transicao.length,
    posicoes_byte: posicoes_da_transicao,
    contextos: contextos_da_transicao,
  },
  controlo_da_regua_na_v142: {
    ficheiro: v142_dirs[0] + '/index.html', md5: md5_v142, byte_identica_ao_ar_medido_pelo_p140: true,
    artefacto_confrontado: FICHA_P140, em_do_artefacto: ficha_p140.em,
    dado: dado_controlo, esperado: esperado_controlo, reproduz_o_artefacto: controlo_reproduz,
    chamadas_da_transicao_na_v142: { pela_regua_do_p126: chamadas_v142, pela_regua_de_posicoes: posicoes_v142.length },
    rotas_batem: { no_ar: rotas_batem_no_ar, na_v142: rotas_batem_na_v142 },
    nome_ja_contado_em_23_11: nomes_lit_p140.includes(nome_da_transicao),
  },
  fixtures: {
    chamada_literal_casa_os_dois_nomes: fix_chamada,
    chamada_por_variavel_ou_crase_da_zero: fix_sem_forma.length === 0,
    assinatura_qualificada_tem_nome: nome_em(FIX_ASS_BOA) === nome_da_transicao,
    assinatura_sem_qualificacao_da_null: nome_em(FIX_ASS_SEM_QUALIFICACAO) === null,
  },
  veredito_eixo: chamadas_da_transicao > 0
    ? 'CHAMADA NO AR: ' + chamadas_da_transicao + ' sitios'
    : 'NAO CHAMADA NO AR: 0 sitios, com o controlo da regua verde na v142',
};

// ---------- 12. portoes ----------
const reguas_por_classe = (reguas) => CLASSES_DE_REGUA.map((c) => ({ classe: c, total: reguas.filter((r) => r.classe_de_uso === c).length }));
const FIX_CLASSES = [
  ['x: conta(t, /a/g)', 'contagem'],
  ['const s = [...t.matchAll(/a/g)]', 'contagem'],
  ["const n = (t.match(/a/g) || []).length;", 'contagem'],
  ['p: /a/.test(t)', 'predicado_booleano'],
  ["id: (tag.match(/a/) || [, null])[1]", 'extracao'],
  ['const q = /a/.exec(t)', 'extracao'],
  ['const z = 1;', 'nao_classificada'],
];
const fix_classes_ok = FIX_CLASSES.map(([l, esperada]) => ({ l, esperada, obtida: classe_de_uso(l), ok: classe_de_uso(l) === esperada }));
const PORTOES = [
  ['a_identidade_do_ar_bate_com_o_registo_do_diario', identidade.shell.byte_identico_ao_registado, true],
  ['o_sw_servido_bate_com_o_bundle_registado',
    [sw_conteudos_distintos.length, sw_md5_reg === (sw_oficial && sw_oficial.md5) && sw_bytes_reg === (sw_oficial && sw_oficial.bytes)], [1, true]],
  ['nenhuma_regua_foi_re_dactilografada', reguas_lidas.length > 0 && marcadores_nao_lidos.length === 0, true],
  ['toda_predica_de_contagem_tem_flag_global', reguas_sem_flag_global, []],
  ['nenhuma_regua_lida_fica_sem_classe_de_uso', reguas_nao_classificadas, []],
  ['a_classificadora_de_classes_tem_os_dois_lados_em_fixture', fix_classes_ok.filter((f) => !f.ok), []],
  ['as_tres_classes_legitimas_de_regua_estao_preenchidas',
    reguas_por_classe(reguas_lidas).filter((c) => c.classe !== 'nao_classificada' && c.total === 0).map((c) => c.classe), []],
  ['a_regua_da_pen16_reproduz_o_artefacto_do_produtor', pen16.controlo_da_regua.reproduz_o_artefacto, true],
  ['o_nome_da_transicao_da_pen13_vem_de_um_soiro_registo_do_catalogo_e_a_assinatura_sem_qualificacao_dispara',
    [transicoes.length, transicoes[0].escreve_em_profiles, pen13.fixtures.assinatura_sem_qualificacao_da_null, pen13.fixtures.assinatura_qualificada_tem_nome], [1, true, true, true]],
  ['a_regua_compilada_do_p126_casa_a_chamada_literal_e_da_zero_na_chamada_por_variavel_ou_crase',
    [fix_chamada.join(',') === FIX_NOMES_ESPERADOS, fix_sem_forma.length], [true, 0]],
  ['a_regua_compilada_reproduz_os_dois_numeros_e_o_conjunto_de_nomes_do_censo_de_23_11_sobre_bytes_identica', controlo_reproduz, true],
  ['as_duas_rotas_de_contar_a_chamada_da_transicao_batem_no_ar_e_na_v142', [rotas_batem_no_ar, rotas_batem_na_v142], [true, true]],
  ['a_regua_de_catch_silencioso_tem_os_dois_sentidos_em_fixture',
    [pen04.fixtures.catch_vazio_casado, pen04.fixtures.catch_tratado_nao_casado], [true, true]],
  ['a_regua_de_literal_vs_query_tem_os_dois_sentidos_em_fixture',
    [pen02.fixtures.literal_da_query_zero.passa_como_hardcoded, pen02.fixtures.literal_alimentado_por_query.chumba_hardcoded], [true, true]],
  ['a_regua_de_modulo_morto_tem_os_dois_sentidos_em_fixture',
    [pen05.fixtures.tag_com_text_plain_da_morta, pen05.fixtures.tag_module_nao_da_morta], [true, true]],
  ['a_regua_de_offline_tem_positivo_e_negativo_em_fixture',
    [pen07.fixtures.sintetico_com_offline_passa, pen07.fixtures.ar_de_hoje_chumba_onde_nao_ha], [true, true]],
  ['nenhum_eixo_declarado_fica_sem_numero_medido',
    Object.entries({ PEN_01: pen01, PEN_02: pen02, PEN_03: pen03, PEN_04: pen04, PEN_05: pen05, PEN_06: pen06, PEN_07: pen07, PEN_13: pen13, PEN_16: pen16 })
      .filter(([, e]) => !JSON.stringify(e.medido_no_ar).match(/[0-9]/)).map(([k]) => k), []],
  ['o_ar_de_hoje_tem_um_soiro_de_candidata_byte_identica_em_disco', batentes.length, 1],
];
const lista = PORTOES.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
const falhas = lista.filter((p) => !p.ok);
const emissor = readFileSync(join(REPO, PECA));

const eixos = { PEN_01: pen01, PEN_02: pen02, PEN_03: pen03, PEN_04: pen04, PEN_05: pen05, PEN_06: pen06, PEN_07: pen07, PEN_13: pen13, PEN_16: pen16 };
const out = {
  peca: PECA, em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  emissor_bytes: emissor.length, emissor_md5: md5(emissor),
  ciclo: '§SM.54', metodo: 'GET anónimo do shell e de cada caminho de SW que o próprio shell anuncia; identidade conferida contra o diário antes de contar; réguas e código do produtor lidos dos ficheiros e compilados; baselines lidas de artefactos em disco; 0 escrita no banco, 0 publicação, 0 push',
  identidade, bundle_sw_registado: { campo: 'sw', md5: sw_md5_reg, bytes: sw_bytes_reg, caminhos_que_batem: sw_que_bate },
  produtores_lidos: PRODUTORES, reguas_lidas, reguas_sem_flag_global, reguas_nao_classificadas, marcadores_nao_lidos,
  reguas_por_classe: reguas_por_classe(reguas_lidas), fix_classes: fix_classes_ok,
  marcadores: { pedidos: marcadores_pedidos, lidos_do_bloco: Object.keys(MARCADOS).length, entradas_no_bloco: chaves_no_bloco },
  candidatos_byte_identica_ao_ar: batentes,
  eixo_por_via: {
    bytes_servidos: ['PEN-02', 'PEN-03', 'PEN-04', 'PEN-05', 'PEN-06', 'PEN-07', 'PEN-13', 'PEN-16'],
    massa_estatica_nao_decide: ['PEN-01 (RM-2.1 é tempo entre toque e paint; a medição que fecha precisa de browser com cadeia viva)'],
  },
  eixos,
  portoes: { total: lista.length, falhas: falhas.length, lista },
  o_que_prova: [
    'os bytes contados são os do ar registado no diário de publicação (md5 e comprimento conferidos por campo lido por forma, não por nome lembrado), e o SW servido bate com o bundle registado',
    'cada marcador e cada prédica usados vêm do ficheiro do produtor, com a linha de origem registada; o código da cadeia da PEN-16 e o extrautor de corpo da PEN-03/04 são recortados do produtor e compilados',
    'a régua da PEN-16 reproduz o artefacto do p119 sobre a candidata v142 em disco, byte-idêntica ao ar que o p119 mediu',
    'as contagens de hoje para PEN-02/03/04/05/06/07/16 com os seus deltas face ao artefacto de 12/11 (fin1) ou de 18/11 (sm22)',
    'as três réguas novas (literal×query, módulo morto por ocorrência, offline no SW) têm fixture nos dois sentidos',
    'se a funcao do catalogo que escreve profiles.role e chamada pelos bytes servidos de hoje, contada por duas rotas independentes (o extractor compilado do p126 e uma varredura de posicoes byte construida a partir do nome lido da ficha do p165), com o extractor confrontado no fixture do proprio p126 e o seu censo reproduzido sobre a candidata v142 byte-identica ao ar que o p140 mediu',
  ],
  o_que_NAO_prova: [
    'que a PEN-01 esteja fechada ou aberta: a grandeza é tempo de espera e esta peça só conta massa estática de código',
    'que o utilizador veja ou não veja um erro — PEN-04 diz onde o byte engole o catch, não o que a tela pinta',
    'que os deltas face ao fin1 se devam só ao produto: as duas corridas medem bytes diferentes (v118 vs ' + identidade.versao + ') e algumas réguas foram re-implementadas por recorte, não re-corridas sobre o mesmo ficheiro',
    'que o offline exista em comportamento: a régua lê listeners e primitivas nos bytes, não executa o service worker',
    'nada sobre PEN-08, PEN-12, PEN-13, PEN-15, PEN-17, PEN-20, PEN-21 — são catálogo (p165) e disco (p166)',
  ],
  veredito: falhas.length === 0 ? 'P164_AR_DAS_15_SEM_OK_MEDIDO ' + lista.length + '/0' : 'P164_AR_DAS_15_SEM_OK_VERMELHO ' + (lista.length - falhas.length) + '/' + falhas.length,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('identidade: ' + identidade.versao + ' ' + identidade.campo_de_pegada_lido + ' md5=' + shell.md5 + ' bytes=' + shell.bytes + ' igual=' + identidade.shell.byte_identico_ao_registado + ' sw_que_batem=' + sw_que_bate.join(','));
console.log('candidata byte-idêntica: ' + (batentes.join(',') || '(nenhuma)'));
console.log('reguas por classe: ' + reguas_por_classe(reguas_lidas).map((c) => c.classe + '=' + c.total).join(' '));
console.log('PEN-01 massa: ' + JSON.stringify(pen01.medido_no_ar) + ' delta=' + JSON.stringify(pen01.delta));
console.log('PEN-02: campos=' + pen02.medido_no_ar.campos_numericos.length + ' por_query=' + JSON.stringify(pen02.medido_no_ar.campos_alimentados_por_query) + ' -> ' + pen02.medido_no_ar.veredito_eixo);
console.log('PEN-03: ' + JSON.stringify(pen03.medido_no_ar.official_name) + ' ai_bytes=' + pen03.medido_no_ar.applyIdentity_bytes + ' lê official=' + pen03.medido_no_ar['applyIdentity_lê_official_name'] + ' lê preferred=' + pen03.medido_no_ar['applyIdentity_lê_preferred'] + ' delta=' + JSON.stringify(pen03.delta) + ' bools_moveram=' + JSON.stringify(pen03.booleans_moveram));
console.log('PEN-04: ' + JSON.stringify(pen04.medido_no_ar).slice(0, 420) + ' delta=' + JSON.stringify(pen04.delta));
console.log('PEN-05: ocorrencias=' + pen05.medido_no_ar.ocorrencias + ' mortas=' + pen05.medido_no_ar.em_modulo_morto + ' vivas=' + pen05.medido_no_ar.em_modulo_vivo + ' plain=' + pen05.medido_no_ar.modulos_text_plain + ' -> ' + pen05.medido_no_ar.veredito_eixo);
console.log('PEN-06: ' + JSON.stringify(pen06.medido_no_ar).slice(0, 300) + ' delta=' + JSON.stringify(pen06.delta));
console.log('PEN-07 sw=' + JSON.stringify(sw_off) + ' shell=' + JSON.stringify(shell_off) + ' ouvintes=' + JSON.stringify(pen07.ouvintes_por_nome));
console.log('PEN-16 controlo_reproduz=' + pen16.controlo_da_regua.reproduz_o_artefacto + ' byte_identico=' + pen16.controlo_da_regua.byte_identico_ao_artefacto + ' hoje=' + JSON.stringify(pen16.medido_no_ar.map((x) => x.nome + ':' + x.fechado + '/' + x.ocorrencias_do_literal)) + ' -> ' + pen16.veredito_eixo);
console.log('portoes: ' + (lista.length - falhas.length) + '/' + falhas.length + ' -> ' + out.veredito);
for (const f of falhas) console.log('  vermelho ' + JSON.stringify(f));
console.log('registo ' + OUT);
if (falhas.length) process.exit(1);
