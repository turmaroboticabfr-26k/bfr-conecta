#!/usr/bin/env node
// p166 (SO LEITURA, zero rede, zero escrita no banco): censo em leitura dos testes e cenarios em disco.
//   PEN-15 — o que a jornada cross-role do C7 registou em ficha, quantos vermelhos ficaram sem prova de
//            correcao, e se a peca que a executa ainda e reproduzivel a partir do indice;
//   PEN-20 — se ha harness de testes (package.json / *.test.* / *.spec.* / frameworks), se existe agregador,
//            quantos portoes a suite do RM-1.4 registou, contra que versao do ar ela correu e que idade tem
//            a evidencia de produto (e2e);
//   PEN-21 — a familia de carga/desempenho medida por nome com padrao delimitado e, ao lado, a versao ingenua
//            de substring, para que o zero seja contagem e nao ausencia de padrao.
// Numeros nao sao dactilografados aqui: vao buscar-se ao texto do produtor (compilado), as fichas em disco e ao
// proprio git. A peca aborta quando uma agulha nao resolve, quando a celula do ledger nao traz o literal que eu
// vou confrontar, ou quando o grupo mais recente de um artefacto tem dois conteudos distintos.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p166-censo-em-leitura-dos-testes-e-cenarios-em-disco.mjs';
const SUF = process.env.P166_SUF ? '-' + process.env.P166_SUF : '';
const OUT = join(REPO, 'evidence/p166-censo-em-leitura-dos-testes-e-cenarios-em-disco' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P166_SUF=novo, nunca por cima');
const TXT = join(REPO, 'evidence/p166-censo-em-leitura-dos-testes-e-cenarios-em-disco' + SUF + '.txt');
if (existsSync(TXT)) throw new Error('ABORTA: ' + TXT + ' existe — correr com P166_SUF=novo, nunca por cima');
const t0 = Date.now();
const EMISSOR_BRUTO = readFileSync(join(REPO, PECA));
const EMISSOR_TXT = EMISSOR_BRUTO.toString('utf8');

// ---- indice, so leitura ------------------------------------------------------------------------------
function gitRaw(args) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  if (r.error) throw new Error('ABORTA: git ' + args.join(' ') + ' nao correu: ' + r.error.message);
  return r;
}
function git(args) {
  const r = gitRaw(args);
  if (r.status !== 0) {
    throw new Error('ABORTA: git ' + args.join(' ') + ' devolveu ' + r.status + ': ' + String(r.stderr || '').slice(0, 160));
  }
  return String(r.stdout);
}
const zeroACada = (s) => String(s).split('\0').filter(Boolean);
const VERSIONADOS = zeroACada(git(['ls-files', '-z']));
const NAO_RASTREADOS = zeroACada(git(['ls-files', '--others', '--exclude-standard', '-z']));
const IGNORADOS = zeroACada(git(['ls-files', '--others', '--ignored', '--exclude-standard', '-z']));
const SET_V = new Set(VERSIONADOS), SET_N = new Set(NAO_RASTREADOS), SET_I = new Set(IGNORADOS);

// Classe de indice dum caminho. As quatro ramificacoes tem de ter positivo, senao a regua e um ramo morto.
function classeDoNomeCom(n, v, i, o) {
  if (v.has(n)) return 'VERSIONADO';
  if (i.has(n)) return 'IGNORADO';
  if (o.has(n)) return 'SO_EM_DISCO';
  return 'AUSENTE';
}
const classeDoNome = (n) => classeDoNomeCom(n, SET_V, SET_I, SET_N);
const FIX_CONJUNTOS = { v: new Set(['a.js']), i: new Set(['b.js']), o: new Set(['c.js']) };
const FIXTURE_CLASSES = ['a.js', 'b.js', 'c.js', 'd.js'].map((n) => classeDoNomeCom(n, FIX_CONJUNTOS.v, FIX_CONJUNTOS.i, FIX_CONJUNTOS.o));

const lidos = [];
function leTexto(caminho) {
  if (!existsSync(join(REPO, caminho))) throw new Error('ABORTA: ' + caminho + ' nao esta em disco');
  const bruto = readFileSync(join(REPO, caminho));
  lidos.push({ caminho, bytes: bruto.length, md5: createHash('md5').update(bruto).digest('hex') });
  return bruto.toString('utf8');
}
const leJson = (caminho) => JSON.parse(leTexto(caminho));

// ---- celulas do ledger ------------------------------------------------------------------------------
const LEDGER = 'docs/roadmap-master.md';
const linhasLedger = leTexto(LEDGER).split('\n');
function celulaDe(id) {
  const hits = [];
  linhasLedger.forEach((l, i) => { if (l.startsWith('| ' + id + ' |')) hits.push({ n: i + 1, texto: l }); });
  if (hits.length !== 1) throw new Error('ABORTA: a linha | ' + id + ' | casa ' + hits.length + ' vezes em ' + LEDGER + ', espero 1');
  return hits[0];
}
const C15 = celulaDe('PEN-15'), C20 = celulaDe('PEN-20'), C21 = celulaDe('PEN-21');

// O numero alegado na celula PEN-20 le-se por campo de tabela: a celula escreve o caminho entre backticks,
// virgula, numero, a palavra portoes. Janela de caracteres nao e regua — a virgula ja separa.
function numeroDepoisDe(celula, agulha, oQue) {
  const partes = celula.texto.split(',');
  const i = partes.findIndex((p) => p.includes(agulha));
  if (i < 0) throw new Error('ABORTA: a celula ' + oQue + ' nao contem [' + agulha + ']');
  if (partes.filter((p) => p.includes(agulha)).length !== 1) throw new Error('ABORTA: [' + agulha + '] ocorre mais de uma vez na celula ' + oQue);
  const token = String(partes[i + 1] || '').trim().split(/\s+/)[0];
  if (!/^\d+$/.test(token)) throw new Error('ABORTA: o ' + oQue + ' depois de [' + agulha + '] nao e um numero puro: [' + token + ']');
  return Number(token);
}
const ALEGADO_PORTOES_20 = numeroDepoisDe(C20, 'rm14-suite.mjs', 'de PEN-20');
const DESFECHOS_20 = [...new Set([...C20.texto.matchAll(/\bRM14_SUITE_(?:VERDE|VERMELHA)\b/g)].map((x) => x[0]))];
if (DESFECHOS_20.length !== 1) throw new Error('ABORTA: a celula PEN-20 devolve ' + DESFECHOS_20.length + ' literais de desfecho, espero 1');
const ALEGADO_DESFECHO_20 = DESFECHOS_20[0];
const PELOS_15 = [...C15.texto.matchAll(/\bpelo\s+([A-Za-z0-9-]+)/g)].map((x) => x[1]);
if (PELOS_15.length !== 1) throw new Error('ABORTA: em PEN-15 a agulha «pelo <ciclo>» resolve para ' + PELOS_15.length + ' candidatos, espero 1');
const ALEGADO_CICLO_15 = PELOS_15[0];
const ALEGADO_RMS_21 = [...new Set([...C21.texto.matchAll(/RM-[\d.]+/g)].map((x) => x[0]))];
if (ALEGADO_RMS_21.length === 0) throw new Error('ABORTA: a celula PEN-21 nao nomeia nenhum RM');
const ALEGADO_NUNCA_EXECUTADO_21 = /nunca\s+executado/i.test(C21.texto);

// ---- produtores -------------------------------------------------------------------------------------
const P = {
  rm14: 'scripts/rm14-suite.mjs',
  c7j: 'scripts/c7-2-jornada-jwt.mjs',
  c7l: 'scripts/c7-3-limpeza.mjs',
  gitignore: '.gitignore',
};
const fonte = Object.fromEntries(Object.entries(P).map(([k, f]) => [k, leTexto(f)]));

// O nome do portao le-se da declaracao do produtor: uma seta cujo corpo incrementa um contador. Dois candidatos
// quereriam dizer que a contagem estatica soma duas maquinas distintas.
function declaracaoDePortao(de) {
  const hits = [];
  for (const m of fonte[de].matchAll(/const (\w+) = \([^)]*\) => \{/g)) {
    const corpo = fonte[de].slice(m.index, m.index + 420);
    if (/\w+\.\w+\+\+/.test(corpo) && /falhas|gaps|portoes/.test(corpo)) hits.push(m[1]);
  }
  if (hits.length !== 1) throw new Error('ABORTA: em ' + P[de] + ' a funcao de portao resolve para ' + hits.length + ' nomes [' + hits.join(',') + '], espero 1');
  return hits[0];
}
function contadorDePortao(de, nomeFuncao) {
  const i = fonte[de].indexOf('const ' + nomeFuncao + ' = (');
  if (i < 0) throw new Error('ABORTA: nao encontrei a declaracao de ' + nomeFuncao + ' em ' + P[de]);
  const unicos = [...new Set([...fonte[de].slice(i, i + 420).matchAll(/(\w+\.\w+)\+\+/g)].map((x) => x[1]))];
  if (unicos.length !== 1) throw new Error('ABORTA: o corpo de ' + nomeFuncao + ' em ' + P[de] + ' incrementa ' + unicos.length + ' contadores [' + unicos.join(',') + '], espero 1');
  return unicos[0];
}
function sitiosDeChamada(texto, nomeFuncao) {
  if (!/^\w+$/.test(nomeFuncao)) throw new Error('ABORTA: nome de funcao fora do alfabeto que sei contar: ' + nomeFuncao);
  return (texto.match(new RegExp('(?:^|[^\\w.])' + nomeFuncao + '\\(', 'gm')) || []).length;
}
const PORTAO = { rm14: declaracaoDePortao('rm14'), c7j: declaracaoDePortao('c7j') };
const CONTADOR = { rm14: contadorDePortao('rm14', PORTAO.rm14), c7j: contadorDePortao('c7j', PORTAO.c7j) };
const SITIOS = {
  rm14: sitiosDeChamada(fonte.rm14, PORTAO.rm14),
  c7j: sitiosDeChamada(fonte.c7j, PORTAO.c7j),
  inc_rm14: (fonte.rm14.match(new RegExp(CONTADOR.rm14.replace('.', '\\.') + '\\+\\+', 'g')) || []).length,
  inc_c7j: (fonte.c7j.match(new RegExp(CONTADOR.c7j.replace('.', '\\.') + '\\+\\+', 'g')) || []).length,
};
function arrayDoProdutor(de, agulha) {
  const i = fonte[de].indexOf(agulha);
  if (i < 0) throw new Error('ABORTA: a agulha [' + agulha + '] nao esta em ' + P[de]);
  if (fonte[de].indexOf(agulha, i + 1) >= 0) throw new Error('ABORTA: a agulha [' + agulha + '] ocorre mais de uma vez em ' + P[de]);
  const abre = fonte[de].indexOf('[', i);
  let fundo = 0, fim = -1;
  for (let k = abre; k < fonte[de].length; k++) {
    const c = fonte[de][k];
    if (c === '[') fundo++;
    else if (c === ']') { fundo--; if (fundo === 0) { fim = k + 1; break; } }
  }
  if (fim < 0) throw new Error('ABORTA: o array depois de [' + agulha + '] em ' + P[de] + ' nao fecha');
  const val = new Function('return ' + fonte[de].slice(abre, fim))();
  if (!Array.isArray(val)) throw new Error('ABORTA: [' + agulha + '] em ' + P[de] + ' nao resolve para array');
  return val;
}
const AMOSTRA_RM14 = arrayDoProdutor('rm14', 'const AMOSTRA =');

// Dependencias de ficheiro que a peca da jornada le: so caminhos do repo. Os de casa ficam de fora porque
// carregam credencial e esta peca nao abre ficha ignorada nenhuma.
function dependenciasDeRepo(de) {
  return [...new Set([...fonte[de].matchAll(/readFileSync\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
    .filter((p) => /^[a-z0-9_.-]+\//i.test(p)))];
}
const DEPS_C7J = dependenciasDeRepo('c7j').map((d) => ({ caminho: d, classe: classeDoNome(d) }));

// O .gitignore nomeia pecas caminho a caminho; a classe de cada nome mede-se no git, nao na memoria.
const IGN_NOMINAIS = fonte.gitignore.split('\n').map((l, i) => ({ linha: i + 1, padrao: l.trim() }))
  .filter((x) => /^scripts\/[\w.-]+\.mjs$/.test(x.padrao));
const IGN_NOMINAIS_MEDIDOS = IGN_NOMINAIS.map((x) => ({ ...x, em_disco: existsSync(join(REPO, x.padrao)), classe: classeDoNome(x.padrao) }));
const TRES_PECAS = ['scripts/c7-gap-fix-prova.mjs', 'scripts/c7-2-jornada-jwt.mjs', 'scripts/rm14-suite.mjs'];
const LINHAS_DAS_TRES = IGN_NOMINAIS_MEDIDOS.filter((x) => TRES_PECAS.includes(x.padrao)).map((x) => [x.padrao, x.classe, x.linha]);

// ---- fichas -----------------------------------------------------------------------------------------
function grupoMaisRecente(nomes) {
  const com = nomes.map((n) => ({ caminho: n, mtime: statSync(join(REPO, n)).mtimeMs,
    md5: createHash('md5').update(readFileSync(join(REPO, n))).digest('hex') })).sort((a, b) => b.mtime - a.mtime);
  if (com.length === 0) throw new Error('ABORTA: familia vazia em disco');
  const grupo = com.filter((x) => x.mtime === com[0].mtime);
  const conteudos = [...new Set(grupo.map((x) => x.md5))];
  if (conteudos.length !== 1) throw new Error('ABORTA: o grupo mais recente tem ' + conteudos.length + ' conteudos distintos: ' + grupo.map((x) => x.caminho).join(', '));
  return { grupo, eleito: grupo[0] };
}
const FICHAS_RM14 = VERSIONADOS.filter((n) => /^evidence\/rm14-suite.*\.json$/.test(n));
const RM14_TOPO = grupoMaisRecente(FICHAS_RM14);
const FICHA_RM14 = leJson(RM14_TOPO.eleito.caminho);
const DIARIOS_PUBLICACAO = readdirSync(REPO).filter((f) => /^audit-publicacao-v\d+\w*\.json$/.test(f));
const DIARIO_TOPO = grupoMaisRecente(DIARIOS_PUBLICACAO);
const DIARIO = leJson(DIARIO_TOPO.eleito.caminho);
const NUM_AR = Number((String(DIARIO.version).match(/^v(\d+)/) || [])[1]);
if (!NUM_AR) throw new Error('ABORTA: a versao do diario nao comeca com v-numero: ' + DIARIO.version);
const ALVO_RM14 = String(FICHA_RM14.cache_publicada_no_sw);
const NUM_ALVO_RM14 = Number((ALVO_RM14.match(/v(\d+)/) || [])[1]);
if (!Number.isInteger(NUM_ALVO_RM14)) throw new Error('ABORTA: o marcador de cache da ficha rm14 nao tem v-numero: ' + ALVO_RM14);
const REFERENCIA_MS = Date.parse(DIARIO.data);
if (!Number.isFinite(REFERENCIA_MS)) throw new Error('ABORTA: o diario nao traz data legivel: ' + DIARIO.data);
const idadeEmDias = (iso) => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error('ABORTA: instante nao resolvivel em ISO: [' + iso + ']');
  return Math.floor((REFERENCIA_MS - ms) / 86400000);
};

const FICHAS_JORNADA_V = VERSIONADOS.filter((n) => /jornada[^/]*\.json$/.test(n));
const FICHAS_JORNADA_I = IGNORADOS.filter((n) => /jornada[^/]*\.json$/.test(n));
const ABERTOS = new Set(lidos.map((x) => x.caminho));
const FICHA_C7 = leJson('docs/c7-2-jornada-jwt.json');
const RESUMO_C7 = leJson('docs/c7-2-resumo-jornada.json');
const GAPFIX_C7 = leJson('docs/c7-gap-fix-prova.json');
const LIMPEZA_C7 = leJson('docs/c7-3-limpeza.json');

const PECAS_E2E = VERSIONADOS.filter((n) => /^scripts\/e2e[\w.-]*\.mjs$/.test(n));
const FICHAS_E2E = VERSIONADOS.filter((n) => /^evidence\/(e2e\d+-|manual-v59-e2e-)[\w.-]*\.json$/.test(n));
const E2E = FICHAS_E2E.map((n) => {
  const j = leJson(n);
  const temEm = typeof j.em === 'string' && Number.isFinite(Date.parse(j.em));
  return { caminho: n, tem_em: temEm, tem_portoes: 'portoes' in j, idade_dias: temEm ? idadeEmDias(j.em) : null };
});
const E2E_COM_EM = E2E.filter((x) => x.tem_em);
const E2E_SEM_EM = E2E.filter((x) => !x.tem_em);
const E2E_COM_CONTAGEM = E2E.filter((x) => x.tem_portoes);
const FIX_FICHA_COM_CONTAGEM = [{ portoes: 3 }, {}].filter((j) => 'portoes' in j).length;

// ---- PEN-20: harness, agregador, frameworks ---------------------------------------------------------
const HARNESS = [
  ['package_json', /(^|\/)package\.json$/],
  ['ficheiro_teste_ou_spec', /\.(test|spec)\.[a-z]+$/i],
].map(([classe, re]) => ({ classe, no_indice: VERSIONADOS.filter((n) => re.test(n)), no_fixture: ['package.json', 'src/login.spec.ts', 'nada.txt'].filter((n) => re.test(n)).length }));
const AGREGADOR = /^scripts\/.*suite.*\.mjs$/;
const AGREGADOR_MEDIDO = { pecas_no_indice: VERSIONADOS.filter((n) => AGREGADOR.test(n)), fichas_no_indice: FICHAS_RM14,
  no_fixture: ['scripts/x-suite.mjs', 'docs/nota.md'].filter((n) => AGREGADOR.test(n)).length };
const RE_DE_CODIGO = /^(scripts|sql|app|functions|worker)\//;
const PALAVRAS_FRAMEWORK = ['playwright', 'vitest', 'jest', 'mocha', 'cypress'];
function grepVersionado(args) {
  const r = gitRaw(['grep', '-l', '-z'].concat(args));
  if (r.status !== 0 && r.status !== 1) throw new Error('ABORTA: git grep ' + args.join(' ') + ' devolveu ' + r.status + ': ' + String(r.stderr || '').slice(0, 140));
  return r.status === 1 ? [] : zeroACada(r.stdout);
}
const delimitada = (p) => '(^|[^a-z0-9])' + p + '([^a-z0-9]|$)';
const FRAMEWORKS = PALAVRAS_FRAMEWORK.map((palavra) => {
  const crua = grepVersionado(['-i', palavra]);
  const limpa = grepVersionado(['-i', '-E', delimitada(palavra)]);
  return { palavra, fichas_crua: crua.length, fichas_delimitada: limpa.length,
    em_peca_crua: crua.filter((n) => RE_DE_CODIGO.test(n)), em_peca_delimitada: limpa.filter((n) => RE_DE_CODIGO.test(n)), nomes: crua };
});
// O falso positivo da busca crua tem de ser nomeado pela linha onde vive, nao por opiniao minha.
const MOCHA_CRUA = FRAMEWORKS.find((f) => f.palavra === 'mocha').em_peca_crua;
const LINHA_MOCHA = MOCHA_CRUA.length === 1 ? leTexto(MOCHA_CRUA[0]).split('\n').find((l) => /mocha/i.test(l)) : null;
if (MOCHA_CRUA.length === 1 && !LINHA_MOCHA) throw new Error('ABORTA: mocha casou em ' + MOCHA_CRUA[0] + ' mas nenhuma linha contem a palavra');
const IDENTIFICADOR_MOCHA = LINHA_MOCHA ? ((LINHA_MOCHA.match(/const (\w*[mM]o[cC]ha\w*)/) || [])[1] || 'sem_identificador') : 'sem_ficha';
// Os dois sentidos da mesma regua em fixture: a palavra sozinha dispara nas duas, a substring dentro de um
// identificador so dispara na crua — que e exactamente o caso que o repo tem.
const FIX_LINHAS_MOCHA = ['const mocha = 1;', 'const comoChaves = (L) => 1;'].map((l) => ({
  crua: /mocha/i.test(l), delimitada: new RegExp(delimitada('mocha'), 'i').test(l) }));

// ---- PEN-21: familia de carga -----------------------------------------------------------------------
const CLASSES_CARGA = [
  ['k6', /(^|[^a-z0-9])k6([^a-z0-9]|$)/i],
  ['artillery', /(^|[^a-z0-9])artillery([^a-z0-9]|$)/i],
  ['stress', /(^|[^a-z0-9])stress([^a-z0-9]|$)/i],
  ['carga', /(^|[^a-z0-9])carga([^a-z0-9]|$)/i],
  ['pressao', /(^|[^a-z0-9])pressao([^a-z0-9]|$)/i],
  ['load_test', /(^|[^a-z0-9])load[_-]?test/i],
];
const FIX_CARGA = ['scripts/carga-k6.mjs', 'scripts/stress-lancamento.mjs', 'tools/artillery.yml', 'scripts/load_test.mjs', 'scripts/pressao.mjs', 'k6/carga.js'];
const varre = (nomes, re) => nomes.filter((n) => re.test(n));
const CARGA = CLASSES_CARGA.map(([classe, re]) => ({ classe, no_indice: varre(VERSIONADOS, re), em_ignorados: varre(IGNORADOS, re),
  no_fixture: varre(FIX_CARGA, re) }));
const CARGA_NAIVA_V = varre(VERSIONADOS, /load/i);
const CARGA_NAIVA_I = varre(IGNORADOS, /load/i);
const CARGA_NAIVA_PORQUE = CARGA_NAIVA_V.map((n) => ({ nome: n, casou_por: /payload/i.test(n) ? 'payload' : /download/i.test(n) ? 'download' : 'load' }));

// ---- PEN-15: o que a ficha registou ------------------------------------------------------------------
const TESTES_C7 = FICHA_C7.testes.map((t) => ({ nome: t.nome, ok: t.ok === true ? 'VERDE' : t.ok === false ? 'VERMELHO' : 'SEM_CLASSE' }));
const CONTAGEM_POR_CLASSE = {
  VERDE: TESTES_C7.filter((t) => t.ok === 'VERDE').length,
  VERMELHO: TESTES_C7.filter((t) => t.ok === 'VERMELHO').length,
  SEM_CLASSE: TESTES_C7.filter((t) => t.ok === 'SEM_CLASSE').length,
};
const MESAS_C7 = [...new Set([...fonte.c7j.matchAll(/\/rest\/v1\/([a-z_]+)/g)].map((m) => m[1]))].sort();
const FIX_MESA_FORA = ['mesa_que_nao_existe_no_produtor'];
const TOKENS_C7 = TESTES_C7.filter((t) => /^T0_[A-Z]+_TOKEN$/.test(t.nome)).map((t) => t.nome);
const GAPS_C7 = RESUMO_C7.gaps_identificados.map((g) => ({ id: g.id, teste: g.teste, severidade: g.severidade }));
const NAO_EXEC_C7 = RESUMO_C7.testes_nao_executados.map((g) => g.id);
const DIGITO_DO_GAP = (s) => (String(s).match(/GAP[-_]?(\d)/i) || [])[1] || 'sem_digito';
const GAP_FIX_NOMES = GAPFIX_C7.sucessos;
const GAP_IDS_COM_PROVA = [...new Set(GAP_FIX_NOMES.map(DIGITO_DO_GAP))].sort();
const GAP_IDS_REGISTRADOS = [...new Set(GAPS_C7.map((g) => DIGITO_DO_GAP(g.id)))].sort();
const TESTES_COM_PROVA = [...new Set(GAPS_C7.filter((g) => GAP_IDS_COM_PROVA.includes(DIGITO_DO_GAP(g.id))).map((g) => g.teste))].sort();
const FALHAS_POR_TESTE = {};
for (const t of TESTES_C7.filter((x) => x.ok === 'VERMELHO')) {
  const id = (t.nome.match(/^T\d+/) || [])[0];
  if (!id) throw new Error('ABORTA: o nome de teste ' + t.nome + ' nao comeca em T<numero>, nao sei a que teste pertence');
  FALHAS_POR_TESTE[id] = (FALHAS_POR_TESTE[id] || 0) + 1;
}
const FALHAS_COM_PROVA = Object.entries(FALHAS_POR_TESTE).filter(([id]) => TESTES_COM_PROVA.includes(id)).reduce((a, [, n]) => a + n, 0);
const FALHAS_SEM_PROVA = Object.entries(FALHAS_POR_TESTE).filter(([id]) => !TESTES_COM_PROVA.includes(id)).map(([id, n]) => id + ':' + n);
const FIX_GAP_PROVA = ['GAP1_DIR_SELECT', 'GAP2_SEC_INSERT', 'C7-GAP-3', 'GAPX_SEM_NUMERO'].map(DIGITO_DO_GAP);

// ---- portoes ----------------------------------------------------------------------------------------
const resolvePega = (p) => existsSync(join(REPO, p));
const PEGAS_CITADAS = [RM14_TOPO.eleito.caminho, DIARIO_TOPO.eleito.caminho, LEDGER, P.rm14, P.c7j, P.c7l, P.gitignore,
  'docs/c7-2-jornada-jwt.json', 'docs/c7-2-resumo-jornada.json', 'docs/c7-gap-fix-prova.json', 'docs/c7-3-limpeza.json',
  ...FICHAS_RM14, ...PECAS_E2E, ...DEPS_C7J.map((d) => d.caminho)].sort();
const FIX_PEGAS = ['docs/roadmap-master.md', 'docs/este_nome_nao_existe_aqui.json'].map(resolvePega);
const G = [];
function portao(nome, medido, esperado) {
  const ok = JSON.stringify(medido) === JSON.stringify(esperado);
  G.push({ nome, medido, esperado, ok });
  return ok;
}
//FIM-INDICE
portao('o_classificador_de_classe_de_indice_dispara_em_cada_um_dos_quatro_ramos', FIXTURE_CLASSES, ['VERSIONADO', 'IGNORADO', 'SO_EM_DISCO', 'AUSENTE']);
portao('nenhum_nome_aparece_em_duas_classes_do_indice', [[...SET_V].filter((n) => SET_I.has(n) || SET_N.has(n)).length, [...SET_I].filter((n) => SET_N.has(n)).length, [...SET_N].filter((n) => !existsSync(join(REPO, n))).length], [0, 0, 0]);
portao('os_tres_denominadores_de_indice_ficam_registrados_e_sao_maiores_que_zero', [VERSIONADOS.length > 0, NAO_RASTREADOS.length > 0, IGNORADOS.length > 0], [true, true, true]);
portao('cada_peca_e_cada_ficha_citada_resolvem_em_disco_e_o_fixture_de_peca_falsa_dispara', [PEGAS_CITADAS.filter((p) => !resolvePega(p)).length, PEGAS_CITADAS.every(resolvePega), FIX_PEGAS.filter((okPega) => !okPega).length, FIX_PEGAS.some((okPega) => !okPega)], [0, true, 1, true]);
portao('nenhum_produtor_lido_e_um_ficheiro_vazio', lidos.filter((x) => x.bytes === 0).map((x) => x.caminho), []);
portao('emissor_bytes_sao_bytes_do_ficheiro_e_nao_caracteres_da_string', [EMISSOR_BRUTO.length > 0, EMISSOR_BRUTO.length >= EMISSOR_TXT.length, EMISSOR_TXT.length > 0], [true, true, true]);
//FIM-PEN20-COMUM
portao('nao_ha_harness_de_teste_no_indice_e_a_regua_dispara_em_nome_fabricado', [HARNESS.map((x) => x.no_indice.length), HARNESS.map((x) => x.no_fixture)], [[0, 0], [1, 1]]);
portao('nenhum_agregador_de_suite_no_indice_e_o_disparador_tem_fixture', [AGREGADOR_MEDIDO.pecas_no_indice.length, AGREGADOR_MEDIDO.fichas_no_indice.length, AGREGADOR_MEDIDO.no_fixture], [0, 4, 1]);
portao('nenhuma_mencao_delimitada_de_framework_de_teste_vive_em_peca', FRAMEWORKS.map((f) => f.em_peca_delimitada.length), [0, 0, 0, 0, 0]);
portao('a_mencao_crua_de_framework_e_de_prosa_e_o_unico_caso_em_peca_e_um_falso_positivo_de_substring', [FRAMEWORKS.map((f) => f.fichas_crua), FRAMEWORKS.map((f) => f.fichas_delimitada), MOCHA_CRUA.length, IDENTIFICADOR_MOCHA], [[9, 9, 0, 1, 0], [9, 9, 0, 0, 0], 1, 'comoChaves']);
portao('o_falso_positivo_de_substring_tem_fixture_nos_dois_sentidos', FIX_LINHAS_MOCHA, [{ crua: true, delimitada: true }, { crua: true, delimitada: false }]);
portao('as_tres_pecas_de_suite_e_jornada_estao_fora_do_indice_por_linha_propria_do_gitignore', LINHAS_DAS_TRES, [['scripts/c7-gap-fix-prova.mjs', 'IGNORADO', 38], ['scripts/c7-2-jornada-jwt.mjs', 'IGNORADO', 39], ['scripts/rm14-suite.mjs', 'IGNORADO', 69]]);
portao('nenhum_padrao_nominal_de_peca_no_gitignore_aponta_para_um_caminho_inexistente', [IGN_NOMINAIS.length, IGN_NOMINAIS_MEDIDOS.filter((x) => !x.em_disco).map((x) => x.padrao), IGN_NOMINAIS_MEDIDOS.filter((x) => x.classe !== 'IGNORADO').map((x) => x.padrao)], [13, [], []]);
portao('a_suite_minima_registra_tantos_portoes_quantos_a_celula_pen20_afirma', [ALEGADO_PORTOES_20, FICHA_RM14.portoes], [31, 31]);
portao('o_desfecho_da_ficha_e_o_literal_que_a_celula_cita', [ALEGADO_DESFECHO_20, FICHA_RM14.desfecho], ['RM14_SUITE_VERDE', 'RM14_SUITE_VERDE']);
portao('o_contador_de_portao_incrementa_num_sitio_unico_em_cada_produtor', [SITIOS.inc_rm14, SITIOS.inc_c7j, PORTAO.rm14, CONTADOR.rm14, PORTAO.c7j, CONTADOR.c7j], [1, 1, 'ok', 'g.portoes', 'gate', 'results.portoes']);
portao('os_sitios_estaticos_nao_sao_os_portoes_de_runtime_nem_por_um_nem_por_outro', [SITIOS.rm14, FICHA_RM14.portoes, SITIOS.rm14 - FICHA_RM14.portoes, SITIOS.c7j, FICHA_C7.portoes, SITIOS.c7j - FICHA_C7.portoes], [22, 31, -9, 15, 12, 3]);
portao('a_amostra_de_mesas_lida_do_produtor_bate_com_a_contagem_da_ficha', [AMOSTRA_RM14.length, FICHA_RM14.amostra_anon.tentadas], [11, 11]);
portao('a_suite_nao_aponta_para_a_versao_do_ar_do_diario_mais_novo', [NUM_ALVO_RM14, NUM_AR, NUM_AR - NUM_ALVO_RM14], [122, 144, 22]);
portao('nenhuma_ficha_de_suite_e_posterior_ao_ultimo_deploy_e_o_grupo_mais_recento_tem_um_conteudo', [idadeEmDias(FICHA_RM14.em) > 0, RM14_TOPO.grupo.length, [...new Set(RM14_TOPO.grupo.map((x) => x.md5))].length], [true, 2, 1]);
portao('as_sondas_de_produto_e2e_estao_no_indice_e_a_contagem_de_fichas_e_a_medida', [PECAS_E2E.length, FICHAS_E2E.length], [7, 16]);
portao('nenhuma_ficha_e2e_tem_contagem_de_portoes_e_a_classe_dispara_em_fixture', [E2E_COM_CONTAGEM.length, E2E.filter((x) => !x.tem_portoes).length, FIX_FICHA_COM_CONTAGEM], [0, 16, 1]);
portao('a_classe_de_ficha_e2e_sem_instante_iso_imprime_se_com_o_numero', [E2E_COM_EM.length, E2E_SEM_EM.length, E2E.length === E2E_COM_EM.length + E2E_SEM_EM.length], [7, 9, true]);
portao('as_fichas_e2e_com_instante_sao_todas_anteriores_a_versao_atual_do_ar', [E2E_COM_EM.every((x) => x.idade_dias > 0), Math.min(...E2E_COM_EM.map((x) => x.idade_dias)), Math.max(...E2E_COM_EM.map((x) => x.idade_dias))], [true, 32, 32]);
//FIM-PEN20
portao('a_jornada_c7_registra_doze_testes_cinco_verdes_e_sete_vermelhos', [CONTAGEM_POR_CLASSE.VERDE, CONTAGEM_POR_CLASSE.VERMELHO, FICHA_C7.portoes], [5, 7, 12]);
portao('o_resumo_bate_com_a_lista_de_testes_campo_a_campo', [RESUMO_C7.portoes, RESUMO_C7.sucessos, RESUMO_C7.falhas, FICHA_C7.falhas.length], [12, 5, 7, 7]);
portao('nenhum_teste_da_jornada_fica_sem_classe_de_estado', [CONTAGEM_POR_CLASSE.SEM_CLASSE, TESTES_C7.filter((t) => t.ok === 'VERDE' || t.ok === 'VERMELHO').length], [0, 12]);
portao('a_celula_pen15_cita_um_ciclo_cujas_fichas_estao_no_indice', [ALEGADO_CICLO_15, FICHAS_JORNADA_V.filter((n) => n.startsWith('docs/c7-')).length], ['C7', 2]);
portao('as_cinco_mesas_do_cenario_sao_lidas_do_produtor_e_o_nome_fabricado_nao_casa', [MESAS_C7.length, MESAS_C7.every((m) => fonte.c7j.includes('/rest/v1/' + m)), FIX_MESA_FORA.every((m) => fonte.c7j.includes('/rest/v1/' + m))], [5, true, false]);
portao('os_tres_tokens_de_papel_estao_registrados_na_ficha', TOKENS_C7, ['T0_DIR_TOKEN', 'T0_COORD_TOKEN', 'T0_SECR_TOKEN']);
portao('as_tres_lacunas_registradas_tem_prova_de_correcao_e_dos_cinco_testes_vermelhos_duas_falhas_ficam_sem_prova', [GAP_IDS_REGISTRADOS, GAP_IDS_COM_PROVA, TESTES_COM_PROVA, FALHAS_COM_PROVA, FALHAS_SEM_PROVA, NAO_EXEC_C7], [['1', '2', '3'], ['1', '2', '3'], ['T1', 'T2', 'T4'], 5, ['T3:1', 'T5:1'], ['T3', 'T5']]);
portao('os_digitos_de_lacuna_tem_disparador_em_nome_fabricado_e_em_nome_sem_numero', FIX_GAP_PROVA, ['1', '2', '3', 'sem_digito']);
portao('nenhuma_ficha_de_jornada_e_posterior_a_prova_de_08-11_e_a_folga_entre_as_tres_e_de_um_dia', [idadeEmDias(FICHA_C7.em) > 0, idadeEmDias(GAPFIX_C7.em) > 0, Math.round((Date.parse(GAPFIX_C7.em) - Date.parse(FICHA_C7.em)) / 86400000)], [true, true, 0]);
portao('a_peca_da_jornada_le_um_ficheiro_de_contas_que_tambem_esta_fora_do_indice', DEPS_C7J, [{ caminho: 'docs/c7-accounts.json', classe: 'IGNORADO' }, { caminho: 'docs/c7-fixtures.json', classe: 'VERSIONADO' }]);
portao('esta_peca_nao_abre_nenhuma_ficha_de_jornada_ignorada', [FICHAS_JORNADA_I.filter((n) => ABERTOS.has(n)).length, FICHAS_JORNADA_I.length], [0, 1]);
portao('a_limpeza_c7_registra_nove_portoes_nove_falhas_e_a_causa_do_aborto_fica_na_ficha', [LIMPEZA_C7.portoes, LIMPEZA_C7.falhas.length, /0A000/.test(String(LIMPEZA_C7.erro))], [9, 9, true]);
portao('cada_teste_vermelho_da_jornada_ou_ja_tem_prova_de_correcao_ou_esta_entre_os_nao_executados', [TESTES_COM_PROVA.length + NAO_EXEC_C7.length, Object.keys(FALHAS_POR_TESTE).length], [5, 5]);
//FIM-PEN15
portao('nenhuma_peca_e_nenhum_artefacto_de_carga_de_desempenho_no_indice', [CARGA.map((x) => x.no_indice.length), CARGA.map((x) => x.em_ignorados.length)], [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]]);
portao('as_seis_classes_de_carga_imprimem_se_com_o_numero_mesmo_quando_e_zero', [Object.fromEntries(CARGA.map((x) => [x.classe, x.no_indice.length])), CARGA.every((x) => x.no_fixture.length > 0), CARGA.map((x) => x.no_fixture.length)], [{ k6: 0, artillery: 0, stress: 0, carga: 0, pressao: 0, load_test: 0 }, true, [2, 1, 1, 2, 1, 1]]);
portao('a_regua_naiva_de_substring_conta_dois_nomes_e_ambos_sao_explicados_por_que_casam', [CARGA_NAIVA_V.length, CARGA_NAIVA_PORQUE.map((x) => x.casou_por)], [2, ['download', 'payload']]);
portao('a_regua_naiva_tambem_corre_sobre_os_ignorados_e_todas_as_ocorrencias_sao_perfis_de_browser', [CARGA_NAIVA_I.length > 0, CARGA_NAIVA_I.every((n) => /perfil/.test(n)), CARGA_NAIVA_I.filter((n) => !/perfil/.test(n))], [true, true, []]);
portao('a_celula_pen21_afirma_nunca_executado_e_nao_ha_instrumento_para_o_executar', [ALEGADO_NUNCA_EXECUTADO_21, CARGA.reduce((a, x) => a + x.no_indice.length, 0), ALEGADO_RMS_21], [true, 0, ['RM-4.6', 'RM-6.4']]);
//FIM-PEN21

const falhas = G.filter((p) => !p.ok);
const veredito = falhas.length === 0 ? 'P166_CENSO_MEDIDO ' + G.length + '/0'
  : 'P166_CENSO_VERMELHO ' + (G.length - falhas.length) + '/' + falhas.length + ' ' + falhas.map((p) => p.nome).join(',');
const out = {
  peca: PECA,
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  emissor_bytes: EMISSOR_BRUTO.length,
  emissor_chars: EMISSOR_TXT.length,
  emissor_md5: createHash('md5').update(EMISSOR_BRUTO).digest('hex'),
  ciclo: 'SM.54',
  metodo: 'so leitura de disco: git ls-files (versionados, nao rastreados, ignorados) e git grep sobre o indice, texto dos produtores compilado, fichas JSON em disco; 0 rede, 0 chamada ao banco, 0 escrita fora de evidence/',
  indices: { versionados: VERSIONADOS.length, nao_rastreados: NAO_RASTREADOS.length, ignorados: IGNORADOS.length },
  ar_atual: { diario: DIARIO_TOPO.eleito.caminho, versao: DIARIO.version, data: DIARIO.data, numero: NUM_AR },
  celulas_lidas: {
    PEN_15: { linha: C15.n, ciclo_citado: ALEGADO_CICLO_15 },
    PEN_20: { linha: C20.n, portoes_alegados: ALEGADO_PORTOES_20, desfecho_alegado: ALEGADO_DESFECHO_20 },
    PEN_21: { linha: C21.n, rms: ALEGADO_RMS_21, alega_nunca_executado: ALEGADO_NUNCA_EXECUTADO_21 },
  },
  produtores: P,
  produtores_lidos: lidos,
  portoes_estaticos: { ...SITIOS, nome_do_portao_rm14: PORTAO.rm14, nome_do_portao_c7j: PORTAO.c7j, contador_rm14: CONTADOR.rm14, contador_c7j: CONTADOR.c7j },
  pen20: {
    harness: HARNESS,
    agregador: AGREGADOR_MEDIDO,
    frameworks: FRAMEWORKS,
    linha_onde_mocha_casa: LINHA_MOCHA ? LINHA_MOCHA.trim().slice(0, 120) : 'sem_caso',
    gitignore_nominal: IGN_NOMINAIS_MEDIDOS,
    ficha: { caminho: RM14_TOPO.eleito.caminho, grupo_mesmo_instante: RM14_TOPO.grupo.map((x) => x.caminho), em: FICHA_RM14.em,
      idade_dias: idadeEmDias(FICHA_RM14.em), portoes: FICHA_RM14.portoes, falhas: FICHA_RM14.falhas,
      lacunas_registradas: FICHA_RM14.lacunas_registradas.length, desfecho: FICHA_RM14.desfecho,
      cache_publicada_no_sw: FICHA_RM14.cache_publicada_no_sw, alvo: FICHA_RM14.alvo },
    e2e: { pecas: PECAS_E2E, fichas: FICHAS_E2E.length, com_instante: E2E_COM_EM.length, sem_instante: E2E_SEM_EM.map((x) => x.caminho),
      com_contagem_de_portoes: E2E_COM_CONTAGEM.length, idade_em_dias: E2E_COM_EM.map((x) => x.idade_dias) },
  },
  pen15: {
    ficha: { caminho: 'docs/c7-2-jornada-jwt.json', em: FICHA_C7.em, idade_dias: idadeEmDias(FICHA_C7.em),
      portoes: FICHA_C7.portoes, contagem_por_classe: CONTAGEM_POR_CLASSE, testes: TESTES_C7 },
    resumo: { caminho: 'docs/c7-2-resumo-jornada.json', portoes: RESUMO_C7.portoes, sucessos: RESUMO_C7.sucessos,
      falhas: RESUMO_C7.falhas, lacunas: GAPS_C7, nao_executados: NAO_EXEC_C7 },
    gap_fix: { caminho: 'docs/c7-gap-fix-prova.json', em: GAPFIX_C7.em, idade_dias: idadeEmDias(GAPFIX_C7.em),
      portoes: GAPFIX_C7.portoes, nomes: GAP_FIX_NOMES, gaps_com_prova: GAP_IDS_COM_PROVA, testes_com_prova: TESTES_COM_PROVA },
    decomposicao_dos_vermelhos: { por_teste: FALHAS_POR_TESTE, com_prova: FALHAS_COM_PROVA, sem_prova: FALHAS_SEM_PROVA },
    limpeza: { caminho: 'docs/c7-3-limpeza.json', em: LIMPEZA_C7.em, portoes: LIMPEZA_C7.portoes, falhas: LIMPEZA_C7.falhas.length, causa: String(LIMPEZA_C7.erro).slice(0, 200) },
    mesas: MESAS_C7, papeis: TOKENS_C7,
    reprodutibilidade: { peca: P.c7j, classe_da_peca: classeDoNome(P.c7j), dependencias: DEPS_C7J,
      fichas_de_jornada_no_indice: FICHAS_JORNADA_V, fichas_ignoradas_nao_abertas: FICHAS_JORNADA_I },
  },
  pen21: {
    classes: CARGA.map((x) => ({ classe: x.classe, no_indice: x.no_indice.length, em_ignorados: x.em_ignorados.length, no_fixture: x.no_fixture })),
    regua_naiva: { no_indice: CARGA_NAIVA_V, porque_casou: CARGA_NAIVA_PORQUE, em_ignorados: CARGA_NAIVA_I.length,
      em_ignorados_de_perfis_de_browser: CARGA_NAIVA_I.filter((n) => /perfil/.test(n)).length },
    celula: { alega_nunca_executado: ALEGADO_NUNCA_EXECUTADO_21, rms: ALEGADO_RMS_21 },
  },
  o_que_prova: [
    'que nao ha harness de teste no indice (package.json, *.test.*, *.spec.*) e que os cinco nomes de framework so aparecem em prosa, com o unico caso em peca explicado por substring',
    'quantos portoes a suite do RM-1.4 registou na ficha mais recente, se esse numero e o mesmo que a celula PEN-20 afirma, e contra que numero de versao ela apontou',
    'que a contagem estatica de sitios de chamada de portao nao e a contagem de runtime em ambos os sentidos: o rm14 tem menos sitios que portoes e o C7 tem mais',
    'que as tres pecas de suite e jornada estao fora do indice por linha nominal propria do .gitignore e que os treze padroes nominais de peca apontam todos para ficheiro existente',
    'o que a ficha da jornada cross-role do C7 registou: doze testes, cinco verdes, sete vermelhos, as mesas tocadas, os papeis com token e a decomposicao dos vermelhos entre provados e nao provados',
    'que a peca que executa a jornada le um ficheiro de contas que tambem esta fora do indice, logo a jornada nao se reproduz a partir do repo',
    'que a familia de carga e desempeno tem zero nomes no indice e zero nos ignorados pela regua delimitada, com a versao ingenua registada ao lado e os dois nomes que ela apanha explicados',
    'que nenhuma ficha e2e traz contagem de portoes e que nove das dezasseis nem sequer trazem instante legivel em ISO',
  ],
  o_que_NAO_prova: [
    'que a suite do RM-1.4 passa hoje: nao a re-corri, porque ela escreve por cima de evidence/rm14-suite.json, um nome ja versionado, e porque fala com a rede; o que esta medido e a ultima ficha que existe',
    'que a jornada do C7 passa hoje: re-corre-la escreve em occurrences, supervision_requests, staff_announcements e limpa contas; isto e censo de ficha velha, nao execucao',
    'que um teste de produto e2e funcione: conto fichas e a ausencia de contagem de portoes nelas',
    'que a ausencia de instrumento de carga signifique que o produto aguenta carga: significa que nunca houve instrumento para tentar',
    'que o .gitignore deva deixar de excluir as tres pecas: isto registra o estado, nao propoe alteracao; mexer no predicado de exclusao e decisao com OK proprio',
    'nada sobre senhas, tokens ou valores de linha: as fichas ignoradas que carregam credencial foram classificadas por nome e nunca abertas por esta peca',
  ],
  portoes: { total: G.length, falhas: falhas.length, lista: G },
  estado: falhas.length > 0 ? 'PORTAO_VERMELHO — veredito nao emitido' : 'MEDIDO',
};
out.veredito_final = veredito;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const linhasTxt = [
  'veredito=' + out.veredito_final,
  'indices versionados=' + VERSIONADOS.length + ' nao_rastreados=' + NAO_RASTREADOS.length + ' ignorados=' + IGNORADOS.length,
  'ar=' + DIARIO_TOPO.eleito.caminho + ' versao=' + DIARIO.version + ' data=' + DIARIO.data,
  'pen20 harness=' + HARNESS.map((x) => x.classe + ':' + x.no_indice.length + '/fix' + x.no_fixture).join(' ') + ' agregador_pecas=' + AGREGADOR_MEDIDO.pecas_no_indice.length + ' agregador_fichas=' + AGREGADOR_MEDIDO.fichas_no_indice.length,
  'pen20 frameworks=' + FRAMEWORKS.map((f) => f.palavra + ':crua' + f.fichas_crua + '/delimitada' + f.fichas_delimitada + '/peca' + f.em_peca_delimitada.length).join(' ') + ' mocha_em_peca=' + MOCHA_CRUA.join(',') + ' identificador=' + IDENTIFICADOR_MOCHA,
  'pen20 ficha=' + RM14_TOPO.eleito.caminho + ' em=' + FICHA_RM14.em + ' idade_dias=' + idadeEmDias(FICHA_RM14.em) + ' portoes=' + FICHA_RM14.portoes + ' alegado=' + ALEGADO_PORTOES_20 + ' desfecho=' + FICHA_RM14.desfecho,
  'pen20 sitios=' + JSON.stringify(SITIOS) + ' portoes_da_ficha_c7j=' + FICHA_C7.portoes + ' amostra=' + AMOSTRA_RM14.length + '/' + FICHA_RM14.amostra_anon.tentadas,
  'pen20 alvo=' + FICHA_RM14.cache_publicada_no_sw + '(' + NUM_ALVO_RM14 + ') ar=' + DIARIO.version + '(' + NUM_AR + ') delta_versoes=' + (NUM_AR - NUM_ALVO_RM14),
  'pen20 gitignore_nominal=' + IGN_NOMINAIS.length + ' sem_disco=' + IGN_NOMINAIS_MEDIDOS.filter((x) => !x.em_disco).length + ' das_tres=' + JSON.stringify(LINHAS_DAS_TRES),
  'pen20 e2e pecas=' + PECAS_E2E.length + ' fichas=' + FICHAS_E2E.length + ' com_instante=' + E2E_COM_EM.length + ' sem_instante=' + E2E_SEM_EM.length + ' com_contagem=' + E2E_COM_CONTAGEM.length + ' idade=' + E2E_COM_EM.map((x) => x.idade_dias).join(','),
  'pen15 ficha=' + FICHA_C7.em + ' idade=' + idadeEmDias(FICHA_C7.em) + ' verdes=' + CONTAGEM_POR_CLASSE.VERDE + ' vermelhos=' + CONTAGEM_POR_CLASSE.VERMELHO + ' sem_classe=' + CONTAGEM_POR_CLASSE.SEM_CLASSE,
  'pen15 mesas=' + MESAS_C7.join(',') + ' papeis=' + TOKENS_C7.join(','),
  'pen15 lacunas=' + JSON.stringify(GAPS_C7.map((g) => g.id + '@' + g.teste)) + ' nao_exec=' + NAO_EXEC_C7.join(','),
  'pen15 vermelhos_por_teste=' + JSON.stringify(FALHAS_POR_TESTE) + ' com_prova=' + FALHAS_COM_PROVA + ' sem_prova=' + FALHAS_SEM_PROVA.join(','),
  'pen15 reprodutibilidade peca=' + classeDoNome(P.c7j) + ' dependencias=' + DEPS_C7J.map((d) => d.caminho + ':' + d.classe).join(' ') + ' jornada_fichas_v=' + FICHAS_JORNADA_V.length + ' i=' + FICHAS_JORNADA_I.length,
  'pen15 limpeza=' + LIMPEZA_C7.portoes + '/' + LIMPEZA_C7.falhas.length + ' erro_tem_0A000=' + /0A000/.test(String(LIMPEZA_C7.erro)),
  'pen21 carga=' + CARGA.map((x) => x.classe + ':' + x.no_indice.length + '/' + x.em_ignorados.length + '/fix' + x.no_fixture.length).join(' '),
  'pen21 naiva=' + CARGA_NAIVA_PORQUE.map((x) => x.nome + '[' + x.casou_por + ']').join(' ') + ' ignorados=' + CARGA_NAIVA_I.length,
  'gates=' + G.map((p) => p.nome + ':' + (p.ok ? 'VERDE' : 'VERMELHO')).join(' '),
].join('\n') + '\nnode_exit=0 msd=' + (Date.now() - t0) + '\n';
writeFileSync(TXT, linhasTxt);
console.log(linhasTxt);
if (falhas.length > 0) process.exit(1);
