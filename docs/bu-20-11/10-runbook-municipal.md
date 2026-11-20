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
*Verde esperado:* `PACOTE_MUNICIPAL_OK 17/0`, na corrida que já varre o corpus com o modo de reversão de §4:
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
e por último `os_fora_do_indice_por_decisao_continuam_decididos`. O dígito de cada corrida lê-se no registo
daquela corrida, e é por isso que esta frase nomeia cláusulas em vez de pinhar somas — uma soma escrita aqui
envelhece no dia em que alguém escreve um portão novo.
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
Fica a ponta solta, e fica dita em vez de ser calada: `scripts/sm7-confere-casa-home.mjs:6` está versionado e lê
o v1 por caminho fixo, por isso o diff v1-vs-v3 que ele prova corre nesta máquina e **morre de `ENOENT` num clone
novo**. Aqui ele corre e dá `LEITURA_IGUAL_SUCESSOR_SERVE` (`rename=84`, `NUMEROS_DIFERENTES=0`), o que é a
confirmação de que o sucessor serve — e também de que o portão não o apanha, porque o corpus dele é a prosa dos
dois documentos, não os `readFileSync` dos scripts. **FALTA-4:** ou o instrumento passa a apontar para o sucessor
versionado, ou o v1 entra no índice e o substituto é retirado; as duas opções desfazem algo que já foi decidido,
por isso pedem escolha explícita e não a minha. A numeração é a das pontas soltas deste runbook: FALTA-1 em §2.6
(fechada ao nível da candidata em 20/11, com o `--selfteste` e a recusa de publicação medidos; quem põe a peça a
conferir de verdade é a publicação, e essa pede OK literal próprio), FALTA-2 em §4 (fechada em 20/11, com as recusas
medidas e o ciclo completo ainda por correr), FALTA-3 em §2.2, esta aqui.

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
  produto (v138), não DDL. Está em §5.
* A etiquetagem é contável em `bfr_municipal_audit`; a sua ausência **não** é previsão, é o portão
  `trilha.linhas_para_esta_escola > 0` do artefacto de escrita, que hoje nunca correu porque o RPC não existe.

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
Conferência pós-deploy: `scripts/v136-pos-deploy.mjs` (corrida em 19/11) e `scripts/v137-pos-deploy.mjs`
(escrita em 20/11, ainda sem corrida de ar — ver §2.6 e §3.3).
Medição de alcance: `scripts/p73-pen38-alcance-por-concessao-20-11.mjs`, `scripts/p73-pen39-sonda-uso-agregados.mjs`,
`scripts/p73-pen38-sonda-consumidor-do-diagnostico.mjs` (FALTA-3, escrita e corrida em 20/11).

As pegadas (bytes e md5) de cada um destes caminhos, medidas no fecho do pacote e não a meio de uma escrita,
estão em `evidence/pacote-municipal-pecas-20-11-fecho-corpus-duplo.json`. O registo anterior,
`evidence/pacote-municipal-pecas-20-11.json`, fica como história: mediu o tempo em que o corpus era só este
runbook, e o censo de caminhos que ele traz é menor do que o de hoje pela única razão de que a prosa entretanto
passou a citar mais ficheiros. Não pinho aqui nenhum dos dois números pelo motivo explicado em §2.0 — pinar o
censo obriga a re-escrever esta frase a cada caminho acrescentado, e a frase que o conta é ela própria um
caminho acrescentado. Nenhum dos dois registos lista a sua própria pegada: mudam com a secção que os cita, e um
número medido antes do commit já nasce ultrapassado. A pegada deste runbook é a do commit que o versionar.
