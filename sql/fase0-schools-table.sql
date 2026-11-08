-- FASE 0 — Criação da tabela schools
-- Objetivo: tabela formal de escolas da rede municipal (separada de sports_schools)

BEGIN;

-- 1. Criar tabela schools
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address_line text,
  city text,
  state text,
  phase text CHECK (phase IN ('infantil', 'fundamental_i', 'fundamental_ii', 'medio', 'eja')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Criar índice para buscas por cidade e fase
CREATE INDEX IF NOT EXISTS idx_schools_city ON public.schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_phase ON public.schools(phase);
CREATE INDEX IF NOT EXISTS idx_schools_active ON public.schools(active);

-- 3. Popular com as 3 escolas sintéticas de sports_schools
INSERT INTO public.schools (id, name, code, city, state, phase, active, created_at, updated_at)
SELECT 
  id,
  name,
  'SME-' || SUBSTRING(md5(id::text) FROM 1 FOR 6) as code,
  COALESCE(city, 'São Paulo') as city,
  'SP' as state,
  'fundamental_i' as phase,
  true as active,
  created_at,
  updated_at
FROM public.sports_schools
ON CONFLICT (id) DO NOTHING;

-- 4. Criar função de updated_at
CREATE OR REPLACE FUNCTION public.schools_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Criar trigger de updated_at
DROP TRIGGER IF EXISTS schools_updated_at_trigger ON public.schools;
CREATE TRIGGER schools_updated_at_trigger
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.schools_updated_at();

-- 6. Revogar acesso de anon e authenticated (só service_role e postgres)
REVOKE ALL ON public.schools FROM anon, authenticated;
GRANT SELECT ON public.schools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO service_role;
GRANT ALL ON public.schools TO postgres;

-- 7. Habilitar RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 8. Conferir resultado
SELECT 
  'schools_created' as check_name,
  COUNT(*) as count
FROM public.schools
UNION ALL
SELECT 
  'schools_with_code',
  COUNT(*) FILTER (WHERE code IS NOT NULL)
FROM public.schools
UNION ALL
SELECT 
  'schools_active',
  COUNT(*) FILTER (WHERE active = true)
FROM public.schools;

COMMIT;
