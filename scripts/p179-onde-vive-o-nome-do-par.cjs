// Onde vive o nome do par comparado: no ficheiro ou dentro do registo?
// Uso: node scripts/p179-onde-vive-o-nome-do-par.cjs <sufixoA> <sufixoB> [--raiz <repo>] [--captura <caminho>] [--selfteste]
// O predicado de localizacao conta UMA posicao por ocorrencia (regra do SM.65), nunca a primeira.
// As tres classes (do_par / so_de_um_sufixo / fora_da_familia) imprimem-se mesmo quando vazias (regra do SM.33):
// um portao que proibe uma classe legitima e o mesmo defeito de um ramo sem positivo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const sufixoA = argv[0];
const sufixoB = argv[1];
if (!sufixoA || !sufixoB || sufixoA.startsWith('--')) throw new Error('ABORTA: passe os dois sufixos de ronda');
let raiz = null;
let captura = null;
let selfteste = false;
for (let i = 2; i < argv.length; i++) {
  const t = argv[i];
  if (t === '--raiz') raiz = argv[++i];
  else if (t === '--captura') captura = argv[++i];
  else if (t === '--selfteste') selfteste = true;
  else throw new Error('ABORTA: argumento nao reconhecido -- ' + t);
}

const eu = fs.readFileSync(__filename, 'utf8');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };

const agulhaA = '-' + sufixoA;
const agulhaB = '-' + sufixoB;
const FAMILIA = 'p170-';

function posicoes(texto, agulha) {
  const out = [];
  if (agulha.length === 0) return out;
  let i = texto.indexOf(agulha);
  while (i >= 0) {
    out.push(i);
    i = texto.indexOf(agulha, i + agulha.length);
  }
  return out;
}

// Uma linha por ficheiro varrido: classe por extensao, se o nome traz os dois sufixos, e onde os sufixos aparecem no miudo.
function linhaDoFicheiro(nome, miudo) {
  const tipo = nome.endsWith('.json') ? 'registo' : nome.endsWith('.txt') ? 'log' : 'sem_classe';
  const noNome = { a: posicoes(nome, agulhaA).length, b: posicoes(nome, agulhaB).length };
  const noMiudo = { a: posicoes(miudo, agulhaA), b: posicoes(miudo, agulhaB) };
  return {
    ficheiro: nome, tipo, do_par: noNome.a >= 1 && noNome.b >= 1, bytes: Buffer.byteLength(miudo, 'utf8'),
    no_nome: noNome, posicoes_no_miudo: noMiudo,
    no_miudo: { a: noMiudo.a.length, b: noMiudo.b.length },
  };
}

// Predicado puro dos seis portoes, chamavel por fixture com linhas sinteticas.
function portoesDe(linhas) {
  const doPar = linhas.filter((f) => f.do_par);
  const soUm = linhas.filter((f) => !f.do_par);
  const registos = doPar.filter((f) => f.tipo === 'registo');
  const logs = doPar.filter((f) => f.tipo === 'log');
  const semClasse = doPar.filter((f) => f.tipo === 'sem_classe');
  const comParDentro = (f) => f.no_miudo.a > 0 || f.no_miudo.b > 0;
  const ps = [];
  const chk = (nome, verde, valor) => ps.push({ portao: nome, verde: !!verde, valor });
  chk('portao_1_a_classe_do_par_nao_esta_vazia', doPar.length > 0, { do_par: doPar.length, so_um_sufixo: soUm.length, lista_so_um: soUm.map((f) => f.ficheiro) });
  chk('portao_2_a_soma_das_tres_classes_bate_com_o_do_par', registos.length + logs.length + semClasse.length === doPar.length,
    { registos: registos.length, logs: logs.length, sem_classe: semClasse.length, do_par: doPar.length });
  chk('portao_3_os_logs_do_par_nomeiam_o_par_dentro_do_miudo', logs.length > 0 && logs.every(comParDentro),
    { logs: logs.length, com_par_dentro: logs.filter(comParDentro).map((f) => f.ficheiro), sem_par: logs.filter((f) => !comParDentro(f)).map((f) => f.ficheiro) });
  chk('portao_4_os_registos_do_par_nao_nomeiam_o_par_dentro_do_miudo', registos.every((f) => !comParDentro(f)),
    { registos: registos.length, com_par_dentro: registos.filter(comParDentro).map((f) => f.ficheiro) });
  chk('portao_5_nenhum_ficheiro_do_par_fica_sem_classe', semClasse.length === 0, semClasse.map((f) => f.ficheiro));
  return ps;
}

function fixtures() {
  const cs = [];
  const caso = (nome, esperado, obtido) => cs.push({ nome, esperado, obtido, bate: esperado === obtido });
  const positivo = JSON.stringify({ ronda_a: agulhaA, ronda_b: agulhaB });
  caso('positivo_miudo_que_nomeia_o_par_da_uma_posicao_por_sufixo', 1, posicoes(positivo, agulhaA).length);
  caso('positivo_miudo_que_nomeia_o_par_b_da_uma_posicao', 1, posicoes(positivo, agulhaB).length);
  caso('negativo_miudo_sem_o_par_da_zero', 0, posicoes('{"em":"2026-01-01T00:00:00.000Z"}', agulhaA).length + posicoes('{"em":"2026-01-01T00:00:00.000Z"}', agulhaB).length);
  caso('negativo_agulha_repetida_da_as_tres_posicoes', 3, posicoes(JSON.stringify({ x: agulhaA, y: agulhaA, z: agulhaA }), agulhaA).length);
  caso('negativo_sufixo_sem_traco_nao_casa', 0, posicoes(JSON.stringify({ x: 'zz' + sufixoA }), agulhaA).length);
  const nomePar = 'p170-' + sufixoA + '-' + sufixoB + '-x.json';
  const nomeLog = 'p170-' + sufixoA + '-' + sufixoB + '-x.txt';
  // As duas faces dos portoes 3 e 4, cada uma com o ramo vermelho provado em dado sintetico.
  const registoComPar = [linhaDoFicheiro(nomePar, positivo), linhaDoFicheiro(nomeLog, 'a=' + agulhaA + ' b=' + agulhaB)];
  const registoSemPar = [linhaDoFicheiro(nomePar, '{"em":"t"}'), linhaDoFicheiro(nomeLog, 'a=' + agulhaA + ' b=' + agulhaB)];
  const logSemPar = [linhaDoFicheiro(nomePar, '{"em":"t"}'), linhaDoFicheiro(nomeLog, '{"em":"t"}')];
  const g = (ps, n) => (ps.find((p) => p.portao === n) || {}).verde;
  caso('positivo_portao_4_chumba_registo_que_nomeia_o_par', false, g(portoesDe(registoComPar), 'portao_4_os_registos_do_par_nao_nomeiam_o_par_dentro_do_miudo'));
  caso('positivo_portao_4_passa_registo_sem_o_par', true, g(portoesDe(registoSemPar), 'portao_4_os_registos_do_par_nao_nomeiam_o_par_dentro_do_miudo'));
  caso('positivo_portao_3_chumba_log_sem_o_par', false, g(portoesDe(logSemPar), 'portao_3_os_logs_do_par_nomeiam_o_par_dentro_do_miudo'));
  caso('negativo_ficheiro_so_de_um_sufixo_fica_fora_da_regua_do_par', 1, portoesDe([linhaDoFicheiro('p170-' + sufixoA + '-zz.json', '{}'), linhaDoFicheiro(nomePar, positivo)])[0].valor.do_par);
  caso('negativo_classe_so_um_sufixo_e_lista_na_classe_do_portao_1', 1, (portoesDe([linhaDoFicheiro('p170-' + sufixoA + '-zz.json', '{}'), linhaDoFicheiro(nomePar, positivo)])[0].valor.lista_so_um || []).length);
  caso('positivo_classe_sem_extensao_chumba_o_portao_5', false, g(portoesDe([linhaDoFicheiro('p170-' + sufixoA + '-' + sufixoB + '-x', '{}')]), 'portao_5_nenhum_ficheiro_do_par_fica_sem_classe'));
  return cs;
}

if (selfteste) {
  const cs = fixtures();
  for (const c of cs) say('  FIXTURE ' + c.nome + ' esperado=' + JSON.stringify(c.esperado) + ' obtido=' + JSON.stringify(c.obtido) + ' bate=' + c.bate);
  const maus = cs.filter((c) => !c.bate);
  say('VEREDICTO ' + (maus.length === 0 ? 'P179_SELFTESTE_OK ' + cs.length + ' casos' : 'P179_SELFTESTE_VERMELHO ' + maus.length + '/' + cs.length));
  if (captura) {
    if (fs.existsSync(captura)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + captura);
    fs.writeFileSync(captura, JSON.stringify({ modo: 'selfteste', em: new Date().toISOString(), emissor_md5: md5(eu), casos: cs, stdout: capt }, null, 1), 'utf8');
  }
  if (maus.length > 0) process.exitCode = 1;
  return;
}

raiz = raiz || execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const dir = path.join(raiz, 'evidence');
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('ABORTA: nao ha evidence/ em ' + raiz);

const nomesComUm = fs.readdirSync(dir).filter((n) => n.indexOf(agulhaA) >= 0 || n.indexOf(agulhaB) >= 0);
const daFamilia = nomesComUm.filter((n) => n.startsWith(FAMILIA));
const foraDaFamilia = nomesComUm.filter((n) => !n.startsWith(FAMILIA));
const linhas = daFamilia.map((n) => linhaDoFicheiro(n, fs.readFileSync(path.join(dir, n), 'utf8')));

say('emissor_bytes=' + Buffer.byteLength(eu, 'utf8') + ' emissor_md5=' + md5(eu));
say('sufixos=' + sufixoA + '/' + sufixoB + ' agulhas=' + agulhaA + '+' + agulhaB + ' familia=' + FAMILIA);
say('CLASSE nomes_com_um_sufixo=' + nomesComUm.length + ' da_familia=' + daFamilia.length + ' fora_da_familia=' + foraDaFamilia.length + ' do_par=' + linhas.filter((f) => f.do_par).length + ' so_um_sufixo=' + linhas.filter((f) => !f.do_par).length);
say('FORA_DA_FAMILIA ' + JSON.stringify(foraDaFamilia));
say('SO_UM_SUFIXO ' + JSON.stringify(linhas.filter((f) => !f.do_par).map((f) => f.ficheiro)));
for (const f of linhas) {
  if (!f.do_par) continue;
  say('FICHEIRO tipo=' + f.tipo + ' bytes=' + f.bytes + ' no_nome=' + f.no_nome.a + '+' + f.no_nome.b + ' no_miudo=' + f.no_miudo.a + '+' + f.no_miudo.b +
    ' posicoes_miudo_a=' + JSON.stringify(f.posicoes_no_miudo.a) + ' posicoes_miudo_b=' + JSON.stringify(f.posicoes_no_miudo.b) + ' evidence/' + f.ficheiro);
}

const cs = fixtures();
for (const c of cs) say('  FIXTURE ' + c.nome + ' esperado=' + JSON.stringify(c.esperado) + ' obtido=' + JSON.stringify(c.obtido) + ' bate=' + c.bate);
const ps = portoesDe(linhas);
const vermelhos = ps.filter((p) => !p.verde);
for (const p of ps) say('PORTAO ' + p.portao + ' = ' + (p.verde ? 'VERDE' : 'VERMELHO') + ' ' + JSON.stringify(p.valor));
const maus = cs.filter((c) => !c.bate);
const veredicto = vermelhos.length === 0 && maus.length === 0
  ? 'P179_OK ' + ps.length + '/0 · ' + linhas.filter((f) => f.do_par).length + ' ficheiros do par ' + sufixoA + '-' + sufixoB + ' · ' + cs.length + ' fixtures'
  : 'P179_VERMELHO ' + (vermelhos.length + maus.length) + '/' + (ps.length + cs.length);
say('VEREDICTO ' + veredicto);
say('o_que_NAO_prova: que o registo do p170 devesse nomear o par (escolha de quem escreve o registo), nem que as posicoes contadas sejam o par certo -- so contam a agulha construida dos dois sufixos passados na linha de comando, e so dentro de evidence/.');

if (!captura) throw new Error('ABORTA: a corrida de medida exige --captura, para nao sobrescrever um registo');
if (fs.existsSync(captura)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + captura);
fs.writeFileSync(captura, JSON.stringify({
  modo: 'medida', em: new Date().toISOString(), sufixo_a: sufixoA, sufixo_b: sufixoB,
  emissor_md5: md5(eu), emissor_bytes: Buffer.byteLength(eu, 'utf8'),
  agulha_a: agulhaA, agulha_b: agulhaB, familia: FAMILIA,
  classes: { nomes_com_um_sufixo: nomesComUm.length, da_familia: daFamilia.length, fora_da_familia: foraDaFamilia.length, do_par: linhas.filter((f) => f.do_par).length, so_um_sufixo: linhas.filter((f) => !f.do_par).length },
  fora_da_familia: foraDaFamilia, so_um_sufixo: linhas.filter((f) => !f.do_par).map((f) => f.ficheiro),
  ficheiros: linhas, fixtures: cs, portoes: ps, veredicto, stdout: capt,
}, null, 1), 'utf8');
say('CAPTURA ' + captura);
if (vermelhos.length > 0 || maus.length > 0) process.exitCode = 1;
