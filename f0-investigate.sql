-- Investigar estado atual do banco para Fase 0

-- 1. Verificar se tabela 'schools' existe
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('schools', 'sports_schools', 'staff_schools', 'students', 'classes')
ORDER BY table_name;

-- 2. Verificar colunas de students
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
ORDER BY ordinal_position;

-- 3. Verificar colunas de classes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'classes'
ORDER BY ordinal_position;

-- 4. Verificar colunas de staff_schools
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'staff_schools'
ORDER BY ordinal_position;

-- 5. Verificar colunas de sports_schools (se existir)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sports_schools'
ORDER BY ordinal_position;

-- 6. Verificar o enum account_role
SELECT enum_range(NULL::account_role);

-- 7. Contar registros em tabelas relevantes
SELECT 'students' as table_name, COUNT(*) as count FROM students
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
UNION ALL
SELECT 'staff_schools', COUNT(*) FROM staff_schools
UNION ALL
SELECT 'sports_schools', COUNT(*) FROM sports_schools;

-- 8. Ver se students já tem school_id
SELECT COUNT(*) as students_with_school_id 
FROM students 
WHERE school_id IS NOT NULL;

-- 9. Ver se classes já tem school_id
SELECT COUNT(*) as classes_with_school_id 
FROM classes 
WHERE school_id IS NOT NULL;
