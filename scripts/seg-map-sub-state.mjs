// SEG-04b: mapear cada sub dos 3 ficheiros de sessao ao estado real em auth.
// Imprime email/papel (contas sinteticas de auditoria) e contagens; nunca imprime token.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import fetch from 'node-fetch';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const PAT = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const URL_Q = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

const FILES = ['c2-sessions.json', 's19-sessions.json', 's20-sessions.json'];
const bySub = new Map();
for (const f of FILES) {
  const line = git(['rev-list', '--objects', 'origin/main']).trim().split('\n').find((l) => l.endsWith(' ' + f));
  const body = git(['cat-file', 'blob', line.split(' ')[0]]);
  for (const m of body.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]+/g)) {
    try {
      const p = JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      if (p.sub && /^[0-9a-f-]{36}$/.test(p.sub)) {
        if (!bySub.has(p.sub)) bySub.set(p.sub, { files: new Set(), exp: 0 });
        bySub.get(p.sub).files.add(f);
        bySub.get(p.sub).exp = Math.max(bySub.get(p.sub).exp, p.exp || 0);
      }
    } catch {}
  }
}

async function q(sql) {
  const res = await fetch(URL_Q, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, data: await res.json() };
}

const list = [...bySub.keys()].map((s) => `('${s}')`).join(',');
const r = await q(`with ids(id) as (values ${list})
select i.id::text as sub, u.email, u.role, u.deleted_at is not null as soft_deleted,
  (select count(*) from auth.sessions s where s.user_id = i.id::uuid)::int as sessoes,
  (select count(*) from auth.sessions s where s.user_id = i.id::uuid and s.not_after > now())::int as sessoes_na_janela,
  (select count(*) from auth.refresh_tokens rt where rt.user_id::text = i.id::text and rt.revoked = false)::int as rt_vivos,
  (select max(s.not_after) from auth.sessions s where s.user_id = i.id::uuid)::text as ultima_janela
from ids i left join auth.users u on u.id = i.id::uuid order by u.email nulls last`);
console.log('status', r.status);
const now = Date.now() / 1000;
for (const x of (Array.isArray(r.data) ? r.data : [])) {
  const info = bySub.get(x.sub) || { files: new Set(), exp: 0 };
  console.log([
    x.email || '(sub nao existe em auth.users)',
    'ficheiro(s): ' + [...info.files].join(','),
    'access exp ' + (info.exp ? new Date(info.exp * 1000).toISOString() : '?') + (info.exp < now ? ' PASSADO' : ' FUTURO'),
    'soft_deleted=' + x.soft_deleted,
    'sessoes=' + x.sessoes,
    'na_janela=' + x.sessoes_na_janela,
    'rt_vivos=' + x.rt_vivos,
    'ultima_janela=' + (x.ultima_janela || '-'),
  ].join(' | '));
}
