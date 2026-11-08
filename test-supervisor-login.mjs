import fs from 'fs';
import fetch from 'node-fetch';

const pat = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const url = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

const USER_ID = 'b7725c51-9b6e-41cd-c9d2-f338facd3384';

const sql = `
select
  u.id,
  u.email,
  u.role,
  u.aud,
  u.email_confirmed_at,
  u.phone_confirmed_at,
  u.created_at,
  u.updated_at,
  u.last_sign_in_at,
  p.role as profile_role,
  p.full_name,
  (select count(*) from public.staff_schools where profile_id = u.id) as school_count
from auth.users u
left join public.profiles p on p.id = u.id
where u.id = '${USER_ID}'
`;

async function main() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Conta supervisor:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
