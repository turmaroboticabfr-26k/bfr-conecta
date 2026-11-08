import { readFileSync, writeFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const applySQL = readFileSync('sql/fase0-add-supervisor-role.sql', 'utf8');

async function apply() {
  console.log('=== APLICANDO: adicionando education_supervisor ao enum ===\n');
  
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
    
    // Verificar se o novo papel foi adicionado
    console.log('\n=== Verificando enum atualizado ===');
    const checkRes = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: `
          SELECT 
            'total_roles' as check_name,
            array_length(enum_range(NULL::public.account_role), 1)::text as value
          UNION ALL
          SELECT 'has_supervisor',
            CASE 
              WHEN 'education_supervisor' = ANY(enum_range(NULL::public.account_role)::text[])
              THEN 'YES' ELSE 'NO'
            END
        ` 
      })
    });
    
    const checkData = await checkRes.json();
    console.log('Conferência:');
    checkData.forEach(r => console.log(`  ${r.check_name}: ${r.value}`));
    
    // Salvar diário
    const diary = {
      applied_at: new Date().toISOString(),
      operation: 'add_education_supervisor_role',
      result: 'success',
      checks: checkData,
      sql_file: 'sql/fase0-add-supervisor-role.sql',
      note: 'ALTER TYPE ADD VALUE cannot be rolled back in PostgreSQL'
    };
    writeFileSync('f0-apply3-diary.json', JSON.stringify(diary, null, 2));
    console.log('\n✓ Diário salvo: f0-apply3-diary.json');
    
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
