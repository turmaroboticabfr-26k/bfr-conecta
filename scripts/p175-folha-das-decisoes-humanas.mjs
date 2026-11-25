// p175 — FOLHA DAS DECISOES HUMANAS, produzida por medida e nao por memoria.
// Fontes: o grupo de decisao humana lido da captura do p171, o registo de classes do p133, o ledger (cujas
// predicas de fatiamento sao recortadas do produtor p133 e compiladas, nao re-dactilografadas) e a tabela de
// insumos da seccao 12.1 do mesmo ledger.
// Regua central: uma saida so pode ser citada se o seu texto existir na fonte declarada (tabela 12.1, celula da
// linha ou coluna do item). O que e meu esta rotulado como minha leitura, e cada linha da folha tem de ter ao
// menos uma saida ancorada — sem isso a folha seria eu a inventar o menu.
// As classes de escrita e as familias de OK sao vocabulario medido: as familias leem-se da captura do p171, as
// classes estao declaradas abaixo com o seu significado; um valor fora do vocabulario chumba.
// Zero escrita externa: sem chamadas de rede, sem SQL, sem deploy. So o artefacto em evidence/.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const AQUI = fileURLToPath(import.meta.url);
const REPO = fs.realpathSync('.');
const P133 = 'scripts/p133-inventario-das-pendencias-abertas.mjs';
const SUF = process.env.P175_SUF ? '-' + process.env.P175_SUF : '';
const args = process.argv.slice(2);
const FIXTURES = args[0] === '--fixtures';
if (!FIXTURES && args.length !== 2) throw new Error('ABORTA: uso: p175 <registro-p133.json> <captura-p171.txt>  |  --fixtures');
const OUT = REPO + '/evidence/p175-folha-das-decisoes-humanas' + SUF + '.json';
if (!FIXTURES && fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P175_SUF=novo, nao por cima');
const ROTULO_DO_GRUPO = 'decisao humana';
const SENTINELA_SEM_OK = 'nenhuma_das_quatro_familias';

const VOCAB_ESCRITA = {
  nada_fora_dos_meus_ficheiros: 'so escreve prova e prosa desta casa: banco, ar e auth ficam como estao',
  bundle_do_app_publicar: 'escreve no fonte do pacote e so chega ao utilizador depois de publicar uma versao',
  banco_ddl_ou_dml: 'escreve no banco (policy, funcao, grants ou conteudo das mesas)',
  auth_mint_ou_rotacao: 'escreve em auth: criar contas ou rodar senha de cadeias vivas',
  trafego_no_ar: 'manda trafego real ao ar (carga, reproducao com sessao) sem escrever schema nenhum',
  gente_e_aparelho: 'precisa de gente, impressora, camera ou telemovel: nenhuma ferramenta desta casa o faz',
};

const DECISOES = [
  { id: 'PEN-03', pergunta: 'O espaco do aluno pinta o nome oficial ou o nome preferido?',
    opcoes: [
      { rotulo: 'nome preferido (paridade com a saudação)', ancora: { tipo: 'tabela_12_1', entrada: 'RM-2.4' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'mexer no applyIdentity() da fonte do pacote, conferir no browser com cadeia viva autenticada e publicar; e a saida que alinha o hero com a saudação do topo' },
      { rotulo: 'ao oficial', ancora: { tipo: 'tabela_12_1', entrada: 'RM-2.4' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'o corpo medido no ar ja lê o nome oficial, por isso esta saida nao muda byte de produto: fechar é declarar a escolha no ledger e re-conferir com a sonda do ar' },
    ] },
  { id: 'PEN-06', pergunta: 'O overlay executivo fica com escape por rota ou acabam os painéis legados?',
    opcoes: [
      { rotulo: 'manter o overlay com escape por rota', ancora: { tipo: 'tabela_12_1', entrada: 'RM-2.2' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'o escape passa a contrato por rota: escrita no CSS e nos toggles, prova de browser e publicacao' },
      { rotulo: 'expor/remover os painéis legados', ancora: { tipo: 'tabela_12_1', entrada: 'RM-2.2' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'tira regras e classes do pacote; abre superficie nova ao papel de direcao, por isso pede censo de portas depois de publicar' },
    ] },
  { id: 'PEN-08', pergunta: 'Que dias contam como letivos (o sábado entra?) e onde está o corpo da função que falta?',
    opcoes: [
      { rotulo: 'decisão de sábado', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'a grade medida hoje nao tem sábado, logo a decisao escreve-se como conteudo novo nas mesas do calendario, com candidata, reversao e preflight' },
      { rotulo: 'correct_gate_attendance', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'e o unico nome chamado no ar sem corpo no catalogo: DDL com assinatura lida dos bytes, e a mesma sonda de ar a confirmar que deixou de dar quarenta e quatro' },
      { rotulo: 'declarar a linha fora do ambito desta casa', ancora: { tipo: 'minha_leitura' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'a linha continua ABERTA por vontade e nao por falta de medicao; zero escrita fora desta casa' },
    ] },
  { id: 'PEN-09', pergunta: 'Quem faz o teste real do crachá impresso, e quando?',
    opcoes: [
      { rotulo: 'Crachá físico impresso (teste real)', ancora: { tipo: 'item_pen' },
        escreve: 'gente_e_aparelho', falta: SENTINELA_SEM_OK,
        custo: 'impressora, crachá e uma pessoa: nada nesta casa imprime, e o resultado entra como artefacto datado com quem segurou o crachá' },
      { rotulo: 'declarar a linha nao testavel aqui', ancora: { tipo: 'minha_leitura' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'fecha por decisao e nao por medicao; o painel passa a contar esta linha como fechada por vontade do dono' },
    ] },
  { id: 'PEN-10', pergunta: 'Quem faz o teste de câmera num dispositivo real, e quando?',
    opcoes: [
      { rotulo: 'Câmera de dispositivo real (teste físico)', ancora: { tipo: 'item_pen' },
        escreve: 'gente_e_aparelho', falta: SENTINELA_SEM_OK,
        custo: 'um telemóvel com câmera e uma captura com sessao real; a cadeia de auth ainda tem de estar viva nesse momento, o que puxa o grupo do mint' },
      { rotulo: 'declarar a linha nao testavel aqui', ancora: { tipo: 'minha_leitura' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'fecha por decisao; nenhum instrumento desta casa falsifica uma câmera' },
    ] },
  { id: 'PEN-11', pergunta: 'A entrega do push vai ser testada num aparelho físico, ou a linha fica sem prova?',
    opcoes: [
      { rotulo: 'só resta a palavra', ancora: { tipo: 'celula' },
        escreve: 'gente_e_aparelho', falta: SENTINELA_SEM_OK,
        custo: 'o recetor ja foi medido no service worker servido e no Chrome real; falta um aparelho com sessao e a palavra de quem o segura' },
      { rotulo: 'nada nela se pode provar por leitura', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'manter ABERTA com a causa escrita; a leitura nao alcanga este eixo, e aliviar a frase seria mover a régua' },
    ] },
  { id: 'PEN-16', pergunta: 'O que é um relatório comparativo de rede, para quem vai e com que frequência?',
    opcoes: [
      { rotulo: 'produto por construir', ancora: { tipo: 'celula' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'os dois agregados de rede ja sao chamados no ar, mas nada os mostra como comparacao: escrita no modulo e publicacao, com prova de pixel por papel' },
      { rotulo: 'decisão e OK próprios', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'a propria celula declara que a linha pede escolha sua antes de qualquer instrumento; zero escrita enquanto essa escolha nao vier' },
    ] },
  { id: 'PEN-21', pergunta: 'Autorizo escrever o instrumento de carga e correr-lhe o perfil contra o ar?',
    opcoes: [
      { rotulo: 'escrever o instrumento de carga', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'peca nova versionada, com os seis zeros de hoje como fixture do que ainda nao existe; sozinha nao toca no ar' },
      { rotulo: 'bate no ar com contas reais', ancora: { tipo: 'celula' },
        escreve: 'trafego_no_ar', falta: 'OK de mint ou rotacao de senha',
        custo: 'corre contra o ar com cadeias vivas: mexe no tempo de resposta de gente real e pode exigir mint ou rotacao antes de poder ser corrido' },
    ] },
  { id: 'PEN-23', pergunta: 'O `security_invoker` passa a portão automático ou continua checklist humano?',
    opcoes: [
      { rotulo: 'nada no CI obriga', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'portão meu sobre o SQL dos candidatos, com fixture que dispara numa view sem a opcao; zero banco, zero ar' },
      { rotulo: 'processo sem portão', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'a linha fica ABERTA por desenho: o censo de hoje ja esta verde, e foi exatamente por isso que a celula recusou fechar-se com um verde de censo' },
    ] },
  { id: 'PEN-36', pergunta: 'Qual é o rótulo canónico da secretaria, e o secretariado escolar entra na superfície municipal?',
    opcoes: [
      { rotulo: 'decisão de produto', ancora: { tipo: 'celula' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'a peca dos rotulos mede hoje cinco nomes com dois ou mais usos no ar; escolher um é escrita no pacote e publicacao, nao medicao' },
      { rotulo: 'concessão municipal no banco', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'da acesso por conta e nao por papel, com trilha; a visibilidade continua decidida pelo mapa do bundle ate que alguem mude o mapa' },
      { rotulo: 'no bundle (produto + publicar)', ancora: { tipo: 'celula' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'mudar os papeis municipais do mapa abre a entrada a um papel que o runbook recusa hoje: alargar superficie, nao corrigir pixels' },
    ] },
  { id: 'PEN-38', pergunta: 'Que escolas pertencem a que município real, e o teste de fronteira vai ser corrido?',
    opcoes: [
      { rotulo: 'a etiquetagem por decidir', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'e dado de gente real: sem municipios fora de fixture o predicado nao discrimina nada, e apertar por escopo deixava de ler tudo para nao ler nada' },
      { rotulo: 'perfil municipal a pedir dados de outro município', ancora: { tipo: 'celula' },
        escreve: 'trafego_no_ar', falta: 'OK de mint ou rotacao de senha',
        custo: 'o criterio de fecho da linha: precisa de duas contas municipais com cadeias vivas para que a recusa seja medida e nao prometida' },
    ] },
  { id: 'PEN-39', pergunta: 'O que é que um município deve poder somar, e o bucket sem município se mostra?',
    opcoes: [
      { rotulo: 'decisão de produto sobre o que um município deve poder somar', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'o DDL dos dois agregados ja esta aplicado e o consumo ja esta no ar: falta dizer o que é legitimo somar, e isso nao se mede' },
      { rotulo: 'mostrar ou esconder a classe sem municipio', ancora: { tipo: 'minha_leitura' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'decidir se o bucket se imprime na tela ou desaparece dela: muda a leitura do painel, nao o numero de linhas do banco' },
    ] },
  { id: 'PEN-41', pergunta: 'Director e secretaria com vínculo continuam a ler a rede inteira, ou passam a ler a escola do cargo?',
    opcoes: [
      { rotulo: 'etiquetagem das escolas primeiro', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'a ordem esta escrita na linha: sem escolas etiquetadas, apertar as policies converte leitura em vazio para quem hoje tem dados' },
      { rotulo: 'continua sem prova', ancora: { tipo: 'celula' },
        escreve: 'auth_mint_ou_rotacao', falta: 'OK de mint ou rotacao de senha',
        custo: 'as duas contas municipais sem vínculo ficam a ver zero: dar-lhes numero é vínculo e concessao de gente real, com cadeia viva para o provar' },
    ] },
  { id: 'PEN-42', pergunta: 'Que conteúdo do calendário entra no ar (as lacunas das D1 a D4)?',
    opcoes: [
      { rotulo: '(RM-5.2, D1-D4)', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'as decisoes comecaram e parte delas esta semeada; falta o conteudo por confirmar, e cada tranche de calendario pede a sua frase' },
      { rotulo: 'nao a superficie', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'a linha ja nao e de cadeia nem de catalogo: re-correr instrumentos aqui nao move nada, so a escolha do conteudo move' },
    ] },
  { id: 'PEN-43', pergunta: 'A porta de etiquetagem continua chamável por anónimo para receber recusa?',
    opcoes: [
      { rotulo: 'a porta de etiquetagem fica executável por anónimo', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'e a escolha contraria: manter um nome chamavel sem sessao para que a recusa venha do corpo; um revogar novo com frase propria fecha-a' },
      { rotulo: 'decidir o que um autenticado recebe', ancora: { tipo: 'minha_leitura' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'esta linha nao trata do que um autenticado com sessao recebe: isso sao as PEN-38 e PEN-39 e uma decisao de produto, e nenhuma das duas se fecha com revogar' },
    ] },
  { id: 'PEN-44', pergunta: 'Os papéis de plataforma preservados e os nomes fora do alvo ficam assim, ou revertem?',
    opcoes: [
      { rotulo: 'contadores que coincidem', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'a celula declara que tres grandezas dao o mesmo numero sem prova de ser o mesmo conjunto nome a nome: fechar isto e medir nomes, nao confiar na coincidencia' },
      { rotulo: 'deixar local', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'foi a palavra ja dada para o envio dos commits; vale como decisao de alcance e nao como fecho da linha' },
      { rotulo: 'a concessão municipal', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'o grau esta fechado, o conteudo nao: concessao por conta e escrita com trilha, com frase propria' },
    ] },
  { id: 'PEN-45', pergunta: 'O supervisor educacional ganha o chat interno, ou perde a aba que o mapa lhe oferece?',
    opcoes: [
      { rotulo: 'uma das duas listas do módulo', ancora: { tipo: 'celula' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'abre superficie nova: o papel passa a ver conversas que hoje o predicado lhe recusa, e o censo de portas por papel muda com ele' },
      { rotulo: 'é a que não abre superfície nova', ancora: { tipo: 'celula' },
        escreve: 'bundle_do_app_publicar', falta: 'OK de publicacao',
        custo: 'retira o convite do mapa do papel: a aba deixa de existir para quem nao a pode usar, e a contradicao medida desaparece sem dar acesso a ninguem' },
    ] },
  { id: 'PEN-47', pergunta: 'As seis mesas com RLS e zero policies são mesas de máquina ou leitores perdidos?',
    opcoes: [
      { rotulo: 'escrever uma policy por mesa', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'ramo de DDL com preflight e conferencia como as pecas municipais, e supoe que existe um leitor para cada uma das seis mesas' },
      { rotulo: 'mesas de papel com bypass', ancora: { tipo: 'celula' },
        escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK,
        custo: 'ramo de decisao escrita, mas com o teste que a prova: leitura e escrita autenticadas e uma tentativa anonima recusada, gravadas em artefacto' },
    ] },
  { id: 'PEN-48', pergunta: 'O mecanismo que dá EXECUTE ao anónimo a funções criadas amanhã fica, ou é desmontado?',
    opcoes: [
      { rotulo: 'pg_default_acl', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'mexer em defaults nao muda o que ja existe: muda o que uma funcao nova herda, e por isso a prova e para a frente, nao para tras' },
      { rotulo: 'continuam decisoes proprias', ancora: { tipo: 'celula' },
        escreve: 'banco_ddl_ou_dml', falta: 'OK de aplicacao de DDL',
        custo: 'a reversao do revogar dos nomes e outra frase e outro alcance; as duas podem ser recusadas, e a recusa tambem fecha a decisao' },
    ] },
];

function lePredicasDoProdutor() {
  const src = fs.readFileSync(REPO + '/' + P133, 'utf8').split('\n');
  const rowsLine = src.find((l) => l.startsWith('const rows ='));
  const escLine = src.find((l) => l.startsWith('const ESCAPADO ='));
  const ledgerLine = src.find((l) => l.startsWith('const LEDGER ='));
  if (!rowsLine) throw new Error('ABORTA: nao li a predica `const rows` em ' + P133);
  if (!escLine) throw new Error('ABORTA: nao li `const ESCAPADO` em ' + P133);
  if (!ledgerLine) throw new Error('ABORTA: nao li `const LEDGER` em ' + P133);
  return {
    esc: vm.runInNewContext('(function(){' + escLine + ' return ESCAPADO;})')(),
    caminhoLedger: vm.runInNewContext('(function(){' + ledgerLine + ' return LEDGER;})')(),
    rows: vm.runInNewContext('(function(linhas){' + rowsLine + ' return rows;})'),
    predicado: rowsLine.trim(),
  };
}

function celulas(rows, esc) {
  const mapa = {};
  for (const r of rows) {
    const c = r.split(esc).join('@@').split('|');
    if (c.length !== 7) continue;
    mapa[c[1].trim()] = { item: c[2].trim(), tipo: c[3].trim(), pri: c[4].trim(), estado: c[5].trim().replace(/\s+/g, ' ') };
  }
  return mapa;
}

function tabela121(linhasDeLedger) {
  const ini = linhasDeLedger.findIndex((l) => /^### 12\.1 /.test(l));
  if (ini < 0) throw new Error('ABORTA: nao encontrei o cabecalho da seccao 12.1 no ledger');
  let fim = ini + 1;
  while (fim < linhasDeLedger.length && !/^##[^#]/.test(linhasDeLedger[fim]) && !/^###\s/.test(linhasDeLedger[fim])) fim++;
  const re = /^\| RM[0-9A-Za-z.:-]+[^|]*\|/;
  return linhasDeLedger.slice(ini, fim).filter((l) => re.test(l)).map((l) => {
    const c = l.split('|');
    return { entrada: c[1].trim().split(/\s+/)[0], medido: c[2].trim(), saida: c[3].trim(), texto: l };
  });
}

function leGrupoDeCaptura(caminho) {
  const txt = fs.readFileSync(caminho, 'utf8');
  const linha = txt.split('\n').find((l) => l.startsWith('grupos_por_quem_fecha='));
  if (!linha) throw new Error('ABORTA: nao li grupos_por_quem_fecha em ' + caminho);
  const g = JSON.parse(linha.slice('grupos_por_quem_fecha='.length));
  const families = Object.keys(g);
  const rotulo = families.find((k) => k.indexOf(ROTULO_DO_GRUPO) === 0);
  if (!rotulo) throw new Error('ABORTA: o grupo ' + ROTULO_DO_GRUPO + ' nao esta nas familias de ' + caminho);
  return { caminho, rotulo, ids: g[rotulo], familias: families, fora_do_grupo: families.filter((k) => k !== rotulo) };
}

function sufixoDe(caminho) {
  if (!caminho) return null;
  const m = String(caminho).split('/').pop().match(/-(sm\d+[a-z]?)\.[a-z]+$/);
  return m ? m[1] : null;
}

const RE_RM = '\\bRM-\\d+\\.\\d+\\b';
const RE_RM_ALT = '\\bRM\\d+-[A-Z]\\d\\b';

function monta(registro, grupo, cel, tab, folha, caminhos) {
  const p = [];
  const add = (nome, passa, obtido, esperado) => p.push({ nome, passa: !!passa, obtido, esperado });
  const idsFolha = folha.map((d) => d.id);
  const duplicados = idsFolha.filter((x, i) => idsFolha.indexOf(x) !== i);
  const foraDoGrupo = idsFolha.filter((x) => grupo.ids.indexOf(x) < 0);
  const semFolha = grupo.ids.filter((x) => idsFolha.indexOf(x) < 0);

  const classePorId = {};
  for (const a of registro.abertas) classePorId[a.id] = 'ABERTA';
  for (const f of registro.divergentes) classePorId[f.id] = 'DIVERGENTE';
  for (const f of registro.sem_declaracao) classePorId[f.id] = 'SEM_DECLARACAO';
  for (const f of registro.fechadas) classePorId[f.id] = 'FECHADA';
  const naoAbertas = idsFolha.filter((x) => classePorId[x] && classePorId[x] !== 'ABERTA');
  const semClasseLida = idsFolha.filter((x) => !classePorId[x]);

  add('o_grupo_e_lido_da_captura_do_p171_e_nao_dactilografado',
    grupo.ids.length > 0 && foraDoGrupo.length === 0,
    { rotulo_do_grupo: grupo.rotulo, lidos: grupo.ids.length, fora_das_linhas_pen: foraDoGrupo }, 'conjunto nao vazio, todo ele dentro das linhas PEN do ledger');
  add('nenhuma_linha_da_folha_fica_fora_do_grupo_e_nenhuma_linha_do_grupo_fica_fora_da_folha',
    duplicados.length === 0 && foraDoGrupo.length === 0 && semFolha.length === 0,
    { duplicados, fora_do_grupo: foraDoGrupo, sem_folha: semFolha }, 'os tres conjuntos vazios');
  add('toda_a_linha_da_folha_consta_ABERTA_no_registo_do_p133',
    naoAbertas.length === 0 && semClasseLida.length === 0,
    { nao_abertas: naoAbertas, sem_classe_lida: semClasseLida }, 'as duas listas vazias');
  add('cada_linha_da_folha_tem_pergunta_e_ao_menos_duas_opcoes',
    folha.every((d) => (d.pergunta || '').length > 8 && d.opcoes.length >= 2),
    { sem_pergunta: folha.filter((d) => !d.pergunta || d.pergunta.length <= 8).map((d) => d.id),
      com_uma_opcao: folha.filter((d) => d.opcoes.length < 2).map((d) => d.id) }, 'as duas listas vazias');
  const ancoradas = (d) => d.opcoes.filter((o) => o.ancora.tipo !== 'minha_leitura');
  add('ao_menos_uma_saida_por_linha_e_ancorada_num_texto_do_ledger',
    folha.every((d) => ancoradas(d).length >= 1),
    { linhas_so_com_minha_leitura: folha.filter((d) => ancoradas(d).length === 0).map((d) => d.id) }, 'lista vazia');

  const foraDaFonte = [];
  for (const d of folha) {
    for (const o of d.opcoes) {
      if (o.ancora.tipo === 'minha_leitura') continue;
      let alvo = null;
      if (o.ancora.tipo === 'celula') alvo = cel[d.id] ? cel[d.id].estado : null;
      if (o.ancora.tipo === 'item_pen') alvo = cel[d.id] ? cel[d.id].item : null;
      if (o.ancora.tipo === 'tabela_12_1') { const t = tab.find((x) => x.entrada === o.ancora.entrada); alvo = t ? t.texto : null; }
      if (alvo === null || alvo.indexOf(o.rotulo) < 0) foraDaFonte.push({ id: d.id, tipo: o.ancora.tipo, rotulo: o.rotulo });
    }
  }
  add('toda_a_saida_ancorada_existe_na_fonte_que_declara', foraDaFonte.length === 0, { fora_da_fonte: foraDaFonte }, 'lista vazia');

  const reRm = new RegExp(RE_RM, 'g');
  const reRmAlt = new RegExp(RE_RM_ALT, 'g');
  const rmsPorLinha = {};
  for (const d of folha) {
    const c = cel[d.id];
    const t = c ? c.item + ' ' + c.estado : '';
    rmsPorLinha[d.id] = [...new Set((t.match(reRm) || []).concat(t.match(reRmAlt) || []))];
  }
  const classesFora = [];
  for (const d of folha) for (const o of d.opcoes) if (!Object.prototype.hasOwnProperty.call(VOCAB_ESCRITA, o.escreve)) classesFora.push({ id: d.id, escreve: o.escreve });
  add('o_valor_escreve_de_cada_saida_pertence_ao_vocabulario_declarado_da_peca', classesFora.length === 0, { fora_do_vocabulario: classesFora }, 'lista vazia');

  const familiasFora = [];
  for (const d of folha) for (const o of d.opcoes) {
    if (o.falta !== SENTINELA_SEM_OK && grupo.familias.indexOf(o.falta) < 0) familiasFora.push({ id: d.id, falta: o.falta });
  }
  add('o_ok_que_falta_de_cada_saida_e_uma_das_familias_lidas_ou_a_sentinela_explicita', familiasFora.length === 0,
    { fora_das_familias_lidas: familiasFora, familias_lidas: grupo.familias }, 'lista vazia');

  const totalPorFlat = folha.reduce((n, d) => n + d.opcoes.length, 0);
  const totalPorClasse = Object.keys(VOCAB_ESCRITA).reduce((n, k) => n + folha.reduce((m, d) => m + d.opcoes.filter((o) => o.escreve === k).length, 0), 0);
  add('a_contagem_de_saidas_bate_por_duas_rotas_independentes', totalPorFlat === totalPorClasse,
    { por_flatmap: totalPorFlat, por_soma_de_classes: totalPorClasse }, 'os dois numeros iguais');

  const sReg = sufixoDe(caminhos.registro);
  const sCap = sufixoDe(caminhos.captura);
  add('registro_e_captura_sao_da_mesma_ronda_de_sufixo', sReg !== null && sReg === sCap,
    { registro: sReg, captura: sCap, sufixo_da_peca: SUF.replace('-', '') || null }, 'os dois caminhos de entrada com o mesmo sufixo de ronda');

  const entradasSemPen = tab.filter((t) => folha.filter((d) => rmsPorLinha[d.id].indexOf(t.entrada) >= 0).length === 0).map((t) => t.entrada);
  const mapaTabela = {};
  for (const t of tab) mapaTabela[t.entrada] = folha.filter((d) => rmsPorLinha[d.id].indexOf(t.entrada) >= 0).map((d) => d.id);

  return {
    portoes: p, mapaTabela, rmsPorLinha, totalPorFlat, entradasSemPen,
    registos_de_classe: {
      linhas_da_folha_sem_rm_lido_na_celula: folha.filter((d) => rmsPorLinha[d.id].length === 0).map((d) => d.id),
      entradas_da_tabela_que_nao_estao_na_folha: entradasSemPen,
      sentinela_sem_ok: SENTINELA_SEM_OK,
    },
  };
}

const PREDS = lePredicasDoProdutor();
const LEDGER_LINHAS = fs.readFileSync(REPO + '/' + PREDS.caminhoLedger, 'utf8').split('\n');
const ROWS = PREDS.rows(LEDGER_LINHAS);
const CEL = celulas(ROWS, PREDS.esc);
const TAB = tabela121(LEDGER_LINHAS);

if (FIXTURES) {
  const caminhos = { registro: process.env.P175_REGISTRO, captura: process.env.P175_CAPTURA };
  if (!caminhos.registro || !caminhos.captura) throw new Error('ABORTA: --fixtures precisa de P175_REGISTRO e P175_CAPTURA apontando para a ronda em curso');
  const registro = JSON.parse(fs.readFileSync(caminhos.registro, 'utf8'));
  if (ROWS.length !== registro.linhas_pen) throw new Error('ABORTA: rows=' + ROWS.length + ' e o registo declara linhas_pen=' + registro.linhas_pen);
  const grupo = leGrupoDeCaptura(caminhos.captura);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const casos = [];
  const roda = (nome, munda) => {
    const base = { folha: clone(DECISOES), registro, grupo, tab: TAB, caminhos };
    const alvo = munda ? munda(base) || base : base;
    const q = monta(alvo.registro, alvo.grupo, CEL, alvo.tab, alvo.folha, alvo.caminhos).portoes.filter((x) => !x.passa).map((x) => x.nome);
    casos.push({ nome, quebras: q });
  };
  roda('saida_da_folha_fora_do_grupo', (b) => {
    b.folha.push({ id: 'PEN-99', pergunta: 'pergunta fabricada para o fixture', opcoes: [
      { rotulo: 'rotulo um', ancora: { tipo: 'minha_leitura' }, escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK, custo: 'y' },
      { rotulo: 'rotulo dois', ancora: { tipo: 'minha_leitura' }, escreve: 'nada_fora_dos_meus_ficheiros', falta: SENTINELA_SEM_OK, custo: 'w' }] });
  });
  roda('linha_do_grupo_sem_folha', (b) => { b.folha = b.folha.slice(1); });
  roda('id_repetido_na_folha', (b) => { b.folha.push(clone(b.folha[0])); });
  roda('saida_inventada_fora_da_fonte', (b) => { b.folha[0].opcoes[0].rotulo = 'nome inventado por mim sem par no ledger'; });
  roda('classe_de_escrita_fora_do_vocabulario', (b) => { b.folha[1].opcoes[0].escreve = 'fogo'; });
  roda('familia_de_ok_fora_das_lidas', (b) => { b.folha[2].opcoes[0].falta = 'OK de enviar telegrama'; });
  roda('saida_unica_na_linha', (b) => { b.folha[3].opcoes = [clone(b.folha[3].opcoes[0])]; });
  roda('pergunta_curta_demais', (b) => { b.folha[4].pergunta = 'oi?'; });
  roda('linha_so_com_minha_leitura', (b) => { b.folha[5].opcoes.forEach((o, i) => { o.ancora = { tipo: 'minha_leitura' }; o.rotulo = 'rotulo ' + i; }); });
  roda('linhas_da_folha_constam_fechadas_no_registo', (b) => {
    const r = clone(registro); const mov = r.abertas.filter((a) => a.id === 'PEN-03' || a.id === 'PEN-06');
    r.abertas = r.abertas.filter((a) => a.id !== 'PEN-03' && a.id !== 'PEN-06');
    for (const m of mov) r.fechadas.push(m);
    b.registro = r;
  });
  roda('grupo_lido_com_ids_de_outro_grupo', (b) => { const g = clone(grupo); g.ids = ['PEN-01', 'PEN-02']; b.grupo = g; });
  roda('tabela_de_insumos_ignorada', (b) => { b.tab = []; });
  roda('rondas_diferentes_em_registro_e_captura', (b) => { b.caminhos = { registro: b.caminhos.registro, captura: b.caminhos.captura.replace(/-sm\d+[a-z]?\./, '-sm99z.') }; });
  roda('nada_mudado_nao_dispara', null);
  const negativos = casos.filter((c) => c.nome === 'nada_mudado_nao_dispara');
  const deviam = casos.filter((c) => c.nome !== 'nada_mudado_nao_dispara');
  const naoDispararam = deviam.filter((c) => c.quebras.length === 0);
  const disparouOndeNaoDevia = negativos.filter((c) => c.quebras.length > 0);
  const portoesBase = monta(registro, grupo, CEL, TAB, clone(DECISOES), caminhos).portoes;
  console.log('P175_FIXTURES casos=' + casos.length + ' portoes=' + portoesBase.length + ' portoes_vermelhos_na_base=' + portoesBase.filter((x) => !x.passa).length);
  for (const c of casos) console.log('  ' + c.nome + ' :: quebras=' + JSON.stringify(c.quebras));
  const familiasDeQuebra = new Set(casos.flatMap((c) => c.quebras));
  const verde = naoDispararam.length === 0 && disparouOndeNaoDevia.length === 0 && portoesBase.every((x) => x.passa);
  console.log('P175_FIXTURES_' + (verde ? 'OK' : 'VERMELHO') + ' familias_de_quebra=' + familiasDeQuebra.size + ' casos=' + casos.length + ' nao_dispararam=' + JSON.stringify(naoDispararam.map((c) => c.nome)) + ' disparou_no_negativo=' + JSON.stringify(disparouOndeNaoDevia.map((c) => c.nome)));
  process.exit(verde ? 0 : 1);
}

const registro = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const caminhos = { registro: args[0], captura: args[1] };
if (ROWS.length !== registro.linhas_pen) throw new Error('ABORTA: rows=' + ROWS.length + ' e o registo declara linhas_pen=' + registro.linhas_pen);
const grupo = leGrupoDeCaptura(args[1]);
const built = monta(registro, grupo, CEL, TAB, DECISOES, caminhos);
const vermelhos = built.portoes.filter((x) => !x.passa);
const emissor = fs.readFileSync(AQUI);
const emissorMd5 = createHash('md5').update(emissor).digest('hex');
const em = new Date().toISOString();
const contagemPorClasse = {};
for (const k of Object.keys(VOCAB_ESCRITA)) contagemPorClasse[k] = DECISOES.reduce((n, d) => n + d.opcoes.filter((o) => o.escreve === k).length, 0);
const arte = {
  peca: 'p175', rotulo: 'FOLHA DAS DECISOES HUMANAS', em, sufixo: SUF.replace('-', '') || null,
  emissor_bytes: emissor.length, emissor_md5: emissorMd5,
  fontes: { p133_para_as_predicas: P133, predica_de_fatiamento_lida: PREDS.predicado, ledger: PREDS.caminhoLedger,
    registro_p133: args[0], captura_p171: args[1], tabela_de_insumos: 'seccao 12.1 do ledger',
    regras_de_rm_lidas_como_constante_da_peca: [RE_RM, RE_RM_ALT] },
  grupo_medido: { rotulo: grupo.rotulo, ids: grupo.ids, familias_lidas: grupo.familias, fora_do_grupo: grupo.fora_do_grupo },
  vocabulario_de_escrita: VOCAB_ESCRITA,
  linhas_pen_no_registo: registro.linhas_pen, celulas_lidas_com_sete_colunas: Object.keys(CEL).length,
  linhas_da_tabela_de_insumos: TAB.length,
  saidas_da_tabela_por_linha_da_folha: built.mapaTabela,
  rms_lidos_de_cada_celula: built.rmsPorLinha,
  registos_de_classe: built.registos_de_classe,
  folha: DECISOES,
  contagens: {
    linhas_na_folha: DECISOES.length, saidas_totais: built.totalPorFlat,
    saidas_por_classe_de_escrita: contagemPorClasse,
    saidas_ancoradas_no_ledger: DECISOES.reduce((n, d) => n + d.opcoes.filter((o) => o.ancora.tipo !== 'minha_leitura').length, 0),
    saidas_de_minha_leitura: DECISOES.reduce((n, d) => n + d.opcoes.filter((o) => o.ancora.tipo === 'minha_leitura').length, 0),
    linhas_por_prioridade_lida_da_celula: DECISOES.reduce((o, d) => { const p = CEL[d.id] ? CEL[d.id].pri : '?'; o[p] = (o[p] || 0) + 1; return o; }, {}),
  },
  portoes: built.portoes,
  o_que_prova: 'que cada linha do grupo de decisao humana tem pergunta, pelo menos duas saidas e pelo menos uma saida cujo texto existe literalmente na fonte declarada; que as classes de escrita e as familias de OK estao dentro dos vocabularios lidos; que a conta de saidas bate por duas rotas; que registro e captura sao da mesma ronda.',
  o_que_NAO_prova: 'que alguma das saidas seja a certa, nem que a escolha feche a linha sem outro OK: nenhuma chamada de rede, nenhum SQL e nenhum deploy foram corridos por esta peca, e o custo de cada saida e a minha leitura, nao uma medicao.',
  veredito: vermelhos.length === 0 ? 'P175_FOLHA_OK' : 'P175_FOLHA_PARCIAL_VERMELHO',
};
console.log('peca=' + arte.peca + ' ' + arte.rotulo + ' em=' + arte.em + ' sufixo=' + (arte.sufixo || '-'));
console.log('emissor_bytes=' + arte.emissor_bytes + ' emissor_md5_8=' + emissorMd5.slice(0, 8));
console.log('grupo=' + arte.grupo_medido.rotulo + ' ids=' + arte.grupo_medido.ids.length + ' familias_lidas=' + arte.grupo_medido.familias_lidas.length + ' outras_familias=' + JSON.stringify(arte.grupo_medido.fora_do_grupo));
console.log('tabela_de_insumos_linhas=' + arte.linhas_da_tabela_de_insumos + ' celulas_lidas_com_sete_colunas=' + arte.celulas_lidas_com_sete_colunas + ' linhas_pen=' + arte.linhas_pen_no_registo);
console.log('contagens=' + JSON.stringify(arte.contagens));
console.log('registos_de_classe=' + JSON.stringify(arte.registos_de_classe));
for (const d of arte.folha) {
  console.log('');
  console.log('=== ' + d.id + ' · ' + (CEL[d.id] ? CEL[d.id].pri + ' · ' + CEL[d.id].tipo.replace(/\*\*/g, '') : 'sem celula lida') + ' ===');
  console.log('  PERGUNTA: ' + d.pergunta);
  d.opcoes.forEach((o, i) => {
    console.log('  SAIDA ' + (i + 1) + ' [' + o.ancora.tipo + (o.ancora.entrada ? ':' + o.ancora.entrada : '') + '] «' + o.rotulo + '»');
    console.log('            escreve=' + o.escreve + ' | ok_depois_da_escolha=' + o.falta);
    console.log('            custo: ' + o.custo);
  });
}
console.log('');
console.log('PORTOES:');
for (const x of arte.portoes) console.log('  ' + (x.passa ? 'ok' : 'VERMELHO') + ' ' + x.nome + ' :: ' + JSON.stringify(x.obtido));
console.log(arte.veredito + ' ' + (arte.portoes.length - vermelhos.length) + '/' + vermelhos.length);
fs.writeFileSync(OUT, JSON.stringify(arte, null, 1) + '\n');
console.log('guardado_em=' + OUT + ' bytes=' + fs.statSync(OUT).size);
if (vermelhos.length > 0) { console.log('P175_PARCIAL_VERMELHO portoes_vermelhos=' + vermelhos.length + ' nomes=' + JSON.stringify(vermelhos.map((x) => x.nome))); process.exit(1); }
