// p142 — De onde vem o EXECUTE do papel anon nas funcoes de public, medido por aclexplode e pg_default_acl.
//
// A pergunta nasceu duma divergencia medida no p139: 19 funcoes com `anon_pode=true` mas so 15 com entrada
// `anon=` na ACL. Quatro nomes chegam ao anonimo por outro caminho, e o caminho decide o remedio: REVOKE dum
// nome, REVOKE de PUBLIC para muitos, ou ALTER DEFAULT PRIVILEGES que reabre cada funcao nova.
// O p142 nao re-dactilografa nada: o censo, os nomes abertos e as linhas de graus vem do registo do p139
// apontado por REL139, cuja pegada e conferida contra o ficheiro do produtor antes de contar,
// e as contas do SQL sao conferidas contra contagens feitas pelo proprio catalogo, nao por mim.
//
// So leitura. O predicado de leitura e lido do ficheiro do p139 e compilado em node:vm, com aborta antes do
// `sql`. Zero DDL, zero DML, zero GRANT/REVOKE, zero chamada a /rpc.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from './c2-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const SUF = process.env.P142_SUF ? '-' + process.env.P142_SUF : '-sm37a';
const FICHEIRO = join(REPO, 'evidence', 'p142-origem-da-entrada-anon-no-acl' + SUF + '.json');
if (existsSync(FICHEIRO)) {
  console.error('ABORTA: ja existe ' + FICHEIRO + ' — passe P142_SUF novo em vez de sobrescrever uma medição.');
  process.exit(2);
}
const t0 = Date.now();

// ---- 1) o registo a que me ligo, lido do disco com a pegada dele -------------------------------------
const REL139 = 'evidence/p139-acls-dos-nomes-do-ar-contra-o-alvo-sm37g.json';
const F139 = join(REPO, REL139);
if (!existsSync(F139)) { console.error('ABORTA: falta ' + F139); process.exit(2); }
const buf139 = readFileSync(F139);
const p139 = JSON.parse(buf139.toString('utf8'));
const censo139 = p139.censo_do_esquema_inteiro;
const cobertura139 = p139.universos && p139.universos.cobertura_do_extract_de_graus;
if (!censo139 || typeof censo139.total !== 'number' || !p139.por_nome) { console.error('ABORTA: o registo do p139 nao traz censo nem por_nome.'); process.exit(2); }
if (!cobertura139) { console.error('ABORTA: o registo do p139 em ' + REL139 + ' nao declara cobertura_do_extract_de_graus.'); process.exit(2); }
// A rota de PUBLIC do p139 e por linha: sem ela, `publico_na_acl_segundo_o_p139` daria falso por leitura
// ausente e o confronto nome-a-nome fingiria acordo entre duas rotas quando so ha uma.
if (p139.por_nome.length === 0 || p139.por_nome.some((r) => typeof r.publico_na_acl !== 'boolean')) { console.error('ABORTA: o registo do p139 em ' + REL139 + ' nao traz publico_na_acl booleano por linha (a rota de PUBLIC entrou no p139 na corrida sm37d).'); process.exit(2); }

// ---- 2) o predicado de leitura vem do ficheiro do produtor, compilado em vm ---------------------------
const fonte139Buf = readFileSync(join(AQUI, 'p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs'));
const fonte139 = fonte139Buf.toString('utf8');
const linhaPredicado = fonte139.split(/\r?\n/).find((l) => l.startsWith('const eLeitura ='));
if (!linhaPredicado) { console.error('ABORTA: nao li a linha `const eLeitura =` do p139.'); process.exit(2); }
const mundo = createContext({});
runInContext(linhaPredicado + '\nglobalThis.__eLeitura = eLeitura;', mundo);
const eLeitura = mundo.__eLeitura;
if (typeof eLeitura !== 'function') { console.error('ABORTA: o vm nao devolveu uma funcao de leitura.'); process.exit(2); }
const q = async (txt) => {
  if (!eLeitura(txt)) throw new Error('ABORTA: esta peca e so-leitura e alguem lhe passou ' + String(txt).slice(0, 60));
  return sql(txt);
};
const literal = (s) => "'" + String(s).replace(/'/g, "''") + "'";

// ---- 2b) como e que esta base representa PUBLIC num aclexplode ------------------------------------
// Observacao medida no sm37b (esta mesma peca, corrida antes desta seccao existir): `classe_so_por_publico = 0`
// com quatro nomes a imprimir um contemplado `-`, e `has_function_privilege` a dar-lhes verdadeiro. A hipotese
// e que `-` seja a impressao dum OID 0 (PUBLIC) e que o meu predicado `a.grantee is null` os nao veja; se for
// isso, a classe estava vazia por régua cega e os quatro nomes mudam de remédio. Esta medicao e que decide,
// nao a frase acima: separa nulo / zero / papel, conta as funcoes com entrada PUBLIC pelo texto da ACL
// (rota que nao usa aclexplode) e prova que nao ha papel com OID 0 — senão `= 0` nao podia significar PUBLIC.
// A forma nula continua legitima (pg >= 14 devolve NULL para PUBLIC em algumas vistas), por isso o
// predicado cobre as duas representacoes e esta medicao diz qual delas existe aqui — nao a minha memoria.
const E_PUBLICO = (g) => '(' + g + ' is null or ' + g + ' = 0)';
const eGranteePublico = (g) => g === null || g === 0;
const SQL_REPRESENTACAO = [
  'with e as (',
  '  select a.grantee as g',
  '  from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  '  cross join lateral aclexplode(p.proacl) a',
  "  where n.nspname = 'public' and p.prokind = 'f' and a.privilege_type = 'EXECUTE'",
  ')',
  'select count(*)::int as entradas_execute,',
  '       count(*) filter (where g is null)::int as grantee_nulo,',
  '       count(*) filter (where g = 0)::int as grantee_zero,',
  '       count(*) filter (where g is not null and g <> 0)::int as grantee_papel,',
  '       (select count(*)::int from pg_roles where oid = 0) as papel_com_oid_zero,',
  "       (select count(*)::int from pg_auth_members m join pg_roles anon on anon.oid = m.member",
  "          where anon.rolname = 'anon') as papeis_de_que_anon_e_membro,",
  "       (select count(*)::int from (select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace",
  "          cross join lateral aclexplode(p.proacl) a",
  "          where n.nspname = 'public' and p.prokind = 'f' and a.privilege_type = 'EXECUTE'",
  "            and " + E_PUBLICO('a.grantee') + " group by p.oid) x) as funcoes_com_publico_por_oid,",
  "       (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace",
  "          where n.nspname = 'public' and p.prokind = 'f'",
  "            and coalesce(array_to_string(p.proacl, ','), '') ~ '(^|,)=X/') as funcoes_com_publico_por_texto",
  'from e',
].join('\n');
const FIX_GRANTEE_PUBLICO = [
  [true, null],
  [true, 0],
  [false, 1],
  [false, 'anon'],
  [false, ''],
];
const FIX_PAPEIS_UNICOS = [
  [['PUBLIC', 'anon'], 'anon,PUBLIC'],
  [['authenticated', 'postgres'], 'postgres,authenticated,authenticated'],
  [[], null],
  [[], ''],
];

// ---- 3) default privileges, com a contagem do catalogo a servir de par ------------------------------
const CONTAGEM_DEFAULTS = [
  'select count(*)::int as linhas,',
  "       count(*) filter (where defaclobjtype = 'f')::int as do_tipo_funcao,",
  "       count(*) filter (where defaclobjtype = 'f' and exists (select 1 from aclexplode(defaclacl) a",
  "                                 where a.privilege_type = 'EXECUTE'",
  "                                   and a.grantee = (select oid from pg_roles where rolname = 'anon')))::int as funcao_que_da_anon",
  'from pg_default_acl',
].join(' ');
const C = (await q(CONTAGEM_DEFAULTS))[0];
const linhasDefaults = await q([
  'select defaclrole::regrole::text as papel, defaclobjtype as tipo,',
  "       coalesce(defaclacl::text, '(null)') as acl",
  'from pg_default_acl order by 1, 2',
].join('\n'));
const EH_TIPO_FUNCAO = (tipo) => String(tipo).toLowerCase() === 'f';
const tem_anon_na_acl_de_default = (acl) => /anon=X/i.test(String(acl));
const defaults_funcao = linhasDefaults.filter((r) => EH_TIPO_FUNCAO(r.tipo));
const defaults_funcao_com_anon = defaults_funcao.filter((r) => tem_anon_na_acl_de_default(r.acl));

// ---- 4) particao, sobre todo o public, dos caminhos que do EXECUTE ao anon ---------------------------
const REP = (await q(SQL_REPRESENTACAO))[0];
const SQL_PARTICAO = [
  'with f as (',
  '  select p.oid, p.proacl',
  '  from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  "  where n.nspname = 'public' and p.prokind = 'f'",
  '), g as (',
  '  select f.oid,',
  '         f.proacl is null as acl_nula,',
  "         has_function_privilege('anon'::regrole, f.oid, 'EXECUTE') as anon_pode,",
  "         exists (select 1 from aclexplode(f.proacl) a where a.privilege_type = 'EXECUTE'",
  "                   and a.grantee = (select oid from pg_roles where rolname = 'anon')) as anon_explicito,",
  "         exists (select 1 from aclexplode(f.proacl) a where a.privilege_type = 'EXECUTE'",
  '                   and ' + E_PUBLICO('a.grantee') + ') as publico_executa',
  '  from f',
  ')',
  'select count(*)::int as total,',
  '       count(*) filter (where acl_nula)::int as acl_nula,',
  '       count(*) filter (where anon_pode)::int as anon_pode,',
  '       count(*) filter (where not anon_pode)::int as classe_barrado,',
  '       count(*) filter (where anon_pode and anon_explicito)::int as classe_anon_explicito,',
  '       count(*) filter (where anon_pode and not anon_explicito and publico_executa)::int as classe_so_por_publico,',
  '       count(*) filter (where anon_pode and not anon_explicito and not publico_executa)::int as classe_por_membria',
  'from g',
].join('\n');
const P = (await q(SQL_PARTICAO))[0];

// ---- 4b) as duas classes sem entrada anon explicita, nomeadas por rotas SQL proprias ----------------
// A contagem da particao usa `exists`; esta rota usa `bool_or` sobre um `left join lateral`, por isso uma
// funcao sem nenhuma entrada de ACL (acl nula) tambem aparece e nao fica escondida atras de um join interno.
// As duas classes que nao tem `anon=` sao nomeadas na mesma query e separadas em JS pela ordem declarada da
// particao (explicita > PUBLIC > memoria) — se um dia houver membros na terceira, eles tem nome.
const SQL_ABERTAS = [
  'with f as (',
  '  select p.oid, p.proname, p.prorettype::regtype::text as retorno, p.prosecdef::text as definer, p.proacl',
  '  from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  "  where n.nspname = 'public' and p.prokind = 'f'",
  '), e as (',
  '  select f.oid, f.proname, f.retorno, f.definer, (f.proacl is null) as acl_nula, x.grantee, x.privilege_type, x.grantor',
  '  from f left join lateral aclexplode(f.proacl) x on true',
  '), a as (',
  '  select oid, proname as nome, retorno, definer,',
  "         bool_or(privilege_type = 'EXECUTE' and grantee = (select oid from pg_roles where rolname = 'anon')) as anon_oid,",
  '         bool_or(privilege_type = \'EXECUTE\' and ' + E_PUBLICO('grantee') + ') as publico_oid,',
  "         bool_or(privilege_type = 'EXECUTE') as alguma_entrada_execute,",
  // `string_agg(distinct … order by 1)` e recusado pelo Postgres (42P10): com DISTINCT a ordem tem de estar na
  // lista de argumentos e um agregado de dois argumentos nao o permite. O desdobramento faz-se em JS, com Set.
  "         string_agg(case when privilege_type = 'EXECUTE' then",
  "           case when " + E_PUBLICO('grantee') + " then 'PUBLIC' else grantee::regrole::text end",
  "           else null end, ',' order by 1) as papeis_com_execute,",
  "         max(grantor::regrole::text) as outorgante,",
  '         bool_and(acl_nula) as acl_nula',
  '  from e group by oid, proname, retorno, definer',
  ')',
  "select nome, retorno, definer, anon_oid, publico_oid, papeis_com_execute, outorgante, acl_nula,",
  "       has_function_privilege('anon'::regrole, oid, 'EXECUTE') as anon_pode",
  'from a',
  "where has_function_privilege('anon'::regrole, oid, 'EXECUTE')",
  'order by 1',
].join('\n');
const abertas = await q(SQL_ABERTAS);
// O `string_agg` sem DISTINCT pode repetir um papel outorgado por duas maos; o conjunto desdobra-se aqui,
// uma vez, e o registo guarda as duas colunas para se poder ver o que o SQL devolveu antes do desdobramento.
const papeisUnicos = (s) => [...new Set(String(s == null ? '' : s).split(',').map((x) => x.trim()).filter(Boolean))].sort();
for (const r of abertas) r.papeis_com_execute_unicos = papeisUnicos(r.papeis_com_execute);
// A classificadora abaixo e a mesma que o fixture da seccao 6 exercita: o caminho declara-se por ordem
// (explicita > PUBLIC > acl nula > memoria) e o fixture nao e uma copia em prosa do que os dados fazem.
const classeDe = ({ anon_pode, anon_explicito, publico_executa, acl_nula }) => {
  if (acl_nula === true) return 'acl_nula_default_postgres';
  if (anon_pode !== true) return 'barrado';
  if (anon_explicito === true) return 'anon_explicito';
  if (publico_executa === true) return 'so_por_publico';
  return 'por_membria_ou_default';
};
const BALDE = { anon_explicito: 'anon_explicito', so_por_publico: 'so_por_publico', por_membria_ou_default: 'por_membria', acl_nula_default_postgres: 'acl_nula' };
const porClasse = { anon_explicito: [], so_por_publico: [], por_membria: [], acl_nula: [] };
for (const r of abertas) {
  porClasse[BALDE[classeDe({ anon_pode: r.anon_pode, anon_explicito: r.anon_oid, publico_executa: r.publico_oid, acl_nula: r.acl_nula })]].push(r);
}
const nomesDaClasse = (c) => porClasse[c].map((r) => r.nome).sort();

// ---- 4c) a mesma contagem por uma rota que nao usa aclexplode: o texto da propria ACL ----------------
// Se o meu predicado de PUBLIC estiver errado numa das duas formas, as rotas divergem e o portao rebenta;
// e a unica régua que diz que a classe `so_por_publico` nao esta vazia porque eu nao a vejo.
const SQL_POR_TEXTO = [
  'with f as (',
  "  select p.oid, coalesce(array_to_string(p.proacl, ','), '') as texto, p.proacl is null as acl_nula,",
  "         has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') as anon_pode",
  '  from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  "  where n.nspname = 'public' and p.prokind = 'f'",
  ')',
  "select count(*) filter (where anon_pode and texto ~ '(^|,)anon=X/')::int as por_texto_anon_explicito,",
  "       count(*) filter (where anon_pode and not (texto ~ '(^|,)anon=X/') and texto ~ '(^|,)=X/')::int as por_texto_so_por_publico,",
  "       count(*) filter (where anon_pode and not (texto ~ '(^|,)anon=X/') and not (texto ~ '(^|,)=X/'))::int as por_texto_por_membria,",
  '       count(*) filter (where anon_pode)::int as por_texto_anon_pode,',
  '       count(*) filter (where acl_nula)::int as por_texto_acl_nula,',
  '       count(*)::int as por_texto_total',
  'from f',
].join('\n');
const T = (await q(SQL_POR_TEXTO))[0];

// ---- 5) os nomes abertos ao anon, desmontados entrada a entrada ------------------------------------
const NOMES = p139.por_nome.filter((r) => r.anon_pode === true).map((r) => r.nome).sort();
if (!NOMES.length) { console.error('ABORTA: o p139 nao classifica nenhum nome como aberto ao anonimo.'); process.exit(2); }
const listaNomes = NOMES.map(literal).join(', ');
const explode = await q([
  'select p.proname as nome, a.privilege_type as privilegio,',
  "  case when a.grantee is null then 'PUBLIC' when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end as contemplado,",
  '  a.grantor::regrole::text as outorgante',
  'from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  'cross join lateral aclexplode(p.proacl) a',
  "where n.nspname = 'public' and p.proname in (" + listaNomes + ')',
  "  and a.privilege_type = 'EXECUTE'",
  'order by 1, 2, 3',
].join('\n'));
// O texto dum ACL vem do p139 sem chavetas, mas `acl::text` de um array do Postgres pode vir com elas: ler as
// duas formas e ter fixture para cada uma, senao o leitor cala mudo e a divergencia aparece so no cruzamento.
const papeisComX = (acl) => String(acl).replace(/[{}]/g, '').split(',').map((p) => p.trim()).filter((p) => /=X\//.test(p)).map((p) => p.split('=')[0] || 'PUBLIC').sort();
const alvo = p139.universos.alvo_linhas || [];
const nomes = {};
for (const nome of NOMES) {
  const r139 = p139.por_nome.find((x) => x.nome === nome);
  const linhas = explode.filter((r) => r.nome === nome);
  const graus = alvo.filter((l) => l.nome === nome);
  nomes[nome] = {
    oid: r139.oid,
    municipal_de_ddl: r139.municipal_de_ddl,
    chamado_pelo_ar_no_p139: r139.chamado_pelo_ar,
    no_alvo_de_peca_de_graus: r139.no_alvo_de_peca_de_graus,
    acl_registada_no_p139: r139.acl,
    entradas_execute: linhas.map((r) => r.contemplado + ' por ' + r.outorgante).sort(),
    contemplados: [...new Set(linhas.map((r) => r.contemplado))].sort(),
    papeis_com_X_lidos_do_texto_do_p139: papeisComX(r139.acl),
    anon_no_texto_do_p139: r139.entrada_anon_no_acl === true,
    publico_na_acl_segundo_o_p139: r139.publico_na_acl === true,
    anon_explicito: linhas.some((r) => r.contemplado === 'anon'),
    publico_executa: linhas.some((r) => r.contemplado === 'PUBLIC'),
    linhas_de_graus_no_texto: graus.map((l) => l.ficheiro + ' ' + l.verbo + ' ' + l.grau + ' ' + l.nome + ' ' + l.preposicao + ' ' + l.papel),
    linhas_de_graus_que_nomeiam_anon: graus.filter((l) => /anon/i.test(l.papel)).length,
    linhas_de_graus_que_fecham_public: graus.filter((l) => l.grau === 'ALL' && l.verbo === 'REVOKE' && l.papel === 'PUBLIC').length,
  };
}

// ---- 6) fixtures: cada classificadora tem de ter positivo E negativo --------------------------------
// `classeDe` vive na seccao 4b e e a mesma que percorre as linhas vindas do banco: um fixture que exercitasse
// uma copia dela nao provaria nada do que corre de verdade.
const FIX_CAMINHOS = [
  ['anon_explicito', { anon_pode: true, anon_explicito: true, publico_executa: false, acl_nula: false }],
  ['so_por_publico', { anon_pode: true, anon_explicito: false, publico_executa: true, acl_nula: false }],
  ['por_membria_ou_default', { anon_pode: true, anon_explicito: false, publico_executa: false, acl_nula: false }],
  ['barrado', { anon_pode: false, anon_explicito: true, publico_executa: false, acl_nula: false }],
  ['acl_nula_default_postgres', { anon_pode: true, anon_explicito: false, publico_executa: false, acl_nula: true }],
];
const FIX_TIPOS = [[true, 'f'], [false, 'r'], [false, 'S'], [false, 'T'], [false, '']];
const FIX_LEITURA = [[true, 'select 1'], [true, 'WITH a AS (SELECT 1) SELECT * FROM a'], [false, 'REVOKE ALL ON FUNCTION public.x() FROM PUBLIC'], [false, '']];
const FIX_ANON_NO_DEFAULT = [[true, '{anon=X/postgres,authenticated=X/postgres}'], [false, '{authenticated=X/postgres,postgres=X/postgres}'], [false, '(null)']];
const FIX_PAPEIS_COM_X = [
  [['anon', 'authenticated', 'postgres'], 'postgres=X/postgres,anon=X/postgres,authenticated=X/postgres'],
  [['authenticated', 'postgres'], 'postgres=X/postgres,authenticated=X/postgres'],
  [['PUBLIC', 'postgres'], '=X/postgres,postgres=X/postgres'],
  [['anon', 'authenticated', 'postgres'], '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}'],
];

// ---- 7) a guarda tem de abortar ANTES de chegar ao banco ---------------------------------------------
let guardaAbortou = false;
let guardaChegouAoBanco = false;
try { await q('REVOKE ALL ON FUNCTION public.x() FROM anon'); guardaChegouAoBanco = true; }
catch (e) { guardaAbortou = /ABORTA/.test(String(e.message)); }

// ---- 8) portao ---------------------------------------------------------------------------------------
const portoes = [];
const gate = (nome, obtido, esperado, detalhe) => {
  portoes.push({ nome, verde: JSON.stringify(obtido) === JSON.stringify(esperado), obtido, esperado, detalhe });
};

gate('a_guarda_de_leitura_aborta_antes_de_chegar_ao_banco', [guardaAbortou, guardaChegouAoBanco], [true, false],
  { texto_passado: 'REVOKE ALL ON FUNCTION public.x() FROM anon', predicado_lido: linhaPredicado });
gate('o_predicado_de_leitura_e_lido_do_produtor_e_dispara_nos_dois_lados', FIX_LEITURA.map(([, t]) => eLeitura(t)), FIX_LEITURA.map(([e]) => e),
  { origem: 'scripts/p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs', pares: FIX_LEITURA.map(([e, t]) => [e, t.slice(0, 44)]) });
gate('o_censo_do_aclexplode_bate_com_o_censo_do_p139', [P.total, P.acl_nula, P.anon_pode], [censo139.total, censo139.acl_nula, censo139.anon_pode],
  { aqui: [P.total, P.acl_nula, P.anon_pode], p139: [censo139.total, censo139.acl_nula, censo139.anon_pode] });
gate('a_particao_soma_anon_pode_e_a_particao_bate_com_a_predica_de_entrada_do_p139',
  [P.anon_pode === (P.classe_anon_explicito + P.classe_so_por_publico + P.classe_por_membria), P.anon_pode + P.classe_barrado === P.total, P.classe_anon_explicito === censo139.anon_por_entrada],
  [true, true, true],
  { particao: P, anon_por_entrada_do_p139: censo139.anon_por_entrada });
gate('as_quatro_classes_de_caminho_constam_no_registo_mesmo_que_nao_encham',
  Object.keys(P).filter((k) => k.startsWith('classe_')).sort(),
  ['classe_anon_explicito', 'classe_barrado', 'classe_por_membria', 'classe_so_por_publico'],
  { valores: Object.fromEntries(Object.keys(P).filter((k) => k.startsWith('classe_')).map((k) => [k, P[k]])) });
gate('a_classificadora_de_caminhos_tem_positivo_e_negativo_em_fixture', FIX_CAMINHOS.map(([, inp]) => classeDe(inp)), FIX_CAMINHOS.map(([e]) => e), { FIX_CAMINHOS });
gate('o_leitor_de_publico_no_grantee_tem_positivo_e_negativo_em_fixture', FIX_GRANTEE_PUBLICO.map(([, g]) => eGranteePublico(g)), FIX_GRANTEE_PUBLICO.map(([e]) => e),
  { FIX_GRANTEE_PUBLICO, nota: 'nulo e zero sao as duas representacoes que o Postgres usa para PUBLIC; 1, uma string e a string vazia nao sao' });
gate('o_desdobrador_de_papeis_do_string_agg_tem_positivo_e_negativo_em_fixture', FIX_PAPEIS_UNICOS.map(([, s]) => papeisUnicos(s)), FIX_PAPEIS_UNICOS.map(([e]) => e),
  { FIX_PAPEIS_UNICOS, nota: 'o string_agg nao aceita distinct com esta ordem, por isso o desdobramento e meu: null e string vazia dao lista vazia, repetido da um so' });
gate('a_representacao_de_publico_nesta_base_e_medida_e_nao_assumida',
  [REP.funcoes_com_publico_por_oid, REP.papel_com_oid_zero],
  [REP.funcoes_com_publico_por_texto, 0],
  { REP, nota: 'a contagem por aclexplode com o meu predicado de grantee e a contagem pelo texto da ACL, sem aclexplode, tem de dar o mesmo numero; se o OID 0 fosse um papel real, `= 0` nao podia significar PUBLIC e o predicado estaria errado' });
gate('a_classe_por_memoria_e_testemunha_de_anon_nao_ser_membro_de_nada',
  [REP.papeis_de_que_anon_e_membro === 0, P.classe_por_membria === 0],
  [true, true],
  { nota: 'a frase do rodape dizia que o buraco 19/15 era membros; esta e a conta que o diria se fosse — e se um dia anon entrar noutro papel, o portao passa a exigir que a classe por_membria encha', papeis_de_que_anon_e_membro: REP.papeis_de_que_anon_e_membro, classe_por_membria: P.classe_por_membria });
gate('a_rota_do_texto_da_acl_bate_conta_a_conta_com_a_particao_por_aclexplode',
  [T.por_texto_anon_pode, T.por_texto_total, T.por_texto_acl_nula,
   T.por_texto_anon_explicito, T.por_texto_so_por_publico, T.por_texto_por_membria],
  [P.anon_pode, P.total, P.acl_nula,
   P.classe_anon_explicito, P.classe_so_por_publico, P.classe_por_membria],
  { rota_oid_filtros: P, rota_aclexplode_texto: T, nota: 'a rota do texto nao usa aclexplode nem o meu predicado de grantee: se eu tiver inventado uma classe, e aqui que se ve' });
gate('as_classes_tem_nome_e_a_contagem_por_nome_bate_com_a_particao',
  ['anon_explicito', 'so_por_publico', 'por_membria', 'acl_nula'].map((c) => nomesDaClasse(c).length),
  [P.classe_anon_explicito, P.classe_so_por_publico, P.classe_por_membria, P.acl_nula],
  { por_classe: Object.fromEntries(['anon_explicito', 'so_por_publico', 'por_membria', 'acl_nula'].map((c) => [c, nomesDaClasse(c)])),
    nota: 'uma classe vazia imprime a lista vazia: o verde diz que foi medida, nao que foi suprimida' });
gate('o_predicado_de_tipo_de_default_tem_positivo_e_negativo_em_fixture', FIX_TIPOS.map(([, t]) => EH_TIPO_FUNCAO(t)), FIX_TIPOS.map(([e]) => e), { FIX_TIPOS });
gate('o_predicado_de_anon_no_default_tem_positivo_e_negativo_em_fixture', FIX_ANON_NO_DEFAULT.map(([, a]) => tem_anon_na_acl_de_default(a)), FIX_ANON_NO_DEFAULT.map(([e]) => e), { FIX_ANON_NO_DEFAULT });
gate('a_lista_de_default_privileges_e_contada_por_dois_caminhos_e_bate', [linhasDefaults.length, defaults_funcao.length, defaults_funcao_com_anon.length], [C.linhas, C.do_tipo_funcao, C.funcao_que_da_anon],
  { contagem_do_catalogo: C, nota: 'as duas primeiras vem de linhas lidas em JS, a terceira duma contagem SQL; so ha verde se nenhum dos dois vir Partial' });
gate('os_nomes_abertos_ao_anonimo_ao_aclexplode_sao_os_do_p139_por_has_function_privilege',
  NOMES, p139.por_nome.filter((r) => r.anon_pode === true).map((r) => r.nome).sort(),
  { p139_rel: REL139, p139_bytes: buf139.length, p139_md5: md5(buf139), nomes: NOMES });
gate('o_desmontar_de_entradas_bate_com_o_texto_da_acl_do_p139',
  NOMES.map((n) => nomes[n].contemplados), NOMES.map((n) => nomes[n].papeis_com_X_lidos_do_texto_do_p139),
  { por_nome: NOMES.map((n) => [n, nomes[n].contemplados, nomes[n].papeis_com_X_lidos_do_texto_do_p139]) });
gate('as_rotas_de_anon_e_de_publico_batem_nome_a_nome_com_o_texto_da_acl_do_p139',
  NOMES.map((n) => [nomes[n].anon_explicito, nomes[n].publico_executa]),
  NOMES.map((n) => [nomes[n].anon_no_texto_do_p139, nomes[n].publico_na_acl_segundo_o_p139]),
  { nota: 'a minha rota e SQL (aclexplode sobre proacl), a do p139 e JS sobre o texto renderizado; um desacordo significa que uma das duas esta cega', por_nome: NOMES.map((n) => [n, nomes[n].anon_explicito, nomes[n].anon_no_texto_do_p139, nomes[n].publico_executa, nomes[n].publico_na_acl_segundo_o_p139]) });
gate('a_pega_do_ficheiro_do_p139_e_a_do_registo_que_leio', [fonte139Buf.length, md5(fonte139Buf)], [p139.emissor_bytes, p139.emissor_md5],
  { nota: 'o predicado que compilo do ficheiro so e o da corrida gravada se os dois bytes forem os mesmos', registo: REL139, p139_emissor_bytes: p139.emissor_bytes, p139_emissor_md5: p139.emissor_md5 });
gate('o_leitor_de_papeis_do_texto_da_acl_tem_positivo_e_negativo_em_fixture', FIX_PAPEIS_COM_X.map(([, a]) => papeisComX(a)), FIX_PAPEIS_COM_X.map(([e]) => e),
  { nota: 'a forma com chavetas e a sem chavetas tem de dar o mesmo conjunto; o caso PUBLIC prova que o contemplado vazio nao se perde', fixture: FIX_PAPEIS_COM_X });
gate('o_nome_municipal_de_escrita_tem_anon_explicito_zero_linhas_a_nomeiar_e_o_REVOKE_ALL_do_PUBLIC_lescrito',
  NOMES.filter((n) => nomes[n].municipal_de_ddl).map((n) => [nomes[n].anon_explicito, nomes[n].linhas_de_graus_que_nomeiam_anon, nomes[n].linhas_de_graus_que_fecham_public]),
  [[true, 0, 1]],
  { nota: 'o texto fechou o PUBLIC e nunca nomeou o anon; e isso que torna a origem do anon uma pergunta e nao uma resposta' });
gate('a_cobertura_do_extract_de_graus_do_p139_declara_as_duas_familias_e_esta_integral',
  [cobertura139.familias, cobertura139.linhas_no_texto === cobertura139.linhas_extraidas, cobertura139.por_grau.ALL],
  [['ALL', 'EXECUTE'], true, 5],
  { cobertura139 });

const verdes = portoes.filter((g) => g.verde).length;
const falhas = portoes.length - verdes;
const leituraDefaults = defaults_funcao_com_anon.length === 0
  ? 'nenhuma linha de pg_default_acl do tipo funcao da EXECUTE ao anon; nenhuma funcao nova herda a porta por default do catalogo que hoje se le'
  : 'ha ' + defaults_funcao_com_anon.length + ' linha(s) de default privileges do tipo funcao a dar EXECUTE ao anon';
const veredito = 'P142_ORIGEM_ANON_MEDIDA ' + verdes + '/' + falhas
  + ' · public ' + P.total
  + ' · anon_pode ' + P.anon_pode
  + ' · explicito ' + P.classe_anon_explicito
  + ' · so_por_publico ' + P.classe_so_por_publico
  + ' · por_membria ' + P.classe_por_membria
  + ' · defaults ' + C.linhas + '/' + C.do_tipo_funcao
  + ' · ' + (Date.now() - t0) + ' ms'
  + ' · registo ' + FICHEIRO;

const resultado = {
  peca: 'scripts/p142-origem-da-entrada-anon-no-acl.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  pergunta: 'por que caminho o papel anon chega ao EXECUTE nas funcoes de public: entrada explicita na ACL, entrada PUBLIC, membros de papel, ou default privileges do catalogo — e as funcoes novas herdam a porta?',
  metodo: 'SELECTs de catalogo (pg_default_acl com contagem propria, pg_proc desmontado por aclexplode) so com o predicado eLeitura lido do ficheiro do p139 e compilado em node:vm; censo e nomes abertos e linhas de graus lidos do registo do p139 ' + REL139 + ' (pegada conferida por portao antes de contar); zero escrita e zero chamada a /rpc.',
  identidade_do_medido: {
    registo_ligado: REL139,
    registo_bytes: buf139.length,
    registo_md5: md5(buf139),
    censo_do_p139: censo139,
    cobertura_do_extract_do_p139: cobertura139,
    predicado_lido_da_fonte: linhaPredicado,
  },
  nomes_em_causa: NOMES,
  particao_do_esquema: P,
  representacao_de_publico_na_base: REP,
  rotas_de_contagem: { filtros_aclexplode: P, texto_da_acl: T },
  nomes_por_classe: {
    anon_explicito: nomesDaClasse('anon_explicito'),
    so_por_publico: nomesDaClasse('so_por_publico'),
    por_membria: nomesDaClasse('por_membria'),
    acl_nula: nomesDaClasse('acl_nula'),
  },
  linhas_das_classes: {
    so_por_publico: porClasse.so_por_publico,
    por_membria: porClasse.por_membria,
  },
  default_privileges: {
    contagem_do_catalogo: C,
    linhas_lidas: linhasDefaults.length,
    do_tipo_funcao: defaults_funcao.map((r) => ({ papel: r.papel, acl: r.acl, da_execute_ao_anon: tem_anon_na_acl_de_default(r.acl) })),
    leitura: leituraDefaults,
  },
  nomes,
  o_que_prova: 'de que classe vem cada funcao executavel por anon no esquema public, medida por aclexplode e confrontada com o censo, o texto da ACL e as linhas de graus do p139; e se o catalogo de hoje tem default privileges que reabram a porta a cada funcao nova.',
  o_que_NAO_prova: 'quem escreveu cada entrada nem quando: o catalogo nao guarda historico de ACLs, por isso isto fecha o mecanismo, nao a autoria. Uma entrada anon explicita sem linha de graus que a nomeie pode vir dum GRANT fora do texto versionado, dum default vigente ao tempo do CREATE que entretanto mudou, ou doutro caminho. Nao prova que um anon com token leia dados, nem autoriza REVOKE, GRANT, DDL ou publicacao.',
  fixtures: { caminhos_de_entrada: FIX_CAMINHOS.map(([e, i]) => [e, i]), tipos_de_default: FIX_TIPOS, anon_no_default: FIX_ANON_NO_DEFAULT, leitura: FIX_LEITURA, papeis_da_acl: FIX_PAPEIS_COM_X, grantee_publico: FIX_GRANTEE_PUBLICO, papeis_unicos: FIX_PAPEIS_UNICOS },
  portoes: { total: portoes.length, falhas, lista: portoes },
  veredito,
};
writeFileSync(FICHEIRO, JSON.stringify(resultado, null, 2) + '\n');
console.log(veredito);
portoes.forEach((g) => console.log('  portao ' + g.nome + ': ' + (g.verde ? 'VERDE' : 'VERMELHO obtido=' + JSON.stringify(g.obtido) + ' esperado=' + JSON.stringify(g.esperado))));
if (falhas > 0) {
  const vermelho = FICHEIRO.replace('.json', '-VERMELHO.json');
  writeFileSync(vermelho, JSON.stringify(resultado, null, 2) + '\n');
  console.error('VERMELHO: registo em ' + FICHEIRO + ' e copia em ' + vermelho);
  process.exit(1);
}
console.log('guardado em ' + FICHEIRO + ' (' + statSync(FICHEIRO).size + ' B, md5 ' + md5(readFileSync(FICHEIRO)) + ')');
