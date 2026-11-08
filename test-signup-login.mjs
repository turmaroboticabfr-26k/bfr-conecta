import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ha5BDvPjcE8eniuYIL7F2A_lmqEu3YB';

const EMAIL = 'supervisor.test3@gmail.com';
const PASSWORD = 'Test123!Test';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('=== SignUp ===');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: EMAIL,
    password: PASSWORD
  });

  if (signUpError) {
    console.error('SignUp error:', signUpError.message);
    return;
  }

  console.log('User ID:', signUpData.user?.id);
  console.log('Email:', signUpData.user?.email);
  console.log('Email confirmed:', signUpData.user?.email_confirmed_at ? 'YES' : 'NO');

  console.log('\n=== Confirm email via SQL ===');
  const PAT = (await import('fs')).readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
  const confirmRes = await fetch(`https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `update auth.users set email_confirmed_at = NOW() where id = '${signUpData.user?.id}' returning id, email_confirmed_at`
    })
  });
  console.log('Confirm:', await confirmRes.text());

  console.log('\n=== Sign out ===');
  await supabase.auth.signOut();

  console.log('\n=== Sign In ===');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });

  if (signInError) {
    console.error('SignIn error:', signInError.message);
    console.error('Status:', signInError.status);
    return;
  }

  console.log('Login OK!');
  console.log('User:', signInData.user?.email);
  console.log('Session:', signInData.session ? 'present' : 'absent');
}

main().catch(console.error);
