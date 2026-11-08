-- FASE 0 — Adicionar papel education_supervisor ao enum account_role
-- Objetivo: criar o papel da Secretaria Municipal de Educação

BEGIN;

-- 1. Adicionar o novo valor ao enum
ALTER TYPE public.account_role ADD VALUE 'education_supervisor';

-- 2. Conferir o enum atualizado
SELECT enum_range(NULL::public.account_role) as roles;

COMMIT;
