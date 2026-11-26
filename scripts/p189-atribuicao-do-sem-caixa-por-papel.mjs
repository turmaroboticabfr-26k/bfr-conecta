// Porque este programa existe: o eixo da completude da matriz §SM.76 separa duas causas que os agregados não
// separam sozinhos — uma porta que o mapa autoriza mas que não aparece porque o GRANT do nome está morto
// (token ausente da superfície), e uma porta que aparece no DOM mas está escondida por classe. A atribuição
// estava a ser feita por leitura avulsa da minha directoria de sessão; este arquivo é o produtor versionado
// das duas contas citadas: por papel, o `appShell_classes` e o `primeiro_ancestral_sem_caixa` que o produtor
// declara, e por lote, quantas linhas tem cada classe do `resumo.por_classe_em_todos_os_papeis`.
//
// O que prova: que a célula «falta» de um papel tem por classe declarada `ITEM_MAS_ESCONDIDO_POR_CLASSE` e que
// o nó existe no DOM com caixa 0x0 — existe e está escondido por classe, não está ausente. O que NÃO prova:
// se o utilizador devia ou não vê-la (isso é decisão do dono sobre o mapa), nem o conteúdo do painel.
//
// As coordenadas dos campos são lidas do próprio artefacto: a chave dos papéis é escolhida pelo padrão das
// chaves de topo (o produtor escreve a palavra acentuada; um leitor que a redigite sem acento recebe
// `undefined` — §SM.72) e a identidade do ar vem do `ar.md5` do registo mais novo da família do `p187`, com
// aborto se nenhum resolver. Um registo cuja pegada de shell não bate com esse ar é impresso com a etiqueta
// FORA_DO_AR e mantém-se fora de qualquer leitura apressada: cada registo imprime o seu próprio histograma,
// por isso nenhuma cifra de um ar velho pode ser emprestada ao inventário deste ar.
//
// Só-leitura: 0 banco, 0 publicação, 0 DDL, 0 mint, 0 push, 0 browser, 0 escrita de registo.
// Uso: node scripts/p189-atribuicao-do-sem-caixa-por-papel.mjs <rotulos-csv> | --familia | --sonda-fixtures
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = path.join(RAIZ, 'evidence');
const FAM_SONDA = 'ah2-sonda-portas-por-papel-';
const FAM_MAPA = 'p187-mapa-de-portas-por-papel-';
const argv = process.argv.slice(2);
const MODO_FIXTURES = argv.includes('--sonda-fixtures');
const MODO_FAMILIA = argv.includes('--familia');
const ROTULOS = ((argv.filter((a) => !a.startsWith('--'))[0] || '').split(',').map((s) => s.trim()).filter(Boolean));

function leFamilia(prefixo) {
  const nomes = readdirSync(EV).filter((f) => f.startsWith(prefixo) && f.endsWith('.json'));
  const comCarimpo = nomes.map((f) => {
    const j = JSON.parse(readFileSync(path.join(EV, f), 'utf8'));
    return { nome: f, ms: Date.parse(j.em || ''), json: j };
  }).filter((x) => Number.isFinite(x.ms));
  if (!comCarimpo.length) throw new Error('ABORTA: nenhum registo da familia ' + prefixo + ' tem carimpo `em` legivel');
  comCarimpo.sort((a, b) => b.ms - a.ms);
  if (comCarimpo.length > 1 && comCarimpo[0].ms === comCarimpo[1].ms) {
    throw new Error('ABORTA: empate no carimpo mais novo da familia ' + prefixo);
  }
  return comCarimpo[0];
}

function chaveDosPapeis(j) {
  return Object.keys(j).find((k) => /^pap/.test(k)) || null;
}

// Uma linha por papel, com os campos que o produtor declara e com o `null` impresso quando ele não declara
// nenhum: apagar a célula vazia seria o portão que proíbe a classe legítima «nada houve para explicar».
function linhaDoPapel(papel, reg) {
  const sc = reg.sidebar_censo || {};
  const anc = sc.primeiro_ancestral_sem_caixa || {};
  const cx = anc.caixa || {};
  return papel + ': boot_ok=' + JSON.stringify(reg.boot_ok === true)
    + ' appShell=' + JSON.stringify(sc.appShell_classes ?? null)
    + ' ancestral={tag:' + (anc.tag ?? null) + ',classe:' + (anc.classe ?? null) + ',caixa:' + (cx.w ?? null) + 'x' + (cx.h ?? null) + '}'
    + ' login=' + JSON.stringify(sc.login ?? null)
    + ' com_caixa=' + JSON.stringify(sc.com_caixa ?? null)
    + ' no_dom=' + JSON.stringify(sc.no_dom ?? null)
    + (reg.classe ? ' classe_do_papel=' + reg.classe : '');
}

function histogramaDasClasses(j) {
  const resumo = j.resumo || {};
  const porClasse = resumo.por_classe_em_todos_os_papeis;
  if (!porClasse || typeof porClasse !== 'object') return null;
  return Object.fromEntries(Object.entries(porClasse).map(([c, linhas]) => [c, (linhas || []).length]));
}

function etiquetaDoRegisto(j, ar) {
  if (typeof j.md5_shell !== 'string') return 'SEM_CAMPO_MD5_SHELL_DECLARADO';
  return j.md5_shell === ar.md5 ? 'NO_AR' : 'FORA_DO_AR md5_shell=' + j.md5_shell;
}

const portoes = [];
const regFix = (nome, ok, detalhe) => portoes.push({ nome, ok: !!ok, detalhe });

if (MODO_FIXTURES) {
  const AR = { nome: 'p189-fx.json', md5: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
  regFix('f1_chave_acentuada_e_achada_por_padrao', chaveDosPapeis({ 'papéis': { a: 1 } }) === 'papéis', String(chaveDosPapeis({ 'papéis': {} })));
  regFix('f2_chave_sem_acento_e_achada_por_padrao', chaveDosPapeis({ papeis: { a: 1 } }) === 'papeis', String(chaveDosPapeis({ papeis: {} })));
  regFix('f3_sem_chave_devolve_nulo_e_nao_falha', chaveDosPapeis({ outro: 1 }) === null, String(chaveDosPapeis({ outro: 1 })));
  const semCampos = linhaDoPapel('director', {});
  regFix('f4_papel_sem_sidebar_censo_imprime_nulos', semCampos.indexOf('appShell=null') > 0 && semCampos.indexOf('com_caixa=null') > 0 && semCampos.indexOf('caixa:nullxnull') > 0, semCampos);
  const comCampos = linhaDoPapel('pedagogical', {
    boot_ok: true,
    sidebar_censo: { appShell_classes: 'app-shell ready teacher-mode', com_caixa: 0, no_dom: 12, login: { w: 0, h: 0 },
      primeiro_ancestral_sem_caixa: { tag: 'button', classe: 'nav-item bfr-platform-nav-item tap-target hidden', caixa: { w: 0, h: 0 } } }
  });
  regFix('f5_a_classe_que_esconde_aparece_na_linha', comCampos.indexOf('teacher-mode') > 0 && comCampos.indexOf('hidden') > 0 && comCampos.indexOf('caixa:0x0') > 0, comCampos);
  regFix('f6_papel_sem_boot_traz_a_classe_do_produtor', linhaDoPapel('pending', { boot_ok: false, classe: 'CENSO_FALHOU' }).indexOf('classe_do_papel=CENSO_FALHOU') > 0, linhaDoPapel('pending', { boot_ok: false, classe: 'CENSO_FALHOU' }));
  regFix('f7_resumo_sem_a_chave_devolve_nulo', histogramaDasClasses({}) === null, JSON.stringify(histogramaDasClasses({})));
  regFix('f8_histograma_counta_por_classe', JSON.stringify(histogramaDasClasses({ resumo: { por_classe_em_todos_os_papeis: { A: [1, 2, 3], B: [] } } })) === '{"A":3,"B":0}', JSON.stringify(histogramaDasClasses({ resumo: { por_classe_em_todos_os_papeis: { A: [1, 2, 3], B: [] } } })));
  regFix('f9_no_ar_e_batido_por_pegada', etiquetaDoRegisto({ md5_shell: AR.md5 }, AR) === 'NO_AR', etiquetaDoRegisto({ md5_shell: AR.md5 }, AR));
  regFix('f10_fora_do_ar_e_etiquetado_sem_abortar', etiquetaDoRegisto({ md5_shell: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }, AR).startsWith('FORA_DO_AR') === true, etiquetaDoRegisto({ md5_shell: 'b'.repeat(32) }, AR));
  regFix('f11_sem_o_campo_declarado_e_etiquetado', etiquetaDoRegisto({}, AR) === 'SEM_CAMPO_MD5_SHELL_DECLARADO', etiquetaDoRegisto({}, AR));
  const ok = portoes.filter((x) => x.ok).length;
  console.log('P189_FIXURAS ' + ok + '/' + portoes.length + (ok === portoes.length ? ' P189_FIXURAS_OK' : ' P189_FIXURAS_VERMELHO'));
  for (const x of portoes) if (!x.ok) console.log('  FALHA ' + x.nome + ' :: ' + x.detalhe);
  process.exit(ok === portoes.length ? 0 : 1);
}

if (!MODO_FAMILIA && ROTULOS.length === 0) {
  throw new Error('ABORTA: diga o lote de rotulos (csv) ou peca --familia. Esta peca nao escolhe registos por si.');
}
const arReg = leFamilia(FAM_MAPA);
if (!arReg.json.ar || typeof arReg.json.ar.md5 !== 'string') {
  throw new Error('ABORTA: o registo ' + arReg.nome + ' nao declara ar.md5 — nao ha identidade de ar para etiquetar');
}
const AR = { nome: arReg.nome, md5: arReg.json.ar.md5, em: arReg.json.em };
console.log('ar lido do registo mais novo da familia do mapa: ' + AR.nome + ' em=' + AR.em + ' md5=' + AR.md5);

const rotulos = MODO_FAMILIA
  ? readdirSync(EV).filter((f) => f.startsWith(FAM_SONDA) && f.endsWith('.json')).map((f) => f.slice(FAM_SONDA.length, -5))
  : ROTULOS;
let impressos = 0;
let foraDoAr = 0;
for (const rotulo of rotulos) {
  const ficheiro = path.join(EV, FAM_SONDA + rotulo + '.json');
  if (!existsSync(ficheiro)) { console.log(rotulo + ' FICHEIRO_AUSENTE'); continue; }
  const j = JSON.parse(readFileSync(ficheiro, 'utf8'));
  const etq = etiquetaDoRegisto(j, AR);
  if (etq !== 'NO_AR') foraDoAr++;
  const chave = chaveDosPapeis(j);
  console.log('\n== ' + rotulo + ' etiqueta=' + etq + ' em=' + (j.em || '-') + ' largura=' + JSON.stringify(j.largura) + ' modo=' + JSON.stringify(j.modo));
  if (!chave) { console.log('   SEM_CHAVE_DE_PAPEIS topo=' + JSON.stringify(Object.keys(j))); continue; }
  console.log('   chave_dos_papeis_lida_por_padrao=' + JSON.stringify(chave));
  for (const [papel, reg] of Object.entries(j[chave] || {})) console.log('   ' + linhaDoPapel(papel, reg));
  const hist = histogramaDasClasses(j);
  if (hist === null) { console.log('   RESUMO_SEM_CHAVE por_classe_em_todos_os_papeis — nada impresso, nao zero inventado'); continue; }
  console.log('   resumo_chaves=' + JSON.stringify(Object.keys(j.resumo || {})));
  for (const [classe, n] of Object.entries(hist)) {
    const amostra = classe === 'ITEM_MAS_ESCONDIDO_POR_CLASSE' ? ' :: ' + JSON.stringify((j.resumo.por_classe_em_todos_os_papeis[classe] || []).slice(0, 6)) : '';
    console.log('     ' + classe + ' = ' + n + amostra);
  }
  impressos++;
}
console.log('\nresumo: registos_impressos=' + impressos + ' de ' + rotulos.length + ' · fora_do_ar=' + foraDoAr);
console.log(impressos > 0 && foraDoAr === 0 ? 'P189_ATRIBUICAO_NO_AR_OK' : 'P189_ATRIBUICAO_PARCIAL_FORA_DO_AR_OU_VAZIO');
