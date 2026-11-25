// Conferencia de DUAS corridas dos mesmos registos de portao: o que diverge e carimbo de corrida, espelho da outra
// ronda, ou grandeza medida? So a terceira classe precisa de declaracao, e a declaracao e vigiada nos dois sentidos.
// Uso: node scripts/p170-conferencia-de-duas-corridas.mjs <sufixoA> <sufixoB> [--tolerada p125/contagens.no_indice] [--causa p125/contagens.no_indice] [--captura <caminho>]
//      node scripts/p170-conferencia-de-duas-corridas.mjs --fixtures
// Os nomes dos campos de carimbo sao lidos da fonte do produtor; a pieza aborta se nao os ler.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NL = String.fromCharCode(10);
const TAB = String.fromCharCode(9);
const DIGITOS = '0123456789';
const LETRAS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const MARCA_DE_SELO = 'new Date().toISOString()';

function argvPara() {
  const out = { toleradas: [], causa: null, raiz: null, sufixoA: null, sufixoB: null, captura: null, fixtures: false };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === '--fixtures') out.fixtures = true;
    else if (t === '--tolerada') out.toleradas.push(a[++i]);
    else if (t === '--causa') out.causa = a[++i];
    else if (t === '--raiz') out.raiz = a[++i];
    else if (t === '--captura') out.captura = a[++i];
    else if (t.indexOf('-') !== 0 && !out.sufixoA) out.sufixoA = t;
    else if (t.indexOf('-') !== 0 && !out.sufixoB) out.sufixoB = t;
    else throw new Error('ABORTA: argumento nao entendido -- ' + t);
  }
  return out;
}

function eDigitos(s) {
  return s.length > 0 && [...s].every((c) => DIGITOS.includes(c));
}

// p125-portadores-fora-do-indice-21-11-sm56d.json -> { id: '125', sufixo: 'sm56d' }
function interpretarNome(n) {
  if (!n.endsWith('.json')) return null;
  const semExtensao = n.slice(0, n.length - 5);
  const partes = semExtensao.split('-');
  if (partes[0].length < 2 || partes[0][0] !== 'p') return null;
  if (!eDigitos(partes[0].slice(1))) return null;
  const sufixo = partes[partes.length - 1];
  if (sufixosImpossiveis(sufixo)) return null;
  return { id: partes[0].slice(1), sufixo: sufixo, nome: n };
}
function sufixosImpossiveis(s) {
  if (s.length === 0) return true;
  const primeiro = s[0];
  const ehLetra = LETRAS.indexOf(primeiro.toLowerCase()) >= 0 && primeiro === primeiro.toLowerCase();
  return !ehLetra;
}

function folhasDe(obj, prefixo, mapa) {
  if (obj !== null && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => folhasDe(v, prefixo + '[' + i + ']', mapa));
      return mapa;
    }
    for (const k of Object.keys(obj)) folhasDe(obj[k], prefixo === '' ? k : prefixo + '.' + k, mapa);
    return mapa;
  }
  mapa.set(prefixo, obj);
  return mapa;
}

function chaveDaFolha(folha) {
  let k = folha;
  const colchete = k.indexOf('[');
  if (colchete >= 0) k = k.slice(0, colchete);
  const ponto = k.lastIndexOf('.');
  return ponto >= 0 ? k.slice(ponto + 1) : k;
}

function ehSeloIso(s) {
  if (typeof s !== 'string') return false;
  return s.length === 24 && s[10] === 'T' && s[23] === 'Z' && s[4] === '-' && s[7] === '-' && !Number.isNaN(Date.parse(s));
}

function ehCharDeIdentificador(c) {
  return LETRAS.indexOf(c) >= 0 || DIGITOS.indexOf(c) >= 0;
}

// A chave que governa cada ocorrencia do selo: a mais proxima que aparece antes dela na mesma linha.
function chaveAntesDoSelo(antes) {
  let j = antes.length;
  while (j > 0 && (antes[j - 1] === ' ' || antes[j - 1] === TAB)) j -= 1;
  if (j === 0 || antes[j - 1] !== ':') return null;
  let ini = j - 1;
  while (ini > 0 && ehCharDeIdentificador(antes[ini - 1])) ini -= 1;
  if (ini === j - 1) return null;
  const nome = antes.slice(ini, j - 1);
  return LETRAS.indexOf(nome[0]) >= 0 ? nome : null;
}

// Nomes de campo de carimbo lidos da fonte do produtor, sem dactilografar nada.
function carimbosDoFonte(texto) {
  const nomes = new Set();
  for (const linha of texto.split(NL)) {
    let pos = 0;
    while (true) {
      const i = linha.indexOf(MARCA_DE_SELO, pos);
      if (i < 0) break;
      const nome = chaveAntesDoSelo(linha.slice(0, i));
      if (nome) nomes.add(nome);
      pos = i + MARCA_DE_SELO.length;
    }
  }
  return nomes;
}

function classifica(folha, va, vb, carimbos, selosDasRondas, sufixoA, sufixoB) {
  const chave = chaveDaFolha(folha);
  const doisSaoSelos = ehSeloIso(va) && ehSeloIso(vb);
  if (folha === chave && carimbos.has(chave) && doisSaoSelos) return 'carimbo_de_corrida';
  const espelho = (s) => typeof s === 'string' && (
    s.indexOf('-' + sufixoA) >= 0 || s.indexOf('-' + sufixoB) >= 0 || selosDasRondas.has(s));
  if (espelho(va) && espelho(vb)) return 'espelho_da_ronda';
  return 'grandeza_medida';
}

// Predicado puro da causa: o crescimento do denominador do indice igual ao numero de registos da ronda A ja no indice.
function causaDoDelta(delta, caminhosDoIndice, sufixoA) {
  const daA = caminhosDoIndice.filter((c) => c.indexOf('-' + sufixoA) >= 0).sort();
  return { delta: delta, registos_a_no_indice: daA.length, lista: daA, bate: delta === daA.length };
}

function compararPar(id, nomeA, regA, nomeB, regB, opts, carimbos, selos) {
  if (carimbos.size === 0) {
    throw new Error('ABORTA: p' + id + ' -- o produtor nao declara nenhum campo de carimbo, pelo que nenhum zero desta pieza seria medida');
  }
  const fa = folhasDe(regA, '', new Map());
  const fb = folhasDe(regB, '', new Map());
  const uniao = new Set([...fa.keys(), ...fb.keys()]);
  const soEmA = [];
  const soEmB = [];
  const divergentes = [];
  for (const k of [...uniao].sort()) {
    const temA = fa.has(k);
    const temB = fb.has(k);
    if (temA && !temB) { soEmA.push(k); continue; }
    if (!temA && temB) { soEmB.push(k); continue; }
    const va = fa.get(k);
    const vb = fb.get(k);
    if (va === vb) continue;
    divergentes.push({ folha: k, classe: classifica(k, va, vb, carimbos, selos, opts.sufixoA, opts.sufixoB), a: va, b: vb });
  }
  const porClasse = { carimbo_de_corrida: 0, espelho_da_ronda: 0, grandeza_medida: 0 };
  for (const d of divergentes) porClasse[d.classe] += 1;
  return {
    id: 'p' + id, caminho_a: nomeA, caminho_b: nomeB,
    folhas_a: fa.size, folhas_b: fb.size, uniao_de_folhas: uniao.size,
    so_em_a: soEmA, so_em_b: soEmB, divergentes: divergentes.length, por_classe: porClasse,
    lista: divergentes, carimbos_lidos_do_produtor: [...carimbos].sort(),
  };
}

function portoes(res, opts) {
  const saida = [];
  const chk = (nome, verde, valor) => saida.push({ portao: nome, verde: !!verde, valor: valor });
  const pares = res.pares;
  const grandezas = [];
  for (const p of pares) for (const d of p.lista) if (d.classe === 'grandeza_medida') grandezas.push(p.id + '/' + d.folha);
  const naoDeclaradas = grandezas.filter((g) => !opts.toleradas.includes(g));
  const declaradasQueNaoDivergiram = opts.toleradas.filter((g) => !grandezas.includes(g));
  const foraDasClasses = [];
  for (const p of pares) {
    for (const d of p.lista) {
      if (d.classe === 'carimbo_de_corrida' || d.classe === 'espelho_da_ronda') continue;
      if (d.classe === 'grandeza_medida' && opts.toleradas.includes(p.id + '/' + d.folha)) continue;
      foraDasClasses.push(p.id + '/' + d.folha);
    }
  }
  chk('portao_1_as_duas_rondas_teem_os_mesmos_numeros_de_peca',
    pares.length > 0 && pares.every((p) => p.caminho_a.indexOf('-' + opts.sufixoA) >= 0 && p.caminho_b.indexOf('-' + opts.sufixoB) >= 0),
    { pares: pares.length, sufixo_a: opts.sufixoA, sufixo_b: opts.sufixoB });
  chk('portao_2_cada_folha_tem_par_na_outra_ronda',
    pares.every((p) => p.so_em_a.length === 0 && p.so_em_b.length === 0),
    { so_em_a: pares.reduce((n, p) => n + p.so_em_a.length, 0), so_em_b: pares.reduce((n, p) => n + p.so_em_b.length, 0) });
  chk('portao_3_os_carimbos_foram_lidos_do_produtor',
    pares.every((p) => p.carimbos_lidos_do_produtor.length > 0),
    pares.map((p) => p.id + '=' + p.carimbos_lidos_do_produtor.join('+')).sort());
  chk('portao_4_todo_carimbo_de_corrida_e_selo_iso',
    pares.every((p) => p.lista.every((d) => d.classe !== 'carimbo_de_corrida' || (ehSeloIso(d.a) && ehSeloIso(d.b)))),
    { carimbos_divergentes: pares.reduce((n, p) => n + p.por_classe.carimbo_de_corrida, 0), sem_selo: foraDasClasses.length });
  chk('portao_5_nenhuma_grandeza_diverge_sem_declaracao', naoDeclaradas.length === 0, naoDeclaradas);
  chk('portao_6_nenhuma_grandeza_declarada_que_nao_divergiu', declaradasQueNaoDivergiram.length === 0, declaradasQueNaoDivergiram);
  chk('portao_7_a_causa_declarada_bate_por_contagem',
    opts.causa === null ? false : !!res.causa && res.causa.bate === true,
    res.causa ? { folha: res.causa.folha, delta: res.causa.delta, registos_a_no_indice: res.causa.registos_a_no_indice, bate: res.causa.bate } : 'nenhuma causa declarada');
  return saida;
}

function listarIndice(raiz) {
  return execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files'], { cwd: raiz, encoding: 'utf8' }).split(NL).filter(Boolean);
}

function medir(opts) {
  const raiz = opts.raiz || execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const nomes = readdirSync(raiz + '/evidence');
  const a = [];
  const b = [];
  for (const n of nomes) {
    const m = interpretarNome(n);
    if (!m) continue;
    if (m.sufixo === opts.sufixoA) a.push(m);
    else if (m.sufixo === opts.sufixoB) b.push(m);
  }
  if (a.length === 0 || b.length === 0) throw new Error('ABORTA: uma das rondas nao tem registos JSON -- a=' + a.length + ' b=' + b.length);
  const carregados = new Map();
  const selos = new Set();
  for (const m of [...a, ...b]) {
    const caminho = 'evidence/' + m.nome;
    const reg = JSON.parse(readFileSync(raiz + '/' + caminho, 'utf8'));
    if (ehSeloIso(reg.em)) selos.add(reg.em);
    carregados.set(caminho, reg);
  }
  const pares = [];
  for (const ma of a) {
    const mb = b.find((x) => x.id === ma.id);
    if (!mb) throw new Error('ABORTA: a ronda ' + opts.sufixoB + ' nao tem registo da peca p' + ma.id);
    const nomeA = 'evidence/' + ma.nome;
    const nomeB = 'evidence/' + mb.nome;
    const regA = carregados.get(nomeA);
    const regB = carregados.get(nomeB);
    const identidade = regA.programa || regA.peca;
    if (!identidade) throw new Error('ABORTA: ' + nomeA + ' -- o registo nao declara o produtor');
    const caminhoDoProdutor = identidade.indexOf('scripts/') === 0 ? raiz + '/' + identidade : raiz + '/scripts/' + identidade;
    if (!existsSync(caminhoDoProdutor)) throw new Error('ABORTA: o produtor declarado nao resolve em disco -- ' + identidade);
    const carimbos = carimbosDoFonte(readFileSync(caminhoDoProdutor, 'utf8'));
    pares.push(compararPar(ma.id, nomeA, regA, nomeB, regB, opts, carimbos, selos));
  }
  pares.sort((x, y) => Number(x.id) - Number(y.id));
  const res = { modo: 'medida', sufixo_a: opts.sufixoA, sufixo_b: opts.sufixoB, selos_iso_contados: selos.size, pares: pares, declaradas: opts.toleradas, causa: null, raiz: raiz };
  if (opts.causa) {
    const barra = opts.causa.indexOf('/');
    if (barra < 0) throw new Error('ABORTA: a causa declara-se como p<id>/<caminho-da-folha> -- ' + opts.causa);
    const alvoId = opts.causa.slice(0, barra);
    const alvoFolha = opts.causa.slice(barra + 1);
    const par = pares.find((p) => p.id === alvoId);
    const d = par ? par.lista.find((x) => x.folha === alvoFolha) : undefined;
    if (!d) throw new Error('ABORTA: a causa declarada nao esta entre as folhas divergentes dessa peca -- ' + opts.causa);
    if (d.classe !== 'grandeza_medida') throw new Error('ABORTA: a causa foi declarada sobre uma folha que nao e grandeza medida (' + d.classe + ') -- ' + opts.causa);
    if (typeof d.a !== 'number' || typeof d.b !== 'number') throw new Error('ABORTA: a causa so se mede sobre numeros -- ' + opts.causa);
    const c = causaDoDelta(d.b - d.a, listarIndice(raiz), opts.sufixoA);
    c.folha = opts.causa;
    c.de_a = d.a;
    c.para_b = d.b;
    res.causa = c;
  }
  res.portoes = portoes(res, opts);
  const vermelhos = res.portoes.filter((p) => !p.verde);
  res.vermelhos = vermelhos.map((p) => p.portao);
  res.veredicto = vermelhos.length === 0
    ? 'P170_CONFERENCIA_DE_DUAS_CORRIDAS_OK ' + res.portoes.length + '/0 · ' + pares.length + ' pares · ' + grandezasDe(res) + ' grandezas divergentes declaradas'
    : 'P170_VERMELHO ' + vermelhos.length + '/' + res.portoes.length;
  return res;
}

function grandezasDe(res) {
  let n = 0;
  for (const p of res.pares) for (const d of p.lista) if (d.classe === 'grandeza_medida') n += 1;
  return n;
}

function fixtures() {
  const casos = [];
  const ok = (nome, esperado, obtido) => casos.push({ nome: nome, esperado: esperado, obtido: obtido, bate: esperado === obtido });
  const opts = { sufixoA: 'xa', sufixoB: 'xb', toleradas: [] };
  const carimbos = new Set(['em']);
  const selos = new Set(['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z']);
  const A = { em: '2026-01-01T00:00:00.000Z', metodo: 'm', contagens: { no_indice: 10, lidos: 10 } };
  const B = { em: '2026-01-02T00:00:00.000Z', metodo: 'm', contagens: { no_indice: 10, lidos: 10 } };
  const p1 = compararPar(1, 'evidence/p1-r-xa.json', A, 'evidence/p1-r-xb.json', B, opts, carimbos, selos);
  ok('positivo_diverge_apenas_o_selo', 1, p1.divergentes);
  ok('positivo_o_selo_e_classe_carimbo', 'carimbo_de_corrida', p1.lista[0].classe);
  ok('positivo_uma_grandeza_de_zero', 0, p1.por_classe.grandeza_medida);
  const BA = { em: '2026-01-01T00:00:00.000Z', fontes: { registo: 'evidence/p9-r-xa.json', em: '2026-01-01T00:00:00.000Z' }, o_que_prova: ['x', 'bate com p9-r-xa.json'] };
  const BB = { em: '2026-01-02T00:00:00.000Z', fontes: { registo: 'evidence/p9-r-xb.json', em: '2026-01-02T00:00:00.000Z' }, o_que_prova: ['x', 'bate com p9-r-xb.json'] };
  const p2 = compararPar(2, 'evidence/p2-r-xa.json', BA, 'evidence/p2-r-xb.json', BB, opts, carimbos, selos);
  const classe = (f) => (p2.lista.find((d) => d.folha === f) || {}).classe;
  ok('positivo_o_caminho_do_par_e_espelho', 'espelho_da_ronda', classe('fontes.registo'));
  ok('positivo_o_selo_alheio_e_espelho', 'espelho_da_ronda', classe('fontes.em'));
  ok('positivo_a_prosa_que_nomeia_a_ronda_e_espelho', 'espelho_da_ronda', classe('o_que_prova[1]'));
  ok('positivo_zero_grandezas_no_espelho', 0, p2.por_classe.grandeza_medida);
  const CB = { em: '2026-01-02T00:00:00.000Z', metodo: 'm', contagens: { no_indice: 15, lidos: 10 } };
  const p3 = compararPar(3, 'evidence/p3-r-xa.json', A, 'evidence/p3-r-xb.json', CB, { sufixoA: 'xa', sufixoB: 'xb', toleradas: ['p3/contagens.no_indice'] }, carimbos, selos);
  ok('positivo_grandeza_declarada_diverge_uma', 1, p3.por_classe.grandeza_medida);
  const res3 = { pares: [p3], causa: causaDoDelta(5, ['evidence/p3-r-xa.json', 'a-xa', 'b-xa', 'c-xa', 'd-xa'], 'xa') };
  res3.causa.folha = 'p3/contagens.no_indice';
  const v3 = portoes(res3, { sufixoA: 'xa', sufixoB: 'xb', toleradas: ['p3/contagens.no_indice'], causa: 'p3/contagens.no_indice' });
  ok('positivo_os_sete_portoes_verdes_neste_par', 7, v3.filter((p) => p.verde).length);
  const v3m = portoes(res3, { sufixoA: 'xa', sufixoB: 'xb', toleradas: [], causa: 'p3/contagens.no_indice' });
  ok('negativo_grandeza_sem_declaracao_chumba_o_cinco', false, (v3m.find((p) => p.portao === 'portao_5_nenhuma_grandeza_diverge_sem_declaracao') || {}).verde);
  const v3d = portoes(res3, { sufixoA: 'xa', sufixoB: 'xb', toleradas: ['p3/contagens.outra'], causa: 'p3/contagens.no_indice' });
  ok('negativo_declaracao_que_nao_divergiu_chumba_o_seis', false, (v3d.find((p) => p.portao === 'portao_6_nenhuma_grandeza_declarada_que_nao_divergiu') || {}).verde);
  const RA = { em: '2026-01-01T00:00:00.000Z', metodo: 'm', extra: 1 };
  const p4 = compararPar(4, 'evidence/p4-r-xa.json', RA, 'evidence/p4-r-xb.json', B, opts, carimbos, selos);
  ok('negativo_folha_so_num_lado_chumba_o_dois', 1, p4.so_em_a.length);
  let abortou = '';
  try { compararPar(5, 'evidence/p5-r-xa.json', A, 'evidence/p5-r-xb.json', B, opts, new Set(), selos); } catch (e) { abortou = String(e.message); }
  ok('negativo_produtor_sem_carimbo_aborta', true, abortou.indexOf('nao declara nenhum campo') >= 0);
  const semSelos = compararPar(6, 'evidence/p6-r-xa.json', A, 'evidence/p6-r-xb.json', { em: 'nao e selo', metodo: 'm', contagens: { no_indice: 10, lidos: 10 } }, opts, carimbos, new Set());
  ok('negativo_valor_nao_iso_nao_e_carimbo', 'grandeza_medida', semSelos.lista[0].classe);
  ok('positivo_causa_bate_contagem_igual', true, causaDoDelta(5, ['evidence/a-xa.json', 'b-xa', 'c-xa', 'd-xa', 'e-xa'], 'xa').bate);
  ok('negativo_causa_com_outro_sufixo_nao_bate', false, causaDoDelta(5, ['evidence/a-xb.json', 'b-xb', 'c-xb', 'd-xb', 'e-xb'], 'xa').bate);
  ok('negativo_causa_contagem_menor_nao_bate', false, causaDoDelta(5, ['evidence/a-xa.json', 'b-xa'], 'xa').bate);
  ok('negativo_causa_contagem_maior_nao_bate', false, causaDoDelta(2, ['evidence/a-xa.json', 'b-xa', 'c-xa'], 'xa').bate);
  ok('positivo_leitura_de_carimbo_da_fonte', 'em', [...carimbosDoFonte('  em: ' + MARCA_DE_SELO + ',')].join('+'));
  ok('positivo_duas_chaves_na_mesma_linha_fica_a_do_selo', 'em',
    [...carimbosDoFonte('  programa: ' + String.fromCharCode(39) + 'scripts/x.mjs' + String.fromCharCode(39) + ', em: ' + MARCA_DE_SELO + ',')].join('+'));
  ok('negativo_linha_sem_chave_antes_do_selo_nao_inventa', 0, carimbosDoFonte('  const selo = ' + MARCA_DE_SELO + ';').size);
  ok('negativo_fonte_sem_carimbo_da_conjunto_vazio', 0, carimbosDoFonte('  peca: x,').size);
  ok('positivo_nome_de_registo_interpretado', '125|sm56d', (() => { const m = interpretarNome('p125-portadores-fora-do-indice-21-11-sm56d.json'); return m.id + '|' + m.sufixo; })());
  ok('negativo_txt_nao_e_registo', null, interpretarNome('p168-prova-da-edicao-sem-corte-sm56d.txt'));
  return casos;
}

function portoesDeFixtures(casos) {
  const saida = [];
  const chk = (nome, verde, valor) => saida.push({ portao: nome, verde: !!verde, valor: valor });
  const maus = casos.filter((c) => !c.bate).map((c) => c.nome);
  const positivos = casos.filter((c) => c.nome.indexOf('positivo') === 0);
  const negativos = casos.filter((c) => c.nome.indexOf('negativo') === 0);
  chk('fixture_todos_os_casos_batiram', maus.length === 0, { corridos: casos.length, batidas: casos.length - maus.length, maus: maus });
  chk('fixture_ha_positivos_e_negativos', positivos.length > 0 && negativos.length > 0, { positivos: positivos.length, negativos: negativos.length });
  chk('fixture_as_quatro_faces_da_causa_estao_las', ['positivo_causa_bate_contagem_igual', 'negativo_causa_com_outro_sufixo_nao_bate',
    'negativo_causa_contagem_menor_nao_bate', 'negativo_causa_contagem_maior_nao_bate'].every((n) => casos.find((c) => c.nome === n).bate), 4);
  chk('fixture_os_sete_portoes_tem_positivo_e_negativo',
    ['positivo_os_sete_portoes_verdes_neste_par', 'negativo_grandeza_sem_declaracao_chumba_o_cinco',
      'negativo_declaracao_que_nao_divergiu_chumba_o_seis', 'negativo_folha_so_num_lado_chumba_o_dois',
      'negativo_produtor_sem_carimbo_aborta'].every((n) => casos.find((c) => c.nome === n).bate), 5);
  chk('fixture_a_leitura_da_fonte_e_o_nome_do_registo_disparam',
    ['positivo_leitura_de_carimbo_da_fonte', 'positivo_duas_chaves_na_mesma_linha_fica_a_do_selo',
      'negativo_linha_sem_chave_antes_do_selo_nao_inventa', 'negativo_fonte_sem_carimbo_da_conjunto_vazio',
      'positivo_nome_de_registo_interpretado', 'negativo_txt_nao_e_registo'].every((n) => casos.find((c) => c.nome === n).bate), 6);
  return saida;
}

const opts = argvPara();
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };
const eu = readFileSync(fileURLToPath(import.meta.url), 'utf8');
say('emissor_bytes=' + Buffer.byteLength(eu, 'utf8') + ' emissor_md5=' + createHash('md5').update(eu).digest('hex'));
let corpo;
if (opts.fixtures) {
  const casos = fixtures();
  const ps = portoesDeFixtures(casos);
  corpo = { modo: 'fixtures', casos: casos, portoes: ps };
  const vermelhos = ps.filter((p) => !p.verde);
  corpo.veredicto = vermelhos.length === 0 ? 'P170_FIXTURES_OK ' + ps.length + '/0 · ' + casos.length + ' casos' : 'P170_FIXTURES_VERMELHO ' + vermelhos.length + '/' + ps.length;
  for (const c of casos) say('  ' + c.nome + ' esperado=' + JSON.stringify(c.esperado) + ' obtido=' + JSON.stringify(c.obtido) + ' bate=' + c.bate);
  for (const p of ps) say('PORTAO ' + p.portao + ' = ' + (p.verde ? 'VERDE' : 'VERMELHO') + ' ' + JSON.stringify(p.valor));
} else {
  if (!opts.sufixoA || !opts.sufixoB) throw new Error('ABORTA: passe os dois sufixos de ronda');
  opts.raiz = opts.raiz || execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  corpo = medir(opts);
  for (const p of corpo.pares) {
    say(p.id + ' a=' + p.caminho_a + ' b=' + p.caminho_b + ' folhas=' + p.folhas_a + '/' + p.folhas_b + ' uniao=' + p.uniao_de_folhas +
      ' divergentes=' + p.divergentes + ' carimbo=' + p.por_classe.carimbo_de_corrida + ' espelho=' + p.por_classe.espelho_da_ronda +
      ' grandeza=' + p.por_classe.grandeza_medida + ' sem_par=' + (p.so_em_a.length + p.so_em_b.length) +
      ' carimbos_do_produtor=' + p.carimbos_lidos_do_produtor.join('+'));
    for (const d of p.lista) say('   ' + d.classe + ' ' + d.folha + ' :: ' + JSON.stringify(d.a) + ' -> ' + JSON.stringify(d.b));
  }
  if (corpo.causa) {
    say('causa folha=' + corpo.causa.folha + ' de=' + corpo.causa.de_a + ' para=' + corpo.causa.para_b + ' delta=' + corpo.causa.delta +
      ' registos_a_no_indice=' + corpo.causa.registos_a_no_indice + ' bate=' + corpo.causa.bate);
    for (const c of corpo.causa.lista) say('   no_indice: ' + c);
  }
  for (const p of corpo.portoes) say('PORTAO ' + p.portao + ' = ' + (p.verde ? 'VERDE' : 'VERMELHO') + ' ' + JSON.stringify(p.valor));
}
say('VEREDICTO ' + corpo.veredicto);
const vermelhos = corpo.portoes.filter((p) => !p.verde);
if (vermelhos.length > 0) {
  const baseDeRed = opts.captura || ('evidence/p170-conferencia-de-duas-corridas-24-11-' + (opts.fixtures ? 'fixtures' : 'medida') + '.json');
  const destino = baseDeRed + '-VERMELHO.json';
  if (existsSync(destino)) throw new Error('ABORTA: o registo vermelho desta modalidade ja existe, passe --captura com nome novo -- ' + destino);
  writeFileSync(destino, JSON.stringify({ modo: corpo.modo, em: new Date().toISOString(), veredicto: corpo.veredicto, portoes: vermelhos }, null, 1), 'utf8');
  throw new Error('ABORTA: ' + corpo.veredicto + ' -- registo vermelho em ' + destino);
}
if (!opts.fixtures && !opts.captura) throw new Error('ABORTA: a corrida de medida exige --captura, para nao sobrescrever um registo');
if (!opts.fixtures && opts.captura) {
  if (existsSync(opts.captura)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + opts.captura);
  corpo.em = new Date().toISOString();
  const partes = opts.captura.split('/');
  const dir = partes.slice(0, partes.length - 1).join('/');
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(opts.captura, JSON.stringify(corpo, null, 1), 'utf8');
  say('registro_guardado=' + opts.captura);
}
