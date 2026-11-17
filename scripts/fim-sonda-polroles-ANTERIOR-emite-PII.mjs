// Sonda de 20 linhas, somente leitura: como é que o pg_policy deste build representa
// «todas as políticas» na coluna polroles — array VAZIO ou NULL?
// (cardinality(NULL) é NULL e NULL = 0 não é verdadeiro: foi assim que a passada
//  fim-ciclo-recon-15-11 devolveu 0 PUBLIC contra 11 do artefacto.)
import { readFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const tok = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `select c.relname as t, p.polname, p.polroles is null as roles_null,
                   coalesce(cardinality(p.polroles),-1) as n_roles,
                   p.polroles::text as roles_text
              from pg_policy p join pg_class c on c.oid = p.polrelid
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname='public'
               and c.relname = any(array['grades','attendance','access_requests','occurrences'])
             order by c.relname, p.polname;`,
  }),
});
const rows = await r.json();
console.log(`HTTP ${r.status}  linhas=${rows.length}`);
const porEstado = {};
for (const x of rows) {
  const k = `null=${x.roles_null} n=${x.n_roles} texto=${x.roles_text}`;
  porEstado[k] = (porEstado[k] || 0) + 1;
}
for (const [k, n] of Object.entries(porEstado)) console.log(`  ${String(n).padStart(3)}  ${k}`);
const publicasNull = rows.filter((x) => x.roles_null).length;
const publicasEmpty = rows.filter((x) => x.n_roles === 0).length;
console.log(`PUBLIC por NULL=${publicasNull}  por array_vazio=${publicasEmpty}  total=${rows.length}`);

// 2.ª pergunta, mesma sondagem: de quem são as 9 linhas de supervision_audit?
// (memória dizia 6 residuais das s17-*; o degrau 3 deixou 8 de uma limpeza própria.)
const q2 = async (query) => {
  const rr = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await rr.text();
  if (!rr.ok) throw new Error(`HTTP ${rr.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
};
const audit = await q2(`
  select coalesce(split_part(u.email,'@',1),'(sem perfil ou perfil apagado)') as conta,
         coalesce(p.role::text,'-') as papel, count(*)::int as n
    from public.supervision_audit a
    left join public.profiles p on p.id = a.profile_id
    left join auth.users u on u.id = a.profile_id
   group by 1, 2 order by n desc, conta;`);
console.log('SUPERVISION_AUDIT por conta:');
for (const a of audit) console.log(`  ${String(a.n).padStart(3)}  ${a.conta}  papel=${a.papel}`);
