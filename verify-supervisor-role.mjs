import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Verificar role do supervisor após atualização
// ============================================================================
// Uso: node verify-supervisor-role.mjs
// ============================================================================

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ha5BDvPjcE8eniuYIL7F2A_lmqEu3YB';

const EMAIL = 'supervisor.test2@gmail.com';
const EXPECTED_ROLE = 'education_supervisor';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== Verificar Role do Supervisor ===\n');

  // [1] Buscar perfil
  console.log('[1] Buscando perfil...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, created_at, updated_at')
    .eq('email', EMAIL)
    .single();

  if (profileError) {
    console.error('❌ Erro ao buscar perfil:', profileError.message);
    return;
  }

  console.log('Perfil encontrado:');
  console.log('  ID:', profile.id);
  console.log('  Email:', profile.email);
  console.log('  Role:', profile.role);
  console.log('  Nome:', profile.full_name || '(não definido)');
  console.log('  Criado:', profile.created_at);
  console.log('  Atualizado:', profile.updated_at);
  console.log('');

  // [2] Verificar se o role está correto
  if (profile.role === EXPECTED_ROLE) {
    console.log(`✅ Role correto: '${EXPECTED_ROLE}'`);
  } else {
    console.log(`❌ Role incorreto!`);
    console.log(`   Esperado: '${EXPECTED_ROLE}'`);
    console.log(`   Atual: '${profile.role}'`);
    console.log('');
    console.log('Para atualizar, execute:');
    console.log('  1. Via SQL Editor (Dashboard): sql/update-supervisor-role.sql');
    console.log('  2. Via API: node update-supervisor-role-via-api.mjs');
    return;
  }
  console.log('');

  // [3] Verificar vínculos com escolas
  console.log('[2] Verificando vínculos com escolas...');
  const { data: bindings, error: bindingsError } = await supabase
    .from('staff_schools')
    .select(`
      id,
      school_id,
      sports_schools(name)
    `)
    .eq('staff_id', profile.id);

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
    console.log('   VALUES (\'', profile.id, '\', \'ID_DA_ESCOLA\');');
  }
  console.log('');

  // [4] Verificar se a conta existe em auth.users
  console.log('[3] Verificando conta no auth...');
  const { data: authUser, error: authError } = await supabase
    .from('users', { query: { select: 'id,email,role,aud,email_confirmed_at' } })
    .eq('email', EMAIL)
    .single();

  if (authError) {
    console.log('⚠️ Não foi possível verificar auth.users (requer service_role)');
    console.log('   Isso é normal se estiver usando a anon key.');
  } else if (authUser) {
    console.log('✅ Conta encontrada em auth.users:');
    console.log('   ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Role:', authUser.role);
    console.log('   Aud:', authUser.aud);
    console.log('   Email confirmado:', authUser.email_confirmed_at || '(não)');
  }
  console.log('');

  // [5] Resumo
  console.log('=== Resumo ===');
  console.log('✅ Perfil:', profile.email);
  console.log('✅ Role:', profile.role);
  console.log('✅ Vínculos:', bindings?.length || 0);
  console.log('');
  console.log('Próximo passo: testar login');
  console.log('  node test-supervisor-login-client.mjs');
}

main().catch(console.error);
