-- ============================================================================
-- Atualizar role do supervisor em profiles
-- ============================================================================
-- Objetivo: Atualizar o role da conta supervisor para 'education_supervisor'
-- Conta: supervisor.test2@gmail.com
-- Data: 2026-11-07
-- ============================================================================

-- [1] Verificar estado atual ANTES da atualização
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM profiles
WHERE email = 'supervisor.test2@gmail.com';

-- [2] Verificar se o role 'education_supervisor' existe no enum
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'account_role'::regtype
  AND enumlabel = 'education_supervisor';

-- Se o role não existir no enum, criar:
-- ALTER TYPE account_role ADD VALUE 'education_supervisor';

-- [3] Atualizar o role (transação)
BEGIN;

UPDATE profiles
SET 
  role = 'education_supervisor',
  updated_at = NOW()
WHERE email = 'supervisor.test2@gmail.com'
  AND id IN (
    SELECT id FROM auth.users WHERE email = 'supervisor.test2@gmail.com'
  );

-- [4] Conferir o resultado
SELECT 
  id,
  email,
  role,
  full_name,
  updated_at
FROM profiles
WHERE email = 'supervisor.test2@gmail.com';

-- [5] Se OK, confirmar a transação
COMMIT;

-- Se algo errado, reverter:
-- ROLLBACK;

-- [6] Verificação final: contar perfis por role
SELECT 
  role,
  COUNT(*) as total
FROM profiles
GROUP BY role
ORDER BY total DESC;

-- [7] Verificar vínculos staff_schools (se existirem)
SELECT 
  ss.id,
  p.email,
  p.role,
  s.name as school_name,
  ss.created_at
FROM staff_schools ss
JOIN profiles p ON p.id = ss.staff_id
JOIN sports_schools s ON s.id = ss.school_id
WHERE p.email = 'supervisor.test2@gmail.com';
