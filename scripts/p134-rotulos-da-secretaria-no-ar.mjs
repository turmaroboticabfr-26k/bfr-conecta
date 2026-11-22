// PEN-36 metade (b): censo dos NOMES da superficie da Secretaria no ar publicado de hoje.
// Por que existe: a celula de 19/11 declarava a unificacao dos nomes como fechada. Isso e uma
// alegacao sobre bytes servidos, por isso mede-se nos bytes e nao no texto. A lista de nomes e
// lida do artefacto de 17/11 (nunca dactilografada), a identidade do ar e lida do registo de
// pos-deploy da v142, e a predica de contagem e a mesma do produtor `ah1-rotulos-secretaria.mjs`
// (`t.split(nome).length - 1`), para que as duas corridas sejam comparaveis campo a campo.
// So leitura: 0 escrita no banco, 0 DDL, 0 publicacao, 0 mint, 0 rotacao, 0 push.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const md5de = (b) => createHash('md5').update(b).digest('hex');
const REGISTO_AR = join(DIR, 'evidence', 'p104-pos-deploy-v142-b.json');
const LISTA_NOMES = join(DIR, 'evidence', 'ah1-rotulos-secretaria-17-11.json');
const SUFIXO = process.env.P134_SUF || '';
const OUT = join(DIR, 'evidence', 'p134-rotulos-da-secretaria-no-ar' + (SUFIXO ? '-' + SUFIXO : '') + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe - correr com P134_SUF novo, nunca apagar a medicao anterior');

const falhas = [];
const portoes = [];
const gate = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  portoes.push({ nome, obtido, esperado, ok });
  if (!ok) falhas.push(nome);
};
const lido = (p) => readFileSync(p, 'utf8');

// (1) Identidade do ar: o registo de pos-deploy da v142 diz quais eram os bytes servidos.
const registoAr = JSON.parse(lido(REGISTO_AR));
const chaveH1 = Object.keys(registoAr).find((k) => k.startsWith('H1_'));
if (!chaveH1) throw new Error('ABORTA: o registo ' + REGISTO_AR + ' nao tem chave H1_');
const esperadoAr = registoAr[chaveH1].esperado;

const candidatos = readdirSync(join(DIR))
  .filter((n) => /^bfr-candidata-v\d+/.test(n))
  .map((n) => join(DIR, n, 'index.html'))
  .filter((p) => existsSync(p) && statSync(p).isFile());
const comEsteHash = [];
for (const p of candidatos) {
  const b = readFileSync(p);
  if (md5de(b) === esperadoAr.md5) comEsteHash.push({ caminho: p, bytes: b.length });
}
if (comEsteHash.length !== 1) {
  throw new Error('ABORTA: ' + comEsteHash.length + ' ficheiros locais batem o hash do ar servido - a identidade do ar tem de ser unica');
}
const ficheiroAr = comEsteHash[0];
const bytesAr = readFileSync(ficheiroAr.caminho);
const hashAr = md5de(bytesAr);
const texto = bytesAr.toString('utf8');
const linhas = texto.split('\n').length;

// (2) A lista de nomes vem do artefacto de 17/11, com as contagens de la.
const lista1711 = JSON.parse(lido(LISTA_NOMES));
const nomes = Object.keys(lista1711.rotulos);
const contagem = (s) => texto.split(s).length - 1;
const contagemCaixa = (s) => texto.toLowerCase().split(s.toLowerCase()).length - 1;
const noAr = {};
for (const n of nomes) {
  const p = texto.indexOf(n);
  noAr[n] = {
    ocorrencias_17_11: lista1711.rotulos[n].ocorrencias_no_shell,
    ocorrencias_no_ar_de_hoje: contagem(n),
    ocorrencias_no_ar_de_hoje_sem_diferenca_de_caixa: contagemCaixa(n),
    primeira_linha: p < 0 ? null : texto.slice(0, p).split('\n').length,
  };
}
const divergentes = nomes.filter((n) => noAr[n].ocorrencias_17_11 !== noAr[n].ocorrencias_no_ar_de_hoje);
const iguais = nomes.filter((n) => noAr[n].ocorrencias_17_11 === noAr[n].ocorrencias_no_ar_de_hoje);

// (3) Fixtures: a predica tem de poder dar tres, dois e zero.
const FIXTURE = '<a>Secretaria</a><b>Secretaria de Educacao</b><c>Secretaria de Educacao</c>';
const contaEm = (corpo, s) => corpo.split(s).length - 1;
const fixture = {
  tres: contaEm(FIXTURE, 'Secretaria'),
  dois: contaEm(FIXTURE, 'Secretaria de Educacao'),
  zero: contaEm(FIXTURE, 'Supervisao Inexistente No Fixture'),
};

// (4) O nome que saiu do ar: um zero tem de poder ser medida, nao falha de contagem.
const nomeAusente = nomes.find((n) => n.startsWith('Centro de G')) || null;
const contagemDoNomeAusente = nomeAusente ? contagem(nomeAusente) : null;

// (5) O veredito e uma funcao do conjunto de usos, para que os dois mundos sejam provaveis.
const vereditoDe = (usos) => {
  const emJogo = usos.filter((u) => u >= 2).length;
  return emJogo > 1 ? 'P36_B_ROTULOS_AINDA_DIVIDIDOS_' + emJogo : 'P36_B_UM_SO_ROTULO_NO_AR';
};

gate('o_ar_contado_e_byte_a_byte_o_ar_servido_que_o_registo_de_pos_deploy_conferiu',
  [bytesAr.length, hashAr, comEsteHash.length],
  [esperadoAr.bytes, esperadoAr.md5, 1]);
gate('a_lista_de_nomes_e_lida_do_artefacto_de_17_11_e_todos_tem_contagem_no_ar_de_hoje',
  [nomes.length > 0, nomes.filter((n) => typeof noAr[n].ocorrencias_no_ar_de_hoje !== 'number').length],
  [true, 0]);
gate('a_contagem_discrimina_em_fixture', [fixture.tres, fixture.dois, fixture.zero], [3, 2, 0]);
gate('o_nome_que_saiu_do_ar_da_zero_com_as_mesmas_predicas_que_doem_digitos_ao_resto',
  [contagemDoNomeAusente, nomes.filter((n) => contagem(n) > 0).length > 0],
  [0, true]);
gate('a_contagem_sem_diferenca_de_caixa_nunca_e_menor_que_a_contagem_exata',
  [nomes.filter((n) => noAr[n].ocorrencias_no_ar_de_hoje_sem_diferenca_de_caixa < noAr[n].ocorrencias_no_ar_de_hoje).length],
  [0]);
gate('o_veredito_de_unificacao_discrimina_entre_os_dois_mundos',
  [vereditoDe([5, 3, 2, 1, 0]).startsWith('P36_B_ROTULOS_AINDA_DIVIDIDOS'), vereditoDe([52, 0, 0, 0, 0]) === 'P36_B_UM_SO_ROTULO_NO_AR'],
  [true, true]);

const usosNoAr = nomes.map((n) => noAr[n].ocorrencias_no_ar_de_hoje);
const rotulosEmJogo = nomes.filter((n) => noAr[n].ocorrencias_no_ar_de_hoje >= 2);
const veredito = vereditoDe(usosNoAr);

const saida = {
  peca: 'scripts/p134-rotulos-da-secretaria-no-ar.mjs',
  emissor_bytes: readFileSync(fileURLToPath(import.meta.url)).length,
  emissor_md5: md5de(readFileSync(fileURLToPath(import.meta.url))).slice(0, 8),
  rotulo: 'censo dos nomes da superficie da Secretaria no ar publicado',
  em: new Date().toISOString(),
  pergunta: 'A metade (b) da PEN-36 - unificar os sete nomes - esta fechada no ar de hoje?',
  metodo: 'o hash e os bytes do ar lidos do registo de pos-deploy da v142, o ficheiro local escolhido por bate-este-hash (aborta se nao for unico), a lista de nomes lida das chaves do artefacto de 17/11, e a contagem feita com a predica do produtor (`split(nome).length - 1`) sobre os mesmos bytes, com a coluna sem diferenca de caixa ao lado',
  origem_da_lista_de_nomes: LISTA_NOMES.replace(DIR + '/', ''),
  origem_da_identidade_do_ar: REGISTO_AR.replace(DIR + '/', ''),
  ar: {
    caminho: ficheiroAr.caminho.replace(DIR + '/', ''),
    bytes: bytesAr.length,
    bytes_esperados_no_registo: esperadoAr.bytes,
    hash: hashAr,
    hash_esperado_no_registo: esperadoAr.md5,
    linhas,
    candidatos_varridos: candidatos.length,
    chave_do_registo_usada: chaveH1,
  },
  contagem_por_nome: noAr,
  nomes_divergentes_entre_17_11_e_hoje: divergentes,
  nomes_iguais_entre_17_11_e_hoje: iguais,
  fixtures: fixture,
  nome_ausente_do_ar: { valor: nomeAusente, ocorrencias_no_ar_de_hoje: contagemDoNomeAusente },
  rotulos_em_jogo_no_ar: rotulosEmJogo,
  unificacao: { veredito, rotulos_em_jogo: rotulosEmJogo.length },
  escrita: { banco: 0, ddl: 0, publicacao: 0, mint: 0, rotacao: 0, push: 0 },
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
  o_que_prova: [
    'o ficheiro contado e byte a byte o ar servido que o registo de pos-deploy da v142 conferiu tres vezes',
    'cada nome contado hoje e o mesmo nome contado em 17/11, lido das chaves desse artefacto',
    'a divergencia campo a campo entre as duas corridas, com as duas listas impressas',
    'que um zero no ar e uma medida: o nome que saiu tem zero com as mesmas predicas que dao digitos aos outros',
  ],
  o_que_NAO_prova: [
    'que a unificacao seja desejavel - isso e decisao de produto, nao medida',
    'nada do que esta no banco: a fonte sao bytes de bundle',
    'a contagem exata nao distingue uso de mencao: um nome dentro dum comentario tambem conta, e por isso as contagens estao aninhadas (Secretaria inclui Secretaria de Educacao)',
    'o ar de hoje pode nao ser o de 21/11 se alguem publicou entretanto - a identidade e conferida contra o registo versionado, e uma publicacao nova obriga a re-correr esta peca',
  ],
};

writeFileSync(OUT, JSON.stringify(saida, null, 1) + '\n');
console.log(
  'P134_ROTULOS_NO_AR ' + portoes.length + '/' + falhas.length +
  ' · veredito=' + veredito +
  ' · rotulos_em_jogo=' + rotulosEmJogo.length +
  ' · divergentes=' + divergentes.length + ' iguais=' + iguais.length +
  ' · ar=' + ficheiroAr.caminho.replace(DIR + '/', '') + ' ' + bytesAr.length + 'B'
);
if (falhas.length) {
  console.log('FALHAS: ' + falhas.join(', '));
  process.exitCode = 1;
}
