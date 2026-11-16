// Reprodução diagnóstica: DELETE Admin API da conta ae5-director (nossa, ciclo AE5)
// com o corpo de erro COMPLETO, e antes um SELECT do auth.users correspondente.
// Autorizado pela limpeza do mint deste ciclo.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5g-rm68-delete-repro-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard.`);
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 500) }; }
  return { status: r.status, j, texto: t };
};
const email = 'ae5-director@bfr.test';
const out = { em: new Date().toISOString() };
const check = await admin(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
out.antes = { status: check.status, users: (check.j.users ?? []).map((u) => ({ id: u.id, email: u.email })) };
if (check.j.users?.length > 0) {
  const del = await admin(`/auth/v1/admin/users/${check.j.users[0].id}`, { method: 'DELETE' });
  out.delete = { status: del.status, corpo_completo: del.texto };
} else {
  out.delete = { status: 'sem-usuario' };
}
const depois = await admin(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
out.depois = { status: depois.status, n: depois.j.users?.length ?? -1 };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5G_REPRO_ESCRITO', JSON.stringify({ antes: out.antes.users?.length, del_status: out.delete.status, depois: out.depois.n }));
