// Porque este programa existe: o bloco §SM.76 cita quatro cifras agregadas da matriz de portas por papel
// (autorizadas, pintadas, excesso, falta) e o campo `CENSO INCOMPLETO`, e nenhuma peça versionada as imprimia
// — saíam do meu leitor da directoria de sessão, o que é a face «a cifra não é falsificável por ninguém mais».
// Este arquivo é o produtor dessas cifras: soma, sobre os registos do censo de browser, as duas faces por
// papel e imprime cada agregado com a corrida que o gerou.
//
// O que prova: por papel válido, quantas portas o mapa autoriza, quantas a superfície pintou, quais as células
// de excesso (pintadas sem autorização) e de falta (autorizadas e não mostradas), e se o censo de um papel
// cobriu o universo de tokens que o produtor declarou.
// O que NÃO prova: se uma célula de excesso chega a ter conteúdo no destino (isso é toque em browser, peça
// própria), nem qual das duas autoridades — o documento BU-6 ou o mapa servido — decide as divergências.
//
// A identidade do ar NÃO é dactilografada aqui: é lida do `ar.md5` do registo mais novo da família do `p187`,
// com aborto se nenhum resolver ou se houver empate — a mesma régua do §SM.36/§SM.72, para esta peça não
// nascer já com a quinta régua envelhecida da casa. Um registo de censo cuja pegada de shell não bate com a
// deste ar é classificado (e impresso) como inválido, nunca emprestado ao agregado.
//
// Só-leitura: 0 banco, 0 publicação, 0 DDL, 0 mint, 0 push, 0 browser, 0 escrita de registo (a prova é o
// stdout). Uso: node scripts/p188-agregado-da-matriz-lido-dos-registos.mjs <rotulos-csv> [papeis-esperados-csv]
//            node scripts/p188-agregado-da-matriz-lido-dos-registos.mjs --familia
//            node scripts/p188-agregado-da-matriz-lido-dos-registos.mjs --sonda-fixtures
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = path.join(RAIZ, 'evidence');
const FAM_SONDA = 'ah2-sonda-portas-por-papel-';
const FAM_MAPA = 'p187-mapa-de-portas-por-papel-';
const argv = process.argv.slice(2);
const MODO_FIXTURES = argv.includes('--sonda-fixtures');
const MODO_FAMILIA = argv.includes('--familia');
const POSICAO = argv.filter((a) => !a.startsWith('--'));
const ROTULOS = (POSICAO[0] || '').split(',').map((s) => s.trim()).filter(Boolean);
const ESPERA = (POSICAO[1] || '').split(',').map((s) => s.trim()).filter(Boolean);

function leFamilia(prefixo) {
  const nomes = readdirSync(EV).filter((f) => f.startsWith(prefixo) && f.endsWith('.json'));
  const comCarimpo = nomes.map((f) => {
    const j = JSON.parse(readFileSync(path.join(EV, f), 'utf8'));
    return { nome: f, ms: Date.parse(j.em || ''), json: j };
  }).filter((x) => Number.isFinite(x.ms));
  if (!comCarimpo.length) throw new Error('ABORTA: nenhum registo da familia ' + prefixo + ' tem carimpo `em` legivel');
  comCarimpo.sort((a, b) => b.ms - a.ms);
  if (comCarimpo.length > 1 && comCarimpo[0].ms === comCarimpo[1].ms) {
    throw new Error('ABORTA: empate no carimpo mais novo da familia ' + prefixo + ' — ' + comCarimpo[0].nome + ' e ' + comCarimpo[1].nome);
  }
  return comCarimpo[0];
}

// A chave dos papéis é descoberta pelas chaves de topo do artefacto, nunca dactilografada: o produtor escreve
// a palavra acentuada, e um leitor que a redigite sem acento obtém `undefined` — a mesma raiz do §SM.72.
function chaveDosPapeis(j) {
  return Object.keys(j).find((k) => /^pap/.test(k)) || null;
}

function classificaRegisto(j, ar) {
  const erros = [];
  if (!Number.isFinite(Date.parse(j.em || ''))) erros.push('sem carimpo em legivel');
  if (typeof j.md5_shell !== 'string') erros.push('sem campo md5_shell declarado');
  else if (j.md5_shell !== ar.md5) erros.push('md5_shell ' + j.md5_shell + ' != ' + ar.md5 + ' do registo ' + ar.nome);
  const prov = j.proveniencia_matriz || {};
  if (typeof prov.registo !== 'string') erros.push('sem proveniencia_matriz.registo');
  if (!chaveDosPapeis(j)) erros.push('sem chave de papeis no topo (procura por padrao, nao por nome digitado)');
  return erros;
}

function resumoDoPapel(rotulo, reg) {
  const c = reg.comparacao || {};
  const classes = {};
  for (const [classe, linhas] of Object.entries(reg.por_classe || {})) classes[classe] = (linhas || []).length;
  const sc = reg.sidebar_censo || {};
  return {
    rotulo,
    autorizadas: c.autorizadas_registradas ?? null,
    visiveis: (c.visiveis || []).length,
    tokens_censurados: c.tokens_censurados ?? null,
    universo_esperado: c.universo_esperado ?? null,
    excesso: c.visiveis_nao_autorizadas || null,
    falta: c.autorizadas_nao_visiveis || null,
    ausentes_do_censo: c.ausentes_do_censo || null,
    sidebar_com_caixa: sc.com_caixa ?? null,
    no_dom: sc.no_dom ?? null,
    appShell: sc.appShell_classes ?? null,
    classes
  };
}

function agrega(mapa, ar) {
  const papeis = Object.keys(mapa).sort();
  const lista = (campo) => papeis.reduce((n, p) => n + ((Array.isArray(mapa[p][campo]) ? mapa[p][campo].length : 0)), 0);
  const somaNum = (campo) => papeis.reduce((n, p) => n + (Number(mapa[p][campo]) || 0), 0);
  const incompletos = papeis.filter((p) => mapa[p].tokens_censurados !== mapa[p].universo_esperado);
  const porPorta = (campo) => {
    const agg = {};
    for (const p of papeis) for (const porta of mapa[p][campo] || []) (agg[porta] = agg[porta] || []).push(p);
    return Object.fromEntries(Object.entries(agg).sort((a, b) => b[1].length - a[1].length));
  };
  return {
    papeis, listaExcesso: porPorta('excesso'), listaFalta: porPorta('falta'), incompletos,
    nExcesso: lista('excesso'), nFalta: lista('falta'),
    nAutorizadas: somaNum('autorizadas'), nVisiveis: somaNum('visiveis')
  };
}

// A fusão dos registos no mapa de papéis vive numa só função para que os fixtures exerçam a regra real:
// papel sem `boot_ok` é classe medida (barreira de pendência, censo que não arrancou) e vai para a sua própria
// lista — não para a lista dos registos rejeitados, porque isso faria deste leitor um portão que proíbe uma
// classe legítima (a forma espelhada do §SM.33). Papel repetido fica do registo mais novo, porque `ordenados`
// já vem ordenado por carimpo descendente.
function consomeRegisto(rotulo, j, AR, mapa, rejeitados, semBoots, avisos, porRegisto) {
  const erros = classificaRegisto(j, AR);
  if (erros.length) { rejeitados.push(rotulo + ': ' + erros.join(' / ')); return false; }
  const chave = chaveDosPapeis(j);
  const prov = j.proveniencia_matriz || {};
  porRegisto.push(rotulo + ' em=' + j.em + ' veredito=' + JSON.stringify(j.veredito)
    + ' modo=' + j.modo + ' largura=' + j.largura + ' batida=' + JSON.stringify(j.batida)
    + ' | matriz ' + prov.registo + ' em=' + prov.em + ' papeis_no_registo=' + prov.papeis_no_registo);
  for (const [papel, reg] of Object.entries(j[chave] || {})) {
    if (!reg.boot_ok) { semBoots.push(rotulo + '/' + papel + ': ' + reg.classe + ' ' + JSON.stringify(reg.erro || '').slice(0, 90)); continue; }
    if (mapa[papel]) { avisos.push(papel + ' aparece em dois registos — fica o mais novo (' + mapa[papel].rotulo + ')'); continue; }
    mapa[papel] = resumoDoPapel(rotulo, reg);
  }
  return true;
}

const portoes = [];
const regFix = (nome, ok, detalhe) => portoes.push({ nome, ok: !!ok, detalhe });

if (MODO_FIXTURES) {
  const AR = { nome: 'p187-fx.json', md5: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
  const base = (extra) => Object.assign({
    em: '2026-11-26T10:00:00.000Z', md5_shell: AR.md5, proveniencia_matriz: { registo: 'p187-fx.json' },
    'papéis': { director: { boot_ok: true, comparacao: { autorizadas_registradas: 3, visiveis: ['a', 'b', 'c'], tokens_censurados: 4, universo_esperado: 4, visiveis_nao_autorizadas: [], autorizadas_nao_visiveis: [], ausentes_do_censo: [] }, por_classe: {}, sidebar_censo: { com_caixa: 3, no_dom: 4, appShell_classes: 'app-shell ready' } } }
  }, extra || {});
  regFix('r1_registo_conforme_sem_erro', classificaRegisto(base(), AR).length === 0, classificaRegisto(base(), AR).join('/'));
  const outroAr = base({ md5_shell: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
  regFix('r2_pegada_de_outro_ar_da_vermelho', classificaRegisto(outroAr, AR).length === 1, classificaRegisto(outroAr, AR).join('/'));
  regFix('r3_sem_o_campo_declarado_da_vermelho', classificaRegisto(base({ md5_shell: undefined }), AR).length === 1, classificaRegisto(base({ md5_shell: undefined }), AR).join('/'));
  regFix('r4_sem_carimpo_da_vermelho', classificaRegisto(base({ em: 'ontem' }), AR).length === 1, classificaRegisto(base({ em: 'ontem' }), AR).join('/'));
  regFix('r5_chave_acentuada_achada_por_padrao', chaveDosPapeis({ 'papéis': {} }) === 'papéis', String(chaveDosPapeis({ 'papéis': {} })));
  regFix('r6_chave_sem_acento_achada_por_padrao', chaveDosPapeis({ papeis: {} }) === 'papeis', String(chaveDosPapeis({ papeis: {} })));
  const semChave = base();
  delete semChave['papéis'];
  regFix('r7_sem_chave_de_papeis_da_vermelho', classificaRegisto(semChave, AR).some((e) => e.startsWith('sem chave')) === true,
    classificaRegisto(semChave, AR).join('/'));
  const incompleto = base();
  incompleto['papéis'].director.comparacao.tokens_censurados = 2;
  const mIncompleto = { director: resumoDoPapel('fx', incompleto['papéis'].director) };
  regFix('r8_censo_estreito_aparece_na_lista', agrega(mIncompleto, AR).incompletos.join(',') === 'director', agrega(mIncompleto, AR).incompletos.join(','));
  const mCompleto = { director: resumoDoPapel('fx', base()['papéis'].director) };
  regFix('r9_censo_do_universo_nao_aparece', agrega(mCompleto, AR).incompletos.length === 0, agrega(mCompleto, AR).incompletos.join(','));
  const dois = base();
  dois['papéis'].monitor = { boot_ok: true, comparacao: { autorizadas_registradas: 2, visiveis: ['x', 'y', 'z'], tokens_censurados: 4, universo_esperado: 4, visiveis_nao_autorizadas: ['z'], autorizadas_nao_visiveis: ['q'], ausentes_do_censo: [] }, por_classe: {}, sidebar_censo: {} };
  const mAgregado = agrega(Object.fromEntries(Object.entries(dois['papéis']).map(([p, r]) => [p, resumoDoPapel('fx', r)])), AR);
  regFix('r10_excesso_soma_por_papel', mAgregado.nExcesso === 1 && mAgregado.listaExcesso.z.join(',') === 'monitor', 'n=' + mAgregado.nExcesso + ' ' + JSON.stringify(mAgregado.listaExcesso));
  regFix('r11_falta_soma_por_papel', mAgregado.nFalta === 1 && mAgregado.listaFalta.q.join(',') === 'monitor', 'n=' + mAgregado.nFalta + ' ' + JSON.stringify(mAgregado.listaFalta));
  regFix('r12_autorizadas_somam_os_dos_papeis', mAgregado.nAutorizadas === 5, 'n=' + mAgregado.nAutorizadas);
  const falhou = base();
  falhou['papéis'].pending = { boot_ok: false, classe: 'CENSO_FALHOU', erro: 'barreira de pendencia' };
  const mFalha = {}; const rejFalha = []; const bootFalho = []; const avFalha = []; const regFalha = [];
  consomeRegisto('fx', falhou, AR, mFalha, rejFalha, bootFalho, avFalha, regFalha);
  regFix('r13_papel_sem_boot_sai_para_a_classe_propria_e_nao_para_o_agregado',
    Object.keys(mFalha).length === 1 && rejFalha.length === 0 && bootFalho.length === 1 && String(bootFalho[0]).indexOf('pending') > 0,
    'no agregado=' + Object.keys(mFalha).join(',') + ' rejeitados=' + JSON.stringify(rejFalha) + ' sem_boot=' + JSON.stringify(bootFalho));
  const velho = base({ em: '2026-11-26T09:00:00.000Z' });
  velho['papéis'].director.comparacao.autorizadas_registradas = 99;
  const novo = base({ em: '2026-11-26T11:00:00.000Z' });
  const mDois = {}; const rejDois = []; const bootDois = []; const avDois = []; const regDois = [];
  consomeRegisto('novo', novo, AR, mDois, rejDois, bootDois, avDois, regDois);
  consomeRegisto('velho', velho, AR, mDois, rejDois, bootDois, avDois, regDois);
  regFix('r14_papel_repetido_fica_do_primeiro_consumido',
    mDois.director.rotulo === 'novo' && mDois.director.autorizadas === 3 && avDois.length === 1,
    'rotulo=' + mDois.director.rotulo + ' autorizadas=' + mDois.director.autorizadas + ' avisos=' + avDois.length);
  regFix('r15_a_ordem_do_consumo_e_por_carimpo_descendente',
    [{ em: '2026-11-26T09:00:00.000Z' }, { em: '2026-11-26T11:00:00.000Z' }].slice().sort((a, b) => Date.parse(b.em) - Date.parse(a.em))[0].em === '2026-11-26T11:00:00.000Z', '');
  regFix('r16_registro_de_outro_ar_e_rejeitado_e_nao_entra_no_mapa', (() => {
    const mOutro = {}; const iOutro = []; const bOutro = []; const aOutro = []; const rOutro = [];
    consomeRegisto('outro', base({ md5_shell: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }), AR, mOutro, iOutro, bOutro, aOutro, rOutro);
    return Object.keys(mOutro).length === 0 && iOutro.length === 1 && bOutro.length === 0;
  })(), '');
  regFix('r17_o_veredicto_nao_depende_da_classe_sem_boot', bootFalho.length === 1 && rejFalha.length === 0, JSON.stringify({ bootFalho: bootFalho.length, rejFalha: rejFalha.length }));
  const ok = portoes.filter((x) => x.ok).length;
  console.log('P188_FIXURAS ' + ok + '/' + portoes.length + (ok === portoes.length ? ' P188_FIXURAS_OK' : ' P188_FIXURAS_VERMELHO'));
  for (const x of portoes) if (!x.ok) console.log('  FALHA ' + x.nome + ' :: ' + x.detalhe);
  process.exit(ok === portoes.length ? 0 : 1);
}

if (!MODO_FAMILIA && ROTULOS.length === 0) {
  throw new Error('ABORTA: diga o lote de rotulos (csv) ou peca --familia. Este leitor nao escolhe registos por mim.');
}

const arReg = leFamilia(FAM_MAPA);
if (!arReg.json.ar || typeof arReg.json.ar.md5 !== 'string') {
  throw new Error('ABORTA: o registo ' + arReg.nome + ' nao declara ar.md5 — nao ha identidade de ar para conferir');
}
const AR = { nome: arReg.nome, md5: arReg.json.ar.md5, em: arReg.json.em };
console.log('ar lido do registo mais novo da familia do mapa: ' + AR.nome + ' em=' + AR.em + ' md5=' + AR.md5);

let rotulos = ROTULOS;
if (MODO_FAMILIA) {
  rotulos = readdirSync(EV).filter((f) => f.startsWith(FAM_SONDA) && f.endsWith('.json'))
    .map((f) => f.slice(FAM_SONDA.length, -5));
}

const mapa = {};
const rejeitados = [];
const semBoots = [];
const avisos = [];
const porRegisto = [];
const ordenados = rotulos.map((r) => {
  const ficheiro = path.join(EV, FAM_SONDA + r + '.json');
  if (!existsSync(ficheiro)) return { rotulo: r, missing: true, ms: 0, json: null };
  const j = JSON.parse(readFileSync(ficheiro, 'utf8'));
  return { rotulo: r, missing: false, ms: Date.parse(j.em || '') || 0, json: j };
}).sort((a, b) => b.ms - a.ms);

for (const item of ordenados) {
  if (item.missing) { rejeitados.push(item.rotulo + ': ficheiro ausente'); continue; }
  consomeRegisto(item.rotulo, item.json, AR, mapa, rejeitados, semBoots, avisos, porRegisto);
}

const A = agrega(mapa, AR);
for (const r of porRegisto) console.log('  REGISTO ' + r);
for (const papel of A.papeis) {
  const x = mapa[papel];
  console.log('  ' + papel + ' [' + x.rotulo + '] autorizadas=' + x.autorizadas + ' visiveis=' + x.visiveis
    + ' censurados/universo=' + x.tokens_censurados + '/' + x.universo_esperado
    + ' caixa=' + x.sidebar_com_caixa + ' no_dom=' + x.no_dom + ' appShell=' + JSON.stringify(x.appShell)
    + ' | excesso(' + (x.excesso || []).length + ')=' + JSON.stringify(x.excesso)
    + ' | falta(' + (x.falta || []).length + ')=' + JSON.stringify(x.falta)
    + ' | ausentes=' + JSON.stringify(x.ausentes_do_censo)
    + ' | classes=' + JSON.stringify(x.classes));
}
console.log('TOTAIS: papeis_validos=' + A.papeis.length + ' autorizadas=' + A.nAutorizadas + ' visiveis=' + A.nVisiveis
  + ' excesso=' + A.nExcesso + ' falta=' + A.nFalta);
console.log('EXCESSO por porta: ' + JSON.stringify(A.listaExcesso));
console.log('FALTA por porta: ' + JSON.stringify(A.listaFalta));
console.log('CENSO INCOMPLETO por papel (tokens_censurados != universo_esperado): ' + JSON.stringify(A.incompletos));
const naoCobertos = ESPERA.filter((p) => !mapa[p]);
if (ESPERA.length) console.log('COBERTURA PEDIDA: ' + (ESPERA.length - naoCobertos.length) + '/' + ESPERA.length + (naoCobertos.length ? ' · em falta: ' + naoCobertos.join(',') : ''));
if (avisos.length) console.log('AVISOS: ' + JSON.stringify(avisos));
console.log('PAPEIS_SEM_BOOT (' + semBoots.length + ') — classe medida, nao rejeicao do leitor: ' + JSON.stringify(semBoots));
console.log('REGISTOS_REJEITADOS (' + rejeitados.length + '): ' + JSON.stringify(rejeitados));
if (MODO_FAMILIA) {
  console.log('P188_CENSO_DA_FAMILIA registos=' + rotulos.length + ' papeis_validos=' + A.papeis.length
    + ' papeis_sem_boot=' + semBoots.length + ' registos_rejeitados=' + rejeitados.length);
} else {
  const coberto = ESPERA.length === 0 ? true : naoCobertos.length === 0;
  console.log(rejeitados.length === 0 && A.papeis.length > 0 && coberto ? 'P188_MATRIZ_LIDA_OK' : 'P188_MATRIZ_LIDA_PARCIAL');
}
