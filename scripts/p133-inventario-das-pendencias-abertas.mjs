// p133 — INVENTARIO POR MEDIDA DAS PENDENCIAS ABERTAS (quatro fontes, zero escrita externa).
// Fontes: o ledger (docs/roadmap-master.md, seccao 12), o painel (docs/roadmap-painel.html),
// o registro de aplicacao (evidence/p73-municipal-aplicacao-PEN-*.json) e as linhas RM-x.y do seccao 13
// lidas pelo proprio censo versionado (scripts/censo-pendencias.mjs).
// Regua de classe: dois veredictos por celula, o do ULTIMO sinal por POSICAO (os colchetes do ledger sao
// acrescentados por ordem cronologica) e o do sinal com a DATA mais recente; se concordarem, essa e a classe;
// se divergirem, a linha e DIVERGENTE e imprime-se para leitura humana, nunca para escolha minha.
// A data de um sinal e a mais proxima num janela de 40 caracteres para cada lado, porque o ledger escreve
// tanto «FECHADA 13/11» (data depois) como «[18/11 §SM.22: ...]» (data antes).
// Um segundo vocabulario (ACAO_NOMEADA, oito familias) parte a classe sem familia de OK nas duas faces que o rotulo
// antigo misturava: a celula que nomeia na propria prosa um passo que nao e leitura minha, e a que nao nomeia passo
// nenhum. As quatro familias de OK nao foram tocadas — somou-se uma régua nova, nao se alargou a velha.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const REPO = fs.realpathSync('.');
const SUF = process.env.P133_SUF ? '-' + process.env.P133_SUF : '';
const OUT = REPO + '/evidence/p133-inventario-das-pendencias-abertas-22-11' + SUF + '.json';
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P133_SUF=novo, nao por cima');

// A legenda de status (seccao 12) e a fonte das abreviaturas: os codigos sao lidos dela, nao dactilografados,
// porque a legenda e a que muda. IF e o unico codigo que declara conclusao; os outros seis declaram estado
// nao concluido. O portao abaixo procura um codigo usado no inicio duma celula que a legenda nao conheca.
const LEDGER = 'docs/roadmap-master.md';
const PAINEL = 'docs/roadmap-painel.html';
const ESCAPADO = String.fromCharCode(92) + '|';

const linhas = fs.readFileSync(REPO + '/' + LEDGER, 'utf8').split('\n');
const LEGENDA_STATUS_LINHA = linhas.find((l) => /^Legenda de status:/.test(l)) || '';
const LEGENDA_PRIORIDADE_LINHA = linhas.find((l) => /^Legenda de prioridade:/.test(l)) || '';
const CODIGOS_STATUS = [...LEGENDA_STATUS_LINHA.matchAll(/\*\*([A-Z]{2,4})\*\*\s*=/g)].map((m) => m[1]);
const CODIGOS_PRIORIDADE = [...LEGENDA_PRIORIDADE_LINHA.matchAll(/\*\*([A-Z])\*\*\s+[^\s·]/g)].map((m) => m[1]);
const CODIGO_DE_FECHO = 'IF';
const OUTROS_CODIGOS = CODIGOS_STATUS.filter((c) => c !== CODIGO_DE_FECHO);

// Os idioms abaixo foram medidos no corpus e as contas ficam nas duas saidas versionadas: o vocabulario esta em
// evidence/p133-sonda-idiomas-22-11.txt (produto de scripts/p133-sonda-idiomas.cjs) e as formas ancoradas em
// evidence/p133-sonda-prefixos-22-11.txt (produto de scripts/p133-sonda-prefixos.cjs, que usa estas mesmas
// predicas). O que essa saida imprime, na captura de hoje (evidence/p133-sonda-prefixos-22-11-sm35.txt, que le a
// janela e as palavras deste ficheiro em vez de os re-dactilografar): fecho com data em 11 linhas, «continua +
// estado» em 9, «nao se fecha» em 2, «por provar» em 2, abreviatura da legenda em 10 ocorrencias (PF 6, NT 2, ICP 2
// — nove no inicio da celula e uma dentro, o «ICP por RM12-A1» do PEN-13), «palavra de estado no inicio» em 29
// linhas e «palavra de estado + data» em 15 ocorrencias, 14 no inicio e 1 dentro (PEN-34, «Criada 14/11 ao fechar o
// RM-6.9»). A captura anterior (evidence/p133-sonda-prefixos-22-11.txt) dizia 10 linhas de fecho porque ainda trazia
// a janela de 12 escrita a mao: ficou como estava e serve de exemplar do numero envelhecido. O `IF` da legenda
// nao tem nenhuma ocorrencia no corpus: a sua familia so dispara em fixture, e e por isso que o portao dos
// idioms sem uso aceita o uso em fixture. A abreviatura nao e aceite sozinha: exige logo depois `por`, travessao
// ou `=`, a unica forma com que aparece nas dez ocorrencias medidas. A palavra solta «abert» fica FORA da familia
// ABERTO: tem 35 ocorrencias no corpus e as quatro que nao declaram estado da linha sao deixadas de fora por
// forma, nao por lista — «a re-abertura so se justifica» (PEN-34, dentro de palavra), «abertas=7» (PEN-40, nome
// de campo dum diagnostico), o identificador de codigo duas vezes (PEN-45) e «buraco aberto» (PEN-48, metafora).
// As restantes ou estao no inicio da celula, que a familia ancorada ja reclama, ou vem de «continua / mantem a
// linha aberta», que as outras duas familias ja reclamam. Nao ha filtro de ruido: um filtro assim suprimiria
// tambem a declaracao verdadeira «a classe continua aberta» (PEN-48).
//
// A janela entre a palavra de fecho e a data nao e um chute: e o intervalo contado no corpus, onde ha 11
// ocorrencias de «palavra de fecho + data» com histograma {1: 10, 17: 1}. O maior intervalo legitimo medido e 17
// — o `FECHADAS AS DUAS METADES 19/11` da PEN-36 — e a janela anterior (12) nao o alcançava, pelo que a celula
// era lida pelo sinal de 17/11 e nunca pelo de 19/11. A janela passa a const abaixo, que compoe o regex: o portao
// `a_janela_do_fecho_cobre_o_maior_intervalo_medido_no_corpus` governa o mesmo numero que a regua usa, por isso
// nao podem envelhecer separadas.
//
// A janela de cima so vale na direccao palavra-antes-da-data. Medido por scripts/p135-sonda-adendos-de-fecho.cjs
// (saida em evidence/p135-sonda-adendos-de-fecho-22-11.txt, que le a janela e as palavras deste ficheiro): ha 7
// adendos nas linhas PEN, todos com a marca `(DD/MM)`, todos com exactamente 2 caracteres de pura pontuacao a seguir
// (`: `), e em 6 deles nao ha palavra de estado ate 60 caracteres — sao notas de progresso, e e por isso que a
// familia nova nao os reclama. O setimo tem `FECHADA` logo a seguir a data: a PEN-40, que o §SM.28 fecha no ar da
// v142 e que esta regua lia como ABERTA porque a data vinha antes da palavra. A familia fica abaixo, com janela
// propria e portao proprio; o fixture de 15 caracteres e o que prova que ela pode falhar.
const JANELA_FECHO = 20;
const PALAVRAS_DE_FECHO = 'FECHAD[OA]S?|APLICAD[OA]S?|PUBLICAD[OA]S?|CANCELAD[OA]S?|ATENDID[OA]S?';
// A JANELA_ADENDO governa o outro eixo: a corrida de pura pontuacao ENTRE a marca de data do adendo e a palavra de
// fecho que vem depois dela. Medida na sonda versionada: sete adendos nas linhas PEN, todos com a mesma corrida de
// dois caracteres (`: `) e um so com palavra de fecho a seguir. Dois era o minimo que servia o corpus; seis e a
// margem que ainda deixa o fixture de doze caracteres Fora da familia, o unico modo de esta janela poder falhar.
const JANELA_ADENDO = 6;
const IDIOMAS = [
  { fam: 'FECHO', nome: 'fecho datado', re: new RegExp('\\b(?:' + PALAVRAS_DE_FECHO + ')\\b[^.]{0,' + JANELA_FECHO + '}(?:1[0-9]|2[0-9])\\/1[12]') },
  { fam: 'FECHO', nome: 'fecho em adendo com a data antes da palavra', re: new RegExp('[Aa]dendo\\b[^|\\n]{0,24}?\\((?:1[0-9]|2[0-9])\\/1[12]\\)[^A-Za-z0-9\\u00C0-\\u00FF]{0,' + JANELA_ADENDO + '}(?:' + PALAVRAS_DE_FECHO + ')\\b') },
  { fam: 'ABERTO', nome: 'continua + estado', re: /\bcontinua (?:abert|pendente|por|sem prova|em aberto|nao|sem)/ },
  { fam: 'ABERTO', nome: 'esta linha nao se fecha', re: /n[ãa]o se fecha/ },
  { fam: 'ABERTO', nome: 'por provar', re: /por provar/ },
  { fam: 'ABERTO', nome: 'palavra de estado no inicio da celula', re: /^(?:\*\*)?(?:Abert[oa]|Criada?)[\s—-]/ },
  { fam: 'ABERTO', nome: 'palavra de estado seguida de data', re: /\b(?:Abert[oa]|Criada)\s+(?:1[0-9]|2[0-9])\/1[12]/ },
  { fam: 'ABERTO', nome: 'abreviatura da legenda', re: new RegExp('\\b(?:' + OUTROS_CODIGOS.join('|') + ')\\b(?:\\*\\*)?\\s*(?:por|—|=|-)') },
  { fam: 'FECHO', nome: 'abreviatura IF da legenda', re: /\bIF\b(?:\*\*)?\s*(?:por|—|=|-)/ },
];
const DATA_ISO = /20\d\d-\d\d-\d\d/;
const DATA_CURTA = /\d{1,2}\/\d{1,2}(?!\d)/;

function dataProxima(texto, pos) {
  const janela = texto.slice(Math.max(0, pos - 40), pos + 40);
  const desloc = Math.max(0, pos - 40);
  let melhor = null;
  for (const re of [DATA_ISO, DATA_CURTA]) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = g.exec(janela)) !== null) {
      const centro = desloc + m.index + (re === DATA_ISO ? 5 : 2);
      const dist = Math.abs(centro - pos);
      if (!melhor || dist < melhor.dist) melhor = { dist, texto: m[0] };
      if (m.index === g.lastIndex) g.lastIndex++;
    }
  }
  if (!melhor) return null;
  if (DATA_ISO.test(melhor.texto)) return melhor.texto;
  const partes = melhor.texto.split('/');
  return '2026-' + String(partes[1]).padStart(2, '0') + '-' + String(partes[0]).padStart(2, '0');
}

function sinais(celula) {
  const s = [];
  for (const id of IDIOMAS) {
    const g = new RegExp(id.re.source, id.re.flags.includes('g') ? id.re.flags : id.re.flags + 'g');
    let m;
    while ((m = g.exec(celula)) !== null) {
      s.push({ fam: id.fam, nome: id.nome, pos: m.index, data: dataProxima(celula, m.index), recorte: celula.slice(Math.max(0, m.index - 25), m.index + 95).replace(/\*/g, '') });
      if (m.index === g.lastIndex) g.lastIndex++;
    }
  }
  s.sort((a, b) => a.pos - b.pos);
  return s;
}

function classe(celula) {
  const s = sinais(celula);
  if (!s.length) return { classe: 'SEM_DECLARACAO', s, vencedor: null, porData: null };
  const fechos = s.filter((x) => x.fam === 'FECHO' && x.data);
  const porPosicao = s[s.length - 1];
  const porData = s.slice().sort((a, b) => (a.pos - b.pos)).pop();
  if (!fechos.length) return { classe: porPosicao.fam === 'FECHO' ? 'FECHADA' : 'ABERTA', s, vencedor: porPosicao, porData };
  const fecho = fechos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.pos - b.pos)).pop();
  const abertosDepois = s.filter((x) => x.fam === 'ABERTO' && x.pos > fecho.pos);
  if (!abertosDepois.length) return { classe: 'FECHADA', s, vencedor: fecho, porData };
  const ultimo = abertosDepois[abertosDepois.length - 1];
  const contradiz = ultimo.data !== null && ultimo.data <= fecho.data;
  return { classe: contradiz ? 'DIVERGENTE' : 'ABERTA', s, vencedor: contradiz ? fecho : ultimo, porData };
}

const OK_EXIGIDO = [
  ['OK de publicacao', /publica|deploy|wrangler|vers[ãa]o v1\d\d/i],
  ['OK de aplicacao de DDL', /\bDDL\b|polic|grant|revoke|alter table|create (or replace )?(function|view)|aplicar/i],
  ['OK de mint ou rotacao de senha', /mint|conta test|senha|rota[çc][ãa]o/i],
  ['decisao humana (produto ou aparelho)', /decis|op[çc][ãa]o|escolh|aparelho|f[íi]sic|hardware|celular/i],
];

// As oito familias abaixo nao substituem as quatro de cima: somam-se e separam o que o rotulo «nenhum» chamava uma
// coisa so. Uma celula pode nao dizer nenhuma das quatro palavras de OK e ainda assim nomear, na sua propria prosa, o
// passo que nao e meu — escrever no produto, publicar, pedir cadeia viva, tocar no indice. Quantas caem em cada face
// imprime-o scripts/p167-vocabulario-das-acoes-nomeadas.mjs, que recorta estas mesmas constantes do ficheiro presente
// e aborta se nao as ler; este comentario nao replica as contas, porque elas envelhecem com a prosa do ledger e um
// comentario nao pode envelhecer sozinho. Cada familia traz fixture proprio (o lado que tem de disparar) e ha um
// controlo negativo comum (a frase em que nenhuma pode disparar): sem os dois, uma familia que nao casa nada e um
// ramo morto que passa por medida.
const ACAO_NOMEADA = [
  ['ok_literal_nomeado', /\bOK\b/, 'a transicao pede candidata e OK proprios'],
  ['candidata', /candidata/i, 'isto precisa de candidata nova'],
  ['escrita', /escrita|escrever\b|\bescreve\b/i, 'mover o texto e escrita no produto'],
  ['browser_ou_cadeia_viva', /medi[cç][aã]o de browser|cadeia viva|autenticad|re-login|toque e paint/i, 'exige medicao de browser com cadeia viva autenticada'],
  ['re_execucao', /re-?executar|re-?correr o cen[aá]rio|executar escreve/i, 'o que falta e re-executar com as cadeias vivas'],
  ['indice_ou_gitignore', /gitignore|para o [ií]ndice|version[aá]r/i, 'toca o .gitignore e pede versao'],
  ['implementar', /implementar/i, 'implementar o offline e escrita no produto'],
  ['nova_versao', /nova vers[ãa]o|vers[ãa]o candidata/i, 'fecha com uma nova versao do pacote'],
];
const CONTROLO_NEGATIVO_DE_FAMILIA = 'o censo registado bate com a ficha e nao ha mais nada a dizer';

function acoesNomeadas(texto) {
  const hits = [];
  for (const [nome, re] of ACAO_NOMEADA) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    let n = 0;
    let primeiro = null;
    while ((m = g.exec(texto)) !== null) {
      n++;
      if (primeiro === null) primeiro = texto.slice(Math.max(0, m.index - 12), m.index + m[0].length + 12);
      if (m.index === g.lastIndex) g.lastIndex++;
    }
    if (n) hits.push({ nome, ocorrencias: n, gatilho: primeiro });
  }
  return hits;
}

function okExigido(texto) {
  const hits = [];
  for (const [nome, re] of OK_EXIGIDO) {
    const m = texto.match(re);
    if (m) hits.push({ exigido: nome, gatilho: m[0].slice(0, 40) });
  }
  return hits.length ? hits : [{ exigido: 'nenhum_familia_de_ok_lida', gatilho: '-' }];
}
const SEM_FAMILIA_DE_OK = 'nenhum_familia_de_ok_lida';


const rows = linhas.filter((l) => /^\| PEN-\d+ \|/.test(l));
const foraDeForma = [];
const itens = [];
const codigosNoInicio = {};
const prioridadesForaDaLegenda = {};
for (const r of rows) {
  const c = r.split(ESCAPADO).join('@@').split('|');
  const id = c[1].trim();
  if (c.length !== 7) { foraDeForma.push({ id, colunas: c.length - 2 }); continue; }
  const estado = c[5].trim().replace(/\s+/g, ' ');
  const av = classe(estado);
  const item = c[2].trim();
  const prefixo = estado.match(/^(?:\*\*)?([A-Z]{2,4})(?:\*\*)?\s*(?:—|-|=)/);
  if (prefixo) codigosNoInicio[prefixo[1]] = (codigosNoInicio[prefixo[1]] || 0) + 1;
  const pri = c[4].trim();
  if (!CODIGOS_PRIORIDADE.includes(pri)) prioridadesForaDaLegenda[pri] = (prioridadesForaDaLegenda[pri] || 0) + 1;
  const lido = item + ' ' + estado;
  itens.push({
    id, tipo: c[3].trim(), pri: pri,
    classe: av.classe,
    codigo_no_inicio: prefixo ? prefixo[1] : null,
    vencedor: av.vencedor ? av.vencedor.nome + ' @' + av.vencedor.pos + (av.vencedor.data ? ' ' + av.vencedor.data : '') : '-',
    por_data: av.porData ? av.porData.nome + ' ' + av.porData.data : '-',
    recorte: av.vencedor ? av.vencedor.recorte.slice(0, 170) : estado.slice(0, 170),
    n_sinais: av.s.length,
    texto_lido: lido,
    ok: okExigido(lido),
    acao: acoesNomeadas(lido),
    bytes_estado: Buffer.byteLength(estado),
  });
}

const idsLedger = new Set(itens.map((i) => i.id));
const registos = {};
const nomesRegisto = fs.readdirSync(REPO + '/evidence').filter((x) => /^p73-municipal-aplicacao-PEN-\d+.*\.json$/.test(x)).sort();
const descartados = [];
for (const n of nomesRegisto) {
  if (n.includes('VERMELHO') || n.includes('ABORTADA') || n.includes('recusa')) { descartados.push(n); continue; }
  let j = null;
  try { j = JSON.parse(fs.readFileSync(REPO + '/evidence/' + n, 'utf8')); } catch { descartados.push(n + ' (parse falhou)'); continue; }
  if (j.modo !== 'aplicacao' || j.escrito_no_banco !== true) { descartados.push(n + ' (modo/escrito_no_banco)'); continue; }
  const bruto = String(j.peca || (n.match(/PEN-\d+/) || [''])[0]);
  const id = /^PEN-\d+$/.test(bruto) ? bruto : (bruto.match(/\d+/) ? 'PEN-' + bruto.match(/\d+/)[0].padStart(2, '0') : bruto);
  if (registos[id]) descartados.push(n + ' (ja havia registo para ' + id + ')');
  registos[id] = { registo: n, em: j.em, ok_literal_usado: j.ok_literal_usado, preflight: j.preflight_reversao ? j.preflight_reversao.codigo : null };
}
for (const i of itens) { i.registo_aplicacao = registos[i.id] || null; }
const registosSemLinha = Object.keys(registos).filter((id) => !idsLedger.has(id));

const painelTxt = fs.readFileSync(REPO + '/' + PAINEL, 'utf8');
const mPainel = painelTxt.match(/Pendências \((\d+) itens · PEN-01/);
const mSec15 = fs.readFileSync(REPO + '/' + LEDGER, 'utf8').match(/\| Pendências registradas \| (\d+) \(PEN-01/);
const penDoPainel = mPainel ? +mPainel[1] : null;
const penDo15 = mSec15 ? +mSec15[1] : null;

const rmLinhas = linhas.filter((l) => /^\|\s*(RM-\d+\.\d+)\s*\|/.test(l));
let saidaCenso = '';
let censoFalhou = null;
try {
  saidaCenso = execFileSync(process.execPath, [REPO + '/scripts/censo-pendencias.mjs'], { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
} catch (e) { censoFalhou = String(e && e.message).slice(0, 200); }
const mAbertas = saidaCenso.match(/abertas\/parciais\/bloqueadas por este predicado: (\d+)/);
const mTotalRm = saidaCenso.match(/linhas RM-x\.y no §13: (\d+)/);
const rmDoProdutor = mTotalRm ? +mTotalRm[1] : null;
const rmAbertasDoProdutor = mAbertas ? +mAbertas[1] : null;

const FIXTURES = [
  { celula: 'PF — RM-5.2', esperado: 'ABERTA', por: 'abreviatura da legenda' },
  { celula: '**ICP — medido 12/11 (RM-1.3)**', esperado: 'ABERTA', por: 'abreviatura da legenda' },
  { celula: '**IF** — provado 12/11 em tres camadas', esperado: 'FECHADA', por: 'abreviatura IF' },
  { celula: '**FECHADA 14/11 às 16:29:17.530636Z pela publicação da v121**', esperado: 'FECHADA', por: 'fecho datado sem declaracao posterior' },
  { celula: 'FECHADA 15/11 02:54:56Z pelo DDL do RM-6.8. **[18/11: a classe continua aberta**', esperado: 'ABERTA', por: 'declaracao posterior com data mais recente' },
  { celula: 'FECHADA 20/11 pelo DDL. **[13/11] a exibicao continua por provar**', esperado: 'DIVERGENTE', por: 'declaracao mais tarde no texto com data anterior' },
  { celula: 'Medida 12/11 (RM-1.2, 57 portoes/0): o estado pending nunca e escrito', esperado: 'SEM_DECLARACAO', por: 'nenhum idiom de estado no texto' },
  { celula: 'Aberto — mitigado (v111/v112); RM-2.1', esperado: 'ABERTA', por: 'palavra de estado no inicio (PEN-01 real)' },
  { celula: '**Aberta 13/11 na passada S21 (§R.4 do arquivo de auditoria)** — dona **RM-1.7**', esperado: 'ABERTA', por: 'palavra de estado no inicio (PEN-32 real)' },
  { celula: '**Criada 20/11 pelo §SM.26, com o texto medido e nao resumido.**', esperado: 'ABERTA', por: 'palavra de estado no inicio (PEN-41 real)' },
  { celula: 'FECHADA 14/11 pelo push do remendo. **[PEN-34] Criada 14/11 ao fechar o RM-6.9, com medicao propria**', esperado: 'DIVERGENTE', por: 'palavra de estado com data depois do fecho, data nao mais recente' },
  { celula: '**FECHADAS AS DUAS METADES 19/11 — §SM.24**', esperado: 'FECHADA', por: 'fecho datado com intervalo 17, a forma real da PEN-36 que a janela de 12 nao alcançava' },
  { celula: 'FECHADAS AS DUAS METADES DA SUPERFICIE E DOS ROTULOS E DAS PORTAS 21/11', esperado: 'SEM_DECLARACAO', por: 'intervalo acima da janela medida: a regua nao a reconhece e e isso que o portao da janela vigia' },
  { celula: '**[Adendo §SM.28 (21/11): FECHADA por execução no ar da v142]**', esperado: 'FECHADA', por: 'fecho em adendo com a data antes da palavra, a forma real da PEN-40, corrida de 2' },
  { celula: 'Adendo §SM.9 (21/11): **PUBLICADA a v143 com portao', esperado: 'FECHADA', por: 'a mesma familia com o involacro de negrito, corrida de 4, dentro da margem' },
  { celula: 'Adendo §SM.9 (21/11): ............ FECHADA', esperado: 'SEM_DECLARACAO', por: 'corrida de 14 caracteres, acima da janela do adendo: a familia nao a reclama e este fixture e o que o prova' },
];
const disparados = {};
for (const f of FIXTURES) { const c = classe(f.celula).classe; disparados[f.esperado] = (disparados[f.esperado] || 0) + (c === f.esperado ? 1 : 0); }
const fixturesFalham = FIXTURES.map((f) => ({ esperado: f.esperado, obtido: classe(f.celula).classe })).filter((x) => x.esperado !== x.obtido);

// Cada idiom tem de ter uso medido: no corpus ou, nao tendo, no fixture. Um idiom que nao dispara em nenhum dos
// dois e o ramo sem positivo da classe que o §SM.31 apanhou no portao das citacoes.
const usoEmTextos = (textos) => {
  const uso = {};
  for (const id of IDIOMAS) uso[id.nome] = 0;
  for (const t of textos) {
    for (const id of IDIOMAS) {
      const g = new RegExp(id.re.source, id.re.flags.includes('g') ? id.re.flags : id.re.flags + 'g');
      if (g.test(t)) uso[id.nome]++;
    }
  }
  return uso;
};
const celulasDoCorpus = rows.map((r) => { const c = r.split(ESCAPADO).join('@@').split('|'); return c.length === 7 ? c[5].trim().replace(/\s+/g, ' ') : ''; });
const usoPorIdioma = usoEmTextos(celulasDoCorpus);
const usoPorIdiomaFixtures = usoEmTextos(FIXTURES.map((f) => f.celula));
const idiomasSemUso = Object.keys(usoPorIdioma).filter((k) => usoPorIdioma[k] === 0 && (usoPorIdiomaFixtures[k] || 0) === 0);

// O intervalo entre a palavra de fecho e a data, medido com a mesma semantica do regex da regua (a busca para no
// primeiro ponto). Publica-se e governa a JANELA_FECHO: e a unica forma de a janela deixar de servir sem que eu
// de conta do aviso.
const PALAVRA_DE_FECHO = new RegExp('\\b(?:' + PALAVRAS_DE_FECHO + ')\\b', 'g');
const DATA_DE_FECHO = /(?:1[0-9]|2[0-9])\/1[12]/;
const intervalosDeFecho = (textos) => {
  const histograma = {};
  let ocorrencias = 0;
  let maior = 0;
  for (const t of textos) {
    PALAVRA_DE_FECHO.lastIndex = 0;
    let m;
    while ((m = PALAVRA_DE_FECHO.exec(t))) {
      const cauda = t.slice(m.index + m[0].length).split('.')[0].slice(0, 80);
      const d = cauda.match(DATA_DE_FECHO);
      if (!d) continue;
      ocorrencias++;
      histograma[d.index] = (histograma[d.index] || 0) + 1;
      if (d.index > maior) maior = d.index;
    }
  }
  return { ocorrencias, maior_intervalo: maior, histograma };
};
const intervalosCorpus = intervalosDeFecho(celulasDoCorpus);
const intervalosFixtures = intervalosDeFecho(FIXTURES.map((f) => f.celula));

// A outra face da mesma cegueira, medida em vez de suposta: a corrida de pontuacao que vai da marca de data do
// adendo ate a palavra de fecho. O regex da familia poe-lhe o limite; esta contagem nao poe, para que se veja o
// que ficaria Fora sem que eu de por isso. A classe do grupo capturado nao tem letras nem digitos, por isso o
// backtracking nao pode inventar uma palavra que nao comece no fim da corrida.
const RE_ADENDO_SEM_LIMITE = new RegExp('[Aa]dendo\\b[^|\\n]{0,24}?\\((?:1[0-9]|2[0-9])\\/1[12]\\)([^A-Za-z0-9\\u00C0-\\u00FF]*)(?:' + PALAVRAS_DE_FECHO + ')\\b', 'g');
const intervalosDeAdendo = (textos) => {
  const histograma = {};
  let ocorrencias = 0;
  let maior = 0;
  for (const t of textos) {
    RE_ADENDO_SEM_LIMITE.lastIndex = 0;
    let m;
    while ((m = RE_ADENDO_SEM_LIMITE.exec(t)) !== null) {
      ocorrencias++;
      histograma[m[1].length] = (histograma[m[1].length] || 0) + 1;
      if (m[1].length > maior) maior = m[1].length;
      if (m.index === RE_ADENDO_SEM_LIMITE.lastIndex) RE_ADENDO_SEM_LIMITE.lastIndex++;
    }
  }
  return { ocorrencias, maior_intervalo: maior, histograma };
};
const adendoCorpus = intervalosDeAdendo(celulasDoCorpus);
const adendoFixtures = intervalosDeAdendo(FIXTURES.map((f) => f.celula));

const CLASSES = ['ABERTA', 'FECHADA', 'DIVERGENTE', 'SEM_DECLARACAO'];
const contagem = {};
for (const k of CLASSES) contagem[k] = 0;
for (const i of itens) contagem[i.classe] = (contagem[i.classe] || 0) + 1;
const semClasse = itens.filter((i) => !CLASSES.includes(i.classe)).map((i) => i.id);
const abertasComRegisto = itens.filter((i) => i.classe === 'ABERTA' && i.registo_aplicacao).map((i) => i.id);

const vocabOk = Object.values(registos).map((r) => r.ok_literal_usado).filter(Boolean);

// A face nova do vocabulario, medida sobre a mesma string que a regua de OK le (titulo + Estado, separados por um
// espaco). As duas faces da classe sem familia de OK imprimem-se mesmo quando vazias: suprimir uma face era o mesmo
// defeito do portao que proibia uma classe legítima (§SM.33) — «nao sei» nao pode passar a «nao existe».
const usoFamilia = (familia, textos) => {
  const uso = {};
  for (const [nome] of familia) uso[nome] = 0;
  for (const t of textos) {
    for (const [nome, re] of familia) {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      if (g.test(t)) uso[nome]++;
    }
  }
  return uso;
};
const semFamilia = itens.filter((i) => i.ok.length === 1 && i.ok[0].exigido === SEM_FAMILIA_DE_OK);
const comFamilia = itens.filter((i) => !(i.ok.length === 1 && i.ok[0].exigido === SEM_FAMILIA_DE_OK));
const facesDaClasseSemFamilia = {
  com_acao_nomeada: semFamilia.filter((i) => i.acao.length > 0).map((i) => i.id),
  sem_passo_nomeado: semFamilia.filter((i) => i.acao.length === 0).map((i) => i.id),
};
const usoAcaoNoCorpus = usoFamilia(ACAO_NOMEADA, itens.map((i) => i.texto_lido));
const usoAcaoNaClasseSemFamilia = usoFamilia(ACAO_NOMEADA, semFamilia.map((i) => i.texto_lido));
const usoAcaoNosFixtures = usoFamilia(ACAO_NOMEADA, ACAO_NOMEADA.map((f) => f[2]));
const fixturesDeAcaoQueFalham = ACAO_NOMEADA.filter(([, re, fix]) => !re.test(fix)).map(([nome]) => nome);
const familiasQueDisparamNoControloNegativo = ACAO_NOMEADA.filter(([, re]) => re.test(CONTROLO_NEGATIVO_DE_FAMILIA)).map(([nome]) => nome);
const particaoDasQuatroFaces = {
  so_familia_de_ok: comFamilia.filter((i) => i.acao.length === 0).map((i) => i.id),
  familia_de_ok_e_acao_nomeada: comFamilia.filter((i) => i.acao.length > 0).map((i) => i.id),
  so_acao_nomeada: facesDaClasseSemFamilia.com_acao_nomeada,
  nenhuma_das_duas: facesDaClasseSemFamilia.sem_passo_nomeado,
};

const portoes = [];
const gate = (nome, ob, esp) => portoes.push({ nome, obtido: ob, esperado: esp, ok: JSON.stringify(ob) === JSON.stringify(esp) });
gate('todas_as_linhas_pen_tem_cinco_celulas', foraDeForma.length, 0);
gate('nenhuma_linha_pen_fica_fora_das_quatro_classes_registadas', semClasse.length, 0);
gate('as_quatro_classes_imprimem_se_mesmo_quando_vazias', [CLASSES.length, Object.keys(contagem).length], [4, 4]);
gate('cada_fixture_produz_a_classe_esperada_pelo_desenho', fixturesFalham.length, 0);
gate('cada_idiom_de_estado_tem_uso_medido_no_corpus_ou_em_fixture', idiomasSemUso, []);
gate('a_janela_do_fecho_cobre_o_maior_intervalo_medido_no_corpus',
  [intervalosCorpus.maior_intervalo <= JANELA_FECHO, intervalosFixtures.maior_intervalo > JANELA_FECHO], [true, true]);
gate('a_janela_do_adendo_cobre_o_maior_intervalo_medido_no_corpus',
  [adendoCorpus.maior_intervalo <= JANELA_ADENDO, adendoFixtures.maior_intervalo > JANELA_ADENDO], [true, true]);
gate('as_duas_legendas_da_seccao_12_foram_lidas_e_deram_codigos', [LEGENDA_STATUS_LINHA ? 1 : 0, LEGENDA_PRIORIDADE_LINHA ? 1 : 0, CODIGOS_STATUS.length > 0 ? 1 : 0, CODIGOS_PRIORIDADE.length > 0 ? 1 : 0], [1, 1, 1, 1]);
gate('todo_codigo_usado_no_inicio_de_celula_consta_na_legenda_de_status', Object.keys(codigosNoInicio).filter((c) => !CODIGOS_STATUS.includes(c)).sort(), []);
gate('toda_prioridade_lida_bate_com_a_legenda_de_prioridade', Object.keys(prioridadesForaDaLegenda).sort(), []);
gate('nenhum_registo_de_aplicacao_aponta_para_pen_inexistente', registosSemLinha.length, 0);
gate('o_censo_do_painel_bate_com_o_paragrafo_15_e_com_as_linhas_lidas', [penDoPainel, penDo15, itens.length], [itens.length, itens.length, itens.length]);
gate('o_produtor_e_a_minha_leitura_do_seccao_13_contam_as_mesmas_linhas_rm', [rmDoProdutor, rmLinhas.length], [rmLinhas.length, rmLinhas.length]);
let saidaCuenta = '';
try { saidaCuenta = execFileSync(process.execPath, [REPO + '/scripts/ah1-cuenta-pen.mjs'], { cwd: REPO, encoding: 'utf8' }); } catch (e) { saidaCuenta = 'CENSO_FALHOU ' + String(e && e.message).slice(0, 120); }
const mCuenta = saidaCuenta.match(/^linhas PEN:\s*(\d+)/m);
const mUnicas = saidaCuenta.match(/^únicas:\s*(\d+)/m);
const linhasDoProdutor = mCuenta ? +mCuenta[1] : null;
const idsUnicosDoProdutor = mUnicas ? +mUnicas[1] : null;
gate('o_meu_censo_bate_com_o_contador_versionado_do_ledger', [linhasDoProdutor, idsUnicosDoProdutor], [itens.length + foraDeForma.length, new Set(itens.map((i) => i.id)).size]);
gate('todo_registo_de_aplicacao_traz_a_frase_de_ok_com_que_foi_autorizado', [Object.keys(registos).length, vocabOk.length], [vocabOk.length, vocabOk.length]);
gate('cada_familia_de_acao_nomeada_dispara_no_fixture_que_lhe_foi_posto', fixturesDeAcaoQueFalham, []);
gate('nenhuma_familia_de_acao_nomeada_dispara_no_controlo_negativo', familiasQueDisparamNoControloNegativo, []);
gate('a_classe_sem_familia_de_ok_e_exactamente_a_soma_das_suas_duas_faces',
  [facesDaClasseSemFamilia.com_acao_nomeada.length + facesDaClasseSemFamilia.sem_passo_nomeado.length, semFamilia.length], [semFamilia.length, semFamilia.length]);
gate('as_quatro_familias_de_ok_do_desenho_continuam_os_quatro_nomes_e_a_mesma_ordem', OK_EXIGIDO.map(([n]) => n), ['OK de publicacao', 'OK de aplicacao de DDL', 'OK de mint ou rotacao de senha', 'decisao humana (produto ou aparelho)']);
const falhas = portoes.filter((p) => !p.ok);
const emissor = fs.readFileSync(REPO + '/scripts/p133-inventario-das-pendencias-abertas.mjs', 'utf8');

const saida = {
  peca: 'p133-inventario-das-pendencias-abertas.mjs',
  rotulo: process.env.P133_ROTULO || 'a',
  em: new Date().toISOString(),
  pergunta: 'quais pendencias estao mesmo abertas, por que classe medida, e que OK cada uma exige?',
  metodo: `todas as linhas PEN lidas com a predica do produtor (pipes escapados nao separam celulas, sete partes por split); classe = os dois veredictos da celula (ultimo sinal por posicao e sinal com a data mais recente) quando concordam, DIVERGENTE quando divergem, SEM_DECLARACAO quando a celula nao tem nenhum idiom; os idioms sao as formas medidas no corpus (p133-sonda-idiomas.cjs, p133-sonda-prefixos.cjs, p135-sonda-adendos-de-fecho.cjs, que leem esta mesma fonte em vez de re-dactilografar as predicas), com as abreviaturas lidas da propria linha da legenda de status e nao dactilografadas; a palavra solta «abert» esta fora das familias porque tres das suas ocorrencias descrevem superficie e nao estado; a janela entre a palavra de fecho e a data e a const JANELA_FECHO, contada no corpus (${intervalosCorpus.ocorrencias} ocorrencias, histograma publicado em janela_de_fecho) e vigiada pelo portao do mesmo nome; ha uma segunda janela, JANELA_ADENDO, para a forma em que a data vem ANTES da palavra («Adendo §SM.28 (21/11): FECHADA», ${adendoCorpus.ocorrencias} ocorrencia no corpus, corrida de pontuacao medida em ${JSON.stringify(adendoCorpus.histograma)} pela sonda p135), tambem ela vigiada por portao proprio com fixture nos dois sentidos; registro de aplicacao lido com o filtro do portao do pacote (modo=aplicacao e escrito_no_banco=true); seccao 13 e o censo PEN contados pelos produtores versionados por execFile, nao por reimplementacao; ha um segundo vocabulario, ACAO_NOMEADA, com ${ACAO_NOMEADA.length} familias que leem na prosa da celula um passo que nao pertence a nenhuma das quatro familias de OK — cada familia com fixture proprio e um controlo negativo comum, e a classe sem familia de OK partida nas duas faces publicadas (acao nomeada / passo nenhum). A etiqueta de fallback diz agora apenas o que a regua media: nenhum OK foi lido, e nao que a linha se fecha por leitura.`,
  emissor_bytes: Buffer.byteLength(emissor),
  emissor_md5: createHash('md5').update(emissor).digest('hex').slice(0, 8),
  fontes: { ledger: LEDGER, painel: PAINEL, registro_diretorio: 'evidence', censo_rm: 'scripts/censo-pendencias.mjs' },
  legendas_lidas: {
    status: { linha: LEGENDA_STATUS_LINHA, byte: Buffer.byteLength(LEGENDA_STATUS_LINHA), codigos: CODIGOS_STATUS, codigo_de_fecho: CODIGO_DE_FECHO },
    prioridade: { linha: LEGENDA_PRIORIDADE_LINHA, byte: Buffer.byteLength(LEGENDA_PRIORIDADE_LINHA), codigos: CODIGOS_PRIORIDADE },
    codigos_usados_no_inicio_das_celulas: codigosNoInicio,
    prioridades_fora_da_legenda: prioridadesForaDaLegenda,
  },
  idiomas: { definidos: IDIOMAS.length, uso_no_corpus: usoPorIdioma, uso_nos_fixtures: usoPorIdiomaFixtures, sem_uso_em_ambos: idiomasSemUso },
  janela_de_fecho: { valor: JANELA_FECHO, corpus: intervalosCorpus, fixtures: intervalosFixtures },
  janela_de_adendo: { valor: JANELA_ADENDO, corpus: adendoCorpus, fixtures: adendoFixtures },
  linhas_pen: itens.length,
  contagem_por_classe: contagem,
  abertas: itens.filter((i) => i.classe === 'ABERTA').map((i) => ({ id: i.id, pri: i.pri, vencedor: i.vencedor, ok: i.ok, acao: i.acao, registo: i.registo_aplicacao ? i.registo_aplicacao.registo : null })),
  divergentes: itens.filter((i) => i.classe === 'DIVERGENTE').map((i) => ({ id: i.id, pri: i.pri, n_sinais: i.n_sinais, vencedor: i.vencedor, por_data: i.por_data, recorte: i.recorte })),
  sem_declaracao: itens.filter((i) => i.classe === 'SEM_DECLARACAO').map((i) => ({ id: i.id, pri: i.pri, recorte: i.recorte })),
  fechadas: itens.filter((i) => i.classe === 'FECHADA').map((i) => ({ id: i.id, vencedor: i.vencedor })),
  fora_das_quatro_classes: semClasse,
  fora_de_forma: foraDeForma,
  registro: { nome_varridos: nomesRegisto.length, com_aplicacao: Object.keys(registos).sort(), descartados, registos },
  painel: { pen_do_painel: penDoPainel, pen_do_paragrafo_15: penDo15, linhas_lidas: itens.length },
  rm_13: { do_produtor: rmDoProdutor, lidas_aqui: rmLinhas.length, abertas_pelo_produtor: rmAbertasDoProdutor, censo_falhou: censoFalhou },
  contador_do_ledger: { linhas_pen: linhasDoProdutor, ids_unicos: idsUnicosDoProdutor },
  vocabulario_de_ok_usado: vocabOk,
  vocabulario_de_acao_nomeada: {
    definidas: ACAO_NOMEADA.map(([n]) => n),
    celulas_lidas: itens.length,
    sem_familia_de_ok: semFamilia.length,
    uso_no_corpus: usoAcaoNoCorpus,
    uso_na_classe_sem_familia_de_ok: usoAcaoNaClasseSemFamilia,
    uso_nos_fixtures: usoAcaoNosFixtures,
    fixtures_que_falham: fixturesDeAcaoQueFalham,
    controlo_negativo: { frase: CONTROLO_NEGATIVO_DE_FAMILIA, familias_que_disparam: familiasQueDisparamNoControloNegativo },
    faces_da_classe_sem_familia_de_ok: facesDaClasseSemFamilia,
    particao_das_quatro_faces: particaoDasQuatroFaces,
  },
  fixtures: { definidas: FIXTURES.length, disparados, falhas: fixturesFalham },
  abertas_com_registo: abertasComRegisto,
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
  o_que_prova: ['que o ledger tem N linhas PEN de cinco celulas e em que classe cada celula cai pelo sinal mais recente, com a posicao e a data desse sinal', 'quais dessas linhas tem registo de aplicacao no banco em disco e com que frase de OK', 'que as tres contagens de pendencias (painel, paragrafo 15, linhas lidas) batem ou divergem', `que o classificador dispara em todas as ${FIXTURES.length} formas postas em fixture`, `que cada um dos ${IDIOMAS.length} idioms tem uso medido no corpus ou em fixture`, `que a janela de ${JANELA_FECHO} caracteres entre a palavra de fecho e a data cobre o maior intervalo medido no corpus (${intervalosCorpus.maior_intervalo}) e que tem fixture acima dela (${intervalosFixtures.maior_intervalo}) para nao virar ramo morto`, `que a janela de ${JANELA_ADENDO} caracteres entre a marca de data do adendo e a palavra de fecho cobre o maior intervalo medido no corpus (${adendoCorpus.maior_intervalo}) e que tem fixture acima dela (${adendoFixtures.maior_intervalo})`, `que das ${itens.length} celulas lidas ${semFamilia.length} nao dizem nenhuma das quatro familias de OK, e que dessas ${facesDaClasseSemFamilia.com_acao_nomeada.length} nomeiam na sua propria prosa um passo que nao e meu e ${facesDaClasseSemFamilia.sem_passo_nomeado.length} nao nomeiam passo nenhum, com as duas listas impressas mesmo vazias`, `que cada uma das ${ACAO_NOMEADA.length} familias de accao nomeada dispara no fixture que lhe foi posto e que nenhuma delas dispara no controlo negativo`],
  o_que_NAO_prova: ['que a classe do ledger seja o estado vivo do produto: a fonte e prosa versionada, nao o ar', 'que o OK exigido por cada linha seja suficiente: a coluna e a assinatura lexical do texto, a frase concreta pertence ao utilizador', 'que as linhas RM-x.y abertas estejam bem ou mal: o censo so conta e classifica por sinais do texto', 'que uma celula SEM_DECLARACAO esteja fechada ou aberta: diz so que o texto nao declara estado em nenhum dos idioms medidos', 'que um fecho declarado no texto seja verdadeiro: a regua reconhece a forma «palavra de fecho + data» e a forma «adendo com a data antes da palavra», mas nao confere a corrida citada — foi assim que a PEN-36 pôde declarar as duas metades fechadas enquanto o ar publicado mantinha cinco rotulos com dois ou mais usos, dos sete nomes listados em 17/11 (medido por scripts/p134-rotulos-da-secretaria-no-ar.mjs)', `que o intervalo entre a palavra e a data esteja dentro da janela numa forma de escrita nova: acima de ${JANELA_FECHO} caracteres, com a data depois da palavra, ou acima de ${JANELA_ADENDO} caracteres de pura pontuacao, com a data antes dela, a data passa a nao contar, e os portoes das duas janelas sao o que da o aviso`, 'que a etiqueta nenhum_familia_de_ok_lida signifique que a linha se fecha por leitura: ela diz so que nenhuma das quatro familias de OK casou no texto. O passo que a celula nomeia esta publicado em vocabulario_de_acao_nomeada.faces_da_classe_sem_familia_de_ok.com_acao_nomeada; e uma celula que nao aparece em nenhuma das duas listas nao prova que nada falte — prova que a prosa do ledger nao o disse, que e um defeito de descricao e nao de regua'],
};
saida.veredito = (falhas.length ? 'P133_INVENTARIO_VERMELHO ' : 'P133_INVENTARIO_MEDIDO ') + portoes.length + '/' + falhas.length + ' · esperanca=medir';
fs.writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const p of falhas) console.log('FALHA', p.nome, '| obtido', JSON.stringify(p.obtido), '| esperado', JSON.stringify(p.esperado));
console.log(saida.veredito, '· classes', JSON.stringify(contagem), '· abertas', saida.abertas.length, '· com registo', saida.registro.com_aplicacao.length, '· painel', penDoPainel + '/' + penDo15 + '/' + itens.length, '· rm', rmDoProdutor + '/' + rmLinhas.length + '/' + rmAbertasDoProdutor);
console.log('ABERTAS:', saida.abertas.map((a) => a.id + '[' + a.pri + ']').join(' '));
console.log('FACES_DA_CLASSE_SEM_FAMILIA_DE_OK', JSON.stringify(saida.vocabulario_de_acao_nomeada.faces_da_classe_sem_familia_de_ok));
console.log('USO_NA_CLASSE', JSON.stringify(saida.vocabulario_de_acao_nomeada.uso_na_classe_sem_familia_de_ok));
console.log('PARTICAO', JSON.stringify(Object.fromEntries(Object.entries(saida.vocabulario_de_acao_nomeada.particao_das_quatro_faces).map(([k, v]) => [k, v.length]))));
console.log('registo em ' + OUT);
process.exit(falhas.length ? 1 : 0);
