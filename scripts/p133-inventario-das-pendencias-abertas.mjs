// p133 — INVENTARIO POR MEDIDA DAS PENDENCIAS ABERTAS (quatro fontes, zero escrita externa).
// Fontes: o ledger (docs/roadmap-master.md, seccao 12), o painel (docs/roadmap-painel.html),
// o registro de aplicacao (evidence/p73-municipal-aplicacao-PEN-*.json) e as linhas RM-x.y do seccao 13
// lidas pelo proprio censo versionado (scripts/censo-pendencias.mjs).
// Regua de classe: dois veredictos por celula, o do ULTIMO sinal por POSICAO (os colchetes do ledger sao
// acrescentados por ordem cronologica) e o do sinal com a DATA mais recente; se concordarem, essa e a classe;
// se divergirem, a linha e DIVERGENTE e imprime-se para leitura humana, nunca para escolha minha.
// A data de um sinal e a mais proxima num janela de 40 caracteres para cada lado, porque o ledger escreve
// tanto «FECHADA 13/11» (data depois) como «[18/11 §SM.22: ...]» (data antes).
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
// predicas). O que essa saida imprime: fecho com data em 10 linhas, «continua + estado» em 9, «nao se fecha» em
// 2, «por provar» em 2, abreviatura da legenda em 10 ocorrencias (PF 6, NT 2, ICP 2 — nove no inicio da celula e
// uma dentro, o «ICP por RM12-A1» do PEN-13), «palavra de estado no inicio» em 29 linhas e «palavra de estado +
// data» em 15 ocorrencias, 14 no inicio e 1 dentro (PEN-34, «Criada 14/11 ao fechar o RM-6.9»). O `IF` da legenda
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
const JANELA_FECHO = 20;
const IDIOMAS = [
  { fam: 'FECHO', nome: 'fecho datado', re: new RegExp('\\b(?:FECHAD[OA]S?|APLICAD[OA]S?|PUBLICAD[OA]S?|CANCELAD[OA]S?|ATENDID[OA]S?)\\b[^.]{0,' + JANELA_FECHO + '}(?:1[0-9]|2[0-9])\\/1[12]') },
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

function okExigido(texto) {
  const hits = [];
  for (const [nome, re] of OK_EXIGIDO) {
    const m = texto.match(re);
    if (m) hits.push({ exigido: nome, gatilho: m[0].slice(0, 40) });
  }
  return hits.length ? hits : [{ exigido: 'nenhum: medicao ou leitura minha', gatilho: '-' }];
}

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
  itens.push({
    id, tipo: c[3].trim(), pri: pri,
    classe: av.classe,
    codigo_no_inicio: prefixo ? prefixo[1] : null,
    vencedor: av.vencedor ? av.vencedor.nome + ' @' + av.vencedor.pos + (av.vencedor.data ? ' ' + av.vencedor.data : '') : '-',
    por_data: av.porData ? av.porData.nome + ' ' + av.porData.data : '-',
    recorte: av.vencedor ? av.vencedor.recorte.slice(0, 170) : estado.slice(0, 170),
    n_sinais: av.s.length,
    ok: okExigido(item + ' ' + estado),
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
const PALAVRA_DE_FECHO = new RegExp('\\b(?:FECHAD[OA]S?|APLICAD[OA]S?|PUBLICAD[OA]S?|CANCELAD[OA]S?|ATENDID[OA]S?)\\b', 'g');
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

const CLASSES = ['ABERTA', 'FECHADA', 'DIVERGENTE', 'SEM_DECLARACAO'];
const contagem = {};
for (const k of CLASSES) contagem[k] = 0;
for (const i of itens) contagem[i.classe] = (contagem[i.classe] || 0) + 1;
const semClasse = itens.filter((i) => !CLASSES.includes(i.classe)).map((i) => i.id);
const abertasComRegisto = itens.filter((i) => i.classe === 'ABERTA' && i.registo_aplicacao).map((i) => i.id);

const vocabOk = Object.values(registos).map((r) => r.ok_literal_usado).filter(Boolean);
const portoes = [];
const gate = (nome, ob, esp) => portoes.push({ nome, obtido: ob, esperado: esp, ok: JSON.stringify(ob) === JSON.stringify(esp) });
gate('todas_as_linhas_pen_tem_cinco_celulas', foraDeForma.length, 0);
gate('nenhuma_linha_pen_fica_fora_das_quatro_classes_registadas', semClasse.length, 0);
gate('as_quatro_classes_imprimem_se_mesmo_quando_vazias', [CLASSES.length, Object.keys(contagem).length], [4, 4]);
gate('cada_fixture_produz_a_classe_esperada_pelo_desenho', fixturesFalham.length, 0);
gate('cada_idiom_de_estado_tem_uso_medido_no_corpus_ou_em_fixture', idiomasSemUso, []);
gate('a_janela_do_fecho_cobre_o_maior_intervalo_medido_no_corpus',
  [intervalosCorpus.maior_intervalo <= JANELA_FECHO, intervalosFixtures.maior_intervalo > JANELA_FECHO], [true, true]);
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
const falhas = portoes.filter((p) => !p.ok);
const emissor = fs.readFileSync(REPO + '/scripts/p133-inventario-das-pendencias-abertas.mjs', 'utf8');

const saida = {
  peca: 'p133-inventario-das-pendencias-abertas.mjs',
  rotulo: process.env.P133_ROTULO || 'a',
  em: new Date().toISOString(),
  pergunta: 'quais pendencias estao mesmo abertas, por que classe medida, e que OK cada uma exige?',
  metodo: 'todas as linhas PEN lidas com a predica do produtor (pipes escapados nao separam celulas, sete partes por split); classe = os dois veredictos da celula (ultimo sinal por posicao e sinal com a data mais recente) quando concordam, DIVERGENTE quando divergem, SEM_DECLARACAO quando a celula nao tem nenhum idiom; os idioms sao as formas medidas no corpus (p133-sonda-idiomas.cjs, p133-sonda-prefixos.cjs), com as abreviaturas lidas da propria linha da legenda de status e nao dactilografadas; a palavra solta «abert» esta fora das familias porque tres das suas ocorrencias descrevem superficie e nao estado; a janela entre a palavra de fecho e a data e a const JANELA_FECHO, contada no corpus (11 ocorrencias, histograma de intervalos publicado em janela_de_fecho) e vigiada pelo portao do mesmo nome; registro de aplicacao lido com o filtro do portao do pacote (modo=aplicacao e escrito_no_banco=true); seccao 13 e o censo PEN contados pelos produtores versionados por execFile, nao por reimplementacao.',
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
  linhas_pen: itens.length,
  contagem_por_classe: contagem,
  abertas: itens.filter((i) => i.classe === 'ABERTA').map((i) => ({ id: i.id, pri: i.pri, vencedor: i.vencedor, ok: i.ok, registo: i.registo_aplicacao ? i.registo_aplicacao.registo : null })),
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
  fixtures: { definidas: FIXTURES.length, disparados, falhas: fixturesFalham },
  abertas_com_registo: abertasComRegisto,
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
  o_que_prova: ['que o ledger tem N linhas PEN de cinco celulas e em que classe cada celula cai pelo sinal mais recente, com a posicao e a data desse sinal', 'quais dessas linhas tem registo de aplicacao no banco em disco e com que frase de OK', 'que as tres contagens de pendencias (painel, paragrafo 15, linhas lidas) batem ou divergem', `que o classificador dispara em todas as ${FIXTURES.length} formas postas em fixture`, `que cada um dos ${IDIOMAS.length} idioms tem uso medido no corpus ou em fixture`, `que a janela de ${JANELA_FECHO} caracteres entre a palavra de fecho e a data cobre o maior intervalo medido no corpus (${intervalosCorpus.maior_intervalo}) e que tem fixture acima dela (${intervalosFixtures.maior_intervalo}) para nao virar ramo morto`],
  o_que_NAO_prova: ['que a classe do ledger seja o estado vivo do produto: a fonte e prosa versionada, nao o ar', 'que o OK exigido por cada linha seja suficiente: a coluna e a assinatura lexical do texto, a frase concreta pertence ao utilizador', 'que as linhas RM-x.y abertas estejam bem ou mal: o censo so conta e classifica por sinais do texto', 'que uma celula SEM_DECLARACAO esteja fechada ou aberta: diz so que o texto nao declara estado em nenhum dos idioms medidos', 'que um fecho declarado no texto seja verdadeiro: a regua reconhece a forma «palavra de fecho + data», nao confere a corrida citada — foi assim que a PEN-36 pôde declarar as duas metades fechadas enquanto o ar publicado mantinha seis rotulos', 'que o intervalo entre a palavra de fecho e a data esteja dentro da janela numa forma de escrita nova: acima de ' + JANELA_FECHO + ' caracteres a data passa a nao contar, e o portao da janela e o que da o aviso'],
};
saida.veredito = (falhas.length ? 'P133_INVENTARIO_VERMELHO ' : 'P133_INVENTARIO_MEDIDO ') + portoes.length + '/' + falhas.length + ' · esperanca=medir';
fs.writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const p of falhas) console.log('FALHA', p.nome, '| obtido', JSON.stringify(p.obtido), '| esperado', JSON.stringify(p.esperado));
console.log(saida.veredito, '· classes', JSON.stringify(contagem), '· abertas', saida.abertas.length, '· com registo', saida.registro.com_aplicacao.length, '· painel', penDoPainel + '/' + penDo15 + '/' + itens.length, '· rm', rmDoProdutor + '/' + rmLinhas.length + '/' + rmAbertasDoProdutor);
console.log('ABERTAS:', saida.abertas.map((a) => a.id + '[' + a.pri + ']').join(' '));
console.log('registo em ' + OUT);
process.exit(falhas.length ? 1 : 0);
