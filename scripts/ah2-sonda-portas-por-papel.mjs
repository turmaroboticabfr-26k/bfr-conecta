// Porque este programa existe: `scripts/ah2-confere-portas.mjs` deixou 25 linhas `NAO TESTADA — porta
// inexistente` em três classes e não decidiu nenhuma. As bytes servidas dizem que `comunicacao`, `fotos` e
// `jogos-escolares` TÊM botões no markup (4× cada), enquanto `escola-historia`, `coordenacao-chat`,
// `admin-crachas`, `videos-aprender`, `supervisao` e `professor-agenda-hoje` não têm casa nem botão nenhum.
// Mas o que decide se uma porta existe para UMA PESSOA é o DOM daquele papel naquele instante, e a regra do
// produto está escrita em `app/bfr-responsive-presentation.js:71-89` (`drawerItems()`): a gaveta só apanha
// `#appShell .sidebar .nav-item[data-section]:not(.hidden)` e `#mobileMoreMenu
// .mobile-more-option[data-section]:not(.hidden)`, e ainda descarta quem tenha `closest('.hidden')` ou
// texto vazio. «Porta inexistente» pode portanto significar quatro coisas diferentes, e só o browser as
// separa:
//   ITEM_FORA_DOS_DOIS_SELECTORES — o botão existe noutro contentor (a gaveta nunca o pode copiar);
//   ITEM_MAS_ESCONDIDO_POR_CLASSE — `.hidden` em si ou em ancestral: o produto esconde a porta deste papel;
//   ITEM_SEM_TEXTO — `drawerItems()` descarta-o pela régua da etiqueta;
//   ITEM_NA_GAVETA — a porta está lá, e a linha da tabela é do INSTRUMENTO.
// Não escreve em base, não faz DDL, não publica: um `fetch` de token, uma navegação por papel e leitura de
// DOM. A anon key lê-se das bytes servidas (linha ANON de `ah2-mobile2.mjs:44`), nunca escrita aqui.
// Uso: node scripts/ah2-sonda-portas-por-papel.mjs [prefixo=m5] [largura=390] [rotulo=pp1] [papéis…] [--matriz]
//
// O modo `--matriz` existe porque a FASE 3 do briefing tem uma pergunta que o modo antigo não faz: não «esta
// rota tem botão?», mas «este papel vê exactamente as portas que o produto lhe autoriza?». Aí a lista de
// rotas, o papel e o conjunto autorizado NÃO são escritos aqui — leem-se do registo mais novo do
// `p187-mapa-de-portas-por-papel` (campos `matriz_por_papel[].portas` e `itens_de_markup`), e a falta de
// qualquer um deles aborta: quem precisa do veredicto de outra peça lê o registo dela, nunca re-dactilografa
// o predicado. O censo passa a correr sobre o universo inteiro do registo (não só as rotas em dúvida) porque
// a face nova é o excesso: uma porta visível a quem não foi autorizada.
// Duas réguas separadas, uma cláusula por eixo: `classe` (modo antigo) responde ONDE vive um token;
// `visivel_no_ecra` responde se aquele papel o pode ver — existe, sem `.hidden` em si nem em ancestral, com
// etiqueta não vazia e com caixa pintada. No modo matriz o portão de arranque é a barra lateral pintada, e a
// gaveta não é afordância obrigatória porque o modo corre na largura onde a barra é a superfície.
// O `drawerItems()` citado acima vive em `app/bfr-responsive-presentation.js:71` e medido agora dá 0
// ocorrências no `index.html` servido: a regra que o ar serve é o seletor literal, que o p187 registou em
// `regra_servida.linhas_onde_o_seletor_aparece_entre_aspas`. Continuo a não afirmar o que só a fonte tem.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const EV = `${DIR}/bfr-conecta/evidence`;
const PREFIXO = process.argv[2] || 'm5';
const LARGURA = parseInt(process.argv[3] || '390', 10);
const ROTULO = process.argv[4] || 'pp1';
// Um flag não é um papel: o modo antigo lê o resto da linha como lista de papéis, por isso as duas coisas
// separam-se aqui e não a jusante.
const ARGOS = process.argv.slice(5);
const MODO_MATRIZ = ARGOS.includes('--matriz');
const SÓ_PAPEIS = ARGOS.filter((a) => !a.startsWith('--'));
if (!Number.isFinite(LARGURA)) throw new Error('ABORTA: largura «' + process.argv[3] + '» não é número — os argumentos são posicionais: [prefixo] [largura] [rótulo] [papéis…] [--matriz]');

// — leitor de família: o mecanismo é o do p187 (o mais novo por `em`, aborto se não há ou se há empate) porque
// quem precisa do veredicto de outra peça lê o registo dela e nunca re-dactilografa o predicado. Em modo
// matriz nem uma rota nem um papel saem desta ficha: saem de `matriz_por_papel[].portas`. —
function leFamilia(prefixo) {
  const nomes = readdirSync(EV).filter((f) => f.startsWith(prefixo) && f.endsWith('.json'));
  const comCarimpo = nomes.map((f) => {
    const j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8'));
    return { nome: f, ms: Date.parse(j.em || ''), json: j };
  }).filter((x) => Number.isFinite(x.ms));
  if (!comCarimpo.length) throw new Error('ABORTA: nenhum registo da familia ' + prefixo + ' tem carimpo `em` legivel');
  comCarimpo.sort((a, b) => b.ms - a.ms);
  if (comCarimpo.length > 1 && comCarimpo[0].ms === comCarimpo[1].ms) {
    throw new Error('ABORTA: empate no carimpo mais novo da familia ' + prefixo + ' — ' + comCarimpo[0].nome + ' e ' + comCarimpo[1].nome);
  }
  return comCarimpo[0];
}
// Campos exigidos por nome: comparar um `undefined` lido dum campo que o produtor não escreve só pode dar
// vermelho, e foi assim que o p137 e o p116 já mentiram.
function lidoDoRegistoP187(j) {
  if (!Array.isArray(j.matriz_por_papel) || !j.matriz_por_papel.length) throw new Error('ABORTA: o registo não declara matriz_por_papel como lista não vazia');
  for (const linha of j.matriz_por_papel) if (!Array.isArray(linha.portas)) throw new Error('ABORTA: a linha ' + linha.papel + ' não declara portas como lista');
  const im = j.itens_de_markup || {};
  for (const balde of ['nav_item', 'mobile_more_option']) if (!im[balde] || !Array.isArray(im[balde].valores) || !im[balde].valores.length) throw new Error('ABORTA: itens_de_markup.' + balde + '.valores não é lista não vazia — o registo declara a conta, mas eu preciso dos nomes');
  if (!im.itens_montados_por_template || !Array.isArray(im.itens_montados_por_template.valores)) throw new Error('ABORTA: o registo não declara itens_montados_por_template.valores');
  return j;
}
// O universo a censurar é a união do que o mapa autoriza com o que o markup estático monta. O que o produtor
// declarou como etiqueta montada em tempo de execução fica de fora — não se censura um nome que é um template.
function universoDoRegisto(j) {
  const templates = new Set(j.itens_de_markup.itens_montados_por_template.valores);
  const estaticos = j.itens_de_markup.nav_item.valores.concat(j.itens_de_markup.mobile_more_option.valores);
  return [...new Set(j.matriz_por_papel.flatMap((l) => l.portas).concat(estaticos))].filter((s) => !templates.has(s)).sort();
}
function esperadoDoRegisto(j) {
  return Object.fromEntries(j.matriz_por_papel.map((l) => [l.papel, [...new Set(l.portas)].sort()]));
}
// Duas faces, uma cláusula cada: o excesso (o ar mostra o que o mapa não autorizou) e a falta (o mapa
// autorizou e o ar não mostra). Nenhuma das duas pode ser derivada da outra, e ambas se imprimem mesmo
// vazias — vazio é o veredicto que o briefing pede para a face de segurança.
// Que parte da regra servida é a superfície de secretária decide-se pela forma do seletor, nunca pela
// posição na vírgula: `.nav-item` é a barra lateral, `.mobile-more-option` é o menu «Mais» do telemóvel.
function parte_sidebar_da_regra(regra) {
  const partes = String(regra).split(',').map((s) => s.trim()).filter(Boolean);
  const sidebar = partes.find((s) => s.includes('.nav-item')) || null;
  return { partes, sidebar };
}
function comparaPapel(universo, censo, autorizadas) {
  const visiveis = universo.filter((r) => censo[r] && censo[r].visivel_no_ecra === true).sort();
  const autorizadasOrdenadas = [...new Set(autorizadas)].sort();
  return {
    tokens_censurados: Object.keys(censo).length,
    universo_esperado: universo.length,
    ausentes_do_censo: universo.filter((r) => !censo[r]).sort(),
    visiveis,
    visiveis_nao_autorizadas: visiveis.filter((r) => !autorizadas.includes(r)),
    autorizadas_nao_visiveis: autorizadasOrdenadas.filter((r) => !visiveis.includes(r)),
    autorizadas_registradas: autorizadasOrdenadas.length
  };
}
if (ARGOS.includes('--sonda-fixtures')) {
  const f = [];
  const add = (nome, ok, detalhe) => f.push({ nome, ok: !!ok, detalhe });
  const REG = {
    em: '2026-01-01T00:00:00.000Z',
    matriz_por_papel: [
      { papel: 'parent', portas: ['inicio', 'notas', 'fotos'], origem: 'direto_do_mapa' },
      { papel: 'psychology', portas: ['psychology', 'inicio'], origem: 'direto_do_mapa' }
    ],
    itens_de_markup: {
      nav_item: { distintas: 3, valores: ['inicio', 'notas', 'mural'] },
      mobile_more_option: { distintas: 2, valores: ['fotos', 'more'] },
      itens_montados_por_template: { ocorrencias: 1, valores: ['$' + '{section}'] }
    }
  };
  add('lido_do_registo_aceita_o_fixture_positivo', lidoDoRegistoP187(REG) === REG, 'sem aborto');
  const SEM_PORTAS = JSON.parse(JSON.stringify(REG)); delete SEM_PORTAS.matriz_por_papel;
  let m1 = ''; try { lidoDoRegistoP187(SEM_PORTAS); } catch (e) { m1 = String(e.message); }
  add('lido_do_registo_aborta_se_a_lista_de_papeis_nao_esta_declarada', m1.startsWith('ABORTA'), m1.slice(0, 60) || 'NAO ABORTOU');
  const LINHA_SEM_PORTAS = JSON.parse(JSON.stringify(REG)); delete LINHA_SEM_PORTAS.matriz_por_papel[1].portas;
  let m2 = ''; try { lidoDoRegistoP187(LINHA_SEM_PORTAS); } catch (e) { m2 = String(e.message); }
  add('lido_do_registo_aborta_se_uma_linha_nao_declara_portas', m2.startsWith('ABORTA'), m2.slice(0, 60) || 'NAO ABORTOU');
  const SEM_TEMPLATE = JSON.parse(JSON.stringify(REG)); delete SEM_TEMPLATE.itens_de_markup.itens_montados_por_template;
  let m3 = ''; try { lidoDoRegistoP187(SEM_TEMPLATE); } catch (e) { m3 = String(e.message); }
  add('lido_do_registo_aborta_se_o_balde_de_template_nao_esta_declarado', m3.startsWith('ABORTA'), m3.slice(0, 60) || 'NAO ABORTOU');
  // O vermelho que a corrida real deu: um balde que declara a conta mas não os nomes.
  const SO_CONTA = JSON.parse(JSON.stringify(REG)); delete SO_CONTA.itens_de_markup.nav_item.valores;
  let m5 = ''; try { lidoDoRegistoP187(SO_CONTA); } catch (e) { m5 = String(e.message); }
  add('lido_do_registo_aborta_se_um_balde_estatico_nao_declara_os_nomes', m5.startsWith('ABORTA'), m5.slice(0, 60) || 'NAO ABORTOU');
  const UNI = universoDoRegisto(REG);
  add('universo_une_autorizadas_e_estaticas', UNI.join('+') === 'fotos+inicio+more+mural+notas+psychology', JSON.stringify(UNI));
  add('universo_exclui_a_etiqueta_montada_por_template_por_decisao_do_produtor', !UNI.some((s) => s.includes('section')) && UNI.every((s) => !s.includes('$')), 'sem template em ' + UNI.length + ' tokens');
  add('esperado_lee_as_autorizadas_por_papel', JSON.stringify(esperadoDoRegisto(REG)) === JSON.stringify({ parent: ['fotos', 'inicio', 'notas'], psychology: ['inicio', 'psychology'] }), JSON.stringify(esperadoDoRegisto(REG)));
  const CENSO_F = {
    inicio: { visivel_no_ecra: true }, notas: { visivel_no_ecra: true }, fotos: { visivel_no_ecra: false },
    more: { visivel_no_ecra: true }, mural: { visivel_no_ecra: true }, psychology: { visivel_no_ecra: true }
  };
  const CP = comparaPapel(UNI, CENSO_F, ['inicio', 'notas', 'fotos']);
  add('compara_nomeia_o_excesso_do_que_o_ar_mostra_além_do_mapa', CP.visiveis_nao_autorizadas.join('+') === 'more+mural+psychology', JSON.stringify(CP.visiveis_nao_autorizadas));
  add('compara_nomeia_a_falta_do_que_o_mapa_autoriza_e_o_ar_esconde', CP.autorizadas_nao_visiveis.join('+') === 'fotos', JSON.stringify(CP.autorizadas_nao_visiveis));
  const CP_VAZIO = comparaPapel(['inicio'], { inicio: { visivel_no_ecra: true } }, ['inicio']);
  add('compara_imprime_as_duas_faces_mesmo_quando_vazias', CP_VAZIO.visiveis_nao_autorizadas.length === 0 && CP_VAZIO.autorizadas_nao_visiveis.length === 0 && CP_VAZIO.visiveis.join('+') === 'inicio', JSON.stringify(CP_VAZIO));
  const CP_FALTA = comparaPapel(['inicio', 'notas'], { inicio: { visivel_no_ecra: true } }, ['inicio']);
  add('compara_registra_o_token_do_universo_ausente_do_censo', CP_FALTA.ausentes_do_censo.join('+') === 'notas' && CP_FALTA.tokens_censurados === 1 && CP_FALTA.universo_esperado === 2, JSON.stringify(CP_FALTA));
  let m4 = ''; try { leFamilia('ah2-sonda-portas-por-papel-esta-familia-nao-existe-'); } catch (e) { m4 = String(e.message); }
  add('leitor_de_familia_aborta_se_nao_ha_carimpo', m4.startsWith('ABORTA'), m4.slice(0, 60) || 'NAO ABORTOU');
  const REGRAMA = parte_sidebar_da_regra('.sidebar .nav-item[data-section],.mobile-more-option[data-section]');
  add('a_regra_de_duas_partes_devolve_a_barra_pela_forma', REGRAMA.partes.length === 2 && REGRAMA.sidebar === '.sidebar .nav-item[data-section]', JSON.stringify(REGRAMA));
  const REG_SO_MENU = parte_sidebar_da_regra('.mobile-more-option[data-section]');
  add('uma_regra_sem_nav_item_devolve_barra_nula_para_o_aborta_funcionar', REG_SO_MENU.partes.length === 1 && REG_SO_MENU.sidebar === null, JSON.stringify(REG_SO_MENU));
  // — os corpos injectados têm de ser código inteiro. A corrida «pp7c» perdeu o director porque um comentário
  //   escrito DENTRO do literal do CENSO levava dois acentos graves em volta do nome de uma classe de
  //   visibilidade: os acentos fecharam o literal, o que estava entre eles passou a ser código, e a peça
  //   rebentou ao chamar uma propriedade inexistente como função. Nada disto se vê em «node --check», que
  //   aceita a estrutura partida — por isso é o construtor que se chama aqui, e o texto devolvido que se
  //   olha. O controlo negativo prova que a régua tem positivo nas duas faces: o detector do acento grave e
  //   o detector da fonte partida.
  const GRAVE = String.fromCharCode(96);
  const confere_corpo = (corpo) => {
    const n = corpo.split(GRAVE).length - 1;
    if (n > 0) return 'acentos_grave_no_corpo=' + n;
    if (!corpo.endsWith('})()')) return 'corpo_nao_termina_em_IIFE';
    try { new Function('return (' + corpo + ')'); } catch (e) { return 'nao_compila:' + String(e && e.message || e).slice(0, 40); }
    return '';
  };
  let mi_c = '', corpo_c = '';
  try { corpo_c = CENSO(['inicio', 'notas']); } catch (e) { mi_c = String(e && e.message || e); }
  add('o_corpo_do_censo_e_codigo_inteiro_chamando_o_construtor', mi_c === '' && confere_corpo(corpo_c) === '', mi_c.slice(0, 70) || confere_corpo(corpo_c) || corpo_c.length + ' caracteres');
  let mi_s = '', corpo_s = '';
  try { corpo_s = SONDA_SUPERFICIE(['.sidebar .nav-item[data-section]'], '.sidebar .nav-item[data-section]'); } catch (e) { mi_s = String(e && e.message || e); }
  add('o_corpo_da_sonda_de_superficie_e_codigo_inteiro_chamando_o_construtor', mi_s === '' && confere_corpo(corpo_s) === '', mi_s.slice(0, 70) || confere_corpo(corpo_s) || corpo_s.length + ' caracteres');
  const FONTE_PARTIDA = '(() => { const s = ' + GRAVE + 'um item sem ' + GRAVE + '.hidden ' + GRAVE + 'caixa ' + GRAVE + '; return s; })()';
  let mi_p = ''; try { new Function('return (' + FONTE_PARTIDA + ')')(); } catch (e) { mi_p = String(e && e.message || e); }
  add('a_regua_de_corpo_inteiro_tem_positivo_nas_duas_faces', confere_corpo('a' + GRAVE + 'b').startsWith('acentos_grave_no_corpo=1') && mi_p.includes('is not a function'), confere_corpo('a' + GRAVE + 'b') + ' | ' + (mi_p.slice(0, 46) || 'NAO REBENTOU'));
  const verdes = f.filter((x) => x.ok).length;
  console.log('SONDA_PORTAS_FIXTURES ' + verdes + '/' + f.length);
  for (const x of f) console.log((x.ok ? 'ok   ' : 'VERM ') + x.nome + ' :: ' + x.detalhe);
  process.exit(verdes === f.length ? 0 : 1);
}
const REF = 'yyzqoxlkcvqpessypfjo';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const HOST = `https://${REF}.supabase.co`;
const STORAGE_KEY = `sb-${REF}-auth-token`;
const PORT = parseInt(process.env.AH2_PORT || '9476', 10);
const ALTURA = 720;
const OUT = `${EV}/ah2-sonda-portas-por-papel-${ROTULO}.json`;
const PERFIL = `${DIR}/.ah2pp-${ROTULO}-${PORT}`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');

// — as células em dúvida, recortadas com as regras do produtor (mesma `coerente`, mesmo alias) —
const coerente = (b) => !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
const por_papel = {};
// Em modo matriz, o que se espera de cada papel é o que o p187 registou; em modo células, é a lista de rotas
// sem porta que o varrimento m5 declarou. As duas origens nunca se misturam na mesma corrida.
const ESPERADO = {};
let UNIVERSO = null;
let PROVENIENCIA_MATRIZ = null;
// O seletor com que a regra servida conta é o do p187; o `SELETOR_SIDEBAR` é a mesma coisa restrito à
// superfície de secretária, lido dos bytes da regra e não dactilografado por mim.
let SELETOR_DA_REGRA = null;
let SELETOR_SIDEBAR = null;
let PARTES_DA_REGRA = null;
if (MODO_MATRIZ) {
  const lido = leFamilia('p187-mapa-de-portas-por-papel-');
  const j = lidoDoRegistoP187(lido.json);
  const regra = (j.regra_servida || {}).seletor_da_regra;
  if (typeof regra !== 'string' || !regra.includes('[data-section]')) throw new Error('ABORTA: o registo ' + lido.nome + ' não declara regra_servida.seletor_da_regra como seletor');
  UNIVERSO = universoDoRegisto(j);
  const esperado = esperadoDoRegisto(j);
  for (const [p, portas] of Object.entries(esperado)) {
    if (SÓ_PAPEIS.length && !SÓ_PAPEIS.includes(p)) continue;
    const linha = j.matriz_por_papel.find((l) => l.papel === p);
    por_papel[p] = new Set(portas);
    ESPERADO[p] = { portas, origem: linha.origem, view_role: linha.viewRole, autorizado: linha.autorizado };
  }
  PROVENIENCIA_MATRIZ = {
    registo: lido.nome, em: j.em, ar_md5_do_registo: (j.ar && j.ar.md5) || null,
    regra_servida_do_registo: regra,
    papeis_no_registo: Object.keys(esperado).length, papeis_a_censurar: Object.keys(por_papel).length,
    universo_de_tokens: UNIVERSO.length
  };
  SELETOR_DA_REGRA = regra;
  const partes_da_regra = parte_sidebar_da_regra(regra);
  SELETOR_SIDEBAR = partes_da_regra.sidebar;
  if (!SELETOR_SIDEBAR) throw new Error('ABORTA: nenhuma das ' + partes_da_regra.partes.length + ' partes da regra servida é um `.nav-item` — não sei que superfície censurar: ' + regra);
  PARTES_DA_REGRA = partes_da_regra.partes;
  PROVENIENCIA_MATRIZ.partes_da_regra = PARTES_DA_REGRA;
  console.log('modo=matriz registo=' + PROVENIENCIA_MATRIZ.registo + ' ar_md5=' + PROVENIENCIA_MATRIZ.ar_md5_do_registo + ' papeis=' + PROVENIENCIA_MATRIZ.papeis_a_censurar + '/' + PROVENIENCIA_MATRIZ.papeis_no_registo + ' universo=' + UNIVERSO.length);
} else {
  for (const fd of readdirSync(EV).filter((x) => new RegExp(`^ah2-mobile2-${PREFIXO}[^/]*\\.json$`).test(x)).sort()) {
    const j = JSON.parse(readFileSync(`${EV}/${fd}`, 'utf8'));
    if (j.ciclo !== 'AH-7b-MOBILE' || (SÓ_PAPEIS.length && !SÓ_PAPEIS.includes(j.papel))) continue;
    for (const [w, b] of Object.entries(j.bandas || {})) {
      if (b.pela_praga || !coerente(b)) continue;
      for (const r of b.declaradas_sem_rota || []) (por_papel[j.papel] = por_papel[j.papel] || new Set()).add(r);
    }
  }
}
const papeis = Object.keys(por_papel).sort();
if (!papeis.length) throw new Error(MODO_MATRIZ ? 'ABORTA: o registo do p187 não deixa nenhum papel para censurar (papéis pedidos: ' + JSON.stringify(SÓ_PAPEIS) + ')' : 'ABORTA: nenhuma célula «porta inexistente» com banda coerente');
console.log('papéis a censurar: ' + papeis.map((p) => p + '(' + por_papel[p].size + ')').join(' ') + ' — portas por papel: ' + [...new Set(papeis.map((p) => por_papel[p].size))].join('/'));

const SHELL = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const MD5 = createHash('md5').update(SHELL).digest('hex');
const ANON = SHELL.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', `--window-size=${LARGURA},${ALTURA}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
// O prazo interno tem de cair dentro da janela do hospedeiro (10 minutos), senão quem corta a corrida é o
// hospedeiro e não a peça — e o corte do hospedeiro não escreve nada. Os 15 papéis censuram-se por lotes de
// papéis nomeados nos argumentos posicionais; o prazo é o do lote, não o do censo todo.
const LIMITE_MS = 480000;
// O `regra_do_produto` era uma citação de fonte que não resolve no ar (0 ocorrências medidas). Em modo matriz
// a regra servida lê-se do registo do p187, que é quem a foi buscar aos bytes; a citação de fonte continua
// registada, mas como citação e não como regra.
const saida = {
  ciclo: 'AH-PORTAS-POR-PAPEL', em: new Date().toISOString(), modo: MODO_MATRIZ ? 'matriz' : 'celulas',
  largura: LARGURA, md5_shell: MD5, limite_ms: LIMITE_MS,
  regra_do_produto: MODO_MATRIZ
    ? { citacao_de_fonte: 'app/bfr-responsive-presentation.js:71 drawerItems()', seletor_servido_lido_do_registo: SELETOR_DA_REGRA, superficie_censurada: SELETOR_SIDEBAR }
    : 'app/bfr-responsive-presentation.js:71-89 drawerItems()',
  proveniencia_matriz: PROVENIENCIA_MATRIZ, universo: MODO_MATRIZ ? UNIVERSO : null, papéis: {}, resumo: null,
  o_que_prova: MODO_MATRIZ ? 'quais destas portas aparecem pintadas na barra lateral, neste shell, para cada papel com cadeia viva — e quais das visíveis o mapa não autorizou' : null,
  o_que_NAO_prova: MODO_MATRIZ ? 'que o backend autorize a chamada correspondente; que a mesma porta não seja alcançável por outra superfície (menu Mais, gaveta, atalho dentro duma vista); que o conteúdo de cada aba esteja certo; e que um papel sem cadeia viva nesta ficha tenha a mesma resposta' : null
};
// O `pp6t` cortou no prazo e não deixou nada porque só se escrevia no fim ou no erro. `escreve` passa a ser
// chamada depois de cada papel: uma corrida cortada deixa os papéis feitos em disco, e o veredicto de lote
// incompleto lê-se do registo — não da minha memória do que já tinha corrido.
function escreve() { try { writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n'); return true; } catch { return false; } }
function grava(codigo) {
  if (escreve()) console.log('ESCRITO: ' + OUT.split('/').pop());
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  process.exit(codigo);
}
setTimeout(() => grava(3), LIMITE_MS);
// `pp1` morreu num `readFileSync` e não deixou artefacto: qualquer exceção passa a escrever o meiodo-censo
// com `erro` nomeado, para que a ausência de prova fique registada como ausência e não como resultado.
process.on('uncaughtException', (e) => { saida.erro = String(e && e.message || e).slice(0, 300); console.log('ERRO: ' + saida.erro); grava(2); });
process.on('unhandledRejection', (e) => { saida.erro = String(e && e.message || e).slice(0, 300); console.log('REJEIÇÃO: ' + saida.erro); grava(2); });
let tg = [];
for (let i = 0; i < 80; i++) { try { tg = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tg.some((t) => t.type === 'page')) break; } catch {} await dorme(400); }
const page = tg.find((t) => t.type === 'page');
if (!page) grava(1);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('handshake')), 30000); }).catch(() => grava(5));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(p.method + ': ' + m.error.message)) : p.res(m.result); return; } };
// O prazo por método é o do produtor `ah2-mobile2.mjs:122`, copiado com a razão: sem ele, um `Runtime.evaluate`
// a que a página não responde deixa o `pend` à espera para sempre — foi o que calou o `pp6t` no censo de 60
// tokens, sem artefacto e sem linha de erro. `Page.navigate` não tem ack até a navegação assentar, por isso
// leva prazo maior que o do evaluate.
const PRAZO_CDP = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++seq;
  const prazo = PRAZO_CDP(method);
  const temporizador = setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('CDP ' + method + ' sem resposta em ' + Math.round(prazo / 1000) + ' s (id ' + i + ')')); } }, prazo);
  pend.set(i, { method, res: (v) => { clearTimeout(temporizador); res(v); }, rej: (e) => { clearTimeout(temporizador); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(temporizador); rej(e); }
});
const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300)); return r.result?.value; };
const waitFor = async (e, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await E(e); } catch {} if (v) return Date.now() - t0; await dorme(350); } return null; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: 2, mobile: true });
const TOQUE = async (x, y) => { if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('TOQUE sem coordenadas: ' + x + ',' + y); await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const centro = async (sel) => E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return {x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height)}; })()`);

// O censo por rota, escrito com os MESMOS selectores da regra do produto: o que aqui se lê é a decisão do
// `drawerItems()`, não uma aproximação minha.
// O eixo da visibilidade não é a classe de onde vive: um item pode estar no seletor certo, sem a classe
// escondida, com etiqueta, e continuar sem caixa pintada porque o contentor está fechado. Pintada = w>0 e
// h>0 e nem display «none» nem visibility «hidden» na própria etiqueta. — Esta explicação viveu DENTRO do
// corpo injectado até à corrida «pp7c», e os dois acentos graves que ela continham fechavam o literal do
// `CENSO`: o que o browser recebia era um texto seguido de uma propriedade inexistente chamada como
// função. `node --check` não vê nada disto — por isso os fixtures de --sonda-fixtures chamam os corpos.
function CENSO(rotas) { return `(() => {
  const classes = (n) => n ? (typeof n.className === 'string' ? n.className.trim() : String(n.className)) : null;
  const id_do_ancestral_escondido = (n) => { let e = n, d = 0; while (e && e !== document.body && d < 24) { if (e.classList && e.classList.contains('hidden')) return (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (classes(e) || '')).slice(0, 70); e = e.parentElement; d++; } return null; };
  const caixa = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visibility: cs.visibility }; };
  const out = {};
  for (const r of ${JSON.stringify(rotas)}) {
    const sels = { sidebar: '#appShell .sidebar .nav-item[data-section="' + r + '"]', mais: '#mobileMoreMenu .mobile-more-option[data-section="' + r + '"]', qualquer: '[data-section="' + r + '"]' };
    const side = document.querySelector(sels.sidebar), mais = document.querySelector(sels.mais);
    const item = side || mais;
    out[r] = {
      na_sidebar: !!side, no_more_menu: !!mais,
      em_qualquer_lugar: document.querySelectorAll(sels.qualquer).length,
      hidden_em_si: item ? item.classList.contains('hidden') : null,
      ancestral_hidden: item ? id_do_ancestral_escondido(item.parentElement) : null,
      texto: item ? (item.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 28) : null,
      na_gaveta: !!document.querySelector('#bfrMobileDrawer [data-bfr-drawer-route="' + r + '"]'),
      caixa_sidebar: caixa(side), caixa_mais: caixa(mais)
    };
    const sem_texto = out[r].texto === null || out[r].texto === '';
    const pintada = (c) => !!c && c.w > 0 && c.h > 0 && c.display !== 'none' && c.visibility !== 'hidden';
    const pode_ver = (n, c) => !!n && !n.classList.contains('hidden') && !id_do_ancestral_escondido(n.parentElement) && !sem_texto && pintada(c);
    out[r].visivel_no_ecra = pode_ver(side, out[r].caixa_sidebar) || pode_ver(mais, out[r].caixa_mais);
    out[r].classe = !item ? (out[r].em_qualquer_lugar > 0 ? 'ITEM_FORA_DOS_DOIS_SELECTORES' : 'SEM_ITEM_EM_NENHUM_SELECTOR')
      : out[r].hidden_em_si ? 'ITEM_MAS_ESCONDIDO_POR_CLASSE'
      : out[r].ancestral_hidden ? 'ITEM_COM_ANCESTRAL_HIDDEN'
      : sem_texto ? 'ITEM_SEM_TEXTO'
      : out[r].na_gaveta ? 'ITEM_NA_GAVETA' : 'ITEM_VISIVEL_MAS_GAVETA_NAO_O_COPIOU';
  }
  return out; })()`; }

// O que a barra pintada exige não é adivinhável: esta peça responde, na largura pedida, quantos itens de cada
// superfície da regra têm caixa, o estado do ecrã de entrada, o carimbo da `appShell`, o primeiro ancestral sem
// caixa do primeiro item da barra e as duas larguras (a de `innerWidth`, que se dilata com o conteúdo, e a de
// `documentElement.clientWidth`, que é a régua).
function SONDA_SUPERFICIE(partes, sidebar) { return `(() => {
  const caixa = (n) => { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visibility: cs.visibility }; };
  const pintar = (n) => { const c = caixa(n); return c.w > 0 && c.h > 0 && c.display !== 'none' && c.visibility !== 'hidden'; };
  const por_superficie = ${JSON.stringify(partes)}.map((sel) => { const ns = [...document.querySelectorAll(sel)]; return { seletor: sel, no_dom: ns.length, com_caixa: ns.filter(pintar).length }; });
  const zero = (n) => { let e = n, d = 0; while (e && e !== document.documentElement && d < 24) { const c = caixa(e); if (!(c.w > 0 && c.h > 0) || c.display === 'none' || c.visibility === 'hidden') return { tag: e.tagName.toLowerCase(), id: e.id || null, classe: String(typeof e.className === 'string' ? e.className : '').slice(0, 60), caixa: c, profundidade: d }; e = e.parentElement; d++; } return null; };
  const alvo = document.querySelector(${JSON.stringify(sidebar)});
  const side = por_superficie.find((x) => x.seletor === ${JSON.stringify(sidebar)}) || null;
  const login = document.getElementById('loginScreen');
  const shell = document.getElementById('appShell');
  return {
    por_superficie, no_dom: side ? side.no_dom : 0, com_caixa: side ? side.com_caixa : 0,
    primeiro_ancestral_sem_caixa: alvo ? zero(alvo) : null,
    login: login ? caixa(login) : null,
    login_com_classe_hidden: login ? login.classList.contains('hidden') : null,
    appShell_classes: shell ? String(shell.className).slice(0, 120) : null,
    viewport: { innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth }
  };
})()`; }

for (const papel of papeis) {
  // O `catch` é âmbito IRMÃO do `try`, não filho: uma `let` declarada dentro do `try` não existe no `catch`, e
  // foi `sidebar_censo` no registo de falha que deu `ReferenceError`, tapou a causa real do director e levou a
  // corrida toda a sair com exit 2. As variáveis de diagnóstico vivem no corpo do ciclo.
  let ms_barra = null, n_section = 0, gaveta_aberta = false, itens_gaveta = 0, afordancia = null, sidebar_censo = null;
 try {
  // Lição das duas corridas que falharam: `pp1` rebentou num `readFileSync` de um ficheiro que não existe e
  // `pp2` calou-se a meio sem deixar artefacto. Os `ah2-sessao-<papel>.json` são cópias por filho da grelha
  // (só o papel dono do ficheiro tem cadeia fresca, e `parent` nem ficheiro tem); o mapa mestre
  // `ah2-sessions.json` traz os 15 papéis com `refresh_token`, e é ele que serve a uma sonda que percorre
  // papéis todos. Um papel que rebente fica registado como falha minha, nunca como porta inexistente.
  const S = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
  const base = S[papel];
  if (!base?.refresh_token) {
    saida.papeis_nao_cobertos = saida.papeis_nao_cobertos || [];
    saida.papeis_nao_cobertos.push({ papel, motivo: 'sem refresh_token no mapa mestre', portas: [...por_papel[papel]].sort() });
    console.log(`${papel}: SEM SESSÃO NO MAPA MESTRE — não coberto (${por_papel[papel].size} portas)`);
    continue;
  }
  let sessao = base;
  try {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: base.refresh_token }), signal: AbortSignal.timeout(45000) });
    const js = await r.json(); if (js?.access_token) sessao = js; else console.log(`  AVISO ${papel}: refresh ${r.status} — uso a sessão guardada`);
  } catch (e) { console.log(`  AVISO ${papel}: refresh falhou (${String(e.message).slice(0, 60)}) — sessão guardada`); }
  const rotas = MODO_MATRIZ ? UNIVERSO : [...por_papel[papel]].sort();
  await send('Page.navigate', { url: 'about:blank' }); await dorme(400);
  await send('Page.navigate', { url: URL_APP });
  await waitFor("!!document.getElementById('loginScreen')", 45000);
  await E(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
  await send('Page.navigate', { url: URL_APP });
  const ms = await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 60000);
  const role_lido = await E(`window.BFR_CURRENT_PROFILE?.role ?? null`);
  // O `pp1` não fazia nada nisto e por isso o censo saiu todo vazio: o modal de primeiro acesso tapa a barra
  // (§AI.27/5 mede isso no apoio), e sem fechar modal nem esperar pela barra não há gaveta para censurar.
  const modal = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? m.id || null : null; })()`);
  if (modal) { const c = await centro('#' + modal + ' .modal-close'); if (c) { await TOQUE(c.x, c.y); await dorme(600); } }
  // Duas coisas que o `pp3` provou que faltavam aqui: (i) o professor NÃO tem «Mais» na barra — abre a
  // gaveta pelo hambúrguer `[data-bfr-open-drawer]`, como o próprio instrumento decide em
  // `ah2-mobile2.mjs:312` — e sem essa segunda afordância o `pedagogical` ficou com a gaveta fechada;
  // (ii) o `monitor` não teve barra aos 30 s e o censo perdeu o papel todo, quando uma recarga chega lá.
  if (MODO_MATRIZ) {
    // Em modo matriz a superfície é a barra lateral do seletor que a regra servida declara. A gaveta não se
    // exige aqui: é afordância de telemóvel, e pedi-la à largura de secretária daria
    // `CENSO_INVALIDO_SEM_BOOT` a todos os papéis — que era exactamente o falso vermelho que a régua de
    // baixo produziria. A segunda tentativa é a lição do `monitor`: uma recarga chega lá.
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      n_section = await E(`document.querySelectorAll('[data-section]').length`);
      sidebar_censo = await E(SONDA_SUPERFICIE(PARTES_DA_REGRA, SELETOR_SIDEBAR));
      // O registo da superfície sai na mesma linha em que é medido: `pp6t` calou-se 9 minutos com `no_dom: 48`
      // e `com_caixa: 0`, e a única coisa que distinguia «sessão morta» de «largura errada» teria sido o resto
      // da sonda — que eu tinha medido mas nunca impresso.
      console.log(`  ${papel}: superficie tentativa ${tentativa} ${JSON.stringify(sidebar_censo)}`);
      if (sidebar_censo.no_dom > 0 && sidebar_censo.com_caixa > 0) break;
      if (tentativa === 1) { console.log(`  ${papel}: sidebar ${JSON.stringify(sidebar_censo)} — recarrego uma vez`); await send('Page.navigate', { url: URL_APP }); await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 60000); const m2 = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? m.id || null : null; })()`); if (m2) { const c = await centro('#' + m2 + ' .modal-close'); if (c) { await TOQUE(c.x, c.y); await dorme(600); } } }
    }
  } else {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      ms_barra = await waitFor("!!document.getElementById('bfrMobileBottomNav')", 30000);
      n_section = await E(`document.querySelectorAll('[data-section]').length`);
      const tem_mais = await E(`(() => { const b = document.querySelector('#bfrMobileBottomNav button[data-bfr-mobile-route="more"]'); const r = b && b.getBoundingClientRect(); return !!(r && r.width && r.height); })()`);
      const sel = tem_mais ? '#bfrMobileBottomNav button[data-bfr-mobile-route="more"]' : '[data-bfr-open-drawer]';
      for (const c of [0, 1]) {
        if (await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`)) break;
        const alvo = await centro(sel); if (!alvo) break;
        await TOQUE(alvo.x, alvo.y); await dorme(700);
      }
      gaveta_aberta = await E(`!!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')`);
      itens_gaveta = await E(`document.querySelectorAll('#bfrMobileDrawer [data-bfr-drawer-route]').length`);
      afordancia = tem_mais ? 'mais' : 'hamburguer';
      if (ms_barra !== null && itens_gaveta > 0) break;
      if (tentativa === 1) { console.log(`  ${papel}: barra=${ms_barra}ms e ${itens_gaveta} itens na gaveta — recarrego uma vez`); await send('Page.navigate', { url: URL_APP }); await waitFor("document.getElementById('appShell')?.classList.contains('ready')", 60000); const m2 = await E(`(() => { const m = Array.from(document.querySelectorAll('.modal')).find(x => !x.classList.contains('hidden') && getComputedStyle(x).display !== 'none' && (x.offsetWidth || x.offsetHeight)); return m ? m.id || null : null; })()`); if (m2) { const c = await centro('#' + m2 + ' .modal-close'); if (c) { await TOQUE(c.x, c.y); await dorme(600); } } }
    }
  }
  // Portão, uma cláusula por modo: em células são as quatro coisas do telemóvel; em matriz é a barra lateral
  // do seletor da regra, montada e com caixa. Sem elas, o censo diria «não existe» de uma página que não
  // chegou a arrancar — é o erro que o `pp1` fez.
  const boot_ok = MODO_MATRIZ
    ? (ms !== null && n_section > 0 && !!sidebar_censo && sidebar_censo.no_dom > 0 && sidebar_censo.com_caixa > 0)
    : (ms !== null && n_section > 0 && ms_barra !== null && itens_gaveta > 0);
  const census = await E(CENSO(rotas));
  const cont = {};
  for (const [r, v] of Object.entries(census)) cont[v.classe] = (cont[v.classe] || []).concat(r);
  const visiveis_censura = Object.entries(census).filter(([, v]) => v.visivel_no_ecra === true).map(([r]) => r).sort();
  const comparacao = MODO_MATRIZ && boot_ok ? comparaPapel(UNIVERSO, census, ESPERADO[papel].portas) : null;
  saida.papéis[papel] = { ms_ready: ms, role_lido, modal_inicial: modal, ms_barra, data_section_no_dom: n_section, afordancia, gaveta_aberta, itens_gaveta, sidebar_censo, esperadas: rotas.length, visiveis_no_ecra: boot_ok ? visiveis_censura : null, comparacao, boot_ok, rotas: boot_ok ? census : null, por_classe: boot_ok ? Object.fromEntries(Object.entries(cont).map(([k, v]) => [k, v.sort()])) : null, classe: boot_ok ? null : 'CENSO_INVALIDO_SEM_BOOT' };
  console.log(`${papel} (role=${role_lido}, modal=${modal}, data-section=${n_section}, ${MODO_MATRIZ ? 'sidebar=' + JSON.stringify(sidebar_censo) : 'barra=' + ms_barra + 'ms, afordancia=' + afordancia + ', gaveta_aberta=' + gaveta_aberta + ', ' + itens_gaveta + ' itens'}) → ${boot_ok ? (MODO_MATRIZ ? 'visiveis=' + visiveis_censura.length + ' excesso=' + JSON.stringify(comparacao.visiveis_nao_autorizadas) + ' falta=' + JSON.stringify(comparacao.autorizadas_nao_visiveis) : Object.entries(cont).map(([k, v]) => k + '=' + v.length).join(' ')) : 'CENSO INVÁLIDO: a app não assentou'}`);
 } catch (e) {
  // A falha leva a última superfície medida: `pp7a` morreu em `Page.navigate` e a causa — ecrã de entrada a
  // tapa-lo tudo, sem `ready` na `appShell` — só existia no stdout, que não é prova versionada.
  saida.papéis[papel] = { classe: 'CENSO_FALHOU', erro: String(e && e.message || e).slice(0, 240), boot_ok: false, sidebar_censo, rotas: null, por_classe: null };
  console.log(`${papel}: CENSO FALHOU — ${saida.papéis[papel].erro}`);
 }
  saida.batida = { papeis_registrados: Object.keys(saida.papéis).length, de: papeis.length, escrito: escreve() };
  console.log(`  batida: ${saida.batida.papeis_registrados}/${papeis.length} papel(is) em disco, escrito=${saida.batida.escrito}`);
}
const todas = new Set();
const cobertos = papeis.filter((p) => saida.papéis[p]?.boot_ok);
for (const p of cobertos) for (const [r, v] of Object.entries(saida.papéis[p].rotas)) todas.add(v.classe);
saida.resumo = { classes_vistas: [...todas].sort(), por_classe_em_todos_os_papeis: {}, papel_com_lista_vazia: papeis.filter((p) => saida.papéis[p]?.boot_ok === false), invalidos: papeis.filter((p) => saida.papéis[p]?.boot_ok === false).map((p) => p + '(' + saida.papéis[p].classe + ')'), nao_cobertos: saida.papeis_nao_cobertos || [] };
for (const p of cobertos) for (const [r, v] of Object.entries(saida.papéis[p].rotas)) (saida.resumo.por_classe_em_todos_os_papeis[v.classe] = saida.resumo.por_classe_em_todos_os_papeis[v.classe] || new Set()).add(p + '/' + r);
saida.resumo.por_classe_em_todos_os_papeis = Object.fromEntries(Object.entries(saida.resumo.por_classe_em_todos_os_papeis).map(([k, v]) => [k, [...v].sort()]));
// Em modo matriz as duas faces agrupam-se por nome, e imprimem-se mesmo vazias: o vazio da face de
// segurança é precisamente o que o briefing pede como prova.
const resumo_matriz = MODO_MATRIZ ? { universo_de_tokens: UNIVERSO.length, por_papel: {}, excesso_uniao: [], falta_uniao: [], ausentes_do_censo: [] } : null;
if (MODO_MATRIZ) {
  for (const p of cobertos) {
    const c = saida.papéis[p].comparacao;
    resumo_matriz.por_papel[p] = { autorizadas_do_registo: c.autorizadas_registradas, visiveis_no_ecra: c.visiveis.length, visiveis_nao_autorizadas: c.visiveis_nao_autorizadas, autorizadas_nao_visiveis: c.autorizadas_nao_visiveis, ausentes_do_censo: c.ausentes_do_censo };
    for (const r of c.visiveis_nao_autorizadas) resumo_matriz.excesso_uniao.push(p + '/' + r);
    for (const r of c.autorizadas_nao_visiveis) resumo_matriz.falta_uniao.push(p + '/' + r);
    for (const r of c.ausentes_do_censo) resumo_matriz.ausentes_do_censo.push(p + '/' + r);
  }
  saida.resumo.matriz = resumo_matriz;
}
console.log('\nCOBERTURA: ' + cobertos.length + '/' + papeis.length + ' papéis com censo válido. ' + JSON.stringify({ invalidos: saida.resumo.invalidos, nao_cobertos: saida.resumo.nao_cobertos.map((x) => x.papel) }, null, 1));
for (const [k, v] of Object.entries(saida.resumo.por_classe_em_todos_os_papeis)) console.log('  ' + k + ' ×' + v.length + ': ' + v.slice(0, 16).join(', ') + (v.length > 16 ? '…' : ''));
if (MODO_MATRIZ) {
  console.log('\nMATRIZ: universo=' + resumo_matriz.universo_de_tokens + ' de ' + papeis.length + ' papéis — excesso (o ar mostra o que o mapa não autorizou): ' + JSON.stringify(resumo_matriz.excesso_uniao));
  console.log('MATRIZ: falta (o mapa autoriza e esta superfície não mostra): ' + resumo_matriz.falta_uniao.length + ' células');
  console.log('MATRIZ: tokens do universo sem entrada no censo: ' + JSON.stringify(resumo_matriz.ausentes_do_censo));
  for (const [p, c] of Object.entries(resumo_matriz.por_papel)) console.log('  ' + p + ': autorizadas=' + c.autorizadas_do_registo + ' visiveis=' + c.visiveis_no_ecra + ' excesso=' + JSON.stringify(c.visiveis_nao_autorizadas) + ' falta=' + JSON.stringify(c.autorizadas_nao_visiveis));
}
saida.veredito = MODO_MATRIZ
  ? (cobertos.length === papeis.length ? 'SONDA_MATRIZ_TODOS_CENSURADOS ' + cobertos.length + '/' + papeis.length : 'SONDA_MATRIZ_PARCIAL ' + cobertos.length + '/' + papeis.length)
  : (cobertos.length === papeis.length ? 'SONDA_CELULAS_TODOS_CENSURADOS ' + cobertos.length + '/' + papeis.length : 'SONDA_CELULAS_PARCIAL ' + cobertos.length + '/' + papeis.length);
console.log('\n' + saida.veredito);
grava(cobertos.length ? 0 : 1);
