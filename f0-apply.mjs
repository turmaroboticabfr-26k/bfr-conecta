import { readFileSync, writeFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const applySQL = readFileSync('sql/fase0-schools-table.sql', 'utf8');

async function apply() {
  console.log('=== APLICANDO: criando tabela schools ===\n');
  
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
    
    // Verificar se a tabela persistiu
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
            'table_exists' as check_name,
            CASE WHEN to_regclass('public.schools') IS NOT NULL THEN 'YES' ELSE 'NO' END as value
          UNION ALL
          SELECT 'row_count', COUNT(*)::text FROM public.schools
          UNION ALL
          SELECT 'trigger_count', COUNT(*)::text FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE c.relname = 'schools' AND NOT t.tgisinternal
          UNION ALL
          SELECT 'rls_enabled', relforcerowsecurity::text FROM pg_class WHERE relname = 'schools'
        ` 
      })
    });
    
    const checkData = await checkRes.json();
    console.log('Conferência:');
    checkData.forEach(r => console.log(`  ${r.check_name}: ${r.value}`));
    
    // Salvar diário
    const diary = {
      applied_at: new Date().toISOString(),
      operation: 'create_schools_table',
      result: 'success',
      checks: checkData,
      sql_file: 'sql/fase0-schools-table.sql'
    };
    writeFileSync('f0-apply-diary.json', JSON.stringify(diary, null, 2));
    console.log('\n✓ Diário salvo: f0-apply-diary.json');
    
    return true;
    
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    return false;
  }
}

apply().then(ok => {
  console.log(`\n=== APLICAÇÃO ${ok ? 'BEM-SUCEDIDA' : 'FALHOU'} ===`);
  process.exit(ok ? 0 : 1);
});
