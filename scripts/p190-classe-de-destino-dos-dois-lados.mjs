// Porque este programa existe: a regra de classe de destino do emissor de censo mudou entre duas corridas,
// porque a primeira chamou SEM_MOVIMENTO a celulas onde chegaram respostas de dados com corpo. Para que a
// frase «a regra velha escondia N celulas» nao seja a minha leitura da directoria de sessao, este arquivo e o
// produtor versionado do confronto: le os dois registos mais novos da familia que declaram resumo.toque com
// lista de celulas e imprime, por celula, a classe, o motivo e a medida que CADA registo tem sobre si, sem
// re-escrever predicado nenhum.
//
// O que prova: quantas das celulas tocadas mudaram de classe entre os dois registos, quais mudaram, e o que
// cada registo declarou como vocabulario de destino na sua propria ficha. O que NAO prova: se o conteudo que
// chegou ao destino devia chegar (isso e decisao do dono sobre o mapa), nem o que o utilizador viu no ecra.
//
// Proveniencia: nem um nome de registo nem uma pegada de ar sao dactilografados aqui. Os lados resolvem-se
// pelo carimbo `em` mais novo da familia que declare `resumo.toque`, com aborto se resolverem menos de dois;
// a chave dos papeis descobre-se pelo padrao das chaves de topo (o produtor escreve a palavra acentuada);
// um leitor que redigite sem acento recebe undefined, que e o sexto verme desta casa.
//
// So-leitura: 0 banco, 0 publicacao, 0 DDL, 0 mint, 0 push, 0 browser, 0 escrita de registo (a prova e o stdout).
// Uso: node scripts/p190-classe-de-destino-dos-dois-lados.mjs
//      node scripts/p190-classe-de-destino-dos-dois-lados.mjs --sonda-fixtures
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = path.join(RAIZ, 'evidence');
const FAM_SONDA = 'ah2-sonda-portas-por-papel-';
const MODO_FIXTURES = process.argv.slice(2).includes('--sonda-fixtures');

function leFamilia(prefixo) {
  const nomes = readdirSync(EV).filter((f) => f.startsWith(prefixo) && f.endsWith('.json'));
  const comCarimpo = nomes.map((f) => {
    const j = JSON.parse(readFileSync(path.join(EV, f), 'utf8'));
    return { nome: f, ms: Date.parse(j.em || ''), json: j };
  }).filter((x) => Number.isFinite(x.ms));
  if (!comCarimpo.length) throw new Error('ABORTA: nenhum registo da familia ' + prefixo + ' tem carimpo legivel');
  comCarimpo.sort((a, x) => x.ms - a.ms);
  return comCarimpo;
}

function chaveDosPapeis(j) {
  return Object.keys(j).find((k) => /^pap/.test(k)) || null;
}

function vocabularioDeDestino(j) {
  const v = ((j.resumo || {}).toque || {}).vocabulario_de_destino;
  if (!Array.isArray(v) || v.length === 0) throw new Error('ABORTA: o registo ' + j.em + ' nao declara vocabulario_de_destino');
  return v;
}

function celulasDoRegisto(j) {
  const chave = chaveDosPapeis(j);
  if (!chave) throw new Error('ABORTA: nenhum registo sem chave de papeis por padrao — as chaves de topo sao ' + Object.keys(j).join(','));
  const saida = {};
  for (const [papel, reg] of Object.entries(j[chave] || {})) {
    const t = reg ? reg.toque : null;
    if (!t || typeof t !== 'object') continue;
    for (const [rota, ficha] of Object.entries(t)) {
      if (!ficha || typeof ficha !== 'object' || typeof ficha.classe !== 'string') continue;
      saida[papel + '/' + rota] = { classe: ficha.classe, motivo: ficha.motivo, medida: ficha.medida, mecanismo: ficha.mecanismo, ms: ficha.ms_toque_ate_seccao };
    }
  }
  return saida;
}

function classeDaCelula(a, b) {
  if (a && b) return a.classe === b.classe ? 'MESMA_CLASSE' : 'CLASSE_DIVERSA';
  return 'SO_NUM_LADO';
}

function faceDaCelula(ficha) {
  if (!ficha) return 'ausente';
  return ficha.classe + ' :: ' + JSON.stringify(ficha.motivo) + ' :: medida=' + JSON.stringify(ficha.medida);
}

function divergenciasDoVocabulario(j, celulas) {
  const v = vocabularioDeDestino(j);
  return Object.entries(celulas).filter(([, f]) => !v.includes(f.classe)).map(([k, f]) => k + '=' + f.classe);
}

function consistenciaDasCelulas(j, celulas) {
  // O confronto e entre grandezas declaradas pelo produtor, nao entre formatos: `celulas_tocadas` e
  // `por_classe` sao reconstruiveis a partir das fichas, enquanto a lista `celulas` usa a notacao
  // papel-rota=classe do emissor e seria eu a re-dactilografar o formato dele para a comparar com as chaves.
  const t = (j.resumo || {}).toque || {};
  if (typeof t.celulas_tocadas !== 'number' || !t.por_classe || typeof t.por_classe !== 'object') return { bate: null, nota: 'o registo nao declara celulas_tocadas nem por_classe' };
  const dasFichas = {};
  for (const f of Object.values(celulas)) dasFichas[f.classe] = (dasFichas[f.classe] || 0) + 1;
  const serial = (h) => Object.keys(h).sort().map((c) => c + '=' + h[c]).join(',');
  return {
    bate: t.celulas_tocadas === Object.keys(celulas).length && serial(t.por_classe) === serial(dasFichas),
    contagem: { declarado: t.celulas_tocadas, fichas: Object.keys(celulas).length },
    histograma: { declarado: t.por_classe, fichas: dasFichas },
  };
}

if (MODO_FIXTURES) {
  const fx = [];
  const regFix = (nome, ok, detalhe) => fx.push({ nome, ok, detalhe: String(detalhe).slice(0, 160) });
  const registo = (em, chave, toques, vocab, extra) => ({
    em, [chave]: toques,
    resumo: { toque: Object.assign({ vocabulario_de_destino: vocab }, extra || {}) },
  });
  const V = ['SEM_CAJA_PARA_TOQUE', 'SEM_MOVIMENTO', 'DESTINO_RECUSADO', 'DESTINO_COM_CONTEUDO', 'DESTINO_SEM_DADOS', 'REDE_NAO_OBSERVADA'];
  const ficha = (classe, motivo, medida, mecanismo, ms) => ({ classe, motivo, medida, mecanismo, ms_toque_ate_seccao: ms });
  const DEV = (f) => ({ developer: { toque: { relatorios: f } } });
  const dois = [
    { nome: 'r-velho.json', ms: 1, json: registo('2026-11-26T10:00:00.000Z', 'papéis', DEV(ficha('SEM_MOVIMENTO', 'velho', { respostas: 112 }, 'toque_e_rato', null)), V, { celulas: ['developer/relatorios=SEM_MOVIMENTO'], celulas_tocadas: 1, por_classe: { SEM_MOVIMENTO: 1 } }) },
    { nome: 'r-novo.json', ms: 2, json: registo('2026-11-26T11:00:00.000Z', 'papéis', DEV(ficha('DESTINO_COM_CONTEUDO', 'novo', { respostas: 113 }, 'toque', 31)), V, { celulas: ['developer/relatorios=DESTINO_COM_CONTEUDO'], celulas_tocadas: 1, por_classe: { DESTINO_COM_CONTEUDO: 1 } }) },
  ];
  regFix('f1_chave_dos_papeis_lida_por_padrao', chaveDosPapeis(dois[0].json) === 'papéis', String(chaveDosPapeis({ resumo: {} })));
  regFix('f2_celula_diversa_entre_os_dois_lados', (() => {
    const a = celulasDoRegisto(dois[0].json), b = celulasDoRegisto(dois[1].json);
    return classeDaCelula(a['developer/relatorios'], b['developer/relatorios']) === 'CLASSE_DIVERSA';
  })(), JSON.stringify(Object.values(celulasDoRegisto(dois[1].json))[0].medida));
  regFix('f3_celula_igual_nao_e_diversa', classeDaCelula({ classe: 'X' }, { classe: 'X' }) === 'MESMA_CLASSE' && classeDaCelula({ classe: 'X' }, { classe: 'Y' }) === 'CLASSE_DIVERSA', classeDaCelula({ classe: 'X' }, { classe: 'Y' }));
  regFix('f4_celula_so_de_um_lado_tem_classe_propria', classeDaCelula({ classe: 'X' }, null) === 'SO_NUM_LADO' && classeDaCelula(null, { classe: 'X' }) === 'SO_NUM_LADO', classeDaCelula(null, { classe: 'X' }));
  regFix('f5_toque_nulo_do_papel_nao_gera_celula', Object.keys(celulasDoRegisto(registo('e', 'papéis', { director: { toque: null } }, V, { celulas: [], celulas_tocadas: 0, por_classe: {} }))).length === 0, JSON.stringify(celulasDoRegisto(registo('e', 'papéis', { director: { toque: null } }, V, { celulas: [], celulas_tocadas: 0, por_classe: {} }))));
  regFix('f6_classe_fora_do_vocabulario_declarado_e_detetada', (() => {
    const j = registo('e', 'papéis', DEV(ficha('INVENTADA', 'm', null, null, null)), V, { celulas: ['developer/relatorios=INVENTADA'], celulas_tocadas: 1, por_classe: { INVENTADA: 1 } });
    const d = divergenciasDoVocabulario(j, celulasDoRegisto(j));
    return d.length === 1 && d[0] === 'developer/relatorios=INVENTADA';
  })(), JSON.stringify(divergenciasDoVocabulario(registo('e', 'papéis', DEV(ficha('INVENTADA', 'm', null, null, null)), V, { celulas: ['developer/relatorios=INVENTADA'], celulas_tocadas: 1, por_classe: { INVENTADA: 1 } }), celulasDoRegisto(registo('e', 'papéis', DEV(ficha('INVENTADA', 'm', null, null, null)), V, { celulas: ['developer/relatorios=INVENTADA'], celulas_tocadas: 1, por_classe: { INVENTADA: 1 } })))));
  const bom = registo('e', 'papéis', DEV(ficha('SEM_MOVIMENTO', 'm', null, null, null)), V, { celulas: ['developer/relatorios=SEM_MOVIMENTO'], celulas_tocadas: 1, por_classe: { SEM_MOVIMENTO: 1 } });
  const contagem_errada = registo('e', 'papéis', DEV(ficha('SEM_MOVIMENTO', 'm', null, null, null)), V, { celulas: ['developer/relatorios=SEM_MOVIMENTO'], celulas_tocadas: 2, por_classe: { SEM_MOVIMENTO: 1 } });
  const histograma_errado = registo('e', 'papéis', DEV(ficha('SEM_MOVIMENTO', 'm', null, null, null)), V, { celulas: ['developer/relatorios=SEM_MOVIMENTO'], celulas_tocadas: 1, por_classe: { DESTINO_COM_CONTEUDO: 1 } });
  const sem_declaracao = registo('e', 'papéis', DEV(ficha('SEM_MOVIMENTO', 'm', null, null, null)), V, { celulas: ['developer/relatorios=SEM_MOVIMENTO'] });
  regFix('f7_contagem_e_histograma_declarados_tem_positivo', consistenciaDasCelulas(bom, celulasDoRegisto(bom)).bate === true, JSON.stringify(consistenciaDasCelulas(bom, celulasDoRegisto(bom))));
  regFix('f8_contagem_declarada_fora_das_fichas_da_falso', consistenciaDasCelulas(contagem_errada, celulasDoRegisto(contagem_errada)).bate === false && consistenciaDasCelulas(histograma_errado, celulasDoRegisto(histograma_errado)).bate === false, JSON.stringify(consistenciaDasCelulas(histograma_errado, celulasDoRegisto(histograma_errado))));
  regFix('f9_registo_sem_contagem_declara_bate_nulo_e_nao_falso', consistenciaDasCelulas(sem_declaracao, celulasDoRegisto(sem_declaracao)).bate === null, JSON.stringify(consistenciaDasCelulas(sem_declaracao, celulasDoRegisto(sem_declaracao))));
  let mensagem10 = 'sem aborto';
  regFix('f10_aborta_se_o_vocabulario_de_destino_nao_esta_declarado', (() => {
    try { vocabularioDeDestino({ em: 'x', resumo: { toque: {} } }); return false; } catch (e) { mensagem10 = String(e.message); return /vocabulario_de_destino/.test(mensagem10); }
  })(), mensagem10);
  let mensagem11 = 'sem aborto';
  regFix('f11_aborta_se_nenhum_registo_tem_toque', (() => {
    const soUm = [dois[0], { nome: 'b.json', ms: 2, json: { em: 'x', resumo: {} } }];
    try { ladosParaComparar(soUm); return false; } catch (e) { mensagem11 = String(e.message); return /menos de dois/.test(mensagem11); }
  })(), mensagem11);
  regFix('f12_ficha_sem_classe_de_string_nao_e_celula', Object.keys(celulasDoRegisto(registo('e', 'papéis', DEV({ classe: null, motivo: 'm' }), V, { celulas: [], celulas_tocadas: 0, por_classe: {} }))).length === 0, JSON.stringify(celulasDoRegisto(registo('e', 'papéis', DEV({ classe: null, motivo: 'm' }), V, { celulas: [], celulas_tocadas: 0, por_classe: {} }))));
  let ok = 0;
  for (const t of fx) { console.log((t.ok ? 'ok   ' : 'FAIL ') + t.nome + ' :: ' + t.detalhe); if (t.ok) ok++; }
  console.log('P190_FIXURAS ' + ok + '/' + fx.length + (ok === fx.length ? ' P190_FIXURAS_OK' : ' P190_FIXURAS_VERMELHO'));
  process.exit(ok === fx.length ? 0 : 1);
}

function ladosParaComparar(familia) {
  // A lista `celulas` serve apenas para saber que a corrida correu o modo toque; nenhuma comparação é feita
  // sobre o formato dela. O que se compara sao as fichas por papel, recontruidas pelo leitor com as chaves
  // que o emissor escreve.
  const comToque = familia.filter((x) => x.json && x.json.resumo && x.json.resumo.toque && Array.isArray(x.json.resumo.toque.celulas));
  if (comToque.length < 2) throw new Error('ABORTA: menos de dois registos da familia declaram resumo.toque com celulas — o confronto dos dois lados precisa da corrida com a regra velha e da corrida com a regra nova (ha ' + comToque.length + ')');
  return { novo: comToque[0], velho: comToque[1] };
}

const { velho, novo } = ladosParaComparar(leFamilia(FAM_SONDA));
const A = celulasDoRegisto(velho.json), B = celulasDoRegisto(novo.json);
const chaves = Object.keys(Object.assign({}, A, B)).sort();
console.log('lado A = ' + velho.nome + ' em=' + velho.json.em);
console.log('lado B = ' + novo.nome + ' em=' + novo.json.em);
for (const lado of [velho, novo]) {
  const cs = celulasDoRegisto(lado.json);
  const cons = consistenciaDasCelulas(lado.json, cs);
  const div = divergenciasDoVocabulario(lado.json, cs);
  console.log('  ' + lado.nome + ' celulas=' + Object.keys(cs).length + ' declaracoes_batem=' + JSON.stringify(cons.bate) + (cons.bate === null ? ' (' + cons.nota + ')' : '') + (cons.bate === false ? ' declarado=' + JSON.stringify(cons.contagem) + '/' + JSON.stringify(cons.histograma) : '') + ' classes_fora_do_vocabulario=' + JSON.stringify(div));
}
const hist = { MESMA_CLASSE: 0, CLASSE_DIVERSA: 0, SO_NUM_LADO: 0 };
const diversas = [];
for (const k of chaves) {
  const c = classeDaCelula(A[k], B[k]);
  hist[c]++;
  if (c === 'CLASSE_DIVERSA') diversas.push(k);
  console.log('\n' + k + '  [' + c + ']');
  console.log('   A: ' + faceDaCelula(A[k]));
  console.log('   B: ' + faceDaCelula(B[k]));
}
console.log('\nCELULAS_COMPARADAS=' + chaves.length + ' MESMA_CLASSE=' + hist.MESMA_CLASSE + ' CLASSE_DIVERSA=' + hist.CLASSE_DIVERSA + ' SO_NUM_LADO=' + hist.SO_NUM_LADO);
console.log('CLASSE_DIVERSA_listadas=' + JSON.stringify(diversas));
console.log('P190_TOQUE_DOS_DOIS_LADOS_MEDIDO');
