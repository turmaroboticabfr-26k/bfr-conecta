import { readFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const dryRunSQL = `
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

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_schools_city ON public.schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_phase ON public.schools(phase);
CREATE INDEX IF NOT EXISTS idx_schools_active ON public.schools(active);

-- 3. Popular com sports_schools
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

-- 4. Função updated_at
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

-- 5. Trigger
DROP TRIGGER IF EXISTS schools_updated_at_trigger ON public.schools;
CREATE TRIGGER schools_updated_at_trigger
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.schools_updated_at();

-- 6. Revogar e conceder
REVOKE ALL ON public.schools FROM anon, authenticated;
GRANT SELECT ON public.schools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO service_role;
GRANT ALL ON public.schools TO postgres;

-- 7. Habilitar RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 8. Conferir dentro da transação
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
FROM public.schools
UNION ALL
SELECT
  'trigger_exists',
  COUNT(*)::int
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'schools' AND NOT t.tgisinternal
UNION ALL
SELECT
  'function_exists',
  COUNT(*)::int
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'schools_updated_at';

-- 9. Rollback (não persiste nada)
ROLLBACK;
`;

async function runDryRun() {
  console.log('=== DRY-RUN: criando tabela schools em transação com ROLLBACK ===\n');
  
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: dryRunSQL })
    });
    
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      return false;
    }
    
    const data = await res.json();
    console.log('Resultado do dry-run:');
    console.log(JSON.stringify(data, null, 2));
    
    // Verificar se a tabela foi removida pelo rollback
    console.log('\n=== Verificando rollback ===');
    const checkRes = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: `SELECT to_regclass('public.schools') as table_exists` 
      })
    });
    
    const checkData = await checkRes.json();
    console.log('Tabela schools após rollback:', JSON.stringify(checkData));
    
    if (checkData[0]?.table_exists === null) {
      console.log('\n✓ ROLLBACK OK: tabela não persistiu');
      return true;
    } else {
      console.log('\n✗ ROLLBACK FALHOU: tabela ainda existe!');
      return false;
    }
    
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    return false;
  }
}

runDryRun().then(ok => {
  console.log(`\n=== DRY-RUN ${ok ? 'APROVADO' : 'REPROVADO'} ===`);
  process.exit(ok ? 0 : 1);
});
