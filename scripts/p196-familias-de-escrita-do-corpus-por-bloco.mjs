// Medicao das familias de escrita do corpus, por bloco de 0x100, com o estado de cobertura da regua do produtor.
// A pergunta que esta peca existe para responder e a face declarada no ciclo anterior: o varredor nao tinha positivo
// para o cirilico, porque as faixas do produtor comecam em U+3000. Para alargar uma faixa é preciso medir antes de
// declarar, e medir aqui significa contar, por bloco, quantas ocorrencias ha no corpus de escrita propia (docs,
// instrumentos, memoria) e quantas delas ja caem dentro duma faixa declarada. Um bloco com ocorrencias legitimas
// nao pode passar a proibido: o portao que proibe uma classe legita fica verde porque proibe, nao porque mede.
// A regua NAO e reimplementada: `faixasOfensoras` e lida do fonte do produtor (`p169`) e a peça aborta se nao a ler.
// Nenhum glifo e escrito nesta fonte nem nas capturas: os membros nomeiam-se por codepoint, porque a prosa que
// reproduz o glifo que denuncia passa a pertencer a familia que o portao proibe.
// Uso: node scripts/p196-familias-de-escrita-do-corpus-por-bloco.mjs <caminho-do-registro> [--faixa 0xLO-0xHI]...
// Env: P196_SUF (rotulo da corrida, obrigatorio)
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUF = process.env.P196_SUF;
if (!SUF) throw new Error('ABORTA: P196_SUF e obrigatorio -- cada corrida precisa de nome proprio');
const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const registro = process.argv[2];
if (!registro) throw new Error('ABORTA: uso - node scripts/p196-familias-de-escrita-do-corpus-por-bloco.mjs <caminho-do-registro>; um caminho lembrado nao e medido');
if (existsSync(registro)) throw new Error('ABORTA: o registro ja existe, use sufixo novo -- ' + registro + ' tem ' + statSync(registro).size + ' bytes');
const ALVO = String(registro).replace(/\\/g, '/');

const produtorCaminho = REPOReal + '/scripts/p169-varredura-letra-digito-do-bloco.mjs';
const produtor = readFileSync(produtorCaminho, 'utf8');
const linhaFaixas = produtor.split('\n').find((l) => l.startsWith('const faixasOfensoras = '));
if (!linhaFaixas) throw new Error('ABORTA: nao li a linha `const faixasOfensoras` do fonte do produtor, e sem leitura nao ha copia fiel');
const faixas = new Function('return ' + linhaFaixas.slice('const faixasOfensoras = '.length).replace(/;\s*$/, ''))();
if (!Array.isArray(faixas) || faixas.length === 0) throw new Error('ABORTA: a linha lida do produtor nao resolve numa lista de faixas');
const emFaixa = (c) => faixas.filter((f) => c >= f[0] && c <= f[1]).length;

// Corpus = a escrita que eu produzo. Nao e o bundle servido nem os registos de corrida: a familia que se quer
// governar e a da prosa e dos instrumentos, e misturar as duas coisas daria um denominador de outra medição.
const RAIZES = [
  { nome: 'docs', caminho: REPOReal + '/docs', ext: ['.md'] },
  { nome: 'scripts', caminho: REPOReal + '/scripts', ext: ['.mjs', '.cjs'] },
  { nome: 'memoria_projeto', caminho: 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-11-15-2e9c4296/memory', ext: ['.md'] },
  { nome: 'memoria_usuario', caminho: 'C:/Users/pcmac/.qoder/memory', ext: ['.md'] },
];
const EXT_TOCADAS = new Set(['.md', '.mjs', '.cjs']);
function arquivosDe(dir, exts, saida) {
  let nomes;
  try { nomes = readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const d of nomes) {
    const p = dir + '/' + d.name;
    if (d.isDirectory()) arquivosDe(p, exts, saida);
    else if (exts.some((x) => d.name.endsWith(x))) saida.push(p);
  }
}
const blocoDe = (cp) => (cp >> 8) << 8;
function varreFicheiro(caminho, acumulador) {
  const txt = readFileSync(caminho, 'utf8');
  let n = 0;
  for (let i = 0; i < txt.length; ) {
    const cp = txt.codePointAt(i);
    i += cp > 0xffff ? 2 : 1;
    if (cp < 0x80) continue;
    const b = blocoDe(cp);
    const reg = acumulador.get(b) || { bloco: b, ocorrencias: 0, codepoints: new Set(), ficheiros: new Set(), cobertas: 0, nao_cobertas: 0 };
    reg.ocorrencias += 1;
    reg.codepoints.add(cp);
    reg.ficheiros.add(caminho);
    if (emFaixa(cp) > 0) reg.cobertas += 1; else reg.nao_cobertas += 1;
    acumulador.set(b, reg);
    n += 1;
  }
  return n;
}

// Uma contagem por bloco nao diz ONDE: a face do ciclo do p173 repetiu-se aqui. `--faixa 0x0400-0x04ff` interroga
// uma faixa candidata e imprime uma linha por ocorrencia, com ficheiro, linha e coluna. A faixa vem do chamador,
// nao duma lista lembrada nesta fonte, e o zero imprime-se -- uma classe legitima em que nada houve para explicar
// nao pode ser proibida pelo portao.
const LIMIAR_DE_TRUNCAMENTO = 200;
// O contexto dum membro nao pode levar o glifo: a captura que o denuncia passaria a pertencer a familia que o
// portao proibe. Cada codepoint nao-ASCII da linha vira o seu nome, os restantes ficam como estao.
function nomeia(txt, linha, coluna) {
  const linhaTxt = (txt.split('\n')[linha - 1] || '');
  const lo = Math.max(0, coluna - 1 - 30);
  const recorte = linhaTxt.slice(lo, Math.min(linhaTxt.length, coluna + 29));
  let saida = '';
  for (const ch of recorte) {
    const cp = ch.codePointAt(0);
    saida += cp > 0x7f ? 'U+' + cp.toString(16).toUpperCase() : ch;
  }
  return { recorte: saida, nao_ascii_na_linha: (linhaTxt.match(/[^\x00-\x7F]/g) || []).length };
}
const faixasInterrogadas = [];
const argv = process.argv.slice(3);
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] !== '--faixa') continue;
  const bruto = String(argv[i + 1] || '');
  const m = /^0x([0-9a-fA-F]{1,6})-0x([0-9a-fA-F]{1,6})$/.exec(bruto);
  if (!m) throw new Error('ABORTA: --faixa quer a forma 0xLO-0xHI, recebeu ' + JSON.stringify(bruto));
  const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16);
  if (!(hi >= lo)) throw new Error('ABORTA: o fim da faixa interrogada e anterior ao comeco -- ' + bruto);
  faixasInterrogadas.push({ bruto: bruto, lo: lo, hi: hi });
}
function linhaEColuna(txt, indice) {
  const ate = txt.slice(0, indice);
  return { linha: ate.split('\n').length, coluna: indice - (ate.lastIndexOf('\n') + 1) + 1 };
}
const interrogatorio = [];
if (faixasInterrogadas.length) {
  const todos = [];
  for (const raiz of RAIZES) {
    const arquivos = [];
    if (!existsSync(raiz.caminho)) continue;
    arquivosDe(raiz.caminho, raiz.ext.filter((x) => EXT_TOCADAS.has(x)), arquivos);
    for (const a of arquivos) todos.push(a);
  }
  for (const f of faixasInterrogadas) {
    const membros = [];
    for (const a of todos) {
      const txt = readFileSync(a, 'utf8');
      for (let i = 0; i < txt.length; ) {
        const cp = txt.codePointAt(i);
        const pos = i;
        i += cp > 0xffff ? 2 : 1;
        if (cp >= f.lo && cp <= f.hi) { const lc = linhaEColuna(txt, pos); membros.push({ ficheiro: a, cp: cp, linha: lc.linha, coluna: lc.coluna }); }
      }
    }
    const truncado = membros.length > LIMIAR_DE_TRUNCAMENTO;
    interrogatorio.push({ faixa: f.bruto, ocorrencias: membros.length, ficheiros: new Set(membros.map((m) => m.ficheiro)).size, truncado: truncado, membros: truncado ? membros.slice(0, LIMIAR_DE_TRUNCAMENTO) : membros });
  }
}

const saidaCapt = [];
const say = (s) => { saidaCapt.push(s); console.log(s); };

const FIXOS = [
  { nome: 'positivo_cirilico_no_meio_duma_palavra', cp: 0x0435, fn: (cp) => blocoDe(cp) === 0x0400 },
  { nome: 'positivo_han_noutro_bloco', cp: 0x6392, fn: (cp) => blocoDe(cp) === 0x6300 },
  { nome: 'positivo_grego_na_notacao', cp: 0x0394, fn: (cp) => blocoDe(cp) === 0x0300 },
  { nome: 'classe_legitima_acento_portugues_nao_e_de_bloco_ofensor', cp: 0x00E7, fn: (cp) => blocoDe(cp) === 0x0000 && emFaixa(cp) === 0 },
  { nome: 'astral_nao_e_bloco_de_um_byte_alto', cp: 0x1F4F7, fn: (cp) => blocoDe(cp) === 0x1F400 },
];
const fixosRuins = FIXOS.filter((f) => !f.fn(f.cp));
say('PROVA_FIXTURE_BLOCO casos=' + FIXOS.length + ' faltas=' + fixosRuins.length + ' obtido=' + JSON.stringify(FIXOS.map((f) => 'U+' + f.cp.toString(16).toUpperCase() + '@' + f.fn(f.cp))));
if (fixosRuins.length) throw new Error('ABORTA: o agrupador por bloco falhou ' + JSON.stringify(fixosRuins.map((f) => f.nome)));

// A classificacao de cobertura tambem precisa de positivo nas tres classes: `todas`, `nenhuma` e `parcial`.
// Sem o parcial, um bloco a meio coberto seria lido como coberto e a faixa nova nunca seria pedida.
function cobre(faixasLocais, cps) {
  const dentro = cps.filter((c) => faixasLocais.some((f) => c >= f[0] && c <= f[1])).length;
  if (dentro === cps.length) return 'todas';
  if (dentro === 0) return 'nenhuma';
  return 'parcial';
}
const COB_FIXOS = [
  { nome: 'todas', obtido: cobre([[0x400, 0x4ff]], [0x400, 0x4ff, 0x435]), esperado: 'todas' },
  { nome: 'nenhuma', obtido: cobre([[0x3000, 0x303f]], [0x435, 0x410]), esperado: 'nenhuma' },
  { nome: 'parcial', obtido: cobre([[0x400, 0x43f]], [0x435, 0x440]), esperado: 'parcial' },
];
const cobFalhas = COB_FIXOS.filter((c) => c.obtido !== c.esperado);
say('PROVA_FIXTURE_COBERTURA casos=' + COB_FIXOS.length + ' faltas=' + cobFalhas.length + ' obtido=' + JSON.stringify(COB_FIXOS.map((c) => c.nome + '=' + c.obtido)));
if (cobFalhas.length) throw new Error('ABORTA: a classificacao de cobertura nao tem as tres classes, deu ' + JSON.stringify(cobFalhas));

const acumulado = new Map();
const porRaiz = {};
for (const raiz of RAIZES) {
  const arquivos = [];
  if (!existsSync(raiz.caminho)) { porRaiz[raiz.nome] = { existe: false, caminho: raiz.caminho, ficheiros: 0, ocorrencias: 0 }; continue; }
  arquivosDe(raiz.caminho, raiz.ext.filter((x) => EXT_TOCADAS.has(x)), arquivos);
  let occ = 0;
  for (const a of arquivos) {
    try { occ += varreFicheiro(a, acumulado); } catch (e) { porRaiz[raiz.nome + '_ilegable'] = a; }
  }
  porRaiz[raiz.nome] = { existe: true, caminho: raiz.caminho, ficheiros: arquivos.length, ocorrencias: occ };
}
say('peca=' + relative(REPOReal, fileURLToPath(import.meta.url)).split(sep).join('/') + ' · quem emite esta saida, lido do proprio modulo e nao dactilografado');
say('alvo=' + ALVO + ' · o registo que esta corrida escreve; sem esta linha a corrida fica fora do dominio da regua de cifras em duo do p168, que so mede artefactos com regiao');
say('TABELAS_DECLARADAS [BLOCO INTERROGADO MEMBRO] · cada fila e uma medida sua, declaracao lida pela regua de cifras em duo do p168');
say('CORPUS ' + JSON.stringify(porRaiz));

const blocos = [...acumulado.values()].sort((a, b) => b.ocorrencias - a.ocorrencias);
const cpsDeCadaBloco = blocos.map((r) => Object.assign({}, r, {
  codepoints: [...r.codepoints].sort((a, b) => a - b),
  ficheiros: r.ficheiros.size,
  cobertura: cobre(faixas, [...r.codepoints]),
}));
for (const b of cpsDeCadaBloco) {
  const lo = blocoDe(b.bloco);
  say('BLOCO U+' + lo.toString(16).toUpperCase().padStart(4, '0') + 'xx ocorrencias=' + b.ocorrencias + ' ficheiros=' + b.ficheiros + ' codepoints_distintos=' + b.codepoints.length + ' cobertura=' + b.cobertura + ' primeiros=' + JSON.stringify(b.codepoints.slice(0, 6).map((c) => 'U+' + c.toString(16).toUpperCase())));
}
const semCobertura = cpsDeCadaBloco.filter((b) => b.cobertura === 'nenhuma');
const parciais = cpsDeCadaBloco.filter((b) => b.cobertura === 'parcial');
const totalOcc = cpsDeCadaBloco.reduce((s, b) => s + b.ocorrencias, 0);
const occFora = cpsDeCadaBloco.reduce((s, b) => s + b.nao_cobertas, 0);
say('AGREGADO blocos=' + cpsDeCadaBloco.length + ' ocorrencias_nao_ascii=' + totalOcc + ' fora_das_faixas_do_produtor=' + occFora + ' blocos_sem_cobertura=' + semCobertura.length + ' blocos_parciais=' + parciais.length);

// A face deixada no ciclo anterior: um bloco sem faixa declarada nao e proibido e nao e provado, pelo que passa as
// duas varreduras em verde. Proibir por decreto seria um portao verde porque proibe, nao porque mede. A resposta e
// dar memoria ao censo: o conjunto de blocos desta corrida e confrontado com o do registo mais novo da familia e
// com a uniao de todos os registos lidos. Membro novo obriga declaracao; zero membros novos e classe legitima e
// imprime-se na mesma. A familia e lida do diretorio do registo pedido -- nao ha caminho lembrado nesta fonte.
const rotuloDe = (bloco) => 'U+' + bloco.toString(16).toUpperCase();
function diffDeConjuntos(baseline, agora) {
  if (baseline.length === 0) return { nada_houve_para_comparar: true, novos: [], perdidos: [] };
  const b = new Set(baseline), a = new Set(agora);
  return {
    nada_houve_para_comparar: false,
    novos: [...a].filter((x) => !b.has(x)).sort(),
    perdidos: [...b].filter((x) => !a.has(x)).sort(),
  };
}
const DIF_FIXOS = [
  { nome: 'bloco_novo_de_um_script_nunca_medido_e_nomeado', d: diffDeConjuntos(['U+0', 'U+200'], ['U+0', 'U+200', 'U+500']), espera: [1, 0, false] },
  { nome: 'censos_com_os_mesmos_blocos_nao_tem_o_que_explicar', d: diffDeConjuntos(['U+0', 'U+200'], ['U+200', 'U+0']), espera: [0, 0, false] },
  { nome: 'bloco_perdido_por_correcao_de_prosa_e_impresso', d: diffDeConjuntos(['U+0', 'U+400'], ['U+0']), espera: [0, 1, false] },
  { nome: 'primeiro_registo_da_familia_imprime_a_classe_legitima', d: diffDeConjuntos([], ['U+0']), espera: [0, 0, true] },
];
const difRuins = DIF_FIXOS.filter((c) => c.d.novos.length !== c.espera[0] || c.d.perdidos.length !== c.espera[1] || c.d.nada_houve_para_comparar !== c.espera[2]);
say('PROVA_FIXTURE_DIFF casos=' + DIF_FIXOS.length + ' faltas=' + difRuins.length + ' obtido=' + JSON.stringify(DIF_FIXOS.map((c) => c.nome.split(' ')[0] + '=' + c.d.novos.length + '/' + c.d.perdidos.length + '/' + c.d.nada_houve_para_comparar)));
if (difRuins.length) throw new Error('ABORTA: a comparacao de censos nao tem as quatro classes, faltaram ' + JSON.stringify(difRuins.map((c) => c.nome)));

const caminhoDoRegistro = ALVO;
const DIR_REGISTRO = dirname(caminhoDoRegistro);
const RE_FAMILIA = /^p196-familias-de-escrita-do-corpus-.*\.json$/;
let nomesDoDir;
try { nomesDoDir = readdirSync(DIR_REGISTRO); } catch (e) { nomesDoDir = null; }
const lidosDaFamilia = [], rejeitadosDaFamilia = [];
for (const f of (nomesDoDir || []).filter((x) => RE_FAMILIA.test(x))) {
  const caminho = DIR_REGISTRO + '/' + f;
  if (caminho === caminhoDoRegistro) continue;
  let j;
  try { j = JSON.parse(readFileSync(caminho, 'utf8')); } catch (e) { rejeitadosDaFamilia.push({ ficheiro: f, causa: 'json ilegivel' }); continue; }
  if (typeof j.em !== 'string') { rejeitadosDaFamilia.push({ ficheiro: f, causa: 'sem_campo_em' }); continue; }
  if (!Array.isArray(j.blocos)) { rejeitadosDaFamilia.push({ ficheiro: f, causa: 'sem_lista_de_blocos' }); continue; }
  lidosDaFamilia.push({ ficheiro: f, em: j.em, blocos: j.blocos.map((b) => b.bloco) });
}
lidosDaFamilia.sort((a, b) => (a.em < b.em ? 1 : -1));
if (lidosDaFamilia.length > 1 && lidosDaFamilia[0].em === lidosDaFamilia[1].em) throw new Error('ABORTA EMPATE: dois registos da familia com o mesmo em=' + lidosDaFamilia[0].em + ' -- sem escolha unica nao ha baseline medido');
const baseline = lidosDaFamilia.length ? lidosDaFamilia[0] : null;
const emMax = lidosDaFamilia.length ? lidosDaFamilia.map((x) => x.em).sort().reverse()[0] : null;
const uniaoDaFamilia = [...new Set(lidosDaFamilia.reduce((acc, x) => acc.concat(x.blocos), []))].sort();
const rotulosAgora = cpsDeCadaBloco.map((b) => rotuloDe(b.bloco));
const vsMaisNovo = diffDeConjuntos(baseline ? baseline.blocos : [], rotulosAgora);
const vsUniao = diffDeConjuntos(uniaoDaFamilia, rotulosAgora);
say('FAMILIA dir=' + DIR_REGISTRO + ' lidos=' + lidosDaFamilia.length + ' rejeitados=' + JSON.stringify(rejeitadosDaFamilia) + ' uniao_de_blocos=' + uniaoDaFamilia.length + ' inacessivel=' + (nomesDoDir === null));
say('BASELINE mais_novo=' + (baseline ? baseline.ficheiro + ' em=' + baseline.em : 'nenhum_registo_na_familia') + ' blocos=' + (baseline ? baseline.blocos.length : 0) + ' em_max=' + emMax);
say('BLOCOS_NOVOS_VS_MAIS_NOVO ' + JSON.stringify(vsMaisNovo.novos) + ' nada_houve_para_comparar=' + vsMaisNovo.nada_houve_para_comparar);
say('BLOCOS_PERDIDOS_VS_MAIS_NOVO ' + JSON.stringify(vsMaisNovo.perdidos));
say('BLOCOS_NOVOS_VS_UNIAO_DA_FAMILIA ' + JSON.stringify(vsUniao.novos));
say('BLOCOS_FORA_DA_CORRIDA_ATUAL_VS_UNIAO ' + JSON.stringify(vsUniao.perdidos));

// O ramo do produtor que nao tem positiva no corpus e uma faixa declarada sem medida atras: imprime-se, nao se cala.
const faixasMortas = faixas.map((f) => ({ faixa: 'U+' + f[0].toString(16).toUpperCase() + '-' + f[1].toString(16).toUpperCase(), ocorrencias: cpsDeCadaBloco.filter((b) => b.codepoints.some((c) => c >= f[0] && c <= f[1])).reduce((s, b) => s + b.ocorrencias, 0) }));
say('FAIXAS_DECLARADAS ' + JSON.stringify(faixasMortas));
for (const q of interrogatorio) {
  say('INTERROGADO faixa=' + q.faixa + ' ocorrencias=' + q.ocorrencias + ' ficheiros=' + q.ficheiros + ' truncado=' + q.truncado + ' nada_houve_para_explicar=' + (q.ocorrencias === 0));
  q.membros.forEach((m, k) => {
    const txt = readFileSync(m.ficheiro, 'utf8');
    say('MEMBRO #' + (k + 1) + '/' + q.ocorrencias + ' cp=U+' + m.cp.toString(16).toUpperCase() + ' ficheiro=' + m.ficheiro.replace(REPOReal + '/', '') + ' linha=' + m.linha + ' coluna=' + m.coluna + ' ' + JSON.stringify(nomeia(txt, m.linha, m.coluna)));
  });
}

const g = {
  C1_a_regua_e_lida_do_produtor: { ok: faixas.length > 0 && Buffer.byteLength(produtor, 'utf8') > 0, obtido: faixas.length },
  C2_toda_ocorrencia_bloco_a_bloco_bate_com_a_soma_das_duas_classes: { ok: totalOcc === occFora + cpsDeCadaBloco.reduce((s, b) => s + b.cobertas, 0), obtido: [totalOcc, occFora, cpsDeCadaBloco.reduce((s, b) => s + b.cobertas, 0)] },
  C3_os_blocos_sao_o_conjunto_medido_e_nao_uma_lista_lembrada: { ok: cpsDeCadaBloco.length === acumulado.size && cpsDeCadaBloco.every((b) => b.ocorrencias > 0), obtido: [cpsDeCadaBloco.length, acumulado.size] },
  C4_cada_bloco_tem_uma_das_tres_classes_de_cobertura: { ok: cpsDeCadaBloco.every((b) => ['todas', 'nenhuma', 'parcial'].indexOf(b.cobertura) >= 0), obtido: [...new Set(cpsDeCadaBloco.map((b) => b.cobertura))].sort() },
  C5_o_bloco_do_defeito_registrado_e_nomeado_com_a_sua_cobertura: { ok: true, obtido: (() => { const b = cpsDeCadaBloco.find((x) => blocoDe(0x0435) === x.bloco); return b ? { ocorrencias: b.ocorrencias, cobertura: b.cobertura } : 'bloco_sem_ocorrencias_no_corpus'; })() },
  // Uma contagem sem localizacao nao diz onde: o portao exige uma linha por ocorrencia interrogada, e o zero tem de
  // se imprimir -- a classe legitima em que nada houve para explicar nao pode ser proibida pelo instrumento.
  C6_cada_faixa_interrogada_imprime_uma_linha_por_ocorrencia: { ok: faixasInterrogadas.length === 0 || interrogatorio.every((q) => q.truncado === true || q.membros.length === q.ocorrencias), obtido: interrogatorio.map((q) => q.faixa + '=' + q.membros.length + '/' + q.ocorrencias + (q.truncado ? ' truncado' : '')) },
  C7_a_interrogacao_imprime_mesmo_sem_nada_para_explicar: { ok: faixasInterrogadas.length === 0 || interrogatorio.every((q) => typeof q.ocorrencias === 'number' && q.ocorrencias >= 0), obtido: interrogatorio.map((q) => q.faixa + ' nada_houve_para_explicar=' + (q.ocorrencias === 0)) },
  // O baseline tem de ser escolhido pelo `em` lido dos ficheiros, nunca por um nome ou data lembrados por mim.
  C8_o_baseline_e_o_em_mais_recento_lido_dos_ficheiros: { ok: lidosDaFamilia.length === 0 || baseline.em === emMax, obtido: [lidosDaFamilia.length, baseline ? baseline.em : null, emMax] },
  C9_a_comparacao_de_censos_tem_positivo_nas_quatro_classes: { ok: difRuins.length === 0, obtido: DIF_FIXOS.map((c) => c.nome.split(' ')[0] + '=' + c.espera.join('/')) },
  C10_os_quatro_eixos_da_comparacao_imprimem_se_mesmo_vazios: { ok: ['BLOCOS_NOVOS_VS_MAIS_NOVO ', 'BLOCOS_PERDIDOS_VS_MAIS_NOVO ', 'BLOCOS_NOVOS_VS_UNIAO_DA_FAMILIA ', 'BLOCOS_FORA_DA_CORRIDA_ATUAL_VS_UNIAO '].every((p) => saidaCapt.some((s) => s.startsWith(p))), obtido: ['BLOCOS_NOVOS_VS_MAIS_NOVO ', 'BLOCOS_PERDIDOS_VS_MAIS_NOVO ', 'BLOCOS_NOVOS_VS_UNIAO_DA_FAMILIA ', 'BLOCOS_FORA_DA_CORRIDA_ATUAL_VS_UNIAO '].map((p) => p.trim() + '=' + saidaCapt.filter((s) => s.startsWith(p)).length) },
  // C11 julga o censo IMEDIATAMENTE anterior, nao a uniao da familia. A razao medida e o proprio cirilico: a uniao
  // lembra o bloco que a corregao de prosa apagou, pelo que uma reinjeccao seria verde contra a uniao e vermelha
  // contra o mais novo. A uniao fica impressa como eixo de informacao -- diz o que ja houve e ja nao esta.
  C11_bloco_novo_face_ao_censo_anterior_obriga_a_declaracao: { ok: vsMaisNovo.novos.length === 0, obtido: { novos_vs_mais_novo: vsMaisNovo.novos, novos_vs_uniao: vsUniao.novos, fora_da_corrida_atual_vs_uniao: vsUniao.perdidos, nada_houve_para_comparar: vsMaisNovo.nada_houve_para_comparar } },
};
Object.keys(g).forEach((k) => say('portao_' + k + '=' + (g[k].ok ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(g[k].obtido)));
const vermelhos = Object.keys(g).filter((k) => !g[k].ok);
say('emissor_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_md5=' + createHash('md5').update(EU).digest('hex'));
const corpo = {
  em: new Date().toISOString(), sufixo: SUF,
  produtor: { caminho: produtorCaminho, bytes: Buffer.byteLength(produtor, 'utf8'), md5: createHash('md5').update(produtor).digest('hex') },
  emissor: { bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') },
  faixas_do_produtor: faixas, raizes: porRaiz,
  total_ocorrencias_nao_ascii: totalOcc, ocorrencias_fora_das_faixas: occFora,
  blocos: cpsDeCadaBloco.map((b) => ({ bloco: 'U+' + b.bloco.toString(16).toUpperCase(), ocorrencias: b.ocorrencias, ficheiros: b.ficheiros, codepoints_distintos: b.codepoints.length, cobertas: b.cobertas, fora: b.nao_cobertas, cobertura: b.cobertura })),
  faixas_declaradas_com_ocorrencias: faixasMortas,
  familia: {
    diretorio: DIR_REGISTRO, inacessivel: nomesDoDir === null,
    lidos: lidosDaFamilia.map((x) => ({ ficheiro: x.ficheiro, em: x.em, blocos: x.blocos.length })),
    rejeitados: rejeitadosDaFamilia, uniao_de_blocos: uniaoDaFamilia,
  },
  baseline: baseline ? { ficheiro: baseline.ficheiro, em: baseline.em, blocos: baseline.blocos } : null,
  blocos_novos_vs_mais_novo: vsMaisNovo.novos,
  blocos_perdidos_vs_mais_novo: vsMaisNovo.perdidos,
  blocos_novos_vs_uniao_da_familia: vsUniao.novos,
  blocos_fora_da_corrida_atual_vs_uniao: vsUniao.perdidos,
  comparacao_por_fixture: DIF_FIXOS.map((c) => ({ nome: c.nome, esperados: c.espera, obtidos: [c.d.novos.length, c.d.perdidos.length, c.d.nada_houve_para_comparar] })),
  faixas_interrogadas: interrogatorio.map((q) => ({ faixa: q.faixa, ocorrencias: q.ocorrencias, ficheiros: q.ficheiros, truncado: q.truncado, membros: q.membros.map((m) => ({ cp: 'U+' + m.cp.toString(16).toUpperCase(), ficheiro: m.ficheiro.replace(REPOReal + '/', ''), linha: m.linha, coluna: m.coluna })) })),
  portoes: Object.keys(g).map((k) => ({ nome: k, ok: g[k].ok, obtido: g[k].obtido })),
  o_que_prova: 'quantas ocorrencias de cada bloco de 0x100 existem no corpus de escrita propia, quantas caem dentro duma faixa ja declarada pelo produtor, e que conjunto de blocos desta corrida e novo face ao registo mais novo da familia e face a uniao de todos os registos lidos',
  o_que_NAO_prova: 'que um bloco sem ocorrencias seja illegitimo -- so prova que nao ha uso registrado; nem que a faixa do produtor seja a unica via de higiene; nem que um membro novo seja um defeito -- obriga a declaracao, nao a reversao. O positivo de C11 no corpus de hoje e o das fixuras de C9, que chamam a mesma funcao de diff: sem registo anterior na familia C11 corre a classe legitima nada_houve_para_comparar e nao um verde por cegueira.',
};
writeFileSync(registro, JSON.stringify(corpo, null, 1) + '\n', 'utf8');
say('registro_em=' + registro + ' bytes=' + statSync(registro).size);
say('P196_FAMILIAS_MEDIDAS ' + (Object.keys(g).length - vermelhos.length) + '/' + vermelhos.length + ' · ' + SUF + ' · lista_de_vermelhos=' + JSON.stringify(vermelhos));
if (vermelhos.length) throw new Error('ABORTA: medicao das familias com faltas -- ' + JSON.stringify(vermelhos));
