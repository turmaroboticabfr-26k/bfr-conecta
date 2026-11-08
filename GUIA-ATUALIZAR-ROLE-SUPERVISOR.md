# Atualizar Role do Supervisor - Guia de Execução

## Contexto
Atualizar o role da conta `supervisor.test2@gmail.com` para `education_supervisor` no banco Supabase.

## Opções de Execução

### Opção A: Via SQL Editor (Dashboard Supabase) ⭐ RECOMENDADO

1. Acesse: https://supabase.com/dashboard/
2. Selecione o projeto: `yyzqoxlkcvqpessypfjo`
3. Vá em **SQL Editor** (menu lateral)
4. Copie e cole o conteúdo de `sql/update-supervisor-role.sql`
5. Execute passo a passo (cada bloco [1], [2], [3], etc.)
6. Verifique o resultado no passo [4]
7. Se OK, confirme com `COMMIT;` (passo [5])

**Vantagens**: Visual, seguro, com rollback manual  
**Desvantagens**: Requer acesso ao Dashboard

---

### Opção B: Via API (Node.js com service_role key)

1. Obtenha a **service_role key**:
   - Dashboard → Settings → API → Project API keys → service_role key
   - ⚠️ **NUNCA** commite essa chave

2. Configure a variável de ambiente:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
   ```

3. Execute o script:
   ```bash
   node update-supervisor-role-via-api.mjs
   ```

**Vantagens**: Automatizado, reutilizável  
**Desvantagens**: Requer service_role key (alto privilégio)

---

### Opção C: Via psql (linha de comando)

Se tiver acesso direto ao PostgreSQL:

```bash
psql "postgresql://postgres:[PASSWORD]@db.yyzqoxlkcvqpessypfjo.supabase.co:5432/postgres" -f sql/update-supervisor-role.sql
```

**Vantagens**: Direto, sem intermediários  
**Desvantagens**: Requer credenciais do banco

---

## Rollback (se algo der errado)

### Via SQL Editor:
1. Copie o conteúdo de `sql/rollback-supervisor-role.sql`
2. Ajuste o role anterior (linha comentada)
3. Execute

### Via API:
```bash
# Adicionar no script update-supervisor-role-via-api.mjs:
const PREVIOUS_ROLE = 'coordinator'; // AJUSTAR conforme necessário
```

---

## Verificação Pós-Atualização

Após executar, verifique:

```sql
-- 1. Role atualizado
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'supervisor.test2@gmail.com';

-- 2. Vínculos com escolas
SELECT 
  p.email,
  p.role,
  s.name as school_name
FROM staff_schools ss
JOIN profiles p ON p.id = ss.staff_id
JOIN sports_schools s ON s.id = ss.school_id
WHERE p.email = 'supervisor.test2@gmail.com';

-- 3. Contagem por role
SELECT role, COUNT(*) as total
FROM profiles
GROUP BY role
ORDER BY total DESC;
```

---

## Teste de Login

Após atualizar o role, teste o login:

```bash
node test-supervisor-login-client.mjs
```

Esperado:
```
Login OK!
User: supervisor.test2@gmail.com
Role: education_supervisor
Session: presente
```

---

## Arquivos Relacionados

- `sql/update-supervisor-role.sql` - Script SQL principal
- `sql/rollback-supervisor-role.sql` - Script de rollback
- `update-supervisor-role-via-api.mjs` - Script Node.js via API
- `test-supervisor-login-client.mjs` - Teste de login após atualização

---

## Notas Importantes

1. **Enum account_role**: O role `education_supervisor` deve existir no enum. Se não existir:
   ```sql
   ALTER TYPE account_role ADD VALUE 'education_supervisor';
   ```

2. **Transação**: O UPDATE está dentro de uma transação (`BEGIN`/`COMMIT`). Se algo falhar, execute `ROLLBACK;`

3. **service_role key**: Tem acesso total ao banco (bypassa RLS). Use com cuidado.

4. **Browser test**: Mesmo com o role atualizado, o login pode falhar se a conta foi criada via SQL direto (limitação do GoTrue). Nesse caso, use a Opção B (Auth Admin API).
