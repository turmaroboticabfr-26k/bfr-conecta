// Leitura pura final do ciclo: corpo das respostas do pg_net deste ciclo + carimbos dos
// artefatos + md5 espaçados dos arquivos do ciclo (porta da casa: hash nunca por olho).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 900)}`);
  try { return JSON.parse(t); } catch { return []; }
}

const net = await sql(`
select id, status_code, error_msg, timed_out, created, content
from net._http_response where id >= 8 order by id
`);
for (const r of net) {
  console.log(`net ${r.id}: status ${r.status_code} erro ${r.error_msg} timed_out ${r.timed_out} criado ${r.created.slice(11, 23)}`);
  console.log(`   corpo: ${r.content}`);
}
const total = await sql(`select count(*)::int as n, count(*) filter (where status_code=200)::int as duzentos
                           from net._http_response`);
console.log('net total:', JSON.stringify(total[0]));
const resumo = await sql(`
select (select count(*)::int from public.student_locations) as posicoes,
       (select count(*)::int from public.student_location_notify_throttle) as carimbos,
       (select count(*)::int from public.student_location_sharing) as sharing,
       (select count(*)::int from public.students where class_id in (select id from public.classes where year=2099)) as alunos2099
`);
console.log('estado final do banco:', JSON.stringify(resumo[0]));

const esp = h => h.split('').join(' ');
for (const f of ['pf-throttle-candidate.sql', 'pf-throttle-original-function.sql',
                 'pf-throttle-gera.mjs', 'pf-throttle-aplica.mjs', 'pf-throttle-fixture.mjs',
                 'pf-throttle-ensaio.mjs', 'pf-throttle-limpeza.mjs']) {
  const b = readFileSync(f);
  const h = createHash('md5').update(b).digest('hex');
  console.log(`${f}: ${b.length} B md5 ${h} | ${esp(h)}`);
}
for (const f of ['pf-throttle-baseline.json', 'pf-throttle-fixture-dryrun.json', 'pf-throttle-fixture.json',
                 'pf-throttle-reset.json', 'pf-throttle-ensaio.json', 'pf-throttle-limpeza.json',
                 'pf-throttle-dry-run.json', 'pf-throttle-aplicar.json', 'pf-throttle-confere-aplicacao.json']) {
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    console.log(`${f}: quando ${j.quando}${j.modo ? ' modo ' + j.modo : ''}${j.ok !== undefined ? ' ok ' + j.ok : ''}` +
      `${j.contagem_portoes ? ' portoes ' + j.contagem_portoes : ''}`);
  } catch (e) { console.log(`${f}: AUSENTE (${e.code || e.message.slice(0, 40)})`); }
}
