// Sonda somente-leitura: mecanismo do DELETE de auth.users (cascade × triggers) e
// dono do support_requests vivo. 0 escrita.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5f-rm68-delete-mecanismo-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard.`);
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};
const out = { em: new Date().toISOString() };
out.requester_perfil = await sql(`
  select p.id, p.email, p.role::text
    from public.profiles p
   where p.id = (select requester_id from public.support_requests limit 1);`);
out.fk_profiles_para_auth = await sql(`
  select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
   where conrelid = 'public.profiles'::regclass and contype = 'f';`);
out.triggers_auth_users = await sql(`
  select t.tgname, pg_get_triggerdef(t.oid) as def
    from pg_trigger t
   where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
   order by t.tgname;`);
out.fks_que_apontam_para_profiles = await sql(`
  select conrelid::regclass::text as tabela, conname,
         pg_get_constraintdef(oid) as def
    from pg_constraint
   where contype = 'f' and confrelid = 'public.profiles'::regclass
   order by 1;`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5F_MECANISMO_ESCRITO');
