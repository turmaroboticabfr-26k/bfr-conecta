// AG-6 recon 3 (SÓ LEITURA): corpo de set_profile_role (o que ele escreve, para a baseline cobrir
// tudo) + escolha do professor da grade com mais ocorrências reais + rótulos do enum.
import { readFileSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
};
console.log('=== set_profile_role ===');
const f = await sql(`select p.proname, pg_get_function_arguments(p.oid) args, p.prosecdef, l.prosrc from pg_proc p join pg_proc l on l.oid=p.oid where p.proname='set_profile_role';`);
console.log(JSON.stringify(f.map(x => ({ args: x.args, prosecdef: x.prosecdef })), null, 1));
console.log((f[0]?.prosrc || '').slice(0, 2600));
console.log('\n=== rótulos do enum account_role ===');
console.log((await sql(`select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='account_role' order by e.enumsortorder;`)).map(x => x.enumlabel).join(' '));
console.log('\n=== professores com mais entries na versão publicada ===');
console.log(JSON.stringify(await sql(`select d.id, d.display_name, d.profile_id, d.active, count(e.id)::int as entries, count(distinct e.class_id)::int as turmas, count(distinct e.subject_id)::int as disciplinas from public.bfr_teacher_directory d join public.bfr_schedule_entries e on e.teacher_id=d.id where e.version_id='430db726-8a48-4ec8-a6ff-27e05160a420' group by 1,2,3,4 order by entries desc limit 6;`), null, 1));
console.log('\n=== request_status + quem chama on_submit_access_request ===');
console.log(JSON.stringify(await sql(`select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='request_status' order by e.enumsortorder;`)));
console.log('\n=== gatilhos em profiles (o que dispara quando role muda) ===');
console.log(JSON.stringify(await sql(`select tgname from pg_trigger where tgrelid='public.profiles'::regclass and not tgisinternal;`)));
