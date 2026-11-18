// SM-1 / briefing «Secretaria Municipal de Educação», ETAPA 1 — INVENTÁRIO SÓ-LEITURA DO BANCO.
// Zero escrita no banco: só SELECT de catálogo e contagens. Serve para responder, com medida e não com
// suposição, às perguntas que decidem o desenho do módulo municipal:
//   (1) quantas escolas existem e onde estão os alunos (rede real vs semente vazia);
//   (2) que tabelas têm coluna de unidade — i.e. o que já é multi-unidade por dados;
//   (3) se existe chave de município em algum lado — se a «rede» tem identidade própria ou é «todas as escolas»;
//   (4) qual é hoje a ABRANGÊNCIA por papel (o roadmap documenta `education_supervisor` ISOLADO POR ESCOLA
//       via `staff_schools`, que é o oposto do que o briefing pede), e com que colunas reais esse vínculo é feito;
//   (5) censo de tabelas com linhas, para saber quais das dez secções do §4 já têm dados por trás;
//   (6) censo de políticas RLS e funções `bfr_rls_*`, porque o acesso municipal tem de nascer no backend.
// A forma das tabelas é LIDA antes de qualquer join: a primeira versão deste inventário assumiu
// `ss.profile_id` e `'admin'` no enum `account_role`, e as duas consultas rebentaram (22P02 / 42703).
import { existsSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const OUT = 'evidence/sm1-inventario-rede-17-11b.json';
if (existsSync(OUT)) { console.log(`VERMELHO  já existe ${OUT} — correr com outro nome`); process.exit(1); }

const q = async (nome, query) => {
  try { const r = await sql(query); return { nome, ok: true, linhas: r.length, dados: r }; }
  catch (e) { return { nome, ok: false, erro: String(e.message).slice(0, 300) }; }
};

const COLUNAS = `select table_name, column_name, data_type from information_schema.columns
                 where table_schema='public' order by table_name, ordinal_position`;
const TABELAS = `select table_name, table_type from information_schema.tables where table_schema='public' order by table_name`;

const base = await Promise.all([
  q('colunas_todas', COLUNAS),
  q('tabelas_todas', TABELAS),
  q('escolas', `select s.id, s.name, s.city, s.active, count(st.id)::int as alunos_ativos
                from public.schools s
                left join public.students st on st.school_id = s.id and st.active
                group by s.id, s.name, s.city, s.active order by s.name`),
  q('tabelas_com_school_id', `select table_name, count(*)::int as n_cols
                              from information_schema.columns
                              where table_schema='public' and column_name in ('school_id','escola_id','unit_id')
                              group by table_name order by table_name`),
  q('colunas_de_geografia_rede', `select table_name, column_name from information_schema.columns
                                  where table_schema='public'
                                    and (column_name ~* 'municip|city|cidade|regiao|district|network|rede|estado|uf')
                                  order by table_name, column_name`),
  q('valores_do_enum_account_role', `select e.enumlabel from pg_type t join pg_enum e on e.enumtypid = t.oid order by e.enumsortorder`),
  q('politicas_rls', `select c.relname as tabela, p.polname as politica, p.polcmd as cmd,
                             r.rolname as papel, p.polpermissive as permissiva,
                             pg_get_expr(p.polqual, p.polrelid) as using_expr,
                             pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
                      from pg_policy p
                      join pg_class c on c.oid = p.polrelid
                      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                      left join unnest(p.polroles) with ordinality as rl(oid, ord) on true
                      left join pg_roles r on r.oid = rl.oid
                      order by c.relname, p.polname`),
  q('funcoes_bfr_rls', `select p.proname as nome, p.prosecdef as security_definer, pg_get_functiondef(p.oid) as definicao
                        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                        where n.nspname='public' and p.proname like 'bfr_rls%' order by 1`)
]);

const falhasBase = base.filter((r) => !r.ok).map((r) => `${r.nome}: ${r.erro}`);
const colunasDe = (t) => ((base.find((r) => r.nome === 'colunas_todas').dados || []).filter((c) => c.table_name === t).map((c) => c.column_name));
const chaveVinculo = colunasDe('staff_schools').find((c) => /profile|user|member/.test(c)) || null;

const perguntas = [];
if (chaveVinculo) {
  perguntas.push(['staff_schools_forma', `select column_name, data_type from information_schema.columns where table_schema='public' and table_name='staff_schools' order by ordinal_position`]);
  perguntas.push(['abrangencia_por_papel', `select p.role, count(*)::int as perfis,
                                                   count(ss.school_id)::int as vinculos,
                                                   count(distinct ss.school_id)::int as escolas_distintas
                                            from public.profiles p
                                            left join public.staff_schools ss on ss.${chaveVinculo} = p.id
                                            group by p.role order by p.role`]);
}

const respostas = [];
for (const [nome, query] of perguntas) respostas.push(await q(nome, query));

// Censo de tabelas com linhas: uma única ida ao banco por UNION ALL gerado do catálogo lido acima.
const nomes = (base.find((r) => r.nome === 'tabelas_todas').dados || [])
  .filter((t) => t.table_type === 'BASE TABLE' && /^[a-z0-9_]+$/.test(t.table_name)).map((t) => t.table_name);
const censo = nomes.length
  ? await q('censo_de_linhas', nomes.map((n) => `select '${n}' as tabela, count(*)::int as linhas from public."${n}"`).join(' union all ') + ' order by 2 desc')
  : { nome: 'censo_de_linhas', ok: false, erro: 'sem tabelas descobertas' };

const pick = (nome) => (base.concat(respostas, [censo]).find((r) => r.nome === nome) || {}).dados;
const escolas = pick('escolas') || [];
const politicas = pick('politicas_rls') || [];
const publicas = [...new Set(politicas.filter((p) => p.papel === 'public').map((p) => p.política || p.politica))];
const comLinhas = (censo.dados || []).filter((t) => t.linhas > 0);

const resumo = {
  escolas: escolas.length,
  escolas_com_alunos: escolas.filter((e) => e.alunos_ativos > 0).map((e) => `${e.name}:${e.alunos_ativos}`),
  cidade_distintas: [...new Set(escolas.map((e) => e.city))],
  tabelas_com_school_id: (pick('tabelas_com_school_id') || []).map((x) => x.table_name),
  colunas_de_geografia_rede: (pick('colunas_de_geografia_rede') || []).map((x) => `${x.table_name}.${x.column_name}`),
  chave_de_vinculo_usada: chaveVinculo,
  abrangencia_por_papel: pick('abrangencia_por_papel') || [],
  tabelas_base: nomes.length,
  tabelas_com_linhas: comLinhas.length,
  tabelas_vazias: nomes.length - comLinhas.length,
  politicas_rls: politicas.length,
  politicas_de_papel_public: publicas.length,
  funcoes_bfr_rls: (pick('funcoes_bfr_rls') || []).map((x) => x.nome),
  falhas: [...falhasBase, ...respostas.filter((r) => !r.ok).map((r) => `${r.nome}: ${r.erro}`), ...(censo.ok ? [] : [censo.erro])]
};

const diario = {
  programa: 'scripts/sm1-inventario-rede.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  o_que_prova: 'estado do catálogo que decide o desenho do módulo municipal: escolas com cidade e alunos activos por escola, que tabelas têm coluna de unidade, que colunas existem de geografia/rede, os valores reais do enum `account_role`, a ABRANGÊNCIA por papel contada em `staff_schools` (com a chave de vínculo LIDA do catálogo, sem nomes nem emails — LGPD), censo de tabelas com e sem linhas, e o censo de políticas RLS por papel com as expressões `using`/`with check`',
  o_que_NAO_prova: 'nada sobre a interface: não prova que aba alguma abra, carregue ou tenha botão (para isso existem `ah1-*`/`ah2-*`). As contagens de `reltuples` não foram usadas: cada número de linhas vem de `count(*)`.',
  chave_de_vinculo_descoberta: chaveVinculo,
  resumo,
  respostas: base.concat(respostas, [censo])
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(JSON.stringify(resumo, null, 1));
console.log('ESCOLAS', JSON.stringify(escolas));
console.log('ENUM', JSON.stringify((pick('valores_do_enum_account_role') || []).map((x) => x.enumlabel)));
console.log('CENSO top 20', JSON.stringify((censo.dados || []).slice(0, 20)));
console.log('VÁZIAS', JSON.stringify((censo.dados || []).filter((t) => t.linhas === 0).map((t) => t.tabela)));
console.log(resumo.falhas.length ? 'INVENTARIO_COM_FALHAS ' + JSON.stringify(resumo.falhas) : `INVENTARIO_OK ${resumo.escolas} escolas, ${resumo.tabelas_base} tabelas, ${resumo.politicas_rls} políticas, ${resumo.politicas_de_papel_public} de papel PUBLIC`);
process.exit(resumo.falhas.length ? 1 : 0);
