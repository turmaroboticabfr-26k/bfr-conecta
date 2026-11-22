# 10 — Runbook municipal: a ordem, os comandos, o OK que cada passo exige

Peça do pacote BU (análise, compreensão e documentação completa do BFR Conecta). **Nada deste documento foi
executado.** Ele existe porque as peças certificadas (preflights, candidatas, reversões, o aplicador e a porta
de etiquetagem) já estavam todas escritas e separadas, e «deixar pronto» sem ordem de aplicação deixaria ao
utilizador a parte irreversível. Todos os números abaixo são lidos dos artefactos nomeados, com o campo
indicado, e não da memória de quem escreve.

A regra de autorização deste pacote é a mesma em todos os passos: **uma frase literal por passo, e a frase de
um passo não autoriza o passo seguinte.** Um «ok» solto não autoriza escrita no banco nem publicação; está
provado por recusa em `evidence/p73-municipal-aplica-ddl-recusa-ok-solto.json` (`aplicado: false`, motivo
`um «ok» solto nao autoriza escrita no banco`).

## 0 · Estado de partida medido (20/11, só leitura)

| Grandeza | Valor hoje | De onde se lê |
|---|---|---|
| Concessões municipais activas | 4 | `evidence/p73-pen38-preflight-candidata-20-11e.json` → `numeros.concessoes_ativas` |
| Linhas em `bfr_municipalities` | 1, e é fixture | mesmo artefacto → `numeros.municipios`, `numeros.municipios_de_fixture` |
| Escolas | 6, **0** com `municipality_id` | mesmo artefacto → `numeros.escolas`, `numeros.escolas_com_municipio` |
| Pontes `bfr_school_key_map` confirmadas | 3 | mesmo artefacto → `numeros.pontes_confirmadas` |
| Dados reais sem RLS | `schools` 6 · `students` 848 · `classes` 27 · `staff_schools` 6 · `grades` 112 | `evidence/p73-pen38-alcance-por-concessao-20-11e.json` → `reais_sem_rls` |
| Agregados municipais consumidos pelo ar | 0 nomes, 0 chamadas | `evidence/p73-pen39-preflight-candidata-20-11e.json` → `numeros.linhas_da_vista_por_esta_via`, portão `nenhum_nome_da_candidata_e_consumido_pelo_modulo_servido…` |
| Policies de `students`/`classes` por cargo sem escopo de escola | 4 (`director_dashboard_read_students`, `director_dashboard_read_classes`, `students_select_secretary`, `classes_select_secretary`) | `evidence/p73-pen41-preflight-candidata-20-11e.json` → `policies_das_quatro` |
| Objectos novos das três candidatas no banco | **0 no instante de partida** — nada aplicado; ver §0A para o estado depois da aplicação de 20/11 | os três vereditos abaixo, todos em modo `candidata` |
| v137 (remendo PEN-40) | `publicado: false` | `evidence/v137-gera-bundle-20-11.json` → `publicado`, `ok_literal` |

Vereditos frescos dos três preflights, em modo candidata, à hora em que este pacote fecha:

```
P73_PEN38_PREFLIGHT_VERDE_CANDIDATA 10/0
P73_PEN39_PREFLIGHT_VERDE_CANDIDATA 11/0
P73_PEN41_PREFLIGHT_VERDE_CANDIDATA 13/0
```

Isto é um verde **no instante em que foi tirado**. Antes de qualquer passo de escrita, o passo é re-corrido
(§2), e é o verde re-corrido que manda, não este.

## 0A · Estado depois da aplicação de 20/11 — PEN-38 e PEN-39 aplicadas, PEN-41 não

O pedido foi «aplique o que falta», que nomeia o verbo mas não a peça. A resposta foi uma pergunta de estado
lido (os três preflights verdes, nada aplicado, o ar na v136) com o custo de cada escopo medido, e a escolha
foi **as duas peças aditivas, deixando a PEN-41 de fora** — é a única que tira leitura a gente real. Frases
usadas, uma por peça, no aplicador: `APLICAR PEN-38 NO BANCO` e `APLICAR PEN-39 NO BANCO`.

| Grandeza | Partida (§0) | Depois (medido nesta passada) | De onde se lê |
|---|---|---|---|
| Funções das candidatas no catálogo | 0 | **4** (`bfr_school_set_municipality`, `bfr_municipal_scope_diagnostico`, `bfr_municipal_municipio_totais`, `bfr_municipal_distribuicao_por_zona`) | `evidence/p73-sonda-exposicao-anonima-20-11-pos-pen39.json` → `nomes_das_duas_candidatas`, `catalogo` |
| Policies de `schools` | 2 | **3** (`schools_municipal_read` com o predicado de escopo, `schools_platform_admin_read` nova, `schools_supervisor_read` intacta) | `evidence/p73-pen38-preflight-reversao-20-11e-pen38-pos-aplicacao.json` → `policies_schools` |
| Linhas de dado movidas | — | **0**: baselines 6/848/27/28/6 idênticas antes e depois nas duas peças | `evidence/p73-municipal-aplicacao-PEN-38-20261120T224555Z.json` e `evidence/p73-municipal-aplicacao-PEN-39-20261120T225656Z.json` → `baselines` |
| Escolas com município | 0 | **0** — a etiquetagem continua por decidir (§1) | `numeros.escolas_com_municipio` dos mesmos artefactos |
| Executabilidade por `anon` | não se aplicava | **4 de 4 com `anon=X`**, e o diagnóstico devolve ao anónimo 1 linha com três inteiros de rede | `evidence/p73-sonda-exposicao-anonima-20-11-pos-pen39.json` → virou a linha **PEN-43** |

Vereditos desta passada, todos com registo em `evidence/`:

```
P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-38 (com vermelho de régua no meio — abaixo)
P73_REGUA_ASSINATURA_VERDE 13/0
P73_PEN38_PREFLIGHT_VERDE_REVERSAO 10/0
P73_PEN38_ALCANCE_OK 13/0
P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-39
P73_PEN39_PREFLIGHT_VERDE_REVERSAO 11/0
P73_EXPOSICAO_ANONIMA_VERDE 6/0 · 3 chamadas · 4 de 4 com anon=X
P73_USO_QUATRO_NA_V136_VERDE 6/0 · 4 nomes · 0 ocorrencias
```

**O vermelho que a aplicação deu, e por que não era do banco.** O aplicador escreveu, as baselines não se
mexeram, e a conferência de saída — o preflight em modo `--reversao`, que afirma que o estado vivo é o estado
de saída da candidata — saiu `P73_PEN38_PREFLIGHT_VERMELHO_1` com `rpc_de_etiquetagem_la:false`
(`evidence/p73-pen38-preflight-reversao-20-11e-apl20261120T224555Zr-VERMELHO.json`, conservado com o motivo da
corrida no nome, porque é a peça que prova que a régua consertada distingue). O catálogo
dizia o contrário: a função estava lá. A causa era a minha régua: `ftem` comparava a agulha `'uuid, uuid, text'`
contra `pg_get_function_identity_arguments`, e esta build devolve os argumentos **com os nomes dos parâmetros**
(`p_school uuid, p_municipality uuid, p_reason text`), pelo que o portão não tinha positivo possível — e, como
em modo candidata a mesma agulha entra negada, também não tinha negativo. É a forma agregada da família «régua que se move com o medido»: um predicado cujo casamento depende de uma propriedade que o medido nunca
pode ter.

O conserto não alivia o predicado: a assinatura esperada passa a ler-se do `CREATE FUNCTION` do ficheiro que a
declara (`scripts/p73-assinatura-lib.mjs`, usado por `scripts/p73-pen38-preflight.mjs`), e o verificador
`scripts/p73-verifica-regua-de-assinatura.mjs` fixa os dois sentidos com 6 casos de esperado falso (tipo
trocado, aridade trocada, parâmetro com `default`, tipo de duas palavras a mais) e calcula, em vez de
afirmar, que a régua velha não casava com o que a build devolve. Depois do conserto: modo `reversao`
`10/0` e, no controlo, modo `candidata` a chumba exatamente em
`estado_vivo_bate_com_o_que_este_modo_pressupoe` e `nenhuma_policy_de_escolas_vai_ser_apagada_por_acaso`
(`evidence/p73-pen38-preflight-candidata-20-11e-pen38-controlo-pos-aplicacao-VERMELHO.json`) — ou seja, a
régua agora distingue, e re-aplicar esta candidata fica bloqueado pelo portão de entrada, que é o desenho a
funcionar e não um obstáculo a contornar.

O que **não** mudou com esta passada: a tela. Nenhum dos quatro nomes é chamado pelo módulo servido — medido,
não inferido, por `scripts/p73-sonda-uso-quatro.mjs` (`P73_USO_QUATRO_NA_V136_VERDE 6/0`, registo
`evidence/p73-sonda-uso-quatro-na-v136-20-11.json`): os quatro nomes leem-se dos `CREATE FUNCTION` das duas
candidatas, a pegada servida bate com a que o `audit-publicacao-v136.json` registou, e as ocorrências são 0
dentro do invólucro `data-bfr-municipal-module` e 0 na página inteira, contra 12 chamadas de backend que o
módulo faz e nenhuma delas um dos quatro. Uma destas corridas tem positivo e negativo possível: quando a v138
publicar o consumidor, `nenhum_dos_quatro_nomes_aparece_no_modulo_servido` fica vermelho, e é a frase deste
parágrafo que se re-escreve — não a régua. O painel municipal continua a ser código de produto (§5, v138), e a
etiquetagem continua à espera da decisão do §1. A PEN-41, não autorizada, continua por aplicar; o seu §3.2 só
passa a ser obrigatório no dia em que ela o for.



## 0B · Estado re-medido no fecho desta passada (20/11, 23:42–23:53 UTC, só leitura)

O pedido foi «resolva todas as pendencias», que nomeia o verbo e não a peça: as medidas abaixo foram tiradas para
dizer o que está feito, o que está pronto e o que continua a pedir frase literal. Nenhuma escrita no banco,
nenhum deploy, nenhum mint, nenhum push nesta passada.

| Grandeza | Valor re-medido | Artefacto (todos com o `em` da corrida dentro) |
|---|---|---|
| Shell servida pelo ar | `9e236a23eed978cf7c2a2743d449b307`, 3 547 458 B — **ainda a v136** | `evidence/p73-pen38-alcance-por-concessao-20-11e-20-11h.json` → `servido` |
| Dados reais sem RLS | `schools` 6 · `students` 848 · `classes` 27 · `grades` 112 · `bfr_lesson_attendance` 268 | mesmo artefacto → `reais_sem_rls` (idêntico ao de partida, §0) |
| Estado municipal | 4 concessões ativas, 1 município, **0** escolas com `municipality_id` | mesmo artefacto → `estado_municipal` |
| Folha de etiquetagem | 6 escolas, 0 etiquetadas, 1 município (fixture), 1 aviso de fixture | `evidence/p73-municipal-etiqueta-lista-20-11-20-11h.json` → `veredito` |
| PEN-41 em modo candidata | `P73_PEN41_PREFLIGHT_VERDE_CANDIDATA 13/0` em 14 045 ms | `evidence/p73-pen41-preflight-candidata-20-11e-20-11h.json` |
| A quem a PEN-41 tira leitura | `director` 2 perfis, 2 com vínculo; `secretary` 4 perfis, 2 com vínculo e **2 sem vínculo** | mesmo artefacto → `populacao_afectada` |
| Grau de execução vivo das 4 funções novas | 4 de 4 com `anon=X`, `public` não explícito, ACL não nula, dono `postgres`, `SECURITY DEFINER` | `evidence/p73-sonda-exposicao-anonima-20-11-20-11h.json` → `catalogo`, `acl_anon_tem_executar` |
| O que um caller sem sessão recebe | 3 chamadas, todas 200: os dois agregados com **0 linhas**, o diagnóstico com 1 linha e zero identificadores de linha | mesmo artefacto → `chamadas_anonimas` (`tem_uuid:false`, `tem_coluna_id:false`) |
| Candidata PEN-43 | `P73_PEN43_CANDIDATA_OK 8/0`, duas vezes, com os dois SQL byte a byte iguais entre corridas | `evidence/p73-pen43-gera-candidata-20-11e-20-11h.json` e `evidence/p73-pen43-gera-candidata-20-11e-20-11h-recorre.json` → `arquivos` |

Os quatro primeiros itens são **os mesmos números do §0 e do §0A**, o que é a conferência de que esta passada não
mexeu no mundo: a etiqueta continua por decidir, o ar continua na v136, e as políticas alvo da PEN-41 continuam sem
cláusula de escola. A diferença está em baixo nesta tabela: a PEN-43 tem agora candidata escrita e certificada, e o
consumidor dos agregados da PEN-39 tem candidata, bundle e peça de fecho escritos (§2.7, §2.8).

Sobre os 0 linhas dos agregados chamados por `anon`: é o caso em que a revogação **não** muda a quantidade de dados
que hoje se vê — o município de ninguém tem 0 escolas — mas muda a promessa: as duas funções são `STABLE` e
`SECURITY DEFINER`, por isso o que hoje sai vazio pode sair preenchido no dia em que a etiquetagem for decidida,
sem um único `GRANT` novo no meio. É essa a razão de a candidata existir antes da decisão do §1.

## 0C · Estado depois da aplicação de dados municipais de 21/11 (P91→P93, com OK próprio)

O pedido que abriu esta passada foi «tudo o que estiver faltando resolva, tem o meu ok», e o alcance ficou nas
três escolhas registadas na ferramenta: **só fechar o painel** (a frente, publicada como v142), **manter** as
quatro concessões municipais das contas reais, e **nenhum** dos desaconselhados (nem reverter PEN-43/PEN-44, nem
o `secretaria-municipal` no array estático do `teacher`, nem rotação de senhas). Não há DDL novo nesta secção: o
que mudou no banco foi a etiqueta de município, e isso é o §1 decidido com registo.

| Grandeza | 20/11 (§0B, preflight da PEN-38) | 21/11 depois do P92 | De onde se lê |
|---|---|---|---|
| Escolas com `municipality_id` | **0** | **4** | `evidence/p73-pen38-preflight-candidata-20-11e.json` → `numeros` / `evidence/p92-dados-municipais-c.json` → `depois.escolas` |
| Municípios | 1 (só a fixture) | **2** (a fixture + `São Paulo`/SP) | mesmo par → `depois.municipios` |
| Concessões ativas | 4 | **5** | mesmo par → `depois.grants` |
| Policies alvo com cláusula de escola | 0 | **0** (PEN-41 continua por aplicar) | `scripts/pacote-municipal-confere-pecas.mjs` → `vivo` |

A corrida tem três peças e não uma: `scripts/p92-dados-municipais.mjs` em `--preflight` deu primeiro
`P92_DADOS_MUNICIPAIS_PREFLIGHT_VERMELHO 2 de 12` (`evidence/p92-dados-municipais-a.json`, 17:38:54Z), depois
verde (`evidence/p92-dados-municipais-b.json`, 17:39:49Z) e só então `--aplicar`, com
`P92_DADOS_MUNICIPAIS_APLICADO_E_CONFERIDO 12/0` (`evidence/p92-dados-municipais-c.json`, 17:40:14Z). O que o
registo declara escrito, linha a linha: `bfr_municipalities` com 1 linha `São Paulo`/SP id
`cde2740e-9f09-45a5-9cd6-6ee3d6b17268`, `schools.municipality_id` com 4 linhas ligadas a esse id, e
`bfr_municipal_access_grants` com 1 linha (`education_supervisor` → `secretario_municipal`, id
`cf6fac96-8464-4d71-9991-f2ba10f7e565`). As duas linhas que ficam de fora são as duas escolas cujo `city` não é
São Paulo — o município deriva-se de `schools.city`, não se inventa.

O que **não** correu, e por isso continua a poder correr: a reversão. O caminho existe e está no índice
(`scripts/p92-reversao-dados-municipais.sql`), mas a família `evidence/p92-*revers*` tem **0** ficheiros medidos
por `readdirSync`, pelo que a frase «os 4/2/5 acima são o estado vivo e não o resto de uma meia-desfeita» tem
prova. É também por isto que o portão do pacote deixou de comparar o banco com o preflight de 20/11: essa
cláusula era um «ainda não aplicado» e envelheceu no dia da autorização. O esperado passou a ler-se do `depois`
do registo de aplicação, e os dois vermelhos continuam vivos — o mundo a mexer sem registo novo (inclusive uma
reversão corrida sem artefacto) e um registo que promete o que o mundo não tem. A falsificação dos dois sentidos
está no portão `a_regua_do_estado_de_dados_tem_dentes_e_o_preflight_deixa_de_ser_o_esperado`.

Antes disto, o censo de quem são os concessionários (`evidence/p91-censo-concessionarios-a.json`) respondeu
`P91_CENSO_CONCESSIONARIOS_VERMELHO 1 de 7`, e a falha é uma só, lida no emissor:
`nenhum_concessionado_tem_apenas_papel_de_escola`, com `todos=["secretary","secretary","coordinator","pending"]`
e `fora=["secretario_municipal<-secretary","secretario_adjunto<-secretary","gestor_autorizado<-coordinator",
"equipe_administrativa<-pending"]`. Ou seja: os quatro perfis que hoje têm concessão municipal têm, ao mesmo
tempo, um papel de escola — o censo recusa a sobreposição, e o que ela prova é que nenhuma das quatro foi criada
como conta municipal dedicada. A fixture `Sao Paulo (SM8 fixture — apagar)` é o outro lado do retrato, e continua
viva porque as quatro concessões antigas apontam para ela (§5.2). A prova no browser das três corridas está em
`evidence/p93-porta-mapa-vs-backend-a.json`, `-b.json` e `-c.json`.

## 1 · A decisão que o banco não pode tomar por nós

Há uma única coisa neste pacote que não é técnica: **que município governa cada escola.** A folha está medida e
vazia de propósito, em `evidence/p73-municipal-etiqueta-lista-20-11.json` (`modo: lista`, 6 escolas, todas com
`decidir_municipio: true`):

| Escola | Cidade/UF | Alunos | Turmas | Município |
|---|---|---|---|---|
| Escola Municipal Alpha | São Paulo/SP | 848 | 27 | **a decidir** |
| Escola Municipal Beta | São Paulo/SP | 0 | 0 | **a decidir** |
| Escola Municipal Gamma | São Paulo/SP | 0 | 0 | **a decidir** |
| Escola Alpha | São Paulo/SP | 0 | 0 | **a decidir** |
| Escola Beta | Rio de Janeiro/RJ | 0 | 0 | **a decidir** |
| Escola Gamma | Belo Horizonte/MG | 0 | 0 | **a decidir** |

E o único município que existe: `Sao Paulo (SM8 fixture — apagar)`/SP, com `code_ibge` nulo, **4 concessões** e
**0 escolas ligadas** (`municipios.linhas[0]`, mesmo artefacto; a régua que o detecta é `regua_fixture`, que
inclui o fixture `disparou_no_nome_medido_em_disco` para o caso de o nome mudar e a varredura deixar de o ver).

Três opções, com o custo de cada uma dito antes de escolher:

1. **Criar o município real** (nome, UF, `code_ibge` do IBGE) e etiquetar as escolas para ele. É a única opção
   em que o escopo sobrevive ao apagar da fixture. O `INSERT` do município **não** tem peça neste pacote: é
   escrita de conteúdo e pede instrumento e OK próprios (ver §5).
2. **Etiquetar para a fixture** com `--aceita-fixture`. Funciona, dá números na tela, e deixa o módulo inteiro
   dependente de uma linha que o próprio nome declara descartável. A porta recusa esta opção sem a flag
   explícita, e a recusa está medida (`evidence/p73-municipal-etiqueta-stdout-recusas-20-11.txt`, recusa 3).
3. **Não etiquetar nada.** As candidatas continuam aplicáveis — o PEN-38 bloco A fica correcto e vazio, o
   PEN-41 aperta a leitura de `students`/`classes` ao vínculo de `staff_schools` (que existe e está medido) e o
   módulo municipal mostra zeros honestos. É a opção em que nada deste pacote fica bloqueado.

O que nenhuma opção faz: encher `municipality_id` por inferência. As pontes `bfr_school_key_map` são
auto-pontes (mesmo nome dos dois lados), por isso não há dedução disponível — foi o que mediu o censo de
`numeros.pontes_confirmadas` acima.

## 2 · A ordem de aplicação

Cada passo tem: comando, artefacto que o valida, o OK literal que o autoriza, e o que um vermelho significa.
Os quatro primeiros passos são só-leitura ou recusados por omissão, por isso correm hoje sem OK nenhum.

### 2.0 · Conferir o pacote antes de tocar em seja o que for

```
node scripts/pacote-municipal-confere-pecas.mjs
node scripts/p73-municipal-aplica-ddl.mjs --selfteste
node scripts/p73-municipal-etiqueta.mjs --selfteste
P73_SUF=<sufixo-ainda-nao-usado> node scripts/p73-municipal-etiqueta.mjs --lista
```

Os dois instrumentos que escrevem registo (`--lista` do etiquetador e o portão do pacote) abortam se o ficheiro
de destino já existir, pelo que `P73_SUF` é sempre um sufixo novo — não é burocracia: é a guarda de que nenhuma
corrida apaga a evidência da anterior.

*OK necessário:* nenhum — os quatro correm em leitura ou em modo de recusa.
*Verde esperado:* `PACOTE_MUNICIPAL_OK` com o censo de portões lido do registo daquela corrida, na corrida que já
varre o corpus com o modo de reversão de §4:
stdout `evidence/pacote-municipal-stdout-pos-modo-reversao-20-11.txt`, registo
`evidence/pacote-municipal-pecas-20-11-pos-modo-reversao.json`. A corrida anterior,
`evidence/pacote-municipal-pecas-20-11-pos-pacote-completo-no-indice.json` (stdout
`evidence/pacote-municipal-stdout-pos-pacote-completo-no-indice-20-11.txt`), é a mesma régua sobre um corpus que
ainda não conhecia as recusas de §4 e fica como história. O segundo verde é o do aplicador,
`P73_MUNICIPAL_APLICA_SELFTESTE_OK 13/0` (desde 20/11 em corrida própria, stdout
`evidence/p73-municipal-stdout-selfteste-aplicador-com-reversao-20-11.txt`, que é a corrida anterior mais os
casos do modo de reversão de §4: os seis SQL em disco medidos um a um, as seis frases certificadas e o facto de
`DROP FUNCTION` contar sem chumbar).
`P73_MUNICIPAL_ETIQUETA_SELFTESTE_OK 6/0` e `P73_MUNICIPAL_ETIQUETA_LISTA 6 escolas, 0 etiquetadas, 1 municipios, 1 avisos de fixture` —
estes dois últimos na mesma corrida capturada em `evidence/p73-municipal-stdout-selftestes-e-lista-20-11.txt`,
que traz também o `ABORTA` da guarda quando o sufixo se repetiu. Aquele ficheiro continua a ser a prova da
corrida em que foi versionado (`84aa3af`, 20/11) e por isso mostra `P73_MUNICIPAL_APLICA_SELFTESTE_OK 7/0`: é
história, não o verde de hoje, e a razão de as duas capturas coabitarem é precisamente não re-escrever por cima
duma evidência versionada.
Desde 20/11 o corpus do portão são **dois** documentos, e não só este: `docs/bu-20-11/08-plano-de-prioridades.md`
passou a ter um §11 que nomeia scripts e evidências deste pacote, e um corpus que não cresce com a prosa é o
portão que varre metade das promessas e chama verde ao resto.
O censo de peças medidas vai no fim do veredicto e não nesta frase: cresce com o corpus que a prosa cita, por
isso não se pinha aqui — piná-lo obrigaria a re-escrever esta frase a cada caminho acrescentado, e foi
exactamente assim que a versão anterior deste parágrafo ficou ultrapassada (a corrida preservada em
`evidence/pacote-municipal-pecas-20-11-ANTERIOR-a-prosa-do-runbook-pinhava-o-censo-de-pecas-medidas.json`
media 29 e o corpus tinha crescido para 32). Os números dos vereditos são função dos portões escritos nos
instrumentos, não uma promessa sobre o mundo, e é por isso que o censo de casos do aplicador não é escrito aqui:
mudou em 20/11 com o modo de reversão, e uma soma nesta página envelhece no dia em que alguém acrescenta um caso
ao `--selfteste`. Ao treze original de portões do pacote juntaram-se, por esta ordem e cada um com a sua
falsificação na tabela abaixo, `cada_ficheiro_do_corpus_despe_pelo_menos_um_caminho` e
`os_fantasmas_da_prosa_continuam_fantasmas_declarados`, depois `nenhum_caminho_citado_fica_fora_do_git` (§2.0.1)
e `os_fora_do_indice_por_decisao_continuam_decididos`. Nesta passada entraram mais cinco, todos sobre as peças
novas: `a_v138_continua_nao_publicada_com_a_frase_de_OK_declara`,
`a_v138_tem_candidata_e_bundle_verdes_com_a_prova_de_ar_escrita`,
`o_bundle_v138_empilha_o_remendo_da_pen40_e_muda_a_shell`,
`a_v138_chama_os_dois_nomes_que_o_DDL_da_PEN39_declara` e
`toda_peca_sem_registo_tem_motivo_no_corpus_e_apagar_a_frase_e_vermelho`. As quatro primeiras lêem vereditos de
artefactos e nomes de `CREATE FUNCTION` de ficheiros SQL; a última foi re-escrita a meio desta passada, porque na
primeira forma comparava um literal deste script consigo próprio — tautologia sem vermelho possível — e passou a
exigir a frase no corpus, com o procurador corrido duas vezes: uma sobre o corpus real e outra sobre uma cópia com
as marcas apagadas, onde não encontrar nada é o lado verde do dente. O dígito de cada corrida lê-se no registo
daquela corrida, e é por isso que esta frase nomeia cláusulas em vez de pinhar somas — uma soma escrita aqui
envelhece no dia em que alguém escreve um portão novo.

**A cláusula que a aplicação de 20/11 aposentou, e o que entrou no lugar dela.** `nenhuma_funcao_das_candidatas_existe_ainda_no_banco`
era uma promessa sobre um estado que deixou de existir: com a PEN-38 e a PEN-39 aplicadas, o catálogo devolve
quatro nomes e o portão ficaria vermelho para sempre, ou verde se eu o apagasse — nenhuma das duas hipóteses descreve
o mundo. Saiu, e entraram duas cláusulas derivadas, mais os dentes delas na mesma corrida:
`o_banco_tem_as_funcoes_das_pecas_com_registo_e_somente_essas` compara o que `pg_proc` devolve com a união dos
`CREATE FUNCTION` das candidatas deste pacote — os ficheiros enumeram-se do disco pelo prefixo `scripts/p73-pen`
seguido do número da peça e de `-ddl-candidata.sql`, não dactilografados; um registo a mais no índice
sem o DDL aplicado, ou um nome no banco sem registo, são os dois vermelhos possíveis);
`os_registos_de_aplicacao_batem_com_as_candidatas_em_disco_e_com_a_saida_do_preflight_de_entrada` exige que a
candidata certificada por cada registo seja a que está em disco, byte a byte, com o preflight de entrada a ter
saído 0; e `a_regua_do_estado_de_aplicacao_tem_dentes_e_o_mundo_real_e_o_normal` calcula os dois mundos
fabricados — a peça de menor número sem registo, e o md5 da candidata trocado — porque esta família de cláusulas
não depende do corpus, logo nenhuma cópia estragada do runbook a podia disparar. A primeira corrida desta quinta
linha deu vermelho no próprio portão dos dentes
(`evidence/pacote-municipal-pecas-20-11-VERMELHO-o-esperado-dizia-o-valor-do-fixture-e-nao-a-clausa-com-a-negacao-ja-dentro.json`,
27 022 B, `10d48eb3c303a4c86c9343feb9177421`): eu escrevi no vector esperado o valor cru do fixture (`false`) em
vez da cláusula que já traz a negação dentro de si, e um portão assim não pode nunca estar verde. O registo novo
declara também a classe com conjunto vazio — `pecas_sem_registo_de_aplicacao`, que nessa corrida de 20/11 imprimiu
`PEN-41` e `PEN-43`, ambas com
`nomes_na_candidata: []` impresso: nenhuma das duas cria função alguma (a PEN-41 aperta policies, a PEN-43 revoga
execução sobre nomes já criados pela PEN-39), por isso o vermelho delas não pode vir deste portão e sim, para a
PEN-41, de `as_policies_alvo_existem_e_nenhuma_tem_escopo`, e para a PEN-43 do portão do §2.7 que exige que o `anon`
continue com `X` no catálogo vivo até a peça ser aplicada. **A classe é função do instante, não deste documento:** a
lista de hoje lê-se cruzando os dois conjuntos em disco — as candidatas `scripts/p7\d-pen\d+-ddl-candidata.sql` contra
os registos `evidence/p73-municipal-aplicacao-PEN-*-*.json` — e dá `PEN-41` e `PEN-48`: a PEN-43 saiu da lista às
07:31:57Z de 21/11 com `P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-43` (§2.7), a PEN-44 entrou e saiu no mesmo bloco
(§2.10) e a PEN-42 saiu às 01:41:56Z de 22/11 UTC (§2.11). O motivo de cada peça sem registo passou a ser
frase deste documento, com marcador próprio, e não uma linha do script — ver as duas linhas `MOTIVO-SEM-REGISTO`
abaixo (§2.5 e §2.12).
O segundo portão existe porque o documento 08 cita `scripts/bu4-digestao-para-documentacao-20-11.mjs`, que não
existe — e não existe *por declaração*: a linha ao lado diz que é o nome do output, não o do script. A
excepção não é uma lista de nomes tolerados; é a exigência de que a frase declarante continue no corpus, e foi
provada a cair (abaixo).
*Dentes do portão, provados* — cinco falsificações, cada uma com o nome do portão que disparou, todas exit 1:

| corpus estragado de propósito | portão vermelho | registo | stdout |
|---|---|---|---|
| dois caminhos inventados neste runbook | `nenhum_caminho_citado_falta_em_disco` (nomeia os dois) | `evidence/pacote-municipal-pecas-20-11-falsificacao-corpus-duplo.json` | `evidence/pacote-municipal-falsificacao-corpus-duplo-stdout-20-11.txt` |
| um ficheiro do corpus sem nenhum caminho | `cada_ficheiro_do_corpus_despe_pelo_menos_um_caminho` (`[false,true,true]`) | `evidence/pacote-municipal-pecas-20-11-falsificacao-corpus-mudo.json` | `evidence/pacote-municipal-falsificacao-corpus-mudo-stdout-20-11.txt` |
| a frase que declara o fantasma apagada, nome do fantasma mantido | `os_fantasmas_da_prosa_continuam_fantasmas_declarados` (`[[false,false]]`) | `evidence/pacote-municipal-pecas-20-11-falsificacao-fantasma-sem-declaracao.json` | `evidence/pacote-municipal-falsificacao-fantasma-sem-declaracao-stdout-20-11.txt` |
| dois caminhos acrescentados ao corpus, um de cada classe de «não está no índice» | `nenhum_caminho_citado_fica_fora_do_git` (`7 esquecidos de 2309 fichas`, `ignorados_por_designio=1`) | `evidence/pacote-municipal-pecas-20-11-falsificacao-fora-do-indice.json` | `evidence/pacote-municipal-falsificacao-fora-do-indice-stdout-20-11.txt` |
| as duas frases que declaram a decisão de ficar fora do índice apagadas, nomes mantidos | `os_fora_do_indice_por_decisao_continuam_decididos` (`[[true,false,false,false],[true,false,false,false]]` contra `[true,false,false,true]` duas vezes) | `evidence/pacote-municipal-pecas-20-11-falsificacao-declaracao-apagada-eixo-unico.json` | `evidence/pacote-municipal-falsificacao-declaracao-apagada-eixo-unico-stdout-20-11.txt` |

A primeira corrida desta quinta linha deu `2 de 17 portoes` e não `1`: além do portão desejado levou o do índice,
porque eu ainda não tinha metido no índice seis capturas que a própria prosa nova citava. Não a versiono e digo
porquê: é o mesmo instrumento e o mesmo corpus, com um estado de índice que já não existe, e versionar um vermelho
ultrapassado ao lado da re-corrida de eixo único era dar ao leitor dois números para um facto. O registo dessa
corrida intermédia fica versionado com o nome do achado que ele é
(`evidence/pacote-municipal-pecas-20-11-pos-classe-de-decisao.json`: um de dezassete portões, só
`nenhum_caminho_citado_fica_fora_do_git`, seis esquecidos, e a cláusula nova já verde com
`por_decisao_assinada 2 de 2`) — é o buraco real das capturas da própria sessão, descoberto pela cláusula que
escrevi para o fechar.

As cópias estragadas vivem fora do repo (directório de trabalho da sessão), por isso não são caminhos que a
sonda verifique: o que fica versionado é o registo de cada corrida, que traz a lista exacta do que foi lido.
A primeira versão desta terceira linha abortou antes de chegar aos portões, com `ENOENT` num caminho que o
shell tinha reescrito — o defeito era meu, da ordem dos argumentos, não do portão; a corrida está preservada em
`evidence/pacote-municipal-falsificacao-corpus-mudo-stdout-20-11-ERRO-minha-ordem-de-argv-convertida-pelo-bash.txt`
e a forma que funciona é o caminho absoluto **primeiro** na lista. O vermelho de dois caminhos inventados
tirado antes do corpus duplo (`evidence/pacote-municipal-pecas-20-11-VERMELHO-esperado-falsificacao-do-corpus-com-dois-caminhos-inventados.json`,
`1 de 13 portoes`) fica como história; a re-corrida com o corpus actual é a linha 1 da tabela.
Sem estas cinco corridas, o verde do portão não se distinguia de um portão que varre uma lista vazia.
*Re-corridas:* cada linha que se acrescenta ao corpus obriga a voltar a correr o portão, e ele voltou verde na
série (`evidence/pacote-municipal-pecas-20-11-corpus-duplo.json`,
`evidence/pacote-municipal-pecas-20-11-fecho-corpus-duplo.json`,
`evidence/pacote-municipal-pecas-20-11-pos-captura.json`,
`evidence/pacote-municipal-pecas-20-11-pos-fechar-buraco-do-git.json`,
`evidence/pacote-municipal-pecas-20-11-pos-pacote-completo-no-indice.json`); em cada registo vivem escritos
`portoes.length` e `corpus.total_citados`, e é neles que se lê quantos portões havia naquele instante — a série
de verdes vai de quinze para dezasseis e para dezassete conforme as cláusulas nomeadas acima entraram no
instrumento, e o censo de citados sobe com a prosa, não com a minha conta. É um registo dessa série que o §11 do
documento 08 cita. Nenhuma destas pegadas é a pegada deste runbook,
e esta frase também não: ela muda o ficheiro cuja pegada diz estar a citar. O verde que vale para aplicar é o do
portão corrido entre o `git add` e o `git commit` daquele texto, nunca uma corrida anterior.
*Vermelho significa:* falta uma peça, ou uma peça mudou de bytes desde que foi certificada. Não é aviso para
continuar: o aplicador compara o md5 do SQL que vai enviar com o que o preflight certificou, e um ficheiro
editado entre a certificação e a aplicação é exactamente o caso que esse portão fecha.

### 2.0.1 · O buraco do índice que nenhum dos portões anteriores podia dar (20/11)

`existsSync` não significa «a peça existe»: significa «a peça está **nesta máquina**». Foi assim que a PEN-41
inteira — candidata, reversão, preflight e dois artefactos — esteve citada por este runbook versionado, em disco
desde que foi escrita, e **fora do `git ls-files`**: `git log --all --diff-filter=A -- scripts/p73-pen41-ddl-candidata.sql`
dá zero commits e `git check-ignore -v` devolve saída vazia com exit 1, logo não foi recusa por designio, foi
esquecimento. O commit `a0e457b` afirmava as quatro candidatas escritas — era verdadeiro sobre o disco e falso
sobre o pacote: num clone novo não havia PEN-41 e o aplicador não tinha o que enviar.

A classe tem dois lados opostos e só o índice os separa, por isso o portão `nenhum_caminho_citado_fica_fora_do_git`
dividiu a régua em duas, uma por classe: **ESQUECIDO** (existe, não está no índice, não é ignorado) contra
**RECUSADO POR DESIGNIO** (existe, não está no índice, é ignorado — sessões e contas de teste). Juntá-los num só
booleano era o verde que tolera o esquecimento desde que alguém o chame de escolha.

Medido, na ordem em que aconteceu:

1. vermelho honesto do pacote real — `P73_SUF=pen41-fora-do-git` → `FORA_DO_INDICE 6 esquecidos`, os seis nomes
   todos da PEN-41 e do stdout do deploy da v136, `PACOTE_MUNICIPAL_VERMELHO 1 de 16 portoes`
   (`evidence/pacote-municipal-pecas-20-11-pen41-fora-do-git.json`,
   `evidence/pacote-municipal-stdout-pen41-fora-do-git-20-11.txt`);
2. os seis entraram no índice, e com eles mais seis que a mesma varredura encontrou na mesma classe: o programa
   do bu6 e o seu artefacto (os dois citados por `docs/bu-20-11/03-perfis-e-permissoes.md`), o artefacto das
   cadeias de login (citado por `docs/auditoria-bfr-conecta.md`) e o seu programa, mais o censo de policies
   municipais e o contador de pipes escapados. Dos doze, os seis do vermelho são os que este corpus cita; dos
   outros seis, três têm citação noutro documento versionado e três (`p73-politicas-municipais-20-11.mjs`,
   `p73-conta-pipes-escapados.mjs`, `p73-entrar-por-senha-cadeias-20-11.mjs`) não são citados por prosa nenhuma
   e entraram por outra razão, que digo: um artefacto cujo programa produtor fica fora do índice é metade prova,
   porque a pegada do registo não tem quem a reproduza;
3. verde re-medido — `FORA_DO_INDICE 0 esquecidos de 2321 fichas` com `PACOTE_MUNICIPAL_OK 16/0`
   (`evidence/pacote-municipal-pecas-20-11-pos-fechar-buraco-do-git.json`);
4. o portão apanhou-me a mim, e logo: os caminhos das capturas desta tarefa — três registos e os três stdout
   correspondentes, a falsificação da linha 4 da tabela, o vermelho honesto da PEN-41 e o verde que os fechou —
   passaram a ser citados pela prosa que eu estava a escrever nesta mesma secção, e `P73_SUF=pos-classe-de-decisao`
   tornou a dar `6 esquecidos`, agora de ficheiros meus. É a forma mais incómoda de a cláusula ter dentes: ela
   não distingue a peça esquecida há meses da que eu esqueci há dois minutos, e não devia;
5. verde final, com a quarta classe declarada — `FORA_DO_INDICE 0 esquecidos de 2327 fichas ·
   por_decisao_assinada 2 de 2` com `PACOTE_MUNICIPAL_OK 17/0`
   (`evidence/pacote-municipal-pecas-20-11-pos-pacote-completo-no-indice.json`, stdout
   `evidence/pacote-municipal-stdout-pos-pacote-completo-no-indice-20-11.txt`).

Duas peças ficaram de fora **de propósito**, e a razão não é minha: `evidence/ah2-home-papel-a-papel-v1.json`
tem decisão assinada em `26e220d` — o campo ambíguo `chave` foi renomeado para `rota_home` no gerador e o
artefacto re-gerido como v3, que **está** no índice com 42 ocorrências de `rota_home` e zero de `chave` (medido
por `grep -c`); excepcioná-lo agora seria registrar no portão o nome que o projecto eliminou. E
`evidence/.funde-v134-18-11.txt` cai na régua verificada de que zero ficheiros com ponto inicial estão
versionados em `evidence/`. Ambos tinham entrado no meu `git add` por hábito, e saíram por
`git restore --staged` **antes** de qualquer commit; o portão do índice, corrido com eles dentro, respondeu
`evidence/ah2-home-papel-a-papel-v1.json|senha n=42` com duas famílias de comprimento (39 de 6, 3 de 16) — e
comprimentos são o que o portão imprime, nunca o valor. A classe é a que `26e220d` já descrevera: são os nomes
das rotas Home (`inicio` e `professor-inicio`), e o que os torna visíveis é o *nome do campo* acabar em `chave`.
Para que estes dois nomes não voltem a ser confundidos com esquecimento, o portão tem a quarta cláusula,
`os_fora_do_indice_por_decisao_continuam_decididos`: para cada um deles exige que o ficheiro continue em disco,
continue **fora** do índice, continue **não** ignorado, e que a frase da decisão continue no corpus — cai a
frase, o nome volta a contar como esquecido e o vermelho regressa, que é o desenho que já usei para o fantasma
do `bu4`. A falsificação está na linha 5 da tabela de §2.0.

**Correção datada 21/11, com o portão re-escrito por medida e não por cortesia.** O `evidence/.funde-v134-18-11.txt`
está **dentro** do índice desde o batch `1800682` («versionar as 48 provas nomeadas por conteúdo indexado e que
estavam fora do git»), e o texto de cima, que o declarava fora, é medição de 20/11: continua verdadeiro sobre o
dia em que foi escrito e falso sobre a árvore de hoje. Foi este o vermelho que a corrida do portão deu quando a
prosa do §SM.28 foi escrita — `[[true,false,false,true],[true,true,false,true]]` contra
`[[true,false,false,true],[true,false,false,true]]`, com a segunda linha a ser o ponto em causa. Não des-rastrei:
o conteúdo já está no histórico, e tirar-lhe a ficha agora só faria o índice mentir sobre o que um clone já tem.
Também não apaguei a cláusula nem aliviei o predicado — a classe passou de um zero para uma lista declarada:
`os_no_indice_por_decisao_nova_continuam_versionados_com_a_frase` exige agora que cada nome desta lista continue
em disco, continue no índice, continue não ignorado e continue com a sua frase da decisão no corpus, e
`a_classe_de_pontos_versionados_em_evidence_e_a_declarada` mede a classe inteira com `git ls-files` em vez de a
lembrar, pelo que um segundo ponto varrido por `git add` amplo chumba por nome. Os dentes estão provados na mesma
corrida por `a_regua_da_classe_de_pontos_tem_dentes`: acrescentar um ponto de fixture tem de alterar a lista
medida, e a lista medida tem de ser cumprida pelos declarados. O que autoriza a entrada não é o batch sozinho —
é o facto de o stdout do `scripts/ah2-funde-sessoes.mjs` ser a prova que a própria prosa nomeia; a varredura de
credenciais sobre os seus 1 737 B e 35 linhas deu **0** tokens com a forma de JWT e **0** rótulos de
`access_token`/`refresh_token`/`senha`, que é a razão de poder viver no git sem ser exceção.
Fica a ponta solta, e fica dita em vez de ser calada: `scripts/sm7-confere-casa-home.mjs:6` está versionado e lê
o v1 por caminho fixo, por isso o diff v1-vs-v3 que ele prova corre nesta máquina e **morre de `ENOENT` num clone
novo**. Aqui ele corre e dá `LEITURA_IGUAL_SUCESSOR_SERVE` (`rename=84`, `NUMEROS_DIFERENTES=0`), o que é a
confirmação de que o sucessor serve — e também de que o portão não o apanha, porque o corpus dele é a prosa dos
dois documentos, não os `readFileSync` dos scripts. **FALTA-4:** ou o instrumento passa a apontar para o sucessor
versionado, ou o v1 entra no índice e o substituto é retirado; as duas opções desfazem algo que já foi decidido,
por isso pedem escolha explícita e não a minha. A numeração é a das pontas soltas deste runbook: FALTA-1 em §2.6
(fechada ao nível da candidata em 20/11, com o `--selfteste` e a recusa de publicação medidos; quem põe a peça a
conferir de verdade é a publicação, e essa pede OK literal próprio), FALTA-2 em §4 (fechada em 20/11, com as recusas
medidas e o ciclo completo ainda por correr), FALTA-3 em §2.2, esta aqui, FALTA-5 em §2.7 (fechada em 20/11 ao
nível do caminho: preflight nos dois modos escrito e corrido, peça entrada no aplicador, recusas medidas — o que
falta é a frase `APLICAR PEN-43 NO BANCO`, e só ela) e a sua irmã de publicação em §2.8, que é o mesmo tipo de
ponta com outro nome: escrita, gateada, e à espera de frase.
**Correção datada da FALTA-5, 21/11, por medida:** a frase foi dita e a peça aplicada às 07:31:57Z, com o registo
citado no §2.7, e a PEN-44 tem o seu às 07:32:24Z; das duas, o que voltou a faltar é produto (a tela e o consumo),
não DDL. A classe «à espera de frase» tem hoje dois nomes, e a lista não se lembra de mim — lê-se do cruzamento das
candidatas com os registos, no §2.0 e no portão do pacote.

**O segundo buraco do índice, e é da mesma família: um registo certifica o disco, não o pacote (22/11).** A régua
que compara o registo de aplicação com a candidata em disco
(`os_registos_de_aplicacao_batem_com_as_candidatas_em_disco_e_com_a_saida_do_preflight_de_entrada`) é correcta e
nunca apanhou o que se passava: o SQL que o banco recebeu na PEN-42 vivia **só na árvore de trabalho**. O índice
tinha 3 520 B (`d925b5515d5870f9160f8d806a263f80`) e a reversão 587 B (`4984c42408b214011d445fcb8c73949b`); o que foi
aplicado é 4 841 B (`3d2a386023885441915e6b5832fe9f79`) e 795 B (`a9ca26a22526ec2e1ae8a40323ef8cec`), e a diferença é
semântica, não de espaço: um papel saiu do `GRANT` nominal — a varredura do aplicador lê o nome dele como credencial
dentro de código, e a regra não se alarga para deixar passar uma candidata; estreitou-se a candidata — e o ficheiro
ganhou transacção. A versão do índice nem sequer seria aplicável, porque o aplicador recusa SQL sem as duas marcas.
A correção é uma cláusula com a fonte trocada, não uma nota: `os_registos_de_aplicacao_batem_com_os_blobs_do_indice_e_nao_somente_com_o_disco`,
que compara cada registo com o blob do índice, mais os seus dentes
(`a_regua_dos_blobs_do_indice_tem_dentes_e_o_mundo_real_e_o_normal`), e o vermelho tirado **antes** de qualquer
`git add` está preservado em
`evidence/pacote-municipal-pecas-20-11-antes-staging-VERMELHO-o-sql-que-o-banco-recebeu-era-so-da-arvore-de-trabalho-pen42.json`
(59 174 B, `e2df3f3d5d6ce6e5fdc14f193624d976`). Dois defeitos de instrumento ficaram no meio, ambos meus e ambos do
tipo que esta casa já nomeou: «ao blob trocado, todas as colunas falsas» não tem positivo — um blob de 46 bytes
existe, o que está trocado é o conteúdo — e a cláusula principal comparava a linha de sete elementos com um esperado
de seis, donde **verde era impossível**; foi a corrida que devia dar verde, logo a seguir ao `git add`, que o disse.
O vermelho dessa corrida está preservado em
`evidence/pacote-municipal-pecas-20-11-sm28-14-VERMELHO-a-minha-clausula-nova-prometia-seis-colunas-onde-a-linha-tinha-sete-e-verde-era-impossivel.json`
(56 659 B) e o verde que decide o fecho imprime `PACOTE_MUNICIPAL_OK 33/0` com `com_registo` de cinco peças e
`sem_registo=["PEN-41","PEN-48"]`, que é a classe que o §2.0 promete ler do cruzamento em disco. Fica a regra de
fôlego onde se cumpre: **o SQL aplicado entra no mesmo `git add` que o seu registo** — se a régua do índice apanha
um verde largo demais, é porque o staging ainda não aconteceu.

### 2.1 · Preflight fresco da peça que se vai aplicar

```
node scripts/p73-pen38-preflight.mjs
node scripts/p73-pen39-preflight.mjs
node scripts/p73-pen41-preflight.mjs
node scripts/p73-pen43-preflight.mjs
```

*OK necessário:* nenhum (só leitura). *Verde esperado:* os três vereditos do §0, com o nome do registo impresso
na última linha, e para a PEN-43 `P73_PEN43_PREFLIGHT_VERDE_CANDIDATA 13/0` — o verde dela foi medido em 20/11 e é
de uma peça **não aplicada**, pelo que o modo `--reversao` desta quarta linha está destinado a dar vermelho enquanto
o `REVOKE` não correr (§2.7 tem o registo vermelho e o motivo).
*Cada registo é escrito uma vez*: para re-correr sem por cima do anterior, `P73_SUF=<rótulo> node …`.
*Vermelho significa* que o estado vivo já não é o que a candidata pressupõe. Nesse caso a candidata não se
aplica: re-mede-se e escreve-se candidata nova. Um vermelho daqui nunca se «resolve» com `--ok`.

### 2.2 · PEN-38 — escopo no lugar da autoridade, admin de volta à mesa, porta de etiquetagem, diagnóstico — APLICADA 20/11 (§0A; re-aplicá-la hoje chumba no portão de entrada, e é o desenho)

```
node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-38 --ok "APLICAR PEN-38 NO BANCO"
```

*O que a peça faz antes de escrever:* verifica a frase literal, a existência dos três ficheiros, varre o SQL à
procura de `DROP TABLE`/`TRUNCATE`/`DELETE`/`UPDATE` fora de corpo de função/`DROP DATABASE|SCHEMA`/padrões de
credencial, exige transacção única `BEGIN…COMMIT`, corre o **preflight fresca deste instante** e confere o
`md5` e os `bytes` da candidata e da reversão contra os que esse preflight certificou. Só depois envia o SQL.
*Artefacto:* `evidence/p73-municipal-aplicacao-PEN-38-<stamp>.json` com `aplicado`, `baselines.antes/depois`,
`varredura_do_sql`, `preflight_candidata.veredito` e `preflight_reversao.veredito`.
*Verde de fecho:* `P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-38` (exit 0), que exige que as baselines não tenham
mexido **e** que o mesmo preflight, em modo `--reversao`, dê `P73_PEN38_PREFLIGHT_VERDE_REVERSAO 10/0`.
*Vermelho significa:* `…_ABORTADA` = o Postgres abortou a transacção inteira, nada ficou aplicado; `…_COM_CONFERENCIA_VERMELHA` =
alguma coisa foi aplicada e não é o que a candidata afirma, e aí o passo seguinte é a reversão do §4, não repetir.
**FALTA-3 (aberta, e agora medida por peça e não por memória):** a quarta acção desta peça —
`bfr_municipal_scope_diagnostico()` — não tem consumidora no código servido. A frase que aqui estava era uma
afirmação sobre ficheiros que ninguém podia re-tirar, e estava **errada no detalhe**: dizia «42 chamadas
`.rpc(`, das quais zero ao diagnóstico, e as duas únicas funções chamadas são `bfr_is_municipal_authority` (8) e
`bfr_teacher_context` (34)» — os 42 são a soma desses dois nomes, não o total de chamadas. O instrumento é
`scripts/p73-pen38-sonda-consumidor-do-diagnostico.mjs` (0 HTTP, 0 banco) e a corrida de 20/11 dá
`P73_PEN38_CONSUMIDOR_FALTA3_ABERTA_CONFIRMADO 8/0` em
`evidence/p73-pen38-sonda-consumidor-do-diagnostico-20-11.json`: **17** `index.html` e **22** `worker.mjs` do
índice, **535** chamadas `.rpc('…')` em **25** nomes distintos, **zero** ao diagnóstico nas três grafias varridas
(`.rpc('nome')`, `/rest/v1/rpc/nome`, nome como texto) e zero também a `bfr_school_set_municipality`. Os nomes
varridos não são dactilografados na peça: lêem-se dos `CREATE FUNCTION public.<nome>` da candidata
(`scripts/p73-pen38-ddl-candidata.sql`), e os ficheiros varridos vêm de `git ls-files`, não do `ls` do disco — um
bundle que só existe nesta máquina não é um consumidor que se possa publicar amanhã. O controlo positivo dispara
na mesma varredura (os mesmos 8 e 34 dos dois nomes municipais) e o fixture das três grafias dá 2/1/4 contra um
texto sem agulha que dá 0/0/0, por isso o zero não é régua cega. A primeira corrida desta peça foi a vermelho
por defeito meu — o fixture da família `caminho_rest` não era um caminho `rpc` — e está preservada em
`evidence/p73-pen38-sonda-consumidor-do-diagnostico-20-11-VERMELHO-o-fixture-do-caminho-rest-nao-era-um-caminho-rpc.json`.
O comentário da função aponta «para o §12 «diagnóstico em cada tela»», e aqui a prosa deste runbook estava
**errada em duas coisas**, ambas medidas nesta passada: (i) o §12 não é o do documento 08 — esse tem **zero**
ocorrências da palavra «diagnóstico»; o §12 que nomeia `bfr_municipal_scope_diagnostico()` é a
«LISTA DE BUGS E PENDÊNCIAS» de `docs/roadmap-master.md` (cabeçalho na linha 552, linha PEN-38 na 599); e (ii) a
frase «diagnóstico em cada tela» não existe com essas letras em nenhum documento versionado, pelo que o comentário
é paraphrase de uma promessa, não citação dela — o que a promessa é, diz a linha 114 do SQL
(`COMMENT ON FUNCTION … IS 'SM4/PEN-38: §12 — porque é que a aba está vazia…'`). A promessa de tela só se cumpre
quando um bundle a chamar existir — e isso é código de produto (a v138 de §5), não DDL. Aplicar PEN-38 com
FALTA-3 aberta é criar uma função executável que ninguém chama: não estraga nada, e também não prova a tela. O que
esta peça **não** prova está no campo `o_que_nao_prova` do registo: uma chamada construída por composição de
string escapa às três grafias varridas.

### 2.3 · Etiquetar escola↔município (só depois da opção 1 ou 2 do §1, e só com sessão)

```
node scripts/p73-municipal-etiqueta.mjs --escola <uuid> --municipio <uuid> \
  --motivo "<o motivo da decisão>" --sessao ah2-sessions.json --rotulo direcao@developer \
  --ok "ETIQUETAR ESCOLA E MUNICIPIO"
```

*Porque não pelo aplicador de DDL:* a etiquetagem escreve **dados** pela porta nomeada do bloco C
(`public.bfr_school_set_municipality`), e essa função exige `auth.uid()` — pela API de gestão `auth.uid()` é
nulo e a própria função recusa. Daí o `--sessao`/`--rotulo`: é o caminho que hoje **não existe** neste posto de
trabalho (`ah2-sessions.json` ausente; `c2-sessions.json` são 3 bytes, `{}`), e a recusa está medida na recusa 3
de `evidence/p73-municipal-etiqueta-stdout-recusas-20-11.txt`. Antes deste passo é preciso o ciclo de mint, que
é OK próprio.
*Verde de fecho:* `P73_MUNICIPAL_ETIQUETADO_E_TRILHADO`, que só sai se `antes_depois.mudou` for verdadeiro
**e** houver linha em `bfr_municipal_audit` com `action = 'school_municipality_set'` para essa escola. Uma
escrita sem trilha é `…_COM_CONFERENCIA_VERMELHA` e exit 1.
*O registo não leva token* — só o rótulo e os minutos restantes de expiração (`sessao.fonte`).

### 2.4 · PEN-39 — agregados por município e por zona — APLICADA 20/11 (§0A; re-aplicá-la hoje chumba no portão de entrada, e é o desenho; a metade da tela continua a ser v138)

```
node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-39 --ok "APLICAR PEN-39 NO BANCO"
```

*Advertência específica desta peça:* o preflight da PEN-39 mede que **nenhum nome da candidata é consumido
pelo módulo servido** (`nenhum_nome_da_candidata_e_consumido_pelo_modulo_servido_e_a_sonda_e_verde`). Aplicar
esta candidata cria dois nomes que hoje ninguém chama; não muda uma linha de tela. Se o objectivo da sessão for
«a aba mostrar números», o passo que mostra números é a publicação, não este.
*Verde de fecho:* `P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-39` com `P73_PEN39_PREFLIGHT_VERDE_REVERSAO 11/0`.

### 2.5 · PEN-41 — leitura de alunos e turmas pelo vínculo, não pelo cargo — NÃO APLICADA 20/11 (continua a pedir OK próprio; é a única das três que tira leitura de gente real)

```
node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --ok "APLICAR PEN-41 NO BANCO"
```

*Efeito medido antes de aplicar* (`evidence/p73-pen41-preflight-candidata-20-11e.json` → `populacao_afectada`):
os 2 perfis `director` e os 2 `secretary` com vínculo em `staff_schools` mantêm 848 alunos / 27 turmas; **2
perfis `secretary` sem vínculo passam de 848/27 para 0/0**. Este é o único passo do pacote que tira capacidade
de leitura a utilizadores reais, e por isso o §3.2 é obrigatório depois dele.
*Verde de fecho:* `P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-41` com `P73_PEN41_PREFLIGHT_VERDE_REVERSAO 13/0`.

MOTIVO-SEM-REGISTO · PEN-41 — candidata escrita, preflight de entrada verde em modo candidata, mas nenhuma frase
`APLICAR PEN-41 NO BANCO` foi dada: é a única das três que tira leitura a gente real, e o registo de aplicação só
pode nascer de um OK próprio.

Re-medida às 23:43 UTC de 20/11, em leitura, com o `p73-pen41-preflight.mjs` da altura:
`P73_PEN41_PREFLIGHT_VERDE_CANDIDATA 13/0` em 14 045 ms
(`evidence/p73-pen41-preflight-candidata-20-11e-20-11h.json`). Os números que o §2.5 promete manter-se-ão:
`populacao_afectada` dá `director` 2 perfis / 2 com vínculo e `secretary` 4 perfis / 2 com vínculo / **2 sem
vínculo**, e `clausula_de_escopo` confirma que o acrescento às quatro policies é uma só expressão,
`bfr_school_in_own_school_scope(school_id)`, nada mais. O campo `o_que_este_verde_nao_autoriza` diz «nada» com
todas as letras, e é essa a frase que este parágrafo não deve ampliar: o verde re-tirado prova que o estado vivo
ainda é aquele contra que a candidata foi escrita, e nada mais.

### 2.6 · Publicação da v137 (PEN-40) — o passo que muda a tela

Não é DDL e não passa pelo aplicador. O mecanismo é o das versões anteriores, medido em
`evidence/v136-deploy-stdout-19-11.txt` (`deploy_exit=0`, versão `1598137c-ab84-4ca7-a5e3-ce621d06f255`):

```
cd worker-deploy-v137-remendo-pen40 && npx wrangler@4.154.0 deploy > ../evidence/v137-deploy-stdout-20-11.txt 2>&1; echo "deploy_exit=$?" >> ../evidence/v137-deploy-stdout-20-11.txt
```

*Porque a versão é fixada:* 4.156+ quebra o upload de assets com o erro 100312 (registro em
`docs/auditoria-bfr-conecta.md`, §X.2 da v122).
*OK necessário:* frase própria de publicação, nova, distinta de qualquer frase de DDL. O `ok_literal` de
`evidence/v137-gera-bundle-20-11.json` diz `(sem OK literal — candidata pronta; a publicacao exige OK literal novo)`.
**FALTA-1 · escrita em 20/11 e fechada ao nível da candidata:** a peça de conferência pós-deploy é
`scripts/v137-pos-deploy.mjs`, modelo `scripts/v136-pos-deploy.mjs` com uma cláusula invertida — a v137 não
muda a shell, muda só o módulo de apresentação responsiva, por isso o portão `C2_shell_e_byte_a_byte_a_shell_da_v136`
exige que a shell servida **não** tenha mudado. Copiar o `C1b` da v136 («a shell deixou de ser a anterior») daria
vermelho legítimo sobre uma publicação correcta, e era o vermelho da peça, não do mundo. As agulhas do PEN-40 não
são dactilografadas na peça: lêem-se de `remendo.de` / `remendo.para` em `evidence/v137-remendo-pen40-20-11.json`,
que é o registo do texto que o remendo substituiu — se o remendo mudar de agulha, a peça muda com ele ou dá
vermelho. Estado medido hoje: o `--selfteste` offline dá `V137_POS_DEPLOY_SELFTESTE_OK 9/0`
(`evidence/v137-pos-deploy-stdout-selfteste-20-11.txt`, 0 HTTP, 0 escrita), e a corrida sem flag recusa com
`V137_POS_DEPLOY_NAO_PUBLICADA`, exit 2 e `evidence/v137-pos-deploy-stdout-recusa-20-11.txt` como única saída —
as outras três exigidas são `evidence/v137-deploy-stdout-20-11.txt`,
`evidence/v137-deployments-list-depois-20-11.json` e `evidence/v137-deployments-status-depois-20-11.json`, e só
nascem do passo de publicação. A recusa não escreve registo próprio de propósito: um vermelho contra um ar que
ainda serve a v136 é indistinguível de um bundle partido, e as três ausências são o conteúdo do stdout, não o
nome de um ficheiro. Publicação continua sem OK literal próprio e por isso **não deve ser feita**.

### 2.7 · PEN-43 — fechar o `EXECUTE` de `anon` nas funções municipais de leitura — APLICADA E CONFERIDA 21/11 ÀS 07:31:57Z (candidata escrita 20/11)

A pendência nasceu da aplicação da PEN-39: as três funções novas que ela criou ficaram no catálogo com
`anon=X` na ACL explícita, `SECURITY DEFINER` e `STABLE`. O que um chamador sem sessão recebe hoje, medido às
23:43 UTC de 20/11 (`evidence/p73-sonda-exposicao-anonima-20-11-20-11h.json`,
`P73_EXPOSICAO_ANONIMA_VERDE 6/0 · 3 chamadas · 4 de 4 com anon=X`): as duas agregadas devolvem **200 com 0
linhas** e nenhum identificador de linha (`tem_uuid:false`, `tem_coluna_id:false`), e a de diagnóstico devolve 200
com **uma** linha de contagens de rede. Zero hoje não quer dizer zero amanhã: no dia em que a etiquetagem do §1 for
decidida, os mesmos `GET` passam a devolver números reais sem um único `GRANT` novo no meio. É essa a razão de a
peça existir antes da decisão, e não depois.

O remédio é o menor possível, e é gerado, não escrito à mão — `scripts/p73-pen43-gera-candidata.mjs` (0 escrita no
banco, catálogo lido por `SELECT`) produz `scripts/p73-pen43-ddl-candidata.sql` e
`scripts/p73-pen43-ddl-reversao.sql`: três `REVOKE ... FROM anon`, um por nome de leitura, com a reversão a
devolver o grau exactamente nos mesmos três nomes. Os nomes e os tipos vêm dos `CREATE FUNCTION` das candidatas em
disco (`p73-pen38`, `p73-pen39`, `p73-pen41`) e a lista de revogados vem da `proacl` viva — nada é dactilografado,
e é por isso que correr a geradora duas vezes dá os mesmos bytes:
`evidence/p73-pen43-gera-candidata-20-11e-20-11h.json` e
`evidence/p73-pen43-gera-candidata-20-11e-20-11h-recorre.json` são `P73_PEN43_CANDIDATA_OK 8/0` as duas, com os
dois `md5` de ficheiro iguais entre si.

**O que aqueles 8/0 não cobriam, e a passada que os substituiu (20/11).** Os ficheiros que essas duas corridas
certificaram mandavam os três `REVOKE` soltos, sem `BEGIN;`/`COMMIT;`, e o aplicador recusa enviar SQL que não é
uma única transacção — a razão não é burocracia: um `REVOKE` a meio falha e ficam um grau fechado e dois abertos,
e a reversão deixa de ser o espelho da candidata. A geradora passou a emitir os dois ficheiros entre `BEGIN;` e
`COMMIT;` e ganhou um 9.º portão
(`cada_ficheiro_e_uma_unica_transaccao_de_graus_e_o_mundo_sem_transaccao_chumba`), com o mundo sem transacção
fabricado dentro da própria corrida: `estrutura_dos_arquivos.fixture_sem_transaccao` lê `begin:0`, `commit:0`,
`revoke:1` num SQL de uma linha cujo comentário nomeia as duas marcas, e a contagem é feita sobre o corpo sem
comentários para que um `BEGIN;` escrito em prosa de cabeçalho não conte como transacção. Corrida com sufixo novo
(`P73_SUF=20-11tx`): `P73_PEN43_CANDIDATA_OK 9/0` em 5 056 ms, registo
`evidence/p73-pen43-gera-candidata-20-11e-20-11tx.json`, pegadas actuais candidata 1 494 B
`9d43a22606255c258350ad6fed263630` e reversão 543 B `ee4f50eee403f63eb506c2e960ba785d`. Os dois ficheiros
substituídos não foram apagados: ficaram como
`scripts/ANTERIOR-p73-pen43-ddl-candidata-sem-transaccoes-20-11.sql` (1 373 B, `74a4cae7fa7888e42b9aceb00d47d4a9`)
e `scripts/ANTERIOR-p73-pen43-ddl-reversao-sem-transaccoes-20-11.sql` (432 B, `dec93047a0ba92b233589ec6143a37fc`)
— e são exactamente as pegadas que a geradora anterior tinha certificado, pelo que um `mv` que tivesse trocado os
bytes daria vermelho no portão da pegada, não no meu olho.

**A pré-condição de eficácia, e os dois mundos que a negam.** Um `REVOKE ... FROM anon` só é eficaz se o grau do
`anon` estiver numa entrada *explícita* da ACL: se ele vier do default a `PUBLIC`, o mesmo `REVOKE` não faz nada e o
portão verde seria cortesia. A geradora exige `anon_explicito && !public_explicito && !acl_nula` por nome, e prova
os dois negativos na mesma corrida — `fixtures.mundo_acl_com_public` e `fixtures.mundo_acl_nulo` são ACLs
fabricadas, corridas pelo mesmo classificador, e dão exactamente as duas bandeiras que fariam o vermelho
(`public_explicito:true` no primeiro, `anon_explicito:false, acl_nula:true` no segundo). O terceiro dente é o do
casamento de assinatura: `tipos_trocados_nao_casa:false` com `nomes_de_parametro_casam:true`, porque esta build devolve
`p_school uuid, …` e uma agulha de tipos sem nomes não tinha positivo possível (é a mesma lição da régua de
assinatura do §0A, reaproveitada aqui antes de escrever o portão).

**FALTA-5 (fechada em 20/11 ao nível do caminho — o que continua em falta é a frase, e só ela).** Das duas saídas
listadas aqui antes, a escolha foi (i): `scripts/p73-pen43-preflight.mjs` existe, nos dois modos e com `--selfteste`
offline, e a peça entrou na tabela `PECAS` do aplicador com `frase: 'APLICAR PEN-43 NO BANCO'` e
`fraseRev: 'REVERTER PEN-43 NO BANCO'`. O que correu, cada linha com o artefacto ao lado:

* Offline, 0 HTTP, no mesmo stdout: `P73_PEN43_PREFLIGHT_SELFTESTE_OK 10/0` e
  `P73_MUNICIPAL_APLICA_SELFTESTE_OK 14/0` — os dois recortes em
  `evidence/p73-pen43-stdout-selfteste-preflight-e-aplicador-fecho-falta5-20-11.txt`.
* Modo `candidata`: `P73_PEN43_PREFLIGHT_VERDE_CANDIDATA 13/0` em 6 636 ms
  (`evidence/p73-pen43-preflight-candidata-20-11e-20-11p2.json`). Os portões que a geradora não podia dar:
  `os_nomes_do_revoke_e_do_grant_sao_o_mesmo_conjunto_espelhado` (o `REVOKE` de um nome sem `GRANT` espelhado na
  reversão chumba), `a_pegada_dos_dois_ficheiros_e_a_do_registo_mais_recente_da_geradora_e_a_regua_tem_dentes` (o
  esperado lê-se do registo **indexado** mais recente, nunca da memória desta corrida), e
  `o_privilegio_efectivo_do_anon_e_explicado_pela_acl_em_cada_nome_e_os_cinco_mundos_tem_dentes`, com os mundos
  `hoje_candidata`, `depois_reversao`, `public_da_no_op`, `acl_nula_do_default` e `inexplicavel_acl_sem_grau`
  fabricados dentro da mesma corrida — os dois últimos são os que negam a eficácia do `REVOKE` por nome, e dão o
  vermelho que a cláusula promete.
* Modo `--reversao`: `P73_PEN43_PREFLIGHT_VERMELHO_1`, e o único portão vermelho é
  `o_estado_vivo_do_anon_bate_com_o_que_o_modo_reversao_pressupoe_e_o_outro_modo_chumba_nesse_estado`, com os três
  nomes a ler `anon_pode=true` (`evidence/p73-pen43-preflight-reversao-20-11e-20-11p2r-VERMELHO.json`, stdout em
  `evidence/p73-pen43-stdout-modo-reversao-VERMELHO-esperado-porque-a-peca-ainda-nao-foi-aplicada.txt`). É o
  vermelho do desenho, não um obstáculo: o modo reversão afirma o estado de **saída** da candidata, e nenhuma peça
  não aplicada pode estar verde nos dois sentidos no mesmo instante. Os outros 12 portões bateram nessa corrida, e
  `o_estado_que_o_modo_reversao_pressupoe_ja_existe_hoje_noutros_nomes_lidos_do_catalogo` diz, por linhas reais do
  catálogo, que o mundo que esse modo pressupõe já existe hoje noutros nomes — o ramo verde do modo `--reversao` é
  alcançável por dados, não só pela minha construção.
* A recusa do aplicador deixou de ser «peça não certificada» e passou a ser «frase não autorizada», medida três
  vezes com `escrito_no_banco:false`:
  `evidence/p73-municipal-aplica-ddl-recusa-PEN-43-1795227471593.json` (sem `--ok`),
  `evidence/p73-municipal-aplica-ddl-recusa-PEN-43-1795227479397.json` (um «ok» solto dito ao banco) e
  `evidence/p73-municipal-reversao-recusa-PEN-43-1795227479547.json` (a frase de aplicar dita ao modo de reverter —
  é o motivo de `APLICAR PEN-43 NO BANCO` não comprar um `REVERTER`).
* A corrida de 12 portões que ficou para trás, anterior à cláusula dos espelhos reais, está conservada com o motivo
  no nome: `evidence/ANTERIOR-p73-pen43-preflight-candidata-20-11e-doze-portoes-antes-da-clausula-dos-espelhos-reais.json`.
* O portão do pacote, corrido depois de staged os nomes acima, com o índice já a recebê-los:
  `PACOTE_MUNICIPAL_OK 24/0 · 153 pecas medidas`, `FORA_DO_INDICE 0 esquecidos de 2435 fichas`, e a classe de
  aplicação impressa como `com_registo=["PEN-38","PEN-39"] sem_registo=["PEN-41","PEN-43"]` — valor daquele instante:
  a PEN-43 tem hoje registo de aplicação, e é o que o §2.7 afirma (`evidence/pacote-municipal-pecas-20-11-fecho-falta5.json`). A
  pegada do runbook gravada nesse registo é a do instante **anterior** à linha que o cita, porque uma captura não
  pode pinar o documento que a nomeia; a corrida de verificação final, com esta linha já escrita, correu com sufixo
  novo e o stdout ficou fora do repo, como as outras capturas finais.

**O censo que o preflight imprime, e que a peça não fecha.** Medido na corrida de candidata: 162 funções no
`public`, 67 executáveis por `anon`, 27 delas só porque a entrada a `PUBLIC` traz o grau (nelas um
`REVOKE … FROM anon` é no-op decorativo), 0 com ACL nula, e a divergência entre as duas formas de contar é 0 — é
diferença medida, não afirmada. A PEN-43 fecha **3** dessas 67. Ficam declaradas, com a razão medida ao lado do
nome, em `censo_de_exposicao_anonima.declarados`: `bfr_municipalities_visible`, porque a ACL dela tem
`=X/postgres` além do `anon=X` e fechá-la exigiria `REVOKE … FROM PUBLIC`, que é alargar o escopo da peça e pede OK
próprio; e `bfr_school_set_municipality`, a porta de etiquetagem volátil, mantida executável por anónimo de
propósito para um sem-sessão receber `42501` em vez de `404`. Este parágrafo é a razão de o verde do modo candidata
não se poder ler como «a exposição anónima está fechada», nem o vermelho do modo reversão como «está aberta de
surpresa».

REGISTO-DE-APLICACAO · PEN-43 — a classe `pecas_sem_registo_de_aplicacao` deixou de conter esta peça às
07:31:57Z de 21/11, quando a frase `APLICAR PEN-43 NO BANCO` foi dita e o aplicador escreveu
`evidence/p73-municipal-aplicacao-PEN-43-20261121T073148Z.json` (`P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-43`, 9 166 ms,
candidata 1 494 B `9d43a22606255c258350ad6fed263630` conferida byte a byte contra o disco, reversão 543 B
`ee4f50eee403f63eb506c2e960ba785d` guardada sem ser enviada, varredura `revoke_execute: 3` e zero em todas as outras
classes, contagens de dados iguais antes e depois, `inalteradas: true`), com os dois preflights da sequência verdes
nos 13 portões (`…-apl20261121T073148Zc.json` candidata, `…-apl20261121T073148Zr.json` conferência de saída). Continua
a não ter `CREATE FUNCTION` — `nomes_na_candidata: []` é o valor certo e o portão dos nomes novos nunca a pôde conter.
O portão do §2.7 que exigia `anon` com `X` no catálogo vivo até a peça ser aplicada é, por construção, o que hoje
está verde no modo reversão e vermelho no modo candidata — e isso foi medido depois da escrita, não afirmado:
`evidence/p73-pen43-preflight-reversao-20-11e-21-11-apos43-r.json` dá `P73_PEN43_PREFLIGHT_VERDE_REVERSAO 13/0` e
`evidence/p73-pen43-preflight-candidata-20-11e-21-11-apos43-c-VERMELHO.json` dá `P73_PEN43_PREFLIGHT_VERMELHO_1` com
um único vermelho, `o_estado_vivo_do_anon_bate_com_o_que_o_modo_candidata_pressupoe_e_o_outro_modo_chumba_nesse_estado`.
A régua não foi tocada; o que mudou foi o banco.

### 2.8 · Publicação da v138 (o consumidor dos agregados da PEN-39) — CANDIDATA E BUNDLE PRONTOS, NADA PUBLICADO

Não é DDL e não passa pelo aplicador; é o mesmo mecanismo do §2.6 com uma base diferente. A v138 existe porque a
PEN-39 criou dois nomes que **ninguém chama** — medido, não inferido, por `scripts/p73-sonda-uso-quatro.mjs`
(`P73_USO_QUATRO_NA_V136_VERDE 6/0`, `evidence/p73-sonda-uso-quatro-na-v136-20-11.json`). Sem este passo, a PEN-39 é
DDL morto; com ele, a aba municipal passa a ler os agregados pelo RPC em vez de percorrer as mesas.

```
node scripts/v138-gera-candidata.mjs      # 0 HTTP, 0 banco: recorta o invólucro do módulo na shell da v136
node scripts/v138-gera-bundle.mjs         # 0 deploy: worker-deploy-v138-painel-municipal + esperado-v138.json
node scripts/v138-pos-deploy.mjs --selfteste
```

*O que a candidata faz e o que prova* (`evidence/v138-gera-candidata-20-11.json`, `V138_CANDIDATA_OK 8/0`;
`bfr-candidata-v138-painel-municipal/index.html` = 3 551 245 B, `592b3652671d689220784af41da74321`): parte da shell
que o `audit-publicacao-v136.json` registou (`9e236a23eed978cf7c2a2743d449b307`, 3 547 458 B), recorta **só** o
interior do invólucro `<script data-bfr-municipal-module="1">` — é o único sítio onde o módulo municipal vive, e o
âncorado tem de cair todo dentro dele — e acrescenta duas chamadas `.rpc('…')`. Os dois nomes não são escritos
aqui nem ali: lêem-se dos `CREATE FUNCTION` de `scripts/p73-pen39-ddl-candidata.sql`, e o portão exige **exactamente
uma ocorrência de cada** dentro do invólucro. As colunas pedidas por cada RPC são conferidas contra o `RETURNS
TABLE` do mesmo DDL, com um fixture que dispara (`RETURNS TABLE (a uuid, b char(2), c integer, d boolean)` tem de
dar `a,b,c,d`) porque um `[^)]*` corta-se dentro de `char(2)` — foi o vermelho desta peça, preservado com o defeito
no nome em `evidence/v138-gera-candidata-20-11-VERMELHO-parser-de-colunas-cortado-em-char-2-e-pegada-composta.json`.
O comportamento proibido também é portão: a porta de etiquetagem (`bfr_school_set_municipality`) não pode ser
chamada por uma candidata que só lê.

*O que o bundle prova* (`evidence/v138-gera-bundle-20-11.json`, `V138_BUNDLE_OK 28/0`;
`worker-deploy-v138-painel-municipal/worker.mjs` = 3 616 188 B, `6837bf459045346aff5dccf5ebcab84f`): a base é o
worker **candidato** da v137, não o ar publicado — `worker-deploy-v137-remendo-pen40/esperado-v137.json` —, por isso
a v138 empilha o remendo PEN-40 em vez de o desfazer: o módulo servido continua `b83b4c2666fc909d50a358b86b99de05`
com 52 532 B, byte a byte o da v137, e o que muda é o embed HTML (+3 787 B no embed, +3 856 B no worker, e os dois
números são do mesmo portão, não de conta minha) e a etiqueta do SW `bfr-conecta-v138`. Os treze assets e o
`_headers` (`6f1f82a390b0e6111e3b8aff7d6415b2`) ficam intactos, o esqueleto do worker fora dos dois embeds é
verificado por máscara com um dente que parte a máscara de propósito, e o `esperado-v138.json` que a corrida escreve
é re-lido e conferido campo a campo antes do veredicto.

*Estado de publicação, medido e não declarado:* `publicado:false`, `ok_literal` =
`(sem OK literal — candidata pronta; a publicacao exige OK literal novo)`, e o marcador de que uma versão foi mesmo
publicada é o `audit-publicacao-vNNN.json` na raiz — existe para v133, v134, v135 e v136, **não** existe para v137
nem para v138, embora os dois directórios `worker-deploy-*` estejam em disco. É por isso que a candidata recusa o
proxy «o directório existe logo foi publicado»: um bundle pronto e um bundle no ar são duas coisas que este pacote
já confundiu uma vez. A prova ao nível do ar, `scripts/v138-pos-deploy.mjs`, está escrita com as duas cláusulas
invertidas face à v137 — aqui a shell **tem** de ter mudado e o módulo **não** pode ter mudado —, dá
`V138_POS_DEPLOY_SELFTESTE_OK 11/0` offline (`evidence/v138-pos-deploy-stdout-selfteste-20-11.txt`, 0 HTTP, 0
escrita) e recusa com exit 2 sem as três saídas do `wrangler` (`evidence/v138-pos-deploy-stdout-recusa-20-11.txt`).
O antecessor publicado também não é lembrado: a peça percorre os `audit-publicacao-vNNN.json` e escolhe o mais
recente, pelo que hoje aponta para a v136 e, se a v137 for publicada entretanto, passa a apontar para ela sozinha.

*Publicação:* `cd worker-deploy-v138-painel-municipal && npx wrangler@4.154.0 deploy`, com as três saídas em
`evidence/` e frase literal própria — ver §3.5 para o que fica a ser medição depois de ela correr.

### 2.9 · A aba medida no browser com conta test, e a porta que o banco abre e o módulo fecha

A pedido explícito («utiliza uma conta test para testar a funcionalidade da aba Secretaria Municipal de
Educação») a candidata v138 foi servida em `127.0.0.1` por `scripts/sm7-navegador-municipal.mjs` — nada publicado,
nada escrito no banco, nenhum mint. O instrumento precisava de três coisas para poder correr sobre esta cadeia: a
pasta da candidata e a pasta dos recursos irmãos por env (`SM7_CAND`, `SM7_BASE`; a v138 chama-se
`-painel-municipal` e passou a carregar `bfr-responsive-presentation.js` como recurso externo, pelo que sem o
`public/` do bundle o boot não acontece), o registo de sessões por env (`SM7_REGISTO`, porque os quatro papéis
municipais vivem em `sm8-municipal-sessions.json` e não no registo da enumeração), e **a expectativa de aptidão
lida do banco** em vez da lista `['education_supervisor','developer','admin']` que estava escrita no ficheiro.
Instrumento das duas corridas decisivas: `91ec65e39f30fc930e31c2ff7e2a9716`.

*O painel funciona quando abre* — `evidence/sm7-municipal-developer-1366-v138dev-p5.json` (40 014 B,
`7494f3f118bbd712fc418bacbf0f82e9`), **31 portões, 1 falha**: as dez abas montam e mostram conteúdos distintos, o
esqueleto de carregamento não é medido como definitivo, nenhuma aba assenta em mais de 8 s, o export produz ficheiro
com bytes, o PDF chama `window.print()`, o filtro com termo inexistente deixa a banda de vazio sem linhas reais, o
filtro com nome real estreita a lista, o detalhe abre por clique real e mostra o nome da unidade, a volta à lista
devolve linhas, o teclado chega ao campo de busca, todo os cliques aterraram no elemento pedido e 0 erros de consola.
As linhas renderizadas são as do banco: `escolas` 6, `alunos` 800 de 848, `frequencia` 122, `infraestrutura` 226,
`profissionais` 6, `pedagogico` 5, `relatorios` 6, `comunicacao` 1, `painel` 8 cartões.

*A porta é que está errada* — `evidence/sm7-municipal-secretario_municipal-1366-v138sm-p3.json` (9 937 B,
`dc2d581b86f828fd95b0ab1a5e017bca`), **11 portões, 1 falha**: para esta conta `bfr_is_municipal_authority()` responde
`true` pelo REST com o mesmo access token injectado no browser, e o módulo responde
`{apto:false, por:"papel=secretary viewRole=secretary no mapa=false"}`; o botão fica `hidden` nas duas bandas
(`botao_no_menu=0`), nenhuma aba monta (`tabs_no_dom=0`) e o módulo não lê tabela alguma (`n_de=0`). A chave é
`PAPEIS_MUNICIPAIS = ['admin','education_supervisor']`, comparada com `viewRole(profiles.role)`. O registo das quatro
contas municipais declara `secretario_municipal`/`secretario_adjunto`/`gestor_autorizado`/`equipe_administrativa`,
mas os perfis delas são `secretary`, `secretary`, `coordinator`, `pending` — lido dos dois canais (browser e banco) e
agora portão no instrumento: `o papel do perfil é o mesmo medido no browser e lido no banco`, verde nas duas corridas.

**FALTA-6 (aberta; os dois lados têm preço dito antes de escolher).** A concessão municipal aplicada pela PEN-38 não
tem consumidor na shell: quem tem `bfr_municipal_access_grants` activa não abre a aba, e quem não tem (`developer`,
via `viewRole`→`admin`) abre. As duas opções, e nenhuma delas é minha: (i) a porta passar a perguntar ao banco —
`bfr_is_municipal_authority()` (que já soma a concessão ao ramo `education_supervisor`) em união com
`bfr_is_platform_admin()` (que é o ramo que a própria vista `bfr_municipal_school_stats` usa no `WHERE`), o que é
mudar o shell, gerar candidata nova e publicar com OK literal próprio; (ii) manter a lista e fechar a PEN-38/39 como
mecanismo só para as contas `admin`/`education_supervisor`, caso em que as quatro concessões vivas ficam sem efeito
visível e o `municipal_role` passa a ser dado decorativo. O que as duas precisam de decisão antes de código: **quem é
autoridade municipal** é a mesma pergunta do §1, agora com evidência dos dois lados.

*O que também se mediu e se fecha aqui, para ninguém reabrir:* a vista `bfr_municipal_school_stats` **não** é uma
saída de RLS. Está em `pg_class` como `relkind=v`, `dono=postgres` e `reloptions=security_invoker=true` — uma de sete
vistas com essa opção entre 153 —, por isso o `anon` apanha `42501 permission denied for table schools` (e não tem
SELECT em `schools` nem em `staff_schools`), um `authenticated` sem concessão recebe 0 linhas, e a `developer` recebe
as 6 da rede pelo ramo `bfr_is_platform_admin()`. O ACL do `anon` sobre a própria vista (`arwdDxtm`) existe e é o que
o `information_schema` anuncia como inserível, mas com `security_invoker=true` quem decide é a base, e não probei
escrita nenhuma para o provar: a prova é o 401 medido.

*Estado vivo da PEN-43, agora por peça versionada:* `scripts/p73-sonda-porta-municipal.mjs`
(`73b70f8a50586593b8daaef8922a6c6c`) corre os dois canais sobre as mesmas grandezas e confronta-os. Os três nomes-alvo
lêem-se das linhas `REVOKE EXECUTE … FROM anon` da própria candidata; o controlo lê-se do **privilégio efectivo**
(`has_function_privilege('anon', oid, 'execute') = false`) e não da forma do ACL — foi ler a forma que fez a primeira
versão desta régua escolher para controlo dois dos três nomes do alvo, produzindo um vermelho sem positivo; as duas
classes têm de ser disjoint, e o `--selfteste` (16 casos, 0 HTTP) prova que cada cláusula dispara com o seu fixture.
O portão é a **concordância** catálogo-vs-HTTP, não «o alvo está aberto»: o veredicto nomeia o mundo, e no dia em que
a PEN-43 for aplicada a mesma peça passa a dizer `PORTA_MUNICIPAL_FECHADA` sem que se alivie uma letra.

Corrida `evidence/p73-sonda-porta-municipal-20-11.json` (13 321 B, `e799b38e425e7b96953840004239a438`):
`PORTA_MUNICIPAL_AINDA_ABERTA` com `maus=[]`, ou seja nenhuma cláusula em falta. Pelo `anon`: `bfr_municipal_scope_diagnostico` 200
com 1 linha e sete colunas de contadores (`perfil`, `tem_concessao`, `municipios_da_concessao`,
`escolas_no_meu_municipio`, `escolas_sem_municipio_na_rede`, `pontes_confirmadas`, `concessoes_ativas_na_rede`); os
dois agregados da PEN-39 200 com `[]` (0 linhas, e 0 linhas é resultado, não recusa); a vista 401
`permission denied for table schools`; `bfr_is_municipal_authority` devolve o escalar `false`. O controlo
(`bfr_get_family_location`, `bfr_municipal_network_totals`) responde **401 `42501 permission denied for function`** —
é isto que dá dente ao vermelho dos três: o 401 é um estado alcançável neste deployment, não um artefacto da chamada.
A captura anterior desta mesma peça ficou em disco como
`evidence/ANTERIOR-p73-sonda-porta-municipal-20-11-DEFETO-o-leitor-contava-corpo-de-erro-como-linha-e-escalar-como-erro.json`
(9 380 B, `714430f52c418499dcfb6e34bb0894ef`): nela um 401 aparecia como `linhas:1` e o `false` da autoridade como
`erro` — o artefacto lia-se ao contrário, e os quatro fixtures do leitor novo são o fecho disso.

*O facto que a corrida nova acrescenta ao FALTA-6:* para `secretario_municipal` (perfil `secretary`) o banco responde
`bfr_is_municipal_authority = true` **e mesmo assim** os dois agregados devolvem 0 linhas e a vista 0 linhas, porque
nenhuma escola tem `municipality_id`. Abrir a porta do módulo sem o §1 decidido só troca «aba escondida» por «aba com
a banda de vazio» — as duas mudanças são independentes e cada uma pede o seu OK. A conta `developer` tem o contrário:
`authority = false` por não ter concessão nem papel municipal, mas `bfr_is_platform_admin()` verdadeiro pelo JWT, e por
isso lê a vista com 6 linhas (1 393 B) e os agregados com 1 linha cada. A `director` não foi medida nesta corrida: a
cadeia de refresh está esgotada (HTTP 400) e re-mint é ação com OK literal próprio.

### 2.10 · PEN-44 — fechar a entrada a `PUBLIC` nos 45 nomes que só por ela são executáveis por `anon` — APLICADA 21/11 ÀS 07:32:24Z COM CONFERÊNCIA VERMELHA DENTRO DO APLICADOR, E A MESMA RÉGUA VERDE ÀS 07:35:03Z

**De onde vem o número, e por que não é o da frase do pedido.** O escopo escolhido foi «a candidata dos 27 via
PUBLIC». Os 27 vêm da corrida de candidata da PEN-43 e contam os nomes em que o grau do `anon` vem *só* do `PUBLIC`
(não há `anon=X` explícito). A alavanca desta peça é outra, e é ela que o SQL toca: a entrada `=X/postgres` na ACL.
Medida pela pré-leitura do preflight no instante da corrida, e são **eixos distintos, não uma filtragem da lista
pela anterior**: das 162 funções em `public`, 67 são executáveis por `anon` por qualquer via e 59 têm entrada a
`PUBLIC` na ACL; **45** delas compõem o alvo desta peça e **14 ficam fora por `prorettype = trigger`** — um gatilho
não é chamável por RPC e uma peça de graus não lhe mexe, e é essa a conta que fecha `fora_do_alvo: 14` com
`nao_declarados: []`. Dos 45, **22** têm também `anon=X` explícito, e para esses a
peça escreve um segundo `REVOKE … FROM anon`; sem essa segunda linha o grau sobreviveria pela entrada nominal, que é
exatamente o erro que a PEN-43 tinha aprendido a não cometer.

**Comandos, cada um com o artefacto que deixou.** A geradora e o preflight são os únicos caminhos, e ambos só lêem:

```
node scripts/p74-pen44-gera-candidata.mjs                      # P74_PEN44_CANDIDATA_OK 16/0 · 4 SELECT · 0 escrita
node scripts/p74-pen44-preflight.mjs --selfteste               # P74_PEN44_PREFLIGHT_SELFTESTE_OK 12/0 · 0 banco
node scripts/p74-pen44-preflight.mjs                           # modo candidata: P74_PEN44_PREFLIGHT_VERDE_CANDIDATA 18/0
node scripts/p74-pen44-preflight.mjs --reversao                # P74_PEN44_PREFLIGHT_VERMELHO_3 (peça não aplicada)
node scripts/p73-municipal-aplica-ddl.mjs --selfteste          # P73_MUNICIPAL_APLICA_SELFTESTE_OK 15/0
```

Corridas gravadas: geradora `evidence/p74-pen44-gera-candidata-21-11-c.json` (49 633 B,
`4f48486c0925e8b94456cb1fbcaf37bf`) com o par anterior em `…-21-11b.json` (47 791 B) e o vermelho de contagem em
`…-21-11a-VERMELHO-a-contagem-de-grau-contava-o-TO-anon-da-reversao-como-preservacao.json` (46 706 B); preflight de
candidata `evidence/p74-pen44-preflight-candidata-21-11-e.json` (107 230 B, `aeca8c9ea27f1bf4884672c3501441d0`,
8 935 ms, seis leituras declaradas e seis medidas, `nao_leitura: 0`) — corrida que corresponde ao instrumento hoje em
pacote — e a corrida que a substituiu, `…-21-11-d.json` (107 230 B, `35c44aaa0323c3910d0776559ae35428`), fica como
história; os dois vermelhos de reversão
`…reversao-21-11-d-VERMELHO-estado_de_antes_anon_executa_os_45_nomes_e_a_entrada_public_continua_na_acl.json`
(111 799 B) e `…reversao-21-11-rev20261121T040104Zr-VERMELHO-invocado-pelo-aplicador_a_peca_nao_esta_aplicada.json`
(111 799 B) — o segundo é a corrida que o **aplicador** fez antes de recusar, e por isso tem o motivo no nome, porque
sem ele os dois ficheiros seriam indistinguíveis byte a byte salvo o relógio. Os dois SQL: candidata
`scripts/p74-pen44-ddl-candidata.sql` (17 835 B, `262e22e5a63fadc42204b7d8c5b985c1`) — 45 `REVOKE … FROM PUBLIC`, 22
`REVOKE … FROM anon`, 45 `GRANT … TO` com os oito papéis, tudo entre `BEGIN;` e `COMMIT;` — e reversão
`scripts/p74-pen44-ddl-reversao.sql` (16 574 B, `68c5b2f0e15dbc16bafde3f608f29dbf`), que devolve os 45 `GRANT … TO
PUBLIC`, os 22 `GRANT … TO anon` e desfaz os 45 `GRANT` de preservação. Contagem de estrutura lida do preflight, com
`statement_fora_dos_graus: 0` dos dois lados.

**A avaria encontrada a meio, e o que ela custou.** O predicado que exclui as famílias de plataforma da enumeração
estava escrito `not like 'pg_%'` sem `ESCAPE`. Em `LIKE`, `_` é curinga de um caractere, pelo que a cláusula não
omitia só a família `pg_*`: omitia também `pgbouncer`, que é um login real e um dos papéis que a preservação tem de
cobrir. O que o detectou não foi o meu olho nem um teste à lista: foi a segunda via de enumeração — `pg_roles`
inteiro filtrado por `rolname.startsWith('pg_')` em JavaScript, onde `_` é literal — a divergir da primeira
exactamente numa palavra, `discordam_onde_o_curinga_mente: ["pgbouncer"]`, com os dois canais registrados lado a
lado em `papeis` (`lidos: 16`, `no_catalogo_inteiro: 31`, `esperados_sem_familias_pg: 16`). A régua ficou com dente
demonstrável dentro da corrida: `comoLike` é uma função pura que reimplementa as três regras do `LIKE` (curinga `%`,
curinga `_`, `\x` literal) e o fixture exige `sem_escape_devora_pgbouncer === true` **e**
`escapado_so_omite_a_familia === true` — uma cláusula que só pudesse ser verde do lado do escape não teria
negativos. Consequência material: **os `7 papéis / 315 pares` certificados pelas corridas `21-11a` e `21-11b` estão
substituídos por `8 papéis / 360 pares`**, os dois SQL foram re-gerados, e o par substituído não se apagou — ficou
como `scripts/ANTERIOR-p74-pen44-ddl-candidata-so-sete-papeis-preservados-21-11.sql` (17 340 B,
`b6019f5a37a67a2437dd1ff2f37842ef`) e `…-reversao-so-sete-papeis-preservados-21-11.sql` (16 079 B,
`5735ec1c366f39ce97f5cf71bc1bd068`), com a razão no nome em vez de um comentário no corpo.

**O segundo defeito era meu, e só o portão de índice o via.** Ao correr `scripts/portao-indice.mjs` sobre o índice já
com os nomes acima, o varredor de credenciais chumbou o próprio preflight (`NAO_COBERTA scripts/p74-pen44-preflight.mjs`
com `n=1` e um literal de sete caracteres). Classifiquei antes de assumir: reproduzi o padrão do varredor sobre o
ficheiro, a expressão devolveu **um** casamento, na linha do `chave_catalogo` de uma entrada em que o rótulo termina
em `chave`, vem um dois-pontos e vem um literal de aspas — a forma que o padrão lê como senha, e o valor era um
marcador de ausência. Não alarguei o predicado nem escrevi exceção: re-escrevi a expressão com `||`, que é
semanticamente igual porque aquele valor nunca é cadeia vazia, e a prova de igualdade não é a minha leitura — é a
re-corrida. Offline `P74_PEN44_PREFLIGHT_SELFTESTE_OK 12/0`, ao vivo `P74_PEN44_PREFLIGHT_VERDE_CANDIDATA 18/0`, e as
duas corridas comparadas campo a campo com os campos de corrida excluídos dão **uma** diferença, `contexto.pid`
(1047550 contra 1049360), com os dois ficheiros de 107 230 B. O stdout do vermelho ficou em disco com o achado no
nome: `evidence/portao-indice-21-11-VERMELHO-a-uma-adjacencia-de-rotulo-chave-com-dois-pontos-e-literal-de-sete-letras-no-preflight.txt`.
Regra durável que daqui sai, e é a terceira vez que a casa a paga: um rótulo de campo terminado em `chave` seguido da
forma `dois-pontos, aspas, literal de 6 a 24` torna o ficheiro portador do padrão, **inclusive quando o valor é um
sentinela** — por isso a frase de cima nomeia a forma por descrição e não a reproduz, porque reproduzi-la tornaria
esta secção portadora dela.

**O terceiro defeito não era da PEN-44, era do portão do pacote, e só se viu porque a peça nova o ignorou em
silêncio.** A primeira corrida de `scripts/pacote-municipal-confere-pecas.mjs` depois disto imprimiu
`sem_registo=["PEN-41","PEN-43"]` — com a PEN-44 escrita, certificada e na tabela `PECAS`, e o portão ainda assim
vermelho-em-nada. A causa é o recorte da classe: o censo de candidatas filtrava `/^p73-pen\d+-ddl-candidata\.sql$/`,
e esta peça é `p74-`, porque os seus instrumentos nasceram noutro prefixo. Uma régua com o prefixo da primeira peça
não vê a última, e o que ela imprime como «peças sem registo» passa a ser a lista das peças que a régua conhece. O
filtro passou a `/^p7\d-pen\d+-ddl-candidata\.sql$/`, e a mesma corrida passou a imprimir
`sem_registo=["PEN-41","PEN-43","PEN-44"]` com o motivo lido do corpus — a marca `MOTIVO-SEM-REGISTO · PEN-44`, que
então estava nesta secção e que a aplicação de 21/11 substituiu pelo bloco `REGISTO-DE-APLICACAO` no fim dela. O
dente do lado negativo intacto: `toda_peca_sem_registo_tem_motivo_no_corpus_e_apagar_a_frase_e_vermelho` continua a
correr sobre uma cópia do corpus com as marcas apagadas e a exigir que aí nada se encontre. Os contadores não
mudaram com isto: `PACOTE_MUNICIPAL_OK 24/0 · 173 pecas medidas`, `FORA_DO_INDICE 0 esquecidos`, `funcoes_das_candidatas=4`
— e é esse o ponto: a classe dos nomes novos do banco **não** contém a PEN-44, porque revogar execução não cria
função, enquanto a classe das peças não certificadas passou a contê-la.

**O que os 18/0 afirmam, e como se distingue de «está fechado».** O invariante não é «o SQL está bem escrito», é
`depois_e_simulado_e_o_antes_lido_confirma_o_predicado_da_peca`: no modo candidata o `depois` é uma simulação
construída sobre o catálogo de hoje (`invSim.anon_ainda_pode` vazio e `invSim.verde`), e o `antes` é lido do catálogo
vivo (`invVivo.anon_executa_algum_nome` com exactamente 45 entradas e `nomes_sem_leitura` vazio) — as duas metades
têm origens diferentes, e uma cláusula que só simulasse seria cortesia da minha própria construção. A preservação é
provada por dois caminhos independentes: `nenhum_papel_preservado_e_pai_do_anon` (se um dos preservados fosse
antepassado do `anon`, o `GRANT` reabriria o que o `REVOKE` fecha — `anon_herdado_de: []`) e o censo de papéis por
canal duplo, acima. `authenticated`, `service_role` e `postgres` não recebem `GRANT` porque já têm entrada explícita
na ACL: acrescentar-lhes um grau seria concessão nova, e o portão
`um_grant_a_quem_conservaria_de_qualquer_manera_chumba_o_invariante` existe para não deixar escrever isso — o
fixtures mostram-no com `grants_inuteis: ["f():authenticated"]` a dar vermelho num mundo fabricado.

**O facto novo que esta peça resolve no censo da PEN-43.** `bfr_municipalities_visible` estava declarada fora do
escopo da PEN-43 porque a ACL dela tem `=X/postgres` além do `anon=X` e fechá-la exigia `REVOKE … FROM PUBLIC` — que
é precisamente o que esta peça faz, com OK próprio. O preflight confirma-lhe a presença no alvo (`no_alvo: true`).
Os três nomes da PEN-43, esses, têm intersecção vazia com os 45 (`interseccao_com_pen44: []`, com a razão impressa ao
lado de cada nome: «a ACL viva não tem entrada a PUBLIC; a alavanca dela é `REVOKE … FROM anon`»), pelo que as duas
peças não se sobrescrevem. `bfr_school_set_municipality` continua fora, pela razão declarada na PEN-43 (porta de
etiquetagem volátil, mantida chamável por anónimo para devolver `42501`).

**O que este verde não afirma.** (i) Não mede o que cada um dos 45 nomes *devolve* a um chamador sem sessão — isso é
HTTP e foi medido em 21/11 por `scripts/p74-pen44-sonda-anonima.mjs` (selfteste offline
`P74_PEN44_SONDA_ANONIMA_SELFTESTE_OK 8/0`; ao vivo `P74_PEN44_SONDA_ANONIMA_OK 6/0 · 45 chamadas · 0 por escrever`,
registo `evidence/p74-pen44-sonda-anonima-21-11.json`, 36 811 B), com zero escrita no banco: uma leitura de
catálogo e POSTs anónimos sem argumentos, só aos nomes que as duas vias — a volatilidade declarada e o corpo SQL
vivo — classificam como leitura, e só guardando forma (tipo do corpo, chaves de objeto, nomes de coluna,
bandeiras), nunca valores de linha. Resultado medido: **nenhum dos 45 devolve linhas a um anónimo sem
argumentos** — 15 respondem 2xx com escalares (13 boolean, 1 null, 1 string sem identificador), 30 respondem 404
sem argumentos (26 por os exigirem, 4 que os não exigem e devolvem 404 na mesma), 0 corpos com identificador,
0 escritores chamados. **Aquela distribuição é a do mundo antes da peça** — a sonda correu às 04:39:22Z de 21/11 e o
DDL entrou às 07:32:24Z — e o estado aplicado já fora medido no mesmo dia, três minutos depois da conferência
(`evidence/p74-pen44-sonda-anonima-21-11-21-11-pos.json`, 40 567 B, `cfc63cc92b87c8e65b71394790316c08`,
`em=2026-11-21T07:35:53Z`). O que esta passada acrescenta é uma **reprodução**, não a primeira leitura:
`evidence/p74-pen44-sonda-anonima-21-11-21-11-pos-pen44.json` (40 567 B, `d6c8f282cb305141d621cf7b21efb2ed`,
`em=2026-11-22T02:43:13Z`, `P74_PEN44_SONDA_ANONIMA_OK 6/0 · 45 chamadas · 0 por escrever`), comparada com a de 21/11
excluindo os campos de corrida (`em`, `duracao_ms`): `iguais_sem_campos_de_corrida: true` sobre 22 735 caracteres
normalizados, com os dois `md5` de ficheiro a diferirem só por causa desses dois campos. O histograma mudou na
direcção prevista e o conjunto é o mesmo: **os 15 nomes que respondiam 200 respondem agora 401** — `identicos? true`,
`so_antes` vazio, `so_depois` vazio — e os 30 que respondiam 404 por aridade continuam os mesmos 30 (séries iguais).
`resumo.com_2xx` passou de 15 para **0** e `resumo.anon_X` de 22 para **0**. É esta a prova de HTTP do efeito da peça,
e não uma inferência do `REVOKE`: um `401` não é um `404`, e o que fechou foi o grau, não o nome.
(ii) Não fecha a exposição anónima inteira: fecha a via `PUBLIC`. Os 67 nomes executáveis por `anon` são outro eixo, e
o que neles não vem do `PUBLIC` — a entrada `anon=X` explícita — é a classe da PEN-43, não desta, e as duas peças têm
intersecção vazia de nomes. Nenhum número de «quantos ficam abertos depois» é afirmado aqui, porque seria uma
subtracção entre duas réguas de natureza diferente; o que se lê do artefacto é `fora_do_alvo: 14` com
`nao_declarados: []`, e esses 14 são os gatilhos. (iii) O verde de hoje não apaga o vermelho de ontem, e os dois são
do mesmo instrumento: o modo `--reversao` estava vermelho antes de a peça entrar
(`evidence/p74-pen44-preflight-reversao-21-11-d-VERMELHO-estado_de_antes_anon_executa_os_45_nomes_e_a_entrada_public_continua_na_acl.json`)
e está verde depois (`evidence/p74-pen44-preflight-reversao-21-11-21-11-pos-pen44.json`, 105 324 B,
`2e40f4799dea1ab35684fcf81e6a454d`, `P74_PEN44_PREFLIGHT_VERDE_REVERSAO 18/0`, `em=2026-11-21T07:35:03Z`). Nenhum dos
18 portões foi tocado entre as duas corridas; o que mudou foi o catálogo. (iii-b) O veredicto do aplicador é
`P73_MUNICIPAL_APLICADO_COM_CONFERENCIA_VERMELHA PEN-44`, cuja semântica está definida no §2.6: a escrita aconteceu e
a conferência de saída, corrida **dentro** do aplicador, voltou com exit 1 sem deixar registo
(`sequencia[1] = {papel: "conferencia de saida…", modo: "reversao", registo: null, codigo: 1}`). A causa tem nome e
tem artefacto, e não é do banco: a cláusula `…public_sobrou` rebentava num `ReferenceError` de TDZ na linha que lia
`invVivo` dentro do próprio inicializador — `anon === false` era `false` no estado por aplicar, logo o deref nunca era
avaliado; passou a `true` no estado aplicado e a linha morreu. A stack de 730 B está versionada em
`evidence/p74-pen44-reversao-21-11-VERMELHO-conferencia-do-aplicador-morreu-em-referenceerror-tdz-na-linha-que-lia-invvivo-dentro-do-proprio-inicializador.txt`.
O fixture que discrimina os dois mundos é `evidence/p74-pen44-tdz-fixture-21-11.txt`, com `por_aplicar.lancou: false`,
`aplicada.lancou: true` e `fixture_discrimina: true`. Portanto: o vermelho é do instrumento, a escrita é um facto, e
a mesma régua corrigida deu 18/0 do lado de fora. (iv) Depois de aplicada, a consequência permanente é de produto: um papel criado
amanhã **não** herda `EXECUTE` sobre estes 45 nomes, porque a herança era o `PUBLIC` — é o efeito desejado
(deny-by-default), mas é um efeito, e quem criar um papel de leitura novo vai ter de o conceder nominalmente.

**Caminho de aplicação, medido por recusa.** A peça está na tabela `PECAS` do aplicador com
`frase: 'APLICAR PEN-44 NO BANCO'` e `fraseRev: 'REVERTER PEN-44 NO BANCO'`, e o aplicador re-corre o preflight e
confere o md5 dos dois SQL antes de enviar seja o que for. O que correu nesta passada foi a recusa:
`evidence/p73-municipal-reversao-recusa-PEN-44-1795233672431.json` (590 B, `2bbb551a2c4d0cafc8bc8a3b68b80659`,
`escrito_no_banco: false`) com o motivo triplo impresso — preflight de reversão não verde, o registo dessa corrida, e
«o modo reversão só pode correr sobre uma peça aplicada». Foi por causa deste entrada na `PECAS` que o aplicador
ganhou a cláusula de espelho por **família de grau**
(`onde_a_candidata_retira_public_ou_preserva_papeis_a_reversao_devolve_as_mesmas_assinaturas_ao_mesmos_conjuntos`):
uma régua de forma única sobre as duas classes de peça não tinha positivo, porque as candidatas da PEN-38/39/41 não
revogam `PUBLIC` e devolviam `espelho: null` — agora o `null` é a classe fora da régua, impresso com as contas ao
lado (`nas_assinaturas_atingidas`, `fora_daquelas_para_outra_regua`), e a PEN-43 e a PEN-44 são as duas linhas com
`espelho: true`. Os nove fixtures dessa régua estão no self-teste (15/0), incluindo
`revoke_sem_grant_de_preservacao_e_um_mundo_novo` e `papel_esquecido_na_reversao_nao`.

REGISTO-DE-APLICACAO · PEN-44 — a frase `APLICAR PEN-44 NO BANCO` foi dita às 07:32:24Z de 21/11 e o aplicador
escreveu `evidence/p73-municipal-aplicacao-PEN-44-20261121T073215Z.json` (10 463 ms, candidata
`scripts/p74-pen44-ddl-candidata.sql` 17 835 B `262e22e5a63fadc42204b7d8c5b985c1` conferida contra o disco, reversão
`scripts/p74-pen44-ddl-reversao.sql` 16 574 B `68c5b2f0e15dbc16bafde3f608f29dbf` guardada sem ser enviada, varredura
`grant_execute: 45` e `revoke_execute: 67` com zero em todas as outras classes, contagens de dados iguais antes e
depois). A peça continua sem `CREATE FUNCTION` — `nomes_na_candidata: []` é o valor certo, porque revogar execução a
uma entrada `PUBLIC` não cria função nenhuma — e é por isso que o censo de funções novas do banco
(`funcoes_das_candidatas=4`) não a contém e não a pode conter.

### 2.11 · PEN-42 — o nome que o `front` servido chama e o catálogo não tem — APLICADA 21/11, com a porta dos graus ainda vermelha

**O que foi medido, não suposto.** O bundle servido da v142 chama `rpc('register_gate_checkin_v2'` uma vez, no
deslocamento de bytes 3 045 454 dos 3 556 664 que o ficheiro tem; `pg_proc` tem zero linhas com esse nome, e é o
404 `PGRST202` que a condicional do módulo produz quando o ramo não-legado é tomado. A função viva
`public.register_gate_checkin` (oid 30855) tem **a mesma identidade de seis argumentos**
(`target_badge_token uuid, gate_direction text, visual_confirmation boolean, intake_source text, target_shift text,
exception_reason text`) e **as onze colunas devolvidas** que o chamador lê. Logo a PEN-42 não é comportamento em
falta: é um nome trocado entre o `front` e o catálogo, e o remédio correcto é um encaminamento, não uma função nova.

**O que o estado medido diz, e a correção de uma frase minha escrita por raciocínio.** Os bytes definem
`gateLegacyMode()` como `state.loaded && (state.errors.includes("configuração de turnos") ||
state.errors.includes("calendário letivo"))` — a prédica é sobre **etiquetas de erro**, não sobre «zero linhas». A
tabela medida em `evidence/p73-rm52-estado-calendario-20-11.txt` tem quatro estados e o de hoje é
`B_hoje_200_com_zero_linhas`, com `legacy=false`, `lanca=true` e `rpc=register_gate_checkin_v2`: depois do DDL do
calendário as mesas existem e o `fetch` devolve 200 com zero linhas, nenhuma etiqueta entra em `state.errors`, o ramo
legado **não** é tomado e o check-in chama o nome ausente — a portaria está partida **agora**, e é por isso que a
PEN-42 é prioridade A. O estado em que o ramo legado atendia era o `A_antes_do_ddl_404` (`legacy=true`), quando as
mesas ainda não existiam e o `fetch` rebentava; `C_conteudo_confirmado` e `D_dia_confirmado_sem_janela_a_cobrir`
também chamam o nome ausente. A consequência para o RM-5.2 inverte-se portanto em relação ao que escrevi: semear o
calendário **não** parte a portaria, herda-a partida, e o que a PEN-42 destrava é o check-in de hoje — deixá-la por
aplicar deixa o RM-5.2 sem nada que se possa medir no fim. Escrever «hoje o front
toma o ramo legado» foi inferência minha a partir de `linhas=0`, e o registo do preflight carregava a mesma frase no
campo `o_que_este_verde_nao_prova`; os dois foram corrigidos pelo texto medido acima, e o registo re-emitido com a
correção é `evidence/p73-pen42-preflight-candidata-21-11-e.json` (12/0) — o `-d` fica como a corrida em que a medição
dos doze portões estava certa e a frase de rodapé não estava.

**A peça, com a pegada que o registo de aplicação certifica.** `scripts/p73-pen42-ddl-candidata.sql` (4 841 B, md5
`3d2a386023885441915e6b5832fe9f79`) é puramente aditiva — um `CREATE OR REPLACE FUNCTION` com `LANGUAGE sql VOLATILE
SECURITY DEFINER SET search_path TO ''`, que selecciona as onze colunas do `FROM public.register_gate_checkin(...)` com
notação nomeada e não tem comportamento próprio; zero `ALTER`, zero `DROP`, zero `INSERT`/`UPDATE`/`DELETE`. Os graus
que o ficheiro escreve são duas linhas: `REVOKE ALL ... FROM PUBLIC` e `GRANT EXECUTE ... TO authenticated` — uma só
entrada de GRANT, mais estreita do que a viva de propósito, porque o único chamador do nome novo é o `front` com
sessão. Nenhum parâmetro colide com uma coluna devolvida — a colisão resolveria pela coluna e não pelo argumento,
que é exactamente o que `LANGUAGE sql` faria em silêncio. A peça inteira vive dentro de `BEGIN;`/`COMMIT;`: é a forma
que o aplicador exige (`/^BEGIN;/m` e `/^COMMIT;/m` medidos sobre os bytes crus, não sobre texto normalizado) e é o
que garante que os graus nunca chegam a viver separados da função que declaram — se o `CREATE` falhar, nenhuma linha
de `REVOKE`/`GRANT` acontece.

**A reversão.** `scripts/p73-pen42-ddl-reversao.sql` (795 B, md5 `a9ca26a22526ec2e1ae8a40323ef8cec`) é um único
`DROP FUNCTION` com a assinatura inteira e **sem `IF EXISTS`**: se o objecto não estiver lá, a reversão chumba em vez
de fingir que reverteu. Está na mesma forma transaccional da candidata, pela mesma razão e com o mesmo portão.

**Os portões do preflight cresceram 12 → 17 por medida, e as três corridas vermelhas de `--reversao` dizem qual deles é achado.** `scripts/p73-pen42-preflight.mjs`
corre nos dois modos e lê o estado vivo pelo catálogo (`pg_proc`, `pg_get_function_identity_arguments`,
`pg_get_function_result`, `proacl`), sem JWT de sessão e sem escrita. Com 12 portões estava verde em modo candidata em
`evidence/p73-pen42-preflight-candidata-21-11-d.json` (12/0) e `-…-e.json` (12/0 — a mesma medição com a frase de
rodapé corrigida). Antes de enviar, o aplicador exige um preflight fresco cujo veredicto comece pelo prefixo
certificado e termine em `/0`: foi `evidence/p73-pen42-preflight-candidata-21-11-apl20261122T014151Zc.json` (15/0), e
o registo da aplicação é `evidence/p73-municipal-aplicacao-PEN-42-20261122T014151Z.json`. Os dois portões que
cresceram entre `-e`, `-f` (13/0) e `-g` (15/0) são os da forma transaccional crua (`/^BEGIN;/m` e `/^COMMIT;/m`) e o
da pegada em bytes crus dos dois ficheiros — nenhum deles tinha positivo possível antes de eu escrever a peça e ver o
aplicador recusar.

Depois de aplicada, o instrumento tem **17 portões** e o modo `--reversao` está vermelho em três corridas, e a
diferença entre as três é toda minha, excepto a última:
- `evidence/p73-pen42-preflight-reversao-21-11-h.json` (1 de 17): duas cláusulas em falta, e uma delas era o hash do
  corpo da viva esperado do **cabeçalho da candidata** — `bfeac2a3…` nunca se reproduziu (`medido.corpo_md5` é
  `f43e20be…` com 3 873 B, pelos dois canais). A outra era a cláusula morta do ponto seguinte.
- `evidence/p73-pen42-preflight-reversao-21-11-i.json` (1 de 17): com o esperado a vir da frase versionada deste
  runbook, a única cláusula falsa passou a ser `service_role_pode === false` — e o censo do catálogo mede **163 de 163**
  funções de `public` executáveis por `service_role`, pelo que uma asserção que exige `false` a esse papel não tem
  positivo em casa nenhuma: régua morta, outra vez defeito meu.
- `evidence/p73-pen42-preflight-reversao-21-11-k.json` (1 de 17): a mesma promessa reescrita como relação — «esta peça
  não dá a nenhum papel um grau que a viva não tenha», medida como `alargamento_de_papeis` entre os dois `proacl` —
  ganhou positivo (o fixture `service_role_restituido` dispara-a e `como_declerado` não) e **continua vermelha no
  mundo**: `alargamento_de_papeis = ["anon"]`. É o único achado que sobra, e é o que a PEN-48 trata em §2.12.

`evidence/p73-pen42-preflight-candidata-21-11-j.json` é o vermelho legítimo do modo candidata: `obtido[0] = false` em
`o_estado_vivo_bate_com_o_que_este_modo_pressupoe`, porque o grau do anónimo que esse modo pressupõe em falta já lá
está — ou seja, re-aplicar a PEN-42 chumba no preflight, e é o desenho. O modo `--reversao` tinha estado vermelho por
falsificação legítima **antes** da aplicação, e esse vermelho conserva-se com o motivo no nome:
`evidence/p73-pen42-preflight-reversao-21-11-rev-a-VERMELHO-falsificacao-legitima-a-candidata-ainda-nao-foi-aplicada.json`.
Os três vermelhos do próprio instrumento pré-aplicação também ficaram em disco com o defeito no nome: dois portões
prometiam contagem crua de sítios e seis privilégios quando a classe só pode exprimir-se como relação; a agulha do
sítio vivo recebeu uma entrada de carro no meio do identificador porque `\\${VIVA}` dentro de um template literal
produz a barra e não o nome, e a sonda passou a ver zero sítios — o verde sobre conjunto vazio; e a agulha do ramo
legado exigia o texto que o próprio `match` já tinha consumido, o que produzia um `NAO_CLASSIFICADO` em vez de um
`ramo_legado`.

**O censo de superfície, para saber se era um nome ou dez.** `scripts/p126-censo-rpc-do-bundle-servido.mjs` extrai
todos os `rpc('<nome>'` dos bytes do bundle e confirma cada nome contra `pg_proc`: na v142 são **25 nomes distintos,
32 chamadas, 22 presentes no catálogo e exactamente 3 ausentes**, e os três ausentes são chamados uma vez cada um.
Os outros dois não têm gémeo no catálogo: `bfr_confirm_school_calendar` (confirmar um dia letivo e devolver a
contagem) e `correct_gate_attendance` (correção de presenças com `target_student`/`target_date`/`target_status`/
`correction_reason` auditável) são **semântica de produto nova**, e não foram inventados em SQL por este instrumento
— precisam de decisão e de OK, não de um ficheiro. Registos: `evidence/p126-censo-rpc-21-11-v142.json` e
`evidence/p126-censo-rpc-21-11-v142b.json`. **Re-corrido depois da aplicação**, sobre o mesmo bundle (3 556 664 B, md5
`0e22e78fe1e0ce929ec4717f86365ad9` — o par byte-a-byte do ficheiro servido da v142): **25 nomes, 32 chamadas, 23 no
catálogo, 2 ausentes**, com `register_gate_checkin_v2` a sair da lista dos ausentes — é a prova de leitura de que a
PEN-42 fechou o defeito no mundo e de que não sobraram nomes esquecidos pelo meio. Registo
`evidence/p126-censo-rpc-21-11-v142-apos42.json`.

**Defeito de instrumento apanhado e corrigido por medida.** A primeira corrida do censo escreveu o registo completo
e depois morreu no `teardown` do `fetch` com uma asserção de libuv do build do Windows, deixando `exit=127` num
instrumento desenhado para sair 0. A causa era o `process.exit(0)` explícito a forçar o fecho com o socket ainda em
curso; retirei-o (o código de saída natural já é 0) e re-corri. As duas corridas comparam-se campo a campo **sem os
campos de corrida**: 3 335 caracteres de cada lado, idênticas. O registo da corrida que morreu fica em disco como
história, porque um vermelho de instrumento nunca se apaga.

**A régua do corpo da viva, e de onde ela lê o esperado.** O `SELECT` do revestimento não tem comportamento próprio
só se a função que ele encaminha não tiver sido reescrita — e essa é uma asserção sobre bytes alheios, pelo que precisa
de um esperado versionado que não venha do artefacto validado. A frase declarante é esta:

```
CORPO-DA-VIVA · register_gate_checkin — pg_get_functiondef 3 873 B, md5 f43e20be8633b52a1d29cf130eddd2d8
```

É medida em 21/11 sobre o catálogo vivo (`oid 30855`, `octet_length` e `md5` do `pg_get_functiondef`, com o `md5` do
mesmo texto recalculado em Node como canal independente — os dois canais dão o mesmo hash). O preflight lê o par
desta frase por regex; se a frase desaparecer, o instrumento aborta com `RUNBOOK_SEM_FRASE_CORPO-DA-VIVA` em vez de
dar verde. A segunda metade da prova não depende de hash nenhum: `pg_proc.xmin` da viva (`722572`) é anterior ao
`xmin` do revestimento (`903646`), e um tuplo reescrito pela transacção de aplicação teria `xmin` igual ao do
revestimento — logo «`viva < revestimento`» quer dizer «a aplicação não tocou na viva».

**O que este fecho não autoriza.** A PEN-42 está aplicada e nada aqui pede autorização para a re-aplicar — o pedido em
aberto é outro: os graus do revestimento (§2.12, PEN-48), que precisam da sua frase literal `APLICAR PEN-48 NO BANCO`.
Publicar seja o que for, escrever no banco, reverter uma peça, `git push` e rotar senhas continuam a pedir cada um a
sua frase; e nada disto toca no que a PEN-42 não é — o `search_path` dos predicados municipais e a porta de
visibilidade pelo rpc ficam descritos em §5 e na tarefa aberta, não aqui.

### 2.12 · PEN-48 — fechar ao `anon` o grau que a PEN-42 trouxe por default — CANDIDATA CERTIFICADA 21/11, NADA APLICADO

**O achado, em uma linha lida do catálogo.** O revestimento que a PEN-42 criou (`register_gate_checkin_v2`, oid 32918)
tem o grau de `EXECUTE` do pseudo-papel `anon` numa entrada explícita da `proacl`
(`postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres`), enquanto a viva (oid 30855)
**não** tem (`postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres`). A diferença entre os dois conjuntos
de papéis imprime-se no registo como `alargamento_de_papeis_sobre_a_viva = ["anon"]`: a PEN-42, ao criar um nome novo,
alargou a casa por um papel que a função que ela encaminha nunca aceitou.

**De onde o grau vem, e por que a candidata da PEN-42 não o tinha fechado.** A própria candidata já fazia
`REVOKE ALL ON FUNCTION public.register_gate_checkin_v2(...) FROM PUBLIC` e um `GRANT EXECUTE` só ao `authenticated`.
O `REVOKE … FROM PUBLIC` tira a entrada do pseudo-papel `PUBLIC`; não desfaz as concessões que o **privilégio default
do esquema** fez no instante em que o objecto nasceu — a mesma assimetria que a §2.7 e a §2.10 mediram para as outras
famílias, e o motivo por que a régua de eficácia desta casa não aceita «o SQL diz que revogou» como prova.

**O que o grau é hoje, medido por dois canais independentes — e o que não é.** Foi a única pendência deste pacote com
uma afirmação de segurança que eu ainda não podia fazer, por isso a medição veio antes da prosa:

- *Canal do catálogo*: a cadeia de defesa da viva tem quatro elos e os quatro estão verdes
  (`defesa_da_viva.medido = [true,true,true,true]` em `evidence/p73-pen48-preflight-candidata-21-11-e.json`). O
  primeiro elo é a frase, extraída do corpo da viva:
  `if not public.is_gatekeeper() then raise exception 'Acesso restrito ao porteiro'; end if;`. O segundo é o
  `coalesce(… in ('gatekeeper','developer'), false)` de `is_gatekeeper` — é o `coalesce` que transforma «sem sessão»
  em `false` e não em NULL, porque `if not NULL` não toma o ramo. O terceiro é
  `public.current_role()` = `select role from public.profiles where id = auth.uid()`; o quarto é `auth.uid()` a ler os
  `current_setting('request.jwt.claim…')`, que sem JWT dão nulo.
- *Canal do ar*: chamados **com os seis argumentos completos** (o `PGRST202 … without parameters` da minha primeira
  sonda não dizia nada do grau — aridade é outra coisa), um pedido sem sessão devolve na viva `401 / 42501 permission
  denied for function` e no revestimento `400 / P0001` com o texto da guarda. Ou seja: o grau existe, é tocável, e o
  que o pára é o corpo de outra função.

Logo a PEN-48 **não tapa um buraco aberto** — nenhum dado é lido nem escrito por essa porta hoje, e as linhas de
`gate_checkins` com `gatekeeper_id` nulo continuam impossíveis porque o `raise` vem antes de qualquer `INSERT`. O que
ela fecha é uma defesa emprestada: a recusa mora no texto da viva, e quem reescrever a viva — trocar o `coalesce` por
um `case`, mudar a ordem dos ramos, acrescentar um ramo de `insert` antes da guarda — abre uma porta anónima sem que
**uma única linha de ACL** mude, e nenhum portão desta casa daria vermelho. A régua que daria é o portão novo do
preflight, que chumba elo a elo (`guarda_sem_coalesce`, `papel_por_constante`, `viva_sem_guarda`).

**A peça, e a sua forma.** `scripts/p73-pen48-ddl-candidata.sql` (2 348 B, md5 `a0a83855cb5165fb617e2125753cd44e`) é
uma linha de `REVOKE EXECUTE ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text) FROM anon;`
entre `BEGIN;` e `COMMIT;`, com `SET LOCAL statement_timeout = '120s'` e `SET LOCAL lock_timeout = '10s'` — aditiva
no sentido estrito: tira um grau, não cria objecto, não toca em dados. A assinatura com que o nome é referido é a lista
de tipos do `CREATE FUNCTION` da candidata da PEN-42, derivada por `tiposDeCreateFunction` e conferida contra
`pg_get_function_identity_arguments`, porque este servidor devolve as identidades **com nomes de parâmetros** (§2.7).
`scripts/p73-pen48-ddl-reversao.sql` (794 B, md5 `969fe709bc7d275c62511481d64be1a6`) é o `GRANT … TO anon` espelhado,
na mesma transacção.

**O preflight: 14 portões, dois canais, e os mundos que os negam.** `scripts/p73-pen48-preflight.mjs` (modo candidata
`evidence/p73-pen48-preflight-candidata-21-11-b.json` 12/0 na primeira certificação, e
`…-e.json` **14/0** depois de os dois portões novos — a cadeia de defesa e o par de respostas do ar — entrarem). O
vermelho do modo `--reversao` é falsificação legítima e conserva-se com o motivo no nome:
`evidence/p73-pen48-preflight-reversao-21-11-c-VERMELHO-falsificacao-legitima-a-peca-ainda-nao-foi-aplicada.json` (com
12 portões) e
`evidence/p73-pen48-preflight-reversao-21-11-f-VERMELHO-falsificacao-legitima-a-peca-ainda-nao-foi-aplicada-e-o-ar-tambem-o-diz.json`
(3 de 14: o catálogo, o portão do alargamento e **o ar**, que em modo reversão esperava `401|42501` no revestimento e
ainda recebe `400|P0001`). O vermelho de instrumento de `-a` também ficou em disco com os três defeitos no nome: a
flag `/g` metida dentro do padrão em vez do segundo argumento de `new RegExp`, um `esperado` com um booleano colado a
um número, e a comparação do `prefixo` do aplicador sem o sufixo `_VERDE`. O portão que contava queries a três passou a
contar a relação (`formas.length === sítios de q`, um só toque directo de `sql`, e o `>= 3` como soalho), porque a
literal envelheceu no dia em que a cadeia de defesa precisou dum quarto SELECT — e a contagem por agulhas compostas em
tempo de execução, para o instrumento não se varrer a si mesmo.

**O que fica de fora, medido no mesmo registo.** O censo do catálogo dá **163** funções de `public`, das quais **20**
executáveis por `anon`, **16** com entrada `anon=X` explícita e **0** com `proacl` nula. A PEN-48 fecha **um** nome. A
PEN-43 já fechou as três funções municipais de leitura e a PEN-44 trata da família que só chega ao `anon` pela entrada
a `PUBLIC`; ficam nomes anónimo-executáveis, e a frase «a porta do anónimo está fechada» continua falsa enquanto for
sobre a classe e verdadeira só sobre este nome.

MOTIVO-SEM-REGISTO · PEN-48 — não existe registo de aplicação porque nenhuma frase `APLICAR PEN-48 NO BANCO` foi dita;
a peça está na tabela `PECAS` do aplicador, o preflight está verde em modo candidata com 14/0, e a recusa do aplicador
sem a frase está capturada em `evidence/p73-municipal-aplicador-recusa-frase-pen48-21-11.txt` com `node_exit=2`.

**A recusa, medida em vez de suposta.** Depois de a peça entrar na tabela `PECAS`, a pergunta honesta era se o
aplicador a deixaria aplicar por engano. Corre-se sem a frase e ele imprime
`RECUSADO · aplicacao · ["--ok nao e a frase certificada deste modo; esperado exatamente \"APLICAR PEN-48 NO BANCO\"", …]`
e sai 2. Este tipo de recusa não escreve registo em disco — o ramo que grava a negativa é o das **pré-condições** (o
que existe como `evidence/p73-municipal-aplicacao-PEN-42-20261122T014151Z.json` e os dois `…-recusa-*.json`), e a
frase errada morre no stdout; por isso a prova aqui é a captura do stdout, com o código de saída dentro do ficheiro e
não na conversa. A recusa de `ok` solto e a de peça inexistente continuam registadas nos dois ficheiros próprios.

**O que este verde não autoriza.** Aplicar a PEN-48, reverter a PEN-42, publicar, mintar contas, rotar senhas ou
`git push`: cada um com a sua frase literal, e nenhuma delas se lê deste parágrafo. E nada aqui altera a decisão
tomada no ciclo da v142 de **manter** as quatro concessões municipais de contas reais — a PEN-48 é graus de funções,
não concessões de gente.

## 3 · Provas de fecho (o que é medição e o que é previsão)

### 3.1 · Depois de PEN-38 e da etiquetagem

```
node scripts/p73-pen38-alcance-por-concessao-20-11.mjs
node scripts/p73-pen38-preflight.mjs --reversao
P73_SUF=fecho node scripts/p73-municipal-etiqueta.mjs --lista
```

Fecho real: `escolas_com_municipio` sobe de 0 para o número de escolas etiquetadas (lê-se do terceiro comando,
`escolas.filter(e => !e.municipality_id).length` a descer), e o PEN-38 modo `--reversao` dá
`P73_PEN38_PREFLIGHT_VERDE_REVERSAO 10/0` — que é a afirmação de que o estado vivo é o estado de **saída** da
candidata, não a esperança de que ela correu.

### 3.2 · Depois de PEN-41 (obrigatória, porque este passo tira leitura a gente real)

Re-correr `scripts/p73-pen38-alcance-por-concessao-20-11.mjs` e esperar, por papel: `director` 848/27;
`secretary` com vínculo 848/27; `secretary` **sem** vínculo 0/0. A classe vazia imprime-se com o zero, não se
suprime — é o portão `a_populacao_afectada_tem_somas_coerentes_com_o_zero_impresso` do preflight.
Um «todos ainda vêem tudo» depois disto é cache de sessão, não DDL falhado: conferir em sessão nova antes de
concluir.

### 3.3 · Depois da publicação da v137 (o passo que hoje não pode correr)

```
node scripts/v137-pos-deploy.mjs        # só depois do `wrangler deploy` de §2.6 com os três stdout/list/status em evidence/
```

É medição a partir do instante em que as três saídas existirem; hoje é a previsão com o nome do comando. O que os
portões prometem, e com que fonte: `C1`/`C3` comparam o que o ar serve com `worker-deploy-v137-remendo-pen40/esperado-v137.json`;
`C2` exige que a shell **não** tenha mudado desde `worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`;
`C4`/`C5` medem o módulo servido contra o md5 da base e o delta de 790 bytes declarado pelo remendo, e procurem a
agulha nova sem a agulha velha; `C12`/`C13` percorram os assets que **não** mudam — o censo é
`worker-deploy-v123-pdfs/esperado-v123.json` menos o módulo remendado, e não os doze, porque a v137 mudou um deles
à proposição; `C15`/`C16` só valem com as
três saídas do `wrangler` em disco. A prova ao nível da candidata, essa já é corrida e está em
`evidence/p73-leitor-bancada-pen40-20-11e.json` (`P73_BANCADA_PEN40_AB_VERDE`, `MONTA` 6/6 na candidata contra
`NAO_MONTA` 6/6 na base): é o banco, não o browser, e por isso a peça diz no campo
`o_que_esta_peca_prova` que não prova o efeito do remendo na tela — para isso é re-correr a bancada com as duas
pernas no ar depois do deploy.

### 3.4 · O que ainda não é prova

* PEN-39 aplicada **não** é tela a mostrar números: o consumo dos agregados pelo módulo servido é código de
  produto, e esse produto existe desde 20/11 como v138 local (§2.8) — candidata `V138_CANDIDATA_OK 8/0` e bundle
  `V138_BUNDLE_OK 28/0`. O que continua por provar é o ar: `scripts/p73-sonda-uso-quatro.mjs` mede 0 ocorrências
  dos dois nomes no bundle publicado, e enquanto a v138 não for publicada a PEN-39 é DDL sem consumidor no site.
* A etiquetagem é contável em `bfr_municipal_audit`; a sua ausência **não** é previsão, é o portão
  `trilha.linhas_para_esta_escola > 0` do artefacto de escrita, que hoje nunca correu porque o RPC não existe.
* A PEN-43 passou a ter caminho de aplicação em 20/11 (FALTA-5 do §2.7, fechada ao nível do instrumento), e isso não
  é prova de porta fechada: o `REVOKE` não corre, logo as três funções de leitura continuam executáveis por anónimo.
  O que o pacote prova é o efeito medido do grau e o censo dos 27 nomes que a peça não toca; correr
  `node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-43 --ok "APLICAR PEN-43 NO BANCO"` é o único passo que
  autoriza a frase «fechada» — e hoje dá recusa medida, não erro de digitação minha.

### 3.5 · Depois da publicação da v138 (o passo que hoje não pode correr)

```
node scripts/v138-pos-deploy.mjs --selfteste   # offline, já corrido: 0 HTTP, 0 escrita
node scripts/v138-pos-deploy.mjs               # só depois do `wrangler deploy` de §2.8, com as três saídas em evidence/
```

O que **já é medição** hoje: o `--selfteste` offline, 11 casos, `V138_POS_DEPLOY_SELFTESTE_OK 11/0` em
`evidence/v138-pos-deploy-stdout-selfteste-20-11.txt` — ele confere as fontes de espera, que os dois nomes do
DDL distinguem a candidata da shell publicada, que a régua do delta bate com a promessa da candidata **e** do
bundle, que o módulo da v138 é o mesmo remendo da v137, que a etiqueta mudou com o SW do mesmo comprimento, que a
recusa de publicação tem positivo e negativo possíveis, que o antecessor se deriva do disco (`agora` = v136, e o
fixture prova que ele passaria a v137 se a v137 fosse publicada), que o URL vem do diário e que a lista de
controlo exclui só o módulo. E é medição a recusa: `node scripts/v138-pos-deploy.mjs` sem as três saídas imprime
`V138_POS_DEPLOY_NAO_PUBLICADA` com exit 2 (`evidence/v138-pos-deploy-stdout-recusa-20-11.txt`) e não escreve
registo, de propósito — um vermelho contra um ar que ainda serve a v136 é indistinguível de um bundle partido.

O que **ainda é previsão**: a corrida de ar, 18 portões de `C0` a `C17`. As duas cláusulas que a v137 invertia
estão invertidas aqui, e é a diferença de natureza entre as duas publicações: `C2` afirma que a shell servida
**deixou** de ser a da v136 e a da v137 (com o delta de 3 787 B conferido contra `portoes-v138-candidata.json`), e
`C4` afirma que o módulo servido **continua** byte a byte o remendo da PEN-40. `C1`/`C3`/`C6`/`C14` comparam com
`worker-deploy-v138-painel-municipal/esperado-v138.json`; `C5` conta os dois nomes lidos do DDL na shell servida e
exige zero ocorrências da porta de etiquetagem; `C7` pega no SW com os mesmos bytes e md5 diferente; `C8`–`C11`
são headers, CSP, 404 e firebase; `C12`/`C13` percorrem os onze assets que não mudam (censo =
`worker-deploy-v123-pdfs/esperado-v123.json` menos o módulo); `C15`/`C16` só valem com as três saídas do
`wrangler` em disco, e `C16` ancora a cadeia de reversão no antecessor que o disco provar. Nem um nem outro
provam a tela: `o_que_esta_peca_prova` diz que o ar serve o bundle gateado, e que o que o painel mostra a um
utilizador autenticado é uma corrida de browser à parte — com a etiquetagem do §1 por decidir, os números legítimos
são zero, e zero não distingue «painel vazio por desenho» de «painel partido» sem essa corrida.

## 4 · Reversão, se for preciso desfazer

Cada peça tem reversão certificada pelo próprio preflight do modo candidata, e o modo `--reversao` só dá verde
depois de a candidata ter sido aplicada — provado legitimamente em
`evidence/p73-pen41-preflight-reversao-20-11e-VERMELHO-falsificacao-legitima-a-candidata-ainda-nao-foi-aplicada.json`.

```
node scripts/p73-pen41-preflight.mjs --reversao     # verde esperado só depois de aplicar
node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --reverter --ok "REVERTER PEN-41 NO BANCO"
```

FALTA-2 está fechada em 20/11: o caminho executável existe, no mesmo aplicador, sob `--reverter`. Não é a
aplicação com outra flag — são duas coisas que o desenho tinha de separar:

* **um segundo portão de autorização.** A frase é `REVERTER <peca> NO BANCO`, uma por peça. Ela não aceita a de
  aplicação e a de aplicação não aceita ela: aplicar e reverter são OKs distintos, nenhum arrasta o outro, e a
  recusa diz por nome qual dos dois modos a pessoa tentou.
* **a ordem invertida dos dois preflights.** O portão de entrada passa a ser o modo que descreve o estado que se
  vai destruir, e o de saída o modo que descreve o estado limpo:

| quando | preflight | o que o verde afirma |
|---|---|---|
| antes de escrever | `--reversao` | a peça está de facto aplicada — sem isto não há nada a desfazer, e é esta a única afirmação que torna a reversão não-nula |
| depois de escrever | candidata (sem flag) | o estado vivo voltou ao de antes da candidata, ou seja: o SQL que correu foi o certificado e desfaz-se com o ficheiro certificado |

O registo (`evidence/p73-municipal-reversao-PEN-XX-<stamp>.json`) traz os dois portões por **modo**
(`preflight_candidata`, `preflight_reversao`) e a ordem em `sequencia`, com o papel de cada um, porque aplicar e
reverter correm os mesmos dois modos por ordem oposta — um leitor não tem de decorar qual verde veio primeiro. A
varredura de perigo é a mesma régua nos dois lados e corre sobre o SQL que o modo enviaria: `DROP FUNCTION` agora
conta (`perigos.drop_function`) porque é o trabalho duma reversão, mas continua fora da lista de zeros, pelo que
um `DELETE`/`TRUNCATE`/`DROP TABLE` escrito à mão num ficheiro de reversão chumba igual. Os `baselines` das cinco
mesas de dados também se exigem inalterados nos dois modos — reverter DDL não é tocar em conteúdo.

O que está medido, com a corrida na conversa: três recusas de reversão e uma de aplicação corridas hoje, stdout
em `evidence/p73-municipal-reversao-stdout-recusas-20-11.txt` (cada secção com o seu `node_exit`; `2` em todas,
porque recusa não é sucesso silencioso):

* `evidence/p73-municipal-reversao-recusa-sem-ok.json` — `--reverter` sem frase: recusa antes de ler o banco.
* `evidence/p73-municipal-reversao-recusa-frase-de-aplicacao.json` — a frase `APLICAR PEN-38 NO BANCO` em modo
  reversão: recusa nomeando o modo a que a frase pertence.
* `evidence/p73-municipal-aplica-ddl-recusa-frase-de-reversao.json` — o espelho: `REVERTER PEN-38 NO BANCO` sem
  `--reverter` recusa, o que prova que não bastou trocar a tabela de frases de lugar.
* `evidence/p73-municipal-reversao-recusa-precondicao-peca-nao-aplicada.json` — o caso forte: com a frase certa,
  o preflight em modo reversão deu `P73_PEN38_PREFLIGHT_VERMELHO_2` contra o estado vivo e o aplicador recusou
  **sem enviar SQL**, com `escrito_no_banco: false`. O registo dessa pré-condição é o
  `evidence/p73-pen38-preflight-reversao-20-11e-rev20261120T204118Zr-VERMELHO.json` que ela cita.

Estado vivo lido depois das quatro recusas: 0 funções das candidatas, 4 policies alvo, 0 escolas com município —
nada mudou, que é a conferência de que «recusar» aqui quis mesmo dizer não escrever.

O que **não** está medido, e não se pode escrever como provado: o ciclo completo aplicar → reverter conferido
numa única corrida. Nunca correu, porque nenhuma das três peças foi aplicada, e o primeiro
`p73-municipal-reversao-PEN-XX-<stamp>.json` só pode nascer depois de um `APLICAR PEN-XX NO BANCO` autorizado. O
que o verde de hoje cobre é o caminho de recusa e as regras de estrutura dos ficheiros; a conferência de saída do
modo reversão (`preflight` candidata verde **depois** de desfazer) é a parte que continua por medir, e é
exactamente a que FALTA-2 existia para não ficar ao arbítrio de quem cola SQL.

## 5 · O que fica fora deste pacote (e porquê)

1. **`INSERT` do município real.** Escrita de conteúdo, sem instrumento; é a opção 1 do §1 e pede OK próprio.
2. **Apagar a fixture `Sao Paulo (SM8 fixture — apagar)`.** Só faz sentido depois de as concessões estarem
   apontadas para um município real; hoje apagá-la deixa 4 concessões órfãs.
3. **A publicação da v138 — não o seu código.** Desde 20/11 a v138 pertence ao pacote: candidata
   `V138_CANDIDATA_OK 8/0`, bundle `V138_BUNDLE_OK 28/0` e peça de fecho com self-teste verde estão escritos
   (§2.8, §3.5). O que fica fora é o `wrangler deploy`, que exige OK literal próprio, e a corrida de browser que
   mostra números a uma conta autenticada — essa continua bloqueada pela decisão de etiquetagem do §1, porque sem
   escola etiquetada os agregados devolvem zero e zero não distingue painel vazio de painel partido.
4. **RM-5.2 (seed do calendário letivo).** Estado medido em `evidence/p73-rm52-estado-calendario-20-11.json`
   e régua de completude em `evidence/p73-rm52-regua-completude-20-11.json`; conteúdo é decisão pedagógica.
5. **PEN-42 (`register_gate_checkin_v2`).** Fora do escopo municipal.
6. **Aplicar ou não a PEN-43 — a frase, não o caminho.** Desde 20/11 o caminho existe: preflight nos dois modos,
   peça entrada na tabela `PECAS` do aplicador, os dois SQL transaccionais com a pegada conferida contra o registo
   indexado da geradora (§2.7). O que fica do lado da casa é dizer `APLICAR PEN-43 NO BANCO`. O preço de aplicar é
   re-medir o canal depois (`scripts/p73-sonda-porta-municipal.mjs` passa a dizer `PORTA_MUNICIPAL_FECHADA` sem se
   aliviar uma letra); o preço de não aplicar é as três funções de leitura continuarem chamáveis por anónimo — 0
   linhas hoje, números reais no dia em que a etiquetagem do §1 for decidida.
7. **Aplicar ou não a PEN-44 — a frase, não o caminho.** Desde 21/11 o caminho existe nos dois sentidos (§2.10):
   geradora e preflight com self-teste offline, os dois SQL transaccionais com a pegada conferida contra o registo da
   geradora, e entrada na tabela `PECAS` do aplicador. O que fica do lado da casa é dizer `APLICAR PEN-44 NO BANCO`.
   O preço de aplicar é duplo e já está declarado: os 45 nomes deixam de ser herdáveis por um papel criado amanhã
   (deny-by-default — quem criar um papel de leitura novo tem de o conceder nominalmente), e a preservação dos 8
   papéis de plataforma passa de simulação a leitura do catálogo, que é o que o modo `--reversao` afirma e hoje chumba.
   O preço de não aplicar é permanecer o `PUBLIC` aberto sobre 45 nomes, com o grau de cada um deles a chegar ao
   `anon` por pseudo-papel e não por decisão. O censo de conteúdo que faltava foi medido em 21/11 (§2.10): nenhum
   dos 45 devolve linhas a um anónimo sem argumentos — 15 respondem 2xx com escalares, 30 respondem 404. A razão de
   a linha continuar M já não é o censo: é o DDL não aplicado, que pede a frase literal.
8. **`git push`** dos commits deste pacote: precisa de OK literal novo; nenhum push está autorizado pelo
   trabalho descrito aqui.
9. **Os sete portadores de credencial que vivem fora do índice, agora com guard próprio.** Até 21/11 a única
   régua de credenciais era `scripts/portao-indice.mjs`, que varre o **índice** (`git show :caminho`) — um
   ficheiro com a forma de credencial que nunca foi `add` é invisível para ele e fica à distância de um
   `git add -A` de ser publicado. Foi exactamente assim que o batch `1800682` levou um stdout de sessão para
   dentro do git. O guard novo é `scripts/p125-portadores-fora-do-indice.mjs`: varre o conjunto que um add amplo
   levaria (não-versionados não ignorados + modificados), com os padrões escritos duas vezes no próprio ficheiro
   — um literal meu e outro extraído da fonte do emissor, comparados `source` a `source` e `flags` a `flags` — e
   exige que cada casamento esteja declarado aqui, com a frase da razão. Os sete, com o motivo medido (o
   `evidence/p125-portadores-fora-do-indice-21-11-b.json` imprime rótulos, contagens e comprimentos, nunca o
   valor): `evidence/ah2-home-papel-a-papel-v1.json` tem decisão assinada em `26e220d` — o sucessor `v3` está no
   índice; `evidence/.sm7-sup1366j.txt`, `evidence/.sm7-sup1366k.txt`,
   `evidence/sm7-municipal-education_supervisor-1366-sup1366j.json` e
   `evidence/sm7-municipal-education_supervisor-1366-sup1366k.json` — a série r substituiu as corridas j e k do
   1366, e nas finais o campo `erros_do_modulo` é `[]` (é por isso que nenhuma das quatro tem de ser citada como
   prova viva); `evidence/ANTERIOR-p73-corpos-de-artefactos-20-11d-corpus-so-html.json` — o dump ANTERIOR ficou
   fora porque o sucessor do dia está no índice (`evidence/p73-corpos-de-artefactos-20-11f.json`);
   `evidence/sm7-municipal-education_supervisor-390-sm8bar390.run.log` — o stdout de célula fica fora quando o
   registo json da mesma célula está no índice (`evidence/sm7-municipal-education_supervisor-390-sm8bar390.json`).
   Todos os casamentos dos sete têm o rótulo `chave`, que é a classe já resolvida no §SM.14 e no §SM.24: o
   padrão do portão não distingue «chave de sessão» de «nome de campo acabado em chave», e é por isso que a
   proteção aqui é a declaração com frase, não a convicção de que o valor é inofensivo. Cai a frase desta lista,
   o nome volta a contar como esquecimento e o `pacote-municipal-confere-pecas.mjs` dá vermelho por nome — a
   exclusão dele lê-se da fonte do guard, não de uma segunda lista que eu manteria à mão.


## 6 · Índice das peças nomeadas

Candidatas e reversões: `scripts/p73-pen38-ddl-candidata.sql`, `scripts/p73-pen38-ddl-reversao.sql`,
`scripts/p73-pen39-ddl-candidata.sql`, `scripts/p73-pen39-ddl-reversao.sql`,
`scripts/p73-pen41-ddl-candidata.sql`, `scripts/p73-pen41-ddl-reversao.sql`,
`scripts/p73-pen43-ddl-candidata.sql`, `scripts/p73-pen43-ddl-reversao.sql`,
`scripts/p74-pen44-ddl-candidata.sql`, `scripts/p74-pen44-ddl-reversao.sql` e os substituídos, conservados com o
defeito no nome: `scripts/ANTERIOR-p73-pen43-ddl-candidata-sem-transaccoes-20-11.sql`,
`scripts/ANTERIOR-p73-pen43-ddl-reversao-sem-transaccoes-20-11.sql`,
`scripts/ANTERIOR-p74-pen44-ddl-candidata-so-sete-papeis-preservados-21-11.sql` e
`scripts/ANTERIOR-p74-pen44-ddl-reversao-so-sete-papeis-preservados-21-11.sql`.
Preflights: `scripts/p73-pen38-preflight.mjs`, `scripts/p73-pen39-preflight.mjs`, `scripts/p73-pen41-preflight.mjs`,
`scripts/p73-pen43-preflight.mjs`, `scripts/p74-pen44-preflight.mjs`.
Escrita: `scripts/p73-municipal-aplica-ddl.mjs`, `scripts/p73-municipal-etiqueta.mjs`.
Conferência do pacote: `scripts/pacote-municipal-confere-pecas.mjs`.
Conferência pós-deploy: `scripts/v136-pos-deploy.mjs` (corrida em 19/11) e `scripts/v137-pos-deploy.mjs`
(escrita em 20/11, ainda sem corrida de ar — ver §2.6 e §3.3), e `scripts/v138-pos-deploy.mjs` (escrita e
self-testada em 20/11, também sem corrida de ar — §2.8 e §3.5).
Cadeia local da v138 (20/11, §2.8): `scripts/v138-gera-candidata.mjs` com
`bfr-candidata-v138-painel-municipal/portoes-v138-candidata.json`, `scripts/v138-gera-bundle.mjs` com
`worker-deploy-v138-painel-municipal/esperado-v138.json`, e os dois stdout de `scripts/v138-pos-deploy.mjs` em
`evidence/v138-pos-deploy-stdout-selfteste-20-11.txt` e `evidence/v138-pos-deploy-stdout-recusa-20-11.txt`.
Geradora e caminho da PEN-43 (20/11, §2.7): `scripts/p73-pen43-gera-candidata.mjs`, que escreve
`scripts/p73-pen43-ddl-candidata.sql` e `scripts/p73-pen43-ddl-reversao.sql` a partir dos `CREATE FUNCTION` das
candidatas e da `proacl` viva, e `scripts/p73-pen43-preflight.mjs`, a peça que faltava e foi escrita em 20/11 — os
dois modos, o `--selfteste` offline e o censo de exposição anónima, com a entrada na tabela `PECAS` do
`scripts/p73-municipal-aplica-ddl.mjs`. Esse nome deixou de ser fantasma declarado na mesma passada: passou a
resolver em disco e a estar no índice, e a frase que o declarava foi apagada com a FALTA-5 — é o único caminho pelo
qual um nome sai da classe sem que a classe apodreça, porque o portão dos fantasmas passa a não o conhecer e os dos
caminhos citados passam a exigi-lo no índice.
Geradora e caminho da PEN-44 (21/11, §2.10): `scripts/p74-pen44-gera-candidata.mjs` enumera o alvo pelo catálogo
(`proacl`, `prorettype`, `pg_proc`/`pg_namespace`) e escreve os dois SQL, com o censo de papéis por duas vias que
discordam de forma imprimível onde um `LIKE` sem `ESCAPE` mente; `scripts/p74-pen44-preflight.mjs` corre os três
modos, simula o `depois` no modo candidata e lê o `antes` no modo reversão, e é a peça cujo vermelho triplo de hoje
afirma que nada foi aplicado. As capturas desta passada, cada uma com o motivo no nome quando é o caso:
`evidence/p74-pen44-gera-candidata-21-11-c.json`, `evidence/p74-pen44-gera-candidata-21-11b.json`,
`evidence/p74-pen44-gera-candidata-21-11-c-INTERROMPIDA.json`,
`evidence/p74-pen44-gera-candidata-21-11a-VERMELHO-a-contagem-de-grau-contava-o-TO-anon-da-reversao-como-preservacao.json`,
`evidence/p74-pen44-preflight-candidata-21-11-d.json`, `evidence/p74-pen44-preflight-candidata-21-11-e.json`,
`evidence/p74-pen44-preflight-candidata-21-11-VERMELHO-a-geradora-perdia-pgbouncer-porque-um-like-sem-escape-trata-o-under-line-como-curinga.json`,
`evidence/p74-pen44-preflight-reversao-21-11-d-VERMELHO-estado_de_antes_anon_executa_os_45_nomes_e_a_entrada_public_continua_na_acl.json`,
`evidence/p74-pen44-preflight-reversao-21-11-rev20261121T040104Zr-VERMELHO-invocado-pelo-aplicador_a_peca_nao_esta_aplicada.json`,
`evidence/p73-municipal-reversao-recusa-PEN-44-1795233672431.json`, a contagem do ledger
`evidence/ah1-cuenta-pen-21-11-conta-44.txt` e o stdout do portão de índice que apanhou o defeito de instrumento,
`evidence/portao-indice-21-11-VERMELHO-a-uma-adjacencia-de-rotulo-chave-com-dois-pontos-e-literal-de-sete-letras-no-preflight.txt`.
Censo de conteúdo dos 45 nomes (21/11, §2.10): `scripts/p74-pen44-sonda-anonima.mjs` (selfteste offline 8/0;
ao vivo `P74_PEN44_SONDA_ANONIMA_OK 6/0 · 45 chamadas · 0 por escrever`; zero escrita no banco), registo
`evidence/p74-pen44-sonda-anonima-21-11.json` (36 811 B) e a primeira forma do registo conservada com o defeito no
nome, `evidence/p74-pen44-sonda-anonima-21-11-FORMA-ANTERIOR-nao_json-capaz-de-guardar-escalar.json` — a forma
antiga guardava o corpo escalar num campo `nao_json` e foi substituída pela forma que só guarda tipo, chaves e
bandeiras.
Medição de alcance: `scripts/p73-pen38-alcance-por-concessao-20-11.mjs`, `scripts/p73-pen39-sonda-uso-agregados.mjs`,
`scripts/p73-pen38-sonda-consumidor-do-diagnostico.mjs` (FALTA-3, escrita e corrida em 20/11).
Medição de superfície no ar, por recipiente e por toque (20/11, §6A de
`docs/bu-20-11/03-perfis-e-permissoes.md`): `scripts/bu11-porta-municipal-desktop.mjs` e
`scripts/bu12-gaveta-municipal-toque.mjs`. Não mexem no banco: só GET ao ar e renovação de sessão com
gravação do par rotacionado.

Medição do estado vivo depois de aplicar (20/11, §0A): `scripts/p73-assinatura-lib.mjs` (a régua que lê a
assinatura esperada do `CREATE FUNCTION` do ficheiro que a declara), `scripts/p73-verifica-regua-de-assinatura.mjs`
(os dois sentidos da régua, com 6 casos de esperado falso), `scripts/p73-sonda-exposicao-anonima.mjs` (o que um
caller sem sessão recebe e qual o ACL vivo de cada nome novo; 0 escrita, e não chama o que o corpo SQL escreve)
e `scripts/p73-sonda-uso-quatro.mjs` (se algum dos quatro nomes novos é chamado pelo módulo servido: nomes lidos
das duas candidatas, pegada conferida com o `audit-publicacao-v136.json`, contagem por ocorrência dentro do
invólucro e na página inteira, com fixture que dispara duas vezes num nome e controla o zero num nome
inexistente).

A aba e a porta (20/11, §2.9): `scripts/sm7-navegador-municipal.mjs`, que serve a candidata em `127.0.0.1` por
`SM7_CAND`/`SM7_BASE` e lê a aptidão esperada do banco em vez da lista escrita no ficheiro, e
`scripts/p73-sonda-porta-municipal.mjs`, que confronta catálogo e HTTP sobre o alvo lido da candidata PEN-43 e um
controlo lido do privilégio efectivo, com `--selfteste` de 16 casos sem rede. As duas capturas decisivas do browser
estão em `evidence/sm7-municipal-developer-1366-v138dev-p5.json` e
`evidence/sm7-municipal-secretario_municipal-1366-v138sm-p3.json`; a da porta em
`evidence/p73-sonda-porta-municipal-20-11.json`, com a versão defeituosa anterior ao lado sob
`evidence/ANTERIOR-p73-sonda-porta-municipal-20-11-DEFETO-o-leitor-contava-corpo-de-erro-como-linha-e-escalar-como-erro.json`.

PEN-42 e censo de superfície (21/11, §2.11): `scripts/p73-pen42-ddl-candidata.sql`,
`scripts/p73-pen42-ddl-reversao.sql` e `scripts/p73-pen42-preflight.mjs`, que **foi de 12 a 17 portões** entre a
certificação e o fecho: os verdes de candidata sucedem-se em `evidence/p73-pen42-preflight-candidata-21-11-d.json`
(12/0), `…-e.json` (12/0, a frase de rodapé corrigida pelo estado medido), `…-f.json` (13/0) e `…-g.json` (15/0), e o
preflight fresco que o aplicador aceitou é `evidence/p73-pen42-preflight-candidata-21-11-apl20261122T014151Zc.json`
(15/0) — o registo de aplicação correspondente é `evidence/p73-municipal-aplicacao-PEN-42-20261122T014151Z.json`. A
aplicação revelou os três portões que faltavam e as três corridas vermelhas de `--reversao` com 17 portões dizem, uma
por uma, o que era defeito meu e o que é achado: `evidence/p73-pen42-preflight-reversao-21-11-h.json` (o hash esperado
do corpo da viva vinha do cabeçalho da candidata e não se reproduzia),
`evidence/p73-pen42-preflight-reversao-21-11-i.json` (a cláusula `service_role_pode === false` não tem positivo em
casa nenhuma, censo 163/163) e `evidence/p73-pen42-preflight-reversao-21-11-k.json` (a mesma promessa como relação de
alargamento, vermelha no mundo e com os dois mundos fabricados a bater). O vermelho legítimo de candidata
pós-aplicação é `evidence/p73-pen42-preflight-candidata-21-11-j.json`. Os quatro vermelhos conservados com o motivo no
nome são os três de instrumento pré-aplicação
(`evidence/p73-pen42-preflight-candidata-21-11-a-VERMELHO-dois-portoes-do-instrumento-prometiam-contagem-crua-de-sitios-e-6-privilegios.json`,
`evidence/p73-pen42-preflight-candidata-21-11-b-VERMELHO-o_regex-de-sitio-recebia-tra-R-no-meio-do-nome-e-conta-sitios-nenhum.json`,
`evidence/p73-pen42-preflight-candidata-21-11-c-VERMELHO-a-agulha-do-ramo-legado-exigia-o-nome-ja-consumido-pelo-match.json`)
e a falsificação legítima do modo reversão
(`evidence/p73-pen42-preflight-reversao-21-11-rev-a-VERMELHO-falsificacao-legitima-a-candidata-ainda-nao-foi-aplicada.json`).
O censo de nomes de rpc é `scripts/p126-censo-rpc-do-bundle-servido.mjs`, com as duas corridas comparáveis entre si
em `evidence/p126-censo-rpc-21-11-v142.json` (a que morreu no `teardown` depois de escrever, antes de o
`process.exit(0)` explícito ser retirado) e `evidence/p126-censo-rpc-21-11-v142b.json` (a corrida limpa, `exit=0`), e a
re-corrida depois da aplicação em `evidence/p126-censo-rpc-21-11-v142-apos42.json` (25 nomes, 23 no catálogo, 2
ausentes).

PEN-48 (21/11, §2.12): `scripts/p73-pen48-ddl-candidata.sql` e `scripts/p73-pen48-ddl-reversao.sql`, um `REVOKE`/`GRANT`
de um só nome nas duas formas transaccionais exigidas pelo aplicador, e `scripts/p73-pen48-preflight.mjs`, que corre 12
portões na primeira certificação (`evidence/p73-pen48-preflight-candidata-21-11-b.json`, 12/0) e 14 depois de lhe
entrarem os dois canais da defesa — a cadeia de quatro elos lida do catálogo e o par de respostas HTTP sem sessão
(`evidence/p73-pen48-preflight-candidata-21-11-e.json`, 14/0). Os vermelhos, todos com o motivo no nome: o de
instrumento tripartido `evidence/p73-pen48-preflight-candidata-21-11-a-VERMELHO-tres-defeitos-do-instrumento-flag-dentro-do-padrao-contagem-por-booleano-e-prefixo-sem-sufixo.json`
e as duas falsificações legítimas do modo reversão
`evidence/p73-pen48-preflight-reversao-21-11-c-VERMELHO-falsificacao-legitima-a-peca-ainda-nao-foi-aplicada.json`
(12 portões) e
`evidence/p73-pen48-preflight-reversao-21-11-f-VERMELHO-falsificacao-legitima-a-peca-ainda-nao-foi-aplicada-e-o-ar-tambem-o-diz.json`
(14 portões). A recusa do aplicador sem a frase certificada está no stdout capturado
`evidence/p73-municipal-aplicador-recusa-frase-pen48-21-11.txt`, com o `node_exit=2` dentro do ficheiro. A corrida com
o sufixo repetido na flag conserva-se como `evidence/ANTERIOR-p73-pen48-preflight-candidata-d-data-duplicada-na-invocacao-21-11.json`.
O instrumento partilhado das assinaturas é `scripts/p73-assinatura-lib.mjs`.

Fecho pós-aplicação (22/11, §2.7, §2.10, §2.11 e §SM.28(14) da auditoria): os dois preflights que o aplicador aceitou
na PEN-42 são `evidence/p73-pen42-preflight-candidata-21-11-apl20261122T014151Zc.json` e
`evidence/p73-pen42-preflight-reversao-21-11-apl20261122T014151Zr.json`, e o registo correspondente é o citado no
§2.11 — o instante dele é o que resolve a data, `em` 2026-11-22T01:41:56.784Z, porque o cabeçalho do §2.11 usa o dia
local em que a corrida começou. A régua do índice que o fecho acrescentou ao portão do pacote é
`evidence/pacote-municipal-pecas-20-11-antes-staging-VERMELHO-o-sql-que-o-banco-recebeu-era-so-da-arvore-de-trabalho-pen42.json`
— o vermelho tirado **antes** de qualquer `git add`, e por isso preservado com o motivo no nome: os dois SQL aplicados
da PEN-42 estavam só na árvore de trabalho. As duas corridas da PEN-43 depois da aplicação, que substituem a frase que
eu ia escrever de memória, são `evidence/p73-pen43-preflight-reversao-20-11e-21-11-apos43-r.json` (verde) e
`evidence/p73-pen43-preflight-candidata-20-11e-21-11-apos43-c-VERMELHO.json` (um vermelho, o do estado vivo do papel
sem sessão). A sonda da PEN-44 re-corrida neste fecho é `evidence/p74-pen44-sonda-anonima-21-11-21-11-pos-pen44.json`,
**reprodução** da que já estava versionada em `evidence/p74-pen44-sonda-anonima-21-11-21-11-pos.json`. O stdout do
self-teste do aplicador, com os fixtures da agulha das duas grafias impressos por nome, é
`evidence/p73-municipal-stdout-selfteste-aplicador-agulha-create-or-replace-21-11.txt`, e a contagem re-emitida do
ledger é `evidence/ah1-cuenta-pen-21-11-conta-48.txt`.

As pegadas (bytes e md5) de cada um destes caminhos, medidas no fecho do pacote e não a meio de uma escrita,
estão em `evidence/pacote-municipal-pecas-20-11-fecho-corpus-duplo.json`. O fecho de 20/11 que acrescentou a v138
e a PEN-43 ao corpus tem as suas pegadas no registo da própria corrida, que nomeio por família
(`evidence/pacote-municipal-pecas-20-11-<sufixo>.json`) e não por nome: o sufixo escolhe-se no momento de correr,
e a captura que decide um commit não se stagea no mesmo fôlego — stageá-la faria o portão de índice varrer-se a si
próprio, que já foi regressão medida nesta casa. O registo anterior,
`evidence/pacote-municipal-pecas-20-11.json`, fica como história: mediu o tempo em que o corpus era só este
runbook, e o censo de caminhos que ele traz é menor do que o de hoje pela única razão de que a prosa entretanto
passou a citar mais ficheiros. Não pinho aqui nenhum dos números pelo motivo explicado em §2.0 — pinar o
censo obriga a re-escrever esta frase a cada caminho acrescentado, e a frase que o conta é ela própria um
caminho acrescentado. Nenhum destes registos lista a sua própria pegada: mudam com a secção que os cita, e um
número medido antes do commit já nasce ultrapassado. A pegada deste runbook é a do commit que o versionar.
