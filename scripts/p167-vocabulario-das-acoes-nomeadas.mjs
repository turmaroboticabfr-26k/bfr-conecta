// p167 — O VOCABULARIO DAS ACCOES NOMEADAS, medido por duas rotas e falsificado regua a regua. So leitura.
// Porque existe: as quatro familias de OK do p133 derivam o ok_exigido lexicalmente, e a classe de fallback chamava-se
// «medicao ou leitura minha» — uma afirmativa que nenhuma regua media. O p133 passou a ter um segundo vocabulario
// (ACAO_NOMEADA) que parte essa classe nas duas faces. Esta peça nao reimplementa a regua: recorta as constantes do
// ficheiro do produtor, aborta se nao as ler, re-conta o ledger com a predica de celula do produtor, confronta cada
// campo com o registo do p133 indicado e so depois falsifica as reguas novas — porque uma regua que nao pode falhar
// nao mede nada.
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
const recortes = {
  OK_EXIGIDO: cortarArray('OK_EXIGIDO'),
  ACAO_NOMEADA: cortarArray('ACAO_NOMEADA'),
  CONTROLO_NEGATIVO_DE_FAMILIA: cortarLinha('CONTROLO_NEGATIVO_DE_FAMILIA'),
  SEM_FAMILIA_DE_OK: cortarLinha('SEM_FAMILIA_DE_OK'),
  ESCAPADO: cortarLinha('ESCAPADO'),
};
const levados = Object.entries(recortes).map(([nome, txt]) => ({
  nome, bytes: Buffer.byteLength(txt), md5: createHash('md5').update(txt).digest('hex').slice(0, 8),
}));
const constLidas = vm.runInNewContext(Object.values(recortes).join('\n') + '\n({OK_EXIGIDO, ACAO_NOMEADA, CONTROLO_NEGATIVO_DE_FAMILIA, SEM_FAMILIA_DE_OK, ESCAPADO})');
for (const chave of ['OK_EXIGIDO', 'ACAO_NOMEADA']) {
  const f = constLidas[chave];
  if (!Array.isArray(f) || f.length === 0) throw new Error('ABORTA: ' + chave + ' nao e uma familia legivel no produtor');
  const regexDoContexto = (x) => Object.prototype.toString.call(x) === '[object RegExp]';
  for (const e of f) if (typeof e[0] !== 'string' || !regexDoContexto(e[1])) throw new Error('ABORTA: entrada sem nome ou sem regex em ' + chave);
}
if (typeof constLidas.SEM_FAMILIA_DE_OK !== 'string' || typeof constLidas.CONTROLO_NEGATIVO_DE_FAMILIA !== 'string') throw new Error('ABORTA: as duas strings do produtor nao sao strings');

const artefacto = JSON.parse(fs.readFileSync(REGISTO_ALVO, 'utf8'));
const registo = artefacto.vocabulario_de_acao_nomeada;
if (!registo) throw new Error('ABORTA: o registo indicado nao tem vocabulario_de_acao_nomeada — pertence a uma corrida anterior ao conserto: ' + REGISTO_ALVO);

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
const usoFamilia = (familia, textos) => {
  const uso = {};
  for (const [nome] of familia) uso[nome] = 0;
  for (const t of textos) for (const nome of nomeadas(familia, t)) uso[nome]++;
  return uso;
};
const semFamilia = celulas.filter((x) => nomeadas(constLidas.OK_EXIGIDO, x.lido).length === 0);
const comFamilia = celulas.filter((x) => nomeadas(constLidas.OK_EXIGIDO, x.lido).length > 0);
const faces = {
  com_acao_nomeada: semFamilia.filter((x) => nomeadas(constLidas.ACAO_NOMEADA, x.lido).length > 0).map((x) => x.id),
  sem_passo_nomeado: semFamilia.filter((x) => nomeadas(constLidas.ACAO_NOMEADA, x.lido).length === 0).map((x) => x.id),
};
const particao = {
  so_familia_de_ok: comFamilia.filter((x) => nomeadas(constLidas.ACAO_NOMEADA, x.lido).length === 0).map((x) => x.id),
  familia_de_ok_e_acao_nomeada: comFamilia.filter((x) => nomeadas(constLidas.ACAO_NOMEADA, x.lido).length > 0).map((x) => x.id),
  so_acao_nomeada: faces.com_acao_nomeada,
  nenhuma_das_duas: faces.sem_passo_nomeado,
};
const usoNoCorpus = usoFamilia(constLidas.ACAO_NOMEADA, celulas.map((x) => x.lido));
const usoNaClasse = usoFamilia(constLidas.ACAO_NOMEADA, semFamilia.map((x) => x.lido));
const usoNosFixtures = usoFamilia(constLidas.ACAO_NOMEADA, constLidas.ACAO_NOMEADA.filter((e) => typeof e[2] === 'string').map((e) => e[2]));
const controloNegativo = constLidas.ACAO_NOMEADA.filter(([, re]) => re.test(constLidas.CONTROLO_NEGATIVO_DE_FAMILIA)).map(([nome]) => nome);

const divergentes = [];
const compara = (campo, meu, doRegisto) => { if (JSON.stringify(meu) !== JSON.stringify(doRegisto)) divergentes.push({ campo, minha_leitura: meu, no_registo: doRegisto }); };
compara('celulas_lidas', celulas.length, registo.celulas_lidas);
compara('sem_familia_de_ok', semFamilia.length, registo.sem_familia_de_ok);
compara('definidas', constLidas.ACAO_NOMEADA.map(([n]) => n), registo.definidas);
compara('uso_no_corpus', usoNoCorpus, registo.uso_no_corpus);
compara('uso_na_classe_sem_familia_de_ok', usoNaClasse, registo.uso_na_classe_sem_familia_de_ok);
compara('faces_da_classe_sem_familia_de_ok', faces, registo.faces_da_classe_sem_familia_de_ok);
compara('particao_das_quatro_faces', particao, registo.particao_das_quatro_faces);
compara('controlo_negativo', controloNegativo, registo.controlo_negativo.familias_que_disparam);

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
const reguasNaoFalsificaveis = falsificacoes.filter((f) => !f.disparou).map((f) => f.regua);

const portoes = [];
const gate = (nome, ob, esp) => portoes.push({ nome, obtido: ob, esperado: esp, ok: JSON.stringify(ob) === JSON.stringify(esp) });
gate('os_cinco_portaveis_foram_recortados_do_ficheiro_do_produtor', levados.filter((x) => x.bytes > 12).length, 5);
gate('o_numero_de_familias_lidas_do_produtor_bate_com_o_do_registo_indicado', [constLidas.ACAO_NOMEADA.length, registo.definidas.length], [registo.definidas.length, registo.definidas.length]);
gate('a_recontagem_bate_campo_a_campo_com_o_registo_do_p133', divergentes, []);
gate('cada_familia_de_acao_nomeada_tem_uso_medido_no_corpus_e_no_fixture', familiasSemUso, []);
gate('nenhuma_familia_de_acao_nomeada_dispara_na_frase_de_controlo_negativo', controloNegativo, []);
gate('cada_regua_nova_foi_falsificada_por_um_defeito_medido', reguasNaoFalsificaveis, []);
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
  familias_por_celula: celulas.map((x) => ({ id: x.id, so_acao_nomeada: nomeadas(constLidas.ACAO_NOMEADA, x.lido), sem_familia_de_ok: nomeadas(constLidas.OK_EXIGIDO, x.lido).length === 0 })),
  uso_no_corpus: usoNoCorpus,
  uso_na_classe_sem_familia_de_ok: usoNaClasse,
  uso_nos_fixtures: usoNosFixtures,
  faces_da_classe_sem_familia_de_ok: faces,
  particao_das_quatro_faces: particao,
  controlo_negativo: { frase: constLidas.CONTROLO_NEGATIVO_DE_FAMILIA, familias_que_disparam: controloNegativo },
  confronto_com_o_registo: { registo: REGISTO_ALVO, divergentes },
  falsificacoes,
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
  o_que_prova: [
    `que as cinco constantes com que esta peça conta foram recortadas do ficheiro do produtor (bytes e md5 publicados em recortes_lidos) e nao re-dactilografadas: aborta antes de contar se uma ancora faltar`,
    `que a re-contagem do ledger bate campo a campo com o registo do p133 confrontado (${REGISTO_ALVO}, corrida de ${artefacto.em}): ${celulas.length} celulas, ${semFamilia.length} sem familia de OK, ${faces.com_acao_nomeada.length} com accao nomeada, ${faces.sem_passo_nomeado.length} sem passo nomeado`,
    `que cada uma das ${constLidas.ACAO_NOMEADA.length} familias tem uso medido no corpus e no fixture, e que nenhuma delas dispara na frase de controlo`,
    `que cada regua nova pode falhar: ${falsificacoes.length} defeitos fabricados, ${falsificacoes.filter((f) => f.disparou).length} acesos`,
  ],
  o_que_NAO_prova: [
    'que a accao nomeada numa celula seja a accao certa: esta peça le o que a prosa do ledger diz, nao o que o produto exige',
    'que uma celula sem accao nomeada nao precise de nada: pode simplesmente ter a prosa muda — e isso e um defeito de descricao, nao de regua',
    'que as duas vocabularias sejam independentes: ' + particao.familia_de_ok_e_acao_nomeada.length + ' celulas tem ambas as listas cheias, e e por isso que a face nova nao substitui a de OK',
  ],
};
saida.veredito = (falhas.length ? 'P167_VOCABULARIO_VERMELHO ' : 'P167_VOCABULARIO_MEDIDO ') + portoes.length + '/' + falhas.length + ' · esperanca=medir';
fs.writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const p of falhas) console.log('FALHA', p.nome, '| obtido', JSON.stringify(p.obtido), '| esperado', JSON.stringify(p.esperado));
console.log(saida.veredito, '· recortes', levados.map((x) => x.nome + ':' + x.bytes + 'B').join(','));
console.log('FACES', JSON.stringify(faces));
console.log('PARTICAO', JSON.stringify(Object.fromEntries(Object.entries(particao).map(([k, v]) => [k, v.length]))));
console.log('USO_NO_CORPUS', JSON.stringify(usoNoCorpus));
console.log('FALSIFICACOES', JSON.stringify(falsificacoes.map((f) => f.regua + '=' + (f.disparou ? 'acesa' : 'MORTA'))));
console.log('DIVERGENTES_CONTRA_O_REGISTO', JSON.stringify(divergentes.map((d) => d.campo)));
console.log('registo em ' + OUT);
process.exit(falhas.length ? 1 : 0);
