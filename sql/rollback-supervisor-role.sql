-- ============================================================================
-- Rollback: Reverter role do supervisor para valor anterior
-- ============================================================================
-- Objetivo: Reverter a atualização do role caso haja problemas
-- Data: 2026-11-07
-- ============================================================================

-- [1] Verificar estado atual
SELECT 
  id,
  email,
  role,
  full_name,
  updated_at
FROM profiles
WHERE email = 'supervisor.test2@gmail.com';

-- [2] Reverter para role anterior (ajustar conforme necessário)
-- Opção A: Voltar para 'coordinator' (se era o role anterior)
BEGIN;

UPDATE profiles
SET 
  role = 'coordinator',  -- AJUSTAR: colocar o role anterior correto
  updated_at = NOW()
WHERE email = 'supervisor.test2@gmail.com';

-- [3] Conferir o resultado
SELECT 
  id,
  email,
  role,
  full_name,
  updated_at
FROM profiles
WHERE email = 'supervisor.test2@gmail.com';

-- [4] Se OK, confirmar
COMMIT;

-- Se algo errado, reverter:
-- ROLLBACK;

-- ============================================================================
-- Opção B: Voltar para outro role (descomentar e ajustar)
-- ============================================================================
-- BEGIN;
-- 
-- UPDATE profiles
-- SET 
--   role = 'developer',  -- AJUSTAR conforme necessário
--   updated_at = NOW()
-- WHERE email = 'supervisor.test2@gmail.com';
-- 
-- COMMIT;
