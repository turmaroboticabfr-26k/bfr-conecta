// Reset de estado do ensaio (nao da fixture): apaga posicoes e carimbos dos 3 alunos
// sinteticos para o ensaio poder recomecar do zero. Nao toca em sharing/turma/alunos.
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const fx = JSON.parse(readFileSync('pf-throttle-fixture.json', 'utf8'));
const IDS = [fx.ids.alunoA, fx.ids.alunoB, fx.ids.alunoC].join("','");

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 900)}`);
  try { return JSON.parse(t); } catch { return []; }
}
const mede = () => sql(`
select (select count(*)::int from public.student_locations) as posicoes,
       (select count(*)::int from public.student_location_notify_throttle) as carimbos,
       (select count(*)::int from public.student_location_report_throttle) as trava30,
       (select count(*)::int from net._http_response) as net_total
`);

const antes = await mede();
await sql(`
begin;
delete from public.student_locations where student_id in ('${IDS}');
delete from public.student_location_notify_throttle where student_id in ('${IDS}');
commit;
`);
const depois = await mede();
const sobra = await sql(`
select 'locs' as t, count(*)::int as n from public.student_locations
union all select 'carimbos', count(*)::int from public.student_location_notify_throttle
union all select 'sharing', count(*)::int from public.student_location_sharing
union all select 'alunos_fixture', count(*)::int from public.students where id in ('${IDS}')
`);
const out = { quando: new Date().toISOString(), antes: antes[0], depois: depois[0], sobra: sobra, };
writeFileSync('pf-throttle-reset.json', JSON.stringify(out, null, 2) + '\n');
console.log('antes:', JSON.stringify(antes[0]));
console.log('depois:', JSON.stringify(depois[0]));
console.log('sobra:', JSON.stringify(sobra));
console.log(depois[0].posicoes === 0 && depois[0].carimbos === 0 && sobra[3].n === 3
  ? 'PF_THROTTLE_RESET_OK' : 'PF_THROTTLE_RESET_FALHOU');
