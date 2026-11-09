// SEG-04c: estado real das sessoes das 3 contas sobreviventes. So metadados, nunca tokens.
import fs from 'node:fs';
import fetch from 'node-fetch';

const PAT = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const URL_Q = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function q(sql) {
  const res = await fetch(URL_Q, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, data: await res.json() };
}

const EMAILS = ['s20-coordinator@bfr.test', 's20-director@bfr.test', 's20-supervisor@bfr.test'];
const list = EMAILS.map((e) => `('${e}')`).join(',');

const r = await q(`with e(email) as (values ${list})
select u.email,
  (select count(*) from auth.sessions s where s.user_id = u.id)::int as sessoes,
  (select count(*) from auth.sessions s where s.user_id = u.id and s.not_after is null)::int as not_after_null,
  (select count(*) from auth.sessions s where s.user_id = u.id and s.not_after > now())::int as na_janela,
  (select count(*) from auth.refresh_tokens rt where rt.user_id::text = u.id::text)::int as rt_linhas,
  (select count(*) from auth.refresh_tokens rt where rt.user_id::text = u.id::text and rt.revoked = false)::int as rt_vivos,
  (select max(s.updated_at) from auth.sessions s where s.user_id = u.id)::text as ultimo_update_sessao,
  (select max(s.not_after) from auth.sessions s where s.user_id = u.id)::text as max_not_after,
  (select max(rt.updated_at) from auth.refresh_tokens rt where rt.user_id::text = u.id::text)::text as ultimo_update_rt
from e join auth.users u on u.email = e.email order by u.email`);

console.log('status', r.status);
if (!Array.isArray(r.data)) console.log(JSON.stringify(r.data, null, 2));
else for (const x of r.data) console.log(JSON.stringify(x));

const d = await q(`select s.not_after::text as not_after, s.refreshed_at::text as refreshed_at, s.tag, s.aal,
  (s.updated_at > now() - interval '7 days')::int as update_recente
from auth.users u join auth.sessions s on s.user_id = u.id
where u.email in (${list}) order by s.updated_at desc limit 12`);
console.log('status', d.status);
if (!Array.isArray(d.data)) console.log(JSON.stringify(d.data, null, 2));
else for (const x of d.data) console.log(JSON.stringify(x));

const c = await q(`select count(*)::int as sessoes_total,
  count(*) filter (where not_after is not null)::int as not_after_preenchido,
  count(*) filter (where not_after > now())::int as na_janela,
  count(*) filter (where refreshed_at is not null)::int as refreshed_preenchido,
  count(*) filter (where tag is not null)::int as tag_preenchido
from auth.sessions`);
console.log('censo not_after status', c.status, JSON.stringify(c.data));

const f = await q(`select count(*)::int as rt_total,
  count(*) filter (where revoked)::int as rt_revogados,
  count(*) filter (where updated_at > now() - interval '7 days')::int as rt_update_7d,
  coalesce(max(length(token)),-1)::int as len_max
from auth.refresh_tokens`);
console.log('censo refresh_tokens status', f.status, JSON.stringify(f.data));
