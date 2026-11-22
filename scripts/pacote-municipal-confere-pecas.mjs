#!/usr/bin/env node
// PACOTE-MUNICIPAL-CONFERE-PECAS — o portão do pacote municipal.
//
// Existe porque um runbook é uma promessa sobre ficheiros: cada caminho que a prosa nomeia tem de existir, e
// cada «nada foi aplicado» tem de ser lido no catálogo, não recordado por quem escreve. Nada deste programa
// escreve no banco: lê o runbook, lê o disco, lê o `pg_*`, e escreve só o seu registo.
//
// Os caminhos são colhidos do texto do runbook, não de uma lista que eu escrevesse aqui — uma lista lembrada
// envelhece no dia em que a prosa muda. O corpus tem de crescer com as famílias que a prosa passa a citar, e
// por isso `cada_familia_do_corpus_despe_pelo_menos_um_caminho` existe: família com zero caminhos é a forma
// silenciosa de um portão que não varreu nada.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
// Corpus = os dois documentos que hoje nomeiam peças deste pacote. O runbook era o único até 20/11, mas o
// §11 do plano de prioridades passou a citar scripts e evidências próprios; corpus que não cresce com a prosa
// é o portão que varre metade das promessas e chama «verde» ao resto.
const RUNBOOK = 'docs/bu-20-11/10-runbook-municipal.md';
const CORPUS_ARQS = [RUNBOOK, 'docs/bu-20-11/08-plano-de-prioridades.md'];
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/pacote-municipal-pecas-20-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');

const md5 = (b) => createHash('md5').update(b).digest('hex');
const mede = (rel) => { const b = readFileSync(join(REPO, rel)); return { caminho: rel, bytes: b.length, md5: md5(b) }; };

// A classe inclui letras acentuadas (`\p{L}`): com `[A-Za-z0-9._-]` um nome com acento partia-se-se e o portão
// se queixava de um ficheiro que ninguém citou. O que a sonda extrai vai para o registo, para o leitor poder
// ver o que ela viu.
const RE_CORPUS = /(?:scripts|evidence|docs|worker-deploy-[a-z0-9-]+|bfr-candidata-[a-z0-9-]+|public)\/[\p{L}\p{N}._-]*\.(?:sql|mjs|json|txt|md)/gu;
const FIX_DISPARO = 'ver `scripts/x-pen99-ddl-candidata.sql` e `evidence/x-pecas-20-11.json` e `docs/x-nota.md`';
const FIX_DISPARO_ESPERADO = ['scripts/x-pen99-ddl-candidata.sql', 'evidence/x-pecas-20-11.json', 'docs/x-nota.md'];
// Dois tipos de «não existe», com naturezas opostas, têm de ser declarados e não confundidos:
//   saida_de_passo_nao_autorizado — artefacto que só nasce quando o passo correr (publicar a v137);
//   fora_do_git_por_designio       — ficheiro de sessão, que o `.gitignore` guarda para não versionar
//                                    credenciais. A régua é o `git check-ignore`, não a memória do nome.
// São as três saídas do mesmo passo, e o portão abaixo exige que continuem ausentes: se o `wrangler deploy` correr
// e elas aparecerem, este portão vai a vermelho e obriga a tirar os nomes da lista — a classe não apodrece sozinha.
const SAIDAS_AINDA_NAO_CORRIDAS = ['evidence/v137-deploy-stdout-20-11.txt', 'evidence/v137-deployments-list-depois-20-11.json',
  'evidence/v137-deployments-status-depois-20-11.json',
  'evidence/v138-deploy-stdout-20-11.txt', 'evidence/v138-deployments-list-depois-20-11.json', 'evidence/v138-deployments-status-depois-20-11.json'];
const FORA_DO_GIT = ['ah2-sessions.json', 'c2-sessions.json'];
// Terceiro tipo de «não existe», medido em 20/11 ao alargar o corpus ao documento 08: um nome que a prosa
// cita PARA DIRE QUE NÃO EXISTE. `scripts/bu4-digestao-para-documentacao-20-11.mjs` é o nome do output que o
// campo `instrumento` declarava por engano; o fantasma só é inofensivo enquanto a linha ao lado o chamar
// fantasma. Por isso o portão não perdoa o nome: exige a declaração junto dele.
// `scripts/p73-pen43-preflight.mjs` era desta raça e saiu da lista em 20/11, no dia em que a peça passou a
// existir: a FALTA-5 do §2.7 fechou ao nível do caminho e a frase declarante foi apagada com ela. Um nome que sai
// dos fantasmas tem de resolver em disco E entrar no índice — são as duas réguas abaixo que o vigiam.
const FANTASMAS_DECLARADOS = [
  { caminho: 'scripts/bu4-digestao-para-documentacao-20-11.mjs', a_prosa_diz: 'o script com esse nome não existe' },
];
// Quarta classe de «não está no índice»: existe em disco, NÃO é ignorada, e mesmo assim não entra — por decisão
// assinada e registada noutro lado. É o avesso do esquecimento, e sem esta declaração as duas coisas escrevem-se
// igual no veredicto. O portão não aceita a alegação: exige (a) que o ficheiro ainda exista, (b) que ainda NÃO
// esteja no índice, (c) que ainda NÃO seja ignorado, e (d) que a frase que declara a decisão continue no corpus.
// Cai a frase, o nome volta a ser «esquecido» e o vermelho regressa — é assim que a lista não apodrece sozinha.
const FORA_DO_INDICE_POR_DECISAO = [
  { caminho: 'evidence/ah2-home-papel-a-papel-v1.json', a_prosa_diz: 'tem decisão assinada em `26e220d`',
    decisao: '26e220d renomeou o campo para `rota_home` e re-geriu o artefacto como v3 (v3 está no índice)' },
];
// Quinta classe, o avesso medido da anterior. Em 18/11 a régua da casa era «zero ficheiros com ponto inicial
// versionados em `evidence/`», e o batch `1800682` («versionar as 48 provas nomeadas por conteúdo indexado») levou
// um deles para dentro sem que a frase de §3.5 fosse reescrita. O conteúdo já está publicado e em histórico,
// portanto des-rastrear seria teatro; a classe deixa de ser um zero e passa a ser **a lista declarada**, com a
// frase da decisão como condição — cai a frase, ou aparece um segundo ponto que ninguém assinou, e o portão dá
// vermelho por nome. É a mesma régua com o `esperado` derivado do git, não o valor lembrado por quem escreve.
const NO_INDICE_POR_DECISAO_NOVA = [
  { caminho: 'evidence/.funde-v134-18-11.txt', a_prosa_diz: 'a classe passou de um zero para uma lista declarada',
    decisao: '1800682 versionou o stdout do `ah2-funde-sessoes.mjs` por ser prova nomeada pela prosa; a frase de 18/11 fica como medição datada daquele dia' },
];
// O portão não se varre a si próprio: o registo e o stdout desta corrida são citados pelo runbook e ainda não
// existem quando a varredura corre — o `.txt` nasce do redireccionamento do stdout desta própria execução.
// Excluir só estes dois nomes, declarados, e não alargar o predicado.
const EXCEPCAO_DECLARADA = ['evidence/pacote-municipal-pecas-20-11.json', 'evidence/pacote-municipal-pecas-20-11.txt'];
const ignoradoPeloGit = (rel) => {
  try { execFileSync('git', ['-c', 'core.quotePath=false', 'check-ignore', '-q', rel], { cwd: REPO, encoding: 'utf8' }); return true; }
  catch { return false; }
};

// `--runbook` existe para uma coisa só: poder apontar este portão para um corpus que eu estrago de
// propósito, para provar que ele tem dentes. Sem essa porta, o verde de `nenhum_caminho_citado_falta_em_disco`
// não se distinguiria de um portão que não varre nada. Aceita uma lista separada por vírgula.
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf('--' + n); return i === -1 ? null : argv[i + 1]; };
const ABSOLUTO = (p) => p.startsWith('/') || /^[a-z]:/i.test(p);
const RUNBOOK_USADO = flag('runbook') || CORPUS_ARQS.join(',');
const CORPUS = RUNBOOK_USADO.split(',').map((s) => s.trim()).filter(Boolean);
const textoCorpus = CORPUS.map((rel) => readFileSync(ABSOLUTO(rel) ? rel : join(REPO, rel), 'utf8'));
const texto = textoCorpus.join('\n');
// O Markdown quebra linhas e as aspas do corpus são aspas de código: uma declaração não deixa de existir porque
// o editor apartiu a frase em duas. Comparar com espaços colapsados é a única forma de o portão não acusar
// ausência por um corte de linha meu, e é por isso que as duas famílias declaradas — fantasmas e decisões —
// passam pelas mesmas duas funções.
const textoNorm = texto.replace(/\s+/g, ' ');
const fraseNoCorpus = (frase) => textoNorm.includes(frase.replace(/\s+/g, ' '));
const cadaFicheiro = CORPUS.map((rel, i) => ({ ficheiro: rel, citados: (textoCorpus[i].match(RE_CORPUS) || []).length }));
const citados = [...new Set(texto.match(RE_CORPUS) || [])].sort();
const emFaltaReal = citados.filter((c) => !existsSync(join(REPO, c)) && !SAIDAS_AINDA_NAO_CORRIDAS.includes(c) && !EXCEPCAO_DECLARADA.includes(c) && !FANTASMAS_DECLARADOS.some((f) => f.caminho === c));
const presentes = citados.filter((c) => existsSync(join(REPO, c)) && !EXCEPCAO_DECLARADA.includes(c));
const porFamilia = (() => { const f = {}; for (const c of citados) { const k = c.split('/')[0]; f[k] = (f[k] || 0) + 1; } return f; })();
// `existsSync` não é «a peça existe»: é «a peça está nesta máquina». Descoberto 20/11 ao responder «falta
// algo?»: a PEN-41 inteira (candidata, reversão, preflight, dois artefactos) estava em disco, citada por um
// runbook versionado, e nunca tinha entrado no git — `git log --all --diff-filter=A` dava 0 pen41 e
// `check-ignore` devolvia 1. Num clone novo não havia PEN-41 e o aplicador não tinha o que enviar. A classe
// tem dois lados opostos, e só `git ls-files` os separa: ESQUECIDO (existe, não está no índice, não é
// ignorado) contra RECUSADO POR DESIGNO (existe, não está no índice, É ignorado — sessões e contas de teste).
const fichasDoGit = new Set(execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files'], { cwd: REPO, encoding: 'utf8' }).split('\n'));
// Sexta classe de «não está no índice», e NÃO é uma segunda lista que eu mantenho à mão: os portadores de
// credencial que vivem fora do git têm um guard próprio, `scripts/p125-portadores-fora-do-indice.mjs`, cuja
// condição é a frase da razão no runbook. Copiar os nomes para aqui dava duas verdades a divergir em silêncio —
// por isso este portão lê a declaração na FONTE do guard e só exclui um nome do esquecimento enquanto o guard
// continuar a afirmá-lo. Apagar a lista ou o ficheiro do guard dá aborta, não verde.
const GUARD_PORTADORES = 'scripts/p125-portadores-fora-do-indice.mjs';
const DECLARADOS_PELO_GUARD = (() => {
  const t = readFileSync(join(REPO, GUARD_PORTADORES), 'utf8');
  const bloco = /const DECLARADOS = \[([\s\S]*?)\n\];/.exec(t);
  if (!bloco) throw new Error(`GUARD_SEM_LISTA_DECLARADOS em ${GUARD_PORTADORES}`);
  return [...new Set([...bloco[1].matchAll(/arquivo: '([^']+)'/g)].map((m) => m[1]))].sort();
})();
// Um caminho citado que existe, não está no índice, não é exceção de si e não é ignorado: «esquecido», a menos
// que uma das duas declarações o cubra. Vive como função porque o portão dos dentes precisa de aplicar a mesma
// prédica a um nome de controlo — duplicar a expressão dentro do portão seria ter duas regras na mesma corrida.
const foraDoGitSemDeclaracoes = (c) => existsSync(join(REPO, c)) && !fichasDoGit.has(c) && !EXCEPCAO_DECLARADA.includes(c) && !ignoradoPeloGit(c);
const esquecidosNoIndice = citados.filter((c) => foraDoGitSemDeclaracoes(c) && !FORA_DO_INDICE_POR_DECISAO.some((d) => d.caminho === c) && !DECLARADOS_PELO_GUARD.includes(c));
const citadosIgnoradosPorDesignio = citados.filter((c) => existsSync(join(REPO, c)) && !fichasDoGit.has(c) && ignoradoPeloGit(c));
// O outro lado da mesma régua, para o verde não ser cortesia: um nome declarado «fora por decisão» tem de
// continuar fora, continuar em disco, continuar não-ignorado e continuar declarado. Se algum dia ele entrar no
// índice à mesma, a lista deixa de descrever o pacote e o portão diz-me isso por nome.
const fichasDeDecisao = FORA_DO_INDICE_POR_DECISAO.map((d) => ({ caminho: d.caminho, existe_em_disco: existsSync(join(REPO, d.caminho)),
  esta_no_indice: fichasDoGit.has(d.caminho), ignorado_pelo_git: ignoradoPeloGit(d.caminho), frase_da_decisao_no_corpus: fraseNoCorpus(d.a_prosa_diz) }));
const fichasDeDecisaoNova = NO_INDICE_POR_DECISAO_NOVA.map((d) => ({ caminho: d.caminho, existe_em_disco: existsSync(join(REPO, d.caminho)),
  esta_no_indice: fichasDoGit.has(d.caminho), ignorado_pelo_git: ignoradoPeloGit(d.caminho), frase_da_decisao_no_corpus: fraseNoCorpus(d.a_prosa_diz) }));
// Ficha do lado do guard: cada nome que ele declara tem de continuar em disco, continuar FORA do índice e
// continuar não-ignorado. `ignorado_pelo_git=false` é o ponto da casa — foi precisamente por não serem
// ignorados que estes ficheiros ficaram à distância de um `git add -A` de serem publicados.
const fichasGuard = DECLARADOS_PELO_GUARD.map((c) => ({ caminho: c, existe_em_disco: existsSync(join(REPO, c)),
  esta_no_indice: fichasDoGit.has(c), ignorado_pelo_git: ignoradoPeloGit(c), citado_no_corpus: citados.includes(c) }));
// A classe lida do git, não da lista: qualquer ponto que entre em `evidence/` aparece aqui, esteja ou não na
// declaração. É isto que dá dentes à lista nova — um nome varrido por um `git add` amplo chumba por si.
const pontosVersionadosEmEvidence = [...fichasDoGit].filter((c) => c.startsWith('evidence/.')).sort();

// ── estado vivo lido no catálogo ────────────────────────────────────────────
// Duas coisas mudaram aqui em 20/11, depois de a PEN-38 e a PEN-39 serem aplicadas. (i) Os nomes deixaram de
// ser dactilografados: leem-se dos `CREATE FUNCTION` de cada `scripts/p73-penNN-ddl-candidata.sql` no disco, e
// uma candidata nova aparece sozinha neste censo. (ii) O esperado deixou de ser «zero»: um portão que exige
// zero funções vive num mundo que hoje tem quatro, e o vermelho dele passaria a descrever o instrumento, não o
// banco. O que o banco deve ter é agora a união dos nomes das peças que têm registo de aplicação versionado — e
// o contrário também se mede: nome no catálogo que nenhum registo declara é vermelho.
const inList = (l) => l.map((x) => `'${x}'`).join(',');
const nomesDe = (t) => [...t.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]);
// A família de prefixo não é fixa: as peças municipais começaram em `p73-` e a PEN-44 é `p74-`. Uma régua que
// exige o prefixo do primeiro instrumento deixa sair da classe a peça mais recente, e o censo de `sem_registo`
// passa a omiti-la sem que nada o diga — foi assim que a PEN-44 ficou fora desta contagem no primeiro fecho.
const FICHEIROS_CANDIDATAS = readdirSync(join(REPO, 'scripts'))
  .filter((n) => /^p7\d-pen\d+-ddl-candidata\.sql$/.test(n))
  .map((n) => ({ peca: 'PEN-' + /^p7\d-pen(\d+)-/.exec(n)[1], caminho: 'scripts/' + n, texto: readFileSync(join(REPO, 'scripts', n), 'utf8') }))
  .sort((a, b) => Number(a.peca.slice(4)) - Number(b.peca.slice(4)));
const REGISTOS_APLICACAO = (() => {
  const porPeca = {};
  for (const n of readdirSync(join(REPO, 'evidence')).filter((x) => /^p73-municipal-aplicacao-PEN-\d+.*\.json$/.test(x) && !x.includes('VERMELHO'))) {
    const r = JSON.parse(readFileSync(join(REPO, 'evidence', n), 'utf8'));
    if (r.modo !== 'aplicacao' || r.escrito_no_banco !== true) continue;
    if (!porPeca[r.peca] || String(r.em) > String(porPeca[r.peca].em)) porPeca[r.peca] = Object.assign({}, r, { registo: 'evidence/' + n });
  }
  return porPeca;
})();
const PECAS_COM_REGISTO = Object.keys(REGISTOS_APLICACAO).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
const PECAS_SEM_REGISTO = [...new Set(FICHEIROS_CANDIDATAS.map((c) => c.peca))].filter((p) => !PECAS_COM_REGISTO.includes(p)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
// Uma candidata que entra na enumeração sem registo de aplicação tem de trazer o motivo **dito no corpus**, não
// num literal deste script: um literal que eu escrevo e comparo a mim mesmo é tautologia, e apagá-lo não dá
// vermelho nenhum no mundo. O marcador é uma frase por peça; apagar a frase do corpus volta a engrossar em
// silêncio a classe que se lê como «esquecida», e é isso que o portão abaixo não permite.
const MARCA_MOTIVO = 'MOTIVO-SEM-REGISTO';
const fraseDoMotivo = (peca, textos) => {
  const re = new RegExp(MARCA_MOTIVO + ' \\u00b7 ' + peca + ' \\u2014 [^\\n]{40,}', 'u');
  const i = textos.findIndex((t) => re.test(t));
  return i < 0 ? null : { ficheiro: CORPUS[i], frase: re.exec(textos[i])[0] };
};
const MOTIVOS_SEM_REGISTO = PECAS_SEM_REGISTO.map((p) => ({ peca: p, ...(fraseDoMotivo(p, textoCorpus) || { ficheiro: null, frase: null }) }));
const NOMES_DE_TODAS_AS_CANDIDATAS = [...new Set(FICHEIROS_CANDIDATAS.flatMap((c) => nomesDe(c.texto)))].sort();
if (NOMES_DE_TODAS_AS_CANDIDATAS.length === 0) throw new Error('ABORTA: nenhuma candidata deste pacote declara CREATE FUNCTION — o portão de estado do banco ficaria sem nada varrido, e zero sem agulha não afirma nada');
const NOMES_FUNCOES_NOVAS = NOMES_DE_TODAS_AS_CANDIDATAS;
const POLICIES_ALVO = ['director_dashboard_read_students', 'director_dashboard_read_classes', 'students_select_secretary', 'classes_select_secretary'];
const vivosNovos = (await sql(`select p.proname as nome from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
     where p.proname in (${inList(NOMES_DE_TODAS_AS_CANDIDATAS)}) order by 1`)).map((r) => r.nome);
const vivo = (await sql(`select
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
     where p.proname in (${inList(NOMES_FUNCOES_NOVAS)})) as funcoes_das_candidatas,
  (select count(*)::int from public.schools where municipality_id is not null) as escolas_com_municipio,
  (select count(*)::int from public.bfr_municipalities) as municipios,
  (select count(*)::int from public.bfr_municipal_access_grants where revoked_at is null) as concessoes_ativas,
  (select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where p.polname in (${inList(POLICIES_ALVO)})) as policies_alvo,
  (select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where p.polname in (${inList(POLICIES_ALVO)})
       and pg_get_expr(p.polqual, p.polrelid) like '%bfr_school_in_own_school_scope%') as policies_alvo_com_escopo`))[0];

// O esperado não se dactilografa: lê-se do artefacto do preflight que o runbook cita no §0. Assim, se o
// estado vivo mudar, o vermelho é do mundo; se o artefacto mudar de números sem o mundo mudar, o vermelho é
// do runbook, e as duas coisas têm nomes diferentes abaixo.
const pref38 = JSON.parse(readFileSync(join(REPO, 'evidence/p73-pen38-preflight-candidata-20-11e.json'), 'utf8')).numeros;
const pref41 = JSON.parse(readFileSync(join(REPO, 'evidence/p73-pen41-preflight-candidata-20-11e.json'), 'utf8'));
const v137 = JSON.parse(readFileSync(join(REPO, 'evidence/v137-gera-bundle-20-11.json'), 'utf8'));
const v138b = JSON.parse(readFileSync(join(REPO, 'evidence/v138-gera-bundle-20-11.json'), 'utf8'));
const v138c = JSON.parse(readFileSync(join(REPO, 'evidence/v138-gera-candidata-20-11.json'), 'utf8'));

const CAMINHOS_DA_TABELA_PECAS = (() => {
  const t = readFileSync(join(REPO, 'scripts/p73-municipal-aplica-ddl.mjs'), 'utf8');
  return [...new Set([...t.matchAll(/\b(?:pref|cand|rev):\s*'([^']+)'/g)].map((m) => m[1]))].sort();
})();
const INPUTS_FECHO = [...new Set(['scripts/p73-pen38-alcance-por-concessao-20-11.mjs', 'scripts/p73-pen38-preflight.mjs', 'scripts/p73-pen39-preflight.mjs', 'scripts/p73-pen41-preflight.mjs', 'scripts/p73-pen43-preflight.mjs', 'scripts/p73-municipal-etiqueta.mjs', 'scripts/p73-municipal-aplica-ddl.mjs', 'scripts/v136-pos-deploy.mjs', 'scripts/v137-pos-deploy.mjs', 'scripts/v138-gera-candidata.mjs', 'scripts/v138-gera-bundle.mjs', 'scripts/v138-pos-deploy.mjs', 'scripts/p73-pen43-gera-candidata.mjs', 'scripts/pacote-municipal-confere-pecas.mjs', 'scripts/p125-portadores-fora-do-indice.mjs', 'scripts/portao-indice.mjs', RUNBOOK, ...CAMINHOS_DA_TABELA_PECAS])];

const falhas = [];
const portoes = [];
const gate = (nome, obtido, esperado) => {
  portoes.push(nome);
  const o = JSON.stringify(obtido), e = JSON.stringify(esperado);
  if (o !== e) falhas.push({ portao: nome, obtido: o, esperado: e });
};

gate('a_sonda_de_extração_dispara_no_fixture', (FIX_DISPARO.match(RE_CORPUS) || []).slice(), FIX_DISPARO_ESPERADO);
gate('o_corpus_tem_caminhos_suficientes', citados.length >= 20, true);
gate('nenhum_caminho_citado_falta_em_disco', emFaltaReal, []);
gate('cada_familia_do_corpus_despe_pelo_menos_um_caminho', ['scripts', 'evidence', 'docs'].every((f) => (porFamilia[f] || 0) > 0), true);
// A mesma régua, agora por ficheiro: dois corpus com um deles mudo é o portão que varre metade das promessas.
gate('cada_ficheiro_do_corpus_despe_pelo_menos_um_caminho', cadaFicheiro.map((c) => c.citados > 0), CORPUS.map(() => true));
gate('os_fantasmas_da_prosa_continuam_fantasmas_declarados',
  FANTASMAS_DECLARADOS.map((f) => [existsSync(join(REPO, f.caminho)), fraseNoCorpus(f.a_prosa_diz)]),
  FANTASMAS_DECLARADOS.map(() => [false, true]));
// O portão que faltava: «está em disco» não é «está no pacote». Vermelho = a prosa cita uma peça que só
// existe nesta máquina, e que portanto não existe para quem cloneda o repo ou para um OK dado amanhã.
gate('nenhum_caminho_citado_fica_fora_do_git', esquecidosNoIndice, []);
// ...e o contrário dele, para o verde não ser cortesia: o que a prosa declara «fora do índice por decisão» tem
// de continuar fora, em disco, não ignorado, e com a frase da decisão no corpus. Duas famílias de nomes que
// trocam de classe em silêncio eram o mesmo buraco com o sinal invertido.
gate('os_fora_do_indice_por_decisao_continuam_decididos',
  fichasDeDecisao.map((d) => [d.existe_em_disco, d.esta_no_indice, d.ignorado_pelo_git, d.frase_da_decisao_no_corpus]),
  FORA_DO_INDICE_POR_DECISAO.map(() => [true, false, false, true]));
// O lado novo da mesma classe: entrou, continua em disco, não é ignorado, e a frase que assina a entrada tem de
// estar no corpus. E a classe inteira, medida do git, tem de ser exactamente a declarada — um ponto varrido por
// engano entra pela lista medida, não pela que eu lembrei.
gate('os_no_indice_por_decisao_nova_continuam_versionados_com_a_frase',
  fichasDeDecisaoNova.map((d) => [d.existe_em_disco, d.esta_no_indice, d.ignorado_pelo_git, d.frase_da_decisao_no_corpus]),
  NO_INDICE_POR_DECISAO_NOVA.map(() => [true, true, false, true]));
gate('a_classe_de_pontos_versionados_em_evidence_e_a_declarada',
  [pontosVersionadosEmEvidence, fichasDeDecisaoNova.every((d) => d.esta_no_indice && d.frase_da_decisao_no_corpus)],
  [NO_INDICE_POR_DECISAO_NOVA.map((d) => d.caminho).sort(), true]);
// Dentes da classe, com o mundo real como normal: acrescentar um ponto que ninguém assinou tem de dar vermelho,
// e apagar a frase da declaração tem de tirar o nome da lista dos cumpridos. Os dois sentidos numa só corrida.
gate('a_regua_da_classe_de_pontos_tem_dentes', [
  pontosVersionadosEmEvidence.concat(['evidence/.sonda-de-fixture.txt']).join() !== pontosVersionadosEmEvidence.join(),
  pontosVersionadosEmEvidence.every((c) => fichasDeDecisaoNova.some((d) => d.caminho === c && d.frase_da_decisao_no_corpus)) === true,
  NO_INDICE_POR_DECISAO_NOVA.every((d) => fraseNoCorpus(d.a_prosa_diz) === true),
  pontosVersionadosEmEvidence.length >= 1], [true, true, true, true]);
gate('os_portadores_do_guard_continuam_fora_do_indice_em_disco_e_nao_ignorados',
  fichasGuard.map((d) => [d.existe_em_disco, !d.esta_no_indice, !d.ignorado_pelo_git]),
  DECLARADOS_PELO_GUARD.map(() => [true, true, true]));
// O guard é a única coisa entre estes nomes e um `git add -A` de publicação. A exclusão tem de estar a tapar um
// buraco REAL (cada nome continua fora-do-git) e a prédica não pode ter degenerado para «sempre true»: o
// controlo contrário são os caminhos citados que ESTÃO no índice, e nesses a prédica tem de dar falsa.
gate('a_exclusao_dos_portadores_tem_dentes_e_o_contrario_tambem', [
  DECLARADOS_PELO_GUARD.length >= 1,
  DECLARADOS_PELO_GUARD.every((c) => foraDoGitSemDeclaracoes(c) === true),
  citados.filter((c) => fichasDoGit.has(c) && !ignoradoPeloGit(c)).every((c) => foraDoGitSemDeclaracoes(c) === false)], [true, true, true]);
gate('as_saidas_de_passos_nao_autorizados_estao_mesmo_ausentes', SAIDAS_AINDA_NAO_CORRIDAS.map((c) => existsSync(join(REPO, c))), SAIDAS_AINDA_NAO_CORRIDAS.map(() => false));
gate('os_fora_do_git_estao_ignorados_e_nao_e_que_faltasse_a_peca', FORA_DO_GIT.map((c) => ignoradoPeloGit(c)), [true, true]);
// A régua do estado de aplicação é uma função, não uma linha: serve o mundo real e serve os dois mundos
// fabricados do portão dos dentes. Assumir que «o que eu calculei em cima» é o mesmo que «o que a régua calcula
// em cima do fixture» era o verde sem poder de fogo.
const reguaRegistos = (pecas, registos, candidatas, nomesNoBanco) => {
  const esperados = [...new Set(pecas.flatMap((p) => nomesDe((candidatas.find((c) => c.peca === p) || { texto: '' }).texto)))].sort();
  const linhas = pecas.map((p) => { const r = registos[p]; const emDisco = existsSync(join(REPO, r.candidata.caminho)) ? readFileSync(join(REPO, r.candidata.caminho)) : Buffer.alloc(0);
    return [p, candidatas.some((c) => c.peca === p && c.caminho === r.candidata.caminho), emDisco.length > 0, md5(emDisco) === r.candidata.md5, emDisco.length === r.candidata.bytes,
      r.preflight_candidata && r.preflight_candidata.codigo === 0]; });
  return { esperados, linhas, todasVerdes: linhas.every((l) => l.slice(1).every((x) => x === true)) };
};
const realRegua = reguaRegistos(PECAS_COM_REGISTO, REGISTOS_APLICACAO, FICHEIROS_CANDIDATAS, vivosNovos);
gate('o_banco_tem_as_funcoes_das_pecas_com_registo_e_somente_essas', vivosNovos, realRegua.esperados);
// O outro lado do mesmo facto: o registo certifica bytes. Se a candidata for editada depois de aplicada, o
// registo deixa de descrever o que está no banco, e é isto que obriga a uma aplicação nova com registo novo.
gate('os_registos_de_aplicacao_batem_com_as_candidatas_em_disco_e_com_a_saida_do_preflight_de_entrada',
  realRegua.linhas, PECAS_COM_REGISTO.map((p) => [p, true, true, true, true, true]));
// Dentes das duas cláusulas acima, provados na mesma corrida e com o mundo real como normal: um registo a
// menos e um md5 trocado são os dois únicos estados que esta régua tem de apanhar. Cada cláusula abaixo já traz
// a negação dentro de si — o esperado é «as cinco se cumprem», e pôs aqui o valor cru do fixture (false) em vez
// da cláusula foi o vermelho da primeira corrida desta quinta linha, preservado com o defeito no nome.
const FIX_PECA_A_MENOS = reguaRegistos(PECAS_COM_REGISTO.slice(1), REGISTOS_APLICACAO, FICHEIROS_CANDIDATAS, vivosNovos);
const REG_COM_MD5_FALSO = Object.assign({}, REGISTOS_APLICACAO, { [PECAS_COM_REGISTO[0]]: Object.assign({}, REGISTOS_APLICACAO[PECAS_COM_REGISTO[0]],
  { candidata: Object.assign({}, REGISTOS_APLICACAO[PECAS_COM_REGISTO[0]].candidata, { md5: '0'.repeat(32) }) }) });
const FIX_MD5_TROCADO = reguaRegistos(PECAS_COM_REGISTO, REG_COM_MD5_FALSO, FICHEIROS_CANDIDATAS, vivosNovos);
gate('a_regua_do_estado_de_aplicacao_tem_dentes_e_o_mundo_real_e_o_normal',
  [vivosNovos.join() === realRegua.esperados.join(),
    FIX_PECA_A_MENOS.esperados.join() !== realRegua.esperados.join(), realRegua.todasVerdes === true,
    FIX_MD5_TROCADO.todasVerdes === false, PECAS_COM_REGISTO.length >= 2],
  [true, true, true, true, true]);
// O índice, não o disco. A régua acima compara o registo com o ficheiro da árvore de trabalho, e isso não vê um
// `git add` esquecido: o banco fica com um SQL que o pacote publicado não tem. aconteceu na PEN-42 — o índice tinha
// a candidata pré-estreitamento (3 520 B, `GRANT … TO authenticated, service_role`, sem `BEGIN;`/`COMMIT;`) enquanto
// o que o banco recebeu foi a de 4 841 B; a do índice nem seria aplicável, porque o aplicador recusa SQL sem as duas
// marcas. Nove dos dez caminhos batiam, e os dois que não batiam eram exactamente esses. Ler o blob do índice é
// outra fonte que ler o disco, por isso é portão próprio — e só pode estar verde depois de os caminhos estarem
// stageados, que é o lugar desta régua no fôlego de fecho.
const blobDoIndice = (caminho) => {
  try { return execFileSync('git', ['show', ':' + caminho], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }); }
  catch { return Buffer.alloc(0); }
};
const reguaRegistosNoIndice = (pecas, registos, lerBlob) => pecas.map((p) => {
  const lados = [['candidata', registos[p].candidata], ['reversao', registos[p].reversao]];
  return [p, ...lados.flatMap(([, l]) => {
    const b = l && l.caminho ? lerBlob(l.caminho) : Buffer.alloc(0);
    return [b.length > 0, md5(b) === l.md5, b.length === l.bytes];
  })];
});
const BLOBS_DO_INDICE = new Map();
const lerBlobDoIndice = (c) => { if (!BLOBS_DO_INDICE.has(c)) BLOBS_DO_INDICE.set(c, blobDoIndice(c)); return BLOBS_DO_INDICE.get(c); };
const reguaIndiceReal = reguaRegistosNoIndice(PECAS_COM_REGISTO, REGISTOS_APLICACAO, lerBlobDoIndice);
// A primeira versão desta linha comparava a linha de sete elementos (nome + três colunas por lado) com um esperado
// de seis, e por isso **não tinha positivo possível**: verde-era-impossível dentro do portão que prova que os
// portões têm dentes. O `reguaRegistos` da disco já trazia o nome da peça na linha; a régua nova tem de o trazer
// também, e foi a corrida depois do `git add` — a que devia dar verde — que o disse.
gate('os_registos_de_aplicacao_batem_com_os_blobs_do_indice_e_nao_somente_com_o_disco',
  reguaIndiceReal, PECAS_COM_REGISTO.map((p) => [p, true, true, true, true, true, true]));
// Dentes com o mundo real como normal: um blob ausente do índice e um blob trocado são os dois únicos estados que
// esta régua tem de apanhar, e nenhum dos dois se confunde com o vermelho de produto acima. Uma régua que exigisse
// «todas as col falsas» ao blob trocado não teria positivo nenhum -- um blob de 46 bytes **existe**, o que está
// trocado é o conteúdo -- por isso as duas colunas de pegada (`md5` e `bytes`, índices 2,3,5,6) têm o seu próprio
// predicado, e a existência só entra na conta do fixture ausente.
const soAsPegadas = (l) => [l[2], l[3], l[5], l[6]];
const FIX_BLOB_AUSENTE = reguaRegistosNoIndice(PECAS_COM_REGISTO, REGISTOS_APLICACAO, () => Buffer.alloc(0));
const FIX_BLOB_TROCADO = reguaRegistosNoIndice(PECAS_COM_REGISTO, REGISTOS_APLICACAO, (c) => Buffer.from(c + '-outra-peca'));
gate('a_regua_dos_blobs_do_indice_tem_dentes_e_o_mundo_real_e_o_normal',
  [PECAS_COM_REGISTO.length >= 2,
    reguaIndiceReal.every((l) => l.slice(1).every((x) => x === true)) === true,
    FIX_BLOB_AUSENTE.every((l) => l.slice(1).every((x) => x === false)) === true,
    FIX_BLOB_TROCADO.every((l) => soAsPegadas(l).every((x) => x === false)) === true,
    FIX_BLOB_TROCADO.every((l) => l[1] === true && l[4] === true) === true],
  [true, true, true, true, true]);
// Uma cláusula por eixo: o que o artefacto declara, e o que o banco devolve, têm portões separados. Juntá-los
// num só compara vivo com vivo e não pode dar vermelho quando o runbook fica a prometer um número velho.
gate('o_preflight_declara_zero_escolas_etiquetadas', pref38.escolas_com_municipio, 0);
// 21/11: a etiqueta deixou de ser zero. O `p92-dados-municipais.mjs` em modo `--aplicar` escreveu município,
// ligações e uma concessão com OK próprio, e o registo está versionado. Comparar o estado vivo com o preflight
// de 20/11 era uma cláusula «ainda não aplicado» que envelheceu no dia da autorização; o esperado passa a
// derivar-se do registo de aplicação dos dados, lido do disco por enumeração de família. Os dois vermelhos
// continuam vivos: mundo a mexer sem registo novo, e registo que promete o que o mundo não tem. A reversão
// SQL existe como caminho e não tem corrida — se ela correr sem artefacto, este portão chumba.
const REGISTO_DADOS = (() => {
  const familia = readdirSync(join(REPO, 'evidence')).filter((n) => /^p92-dados-municipais-.*\.json$/.test(n) && !n.includes('VERMELHO'));
  const fichas = familia.map((n) => { const j = JSON.parse(readFileSync(join(REPO, 'evidence', n), 'utf8')); return { caminho: 'evidence/' + n, modo: j.modo, em: j.em, veredito: j.veredito, programa: j.programa, depois: j.depois }; });
  const aplicados = fichas.filter((f) => f.modo === '--aplicar').sort((a, b) => String(a.em).localeCompare(String(b.em)));
  if (aplicados.length !== 1) throw new Error('REGISTO_DE_DADOS_AMBIGUO ' + JSON.stringify(fichas.map((f) => [f.caminho, f.modo])));
  const r = aplicados[0];
  if (!r.depois || !Array.isArray(r.depois.escolas) || !Array.isArray(r.depois.municipios) || !Array.isArray(r.depois.grants)) throw new Error('REGISTO_DE_DADOS_SEM_DEPOIS ' + r.caminho);
  return { caminho: r.caminho, em: r.em, veredito: r.veredito, programa: r.programa, familia: familia.length,
    esperado: [r.depois.escolas.filter((e) => e.municipality_id).length, r.depois.municipios.length, r.depois.grants.length] };
})();
const reguaEstadoDados = (medido, esperado) => [medido.escolas_com_municipio === esperado[0], medido.municipios === esperado[1], medido.concessoes_ativas === esperado[2]];
const estadoPreflight = [pref38.escolas_com_municipio, pref38.municipios, pref38.concessoes_ativas];
gate('o_estado_vivo_bate_com_o_registo_de_aplicacao_de_dados', reguaEstadoDados(vivo, REGISTO_DADOS.esperado), [true, true, true]);
gate('o_registo_de_aplicacao_de_dados_esta_no_git_com_o_programa_que_o_escreveu_e_a_reversao_sem_corrida',
  [fichasDoGit.has(REGISTO_DADOS.caminho), existsSync(join(REPO, REGISTO_DADOS.programa)),
    String(REGISTO_DADOS.veredito).startsWith('P92_DADOS_MUNICIPAIS_APLICADO_E_CONFERIDO'),
    readdirSync(join(REPO, 'evidence')).filter((n) => /^p92-.*revers/i.test(n)).length,
    existsSync(join(REPO, 'scripts/p92-reversao-dados-municipais.sql'))],
  [true, true, true, 0, true]);
gate('a_regua_do_estado_de_dados_tem_dentes_e_o_preflight_deixa_de_ser_o_esperado', [
  reguaEstadoDados(vivo, REGISTO_DADOS.esperado.map((x) => x + 1)).every((x) => x === false),
  reguaEstadoDados(vivo, estadoPreflight).includes(false),
  REGISTO_DADOS.esperado.join() !== estadoPreflight.join(),
  reguaEstadoDados(vivo, REGISTO_DADOS.esperado).every((x) => x === true)], [true, true, true, true]);
// A primeira versão desta linha prometia `0` policies com escopo, e o `0` era o mundo **antes** da acção: no
// instante em que a PEN-41 foi autorizada e escrita (22/11, `evidence/p73-municipal-aplicacao-PEN-41-20261122T062605Z.json`)
// o portão passou a não ter positivo nenhum. Não se amaciou o dígito — derivou-se o esperado do registo de aplicação
// versionado (`REGISTOS_APLICACAO`), que é outra fonte que o catálogo: com registo esperam-se as quatro, sem registo
// espera-se zero. Assim os dois vermelhos possíveis continuam vivos, e a cláusula dos dois mundos abaixo prova que
// a derivação não é uma constante.
const comEscopoEsperado = (temRegisto) => (temRegisto ? POLICIES_ALVO.length : 0);
const ESPERADO_COM_ESCOPO = comEscopoEsperado(!!REGISTOS_APLICACAO['PEN-41']);
gate('as_policies_alvo_tem_escopo_conforme_o_registo_versionado_da_pen41',
  [vivo.policies_alvo, vivo.policies_alvo_com_escopo, vivo.policies_alvo_com_escopo === ESPERADO_COM_ESCOPO,
    comEscopoEsperado(true), comEscopoEsperado(false)],
  [POLICIES_ALVO.length, ESPERADO_COM_ESCOPO, true, POLICIES_ALVO.length, 0]);
gate('as_quatro_policies_alvo_sao_as_que_o_preflight_41_descreve', pref41.policies_das_quatro.length, POLICIES_ALVO.length);
gate('a_v137_continua_nao_publicada_com_a_frase_de_OK_declara', [v137.publicado, /sem OK literal/.test(String(v137.ok_literal))], [false, true]);
// A v138 é a outra metade da PEN-39: sem o código que chama os agregados, o DDL aplicado fica função sem
// chamador. O portão não acredita em prosa — lê as duas pegadas dos artefactos e confere que o bundle leva o
// remendo da PEN-40 (empilhamento) e uma shell nova (a mudança), e que o marcador de publicação não existe.
gate('a_v138_continua_nao_publicada_com_a_frase_de_OK_declara', [v138b.publicado, /sem OK literal/.test(String(v138b.ok_literal))], [false, true]);
gate('a_v138_tem_candidata_e_bundle_verdes_com_a_prova_de_ar_escrita', [
  String(v138c.veredito).startsWith('V138_CANDIDATA_OK'), String(v138b.veredito).startsWith('V138_BUNDLE_OK'),
  existsSync(join(REPO, 'worker-deploy-v138-painel-municipal/esperado-v138.json')), existsSync(join(REPO, 'scripts/v138-pos-deploy.mjs')),
  existsSync(join(REPO, 'audit-publicacao-v138.json'))], [true, true, true, true, false]);
gate('o_bundle_v138_empilha_o_remendo_da_pen40_e_muda_a_shell', [
  v138b.esperado.moduleMd5 === v137.esperado.moduleMd5 && v138b.esperado.moduleBytes === v137.esperado.moduleBytes,
  v138b.esperado.htmlMd5 !== v137.esperado.htmlMd5 && v138b.esperado.baseHtmlMd5 === v137.esperado.htmlMd5,
  String(v138b.esperado.cacheLabel) === 'bfr-conecta-v138'], [true, true, true]);
gate('a_v138_chama_os_dois_nomes_que_o_DDL_da_PEN39_declara', (() => {
  const html = readFileSync(join(REPO, 'bfr-candidata-v138-painel-municipal/index.html'), 'utf8');
  const nomes = NOMES_FUNCOES_NOVAS.filter((x) => /totais|distribuicao/.test(x));
  return [nomes.length, nomes.every((x) => html.split("'" + x + "'").length - 1 === 1)];
})(), [2, true]);
gate('os_inputs_das_provas_de_fecho_resolvem', INPUTS_FECHO.filter((c) => !existsSync(join(REPO, c))), []);
// Toda peça sem registo tem de ter o motivo **dito no corpus**, e a régua tem de poder falhar: o mesmo
// procurador, corrido sobre uma cópia do corpus com as marcas apagadas, tem de não encontrar nada. Sem este
// segundo lado, «o motivo está declarado» é uma afirmação sobre o conteúdo de um literal meu.
// A cláusula que abria esta linha era `PECAS_SEM_REGISTO.length > 0`, e o `> 0` era o mundo **antes** da acção:
// no instante em que a última peça sem registo foi autorizada e escrita (22/11, PEN-41 e PEN-48) a classe ficou
// vazia e o portão passou a não ter positivo nenhum. Não se apagou a promessa sobre a classe — tirou-se dela o
// dígito auto-referente e passou a provar-se o **procurador**, com um marcador inventurado que tem de casar e a
// mesma peça ausente do corpus que tem de não casar. A classe vazia imprime-se como vazia (`pecas_sem_registo_de_aplicacao`).
const CORPUS_SEM_MARCAS = textoCorpus.map((t) => t.split(MARCA_MOTIVO).join(''));
const FIX_PECA_PROBE = 'PEN-00';
const CORPUS_COM_MARCA_PROBE = textoCorpus.concat([MARCA_MOTIVO + ' \u00b7 ' + FIX_PECA_PROBE + ' \u2014 marcador inventurado por este fixture, comprido o suficiente para o procurador dos quarenta caracteres o casar.']);
gate('toda_peca_sem_registo_tem_motivo_no_corpus_e_apagar_a_frase_e_vermelho',
  [MOTIVOS_SEM_REGISTO.every((m) => !!m.ficheiro && m.frase.length >= 40),
    PECAS_SEM_REGISTO.every((p) => fraseDoMotivo(p, CORPUS_SEM_MARCAS) === null),
    fraseDoMotivo(FIX_PECA_PROBE, CORPUS_COM_MARCA_PROBE) !== null,
    fraseDoMotivo(FIX_PECA_PROBE, textoCorpus) === null],
  [true, true, true, true]);

const out = {
  programa: 'scripts/pacote-municipal-confere-pecas.mjs', em: new Date().toISOString(),
  corpus: { fonte: RUNBOOK_USADO, fonte_medida: CORPUS.join(',') === CORPUS_ARQS.join(',') ? CORPUS.map(mede) : [{ caminho: RUNBOOK_USADO, nota: 'corpus de falsificacao, fora do repo' }],
    regex_familias: RE_CORPUS.source, total_citados: citados.length, por_familia: porFamilia, por_ficheiro: cadaFicheiro,
    extrairam_do_fixture: (FIX_DISPARO.match(RE_CORPUS) || []).slice(), excepcao_declara: EXCEPCAO_DECLARADA,
    fantasmas_declarados: FANTASMAS_DECLARADOS.map((f) => ({ caminho: f.caminho, existe_em_disco: existsSync(join(REPO, f.caminho)), a_prosa_diz: f.a_prosa_diz, frase_encontrada_no_corpus: fraseNoCorpus(f.a_prosa_diz) })),
    saidas_de_passos_nao_autorizados: SAIDAS_AINDA_NAO_CORRIDAS },
  citados_presentes: presentes.map(mede),
  citados_em_falta: emFaltaReal,
  fora_do_git: FORA_DO_GIT.map((c) => ({ caminho: c, existe_em_disco: existsSync(join(REPO, c)), ignorado_pelo_git: ignoradoPeloGit(c) })),
  fora_do_indice: { fichas_lidas_do_indice: fichasDoGit.size, esquecidos: esquecidosNoIndice,
    citados_ignorados_por_designio: citadosIgnoradosPorDesignio, por_decisao_assinada: fichasDeDecisao,
    por_decisao_nova_entraram: fichasDeDecisaoNova, pontos_versionados_em_evidence: pontosVersionadosEmEvidence,
    portadores_fora_do_indice_do_guard: { fonte_da_lista: GUARD_PORTADORES, declarados: fichasGuard } },
  vivo, nomes_de_funcoes_varridos: NOMES_FUNCOES_NOVAS, policies_alvo: POLICIES_ALVO,
  aplicacao: {
    candidatas_lidas_do_disco: FICHEIROS_CANDIDATAS.map((c) => ({ peca: c.peca, caminho: c.caminho, nomes_declarados: nomesDe(c.texto) })),
    pecas_com_registo: PECAS_COM_REGISTO.map((p) => ({ peca: p, registo: REGISTOS_APLICACAO[p].registo, ok_literal_usado: REGISTOS_APLICACAO[p].ok_literal_usado, em: REGISTOS_APLICACAO[p].em,
      preflight_entrada_codigo: REGISTOS_APLICACAO[p].preflight_candidata && REGISTOS_APLICACAO[p].preflight_candidata.codigo,
      preflight_saida_codigo: REGISTOS_APLICACAO[p].preflight_reversao && REGISTOS_APLICACAO[p].preflight_reversao.codigo })),
    pecas_sem_registo_de_aplicacao: PECAS_SEM_REGISTO.map((p) => { const c = FICHEIROS_CANDIDATAS.find((x) => x.peca === p); return { peca: p, candidata: c.caminho, nomes_na_candidata: nomesDe(c.texto),
      motivo_da_ausencia_de_registo: (MOTIVOS_SEM_REGISTO.find((m) => m.peca === p) || {}).frase || '', nomes_ja_no_banco: nomesDe(c.texto).filter((n) => vivosNovos.includes(n)), policies_alvo_com_escopo_no_banco: vivo.policies_alvo_com_escopo }; }),
    nomes_esperados_no_banco: realRegua.esperados, nomes_vivos_no_banco: vivosNovos,
    nota: 'a classe «sem registo» imprime-se mesmo com o conjunto de nomes vazio, e cada peca dela tem de levar o motivo declarado: a PEN-41 nao cria funcao alguma (o vermelho dela vem de as_policies_alvo_tem_escopo_conforme_o_registo_versionado_da_pen41), e a PEN-43 so faz REVOKE sobre nomes que a PEN-39 ja criou — estar no banco nao e registo de aplicacao da PEN-43'
  },
  ancora_lida_do_preflight_38: pref38, ancora_lida_do_preflight_41: { policies_das_quatro: pref41.policies_das_quatro.length, veredito: pref41.veredito },
  registo_de_aplicacao_de_dados: Object.assign({}, REGISTO_DADOS, { estado_vivo: [vivo.escolas_com_municipio, vivo.municipios, vivo.concessoes_ativas],
    estado_do_preflight_38: estadoPreflight, notas: 'o esperado le-se do `depois` do registo; o preflight de 20/11 continua porta de entrada (zero etiquetas antes de aplicar)' }),
  v137: { publicado: v137.publicado, ok_literal: v137.ok_literal, veredito: v137.veredito },
  inputs_de_fecho: INPUTS_FECHO.map(mede),
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `PACOTE_MUNICIPAL_OK ${portoes.length}/0 · ${presentes.length} pecas medidas` : `PACOTE_MUNICIPAL_VERMELHO ${falhas.length} de ${portoes.length} portoes`;
out.o_que_este_verde_nao_autoriza = 'nada: este portão é leitura. Aplicar DDL, etiquetar, publicar e git push continuam a pedir cada um a sua frase literal.';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`CORPUS ${out.corpus.total_citados} citados · ${presentes.length} presentes · ${emFaltaReal.length} em falta · familias ${JSON.stringify(porFamilia)}`);
console.log(`DECLARADOS_NAO_EXISTENTES ${JSON.stringify({ saidas_nao_corridas: SAIDAS_AINDA_NAO_CORRIDAS, fora_do_git: out.fora_do_git })}`);
console.log(`FORA_DO_INDICE ${esquecidosNoIndice.length} esquecidos de ${out.fora_do_indice.fichas_lidas_do_indice} fichas · ignorados_por_designio ${citadosIgnoradosPorDesignio.length} · por_decisao_assinada ${fichasDeDecisao.filter((d) => d.existe_em_disco && !d.esta_no_indice && !d.ignorado_pelo_git && d.frase_da_decisao_no_corpus).length} de ${fichasDeDecisao.length}${esquecidosNoIndice.length ? ' · ' + JSON.stringify(esquecidosNoIndice) : ''}`);
console.log(`VIVO ${JSON.stringify(vivo)}`);
console.log(`DADOS registo=${REGISTO_DADOS.caminho} esperado_do_depois=${JSON.stringify(REGISTO_DADOS.esperado)} vivo=${JSON.stringify([vivo.escolas_com_municipio, vivo.municipios, vivo.concessoes_ativas])} preflight_38=${JSON.stringify(estadoPreflight)} familia=${REGISTO_DADOS.familia}`);
console.log(`APLICACAO com_registo=${JSON.stringify(PECAS_COM_REGISTO)} sem_registo=${JSON.stringify(PECAS_SEM_REGISTO)} nomes_no_banco=${JSON.stringify(vivosNovos)} esperados=${JSON.stringify(realRegua.esperados)}`);
console.log(`INDICE ${JSON.stringify(PECAS_COM_REGISTO.flatMap((p) => ['candidata', 'reversao'].map((k) => { const l = REGISTOS_APLICACAO[p][k]; const b = lerBlobDoIndice(l.caminho); return { peca: p + ':' + k, caminho: l.caminho, no_indice: b.length, no_registro: l.bytes, igual: b.length === l.bytes && md5(b) === l.md5 }; })))}`);
console.log(`V137 publicado=${v137.publicado} · ${v137.veredito}`);
console.log(`V138 publicado=${v138b.publicado} · ${v138c.veredito} · ${v138b.veredito} · etiqueta_sw=${v138b.esperado.cacheLabel} · shell ${v138b.esperado.baseHtmlMd5} -> ${v138b.esperado.htmlMd5} · modulo pen40 ${v138b.esperado.moduleMd5}`);
if (falhas.length) console.log(`FALHAS ${JSON.stringify(falhas)}`);
console.log(`${out.veredito} · registo ${OUT}`);
process.exit(falhas.length === 0 ? 0 : 1);
