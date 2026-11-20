#!/usr/bin/env node
// Portao do INDICE: varre o conteudo que esta no index (git show :caminho), nao o disco,
// porque os ficheiros des-rastreados continuam em disco de proposito.
// Imprime apenas comprimentos, formas mascara e chaves de claim. Nunca um valor.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g;
const SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const URLTOK = /[?&]token=([A-Za-z0-9_-]{20,})/g;
const BIN = /\.(pdf|png|jpe?g|gif|ico|webp|woff2?|ttf|zip|7z|jar|node)$/i;

// Excepcoes medidas uma a uma, cada uma com a prova da sua classe. O padrao do
// portao nao distingue "chave" de senha de "chave" de nome-de-coluna, entao a
// lista e explicita e o portao FALHA se a medida mudar (comprimento ou numero)
// ou se uma excepcao deixar de casar — assim a lista nao apodrece em silencio.
const EXCECOES = [
  {
    arquivo: 'evidence/e2e4-biblioteca.json', classe: 'jwt', n: 2, comprimentos: '427,427',
    motivo: 'URL assinada de storage (mesma cadeia em ?token=): claims = exp,iat,scope,url, sem role nem email; iat 2026-10-22T23:02Z / exp 23:17Z, validade 15 min, expirada ha 3 semanas.',
  },
  {
    arquivo: 'evidence/pf-throttle-hunks.json', classe: 'senha', n: 1, comprimentos: '10',
    motivo: 'chave e irma de quando/janela/origem/escrita_da_posicao e tem o mesmo comprimento de hunks[].nome: e rotulo do hunk SQL, nao credencial.',
  },
  {
    arquivo: 'scripts/pf-throttle-gera.mjs', classe: 'senha', n: 1, comprimentos: '10',
    motivo: 'chave: nome de coluna da tabela (student_id), escrito pelo gerador — nao senha de conta.',
  },
  {
    arquivo: 'scripts/ah2-sonda-rest.mjs', classe: 'senha', n: 1, comprimentos: '14',
    motivo: 'o casado e o literal «bytes servidos» no campo origem_chave: e a etiqueta de procedencia da anon key (de onde o programa a leu), nao a chave. Provado por comparacao de hash com as candidaturas de rotulo, e o valor nao contem pontos nem e JWT. O padrao apanhou-o so porque o nome do campo acaba em «chave».',
  },
  // As duas entradas abaixo sao o mesmo casamento medido nos artefactos que o programa escreve, e a
  // classificacao nao vem da memoria: vem de `scripts/ah2-prova-classe-sonda-rest.mjs` (igualdade de hash
  // com o literal, sem imprimir valor). Os comprimentos copiam-se da saida `medido` do proprio portao.
  // O caso analogo do artefacto do Home NAO esta aqui de proposito: esse campo tinha o nome ambiguo
  // `chave`, e a decisao registada em 26e220d foi renomear para `rota_home` e re-gerar (v3), nao excepcionar.
  {
    arquivo: 'evidence/ah2-sonda-rest-17-11.json', classe: 'senha', n: 1, comprimentos: '14',
    motivo: 'campo origem_chave do artefacto escrito por scripts/ah2-sonda-rest.mjs: hash igual ao do mesmo literal ja excepcionado no programa — etiqueta de procedencia, nao credencial.',
  },
  {
    arquivo: 'evidence/ah2-sonda-rest-17-11b.json', classe: 'senha', n: 1, comprimentos: '14',
    motivo: 'segunda corrida do mesmo programa: origem_chave com hash igual ao mesmo literal — mesma classe, mesma medida. Re-gerar o artefacto custaria uma corrida de browser, e o programa que o escreve ja tem esta excecao assinada: e a mesma classe em dois sitios.',
  },
  // 18/11 (§SM.20): o precedente 26e220d renomeou o campo ambiguo `chave` porque a corrida era re-geravel.
  // Aqui nao e: o veredito do sm10 e historico PRE-grant (o estado da BD ja mudou) e o do sm7 e a corrida
  // que mediu o defeito da gaveta (ja corrigido). Renomear o campo quebraria o par instrumento/artefacto
  // (o instrumento_md5 registado deixaria de existir) e re-gerar nao reproduziria a medida. Excepcao com
  // prova de igualdade de hash, como nas entradas ah2 — a prova vive em scripts/sm20-verifica-excecoes.mjs.
  {
    arquivo: 'scripts/sm10-sonda-rls-escopo-18-11.mjs', classe: 'senha', n: 4, comprimentos: '20,11,20,9',
    motivo: 'os 4 valores sao os rotulos de papel do enum (chaves do mapa de sessoes, exatamente as chaves de ah2-sessions.json e sm8-municipal-sessions.json fora do repo): igualdade de hash provada por sm20-verifica-excecoes.mjs. Nenhum token/password alguma vez inline neste programa.',
  },
  {
    arquivo: 'evidence/sm7-municipal-education_supervisor-390-sm8bar390.json', classe: 'senha', n: 4, comprimentos: '24,11,14,9',
    motivo: 'chaves de CACHE do modulo (alunos_* com o filtro ja redigido pelo instrumento, turmas_todo, processos_todo, freq_todo) registadas pelo estagio cache_do_modulo do instrumento sm7 ja commitado. A classe e igual em todas as corridas sm7; os artefactos v133 nao casam (n=0 medido), porque so esta corrida — a do defeito da gaveta — produziu estas entradas.',
  },
  // 18/11 (§SM.21): a certidao da candidata v134. O precedente 26e220d (renomear o campo ambiguo e
  // re-gerar) NAO se aplica aqui: a certidao e o registo do instante de construcao de uma candidata ja
  // publicada, e o seu md5 e lido por scripts/v134-diario-publicacao.mjs (portao G8) e citado em
  // §SM.21 — re-escreve-la depois do deploy seria editar evidencia a posteriori. Excepcao com prova de
  // igualdade de hash, como nas entradas ah2/sm10/sm7; a prova vive em
  // scripts/v134-verifica-excecao-certidao.mjs, que alem do mais afirma que o seu regex e byte a byte o
  // deste portao (compara source e flags com a linha `const SENHA`), por isso nao pode divergir em silencio.
  {
    arquivo: 'bfr-candidata-v134-sidebar-escondida/portoes-v134-candidata.json', classe: 'senha', n: 4, comprimentos: '12,22,7,16',
    motivo: 'os 4 valores sao os NOMES das agulhas do array `chaves` de scripts/v134-gera-candidata.mjs:33, gravados no campo `preservado_por_chave` como {chave, antes, depois} de contagens de ocorrencias na shell — a lista tem 6 nomes e 2 ficam fora da janela 6..24, que e porque n=4 e nao 6 (medido). Nenhum e chave de registo de sessao, nenhum contem ponto, nenhum e JWT: igualdade de hash provada por scripts/v134-verifica-excecao-certidao.mjs. O padrao casou so porque o nome do campo e `chave`.',
  },
  // 18/11 (§SM.22, peca 21 e peca 15): o campo `primeira_geracao_com_chave` (pecas 21/19) e o seu irmao
  // `primeira_com_setRole_chave` (peca 15) dao UM casamento cada, comprimento 15 — o padrao casou porque o
  // NOME do campo acaba em «chave», igual ao caso ja assinado de scripts/ah2-sonda-rest.mjs. O valor e o
  // rotulo da geracao `v114-supervisao` (md5 ea7efb355c1768409148575c08dac721), lido de `degraus[].geracao`
  // da escada e do diretorio bfr-candidata-v114-supervisao; a prova por igualdade de hash vive em
  // scripts/sm22-verifica-excecao-chave.mjs, que compara tambem o seu regex com este (source+flags) e
  // falsifica com um fixture: um literal de senha falso da mesma janela casa no padrao e NAO esta no pool.
  // O precedente 26e220d (renomear o campo e re-gerar) nao se aplica aqui: os quatro artefactos citam-se
  // entre si por caminho exato (a peca 21 le a escada; a peca 19 cita a escada) e dois deles sao corridas
  // VERMELHAS historicas — renomear deixaria citacoes pendentes em evidencia ja medida e reescreveria o
  // registo de um vermelho. Fica registado que o irmao do mesmo campo ja se chama
  // `primeira_com_accountLabels_par`: numa futura corrida e esse o nome a usar, nao «chave».
  {
    arquivo: 'evidence/sm22-escada-proveniencia-32-33-18-11.json', classe: 'senha', n: 1, comprimentos: '15',
    motivo: 'campo primeira_com_setRole_chave: o valor e o rotulo de geracao v114-supervisao (md5 ea7efb355c1768409148575c08dac721), que existe como diretorio na arvore e como elemento de degraus[].geracao do proprio artefacto; nenhum e chave de sessao (19 comparadas), nenhum contem ponto, nenhum comeca por eyJ.',
  },
  {
    arquivo: 'evidence/sm22-cifras-das-linhas-do-ledger-18-11b.json', classe: 'senha', n: 1, comprimentos: '15',
    motivo: 'campo PEN_32.primeira_geracao_com_chave: hash igual ao do rotulo de geracao ja excepcionado na escada — a peca 21 copia o valor, nao o produz.',
  },
  {
    arquivo: 'evidence/sm22-cifras-das-linhas-do-ledger-18-11-ANTERIOR-o-caminho-do-PEN34-estava-errado-e-escrevia-undefined.json', classe: 'senha', n: 1, comprimentos: '15',
    motivo: 'mesmo campo, mesma classe, no registo da corrida vermelha historica (o undefined do PEN-34): um ANTERIOR nao se re-gera, porque re-gerar apagaria o vermelho que ele prova.',
  },
  {
    arquivo: 'evidence/sm22-cifras-das-linhas-do-ledger-18-11b-ANTERIOR-o-portao-somava-a-lista-inteira-9-contra-os-8-anon.json', classe: 'senha', n: 1, comprimentos: '15',
    motivo: 'mesmo campo, mesma classe, na segunda corrida vermelha (o portao que somava 9 contra os 8 anon): identico por hash ao rotulo de geracao, e tambem historico.',
  },
  // 19/11 (§SM.23, fecho do grupo «DDL municipal + calendario»). Os quatro artefactos abaixo dao casamentos
  // porque o NOME do campo acaba em «chave», nao porque o valor o seja. A prova nao e minha a olhar texto:
  // `scripts/sm23-classifica-portadores-do-indice-19-11.mjs` compara cada valor com um CORPO INDEPENDENTE
  // (a DDL versionada para as chaves primarias; o bundle versionado para os baldes de leitura) e exige que
  // apareca la como token, aceitando listas separadas por virgula porque ha chaves primarias COMPOSTAS.
  // Medido em `evidence/sm23-fecho-classificacao-dos-portadores-19-11.txt`: `sem_par_no_corpo=0` nos quatro,
  // e o fixture plantado do proprio instrumento dispara (`a_plantada_dispara=true`), porque um verde que nao
  // pode ser vermelho nao e um verde — a primeira versao desta peca comparava o valor com as strings do
  // proprio artefacto e era verdadeiro por construcao. Os comprimentos copiam-se da saida `medido` deste portao.
  {
    arquivo: 'evidence/sm23-conferencia-calendario-18-11.json', classe: 'senha', n: 3, comprimentos: '24,18,18',
    motivo: 'campo chaves_primarias[].chave, escrito por scripts/sm23-conferir-calendario-18-11.mjs a partir de pg_get_constraintdef: sao as COLUNAS da chave primaria das tres mesas do calendario (formas mascaradas `a_a,_a_a` e `a_a,_a`, i.e. chaves compostas), todas presentes como tokens na DDL versionada scripts/ah2-ddl-calendario-candidata.sql; nenhum com ponto, nenhum `eyJ`.',
  },
  {
    arquivo: 'evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11.json', classe: 'senha', n: 19, comprimentos: '12,11,11,14,9,18,12,7,18,10,9,11,14,13,16,10,12,11,11',
    motivo: 'campo chamadas_de_leitura_por_chave[].chave: os NOMBES dos baldes de leitura que o modulo municipal passa ao seu helper `ler(chave, build)`, extraidos do texto servido; os 19 aparecem como tokens no bundle versionado bfr-candidata-v134-sidebar-escondida/index.html (corpo de onde o involucre foi recortado). O nome do campo e que faz o padrao casar — mesmo caso ja assinado de scripts/ah2-sonda-rest.mjs.',
  },
  {
    arquivo: 'evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11-ANTERIOR-fixture-com-rpc-pontuado-dos-lados.json', classe: 'senha', n: 19, comprimentos: '12,11,11,14,9,18,12,7,18,10,9,11,14,13,16,10,12,11,11',
    motivo: 'mesmo campo, mesma classe, na corrida ANTERIOR preservada (o fixture que casava `rpc.` pontuado dos dois lados): re-gera-la apagaria o vermelho que ela prova, por isso o casamento fica assinado aqui e nao se renomeia.',
  },
  {
    arquivo: 'evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11-ANTERIOR-detalhe-de-portao-com-o-corpo-inteiro-do-modulo.json', classe: 'senha', n: 19, comprimentos: '12,11,11,14,9,18,12,7,18,10,9,11,14,13,16,10,12,11,11',
    motivo: 'mesmo campo, mesma classe, na outra ANTERIOR (a que despejava o corpo inteiro do modulo no detalhe do portao): os 19 valores estao la duas vezes — no registo e no corpo colado — e continuam a ser nomes de balde lidos do bundle, nao credenciais.',
  },
  // 19/11 (§SM.24, fecho das candidatas v136 e do dedup de corpos): quatro ficheiros novos casam no padrao e
  // sao de duas classes diferentes. A prova de ambas vive em scripts/sm24-verifica-excecoes-do-portao-19-11.mjs,
  // que compara source e flags do seu padrao com a linha `const SENHA` deste portao (nao pode divergir em
  // silencio), confronta cada valor por HASH contra o pool do seu produtor, exige forma de identificador e
  // rejeita um fixture negativo composo em tempo de execucao. 20 casamentos no total, todos resolvidos.
  {
    arquivo: 'bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata.json', classe: 'senha', n: 7, comprimentos: '22,12,22,15,12,18,17',
    motivo: 'os 7 valores sao os NOMES das agulhas do array `INV` de scripts/v136-gera-candidata.mjs:140, gravados no campo `invariantes[].chave` como {nome, antes, depois} de contagens de ocorrencias na shell — a lista tem 9 nomes e 2 ficam fora da janela 6..24 (28 e 30 caracteres), que e porque n=7 e nao 9 (medido). Nenhum e chave de registo de sessao (19 comparadas), nenhum comeca por eyJ, todos tem forma de identificador de codigo. Igualdade de hash provada pela peca sm24 acima.',
  },
  {
    arquivo: 'bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata-ANTERIOR-run1-7-vermelhos.json', classe: 'senha', n: 7, comprimentos: '22,12,22,15,12,18,17',
    motivo: 'mesma lista de agulhas, mesma classe, na corrida vermelha preservada (os 7 portoes vermelhos da run1 da candidata): o conjunto de hashes e identico ao da certidao verde (medido por comparacao de conjuntos), e re-gera-la apagaria o vermelho que ela prova — por isso fica assinada e nao se renomeia.',
  },
  {
    arquivo: 'evidence/p73-corpos-de-artefactos-20-11f.json', classe: 'senha', n: 4, comprimentos: '24,22,24,22',
    motivo: 'os 4 valores sao CAMINHOS DE CAMPO JSON, nao conteudo: e o nome que scripts/p73-corpus-lib.mjs:43 compoe ao descer o objecto varrido, gravado em `corpos_grandes[].chave` para dizer ONDE vive um corpo grande. Cada hash aparece tambem como caminho composto nos artefactos varridos — os dois preflight de 4 MB que o .gitignore recusa versionar (o corpo mora la, por isso o caminho e repetido 2×2 aqui). Pool da prova: 770 artefactos do indice + 128 do disco = 133 466 caminhos; nenhum casamento e chave de sessao, nenhum tem forma de JWT, cada segmento e um identificador de campo.',
  },
  {
    arquivo: 'evidence/p73-extracao-de-corpos-unicos-20-11f.json', classe: 'senha', n: 2, comprimentos: '24,22',
    motivo: 'mesma classe do caso acima: o resumo da extraccao lista os 2 caminhos unicos uma vez cada (o artefacto de cima lista 2×2 porque percorre dois preflight). Sub-conjunto por hash do conjunto ja assinado — provado na mesma peca sm24.',
  },
];

const lista = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);

// --control: relemos um ficheiro do DISCO com os mesmos padroes. Serve de
// controle negativo: prova que o portao nao esta verde porque ficou cego.
const controle = process.argv.slice(2);
if (controle.length) {
  const raiz = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  for (const f of controle) {
    const t = readFileSync(`${raiz}/${f}`, 'utf8');
    const s = [...t.matchAll(SENHA)].map((m) => m[2].length);
    console.log(`CONTROLE ${f} senha=[${s.join(',')}]`);
  }
  process.exit(0);
}

let pulados = 0, lidos = 0;
const medido = new Map();

function registrar(arquivo, classe, valores) {
  if (!valores.length) return;
  medido.set(`${arquivo}|${classe}`, { n: valores.length, comprimentos: valores.join(',') });
}

for (const f of lista) {
  if (BIN.test(f)) { pulados++; continue; }
  let t;
  try { t = execFileSync('git', ['show', `:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch { pulados++; continue; }
  lidos++;
  const j = [...t.matchAll(JWT)];
  // "?token=eyJ..." e o mesmo JWT contado por dois padroes: o JWT comeca dentro
  // do casamento de URL, entao fica na classe jwt e nao conta duas vezes.
  const portadoPorUrl = (m) => j.some((k) => k.index >= m.index && k.index < m.index + m[0].length);
  registrar(f, 'senha', [...t.matchAll(SENHA)].map((m) => m[2].length));
  registrar(f, 'jwt', j.map((m) => m[0].length));
  registrar(f, 'token_de_url', [...t.matchAll(URLTOK)].filter((m) => !portadoPorUrl(m)).map((m) => m[1].length));
}

const cobre = (e) => medido.get(`${e.arquivo}|${e.classe}`);
const naoCobertas = [...medido].filter(([k]) => !EXCECOES.some((e) => `${e.arquivo}|${e.classe}` === k));
const malCobertas = EXCECOES.filter((e) => {
  const m = cobre(e);
  return m === undefined || m.n !== e.n || m.comprimentos !== e.comprimentos;
});

let totais = { senha: 0, jwt: 0, token_de_url: 0 };
for (const [k, m] of medido) { const c = k.split('|')[1]; if (totais[c] !== undefined) totais[c] += m.n; }
console.log(`indice_arquivos=${lista.length} lidos=${lidos} pulados_bin_ou_grande=${pulados}`);
console.log(`senha_literal=${totais.senha} jwt=${totais.jwt} token_de_url=${totais.token_de_url} portadores=${medido.size}`);
for (const [k, m] of medido) console.log(`  medido ${k} n=${m.n} comprimentos=${m.comprimentos}`);
for (const e of EXCECOES) console.log(`  excecao ${e.arquivo}|${e.classe} :: ${e.motivo}`);
for (const [k, m] of naoCobertas) console.log(`  NAO_COBERTA ${k} n=${m.n} comprimentos=${m.comprimentos}`);
for (const e of malCobertas) console.log(`  EXCECAO_VELHA ${e.arquivo}|${e.classe}`);
const verde = naoCobertas.length === 0 && malCobertas.length === 0;
console.log(verde ? 'PORTAO_INDICE_VERDE' : 'PORTAO_INDICE_VERMELHO');
// O veredito tem de se ver no código de saída: um portão que imprime VERMELHO e sai 0 é lido como verde por
// qualquer `&&` ou CI, e é exactamente assim que um índice com credencial passa. A saída 0 fica reservada
// ao caminho `--control`, que é uma pergunta de leitura, não um veredicto.
process.exit(verde ? 0 : 1);
