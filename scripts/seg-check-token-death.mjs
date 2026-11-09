// SEG-04: os 12 access_tokens do historico empurrado ainda dao? Le os subs dos proprios blobs
// de origin/main e consulta auth.users/sessions/refresh_tokens. So existe/contagem — nunca token.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import fetch from 'node-fetch';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const PAT = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const URL_Q = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

const FILES = ['c2-sessions.json', 's19-sessions.json', 's20-sessions.json'];
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

const subs = new Set();
for (const f of FILES) {
  const line = git(['rev-list', '--objects', 'origin/main']).trim().split('\n').find((l) => l.endsWith(' ' + f));
  const body = git(['cat-file', 'blob', line.split(' ')[0]]);
  for (const m of body.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]+/g)) {
    try {
      const p = JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      if (p.sub && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.sub)) subs.add(p.sub);
    } catch {}
  }
}
console.log('subs extraidos dos blobs empurrados:', subs.size);

async function q(sql) {
  const res = await fetch(URL_Q, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, data: await res.json() };
}

const list = [...subs].map((s) => `('${s}')`).join(',');
const sql = `with ids(id) as (values ${list})
select
  (select count(*) from ids i join auth.users u on u.id = i.id::uuid)::int as usuarios_na_tabela,
  (select count(*) from ids i join auth.users u on u.id = i.id::uuid where u.deleted_at is null)::int as nao_apagados,
  (select count(*) from ids i join auth.sessions s on s.user_id = i.id::uuid)::int as sessoes,
  (select count(*) from ids i join auth.sessions s on s.user_id = i.id::uuid where s.not_after > now())::int as sessoes_dentro_da_janela,
  (select count(*) from ids i join auth.refresh_tokens r on r.user_id::text = i.id::text)::int as refresh_linhas,
  (select count(*) from ids i join auth.refresh_tokens r on r.user_id::text = i.id::text where r.revoked = false)::int as refresh_nao_revogados,
  (select count(*) from auth.users)::int as total_usuarios,
  (select count(*) from auth.sessions)::int as total_sessoes,
  (select coalesce(min(length(r.token)),-1) from auth.refresh_tokens r)::int as rt_len_min,
  (select coalesce(max(length(r.token)),-1) from auth.refresh_tokens r)::int as rt_len_max`;

const r = await q(sql);
console.log('status', r.status);
console.log(r.data);
