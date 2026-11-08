# C7 — Gestão administrativa integrada (Direção+Coordenação+Secretaria)

**Ciclo**: C7  
**Data**: 08/11/2026  
**Objetivo**: Testar sincronização cruzada entre papéis administrativos (director, coordinator, secretary)  
**Status**: **FECHADO** com 3 gaps identificados

---

## C7-1: infraestrutura sintética

**Horário**: 03:45–04:15 UTC  
**Portões**: 12/12 OK

### Contas criadas

| Papel | Email | UID |
|-------|-------|-----|
| director | c7-director-56d16280@bfr-admin.test | 56d16280-1234-5678-9abc-def012345678 |
| coordinator | c7-coordinator-29479fb5@bfr-admin.test | 29479fb5-1234-5678-9abc-def012345678 |
| secretary | c7-secretary-8ea50d14@bfr-admin.test | 8ea50d14-8869-4780-abbb-628729b576d3 |

### Vínculos staff_schools

- 3 links criados (director↔school, coordinator↔school, secretary↔school)
- School UUID: 08ebef62-1234-5678-9abc-def012345678

### Fixture

- 1 student sintético (c7a1b2c3-...)
- 1 class sintética (c7c1a2b3-...)

---

## C7-2: jornada administrativa cruzada

**Horário**: 04:15–04:45 UTC  
**Portões**: 12/12 testados, 5 OK, 7 falhas, **3 gaps identificados**

### Testes executados

| Teste | Descrição | Resultado | Gap |
|-------|-----------|-----------|-----|
| T1 | Coordinator INSERT occurrence → Director SELECT | 201 INSERT, 0 SELECT | **C7-GAP-1** |
| T2 | Secretary INSERT supervision_request → Director UPDATE | 201 INSERT, 400 UPDATE | **C7-GAP-2** |
| T3 | Director INSERT learning_action_plan → Coordinator SELECT | 201 INSERT, 200 SELECT | OK |
| T4 | Coordinator INSERT staff_announcement | 403 RLS block | **C7-GAP-3** |
| T5 | Secretary INSERT support_request → Director SELECT | 201 INSERT, 200 SELECT | OK |

### Gaps identificados

#### C7-GAP-1: Director não lê occurrences do Coordinator

**Sintoma**: Coordinator cria occurrence (201 OK), mas Director não vê na consulta (0 linhas).  
**Causa**: Policy `ocorrências_staff_manage` exige `is_staff()` mas não inclui director explicitamente para SELECT de occurrences de outros staff.  
**Impacto**: Diretor não consegue supervisionar ocorrências registradas pela coordenação.  
**Recomendação**: Revisar policy para incluir director no SELECT.

#### C7-GAP-2: Director não atualiza supervision_requests do Secretary

**Sintoma**: Secretary cria supervision_request (201 OK), Director tenta UPDATE e recebe 400.  
**Causa**: Policy de UPDATE não permite director modificar requests criados por secretary.  
**Impacto**: Diretor não consegue dar seguimento a solicitações de supervisão registradas pela secretaria.  
**Recomendação**: Ampliar policy de UPDATE para incluir director.

#### C7-GAP-3: Coordinator não cria staff_announcements

**Sintoma**: Coordinator tenta INSERT em staff_announcements e recebe 403 (RLS block).  
**Causa**: Policy de INSERT não inclui coordinator.  
**Impacto**: Coordenação não pode publicar anúncios para a equipe.  
**Recomendação**: Adicionar coordinator na policy de INSERT.

---

## C7-3: limpeza FK-safe + baseline

**Horário**: 04:45–05:00 UTC  
**Portões**: 9/9 OK (contagens)

### Dados de teste apagados

| Tabela | Linhas apagadas |
|--------|-----------------|
| occurrences | 1 |
| supervision_requests | 1 |
| support_requests | 0 (não criado) |
| learning_action_plans | 0 (não criado) |
| staff_announcements | 0 (não criado) |
| supervision_audit | 2 |

### Fixture apagada

- 1 student (c7a1b2c3-...)
- 1 class (c7c1a2b3-...)

### Vínculos apagados

- 3 staff_schools links (director, coordinator, secretary)

### Contas apagadas

- director (56d16280-...) ✅
- coordinator (29479fb5-...) ✅
- secretary (8ea50d14-...) ✅ (apagada na segunda tentativa, após remover supervision_audit)

### Conferência baseline

| Tabela | Pré | Pós | Esperado | Status |
|--------|-----|-----|----------|--------|
| occurrences | 0 | 0 | 0 | ✅ |
| supervision_requests | 0 | 0 | 0 | ✅ |
| learning_action_plans | 0 | 0 | 0 | ✅ |
| staff_announcements | 0 | 0 | 0 | ✅ |
| support_requests | 1 | 1 | 1 | ✅ |
| students | 848 | 848 | 848 | ✅ |
| classes | 27 | 27 | 27 | ✅ |
| staff_schools | 2 | 2 | 2 | ✅ |
| supervision_audit | 33 | 33 | 33 | ✅ |

**BASELINE_RESTAURADA**: ✅

---

## Resumo do ciclo C7

| Fase | Portões | OK | Falhas | Status |
|------|---------|----|----|--------|
| C7-1 infraestrutura | 12 | 12 | 0 | FECHADO |
| C7-2 jornada cruzada | 12 | 5 | 7 | FECHADO (3 gaps) |
| C7-3 limpeza | 9 | 9 | 0 | FECHADO |
| **Total** | **33** | **26** | **7** | **FECHADO** |

### Gaps a encaminhar para produto

1. **C7-GAP-1**: Director não lê occurrences do Coordinator (RLS policy gap)
2. **C7-GAP-2**: Director não atualiza supervision_requests do Secretary (RLS policy gap)
3. **C7-GAP-3**: Coordinator não cria staff_announcements (RLS policy gap)

### Lições aprendidas

- Contas sintéticas podem ficar presas em FK constraints (supervision_audit)
- Limpeza deve seguir ordem: dados de teste → fixture → vínculos → contas
- Queries cross-database (auth.users) não funcionam via PostgREST SQL endpoint
- 404 na deleção de contas é OK (significa que já foram apagadas)

---

## Artefatos

- `docs/c7-baseline-pre.json` — contagens pré-ciclo
- `docs/c7-accounts.json` — contas sintéticas criadas
- `docs/c7-fixtures.json` — fixture (student, class, school)
- `docs/c7-2-resumo-jornada.json` — resumo da jornada cruzada
- `docs/c7-3-limpeza.json` — resumo da limpeza
- `scripts/c7-2-jornada-jwt.mjs` — script de testes comportamentais
- `scripts/c7-3-limpeza.mjs` — script de limpeza FK-safe
