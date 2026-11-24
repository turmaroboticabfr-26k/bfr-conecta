# Proposta de conteúdo do calendário letivo e dos turnos — RM-5.2

**Estado: PROPOSTA ESCRITA 20/11. Nada foi aplicado, semeado, publicado ou empurrado.** Este
documento decide *forma e sequência*. As quatro entradas que só o dono pode dar estão numeradas em
§9 e cada uma diz o que fica verde quando ela é dada. Publicação de código, DDL, mint, escrita de
conteúdo no banco e `git push` continuam a pedir OK literal novo, um por um.

**Atualização datada 22/11 (madrugada UTC), sem mudar o que acima está escrito.** Da lista acima, o
único item que deixou de ser «nada aplicado» foi a **PEN-42**, e só porque a frase foi dita: `APLICAR
PEN-42 NO BANCO` → `evidence/p73-municipal-aplicacao-PEN-42-20261122T014151Z.json`. A prova de browser
do degrau §8-P4 foi corrida depois disso, sobre o ar publicado, e é ela que substitui as três frases que
ainda diziam «falta»/«por correr» em §5, §8 e §10 — cada uma com uma correção datada em vez de apagada.
Nada do desenho de conteúdo se mexeu: **0** linhas nas três mesas (re-medido a 22/11 pelos dois GET
só-leitura da própria corrida P4), **0** `bfr_confirm_school_calendar`, **0** semente, **0** DDL de
calendário, **0** alteração de policies, **0** publicação nova, **0** mint, **0** `git push`.

## 1. De onde saem os números (instrumentos versionados)

Dois instrumentos, ambos verdes, ambos a ler o bundle **versionado** e o catálogo em só-leitura:

- `scripts/p73-rm52-estado-calendario.mjs` → `evidence/p73-rm52-estado-calendario-20-11.json`,
  `RM52_ESTADO_VERDE`, 20 portões / 0 falhas, `em` 2026-11-20T07:00:16.936Z. É dele a tabela de
  verdade do portão (A/B/C/D), as colunas, as restrições, as policies, o `no_catalogo` por nome, o
  `404/PGRST202` do fio com o controlo positivo, as cinco funções síncronas extraídas tal como
  servidas e o relógio congelado em `2026-11-20T12:15:00Z`.
- `scripts/p73-rm52-regua-de-completude-20-11.mjs` → `evidence/p73-rm52-regua-completude-20-11.json`
  + `.txt`, `P73_RM52_REGUA_VERDE 11/0`, 3 783 ms, `em` 2026-11-20T07:22:30.300Z. É dele a forma do
  predicado de prontidão, a aritmética do calendário, as regiões de execução das duas portarias e a
  prova de que a escrita de calendário não tem política para `secretary`.

Os bytes e md5 dos dois scripts e dos dois artefactos medem-se no fecho e citam-se no diário
§SM.27, não aqui: uma pegada escrita antes do commit nasce ultrapassada. Identidade do que está no
ar, conferida pelos dois: `3 547 458` B, md5 `9e236a23eed978cf7c2a2743d449b307`
(`bfr-candidata-v136-secretaria-de-educacao/index.html`). Nada neste documento descreve o ar;
descreve o mesmo ficheiro que o ar serve.

**Correção datada 22/11, medida e não redigida.** A última frase estava ultrapassada: entre 20/11 e
21/11 o ar mudou três vezes, e o que está publicado é a v142 — `3 556 664` B, md5
`0e22e78fe1e0ce929ec4717f86365ad9`, `29 406` linhas, na pasta versionada
`bfr-candidata-v142-painel-na-troca/index.html`; foi essa identidade que a corrida P4 conferiu contra o
registo antes de dizer seja o que for. Para não reescrever as cifras de §2, §5 e §6 à espera de um verde
velho, escreveu-se um instrumento de comparação entre as duas identidades,
`scripts/p128-conferencia-dos-dous-bundles.mjs`, com três corridas preservadas (`-a` só contagens,
21/0; `-b` contagens mais deslocamentos, 26/0; `-c` é a régua final, 27 agulhas de conteúdo e 5 de
posição, `evidence/p128-conferencia-dos-dous-bundles-c.json`, `P128_CONFERENCIA_DOS_DOUS_BUNDLES_IGUAIS
32/0`). O que ele diz: as **definições** das cinco funções de §2 contam 1 nos dois bundles, os
deslocamentos de §5 são os mesmos em ambos (base `750635`; `hideLegacy` em `1890194`, `2793556`,
`2931146`, `2996855`, `3126975`; a guarda `!gateLegacyMode()&&!gateReady()` em `3054210`, `3056334`,
`3058107`; `function confirmGateCalendar` com 1 ocorrência), e `calendarDays.length` continua com **1**
ocorrência. Uma nota de régua, porque é a diferença entre uma cifra e um engano: a agulha do `-b` era o
identificador nu, que dá **2** ocorrências (`1853959` e `1901664`) e cujos 9 primeiros caracteres são
`function ` — logo o deslocamento de §2, `1853950`, é a definição e não a chamada. As duas leituras são
verdadeiras e foram medidas uma por uma, em vez de se emendar um número pelo outro.

## 2. O que tem de ser verdade para o portão abrir (quatro funções servidas)

Cada uma com **1** ocorrência no bundle (`ocorrencias_por_nome_de_funcao`) e texto copiado do
artefacto (`funcoes_extraitas`):

```
gateReady()        = Boolean( schoolDayConfirmed() && activeSchoolShift() )
schoolDayConfirmed = state.schoolCalendarDay?.calendar_status==='school_day'
                     && state.schoolCalendarDay?.source_status==='confirmed'
activeSchoolShift  = state.shiftSettings.filter(item =>
                       item.confirmed_at
                       && (item.active_weekdays || [1,2,3,4,5]).includes(weekday)
                       && now.minutes >= hora(item.entry_opens_at) … )
gateLegacyMode     = state.loaded && (errors inclui 'configuração de turnos' || errors inclui 'calendário letivo')
gateScanReady      = gateReady() || gateLegacyMode()
```

Daqui saem cinco condições de conteúdo, todas independentes e todas hoje em falta:

1. **Uma linha de dia por data**, com `calendar_status='school_day'` **e** `source_status='confirmed'`.
2. **`confirmed_at` não nulo na linha de turno.** Não é o mesmo campo do dia: um turno semeado sem
   `confirmed_at` nunca casa, e o portão continua fechado com o calendário todo confirmado.
3. **`active_weekdays` explícito e não vazio.** A coluna tem omissão `'{}'::integer[]`; sobre `[]` o
   `||` do fonte **não** cai no default `[1,2,3,4,5]` (em JavaScript `[]` é verdadeiro), logo
   `.includes(weekday)` dá sempre `false`. Uma linha com o default da coluna é uma linha inerte.
   É consequência da semântica do operador sobre o valor que a coluna devolve, e vai conferida na
   aceitação P1 de §8 em vez de afirmada como medida de linha — as três mesas têm 0 linhas.
4. **A hora do dia dentro da janela do turno** (`entry_opens_at` … `shift_closes_at`).
5. **Nenhum erro de leitura das mesas.** `gateLegacyMode()` só é verdadeiro quando a *leitura* falha;
   com as mesas criadas e vazias a resposta é 200 com lista vazia, logo `legacy_mode=false` — que é
   exatamente o estado B da tabela de verdade medida: `{legacy_mode:false, portao_estrito:false,
   dia_letivo_confirmado:false, turno_ativo:null, guarda_lanca_erro:true}`.

E o painel de coordenação, que é outra superfície, pergunta outra coisa (medida no artefacto de
completude, uma única ocorrência, zero alternativas de contagem):

```
state.calendarDays.length === 365 && state.calendarDays.every(item => item.source_status === 'confirmed')
```

`ocorrencias_calendarDays_length = 1`, `contagens_alternativas = 0`, `ocorrencias_calendarReady = 2`,
`exige365 = true`, `exige_todos_confirmados = true`. O front que escreve só escreve `draft`
(`front_escreve.estados_source_status = ['draft']`, com o payload medido
`source_status:'draft', confirmed_by:null, confirmed_at:null`), e `confirmGateCalendar` existe **1**
vez (`@1853950`, 457 caracteres) a chamar a função que o catálogo não tem. Portanto: por muito
conteúdo que se semeie, **nenhum caminho hoje produz `confirmed`**.

## 3. A aritmética da semente (três contagens independentes que batem)

Ano 2026, dias de semana por mês, `getUTCDay()` do instrumento, ano vindo do literal medido no
painel de coordenação (`const schoolYear = 2026` — nunca `classes.year`, que é o grau `6,7,8,9`):

| regime | jan | fev | mar | abr | mai | jun | jul | ago | set | out | nov | dez | soma |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| seg–sex | 22 | 20 | 22 | 22 | 21 | 22 | 23 | 21 | 22 | 22 | 21 | 23 | **261** |
| seg–sáb | 27 | 24 | 26 | 26 | 26 | 26 | 27 | 26 | 26 | 27 | 25 | 27 | **313** |

As três contagens conferem-se entre si no portão `a_aritmetica_por_mes_bate_com_a_por_ano_e_com_a_terceira_contagem_do_artefacto_verde`: soma por mês, contagem por ano percorrendo o ano, e os valores de
`metas_por_mes_computadas_para_o_ano` do artefacto do estado — peça escrita uma hora antes, por
outro script. As três dão 261 (seg–sex) e 313 (seg–sáb). O CHECK
`expected_school_days BETWEEN 0 AND 31` é respeitado nos dois regimes: `meses_com_meta_acima_de_31 = []`.

Feriados e recesso **não estão descontados** — é a entrada §9-D1, não um número que se invente.

**Correção datada 23/11 (D1 fechada):** os `expected_school_days` da semente **não** são os 261/313
desta tabela. Com o documento oficial na mão, as metas passam a ser os rótulos mensais «DIAS LETIVOS»
do próprio documento: jan 0 · fev 12 · mar 23 · abr 20 · mai 21 · jun 20 · jul 13 · ago 22 · set 21 ·
out 20 · nov 19 · dez 13, soma **204 = «204 DIAS LETIVOS!!» declarado**. Os 261 (seg–sex) e 313
(seg–sáb) continuam a ser os dois regimes medidos do turno — o que mudou foi a fonte das metas.
A conferência mensal fecha todos os meses (fev 12 = 15 úteis − 3 Carnaval; out 20 = 22 − 3 feriados +
1 sábado; dez 13 = 14 úteis − 1 feriado, com a recuperação 21–23/12 fora do período letivo).

**A contagem fixa de 365 não é uma cobertura.** Medido: 2026 e 2027 têm 365 datas; 2028 e 2032 têm
366 (`fevereiro = 29`). Sem tocar no produto, um calendário de 2028 nunca fica verde. E 365 linhas
não garante 365 datas: a contagem aceita datas repetidas. As duas linhas de turnos e as 12 de metas
**não** entram na contagem de 365, mas a semente completa é `365 + 2 + 12 = 379` linhas
(`aritmetica.linhas_de_semente`). **Correção datada 23/11:** a semente real da candidata p144 tem
`365 + 1 + 12 = 378` linhas — só o turno `matutino` (o `vespertino` não tem horas medidas e fica por
semear, §6).

## 4. As quatro ausências, cada uma com o OK que exige

| # | ausência | como foi medida | OK exigido |
|---|---|---|---|
| A1 | `bfr_confirm_school_calendar(target_school_year)` não existe | `pg_proc` por nome: `no_catalogo = 0`; fio POST: `404 / PGRST202`, 414 B; `correct_gate_attendance` 404 (399 B); controlo positivo de função viva a dar `200`, 11 B | DDL + recarga do cache do PostgREST (OK literal) |
| A2 | `secretary` não pode escrever calendário | `cargos_que_escrevem_calendario = coordinator, developer, director`; `comando_cru` da escrita é `*` (o `FOR ALL` deste Postgres renderiza-se `*`, não `a`) e o de leitura `r`; 6 policies nas três mesas | `ALTER POLICY` ou policy nova (OK literal) + §9-D2 |
| A3 | As mesas não têm dimensão de escola | chaves primárias medidas: `(school_year, school_date)`, `(school_year, shift)`, `(school_year, month)`; nenhuma `school_id` | DDL estrutural **ou** assumir rede única por ano (§9-D4) |
| A4 | Conteúdo zero | `linhas_das_mesas = 0/0/0`; `catalogo.linhas[].anos = ''` nas três | semente (OK literal), depois de D1 e D3 |

A1 e A4 explicam porque fechar a PEN-29 não fecha a RM-5.2: a PEN-29 foi criada ao **criar as mesas**
(RLS ativada e forçada, duas policies cada, 0 linhas). Estrutura existe; conteúdo e confirmação não.

**Estado re-conferido a 22/11, por dois caminhos diferentes e sem qualquer escrita.** A1 continua
ausente: o censo de RPC do bundle publicado, re-corrido depois da aplicação da PEN-42
(`evidence/p126-censo-rpc-21-11-v142-apos42.json`), dá 25 nomes, 23 no catálogo e os **2** ausentes são
`bfr_confirm_school_calendar` e `correct_gate_attendance` — ambos sem gémeo no catálogo, ou seja,
semântica nova de produto e não SQL que se invente. A4 continua verdadeira, e agora medida por um
segundo instrumento: os dois GET só-leitura que a corrida P4 faz para decidir o modo legado responderam
`200` com lista vazia (2 caracteres de corpo) em `bfr_school_calendar_days` e `bfr_school_shift_settings`
(`modo_legado_medido_no_canal`), logo `legacy_mode=false` e o estado do portão é ainda o B de §2; a
terceira mesa, `bfr_school_calendar_month_targets`, não entra nesse par de sondas e mantém a medição de
§1 do seu próprio instrumento. **O que muda é A3 e a linha D4 de §9:** o texto foi escrito com
`municipality_id` a `NULL` em 6/6 escolas, e essa cifra é anterior à etiquetagem P92, autorizada e
aplicada a 21/11. Medida a 22/11 pelo preflight da PEN-41
(`evidence/p73-pen41-preflight-candidata-20-11e-21-11q.json`): `schools = 6`, `escolas_sem_municipio = 2`.
A conclusão de D4 não cai — etiquetar por escola antes de aplicar o escopo continua a trocar «lê a rede
toda» por «não lê nada» para os cargos sem vínculo — mas o número dela é agora 2 e não 6, e os dois
perfis de `secretary` sem vínculo são a população que deixaria de ler alunos e turmas se a PEN-41 fosse
aplicada hoje.

**Adendo 24/11: o A1 deixou de estar ausente.** A função `bfr_confirm_school_calendar` foi criada e conferida no banco (aplicador `scripts/p145-a1-confirmar-calendario-aplica.mjs`; veredicto `P145_A1_REAPLICADA_E_CONFERIDA`, registo `evidence/p145-a1-confirmar-calendario-aplica-24-11-a1r2.json`: 365 dias confirmados, conferência 6/6, pré-voo reversão 37/0 com `EXECUTE` só a `authenticated`). A4 também mudou com a semente de 24/11 (365+12+1 linhas nas três mesas).

## 5. O caminho da portaria, que a semente do calendário não repara

Medido no bundle com posições de bytes, no portão `a_portaria_diferida_esconde_a_da_base_por_classe_e_CSS_e_o_formulario_alcancavel_e_o_dela`:

- **Duas portarias servidas, em regiões de execução diferentes.** Base: `<script id="bfr-public-schedule-fallback">`,
  região `750635…1338272`, com `registerGateCheckin(token, source)` (2 526 caracteres, chama
  `register_gate_checkin`). Diferida: `<script type="text/plain" data-bfr-auth-deferred>`, região
  `3041341…3130003`, com `registerGateCheckin(client, params)` (307 caracteres), que ramifica por
  `gateLegacyMode()`.
- **Cinco definições de `function hideLegacy`, escolhidas por conteúdo e não por ordem:** `1890194`
  (coordenação, sem classe), `2793556` (`bfr-secretary-legacy`), `2931146` (coordenação central, sem
  classe), `2996855` (`bfr-monitor-legacy`) e `3126975` (`bfr-gate-legacy`). Só a última contém o
  seletor do portão `:scope > .gate-welcome,:scope > .gate-layout`, e essa agulha tem **0** ocorrências
  dentro da região da base. O CSS que fecha o punho é `#gatekeeperView .bfr-gate-legacy{display:none!important}`.
- **O formulário alcançável é o da diferida.** `data-gate-manual-form` (base): 2 ocorrências no
  bundle, **0** na região diferida. `data-gate-central-manual` (diferida): 2 ocorrências, **0** na
  região da base. Cada marcador vive numa só região, logo não há partilha de ouvintes entre as duas.
- **O loader só executa os diferidos depois de haver sessão:** gatilho
  `if (data?.session || hasOAuthCallback) await loadApplication()`, sobre `109` tags `script`, `80`
  em `text/plain`, `62` com atributo diferido, `4` desativadas.
- **Consequência nos estados reais** (tabela de verdade do artefacto do estado): o RPC escolhido pelo
  fonte é `register_gate_checkin_v2` em B, C e D; `register_gate_checkin` (v1) só em A, que é o antes
  do DDL. No catálogo: v1 `no_catalogo = 1`, v2 `no_catalogo = 0`; pelo fio, v2 `404 / PGRST202` (390 B).
  **Correção datada 22/11:** essas duas últimas cifras são o *antes* do DDL da PEN-42, que foi aplicado
  com a única frase autorizada (`APLICAR PEN-42 NO BANCO`, `evidence/p73-municipal-aplicacao-PEN-42-20261122T014151Z.json`).
  Depois dele, o mesmo pedido no fio devolve **400** com recusa de negócio (196 B de pedido, 127 B de
  resposta, estado visível «QR Code não reconhecido…») e o catálogo tem as duas funções com assinaturas
  de seis argumentos idênticas — medido em `evidence/p127-prova-browser-p4-checkin-22-11-h.json`, campos
  `assinatura_no_catalogo` e `passos[1].pedidos_do_passo`. O resto desta secção mantém-se: o nome
  escolhido continua a ser o v2 em B, C e D, e o `bfr_confirm_school_calendar` de §7 continua ausente
  (o censo re-corrido depois da aplicação dá 25 nomes, 23 no catálogo e os 2 ausentes são esse e
  `correct_gate_attendance`).
- **A saída manual também não chega ao v1.** A guarda `!gateLegacyMode()&&!gateReady()` ocorre **3**
  vezes no bundle (`3054210`, `3056334`, `3058107`), as três dentro do módulo diferido, e as três têm o
  mesmo contorno por motivo excepcional com `length<8` — em exatamente **uma** delas o contorno é um
  `throw new Error`, nas outras duas é um `scanStatus(…) + return`. O contorno muda o *motivo
  registado*, não o destino: a submissão continua pelo `registerGateCheckin` da diferida, que fora de
  legado vai ao v2 inexistente.

**Isto é a PEN-42**, criada neste ciclo. Semear o calendário não a repara: passa o estado de B para
C, e C também escolhe o v2. **Correção datada 22/11:** a prova de browser (§8-P4) foi corrida, e o que
ela disse é mais específico do que a pergunta original — o ouvinte da base está ligado, mas sobre um
nó com caixa `0×0` depois de o módulo montar, logo o botão que o `gatekeeper` vê pertence à camada
diferida; a gaveta `details` chega fechada e pintada, e sem abrir o `<summary>` o formulário não é
atingível nem focalizável. A PEN-42 em si foi aplicada nessa madrugada com a frase autorizada, e o
nome passou a resolver no fio. O que fica por resolver, e é outra peça, continua a ser o conteúdo da
RM-5.2 (§4 A4) e a função de confirmação (§7 / §4 A1), ambos medidos vazios a 22/11 pelos dois GET do
canal de leitura da própria prova de browser.


## 6. Conteúdo da semente (forma derivada do que já existe, não inventada)

- `bfr_school_calendar_days`: 365 linhas de 2026. `calendar_status` dentro do CHECK
  (`school_day`, `no_school`, `holiday`, `recess`, `recovery`), `label` com `length <= 160`,
  `school_year` entre 2000 e 2999, `source_status='draft'` na escrita e `confirmed` só pela função
  de A1.
- `bfr_school_shift_settings`: 2 linhas, uma por `shift` do CHECK (`matutino`, `vespertino`), com
  `active_weekdays` **explícito e não vazio** (§2.3), `late_grace_minutes` em 0…240 e o CHECK de
  janela a exigir `class_starts_at` entre `entry_opens_at` e `shift_closes_at`. `confirmed_at` não
  nulo, por §2.2. **As horas não precisam de ser inventadas**: a grade já servida dá
  `estado_versao = published`, `entradas = 594`, `inicio_min = 07:00:00`, `fim_max = 11:30:00`,
  `dias = quarta,quinta,segunda,sexta,terca` — os cinco dias de semana, por ordem do `string_agg`,
  sem sábado (mesas `bfr_schedule_versions` / `bfr_schedule_entries`, lidas pelo artefacto do estado
  em `catalogo.grade_tempos`).
  **Correção datada 23/11:** a candidata p144 semeia **1 linha** — só `matutino` com as horas da
  grade medida acima (`07:00:00`/`07:00:00`/`11:30:00`, weekdays `[1..5]`, graça 0). O `vespertino`
  **não tem horas medidas** em lado nenhum e fica por semear; e `confirmed_at` nasce **NULL** na
  semente: confirmar é o ato da função A1 (ausente), não da semente — a linha de §2.2 descreve o
  estado pós-A1, não o estado pós-semente.
- `bfr_school_calendar_month_targets`: 12 linhas com os valores de §3 **menos** D1. O painel lê
  `school_year,month,expected_school_days` (`front_pede`: 1 chamada, 0 escritas, sem `on_conflict`) —
  hoje nenhuma das três mesas tem linhas para essa leitura devolver. **Correção datada 23/11:** com
  D1 fechada, as 12 linhas são os rótulos mensais do documento (jan 0 · fev 12 · mar 23 · abr 20 ·
  mai 21 · jun 20 · jul 13 · ago 22 · set 21 · out 20 · nov 19 · dez 13, soma 204), conforme a
  correção datada de §3 — não os 261/313 seg–sex.

## 7. A função de confirmação (A1): forma proposta, ainda não escrita

**Adendo 24/11: a forma foi escrita, aplicada e conferida.** A candidata `scripts/p145-a1-confirmar-calendario-ddl-candidata.sql` segue a forma proposta abaixo, com dois acréscimos que a conferência mediu necessários: `REVOKE ALL … FROM anon, service_role` (o `pg_default_acl` semeia `EXECUTE` aos quatro papéis e o `REVOKE … FROM PUBLIC` não apaga essas entradas) e `NOTIFY pgrst` de recarga. O pré-voo `scripts/p145-a1-confirmar-calendario-preflight.mjs` tem modo candidata e modo `--reversao` (37 portões, incluindo o portão dos grants). O detalhe completo está no §SM.49 da auditoria; a forma proposta abaixo fica como foi medida a 20/11 e 22/11.

```
bfr_confirm_school_calendar(target_school_year)
  VOLATILE, SECURITY DEFINER, SET search_path = public, pg_temp
  corpo: UPDATE bfr_school_calendar_days
            SET source_status='confirmed', confirmed_by=auth.uid(),
                confirmed_at=now(), updated_at=now(), updated_by=auth.uid()
          WHERE school_year = target_school_year::int
            AND <todas as datas do ano presentes exatamente uma vez>     ← o portão
  e o mesmo portão aplicado a bfr_school_shift_settings (confirmed_at),
  porque o portão da portaria exige turno confirmado, não só dia confirmado.
  privilégios: REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated
               — o conjunto de cargos que pode chamar é a decisão §9-D2.
```

Três razões para ser DEFINER e não uma policy que autorize `confirmed`: (i) a confirmação tem de ser
um ato administrativo único, não um campo editável do formulário — o painel hoje escreve `draft` e
não se quer que passe a escrever `confirmed`; (ii) com A3 por decidir, um `UPDATE` por `school_year`
sem porta de escola é exatamente tão largo quanto a policy de escrita que já existe; (iii) o portão
interno («todas as datas presentes, exatamente uma vez») é o que impede a função de confirmar um ano
incompleto, e um `CHECK`/policy não sabe contar o conjunto das datas.

**Correção datada 23/11:** a forma ficou escrita na candidata
`scripts/p145-a1-confirmar-calendario-ddl-candidata.sql` (pré-voo 35/0 contra o catálogo vivo,
**sem aplicar**), com três divergências medidas da forma proposta acima: (i) a função confirma
**só os dias** e devolve a contagem (`RETURNS bigint`), porque o consumidor v142 medido
(`app/index.html:15334-15336`) imprime `${data||0} datas confirmadas` e avisa que «a gestão ainda
precisa confirmar os horários dos turnos» — os turnos confirmam-se pelo formulário de horários
(checkbox, `app/index.html:15303`), não pelo A1; (ii) a porta por papel vive **no corpo** da função
(RAISE com os 3 papéis de §9-D2), além do GRANT a authenticated — com FORCE RLS, o UPDATE continua
a passar pela política `managers_write`, e a checagem explícita evita o «0 datas confirmadas»
silencioso para quem não tem papel; (iii) o portão de completude é por **ano civil** (365/366 datas
distintas, a primeira em 01/01 e a última em 31/12), que é a forma da semente p144.

Depois de qualquer DDL de função é preciso recarregar o cache do PostgREST; um `404/PGRST202` que
persiste depois da criação é cache, não ausência. Por isso o critério de fecho é o **fio**, não o
`pg_proc`.

## 8. Critério de aceitação, por degraus

- **P1 — conteúdo.** Semente aplicada: `365 / 2 / 12` linhas, `anos = 2026`, e a conferência por
  `GET count=exact` (o mesmo canal do artefacto do estado) com zero linhas por tabela a menos.
- **P2 — confirmação.** Depois de A1, `source_status='confirmed'` em 365 datas **e** `confirmed_at`
  não nulo nas 2 linhas de turno. A régua deste ciclo passa a FALTA no portão
  `as_tres_mesas_continuam_vazias_e_a_escrita_de_calendario_nao_tem_politica_para_secretary` **por
  desenho**: nesse dia re-corre-se para um artefacto novo, com o veredito esperado mudado no nome,
  e não se edita a semente à espera de um verde velho.
  **Correção datada 23/11:** o A1 confirma só os dias (correção datada de §7); a parte dos turnos do
  P2 satisfaz-se pelo formulário de horários, e a semente é **1** linha (matutino), não 2 — o
  vespertino fica por semear porque não tem horas medidas em lado nenhum.
- **P3 — portão da portaria em aberto.** Com P1+P2, `gateReady()` dá verdadeiro dentro da janela do
  turno e `gateLegacyMode()` continua `false`. Verifica-se fora do ar: as cinco funções de §2
  compiam-se em `node:vm` no instrumento do estado, pelo que basta re-correr a tabela de verdade com
  o cenário C alimentado pelo conteúdo real lido do banco em vez do sintético.
- **P4 — prova de browser, CORRIDA 22/11 (05:04 UTC) e medida em `evidence/p127-prova-browser-p4-checkin-22-11-h.json`** (57 146 B, `em` 2026-11-22T05:04:32.042Z, 31 093 ms, `P127_P4_PROVA_BROWSER_OK 16/0`). Instrumento versionado `scripts/p127-prova-browser-p4-checkin.mjs`; sonda de reguas `SONDA_REGUAS_P127 TODOS_BATEM 29` antes de gastar browser. Alvo: sessão de `gatekeeper` (`papel_perfil` e `vista_activa` conferidos no censo) sobre o ar **publicado** — os 3 556 664 B md5 `0e22e78fe1e0ce929ec4717f86365ad9` medidos na corrida batem byte a byte com o registo versionado, e é o portão `o_ar_medido_bate_com_o_v142_do_registo_versionado` que o diz. A cadeia arrancou sem renovar (`arrancou_sem_renovar:true`, `renovou_nesta_corrida:false`), sem exceções de página, e a prontidão esperou pelo predicado do próprio fonte: `shell_ready` 1 358 ms, `modulo_montado` 982 ms. O que a corrida respondeu:
  - **Ouvintes, enumerados depois de o módulo diferido montar e com o depurador activo** (`depuracao_disponivel:true`; nenhum foi classificado por um `handler`, que este build do CDP devolve como `false`). O contentor do módulo tem **4** ouvintes, **1** deles de submissão — `submit`, `script_id` 148, `linha` 620, `coluna` 36 — e a camada é lida do trecho do fonte (`host.addEventListener('submit', … [data-gate-central-manual] …)` ⇒ `modulo_diferido`). O formulário estático do shell tem **1** ouvinte, de submissão, `script_id` 72, `linha` 2 185, `coluna` 43, trecho `form.addEventListener('submit', … registerGateCheckin(view.querySelector(...` ⇒ `legado_shell`. O form do próprio módulo tem **0** ouvintes directos: vai por delegação no contentor. Portanto a pergunta de §5 — «algum ouvinte da base ainda está ligado ao botão que se vê?» — tem resposta medida: **o ouvinte da base está ligado, mas não está ligado ao botão que se vê**; o botão visível (`button.bfr-gate-button`) pertence à camada diferida.
  - **O node legado deixa de ter caixa quando o módulo monta**, medido nos dois censos: ao pronto `bound_modulo:false`, `n_legado:1`, `n_modulo:0`, `legado_caixa` `531×596 w474 h86`; depois do módulo `bound_modulo:true`, `n_legado:1`, `n_modulo:1`, `legado_caixa` e `legado_botao` a `w0 h0`. Com `0×0` não há rato nem teclado que alcance — e é por isso que o terceiro passo cai no degrau da chamada direta.
  - **Degrau zero que a corrida tornou necessário, e é defeito do produto, não do instrumento:** a gaveta de leitura manual vive dentro de `<details class="bfr-gate-reader-options">` **fechado** (`gaveta.ao_pronto.aberto:false`) enquanto a CSS do módulo o pinta (`display_do_form:'grid'`). Medidas as três caixas: `details` h 53 com centro em y 1 007, o `form` h 64 com centro em y 1 155, o `textarea` do motivo h 72 com centro em y 1 254, tudo contra uma janela de `ih` 900. Fechar a gaveta deixa o formulário visível mas inatingível: nos vermelhos `-d`, `-e` e `-f` o `elementFromPoint` do centro exato do botão devolvia `section.bfr-gate-overview-grid` (ocupante 952×172, `position:static`, `z_index:auto`, `pointer_events:auto`) sobre um alvo de 944×34 com **o mesmo centro** (`alvo_e_mesmo_ponto:true`), e `el.focus()` não mudava o `activeElement`. O remédio do instrumento foi um clique real, com hit-test, no `<summary>` (caixa 952×44): `aberto:false → aberto:true`, `relacao:"no_alvo"`. Aberta a gaveta, o rato pousa no botão (`rato_pousou_no_alvo:true`, `clique.no_ponto:"button.bfr-gate-button"`). A rolagem foi tratada à parte, com sonda separada, e falsificou a minha primeira hipótese: o contentor rolável é o `main` (`overflow_y:auto`, `sh` 1 927 / `ch` 900, `rolavel:true`) e o `#gatekeeperView.content` não rolável (`sh` 1 865 = `ch`); o `scrollIntoView` assentou o alvo em y 450 e o rect relido imediatamente antes do clique deu `deriva {dx:0, dy:0}` — não havia rect velho, havia a gaveta fechada.
  - **O nome que sai no fio, pelo caminho do módulo, é `register_gate_checkin_v2`**, submetido pelo rato (`submetido_por:"rato"`), com o corpo a levar exatamente o crachá de controlo de 31 caracteres (`cracha_e_o_de_controlo:true`, pedido de 196 B com os seis campos do contrato) e o motivo de 20 caracteres lido no campo. O servidor respondeu **400** com 127 B e o estado visível «QR Code não reconhecido. Tente novamente ou busque o aluno.». Isto é a diferença que importava: a medição pré-DDL de §5 dava `404 / PGRST202` (390 B) para o mesmo pedido; agora o nome resolve — `assinatura_no_catalogo` mostra as seis assinaturas de argumentos **idênticas** entre v1 e v2, `funcoes_do_par:2`, e a recusa passou a ser de negócio, não de ausência. Fecho da PEN-42 confirmado no fio, não só no `pg_proc`.
  - **Sem justificativa de oito caracteres o passo é indecidível por nome, não verde por ausência:** no primeiro passo o rato pousou no botão, nenhum pedido de check-in saiu (`emissao.rato/teclado/request_submit` todos vazios) e o estado visível foi «Turno ou calendário não confirmado. Para seguir manualmente, informe um motivo excepcional com pelo menos 8 caracteres.». O julgamento deu `esperado:null`, `bate:null` com o motivo escrito, e a corrida tem `n_julgaveis:1` — exatamente o passo que tinha de ser julgável.
  - **Nada foi escrito**, medido nos dois lados: `gate_checkins` 272 linhas antes e depois, `checked_at` máximo `2026-11-18 19:38:43.349678+00`, `novas:0`, e o par de `baselines()` byte-idêntico (`schools` 6, `profiles` 28, `students` 848, `checkins` 272). A razão estrutural está no contrato lido do catálogo: a coluna que recebe o crachá é `uuid` e o crachá de controlo não tem forma de UUID (`tem_forma_de_uuid:false`), pelo que nenhum dos dois nomes podia resolver em linha.
  - **As mesas da RM-5.2 voltaram a ser medidas por este caminho** — os dois GET só-leitura que a própria corrida usa para medir o modo legado: `bfr_school_calendar_days` e `bfr_school_shift_settings` responderam **200 com lista vazia** (2 caracteres de corpo cada), logo `modo_legado_medido:false`. Ou seja, a 22/11 o conteúdo continua zero e o estado do portão continua o B de §2, agora com o nome do RPC a existir.
  - **O que P4 não decide, escrito no registo:** o nome emitido pela camada legado. A escada esgotou no degrau reconhecido (`degraus_tentaveis:"no_node_sem_caixa_pintada_pelo_rato_nem_pelo_teclado_fica_a_chamada_direta_ao_form"`), o `requestSubmit()` direto correu (`ok:true`) sobre um form com `0×0` e os dois campos são nós diferentes do do módulo (`mesmo_no:false`), mas o shell exige a forma UUID antes de chamar o RPC e recusou o crachá de controlo no ecrã (`QR CODE INVÁLIDO…`) sem pedir nada — `pedidos_do_passo` vazio. Passar um UUID inexistente julgá-lo-ia, e trocaria a garantia «impossível por forma» por «ausente medido»; isso é decisão do dono. Fica julgado pelo fonte servido (`app/index.html:25502-25509`).
  - **Os sete vermelhos preservados com a causa no nome**, porque foram eles que pagaram esta secção: `-a` (2 de 11) um modal `div#preferredNameModal.modal` por cima do alvo e um seletor que devolvia «nenhum formulario desta camada no contentor»; `-b` e `-c` (1 de 14, duas corridas iguais — a repetição provou que não era sorte) com os dois passos do módulo «centro fora da janela»; `-d` e `-e` (1 de 15) já alcançáveis mas com o clique a pousar na grelha de sobreposição; `-f` (1 de 16) com a oclusão medida no ponto e ainda sem emissão por rato; `-g` (1 de 16, cláusula 4 de 5) em que o crachá foi inserido duas vezes e ficou 62 caracteres, pelo que o corpo do fio já não era o crachá de controlo — corrigido por medição com limpeza por `Ctrl+A` + `Delete` antes de cada inserção, que é o caminho de um utilizador real, e nunca a mudança da cláusula.
  - Com P4 corrida, §5 deixa de ser cadeia apenas estática: a cadeia estática (fonte servido → `registerGateCheckin` da diferida → v2 fora do modo legado) tem agora o par de uma observação no fio, e o estado do mundo mudou desde que ela foi escrita — ver a correção datada em §5.

- **P5 — forma da prontidão.** Trocar a contagem fixa de 365 por cobertura do ano. É mudança de
  produto (bundle novo) e pede OK literal próprio; até lá, 2028 fica inatingável por construção.

## 9. As entradas que só o dono pode dar

| # | pergunta | consequência medida de não responder | quem responde |
|---|---|---|---|
| D1 | Feriados municipais e recesso de 2026 (datas com `calendar_status`) | os 261 dias seg–sex ficam como se não houvesse férias; `expected_school_days` passa a descrever o calendário escolar teórico, não a realidade | Secretaria Municipal (dados, não código) — **23/11, fechada por medida**: 4 imagens do CALENDÁRIO LETIVO 2026 deram os 11 rótulos mensais «DIAS LETIVOS» (jan 0 · fev 12 · mar 23 · abr 20 · mai 21 · jun 20 · jul 13 · ago 22 · set 21 · out 20 · nov 19 · dez 13), soma **204 = declarado**; respostas do dono: Carnaval 16–18/02, 02/04 não letivo, 15/10 e 28/10 feriados (o documento contradisse a resposta anterior «letivos»), 8 sábados letivos, etapas I–IV, recuperação 21–23/12; conferência: 225 úteis − 16 feriados − 3 Carnaval − 10 recesso = 196, + 8 sábados = **204 EXATO**; registado em `evidence/p151-d1-extracao-23-11.txt` e materializado na candidata p144 (23/11) |
| D2 | Quem confirma: mantém `coordinator`/`director`/`developer`, entra `secretary`? | hoje `secretary` não tem política de escrita em nenhuma das três mesas: gravar calendário pela Secretaria Escolar é rejeitado pela policy | decisão de produto — 23/11: **manter os 3 papéis**; `secretary` fica de fora, 0 escrita |
| D3 | Letivo aos sábados? | as duas metas existem medidas (261 vs 313); escolher sem medir era o erro que a régua deste ciclo evita. Também decide o `active_weekdays` de cada turno | decisão de produto — 23/11: **com sábados letivos pontuais** (o dono revisou a resposta «seg–sex»: «sim, alguns sábados»; o documento oficial lista sábados letivos) |
| D4 | Calendário por escola ou da rede? | nenhuma das três mesas tem `school_id`; com `municipality_id` a `NULL` em 6/6 escolas, etiquetar agora troca «lê a rede toda» por «não lê nada» (PEN-41) | decisão de produto — 23/11: **da rede**; por-escola fica para depois da etiquetagem (PEN-41) |

## 10. Fronteiras — o que este documento não prova

**Correção datada 22/11, e depois dela a lista honesta.** Quando este capítulo foi escrito, «nada no
browser» era verdade; a 22/11 às 05:04 UTC a §8-P4 foi corrida sobre o ar publicado e há sete vermelhos
de instrumento preservados com a causa no nome antes do verde. O que **continua** fora do que este
documento prova: nada sobre o cache do PostgREST estar recarregado por via administrativa (o que se
mede é o fio, que é o critério), nenhum PII, nenhuma linha escrita no banco por esta prova (`gate_checkins`
272 antes e 272 depois, `novas:0`, quatro mesas de referência idênticas no par de `baselines()`), e
nada aplicado do desenho de conteúdo — as três mesas da RM-5.2 continuam com 0 linhas, medidas de novo
pelos dois GET só-leitura da corrida. A lista de RPC ausentes vem do catálogo **por nome** — a prova
autoritativa de ausência entre assinaturas — e do fio com o controlo positivo a não dar 404. O item
§2.3 é consequência da semântica de `||` sobre o valor que a coluna devolve, e vai conferido em P1
em vez de afirmado como medição de linha: as três mesas têm 0 linhas hoje.

