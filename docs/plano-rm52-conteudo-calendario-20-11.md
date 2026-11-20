# Proposta de conteúdo do calendário letivo e dos turnos — RM-5.2

**Estado: PROPOSTA ESCRITA 20/11. Nada foi aplicado, semeado, publicado ou empurrado.** Este
documento decide *forma e sequência*. As quatro entradas que só o dono pode dar estão numeradas em
§9 e cada uma diz o que fica verde quando ela é dada. Publicação de código, DDL, mint, escrita de
conteúdo no banco e `git push` continuam a pedir OK literal novo, um por um.

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

**A contagem fixa de 365 não é uma cobertura.** Medido: 2026 e 2027 têm 365 datas; 2028 e 2032 têm
366 (`fevereiro = 29`). Sem tocar no produto, um calendário de 2028 nunca fica verde. E 365 linhas
não garante 365 datas: a contagem aceita datas repetidas. As duas linhas de turnos e as 12 de metas
**não** entram na contagem de 365, mas a semente completa é `365 + 2 + 12 = 379` linhas
(`aritmetica.linhas_de_semente`).

## 4. As quatro ausências, cada uma com o OK que exige

| # | ausência | como foi medida | OK exigido |
|---|---|---|---|
| A1 | `bfr_confirm_school_calendar(target_school_year)` não existe | `pg_proc` por nome: `no_catalogo = 0`; fio POST: `404 / PGRST202`, 414 B; `correct_gate_attendance` 404 (399 B); controlo positivo de função viva a dar `200`, 11 B | DDL + recarga do cache do PostgREST (OK literal) |
| A2 | `secretary` não pode escrever calendário | `cargos_que_escrevem_calendario = coordinator, developer, director`; `comando_cru` da escrita é `*` (o `FOR ALL` deste Postgres renderiza-se `*`, não `a`) e o de leitura `r`; 6 policies nas três mesas | `ALTER POLICY` ou policy nova (OK literal) + §9-D2 |
| A3 | As mesas não têm dimensão de escola | chaves primárias medidas: `(school_year, school_date)`, `(school_year, shift)`, `(school_year, month)`; nenhuma `school_id` | DDL estrutural **ou** assumir rede única por ano (§9-D4) |
| A4 | Conteúdo zero | `linhas_das_mesas = 0/0/0`; `catalogo.linhas[].anos = ''` nas três | semente (OK literal), depois de D1 e D3 |

A1 e A4 explicam porque fechar a PEN-29 não fecha a RM-5.2: a PEN-29 foi criada ao **criar as mesas**
(RLS ativada e forçada, duas policies cada, 0 linhas). Estrutura existe; conteúdo e confirmação não.

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
- **A saída manual também não chega ao v1.** A guarda `!gateLegacyMode()&&!gateReady()` ocorre **3**
  vezes no bundle (`3054210`, `3056334`, `3058107`), as três dentro do módulo diferido, e as três têm o
  mesmo contorno por motivo excepcional com `length<8` — em exatamente **uma** delas o contorno é um
  `throw new Error`, nas outras duas é um `scanStatus(…) + return`. O contorno muda o *motivo
  registado*, não o destino: a submissão continua pelo `registerGateCheckin` da diferida, que fora de
  legado vai ao v2 inexistente.

**Isto é a PEN-42**, criada neste ciclo. Semear o calendário não a repara: passa o estado de B para
C, e C também escolhe o v2. Falta a prova de browser (§8-P4) para dizer se algum ouvinte da base
ainda está ligado ao botão que se vê.

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
- `bfr_school_calendar_month_targets`: 12 linhas com os valores de §3 **menos** D1. O painel lê
  `school_year,month,expected_school_days` (`front_pede`: 1 chamada, 0 escritas, sem `on_conflict`) —
  hoje nenhuma das três mesas tem linhas para essa leitura devolver.

## 7. A função de confirmação (A1): forma proposta, ainda não escrita

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
- **P3 — portão da portaria em aberto.** Com P1+P2, `gateReady()` dá verdadeiro dentro da janela do
  turno e `gateLegacyMode()` continua `false`. Verifica-se fora do ar: as cinco funções de §2
  compiam-se em `node:vm` no instrumento do estado, pelo que basta re-correr a tabela de verdade com
  o cenário C alimentado pelo conteúdo real lido do banco em vez do sintético.
- **P4 — prova de browser, que continua por correr.** Sessão de `gatekeeper`, enumerar os ouvintes do
  formulário alcançável, submeter e registar o nome do RPC pedido no fio, conferindo `gate_checkins`
  antes e depois para provar que nada foi escrito. Sem P4, §5 é uma cadeia estática — sólida, mas
  estática.
- **P5 — forma da prontidão.** Trocar a contagem fixa de 365 por cobertura do ano. É mudança de
  produto (bundle novo) e pede OK literal próprio; até lá, 2028 fica inatingável por construção.

## 9. As entradas que só o dono pode dar

| # | pergunta | consequência medida de não responder | quem responde |
|---|---|---|---|
| D1 | Feriados municipais e recesso de 2026 (datas com `calendar_status`) | os 261 dias seg–sex ficam como se não houvesse férias; `expected_school_days` passa a descrever o calendário escolar teórico, não a realidade | Secretaria Municipal (dados, não código) |
| D2 | Quem confirma: mantém `coordinator`/`director`/`developer`, entra `secretary`? | hoje `secretary` não tem política de escrita em nenhuma das três mesas: gravar calendário pela Secretaria Escolar é rejeitado pela policy | decisão de produto |
| D3 | Letivo aos sábados? | as duas metas existem medidas (261 vs 313); escolher sem medir era o erro que a régua deste ciclo evita. Também decide o `active_weekdays` de cada turno | decisão de produto |
| D4 | Calendário por escola ou da rede? | nenhuma das três mesas tem `school_id`; com `municipality_id` a `NULL` em 6/6 escolas, etiquetar agora troca «lê a rede toda» por «não lê nada» (PEN-41) | decisão de produto, depois da etiquetagem |

## 10. Fronteiras — o que este documento não prova

Nada no browser (P4), nada no ar depois de DDL, nada sobre o cache do PostgREST estar recarregado,
nada de PII, nada aplicado. A lista de RPC ausentes vem do catálogo **por nome** — a prova
autoritativa de ausência entre assinaturas — e do fio com o controlo positivo a não dar 404. O item
§2.3 é consequência da semântica de `||` sobre o valor que a coluna devolve, e vai conferido em P1
em vez de afirmado como medição de linha: as três mesas têm 0 linhas hoje.
