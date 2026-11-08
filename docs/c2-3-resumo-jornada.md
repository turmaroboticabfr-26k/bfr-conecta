# C2-3 — Jornada Viva Transporte Escolar (resumo comportamental)

**Data:** 2026-11-08  
**Versão testada:** v118 (ar)  
**Abordagem:** JWT direto via PostgREST (sem UI CDP)

## Pernas executadas

### 1. Monitor (gap_1) — ✅ PROVADO
**Script:** `scripts/c2-jornada-monitor-jwt.mjs`  
**Resultado:** `docs/c2-jornada-monitor-jwt.json`

- INSERT route_incidents com JWT do monitor → 201 (RLS OK)
- notification_status = 'pending_guardian' (default, não notifica)
- ZERO student_messages criadas (responsável nunca recebe)

**Conclusão:** gap_1 comportamental PROVADO — monitor cria ocorrência de percurso, mas o sistema não notifica o responsável (notification_status fica 'pending_guardian' e nenhuma student_message é criada).

### 2. Parent (gap_2) — ✅ PROVADO
**Script:** `scripts/c2-jornada-parent-jwt.mjs`  
**Resultado:** `docs/c2-jornada-parent-jwt.json`

- GET route_incidents com JWT do parent → 200 (vê 1 ocorrência)
- notification_status = 'pending_guardian' (confirma que não foi notificado)
- GET student_messages com JWT do parent → 200 (vê 0 mensagens)
- Confirmação no banco: 1 route_incidents, 0 student_messages

**Conclusão:** gap_2 comportamental PROVADO — responsável vê a ocorrência de percurso (se tiver acesso direto à tabela), mas não recebe notificação (ZERO student_messages).

### 3. Gatekeeper (gap_3) — ⚠️ RLS BLOQUEIA
**Script:** `scripts/c2-jornada-gatekeeper-jwt.mjs`  
**Resultado:** `docs/c2-jornada-gatekeeper-jwt.json`

- INSERT gate_checkins ENTRADA com JWT do gatekeeper → 403 (RLS bloqueia)
- INSERT gate_checkins SAÍDA com JWT do gatekeeper → 403 (RLS bloqueia)
- ZERO gate_checkins criados

**Conclusão:** gap_3 comportamental PROVADO — porteiro NÃO consegue registrar entrada/saída via JWT (RLS bloqueia). Isso é ou bien um gap de permissão (policies não concedem INSERT ao gatekeeper) ou design intencional (registro só via UI com contexto adicional).

## Pernas não executadas

### 4. Horários modal
**Status:** Pendente  
**Objetivo:** Verificar se o modal de horários funciona corretamente para todos os papéis.

### 5. Testes negativos
**Status:** Pendente  
**Objetivo:** Verificar isolamento RLS (monitor A não vê dados do monitor B, parent A não vê dados do parent B, etc.).

## Resumo de gaps comportamentais

| Gap | Descrição | Status | Evidência |
|-----|-----------|--------|-----------|
| gap_1 | Monitor cria route_incidents, mas responsável não é notificado | ✅ PROVADO | notification_status='pending_guardian', 0 student_messages |
| gap_2 | Responsável vê ocorrência, mas não recebe notificação | ✅ PROVADO | 1 route_incident visível, 0 student_messages |
| gap_3 | Porteiro não consegue registrar entrada/saída via JWT | ⚠️ PROVADO | RLS bloqueia INSERT (403) |

## Próximos passos

1. C2-4: limpeza FK-safe + baseline restaurada
2. C2-5: diário + relatório + memória + fechar #1076
3. Decisão de produto: gap_3 é defeito ou design?
