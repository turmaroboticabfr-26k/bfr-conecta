import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ha5BDvPjcE8eniuYIL7F2A_lmqEu3YB';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EMAIL = 'supervisor.test2@gmail.com';
const PASSWORD = 'Supervisor123!';

async function main() {
  console.log('=== Deletar conta anterior via SQL ===');
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: `select id from auth.users where email = '${EMAIL}'` })
  });
  console.log(`Check: ${checkRes.status}`);

  console.log('\n=== SignUp via cliente Supabase ===');
  const { data, error } = await supabase.auth.signUp({
    email: EMAIL,
    password: PASSWORD,
    options: {
      data: {
        role: 'education_supervisor',
        full_name: 'Supervisor Sintético'
      }
    }
  });

  if (error) {
    console.error('Erro:', error.message);
    console.error('Detalhes:', error);
    return;
  }

  console.log('SignUp OK!');
  console.log('User:', data.user?.email);
  console.log('User ID:', data.user?.id);
  console.log('Session:', data.session ? 'presente' : 'ausente');

  if (data.user) {
    console.log('\n=== Testar login ===');
    const loginRes = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });

    if (loginRes.error) {
      console.error('Login erro:', loginRes.error.message);
    } else {
      console.log('Login OK!');
      console.log('User:', loginRes.data.user?.email);
    }
  }
}

main().catch(console.error);
