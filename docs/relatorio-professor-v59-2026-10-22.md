# Auditoria da aba do Professor — BFR Conecta
## Relatório da FASE 7 (brief mestre de 22/10/2026)

**Status:** correções **publicadas na v59** em 22/10 (version `fc1b3648-7562-4352-a677-ebab223afc78`, deployment `06f62d38-282d-4ce7-80d8-de4cf1e0f46f`). No banco, a única alteração de estrutura foi o **DDL de escopo do C1** (1 função + 5 policies), aplicado em 22/10 com autorização. Em 22/10 um **ensaio manual autorizado** gravou linhas sintéticas pelo app vivo, conferiu cada uma no banco e apagou tudo; as contagens voltaram à linha de base (seção 3.1). Nenhuma linha real foi alterada.

**Arquivo alterado:** `bfr-candidata-v59-professor/index.html`
- md5 `2e4036071b6e8a4ad232adab61b1b885`, 3.480.118 bytes
- linha de base: `bfr-candidata-v58-src/index.html`, md5 `31f209b6a23b878f6fd968a9285bdbad` (idêntico ao `/` publicado da v58)
- 35 hunks no diff padrão (3 linhas de contexto) / 554 linhas em `diff-v58-v59.txt`; 60 hunks com `-U0`; conteúdo real **+178 / −70** linhas (`git diff --no-index --numstat`)
- portão de sintaxe: **98 blocos de script conferidos, 0 erros** (`cheat-sintaxe-v59b.log`, EXIT=0)

**Publicada em 22/10, 11:19 UTC.** O `/` no ar passou a `2e4036071b6e8a4ad232adab61b1b885` (3.480.118 B), o SW a `0d5294f72d9d8ff41a241c7bfc8aa8b4` com `CACHE='bfr-conecta-v59'` e o `rp.js` segue `a83f77baba7453851b287080686c7afb`; 14/14 rotas ok e porta do cliente verde em Chrome limpo (seção 4.1). A reversão para a v58 está pronta e exige OK novo.

---

## 1. Problemas encontrados e correções

### 1.1 CRÍTICA

#### C1 — Escopo por aluno ausente no banco em leitura e recados (APLICADO em 22/10)

**Sintoma:** as telas do professor respeitam as turmas autorizadas, mas a camada de dados aceitava que qualquer conta pedagógica lesse e alterasse registros de **qualquer aluno** da escola em duas tabelas.

**Causa técnica (lida do catálogo antes da correção):**
- `student_reading_levels`: `reading staff select` usava `bfr_reading_staff()` = qualquer `pedagogical`, `aee`, `coordinator`, `developer` ou `director`, sem vínculo com o aluno; `reading staff insert/update` usava `bfr_reading_editor()` = qualquer `pedagogical`, `aee`, `coordinator` ou `developer`, também sem vínculo.
- `student_messages`: a policy `student_messages_staff_manage` era `ALL` com `is_staff()` = `pedagogical`, `aee` ou `developer`, sem vínculo com o aluno.

**Correção aplicada:** `sql-candidata-escopo-leitura-mensagens.sql` criou `bfr_team_can_access_student(uuid)` (coordenação/direção/developer amplos; pedagógico via `bfr_pedagogical_can_manage_student`; AEE via `aee_student_roster` ativo; demais nenhum) e substituiu as cinco policies das duas tabelas. Aplicação em `sql-aplicacao-escopo.log` (HTTP 201); diário completo em `aplicacao-escopo-leitura-mensagens-2026-10-22.md`. Reversão exata em `sql-reversao-escopo-leitura-mensagens.sql`.

**Prova pós-aplicação (catálogo vivo):** as 5 policies passaram a referenciar `bfr_team_can_access_student(student_id)`; função `SECURITY DEFINER`, dona `postgres`, `search_path=''`, `proacl` só `postgres`, `authenticated` e `service_role` (`anon=false`, `public` fora da ACL). Contagens intactas: `student_reading_levels` 0, `student_messages` 1.

**Prova comportamental (BEGIN…ROLLBACK):**
- pedagogical: aluno da turma `true`, aluno de fora `false`, uuid aleatório `false`, mensagens visíveis **0**;
- coordinator/director/developer: `true/true/true` (inalterado por desenho);
- AEE: aluno no roster `true`, fora do roster `false`, aleatório `false`;
- secretary: `false/false/false`.
- A/B do "antes" (policies originais recolocadas e revertidas em transação): pedagogical via **1** mensagem, de aluno **fora** da turma → agora **0**. É a mudança de comportamento visível esperada.
- Leitura com 2 linhas sintéticas: visível dentro `1`/fora `0`; UPDATE dentro `1`/fora `0`; INSERT fora **NEGADO** e dentro **PERMITIDO**; rollback deixou a tabela como estava (0).

**Limite residual:** contas `coordinator`, `director` e `developer` continuam com escopo amplo por decisão de produto registrada na candidata; `student_messages` segue sem escopo para o papel `secretary` porque `is_staff()` não o inclui (comportamento anterior preservado).

#### C2 — Rota e estado dessincronizados ao abrir a central da turma

**Sintoma do vídeo:** clicar em “Abrir turma” dentro de Atividades abre a central da turma, mas o app continua marcando “Atividades”; voltar ou recarregar cai na tela errada.

**Causa técnica:** o módulo seguro define um **segundo roteador** (`showScreen`) que troca a tela e a aba, mas não atualiza `activeSection` nem a rota persistida (`bfr-active-navigation-v2`). O handler do módulo captura o clique com `stopImmediatePropagation`, impedindo o handler do núcleo que chamaria `navigateToSection`.

**Correção na candidata:** ao final de `showScreen`, quando a view ativa é a do professor, a navegação é sincronizada por `BFR_APP_RUNTIME.navigate('professor-<tela>')` (linha 17449).

**Prova (`mede-v59-rota-fix.json`, 390 e 1280):**
- antes: `activeSection: professor-atividades`, rota persistida em atividades;
- depois: `activeSection: professor-turmas`, telas visíveis `["turmas"]`, breadcrumb “Minhas turmas”, nav “turmas”, `classOpen: true`, detalhe “6º ano A”;
- rota persistida: `{"section":"professor-turmas"}`; reload devolve Turmas;
- “Registrar chamada” na central → `professor-frequencia`, aba `attendance`, rota persistida (`mede-v59-go-frequencia.json`);
- menu seguro “Conteúdos trabalhados” → `professor-conteudos`, item ativo no topo, rota persistida (`mede-v59-rota-fix.log`).

#### C3 — Dados inventados em Biblioteca e Atividades

**Sintoma:** o catálogo virtual exibia seis livros que não existiam no banco; o módulo de atividades exibia uma tarefa de leitura de exemplo.

**Causa técnica:** `seedItems()` injetava seis livros fixos no catálogo unificado; `sample()` injetava uma atividade fictícia em “O que tenho para fazer?”.

**Correção na candidata:** sementes removidas. O catálogo lê `school_documents` (categorias `Biblioteca · N` e `Biblioteca Física`); as atividades vêm de `school_activities`, com escopo de turma do professor.

**Prova do acervo real (somente leitura, 22/10):** 226 linhas em `school_documents`, todas publicadas e com arquivo; **162 grupos** com a mesma normalização do app (agrupamento por título quando não há ISBN); **0 linhas** de `Biblioteca Física`. O “166 títulos / 0 físicos” do vídeo é, na natureza, isso: contagem real do banco, não número fixo. A diferença 166 → 162 é de dados/agrupamento no tempo, não de código; o zero físico é confirmado pelo banco.

#### C4 — Painel de leitura invisível no professor

**Sintoma:** o formulário de acompanhamento de leitura não aparecia na tela do professor.

**Causa técnica:** a regra `#teacherView > :not([data-teacher-professional]) { display:none !important }` escondia o painel injetado, que é irmão do bloco profissional e não tem esse atributo.

**Correção na candidata:** o seletor passou a preservar `[data-bfr-reading-panel]`, `[data-bfr-reading-assist-usage]` e `[data-teacher-aee-bridge]` (linha 2072). Medido: painel presente e 4 linhas carregadas para “6º ano · Turma A”.

#### C5 — Leitura carregava alunos de toda a escola para o perfil pedagógico

**Sintoma:** o professor via a lista completa de alunos no módulo de leitura.

**Causa técnica:** a consulta de `students` não era filtrada por turma quando o papel era `pedagogical`.

**Correção na candidata:** `readingTeacherScope()` espera o estado seguro do professor, restringe a consulta a `class_id in (...)` das turmas autorizadas, divide a consulta de níveis em lotes de 300 alunos, impõe teto de 12 s por consulta e oferece “Tentar novamente” (linhas 12912–12960). Sem vínculo carregado, o módulo não apresenta lista.

**Limite:** o escopo de cliente foi acompanhado do escopo de servidor aplicado no C1 em 22/10.

### 1.2 ALTA

#### A1 — Dois botões “Corrigir NOTA GERAL” idênticos por aluno

**Sintoma do vídeo:** o mesmo aluno mostrava dois botões com o mesmo rótulo.

**Causa técnica:** a lista de notas não é filtrada por bimestre; o rótulo usava só `assessment` e o valor só `subject`. Dois lançamentos em bimestres diferentes viravam textos idênticos.

**Correção na candidata:** `gradeLabel` inclui matéria e bimestre (`História · 2º bim`) e o botão de correção inclui o bimestre (linha 18453). A/B anterior: v58 com dois “Corrigir NOTA GERAL”; v59 com “NOTA GERAL · 2º bim” e “· 3º bim”; modal abre nos dois tamanhos com campos travados, nota 8 e bimestre 2.

#### A2 — Frequência: data errada, fontes duplicadas e rótulos desonestos

**Sintomas:** a tela abria com a data de hoje mesmo quando não havia aula; indicadores de frequência apareciam como zero/“—”; cartões e relatórios discordavam.

**Causa técnica:** a data era preenchida com `schoolTodayIso()` sem consultar a grade; `attendance` (diária) e `lessonAttendance` (por aula) eram somadas sem deduplicação; quando uma das fontes falhava, o rótulo não distinguia falha de ausência.

**Correção na candidata:**
- `nextLessonIsoFor(classId)` procura a próxima aula nos 7 dias seguintes, com base na grade segura (linha 17539);
- `syncAttendanceDefaultDate()` só sugere data automática enquanto o professor não escolheu uma (`data-autoDate`);
- `mergedAttendanceRows()` deduplica diária + por aula por `student_id|data` (linha 17718);
- cartão da turma usa a mesma fonte deduplicada e mostra “—”, “Frequência indisponível” ou “(parcial)” quando a fonte falha (linha 17841);
- o painel inicial usa o mesmo merge para pendentes e baixa frequência (linha 21978).

**Prova:** seleção de 6º ano/Turma A → data **2026-10-23** (próximo dia letivo), 2 aulas de História (07:00–07:50 e 07:50–08:40), 4 alunos na tabela, “Salvar aula” habilitado. A gravação não foi executada.

#### A3 — Central da turma aberta em contexto alheio

**Sintoma:** ao navegar para outra seção, o detalhe da turma continuava aberto por baixo; “Abrir turma” a partir de uma atividade deixava o contexto ambíguo.

**Causa técnica:** `classOpen` não existia; o detalhe era renderizado sempre que havia turma selecionada.

**Correção na candidata:** estado `classOpen` (linha 5511), guarda no render (linha 5548), `window.bfrTeacherOpenClass/CloseClass` (linha 5578), “Voltar às turmas” fecha a turma (linha 17965) e a atividade abre pelo helper (linha 17949).

#### A4 — “Meu dia” só olhava hoje; agenda não reusava a mesma fonte

**Sintoma:** o painel dizia “Nenhuma aula vinculada hoje” mesmo havendo aula no dia seguinte.

**Causa técnica:** `dayEntries` filtrava apenas o dia atual e a agenda montava a lista com outro critério.

**Correção na candidata:** `upcomingSchoolDay()` varre até 7 dias; o próximo item recebe rótulo “amanhã” ou dia da semana; `window.BFR_TEACHER_DAY_ENTRIES` é exportado e a agenda reusa a mesma função (linhas 22008–22037 e 28023). A semana exibida passa a ser a do próximo dia letivo quando hoje está vazio.

#### A5 — Busca de aluno aparecia em abas onde não filtra

**Sintoma:** campo “Pesquisar aluno” visível nas abas Notas, Atividades, Avaliações e Acompanhamento sem efeito.

**Correção na candidata:** o campo só aparece em `alunos`, `frequencia` e `acompanhamento` (linha 22061). As demais abas renderizam sem o controle inerte.

#### A6 — Aba inicial invisível em Resultados e aprendizagem

**Correção na candidata:** fallback de aba visível — se a aba persistida não está na lista do papel, cai em “Minhas ações” (professor) ou “Virada” (aluno), evitando painel em branco (linha 27838).

#### A7 — Saudação usava o nome completo em vez do nome preferido

**Correção na candidata:** `preferredDisplayName(currentProfile)` no painel inicial e no módulo seguro (linhas 5525 e 22040).

### 1.3 MÉDIA

- **M1 — Catálogo unificado não se ligava ao render da biblioteca:** listener de `bfr:reading-library-rendered` e `openTab()` exportado em `window.bfrUnifiedLibrary` (linha 13743), eliminando o estado em que a aba física ficava sem catálogo.
- **M2 — Caminho morto `data-library-read`:** removido; livro sem arquivo mostra “sem arquivo anexado” em vez de prometer leitura inexistente.
- **M3 — Consultas longas sem teto:** `readingQuery` com 12 s e botão de nova tentativa; lote de 300 ids para `student_reading_levels`.
- **M4 — Cache de leitura preso a outro usuário/turma:** `scopeKey` (usuário + papel + turmas) impede reaproveitar lista de outro escopo.
- **M5 — Filtro de disciplina não atualizava a lista:** o handler existente passou a re-renderizar; medição: “História” mantém as 5 turmas do fixture, “6º ano A” reduz a 1, “ZZZZZZ” zera com mensagem de vazio, limpar devolve 5.

### 1.4 BAIXA

- **B1 — Rótulos de frequência** agora dizem “registros de frequência” (não “registros por aula”), com “(parcial)” e “indisponível” quando aplicável.
- **B2 — Cartão da turma** mostra “—” quando as duas fontes falham, em vez de 0.
- **B3 — Contagem de presença por aula** passou a considerar todos os alunos da turma (não só um subconjunto implícito).

---

## 2. Funcionalidades preservadas

Nenhum módulo, rota, botão ou integração foi removido. Permanecem:

- **15 telas** do professor: Início, Turmas, Atividades, Avaliações, Frequência, Agenda, Biblioteca, Comunicação, Chat interno, Conteúdos, Diário, Planejamento, Relatórios, Calendário e Notificações.
- **9 abas** da navegação lateral e os atalhos mobile (barra de 5 + “Mais”).
- **6 abas da central da turma:** Alunos, Frequência, Notas, Atividades, Avaliações e Acompanhamento.
- **Painel acadêmico** com notas por bimestre/categoria, frequência diária e por aula, relatórios CSV/impressão e histórico de correções.
- **Módulos seguros** de conteúdos, diário, planejamento, relatórios, calendário e notificações, com as mesmas policies e tabelas.
- **LIA**, biblioteca virtual/física, comunicação, chat interno, resultados e aprendizagem.
- **Dados reais:** nada foi apagado. As seis “obras” removidas eram constantes no código, não linhas de `school_documents`.

---

## 3. Testes A–K — o que foi executado e o resultado

> **Ambiente:** harness local `harness-professor-v59.mjs` (porta 8263) com sessão sintética e respostas `*.supabase.co` interceptadas. O DOM, os eventos, as rotas e os componentes são os reais; **os números são de fixture**. O harness bloqueia escritas com 403 e as registra. A v58 bruta roda na porta 8264 para A/B.

| Teste | Escopo executado | Resultado |
|---|---|---|
| **A — Acesso e permissões** | Escopo de turmas no cliente; SELECT das policies vivas; escopo de leitura; menu seguro | **PARCIAL.** Cliente restrito às 5 turmas do fixture; leitura espera o vínculo e consulta só as turmas autorizadas. **NÃO TESTADO** o teste ao vivo com conta real de professor (as contas sintéticas foram apagadas em 22/10). O escopo de servidor em leitura/recados foi **aplicado e provado por papel** em 22/10 (C1). |
| **B — Minhas turmas** | 5 cartões; abrir 6A; 6 abas internas; busca “6º ano A”/“ZZZZZZ”/vazio; filtro de disciplina; contagens | **APROVADO no harness.** Busca 1 → 0 com mensagem → 5; filtro “História” mantém 5; abas Alunos/Frequência/Notas/Atividades/Avaliações/Acompanhamento trocam e renderizam; cartão 6A: 4 alunos, 5 notas, 3 registros. **NÃO TESTADO** com dados reais. |
| **C — Notas e avaliações** | Rótulos duplicados; modal de correção; campos travados; bimestre; disciplina; fallback de aba | **APROVADO no que foi medido.** Sem duplicata de rótulo; modal abre em 390/1280 com nota 8 e bimestre 2. **NÃO TESTADO** gravar/editar/corrigir nota (escrita bloqueada; sem conta real). Média e histórico não foram recalculados. |
| **D — Frequência** | Seleção de turma, data, aulas, alunos; merge diária+aula; rótulos; botão salvar | **APROVADO no render.** Data 2026-10-23, 2 aulas, 4 alunos, salvar habilitado. **NÃO TESTADO** salvar, reeditar, duplicidade por clique duplo e histórico. |
| **E — Atividades, diário e planejamento** | Lista de atividades; rota “Abrir turma”; formulários de conteúdo/diário/planejamento | **PARCIAL.** Atividade abre Turmas/6A com rota persistida; formulários renderizam com selects de turma/disciplina. **NÃO TESTADO** salvar, listar depois de reload, editar/excluir. |
| **F — Agenda, horário e calendário** | 15 telas; grade oficial; aviso das 3 células sem professor; próximo dia letivo | **PARCIAL.** A grade já identifica nominalmente as 3 células vespertinas sem professor (quinta/P3/6F Inglês; quinta/P2/6G Port.; sexta/P4/7E Ed.) e não inventa nomes; o painel inicial passa a varrer 7 dias. **NÃO TESTADO** conflito de horário, fuso/virada de dia e edição de evento. |
| **G — LIA** | Abrir/fechar por clique confiável em 390 e 1280; overlay, foco, aria, pointer-events | **APROVADO no abre/fecha.** `is-open`, `aria-hidden=false`, `inert=false`, opacidade 1, 2 mensagens, envio desabilitado; fecha para `aria-hidden=true`, `inert=true`, opacidade 0. **NÃO TESTADO** enviar mensagem, receber resposta, Enter, sugestões e geração de materiais (nenhuma mensagem foi enviada; a Edge Function de IA não foi exercitada). |
| **H — Biblioteca e comunicação** | Catálogo virtual; busca sem resultado; abas; acervo real; tela de comunicação | **PARCIAL.** Virtual com 2 cartões no fixture; busca “zzzzzz” → 0 + estado vazio; no banco real, 226 linhas / 162 grupos / 0 físicos. **NÃO TESTADO** abrir obra, empréstimo, envio de recado/chat e histórico. |
| **I — Navegação** | 15 telas; 9 abas laterais; barra mobile; rota persistida; reload; menu seguro | **APROVADO no harness.** 15/15 telas visíveis em cada largura; após “Abrir turma” a rota é Turmas; reload mantém Turmas; “Registrar chamada” → Frequência/attendance; “Conteúdos” → Conteúdos. |
| **J — Responsividade** | 390, 1280 e 320; overflow do documento e do `#teacherView`; 15 telas | **APROVADO no que foi medido.** 15/15 em cada largura; **0** estouro horizontal de documento e de `#teacherView`. **NÃO RE-MEDIDO** tamanho de alvo de toque e foco visível dos controles novos neste ciclo. |
| **K — Regressão** | A/B v58 × v59; 35 hunks @3 ctx (60 @-U0; +178/−70); sintaxe; sweep completo; fluxos de turma/nota/frequência/biblioteca/LIA | **APROVADO no harness.** 98 blocos de script, 0 erros; nenhum fluxo medido regrediu; erros de console apenas 404 de `/cdn-cgi/rum` (1–4 por passagem), sem exceção de aplicação. |

> A tabela acima é a medição de **harness**. O ensaio manual na URL publicada (seção 3.1) substitui os “NÃO TESTADO de escrita/leitura real” para os itens que ele cobriu; o que continua sem teste está na seção 3.2.

### 3.1 Ensaio manual de escrita na v59 no ar (22/10, autorizado)

**Montagem:** 1 conta `pedagogical` (`3204787f-3736-43e7-b940-c1facf6da17c`), 1 turma (9º ano ZZ · noturno), 2 alunos e vínculo de História. Sessão sintética semeada antes do load; cliques reais por CDP em 1280×900; cada escrita conferida no banco por id. Diário completo em `manual-v59-2026-10-22.md` / `.json`.

| Teste | Resultado | Evidência |
|---|---|---|
| Lançar nota pela grade por bimestre/categoria | **PARCIAL** | 7.5 persistido; a confirmação de sucesso não apareceu (D4) |
| Corrigir nota com motivo | **APROVADO** | status em 18 ms; auditoria `old_score 7.5 → new_score 8`, `changed_by` da conta |
| Salvar chamada/frequência | **NÃO TESTADO** | sem entrada publicada na grade e sem `bfr_teacher_directory` |
| Conteúdos trabalhados | **APROVADO** | status em 444 ms; linha `bfr_teacher_content` `9d0f737c…` |
| Diário de aula | **APROVADO** | status em 492 ms; linha `bfr_teacher_diary` `15cea5a1…` |
| Planejamento | **APROVADO** | status em 496 ms; linha `bfr_teacher_plans` `b3c27133…` |
| Publicar atividade | **REPROVADO** | 403 do PostgREST; `school_activities` permaneceu 0 (D3) |
| Responder recado | **PARCIAL** | gravação ok em 428 ms (2 linhas); painel invisível na v59 (D1) |
| Acompanhamento de leitura | **PARCIAL** | gravação ok em 443 ms; corrida de escopo trava a lista (D2) |
| LIA — enviar e receber | **APROVADO** | `/functions/v1/lia-chat` HTTP 200 em 1428 ms; resposta renderizada |
| Relatórios CSV e impressão | **APROVADO** | 2 alunos; 1 nota (`8`); guarda de vazio com 0 blobs; `print()` 1× |
| Chat interno | **PARCIAL** | tela, lista e compositor visíveis; envio não testado |
| Botões “Lançar nota” (Início/Avaliações) | **PARCIAL** | os dois abrem o mesmo modal; gravação pelo modal não testada |
| Agenda, Calendário e Biblioteca | **PARCIAL** | estados vazios honestos; nenhuma escrita existe nessas telas |
| Navegação | **APROVADO** | 16 itens; 15/15 telas já medidas em 390/1280/320 |
| Limpeza | **APROVADO** | contagens finais iguais à linha de base; 0 restos |

**Defeitos abertos descobertos no ensaio (nenhum corrigido sem OK novo):**

| ID | Severidade | Defeito | Causa provada |
|---|---|---|---|
| **D1** | **ALTA** | `[data-teacher-inbox]` invisível (`display:none`, 0×0); o professor não vê nem responde recados pela tela | A regra CSS da linha 2072 esconde filhos diretos de `#teacherView` fora da whitelist; `[data-teacher-inbox]` ficou de fora |
| **D2** | **MÉDIA-ALTA** | O painel de leitura abre com anos `[""]` e não se recupera sem reload | `ensureReadingPanel()` injeta antes de `BFR_SECURE_TEACHER_STATE.classes`; `loadReading()` cacheia escopo vazio e o intervalo não reinjeta |
| **D3** | **ALTA** | Publicar atividade devolve 403 e não grava | `school_activities_staff_insert` exige `bfr_is_schedule_manager()` ou `is_aee()`; `pedagogical` não passa |
| **D4** | **MÉDIA** | “Salvar lançamentos” não confirma sucesso | `secureAcademicSetup()` re-renderiza e sobrescreve a mensagem; a nota foi salva mesmo assim |

**Limpeza e prova de retorno:** apagadas 1 auditoria, 1 nota, 1 conteúdo, 1 diário, 1 planejamento, 1 leitura, 3 recados, 1 vínculo, 2 alunos, 1 turma, 1 profile e 1 usuário de auth, em ordem FK-safe; 16 tabelas dependentes conferidas com 0 linhas para os ids sintéticos. Contagens finais: `grades` 112, `attendance` 25, `bfr_lesson_attendance` 149, `student_messages` 1, `student_reading_levels` 0, `bfr_teacher_content/diary/plans` 0/0/0, `school_activities` 0, `classes` 27, `students` 848, `bfr_teacher_class_subjects` 5, `profiles` 24 (a linha de base 25 foi capturada depois da criação do profile sintético), `auth.users` sintéticos 0.

### 3.2 O que continua **NÃO TESTADO** (e a dependência)

1. **Salvar chamada/frequência** — exige entrada publicada em `bfr_schedule_entries` para a turma/disciplina e linha em `bfr_teacher_directory`.
2. **Enviar mensagem no chat interno** — exige segunda identidade sintética e mexe em estado compartilhado; a tela foi medida em modo somente leitura.
3. **Salvar nota pelo modal “Lançar nota”** de Início/Avaliações — o modal abriu com o formulário completo, mas o clique em Salvar nota não foi executado; o caminho testado foi a grade por categoria.
4. **Abrir/emprestar obra na Biblioteca** — a tela só tem dois cartões informativos, sem formulário; a abertura de arquivo não foi exercitada.
5. **Conta real de professor** — todo o ensaio usou a conta sintética `pedagogical`; os testes A, C, D, E, F, G e H continuam sem operação nominal real.
6. **Atividades “de toda a escola”** (`class_id` nulo) — o carregador atual usa `in('class_id', ...)`, então elas não chegam ao renderizador; ampliar é decisão de produto e não foi feito.
7. **Dados reais de aluno** — por regra, nenhum dado nominal foi baixado; as contagens foram feitas por `count(*)`/catálogo.

---

## 4. Integrações que dependem de configuração externa

| Integração | Estado | O que falta |
|---|---|---|
| RLS/funções do Supabase (leitura e recados) | **corrigido em 22/10**: 5 policies com `bfr_team_can_access_student`; `anon` sem EXECUTE | nenhuma ação pendente; rollback em `sql-reversao-escopo-leitura-mensagens.sql` |
| Vínculo professor↔turma (`bfr_teacher_class_subjects`) | contas sintéticas apagadas; nenhum vínculo real usado | conta real do professor ou linha de vínculo autorizada para o teste ao vivo |
| LIA / IA | cliente íntegro; envio não exercitado | credencial/configuração da função e teste com mensagem real |
| Acervo digital | 226 documentos com `storage_path` | conferir bucket/arquivos e o caminho de abertura |
| Acervo físico | 0 linhas em `Biblioteca Física` | cadastrar o acervo real, se a escola o tiver; não é falha de tela |
| Publicação (Cloudflare Worker) | **v59 no ar** desde 22/10 11:19 UTC (version `fc1b3648…`, deployment `06f62d38…`) | nenhuma pendência; a próxima publicação exige OK novo |

### 4.1 Pré-voo e publicação v59 (executados em 22/10)

**Ar inalterado antes de mim:** `/` md5 `31f209b6a23b878f6fd968a9285bdbad`, 3.468.610 B (igual a `ar-html-v58-live.html` e à linha de base); `sw-v4.js` md5 `8000099c0dfa9a01af24a2da917155e2` (`CACHE='bfr-conecta-v58'`); `bfr-responsive-presentation.js` md5 `a83f77baba7453851b287080686c7afb`.

**Candidata:** md5 `2e4036071b6e8a4ad232adab61b1b885`, 3.480.118 B; portão de sintaxe re-rodado no arquivo atual: **98 blocos, 0 erros, EXIT=0**.

**Paridade de assets (`preflight-v59.json`):** os 12 assets baixados do ar são **byte-idênticos** aos da candidata; `?v=14` aparece no `index.html` **e** no `PRECACHE_PATHS` do SW. Nenhum asset precisa subir.

**SRC (`prepara-src-v59.txt`, portão 4/4 VERDE):** `bfr-candidata-v59-src/` com 14 arquivos; `sw-v4.js` = SW do ar com **uma única linha** trocada (`CACHE v58 → v59`, md5 novo `0d5294f72d9d8ff41a241c7bfc8aa8b4`, 3.585 B); os outros 13 arquivos byte-idênticos à candidata.

**Bundle (`confere-bundle-v59.json`, PORTÃO BUNDLE VERDE):** `worker-deploy-v59/worker.mjs` embute HTML md5 `2e403607…` e SW md5 `0d5294f7…`, ambos iguais ao SRC; o SW difere do ar em **1 linha** (o `CACHE`); `public/` tem os 12 assets iguais ao SRC, incluindo `rp.js` `a83f77ba…`; marcadores da v59 presentes (rota sincronizada, porta de leitura, lotes de 300, teto de 12 s, `dailyKeys`, `offset <= 7`, `classOpen`, `BFR_TEACHER_DAY_ENTRIES`) e **0** ocorrências de `seedItems`/`sample(`.

**Embalagem (`dry-run-v59.log`, EXIT=0):** `node --check` aceita o `worker.mjs`; `wrangler deploy --dry-run` leu os 12 assets, reportou `Total Upload: 3448.17 KiB / gzip: 766.13 KiB`, binding `env.ASSETS` e saiu sem enviar nada.

**Credencial:** `deploy-worker.js --check` aceitou o **OAuth do wrangler** em leitura (`~/.cf-token` continua dando `10000 Authentication error`); a escrita foi provada no deploy.

**Deploy executado (22/10, 11:19 UTC):** `wrangler deploy` a partir de `worker-deploy-v59` com OAuth e sem `CLOUDFLARE_API_TOKEN`, EXIT=0: `No updated asset files to upload` (só o worker embutido mudou), `Total Upload: 3448.17 KiB / gzip: 766.13 KiB`, `Uploaded bfr-conecta (13.06 sec)`, **Current Version ID `fc1b3648-7562-4352-a677-ebab223afc78`**. O deployment correspondente é `06f62d38-282d-4ce7-80d8-de4cf1e0f46f`, criado em `2026-10-22T11:19:13.654346Z` (`deploy-list-v59.json`).

**Prova no ar depois do deploy:** `/` md5 `2e4036071b6e8a4ad232adab61b1b885`, 3.480.118 B; `sw-v4.js` md5 `0d5294f72d9d8ff41a241c7bfc8aa8b4`, 3.585 B, `CACHE='bfr-conecta-v59'`; `bfr-responsive-presentation.js` md5 `a83f77baba7453851b287080686c7afb`, 51.742 B; **14/14 rotas ok** (`audit-rotas-no-ar.json`). Em Chrome limpo (perfil temporário): uma única cache `bfr-conecta-v59`, `/` na cache com md5 `2e403607…`, SW ativa em `/sw-v4.js?v=45` e página controlada; marcadores `readingTeacherScope=3`, `dailyKeys=6`, `classOpen=6`, `day_entries=3`, `seedItems=0`, `sample_fn=0`; console só com 3× 404 de `/cdn-cgi/rum?` (`prova-sw-v59.json`, **PORTÃO DO CLIENTE v59 VERDE**). O diário consolidado está em `audit-publicacao-v59.json` (e `audit-publicacao.bfr-conecta-v59.json`).

**Reversão disponível (exige OK novo):** devolver `ar-html-v58-live.html` (`31f209b6`) como `index.html` e `ar-sw-v58-live.js` (`8000099c`, `CACHE` v58) como `sw-v4.js` ao SRC, rebuild, `confere-bundle` com os md5s do v58 e o mesmo `wrangler deploy`. O `rp.js` (`a83f77ba`) e os 12 assets não mudam.

---

## 5. Riscos e pendências que exigem decisão administrativa

1. **C1 aplicado em 22/10.** As policies de `student_reading_levels` e `student_messages` agora exigem vínculo com o aluno. Reversão exata pronta em `sql-reversao-escopo-leitura-mensagens.sql`. Decisão de produto preservada: `coordinator`, `director` e `developer` continuam com escopo amplo; `secretary` segue sem acesso a recados (como antes).
2. **v59 publicada em 22/10.** A candidata foi publicada com OK explícito e a entrega do código está provada no ar (14/14 rotas + Chrome limpo, seção 4.1). Em 22/10 o ensaio manual com conta sintética provou escrita/leitura real de notas, correção, conteúdos, diário, planejamento, leitura, recados, LIA e CSV (seção 3.1). O que segue **NÃO TESTADO** está listado na seção 3.2. A reversão para a v58 está pronta e exige OK novo.
3. **Conta real de professor.** O ensaio manual usou uma conta `pedagogical` sintética, apagada ao final. Os testes A, C, D, E, F, G e H ainda não foram exercidos com dados nominais de uma conta real; as escritas sintéticas, porém, passaram pelo PostgREST com RLS real.
4. **Quatro defeitos abertos do ensaio (D1–D4).** Painel de recados invisível, corrida do painel de leitura, INSERT de atividade negado ao papel docente e falta de confirmação ao salvar nota. Cada correção exige nova candidata (D1, D2, D4) ou decisão de policy (D3), com OK explícito; nenhum predicado foi alterado.
4. **Três células da grade sem professor.** Já aparecem como pendência nomeada; a escola precisa confirmar os nomes. O sistema não atribui professor por conta própria.
5. **Acervo físico zero.** O número é real. Se a escola possui livros físicos, eles precisam ser cadastrados; a tela não deve ser “consertada” para inventar exemplares.
6. **Divergência 166 × 162 títulos.** O vídeo registrou 166; o banco de hoje agrupa 162 títulos em 226 linhas. É variação de dados/agrupamento, não de código; qualquer conclusão sobre o número exato exige a mesma data de corte do vídeo.

---

## 6. Artefatos de prova

| Arquivo | Conteúdo |
|---|---|
| `bfr-candidata-v59-professor/index.html` | candidata (md5 `2e403607…`) |
| `bfr-candidata-v58-src/index.html` | linha de base (md5 `31f209b6…`, igual ao ar) |
| `diff-v58-v59.txt` / `diff-resumo.txt` | 35 hunks @3 ctx / 554 linhas; 60 @-U0; +178/−70 |
| `cheat-sintaxe-v59b.log` | 98 blocos, 0 erros |
| `mede-v59-rota-fix.json` / `.log` | rota, reload, LIA, menu seguro |
| `mede-v59-go-frequencia.json` / `.log` | “Registrar chamada” → Frequência/attendance |
| `mede-v59-final-sweep.json` + PNGs | 15 telas × 390/1280/320; busca, abas, leitura, frequência, biblioteca |
| `mede-v59-final-sweep-pre-rota.json` | A/B do defeito de rota antes do conserto |
| `sql-fase7-policies.json` / `sql-fase7-funcoes.json` | policies e funções vivas (leitura/recados) |
| `sql-fase7-acervo-grupos.json` | 226 linhas / 162 grupos / 0 físicos |
| `sql-candidata-escopo-leitura-mensagens.sql` | DDL aplicado em 22/10 (HTTP 201) |
| `sql-reversao-escopo-leitura-mensagens.sql` | rollback exato |
| `sql-validacao-escopo-teste-funcao.sql` / `.log` | ensaio da função por papel (rollback) |
| `preflight-v59.mjs` / `preflight-v59.json` | ar vs candidata: 12 assets idênticos, `?v=14`, marcadores |
| `prepara-src-v59.mjs` / `prepara-src-v59.txt` | SRC de 14 arquivos; SW com 1 linha trocada (4/4 verde) |
| `confere-bundle-v59.mjs` / `confere-bundle-v59.json` | HTML/SW embutidos, `public/` e marcadores (portão verde) |
| `dry-run-v59.log` | `node --check` + `wrangler deploy --dry-run` EXIT=0, sem upload |
| `deploy-v59.log` / `deploy-list-v59.json` | deploy EXIT=0; version `fc1b3648…`; deployment `06f62d38…` |
| `prova-sw-v59.json` / `.log` | Chrome limpo: cache única v59, md5 do `/`, SW ativa, marcadores; portão verde |
| `audit-rotas-no-ar.json` | 14/14 rotas ok depois do deploy |
| `audit-publicacao-v59.json` | diário consolidado da publicação v59 (antes/depois, portões, reversão) |
| `sql-validacao-escopo-rls.sql` / `.log` | ensaio de RLS: mensagens 1→0 (rollback) |
| `sql-validacao-escopo-leitura-linhas.sql` / `.log` | leitura: SELECT/UPDATE/INSERT dentro×fora (rollback) |
| `sql-pos-aplicacao-escopo.sql` / `.log` | policies, função, ACL e contagens pós-aplicação |
| `sql-pos-aplicacao-comportamento.sql` / `.log` | prova pós-aplicação por papel (rollback) |
| `sql-pos-aplicacao-ab-antes.sql` / `.log` | A/B do "antes" sob as policies originais (rollback) |
| `aplicacao-escopo-leitura-mensagens-2026-10-22.md` | diário da aplicação com evidências |
| `manual-v59-2026-10-22.json` / `.md` | ensaio manual E2E: 16 testes, D1–D4, limpeza e contagens finais |
| `manual-v59-e2e-*.json` + PNGs | provas por teste (nota, correção, formulários, atividade, recado, leitura, LIA, relatórios, controles) |
| `_q_e2e_estado_final.sql` / `_q_e2e_deps.sql` / `_q_e2e_cleanup.sql` / `_q_e2e_restos.sql` | estado antes, dependências, exclusão FK-safe e prova de 0 restos |

---

## 7. Conclusão

A aba do professor tinha quatro defeitos de fundo — rota dessincronizada, dados inventados, escopo de leitura amplo demais e indicadores de frequência sem fonte única — além de rótulos duplicados e controles inertes. A v59 corrige a camada de cliente e de dados de exibição, preserva os 15 módulos, foi medida em 390/1280/320 sem regressão observável e está **publicada no ar** desde 22/10. O escopo por aluno no banco (C1) foi **aplicado e provado por papel** em 22/10.

O ensaio manual de 22/10 provou, com escrita real e conferência no banco: correção de nota com auditoria, conteúdos, diário, planejamento, leitura, recados, LIA e CSV/impressão. Também revelou quatro defeitos abertos: o painel de recados invisível (D1), a corrida do painel de leitura (D2), o INSERT de atividade negado ao papel docente (D3) e a falta de confirmação ao salvar nota (D4). Frequência, envio no chat, gravação pelo modal de nota e abertura de obra na Biblioteca seguem **NÃO TESTADOS** com dependência declarada na seção 3.2. Nenhuma correção de D1–D4 foi publicada sem OK novo.

**Publicação:** v59 no ar em 22/10 11:19 UTC (version `fc1b3648…`, deployment `06f62d38…`; `/` `2e403607…`; SW `0d5294f7…` `CACHE` v59; `rp.js` `a83f77ba…`). No banco houve o DDL do C1 e, no ensaio manual, apenas linhas sintéticas — todas apagadas ao final; as contagens de produção voltaram à linha de base (`student_reading_levels` 0, `student_messages` 1, `grades` 112, `students` 848, `classes` 27).
