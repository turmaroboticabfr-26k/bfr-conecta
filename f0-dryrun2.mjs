import { readFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const dryRunSQL = `
BEGIN;

-- 1. Adicionar coluna school_id em students
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS school_id uuid;

-- 2. FK
ALTER TABLE public.students
  ADD CONSTRAINT fk_students_school 
  FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- 3. Atualizar para Alpha
UPDATE public.students 
SET school_id = '08ebef62-2193-4520-ab44-c044160d565f'
WHERE school_id IS NULL;

-- 4. NOT NULL
ALTER TABLE public.students 
  ALTER COLUMN school_id SET NOT NULL;

-- 5. Índice
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);

-- 6. Adicionar coluna school_id em classes
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS school_id uuid;

-- 7. FK
ALTER TABLE public.classes
  ADD CONSTRAINT fk_classes_school 
  FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- 8. Atualizar para Alpha
UPDATE public.classes 
SET school_id = '08ebef62-2193-4520-ab44-c044160d565f'
WHERE school_id IS NULL;

-- 9. NOT NULL
ALTER TABLE public.classes 
  ALTER COLUMN school_id SET NOT NULL;

-- 10. Índice
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);

-- 11. Conferir
SELECT 
  'students_with_school' as check_name,
  COUNT(*) as count
FROM public.students
WHERE school_id IS NOT NULL
UNION ALL
SELECT 
  'classes_with_school',
  COUNT(*)
FROM public.classes
WHERE school_id IS NOT NULL
UNION ALL
SELECT
  'students_null_school',
  COUNT(*)
FROM public.students
WHERE school_id IS NULL
UNION ALL
SELECT
  'classes_null_school',
  COUNT(*)
FROM public.classes
WHERE school_id IS NULL;

ROLLBACK;
`;

async function runDryRun() {
  console.log('=== DRY-RUN: adicionando school_id em students/classes ===\n');
  
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
    
    // Verificar se as colunas foram removidas pelo rollback
    console.log('\n=== Verificando rollback ===');
    const checkRes = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: `
          SELECT column_name 
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name IN ('students', 'classes')
            AND column_name = 'school_id'
        ` 
      })
    });
    
    const checkData = await checkRes.json();
    console.log('Colunas school_id após rollback:', JSON.stringify(checkData));
    
    if (checkData.length === 0) {
      console.log('\n✓ ROLLBACK OK: colunas não persistiram');
      return true;
    } else {
      console.log('\n✗ ROLLBACK FALHOU: colunas ainda existem!');
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
