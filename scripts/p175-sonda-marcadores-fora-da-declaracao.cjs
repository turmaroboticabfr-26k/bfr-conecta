// p175-sonda-marcadores-fora-da-declaracao — conta, sobre a folha em disco, cada ocorrencia de marcador de
// superficie que a saida nao declara, com a clausula do texto onde ela caiu. Nao re-implementa a regua: extrai o
// preludio do produtor e chama o classificador dele, por isso o numero que esta sonda imprime e o mesmo que o
// portao usa. O nome antigo («negacao-do-marcador») morreu com a isencao por negacao — ver o comentario do produtor.
// Proveniencia: le o preludio por nome de constante e ABORTA se nao o ler; nada aqui e dactilografado da memoria.
// So leitura: sem rede, sem SQL; o stdout e que e capturado para evidence/.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const REPO = process.argv[2] || path.resolve('.');
const PRODUTOR = path.join(REPO, 'scripts/p175-folha-das-decisoes-humanas.mjs');
if (!fs.existsSync(PRODUTOR)) throw new Error('ABORTA: nao existe ' + PRODUTOR);
const LINHAS = fs.readFileSync(PRODUTOR, 'utf8').split('\n');

function ateLinhasDe(comeco, fim) {
  const i = LINHAS.findIndex((l) => l.startsWith(comeco));
  if (i < 0) throw new Error('ABORTA: nao li `' + comeco + '` em ' + PRODUTOR);
  const j = LINHAS.findIndex((l, k) => k > i && l.startsWith(fim));
  if (j < 0) throw new Error('ABORTA: nao li `' + fim + '` depois de `' + comeco + '` em ' + PRODUTOR);
  return LINHAS.slice(i, j).join('\n');
}

const PRELUDIO = ateLinhasDe('const SENTINELA_SEM_OK =', 'const DECISOES = [');
const FONTE_DECISOES = ateLinhasDe('const DECISOES = [', 'function lePredicasDoProdutor');
for (const nome of ['MARCADORES_DE_SUPERFICIE', 'CLUSURA_DE_CUSTO', 'NENHUMA_SUPERFICIE', 'ORDEM_DE_GRAVIDADE', 'OK_POR_SUPERFICIE', 'deriva', 'ocorrenciasDeMarcadorForaDaDeclaracao', 'semSinal', 'clausulasDe', 'textoDaSaida']) {
  if (!new RegExp('(^|\\s)(const|function)\\s+' + nome + '\\b', 'm').test(PRELUDIO)) throw new Error('ABORTA: o preludio nao declara `' + nome + '` — a sonda ficaria a medir outra coisa');
}
// Um so script: `const` dentro de vm e lexical ao script, por isso duas chamadas runInContext nao veriam a
// declaracao da primeira. O bloco devolve as ligaduras num objecto e e uma corrida so.
const COLHIDAS = vm.runInContext(
  PRELUDIO + '\n' + FONTE_DECISOES + '\n;({DECISOES: DECISOES, deriva: deriva, ocorrencias: ocorrenciasDeMarcadorForaDaDeclaracao, MARCADORES: MARCADORES_DE_SUPERFICIE, NENHUMA: NENHUMA_SUPERFICIE, CLUSURA: CLUSURA_DE_CUSTO, SEMSINAL: semSinal, TEXTO: textoDaSaida})',
  vm.createContext({}),
  { filename: 'preludio-de-' + path.basename(PRODUTOR) }
);
const { DECISOES, deriva, ocorrencias: ocorrenciasDeMarcador, MARCADORES, CLUSURA, SEMSINAL, TEXTO: textoDaSaida } = COLHIDAS;

// Falsificacao da acentuacao: SEMSINAL tem mesmo de juntar a forma com e sem sinal, senao a régua estaria cega
// por ortografia e esta sonda daria menos ocorrencias do que o texto do produtor.
const PROVA_SEMSINAL = ['Câmera de dispositivo real', 'camera de dispositivo real', 'nenhuma das duas se fecha com revogar'];
const iguais = SEMSINAL(PROVA_SEMSINAL[0]) === SEMSINAL(PROVA_SEMSINAL[1]);
if (!iguais) throw new Error('ABORTA: semSinal nao juntou as duas grafias — ' + JSON.stringify(PROVA_SEMSINAL.slice(0, 2)));

const saidas = DECISOES.reduce((n, d) => n + d.opcoes.length, 0);
const itens = [];
for (const d of DECISOES) for (const o of d.opcoes) {
  // O texto varrido e o do produtor, obtido pela funcao dele e nao por uma concatenaao minha.
  for (const m of ocorrenciasDeMarcador(textoDaSaida(o), deriva(o).superficies)) itens.push({ id: d.id, rotulo: o.rotulo, superficie: m.superficie, marcador: m.marcador, clausula: m.clausula, tocam: (o.tocam || []).join('+') });
}
const porSuperficie = {};
for (const i of itens) porSuperficie[i.superficie] = (porSuperficie[i.superficie] || 0) + 1;
const porLinha = {};
for (const i of itens) porLinha[i.id] = (porLinha[i.id] || 0) + 1;
const marcadoresSemAchado = [];
let totalDeMarcadores = 0;
for (const s of Object.keys(MARCADORES)) for (const m of MARCADORES[s]) {
  totalDeMarcadores++;
  if (!DECISOES.some((d) => d.opcoes.some((o) => SEMSINAL(textoDaSaida(o)).indexOf(SEMSINAL(m)) >= 0))) marcadoresSemAchado.push(s + '/' + m);
}

console.log('sonda=p175-sonda-marcadores-fora-da-declaracao produtor=' + path.relative(REPO, PRODUTOR).replace(/\\/g, '/'));
console.log('produtor_bytes=' + fs.statSync(PRODUTOR).size + ' produtor_md5=' + crypto.createHash('md5').update(fs.readFileSync(PRODUTOR)).digest('hex'));
console.log('linhas_da_folha=' + DECISOES.length + ' saidas=' + saidas + ' superficies_no_vocabulario=' + Object.keys(MARCADORES).length + ' clusura=' + String(CLUSURA));
console.log('prova_semsinal=' + JSON.stringify(PROVA_SEMSINAL[0]) + ' == ' + JSON.stringify(PROVA_SEMSINAL[1]));
for (const i of itens) console.log('  ' + i.id + ' | ' + i.superficie + ' | marcador=' + JSON.stringify(i.marcador) + ' | tocam=' + i.tocam + ' | clausula=' + JSON.stringify(i.clausula));
console.log('OCORRENCIAS=' + itens.length + ' LINHAS_ATINGIDAS=' + Object.keys(porLinha).length + ' POR_SUPERFICIE=' + JSON.stringify(porSuperficie));
console.log('MARCADORES_TOTAL=' + totalDeMarcadores + ' MARCADORES_COM_USO=' + (totalDeMarcadores - marcadoresSemAchado.length));
console.log('MARCADORES_SEM_ACHADO_NEM_DECLARACAO=' + JSON.stringify(marcadoresSemAchado));
