import { readFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const queries = [
  // 1. Tabelas existentes
  `SELECT table_name, table_type 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('schools', 'sports_schools', 'staff_schools', 'students', 'classes')
   ORDER BY table_name`,
  
  // 2. Colunas de students
  `SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'students'
   ORDER BY ordinal_position`,
  
  // 3. Colunas de classes
  `SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'classes'
   ORDER BY ordinal_position`,
  
  // 4. Colunas de staff_schools
  `SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'staff_schools'
   ORDER BY ordinal_position`,
  
  // 5. Colunas de sports_schools
  `SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'sports_schools'
   ORDER BY ordinal_position`,
  
  // 6. Enum account_role
  `SELECT enum_range(NULL::account_role) as roles`,
  
  // 7. Contagens
  `SELECT 'students' as tbl, COUNT(*) as cnt FROM students
   UNION ALL SELECT 'classes', COUNT(*) FROM classes
   UNION ALL SELECT 'staff_schools', COUNT(*) FROM staff_schools
   UNION ALL SELECT 'sports_schools', COUNT(*) FROM sports_schools`,
  
  // 8. Students com school_id
  `SELECT COUNT(*) as students_with_school_id FROM students WHERE school_id IS NOT NULL`,
  
  // 9. Classes com school_id
  `SELECT COUNT(*) as classes_with_school_id FROM classes WHERE school_id IS NOT NULL`,
  
  // 10. Escolas em sports_schools
  `SELECT id, name, city FROM sports_schools ORDER BY name`
];

async function runQuery(sql, label) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!res.ok) {
      console.error(`\n=== ${label} ===`);
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      return null;
    }
    
    const data = await res.json();
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error(`\n=== ${label} ===`);
    console.error(`ERROR: ${err.message}`);
    return null;
  }
}

console.log('Investigando estado atual do banco...\n');

for (let i = 0; i < queries.length; i++) {
  await runQuery(queries[i], `Query ${i + 1}`);
}

console.log('\n=== INVESTIGAÇÃO CONCLUÍDA ===');
