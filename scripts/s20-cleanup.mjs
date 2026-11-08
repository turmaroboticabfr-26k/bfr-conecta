import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

console.log('=== Limpando todas as contas s20 ===\n');

const list = await admin('/auth/v1/admin/users?per_page=1000');
const s20Users = list.j.users.filter(u => u.email.includes('s20-'));
console.log(`Encontradas ${s20Users.length} contas s20:`);
s20Users.forEach(u => console.log(`  ${u.id} — ${u.email}`));

console.log('\nLimpando FKs em supervision_audit...');
const uids = s20Users.map(u => `'${u.id}'`).join(',');
if (uids) {
  await sql(`DELETE FROM supervision_audit WHERE profile_id IN (${uids});`);
  console.log('  supervision_audit limpo');
}

console.log('\nDeletando contas auth...');
for (const u of s20Users) {
  const del = await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
  console.log(`  DELETE ${u.id}: HTTP ${del.status}${del.status === 200 ? ' OK' : ' — ' + JSON.stringify(del.j).slice(0, 200)}`);
}

console.log('\nLimpeza concluída.');
