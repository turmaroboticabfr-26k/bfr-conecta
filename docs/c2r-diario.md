# Diário C2-R — Transporte escolar: correção do trigger + defeito de policies (2026-11-08 → 2026-11-11)

**Ciclo:** continuação do C2 (gap_1, gap_2, gap_3 medidos 08/11 contra a v118)
**Abordagem:** DDL com candidata + dry-run transacional; prova comportamental por JWT real
**Versão do front na medição:** v118 (ar)

## 1. O que estava em causa (C2, 08/11)

| gap | perna | veredicto |
| --- | --- | --- |
| gap_1 | monitor registra ocorrência → responsável notificado | produtor inativo: `route_incidents.notification_status` ficava `pending_guardian` e nenhuma mensagem nascia |
| gap_2 | responsável vê a mensagem pela Home | dependia do gap_1 |
| gap_3 | porteiro registra entrada/saída | **design**: sem policy de escrita em `gate_checkins`; o caminho sancionado é a RPC `register_gate_checkin` |

## 2. gap_1/gap_2 — APLICADO E PROVADO

- Candidata + dry-run + aplicador: `sql/c2r-notificacao-candidate.sql` (reversão: `sql/c2r-notificacao-rollback.sql`), `scripts/c2r-dryrun.mjs`, `scripts/c2r-apply.mjs` (**17/17 portões**, verde 08/11).
- Gatilho vivo hoje (recon 11/11, `docs/c2r-recon.json` → `triggers_transporte`): `route_incidents.trg_route_incidents_notify_guardian`.
- **Prova comportamental por JWT RODADA COM O INSTRUMENTO CORRIGIDO** — `scripts/c2r-jornada.mjs` → `docs/c2r-jornada.json` (`em 2026-11-12T01:24:34Z`, md5 `4c6de4f8bdcd56e4ce3bb57166af79f1`): **47 portões, 1 falha**, e a única falha é a perna do gap_3 (§3), que não é do trigger.
- POST `route_incidents` como `monitor` (JWT real) → **201**; a linha lida de volta por SQL traz `notification_status=sent` e `notified_at` preenchido, enquanto o corpo do `RETURNING` devolve `pending_guardian`/`null` (registrado em `route_incident_returning` — é a assinatura do defeito de instrumento da seção 2).
- Nasce **1** linha em `student_messages` do aluno, `category=general`, `recipient_id` = responsável, `sender_id` = monitor, corpo no formato do fluxo legado com a descrição.
- `parent` GET `student_messages` → **200** e vê a mensagem com `recipient_id` = o próprio uuid.
- Controle negativo: ocorrência que já nasce `sent` **não** duplica (`student_messages` continua 1; lida de volta permanece `sent` sem `notified_at`, ou seja o trigger não agiu).
- RPC `register_gate_checkin` → **200** com `checkin_id`, `direction=entry`, `entry_status=allowed`.
- Limpeza FK-safe + **`BASELINE_RESTAURADA` por contagem E md5 nas 4 tabelas** (`route_incidents` 0/null, `student_messages` 1/`d87bebaa…`, `gate_checkins` 193/`f8a7bcaa…`, `gate_entry_alerts` 1/`d5240a17…`) + **0 contas sintéticas vivas**.

### Correção de instrumento (11/11) e re-conferência (11/12)
Os dois portões que afirmavam `notification_status=sent`/`notified_at` **liam o corpo da resposta do PostgREST**. Numa `INSERT` com trigger AFTER, o `RETURNING` devolve a tupla **pré-trigger** — o portão era inerte, não a escrita. Passaram a ler a linha de volta por SQL (`scripts/c2r-jornada.mjs` passos [3] e [5]); o valor cru do `RETURNING` fica registrado como `route_incident_returning` para auditoria.
**Foto do que a versão inertes dava:** a corrida anterior (`docs/c2r-jornada.json` de 2026-11-12T00:27:43Z, sobrescrita pela re-conferência) acusava `resposta com notification_status=sent (trigger) | dado="pending_guardian" | esperado="sent"` e `resposta com notified_at preenchido | dado=false | esperado=true` — duas falhas que eram do instrumento, não do banco. Re-rodada a 2026-11-12T01:24:34Z com o instrumento corrigido: **as duas ficam verdes e a única falha restante é a do gap_3**. Não há mais nenhuma alegação comportamental desta seção apoiada em corrida antiga.

## 3. gap_3 — design mantido, defeito que mascarava RESOLVIDO

- Recon 11/11: `gate_checkins` tem **zero** policies de escrita (`gate_checkins_policies_escrita: []`) e quatro de leitura.
- O POST direto do porteiro devolvia **500 / SQLSTATE 42P17**, não o 403 esperado — o defeito da seção 4 mascarava o desenho.
- **FECHADO 11/12** pela aplicação de `sql/c2r-42p17-candidate.sql` (§7): o portão agora dá **403 / 42501 insufficient_privilege** (design mantido, sem nenhuma mudança de DDL em `gate_checkins`). Sonda P3 em `scripts/c2r-probe-42p17.mjs` → VERDE com `esperaErro='42501'` (`docs/c2r-probe-42p17.json` de `2026-11-12T01:43:15Z`).
- `rpc/register_gate_checkin` provado **200** com o mesmo JWT (verde na corrida de 11/12) — o caminho sancionado continua intacto.
- **Leitura final:** o gap_3 nunca foi defeito; era desenho. O que havia era um defeito (42P17) que fazia o 403 chegar como 500. Resolvido o defeito, o desenho apareceu.

## 4. Defeito novo: SQLSTATE 42P17 — ciclo de policies (achado 11/11)

**Sondas vivas 11/11** (`scripts/c2r-probe-42p17.mjs` → `docs/c2r-probe-42p17.json`; cada sonda numa transação com `rollback`, só-leitura):

| sonda | resultado |
| --- | --- |
| P1 `select id, role from profiles where id = auth.uid()` | **42P17** infinite recursion in policy for relation "profiles" |
| P2 `select id from profiles where id <> auth.uid()` | **42P17** profiles |
| P3 INSERT direto em `gate_checkins` | **42P17** profiles |
| P4 `select * from staff_schools` | **42P17** staff_schools |
| P5 `select * from guardian_students` | VERDE |
| P6 `select * from gate_badges` | **42P17** profiles |

Ou seja: **todo plano que toque as policies de `profiles` aborta** para o papel autenticado — incluindo a primeira query do boot do app.

**Causa.** O PostgreSQL expande as policies das RTEs que aparecem dentro do qual de uma policy. O grafo `policy de R → RTE de R'` tem ciclos:
`profiles_read → staff_schools → profiles` e `profiles_read → students → profiles`.
As arestas entraram com o **P2-1** (08/11, escopo por escola em `profiles_read`) e com o **Achado 1 da S16** (06–07/11, 6 policies de `staff_schools` que citam `profiles`).

**Censo do ciclo (7 policies):** `profiles.profiles_read` + `staff_schools` {developer_read, developer_insert, developer_update, developer_delete, own_insert, own_read}. Fonte: `docs/c2r-policies-ciclo.json`.
`staff_schools_own_read` é `(profile_id = auth.uid())` — não tem RTE de `profiles`, por isso a candidata não a toca.

**Observação que muda a leitura do P2-1:** `profiles` tem 6 policies — **4 de SELECT** (`director_dashboard_read_profiles`, `profiles_chat_staff_directory_read`, `profiles_hide_test_accounts`, `profiles_read`) e **2 de UPDATE** (`profiles_staff_update` = `is_developer()`, `profiles_update_self` = `id = auth.uid()`); fonte `docs/c2r-policies-profiles.json`. Como as policies SELECT são OR-ed, a `profiles_hide_test_accounts` — `(id = auth.uid()) OR (email NOT LIKE '%@bfr-conecta.test' AND email NOT LIKE 'bfr.qa.email.%')` — é permissiva para **toda conta real**, e por isso o estreitamento por escola do P2-1 dentro de `profiles_read` **nunca restringiu** a visibilidade de `profiles` no ar. O efeito de escopo tem de ser provado pelo oráculo booleano (`bfr_profile_in_my_schools`), não por contagem de linhas visíveis.

## 5. Candidata 42P17 v2 + reversão

- `sql/c2r-42p17-candidate.sql`: corta **todas** as arestas que entram em `profiles`/`staff_schools` a partir de `profiles_read`, pondo o escopo por escola dentro de `public.bfr_profile_in_my_schools(uuid)` — função `security definer`, `set search_path = public, pg_temp`, dono `postgres`, `revoke … from public, anon, authenticated` + `grant … to authenticated, service_role`. Mesmo padrão da casa (`is_staff()`, `is_developer()`, `current_role()`). Semântica do P2-1 preservada: (c.1) staff da mesma escola, (c.2) aluno da escola do staff, (c.3) responsável de aluno da escola do staff, developer transversal, dono vê-se sempre.
- A v1 da candidata cortava só a aresta `staff_schools → profiles`; as branches que chamam `students` mantinham o ciclo. V2 corta as duas.
- `sql/c2r-42p17-rollback.sql`: restaura o deparse vivo das 7 policies e dropa a função. Não sobrescreve nada do vivo.

## 6. Dry-run transacional — 32 portões / 0 falhas (11/11)

`scripts/c2r-42p17-dryrun.mjs` → `docs/c2r-42p17-dryrun.json`. Uma chamada HTTP = uma transação: snapshot do deparse vivo → fixture → sondas **antes** (controle do defeito) → candidata → sondas **depois** → oráculo → reversão → snapshot comparado → `rollback` total. Uma segunda chamada fresca prova que nada sobreviveu.

- `md5_antes == md5_vivo == 2 b 2 f 0 b c 6 6 5 e b 1 7 d 9 2 6 6 7 b 7 0 4 b 7 d 9 b f 2 e`
- `md5_rb  == md5_antes` — a reversão reproduz o texto vivo **byte a byte**
- `md5_cand == 9 0 b 8 e 4 3 c c a 3 1 3 a 4 c 7 c d f 3 d c 0 b c b 0 b 8 f 4` (≠ antes: a candidata mexeu)
- controle: 42P17 presente na rodada `antes`, **zero** na rodada `cand`; nenhum erro além de 42P17/42501
- INSERT direto em `gate_checkins` passa a dar **42501 insufficient_privilege** (o 403 de design, antes mascarado)
- 9 oráculos verdes: staff da Alpha vê staff da própria escola e o perfil do aluno/responsável da escola; **não** vê staff da Beta nem developer sem vínculo; staff da Beta não vê aluno da Alpha; `is_developer()` false para staff, true para developer
- função criada pela candidata e removida pela reversão
- pós-chamada: profiles 17, staff_schools 2, students 848, classes 27, guardian_students 1, gate_checkins 193, route_incidents 0, student_messages 1, gate_entry_alerts 1, contas_vivas 0, `fn_oraculo` 0, md5 do deparse inalterado

### Armadilha de fixture encontrada (11/11)
Há **duas** tabelas de escola: `classes.school_id`/`students.school_id` → `public.schools`, enquanto `staff_schools.school_id` → `public.sports_schools`. Só três ids existem nas duas (Alpha `08ebef62…`, Beta `0f51bc67…`, Gamma `f4ab6309…`). Usar um id só de um lado dá **23503**. A fixture agora usa os compartilhados e um portão prévio (só-leitura) exige que os dois ids constem nas duas tabelas.

## 7. APLICADO — 11/12 (`scripts/c2r-42p17-apply.mjs --apply`)

`sql/c2r-42p17-candidate.sql` aplicada com OK explícito. Evidência em `docs/c2r-42p17-apply.json`.

- **Preflight:** `md5_vivo == md5_antes == 2 b 2 f 0 b c 6 6 5 e b 1 7 d 9 2 6 6 7 b 7 0 4 b 7 d 9 b f 2 e`, 7 policies, função `bfr_profile_in_my_schools` ausente do catálogo (nada aplicado antes).
- **Aplicação:** HTTP 201, uma chamada, transação implícita.
- **Pós-estado:** `md5_vivo == md5_cand == 9 0 b 8 e 4 3 c c a 3 1 3 a 4 c 7 c d f 3 d c 0 b c b 0 b 8 f 4`. Função criada: dono `postgres`, `prosecdef=true`, `publico_executa=0`, ACL `{postgres=X, service_role=X, authenticated=X}` (sem `anon`, sem PUBLIC). 7 policies, todas com papel `authenticated`, letras `r/d/a/w` conforme o catálogo.
- **Dados intactos:** profiles 17, staff_schools 2, students 848, guardian_students 1 — idêntico antes/depois.
- **Sondas 42P17:** `scripts/c2r-probe-42p17.mjs` rerodada → **6/6 VERDE** (P3 agora espera 42501, o 403 de design; `docs/c2r-probe-42p17.json` de `2026-11-12T01:43:15Z`).
- **Jornada comportamental:** `scripts/c2r-jornada.mjs` → **`C2R_JORNADA_OK` 47/0** (limpeza FK-safe + `BASELINE_RESTAURADA` por contagem E md5 nas 4 tabelas, 0 contas vivas). O gap_3 virou VERDE: `INSERT direto gate_checkins → 403 (design mantido)`.
- **Reversão pronta:** `sql/c2r-42p17-rollback.sql` (provada byte a byte no dry-run de 11/11; o deparse vivo agora é `md5_cand`, não mais `md5_antes`).

## 8. Artefactos

`docs/c2r-recon.json`, `docs/c2r-policies-ciclo.json`, `docs/c2r-policies-profiles.json`, `docs/c2r-schema-fixture.json`, `docs/c2r-probe-42p17.json`, `docs/c2r-42p17-dryrun.json`, `docs/c2r-42p17-apply.json`, `docs/c2r-jornada.json`, `docs/c2r-apply.json`
`sql/c2r-notificacao-candidate.sql`, `sql/c2r-notificacao-rollback.sql`, `sql/c2r-42p17-candidate.sql`, `sql/c2r-42p17-rollback.sql`
`scripts/c2r-recon.mjs`, `c2r-apply.mjs`, `c2r-dryrun.mjs`, `c2r-jornada.mjs`, `c2r-probe-42p17.mjs`, `c2r-schema-fixture.mjs`, `c2r-check-cols.mjs`, `c2r-fk-schools.mjs`, `c2r-42p17-dryrun.mjs`, `c2r-dryrun-confere.mjs`, `scripts/c2r-diario-confere.mjs`, `scripts/c2r-vivo-confere.mjs`, `scripts/c2r-42p17-apply.mjs`

**Portão desta seção:** `node scripts/c2r-diario-confere.mjs` varre a prosa e exige que todo caminho `sql/`, `scripts/` ou `docs/` citado aqui exista no disco. Última corrida: 11/12, `caminhos citados: 20`, `C2R_DIARIO_CAMINHOS_OK`.
**Portão anti-deriva (só-leitura, corre ANTES de aplicar):** `node scripts/c2r-vivo-confere.mjs` → `C2R_VIVO_OK`. **Depois da aplicação de 11/12**, este portão já não vale no estado pré (a candidata foi aplicada); o pós-estado é `md5_cand` + função presente.
