# Aplicação — escopo por aluno em leitura e recados

Data: 22/10/2026. Autorização: seleção explícita **"Aplicar SQL de escopo"**. Nada foi publicado.

## O que mudou (DDL)

Arquivo aplicado: `sql-candidata-escopo-leitura-mensagens.sql` (`node apply-sql.mjs … --apply`, **HTTP 201**).

1. Função `public.bfr_team_can_access_student(p_student_id uuid)`:
   - `coordinator`, `director`, `developer` → `true`;
   - `pedagogical` → `bfr_pedagogical_can_manage_student(p_student_id)`;
   - `aee` → aluno ativo em `aee_student_roster`;
   - demais → `false`.
   - `SECURITY DEFINER`, dona `postgres`, `STABLE`, `search_path=''`.
2. Policies substituídas:
   - `reading staff select` = `bfr_reading_staff() and bfr_team_can_access_student(student_id)`;
   - `reading staff insert` = `bfr_reading_editor() and …`;
   - `reading staff update` = `bfr_reading_editor() and …` (USING e WITH CHECK);
   - `messages_family_read` = remetente/destinatário **ou** `is_staff() and …`;
   - `student_messages_staff_manage` = `is_staff() and …` (USING e WITH CHECK).

## Provas

| Prova | Resultado |
|---|---|
| `sql-validacao-escopo-teste-funcao.sql` (rollback) | pedagogical `true/false/false`; coordinator/director/developer `true/true/true`; AEE roster `true`, fora `false`; secretary `false/false/false` |
| `sql-validacao-escopo-rls.sql` (rollback) | pedagogical: regra antiga `true`, `leituras_visiveis=0`, **`mensagens_visiveis=0`**; `anon` sem EXECUTE |
| `sql-validacao-escopo-leitura-linhas.sql` (rollback, 2 linhas sintéticas) | visível dentro `1` / fora `0`; UPDATE dentro `1` / fora `0`; INSERT fora **NEGADO**, dentro **PERMITIDO**; total no banco após rollback `0` |
| `sql-pos-aplicacao-escopo.sql` | 5 policies com `bfr_team_can_access_student`; função `postgres`/SECURITY DEFINER/`search_path=''`; ACL `postgres`, `authenticated`, `service_role`; `anon=false`; `public` fora; `reading_rows=0`, `message_rows=1` |
| `sql-pos-aplicacao-comportamento.sql` (rollback) | pedagogical `turma=true, fora=false, random=false, mensagens=0`; coordinator `true/true/true`; AEE `roster=true, fora=false`; secretary `false/false/false` |
| `sql-pos-aplicacao-ab-antes.sql` (rollback) | sob as policies antigas: pedagogical via **1** mensagem, de aluno **fora** da turma; `mensagens_do_aluno_da_turma=0` |

Mudança visível esperada: a única mensagem real da tabela (de aluno fora do escopo do professor pedagógico) deixa de aparecer para esse papel. É o efeito pretendido do estreitamento; nenhuma linha foi alterada.

## Reversão

`sql-reversao-escopo-leitura-mensagens.sql` recria as cinco policies originais e remove a função. Ordem: reverter policies primeiro, função por último. Não foi executada.

## Limites residuais

- `coordinator`, `director` e `developer` mantêm escopo amplo por decisão de produto registrada na candidata.
- `secretary` continua sem acesso a recados (comportamento anterior; `is_staff()` não inclui o papel).
- A prova foi feita na mesma sessão SQL com `request.jwt.claims`; a mesma medição dentro de uma sessão HTTP real do app segue **NÃO TESTADA** por falta de conta real de professor.
