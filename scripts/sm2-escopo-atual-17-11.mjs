// SM-2 / briefing «Secretaria Municipal», ETAPA 1 — COMO É QUE HOJE O ESCOPO POR ESCOLA É APLICADO.
// Zero escrita no banco. Descobre, sem assumir nomes:
//   (a) as chaves estrangeiras de `staff_schools` (a primeira versão deste inventário fez
//       `ss.profile_id = profiles.id` e obteve `vinculos = 0` para TODOS os papéis — o `0` era da minha
//       suposição, não do banco: `staff_schools` tem 6 linhas e `student_school_profiles` tem 848);
//   (b) as políticas RLS das tabelas que o módulo municipal vai ler, tratando o papel PUBLIC pelo oid 0
//       (ele NÃO aparece em `pg_roles`, pelo que um filtro por `rolname='public'` dá sempre zero);
//   (c) o que as expressões `using` dizem sobre atravessar escolas.
import { existsSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const OUT = 'evidence/sm2-escopo-atual-17-11b.json';
if (existsSync(OUT)) { console.log(`VERMELHO  já existe ${OUT} — correr com outro nome`); process.exit(1); }

const q = async (nome, query) => {
  try { const r = await sql(query); return { nome, ok: true, linhas: r.length, dados: r }; }
  catch (e) { return { nome, ok: false, erro: String(e.message).slice(0, 300) }; }
};

const ALVO = ['schools', 'students', 'classes', 'profiles', 'staff_schools', 'student_school_profiles',
  'supervision_requests', 'supervision_responses', 'supervision_alerts', 'supervision_action_plans',
  'secretary_requests', 'secretary_profile_change_requests', 'school_documents', 'announcements',
  'attendance', 'grades', 'access_requests'];

const respostas = [];
respostas.push(await q('fk_de_staff_schools', `select kcu.column_name, ccu.table_name as tabela_referida, ccu.column_name as coluna_referida
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
  join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public' and tc.table_name in ('staff_schools','student_school_profiles','supervision_requests','secretary_requests')
  order by tc.table_name, kcu.column_name`));
respostas.push(await q('forma_de_student_school_profiles', `select column_name, data_type from information_schema.columns
  where table_schema='public' and table_name='student_school_profiles' order by ordinal_position`));
respostas.push(await q('politicas_das_tabelas_alvo', `select c.relname as tabela, p.polname as politica, p.polcmd as cmd,
       (p.polroles @> array[0::oid]) as para_public,
       array_agg(r.rolname order by r.rolname) filter (where r.rolname is not null) as papeis,
       pg_get_expr(p.polqual, p.polrelid) as using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    left join unnest(p.polroles) with ordinality as rl(oid, ord) on true
    left join pg_roles r on r.oid = rl.oid
    where c.relname = any(array[${ALVO.map((t) => `'${t}'`).join(',')}])
    group by c.relname, p.polname, p.polrelid, p.polcmd, p.polroles, p.polqual, p.polwithcheck
    order by c.relname, p.polname`));
// A descoberta que obriga a esta pergunta: o `fk_de_staff_schools` abaixo devolve, nas tabelas que ligam
// utilizador a escola, `school_id -> sports_schools` e NÃO `-> schools`. Ou seja, podem coexistir duas
// superfícies «escola»; sem medir linhas e colunas de cada uma, qualquer «total de escolas da rede» é chute.
respostas.push(await q('tabelas_de_escola', `select 'schools' as tabela, count(*)::int as linhas from public.schools
    union all select 'sports_schools', count(*)::int from public.sports_schools
    union all select 'sports_public_schools', count(*)::int from public.sports_public_schools
    union all select 'staff_schools', count(*)::int from public.staff_schools
    union all select 'student_school_profiles', count(*)::int from public.student_school_profiles`));
respostas.push(await q('colunas_das_tabelas_de_escola', `select table_name, column_name, data_type from information_schema.columns
    where table_schema='public' and table_name in ('schools','sports_schools','sports_public_schools') order by table_name, ordinal_position`));
respostas.push(await q('a_chave_escola_aponta_para_onde', `select tc.table_name as tabela, kcu.column_name as coluna, ccu.table_name as referida, ccu.column_name as referida_coluna
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public' and kcu.column_name = 'school_id'
    order by ccu.table_name, tc.table_name`));
respostas.push(await q('tabela_tem_rls', `select c.relname as tabela, c.relrowsecurity as rls_forcada, c.relhasrules as regras,
       (select count(*)::int from pg_policy p where p.polrelid = c.oid) as n_politicas
    from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname='public'
    where c.relname = any(array[${ALVO.map((t) => `'${t}'`).join(',')}]) and c.relkind = 'r' order by 1`));
respostas.push(await q('views_e_suas_definicoes_alvo', `select v.table_name as view, string_agg(c.column_name, ', ' order by c.ordinal_position) as colunas
    from information_schema.views v join information_schema.columns c on c.table_name = v.table_name and c.table_schema = v.table_schema
    where v.table_schema='public' and (v.view_definition ~* 'school' or v.view_definition ~* 'supervision' or v.view_definition ~* 'secretar')
    group by v.table_name order by 1`));

const escolas = (respostas.find((r) => r.nome === 'tabelas_de_escola') || {}).dados || [];
const chaveEscola = (respostas.find((r) => r.nome === 'a_chave_escola_aponta_para_onde') || {}).dados || [];
const falhas = respostas.filter((r) => !r.ok).map((r) => `${r.nome}: ${r.erro}`);
const pols = (respostas.find((r) => r.nome === 'politicas_das_tabelas_alvo') || {}).dados || [];
const comRls = (respostas.find((r) => r.nome === 'tabela_tem_rls') || {}).dados || [];
const usaEscolaNaPolitica = pols.filter((p) => /staff_schools|student_school_profiles|sports_schools|schools|school_id/.test(String(p.using_expr || '') + ' ' + String(p.check_expr || '')));
const publicas = pols.filter((p) => p.para_public);

const diario = {
  programa: 'scripts/sm2-escopo-atual-17-11.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  o_que_prova: 'as chaves estrangeiras reais de `staff_schools`/`student_school_profiles`/`supervision_requests`/`secretary_requests`, o estado de RLS forçado e o nº de políticas por tabela alvo, e as expressões `using`/`with check` que hoje decidem se um papel lê uma só escola ou a rede inteira — com PUBLIC detectado pelo oid 0, não pelo nome',
  o_que_NAO_prova: 'nada sobre a interface nem sobre o que o ar devolve para cada papel; isto é catálogo. Provar «o secretário municipal atravessa escolas» exige chamada autenticada, que não é deste instrumento.',
  resumo: {
    tabelas_alvo: ALVO.length,
    tabelas_com_rls_forcada: comRls.filter((t) => t.rls_forcada).length,
    tabelas_sem_rls: comRls.filter((t) => !t.rls_forcada).map((t) => t.tabela),
    politicas_nas_alvo: pols.length,
    politicas_de_public: publicas.length,
    politicas_que_citam_escola: usaEscolaNaPolitica.length,
    por_tabela: Object.fromEntries(comRls.map((t) => [t.tabela, t.n_politicas])),
    linhas_das_tabelas_de_escola: Object.fromEntries(escolas.map((e) => [e.tabela, e.linhas])),
    tabela_referida_pela_chave_school_id: [...new Set(chaveEscola.map((c) => c.referida))],
    tabelas_que_referem_schools: [...new Set(chaveEscola.filter((c) => c.referida === 'schools').map((c) => c.tabela))],
    tabelas_que_referem_sports_schools: [...new Set(chaveEscola.filter((c) => c.referida === 'sports_schools').map((c) => c.tabela))],
    falhas
  },
  respostas
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(JSON.stringify(diario.resumo, null, 1));
console.log('FK', JSON.stringify((respostas.find((r) => r.nome === 'fk_de_staff_schools') || {}).dados));
console.log('COLUNAS SCHOOL_ID ->', JSON.stringify(chaveEscola.map((c) => `${c.tabela}.${c.coluna}->${c.referida}.${c.referida_coluna}`)));
const porTabelaResumo = {};
for (const p of pols) {
  const t = p.tabela;
  porTabelaResumo[t] = porTabelaResumo[t] || { n: 0, citam_escola: 0, funcoes: new Set(), papeis: new Set(), public: 0 };
  const o = porTabelaResumo[t];
  o.n++;
  if (/staff_schools|student_school_profiles|sports_schools|schools|school_id/.test(String(p.using_expr || ''))) o.citam_escola++;
  if (p.para_public) o.public++;
  for (const f of String(p.using_expr || '').matchAll(/bfr_rls_[a-z_]+/g)) o.funcoes.add(f[0]);
  for (const r of p.papeis || []) o.papeis.add(r);
}
console.log('RESUMO POR TABELA');
for (const [t, o] of Object.entries(porTabelaResumo))
  console.log(` - ${t}: n=${o.n} citam_escola=${o.citam_escola} public=${o.public} funcoes=[${[...o.funcoes].join(',')}] papeis=[${[...o.papeis].join(',')}]`);
console.log('TEXTOS COMPLETOS DE schools, supervision_requests, staff_schools');
for (const p of pols.filter((x) => ['schools', 'supervision_requests', 'staff_schools'].includes(x.tabela)))
  console.log(` * ${p.tabela} | ${p.politica} | cmd=${p.cmd} | public=${p.para_public} | papeis=${JSON.stringify(p.papeis)}\n     using=${p.using_expr}\n     check=${p.check_expr}`);
console.log(falhas.length ? 'ESCOPO_COM_FALHAS ' + JSON.stringify(falhas) : `ESCOPO_OK ${pols.length} políticas nas ${ALVO.length} tabelas alvo, ${publicas.length} de PUBLIC, ${usaEscolaNaPolitica.length} citam a chave de escola`);
process.exit(falhas.length ? 1 : 0);
