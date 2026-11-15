// RM-6.8 régua degrau 3 — limpeza de contas sintéticas s20-* remanescentes
// O pre-cleanup do s20-behavioral faz DELETE sem verificar o status; este script
// enumera por SQL (like 's20-%@bfr.test'), remove ANTES as linhas de
// supervision_audit que referenciam esses profiles (FK supervision_audit_profile_id_fkey
// derruba o DELETE das contas desde 08/11), apaga via Admin API COM verificação
// e confirma 0 remanescentes antes de devolver o controle.
// Só toca contas/fixture/auditoria da classe s20 (sintéticas do ciclo S20).

import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

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

const listar = async () => sql(`select id, email from auth.users where email like 's20-%@bfr.test' order by email;`);

const restos = await listar();
console.log(`Contas s20-* encontradas: ${restos.length}`);
for (const u of restos) console.log(`  ${u.email}  ${u.id}`);

if (restos.length > 0) {
  const ids = restos.map(u => `'${u.id}'`).join(',');
  const audit = await sql(`select count(*)::int as n from supervision_audit where profile_id in (${ids});`);
  console.log(`Linhas supervision_audit dessas contas: ${audit[0].n}`);
  await sql(`delete from supervision_audit where profile_id in (${ids});`);
  const restante = await sql(`select count(*)::int as n from supervision_audit where profile_id in (${ids});`);
  console.log(`DELETE supervision_audit → restam ${restante[0].n} linha(s)`);
  if (restante[0].n > 0) throw new Error('supervision_audit não zerou');
}

for (const u of restos) {
  const r = await fetch(`${HOST}/auth/v1/admin/users/${u.id}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const t = await r.text();
  console.log(`DELETE ${u.email}: HTTP ${r.status}${t ? ' ' + t.slice(0, 120) : ''}`);
  if (![200, 404].includes(r.status)) throw new Error(`Falha ao apagar ${u.email}: HTTP ${r.status}`);
}

const depois = await listar();
console.log(`Remanescentes após limpeza: ${depois.length}`);

// Fixture de escola que tenha sobrado de execuções anteriores
const escolas = await sql(`select id, name from sports_schools where name like '%S20' order by name;`);
console.log(`Escolas %S20 remanescentes: ${escolas.length}`);
if (escolas.length > 0) {
  for (const e of escolas) console.log(`  ${e.name}  ${e.id}`);
  await sql(`delete from staff_schools where school_id in (select id from sports_schools where name like '%S20');`);
  await sql(`delete from supervision_responses where request_id in (select id from supervision_requests where school_id in (select id from sports_schools where name like '%S20'));`);
  await sql(`delete from supervision_requests where school_id in (select id from sports_schools where name like '%S20');`);
  await sql(`delete from sports_schools where name like '%S20';`);
  const escolasDepois = await sql(`select count(*)::int as n from sports_schools where name like '%S20';`);
  console.log(`Escolas %S20 após limpeza: ${escolasDepois[0].n}`);
}

if (depois.length > 0) {
  console.error('LIMPEZA_INCOMPLETA');
  process.exit(1);
}
console.log('LIMPEZA_OK');
