-- FASE 0 — Adicionar school_id em students e classes
-- Objetivo: vincular alunos e turmas à tabela schools
-- Decisão: todos os registros apontam para Escola Municipal Alpha

BEGIN;

-- 1. Adicionar coluna school_id em students (nullable primeiro)
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS school_id uuid;

-- 2. Adicionar FK para schools
ALTER TABLE public.students
  ADD CONSTRAINT fk_students_school 
  FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- 3. Atualizar todos os alunos para Alpha
UPDATE public.students 
SET school_id = '08ebef62-2193-4520-ab44-c044160d565f'
WHERE school_id IS NULL;

-- 4. Tornar NOT NULL após migração
ALTER TABLE public.students 
  ALTER COLUMN school_id SET NOT NULL;

-- 5. Criar índice
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);

-- 6. Adicionar coluna school_id em classes (nullable primeiro)
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS school_id uuid;

-- 7. Adicionar FK para schools
ALTER TABLE public.classes
  ADD CONSTRAINT fk_classes_school 
  FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- 8. Atualizar todas as turmas para Alpha
UPDATE public.classes 
SET school_id = '08ebef62-2193-4520-ab44-c044160d565f'
WHERE school_id IS NULL;

-- 9. Tornar NOT NULL após migração
ALTER TABLE public.classes 
  ALTER COLUMN school_id SET NOT NULL;

-- 10. Criar índice
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);

-- 11. Conferir resultado
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

COMMIT;
