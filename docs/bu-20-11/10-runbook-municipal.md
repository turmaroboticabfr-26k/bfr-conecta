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
| Objectos novos das três candidatas no banco | **0** — nada aplicado | os três vereditos abaixo, todos em modo `candidata` |
| v137 (remendo PEN-40) | `publicado: false` | `evidence/v137-gera-bundle-20-11.json` → `publicado`, `ok_literal` |

Vereditos frescos dos três preflights, em modo candidata, à hora em que este pacote fecha:

```
P73_PEN38_PREFLIGHT_VERDE_CANDIDATA 10/0
P73_PEN39_PREFLIGHT_VERDE_CANDIDATA 11/0
P73_PEN41_PREFLIGHT_VERDE_CANDIDATA 13/0
```

Isto é um verde **no instante em que foi tirado**. Antes de qualquer passo de escrita, o passo é re-corrido
(§2), e é o verde re-corrido que manda, não este.

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
*Verde esperado:* `PACOTE_MUNICIPAL_OK 15/0` (stdout `evidence/pacote-municipal-stdout-corpus-duplo-20-11.txt`,
registo `evidence/pacote-municipal-pecas-20-11-corpus-duplo.json`), `P73_MUNICIPAL_APLICA_SELFTESTE_OK 7/0`,
`P73_MUNICIPAL_ETIQUETA_SELFTESTE_OK 6/0` e `P73_MUNICIPAL_ETIQUETA_LISTA 6 escolas, 0 etiquetadas, 1 municipios, 1 avisos de fixture` —
estes três últimos na mesma corrida capturada em `evidence/p73-municipal-stdout-selftestes-e-lista-20-11.txt`,
que traz também o `ABORTA` da guarda quando o sufixo se repetiu.
Desde 20/11 o corpus do portão são **dois** documentos, e não só este: `docs/bu-20-11/08-plano-de-prioridades.md`
passou a ter um §11 que nomeia scripts e evidências deste pacote, e um corpus que não cresce com a prosa é o
portão que varre metade das promessas e chama verde ao resto.
O resto da primeira linha é o censo de peças medidas: cresce com o corpus que a prosa cita, por isso não se
pinha aqui — piná-lo obrigaria a re-escrever esta frase a cada caminho acrescentado, e foi exactamente assim
que a versão anterior deste parágrafo ficou ultrapassada (a corrida preservada em
`evidence/pacote-municipal-pecas-20-11-ANTERIOR-a-prosa-do-runbook-pinhava-o-censo-de-pecas-medidas.json`
media 29 e o corpus tinha crescido para 32). Os números `15`, `7`, `6` são função dos portões escritos nos
instrumentos, não uma promessa sobre o mundo: este 15 era 13 até ao dia em que se lhes juntaram
`cada_ficheiro_do_corpus_despe_pelo_menos_um_caminho` e `os_fantasmas_da_prosa_continuam_fantasmas_declarados`.
O segundo portão existe porque o documento 08 cita `scripts/bu4-digestao-para-documentacao-20-11.mjs`, que não
existe — e não existe *por declaração*: a linha ao lado diz que é o nome do output, não o do script. A
excepção não é uma lista de nomes tolerados; é a exigência de que a frase declarante continue no corpus, e foi
provada a cair (abaixo).
*Dentes do portão, provados* — três falsificações, cada uma com o nome do portão que disparou, todas exit 1:

| corpus estragado de propósito | portão vermelho | registo | stdout |
|---|---|---|---|
| dois caminhos inventados neste runbook | `nenhum_caminho_citado_falta_em_disco` (nomeia os dois) | `evidence/pacote-municipal-pecas-20-11-falsificacao-corpus-duplo.json` | `evidence/pacote-municipal-falsificacao-corpus-duplo-stdout-20-11.txt` |
| um ficheiro do corpus sem nenhum caminho | `cada_ficheiro_do_corpus_despe_pelo_menos_um_caminho` (`[false,true,true]`) | `evidence/pacote-municipal-pecas-20-11-falsificacao-corpus-mudo.json` | `evidence/pacote-municipal-falsificacao-corpus-mudo-stdout-20-11.txt` |
| a frase que declara o fantasma apagada, nome do fantasma mantido | `os_fantasmas_da_prosa_continuam_fantasmas_declarados` (`[[false,false]]`) | `evidence/pacote-municipal-pecas-20-11-falsificacao-fantasma-sem-declaracao.json` | `evidence/pacote-municipal-falsificacao-fantasma-sem-declaracao-stdout-20-11.txt` |

As cópias estragadas vivem fora do repo (directório de trabalho da sessão), por isso não são caminhos que a
sonda verifique: o que fica versionado é o registo de cada corrida, que traz a lista exacta do que foi lido.
A primeira versão desta terceira linha abortou antes de chegar aos portões, com `ENOENT` num caminho que o
shell tinha reescrito — o defeito era meu, da ordem dos argumentos, não do portão; a corrida está preservada em
`evidence/pacote-municipal-falsificacao-corpus-mudo-stdout-20-11-ERRO-minha-ordem-de-argv-convertida-pelo-bash.txt`
e a forma que funciona é o caminho absoluto **primeiro** na lista. O vermelho de dois caminhos inventados
tirado antes do corpus duplo (`evidence/pacote-municipal-pecas-20-11-VERMELHO-esperado-falsificacao-do-corpus-com-dois-caminhos-inventados.json`,
`1 de 13 portoes`) fica como história; a re-corrida com o corpus actual é a linha 1 da tabela.
Sem estas três corridas, o 15/0 não se distinguia de um portão que varre uma lista vazia.
*Re-corridas:* cada linha que se acrescenta ao corpus obriga a voltar a correr o portão, e ele voltou verde em
toda a série (`evidence/pacote-municipal-pecas-20-11-corpus-duplo.json`,
`evidence/pacote-municipal-pecas-20-11-fecho-corpus-duplo.json`,
`evidence/pacote-municipal-pecas-20-11-pos-captura.json`), sempre com os mesmos 15 portões; é um registo dessa
série que o §11 do documento 08 cita. Nenhuma destas pegadas é a pegada deste runbook, e esta frase também não:
ela muda o ficheiro cuja pegada diz estar a citar. O verde que vale para aplicar é o do portão corrido entre o
`git add` e o `git commit` daquele texto, nunca uma corrida anterior.
*Vermelho significa:* falta uma peça, ou uma peça mudou de bytes desde que foi certificada. Não é aviso para
continuar: o aplicador compara o md5 do SQL que vai enviar com o que o preflight certificou, e um ficheiro
editado entre a certificação e a aplicação é exactamente o caso que esse portão fecha.

### 2.1 · Preflight fresco da peça que se vai aplicar

```
node scripts/p73-pen38-preflight.mjs
node scripts/p73-pen39-preflight.mjs
node scripts/p73-pen41-preflight.mjs
```

*OK necessário:* nenhum (só leitura). *Verde esperado:* os três vereditos do §0, com o nome do registo impresso
na última linha.
*Cada registo é escrito uma vez*: para re-correr sem por cima do anterior, `P73_SUF=<rótulo> node …`.
*Vermelho significa* que o estado vivo já não é o que a candidata pressupõe. Nesse caso a candidata não se
aplica: re-mede-se e escreve-se candidata nova. Um vermelho daqui nunca se «resolve» com `--ok`.

### 2.2 · PEN-38 — escopo no lugar da autoridade, admin de volta à mesa, porta de etiquetagem, diagnóstico

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

### 2.4 · PEN-39 — agregados por município e por zona

```
node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-39 --ok "APLICAR PEN-39 NO BANCO"
```

*Advertência específica desta peça:* o preflight da PEN-39 mede que **nenhum nome da candidata é consumido
pelo módulo servido** (`nenhum_nome_da_candidata_e_consumido_pelo_modulo_servido_e_a_sonda_e_verde`). Aplicar
esta candidata cria dois nomes que hoje ninguém chama; não muda uma linha de tela. Se o objectivo da sessão for
«a aba mostrar números», o passo que mostra números é a publicação, não este.
*Verde de fecho:* `P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-39` com `P73_PEN39_PREFLIGHT_VERDE_REVERSAO 11/0`.

### 2.5 · PEN-41 — leitura de alunos e turmas pelo vínculo, não pelo cargo

```
node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --ok "APLICAR PEN-41 NO BANCO"
```

*Efeito medido antes de aplicar* (`evidence/p73-pen41-preflight-candidata-20-11e.json` → `populacao_afectada`):
os 2 perfis `director` e os 2 `secretary` com vínculo em `staff_schools` mantêm 848 alunos / 27 turmas; **2
perfis `secretary` sem vínculo passam de 848/27 para 0/0**. Este é o único passo do pacote que tira capacidade
de leitura a utilizadores reais, e por isso o §3.2 é obrigatório depois dele.
*Verde de fecho:* `P73_MUNICIPAL_APLICADO_E_CONFERIDO PEN-41` com `P73_PEN41_PREFLIGHT_VERDE_REVERSAO 13/0`.

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
**FALTA-1:** a peça de conferência pós-deploy da v137 não existe. Existe o modelo (`scripts/v136-pos-deploy.mjs`)
e existe a prova ao nível da candidata (`evidence/p73-leitor-bancada-pen40-20-11e.json`, `P73_BANCADA_PEN40_AB_VERDE`,
16 portões / 0 falhas, `MONTA` 6/6 na candidata contra `NAO_MONTA` 6/6 na base). Sem FALTA-1 escrita, a
publicação fica sem prova de fecho e não deve ser feita.

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

### 3.3 · O que ainda não é prova

* PEN-39 aplicada **não** é tela a mostrar números: o consumo dos agregados pelo módulo servido é código de
  produto (v138), não DDL. Está em §5.
* A etiquetagem é contável em `bfr_municipal_audit`; a sua ausência **não** é previsão, é o portão
  `trilha.linhas_para_esta_escola > 0` do artefacto de escrita, que hoje nunca correu porque o RPC não existe.

## 4 · Reversão, se for preciso desfazer

Cada peça tem reversão certificada pelo próprio preflight do modo candidata, e o modo `--reversao` só dá verde
depois de a candidata ter sido aplicada — provado legitimamente em
`evidence/p73-pen41-preflight-reversao-20-11e-VERMELHO-falsificacao-legitima-a-candidata-ainda-nao-foi-aplicada.json`.

```
node scripts/p73-pen41-preflight.mjs --reversao     # verde esperado só depois de aplicar
```

Aplicar a reversão é escrita no banco e pede frase própria. **FALTA-2:** o aplicador não tem modo de reversão
(`--peca PEN-41 --reverter`): hoje o SQL de reversão teria de ser enviado à mão. Não inventar um `psql` de
fortuna: ou se escreve o modo, ou se declara que a reversão é manual.

## 5 · O que fica fora deste pacote (e porquê)

1. **`INSERT` do município real.** Escrita de conteúdo, sem instrumento; é a opção 1 do §1 e pede OK próprio.
2. **Apagar a fixture `Sao Paulo (SM8 fixture — apagar)`.** Só faz sentido depois de as concessões estarem
   apontadas para um município real; hoje apagá-la deixa 4 concessões órfãs.
3. **v138: o código de produto que chama os agregados da PEN-39.** Sem isto, a PEN-39 é DDL morto. Não é
   deste runbook.
4. **RM-5.2 (seed do calendário letivo).** Estado medido em `evidence/p73-rm52-estado-calendario-20-11.json`
   e régua de completude em `evidence/p73-rm52-regua-completude-20-11.json`; conteúdo é decisão pedagógica.
5. **PEN-42 (`register_gate_checkin_v2`).** Fora do escopo municipal.
6. **`git push`** dos commits deste pacote: precisa de OK literal novo; nenhum push está autorizado pelo
   trabalho descrito aqui.

## 6 · Índice das peças nomeadas

Candidatas e reversões: `scripts/p73-pen38-ddl-candidata.sql`, `scripts/p73-pen38-ddl-reversao.sql`,
`scripts/p73-pen39-ddl-candidata.sql`, `scripts/p73-pen39-ddl-reversao.sql`,
`scripts/p73-pen41-ddl-candidata.sql`, `scripts/p73-pen41-ddl-reversao.sql`.
Preflights: `scripts/p73-pen38-preflight.mjs`, `scripts/p73-pen39-preflight.mjs`, `scripts/p73-pen41-preflight.mjs`.
Escrita: `scripts/p73-municipal-aplica-ddl.mjs`, `scripts/p73-municipal-etiqueta.mjs`.
Conferência do pacote: `scripts/pacote-municipal-confere-pecas.mjs`.
Medição de alcance: `scripts/p73-pen38-alcance-por-concessao-20-11.mjs`, `scripts/p73-pen39-sonda-uso-agregados.mjs`.

As pegadas (bytes e md5) de cada um destes caminhos, medidas no fecho do pacote e não a meio de uma escrita,
estão em `evidence/pacote-municipal-pecas-20-11-fecho-corpus-duplo.json`. O registo anterior,
`evidence/pacote-municipal-pecas-20-11.json`, fica como história: mediu o tempo em que o corpus era só este
runbook, e o censo de caminhos que ele traz é menor do que o de hoje pela única razão de que a prosa entretanto
passou a citar mais ficheiros. Não pinho aqui nenhum dos dois números pelo motivo explicado em §2.0 — pinar o
censo obriga a re-escrever esta frase a cada caminho acrescentado, e a frase que o conta é ela própria um
caminho acrescentado. Nenhum dos dois registos lista a sua própria pegada: mudam com a secção que os cita, e um
número medido antes do commit já nasce ultrapassado. A pegada deste runbook é a do commit que o versionar.
