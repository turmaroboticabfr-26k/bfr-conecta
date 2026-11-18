// SM-3 / briefing «Secretaria Municipal», ETAPA 1 — AS DUAS TABELAS DE ESCOLA E O QUE DECIDE «MUNICIPAL».
// Zero escrita. SM-2 provou pelo catálogo que `students.school_id`/`classes.school_id` -> `schools.id`
// enquanto `staff_schools.school_id`/`supervision_requests.school_id` -> `sports_schools.id`, ambas com 6
// linhas. Este instrumento responde a três perguntas que decidem o desenho do módulo municipal:
//   (1) os ids das duas tabelas são o MESMO espaço (senão o isolamento por escola do staff não bate com
//       os alunos, e nenhum agregado da rede é defensável);
//   (2) qual a abrangência real por papel, contada de uma só vez a partir de `profiles` x `staff_schools`
//       (a versão anterior, em `sm1-inventario-rede`, devolveu `vinculos = 0` para todos os papéis contra
//       uma tabela de 6 linhas — o zero era do meu join, não do banco; fica substituída por esta);
//   (3) o corpo de `bfr_is_education_supervisor()`: quem é «municipal» hoje e como se concede.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const OUT = 'evidence/sm3-duas-escolas-e-supervisor-17-11b.json';
if (existsSync(OUT)) { console.log(`VERMELHO  já existe ${OUT} — correr com outro nome`); process.exit(1); }

const q = async (nome, query) => {
  try { const r = await sql(query); return { nome, ok: true, linhas: r.length, dados: r }; }
  catch (e) { return { nome, ok: false, erro: String(e.message).slice(0, 400) }; }
};

const respostas = [];
respostas.push(await q('ids_das_duas_tabelas_de_escola', `select
    (select count(*)::int from public.schools) as linhas_schools,
    (select count(*)::int from public.sports_schools) as linhas_sports_schools,
    (select count(*)::int from public.schools s where exists (select 1 from public.sports_schools x where x.id = s.id)) as ids_compartilhados,
    (select count(*)::int from public.schools s where not exists (select 1 from public.sports_schools x where x.id = s.id)) as so_em_schools,
    (select count(*)::int from public.sports_schools s where not exists (select 1 from public.schools x where x.id = s.id)) as so_em_sports_schools`));
respostas.push(await q('nomes_e_cidades_lado_a_lado', `select s.id as id_schools, s.name as nome_schools, s.city as cidade_schools,
    ss.id as id_sports, ss.name as nome_sports, ss.city as cidade_sports, (s.id = ss.id) as mesmo_id
    from public.schools s left join public.sports_schools ss on ss.name = s.name order by 2`));
respostas.push(await q('abrangencia_real_por_papel', `select p.role::text as papel, count(distinct p.id)::int as perfis,
    count(ss.id)::int as vinculos_staff_schools, count(distinct ss.school_id)::int as escolas_distintas_no_vinculo
    from public.profiles p left join public.staff_schools ss on ss.profile_id = p.id
    group by p.role::text order by papel`));
respostas.push(await q('alunos_por_escola', `select sc.name as escola, sc.city as cidade, count(st.id)::int as alunos
    from public.schools sc left join public.students st on st.school_id = sc.id group by sc.name, sc.city order by alunos desc`));
respostas.push(await q('quem_tem_vinculo_e_em_que_tabela', `select p.role::text as papel, p.id, p.full_name, ss.school_id,
    (exists (select 1 from public.schools s where s.id = ss.school_id)) as bate_com_schools,
    (exists (select 1 from public.sports_schools s where s.id = ss.school_id)) as bate_com_sports_schools
    from public.staff_schools ss join public.profiles p on p.id = ss.profile_id order by papel`));
respostas.push(await q('corpo_das_funcoes_de_acesso', `select p.proname as funcao, pg_get_functiondef(p.oid) as definicao
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    where p.proname in ('bfr_is_education_supervisor','is_developer','bfr_rls_session_role','bfr_rls_is_developer','current_role')
    order by p.proname`));

const falhas = respostas.filter((r) => !r.ok).map((r) => `${r.nome}: ${r.erro}`);
const chave = (respostas.find((r) => r.nome === 'ids_das_duas_tabelas_de_escola') || {}).dados?.[0] || {};
const abrangencia = (respostas.find((r) => r.nome === 'abrangencia_real_por_papel') || {}).dados || [];
const funcoes = (respostas.find((r) => r.nome === 'corpo_das_funcoes_de_acesso') || {}).dados || [];
const vinculos = (respostas.find((r) => r.nome === 'quem_tem_vinculo_e_em_que_tabela') || {}).dados || [];

const diario = {
  programa: 'scripts/sm3-duas-escolas-e-supervisor-17-11.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  o_que_prova: 'se `schools.id` e `sports_schools.id` são o mesmo espaço de chaves (a sobreposição decide se o isolamento por escola do staff se aplica aos alunos); a abrangência real por papel contada de `profiles` x `staff_schools` numa única consulta; em qual das duas tabelas bate cada `staff_schools.school_id` existente; e o corpo SQL de `bfr_is_education_supervisor()` e companhia — isto é, o que hoje define «usuário municipal» no backend.',
  o_que_NAO_prova: 'nada sobre a interface nem sobre o que cada papel vê no ecrã; substitui o campo `abrangencia_por_papel` de `evidence/sm1-inventario-rede-17-11b.json`, cujo join devolveu `vinculos = 0` contra uma tabela de 6 linhas.',
  resumo: {
    chave: { ...chave, mesmo_espaco_de_ids: chave.ids_compartilhados === chave.linhas_schools && chave.so_em_schools === 0 && chave.so_em_sports_schools === 0 },
    abrangencia_por_papel: abrangencia,
    vinculos_batendo: {
      em_schools: vinculos.filter((v) => v.bate_com_schools).length,
      em_sports_schools: vinculos.filter((v) => v.bate_com_sports_schools).length,
      total: vinculos.length
    },
    funcoes_encontradas: funcoes.map((f) => f.funcao),
    supervisor_e_por_que: (funcoes.find((f) => f.funcao === 'bfr_is_education_supervisor') || {}).definicao || null,
    falhas
  },
  respostas
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');

console.log('CHAVE', JSON.stringify(diario.resumo.chave));
console.log('VINCULOS', JSON.stringify(diario.resumo.vinculos_batendo));
console.log('ABRANGÊNCIA');
for (const a of abrangencia) console.log(` - ${a.papel}: perfis=${a.perfis} vinculos=${a.vinculos_staff_schools} escolas=${a.escolas_distintas_no_vinculo}`);
console.log('FUNÇÕES', JSON.stringify(diario.resumo.funcoes_encontradas));
for (const f of funcoes) console.log(`\n--- ${f.funcao} ---\n${String(f.definicao).slice(0, 900)}`);
console.log(falhas.length ? 'SM3_COM_FALHAS ' + JSON.stringify(falhas) : 'SM3_OK');
process.exit(falhas.length ? 1 : 0);
