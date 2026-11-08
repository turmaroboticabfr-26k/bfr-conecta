import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const SUPABASE_ANON_KEY = readFileSync('C:/Users/pcmac/.supabase-anon', 'utf8').trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  console.log('Testando login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'supervisor.test2@gmail.com',
    password: readFileSync('C:/Users/pcmac/.supervisor-test-password', 'utf8').trim()
  });

  if (error) {
    console.error('Erro:', error.message);
    console.error('Detalhes:', error);
    return;
  }

  console.log('Login OK!');
  console.log('User:', data.user?.email);
  console.log('Role:', data.user?.role);
  console.log('Session:', data.session ? 'presente' : 'ausente');
}

testLogin().catch(console.error);
