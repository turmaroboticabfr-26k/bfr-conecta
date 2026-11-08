# Criar Conta Supervisor - Passo a Passo Completo

## Visão Geral

Este guia cria a conta `supervisor.test2@gmail.com` com:
- ✅ Conta em `auth.users` (via Dashboard)
- ✅ Perfil em `profiles` com role `education_supervisor`
- ✅ Vínculos em `staff_schools` com 3 escolas sintéticas

---

## Passo 1: Criar Conta via Supabase Dashboard

### 1.1 Acessar o Dashboard
- URL: https://supabase.com/dashboard/
- Projeto: `yyzqoxlkcvqpessypfjo` (BFR Conecta)

### 1.2 Navegar para Authentication
1. Menu lateral esquerdo → **Authentication**
2. Aba → **Users**

### 1.3 Criar Novo Usuário
1. Clique em **"Add user"** (botão azul, canto superior direito)
2. Selecione **"Create new user"**

### 1.4 Preencher Dados
```
Email: supervisor.test2@gmail.com
Password: Supervisor123!
Auto Confirm User: ✅ (MARCAR ESTA OPÇÃO)
```

### 1.5 Criar e Copiar UID
1. Clique em **"Create user"**
2. A conta aparece na lista
3. **COPIE O User UID** (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - Exemplo: `b1caa975-5a6a-47e4-ae2c-d7f08f0fa8e3`
   - Você precisará dele no Passo 3

---

## Passo 2: Verificar Enum account_role

### 2.1 Abrir SQL Editor
1. Menu lateral → **SQL Editor**
2. Clique em **"New query"**

### 2.2 Verificar se o role existe
```sql
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'account_role'::regtype
  AND enumlabel = 'education_supervisor';
```

### 2.3 Se não existir, criar
```sql
ALTER TYPE account_role ADD VALUE 'education_supervisor';
```

---

## Passo 3: Executar Script SQL Completo

### 3.1 Copiar o script
- Arquivo: `sql/criar-conta-supervisor-completa.sql`
- Copie todo o conteúdo

### 3.2 Colar no SQL Editor
1. SQL Editor → **New query**
2. Cole o script completo

### 3.3 Executar passo a passo
- Execute cada bloco `[1]`, `[2]`, `[3]`, etc. separadamente
- Verifique o resultado de cada passo antes de continuar

### 3.4 Passos críticos

#### [1] Verificar conta em auth.users
```sql
SELECT id, email, role, aud, email_confirmed_at
FROM auth.users
WHERE email = 'supervisor.test2@gmail.com';
```
**Esperado**: 1 linha com os dados da conta criada no Passo 1

#### [4] Criar/atualizar perfil
```sql
BEGIN;

UPDATE profiles
SET role = 'education_supervisor', full_name = 'Supervisor Teste 2'
WHERE email = 'supervisor.test2@gmail.com';

INSERT INTO profiles (id, email, role, full_name)
SELECT id, email, 'education_supervisor', 'Supervisor Teste 2'
FROM auth.users
WHERE email = 'supervisor.test2@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'supervisor.test2@gmail.com');

COMMIT;
```

#### [6] Verificar escolas sintéticas
```sql
SELECT id, name, city, state
FROM sports_schools
WHERE name IN ('Escola Alpha', 'Escola Beta', 'Escola Gamma');
```
**Esperado**: 3 linhas

Se não existir, criar:
```sql
INSERT INTO sports_schools (name, city, state)
VALUES 
  ('Escola Alpha', 'São Paulo', 'SP'),
  ('Escola Beta', 'Rio de Janeiro', 'RJ'),
  ('Escola Gamma', 'Belo Horizonte', 'MG');
```

#### [7] Criar vínculos staff_schools
```sql
INSERT INTO staff_schools (staff_id, school_id)
SELECT p.id, s.id
FROM profiles p
CROSS JOIN sports_schools s
WHERE p.email = 'supervisor.test2@gmail.com'
  AND s.name IN ('Escola Alpha', 'Escola Beta', 'Escola Gamma')
  AND NOT EXISTS (
    SELECT 1 FROM staff_schools ss 
    WHERE ss.staff_id = p.id AND ss.school_id = s.id
  );
```

---

## Passo 4: Verificação Final

### 4.1 Verificar perfil
```sql
SELECT 
  p.id,
  p.email,
  p.role,
  p.full_name,
  COUNT(ss.id) as total_escolas
FROM profiles p
LEFT JOIN staff_schools ss ON ss.staff_id = p.id
WHERE p.email = 'supervisor.test2@gmail.com'
GROUP BY p.id, p.email, p.role, p.full_name;
```

**Esperado**:
```
id         | email                      | role                 | full_name        | total_escolas
-----------+----------------------------+----------------------+------------------+---------------
<uid>      | supervisor.test2@gmail.com | education_supervisor | Supervisor Teste 2 | 3
```

### 4.2 Verificar vínculos com detalhes
```sql
SELECT 
  ss.id,
  p.email,
  p.role,
  s.name as escola,
  s.city,
  s.state
FROM staff_schools ss
JOIN profiles p ON p.id = ss.staff_id
JOIN sports_schools s ON s.id = ss.school_id
WHERE p.email = 'supervisor.test2@gmail.com'
ORDER BY s.name;
```

**Esperado**: 3 linhas (Alpha, Beta, Gamma)

---

## Passo 5: Testar Login

### 5.1 Executar script de teste
```bash
node test-supervisor-login-client.mjs
```

### 5.2 Resultado esperado
```
=== Verificar Role do Supervisor ===

[1] Buscando perfil...
Perfil encontrado:
  ID: <uid>
  Email: supervisor.test2@gmail.com
  Role: education_supervisor
  Nome: Supervisor Teste 2

✅ Role correto: 'education_supervisor'

[2] Verificando vínculos com escolas...
✅ 3 vínculo(s) encontrado(s):
   - Escola Alpha
   - Escola Beta
   - Escola Gamma

=== Resumo ===
✅ Perfil: supervisor.test2@gmail.com
✅ Role: education_supervisor
✅ Vínculos: 3

Próximo passo: testar login
  node test-supervisor-login-client.mjs
```

### 5.3 Se o login falhar
- **Erro 401 "Invalid API key"**: Verificar a chave anon em `test-supervisor-login-client.mjs`
- **Erro 400 "Invalid login credentials"**: 
  - Verificar se a senha está correta: `Supervisor123!`
  - Verificar se o email foi confirmado no Dashboard (Passo 1.4)
  - **Limitação do GoTrue**: Contas criadas via SQL direto não funcionam (use Dashboard)

---

## Passo 6: Testar no Navegador (Browser Test)

### 6.1 Acessar o app
- URL: https://bfr-conecta.turmaroboticabfr.workers.dev

### 6.2 Fazer login
```
Email: supervisor.test2@gmail.com
Senha: Supervisor123!
```

### 6.3 Verificar a aba Supervisão
- Após login, o app deve redirecionar para a view Secretaria
- Navegar até a aba **"Supervisão Educacional"**
- Verificar se os cards de métricas aparecem (pendentes, em andamento, etc.)

---

## Troubleshooting

### Problema: Perfil não aparece após INSERT
**Causa**: Trigger de criação de perfil não está funcionando  
**Solução**: Verificar se existe o trigger `on_auth_user_created` na tabela `auth.users`

### Problema: Vínculos não são criados
**Causa**: Escolas sintéticas não existem  
**Solução**: Executar o INSERT de escolas (Passo 3.4, item [6])

### Problema: Login falha com "Invalid credentials"
**Causa**: GoTrue não reconhece contas criadas via SQL  
**Solução**: Criar a conta via Dashboard (Passo 1) com "Auto Confirm User" marcado

### Problema: Role não aparece no enum
**Causa**: `education_supervisor` não foi adicionado ao enum `account_role`  
**Solução**: Executar `ALTER TYPE account_role ADD VALUE 'education_supervisor';`

---

## Arquivos Relacionados

- `sql/criar-conta-supervisor-completa.sql` - Script SQL completo
- `test-supervisor-login-client.mjs` - Teste de login via API
- `verify-supervisor-role.mjs` - Verificação de role e vínculos
- `GUIA-ATUALIZAR-ROLE-SUPERVISOR.md` - Guia alternativo (apenas UPDATE)

---

## Checklist Final

- [ ] Conta criada via Dashboard (Passo 1)
- [ ] UID copiado e anotado
- [ ] Enum `education_supervisor` verificado (Passo 2)
- [ ] Perfil criado em `profiles` (Passo 3, item [4])
- [ ] Escolas sintéticas verificadas (Passo 3, item [6])
- [ ] Vínculos criados em `staff_schools` (Passo 3, item [7])
- [ ] Verificação final OK (Passo 4)
- [ ] Login via API funcionou (Passo 5)
- [ ] Login no navegador funcionou (Passo 6)
- [ ] Aba Supervisão Educacional visível (Passo 6.3)

---

## Limpeza (se necessário)

Para remover a conta criada:

```sql
BEGIN;

-- Remover vínculos
DELETE FROM staff_schools
WHERE staff_id = (SELECT id FROM profiles WHERE email = 'supervisor.test2@gmail.com');

-- Remover perfil
DELETE FROM profiles
WHERE email = 'supervisor.test2@gmail.com';

-- Remover conta auth (requer service_role ou Dashboard)
-- Dashboard → Authentication → Users → deletar supervisor.test2@gmail.com

COMMIT;
```
