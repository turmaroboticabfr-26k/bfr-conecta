// V134 — tabela da re-varredura a 390 px depois da correcao. Compara cada artefacto da ronda v134a
// (ou v134b, a 2.ª tentativa dos papeis em que a 1.ª nao mediu a banda) com
// (a) TODAS as corridas m5 do mesmo papel (linha de base historica, para separar NOVO de
// pre-existente) e (b) o par v133b do mesmo papel (a corrida feita sobre a shell que continha o
// bloco ofensor) — a coluna que interessa e sidebar_caixa: a v133 marcou true em 12/12 bandas e a
// promessa da v134 e devolver false. Nao re-meide nada: so le artefactos em disco. A rgua no se
// mexe — se um papel continuar com a caixa da sidebar medida, a tabela di-lo e nao se re-escreve o
// predicado para lhe chegar ao verde.
import fs from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const SAIDA = `${EV}/v134-tabela-varredura-18-11.json`;
if (fs.existsSync(SAIDA)) throw new Error('ABORTA: ' + SAIDA + ' existe — renomeie como ANTERIOR e re-corra');

const PAPEIS = ['director', 'gatekeeper', 'coordinator', 'psychology', 'monitor', 'pending', 'parent',
  'student', 'pedagogical', 'developer', 'secretary', 'aee', 'social_work', 'sports_operator', 'education_supervisor'];
// A chave da classe nao pode levar o numero da corrida: «0 paineis vazios entre as 8 abertas» e a
// MESMA classe de «…entre as 7 abertas», e com o digito dentro o par v133b (que registou a falha
// literalmente igual) nao apanhava nada e o `novas=1` do education_supervisor era da sonda, nao da
// shell. Digitos viram N nos dois lados da comparacao — a classe fica estável, o conteudo nao.
const norm = (s) => String(s).replace(/^390px:\s*/, '').split('|')[0].replace(/\d+/g, 'N').trim();
const le = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const l_m5 = fs.readdirSync(EV).filter((f) => /^ah2-mobile2-m5-/.test(f)).map((f) => le(`${EV}/${f}`)).filter(Boolean);

const linhas = [];
for (const p of PAPEIS) {
  const base = l_m5.filter((j) => j.papel === p);
  const baseSet = new Set();
  for (const j of base) for (const f of (j.falhas || [])) baseSet.add(norm(f));
  const l = { papel: p, baselines_m5: base.length, baselines_m5_com_banda_390: base.filter((j) => j.bandas && j.bandas['390']).length };
  const j133 = le(`${EV}/ah2-mobile2-v133b-${p}.json`);
  const b133 = j133 && j133.bandas && j133.bandas['390'];
  // `gaveta_aberta_a_toque` e `seccoes` vivem DENTRO da banda (provado em
  // evidence/ah2-mobile2-v133b-education_supervisor.json), nao no topo do artefacto.
  const municipalNaGaveta = (b) => Array.isArray(b.censo.gaveta) && b.censo.gaveta.some((g) => g.route === 'secretaria-municipal');
  l.v133b = b133 ? { sidebar_caixa: b133.censo.sidebar_caixa, gaveta: b133.gaveta_aberta_a_toque === true, abertas: b133.abertas,
    municipal_na_gaveta: municipalNaGaveta(b133), falhas_no_topo: (j133.falhas || []).length } : (j133 ? 'sem_banda_390' : 'sem_artefacto');
  // Duas rondas numeradas (v134a, v134b) como no m5: a 2.ª so existe para os papeis cuja 1.ª tentativa
  // nao chegou a medir a banda 390. A banda escolhida e a primeira que existe; o numero de tentativas
  // fica na linha, o predicado nao muda.
  const Rondas = ['v134a', 'v134b'];
  const vistas = [];
  let j = null, b = null, ronda = null;
  for (const t of Rondas) {
    const cand = le(`${EV}/ah2-mobile2-${t}-${p}.json`);
    if (!cand) continue;
    vistas.push(t);
    const bb = cand.bandas && cand.bandas['390'];
    if (bb && !b) { j = cand; b = bb; ronda = t; }
    if (bb) break;
    if (!j) { j = cand; ronda = t; }
  }
  l.tentativas = vistas.length;
  l.ronda_escolhida = b ? ronda : null;
  if (!j) { l.v134a = 'sem_artefacto'; linhas.push(l); continue; }
  l.v134a = b ? 'com_banda' : 'sem_banda';
  if (b) l.censo = { presentation: b.censo.presentation, sidebar_caixa: b.censo.sidebar_caixa, barra_existe: b.censo.barra_existe,
    gaveta_aberta_a_toque: b.gaveta_aberta_a_toque === true, municipal_na_gaveta: municipalNaGaveta(b),
    municipal_assentou: b.seccoes && b.seccoes['secretaria-municipal'] ? b.seccoes['secretaria-municipal'].assentou : 'seccao_nao_aberta_nesta_corrida',
    gaveta_itens: Array.isArray(b.censo.gaveta) ? b.censo.gaveta.length : 0 };
  l.abertas = b ? b.abertas : null;
  l.novas = (j.falhas || []).map(norm).filter((f) => !baseSet.has(f));
  l.preexistentes = (j.falhas || []).map(norm).filter((f) => baseSet.has(f));
  // Uma classe «nova» contra o m5 pode ja estar no par v133b (a corrida imediata anterior, sobre a
  // shell com o bloco ofensor). Dizer NOVO sem olhar o par e culpar a correcao pelo que nao e dela.
  const set133 = new Set(((j133 && j133.falhas) || []).map(norm));
  l.novas_foram_vistas_na_v133b = l.novas.filter((f) => set133.has(f));
  l.novas_de_verdade = l.novas.filter((f) => !set133.has(f));
  l.falhas_no_topo = (j.falhas || []).length;
  l.shell_md5 = j.md5_shell;
  l.portao_mobile_esperado = b ? (b.censo.presentation === 'mobile' && b.censo.sidebar_caixa === false) : null;
  l.contrato_mobile_restaurado = l.portao_mobile_esperado === true;
  linhas.push(l);
}

const medidos = linhas.filter((l) => l.v134a === 'com_banda');
const sidebarFalse = medidos.filter((l) => l.censo.sidebar_caixa === false);
const sidebarTrue = medidos.filter((l) => l.censo.sidebar_caixa === true);
const gavetaOk = medidos.filter((l) => l.censo.gaveta_aberta_a_toque === true);

const out = {
  version: 'v134', data: '2026-11-18', ciclo: 'AH-7b-MOBILE (re-varredura 390 px pos-correcao v134)',
  promessa: 'sidebar_caixa=false em todas as bandas 390 medidas (a v133 marcou true em 12/12) e a gaveta a abrir',
  metodo: 'linha de base de NOVO/pre-existente = todas as corridas m5 do mesmo papel (falhas vivem no topo do artefacto), '
    + 'com a chave da classe normalizada por digitos; cada NOVO e ainda confrontado com o par v133b do mesmo papel e '
    + 'separado em `novas_de_verdade`. Comparacao direta com o par v133b para a coluna sidebar_caixa. Nada re-medido aqui.',
  shell_esperada: 'b272fd4f3a737c518e888250ab8167f1 (candidata v134 publicada como versao 8600fc3d)',
  shells_medidas: [...new Set(medidos.map((l) => l.shell_md5))],
  papais: linhas,
  contagens: { papeis_na_lista: PAPEIS.length, com_banda_390: medidos.length,
    sem_banda_390: linhas.filter((l) => l.v134a === 'sem_banda').length,
    sem_artefacto: linhas.filter((l) => l.v134a === 'sem_artefacto').length,
    sidebar_caixa_false: sidebarFalse.length, sidebar_caixa_true: sidebarTrue.length,
    contrato_mobile_restaurado: medidos.filter((l) => l.contrato_mobile_restaurado).length,
    gaveta_aberta_a_toque: gavetaOk.length },
  papeis_que_ainda_mostram_a_sidebar: sidebarTrue.map((l) => l.papel),
  contas_das_novas: {
    novas_contra_m5: linhas.reduce((s, l) => s + (l.novas || []).length, 0),
    dessas_ja_vistas_na_v133b: linhas.reduce((s, l) => s + (l.novas_foram_vistas_na_v133b || []).length, 0),
    novas_de_verdade: linhas.reduce((s, l) => s + (l.novas_de_verdade || []).length, 0),
    preexistentes: linhas.reduce((s, l) => s + (l.preexistentes || []).length, 0),
    regra_da_classe: 'chave = nome da regra sem o prefixo da largura e com os digitos por N; o numero de paineis abertos muda de corrida para corrida e nao e uma classe nova',
  },
  tipos_de_novo: Object.fromEntries((() => { const m = new Map(); for (const l of linhas) for (const f of (l.novas || [])) m.set(f, (m.get(f) || 0) + 1); return [...m]; })()),
  veredito: (linhas.filter((l) => l.v134a === 'sem_artefacto').length === 0 && sidebarTrue.length === 0 && gavetaOk.length === medidos.length)
    ? 'V134_CONTRATO_MOBILE_RESTAURADO' : 'V134_VARREDURA_COM_REMANESCENTES',
  em: new Date().toISOString(),
};
fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
for (const l of linhas) {
  const v133 = typeof l.v133b === 'object' && l.v133b ? `sidebar_v133=${l.v133b.sidebar_caixa}` : `v133=${l.v133b}`;
  console.log(`${l.papel.padEnd(21)} ${String(l.v134a).padEnd(11)} abertas=${String(l.abertas).padStart(3)} `
    + `novas=${(l.novas || []).length} pre=${(l.preexistentes || []).length} ${v133} `
    + `sidebar_v134=${l.censo ? l.censo.sidebar_caixa : '-'} gaveta=${l.censo ? l.censo.gaveta_aberta_a_toque : '-'}`);
  for (const f of (l.novas || [])) console.log('   NOVO' + ((l.novas_foram_vistas_na_v133b || []).includes(f) ? ' (ja registado no par v133b)' : ' (de verdade)') + ': ' + f.slice(0, 95));
}
console.log('contagens: ' + JSON.stringify(out.contagens));
console.log(out.veredito);
