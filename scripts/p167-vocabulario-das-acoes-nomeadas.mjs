// p167 — O VOCABULARIO DAS ACCOES NOMEADAS, medido por tres rotas e falsificado regua a regua. So leitura.
// Porque existe: as quatro familias de OK do p133 derivam o ok_exigido lexicalmente, e a classe de fallback chamava-se
// «medicao ou leitura minha» — uma afirmativa que nenhuma regua media. O p133 passou a ter um segundo vocabulario
// (ACAO_NOMEADA) que parte essa classe nas duas faces. Esta peça nao reimplementa a regua: recorta as constantes do
// ficheiro do produtor, aborta se nao as ler, re-conta o ledger com a predica de celula do produtor, confronta cada
// campo com o registo do p133 indicado e so depois falsifica as reguas novas — porque uma regua que nao pode falhar
// nao mede nada.
// Face do ciclo 25/11 (par sm73r / sm73s do produtor): o gatilho de accao passou a ler o texto sem o conteudo das
// plicas, porque um nome de ficheiro citado nomeia um ficheiro e nao um passo. Esta peca passa a contar nas tres
// rotas que o produtor publica — varrido por regex, bruto por regex e soma das listas por celula — e confronta cada
// uma delas com as do registo indicado, para que a correccao nao seja a minha opiniao sobre a regra nova.
// Face seguinte do mesmo ciclo (a corrida sm73t mediu, a corrida sm73u traz o produtor consertado): a mesma cegueira
// foi medida no vocabulario de OK e o produtor consertou-a. As rotas de OK passam por aqui, recortadas do mesmo
// ficheiro, inclusive os fixtures e o controlo fabricado; a classe sem familia de OK do p133 passou a derivar do
// texto varrido, e e assim que esta peça a re-me.
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const REPO = fs.realpathSync('.');
const SUF = process.env.P167_SUF;
if (!SUF) throw new Error('ABORTA: P167_SUF — esta peça nao escreve registo sem nome de corrida');
const OUT = REPO + '/evidence/p167-vocabulario-das-acoes-nomeadas-24-11-' + SUF + '.json';
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' ja existe — correr com P167_SUF=novo, nunca por cima');
const REGISTO_ALVO = process.argv[2];
if (!REGISTO_ALVO) throw new Error('ABORTA: o caminho do registo do p133 vai em argv[2], nao lembrado nesta peça');
if (!fs.existsSync(REGISTO_ALVO)) throw new Error('ABORTA: o registo indicado nao existe em disco: ' + REGISTO_ALVO);

const PRODUTOR = REPO + '/scripts/p133-inventario-das-pendencias-abertas.mjs';
const fonte = fs.readFileSync(PRODUTOR, 'utf8');

const cortarArray = (nome) => {
  const inicio = fonte.indexOf('const ' + nome + ' = [');
  if (inicio < 0) throw new Error('ABORTA: nao encontrei a ancora const ' + nome + ' = [ no ficheiro do produtor');
  const fim = fonte.indexOf('\n];', inicio);
  if (fim < 0) throw new Error('ABORTA: a const ' + nome + ' nao fecha com \n]; no produtor');
  return fonte.slice(inicio, fim + 3);
};
const cortarLinha = (nome) => {
  const m = fonte.match(new RegExp('^const ' + nome + ' = .*;$', 'm'));
  if (!m) throw new Error('ABORTA: nao encontrei a linha const ' + nome + ' = ... no produtor');
  return m[0];
};
const cortarFuncao = (nome) => {
  const inicio = fonte.indexOf('function ' + nome + '(');
  if (inicio < 0) throw new Error('ABORTA: nao encontrei a ancora function ' + nome + '( no ficheiro do produtor');
  const fim = fonte.indexOf('\n}', inicio);
  if (fim < 0) throw new Error('ABORTA: a funcao ' + nome + ' nao fecha com brace no inicio da linha no produtor');
  return fonte.slice(inicio, fim + 2);
};
const recortes = {
  OK_EXIGIDO: cortarArray('OK_EXIGIDO'),
  ACAO_NOMEADA: cortarArray('ACAO_NOMEADA'),
  CONTROLO_NEGATIVO_DE_FAMILIA: cortarLinha('CONTROLO_NEGATIVO_DE_FAMILIA'),
  SEM_FAMILIA_DE_OK: cortarLinha('SEM_FAMILIA_DE_OK'),
  ESCAPADO: cortarLinha('ESCAPADO'),
  CRASE: cortarLinha('CRASE'),
  FORA_DE_PLICAS: cortarFuncao('foraDePlicas'),
  OK_EXIGIDO_FUNCAO: cortarFuncao('okExigido'),
  OK_FORA_DE_PLICAS: cortarFuncao('okExigidoForaDasPlicas'),
  FIXTURES_DE_PLICA_DO_OK: cortarArray('FIXTURES_DE_PLICA_DO_OK'),
  CELULA_FABRICADA_DO_OK: cortarLinha('CELULA_FABRICADA_DO_OK'),
};
const levados = Object.entries(recortes).map(([nome, txt]) => ({
  nome, bytes: Buffer.byteLength(txt), md5: createHash('md5').update(txt).digest('hex').slice(0, 8),
}));
const constLidas = vm.runInNewContext(Object.values(recortes).join('\n') + '\n({OK_EXIGIDO, ACAO_NOMEADA, CONTROLO_NEGATIVO_DE_FAMILIA, SEM_FAMILIA_DE_OK, ESCAPADO, CRASE, foraDePlicas, okExigido, okExigidoForaDasPlicas, FIXTURES_DE_PLICA_DO_OK, CELULA_FABRICADA_DO_OK})');
for (const chave of ['OK_EXIGIDO', 'ACAO_NOMEADA']) {
  const f = constLidas[chave];
  if (!Array.isArray(f) || f.length === 0) throw new Error('ABORTA: ' + chave + ' nao e uma familia legivel no produtor');
  const regexDoContexto = (x) => Object.prototype.toString.call(x) === '[object RegExp]';
  for (const e of f) if (typeof e[0] !== 'string' || !regexDoContexto(e[1])) throw new Error('ABORTA: entrada sem nome ou sem regex em ' + chave);
}
if (typeof constLidas.SEM_FAMILIA_DE_OK !== 'string' || typeof constLidas.CONTROLO_NEGATIVO_DE_FAMILIA !== 'string') throw new Error('ABORTA: as duas strings do produtor nao sao strings');
if (constLidas.CRASE !== String.fromCharCode(96)) throw new Error('ABORTA: a plica recortada do produtor nao e o codepoint que esta peça espera — a regua da plica nao pode ser reimplementada aqui');
if (typeof constLidas.foraDePlicas !== 'function') throw new Error('ABORTA: o foraDePlicas do produtor nao chegou como funcao');
// O teste de identidade do recorte faz-se com o codepoint composto, nunca digitado: uma plica escrita a mao neste
// fonte passaria a contar no meu proprio texto e o portao do par de plicas deixaria de poder falhar aqui.
const PROVA_DE_PLICA = 'a ' + String.fromCharCode(96) + 'b' + String.fromCharCode(96) + 'c';
const provaVarrida = constLidas.foraDePlicas(PROVA_DE_PLICA).texto;
if (provaVarrida.length !== PROVA_DE_PLICA.length) throw new Error('ABORTA: o foraDePlicas recortado nao preserva o comprimento, e sem comprimento nao ha posicao: ' + provaVarrida.length + ' vs ' + PROVA_DE_PLICA.length);
if (provaVarrida.indexOf('b') !== -1) throw new Error('ABORTA: o foraDePlicas recortado nao apagou o conteudo da plica, pelo que a conta nova seria a conta velha');
if (typeof constLidas.okExigido !== 'function' || typeof constLidas.okExigidoForaDasPlicas !== 'function') throw new Error('ABORTA: as duas regras de OK do produtor nao chegaram como funcoes — sem elas a peneira do OK seria a minha memoria, nao um recorte');
if (!Array.isArray(constLidas.FIXTURES_DE_PLICA_DO_OK) || constLidas.FIXTURES_DE_PLICA_DO_OK.length === 0) throw new Error('ABORTA: os fixtures da plica do OK nao se leram no produtor');
// A peneira tambem tem de chegar ao OK por esta mao: na celula fabricada do produtor a unica palavra de DDL vive
// entre plicas, pelo que as duas regras dao ai listas diferentes por construcao. Se concordarem, o recorte trouxe
// uma regra inerte e a conta nova seria a conta velha sem o parecer.
if (constLidas.okExigido(constLidas.CELULA_FABRICADA_DO_OK).map((h) => h.exigido).join(',') === constLidas.okExigidoForaDasPlicas(constLidas.CELULA_FABRICADA_DO_OK).map((h) => h.exigido).join(',')) throw new Error('ABORTA: o okExigidoForaDasPlicas recortado nao distingue a celula fabricada — a peneira nao chega ao vocabulario de OK');

const artefacto = JSON.parse(fs.readFileSync(REGISTO_ALVO, 'utf8'));
const registo = artefacto.vocabulario_de_acao_nomeada;
if (!registo) throw new Error('ABORTA: o registo indicado nao tem vocabulario_de_acao_nomeada — pertence a uma corrida anterior ao conserto: ' + REGISTO_ALVO);
if (!registo.plicas || !registo.uso_no_corpus_no_bruto_regra_velha || !registo.uso_no_corpus_contado_por_celula) {
  throw new Error('ABORTA: o registo indicado nao tem o bloco da plica nem as duas rotas de histograma — confronte uma corrida do produtor ja consertado, nao uma velha cuja ausencia eu contaria como divergencia minha: ' + REGISTO_ALVO);
}

const registoOk = artefacto.vocabulario_de_ok_pelas_duas_rotas;
if (!registoOk) throw new Error('ABORTA: o registo indicado nao tem o bloco do OK pelas duas rotas — confronte uma corrida do produtor em que a peneira tambem chegue ao vocabulario de OK, e nao uma anterior em que a ausencia contaria como divergencia minha: ' + REGISTO_ALVO);

const celulas = [];
for (const r of fs.readFileSync(REPO + '/' + artefacto.fontes.ledger, 'utf8').split('\n')) {
  if (!/^\| PEN-\d+ \|/.test(r)) continue;
  const c = r.split(constLidas.ESCAPADO).join('@@').split('|');
  if (c.length !== 7) continue;
  celulas.push({ id: c[1].trim(), lido: c[2].trim() + ' ' + c[5].trim().replace(/\s+/g, ' ') });
}

const conta = (re, texto) => {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let n = 0;
  let m;
  while ((m = g.exec(texto)) !== null) { n++; if (m.index === g.lastIndex) g.lastIndex++; }
  return n;
};
const nomeadas = (familia, texto) => familia.filter(([, re]) => conta(re, texto) > 0).map(([nome]) => nome);
const somas = (familia, texto) => {
  const s = {};
  for (const [nome, re] of familia) s[nome] = conta(re, texto);
  return s;
};
const usoFamilia = (familia, textos) => {
  const uso = {};
  for (const [nome] of familia) uso[nome] = 0;
  for (const t of textos) for (const nome of nomeadas(familia, t)) uso[nome]++;
  return uso;
};
const usoDasListas = (lista) => {
  const uso = {};
  for (const [nome] of constLidas.ACAO_NOMEADA) uso[nome] = 0;
  for (const m of lista) for (const nome of m.novas) uso[nome]++;
  return uso;
};
// A mesma regra do produtor, mas reconstruida por outra rota: cada celula guarda o bruto, o varrido e as duas
// contagens (presenca por celula e ocorrencias). O que confronta com o registo sao as quatro rotas, nao a minha
// leitura de qual delas esta certa.
const medidas = celulas.map((x) => {
  const v = constLidas.foraDePlicas(x.lido);
  return {
    id: x.id, lido: x.lido, varrido: v.texto, semPar: v.semPar,
    novas: nomeadas(constLidas.ACAO_NOMEADA, v.texto),
    brutas: nomeadas(constLidas.ACAO_NOMEADA, x.lido),
    somasNovas: somas(constLidas.ACAO_NOMEADA, v.texto),
    somasBrutas: somas(constLidas.ACAO_NOMEADA, x.lido),
    okNovas: nomeadas(constLidas.OK_EXIGIDO, v.texto),
    okBrutas: nomeadas(constLidas.OK_EXIGIDO, x.lido),
  };
});
const textoDe = (m) => m.varrido;
const brutoDe = (m) => m.lido;
// A classe sem familia de OK passou, no produtor consertado, a derivar do texto varrido (a corrida sm73u). Aqui e a
// mesma derivacao, por outra mao: se alguem voltar a chave-la no bruto, as comparacoes de faces, particao e histograma
// da classe rebentam contra o registo.
const semFamiliaMedidas = medidas.filter((m) => m.okNovas.length === 0);
const comFamiliaMedidas = medidas.filter((m) => m.okNovas.length > 0);
const semFamilia = semFamiliaMedidas.map((m) => ({ id: m.id, lido: m.lido }));
const faces = {
  com_acao_nomeada: semFamiliaMedidas.filter((m) => m.novas.length > 0).map((m) => m.id),
  sem_passo_nomeado: semFamiliaMedidas.filter((m) => m.novas.length === 0).map((m) => m.id),
};
const particao = {
  so_familia_de_ok: comFamiliaMedidas.filter((m) => m.novas.length === 0).map((m) => m.id),
  familia_de_ok_e_acao_nomeada: comFamiliaMedidas.filter((m) => m.novas.length > 0).map((m) => m.id),
  so_acao_nomeada: faces.com_acao_nomeada,
  nenhuma_das_duas: faces.sem_passo_nomeado,
};
const usoNoCorpus = usoFamilia(constLidas.ACAO_NOMEADA, medidas.map(textoDe));
const usoNaClasse = usoFamilia(constLidas.ACAO_NOMEADA, semFamiliaMedidas.map(textoDe));
const usoNosFixtures = usoFamilia(constLidas.ACAO_NOMEADA, constLidas.ACAO_NOMEADA.filter((e) => typeof e[2] === 'string').map((e) => e[2]));
const usoNoCorpusNoBruto = usoFamilia(constLidas.ACAO_NOMEADA, medidas.map(brutoDe));
const usoNaClasseNoBruto = usoFamilia(constLidas.ACAO_NOMEADA, semFamiliaMedidas.map(brutoDe));
const usoNoCorpusDasCelulas = usoDasListas(medidas);
const usoNaClasseDasCelulas = usoDasListas(semFamiliaMedidas);
const diferencasPorFamilia = constLidas.ACAO_NOMEADA.map(([nome]) => {
  let novas = 0;
  let brutas = 0;
  for (const m of medidas) { novas += m.somasNovas[nome]; brutas += m.somasBrutas[nome]; }
  return { nome, na_regra_nova: novas, na_regra_velha: brutas, so_dentro_de_plicas: brutas - novas };
});
const soma = (lista, campo) => lista.reduce((a, d) => a + d[campo], 0);
const linhasQueMudaramDeFace = medidas.filter((m) => m.novas.length === 0 && m.brutas.length > 0).map((m) => m.id);
const plicasSemParNaCelula = medidas.filter((m) => m.semPar === 1).map((m) => m.id);
const facesDaRegraVelha = {
  com_acao_nomeada: semFamiliaMedidas.filter((m) => m.brutas.length > 0).map((m) => m.id),
  sem_passo_nomeado: semFamiliaMedidas.filter((m) => m.brutas.length === 0).map((m) => m.id),
};
// A face do OK, agora com a peneira tambem no produtor: as mesmas rotas de contagem das accoes, aplicadas ao
// vocabulario de OK, e os fixtures e o controlo do produtor re-corridos com o que eu recortei dele.
const okMudariamDeFace = medidas.filter((m) => m.okNovas.length !== m.okBrutas.length).map((m) => ({ id: m.id, no_bruto: m.okBrutas, no_varrido: m.okNovas }));
const usoOkDasListas = (lista, campo) => {
  const uso = {};
  for (const [nome] of constLidas.OK_EXIGIDO) uso[nome] = 0;
  for (const m of lista) for (const nome of m[campo]) if (uso[nome] !== undefined) uso[nome]++;
  return uso;
};
const usoOkNoVarrido = usoOkDasListas(medidas, 'okNovas');
const usoOkNoBruto = usoOkDasListas(medidas, 'okBrutas');
const usoOkPorRegex = usoFamilia(constLidas.OK_EXIGIDO, medidas.map(textoDe));
const divergenciasOk = constLidas.OK_EXIGIDO
  .map(([n]) => ({ familia: n, no_histograma_por_regex: usoOkPorRegex[n], nas_listas_por_celula: usoOkNoVarrido[n], no_bruto: usoOkNoBruto[n] }))
  .filter((x) => x.no_histograma_por_regex !== x.nas_listas_por_celula);
const entraramNaClasseSemFamiliaDeOk = medidas
  .filter((m) => m.okNovas.length === 0 && m.okBrutas.length > 0)
  .map((m) => ({ id: m.id, familias_no_bruto: m.okBrutas }));
const fixturesDoOkQueFalhamNaMinhaMao = [];
for (const f of constLidas.FIXTURES_DE_PLICA_DO_OK) {
  const novas = constLidas.okExigidoForaDasPlicas(f.texto).map((h) => h.exigido);
  const brutas = constLidas.okExigido(f.texto).map((h) => h.exigido);
  for (const [nome, espera] of Object.entries(f.espera)) {
    const n = novas.filter((x) => x === nome).length;
    const b = brutas.filter((x) => x === nome).length;
    if (n !== espera.novas || b !== espera.brutas) fixturesDoOkQueFalhamNaMinhaMao.push({ id: f.id, nome, esperado: espera, obtido: { novas: n, brutas: b } });
  }
}
const controloOkNaMinhaMao = (() => {
  const bruto = usoFamilia(constLidas.OK_EXIGIDO, [constLidas.CELULA_FABRICADA_DO_OK]);
  const porCelula = usoOkDasListas([{ okNovas: constLidas.okExigidoForaDasPlicas(constLidas.CELULA_FABRICADA_DO_OK).map((h) => h.exigido) }], 'okNovas');
  return { no_histograma_bruto: bruto, nas_listas_varridas: porCelula, divergem: JSON.stringify(bruto) !== JSON.stringify(porCelula) };
})();
const controloNegativo = constLidas.ACAO_NOMEADA.filter(([, re]) => re.test(constLidas.CONTROLO_NEGATIVO_DE_FAMILIA)).map(([nome]) => nome);

const divergentes = [];
const camposConfrontados = [];
const compara = (campo, meu, doRegisto) => { camposConfrontados.push(campo); if (JSON.stringify(meu) !== JSON.stringify(doRegisto)) divergentes.push({ campo, minha_leitura: meu, no_registo: doRegisto }); };
compara('celulas_lidas', celulas.length, registo.celulas_lidas);
compara('sem_familia_de_ok', semFamilia.length, registo.sem_familia_de_ok);
compara('definidas', constLidas.ACAO_NOMEADA.map(([n]) => n), registo.definidas);
compara('uso_no_corpus', usoNoCorpus, registo.uso_no_corpus);
compara('uso_na_classe_sem_familia_de_ok', usoNaClasse, registo.uso_na_classe_sem_familia_de_ok);
compara('faces_da_classe_sem_familia_de_ok', faces, registo.faces_da_classe_sem_familia_de_ok);
compara('particao_das_quatro_faces', particao, registo.particao_das_quatro_faces);
compara('controlo_negativo', controloNegativo, registo.controlo_negativo.familias_que_disparam);
compara('uso_no_corpus_no_bruto_regra_velha', usoNoCorpusNoBruto, registo.uso_no_corpus_no_bruto_regra_velha);
compara('uso_na_classe_no_bruto_regra_velha', usoNaClasseNoBruto, registo.uso_na_classe_no_bruto_regra_velha);
compara('uso_no_corpus_contado_por_celula', usoNoCorpusDasCelulas, registo.uso_no_corpus_contado_por_celula);
compara('uso_na_classe_contado_por_celula', usoNaClasseDasCelulas, registo.uso_na_classe_contado_por_celula);
compara('plicas_diferencas_por_familia', diferencasPorFamilia, registo.plicas.diferencas_por_familia);
compara('plicas_linhas_que_mudaram_de_face', linhasQueMudaramDeFace, registo.plicas.linhas_que_mudaram_de_face);
compara('plicas_sem_par_na_celula', plicasSemParNaCelula, registo.plicas.plicas_sem_par_na_celula);
compara('plicas_faces_da_regra_velha', facesDaRegraVelha, registo.plicas.faces_da_regra_velha);
compara('ok_uso_no_varrido_contado_por_celula', usoOkNoVarrido, registoOk.uso_no_varrido_contado_por_celula);
compara('ok_uso_no_bruto_contado_por_celula', usoOkNoBruto, registoOk.uso_no_bruto_contado_por_celula);
compara('ok_uso_no_varrido_por_regex', usoOkPorRegex, registoOk.uso_no_varrido_por_regex);
compara('ok_divergencias_entre_as_rotas', divergenciasOk, registoOk.divergencias_entre_as_rotas);
compara('ok_linhas_que_mudaram_de_lista', okMudariamDeFace, registoOk.linhas_que_mudaram_de_lista);
compara('ok_linhas_que_entraram_na_classe', entraramNaClasseSemFamiliaDeOk, registoOk.linhas_que_entraram_na_classe_sem_familia_de_ok);
compara('ok_fixtures_recorridos_na_minha_mao', fixturesDoOkQueFalhamNaMinhaMao, registoOk.fixtures_que_falham);
compara('ok_controlo_das_duas_rotas', controloOkNaMinhaMao, registoOk.controlo_das_duas_rotas);

const familiasSemUso = constLidas.ACAO_NOMEADA.map(([n]) => n).filter((n) => usoNoCorpus[n] === 0 || usoNosFixtures[n] === 0);

const falsificacoes = [];
{
  const partida = constLidas.ACAO_NOMEADA.map((e) => e.slice());
  partida[0][1] = /zzz_impossivel_zzz/;
  const falham = partida.filter(([, re, fix]) => typeof fix === 'string' && !re.test(fix)).map(([n]) => n);
  falsificacoes.push({ regua: 'cada_familia_dispara_no_fixture_que_lhe_foi_posto', disparou: falham.length > 0, detalhe: falham });
}
{
  const frase = constLidas.CONTROLO_NEGATIVO_DE_FAMILIA + ' e pede candidata nova';
  const disparam = constLidas.ACAO_NOMEADA.filter(([, re]) => re.test(frase)).map(([n]) => n);
  falsificacoes.push({ regua: 'nenhuma_familia_dispara_no_controlo_negativo', disparou: disparam.length > 0, detalhe: disparam });
}
{
  const segundaFaceComSobreposicao = new Set([...faces.sem_passo_nomeado, ...faces.com_acao_nomeada]);
  const soma = faces.com_acao_nomeada.length + segundaFaceComSobreposicao.size;
  falsificacoes.push({ regua: 'a_classe_e_a_soma_das_suas_duas_faces', disparou: soma !== semFamilia.length, detalhe: [soma, semFamilia.length] });
}
{
  const familiaMorta = constLidas.ACAO_NOMEADA.map((e) => e.slice()).concat([['familia_fabricada_sem_uso', /zzz_nem_no_corpus_nem_no_fixture_zzz/, 'nada do genero']]);
  const semUso = familiaMorta.map(([n]) => n).filter((n) => usoFamilia(familiaMorta, celulas.map((x) => x.lido))[n] === 0 || usoFamilia(familiaMorta, familiaMorta.filter((e) => typeof e[2] === 'string').map((e) => e[2]))[n] === 0);
  falsificacoes.push({ regua: 'cada_familia_tem_uso_medido_no_corpus_e_no_fixture', disparou: semUso.includes('familia_fabricada_sem_uso'), detalhe: semUso });
}
{
  const duasFacesDeUmCorpusFabricado = [{ id: 'X', lido: 'isto precisa de candidata nova' }, { id: 'Y', lido: constLidas.CONTROLO_NEGATIVO_DE_FAMILIA }];
  const semF = duasFacesDeUmCorpusFabricado.filter((x) => nomeadas(constLidas.OK_EXIGIDO, x.lido).length === 0);
  const facesF = {
    com_acao_nomeada: semF.filter((x) => nomeadas(constLidas.ACAO_NOMEADA, x.lido).length > 0).map((x) => x.id),
    sem_passo_nomeado: semF.filter((x) => nomeadas(constLidas.ACAO_NOMEADA, x.lido).length === 0).map((x) => x.id),
  };
  falsificacoes.push({ regua: 'as_duas_faces_imprimem_se_mesmo_quando_a_classe_so_tem_uma', disparou: Object.keys(facesF).length === 2 && facesF.com_acao_nomeada.length === 1 && facesF.sem_passo_nomeado.length === 1, detalhe: facesF });
}
{
  // Cada reegua nova da plica com o seu defeito fabricado, pela mesma convengao das de cima: disparou=true so
  // quando o defeito simulado produz diferenca medida. Uma peneira inerte, uma peneira que apaga tudo e um ramo de
  // plica sem par que nunca se declara sao os tres modos de esta conta voltar a ser a conta velha sem o parecer.
  const PL = String.fromCharCode(96);
  const celulaSoDentroDaPlica = 'o passo mora em ' + PL + 'sql/p143-candidata.sql' + PL;
  const comPeneira = nomeadas(constLidas.ACAO_NOMEADA, constLidas.foraDePlicas(celulaSoDentroDaPlica).texto).length;
  const semPeneira = nomeadas(constLidas.ACAO_NOMEADA, celulaSoDentroDaPlica).length;
  falsificacoes.push({ regua: 'a_peneira_da_plica_muda_de_facto_a_contagem', disparou: comPeneira !== semPeneira, detalhe: { com_peneira: comPeneira, sem_peneira: semPeneira } });
  const celulaForaDaPlica = 'o proximo passo e escrever a linha no produto';
  const apagariaTudo = ''.padEnd(celulaForaDaPlica.length, ' ');
  falsificacoes.push({ regua: 'a_peneira_nao_apaga_o_que_nao_esta_entre_plicas',
    disparou: nomeadas(constLidas.ACAO_NOMEADA, apagariaTudo).length === 0 && nomeadas(constLidas.ACAO_NOMEADA, celulaForaDaPlica).length > 0,
    detalhe: { no_texto_real: nomeadas(constLidas.ACAO_NOMEADA, celulaForaDaPlica), no_texto_apagado: nomeadas(constLidas.ACAO_NOMEADA, apagariaTudo) } });
  const parPartido = 'abre ' + PL + 'sql/candidata_x e nao fecha';
  falsificacoes.push({ regua: 'o_ramo_da_plica_sem_par_tem_positivo',
    disparou: constLidas.foraDePlicas(parPartido).semPar === 1 && celulaSoDentroDaPlica.length > 0 && constLidas.foraDePlicas(celulaSoDentroDaPlica).semPar === 0,
    detalhe: { sem_par: constLidas.foraDePlicas(parPartido).semPar, com_par: constLidas.foraDePlicas(celulaSoDentroDaPlica).semPar } });
  const medidasFabricadas = [{ id: 'X', novas: nomeadas(constLidas.ACAO_NOMEADA, constLidas.foraDePlicas(celulaSoDentroDaPlica).texto) }];
  const rotaDoHistogramaNoBruto = usoFamilia(constLidas.ACAO_NOMEADA, [celulaSoDentroDaPlica]);
  const rotaDasListasNoVarrido = usoDasListas(medidasFabricadas);
  falsificacoes.push({ regua: 'as_duas_rotas_de_contagem_podem_divergir',
    disparou: JSON.stringify(rotaDoHistogramaNoBruto) !== JSON.stringify(rotaDasListasNoVarrido),
    detalhe: { histograma_no_bruto: rotaDoHistogramaNoBruto, listas_no_varrido: rotaDasListasNoVarrido } });
}
{
  // As duas reeguas novas do OK, com o convenio das de cima: disparou=true so quando o defeito fabricado produz
  // diferenca medida. Uma peneira inerte no OK, e um controlo em que as duas rotas concordam, sao os dois modos de a
  // correccao medida na PEN-24 voltar a nao contar nada sem que alguem de por isso.
  const comPeneira = constLidas.okExigidoForaDasPlicas(constLidas.CELULA_FABRICADA_DO_OK).map((h) => h.exigido);
  const semPeneira = constLidas.okExigido(constLidas.CELULA_FABRICADA_DO_OK).map((h) => h.exigido);
  falsificacoes.push({ regua: 'a_peneira_da_plica_muda_de_facto_a_contagem_de_ok', disparou: comPeneira.join(',') !== semPeneira.join(','), detalhe: { com_peneira: comPeneira, sem_peneira: semPeneira } });
  const histogramaNoBrutoDoOk = usoFamilia(constLidas.OK_EXIGIDO, [constLidas.CELULA_FABRICADA_DO_OK]);
  const listasNoVarridoDoOk = usoOkDasListas([{ okNovas: comPeneira }], 'okNovas');
  falsificacoes.push({ regua: 'as_duas_rotas_de_contagem_do_ok_podem_divergir', disparou: JSON.stringify(histogramaNoBrutoDoOk) !== JSON.stringify(listasNoVarridoDoOk), detalhe: { histograma_no_bruto: histogramaNoBrutoDoOk, listas_no_varrido: listasNoVarridoDoOk } });
}
const reguasNaoFalsificaveis = falsificacoes.filter((f) => !f.disparou).map((f) => f.regua);const portoes = [];
const gate = (nome, ob, esp) => portoes.push({ nome, obtido: ob, esperado: esp, ok: JSON.stringify(ob) === JSON.stringify(esp) });
gate('todos_os_portaveis_declarados_foram_recortados_do_ficheiro_do_produtor', levados.filter((x) => x.bytes > 12).length, Object.keys(recortes).length);
gate('o_numero_de_familias_lidas_do_produtor_bate_com_o_do_registo_indicado', [constLidas.ACAO_NOMEADA.length, registo.definidas.length], [registo.definidas.length, registo.definidas.length]);
gate('a_recontagem_bate_campo_a_campo_com_o_registo_do_p133', divergentes, []);
gate('cada_familia_de_acao_nomeada_tem_uso_medido_no_corpus_e_no_fixture', familiasSemUso, []);
gate('nenhuma_familia_de_acao_nomeada_dispara_na_frase_de_controlo_negativo', controloNegativo, []);
gate('cada_regua_nova_foi_falsificada_por_um_defeito_medido', reguasNaoFalsificaveis, []);
gate('o_registo_confrontado_nao_tem_fixture_da_plica_a_falhar',
  [registo.plicas.fixtures_que_falham.length, registo.plicas.comprimento_que_falha.length, registoOk.fixtures_que_falham.length, registoOk.comprimento_que_falha.length], [0, 0, 0, 0]);
gate('os_fixtures_do_ok_recorridos_na_minha_mao_nao_falham', fixturesDoOkQueFalhamNaMinhaMao, []);
const falhas = portoes.filter((p) => !p.ok);

const eu = fs.readFileSync(REPO + '/scripts/p167-vocabulario-das-acoes-nomeadas.mjs', 'utf8');
const saida = {
  peca: 'p167-vocabulario-das-acoes-nomeadas.mjs',
  em: new Date().toISOString(),
  pergunta: 'o que e que a classe sem familia de OK nomeia na sua propria prosa, e as suas reguas novas podem falhar?',
  modo: 'somente leitura: o ledger, o registo do p133 e o ficheiro do produtor; nenhuma chamada de rede',
  fontes: { produtor_constantes: 'scripts/p133-inventario-das-pendencias-abertas.mjs', ledger: artefacto.fontes.ledger, registo_confrontado: REGISTO_ALVO, registo_em: artefacto.em, registo_veredito: artefacto.veredito },
  emissor_bytes: Buffer.byteLength(eu),
  emissor_md5: createHash('md5').update(eu).digest('hex').slice(0, 8),
  produtor_bytes: Buffer.byteLength(fonte),
  produtor_md5: createHash('md5').update(fonte).digest('hex').slice(0, 8),
  recortes_lidos: levados,
  celulas_lidas: celulas.length,
  definidas: constLidas.ACAO_NOMEADA.map(([n]) => n),
  familias_por_celula: medidas.map((m) => ({ id: m.id, no_varrido: m.novas, no_bruto: m.brutas, ok_no_bruto: m.okBrutas, ok_no_varrido: m.okNovas, sem_familia_de_ok: m.okNovas.length === 0 })),
  uso_no_corpus: usoNoCorpus,
  uso_na_classe_sem_familia_de_ok: usoNaClasse,
  uso_nos_fixtures: usoNosFixtures,
  uso_no_corpus_no_bruto_regra_velha: usoNoCorpusNoBruto,
  uso_na_classe_no_bruto_regra_velha: usoNaClasseNoBruto,
  uso_no_corpus_contado_por_celula: usoNoCorpusDasCelulas,
  uso_na_classe_contado_por_celula: usoNaClasseDasCelulas,
  plicas: {
    diferencas_por_familia: diferencasPorFamilia,
    linhas_que_mudaram_de_face: linhasQueMudaramDeFace,
    plicas_sem_par_na_celula: plicasSemParNaCelula,
    faces_da_regra_velha: facesDaRegraVelha,
  },
  vocabulario_de_ok_no_bruto_vs_no_varrido: okMudariamDeFace,
  vocabulario_de_ok_pelas_duas_rotas: {
    uso_no_varrido_contado_por_celula: usoOkNoVarrido,
    uso_no_bruto_contado_por_celula: usoOkNoBruto,
    uso_no_varrido_por_regex: usoOkPorRegex,
    linhas_que_entraram_na_classe: entraramNaClasseSemFamiliaDeOk,
    fixtures_recorridos_que_falham: fixturesDoOkQueFalhamNaMinhaMao,
    controlo: controloOkNaMinhaMao,
  },
  faces_da_classe_sem_familia_de_ok: faces,
  particao_das_quatro_faces: particao,
  controlo_negativo: { frase: constLidas.CONTROLO_NEGATIVO_DE_FAMILIA, familias_que_disparam: controloNegativo },
  confronto_com_o_registo: { registo: REGISTO_ALVO, divergentes },
  falsificacoes,
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
  o_que_prova: [
    `que as ${levados.length} constantes com que esta peça conta foram recortadas do ficheiro do produtor (bytes e md5 publicados em recortes_lidos) e nao re-dactilografadas: aborta antes de contar se uma ancora faltar, e aborta tambem se a plica recortada nao for o codepoint esperado ou se o varredor nao preservar o comprimento`,
    `que a re-contagem do ledger bate campo a campo com o registo do p133 confrontado (${REGISTO_ALVO}, corrida de ${artefacto.em}): ${celulas.length} celulas, ${semFamilia.length} sem familia de OK, ${faces.com_acao_nomeada.length} com accao nomeada, ${faces.sem_passo_nomeado.length} sem passo nomeado`,
    `que as ${camposConfrontados.length} confrontacoes de contagem batem campo a campo (as minhas sobre o varrido, sobre o bruto e por lista de celula contra as do registo do produtor), com as divergencias impressas em confronto_com_o_registo: ${camposConfrontados.join(', ')}`,
    `que a contagem por familia tem as duas formas publicadas lado a lado: ${soma(diferencasPorFamilia, 'na_regra_velha')} ocorrencias no bruto contra ${soma(diferencasPorFamilia, 'na_regra_nova')} no varrido, e ${linhasQueMudaramDeFace.length} celulas mudaram de face por a unica palavra de passo viver dentro de um caminho citado`,
    `que cada uma das ${constLidas.ACAO_NOMEADA.length} familias tem uso medido no corpus e no fixture, e que nenhuma delas dispara na frase de controlo`,
    `que cada regua nova pode falhar: ${falsificacoes.length} defeitos fabricados, ${falsificacoes.filter((f) => f.disparou).length} acesos`,
    `que a peneira da plica tambem chega ao vocabulario de OK, medida por esta mao: ${okMudariamDeFace.length} de ${celulas.length} celulas mudam de lista de familias com o texto varrido (sao elas ${okMudariamDeFace.map((x) => x.id).join(', ') || 'nenhuma'}), ${entraramNaClasseSemFamiliaDeOk.length} entram na classe «nenhuma familia lida», e os ${constLidas.FIXTURES_DE_PLICA_DO_OK.length} fixtures do produtor re-corridos por mim dao ${fixturesDoOkQueFalhamNaMinhaMao.length} falhas — as rotas do OK estao confrontadas campo a campo com o registo`,
  ],
  o_que_NAO_prova: [
    'que a accao nomeada numa celula seja a accao certa: esta peça le o que a prosa do ledger diz, nao o que o produto exige',
    'que uma celula sem accao nomeada nao precise de nada: pode simplesmente ter a prosa muda — e isso e um defeito de descricao, nao de regua',
    'que as duas vocabularias sejam independentes: ' + particao.familia_de_ok_e_acao_nomeada.length + ' celulas tem ambas as listas cheias, e e por isso que a face nova nao substitui a de OK',
    `que uma celula que perdeu uma familia de OK com a peneira deixe de precisar dela: esta peça so retira do vocabulario a palavra que vivia dentro de um valor medido entre plicas, e nao julga o que a linha exige do dono — as familias que mudam estao listadas em vocabulario_de_ok_no_bruto_vs_no_varrido, celulas a celula, com as duas listas ao lado`,
  ],
};
saida.veredito = (falhas.length ? 'P167_VOCABULARIO_VERMELHO ' : 'P167_VOCABULARIO_MEDIDO ') + portoes.length + '/' + falhas.length + ' · esperanca=medir';
fs.writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const p of falhas) console.log('FALHA', p.nome, '| obtido', JSON.stringify(p.obtido), '| esperado', JSON.stringify(p.esperado));
console.log(saida.veredito, '· recortes', levados.map((x) => x.nome + ':' + x.bytes + 'B').join(','));
console.log('FACES', JSON.stringify(faces));
console.log('PARTICAO', JSON.stringify(Object.fromEntries(Object.entries(particao).map(([k, v]) => [k, v.length]))));
console.log('USO_NO_CORPUS', JSON.stringify(usoNoCorpus));
console.log('ROTAS_NO_CORPUS', JSON.stringify(Object.fromEntries(constLidas.ACAO_NOMEADA.map(([n]) => [n, usoNoCorpus[n] + ' varrido / ' + usoNoCorpusNoBruto[n] + ' bruto / ' + usoNoCorpusDasCelulas[n] + ' por celula']))));
console.log('PLICA', JSON.stringify({
  diferencas: Object.fromEntries(diferencasPorFamilia.map((d) => [d.nome, d.na_regra_velha + '->' + d.na_regra_nova])),
  mudaram_de_face: linhasQueMudaramDeFace,
  plicas_sem_par: plicasSemParNaCelula,
  faces_da_regra_velha: Object.fromEntries(Object.entries(facesDaRegraVelha).map(([k, v]) => [k, v.length])),
  confrontado: REGISTO_ALVO,
}));
console.log('OK_PELICULA', JSON.stringify({
  mudaram_de_lista: okMudariamDeFace.map((x) => x.id),
  entraram_na_classe: entraramNaClasseSemFamiliaDeOk.map((x) => x.id),
  por_familia: Object.fromEntries(constLidas.OK_EXIGIDO.map(([n]) => [n, usoOkNoBruto[n] + '->' + usoOkNoVarrido[n]])),
  fixtures_recorridos_que_falham: fixturesDoOkQueFalhamNaMinhaMao.length,
  controlo_diverge: controloOkNaMinhaMao.divergem,
  celulas_lidas: celulas.length,
}));
console.log('FALSIFICACOES', JSON.stringify(falsificacoes.map((f) => f.regua + '=' + (f.disparou ? 'acesa' : 'MORTA'))));
console.log('DIVERGENTES_CONTRA_O_REGISTO', JSON.stringify(divergentes.map((d) => d.campo)));
console.log('registo em ' + OUT);
process.exit(falhas.length ? 1 : 0);
