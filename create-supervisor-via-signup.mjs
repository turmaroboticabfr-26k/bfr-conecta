import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const SUPABASE_ANON_KEY = readFileSync('C:/Users/pcmac/.supabase-anon', 'utf8').trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const email = 'supervisor.test@gmail.com';
  const password = randomBytes(18).toString('base64url');

  console.log('Criando conta via signUp...');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'education_supervisor',
        full_name: 'Supervisor Teste'
      }
    }
  });

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log('Conta criada:', JSON.stringify(data, null, 2));
  console.log('\nUser ID:', data.user?.id);
  console.log('Email:', data.user?.email);
  console.log('Confirmado:', data.user?.email_confirmed_at);
}

main().catch(console.error);
