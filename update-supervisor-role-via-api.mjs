import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Script para atualizar role do supervisor via Auth Admin API
// ============================================================================
// Uso: node update-supervisor-role-via-api.mjs
// Requer: service_role key (NÃO usar anon key)
// ============================================================================

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';

// ⚠️ IMPORTANTE: Substituir pela service_role key real
// Obter em: Dashboard → Settings → API → service_role key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'SUBSTITUIR_PELA_SERVICE_ROLE_KEY_AQUI';

const EMAIL = 'supervisor.test2@gmail.com';
const NEW_ROLE = 'education_supervisor';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== Atualizar role do supervisor via API ===\n');

  // [1] Verificar estado atual
  console.log('[1] Verificando perfil atual...');
  const { data: currentProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('email', EMAIL)
    .single();

  if (fetchError) {
    console.error('❌ Erro ao buscar perfil:', fetchError.message);
    return;
  }

  console.log('Perfil atual:', currentProfile);
  console.log('');

  // [2] Verificar se o role já está correto
  if (currentProfile.role === NEW_ROLE) {
    console.log(`✅ Role já está '${NEW_ROLE}', nenhuma atualização necessária.`);
    return;
  }

  // [3] Atualizar o role
  console.log(`[2] Atualizando role para '${NEW_ROLE}'...`);
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      role: NEW_ROLE,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentProfile.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError.message);
    console.error('Detalhes:', updateError);
    
    // Verificar se o erro é por causa do enum
    if (updateError.message.includes('invalid input value for enum')) {
      console.log('\n⚠️ O role \'' + NEW_ROLE + '\' não existe no enum account_role.');
      console.log('Execute no SQL Editor:');
      console.log(`  ALTER TYPE account_role ADD VALUE '${NEW_ROLE}';`);
    }
    return;
  }

  console.log('✅ Perfil atualizado:', updatedProfile);
  console.log('');

  // [4] Verificar vínculos staff_schools
  console.log('[3] Verificando vínculos com escolas...');
  const { data: bindings, error: bindingsError } = await supabase
    .from('staff_schools')
    .select(`
      id,
      school_id,
      sports_schools(name)
    `)
    .eq('staff_id', currentProfile.id);

  if (bindingsError) {
    console.error('❌ Erro ao buscar vínculos:', bindingsError.message);
  } else if (bindings && bindings.length > 0) {
    console.log(`✅ ${bindings.length} vínculo(s) encontrado(s):`);
    bindings.forEach(b => {
      console.log(`   - ${b.sports_schools?.name || b.school_id}`);
    });
  } else {
    console.log('⚠️ Nenhum vínculo com escolas encontrado.');
    console.log('   Para criar vínculos, execute no SQL Editor:');
    console.log('   INSERT INTO staff_schools (staff_id, school_id)');
    console.log('   VALUES (\'', currentProfile.id, '\', \'ID_DA_ESCOLA\');');
  }

  console.log('\n=== Conclusão ===');
  console.log(`✅ Role atualizado para '${NEW_ROLE}'`);
  console.log('✅ Pronto para teste de login');
}

main().catch(console.error);
