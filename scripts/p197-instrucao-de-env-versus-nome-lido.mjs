// p197 -- confronto entre a instrucao escrita numa peça e o nome que o fonte realmente le.
// A raiz desta peça e uma medida envelhecida: no ciclo anterior uma sonda de sessao (sem produtor versionado)
// contou 4 fontes e 5 nomes "prometidos e nunca lidos". Ao escrever o produtor com o predicado a discriminar
// pelo SITE da promessa, tres desses nomes sao rotulos de veredicto (uma etiqueta seguida do valor medido,
// dentro duma mensagem de erro) e um nome aponta para OUTRA peça, que desse nome trata. O membro verdadeiro
// era um so, e ja foi corrigido. Nada aqui se apoia nessa conta: a fonte dos numeros e esta corrida.
// As cuatro clases duma promessa, medidas uma por uma:
//   lida               -- o nome aparece em process.env deste fonte ou doum alvo que a propria linha nomeia
//   rotulo             -- a linha traz NOME= mas nenhuma invocacao de .mjs: e uma saida, nao uma instrucao
//   alvo_morto         -- a linha nomeia um .mjs que nao resolve em disco: a instrucao nao pode ser seguida
//   promessa_nao_lida  -- a linha e uma instrucao e nenhum dos fontes que ela nomeia le o nome
// Discriminador do SITE (nunca duma lista de nomes lembrada): uma promessa e promessa quando a linha ou
//   comeca por comentario e traz a palavra-chave Env: seguida dum nome, ou contem a forma NOME= junto
//   dum caminho terminado em .mjs -- porque entao ha alguma coisa a correr com esse valor.
// O que NAO prova: que um nome lido sem declaracao seja um defeito (a casa tem tres estilos de escrever a
// usanca e isso e eixo de informacao); nem que a classe rotulo seja sempre inofensiva -- um rotulo que o
// operador procura num manual e outra conversa, e essa conversa nao e desta peça.
// Uso: node scripts/p197-instrucao-de-env-versus-nome-lido.mjs <caminho-do-registro> [--raiz <diretorio>]...
//   --raiz substitui a raiz por omissao (scripts/), para poder correr contra um directorio de controlo.
// Env: P197_SUF (rotulo da corrida, obrigatorio)
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, resolve, relative, sep } from 'node:path';

const Linhas = [];
const say = (s) => { Linhas.push(s); console.log(s); };

const SUF = process.env.P197_SUF;
if (!SUF) throw new Error('ABORTA: P197_SUF e obrigatorio -- cada corrida precisa dum rotulo propio');
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const registro = process.argv[2];
if (!registro) throw new Error('ABORTA: falta o caminho do registo -- ver o cabecalho desta peça');
if (existsSync(registro)) throw new Error('ABORTA: o registo ' + registro + ' ja existe; a re-corrida pede P197_SUF novo, sobrescrever apagaria a corrida que a prosa cita');

const raizesPedidas = [];
for (let i = 3; i < process.argv.length; i++) if (process.argv[i] === '--raiz') raizesPedidas.push(process.argv[++i]);
const RAIZES = raizesPedidas.map((r) => resolve(r));
if (raizesPedidas.some((r, i) => !existsSync(RAIZES[i]) || !statSync(RAIZES[i]).isDirectory())) {
  throw new Error('ABORTA: --raiz quer um directorio que existe, recebeu ' + JSON.stringify(raizesPedidas));
}
const raizes = RAIZES.length ? RAIZES : [join(REPO, 'scripts')];
const relDe = (caminho) => {
  const r = relative(REPO, caminho);
  return r.startsWith('..') ? caminho : r.split(sep).join('/');
};

const RE_NOME_PROMETIDO = /\b([A-Z][A-Z0-9_]{2,})=/g;
const RE_ENV_LINE = /^\s*\/\/.*\bEnv:\s*(.*)$/;
const RE_TOKEN_DE_NOME = /^\s*([A-Z][A-Z0-9_]{2,})\b/;
const RE_LIDO = /process\.env\.([A-Z][A-Z0-9_]{2,})|process\.env\[\s*['"]([A-Z][A-Z0-9_]{2,})['"]\s*\]/g;
const RE_CAMINHO_MJS = /([A-Za-z0-9._/-]+\.mjs)/g;

function lidosDo(txt) {
  const s = new Set();
  RE_LIDO.lastIndex = 0;
  let m;
  while ((m = RE_LIDO.exec(txt))) s.add(m[1] || m[2]);
  return s;
}

function nomesDaEnvLine(cauda) {
  const nomes = [];
  for (const pedaco of cauda.split(',')) {
    const q = pedaco.match(RE_TOKEN_DE_NOME);
    if (!q) break;
    nomes.push(q[1]);
  }
  return nomes;
}

// regiao de fixura: as strings de teste desta peça contem invocacoes fintadas, que nao sao instrucoes a nenhum
// operador. A convensao e declarada por marcador no fonte varrido -- e a extracao das promessas retira as linhas
// entre os dois marcadores, preservando os numeros de linha. Sem marcador par, a corrida aborta: afrouxar a
// regulamento por apagar o marcador nao passa verde.
const MARCO_FIXURA_INI = '// >>> FIXURA';
const MARCO_FIXURA_FIM = '// <<< FIXURA';
function retiraRegiaoDeFixura(txt) {
  const linhas = txt.split('\n');
  const ini = linhas.findIndex((l) => l.trim().startsWith(MARCO_FIXURA_INI));
  const fim = linhas.findIndex((l) => l.trim().startsWith(MARCO_FIXURA_FIM));
  if (ini === -1 && fim === -1) return { txt, marcada: false };
  if (ini === -1 || fim === -1 || fim < ini) throw new Error('ABORTA: a regiao de fixura esta partida -- ' + JSON.stringify({ ini, fim }));
  const fora = linhas.slice();
  for (let i = ini; i <= fim; i++) fora[i] = '';
  return { txt: fora.join('\n'), marcada: true, de: ini + 1, ate: fim + 1 };
}

function promessasDo(txt) {
  const out = [];
  const linhas = txt.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const ln = linhas[i];
    const envLine = ln.match(RE_ENV_LINE);
    if (envLine) {
      for (const nome of nomesDaEnvLine(envLine[1])) out.push({ nome, linha: i + 1, site: 'env_line', alvos: [] });
      continue;
    }
    RE_NOME_PROMETIDO.lastIndex = 0;
    const nomes = [];
    let p;
    while ((p = RE_NOME_PROMETIDO.exec(ln))) nomes.push(p[1]);
    if (nomes.length === 0) continue;
    RE_CAMINHO_MJS.lastIndex = 0;
    const alvos = [];
    let a;
    while ((a = RE_CAMINHO_MJS.exec(ln))) alvos.push(a[1]);
    const site = alvos.length ? 'comando' : 'rotulo';
    for (const nome of nomes) out.push({ nome, linha: i + 1, site, alvos });
  }
  return out;
}

const CLASSES = ['lida', 'rotulo', 'alvo_morto', 'promessa_nao_lida'];

function classifica(promessas, lidosDoFonte, lidoDoAlvo) {
  return promessas.map((pr) => {
    let classe;
    if (pr.site === 'rotulo') classe = 'rotulo';
    else if (lidosDoFonte.has(pr.nome)) classe = 'lida';
    else if (pr.site === 'env_line') classe = 'promessa_nao_lida';
    else {
      const existentes = pr.alvos.filter((a) => lidoDoAlvo(a) !== null);
      if (existentes.some((a) => lidoDoAlvo(a).has(pr.nome))) classe = 'lida';
      else if (existentes.length < pr.alvos.length) classe = 'alvo_morto';
      else classe = 'promessa_nao_lida';
    }
    return Object.assign({}, pr, { classe });
  });
}

const ALVOS_FIX = { 'scripts/alfa2-medida.mjs': new Set(['GAMMA_SUF']) };
// >>> FIXURA
const FIX = [
  { nome: 'env_line_lida', txt: '// Env: ALPHA_SUF (rotulo)\nconst x = process.env.ALPHA_SUF;\n', espera: { lida: 1 } },
  { nome: 'env_line_nao_lida', txt: '// Env: BETA_SUF (rotulo)\nconst x = 1;\n', espera: { promessa_nao_lida: 1 } },
  { nome: 'rotulo_de_veredicto_nao_e_instrucao', txt: "if (n !== 2) throw new Error('CONTAGEM_DE_LINHAS=' + n);\n", espera: { rotulo: 1 } },
  { nome: 'comando_com_alvo_que_le', txt: '// correr scripts/alfa2-medida.mjs com GAMMA_SUF=sm1 para re-gerar\n', espera: { lida: 1 } },
  { nome: 'comando_com_alvo_morto', txt: '// correr scripts/nao-ha-za-qui.mjs com DELTA_SUF=sm1\n', espera: { alvo_morto: 1 } },
  { nome: 'env_line_com_lista', txt: '// Env: EPA_SUF, RHO_SUF (rotulos)\nconst a = process.env.EPA_SUF;\n', espera: { lida: 1, promessa_nao_lida: 1 } },
  { nome: 'leitura_entre_colchetes', txt: "const x = process.env['SIGMA_SUF'];\n// Env: SIGMA_SUF\n", espera: { lida: 1 } },
  { nome: 'nenhuma_promessa', txt: 'const a = 1;\n// nada prometido aqui\n', espera: {} },
  { nome: 'regiao_de_fixura_nao_e_instrucao', comRegiao: true, espera: { lida: 1 }, txt: [MARCO_FIXURA_INI, '// correr scripts/alfa2-medida.mjs com GAMMA_SUF=sm1', MARCO_FIXURA_FIM, '// correr scripts/alfa2-medida.mjs com GAMMA_SUF=sm1'].join('\n') },
  { nome: 'regiao_partida_aborta', comRegiao: true, esperaAbortar: true, espera: {}, txt: [MARCO_FIXURA_INI, 'const a = 1;'].join('\n') },
];
// <<< FIXURA
const fixurasMal = [];
const fixurasVistas = [];
for (const f of FIX) {
  let cls = null;
  let abortou = false;
  try {
    const limpo = f.comRegiao ? retiraRegiaoDeFixura(f.txt).txt : f.txt;
    cls = classifica(promessasDo(limpo), lidosDo(limpo), (a) => (a in ALVOS_FIX ? ALVOS_FIX[a] : null));
  } catch (e) { abortou = true; }
  if (f.esperaAbortar) {
    if (!abortou) fixurasMal.push({ nome: f.nome, esperado: 'aborta_regiao_partida', obtido: 'nao_abortou' });
    fixurasVistas.push(f.nome + '=' + (abortou ? 'abortou' : 'NAO_ABORTOU'));
    continue;
  }
  if (abortou) { fixurasMal.push({ nome: f.nome, esperado: 'medida', obtido: 'abortou' }); continue; }
  const hist = {};
  for (const c of cls) hist[c.classe] = (hist[c.classe] || 0) + 1;
  const ok = CLASSES.every((k) => (f.espera[k] || 0) === (hist[k] || 0));
  if (!ok) fixurasMal.push({ nome: f.nome, esperado: f.espera, obtido: hist });
  fixurasVistas.push(f.nome + '=' + (CLASSES.filter((k) => hist[k]).map((k) => k + ':' + hist[k]).join('+') || 'nenhuma'));
}
say('PROVA_FIXURA_PROMESSAS casos=' + FIX.length + ' faltas=' + fixurasMal.length + ' · ' + fixurasVistas.join(' '));

const ficheiros = [];
for (const raiz of raizes) {
  for (const nome of readdirSync(raiz)) {
    if (nome.endsWith('.mjs')) ficheiros.push(join(raiz, nome));
  }
}
ficheiros.sort();

const lidosPorCaminho = new Map();
const promessasPorFonte = [];
let ficheirosComEnvLido = 0;
const eixoB = [];
let ficheirosComRegiao = 0;
let promessasRetiradasPorRegiao = 0;
for (const caminho of ficheiros) {
  const txtBruto = readFileSync(caminho, 'utf8');
  const limpo = retiraRegiaoDeFixura(txtBruto);
  const txt = limpo.txt;
  const lidos = lidosDo(txt);
  lidosPorCaminho.set(caminho, lidos);
  if (lidos.size) ficheirosComEnvLido++;
  const rel = relDe(caminho);
  const promessas = promessasDo(txt);
  const promessasBrutas = promessasDo(txtBruto);
  if (limpo.marcada) ficheirosComRegiao++;
  promessasRetiradasPorRegiao += promessasBrutas.length - promessas.length;
  promessasPorFonte.push({ rel, caminho, lidos, promessas });
  const declarados = new Set(promessas.filter((pr) => pr.site === 'env_line').map((pr) => pr.nome));
  const naoDeclarados = [...lidos].filter((n) => !declarados.has(n));
  if (naoDeclarados.length) eixoB.push({ fonte: rel, nomes: naoDeclarados.sort() });
}
const alvosMortosVistos = new Set();
const resolveAlvo = (a) => {
  const caminho = /^[A-Za-z]:[\\/]/.test(a) || a.startsWith('/') ? a : join(REPO, a);
  return lidosPorCaminho.has(caminho) ? lidosPorCaminho.get(caminho) : null;
};
const alvoExiste = (a) => resolveAlvo(a) !== null;
// a resolucao do alvo e feita duas vezes: primeiro para nomear os alvos que nao resolvem em disco, depois para
// julgar. O conjunto de alvos mortos e medido antes de qualquer classe ser assinada.
for (const fonte of promessasPorFonte) {
  for (const pr of fonte.promessas) for (const a of pr.alvos) if (!alvoExiste(a)) alvosMortosVistos.add(a);
}
const classificadas = [];
for (const fonte of promessasPorFonte) {
  const cls = classifica(fonte.promessas, fonte.lidos, (a) => {
    const lidos = resolveAlvo(a);
    if (lidos === null && !alvosMortosVistos.has(a)) throw new Error('ABORTA: o alvo ' + a + ' mudou de estado entre as duas passadas desta corrida');
    return lidos;
  });
  for (const c of cls) classificadas.push(Object.assign({ fonte: fonte.rel }, c));
}
const porClasse = {};
for (const c of classificadas) porClasse[c.classe] = (porClasse[c.classe] || 0) + 1;
const membros = (classe) => classificadas.filter((c) => c.classe === classe);
const somaDasClasses = CLASSES.reduce((s, k) => s + (porClasse[k] || 0), 0);

say('RAIZES ' + JSON.stringify(raizes.map(relDe)));
say('FICHEIROS_VARRIDOS=' + ficheiros.length + ' com_env_lido=' + ficheirosComEnvLido);
const regiaoEu = retiraRegiaoDeFixura(EU);
say('REGIOES_DE_FIXURA ' + JSON.stringify({ ficheiros_com_regiao: ficheirosComRegiao, promessas_retiradas_por_regiao: promessasRetiradasPorRegiao, esta_peca: { marcada: regiaoEu.marcada, de: regiaoEu.de, ate: regiaoEu.ate } }));
say('PROMESSAS=' + classificadas.length + ' POR_CLASSE=' + JSON.stringify(porClasse) + ' soma_das_quatro_classes=' + somaDasClasses);
const JULGADAS = ['promessa_nao_lida', 'alvo_morto'];
for (const k of CLASSES) {
  const lista = membros(k);
  const impressos = JULGADAS.includes(k) ? lista.length : 0;
  say('EIXO_' + k + ' ' + JSON.stringify({ total: lista.length, membros_impressos: impressos, nada_houve_para_explicar: lista.length === 0 }));
  for (const m of lista.slice(0, impressos)) say('  ' + m.classe + ' fonte=' + m.fonte + ' linha=' + m.linha + ' nome=' + m.nome + ' site=' + m.site + ' alvos=' + JSON.stringify(m.alvos));
}
say('EIXO_B_LEIDO_SEM_DECLARACAO ' + JSON.stringify({ fontes: eixoB.length, nomes: eixoB.reduce((s, b) => s + b.nomes.length, 0) }) + ' · classe de informacao, nao julgada');
for (const b of eixoB) say('  B fonte=' + b.fonte + ' nomes=' + JSON.stringify(b.nomes));

const euRel = relDe(fileURLToPath(import.meta.url));
const asMinhas = classificadas.filter((c) => c.fonte === euRel && c.site !== 'rotulo');

const g = {
  C1_a_extracao_tem_positivo_e_negativo_nas_oito_fixuras: { ok: fixurasMal.length === 0, obtido: { casos: FIX.length, faltas: fixurasMal, vistas: fixurasVistas } },
  C2_cada_promessa_recebe_uma_das_quatro_classes: { ok: somaDasClasses === classificadas.length, obtido: { promessas: classificadas.length, soma: somaDasClasses, por_classe: porClasse } },
  C3_os_quatro_eixos_imprimem_se_mesmo_vazios: { ok: CLASSES.every((k) => Linhas.some((l) => l.startsWith('EIXO_' + k + ' '))), obtido: CLASSES.map((k) => 'EIXO_' + k + '=' + Linhas.filter((l) => l.startsWith('EIXO_' + k + ' ')).length) },
  C4_a_classe_de_julgamento_promessa_nao_lida_nao_tem_membros: { ok: membros('promessa_nao_lida').length === 0, obtido: { total: membros('promessa_nao_lida').length, membros: membros('promessa_nao_lida').map((m) => m.fonte + ':' + m.linha + ':' + m.nome) } },
  C5_a_classe_de_julgamento_alvo_morto_nao_tem_membros: { ok: membros('alvo_morto').length === 0, obtido: { total: membros('alvo_morto').length, membros: membros('alvo_morto').map((m) => m.fonte + ':' + m.linha + ':' + m.nome + ' alvos=' + JSON.stringify(m.alvos)) } },
  C6_o_conjunto_varrido_e_medido_do_disco: { ok: ficheiros.length > 0 && ficheiros.every((f) => existsSync(f)), obtido: { raizes: raizes.length, ficheiros: ficheiros.length } },
  C7_a_peça_julga_a_si_mesma: { ok: asMinhas.length > 0 && asMinhas.every((c) => c.classe === 'lida'), obtido: { promessas_da_peça: asMinhas.map((c) => c.nome + ':' + c.classe) } },
  C8_a_contagem_de_leitores_de_env_e_do_disco_nao_da_memoria: { ok: ficheirosComEnvLido > 0, obtido: { com_env_lido: ficheirosComEnvLido, varridos: ficheiros.length } },
  C9_a_exclusao_por_regiao_so_vale_para_quem_a_declara_e_tem_fixura: { ok: regiaoEu.marcada && FIX.filter((f) => f.comRegiao).length === 2, obtido: { esta_peca_declara: regiaoEu.marcada, fixuras_de_regiao: FIX.filter((f) => f.comRegiao).length, promessas_retiradas_no_corpus: promessasRetiradasPorRegiao, ficheiros_com_regiao: ficheirosComRegiao } },
};
say('emissor_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_md5=' + createHash('md5').update(EU).digest('hex'));
const corpo = {
  em: new Date().toISOString(), sufixo: SUF,
  emissor: { bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') },
  raizes, fichas: { varridos: ficheiros.length, com_env_lido: ficheirosComEnvLido },
  regioes_de_fixura: { ficheiros_com_regiao: ficheirosComRegiao, promessas_retiradas_por_regiao: promessasRetiradasPorRegiao, esta_peca_declara: regiaoEu.marcada },
  promessas: classificadas.length, por_classe: porClasse, soma_das_classes: somaDasClasses,
  membros_por_classe: {
    lida: membros('lida').length,
    rotulo: membros('rotulo').length,
    alvo_morto: membros('alvo_morto').map((m) => ({ fonte: m.fonte, linha: m.linha, nome: m.nome, alvos: m.alvos })),
    promessa_nao_lida: membros('promessa_nao_lida').map((m) => ({ fonte: m.fonte, linha: m.linha, nome: m.nome, alvos: m.alvos })),
  },
  eixo_b_lido_sem_declaracao: { fontes: eixoB.length, nomes: eixoB.reduce((s, b) => s + b.nomes.length, 0), por_fonte: eixoB },
  fixuras: FIX.map((f) => ({ nome: f.nome, esperados: f.espera })),
  portoes: Object.keys(g).map((k) => ({ nome: k, ok: g[k].ok, obtido: g[k].obtido })),
  o_que_prova: 'quantas promessas de uso ha nos fontes varridos, em que sitio cada uma vive (linha Env, linha de comando com alvo, ou rotulo de saida), e se o nome prometido e lido pelo fonte que a propria promessa nomeia',
  o_que_NAO_prova: 'que um nome lido sem declaracao seja defeito -- o eixo B e contagem de estilo com tres maneiras de escrever a usanca na casa; nem que um rotulo de saida jamais prejudique quem le -- a conversa de manuais nao e desta peça; nem que a leitura dum nome por outra via (spawn com env propio) seja leitura -- so conta process.env; nem que uma promessa escondida fora das duas vias declaradas exista -- a unica exclusao e a regiao de fixura marcada, e o numero de promessas que ela retirou esta impresso acima.',
};
writeFileSync(registro, JSON.stringify(corpo, null, 1) + '\n', 'utf8');
say('registro_em=' + registro + ' bytes=' + statSync(registro).size);
const vermelhos = Object.keys(g).filter((k) => !g[k].ok);
say('P197_PROMESSAS_MEDIDAS ' + (Object.keys(g).length - vermelhos.length) + '/' + vermelhos.length + ' · ' + SUF + ' · lista_de_vermelhos=' + JSON.stringify(vermelhos));
if (vermelhos.length) throw new Error('ABORTA: conferencia de promessas com faltas -- ' + JSON.stringify(vermelhos));
