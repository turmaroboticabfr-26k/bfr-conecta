-- FASE 0 — Funções RLS para supervisor educacional
-- Objetivo: criar funções de verificação de acesso para o papel education_supervisor

BEGIN;

-- 1. Função: verificar se o usuário é education_supervisor
CREATE OR REPLACE FUNCTION public.bfr_is_education_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT true FROM public.profiles 
     WHERE id = auth.uid() AND role = 'education_supervisor'::account_role),
    false
  );
$$;

-- 2. Função: verificar se supervisor pode acessar uma escola específica
CREATE OR REPLACE FUNCTION public.bfr_supervisor_can_access_school(school_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Supervisor acessa todas as escolas
    public.bfr_is_education_supervisor()
    OR
    -- Staff acessa apenas a escola onde tem vínculo
    EXISTS (
      SELECT 1 FROM public.staff_schools ss
      JOIN public.profiles p ON p.id = ss.profile_id
      WHERE p.id = auth.uid()
        AND ss.school_id = school_uuid
        AND ss.role = p.role::text
    );
$$;

-- 3. Função: retornar IDs das escolas acess-íveis ao usuário autenticado
CREATE OR REPLACE FUNCTION public.bfr_school_staff_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Supervisor: todas as escolas
      WHEN public.bfr_is_education_supervisor() THEN
        (SELECT array_agg(id) FROM public.schools WHERE active = true)
      -- Staff: apenas escolas com vínculo
      ELSE
        (SELECT array_agg(school_id) FROM public.staff_schools ss
         JOIN public.profiles p ON p.id = ss.profile_id
         WHERE p.id = auth.uid() AND ss.role = p.role::text)
    END;
$$;

-- 4. Configurar permissões das funções (revogar anon, conceder authenticated)
REVOKE ALL ON FUNCTION public.bfr_is_education_supervisor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bfr_is_education_supervisor() FROM anon;
GRANT EXECUTE ON FUNCTION public.bfr_is_education_supervisor() TO authenticated;

REVOKE ALL ON FUNCTION public.bfr_supervisor_can_access_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bfr_supervisor_can_access_school(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.bfr_supervisor_can_access_school(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.bfr_school_staff_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bfr_school_staff_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.bfr_school_staff_ids() TO authenticated;

-- 5. Conferir funções criadas
SELECT 
  'functions_created' as check_name,
  COUNT(*)::text as value
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN ('bfr_is_education_supervisor', 'bfr_supervisor_can_access_school', 'bfr_school_staff_ids')
UNION ALL
SELECT 'all_security_definer',
  COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN ('bfr_is_education_supervisor', 'bfr_supervisor_can_access_school', 'bfr_school_staff_ids')
  AND p.prosecdef = true;

COMMIT;
