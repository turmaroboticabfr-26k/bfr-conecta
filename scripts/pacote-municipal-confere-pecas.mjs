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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
  'evidence/v137-deployments-status-depois-20-11.json'];
const FORA_DO_GIT = ['ah2-sessions.json', 'c2-sessions.json'];
// Terceiro tipo de «não existe», medido em 20/11 ao alargar o corpus ao documento 08: um nome que a prosa
// cita PARA DIRE QUE NÃO EXISTE. `scripts/bu4-digestao-para-documentacao-20-11.mjs` é o nome do output que o
// campo `instrumento` declarava por engano; o fantasma só é inofensivo enquanto a linha ao lado o chamar
// fantasma. Por isso o portão não perdoa o nome: exige a declaração junto dele.
const FANTASMAS_DECLARADOS = [{ caminho: 'scripts/bu4-digestao-para-documentacao-20-11.mjs', a_prosa_diz: 'o script com esse nome não existe' }];
// Quarta classe de «não está no índice»: existe em disco, NÃO é ignorada, e mesmo assim não entra — por decisão
// assinada e registada noutro lado. É o avesso do esquecimento, e sem esta declaração as duas coisas escrevem-se
// igual no veredicto. O portão não aceita a alegação: exige (a) que o ficheiro ainda exista, (b) que ainda NÃO
// esteja no índice, (c) que ainda NÃO seja ignorado, e (d) que a frase que declara a decisão continue no corpus.
// Cai a frase, o nome volta a ser «esquecido» e o vermelho regressa — é assim que a lista não apodrece sozinha.
const FORA_DO_INDICE_POR_DECISAO = [
  { caminho: 'evidence/ah2-home-papel-a-papel-v1.json', a_prosa_diz: 'tem decisão assinada em `26e220d`',
    decisao: '26e220d renomeou o campo para `rota_home` e re-geriu o artefacto como v3 (v3 está no índice)' },
  { caminho: 'evidence/.funde-v134-18-11.txt', a_prosa_diz: 'zero ficheiros com ponto inicial estão versionados',
    decisao: 'régua verificada da casa: nenhum nome de ponto inicial em evidence/ está versionado' },
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
const esquecidosNoIndice = citados.filter((c) => existsSync(join(REPO, c)) && !fichasDoGit.has(c) && !EXCEPCAO_DECLARADA.includes(c) && !ignoradoPeloGit(c) && !FORA_DO_INDICE_POR_DECISAO.some((d) => d.caminho === c));
const citadosIgnoradosPorDesignio = citados.filter((c) => existsSync(join(REPO, c)) && !fichasDoGit.has(c) && ignoradoPeloGit(c));
// O outro lado da mesma régua, para o verde não ser cortesia: um nome declarado «fora por decisão» tem de
// continuar fora, continuar em disco, continuar não-ignorado e continuar declarado. Se algum dia ele entrar no
// índice à mesma, a lista deixa de descrever o pacote e o portão diz-me isso por nome.
const fichasDeDecisao = FORA_DO_INDICE_POR_DECISAO.map((d) => ({ caminho: d.caminho, existe_em_disco: existsSync(join(REPO, d.caminho)),
  esta_no_indice: fichasDoGit.has(d.caminho), ignorado_pelo_git: ignoradoPeloGit(d.caminho), frase_da_decisao_no_corpus: fraseNoCorpus(d.a_prosa_diz) }));

// ── estado vivo lido no catálogo ────────────────────────────────────────────
const NOMES_FUNCOES_NOVAS = ['bfr_school_set_municipality', 'bfr_municipal_scope_diagnostico', 'bfr_municipal_municipio_totais', 'bfr_municipal_distribuicao_por_zona'];
const POLICIES_ALVO = ['director_dashboard_read_students', 'director_dashboard_read_classes', 'students_select_secretary', 'classes_select_secretary'];
const inList = (l) => l.map((x) => `'${x}'`).join(',');
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

const INPUTS_FECHO = ['scripts/p73-pen38-alcance-por-concessao-20-11.mjs', 'scripts/p73-pen38-preflight.mjs', 'scripts/p73-pen39-preflight.mjs', 'scripts/p73-pen41-preflight.mjs', 'scripts/p73-municipal-etiqueta.mjs', 'scripts/p73-municipal-aplica-ddl.mjs', 'scripts/v136-pos-deploy.mjs', 'scripts/v137-pos-deploy.mjs', 'scripts/pacote-municipal-confere-pecas.mjs', RUNBOOK];

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
gate('as_saidas_de_passos_nao_autorizados_estao_mesmo_ausentes', SAIDAS_AINDA_NAO_CORRIDAS.map((c) => existsSync(join(REPO, c))), SAIDAS_AINDA_NAO_CORRIDAS.map(() => false));
gate('os_fora_do_git_estao_ignorados_e_nao_e_que_faltasse_a_peca', FORA_DO_GIT.map((c) => ignoradoPeloGit(c)), [true, true]);
gate('nenhuma_funcao_das_candidatas_existe_ainda_no_banco', vivo.funcoes_das_candidatas, 0);
// Uma cláusula por eixo: o que o artefacto declara, e o que o banco devolve, têm portões separados. Juntá-los
// num só compara vivo com vivo e não pode dar vermelho quando o runbook fica a prometer um número velho.
gate('o_preflight_declara_zero_escolas_etiquetadas', pref38.escolas_com_municipio, 0);
gate('o_estado_vivo_bate_com_a_declaracao_do_preflight_38', [vivo.escolas_com_municipio, vivo.municipios, vivo.concessoes_ativas], [pref38.escolas_com_municipio, pref38.municipios, pref38.concessoes_ativas]);
gate('as_policies_alvo_existem_e_nenhuma_tem_escopo', [vivo.policies_alvo, vivo.policies_alvo_com_escopo], [POLICIES_ALVO.length, 0]);
gate('as_quatro_policies_alvo_sao_as_que_o_preflight_41_descreve', pref41.policies_das_quatro.length, POLICIES_ALVO.length);
gate('a_v137_continua_nao_publicada_com_a_frase_de_OK_declara', [v137.publicado, /sem OK literal/.test(String(v137.ok_literal))], [false, true]);
gate('os_inputs_das_provas_de_fecho_resolvem', INPUTS_FECHO.filter((c) => !existsSync(join(REPO, c))), []);

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
    citados_ignorados_por_designio: citadosIgnoradosPorDesignio, por_decisao_assinada: fichasDeDecisao },
  vivo, nomes_de_funcoes_varridos: NOMES_FUNCOES_NOVAS, policies_alvo: POLICIES_ALVO,
  ancora_lida_do_preflight_38: pref38, ancora_lida_do_preflight_41: { policies_das_quatro: pref41.policies_das_quatro.length, veredito: pref41.veredito },
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
console.log(`V137 publicado=${v137.publicado} · ${v137.veredito}`);
if (falhas.length) console.log(`FALHAS ${JSON.stringify(falhas)}`);
console.log(`${out.veredito} · registo ${OUT}`);
process.exit(falhas.length === 0 ? 0 : 1);
