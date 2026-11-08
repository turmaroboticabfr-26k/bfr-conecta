import { readFileSync, writeFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

async function apply() {
  console.log('=== APLICANDO: adicionando education_supervisor ao enum ===\n');
  
  try {
    // Passo 1: Adicionar o valor ao enum (auto-commit)
    const res1 = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: `ALTER TYPE public.account_role ADD VALUE 'education_supervisor'` 
      })
    });
    
    if (!res1.ok) {
      console.error(`Passo 1 falhou - HTTP ${res1.status}: ${await res1.text()}`);
      return false;
    }
    
    console.log('✓ Passo 1: ALTER TYPE executado (auto-commit)');
    
    // Passo 2: Verificar o enum atualizado
    const res2 = await fetch(URL, {
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
          UNION ALL
          SELECT 'enum_values', enum_range(NULL::public.account_role)::text
        ` 
      })
    });
    
    if (!res2.ok) {
      console.error(`Passo 2 falhou - HTTP ${res2.status}: ${await res2.text()}`);
      return false;
    }
    
    const data = await res2.json();
    console.log('\n✓ Passo 2: Enum verificado:');
    data.forEach(r => console.log(`  ${r.check_name}: ${r.value}`));
    
    // Salvar diário
    const diary = {
      applied_at: new Date().toISOString(),
      operation: 'add_education_supervisor_role',
      result: 'success',
      checks: data,
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
