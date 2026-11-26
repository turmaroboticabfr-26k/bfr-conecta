// Porque este programa existe: a FASE 3 do briefing exige que «cada usuário visualize somente as
// funcionalidades autorizadas para seu perfil», e até agora as contas por papel vinham de duas fontes que
// nenhuma decide sozinha: a sonda de browser `ah2-sonda-portas-por-papel.mjs` (11 papéis, shell d418e7fc, e
// apenas as rotas que o varrimento m5 declarou sem porta) e a coluna «Portas no ar (móvel)» do documento
// BU-6. Falta o que o PRODUTO declara. Nos bytes servidos está escrita, em `syncRoleNavigation`, a única
// cláusula que esconde ou mostra uma aba:
//   const viewRole = role === 'developer' ? 'admin' : role === 'pedagogical' ? 'teacher' : …
//   const allowed = viewRole === 'admin' ? [...new Set([...roleSectionAccess.admin, …])]
//                                        : (roleSectionAccess[viewRole] || roleSectionAccess.parent);
//   document.querySelectorAll('.sidebar .nav-item[data-section],.mobile-more-option[data-section]')
//            .forEach(item => item.classList.toggle('hidden', !allowed.includes(item.dataset.section)));
// Este instrumento lê essa regra dos bytes (nunca dactilografada), aplica-a a cada papel do vocabulário que
// o próprio bundle declara e confronta o resultado com os itens que existem no markup estático. As duas
// divergências que saem daqui são o trabalho de browser que resta, célula a célula, em vez de 15 × 55 toques.
//
// Duas coisas que este ciclo já mediu e que passam a ter produtor: as 250 ocorrências de `data-section` nos
// bytes servidos partem-se em 83 dentro de markup e 167 dentro de seleitores, e quatro nomes nunca aparecem
// num atributo — o censo de «abas» do `p186` é um censo de tokens de navegação, não de portas montadas.
//
// Só-leitura: 0 banco, 0 publicação, 0 DDL, 0 mint, 0 push, 0 browser. Resolve a candidata pela pegada que o
// verificador de versão escreveu e lê o mapa mestre de sessões SÓ pelas chaves, nunca pelos valores.
// Uso: node scripts/p187-mapa-de-portas-por-papel.mjs [rotulo=sm76a] | --sonda-fixtures
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIR_SESSAO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const EV = path.join(RAIZ, 'evidence');
const DOC_BU6 = path.join(RAIZ, 'docs/bu-20-11/03-perfis-e-permissoes.md');
const argv = process.argv.slice(2);
const MODO_FIXTURES = argv.includes('--sonda-fixtures');
const ROTULO = argv.filter((a) => !a.startsWith('--'))[0] || 'sm76a';
const OUT = path.join(EV, 'p187-mapa-de-portas-por-papel-' + ROTULO + '.json');
if (!MODO_FIXTURES && existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' ja existe — use outro rotulo');

const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const portoes = [];
const reg = (nome, ok, detalhe) => portoes.push({ nome, ok: !!ok, detalhe });

function leFamilia(prefixo) {
  const nomes = readdirSync(EV).filter((f) => f.startsWith(prefixo) && f.endsWith('.json'));
  const comCarimpo = nomes.map((f) => {
    const j = JSON.parse(readFileSync(path.join(EV, f), 'utf8'));
    return { nome: f, ms: Date.parse(j.em || ''), json: j };
  }).filter((x) => Number.isFinite(x.ms));
  if (!comCarimpo.length) throw new Error('ABORTA: nenhum registo da familia ' + prefixo + ' tem carimpo `em` legivel');
  comCarimpo.sort((a, b) => b.ms - a.ms);
  if (comCarimpo.length > 1 && comCarimpo[0].ms === comCarimpo[1].ms) {
    throw new Error('ABORTA: empate no carimpo mais novo da familia ' + prefixo + ' — ' + comCarimpo[0].nome + ' e ' + comCarimpo[1].nome);
  }
  return comCarimpo[0];
}

function extraiObjecto(texto, ancora) {
  const i = texto.indexOf(ancora);
  if (i < 0) throw new Error('ABORTA: ancora ausente dos bytes servidos: ' + ancora);
  let prof = 0, fim = -1;
  for (let p = i + ancora.length - 1; p < texto.length; p++) {
    const c = texto[p];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (prof === 0) { fim = p; break; } }
  }
  if (fim < 0) throw new Error('ABORTA: a chaveta de fecho nunca aparece depois de ' + ancora);
  return { literal: texto.slice(i + ancora.length - 1, fim + 1), linha: texto.slice(0, i).split('\n').length, pos: i };
}

function classeDaOcorrencia(texto, idx) {
  if (texto[idx - 1] === '[') return 'seletor';
  const abre = texto.lastIndexOf('<', idx);
  const fecha = texto.lastIndexOf('>', idx);
  if (abre > fecha) return 'markup';
  return 'string_ou_outro';
}

function censosDeMarca(texto) {
  const porClasse = { markup: new Map(), seletor: new Map(), string_ou_outro: new Map() };
  let total = 0;
  for (const m of texto.matchAll(/data-section="([a-z0-9-]+)"/g)) {
    const dentro = porClasse[classeDaOcorrencia(texto, m.index)];
    dentro.set(m[1], (dentro.get(m[1]) || 0) + 1);
    total++;
  }
  const saida = { total_de_ocorrencias: total, por_classe: {} };
  for (const [c, mapa] of Object.entries(porClasse)) {
    saida.por_classe[c] = {
      ocorrencias: [...mapa.values()].reduce((a, x) => a + x, 0),
      distintas: [...mapa.keys()].sort()
    };
  }
  return saida;
}

// Uma aba pode viver em tres sítios diferentes dos bytes, e a pergunta que a FASE 3 faz não é «existe a
// string?» mas «existe um botão que o papel pode tocar?». Só o parser de etiquetas responde a isso; o
// classificador de ocorrencias serve para dizer ONDE cada nome fora do parser foi encontrado, e por isso
// cada token sem item montado tem de ter pelo menos uma classe lida — senão o nome vem de lugar nenhum.
function classesDoToken(censo, seccao) {
  return Object.entries(censo.por_classe).filter(([, v]) => v.distintas.includes(seccao)).map(([c]) => c);
}

// O extras do admin vivem na uniao [ ...new Set([...roleSectionAccess.admin, 'a', 'b']) ]. Ler essa lista
// por regex falhou tres vezes (a classe de um caractere, o fecho exigido, e o corte da ultima letra), por
// isso a leitura e agora uma maquina de estados: virgula, aspa, ate a aspa seguinte - e so aceita itens
// sucessivos comeca-do por virgula. O primeiro caractere que nao e espaco, virgula nem aspa termina a
// corrida, o que da um negativo possivel a uma lista que nao e do formato (por exemplo .concat([...])).
function extrasDoAdminDosBytes(texto) {
  const ancora = 'roleSectionAccess.admin';
  const i = texto.indexOf(ancora);
  if (i < 0) return { ocorrencias: 0, itens: [], trecho: null, para_onde_a_corrida_foi: null };
  const cauda = texto.slice(i + ancora.length);
  const itens = [];
  let p = 0;
  let para_onde = null;
  while (p < cauda.length) {
    while (p < cauda.length && cauda[p] === ' ') p++;
    if (cauda[p] !== ',') { para_onde = JSON.stringify(cauda.slice(p, p + 1)); break; }
    p++;
    while (p < cauda.length && cauda[p] === ' ') p++;
    if (cauda[p] !== "'") { para_onde = JSON.stringify(cauda.slice(p, p + 1)); break; }
    const ate = cauda.indexOf("'", p + 1);
    if (ate < 0) { para_onde = 'aspa_nunca_fechada'; break; }
    itens.push(cauda.slice(p + 1, ate));
    p = ate + 1;
  }
  return {
    ocorrencias: texto.split(ancora).length - 1,
    itens,
    trecho: JSON.stringify(cauda.slice(0, 90)),
    para_onde_a_corrida_foi: para_onde
  };
}

// Um sitio de alias pode omitir o par identico (`psychology -> psychology`) porque o `: role` no fim da
// cadeia ja faz exactamente isso. O que tem de concordar entre sitios e a chave a que cada papel resolve,
// nunca a lista literal de pares - por isso a comparacao e por resolucao e nao por igualdade de texto.
function resolveEm(pares, papel) {
  return papel in pares ? pares[papel] : papel;
}

// O conjunto de pares literal pode diferir entre sitios sem que a regra differs: o que conta e se algum
// papel do vocabulario resolve para chaves distintas. Esta funcao e a unica definicao dessa pergunta - os
// fixtures e a corrida real chamam-na, por isso nao ha segunda instancia dactilografada para envelhecer.
function resolucoesDivergentes(sitios, vocab) {
  return vocab.filter((p) => new Set(sitios.map((s) => resolveEm(s.pares, p))).size > 1);
}

function sitiosDeAlias(texto) {
  const GATILHO = "role === 'developer' ? 'admin'";
  const posicoes = [];
  for (let i = texto.indexOf(GATILHO); i >= 0; i = texto.indexOf(GATILHO, i + 1)) posicoes.push(i);
  return posicoes.map((pos) => {
    const pares = {};
    for (const m of texto.slice(pos, pos + 400).matchAll(/role === '([a-z_]+)' \? '([a-z_]+)'/g)) if (!(m[1] in pares)) pares[m[1]] = m[2];
    return { linha: texto.slice(0, pos).split('\n').length, pares };
  });
}

function itensDeMarkup(texto) {
  const attrs = (t) => {
    const a = {};
    for (const m of t.matchAll(/([a-z-]+)\s*=\s*"([^"]*)"/gi)) if (!(m[1] in a)) a[m[1]] = m[2];
    return a;
  };
  const nav = [], mais = [], recipientes = { etiqueta_com_classe_sidebar: 0, id_mobileMoreMenu: 0 };
  const ph = [];
  let etiquetas = 0;
  for (const m of texto.matchAll(/<[a-z][a-z0-9]*\b[^>]*>/gi)) {
    etiquetas++;
    const a = attrs(m[0]);
    const classes = (a.class || '').split(/\s+/);
    if (classes.includes('sidebar')) recipientes.etiqueta_com_classe_sidebar++;
    if (a.id === 'mobileMoreMenu') recipientes.id_mobileMoreMenu++;
    const sec = a['data-section'];
    if (!sec) continue;
    // Um valor com dollar-chaveta e uma etiqueta construida em tempo de execucao: o botao existe no
    // browser, mas o nome da rota so se sabe la. Vai para balde proprio, nunca misturado nos itens estaticos.
    if (sec.includes('${')) { ph.push({ linha: texto.slice(0, m.index).split('\n').length, valor: sec }); continue; }
    if (classes.includes('nav-item')) nav.push(sec);
    if (classes.includes('mobile-more-option')) mais.push(sec);
  }
  return {
    etiquetas_analisadas: etiquetas,
    nav_item: { ocorrencias: nav.length, distintas: [...new Set(nav)].sort() },
    mobile_more_option: { ocorrencias: mais.length, distintas: [...new Set(mais)].sort() },
    recipientes,
    uniao: [...new Set(nav.concat(mais))].sort(),
    itens_montados_por_template: {
      ocorrencias: ph.length,
      valores: [...new Set(ph.map((x) => x.valor))].sort(),
      linhas: ph.map((x) => x.linha)
    }
  };
}

function autorizadoPara(mapa, alias, extrasDoAdmin, papel) {
  const viewRole = resolveEm(alias, papel);
  if (viewRole === 'admin') {
    return { viewRole, no_mapa: true, origem: 'uniao_do_admin', portas: [...new Set([...(mapa.admin || []), ...extrasDoAdmin])] };
  }
  if (Object.prototype.hasOwnProperty.call(mapa, viewRole)) {
    return { viewRole, no_mapa: true, origem: 'direto_do_mapa', portas: [...mapa[viewRole]] };
  }
  return { viewRole, no_mapa: false, origem: 'recurso_ao_parent', portas: [...(mapa.parent || [])] };
}

if (MODO_FIXTURES) {
  const f = [];
  const add = (nome, ok, detalhe) => f.push({ nome, ok: !!ok, detalhe });
  const TEXTO = [
    '<nav class="sidebar"><button class="nav-item" data-section="inicio">Inicio</button>',
    '.sidebar .nav-item[data-section="more"] { display: block; }',
    "  const sel = '.mobile-more-option[data-section=\"fotos\"]';",
    '</nav>'
  ].join('\n');
  const cen = censosDeMarca(TEXTO);
  add('classificador_de_marca_separa_markup_de_seletor',
    cen.por_classe.markup.distintas.join('+') === 'inicio' && cen.por_classe.seletor.distintas.join('+') === 'fotos+more' && cen.total_de_ocorrencias === 3,
    JSON.stringify(Object.fromEntries(Object.entries(cen.por_classe).map(([k, v]) => [k, v.distintas]))));
  add('classificador_fica_mudo_sem_agulha', censosDeMarca('aqui nao h-a nenhuma agulha').total_de_ocorrencias === 0, 'total=0');
  // A direccao conhecida do erro: dentro de script, um `<` de comparacao faz a ocorrencia parecer markup.
  const ENGANOSO = 'if (a<b) { const sel = \'data-section="fantasma"\'; }';
  const cenE = censosDeMarca(ENGANOSO);
  const parseE = itensDeMarkup(ENGANOSO);
  add('classificador_nao_e_prova_de_item_montado', cenE.total_de_ocorrencias === 1 && cenE.por_classe.markup.distintas.join('+') === 'fantasma' && parseE.uniao.length === 0,
    'ocorrencias=' + cenE.total_de_ocorrencias + ' classificador=' + JSON.stringify(cenE.por_classe.markup.distintas) + ' parser=' + parseE.uniao.length);
  // Terceira classe: `>` ja fechado antes da agulha — a rota que nao e etiqueta nem seletor.
  const FORA = ['a < b > c;', "  const rotulo = 'data-section=\"notas\"';"].join('\n');
  const cenF = censosDeMarca(FORA);
  add('classe_string_ou_outro_tem_positivo', cenF.total_de_ocorrencias === 1 && cenF.por_classe.string_ou_outro.distintas.join('+') === 'notas' && cenF.por_classe.markup.distintas.length === 0,
    JSON.stringify(Object.fromEntries(Object.entries(cenF.por_classe).map(([k, v]) => [k, v.distintas]))));
  const ITENS = '<nav class="sidebar"><button class="nav-item" data-section="inicio">I</button><button class="nav-item hidden" data-section="notas">N</button></nav><div id="mobileMoreMenu"><button class="mobile-more-option" data-section="inicio">I</button></div>';
  const parseI = itensDeMarkup(ITENS);
  add('parser_de_etiquetas_separa_as_duas_casas', parseI.nav_item.ocorrencias === 2 && parseI.mobile_more_option.ocorrencias === 1 && parseI.uniao.join('+') === 'inicio+notas' && parseI.recipientes.etiqueta_com_classe_sidebar === 1 && parseI.recipientes.id_mobileMoreMenu === 1,
    JSON.stringify({ nav: parseI.nav_item.ocorrencias, mais: parseI.mobile_more_option.ocorrencias, uniao: parseI.uniao, recipientes: parseI.recipientes }));
  add('parser_fica_mudo_sem_etiquetas', itensDeMarkup('nada de etiquetas aqui').uniao.length === 0, 'uniao=0');
  // Um valor com dollar-chaveta e uma etiqueta montada em tempo de execucao: vai para balde proprio e NUNCA
  // para a uniao, senao o nome de rota dum loop inventaria-se como porta estatica.
  const PH = '$' + '{section}';
  const COM_TEMPLATE = ['<div id="mobileMoreMenu">', '  <a class="mobile-more-option" data-section="' + PH + '"></a>', '</div>', '<a class="nav-item" data-section="inicio"></a>'].join('\n');
  const parseT = itensDeMarkup(COM_TEMPLATE);
  add('etiqueta_de_template_fica_fora_da_uniao', parseT.uniao.join('+') === 'inicio' && parseT.itens_montados_por_template.ocorrencias === 1 && parseT.itens_montados_por_template.valores.join('+') === PH && parseT.mobile_more_option.ocorrencias === 0,
    'uniao=' + JSON.stringify(parseT.uniao) + ' template=' + JSON.stringify(parseT.itens_montados_por_template));
  add('classes_do_token_une_as_rotas', classesDoToken(cen, 'inicio').join('+') === 'markup' && classesDoToken(cen, 'more').join('+') === 'seletor' && classesDoToken(cen, 'fantasma').length === 0,
    'inicio=' + JSON.stringify(classesDoToken(cen, 'inicio')) + ' more=' + JSON.stringify(classesDoToken(cen, 'more')) + ' fantasma=' + JSON.stringify(classesDoToken(cen, 'fantasma')));
  let msg = '';
  try { extraiObjecto('const x = { a: [1, 2], b: { c: 1 } } ;', 'const x = {'); } catch (e) { msg = String(e.message); }
  add('extrator_de_objecto_lee_chavetas_aninhadas', msg === '', msg || 'literal lido sem aborto');
  let abortou = '';
  try { extraiObjecto('nada aqui dentro', 'const roleSectionAccess = {'); } catch (e) { abortou = String(e.message); }
  add('extrator_aborta_se_a_ancora_nao_existe', abortou.startsWith('ABORTA'), abortou.slice(0, 54) || 'NAO ABORTOU');
  const dois = sitiosDeAlias("const a = role === 'developer' ? 'admin' : role === 'pedagogical' ? 'teacher' : role; const b = role === 'developer' ? 'admin' : role === 'pedagogical' ? 'teacher' : role;");
  add('sitios_de_alias_concordam_no_fixture_positivo', dois.length === 2 && resolucoesDivergentes(dois, ['developer', 'pedagogical']).length === 0, JSON.stringify(dois.map((s) => s.pares)));
  const quebrado = sitiosDeAlias("const a = role === 'developer' ? 'admin' : role === 'pedagogical' ? 'teacher' : role; const b = role === 'developer' ? 'admin' : role === 'pedagogical' ? 'docente' : role;");
  add('alias_divergente_e_detectado_no_fixture_negativo', quebrado.length === 2 && resolucoesDivergentes(quebrado, ['developer', 'pedagogical']).join('+') === 'pedagogical', JSON.stringify(resolucoesDivergentes(quebrado, ['developer', 'pedagogical'])));
  // O dois sitios com o par identico OMITIDO num deles e a classe legitima que a regex velha chumbava: aqui
  // tem de dar zero divergencias, e so rebenta quando um papel resolve para chaves diferentes.
  const PARES_OMITIDO = sitiosDeAlias("const a = role === 'developer' ? 'admin' : role === 'psychology' ? 'psychology' : role; const b = role === 'developer' ? 'admin' : role;");
  add('par_identico_omitido_nao_e_divergencia_de_resolucao', PARES_OMITIDO.length === 2 && Object.keys(PARES_OMITIDO[0].pares).length === 2 && Object.keys(PARES_OMITIDO[1].pares).length === 1 && resolucoesDivergentes(PARES_OMITIDO, ['developer', 'psychology']).length === 0, 'pares=' + JSON.stringify(PARES_OMITIDO.map((s) => Object.keys(s.pares).length)) + ' divergentes=' + JSON.stringify(resolucoesDivergentes(PARES_OMITIDO, ['developer', 'psychology'])));
  const EXTRAS_OK = "x = [...new Set([...roleSectionAccess.admin, 'psychology', 'multiprofissional'])];";
  const eOk = extrasDoAdminDosBytes(EXTRAS_OK);
  // A corrida tem de parar num fecho de parentese, bracket ou chaveta - o caractere exacto depende de onde
  // a ancora apanha o primeiro fecho, por isso a assercao e sobre a classe do paradeiro, nao sobre a letra.
  const EH_FECHO = (x) => x === '")"' || x === '"]"' || x === '"}"';
  add('extras_do_admin_positivo_le_dois_itens', eOk.ocorrencias === 1 && eOk.itens.join('+') === 'psychology+multiprofissional' && EH_FECHO(eOk.para_onde_a_corrida_foi), 'itens=' + JSON.stringify(eOk.itens) + ' ocorrencias=' + eOk.ocorrencias + ' para_onde=' + eOk.para_onde_a_corrida_foi);
  const EXTRAS_LISTA = "y = roleSectionAccess.admin.concat(['secretaria']);";
  const eLista = extrasDoAdminDosBytes(EXTRAS_LISTA);
  add('extras_do_admin_negativo_sem_run_de_quoted_fechado_por_paren', eLista.ocorrencias === 1 && eLista.itens.length === 0, 'itens=' + JSON.stringify(eLista.itens) + ' ocorrencias=' + eLista.ocorrencias);
  const EXTRAS_SEM = "z = roleSectionAccess.parent.length;";
  const eSem = extrasDoAdminDosBytes(EXTRAS_SEM);
  add('extras_do_admin_negativo_sem_ancora', eSem.ocorrencias === 0 && eSem.itens.length === 0 && eSem.trecho === null, JSON.stringify(eSem));
  const MAPA = { admin: ['inicio', 'secretaria'], parent: ['inicio', 'notas'] };
  const u = autorizadoPara(MAPA, { developer: 'admin' }, ['psychology'], 'developer');
  add('uniao_do_admin_acrescenta_os_extras', u.portas.length === 3 && u.portas.includes('psychology'), JSON.stringify(u.portas));
  const herd = autorizadoPara(MAPA, {}, [], 'pending');
  add('papel_fora_do_mapa_herda_o_parent', herd.origem === 'recurso_ao_parent' && herd.portas.join('+') === 'inicio+notas', JSON.stringify(herd.origem));
  const direto = autorizadoPara(MAPA, {}, [], 'parent');
  add('papel_no_mapa_e_lido_direto', direto.origem === 'direto_do_mapa' && direto.portas.length === 2, JSON.stringify(direto.origem));
  let semFamilia = '';
  try { leFamilia('p187-esta-familia-nao-existe-'); } catch (e) { semFamilia = String(e.message); }
  add('leitor_de_familia_aborta_se_nao_ha_carimpo', semFamilia.startsWith('ABORTA'), semFamilia.slice(0, 54) || 'NAO ABORTOU');
  const ok = f.filter((x) => x.ok).length;
  console.log('P187_FIXTURES ' + ok + '/' + f.length);
  for (const x of f) console.log((x.ok ? 'ok   ' : 'VERM ') + x.nome + ' :: ' + x.detalhe);
  process.exit(ok === f.length ? 0 : 1);
}

const lidoInv = leFamilia('p186-inventario-do-ar-e-do-residuo-');
const lidoVer = leFamilia('p116-consistencia-de-versao-');
const lidoSonda = leFamilia('ah2-sonda-portas-por-papel-');
const espera = { md5: lidoInv.json.ar && lidoInv.json.ar.md5, bytes: lidoInv.json.ar && lidoInv.json.ar.bytes };
if (!espera.md5 || !espera.bytes) throw new Error('ABORTA: o registo ' + lidoInv.nome + ' nao declara ar.md5 e ar.bytes');

const resolvem = readdirSync(RAIZ, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('bfr-candidata-'))
  .map((d) => d.name)
  .filter((nome) => {
    const ficheiro = path.join(RAIZ, nome, 'index.html');
    if (!existsSync(ficheiro)) return false;
    const buf = readFileSync(ficheiro);
    return md5(buf) === espera.md5 && Buffer.byteLength(buf) === espera.bytes;
  });
if (resolvem.length !== 1) throw new Error('ABORTA: ' + resolvem.length + ' candidatas batem com a pegada ' + espera.md5 + ' do registo ' + lidoInv.nome);
const bytes = readFileSync(path.join(RAIZ, resolvem[0], 'index.html'), 'utf8');
const md5Bytes = md5(Buffer.from(bytes, 'utf8'));

const obj = extraiObjecto(bytes, 'const roleSectionAccess = {');
const mapa = vm.runInNewContext('(' + obj.literal + ')');
const SELETOR = '.sidebar .nav-item[data-section],.mobile-more-option[data-section]';
const linhasDoSeletor = [];
for (let i = bytes.indexOf("'" + SELETOR + "'"); i >= 0; i = bytes.indexOf("'" + SELETOR + "'", i + 1)) linhasDoSeletor.push(bytes.slice(0, i).split('\n').length);
const sitios = sitiosDeAlias(bytes);
const alias = sitios.length ? sitios[0].pares : {};
const vocab = [...bytes.slice(Math.max(0, obj.pos - 2600), obj.pos).matchAll(/\[\s*'([a-z_]+)'\s*,\s*'[^']{2,40}'\s*\]/g)].map((m) => m[1]);
const chavesDeSessao = Object.keys(JSON.parse(readFileSync(path.join(DIR_SESSAO, 'ah2-sessions.json'), 'utf8'))).sort();

// Os tres sitios do alias nao escrevem as mesmas palavras: um deles omite o par identico porque o `: role`
// no fim ja faz exactamente isso. Exigir igualdade literal proibiria uma classe legitima em vez de medir a
// unica pergunta que importa - a definicao unica dessa pergunta e `resolucoesDivergentes`, acima, que os
// fixtures nos dois sentidos tambem chamam. A igualdade literal continua registada como campo, nao como portao.
const resolucoes = vocab.map((p) => ({ papel: p, por_sitio: sitios.map((s) => resolveEm(s.pares, p)) }));
const sitiosDivergentes = resolucoesDivergentes(sitios, vocab);
const aliasConcordam = sitios.length > 0 && sitiosDivergentes.length === 0;
const ocorrenciasDoParent = bytes.split('(roleSectionAccess[viewRole] || roleSectionAccess.parent)').length - 1;
const extrasLidos = extrasDoAdminDosBytes(bytes);
const extrasDoAdmin = extrasLidos.itens;

const censo = censosDeMarca(bytes);
const itens = itensDeMarkup(bytes);
const emParser = new Set(itens.uniao);
const emClasseMarkup = new Set(censo.por_classe.markup.distintas);
const abasP186 = lidoInv.json.abas.lista.map((x) => x.secao);
// O que decide se uma aba tem botão montado é o parser de etiquetas; a classe de ocorrencia e diagnostico.
const semItemNoParser = abasP186.filter((s) => !emParser.has(s));
const ondeVive = (s) => classesDoToken(censo, s);

const matriz = vocab.map((papel) => {
  const dec = autorizadoPara(mapa, alias, extrasDoAdmin, papel);
  const portas = [...new Set(dec.portas)].sort();
  return {
    papel,
    viewRole: dec.viewRole,
    origem: dec.origem,
    autorizado: portas.length,
    com_item_no_markup: portas.filter((s) => itens.uniao.includes(s)).length,
    autorizado_sem_item_no_markup: portas.filter((s) => !itens.uniao.includes(s)),
    portas,
    cadeia_de_teste: chavesDeSessao.includes(papel)
  };
});
const autorizadasEmAlgumPapel = new Set(matriz.flatMap((m) => m.portas));
const semPortaEmNenhumPapel = itens.uniao.filter((s) => !autorizadasEmAlgumPapel.has(s));

const linhasBU6 = readFileSync(DOC_BU6, 'utf8').split('\n')
  .map((l) => l.split('|').map((c) => c.trim()))
  .filter((cols) => cols.length >= 7 && /^`[a-z_]+`/.test(cols[1]));
const comparacaoBU6 = linhasBU6.map((cols) => {
  const papel = cols[1].replace(/`/g, '').split(' ')[0];
  const bruto = cols[5];
  const esperado = /^\*\*0\*\*$/.test(bruto) ? 0 : parseInt(bruto, 10);
  const m = matriz.find((x) => x.papel === papel);
  return {
    papel,
    bu6_portas_no_ar: Number.isFinite(esperado) ? esperado : null,
    p187_autorizado: m ? m.autorizado : null,
    p187_com_item_no_markup: m ? m.com_item_no_markup : null,
    origem: m ? m.origem : 'papel_fora_do_vocabulario_do_bundle'
  };
});

const EU = readFileSync(new URL(import.meta.url), 'utf8');
const saida = {
  peca: 'p187-mapa-de-portas-por-papel',
  pergunta: 'quantas abas a regra servida autoriza a cada papel, quantas dessas abas tem item no markup estatico, e onde as duas contas divergem',
  metodo: 'a identidade do ar vem da pegada escrita pelo inventario do p186, resolvida byte-a-byte contra as directorias de candidata; o mapa, o alias, os extras do admin, o recurso ao parent e o seletor da regra de visibilidade sao lidos dos proprios bytes, com aborto se algum nao estiver la; os itens de navegacao contam-se por analise das etiquetas do markup estatico, e as etiquetas cujo valor de rota e um template vao para balde proprio; a concordancia dos sitios de alias e medida por resolucao de cada papel do vocabulario, nunca por igualdade literal dos pares; a classe de cada ocorrencia de data-section decide-se pelo texto em volta, nunca por lista lembrada; das sessoes do mapa mestre so se leem as chaves',
  em: new Date().toISOString(),
  emissor: 'scripts/p187-mapa-de-portas-por-papel.mjs',
  emissor_chars: EU.length,
  emissor_bytes: Buffer.byteLength(EU, 'utf8'),
  emissor_md5: md5(Buffer.from(EU, 'utf8')),
  proveniencias: [
    { campo: 'ar.md5 e ar.bytes', registo: lidoInv.nome, em: lidoInv.json.em },
    { campo: 'abas.lista (os tokens do inventario)', registo: lidoInv.nome, em: lidoInv.json.em },
    { campo: 'identidade conferida por verificador de versao', registo: lidoVer.nome, em: lidoVer.json.em },
    { campo: 'portas por papel medidas no browser', registo: lidoSonda.nome, em: lidoSonda.json.em, md5_shell: lidoSonda.json.md5_shell || null },
    { campo: 'coluna Portas no ar (movel)', registo: 'docs/bu-20-11/03-perfis-e-permissoes.md' }
  ],
  ar: { directora: resolvem[0], md5: md5Bytes, bytes: Buffer.byteLength(bytes, 'utf8'), bate_com_o_inventario: md5Bytes === espera.md5, bate_com_a_sonda_de_browser: md5Bytes === (lidoSonda.json.md5_shell || null) },
  regra_servida: {
    linha_do_mapa: obj.linha,
    papeis_no_mapa: Object.keys(mapa).length,
    seletor_da_regra: SELETOR,
    linhas_onde_o_seletor_aparece_entre_aspas: linhasDoSeletor,
    sitios_de_alias: sitios.map((s) => ({ linha: s.linha, pares: Object.keys(s.pares).length })),
    alias,
    alias_concordam: aliasConcordam,
    pares_por_sitio: sitios.map((s) => Object.keys(s.pares).length),
    resolucoes_por_papel: resolucoes,
    resolucoes_divergentes: sitiosDivergentes,
    papeis_com_resolucao_divergente: sitiosDivergentes.length,
    ocorrencias_da_clausula_do_parent: ocorrenciasDoParent,
    extras_do_admin: extrasDoAdmin,
    extras_do_admin_leitura: { ocorrencias: extrasLidos.ocorrencias, trecho_pos_ancora: extrasLidos.trecho, para_onde_a_corrida_foi: extrasLidos.para_onde_a_corrida_foi },
    papeis_do_vocabulario: vocab.length,
    chaves_de_sessao_lidas: chavesDeSessao.length,
    papeis_sem_chave_no_mapa: vocab.filter((p) => autorizadoPara(mapa, alias, extrasDoAdmin, p).origem === 'recurso_ao_parent')
  },
  censo_da_marca: censo,
  itens_de_markup: {
    etiquetas_analisadas: itens.etiquetas_analisadas,
    // `distintas` é a conta e `valores` é a lista: um leitor que precisa dos nomes não pode derivá-los
    // dum dígito, e foi assim que a sonda abortou no primeiro teste.
    nav_item: { ocorrencias: itens.nav_item.ocorrencias, distintas: itens.nav_item.distintas.length, valores: [...itens.nav_item.distintas].sort() },
    mobile_more_option: { ocorrencias: itens.mobile_more_option.ocorrencias, distintas: itens.mobile_more_option.distintas.length, valores: [...itens.mobile_more_option.distintas].sort() },
    recipientes: itens.recipientes,
    uniao_distinta: itens.uniao.length,
    uniao_valores: [...itens.uniao].sort(),
    itens_montados_por_template: itens.itens_montados_por_template
  },
  divergencia_contra_o_inventario: {
    tokens_no_inventario: abasP186.length,
    itens_no_parser: emParser.size,
    sem_item_no_parser: semItemNoParser,
    onde_vive_cada_um: Object.fromEntries(semItemNoParser.map((s) => [s, ondeVive(s)])),
    so_na_classe_markup_do_classificador: semItemNoParser.filter((s) => emClasseMarkup.has(s)),
    sem_classe_nenhuma: semItemNoParser.filter((s) => ondeVive(s).length === 0),
    diferenca_classificador_vs_parser: {
      so_no_classificador: [...emClasseMarkup].filter((s) => !emParser.has(s)).sort(),
      so_no_parser: [...emParser].filter((s) => !emClasseMarkup.has(s)).sort()
    }
  },
  // A linha publicada é a linha medida, com as `portas` declaradas: sem elas, o leitor só pode abortar, e
  // foi o que a sonda fez. Um campo que vive só na memória do produtor não é prova para ninguém.
  matriz_por_papel: matriz.map((m) => ({ papel: m.papel, viewRole: m.viewRole, origem: m.origem, autorizado: m.autorizado, com_item_no_markup: m.com_item_no_markup, autorizado_sem_item_no_markup: m.autorizado_sem_item_no_markup, portas: m.portas, cadeia_de_teste: m.cadeia_de_teste })),
  abas_sem_porta_em_nenhum_papel: semPortaEmNenhumPapel,
  comparacao_com_bu6: comparacaoBU6,
  o_que_prova: 'que estas sao as portas que a regra servida autoriza a cada papel do vocabulario do bundle, e que estes nomes autorizados nao tem item nenhum no markup estatico',
  o_que_NAO_prova: 'que o browser esconda ou mostre exactamente estes itens: a mesma regra serve-se de ascendencia `.hidden`, de contentores por vista e do modal de primeiro acesso, e isso so se mede no browser; que uma autorizacao do mapa seja autorizada pelo backend; que as contagens de BU-6 sejam do mesmo shell; e que um item sem porta no mapa seja inalcanavel por outra via',
  portoes: [],
  veredito: null
};

reg('ar_resolve_numa_candidata_e_bate_com_o_inventario', resolvem.length === 1 && md5Bytes === espera.md5, resolvem.join(' ') + ' md5=' + md5Bytes + ' esperado=' + espera.md5);
reg('seletor_da_regra_de_visibilidade_vive_dos_bytes', linhasDoSeletor.length >= 1, 'linhas ' + JSON.stringify(linhasDoSeletor));
reg('os_sitios_de_alias_resolvem_cada_papel_para_a_mesma_chave', aliasConcordam, 'sitios=' + sitios.length + ' pares_por_sitio=' + JSON.stringify(sitios.map((s) => Object.keys(s.pares).length)) + ' vocabulario=' + vocab.length + ' resolucoes_divergentes=' + JSON.stringify(sitiosDivergentes));
reg('clausula_do_parent_existe_e_ha_papel_que_a_usa', ocorrenciasDoParent >= 1 && saida.regra_servida.papeis_sem_chave_no_mapa.length >= 1, 'ocorrencias=' + ocorrenciasDoParent + ' papeis_que_herdam=' + JSON.stringify(saida.regra_servida.papeis_sem_chave_no_mapa));
reg('cada_papel_do_vocabulario_tem_cadeia_de_teste', vocab.every((p) => chavesDeSessao.includes(p)), 'vocabulario=' + vocab.length + ' sessoes=' + chavesDeSessao.length + ' so_sessoes=' + JSON.stringify(chavesDeSessao.filter((x) => !vocab.includes(x))) + ' so_vocabulario=' + JSON.stringify(vocab.filter((x) => !chavesDeSessao.includes(x))));
reg('cada_token_sem_item_no_parser_tem_classe_de_ocorrencia_lida', semItemNoParser.every((s) => ondeVive(s).length >= 1), 'sem_item=' + JSON.stringify(semItemNoParser) + ' sem_classe=' + JSON.stringify(semItemNoParser.filter((s) => ondeVive(s).length === 0)));
reg('o_parser_de_etiquetas_levanta_itens_montados', emParser.size >= 1 && itens.etiquetas_analisadas >= 1, 'parser=' + emParser.size + ' etiquetas=' + itens.etiquetas_analisadas);
reg('pelo_menos_um_papel_tem_porta_sem_item_no_markup', matriz.some((m) => m.autorizado_sem_item_no_markup.length > 0), 'por_papel=' + JSON.stringify(matriz.map((m) => m.papel + ':' + m.autorizado_sem_item_no_markup.length)));
reg('pelo_menos_uma_aba_servida_nao_e_autorizada_a_nenhum_papel', semPortaEmNenhumPapel.length > 0, JSON.stringify(semPortaEmNenhumPapel));
reg('a_tabela_de_portas_no_ar_foi_lida_com_numero_em_toda_a_linha', comparacaoBU6.length > 0 && comparacaoBU6.every((x) => Number.isFinite(x.bu6_portas_no_ar)), 'linhas=' + comparacaoBU6.length + ' sem_numero=' + JSON.stringify(comparacaoBU6.filter((x) => !Number.isFinite(x.bu6_portas_no_ar)).map((x) => x.papel)));
reg('nenhum_valor_de_sessao_chega_ao_registo', JSON.stringify(saida).includes('refresh_token') === false && JSON.stringify(saida).includes('access_token') === false, 'procurado_no_texto_do_proprio_registo');
reg('extras_do_admin_sao_lidos_dos_bytes', extrasDoAdmin.length > 0, 'ancora_ocorrencias=' + extrasLidos.ocorrencias + ' itens=' + JSON.stringify(extrasDoAdmin) + ' para_onde=' + extrasLidos.para_onde_a_corrida_foi + ' trecho=' + extrasLidos.trecho);

const verdes = portoes.filter((x) => x.ok).length;
saida.portoes = portoes;
saida.veredito = 'P187_MATRIZ_MEDIDA ' + verdes + '/' + portoes.length;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('ESCRITO: ' + path.basename(OUT));
console.log('ar=' + saida.ar.directora + ' bate_com_o_inventario=' + saida.ar.bate_com_o_inventario + ' bate_com_a_sonda=' + saida.ar.bate_com_a_sonda_de_browser);
console.log('censo total=' + censo.total_de_ocorrencias + ' markup=' + censo.por_classe.markup.ocorrencias + '/' + censo.por_classe.markup.distintas.length + ' seletor=' + censo.por_classe.seletor.ocorrencias + '/' + censo.por_classe.seletor.distintas.length + ' string=' + censo.por_classe.string_ou_outro.ocorrencias + '/' + censo.por_classe.string_ou_outro.distintas.length);
console.log('sem_item_no_parser=' + JSON.stringify(semItemNoParser) + ' classes=' + JSON.stringify(Object.fromEntries(semItemNoParser.map((s) => [s, ondeVive(s)]))) + ' so_no_classificador=' + JSON.stringify(saida.divergencia_contra_o_inventario.diferenca_classificador_vs_parser.so_no_classificador) + ' so_no_parser=' + JSON.stringify(saida.divergencia_contra_o_inventario.diferenca_classificador_vs_parser.so_no_parser));
console.log('itens_de_markup nav=' + itens.nav_item.ocorrencias + '/' + itens.nav_item.distintas.length + ' mais=' + itens.mobile_more_option.ocorrencias + '/' + itens.mobile_more_option.distintas.length + ' uniao=' + itens.uniao.length + ' recipientes=' + JSON.stringify(itens.recipientes));
console.log('regra papeis_no_mapa=' + Object.keys(mapa).length + ' sitios_alias=' + JSON.stringify(sitios.map((s) => s.linha)) + ' ocorrencias_parent=' + ocorrenciasDoParent + ' extras_admin=' + JSON.stringify(extrasDoAdmin) + ' vocabulario=' + vocab.length + ' herdam=' + JSON.stringify(saida.regra_servida.papeis_sem_chave_no_mapa));
for (const m of matriz) console.log('  ' + m.papel + ' -> ' + m.viewRole + ' ' + m.origem + ' autorizadas=' + m.autorizado + ' com_item=' + m.com_item_no_markup + ' sem_item=' + JSON.stringify(m.autorizado_sem_item_no_markup) + ' cadeia=' + (m.cadeia_de_teste ? 'sim' : 'NAO'));
console.log('abas_sem_porta_em_nenhum_papel=' + JSON.stringify(semPortaEmNenhumPapel));
console.log('extras_leitura ancora_ocorrencias=' + extrasLidos.ocorrencias + ' trecho=' + extrasLidos.trecho);
console.log('template_nao_contado_na_uniao=' + JSON.stringify(itens.itens_montados_por_template));
for (const x of comparacaoBU6) console.log('  BU6 ' + x.papel + ': no_ar=' + x.bu6_portas_no_ar + ' p187_autorizadas=' + x.p187_autorizado + ' com_item=' + x.p187_com_item_no_markup + ' (' + x.origem + ')');
for (const g of portoes) if (!g.ok) console.log('VERMELHO ' + g.nome + ' :: ' + g.detalhe);
console.log(saida.veredito);
