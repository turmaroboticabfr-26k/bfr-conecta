// SM4-PREFLIGHT — PORTÃO DE LEITURA DA CANDIDATA DE DDL MUNICIPAL. Zero escrita no banco.
// Quatro perguntas, todas necessárias antes de alguém pedir OK para aplicar:
//   (1) os nomes novos ainda não existem? (se um existir, a candidata rebenta a meio do BEGIN e o
//       rollback leva tudo — melhor descobri-lo aqui);
//   (2) tudo o que a candidata REFERE existe, incluindo a política-alvo do bloco H e o valor do enum?
//   (3) a ponte de chaves mapeia quantas escolas? (id igual / nome igual / sobram sem par / ambiguidade)
//   (4) a ORDEM do ficheiro .sql bate com o que o Postgres exige? Este preflight existe porque eu escrevi
//       a candidata duas vezes: a 1.ª chamava funções em políticas criadas antes delas, e a 2.ª fazia
//       `ALTER TABLE bfr_municipal_audit ENABLE ROW LEVEL SECURITY` antes de criar a tabela. Os dois
//       erros eram de ordem, não de sintaxe, e nenhum revisor humano os apanhava sem correr a coisa.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const CAND = `${DIR}/scripts/sm4-ddl-municipal-candidata.sql`;
const REV = `${DIR}/scripts/sm4-ddl-municipal-reversao.sql`;
const OUT = `${DIR}/evidence/sm4-preflight-ddl-municipal-18-11c.json`;
if (!existsSync(CAND) || !existsSync(REV)) { console.log('VERMELHO  falta candidata ou reversão em disco'); process.exit(1); }
if (existsSync(OUT)) { console.log(`VERMELHO  já existe ${OUT} — correr com outro nome`); process.exit(1); }

const bloqueios = [];
const q = async (query) => (await sql(query));

// ── nomes que a candidata cria ─────────────────────────────────────────────
const NOVAS_TABELAS = ['bfr_municipalities', 'bfr_school_key_map', 'bfr_municipal_access_grants', 'bfr_municipal_audit'];
const NOVOS_NOMES_DE_FUNCAO = ['bfr_is_platform_admin', 'bfr_has_municipal_grant', 'bfr_is_municipal_authority',
  'bfr_municipal_municipalities', 'bfr_school_in_municipal_scope', 'bfr_school_in_own_school_scope',
  'bfr_municipalities_visible', 'bfr_municipal_network_totals'];
const NOVAS_COLUNAS = [['schools', 'municipality_id'], ['schools', 'zone'], ['schools', 'operating_status'], ['students', 'code_mec']];
const NOVOS_INDICES = ['schools_municipality_id_idx', 'bfr_municipal_grants_one_active_per_profile', 'students_code_mec_unique', 'bfr_municipal_audit_at_idx'];
const NOVOS_OBJETOS = ['bfr_municipal_school_stats'];

// ── (1) não devem existir ──────────────────────────────────────────────────
const existemTabelas = await q(`select tablename as nome from pg_tables where schemaname='public' and tablename = any(array[${NOVAS_TABELAS.map((t) => `'${t}'`).join(',')}])`);
for (const r of existemTabelas) bloqueios.push(`tabela já existe: ${r.nome}`);
const existemFuncoes = await q(`select p.proname as nome from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' where p.proname = any(array[${NOVOS_NOMES_DE_FUNCAO.map((f) => `'${f}'`).join(',')}])`);
for (const r of existemFuncoes) bloqueios.push(`função já existe: ${r.nome}`);
const existemColunas = await q(`select c.tab as table_name, c.col as column_name from (values ${NOVAS_COLUNAS.map(([t, k]) => `('${t}','${k}')`).join(',')}) c(tab,col)
  where exists (select 1 from information_schema.columns i where i.table_schema='public' and i.table_name=c.tab and i.column_name=c.col)`);
for (const r of existemColunas) bloqueios.push(`coluna já existe: ${r.table_name}.${r.column_name}`);
const existemIndices = await q(`select indexname as nome from pg_indexes where schemaname='public' and indexname = any(array[${NOVOS_INDICES.map((i) => `'${i}'`).join(',')}])`);
for (const r of existemIndices) bloqueios.push(`índice já existe: ${r.nome}`);
const existemVistas = await q(`select viewname as nome from pg_views where schemaname='public' and viewname = any(array[${NOVOS_OBJETOS.map((v) => `'${v}'`).join(',')}])`);
for (const r of existemVistas) bloqueios.push(`vista já existe: ${r.nome}`);

// ── (2) devem existir ──────────────────────────────────────────────────────
const REF_TABELAS = ['schools', 'sports_schools', 'profiles', 'students', 'classes', 'staff_schools', 'supervision_requests'];
const faltamTabelas = await q(`select t.name from (select unnest(array[${REF_TABELAS.map((t) => `'${t}'`).join(',')}]) as name) t
  where not exists (select 1 from pg_tables p where p.schemaname='public' and p.tablename = t.name)`);
for (const r of faltamTabelas) bloqueios.push(`tabela referida não existe: ${r.name}`);
const REF_COLUNAS = [['schools', 'id'], ['schools', 'name'], ['schools', 'city'], ['sports_schools', 'id'], ['sports_schools', 'name'],
  ['students', 'school_id'], ['classes', 'school_id'], ['supervision_requests', 'school_id'], ['staff_schools', 'school_id'],
  ['staff_schools', 'profile_id'], ['profiles', 'id'], ['profiles', 'role']];
const faltamColunas = await q(`select c.tab, c.col from (values ${REF_COLUNAS.map(([t, k]) => `('${t}','${k}')`).join(',')}) c(tab,col)
  where not exists (select 1 from information_schema.columns i where i.table_schema='public' and i.table_name=c.tab and i.column_name=c.col)`);
for (const r of faltamColunas) bloqueios.push(`coluna referida não existe: ${r.tab}.${r.col}`);
const alvoH = await q(`select p.polname as nome, (p.polroles @> array[0::oid]) as e_public, c.relname as tabela
  from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where p.polname = 'supervision_requests_director_read'`);
if (alvoH.length !== 1) bloqueios.push(`bloco H: política-alvo encontrada ${alvoH.length} vezes (esperado 1)`);
else if (!alvoH[0].e_public) bloqueios.push(`bloco H: ${alvoH[0].nome} já NÃO está em PUBLIC — a correção proposta seria no-op, logo a candidata está desactualizada contra o vivo`);
const enums = await q(`select e.enumlabel as label from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace and n.nspname='public' where t.typname='account_role'`);
const labels = enums.map((e) => e.label);
for (const preciso of ['education_supervisor', 'developer', 'secretary', 'director'])
  if (!labels.includes(preciso)) bloqueios.push(`account_role não tem '${preciso}' — a candidata usa-o em cast`);

// ── (3) a ponte medida antes de existir ────────────────────────────────────
const ponte = await q(`select
  (select count(*)::int from public.schools s join public.sports_schools x on x.id = s.id) as por_id,
  (select count(*)::int from public.schools s join public.sports_schools x on x.name = s.name and x.id <> s.id) as por_nome,
  (select count(*)::int from public.schools s where not exists (select 1 from public.sports_schools x where x.id = s.id or x.name = s.name)) as sem_par,
  (select count(*)::int from (select s.id from public.schools s join public.sports_schools x on x.name = s.name and x.id <> s.id group by s.id having count(*) > 1) d) as nome_ambiguo,
  (select count(*)::int from public.schools) as escolas,
  (select count(*)::int from public.sports_schools) as sports_escolas,
  (select count(*)::int from public.staff_schools ss where exists (select 1 from public.schools s where s.id = ss.school_id or s.name = (select x.name from public.sports_schools x where x.id = ss.school_id))) as vinculos_com_par`);

// ── (4) ORDEM do ficheiro, verificada no texto ─────────────────────────────
// O Postgres exige que uma política chame uma função já criada e que uma função leia tabelas já criadas.
// Isso não se vê a olho: só se vê correndo. Como a candidata NÃO vai correr sem OK, a verificação é
// estática — e por isso precisa de fixture: um verificador que não dispara é decoração.
const NOVO_TODOS = new Set([...NOVAS_TABELAS, ...NOVOS_NOMES_DE_FUNCAO, ...NOVOS_OBJETOS]);
const semComentarios = (t) => t.split('\n').map((l) => (/^\s*--/.test(l) ? '' : l)).join('\n');
const RE_DEF = [
  /CREATE\s+(?:TABLE|UNLOGGED\s+TABLE)\s+public\.([a-z_][a-z0-9_]*)/i,
  /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z_][a-z0-9_]*)/i,
  /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FORCE\s+)?VIEW\s+public\.([a-z_][a-z0-9_]*)/i
];
const declara = (s) => RE_DEF.map((r) => r.exec(s)).find(Boolean);
const confereOrdem = (textoSql) => {
  const sent = semComentarios(textoSql).split(';').map((s) => s.trim()).filter(Boolean);
  const declaracoes = new Map();
  sent.forEach((s, i) => { const d = declara(s); if (d && !declaracoes.has(d[1])) declaracoes.set(d[1], i); });
  const problemas = [];
  sent.forEach((s, i) => {
    const d = declara(s);
    const propria = d ? d[1] : null;
    for (const m of s.matchAll(/public\.([a-z_][a-z0-9_]*)/g)) {
      const nome = m[1];
      if (!NOVO_TODOS.has(nome) || nome === propria) continue;
      const criadaEm = declaracoes.get(nome);
      if (criadaEm === undefined) { problemas.push(nome + ': usado na sentença ' + i + ' sem definição no ficheiro'); continue; }
      if (criadaEm > i) problemas.push(nome + ': usado na sentença ' + i + ', criado só na ' + criadaEm);
    }
  });
  return { sentencas: sent.length, problemas };
};

const texto = readFileSync(CAND, 'utf8');
const ordem = confereOrdem(texto);
for (const p of ordem.problemas) bloqueios.push('ordem do .sql: ' + p);

// FIXTURE — reproduz os dois fora-de-ordem que eu cometi ao escrever a candidata, mais um nome órfão:
// (i) ALTER TABLE ... ENABLE ROW LEVEL SECURITY antes do CREATE TABLE da mesma tabela;
// (ii) CREATE POLICY a chamar função criada depois; (iii) vista a ler tabela nunca criada no ficheiro.
// Se o verificador não acusar exatamente estes três, o verde da candidata não vale nada e o portão pára.
const FIXTURE_FORA_DE_ORDEM = [
  'ALTER TABLE public.bfr_municipal_audit ENABLE ROW LEVEL SECURITY;',
  'CREATE TABLE public.bfr_municipal_audit (id bigint);',
  'CREATE POLICY p_fixture ON public.schools FOR SELECT TO authenticated USING (public.bfr_is_municipal_authority());',
  'CREATE FUNCTION public.bfr_is_municipal_authority() RETURNS boolean LANGUAGE sql AS $$ select true $$;',
  'CREATE VIEW public.bfr_municipal_school_stats AS select * from public.bfr_school_key_map;'
].join('\n');
const ordemFixture = confereOrdem(FIXTURE_FORA_DE_ORDEM);
const esperados = ['bfr_is_municipal_authority', 'bfr_school_key_map', 'bfr_municipal_audit'];
const autoteste = {
  problemas_esperados: 3,
  problemas_obtidos: ordemFixture.problemas.length,
  detalhes: ordemFixture.problemas,
  citam_os_alvos: esperados.every((n) => ordemFixture.problemas.some((p) => p.indexOf(n + ':') === 0)),
  dispara: ordemFixture.problemas.length > 0
};
if (!autoteste.citam_os_alvos) bloqueios.push('AUTOTESTE: a régua de ordem não disparou no fixture (' + ordemFixture.problemas.length + ' problemas, ' + JSON.stringify(ordemFixture.problemas) + ')');
if (autoteste.problemas_obtidos !== autoteste.problemas_esperados) bloqueios.push('AUTOTESTE: fixture com ' + autoteste.problemas_obtidos + ' problemas, esperado ' + autoteste.problemas_esperados + ' — a régua mudou de forma sem que eu o soubesse');
const contra = confereOrdem('CREATE TABLE public.bfr_municipalities (id uuid);\nCREATE POLICY p_ok ON public.bfr_municipalities FOR SELECT TO authenticated USING (true);');
if (contra.problemas.length !== 0) bloqueios.push('AUTOTESTE: a régua acusa ordem correta (' + JSON.stringify(contra.problemas) + ') — falso positivo');

// reversão tem de desfazer tudo o que a candidata cria (verificação de paridade por nome)
const textoRev = readFileSync(REV, 'utf8');
const naoRevertidos = [...NOVAS_TABELAS, ...NOVOS_NOMES_DE_FUNCAO, ...NOVOS_OBJETOS].filter((n) => !textoRev.includes(`public.${n}`));
for (const n of naoRevertidos) bloqueios.push(`reversão não desfaz ${n}`);
const politicasCandidata = [...semComentarios(texto).matchAll(/CREATE POLICY ([a-z_0-9]+) ON public\.([a-z_]+)/gi)].map((m) => m[1]);
const politicasNaoRevertidas = politicasCandidata.filter((p) => !textoRev.includes(`DROP POLICY IF EXISTS ${p}`));
for (const p of politicasNaoRevertidas) bloqueios.push(`reversão não dropa a política ${p}`);

const ALVO17 = ['schools', 'students', 'classes', 'profiles', 'staff_schools', 'student_school_profiles',
  'supervision_requests', 'supervision_responses', 'supervision_alerts', 'supervision_action_plans',
  'secretary_requests', 'secretary_profile_change_requests', 'school_documents', 'announcements',
  'attendance', 'grades', 'access_requests'];
const nDe = async (nome, query) => ({ [nome]: (await q(query))[0].n });
const baselines = Object.assign(
  {},
  await nDe('schools', `select count(*)::int as n from public.schools`),
  await nDe('sports_schools', `select count(*)::int as n from public.sports_schools`),
  await nDe('profiles', `select count(*)::int as n from public.profiles`),
  await nDe('students', `select count(*)::int as n from public.students`),
  await nDe('politicas_17_alvo', `select count(*)::int as n from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where c.relname = any(array[${ALVO17.map((t) => `'${t}'`).join(',')}])`)
);

const diario = {
  programa: 'scripts/sm4-preflight-ddl-municipal-18-11c.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  candidata: 'scripts/sm4-ddl-municipal-candidata.sql',
  reversao: 'scripts/sm4-ddl-municipal-reversao.sql',
  o_que_prova: 'que nenhum nome novo existe já, que todas as tabelas/colunas/política/enum referidos existem, quantos pares a ponte de chaves produziria (id igual, nome igual, sem par, ambíguo), que a ordem das sentenças do .sql satisfaz as dependências que o Postgres impõe, e que a reversão desfaz cada objeto e cada política que a candidata cria.',
  o_que_NAO_prova: 'que a candidata corre: nada disto executa DDL. A ordem verificada é a de nomes, não a de privilégios de papel nem de timeouts; e o veredito é do instante em que foi tirado — qualquer aplicação de DDL entretanto torna-o velho.',
  ponte: ponte[0] || null,
  alvo_bloco_H: alvoH,
  account_role_labels: labels,
  baselines,
  sentencas_na_candidata: ordem.sentencas,
  autoteste_da_regua_de_ordem: autoteste,
  nomes_novos_verificados: NOVAS_TABELAS.length + NOVOS_NOMES_DE_FUNCAO.length + NOVAS_COLUNAS.length + NOVOS_INDICES.length + NOVOS_OBJETOS.length,
  bloqueios,
  veredito: bloqueios.length ? 'PREFLIGHT_BLOQUEADO' : 'PREFLIGHT_OK_SE_APLICAR_NADA'
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log('PONTE', JSON.stringify(diario.ponte));
console.log('ALVO H', JSON.stringify(diario.alvo_bloco_H));
console.log('BASELINES', JSON.stringify(diario.baselines), '| sentenças', diario.sentencas_na_candidata);
console.log(diario.veredito, bloqueios.length ? JSON.stringify(bloqueios, null, 1) : '');
process.exit(bloqueios.length ? 1 : 0);
