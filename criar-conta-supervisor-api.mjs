#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Criar conta supervisor via Auth Admin API
// ============================================================================
// Uso: SUPABASE_SERVICE_ROLE_KEY=eyJ... node criar-conta-supervisor-api.mjs
// 
// Este script:
// 1. Cria a conta em auth.users via Auth Admin API
// 2. Cria o perfil na tabela profiles
// 3. Cria os vínculos em staff_schools
// 4. Verifica o resultado
// ============================================================================

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = 'supervisor.test2@gmail.com';
const PASSWORD = 'Supervisor123!';
const FULL_NAME = 'Supervisor Teste 2';
const ROLE = 'education_supervisor';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Variável de ambiente SUPABASE_SERVICE_ROLE_KEY não definida');
  console.error('');
  console.error('Uso:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="eyJ..."');
  console.error('  node criar-conta-supervisor-api.mjs');
  console.error('');
  console.error('Onde encontrar:');
  console.error('  Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== Criar Conta Supervisor via Auth Admin API ===\n');

  // [1] Verificar se a conta já existe
  console.log('[1] Verificando se a conta já existe...');
  const { data: existingUser, error: checkError } = await supabase
    .auth.admin.listUsers();

  if (checkError) {
    console.error('❌ Erro ao listar usuários:', checkError.message);
    return;
  }

  const userExists = existingUser.users.find(u => u.email === EMAIL);
  if (userExists) {
    console.log(`⚠️ Conta já existe: ${EMAIL}`);
    console.log(`   User UID: ${userExists.id}`);
    console.log(`   Email confirmado: ${userExists.email_confirmed_at ? 'sim' : 'não'}`);
    console.log('');
    console.log('Para recriar, delete primeiro:');
    console.log(`  await supabase.auth.admin.deleteUser('${userExists.id}')`);
    return;
  }

  // [2] Criar a conta via Auth Admin API
  console.log(`[2] Criando conta: ${EMAIL}...`);
  const { data: newUser, error: createError } = await supabase
    .auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: FULL_NAME,
        role: ROLE
      }
    });

  if (createError) {
    console.error('❌ Erro ao criar conta:', createError.message);
    return;
  }

  console.log('✅ Conta criada:');
  console.log('   User UID:', newUser.user.id);
  console.log('   Email:', newUser.user.email);
  console.log('   Confirmado:', newUser.user.email_confirmed_at ? 'sim' : 'não');
  console.log('');

  const userId = newUser.user.id;

  // [3] Verificar se o perfil foi criado automaticamente (trigger)
  console.log('[3] Verificando perfil na tabela profiles...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.log('⚠️ Perfil não existe, criando manualmente...');
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: EMAIL,
        role: ROLE,
        full_name: FULL_NAME
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao criar perfil:', insertError.message);
      return;
    }

    console.log('✅ Perfil criado:', newProfile);
  } else {
    console.log('✅ Perfil já existe (criado por trigger):', profile);
    
    // Atualizar role se necessário
    if (profile.role !== ROLE) {
      console.log(`   Atualizando role de '${profile.role}' para '${ROLE}'...`);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: ROLE })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Erro ao atualizar role:', updateError.message);
      } else {
        console.log('✅ Role atualizado');
      }
    }
  }
  console.log('');

  // [4] Verificar escolas sintéticas
  console.log('[4] Verificando escolas sintéticas...');
  const { data: schools, error: schoolsError } = await supabase
    .from('sports_schools')
    .select('id, name')
    .in('name', ['Escola Alpha', 'Escola Beta', 'Escola Gamma']);

  if (schoolsError) {
    console.error('❌ Erro ao buscar escolas:', schoolsError.message);
    return;
  }

  if (!schools || schools.length === 0) {
    console.log('⚠️ Escolas sintéticas não existem, criando...');
    const { data: newSchools, error: insertSchoolsError } = await supabase
      .from('sports_schools')
      .insert([
        { name: 'Escola Alpha', city: 'São Paulo', state: 'SP' },
        { name: 'Escola Beta', city: 'Rio de Janeiro', state: 'RJ' },
        { name: 'Escola Gamma', city: 'Belo Horizonte', state: 'MG' }
      ])
      .select();

    if (insertSchoolsError) {
      console.error('❌ Erro ao criar escolas:', insertSchoolsError.message);
      return;
    }

    console.log(`✅ ${newSchools.length} escolas criadas`);
  } else {
    console.log(`✅ ${schools.length} escolas encontradas`);
  }
  console.log('');

  // [5] Criar vínculos staff_schools
  console.log('[5] Criando vínculos supervisor ↔ escolas...');
  const { data: allSchools } = await supabase
    .from('sports_schools')
    .select('id, name')
    .in('name', ['Escola Alpha', 'Escola Beta', 'Escola Gamma']);

  const bindings = allSchools.map(school => ({
    staff_id: userId,
    school_id: school.id
  }));

  const { data: newBindings, error: bindingsError } = await supabase
    .from('staff_schools')
    .upsert(bindings, { onConflict: 'staff_id,school_id' })
    .select();

  if (bindingsError) {
    console.error('❌ Erro ao criar vínculos:', bindingsError.message);
    return;
  }

  console.log(`✅ ${newBindings.length} vínculos criados`);
  console.log('');

  // [6] Verificação final
  console.log('[6] Verificação final...');
  const { data: finalProfile } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      role,
      full_name,
      staff_schools(
        sports_schools(name)
      )
    `)
    .eq('id', userId)
    .single();

  console.log('✅ Conta criada com sucesso:');
  console.log('   Email:', finalProfile.email);
  console.log('   Role:', finalProfile.role);
  console.log('   Nome:', finalProfile.full_name);
  console.log('   Escolas:', finalProfile.staff_schools?.length || 0);
  finalProfile.staff_schools?.forEach(ss => {
    console.log('     -', ss.sports_schools?.name);
  });
  console.log('');

  // [7] Testar login
  console.log('[7] Testando login...');
  const { data: loginData, error: loginError } = await supabase
    .auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });

  if (loginError) {
    console.error('❌ Login falhou:', loginError.message);
    console.log('');
    console.log('Possíveis causas:');
    console.log('  - Senha incorreta (deve ser: Supervisor123!)');
    console.log('  - Email não confirmado');
    console.log('  - Limitação do GoTrue (contas criadas via SQL não funcionam)');
  } else {
    console.log('✅ Login OK!');
    console.log('   User:', loginData.user?.email);
    console.log('   Session:', loginData.session ? 'presente' : 'ausente');
    console.log('');
    console.log('=== PRONTO PARA BROWSER TEST ===');
    console.log('URL: https://bfr-conecta.turmaroboticabfr.workers.dev');
    console.log(`Email: ${EMAIL}`);
    console.log(`Senha: ${PASSWORD}`);
  }

  // [8] Logout
  if (loginData?.session) {
    await supabase.auth.signOut();
  }
}

main().catch(console.error);
