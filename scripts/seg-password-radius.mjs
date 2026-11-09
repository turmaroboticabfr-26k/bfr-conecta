// SEG-04e: censo de senhas hardcoded no historico empurrado x contas vivas. Nunca imprime valores.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import fetch from 'node-fetch';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
const PAT = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const URL_Q = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

// 1. extrair literais de senha dos scripts locais (todos os scripts, nao so o da S20)
const dirs = [REPO + '/scripts', REPO];
const local = new Map();
for (const d of dirs) {
  for (const f of fs.readdirSync(d)) {
    if (!/\.mjs$|\.js$/.test(f)) continue;
    const src = fs.readFileSync(path.join(d, f), 'utf8');
    for (const m of src.matchAll(/password\s*[:=]\s*['"]([^'"\s]{6,})['"]/g)) {
      if (!local.has(m[1])) local.set(m[1], new Set());
      local.get(m[1]).add(f);
    }
  }
}
console.log('senhas distintas extraidas dos scripts locais:', local.size);

// 2. quais delas estao em blobs alcancaveis do origin/main
const objects = git(['rev-list', '--objects', 'origin/main']).trim().split('\n');
const ids = objects.map((l) => {
  const [sha, ...rest] = l.split(' ');
  return { sha, path: rest.join(' ') || '(sem-nome)' };
});
const check = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
  cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, input: ids.map((e) => e.sha).join('\n') + '\n',
});
const type = new Map(check.trim().split('\n').map((l) => l.split(' ')));
const blobs = ids.filter((e) => type.get(e.sha) === 'blob');
const bodies = [];
for (const { sha, path: p } of blobs) {
  try {
    const b = git(['cat-file', 'blob', sha]);
    if (b.length <= 8 << 20) bodies.push({ p, b });
  } catch {}
}

const pushed = new Map();
for (const [secret, files] of local) {
  const hits = bodies.filter((x) => x.b.includes(secret)).map((x) => x.p);
  if (hits.length) pushed.set(secret, { files, hits });
}
console.log('senhas locais que tambien estao no historico empurrado:', pushed.size);

// 3. emails usados nos mesmos scripts -> contas
const emails = new Map();
for (const [secret, info] of pushed) {
  emails.set(secret, new Set());
  for (const f of info.files) {
    const p = [REPO + '/scripts/' + f, REPO + '/' + f].find(fs.existsSync);
    if (!p) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/['"]([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})['"]/g)) emails.get(secret).add(m[1]);
  }
}

// 4. estado vivo das contas
async function q(sql) {
  const res = await fetch(URL_Q, { method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }) });
  return { status: res.status, data: await res.json() };
}
const all0 = [...new Set([...emails.values()].flatMap((s) => [...s]))].filter((e) => e.length < 60);
const all = all0.slice(0, 40);
console.log('emails distintos nomeados nos 3 ficheiros:', all0.length, '| consultados:', all.length);
if (all.length) {
  const r = await q(`with e(email) as (values ${all.map((x) => `('${x}')`).join(',')})
select e.email, (u.id is not null) as existe,
  coalesce((select count(*) from auth.refresh_tokens rt where rt.user_id::text = u.id::text and rt.revoked = false),0)::int as rt_vivos
from e left join auth.users u on u.email = e.email order by existe desc, e.email`);
  console.log('status', r.status);
  let vivas = 0, rtv = 0, mortas = 0;
  for (const x of (Array.isArray(r.data) ? r.data : [])) {
    if (!x.existe) { mortas++; continue; }
    vivas++; rtv += x.rt_vivos;
    console.log(`viva: ${x.email} | rt_vivos=${x.rt_vivos}`);
  }
  console.log(`\nVEREDITO: ${pushed.size} senha(s) vazada(s) | ${all.length} conta(s) nomeadas | ${vivas} ainda existem (${mortas} nao existem) | ${rtv} refresh tokens nao revogados`);
}
