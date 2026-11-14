// C2-R dry-run — candidata 42P17 (ciclo de policies profiles <-> staff_schools/students).
// Uma chamada HTTP = uma transação: snapshot do deparse VIVO -> fixture -> sondas ANTES
// (controle do defeito) -> candidata -> sondas DEPOIS -> oráculo de escopo -> reversão da
// candidata -> snapshot comparado com o antes -> rollback total.
// Depois, uma chamada fresca prova que nada ficou e que o deparse vivo voltou ao texto medido.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, stage, criarGates } from './c2-lib.mjs';

const STAFF_A = 'aaaaaaaa-0000-4000-8000-00000000c401'; // director, Escola Alpha
const STAFF_B = 'aaaaaaaa-0000-4000-8000-00000000c402'; // director, Escola Beta
const DEV = 'aaaaaaaa-0000-4000-8000-00000000c403';     // developer, sem staff_schools
const STU_PROF = 'aaaaaaaa-0000-4000-8000-00000000c404'; // perfil do aluno (Alpha)
const GUARD = 'aaaaaaaa-0000-4000-8000-00000000c405';  // responsável do aluno (Alpha)
const GATE = 'aaaaaaaa-0000-4000-8000-00000000c406';   // porteiro
const TURMA = 'aaaaaaaa-0000-4000-8000-00000000c407';
const ALUNO = 'aaaaaaaa-0000-4000-8000-00000000c408';
const SS_A = 'aaaaaaaa-0000-4000-8000-00000000c411';
const SS_B = 'aaaaaaaa-0000-4000-8000-00000000c412';
// classes/students apontam para schools; staff_schools aponta para sports_schools.
// Só estes três ids existem nas DUAS tabelas — qualquer fixture que misture as duas
// pontas tem de usar um id compartilhado, senão o INSERT da turma cai em 23503.
const ALPHA = '08ebef62-2193-4520-ab44-c044160d565f'; // Escola Municipal Alpha
const BETA = '0f51bc67-9987-483d-aba0-f138b2b7580e';  // Escola Municipal Beta

const candidata = readFileSync(`${DIR}/sql/c2r-42p17-candidate.sql`, 'utf8');
const reversao = readFileSync(`${DIR}/sql/c2r-42p17-rollback.sql`, 'utf8');
const ciclo = JSON.parse(readFileSync(`${DIR}/docs/c2r-policies-ciclo.json`, 'utf8'));
const N_CICLO = ciclo.policies.length; // profiles_read + as 6 de staff_schools

// só-leitura: quais tabelas candidatas realmente existem (o censo das policies que citam profiles)
const CAND_TABELAS = ['profiles', 'staff_schools', 'students', 'guardian_students', 'gate_badges',
  'gate_checkins', 'occurrences', 'supervision_requests', 'director_routine_items', 'school_documents'];
const nomes = await sql(`select jsonb_agg(c.relname::text order by c.relname) as j
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and c.relname = any (array[${CAND_TABELAS.map((t) => `'${t}'`).join(',')}])`);
const tabelas = [...nomes[0].j, 'storage.objects'];
console.log('[0] tabelas sondadas:', tabelas.join(' '));

const baseline = await sql(`select jsonb_build_object(
 'profiles', (select count(*)::int from public.profiles),
 'staff_schools', (select count(*)::int from public.staff_schools),
 'students', (select count(*)::int from public.students),
 'classes', (select count(*)::int from public.classes),
 'guardian_students', (select count(*)::int from public.guardian_students),
 'gate_checkins', (select count(*)::int from public.gate_checkins),
 'route_incidents', (select count(*)::int from public.route_incidents),
 'student_messages', (select count(*)::int from public.student_messages),
 'gate_entry_alerts', (select count(*)::int from public.gate_entry_alerts),
 'contas_vivas', (select count(*)::int from auth.users where email like '%@bfr-conecta.test'),
 'fn_oraculo', (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'bfr_profile_in_my_schools' and n.nspname = 'public'),
 'md5_vivo', (select md5(string_agg(n.nspname || '.' || c.relname || '.' || p.polname || '|'
     || coalesce(pg_get_expr(p.polqual, p.polrelid), '<nulo>') || '|'
     || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '<nulo>'), '' order by 1))
   from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and ((c.relname = 'profiles' and p.polname = 'profiles_read') or c.relname = 'staff_schools'))
) as j`);
const b = baseline[0].j;
console.log('[0] baseline:', JSON.stringify(b));

// só-leitura: as duas pontas de escola têm de apontar para o mesmo id vivo.
const esc = await sql(`select jsonb_build_object(
 'schools', (select coalesce(jsonb_agg(id::text order by id::text), '[]'::jsonb) from public.schools
              where id = any (array['${ALPHA}'::uuid, '${BETA}'::uuid])),
 'sports_schools', (select coalesce(jsonb_agg(id::text order by id::text), '[]'::jsonb) from public.sports_schools
              where id = any (array['${ALPHA}'::uuid, '${BETA}'::uuid]))
) as j`);
const esj = esc[0].j;
console.log('[0] escolas nas duas tabelas:', JSON.stringify(esj));
if (esj.schools.length !== 2 || esj.sports_schools.length !== 2) {
  console.log('C2R_42P17_DRYRUN_PAROU: os ids de escola da fixture não existem nas duas tabelas '
    + '(classes/students -> schools, staff_schools -> sports_schools).');
  process.exit(1);
}

const sondaSelects = tabelas.map((t) => `('${t}', 'select count(*) from ${t}')`);
const sondaInsert = `('INSERT gate_checkins', 'insert into public.gate_checkins (student_id, class_id, gatekeeper_id, direction, checked_at, source, entry_status, guardian_present) `
  + `values (''${ALUNO}''::uuid, ''${TURMA}''::uuid, ''${GATE}''::uuid, ''entry'', now(), ''manual'', ''allowed'', false)')`;

const sondaBloco = `
do $do$
declare p record;
begin
  for p in select * from (values
           ${[...sondaSelects, sondaInsert].join(',\n           ')}
       ) t(nome, q) loop
    begin
      execute p.q;
      insert into t_probe values (current_setting('bfr.fase'), p.nome, 'VERDE');
    exception when others then
      insert into t_probe values (current_setting('bfr.fase'), p.nome, 'ERRO ' || sqlstate || ' ' || sqlerrm);
    end;
  end loop;
end
$do$;`;

const authInsert = (id, email) => `insert into auth.users (id, aud, role, email, email_confirmed_at, is_sso_user, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values ('${id}', 'authenticated', 'authenticated', '${email}', now(), false, '{}', '{}', now(), now());`;
const perfil = (id, email, role, nome) => `insert into public.profiles (id, email, role, full_name, created_at)
  values ('${id}', '${email}', '${role}'::account_role, '${nome}', now())
  on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;`;

const snap = (fase) => `insert into t_snap
select '${fase}', n.nspname || '.' || c.relname || '.' || p.polname,
       coalesce(pg_get_expr(p.polqual, p.polrelid), '<nulo>'),
       coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '<nulo>')
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and ((c.relname = 'profiles' and p.polname = 'profiles_read') or c.relname = 'staff_schools');`;

const fnProbe = (fase) => `insert into t_probe values ('${fase}', 'fn_oraculo',
  (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'bfr_profile_in_my_schools' and n.nspname = 'public'));`;

const cab = (sub, fase) => `
set local role authenticated;
set local request.jwt.claims = '{"sub":"${sub}","role":"authenticated"}';
set local request.jwt.claim.sub = '${sub}';
set local bfr.fase = '${fase}';`;

const orc = (caller, nome, expr) => `insert into t_orac values ('${caller}', '${nome}', (${expr})::text);`;

const txn = `
begin;

create temp table t_snap(fase text, chave text, qual text, chk text);
create temp table t_probe(fase text, nome text, res text);
create temp table t_orac(caller text, nome text, val text);
grant insert on t_snap, t_probe, t_orac to authenticated;

${snap('antes')}
${fnProbe('cat')}

-- fixture (postgres = BYPASSRLS)
${[STAFF_A, STAFF_B, DEV, STU_PROF, GUARD, GATE].map((id, i) => authInsert(id, `c4r-f${i}-dry@bfr-conecta.test`)).join('\n')}
${perfil(STAFF_A, 'c4r-f0-dry@bfr-conecta.test', 'director', 'C4R Staff Alpha')}
${perfil(STAFF_B, 'c4r-f1-dry@bfr-conecta.test', 'director', 'C4R Staff Beta')}
${perfil(DEV, 'c4r-f2-dry@bfr-conecta.test', 'developer', 'C4R Dev')}
${perfil(STU_PROF, 'c4r-f3-dry@bfr-conecta.test', 'student', 'C4R Aluno Perfil')}
${perfil(GUARD, 'c4r-f4-dry@bfr-conecta.test', 'parent', 'C4R Responsavel')}
${perfil(GATE, 'c4r-f5-dry@bfr-conecta.test', 'gatekeeper', 'C4R Porteiro')}
insert into public.staff_schools (id, profile_id, school_id, role, created_at, updated_at)
  values ('${SS_A}', '${STAFF_A}', '${ALPHA}', 'director', now(), now()),
         ('${SS_B}', '${STAFF_B}', '${BETA}', 'director', now(), now());
insert into public.classes (id, year, class_code, shift, school_id) values ('${TURMA}', 2099, 'C4R', 'morning', '${ALPHA}');
insert into public.students (id, official_name, class_id, active, created_at, school_id, student_profile_id)
  values ('${ALUNO}', 'C4R Aluno Seco', '${TURMA}', true, now(), '${ALPHA}', '${STU_PROF}');
insert into public.guardian_students (profile_id, student_id, relationship) values ('${GUARD}', '${ALUNO}', 'responsável');

-- rodada 1: ANTES da candidata (controle do defeito)
${cab(STAFF_A, 'antes')}
${sondaBloco}
reset role;

-- candidata
${candidata}
${snap('cand')}
${fnProbe('cat_cand')}

-- rodada 2: DEPOIS da candidata
${cab(STAFF_A, 'cand')}
${sondaBloco}
${orc('staffA', 've_staff_da_mesma_escola', `public.bfr_profile_in_my_schools('${STAFF_A}')`)}
${orc('staffA', 've_staff_de_outra_escola', `public.bfr_profile_in_my_schools('${STAFF_B}')`)}
${orc('staffA', 've_dev_sem_vinculo', `public.bfr_profile_in_my_schools('${DEV}')`)}
${orc('staffA', 've_perfil_aluno_da_escola', `public.bfr_profile_in_my_schools('${STU_PROF}')`)}
${orc('staffA', 've_responsavel_do_aluno', `public.bfr_profile_in_my_schools('${GUARD}')`)}
${orc('staffA', 'is_developer', `public.is_developer()`)}
reset role;

-- caller = staff da Beta (negativo cross-school)
${cab(STAFF_B, 'cand')}
${orc('staffB', 've_perfil_aluno_da_alpha', `public.bfr_profile_in_my_schools('${STU_PROF}')`)}
${orc('staffB', 've_staff_da_mesma_escola', `public.bfr_profile_in_my_schools('${STAFF_B}')`)}
reset role;

-- caller = developer
${cab(DEV, 'cand')}
${orc('dev', 'is_developer', `public.is_developer()`)}
reset role;

-- reversão da candidata
${reversao}
${snap('rb')}
${fnProbe('cat_rb')}

select jsonb_build_object(
 'md5_antes', (select md5(string_agg(chave || '|' || qual || '|' || chk, '' order by chave)) from t_snap where fase = 'antes'),
 'md5_cand',  (select md5(string_agg(chave || '|' || qual || '|' || chk, '' order by chave)) from t_snap where fase = 'cand'),
 'md5_rb',    (select md5(string_agg(chave || '|' || qual || '|' || chk, '' order by chave)) from t_snap where fase = 'rb'),
 'n_antes',   (select count(*)::int from t_snap where fase = 'antes'),
 'n_rb',      (select count(*)::int from t_snap where fase = 'rb'),
 'sondas',    (select jsonb_agg(jsonb_build_object('fase', fase, 'nome', nome, 'res', res) order by fase, nome) from t_probe),
 'oraculos',  (select jsonb_agg(jsonb_build_object('caller', caller, 'nome', nome, 'val', val) order by caller, nome) from t_orac),
 'antes',     (select jsonb_agg(jsonb_build_object('chave', chave, 'qual', qual, 'chk', chk) order by chave) from t_snap where fase = 'antes'),
 'rb',        (select jsonb_agg(jsonb_build_object('chave', chave, 'qual', qual, 'chk', chk) order by chave) from t_snap where fase = 'rb')
) as j;

rollback;
`;

console.log('[1] dry-run transacional');
const linhas = await sql(txn);
const j = linhas[0].j;

const { gate, resumo } = criarGates();
const sondas = j.sondas;
const res = (fase, nome) => (sondas.find((s) => s.fase === fase && s.nome === nome) || {}).res || 'AUSENTE';
const p17 = (fase) => sondas.filter((s) => s.fase === fase && /42P17/.test(s.res)).length;
const errosOutros = (fase) => sondas.filter((s) => s.fase === fase && /^ERRO/.test(s.res) && !/42P17|42501/.test(s.res));
const orcVal = (caller, nome) => (j.oraculos.find((o) => o.caller === caller && o.nome === nome) || {}).val;

console.log('\n[2] sondas ANTES da candidata (controle do defeito):');
sondas.filter((s) => s.fase === 'antes').forEach((s) => console.log(`      ${s.nome}: ${s.res}`));
console.log('[3] sondas DEPOIS da candidata:');
sondas.filter((s) => s.fase === 'cand').forEach((s) => console.log(`      ${s.nome}: ${s.res}`));
console.log('[4] oráculo de escopo:');
j.oraculos.forEach((o) => console.log(`      ${o.caller} :: ${o.nome} = ${o.val}`));

gate(`snapshot antes tem as ${N_CICLO} policies do ciclo`, j.n_antes, N_CICLO);
gate('md5 do snapshot antes == md5 vivo medido fora da txn', j.md5_antes, b.md5_vivo);
gate('controle do defeito: existia 42P17 nas sondas antes', p17('antes') > 0, true);
gate('candidata: zero 42P17 nas sondas', p17('cand'), 0);
gate('candidata: zero erro que não seja 42P17/42501', errosOutros('cand').length, 0);
gate('candidata: INSERT direto em gate_checkins passa a dar 42501 (design)', /^ERRO 42501/.test(res('cand', 'INSERT gate_checkins')), true);
gate('oráculo criado pela candidata', res('cat_cand', 'fn_oraculo'), '1');
gate('oráculo: staff da Alpha vê staff da própria escola', orcVal('staffA', 've_staff_da_mesma_escola'), 'true');
gate('oráculo: staff da Alpha NÃO vê staff da Beta', orcVal('staffA', 've_staff_de_outra_escola'), 'false');
gate('oráculo: staff da Alpha NÃO vê developer sem vínculo', orcVal('staffA', 've_dev_sem_vinculo'), 'false');
gate('oráculo: staff da Alpha vê perfil do aluno da escola', orcVal('staffA', 've_perfil_aluno_da_escola'), 'true');
gate('oráculo: staff da Alpha vê responsável do aluno', orcVal('staffA', 've_responsavel_do_aluno'), 'true');
gate('oráculo: staff da Beta NÃO vê aluno da Alpha', orcVal('staffB', 've_perfil_aluno_da_alpha'), 'false');
gate('oráculo: staff da Beta vê staff da própria escola', orcVal('staffB', 've_staff_da_mesma_escola'), 'true');
gate('is_developer: staff = false', orcVal('staffA', 'is_developer'), 'false');
gate('is_developer: developer = true', orcVal('dev', 'is_developer'), 'true');
gate('candidata mudou o deparse (md5_cand != md5_antes)', j.md5_cand !== j.md5_antes, true);
gate(`reversão: snapshot com as ${N_CICLO} policies`, j.n_rb, N_CICLO);
gate('reversão: deparse idêntico ao estado vivo', j.md5_rb, j.md5_antes);
gate('reversão removeu a função oráculo', res('cat_rb', 'fn_oraculo'), '0');

if (j.md5_rb !== j.md5_antes) {
  const a = Object.fromEntries(j.antes.map((t) => [t.chave, `${t.qual}##${t.chk}`]));
  const r = Object.fromEntries(j.rb.map((t) => [t.chave, `${t.qual}##${t.chk}`]));
  console.log('\nDIFF da reversão (só onde divergir):');
  new Set([...Object.keys(a), ...Object.keys(r)]).forEach((k) => {
    if (a[k] !== r[k]) console.log(`  ${k}\n    vivo: ${a[k]}\n    rb  : ${r[k]}`);
  });
}

console.log('\n[5] chamada fresca: nada sobreviveu ao rollback');
const pos = await sql(`select jsonb_build_object(
 'profiles', (select count(*)::int from public.profiles),
 'staff_schools', (select count(*)::int from public.staff_schools),
 'students', (select count(*)::int from public.students),
 'classes', (select count(*)::int from public.classes),
 'guardian_students', (select count(*)::int from public.guardian_students),
 'gate_checkins', (select count(*)::int from public.gate_checkins),
 'route_incidents', (select count(*)::int from public.route_incidents),
 'student_messages', (select count(*)::int from public.student_messages),
 'gate_entry_alerts', (select count(*)::int from public.gate_entry_alerts),
 'contas_vivas', (select count(*)::int from auth.users where email like '%@bfr-conecta.test'),
 'fn_oraculo', (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'bfr_profile_in_my_schools' and n.nspname = 'public'),
 'md5_vivo', (select md5(string_agg(n.nspname || '.' || c.relname || '.' || p.polname || '|'
     || coalesce(pg_get_expr(p.polqual, p.polrelid), '<nulo>') || '|'
     || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '<nulo>'), '' order by 1))
   from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and ((c.relname = 'profiles' and p.polname = 'profiles_read') or c.relname = 'staff_schools'))
) as j`);
const p = pos[0].j;
console.log('  pós:', JSON.stringify(p));
Object.keys(b).forEach((k) => {
  if (k !== 'md5_vivo') gate(`pós: ${k} == baseline (${b[k]})`, p[k], b[k]);
});
gate('pós: md5 do deparse vivo inalterado', p.md5_vivo, b.md5_vivo);

const { portoes, falhas } = resumo();
writeFileSync(`${DIR}/docs/c2r-42p17-dryrun.json`, JSON.stringify({ em: new Date().toISOString(), n_ciclo: N_CICLO, tabelas, baseline: b, j, pos: p, portoes, falhas }, null, 2) + '\n');
stage('42p17-dryrun', { portoes, falhas: falhas.length });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2R_42P17_DRYRUN_PAROU' : 'C2R_42P17_DRYRUN_OK');
if (falhas.length) process.exit(1);
