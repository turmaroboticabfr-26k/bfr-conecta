# BU-4 — Mapa completo do aplicativo (o que é, do pedido ao byte)

Data: 2026-11-20. Estágio 1 do PROMPT BU: análise, compreensão e documentação. **Nada aqui alterou o projeto**: nenhuma DDL, nenhuma escrita no banco, nenhum mint, nenhuma publicação, nenhum `git push`. As únicas escrita autorizadas deste estágio são os instrumentos em `scripts/bu*-*.mjs` e os artefactos em `evidence/bu*-*.json|txt`, além destes documentos.

Toda linha que afirma um número tem atrás dela uma corrida. A coluna **fonte** diz qual. Se uma afirmação não tem corrida, está marcada `NÃO FOI POSSÍVEL VERIFICAR` — não é preenchida por inferência.

## 1. As quatro camadas, e como se ligam

| Camada | O que é | Medido agora | Fonte |
|---|---|---|---|
| Borda | Cloudflare Worker `bfr-conecta` (conta `turmaroboticabfr@gmail.com`), versão `1598137c-ab84-4ca7-a5e3-ce621d06f255`, criada 2026-11-19T10:16:29.434532Z, 100 % do tráfego | `https://bfr-conecta.turmaroboticabfr.workers.dev` responde **200**, `text/html; charset=utf-8`, 3 547 458 B, md5 `9e236a23eed978cf7c2a2743d449b307`, `x-frame-options: SAMEORIGIN` | `evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json` (campo `ar`); o `fetch` é feito dentro do instrumento contra `audit-publicacao-v136.json -> deploy.url`, nunca dactilografado |
| Interface | um único `index.html` (shell de página única, 104 corpos de `<script>`, 64 regiões com identidade) | o byte servido **é** o byte versionado: md5 e bytes batem com o bundle em disco, com a certidão da candidata e com a linha do diário de publicação — 4 portões VERDES | idem + `bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata.json` |
| Dados | Supabase: Postgres `public` + Auth + Storage + Realtime | 183 tabelas, 7 views, 495 políticas RLS, 158 funções, 64 triggers (35 ativas), 75 tabelas na publicação realtime, 9 baldes de storage (0 públicos) | `evidence/bu2-censo-catalogo-20-11.json`, `evidence/bu4-digestao-para-documentacao-20-11.json` |
| Instrumentação | 558 instrumentos `.mjs` + 26 `.sql` em `scripts/`, 1 313 ficheiros em `evidence/`, registro de pendências em `docs/roadmap-master.md` | 42 itens PEN: 17 Alto, 14 Médio, 11 Baixo; maior identificador PEN-42 | contagem por `ls` e `wc` em 20/11; `node scripts/ah1-cuenta-pen.mjs docs/roadmap-master.md` (re-corrido em 20/11) |

**Cadeia de confiança do que está no ar** (não é memória, é confrontação): `ar.md5 == bundle.md5 == certidão.saida.index_md5 == linha do diário de publicação`. Os quatro igualam-se, e é isso que autoriza dizer «o código descrito abaixo é o código servido».

## 2. Como a interface está construída por dentro

Medido sobre o bundle servido (`evidence/bu3-...11e...json`, campos `tags`, `pegada_global`, `regioes`):

- 213 eventos de tag `<script>`/`</script>` no texto bruto → **104 aberturas honradas** (elementos reais), **5 aberturas textuais dentro de corpos** (JS que contém a string `<script`, não são elementos), 104 fechos que fecharam elemento, 0 fechos sem abertura. A régua que separa as duas classes dispara em fixture partido (`aberturas_honoradas 1 ≠ fechos 0`, `porFechar` preenchido) e não dispara em documento inteiro.
- Das 104 regiões de código, **64 têm identidade** (`data-bfr-module`, `data-bfr-deferred`, `id` ou o marcador municipal); **40 não têm** — 874 166 caracteres de script que o documento executa sem nenhum nome pelo qual os possa rastrear. Isto é um achado de estrutura, não de gosto: ver §BU-8, Ausências.
- **52 regiões são diferidas** (`type="text/plain"`: só são interpretadas depois do arranque, quando o papel o justifica) e **4 estão desativadas** no bundle vivo: `bfr-coordination-command`, `bfr-coordination-dashboard-v3`, `bfr-coordination-density-v4`, `bfr-coordination-realtime-v2`. A região desativada mais cara é `bfr-coordination-command` (111 695 caracteres) e é ela que chama dois dos três RPCs inexistentes (§5).
- 26 regiões têm pegada de dados (tabelas ou RPCs); as outras 38 são apresentação, navegação, estilos ou runtime sem acesso direto.
- Âncoras de secção nomeadas no documento: **72** destinos declarados, dos quais **71** aparecem como âncora estática, **5** só por literal no código e 3 identificadores formados em tempo de execução (`SECTION` → `resultados-aprendizagem`, `SECT` → `secretaria-municipal`, `section` → `null`). O roadmap antigo contava 52 abas; nenhum destes números é o outro — a cifra **46** que aqui estava era uma leitura parcial e fica corrigida por `evidence/bu5-portas-do-ar-20-11.json` (`BU5_PORTAS_VERDE 9/0`). Dos 72 destinos declarados, **54** foram abertos no browser sobre o byte servido; o portão `toda_rota_medida_no_browser_e_declarada_no_documento` devolve `nao_resolvidas=[]` com `rotas_medidas_n=54` e a única exceção de navegação `["more"]` (o botão «⋯Mais», que não é destino), e `a_contagem_por_papel_bate_com_a_uniao_recontada_dos_destinos` confronta os 183 contados por papel (15 papéis) com a união re-contada. Ver §BU-7 para a divisão mobile/web.

## 3. O que a interface realmente usa (pegada global, sobre todo o texto de script)

| Grandeza | Valor | Nota |
|---|---|---|
| Tabelas citadas | **112** de 183 | sobre TODOS os corpos; as regiões com nome sozinhas davam 79 — a diferença (33 tabelas) é citada em código sem identidade |
| RPCs chamadas | **25** | 3 não existem no catálogo (§5) |
| Baldes de storage referidos | **7** de 9 | `collaboration-files` e `staff-files` existem, têm políticas (3 e 7) e nenhum byte de interface os nomeia |
| Canais realtime | **4** | `bfr-chat-v3-realtime`, `bfr-direction-visuals`, `bfr-internal-chat-presence`, `school-games-live` |
| Tabelas do catálogo que a interface nunca nomeia | **78** | 21 famílias, lidas de `evidence/bu4-...json -> mesas_orfas_por_familia`: `bfr:15`, `staff:10`, `collaboration:8`, `student:8`, `learning:6`, `aee:5`, `supervision:5`, `instagram:3`, `sports:3`, `literacy:2`, `poll:2`, `school:2` e **9 famílias de 1** (`announcement`, `gate`, `internal`, `meeting`, `photos`, `polls`, `project`, `push`, `support`). A soma das famílias confere com o censo pelo portão `o_agrupamento_por_familia_preserva_o_censo_de_orfas` |
| Citações da interface que a matriz não resolve | **10** = 5 mesas com política mas sem papel nomeado (`announcement_reads`, `internal_chat_message_reactions`, `notification_preferences`, `push_subscriptions`, `school_notification_reads` — todas por `auth_uid`, ou seja posse da linha, não bloqueio) + 5 views `sports_public_*` (`matches`, `athletes`, `match_events`, `schools`, `teams`), fora do universo da matriz (`relkind='r'`) | Nem «devolve 0 linhas» nem «está fechado» pode ser afirmado sem sessão autenticada: ver §5 do mapa de perfis |

A fronteira real não é um número só: de um lado **78 mesas que o banco tem e a interface nunca nomeia** (back-end construído e não exposto), do outro **10 citações que a matriz não resolve** — 5 mesas de posse da linha (`auth_uid`, que não nomeia papel porque decide por dono do registo), 4 views `sports_public_*` fora do universo da matriz (relkind `r`) e, separadas de ambas, 6 mesas com RLS activo e zero políticas que ficam inacessíveis por construção mas não são citadas por ninguém. Detalhe das três classes no mapa de perfis (`03-perfis-e-permissoes.md` §5).

## 4. Camada de dados: o que existe, com que volume

Volumes exatos lidos do banco (só-leitura) em `evidence/bu2-censo-catalogo-20-11.json -> volumes_exatos`:

- Identidade e comunidade: `profiles` 28 (15 papéis do enum), `students` 848, `schools` 6, `classes` 27, `staff_schools` 6, `guardian_students` **1**.
- Operação do dia: `gate_checkins` 272, `gate_badges` 843, `attendance` 25, `grades` 112, `school_documents` 226, `access_requests` 12, `student_messages` 1, `announcements` **1**, `internal_chat_threads` **1**, `internal_chat_messages` **2**.
- Módulos vazios: `occurrences` 0, `route_incidents` 0, `school_activities` 0, `learning_action_plans` 0, `psychology_referrals` 0, `supervision_requests` 0, `supervision_responses` 0, `bfr_municipal_audit` 0, `bfr_school_calendar_days` **0**, `bfr_school_shift_settings` **0**, `bfr_school_calendar_month_targets` **0**, `bfr_teacher_class_subjects` 5. `support_requests` **não** está vazio: tem **1** linha. Quem a criou e com que vínculo não foi medido — o censo conta linhas, não autorias.
- Nomes nucleares que **não existem** no catálogo (o roadmap falava deles): `attendance_records`, `notifications`, `routes`, `vehicles`, `behavior_records`, `bfr_municipal_grants`, `municipalities` — o que existe chama-se `attendance`, `occurrences`, `bfr_municipalities`, etc. Qualquer documento que cite os primeiros está desactualizado.

Leitura de segurança medida: RLS activo em **183/183** tabelas, `force` em 3, 177 com pelo menos uma política, 6 sem política nenhuma (`push_notify_throttle`, `student_location_notify_throttle`, `student_location_report_throttle`, `student_locations`, `student_pairing_attempts`, `student_pairing_codes`). 145 de 158 funções são `security_definer` e **todas as 145 definer têm `search_path` fixado**. Baldes: 0 públicos. Dados de identificação em 65 colunas, contacto em 9; três tabelas têm colunas de credencial física (`gate_badges` 1, `instagram_accounts` 2, `push_subscriptions` 1) — nomes de coluna, não valores; nenhum segredo é impresso por estes instrumentos.

## 5. Integrações externas (o que o ar toca fora da Cloudflare/Supabase)

| Integração | Estado medido | Fonte |
|---|---|---|
| Supabase Auth | vivo; **28** contas em `auth.users` e **28** perfis, com os papéis do enum a distribuí-los 1 a 4 por papel (secretary 4, developer 3, sete papéis com 2, cinco com 1). O portão `profiles_por_papel_soma_e_nao_excede_auth_users` está VERDE com `soma_profiles=28, auth_users=28` — ou seja, **não há conta sem perfil nem perfil sem conta** | `evidence/bu2-censo-catalogo-20-11.json -> contas_auth`, `contas_por_papel`, `veredictos` |
| Supabase Realtime | 75 tabelas publicadas; 4 canais nomeados pelo bundle | ídem, `pegada_global.canais_globais` |
| Supabase Storage | 9 baldes privados; interface usa 7 | `evidence/bu2b-matriz-de-acesso-20-11.json` |
| Cloudflare Workers | 1 versão activa (v136); `worker.mjs` 3 612 332 B md5 `f963b932af5b296e00584ae636ab8397`; 12 assets + `_headers` byte-idênticos desde a v135 | `audit-publicacao-v136.json` |
| Instagram | existe schema (`instagram_accounts`, `instagram_posts`, `instagram_sync_runs`) e a interface **não nomeia nenhuma das três**; 2 colunas de credencial em `instagram_accounts` | censo + órfãs |
| Push/notificações | `push_subscriptions` + `push_notify_throttle` existem; a interface cita `push_subscriptions`, que não é alcançável por papel algum; o throttle não tem política | §3, `tabelas_sem_politica` |
| E-mail / SMS | **NÃO FOI POSSÍVEL VERIFICAR** — nenhum instrumento desta análise mediu envio; os únicos campos de contato contados foram colunas, não tráfego | — |

## 6. Como um pedido de dados viaja (o caminho real, não o pretendido)

1. O utilizador abre `https://bfr-conecta.turmaroboticabfr.workers.dev/`. O Worker serve a shell (bytes do §1) com `X-Frame-Options: SAMEORIGIN` e o `_headers` que cobre os 12 assets.
2. O runtime (`bfr-core-runtime`, 784 647 caracteres, diferido) autentica, lê o papel do perfil e escolhe o conjunto de regiões a activar.
3. As regiões activas chamam Supabase: `supabase.from('t')` sobre **112** tabelas e `supabase.rpc('f')` sobre **25** funções.
4. Do lado do banco, 495 políticas RLS decidem. Os mecanismos reais, medidos política a política (`bu2c`, 11 portões VERDES): **helper** 359, **auth.uid()** 264, **literal de papel nu** 143, **join de ponte** 126, **literal com cast** 55, **claim de JWT** 2, **`true` total** 1, **só colunas de estado** 2, **nenhum** 0. 286 políticas usam mais de um mecanismo.
5. As helpers são o coração real da autorização: **63** citadas pelo RLS, **todas as 63** com corpo lido do catálogo e definidas como `security definer`, e o fecho transitivo sobre elas não corta nenhuma (`cortes_de_fechamento_transitivo = []`: 0 por ciclo, 0 por profundidade). 13 delas não enumeram papéis — são predicados de relação (`bfr_school_in_own_school_scope`, `bfr_profile_in_my_schools`, `bfr_current_teacher_id`, `sports_role_allowed`, `bfr_rls_session_role`, …): autorizam por vínculo, não por cargo. Uma análise que só procurasse `bfr_*` perdia **59** políticas (`evidence/bu2d-politicas-sem-mecanismo-20-11.json -> politicas_sem_mecanismo_na_predica_da_bu2c`); foi o vermelho que originou a `bu2c` (ver `evidence/bu2c-...-VERMELHO-a-predica-de-helper-so-reconhecia-prefixo-bfr.txt`).

## 7. Vocabulário de papéis que convive com o enum (fonte de confusão documental)

Medido pelo predicado do censo sobre as 495 expressões (`evidence/bu2-censo-catalogo-20-11.json -> cargos_aparecem_na_matriz`, `cargos_sem_politica_que_o_nomeie`), e recomputado aqui a partir do artefacto:

- **16** rótulos distintos aparecem entre aspas simples nas expressões de política.
- **9** são valores do enum `account_role` (`aee`, `coordinator`, `developer`, `director`, `parent`, `pedagogical`, `secretary`, `sports_operator`, `student`).
- **7 não são papéis**: `active`, `all`, `coordinator_override`, `email`, `family`, `published`, `teacher`. Nenhum dos sete é valor do `account_role`; `teacher` merece nota porque o enum usa `pedagogical` para a mesma função, pelo que uma pesquisa textual por `'teacher'` não encontra o papel e uma pesquisa por `teacher` nas políticas encontra colunas de outro tipo — é assim que um mapa feito à mão troca os dois.
- **6 valores do enum nunca aparecem como literal**: `pending`, `monitor`, `gatekeeper`, `psychology`, `social_work`, `education_supervisor`. Os cinco primeiros tinham `L0/W0` no censo porque o caminho deles passa por helpers; `pending` só alcança `access_requests`.

O portão do censo, cujo nome se lê do emissor em `scripts/bu2-censo-catalogo-20-11.mjs:208`, chama-se `expressions_de_politicas_sao_subconjunto_do_enum` (com `expressions`, não `expressoes`) e está VERMELHO no artefacto: `BU2_CENSO_VERMELHO 7/1`, com `gates_vermelhos_censo` a listar exactamente esse nome. A `bu2c` resolveu-o filtrando pelo enum medido, e é por isso que os números deste documento vêm da `bu2c`, não do censo bruto. As **ocorrências por rótulo** (quantas vezes cada um aparece) não foram medidas por nenhum instrumento deste estágio; só o conjunto distinto.

## 8. O que este mapa não cobre

- O que cada ecrã mostra com dados verdadeiros, por papel: só 3 papéis têm passada autenticada clicada com vínculo real (§BU-8).
- Envio de notificações, SMTP, SMS ou WhatsApp: nada medido.
- A `v137` está gerada e gateada (`V137_BUNDLE_OK 24/0`) mas **não publicada**; nada neste documento descreve a v137 como ar.
