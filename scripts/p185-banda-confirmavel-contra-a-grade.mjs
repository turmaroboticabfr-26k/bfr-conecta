#!/usr/bin/env node
// p185 (SOMENTE LEITURA, sem credenciais, sem banco, sem rede): a pergunta que o item (11) do §SM.72 deixou em
// divida -- «as bandas confirmaveis cobrem a hora em que a escola esta de facto em aula?». A pergunta tem duas
// metades medidas em dois sitios diferentes: a banda confirmavel mora no registo do p178 (que a extrai dos bytes
// do ar) e a janela real da aula mora no registo do p184 (que a extrai do banco). Esta peca NAO re-dactilografa
// nenhum dos dois predicados: le o registo mais novo de cada produtor, prova a pega do emissor contra o ficheiro
// da peca em disco e aborta se nao o ler. Foi essa a regra duravel que o §SM.72 escreveu, e aqui ela e o desenho.
//
// A 1.ª corrida (sm73a) deu dois vermelhos meus e os dois da mesma raiz: eu procurei `emissor_md5` a topo e o
// p178 escreve `emissor.md5`; procurei `minutos_desde_meia_noite` a topo e o p184 escreve-o dentro de
// `instantaneo`, e nao tem `em` nenhum. Um campo que nao existe devolve undefined e segue em frente, por isso o
// leitor passou a resolver cada campo por FAMILIA de grafias e a abortar quando nenhuma resolve ou quando duas
// resolvem -- a mesma correcao que o §SM.68 fez ao p116 e o §SM.72 ao p137.
//
// O portao 1 tambem mudou de sentido, e por ser a face espelhada do §SM.33: a 1.ª versao exigia que o escolhido
// fosse o mais novo da FAMILIA TODA, o que daria vermelho sobre uma escolha correcta sempre que o mais novo for
// uma corrida de selfteste. Passou a medir a parte -- sobrou algum registo USAVEL mais novo que o escolhido -- e
// a guardar o mais novo da familia e a sua classe como informacao, nao como acusacao.
//
// Uso: node scripts/p185-banda-confirmavel-contra-a-grade.mjs [--selfteste] [P185_SUF=novo]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p185-banda-confirmavel-contra-a-grade.mjs';
const SELFTESTE = process.argv.slice(2).includes('--selfteste');
const SUF = process.env.P185_SUF ? '-' + process.env.P185_SUF : '-25-11';
const OUT = join(REPO, 'evidence/p185-banda-confirmavel-contra-a-grade' + (SELFTESTE ? '-selfteste' : '') + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe -- correr com P185_SUF novo, nao por cima');

// (0) instrumento de proveniencia: cada ficheiro que esta peca abre e registado por caminho relativo e o
// portao que o julga. A alternativa -- procurar no meu texto as agulhas de rede -- faria do comentador o ofensor
// (a linha que nomeia o padrao casa com ela propria), por isso o que se mede aqui e o comportamento de abrir,
// nao a prosa que o descreve.
const leituras = [];
const FAMILIAS_PERMITIDAS = ['evidence', 'scripts'];
function nota(...partes) {
  leituras.push(partes.join('/'));
  return join(REPO, ...partes);
}

// (1) as familias de grafia. Nada aqui e uma preferencia minha sobre duas escreveturas do mesmo campo: quando
// duas resolvem num mesmo registo, o resolveCampo() aborta, porque escolher por ordem seria adivinhar.
const FAM = {
  pega_md5: [
    ['emissor_md5', (c) => (c.emissor_md5 === undefined ? undefined : c.emissor_md5)],
    ['emissor.md5', (c) => (!c.emissor || c.emissor.md5 === undefined ? undefined : c.emissor.md5)],
  ],
  self_declarado: [
    ['modo', (c) => (c.modo === undefined ? undefined : String(c.modo) === 'selfteste')],
    ['selfteste', (c) => (typeof c.selfteste === 'boolean' ? c.selfteste : undefined)],
  ],
  minuto_local: [
    ['medido.minutos_locais', (c) => (!c.medido || c.medido.minutos_locais === undefined ? undefined : c.medido.minutos_locais)],
    ['instantaneo.minutos_desde_meia_noite', (c) => (!c.instantaneo || c.instantaneo.minutos_desde_meia_noite === undefined ? undefined : c.instantaneo.minutos_desde_meia_noite)],
  ],
  data_local: [
    ['medido.data_local', (c) => (!c.medido || c.medido.data_local === undefined ? undefined : c.medido.data_local)],
    ['instantaneo.data_local', (c) => (!c.instantaneo || c.instantaneo.data_local === undefined ? undefined : c.instantaneo.data_local)],
  ],
};

const PRODUTORES = [
  {
    chave: 'p178',
    padrao: /^p178-portao-da-portaria-.*\.json$/,
    campos: [
      { nome: 'instante', obrig: false, familia: [['em', (c) => (c.em === undefined ? undefined : c.em)]] },
      { nome: 'minuto_local', obrig: true, familia: FAM.minuto_local },
      { nome: 'data_local', obrig: true, familia: FAM.data_local },
      { nome: 'bandas_linhas', obrig: true, familia: [['medido.linhas', (c) => (!c.medido || c.medido.linhas === undefined ? undefined : c.medido.linhas)]] },
    ],
  },
  {
    chave: 'p184',
    padrao: /^p184-grade-das-turmas-.*\.json$/,
    campos: [
      { nome: 'instante', obrig: false, familia: [['instantaneo.data_local+hora_local', (c) => (!c.instantaneo || c.instantaneo.data_local === undefined || c.instantaneo.hora_local === undefined ? undefined : c.instantaneo.data_local + 'T' + c.instantaneo.hora_local)]] },
      { nome: 'minuto_local', obrig: true, familia: FAM.minuto_local },
      { nome: 'data_local', obrig: true, familia: FAM.data_local },
      { nome: 'grade_por_turno', obrig: true, familia: [['janela_real_da_grade_por_turno', (c) => (c.janela_real_da_grade_por_turno === undefined ? undefined : c.janela_real_da_grade_por_turno)]] },
      { nome: 'turnos_sem_hora_nenhuma', obrig: true, familia: [['turnos_sem_hora_nenhuma', (c) => (c.turnos_sem_hora_nenhuma === undefined ? undefined : c.turnos_sem_hora_nenhuma)]] },
    ],
  },
];

function resolveCampo(corpo, nome, familia, obrig) {
  const batentes = familia.filter(([, get]) => get(corpo) !== undefined);
  if (batentes.length > 1) throw new Error('ABORTA: o campo "' + nome + '" resolve em duas grafias (' + batentes.map(([g]) => g).join(' e ') + ') num mesmo registo e escolher por ordem seria adivinhar');
  if (batentes.length === 0) {
    if (obrig) return { valor: undefined, grafia: null, falta: true };
    return { valor: undefined, grafia: null, falta: false };
  }
  const [grafia, get] = batentes[0];
  return { valor: get(corpo), grafia, falta: false };
}

function chaveDeNome(nomeFicheiro) {
  const m = /^((?:p|ah)\d+)/.exec(nomeFicheiro);
  if (!m) throw new Error('ABORTA: nao sei extrair o numero da peca de ' + nomeFicheiro);
  return m[1] + '-';
}

// As classes de exclusao sao declaradas e impressas mesmo vazias: um registo retirado sem causa nomeada e o
// mesmo silencio que o mtime me deu na 1.ª corrida.
const CLASSES_DE_EXCLUSAO = ['auto_declara_selfteste', 'sem_campo_obrigatorio', 'sem_pega_de_emissor', 'pega_do_emissor_nao_bate', 'sem_instante_lido', 'usavel'];

function avaliaRegisto(produtor, nomeFicheiro, corpo, pegaPeca) {
  const resolvidos = {};
  const emFalta = [];
  for (const campo of produtor.campos) {
    const r = resolveCampo(corpo, campo.nome, campo.familia, campo.obrig);
    resolvidos[campo.nome] = r;
    if (r.falta) emFalta.push(campo.nome);
  }
  const self = resolveCampo(corpo, 'self_declarado', FAM.self_declarado, false);
  const pega = resolveCampo(corpo, 'pega_md5', FAM.pega_md5, false);
  const bate = pega.grafia !== null && pega.valor === pegaPeca.md5;
  let classe;
  if (self.valor === true) classe = 'auto_declara_selfteste';
  else if (emFalta.length) classe = 'sem_campo_obrigatorio';
  else if (pega.grafia === null) classe = 'sem_pega_de_emissor';
  else if (!bate) classe = 'pega_do_emissor_nao_bate';
  else if (resolvidos.instante.grafia === null) classe = 'sem_instante_lido';
  else classe = 'usavel';
  return { nome: nomeFicheiro, corpo, classe, emFalta, grafias: Object.fromEntries(Object.entries(resolvidos).map(([k, v]) => [k, v.grafia])), instante: resolvidos.instante.valor, pegaDeclarada: pega.valor, pegaMedida: pegaPeca.md5, bate, selfDeclarado: self.valor === true, selfGrafia: self.grafia };
}

function escolheRegisto(produtor) {
  const nomes = readdirSync(join(REPO, 'evidence')).filter((f) => produtor.padrao.test(f));
  if (!nomes.length) throw new Error('ABORTA: nenhum registo do ' + produtor.chave + ' em evidence/ -- esta peca nao inventa janelas');
  const nomesPeca = readdirSync(join(REPO, 'scripts')).filter((s) => s.startsWith(chaveDeNome(nomes[0])) && /\.mjs$/.test(s));
  if (!nomesPeca.length) throw new Error('ABORTA: a familia ' + produtor.chave + ' nao tem peca correspondente em scripts/');
  const bufPeca = readFileSync(nota('scripts', nomesPeca[0]));
  const pegaPeca = { md5: createHash('md5').update(bufPeca).digest('hex'), bytes: bufPeca.length, nome: nomesPeca[0] };
  const avaliados = nomes.map((f) => avaliaRegisto(produtor, f, JSON.parse(readFileSync(nota('evidence', f), 'utf8')), pegaPeca));
  const usaveis = avaliados.filter((a) => a.classe === 'usavel');
  if (!usaveis.length) throw new Error('ABORTA: nenhum dos ' + nomes.length + ' registos do ' + produtor.chave + ' e conferivel -- exclusoes: ' + JSON.stringify(porClasse(avaliados)));
  usaveis.sort((a, b) => String(b.instante).localeCompare(String(a.instante)));
  const escolhido = usaveis[0];
  // O portao nao pode exigir «o escolhido e o mais novo da familia toda»: quando o mais novo e uma corrida de
  // selfteste, essa escolha e correcta e o vermelho seria um alarme sobre a coisa certa (a face do §SM.33). O
  // que tem de ser medido e se sobrou na familia algum registo USAVEL mais novo que o escolhido -- o que so
  // acontece se o comparador estiver errado, por isso mede-se a parte, nao a decisao.
  const violadores = usaveis.filter((a) => String(a.instante) > String(escolhido.instante)).map((a) => a.nome);
  const comInstante = avaliados.filter((a) => a.instante !== undefined).sort((a, b) => String(b.instante).localeCompare(String(a.instante)));
  const maisNovo = comInstante.length ? comInstante[0] : null;
  return { produtor: produtor.chave, peca: pegaPeca, escolhido, avaliados, usaveis: usaveis.length, violadores, maisNovoDaFamilia: maisNovo ? maisNovo.nome : null, classe_do_mais_novo: maisNovo ? maisNovo.classe : null, exclusoes: porClasse(avaliados), registos_da_familia: nomes.length };
}
function porClasse(avaliados) {
  const out = {};
  for (const c of CLASSES_DE_EXCLUSAO) out[c] = [];
  for (const a of avaliados) out[a.classe].push(a.nome);
  return out;
}

// (2) os parseadores de janela, com fixture nos dois sentidos. O negativo existe porque um `null` silencioso
// passaria por «janela lida» e o cruzamento daria a classe errada pelo motivo errado.
const PARA_MIN = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(hhmm).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
const banda_de = (janela) => {
  const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(String(janela).trim());
  if (!m) return null;
  return { abre: PARA_MIN(m[1]), fecha: PARA_MIN(m[2]) };
};
// O traco largo (codepoint U+2013) e escrito por escape para o fonte ficar ASCII: a familia do nao-Latino corre
// no bruto do ficheiro e um glifo dactilografado aqui seria contado como ofensa minha, nao como fixture.
const TRACO_LARGO = '07:00\u201311:30';
const FIX_PARSE = [
  ['banda_boa', banda_de('07:00-11:30'), { abre: 420, fecha: 690 }],
  ['banda_sem_zero_na_hora', banda_de('7:00-11:30'), { abre: 420, fecha: 690 }],
  ['banda_com_traco_largo_NAO_e_lida', banda_de(TRACO_LARGO), null],
  ['banda_sem_hifen_NAO_e_lida', banda_de('07:00 11:30'), null],
  ['hora_boa', PARA_MIN('07:00:00'), 420],
  ['hora_so_minuto', PARA_MIN('13:00'), 780],
  ['hora_nula_NAO_e_lida', PARA_MIN(null), null],
  ['hora_com_texto_NAO_e_lida', PARA_MIN('07h00'), null],
];
const parseFalhas = FIX_PARSE.filter(([, obtido, espera]) => JSON.stringify(obtido) !== JSON.stringify(espera)).map(([id, obtido, espera]) => ({ id, espera, obtido }));
const sentidos_do_parse = { positivos: FIX_PARSE.filter(([, o]) => o !== null).length, negativos: FIX_PARSE.filter(([, o]) => o === null).length };

// (3) o leitor de campos tem de ter fixture que dispare, senao a familia e so uma lista de nomes lembrados.
function erroDe(fn) {
  try { fn(); return null; } catch (e) { return String(e.message).slice(0, 40); }
}
const FIX_RESOLVER = (() => {
  const topo = { emissor_md5: 'aabb', medido: { minutos_locais: 1300, data_local: '2026-11-25', linhas: [] }, em: '2026-11-25T15:00:00.000Z', selfteste: false };
  const aninhado = { emissor: { md5: 'ccdd', bytes: 24597 }, medido: topo.medido, em: topo.em, selfteste: true };
  const duasGrafias = { emissor_md5: 'aabb', emissor: { md5: 'ccdd' }, medido: topo.medido, em: topo.em };
  const semNada = { medido: topo.medido };
  const modoSelf = { emissor_md5: 'aabb', modo: 'selfteste', medido: topo.medido, em: topo.em };
  const o = [];
  o.push({ id: 'r1_topo_resolve', obtido: resolveCampo(topo, 'pega_md5', FAM.pega_md5, true).grafia, espera: 'emissor_md5' });
  o.push({ id: 'r2_aninhado_resolve', obtido: resolveCampo(aninhado, 'pega_md5', FAM.pega_md5, true).grafia, espera: 'emissor.md5' });
  o.push({ id: 'r3_duas_grafias_aborta', obtido: erroDe(() => resolveCampo(duasGrafias, 'pega_md5', FAM.pega_md5, true)), espera: 'ABORTA' });
  o.push({ id: 'r4_nenhuma_grafia_marca_falta', obtido: resolveCampo(semNada, 'pega_md5', FAM.pega_md5, true).falta, espera: true });
  o.push({ id: 'r5_minuto_aninhado_do_p184', obtido: resolveCampo({ instantaneo: { minutos_desde_meia_noite: 1354, data_local: '2026-11-25' } }, 'minuto_local', FAM.minuto_local, true).valor, espera: 1354 });
  o.push({ id: 'r6_self_por_selfteste', obtido: resolveCampo(aninhado, 'self_declarado', FAM.self_declarado, false).valor, espera: true });
  o.push({ id: 'r7_self_por_modo', obtido: resolveCampo(modoSelf, 'self_declarado', FAM.self_declarado, false).valor, espera: true });
  o.push({ id: 'r8_self_nao_declarado', obtido: resolveCampo(topo, 'self_declarado', FAM.self_declarado, false).valor, espera: false });
  o.push({ id: 'r9_zero_e_valor_legitimo', obtido: resolveCampo({ medido: { minutos_locais: 0 } }, 'minuto_local', FAM.minuto_local, true).valor, espera: 0 });
  return o.map((f) => Object.assign(f, { bate: JSON.stringify(f.obtido) === JSON.stringify(f.espera) || (f.espera === 'ABORTA' && String(f.obtido).startsWith('ABORTA')) }));
})();
const resolverFalhas = FIX_RESOLVER.filter((f) => !f.bate).map((f) => ({ id: f.id, espera: f.espera, obtido: f.obtido }));

// (3b) cada classe de exclusao tem de ter um corpo sintetico que a faca disparar: uma classe sem positivo e um
// ramo morto, e foi exactamente por um ramo destes que o sm73a escolheu um registo por mtime em vez de por causa.
const PEGA_STUB = { md5: 'aabb', bytes: 1, nome: 'stub.mjs' };
const CORPO_BASE = { emissor_md5: 'aabb', em: '2026-11-25T15:00:00.000Z', medido: { minutos_locais: 1300, data_local: '2026-11-25', linhas: [] } };
const FIX_CLASSES = [
  ['usavel', CORPO_BASE, 'usavel'],
  ['declara_selfteste_booleano', Object.assign({}, CORPO_BASE, { selfteste: true }), 'auto_declara_selfteste'],
  ['declara_selfteste_por_modo', Object.assign({}, CORPO_BASE, { modo: 'selfteste' }), 'auto_declara_selfteste'],
  ['sem_campo_obrigatorio', { emissor_md5: 'aabb', em: CORPO_BASE.em }, 'sem_campo_obrigatorio'],
  ['sem_pega_de_emissor', { em: CORPO_BASE.em, medido: CORPO_BASE.medido }, 'sem_pega_de_emissor'],
  ['pega_nao_bate', Object.assign({}, CORPO_BASE, { emissor_md5: 'zzzz' }), 'pega_do_emissor_nao_bate'],
  ['sem_instante_lido', { emissor_md5: 'aabb', medido: CORPO_BASE.medido }, 'sem_instante_lido'],
];
const classesDasFixtures = [];
const classFalhas = [];
for (const [id, corpo, espera] of FIX_CLASSES) {
  const obtido = avaliaRegisto(PRODUTORES[0], 'fixture-' + id + '.json', corpo, PEGA_STUB).classe;
  classesDasFixtures.push(obtido);
  if (obtido !== espera) classFalhas.push({ id, espera, obtido });
}
const classes_de_exclusao_sem_positivo = CLASSES_DE_EXCLUSAO.filter((c) => !classesDasFixtures.includes(c));

// (4) o cruzamento. Uma classe por situacao, todas impressas mesmo vazias: um zero sem a lista ao lado nao e
// cobertura, e a contagem auto-referente do §SM.60.
const CLASSES = ['banda_e_grade_sao_a_mesma_janela', 'banda_cobre_a_grade', 'grade_passa_da_banda', 'banda_sem_grade_medida', 'grade_sem_banda', 'nenhuma_das_duas'];
function classeDo(b, g) {
  if (!b && !g) return 'nenhuma_das_duas';
  if (b && !g) return 'banda_sem_grade_medida';
  if (!b && g) return 'grade_sem_banda';
  if (b.abre === null || b.fecha === null || g.desde === null || g.ate === null) return 'banda_sem_grade_medida';
  if (b.abre === g.desde && b.fecha === g.ate) return 'banda_e_grade_sao_a_mesma_janela';
  if (b.abre <= g.desde && b.fecha >= g.ate) return 'banda_cobre_a_grade';
  return 'grade_passa_da_banda';
}
const FIX_CROSS = [
  ['iguais', { abre: 420, fecha: 690 }, { desde: 420, ate: 690 }, 'banda_e_grade_sao_a_mesma_janela'],
  ['banda_cobre_por_dentro', { abre: 400, fecha: 700 }, { desde: 420, ate: 690 }, 'banda_cobre_a_grade'],
  ['grade_foge_pelo_fim', { abre: 420, fecha: 600 }, { desde: 420, ate: 690 }, 'grade_passa_da_banda'],
  ['grade_foge_pelo_comeco', { abre: 480, fecha: 690 }, { desde: 420, ate: 690 }, 'grade_passa_da_banda'],
  ['so_banda', { abre: 420, fecha: 690 }, null, 'banda_sem_grade_medida'],
  ['so_grade', null, { desde: 780, ate: 1050 }, 'grade_sem_banda'],
  ['nenhuma', null, null, 'nenhuma_das_duas'],
  ['banda_sem_horas_vira_sem_grade', { abre: null, fecha: null }, { desde: 420, ate: 690 }, 'banda_sem_grade_medida'],
  ['grade_sem_horas_vira_sem_grade', { abre: 420, fecha: 690 }, { desde: null, ate: null }, 'banda_sem_grade_medida'],
];
const fixFalhas = [];
const fixClasses = {};
for (const [id, b, g, espera] of FIX_CROSS) {
  const obtido = classeDo(b, g);
  fixClasses[id] = obtido;
  if (obtido !== espera) fixFalhas.push({ id, espera, obtido });
}

// (5) na modalidade --selfteste nao h leiturar de corpus: as fixtures bastam e o registo diz qual corrida prova.
let corpus = null;
if (!SELFTESTE) {
  const escolhas = PRODUTORES.map(escolheRegisto);
  const [e178, e184] = escolhas;
  const medido178 = e178.escolhido.corpo.medido;
  const grade184 = e184.escolhido.corpo.janela_real_da_grade_por_turno;
  const turnos_sem_hora = e184.escolhido.corpo.turnos_sem_hora_nenhuma;
  const minutos = { p178: resolveCampo(e178.escolhido.corpo, 'minuto_local', FAM.minuto_local, true), p184: resolveCampo(e184.escolhido.corpo, 'minuto_local', FAM.minuto_local, true) };
  const datas = { p178: resolveCampo(e178.escolhido.corpo, 'data_local', FAM.data_local, true), p184: resolveCampo(e184.escolhido.corpo, 'data_local', FAM.data_local, true) };
  const turnos = new Set();
  const bandas = {};
  for (const l of medido178.linhas) {
    if (!l || !l.shift) continue;
    turnos.add(l.shift);
    const b = banda_de(l.janela);
    bandas[l.shift] = { linha_existe: true, janela_texto: l.janela, abre: b ? b.abre : null, fecha: b ? b.fecha : null, confirmado: l.confirmado === true, dias: l.dias };
  }
  const grades = {};
  for (const g of grade184) {
    turnos.add(g.turno);
    grades[g.turno] = { desde: PARA_MIN(g.desde), ate: PARA_MIN(g.ate), linhas: g.linhas, texto: { desde: g.desde, ate: g.ate } };
  }
  const cruzamento = [...turnos].sort().map((t) => ({
    turno: t,
    classe: classeDo(bandas[t] || null, grades[t] || null),
    banda: bandas[t] || null,
    grade: grades[t] || null,
    turno_sem_hora_nenhuma_na_grade: Array.isArray(turnos_sem_hora) && turnos_sem_hora.includes(t),
    cobre_o_instante_do_p178: !!(bandas[t] && bandas[t].abre !== null && medido178.minutos_locais >= bandas[t].abre && medido178.minutos_locais <= bandas[t].fecha),
  }));
  const por_classe = {};
  for (const c of CLASSES) por_classe[c] = [];
  for (const l of cruzamento) por_classe[l.classe].push(l.turno);
  const classes_sem_positivo = CLASSES.filter((c) => por_classe[c].length === 0 && !Object.values(fixClasses).includes(c));
  const janelas_do_corpus_que_nao_resolveram = medido178.linhas.filter((l) => l && !banda_de(l.janela)).map((l) => l.janela);
  const diferenca_de_minutos = Number.isInteger(Number(minutos.p178.valor)) && Number.isInteger(Number(minutos.p184.valor)) ? Math.abs(Number(minutos.p178.valor) - Number(minutos.p184.valor)) : null;
  const turnos_com_ambas = cruzamento.filter((c) => c.banda && c.grade && c.grade.desde !== null && c.banda.abre !== null);
  const nao_conferiveis = cruzamento.filter((c) => c.classe === 'banda_sem_grade_medida' || c.classe === 'grade_sem_banda');
  let veredito;
  if (!turnos_com_ambas.length) veredito = 'NENHUM_TURNO_TEM_BANDA_E_GRADE_AO_MESMO_TEMPO';
  else if (nao_conferiveis.length) veredito = 'PARCIAL_ALGUM_TURNO_NAO_E_CONFERIVEL';
  else veredito = 'TODO_TURNO_CONFERIDO';
  const leituras_unicas = [...new Set(leituras)].sort();
  const leituras_fora = leituras_unicas.filter((p) => !FAMILIAS_PERMITIDAS.some((f) => p.startsWith(f + '/')));
  const exclusoes_ok = {};
  for (const e of escolhas) for (const [c, nomes] of Object.entries(e.exclusoes)) (exclusoes_ok[e.produtor] = exclusoes_ok[e.produtor] || {})[c] = nomes;
  const classes_de_exclusao_declaradas = CLASSES_DE_EXCLUSAO.slice().sort();
  const classes_de_exclusao_impressas = escolhas.map((e) => Object.keys(e.exclusoes).sort());
  const mesmo_dia_local = String(datas.p178.valor) === String(datas.p184.valor);
  corpus = {
    escolhas, medido178, grade184, turnos_sem_hora, minutos, datas, cruzamento, por_classe, classes_sem_positivo,
    janelas_do_corpus_que_nao_resolveram, diferenca_de_minutos, veredito, bandas, grades, leituras_unicas, leituras_fora,
    exclusoes: exclusoes_ok, violadores_por_produtor: escolhas.map((e) => ({ produtor: e.produtor, violadores: e.violadores })), classes_de_exclusao_declaradas, classes_de_exclusao_impressas, mesmo_dia_local,
    portoes: [
      ['nenhum_usavel_da_familia_e_mais_novo_que_o_escolhido', escolhas.map((e) => e.violadores), [[], []]],
      ['toda_classe_de_exclusao_e_impressa_por_cada_produtor', classes_de_exclusao_impressas, [classes_de_exclusao_declaradas, classes_de_exclusao_declaradas]],
      ['nenhum_turno_fica_fora_das_classes_declaradas', cruzamento.map((c) => ({ t: c.turno, classe: c.classe })).filter((x) => !CLASSES.includes(x.classe)), []],
      ['toda_classe_de_cruzamento_tem_positivo_no_corpus_ou_na_fixture', classes_sem_positivo, []],
      ['nenhuma_fixture_do_cruzamento_bateu_errado', fixFalhas, []],
      ['nenhum_fixture_do_leitor_de_campos_bateu_errado', resolverFalhas, []],
      ['nenhum_fixture_da_classificacao_bateu_errado', classFalhas, []],
      ['toda_classe_de_exclusao_tem_positivo_na_fixture', classes_de_exclusao_sem_positivo, []],
      ['os_dois_parseadores_de_janela_tem_positivo_e_negativo', { falhas: parseFalhas, dois_sentidos: sentidos_do_parse.positivos > 0 && sentidos_do_parse.negativos > 0, janelas_do_corpus_nao_resolvidas: janelas_do_corpus_que_nao_resolveram }, { falhas: [], dois_sentidos: true, janelas_do_corpus_nao_resolvidas: [] }],
      ['os_dois_instantes_usados_sao_do_mesmo_dia_local', [datas.p178.valor, datas.p184.valor, mesmo_dia_local], [datas.p178.valor, datas.p184.valor, true]],
      ['as_leituras_desta_corrida_sao_registos_e_fontes_de_peca', { fora: leituras_fora, familias: [...new Set(leituras_unicas.map((p) => p.split('/')[0]))].sort(), instrumento_cego: leituras_unicas.length === 0 }, { fora: [], familias: FAMILIAS_PERMITIDAS, instrumento_cego: false }],
    ],
  };
} else {
  corpus = {
    leituras_unicas: [...new Set(leituras)].sort(),
    portoes: [
      ['nenhum_fixture_do_leitor_de_campos_bateu_errado', resolverFalhas, []],
      ['nenhum_fixture_da_classificacao_bateu_errado', classFalhas, []],
      ['toda_classe_de_exclusao_tem_positivo_na_fixture', classes_de_exclusao_sem_positivo, []],
      ['nenhuma_fixture_do_cruzamento_bateu_errado', fixFalhas, []],
      ['os_dois_parseadores_de_janela_tem_positivo_e_negativo', { falhas: parseFalhas, dois_sentidos: sentidos_do_parse.positivos > 0 && sentidos_do_parse.negativos > 0 }, { falhas: [], dois_sentidos: true }],
      ['o_selfteste_nao_le_registos_do_corpus', leituras.filter((p) => p.startsWith('evidence/') && !p.includes('p185-')).length, 0],
    ],
  };
}

// A resposta em palavras, sempre confrontavel com os registos lidos.
const PORTOES = corpus.portoes;
const lista = PORTOES.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
const falhas = lista.filter((p) => !p.ok).length;
const fonte = readFileSync(nota(...PECA.split('/')));

const out = {
  peca: PECA,
  modo: SELFTESTE ? 'selfteste' : 'corpus',
  em: new Date().toISOString(),
  emissor_bytes: fonte.length,
  emissor_md5: createHash('md5').update(fonte).digest('hex'),
  estado: falhas > 0 ? (SELFTESTE ? 'SELFTESTE_VERMELHO' : 'PORTAO_VERMELHO') : 'MEDIDO',
  veredito: SELFTESTE ? null : corpus.veredito,
  pergunta: 'as bandas confirmaveis cobrem a hora em que a escola esta de facto em aula?',
  regra_deste_ciclo: 'nenhum predicado dos produtores foi re-dactilografado aqui; cada campo resolve-se por Familia de grafias e aborta se nenhuma ou duas resolverem',
  leitura_de_campos_por_familia: Object.fromEntries(Object.entries(FAM).map(([k, v]) => [k, v.map(([g]) => g)])),
  fixtures_do_leitor: FIX_RESOLVER.map((f) => ({ id: f.id, espera: f.espera, obtido: typeof f.obtido === 'string' && f.espera === 'ABORTA' ? f.obtido.slice(0, 12) : f.obtido, bate: f.bate })),
  fixtures_do_cruzamento: { casos: FIX_CROSS.map((f) => f[0]), classes_obtidas: fixClasses, falhas: fixFalhas },
  fixtures_da_classificacao: { casos: FIX_CLASSES.map((f) => f[0]), classes_obtidas: classesDasFixtures, falhas: classFalhas, classes_de_exclusao_sem_positivo, classes_de_exclusao_declaradas: CLASSES_DE_EXCLUSAO },
  fixtures_dos_parseadores: { casos: FIX_PARSE.map((f) => f[0]), sentidos: sentidos_do_parse, falhas: parseFalhas, nota_da_agulha_negativa: 'a janela larga do negativo e o codepoint U+2013 escrito por escape, para o fonte ficar ASCII' },
  leituras_desta_corrida: { unicas: corpus.leituras_unicas, total: leituras.length, familias_permitidas_declaradas: FAMILIAS_PERMITIDAS },
  portoes: { total: lista.length, falhas, lista },
  o_que_prova: SELFTESTE
    ? ['que o leitor de campos resolve as duas grafias, aborta com zero e com duas, e trata 0 como valor legitimo', 'que as nove classes do cruzamento e os oito sentidos do parser batem como o desenho declara']
    : [
        'que o registo escolhido de cada produtor e o mais novo conferivel da familia, com as exclusoes nomeadas por classe',
        'que a pega do emissor de cada registo escolhido bate com a peca em disco, e com que grafia cada campo foi lido',
        'em que classe do cruzamento cai cada turno, com as seis classes declaradas impressas mesmo vazias',
        'que os dois instantes usados sao do mesmo dia local e qual a diferenca de minutos entre eles',
      ],
  o_que_NAO_prova: SELFTESTE
    ? ['nada do estado do ar ou do banco: o selfteste nao abre um unico registo de corpus, e o portao 4 mede isso']
    : [
        'que a banda confirmada sirva as aulas reais de hoje: o dia depende dos dias_da_semana e do calendario, que vivem no registo do p178, nao aqui',
        'que o vespertino fique coberto quando ele gravar as horas: enquanto a grade da tarde nao tiver horas reais, nao ha janela a comparar',
        'o estado vivo do ar ou do banco neste minuto: esta peca le registos, e um registo e o instante de quem o escreveu',
        'que as seis classes sejam todas as possiveis: sao as que o desenho declara, e o portao prova que nenhum turno ficou fora delas e que cada uma tem positivo',
      ],
};
if (!SELFTESTE) {
  out.registos_usados = {};
  for (const e of corpus.escolhas) {
    out.registos_usados[e.produtor] = {
      nome: e.escolhido.nome,
      instante_lido: e.escolhido.instante,
      peca_lida: e.peca.nome,
      pega_declarada: e.escolhido.pegaDeclarada,
      pega_medida: e.peca.md5,
      bate: e.escolhido.bate,
      grafias_lidas: e.escolhido.grafias,
      registos_da_familia: e.registos_da_familia,
      mais_novo_da_familia_por_instante: e.maisNovoDaFamilia,
      classe_do_mais_novo_da_familia: e.classe_do_mais_novo,
      usaveis_mais_novos_que_o_escolhido: e.violadores,
      exclusoes_por_classe: e.exclusoes,
    };
  }
  out.instantes = { minuto_local_do_p178: corpus.minutos.p178.valor, minuto_local_do_p184: corpus.minutos.p184.valor, data_local: { p178: corpus.datas.p178.valor, p184: corpus.datas.p184.valor }, diferenca_de_minutos: corpus.diferenca_de_minutos };
  out.bandas_lidas_do_p178 = corpus.bandas;
  out.grade_lida_do_p184 = corpus.grades;
  out.turnos_sem_hora_nenhuma_do_p184 = corpus.turnos_sem_hora;
  out.classes_declaradas = CLASSES;
  out.classes_de_exclusao_declaradas = CLASSES_DE_EXCLUSAO;
  out.cruzamento_por_classe = corpus.por_classe;
  out.cruzamento = corpus.cruzamento;
  out.classes_sem_positivo = corpus.classes_sem_positivo;
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

if (SELFTESTE) {
  console.log('modo=selfteste leituras_de_corpus=' + corpus.leituras_unicas.length);
  console.log('leitor: ' + FIX_RESOLVER.length + ' fixtures, falhas=' + resolverFalhas.length + ' ' + JSON.stringify(resolverFalhas) + ' | classificacao: ' + FIX_CLASSES.length + ' corpos, falhas=' + classFalhas.length + ' ' + JSON.stringify(classFalhas) + ' classes_sem_positivo=' + JSON.stringify(classes_de_exclusao_sem_positivo));
  console.log('cruzamento: ' + FIX_CROSS.length + ' fixtures, falhas=' + fixFalhas.length + ' | parse: ' + JSON.stringify(sentidos_do_parse) + ' falhas=' + parseFalhas.length);
  console.log('P185_' + (falhas > 0 ? 'SELFTESTE_VERMELHO' : 'SELFTESTE_OK') + ' ' + (lista.length - falhas) + '/' + falhas + ' escrito em ' + OUT);
} else {
  for (const e of corpus.escolhas) console.log('registo ' + e.produtor + '=' + e.escolhido.nome + ' instante=' + e.escolhido.instante + ' grafias=' + JSON.stringify(e.escolhido.grafias) + ' familia=' + e.registos_da_familia + ' exclusoes=' + JSON.stringify(Object.fromEntries(Object.entries(e.exclusoes).map(([k, v]) => [k, v.length]))));
  console.log('instantes: p178=' + corpus.minutos.p178.valor + ' p184=' + corpus.minutos.p184.valor + ' diferenca=' + corpus.diferenca_de_minutos + ' minutos mesmo_dia=' + corpus.mesmo_dia_local);
  console.log('cruzamento: ' + corpus.cruzamento.map((c) => c.turno + '=' + c.classe).join(' '));
  console.log('por_classe: ' + CLASSES.map((c) => c + '=' + corpus.por_classe[c].length).join(' '));
  console.log('leitor: ' + FIX_RESOLVER.length + ' fixtures falhas=' + resolverFalhas.length + ' | classificacao: ' + FIX_CLASSES.length + ' corpos, falhas=' + classFalhas.length + ' classes_sem_positivo=' + JSON.stringify(classes_de_exclusao_sem_positivo) + ' | parse: ' + JSON.stringify(sentidos_do_parse) + ' falhas=' + parseFalhas.length + ' janelas_nao_resolvidas=' + JSON.stringify(corpus.janelas_do_corpus_que_nao_resolveram));
  console.log('leituras: ' + corpus.leituras_unicas.length + ' caminhos unicos fora_das_familias=' + JSON.stringify(corpus.leituras_fora));
  console.log('veredito=' + corpus.veredito + ' | portoes: ' + (lista.length - falhas) + '/' + falhas + ' | estado=' + out.estado + ' | escrito em ' + OUT);
}
if (falhas > 0) process.exit(1);
