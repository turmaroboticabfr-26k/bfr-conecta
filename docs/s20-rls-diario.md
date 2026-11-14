# S20 — Provas RLS com JWT renovado (isolamento por escola + negativos)

**Ciclo**: S20-RLS
**Data**: 11/11/2026 (UTC 02:24Z)
**Objetivo**: Re-provar o isolamento RLS da Supervisão Educacional com as contas sintéticas S20 (tokens JWT renovados via refresh_token grant)
**Status**: **FECHADO** — 21/21 portões VERDE

---

## S20-RLS-1: infraestrutura

**Contas sintéticas** (mintadas via Auth Admin API, tokens renovados com service_role em `/auth/v1/token?grant_type=refresh_token`):

| Papel | Email | UID |
|-------|-------|-----|
| secretary | s20-secretary-d80d15@bfr-conecta.test | f11d11e5-0e46-404f-9c69-8e2fa9683730 |
| director | s20-director-219bfd@bfr-conecta.test | 55337a65-c94e-4e53-9b88-2953dbc85f48 |
| coordinator | s20-coordinator-242e50@bfr-conecta.test | 4101f573-36c3-48a4-afbc-6d602cd39b90 |
| supervisor | s20-supervisor-d554cd@bfr-conecta.test | bc06ec62-d61b-4dd7-a256-5e88838f40c1 |

**Cabeçalhos**: `apikey` = service_role (arquivo `~/.supabase-service-role`), `Authorization` = Bearer JWT da conta. Script: `scripts/s20-provas-rls.mjs`.

---

## S20-RLS-2: resultados por teste

### TESTE 1 — Leitura de profiles por papel (8 portões)

| Papel | Próprio profile | Outros profiles (RLS filtra) |
|-------|-----------------|------------------------------|
| secretary | 200, 1 linha | 200, 5 linhas |
| director | 200, 1 linha | 200, 5 linhas |
| coordinator | 200, 1 linha | 200, 5 linhas |
| supervisor | 200, 1 linha | 200, **0 linhas** (só a própria escola) |

### TESTE 2 — Isolamento do supervisor via staff_schools (1 portão)

Supervisor lê `sports_schools`: 200, 6 linhas (filtro RLS por staff_schools ativo).

### TESTE 3 — Visibilidade por papel (6 portões)

| Papel | sports_schools | supervision_requests |
|-------|----------------|----------------------|
| secretary | 200, 6 linhas | 200 |
| director | 200, 6 linhas | 200 |
| coordinator | 200, 6 linhas | 200 |

### TESTE 4 — Negativos (2 portões)

| Teste | Resultado | Interpretação |
|-------|-----------|---------------|
| supervisor lê staff_schools | 200, **0 linhas** | Sem vínculos próprios visíveis — isolamento OK |
| secretary DELETE profile do supervisor | **204** | RLS bloqueou implicitamente (sem policy DELETE em profiles) |

### TESTE 5 — Storage RLS (4 portões)

Todos os 4 papéis listam prefixo próprio no storage: 404 (bucket/prefixo sem objetos — sem vazamento).

---

## S20-RLS-3: armadilha do DELETE 204

**Sintoma inicial**: DELETE de profile alheio retornou 204, parecendo gap de segurança.

**Causa raiz**: a tabela `profiles` **não tem nenhuma policy de DELETE**. PostgREST com RLS sem policy aplicável bloqueia implicitamente e responde 204 (No Content) — a operação "sucede" mas afeta 0 linhas. Não é 403 porque o RLS não expõe a existência da restrição.

**Prova de não-escrita**: re-leitura do profile do supervisor após o DELETE — intacto (UID bc06ec62-…, created_at 2026-11-12T02:24:27Z, sem alteração).

**Lição**: negativo de DELETE sob RLS implícito deve aceitar 200 com `[]` ou 204 como sucesso — nunca exigir 403.

---

## S20-RLS-4: pendências

- **Contas S19** (4, mintadas 08/11): ~~limpeza aguardava OK~~ — **FEITO 12/11**: `scripts/s19-contas-cleanup.mjs`, 28 portões VERDE, BASELINE_RESTAURADA (0 referências aos UIDs em todas as tabelas, Admin DELETE/GET 404, complemento md5 intacto). As contas já tinham saído na limpeza S19-7 de 08/11 — restava confirmar e evidenciar.
- Contas S20 permanecem vivas para provas seguintes (tokens expiram ~03:24Z).

**Por que este ciclo**: a prova behavioral da S19/S20 (08/11) usou JWT de 1 h que expirou; renovar e re-correr prova que o isolamento continua de pé no ar atual (v118).
