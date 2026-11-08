import { readFileSync, writeFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const applySQL = readFileSync('sql/fase0-students-classes-school-id.sql', 'utf8');

async function apply() {
  console.log('=== APLICANDO: adicionando school_id em students/classes ===\n');
  
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: applySQL })
    });
    
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      return false;
    }
    
    const data = await res.json();
    console.log('Resultado:');
    console.log(JSON.stringify(data, null, 2));
    
    // Verificar se as colunas persistiram
    console.log('\n=== Verificando persistência ===');
    const checkRes = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: `
          SELECT 
            'students_school_id_exists' as check_name,
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'students' AND column_name = 'school_id'
              ) THEN 'YES' ELSE 'NO' 
            END as value
          UNION ALL
          SELECT 'classes_school_id_exists',
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'classes' AND column_name = 'school_id'
              ) THEN 'YES' ELSE 'NO' 
            END
          UNION ALL
          SELECT 'students_assigned', COUNT(*)::text FROM students WHERE school_id IS NOT NULL
          UNION ALL
          SELECT 'classes_assigned', COUNT(*)::text FROM classes WHERE school_id IS NOT NULL
          UNION ALL
          SELECT 'indexes_created', COUNT(*)::text FROM pg_indexes WHERE tablename IN ('students', 'classes') AND indexname LIKE '%school_id%'
        ` 
      })
    });
    
    const checkData = await checkRes.json();
    console.log('Conferência:');
    checkData.forEach(r => console.log(`  ${r.check_name}: ${r.value}`));
    
    // Salvar diário
    const diary = {
      applied_at: new Date().toISOString(),
      operation: 'add_school_id_to_students_classes',
      result: 'success',
      checks: checkData,
      sql_file: 'sql/fase0-students-classes-school-id.sql'
    };
    writeFileSync('f0-apply2-diary.json', JSON.stringify(diary, null, 2));
    console.log('\n✓ Diário salvo: f0-apply2-diary.json');
    
    return true;
    
  } catch (err) {
    console.error(`ERROR: ${err.messagem}`);
    return false;
  }
}

apply().then(ok => {
  console.log(`\n=== APLICAÇÃO ${ok ? 'BEM-SUCEDIDA' : 'FALHOU'} ===`);
  process.exit(ok ? 0 : 1);
});
