#!/usr/bin/env node
// P116 — régua de consistência de versão, 21/11.
// Porque existe: a classe de defeito que se repetiu em 20 e 21/11 não é um medida errada, é um
// documento que ficou parado enquanto o ar avançava. Medido antes de escrever esta linha: o painel
// declarava 42 itens quando o emissor do próprio projecto imprime 46, e o diário de corrida não tem
// um único bloco que nomeie v140/v141/v142. Nada na casa impedia isso — `portao-indice.mjs` varre
// credencial, `pacote-municipal-confere-pecas.mjs` varre caminhos citados, e nenhum dos dois olha
// para a relação entre o que está no ar, o que o painel conta e o que o diário narra.
// O instrumento é só de leitura: fetch anónimo do shell, `git ls-files`, três ficheiros do repo e
// o emissor de contagens. Zero DDL, zero escrita no banco, zero publicação, zero credencial lida.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P116_SUF ? '-' + process.env.P116_SUF : '';
const SELFTESTE = process.argv.includes('--selfteste');
const OUT = join(REPO, `evidence/p116-${SELFTESTE ? 'selfteste' : 'consistencia-de-versao'}-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P116_SUF=novo, não por cima');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');
const l = (p) => readFileSync(p, 'utf8');
const git = (a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);

// ---- duas mãos de leitura, ambas com positivo provado em fixture ----
// Face (a) do §SM.67 T1: desde a v144 o registo de publicação declara os campos do bundle em
// camelCase (`htmlMd5`) enquanto esta régua lia `bundle.html_md5`. Ler um nome que o produtor não
// declara não devolve «medida ausente», devolve `undefined`, e a comparação com `undefined` só pode
// dar vermelho — um portão de identidade que se tornou incapaz de verde. O remédio é do lado do
// leitor: uma família de grafias aceites, resolvida contra as chaves que o registo realmente tem,
// e abortando quando nenhuma resolve ou quando duas resolvem.
const FAMILIAS = {
  md5_do_html: ['html_md5', 'htmlMd5'],
  bytes_do_html: ['html_bytes', 'htmlBytes'],
};
const norma = (k) => String(k).replace(/[^a-z0-9]/gi, '').toLowerCase();
function resolve_campo(obj, familia, onde) {
  const aceites = familia.map(norma);
  const nomes = Object.keys(obj || {});
  const batentes = nomes.filter((n) => aceites.includes(norma(n)));
  if (batentes.length === 0) throw new Error('ABORTA: ' + onde + ' não declara nenhuma grafia de «' + familia.join('/') + '» — as chaves lidas são ' + JSON.stringify(nomes));
  if (batentes.length > 1) throw new Error('ABORTA: ' + onde + ' declara ' + batentes.length + ' grafias da mesma família (' + batentes.join(', ') + ') — a régua não escolhe uma por ordem de Object.keys');
  return { nome: batentes[0], valor: obj[batentes[0]] };
}
// Face (b): o `candidata.destino` só existe em alguns registos. Ausência é uma classe legítima e
// tem de ser registada como tal — não pode entrar no mesmo ramo da divergência de md5, nem pode
// ser absolvida por um `|| ''` que transforma «não declarado» em «declarado como vazio».
function classe_saida_da_candidata(bundle) {
  if (!Object.prototype.hasOwnProperty.call(bundle, 'candidata')) return { classe: 'produtor_nao_declara_saida', destino: '' };
  const c = bundle.candidata;
  if (!c || typeof c !== 'object' || !c.destino) return { classe: 'declara_saida_sem_destino', destino: '' };
  const m = /md5=([0-9a-f]{32})/.exec(c.destino);
  return { classe: m ? 'saida_com_md5' : 'saida_sem_md5_no_texto', destino: String(c.destino), md5: m ? m[1] : null };
}
// Face (c): a régua de nomes de registo era `/^audit-publicacao-v[0-9]+\.json$/`, que não tem
// nenhum modo de dizer «isto é um diário de publicação que eu não sei classificar». A partição
// velha deixava caminhos com o prefixo fora de todas as listas — e caminho não listado é caminho
// calado, que é a classe que o §SM.31 criou para as provas e o §SM.33 para as famílias. As classes
// são declaradas por forma, não por lista lembrada; o censo de prefixos é contado por outra
// prédica, por isso a cobertura é falsificável; o que sobra é veredicto e sai no artefacto.
const RE_PREFIXO = /^audit-publicacao(?:-[0-9a-z_-]+)?\.(?:json|txt)$/i;
const RAIZ = (f) => !f.includes('/');
const SUBPASTA_DE_DIARIO = (f) => /^(?:bfr-candidata-[^/]+|evidence)\/audit-publicacao-v[0-9]+(?:[a-z]?)(\.txt|\.json)$/.test(f);
const EXEMPLAR = (base) => /(?:-ANTERIOR-|-404\.)/.test(base);
const NUMERICO_JSON = /^audit-publicacao-v[0-9]+\.json$/;
const NUMERICO_TXT = /^audit-publicacao-v[0-9]+\.txt$/;
const LETRA_JSON = /^audit-publicacao-v[0-9]+[a-z]\.json$/;
function particao_de_diarios(files) {
  const no_indice = []; const irmaos_txt = []; const json_com_letra = [];
  const exemplares_na_raiz = []; const em_subpasta = []; const exemplares_em_subpasta = []; const fora_de_forma = [];
  const prefixos = files.filter((f) => RE_PREFIXO.test(f.replace(/^.*\//, '')));
  for (const f of prefixos) {
    const base = f.replace(/^.*\//, '');
    if (SUBPASTA_DE_DIARIO(f)) { em_subpasta.push(f); continue; }
    if (!RAIZ(f)) { (EXEMPLAR(base) ? exemplares_em_subpasta : fora_de_forma).push(f); continue; }
    if (EXEMPLAR(base)) { exemplares_na_raiz.push(f); continue; }
    if (NUMERICO_JSON.test(base)) { no_indice.push(f); continue; }
    if (NUMERICO_TXT.test(base)) { irmaos_txt.push(f); continue; }
    if (LETRA_JSON.test(base)) { json_com_letra.push(f); continue; }
    fora_de_forma.push(f);
  }
  return { prefixos_totais: prefixos.length, no_indice, irmaos_txt, json_com_letra, exemplares_na_raiz, em_subpasta, exemplares_em_subpasta, fora_de_forma };
}
// O número é medido no nome e só no nome numérico: um registo com sufixo de letra aborta em vez
// de ser lido como o vizinho numérico, para que a invisibilidade da face (c) seja barulhenta.
function numero_do_diario(base) {
  const m = /^audit-publicacao-v([0-9]+)([a-z]?)\.json$/.exec(base);
  if (!m) throw new Error('ABORTA: «' + base + '» não é um diário de publicação desta régua');
  if (m[2]) throw new Error('ABORTA: «' + base + '» tem sufixo de letra «' + m[2] + '» e a partição de nomes não o aceite — alargar o número não o torna comparável com v' + m[1]);
  return Number(m[1]);
}

if (SELFTESTE) {
  const casos = [];
  const c = (id, espera, obtem) => casos.push({ id, espera, obtem, bate: espera === obtem });
  const aborta = (fn) => { try { fn(); return 'nao_abortou'; } catch (e) { return e.message.startsWith('ABORTA:') ? 'aborta' : 'abortou_sem_marca'; } };
  c('camel_case_resolve', 'htmlMd5', resolve_campo({ htmlMd5: 'a', htmlBytes: 1 }, FAMILIAS.md5_do_html, 'r').nome);
  c('snake_case_resolve', 'html_md5', resolve_campo({ html_md5: 'a', html_bytes: 1 }, FAMILIAS.md5_do_html, 'r').nome);
  c('duas_grafias_aborta', 'aborta', aborta(() => resolve_campo({ html_md5: 'a', htmlMd5: 'a' }, FAMILIAS.md5_do_html, 'r')));
  c('nenhuma_grafia_aborta', 'aborta', aborta(() => resolve_campo({ workerMd5: 'a' }, FAMILIAS.md5_do_html, 'r')));
  c('bytes_na_grafia_do_produtor', 'htmlBytes', resolve_campo({ htmlBytes: 1 }, FAMILIAS.bytes_do_html, 'r').nome);
  c('saida_ausente_e_classe_nao_divergencia', 'produtor_nao_declara_saida', classe_saida_da_candidata({ htmlMd5: 'a' }).classe);
  c('saida_declara_mas_sem_destino', 'declara_saida_sem_destino', classe_saida_da_candidata({ candidata: {} }).classe);
  c('saida_com_md5_extrai', 'saida_com_md5', classe_saida_da_candidata({ candidata: { destino: 'x md5=' + '0'.repeat(32) } }).classe);
  c('saida_sem_md5_no_texto', 'saida_sem_md5_no_texto', classe_saida_da_candidata({ candidata: { destino: 'candidata sem cifra' } }).classe);
  c('md5_extraido_bate_com_o_declarado', true, (() => { const s = classe_saida_da_candidata({ candidata: { destino: 'x md5=' + 'a'.repeat(32) } }); return s.md5 === 'a'.repeat(32); })());
  const p = particao_de_diarios(['audit-publicacao-v144.json', 'audit-publicacao-v142.txt', 'audit-publicacao-v145b.json', 'docs/roadmap-master.md', 'audit-publicacao-v135-ANTERIOR-g10-comparava-objeto-inteiro.json', 'audit-publicacao-v120-404.json', 'docs/audit-publicacao-v9-curiosa.json']);
  c('regua_velha_panha_so_os_numericos_json', 'audit-publicacao-v144.json', p.no_indice.join(','));
  c('irmaos_txt_de_raiz_tem_classe_propria', 'audit-publicacao-v142.txt', p.irmaos_txt.join(','));
  c('sufixo_de_letra_e_nomeado_por_classe_nao_descartado', 'audit-publicacao-v145b.json', p.json_com_letra.join(','));
  c('exemplar_anterior_de_raiz_tem_classe', 'audit-publicacao-v135-ANTERIOR-g10-comparava-objeto-inteiro.json,audit-publicacao-v120-404.json', p.exemplares_na_raiz.join(','));
  c('nome_de_prefixo_fora_de_todas_as_formas_nao_fica_calado', 'docs/audit-publicacao-v9-curiosa.json', p.fora_de_forma.join(','));
  c('o_censo_de_prefixos_e_independente_das_classes', 6, p.prefixos_totais);
  c('a_soma_das_classes_bate_com_o_censo', true, p.prefixos_totais === p.no_indice.length + p.irmaos_txt.length + p.json_com_letra.length + p.exemplares_na_raiz.length + p.em_subpasta.length + p.exemplares_em_subpasta.length + p.fora_de_forma.length);
  const sp = particao_de_diarios(['bfr-candidata-v115-supervisao-embed/audit-publicacao-v115.json', 'evidence/audit-publicacao-v59.json', 'evidence/audit-publicacao-v133-ANTERIOR-sem-nota-do-vermelho.json', 'evidence/audit-publicacao-v144b.json', 'audit-publicacao-v144.json']);
  c('registro_em_subpasta_nao_entra_na_cadeia', 'audit-publicacao-v144.json', sp.no_indice.join(','));
  c('irmaos_em_subpasta_sao_nomeados_em_vez_de_calados', 3, sp.em_subpasta.length);
  c('o_exemplar_vermelho_em_subpasta_ganha_classe_propria', 'evidence/audit-publicacao-v133-ANTERIOR-sem-nota-do-vermelho.json', sp.exemplares_em_subpasta.join(','));
  c('nenhum_dos_dois_censos_fica_fora_de_forma', '[]', JSON.stringify(sp.fora_de_forma));
  c('numero_do_diario_lido_do_nome', 144, numero_do_diario('audit-publicacao-v144.json'));
  c('sufixo_de_letra_aborta_em_vez_de_contar_o_vizinho', 'aborta', aborta(() => numero_do_diario('audit-publicacao-v145b.json')));
  c('nome_de_irmao_txt_aborta', 'aborta', aborta(() => numero_do_diario('audit-publicacao-v144.txt')));
  c('parentico_descartado_aborta', 'aborta', aborta(() => numero_do_diario('audit-publicacao-v135-ANTERIOR-g10-comparava-objeto-inteiro.json')));
  c('numero_de_v144', 144, numero_do_diario('audit-publicacao-v144.json'));
  const mau = casos.filter((x) => !x.bate);
  const saida = { programa: 'scripts/p116-consistencia-de-versao.mjs --selfteste', em: new Date().toISOString(), duracao_ms: Date.now() - t0, metodo: 'Fixtures puros das três faces do §SM.67 T1: resolução de família de grafias (positivo nas duas grafias, aborto na ambiguidade e na ausência), classes de saída de candidata, partição e numeração de nomes de registo. Sem rede, sem escrita no banco, sem ler credencial.', casos, falhas: mau, veredito: mau.length === 0 ? 'P116_SELFTESTE_OK ' + casos.length + '/0' : 'P116_SELFTESTE_VERMELHO ' + mau.length + ' de ' + casos.length };
  writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
  for (const x of mau) console.log('  FALTA ' + x.id + ' esperava ' + JSON.stringify(x.espera) + ' e obteve ' + JSON.stringify(x.obtem));
  console.log(`P116_SELFTESTE ${saida.casos.length} casos · ${mau.length} faltas · registo ${OUT}`);
  process.exit(mau.length === 0 ? 0 : 1);
}

// Diário = ficheiro versionado `audit-publicacao-vNNN.json`. A ordenação é pelo número medido no
// nome, não pela data do sistema de ficheiros, porque um checkout novo re-escreve os mtimes todos.
// A partição é a mesma função julgada em fixture: um ficheiro de publicação que a régua não aceite
// deixa de ser invisível e passa a ser nomeado por um portão.
const todos_os_ficheros = git(['ls-files']);
const particao = particao_de_diarios(todos_os_ficheros);
const diarios = particao.no_indice
  .map((f) => ({ f, n: numero_do_diario(f), o: JSON.parse(l(join(REPO, f))) }))
  .sort((a, b) => a.n - b.n);
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-vNNN.json no índice — a régua não tem alvo');
const novo = diarios[diarios.length - 1];

// O censo de grafias é o que transforma «compara contra undefined» em medição: para cada registo
// versionado, qual o nome que o produtor realmente declara para a família do md5 do HTML. A exigência
// é só dos registos que declaram bundle — os anteriores a v140 não têm bundle nenhum, e proibir essa
// classe seria o defeito do portão-que-proíbe-uma-classe-legítima (face já registada em §SM.33).
const censo_de_grafias = diarios.map((d) => {
  const b = d.o.bundle || {};
  const nomes = Object.keys(b);
  const batentes = nomes.filter((n) => FAMILIAS.md5_do_html.map(norma).includes(norma(n)));
  return { diario: 'v' + d.n, chaves_do_bundle: nomes.length, grafia_md5_html: batentes.length === 1 ? batentes[0] : (batentes.length === 0 ? (nomes.length ? 'NENHUMA_DENTRO_DO_BUNDLE' : 'SEM_BUNDLE') : 'AMBIGUO:' + batentes.join('+')), tem_saida_de_candidata: Object.prototype.hasOwnProperty.call(b, 'candidata') };
});
const classes_do_censo = {};
for (const x of censo_de_grafias) classes_do_censo[x.grafia_md5_html] = (classes_do_censo[x.grafia_md5_html] || 0) + 1;
const registos_com_bundle_sem_grafia = censo_de_grafias.filter((x) => x.grafia_md5_html === 'NENHUMA_DENTRO_DO_BUNDLE' || x.grafia_md5_html.startsWith('AMBIGUO:'));

// As duas mãos do mesmo número, agora por registo e não só para o mais novo: a saída da candidata
// declara um md5 no texto do `destino`, o bundle declara o dele. Onde o produtor não declara saída,
// a classe é registada e não contada como divergência — o erro espelhado do portão-que-proíbe.
const saidas_por_classe = {};
const saidas_divergentes = [];
const saidas_sem_md5 = [];
for (const d of diarios) {
  const b = d.o.bundle || {};
  const s = classe_saida_da_candidata(b);
  saidas_por_classe[s.classe] = (saidas_por_classe[s.classe] || 0) + 1;
  if (s.classe === 'declara_saida_sem_destino' || s.classe === 'saida_sem_md5_no_texto') saidas_sem_md5.push({ diario: 'v' + d.n, classe: s.classe, destino: s.destino.slice(0, 120) });
  if (s.classe !== 'saida_com_md5') continue;
  let declarado;
  try { declarado = resolve_campo(b, FAMILIAS.md5_do_html, 'bundle de v' + d.n).valor; } catch (e) { declarado = 'SEM_GRAFIA_RECONHECIDA'; }
  if (declarado !== s.md5) saidas_divergentes.push({ diario: 'v' + d.n, md5_da_saida: s.md5, md5_do_bundle: declarado });
}
// Registo informativo, não portão: os números de bloco em falta na série e os registos que nenhum
// título nomeia — calculados depois de `audTxt`, na secção do diário de corrida. Uma régua de
// «numeração contígua» não tem estado final legítimo (um número saltado não se recupera sem
// re-escrever a história), por isso é medida impressa, não veredicto.

const url = (novo.o.deploy && novo.o.deploy.url ? novo.o.deploy.url : 'https://bfr-conecta.turmaroboticabfr.workers.dev') + '/';
const leituras = [];
for (let i = 0; i < 2; i++) {
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  const t = await r.text();
  leituras.push({ i: i + 1, http: r.status, bytes: Buffer.byteLength(t), md5: md5(Buffer.from(t)) });
}

// A cadeia de anteriores: cada diário que declara `versao_anterior_vX` tem de apontar para o
// `version_id` do diário vX. É assim que se apanha um diário órfão ou uma publicação sem diário.
const por_versao = Object.fromEntries(diarios.map((d) => [d.n, d.o.deploy && d.o.deploy.version_id ? String(d.o.deploy.version_id) : null]));
const arestas = [];
const arestas_rotas = [];
for (const d of diarios) {
  for (const k of Object.keys(d.o.deploy || {})) {
    const m = /^versao_anterior_v([0-9]+)$/.exec(k);
    if (!m) continue;
    const origem = Number(m[1]);
    const esperado = por_versao[origem];
    const deu = String(d.o.deploy[k]);
    const ok = !!esperado && esperado === deu;
    arestas.push({ de: 'v' + d.n, para: 'v' + origem, id_declarado: deu.slice(0, 8), id_do_diario_destino: esperado ? esperado.slice(0, 8) : 'SEM_DIARIO', ok });
    if (!ok) arestas_rotas.push(`v${d.n}->v${origem}`);
  }
}
// Caminhar a cadeia a partir do diário mais novo, não contar arestas: a primeira versão desta régua
// exigia `arestas >= diarios - 1`, o que não tem positivo nenhum porque os diários antigos declaram
// o anterior com outros nomes de campo. O que tem positivo é: partir do mais novo e subir por
// diários versionados até um termo declarado, sem ciclo e sem id que não bate.
const anterior_de = (n) => { const d = diarios.find((x) => x.n === n); if (!d) return null; for (const k of Object.keys(d.o.deploy || {})) { const m = /^versao_anterior_v([0-9]+)$/.exec(k); if (m) return { n: Number(m[1]), id: String(d.o.deploy[k]) }; } return null; };
const caminho = [];
let cur = novo.n; const vistos = new Set([cur]); let termo = 'ok';
for (;;) {
  const a = anterior_de(cur);
  if (!a) { termo = `sem_aresta_declarada_em_v${cur}`; break; }
  if (vistos.has(a.n)) { termo = `ciclo_em_v${a.n}`; break; }
  const esperado = por_versao[a.n];
  const passo = { de: 'v' + cur, para: 'v' + a.n, id_declarado: a.id.slice(0, 8), id_do_diario_destino: esperado ? esperado.slice(0, 8) : 'SEM_DIARIO', ok: !!esperado && esperado === a.id };
  caminho.push(passo);
  if (!esperado) { termo = `destino_sem_diario_v${a.n}`; break; }
  if (esperado !== a.id) { termo = `id_nao_bate_em_v${cur}`; break; }
  vistos.add(a.n); cur = a.n;
}

// O emissor de contagens é a única fonte do número de linhas PEN; chamá-lo aqui é o que impede
// esta régua de passar a contar por conta própria e divergir do resto da casa.
const emissorTxt = execFileSync('node', ['scripts/ah1-cuenta-pen.mjs'], { cwd: REPO, encoding: 'utf8' });
const em = /linhas PEN: (\d+) \| A (\d+) · M (\d+) · B (\d+) · soma (\d+)/.exec(emissorTxt);
const em2 = /fora de forma: (\S+)/.exec(emissorTxt);
const em3 = /únicas: (\d+) \| maior: PEN-(\d+)/.exec(emissorTxt);
if (!em || !em2 || !em3) throw new Error('ABORTA: o emissor de contagens mudou de forma e esta régua deixaria de poder lê-lo — corpo impresso: ' + JSON.stringify(emissorTxt.slice(0, 260)));
const emissor = { linhas: Number(em[1]), A: Number(em[2]), M: Number(em[3]), B: Number(em[4]), soma: Number(em[5]), fora_de_forma: em2[1], unicas: Number(em3[1]), maior: Number(em3[2]) };

// O painel declara o número numa linha `h2` que também nomeia a fonte da contagem. Recorto por
// linha, não por um regex que atravesse etiquetas: a primeira versão desta régua exigiu `[^<]*`
// até ao `)` e não casou porque o `<code>` vive no meio da frase — e sem imprimir a linha
// extraída isso teria parecido um painel partido em vez de uma sonda partida.
const painelTxt = l(join(REPO, 'docs/roadmap-painel.html'));
const cabLine = painelTxt.split(/\r?\n/).find((s) => s.includes('Pendências (') && s.includes('itens · PEN-01')) || '';
const cab = { itens: Number((/(\d+) itens/.exec(cabLine) || [])[1] ?? NaN), maior: Number((/PEN-01…PEN-(\d+)/.exec(cabLine) || [])[1] ?? NaN) };
const kpi = (rotulo) => { const m = new RegExp('<div class="kpi"><div class="n">(\\d+)</div><div class="l">prioridade ' + rotulo + '</div></div>').exec(painelTxt); return m ? Number(m[1]) : null; };
const painel = { itens_extraido: Number.isFinite(cab.itens) ? cab.itens : null, maior_extraido: Number.isFinite(cab.maior) ? cab.maior : null, nomeia_a_fonte: cabLine.includes('ah1-cuenta-pen.mjs'), linha_cabecalho: cabLine.slice(0, 220) || 'NAO_CASEI', ALTA: kpi('ALTA'), MEDIA: kpi('MÉDIA'), BAIXA: kpi('BAIXA') };

// Diário de corrida: um bloco `**SM.NN.` por tranche. Face (c) do §SM.67 T1: a régua velha tinha
// UMA forma para duas classes de objeto — «o título nomeia a versão» e «a versão aparece no diário»
// — e por isso um vermelho podia ser convenção não seguida ou cegueira do extracto. Agora são duas
// prédicas, cada uma com o seu denominador impresso pela própria peça (o título exige texto depois
// do número; o corpo não), e o vermelho de convenção fica vermelho com a causa, sem alargar a régua.
const audTxt = l(join(REPO, 'docs/auditoria-bfr-conecta.md'));
const RE_TITULO = /^\*\*SM\.[0-9]+\. .*$/gm;
const RE_CORPO = /\*\*SM\.[0-9]+\./g;
const blocos = (audTxt.match(RE_TITULO) || []);
const titulos_de_linha = (audTxt.match(/^\*\*SM\.[0-9]+\./gm) || []);
const rotulo_novo = 'v' + novo.n;
const blocos_que_nomeiam = blocos.filter((s) => s.includes(rotulo_novo));
const linhas_de_corpo_que_nomeiam = audTxt.split(/\r?\n/).filter((s) => s.includes(rotulo_novo)).length;
const ultimo_bloco = blocos.length ? blocos[blocos.length - 1] : 'SEM_BLOCOS';
const numeros_de_bloco = (audTxt.match(/^\*\*SM\.([0-9]+)\./gm) || []).map((s) => Number(/SM\.([0-9]+)\./.exec(s)[1]));
const distintos = [...new Set(numeros_de_bloco)].sort((a, b) => a - b);
const serie_em_falta = [];
for (let i = distintos[0]; i <= distintos[distintos.length - 1]; i++) if (!distintos.includes(i)) serie_em_falta.push(i);
const registros_sem_titulo = [];
for (const d of diarios) if (!blocos.some((s) => s.includes('v' + d.n))) registros_sem_titulo.push('v' + d.n);

// Coerência interna do diário mais novo: o md5 do bundle e o md5 que a linha da candidata declaram
// têm de ser o mesmo número escritos por duas mãos diferentes do mesmo instrumento — e a mão do
// bundle é lida na grafia que o produtor declara, nunca por um nome dactilografado aqui.
const bund = novo.o.bundle || {};
const campo_md5 = resolve_campo(bund, FAMILIAS.md5_do_html, 'bundle de ' + rotulo_novo);
const campo_bytes = resolve_campo(bund, FAMILIAS.bytes_do_html, 'bundle de ' + rotulo_novo);

const tCred = l(join(REPO, 'scripts/portao-indice.mjs'));
const linhaJWT = (tCred.match(/const JWT\s*=\s*\/((?:\\.|[^\\/\r\n])*)\/([dgimsuy]*)/) || []);
const reJWT = linhaJWT[1] ? new RegExp(linhaJWT[1], linhaJWT[2].includes('g') ? linhaJWT[2] : linhaJWT[2] + 'g') : null;

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 320)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_ar_servido_duas_vezes_seguidas_e_igual_a_si_mesmo_e_ao_md5_do_diario_mas_novo',
    leituras.every((x) => x.http === 200) && new Set(leituras.map((x) => x.md5)).size === 1 && leituras[0].md5 === campo_md5.valor && leituras[0].bytes === campo_bytes.valor,
    { diario: rotulo_novo, grafia_lida_do_produtor: campo_md5.nome + '/' + campo_bytes.nome, html_md5_declarado: campo_md5.valor, html_bytes_declarados: campo_bytes.valor, leituras: leituras.map((x) => `${x.http}/${x.bytes}B/${x.md5}`) }),
  g('a_grafia_do_md5_declurada_pelo_produtor_e_de_um_sozinho_e_de_32_digitos_hex',
    /^[0-9a-f]{32}$/.test(String(campo_md5.valor)),
    { diario: rotulo_novo, grafia: campo_md5.nome, valor: String(campo_md5.valor).slice(0, 40), familias_aceites: FAMILIAS.md5_do_html }),
  g('a_cadeia_partida_do_diario_mas_novo_sobe_por_diarios_versionados_ate_um_termo_declarado_sem_ciclo_nem_id_trocado',
    caminho.length >= 3 && /^sem_aresta_declarada_em_v\d+$/.test(termo) && arestas_rotas.length === 0,
    { caminho, termo, arestas_globais: arestas.length, rotas: arestas_rotas, diarios_no_indice: diarios.map((d) => 'v' + d.n) }),
  g('o_painel_declara_a_contagem_de_itens_do_emissor_e_o_maior_id_declara_o_mesmo_e_cita_a_fonte',
    painel.itens_extraido === emissor.linhas && painel.maior_extraido === emissor.maior && emissor.unicas === emissor.linhas && painel.nomeia_a_fonte === true,
    { emissor, painel, unidades: 'linhas da tabela PEN do ledger, contadas pela grelha do emissor, não por prefixo' }),
  g('o_painel_declara_as_tres_prioridades_do_emissor_e_a_soma_delas_e_a_contagem_de_itens',
    painel.ALTA === emissor.A && painel.MEDIA === emissor.M && painel.BAIXA === emissor.B && emissor.A + emissor.M + emissor.B === emissor.soma,
    { emissor, painel }),
  g('nenhuma_linha_pen_fica_fora_de_forma_no_emissor',
    emissor.fora_de_forma === 'nenhuma', { emissor }),
  g('o_diario_de_corrida_tem_um_bloco_SM_que_nomeia_a_versao_publicada_mas_nova',
    blocos_que_nomeiam.length >= 1,
    { alvo: rotulo_novo, blocos_com_texto: blocos.length, titulos_por_linha: titulos_de_linha.length, que_nomeiam_a_versao: blocos_que_nomeiam.map((s) => s.slice(0, 90)), registros_sem_titulo_que_os_nomeie: registros_sem_titulo, ultimo_bloco: ultimo_bloco.slice(0, 110) }),
  g('a_versao_publicada_mas_nova_e_narrada_em_corpo_do_diario_de_corrida',
    linhas_de_corpo_que_nomeiam >= 1,
    { alvo: rotulo_novo, linhas_de_corpo_que_nomeiam, notas: 'eixo separado do título: um bloco pode narrar a versão sem a nomear no título, e era isso que o portão de cima confundia' }),
  g('nenhum_registro_de_publicacao_declara_saida_de_candidata_com_md5_diverso_do_md5_do_bundle',
    saidas_divergentes.length === 0,
    { classes_do_censo_saida: saidas_por_classe, divergentes: saidas_divergentes, unidades: 'md5 extraído do texto `destino` contra o md5 do bundle lido na grafia declarada pelo próprio registo' }),
  g('nenhuma_saida_de_candidata_declurada_fica_sem_md5_legivel_no_texto',
    saidas_sem_md5.length === 0,
    { classes_do_censo_saida: saidas_por_classe, sem_md5: saidas_sem_md5, nota: 'a classe `produtor_nao_declara_saida` é legítima e não é contada aqui; contar-lhe-ia o verde' }),
  g('nenhum_registro_com_bundle_fica_sem_grafia_de_md5_de_html_reconhecida',
    registos_com_bundle_sem_grafia.length === 0,
    { classes_do_censo: classes_do_censo, fora: registos_com_bundle_sem_grafia, familias: FAMILIAS }),
  g('nenhum_caminho_versionado_com_prefixo_de_publicacao_fica_fora_das_classes_da_particao',
    particao.fora_de_forma.length === 0,
    { prefixos_totais: particao.prefixos_totais, no_indice: particao.no_indice.length, irmaos_txt: particao.irmaos_txt.length, exemplares_na_raiz: particao.exemplares_na_raiz, em_subpasta: particao.em_subpasta, exemplares_em_subpasta: particao.exemplares_em_subpasta, json_com_letra: particao.json_com_letra.length, fora_de_forma: particao.fora_de_forma, soma_das_classes: particao.no_indice.length + particao.irmaos_txt.length + particao.json_com_letra.length + particao.exemplares_na_raiz.length + particao.em_subpasta.length + particao.exemplares_em_subpasta.length + particao.fora_de_forma.length, unidades: 'caminhos versionados com o prefixo `audit-publicacao`; o censo é contado por outra prédica que não a das classes, por isso o verde não pode vir de si' }),
  g('nenhum_registro_de_publicacao_com_sufixo_de_letra_fica_de_fora_da_cadeia',
    particao.json_com_letra.length === 0,
    { com_sufixo_de_letra: particao.json_com_letra, nota: 'o remédio dum vermelho aqui é ensinar a cadeia a ler o sufixo (e dar-lhe fixture), nunca renomear o registo que a publicação escreveu' }),
];

{
  const md5_por_registro = (b) => { try { return resolve_campo(b, FAMILIAS.md5_do_html, 'bundle').valor; } catch (e) { return String(e.message).startsWith('ABORTA:') ? 'SEM_GRAFIA_RECONHECIDA' : 'ERRO'; } };
  const corpo = JSON.stringify({ portoes, diarios: diarios.map((d) => ({ f: d.f, version_id: por_versao[d.n], md5_do_bundle: md5_por_registro(d.o.bundle || {}) })), leituras, emissor, painel });
  const jwt = reJWT ? (corpo.match(reJWT) || []).length : -1;
  portoes.push(g('nenhum_token_de_sessao_chega_ao_registo_desta_regua', reJWT !== null && jwt === 0, { regexua_lida_do_emissor: !!reJWT, ocorrencias: jwt, comparado: 'o corpo serializado desta própria saída' }));
}

const out = {
  programa: 'scripts/p116-consistencia-de-versao.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'Fetch anónimo duplicado do shell; diários lidos de `git ls-files` pela mesma partição julgada em fixture e ordenados pelo número medido no nome; a cadeia de `versao_anterior_vX` confrontada com os `version_id` dos próprios diários; os campos do bundle resolvidos contra a família de grafias que o registo realmente declara (snake e camel aceites, ambiguidade ou ausência abortam), nunca por um nome dactilografado aqui; as contagens vêm de chamar `scripts/ah1-cuenta-pen.mjs`, nunca de contar linhas aqui; painel e diário de corrida recortados por uma prédica por linha declarante, com o texto extraído impresso ao lado do veredicto.',
  grafias_dos_registros: { familias_aceites: FAMILIAS, lida_no_diario_mas_novo: campo_md5.nome + '/' + campo_bytes.nome, censo: censo_de_grafias, classes: classes_do_censo, saidas_por_classe },
  ar: { url, leituras, diario: rotulo_novo, data_do_diario: novo.o.data },
  diarios_no_indice: diarios.map((d) => `v${d.n}`),
  particao_de_nomes: { prefixos_totais: particao.prefixos_totais, no_indice: particao.no_indice.length, irmaos_txt: particao.irmaos_txt, exemplares_na_raiz: particao.exemplares_na_raiz, em_subpasta: particao.em_subpasta, exemplares_em_subpasta: particao.exemplares_em_subpasta, json_com_letra: particao.json_com_letra, fora_de_forma: particao.fora_de_forma },
  cadeia: { caminho, termo, arestas, rotas: arestas_rotas },
  emissor, painel,
  emissor_identidade: { bytes: Buffer.byteLength(readFileSync(new URL(import.meta.url))), md5: md5(readFileSync(new URL(import.meta.url))) },
  diario_de_corrida: { blocos_com_texto: blocos.length, titulos_por_linha: titulos_de_linha.length, serie_de_blocos: { distintos: distintos.length, menor: distintos[0], maior: distintos[distintos.length - 1], em_falta: serie_em_falta }, registros_sem_titulo, primeiro: blocos.length ? blocos[0].slice(0, 90) : null, ultimo: ultimo_bloco.slice(0, 120), que_nomeiam_a_versao_mais_nova: blocos_que_nomeiam.map((s) => s.slice(0, 120)), linhas_de_corpo_que_nomeiam },
  o_que_esta_regua_ve_e_nao_ve: 'Vê quatro relações: ar↔diário (na grafia que o produtor declara), painel↔emissor, diário de corrida↔versão publicada em dois eixos separados (título e corpo), e registo↔registo (o md5 da saída da candidata contra o do bundle, para cada registo que declara as duas mãos). Não vê se o conteúdo do bloco SM está certo, se o painel descreve bem cada cartão, nem se um `deploy` do Cloudflare tem diário — isso continua no `pacote-municipal-confere-pecas.mjs` e na leitura da lista de deployments. Um KPI do painel que não tenha emissor (o de «versões publicadas») não é governado por esta régua, porque eu não tenho como derivar o esperado dele sem chamar a API de administração. A série de números de bloco em falta é impressa e não é veredicto: um número saltado não se recupera sem re-escrever a história, e um portão sem estado final legítimo só ensina a ignorá-lo.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P116_CONSISTENCIA_DE_VERSAO_OK ${portoes.length}/0` : `P116_CONSISTENCIA_DE_VERSAO_VERMELHO ${falhas.length} de ${portoes.length}`;
const TXT = OUT.replace(/\.json$/, '.txt');
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P116_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `ar=${leituras[0].md5}/${leituras[0].bytes}B diario=${rotulo_novo}\nemissor=linhas ${emissor.linhas} A ${emissor.A} M ${emissor.M} B ${emissor.B} maior PEN-${emissor.maior}\npainel=itens ${painel.itens_extraido} maior ${painel.maior_extraido} A ${painel.ALTA} M ${painel.MEDIA} B ${painel.BAIXA}\ncadeia=${caminho.map((p) => p.de + '>' + p.para).join(' ')} termo=${termo} arestas=${arestas.length} rotas=${arestas_rotas.length}\nblocos_com_texto=${blocos.length} titulos_por_linha=${titulos_de_linha.length} que_nomeiam_${rotulo_novo}=${blocos_que_nomeiam.length} corpo_que_nomeia=${linhas_de_corpo_que_nomeiam}\ngrafias=${campo_md5.nome}/${campo_bytes.nome} saidas=${Object.keys(saidas_por_classe).map((k) => k + ':' + saidas_por_classe[k]).join(' ')}\n
` + `${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}\n`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`EMISSOR=${emissor.linhas}·A${emissor.A}·M${emissor.M}·B${emissor.B} · PAINEL=${painel.itens_extraido}·A${painel.ALTA}·M${painel.MEDIA}·B${painel.BAIXA} · DIARIO=${rotulo_novo} BLOCOS_QUE_O_NOMEIAM=${blocos_que_nomeiam.length}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
