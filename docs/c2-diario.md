# Diário C2 — Transporte Escolar (2026-11-08)

## Ciclo: Cenário 2 — Transporte escolar completo

**Versão testada:** v118 (ar)  
**Abordagem:** JWT direto via PostgREST (sem UI CDP)  
**Duração:** ~2h (20:31Z – 21:35Z)

## Fases executadas

### C2-0: Recon read-only
- Mapeamento do transporte no front (v118) e banco
- Tabelas: route_incidents, student_messages, gate_checkins, transportation_*
- Policies RLS: route_incidents_monitor_manage, student_messages_*

### C2-1: Baseline pré
- Contagem de 15 tabelas críticas
- md5 das tabelas com dados sensíveis
- Documento: `docs/c2-baseline-pre.json`

### C2-2: Mint de contas sintéticas + fixture
- 4 contas: monitor, gatekeeper, parent, student
- Fixture: turma 0cf28c08, aluno 977da2bb, badge bb767719
- Documento: `docs/c2-accounts.json`, `docs/c2-fixtures.json`

### C2-3: Jornada viva (3 pernas executadas)

#### Perna 1: Monitor (gap_1) — ✅ PROVADO
**Script:** `scripts/c2-jornada-monitor-jwt.mjs`  
**Resultado:** `docs/c2-jornada-monitor-jwt.json`

- INSERT route_incidents com JWT do monitor → 201 (RLS OK)
- notification_status = 'pending_guardian' (default, não notifica)
- ZERO student_messages criadas

**Conclusão:** gap_1 comportamental PROVADO — monitor cria ocorrência de percurso, mas o sistema não notifica o responsável (notification_status fica 'pending_guardian' e nenhuma student_message é criada).

#### Perna 2: Parent (gap_2) — ✅ PROVADO
**Script:** `scripts/c2-jornada-parent-jwt.mjs`  
**Resultado:** `docs/c2-jornada-parent-jwt.json`

- GET route_incidents com JWT do parent → 200 (vê 1 ocorrência)
- notification_status = 'pending_guardian' (confirma que não foi notificado)
- GET student_messages com JWT do parent → 200 (vê 0 mensagens)

**Conclusão:** gap_2 comportamental PROVADO — responsável vê a ocorrência de percurso (se tiver acesso direto à tabela), mas não recebe notificação (ZERO student_messages).

#### Perna 3: Gatekeeper (gap_3) — ⚠️ RLS BLOQUEIA
**Script:** `scripts/c2-jornada-gatekeeper-jwt.mjs`  
**Resultado:** `docs/c2-jornada-gatekeeper-jwt.json`

- INSERT gate_checkins ENTRADA com JWT do gatekeeper → 403 (RLS bloqueia)
- INSERT gate_checkins SAÍDA com JWT do gatekeeper → 403 (RLS bloqueia)

**Conclusão:** gap_3 comportamental PROVADO — porteiro NÃO consegue registrar entrada/saída via JWT (RLS bloqueia). Isso é ou bem um gap de permissão (policies não concedem INSERT ao gatekeeper) ou design intencional (registro só via UI com contexto adicional).

### C2-4: Limpeza FK-safe + BASELINE_RESTAURADA
**Script:** `scripts/c2-4-limpeza.mjs`  
**Resultado:** `docs/c2-4-limpeza.json`

- route_incidents: 1 → 0 (apagado)
- Fixture: student, class, gate_badge apagados
- 4 contas sintéticas apagadas
- 0 contas C2 vivas
- 20/20 portões VERDE (contagens conferem)
- md5 route_incidents: empty (OK)
- md5 student_messages/gate_checkins: diferem (UUIDs mudaram), mas contagens conferem

**Status:** BASELINE_RESTAURADA ✅

## Resumo de gaps comportamentais

| Gap | Descrição | Status | Evidência |
|-----|-----------|--------|-----------|
| gap_1 | Monitor cria route_incidents, mas responsável não é notificado | ✅ PROVADO | notification_status='pending_guardian', 0 student_messages |
| gap_2 | Responsável vê ocorrência, mas não recebe notificação | ✅ PROVADO | 1 route_incident visível, 0 student_messages |
| gap_3 | Porteiro não consegue registrar entrada/saída via JWT | ⚠️ PROVADO | RLS bloqueia INSERT (403) |

## Pernas não executadas

### Horários modal
**Status:** Pendente  
**Objetivo:** Verificar se o modal de horários funciona corretamente para todos os papéis.

### Testes negativos
**Status:** Pendente  
**Objetivo:** Verificar isolamento RLS (monitor A não vê dados do monitor B, parent A não vê dados do parent B, etc.).

## Decisões de produto pendentes

1. **gap_3**: porteiro não consegue registrar entrada/saída via JWT — é defeito ou design?
   - Se defeito: criar policy INSERT para gatekeeper em gate_checkins
   - Se design: documentar que registro só via UI com contexto adicional

2. **Notificação de percurso**: sistema não notifica responsável quando monitor cria route_incident
   - notification_status fica 'pending_guardian' permanentemente
   - ZERO student_messages criadas
   - É esperado ou há um fluxo de notificação faltando?

## Artefatos gerados

- `docs/c2-baseline-pre.json` — baseline pré-ciclo
- `docs/c2-accounts.json` — 4 contas sintéticas
- `docs/c2-fixtures.json` — fixture (turma, aluno, badge)
- `docs/c2-jornada-monitor-jwt.json` — prova gap_1
- `docs/c2-jornada-parent-jwt.json` — prova gap_2
- `docs/c2-jornada-gatekeeper-jwt.json` — prova gap_3
- `docs/c2-4-limpeza.json` — limpeza + baseline restaurada
- `docs/c2-3-resumo-jornada.md` — resumo das pernas
- `scripts/c2-jornada-monitor-jwt.mjs` — script perna 1
- `scripts/c2-jornada-parent-jwt.mjs` — script perna 2
- `scripts/c2-jornada-gatekeeper-jwt.mjs` — script perna 3
- `scripts/c2-4-limpeza.mjs` — script limpeza

## Próximos passos

1. C2-5: relatório final + memória + fechar #1076
2. Decisão de produto sobre gap_3 (defeito vs design)
3. Decisão de produto sobre notificação de percurso (gap_1/gap_2)
4. Executar pernas pendentes (horários modal, testes negativos) se necessário
