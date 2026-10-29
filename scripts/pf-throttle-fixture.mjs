// Fixture do ensaio do THROTTLE — turma 2099 + 3 alunos + sharing A/B para a conta-aparelho.
// Aluno C fica SEM sharing (caso T5: sem destinatario nao gasta janela).
// O SELECT de verificacao fica DENTRO da transacao: no dry-run ele e avaliado e depois
// desfeito pelo rollback, entao a prova e dupla (executa + nao deixa rastro).
// Artefatos: pf-throttle-fixture-dryrun.json / pf-throttle-fixture.json
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const ALVO = '19bc8c0e-5b1c-4e73-a765-80ea58911315';

const CLASSE = 'aa10c001-0000-4000-8000-000000002099';
const A = 'aa10c00a-0000-4000-8000-000000002099';
const B = 'aa10c00b-0000-4000-8000-000000002099';
const C = 'aa10c00c-0000-4000-8000-000000002099';

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 900)}`);
  try { return JSON.parse(t); } catch { return []; }
}

const VERIFY = `
select s.official_name as nome,
       case s.id when '${A}' then 'A' when '${B}' then 'B' when '${C}' then 'C' end as aluno,
       (select count(*)::int from public.student_location_sharing sh
         where sh.student_id = s.id and sh.enabled and sh.profile_id = '${ALVO}') as sharing_ativo,
       (select count(*)::int from public.student_locations l where l.student_id = s.id) as posicao,
       (select count(*)::int from public.student_location_notify_throttle t where t.student_id = s.id) as carimbo
from public.students s
where s.class_id = '${CLASSE}'
order by aluno;
`;

const FIX = `
begin;

insert into public.classes (id, year, class_code, shift)
values ('${CLASSE}', 2099, 'PF-THROTTLE-T9', 'manha');

insert into public.students (id, official_name, class_id)
values ('${A}', 'PF THROTTLE ALUNO A', '${CLASSE}'),
       ('${B}', 'PF THROTTLE ALUNO B', '${CLASSE}'),
       ('${C}', 'PF THROTTLE ALUNO C', '${CLASSE}');

insert into public.student_location_sharing (profile_id, student_id, enabled, precision_level)
values ('${ALVO}', '${A}', true, 'exact'),
       ('${ALVO}', '${B}', true, 'exact');
${VERIFY}
commit;
`;

const modo = process.argv[2] === 'aplicar' ? 'aplicar' : 'dry-run';
const corpo = modo === 'aplicar' ? FIX : FIX.replace(/\ncommit;\n/, '\nrollback;\n');
if (modo === 'dry-run' && corpo === FIX) throw new Error('dry-run: nao achei o commit para trocar por rollback');

const antes = await sql(`
select (select count(*)::int from public.classes where year=2099) as turma2099,
       (select count(*)::int from public.students where class_id='${CLASSE}') as alunos_fixture,
       (select count(*)::int from public.student_location_sharing) as sharing,
       (select count(*)::int from public.student_locations) as posicoes,
       (select count(*)::int from public.student_location_notify_throttle) as carimbos
`);

const dentro = await sql(corpo);
const depois = await sql(`
select (select count(*)::int from public.classes where year=2099) as turma2099,
       (select count(*)::int from public.students where class_id='${CLASSE}') as alunos_fixture,
       (select count(*)::int from public.student_location_sharing) as sharing,
       (select count(*)::int from public.student_locations) as posicoes,
       (select count(*)::int from public.student_location_notify_throttle) as carimbos
`);

const portoes = {};
function gate(nome, ok, detalhe) { portoes[nome] = { ok, detalhe }; if (!ok) throw new Error('PORTAO FALHO: ' + nome + ' :: ' + detalhe); }

gate('P1_dentro_da_transacao_tres_alunos', dentro.length === 3, JSON.stringify(dentro));
gate('P2_A_e_B_com_sharing_ativo', dentro.filter(r => r.sharing_ativo === 1).length === 2, JSON.stringify(dentro));
gate('P3_C_sem_sharing', dentro.some(r => r.aluno === 'C' && r.sharing_ativo === 0), JSON.stringify(dentro));
gate('P4_nenhum_carimbo_nem_posicao_na_fixture', dentro.every(r => r.posicao === 0 && r.carimbo === 0),
  JSON.stringify(dentro));
if (modo === 'dry-run') {
  gate('P5_dry_run_rollback_total', depois[0].alunos_fixture === 0 && depois[0].turma2099 === antes[0].turma2099
    && depois[0].sharing === antes[0].sharing, JSON.stringify({ antes: antes[0], depois: depois[0] }));
} else {
  gate('P5_aplicado_persistiu', depois[0].alunos_fixture === 3 && depois[0].sharing === antes[0].sharing + 2,
    JSON.stringify({ antes: antes[0], depois: depois[0] }));
}

const out = { quando: new Date().toISOString(), modo, alvo_aparelho: ALVO,
  ids: { turma: CLASSE, alunoA: A, alunoB: B, alunoC: C }, antes: antes[0], depois: depois[0],
  dentro_da_transacao: dentro, portoes };
const artefato = modo === 'aplicar' ? 'pf-throttle-fixture.json' : 'pf-throttle-fixture-dryrun.json';
writeFileSync(artefato, JSON.stringify(out, null, 2) + '\n');
console.log(`modo ${modo} | dentro:`, JSON.stringify(dentro));
console.log('antes:', JSON.stringify(antes[0]), 'depois:', JSON.stringify(depois[0]));
console.log(`portoes ${Object.keys(portoes).length}/5 ok=${Object.values(portoes).every(p => p.ok)}`);
console.log(modo === 'aplicar' ? 'PF_THROTTLE_FIXTURE_APLICADA_OK' : 'PF_THROTTLE_FIXTURE_DRYRUN_OK');
