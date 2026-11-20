# BU-6 — Mapa de perfis e permissões (o que cada papel pode, medido)

Duas camadas distintas, medidas separadamente:

1. **No banco** — o que o RLS deixa ler/escrever por papel (495 políticas lidas uma a uma, `evidence/bu2c-caminhos-de-autorizacao-20-11c.json`, veredicto `BU2C_CAMINHOS_VERDE 11/0`, pegada da matriz `b3282e4490fd9c4d7680060a90a9bead`).
2. **Na interface** — que portas (destinos) cada perfil realmente vê, medidas no browser sobre o ar actual (`evidence/ah2-mobile2-m5-*.json` com `md5_shell` igual ao ar, agregado por `ler-m5-do-ar-atual` em 20/11; desktop em `evidence/sm25-cobertura-desktop-20-11.json`).

A regra de leitura: **banco aberto + porta fechada = função existe mas ninguém usa; porta aberta + banco fechado = botão que devolve vazio.** As duas colunas têm de ser postas lado a lado, e é isso que este mapa faz.

## 1. Os 15 papéis do enum, com conta de teste, alcance no banco e portas na interface

`L/W` = tabelas alcançáveis para leitura / escrita pela régua larga (literal de papel, helper com fecho transitivo, ponte, claim) — extraídas das listas inteiriças de `evidence/bu4-digestao-para-documentacao-20-11.json` (campo `autorizacao.por_papel`), que o portão `os_contadores_da_matriz_batem_com_o_comprimento_das_listas` confronta com os contadores do produtor.

`Perfis por papel` = `evidence/bu2-censo-catalogo-20-11.json -> contas_por_papel`: 28 perfis que somam exactamente os 28 `auth.users` (portão `profiles_por_papel_soma_e_nao_excede_auth_users`, VERDE). É contagem de contas, não de vínculos: a coluna seguinte diz o que o banco deixa fazer, não o que uma conta concreta consegue ver.

`Portas no ar (móvel)` = **união** dos destinos vistos na barra e na gaveta pelas 6 larguras medidas (320/360/375/390/414/430), com o botão `⋯Mais` contado como um destino. Não é o número de itens abertos em cada largura: o `aee` tem `barra5/gaveta9` a 360 e `barra5/gaveta10` a 320, e a união dá 11. Duas ressalvas de leitura: `monitor` só foi medido a 360 e 430 (nas outras quatro larguras a célula ficou TRAVADA, logo o 8 é banda parcial, não censo); `pending` dá **0** porque a barreira de pendência apresenta o ecrã de adesão e não monta shell.

| Papel | Perfis por papel | L | W | Portas no ar (móvel) | Itens de escrita medidos (recorte legível, não amostra aleatória) |
|---|---|---|---|---|---|
| `developer` | 3 | 165 | 144 | 28 | quase tudo o que existe — inclui `staff_security_audit`, `bfr_municipal_*` |
| `coordinator` | 2 | 133 | 101 | 18 | `bfr_coordination_*`, `occurrences`, `staff_channels`, `staff_messages` |
| `director` | 2 | 127 | 98 | 19 | `students`, `attendance`, `grades`, `bfr_grade_audit` |
| `aee` | 2 | 78 | 55 | 11 | 15 tabelas `aee_*`, `literacy_activity_attempts`, `literacy_progress`, `student_messages`, `support_requests` |
| `pedagogical` (professor) | 2 | 81 | 51 | 17 | `attendance`, `grades`, `occurrences`, `bfr_grade_audit`, `bfr_lesson_attendance` — **não** escreve `bfr_teacher_diary` |
| `secretary` | 4 | 72 | 53 | 12 | `secretary_requests`, `announcements`, `school_documents`, `students`, `bfr_teacher_diary` |
| `education_supervisor` | 1 | 16 | 4 | 9 | `supervision_requests`, `supervision_responses`, `bfr_municipal_audit`, `learning_action_plans` |
| `psychology` | 1 | 16 | 13 | 7 | `psychology_*`, `support_*`, `internal_chat_*` |
| `social_work` | 1 | 14 | 14 | 6 | `internal_chat_*`, `psychology_*` (5), `support_appointments`, `support_follow_ups`, `support_messages`, `support_plans`, `support_requests` |
| `monitor` | 2 | 17 | 4 | 8 | `route_incidents`, `gate_entry_alerts`, `student_messages`, `access_requests` |
| `gatekeeper` | 2 | 15 | 1 | 8 | `access_requests` apenas, **apesar de ler `gate_checkins` e `gate_badges`** |
| `student` | 2 | 17 | 4 | 19 | `access_requests`, `gate_badges`, `secretary_requests`, `student_game_sessions` |
| `parent` | 1 | 17 | 3 | 16 | `access_requests`, `gate_badges`, `secretary_requests` |
| `sports_operator` | 1 | 3 | **0** | 5 | **nenhuma tabela** — só lê `sports_athletes`, `sports_match_events`, `sports_matches` |
| `pending` | 2 | 1 | 1 | **0** | `access_requests` (é o pedido de adesão); barreira de pendência antes da shell |

Correcção importante face ao censo antigo (`bu2-censo`, que dava `L0/W0` a monitor, gatekeeper, psychology, social_work e education_supervisor): esses cinco papéis **têm** caminho, mas passa por helpers, não por literal de cargo. Os nomes lêem-se de `bu2c -> helpers[].cargos_por_regua_larga`, cruzando com cada papel:

| Papel | Helpers por onde chega |
|---|---|
| `monitor` | `is_approved`, `is_monitor` |
| `gatekeeper` | `is_approved`, `is_gatekeeper` |
| `psychology` | `bfr_psychology_active_professional`, `bfr_psychology_record_access`, `bfr_support_detail_access`, `internal_chat_can_access_room`, `internal_chat_is_staff` |
| `social_work` | `bfr_psychology_active_professional`, `bfr_psychology_record_access`, `internal_chat_can_access_room`, `internal_chat_is_staff` |
| `education_supervisor` | `bfr_is_education_supervisor`, `bfr_is_municipal_authority`, `bfr_municipalities_visible` |

O censo ficou VERMELHO exatamente nisso — o portão, lido do emissor em `scripts/bu2-censo-catalogo-20-11.mjs:208`, é `expressions_de_politicas_sao_subconjunto_do_enum` — e a `bu2c` corrigiu o predicado com o vocabulário vindo do catálogo, não duma lista lembrada. A mesma régua do censo nomeia **6** valores do enum que nunca aparecem como texto entre aspas nas 495 expressões (`cargos_sem_politica_que_o_nomeie`): os cinco acima mais `pending`. O `pending` não tem helper que o nomeie, mas **tem** caminho: a única mesa que ele alcança, `access_requests`, tem 4 políticas e os mecanismos medidos são `helper`, `jwt_claim` e `literal_nu`, e é por um desses três que a `bu2c` lhe devolve `L1/W1` — o nome `pending` chega à matriz pelo fecho sobre a helper/a claim, não do texto da expressão, que é justamente o que o predicado do censo não via. Qual dos três é, por política, não foi separado por nenhum instrumento deste estágio.

## 2. Mecanismos de autorização, por contagem medida

| Mecanismo | Políticas | O que significa na prática |
|---|---|---|
| `helper` | 359 | a decisão vai para uma função PL/pgSQL (63 nomes citados; 49 com fecho transitivo limpo, 0 cortes por ciclo/profundidade) |
| `auth_uid` | 264 | compara a linha com `auth.uid()` — dono da própria linha / vínculo directo |
| `literal_nu` | 143 | compara `role` com `'secretary'` etc. **sem** cast |
| `join_de_ponte` | 126 | decide por existência noutra relação (`staff_schools`, `aee_student_links`, `guardian_students`, …) |
| `literal_cast` | 55 | a forma da casa: `'director'::text` |
| `jwt_claim` | 2 | lê claim do JWT (`auth.jwt()`) |
| `true_total` | 1 | `USING (true)` — abertura cega a qualquer papel autenticado |
| `sem_porta_de_papel` | 2 | decide só por colunas de estado: `instagram_posts_public_select` (r) e `bfr_support_services_read` (r) — nenhuma abre escrita (portão dedicado) |
| `nenhum` | **0** | depois do predicado do catálogo: não sobrou política sem mecanismo (antes sobravam 59 — `evidence/bu2d-politicas-sem-mecanismo-20-11.txt`) |

286 políticas têm mais de um mecanismo em simultâneo, por isso as linhas acima somam mais de 495; o portão que o admite é `soma_de_marcas_de_mecanismo`.

## 3. Onde o papel termina e o vínculo começa

13 helpers **não enumeram papéis nenhum** porque decidem por relação ou por contexto de sessão: `bfr_school_in_own_school_scope`, `bfr_school_in_municipal_scope`, `bfr_profile_in_my_schools`, `bfr_current_teacher_id`, `bfr_rls_session_role`, `bfr_staff_role`, `bfr_teacher_can_manage_class_subject`, `bfr_pedagogical_can_manage_student`, `bfr_family_can_view_aee`, `bfr_chat_can_access_message`, `bfr_chat_thread_is_empty`, `bfr_support_request_matches`, `sports_role_allowed`.

Consequência documental: um mapa de permissões que só mostre «papel → tabelas» **não descreve este sistema**. O mesmo papel (`developer`) pode ver 165 tabelas no catálogo e zero linhas de uma escola que não é a dele, porque a helper filtra por vínculo. Para os cinco papéis de apoio (psicologia, serviço social, AEE, supervisão, monitor) o vínculo é ainda mais determinante: as contas de teste existem (1–2 por papel) mas os vínculos de escola/sala são escassos — `staff_schools` 6 linhas, `guardian_students` **1**, `classes` 27.

## 4. Banco aberto × porta fechada (função existe, ninguém chega lá)

Do cruzamento entre matriz de autorização e portas medidas no ar:

- `sports_operator`: escreve 0 tabelas e só vê 5 destinos; as 3 tabelas que lê são as `sports_*` de origem. O módulo de Jogos tem no banco `sports_brackets`, `sports_championships`, `sports_match_statistics`, `sports_standings`, `sports_teams` — acessíveis a `secretary`/`aee`/`coordinator`, **não** a quem opera os jogos.
- `social_work`: o banco abre 14 tabelas de escrita (mais que o dobro dos 6 destinos que vê). Dos destinos medidos, só `multiprofissional«🧭Equipe de apoio»` poderia cobri-las; **quais das 14 são realmente alcançáveis por dentro desse destino não foi verificado** — exigir-lhe-ia sessão com vínculo real a uma escola, e a conta de teste existe em número de 1 sem vínculo conhecido.
- `pedagogical`: o oposto do que a nomenclatura sugere — o professor **não** escreve `bfr_teacher_diary` (nem a lê); quem escreve essa mesa é `developer`, `coordinator`, `secretary` e `director`. O que o RLS abre ao professor são `attendance`, `grades`, `occurrences`, `bfr_grade_audit` e `bfr_lesson_attendance`, e das mesas `bfr_teacher_*` ele só lê `bfr_teacher_directory`.
- `gatekeeper`: lê 15 mesas, entre elas `gate_checkins` e `gate_badges`, mas a escrita que o RLS lhe abre é **uma** — `access_requests`. O registo de entrada não passa por INSERT directo da interface: passa pelo RPC `register_gate_checkin` (existe no catálogo, 1 ocorrência em `pg_proc`), cuja rotina legada foi provada de ponta a ponta em T4.1–T4.3 e no item 47 da auditoria. O que está partido é o destino servido hoje: o módulo diferido ramifica por `gateLegacyMode()`, o estado do ar é `{legacy_mode:false, dia_letivo_confirmado:false, rpc:'register_gate_checkin_v2'}` (`evidence/p73-rm52-estado-calendario-20-11.txt`), e `register_gate_checkin_v2` dá 0 em `pg_proc` e `404 / PGRST202` pelo fio — **PEN-42**, prioridade A, com a cadeia de cinco elos medida byte a byte no §SM.27. Não é o RLS que fecha a portaria; é a função que falta.
- `education_supervisor`: 16 leituras / 4 escritas, mas vê 9 destinos incluindo `secretaria-municipal`; o `modulo-municipal` não cita tabela nenhuma e chama só `bfr_is_municipal_authority` — a área municipal da interface é **apresentação sobre uma única função**, sem leitura de mesas próprias.

## 5. Porta aberta × banco fechado — três classes que não devem ser misturadas

A primeira versão deste parágrafo dizia «seis mesas citadas e sem caminho para papel nenhum». Era errado por duas razões: contava **views** dentro dum universo que a matriz não cobre, e chamava «banco fechado» a mesas que têm política e só não nomeiam papel porque decidem por dono da linha. Re-escrito a partir do emissor (`resumo_por_tabela` e `tabelas_sem_politica` de `bu2c`, `tabelas_globais` da `bu3`):

**Classe A — política que não nomeia papel, porque é por posse da linha (9 mesas no banco, 5 citadas pela interface).** Do censo das 177 mesas com ≥1 política, **9** têm `cargos` vazio: `aee_game_favorites`, `announcement_reads`, `collaboration_notifications`, `internal_chat_message_reactions`, `notification_preferences`, `push_subscriptions`, `school_notification_reads`, `staff_announcement_reads`, `student_location_consent_log`. Os mecanismos medidos são `auth_uid` em todas, com `join_de_ponte` em `announcement_reads` e `helper` em `internal_chat_message_reactions`. Das nove, cinco são citadas pelo bundle:

| Mesa | Quem a chama (região identificada) | Mecanismo |
|---|---|---|
| `announcement_reads` | `bfr-core-runtime` | `auth_uid` + ponte |
| `notification_preferences`, `push_subscriptions`, `school_notification_reads` | `bfr-core-runtime`, `bfr-portal-upgrades.js` | `auth_uid` |
| `internal_chat_message_reactions` | `bfr-chat-redesign.js` | `auth_uid` + helper |

Isto **não** é um botão que devolve vazio por construção: é o desenho habitual de preferências por utilizador. O que não foi verificado é se o bundle escreve e lê com o `uid` e as chaves certas (exigiria sessão autenticada com conteúdo próprio por papel) — `NÃO FOI POSSÍVEL VERIFICAR`.

**Classe B — views, fora do universo da matriz.** As 5 `sports_public_*` (`matches`, `athletes`, `match_events`, `schools`, `teams`) são citadas pela interface — `sports_public_matches` dentro duma região identificada (`bfr-portal-upgrades.js`) e as restantes 4 só em corpos sem identidade, o que só a varredura global viu. A matriz de autorização tem universo `relkind='r'` (183 mesas), **logo não afirma nada sobre elas**: nem alcançáveis, nem fechadas. O que se sabe por registo é que o ciclo (b) de 23/10 fechou as cinco a `anon` por DDL, e que o censo as tem como views com 1–2 mesas de origem cada. A alcançabilidade por papel, através do `security_invoker` e das origens, não foi mapeada.

**Classe C — 6 mesas com RLS activo e zero políticas**: `push_notify_throttle`, `student_locations`, `student_location_notify_throttle`, `student_location_report_throttle`, `student_pairing_attempts`, `student_pairing_codes`. Estas, sim, ficam inacessíveis por construção, **incluindo para `developer`** (que não bypassa RLS). Nenhuma delas é citada pelo bundle, pelo que não geram botão morto — geram mesas que existem e não se usam pela interface.

## 6. A camada de desktop tem o mesmo mapa?

Não, e isso é medido: `evidence/sm25-cobertura-desktop-20-11.json` (45 células = 15 papéis × 1280/1440/1920, shell do ar `9e236a23eed978cf7c2a2743d449b307`) deu 38 medidas, 7 bloqueadas, 0 faltas, 0 estouro. As 7 bloqueadas são `pending` nas três larguras (barreira de pendência) e `monitor`, `coordinator`, `education_supervisor` a 1280 e `monitor` a 1920 — causa: shell pronto sem `#bfrMobileBottomNav` montado após rechegar. Na banda larga, a régua de portas do produto é `app/bfr-responsive-presentation.js:71-89` (`drawerItems()`), que usa selectores diferentes consoante o papel (`data-teacher-nav` para `teacher`/`pedagogical`): **a contagem de portas de professor não vem do mesmo sítio que a dos outros 14.**

## 7. O que não foi possível verificar neste estágio

- Que destinos cada perfil **vê no desktop por nome**: as células desktop têm contagens (`barra_rotas`, `gaveta_rotas`), não listas nomeadas.
- O mapa papel→destino **medido no browser sobre a shell actual para os 15 papéis a 390 px**: a sondagem dedicada (`evidence/ah2-sonda-portas-por-papel-pp5.json`, 11 papéis) foi corrida em 17/11 sobre `md5_shell d418e7fc…`, que não é o ar de hoje. As listas nomeadas usadas acima vêm dos 60 ficheiros m5 do ar actual.
- Conteúdo real por ecrã (o que aparece dentro de cada porta com dados verdadeiros): passado clicado só existe para 3 papéis com vínculo real; para os outros, `NÃO FOI POSSÍVEL VERIFICAR`.
