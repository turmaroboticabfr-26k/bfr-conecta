-- ============================================================================
-- Criar conta supervisor completa (auth + profile + bindings)
-- ============================================================================
-- Objetivo: Criar a conta supervisor.test2@gmail.com com todos os vínculos
-- Data: 2026-11-08
-- 
-- IMPORTANTE: Este script assume que a conta JÁ FOI CRIADA em auth.users
-- via Dashboard ou Auth Admin API. Se não foi criada, veja instruções abaixo.
-- ============================================================================

-- ============================================================================
-- PASSO 0: Criar a conta em auth.users (via Dashboard ou API)
-- ============================================================================
-- Opção A: Via Supabase Dashboard
--   1. Acesse: https://supabase.com/dashboard/
--   2. Selecione o projeto: yyzqoxlkcvqpessypfjo
--   3. Vá em Authentication → Users
--   4. Clique em "Add user" → "Create new user"
--   5. Preencha:
--      - Email: supervisor.test2@gmail.com
--      - Password: Supervisor123!
--      - Auto Confirm User: ✅ (marcar)
--   6. Clique em "Create user"
--   7. Copie o User UID (algo como: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
--
-- Opção B: Via Auth Admin API (requer service_role key)
--   Ver: https://supabase.com/docs/reference/javascript/auth-admin-createuser
--
-- Após criar a conta, substitua USER_UID_ABAIXO pelo UID real e execute este script.
-- ============================================================================

-- [1] Verificar se a conta existe em auth.users
SELECT 
  id,
  email,
  role,
  aud,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'supervisor.test2@gmail.com';

-- Se não retornar nada, crie a conta via Dashboard (Passo 0) antes de continuar.

-- [2] Verificar se o role 'education_supervisor' existe no enum
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'account_role'::regtype
  AND enumlabel = 'education_supervisor';

-- Se não retornar nada, criar o role no enum:
-- ALTER TYPE account_role ADD VALUE 'education_supervisor';

-- [3] Verificar se já existe perfil na tabela profiles
SELECT 
  id,
  email,
  role,
  full_name
FROM profiles
WHERE email = 'supervisor.test2@gmail.com';

-- [4] Criar/atualizar o perfil na tabela profiles
-- Substitua USER_UID_ABAIXO pelo UID real da conta criada no Passo 0
BEGIN;

-- Tentar UPDATE primeiro (se o perfil já existe)
UPDATE profiles
SET 
  role = 'education_supervisor',
  full_name = 'Supervisor Teste 2'
WHERE email = 'supervisor.test2@gmail.com';

-- Se o UPDATE afetou 0 linhas, fazer INSERT
INSERT INTO profiles (id, email, role, full_name)
SELECT 
  id,
  email,
  'education_supervisor',
  'Supervisor Teste 2'
FROM auth.users
WHERE email = 'supervisor.test2@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE email = 'supervisor.test2@gmail.com'
  );

-- [5] Verificar o perfil criado/atualizado
SELECT 
  id,
  email,
  role,
  full_name
FROM profiles
WHERE email = 'supervisor.test2@gmail.com';

-- [6] Verificar escolas existentes (para criar vínculos)
SELECT 
  id,
  name,
  city,
  state
FROM sports_schools
WHERE name IN ('Escola Alpha', 'Escola Beta', 'Escola Gamma')
ORDER BY name;

-- Se não retornar 3 escolas, criar as escolas sintéticas:
-- INSERT INTO sports_schools (name, city, state)
-- VALUES 
--   ('Escola Alpha', 'São Paulo', 'SP'),
--   ('Escola Beta', 'Rio de Janeiro', 'RJ'),
--   ('Escola Gamma', 'Belo Horizonte', 'MG');

-- [7] Criar vínculos staff_schools (supervisor ↔ escolas)
-- Primeiro, verificar se já existem vínculos
SELECT 
  ss.id,
  p.email,
  p.role,
  s.name as school_name
FROM staff_schools ss
JOIN profiles p ON p.id = ss.staff_id
JOIN sports_schools s ON s.id = ss.school_id
WHERE p.email = 'supervisor.test2@gmail.com';

-- Inserir vínculos (um para cada escola)
INSERT INTO staff_schools (staff_id, school_id)
SELECT 
  p.id,
  s.id
FROM profiles p
CROSS JOIN sports_schools s
WHERE p.email = 'supervisor.test2@gmail.com'
  AND s.name IN ('Escola Alpha', 'Escola Beta', 'Escola Gamma')
  AND NOT EXISTS (
    SELECT 1 
    FROM staff_schools ss 
    WHERE ss.staff_id = p.id 
      AND ss.school_id = s.id
  );

-- [8] Verificar os vínculos criados
SELECT 
  ss.id,
  p.email,
  p.role,
  s.name as school_name,
  ss.created_at
FROM staff_schools ss
JOIN profiles p ON p.id = ss.staff_id
JOIN sports_schools s ON s.id = ss.school_id
WHERE p.email = 'supervisor.test2@gmail.com'
ORDER BY s.name;

-- [9] Contagem final por role
SELECT 
  role,
  COUNT(*) as total
FROM profiles
GROUP BY role
ORDER BY total DESC;

-- [10] Se tudo OK, confirmar a transação
COMMIT;

-- Se algo errado, reverter:
-- ROLLBACK;

-- ============================================================================
-- RESUMO: O que este script faz
-- ============================================================================
-- 1. Verifica se a conta existe em auth.users
-- 2. Verifica se o role 'education_supervisor' existe no enum
-- 3. Cria/atualiza o perfil na tabela profiles
-- 4. Verifica se as escolas sintéticas existem
-- 5. Cria vínculos em staff_schools (supervisor ↔ 3 escolas)
-- 6. Verifica o resultado final
-- ============================================================================

-- ============================================================================
-- PRÓXIMO PASSO: Testar o login
-- ============================================================================
-- Após executar este script, teste o login:
--   node test-supervisor-login-client.mjs
--
-- Esperado:
--   Login OK!
--   User: supervisor.test2@gmail.com
--   Role: education_supervisor
--   Session: presente
-- ============================================================================
