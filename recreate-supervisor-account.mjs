import fetch from 'node-fetch';
import bcrypt from 'bcrypt';

const PAT = (await import('fs')).readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT_ID = 'yyzqoxlkcvqpessypfjo';

const EMAIL = 'supervisor.test2@gmail.com';
const PASSWORD = 'Supervisor123!';
const ROLE = 'education_supervisor';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function main() {
  console.log('=== Gerar bcrypt hash ===');
  const hash = await bcrypt.hash(PASSWORD, 10);
  console.log(`Hash: ${hash}`);

  console.log('\n=== Deletar conta anterior ===');
  const check = await sql(`select id from auth.users where email = '${EMAIL}'`);
  console.log(`Check: ${check.status} ${check.body}`);

  if (check.status === 200 && check.body !== '[]' && check.body !== '') {
    const users = JSON.parse(check.body);
    for (const u of users) {
      console.log(`Deletando ${u.id}...`);
      await sql(`delete from public.staff_schools where profile_id = '${u.id}'`);
      await sql(`delete from public.profiles where id = '${u.id}'`);
      await sql(`delete from auth.users where id = '${u.id}'`);
      console.log(`  Deletado.`);
    }
  }

  console.log('\n=== Criar conta via SQL direto ===');
  const now = new Date().toISOString();
  const createSql = `
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      '${EMAIL}',
      '${hash}',
      '${now}',
      'authenticated',
      'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{"role":"${ROLE}"}',
      '${now}',
      '${now}'
    )
    returning id, email
  `;

  const createRes = await sql(createSql);
  console.log(`Create: ${createRes.status} ${createRes.body}`);

  if (createRes.status !== 200 || createRes.body === '') {
    console.error('Falha ao criar conta.');
    return;
  }

  const created = JSON.parse(createRes.body);
  const userId = created[0].id;
  console.log(`\nUser ID: ${userId}`);

  console.log('\n=== Atualizar perfil ===');
  const profileRes = await sql(`
    update public.profiles
    set role = '${ROLE}'::account_role,
        full_name = 'Supervisor Sintético'
    where id = '${userId}'
    returning id, role, full_name
  `);
  console.log(`Profile: ${profileRes.status} ${profileRes.body}`);

  console.log('\n=== Verificar estado final ===');
  const verifyRes = await sql(`
    select
      u.id, u.email, u.email_confirmed_at,
      p.role as profile_role, p.full_name
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = '${userId}'
  `);
  console.log(`Verify: ${verifyRes.status} ${verifyRes.body}`);

  console.log(`\n✅ Conta criada!`);
  console.log(`Email: ${EMAIL}`);
  console.log(`Senha: ${PASSWORD}`);
}

main().catch(console.error);
