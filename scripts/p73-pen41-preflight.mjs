#!/usr/bin/env node
// P73-PEN41-PREFLIGHT — só leitura. A candidata `scripts/p73-pen41-ddl-candidata.sql` substitui QUATRO policies
// de leitura em `students` e `classes`; cada substituição é irrecuperável por suposição (DROP POLICY duma policy
// que entretanto mudou apaga o que estava lá, e uma policy sem EXECUTE no predicado que ela chama fecha a mesa a
// todos — foi exactamente assim que o ciclo sm4 partiu o escopo municipal, medido em §SM.18). Por isso nada do
// que a candidata afirma sobre o estado vivo fica em prosa no SQL: é medido aqui, e o verde deste programa é
// condição necessária (não suficiente) para qualquer OK de aplicação.
// Uso: node scripts/p73-pen41-preflight.mjs            (modo candidata: exige o estado de ENTRADA)
//      node scripts/p73-pen41-preflight.mjs --reversao (modo reversao: exige o estado de SAIDA da candidata)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen41-preflight-${MODO}-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();

const CAND = join(REPO, 'scripts/p73-pen41-ddl-candidata.sql');
const REV = join(REPO, 'scripts/p73-pen41-ddl-reversao.sql');
if (!existsSync(CAND) || !existsSync(REV)) throw new Error('ABORTA: falta a candidata ou a reversao em scripts/');
const txtCand = readFileSync(CAND, 'utf8');
const txtRev = readFileSync(REV, 'utf8');
const bufCand = readFileSync(CAND);
const bufRev = readFileSync(REV);
const pegada = (b) => ({ bytes: b.length, md5: createHash('md5').update(b).digest('hex') });

// As quatro, e só as quatro, que esta candidata substitui.
const POLIT = ['director_dashboard_read_students', 'director_dashboard_read_classes', 'students_select_secretary', 'classes_select_secretary'];
const MESAS = ['students', 'classes'];
const HELP = 'bfr_school_in_own_school_scope';
const CLAUSE_ESCOPO_ESCRITA = HELP + '(school_id)';
const sim = (v) => v === true || String(v).toLowerCase() === 't' || String(v).toLowerCase() === 'true';
const nao = (v) => v === false || String(v).toLowerCase() === 'f' || String(v).toLowerCase() === 'false';

// ---- régua de forma ------------------------------------------------------------
// Comparar SQL por texto exacto é impossível: o deparser do Postgres acrescenta parênteses e aspas que quem
// escreveu não escreveu. `forma` tira o ruído (maiúsculas, aspas duplas, espaços, parênteses redundantes, o
// prefixo `public.`). LIMITAÇÃO DECLARADA: `a AND (b OR c)` e `(a AND b) OR c` têm a mesma forma — por isso
// cada uso de `forma` é acompanhado por `operadores`, que conta os conectivos e é sensível a essa diferença.
const forma = (t) => String(t).toLowerCase().replace(/public\./g, '').replace(/["\s()]/g, '');
const operadores = (t) => {
  const s = ' ' + String(t).toLowerCase().replace(/["']/g, ' ') + ' ';
  return { and: (s.match(/\sand\s/g) || []).length, or: (s.match(/\sor\s/g) || []).length };
};

// ---- extracção do USING dos ficheiros ------------------------------------------
// Parênteses equilibrados, comentários fora: um `USING ((a) AND (b))` cortado ao primeiro `)` daria um delta
// falso. O fixture abaixo prova que o extractor apanha o grupo inteiro e que recusa o que não fecha.
function extrai_usings(texto) {
  const fora = texto.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
  const res = {};
  const re = /CREATE\s+POLICY\s+([a-z_0-9]+)\s+ON\s+[a-z_.]+[^;]*?\bUSING\s*\(/gi;
  let m;
  while ((m = re.exec(fora)) !== null) {
    const ini = m.index + m[0].length;
    let nivel = 1, fim = -1;
    for (let i = ini; i < fora.length; i++) {
      if (fora[i] === '(') nivel++;
      else if (fora[i] === ')') { nivel--; if (nivel === 0) { fim = i; break; } }
    }
    res[m[1]] = fim === -1 ? null : fora.slice(ini, fim);
  }
  return res;
}
const FIX_SQL = [
  'BEGIN;',
  'DROP POLICY sint_a ON public.mesa_sint;',
  'CREATE POLICY sint_a ON public.mesa_sint FOR SELECT TO authenticated USING ((x = 1) AND public.f(school_id));',
  'DROP POLICY sint_b ON public.mesa_sint;',
  'CREATE POLICY sint_b ON public.mesa_sint FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM perfis q WHERE (q.id = auth.uid() AND q.p = \'cargo\'::tipo))));',
  '-- DROP POLICY sint_c — texto de comentário, não conta para a estrutura',
  'CREATE POLICY sint_c ON public.mesa_sint FOR SELECT TO authenticated USING ((a AND b;',
  'COMMIT;',
].join('\n');
const usingsFix = extrai_usings(FIX_SQL);
const contasSql = (texto) => {
  const t = texto.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
  const c = (re) => (t.match(re) || []).length;
  return { transaccao: (t.match(/^BEGIN;/gm) || []).length + (t.match(/^COMMIT;/gm) || []).length,
    drop_policy: c(/^\s*DROP POLICY /gim), create_policy: c(/^\s*CREATE POLICY /gim),
    create_function: c(/^\s*CREATE FUNCTION /gim), drop_function: c(/^\s*DROP FUNCTION /gim),
    grant: c(/^\s*GRANT /gim), revoke: c(/^\s*REVOKE/gim), insert: c(/^\s*INSERT INTO/gim),
    literais_uuid: (t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []).length };
};
const fixContas = contasSql(FIX_SQL);
// No fixture há duas linhas DROP reais e uma terceira dentro de comentário: se o removedor de comentários
// falhasse, a contagem daria 3 e o fixture diria que o comentário foi contado como código.
const FIX_COMENTARIO_NAO_CONTA = fixContas.drop_policy === 2 && fixContas.create_policy === 3 && fixContas.transaccao === 2;
const FIX_USING_EQUILIBRADO = usingsFix.sint_a === '(x = 1) AND public.f(school_id)' && String(usingsFix.sint_b).includes('q.p = \'cargo\'::tipo))');
const FIX_USING_DESEQUILIBRADO_E_NULL = usingsFix.sint_c === null;

const usingsCand = extrai_usings(txtCand);
const usingsRev = extrai_usings(txtRev);
// A clausula comparada deriva-se por `forma`, nunca dactilografada no resultado: `forma` deparenthesa, logo a
// string escrita a mao com `(school_id)` jamais casaria. O controlo externo desta derivação está no portão 2,
// onde é o catálogo (a única policy viva que já usa o predicado) a confirmar que a forma medida bate com a forma derivada.
const CLAUSE_ESCOPO_AND = forma('AND public.' + HELP + '(school_id)');
// Dois eixos separados, porque o catálogo mostra os dois: `usa_o_predicado` é PRESENÇA (a única policy viva que
// chama este predicado conjuga-o com `OR`, e uma régua que exigisse `AND` chamaria-lhe «sem escopo»);
// `CLAUSE_ESCOPO_AND` é a FORMA EXACTA que a candidata acrescenta, e só se usa no delta ficheiro-a-ficheiro.
const usa_o_predicado = (t) => forma(t).includes(forma(HELP + '(school_id)'));
const tem_escopo = usa_o_predicado;

// ---- estado vivo ----------------------------------------------------------------
const [ctx] = await sql('select current_user as utilizador, pg_backend_pid() as pid');
const vivas = await sql(`select c.relname as mesa, po.polname, po.polcmd::text as cmd,
  coalesce((select string_agg(g.rolname::text, ',' order by g.rolname) from pg_roles g where g.oid = any(po.polroles)), '<todos>') as papeis,
  pg_get_expr(po.polqual, po.polrelid) as qual,
  coalesce(pg_get_expr(po.polwithcheck, po.polrelid), 'nada') as withcheck
  from pg_policy po join pg_class c on c.oid = po.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname in (${MESAS.map((m) => `'${m}'`).join(',')}) order by 1, 2`);
const todas = await sql(`select c.relname as mesa, po.polname from pg_policy po join pg_class c on c.oid = po.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname in (${MESAS.map((m) => `'${m}'`).join(',')}) order by 1, 2`);
const porMesa = MESAS.map((m) => ({ mesa: m, policies: todas.filter((x) => x.mesa === m).map((x) => x.polname) }));
const vivasPorNome = Object.fromEntries(vivas.map((p) => [p.polname, p]));

// O controlo positivo do detector de escopo tem de vir do catálogo, não da minha escrita: existirá em baixo a
// lista das policies vivas cujo `qual` menciona o nome do predicado (agulha por nome, lida do catálogo), e o
// portão 2 exige que a MINHA régua as acenda. Se `tem_escopo` estivesse partida, a lista do catálogo seria
// vazia ou discordante — e é essa discordância que o portão apanha, não uma lista que eu filtre por ela própria.
const controloPositivo = (await sql(`select c.relname as mesa, po.polname, po.polcmd::text as cmd,
  pg_get_expr(po.polqual, po.polrelid) as qual
  from pg_policy po join pg_class c on c.oid = po.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where pg_get_expr(po.polqual, po.polrelid) like '%${HELP}%' order by 1, 2`)).filter((p) => !POLIT.includes(p.polname));

// O texto de referência NÃO é a minha memória: é o censo versionado de 20/11, que tem o `qual` destas quatro.
const censo = JSON.parse(readFileSync(join(REPO, 'evidence/p73-politicas-municipais-20-11e.json'), 'utf8'));
const refCenso = Object.fromEntries(censo.policies.filter((p) => POLIT.includes(p.polname)).map((p) => [p.polname, p]));
const alcance = JSON.parse(readFileSync(join(REPO, 'evidence/p73-pen38-alcance-por-concessao-20-11e.json'), 'utf8'));

const funcs = await sql(`select n.nspname as esquema, p.proname as nome, pg_get_function_identity_arguments(p.oid) as argumentos,
  p.prosecdef::text as definer, p.provolatile as volatilidade, pg_get_userbyid(p.proowner)::text as dono,
  coalesce(array_to_string(p.proconfig, ';'), '<sem set>') as config,
  coalesce(array_to_string(p.proacl, ';'), '<default>') as acl,
  has_function_privilege('authenticated'::regrole, p.oid, 'EXECUTE')::text as authenticated_pode,
  has_function_privilege('anon'::regrole, p.oid, 'EXECUTE')::text as anon_pode
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.proname in ('${HELP}', 'current_role') order by 2`);
const helper = funcs.find((f) => f.nome === HELP) || null;

const estrutura = await sql(`select relname as mesa, relrowsecurity::text as rls, relforcerowsecurity::text as force_rls,
  pg_get_userbyid(relowner)::text as dono from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where relname in (${MESAS.map((m) => `'${m}'`).join(',')}, 'staff_schools', 'profiles') order by 1`);
const colunas = await sql(`select table_name as mesa, column_name as coluna, data_type as tipo, is_nullable as nullavel
  from information_schema.columns where table_schema = 'public' and table_name in (${MESAS.map((m) => `'${m}'`).join(',')})
  and column_name in ('school_id', 'id') order by 1, 2`);

const totais = await sql(`select 'students' as mesa, count(*)::int as linhas, count(distinct school_id)::int as escolas_distintas from public.students
  union all select 'classes', count(*)::int, count(distinct school_id)::int from public.classes
  union all select 'staff_schools', count(*)::int, count(distinct school_id)::int from public.staff_schools
  union all select 'schools', count(*)::int, null::int from public.schools
  order by 1`);
const semMunicipio = await sql(`select count(*)::int as escolas_sem_municipio from public.schools where municipality_id is null`);
const populacao = await sql(`with dados as (
    select school_id as escola from public.students group by 1 having count(*) > 0
    union select school_id from public.classes group by 1 having count(*) > 0),
  pf as (select p.id, p.role::text as papel,
    exists (select 1 from public.staff_schools ss where ss.profile_id = p.id) as tem_vinculo,
    exists (select 1 from public.staff_schools ss join dados d on d.escola = ss.school_id where ss.profile_id = p.id) as ligado_a_dados
    from public.profiles p where p.role::text in ('director', 'secretary'))
  select papel, count(*)::int as perfis, count(*) filter (where tem_vinculo)::int as com_vinculo,
    count(*) filter (where not tem_vinculo)::int as sem_vinculo,
    count(*) filter (where ligado_a_dados)::int as ligado_a_escola_com_dados
  from pf group by papel order by papel`);
// nomes proprios de escola servem para caçar etiquetagem hardcoded no SQL; o registo imprime só o numero de
// colisoes, nunca o nome (a medida e «existe algum nome de escola real dentro do DDL?», nao «qual»).
let nomesEscolas = [];
try { nomesEscolas = (await sql('select name as nome from public.schools where name is not null order by 1')).map((x) => String(x.nome)).filter((x) => x.length > 3); }
catch { nomesEscolas = []; }
const caça_nomes = (t) => nomesEscolas.filter((nm) => t.includes(nm)).length;

const estruturaCand = contasSql(txtCand);
const estruturaRev = contasSql(txtRev);
const EXPECT = { transaccao: 2, drop_policy: 4, create_policy: 4, create_function: 0, drop_function: 0, grant: 0, revoke: 0, insert: 0, literais_uuid: 0 };

// ---- portões ----------------------------------------------------------------------
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };

const estadoEsperadoVivo = POLIT.map((n) => {
  const viva = vivasPorNome[n];
  const base = refCenso[n] ? forma(refCenso[n].qual) : null;
  if (!viva || base === null) return { polname: n, verde: false, motivo: 'em falta (viva ou censo)' };
  const formaViva = forma(viva.qual);
  const certa = MODO === 'candidata' ? formaViva === base : formaViva === base + CLAUSE_ESCOPO_AND;
  return { polname: n, mesa: viva.mesa, cmd: viva.cmd, papeis: viva.papeis, withcheck: viva.withcheck,
    escopo_na_viva: tem_escopo(viva.qual), verde: certa && viva.cmd === 'r' && viva.papeis === 'authenticated' && viva.withcheck === 'nada',
    qual_viva: viva.qual, qual_do_censo: refCenso[n].qual };
});
const portao1 = estadoEsperadoVivo.every((x) => x.verde === true) && estadoEsperadoVivo.length === 4;

const deltas = POLIT.map((n) => {
  const c = usingsCand[n], r = usingsRev[n], ref = refCenso[n];
  if (!c || !r || !ref) return { polname: n, verde: false, motivo: 'USING nao extraido ou censo sem referencia' };
  const formaCand = forma(c), formaRev = forma(r);
  const mesmo_and = operadores(c).and === operadores(r).and + 1;
  const mesmo_or = operadores(c).or === operadores(r).or;
  return { polname: n, forma_reversao: formaRev, clausula_medida: formaCand.slice(formaRev.length),
    delta_e_a_clausula: formaCand === formaRev + CLAUSE_ESCOPO_AND, mais_um_and: mesmo_and, mesmo_or,
    reversao_igual_ao_censo: formaRev === forma(ref.qual), verde: formaCand === formaRev + CLAUSE_ESCOPO_AND && mesmo_and && mesmo_or && formaRev === forma(ref.qual) };
});

const FIX_CLAUSULA_NAO_E_TAUTOLOGIA = (() => {
  const base = forma("(current_role()::text = 'director'::text)");
  const certa = base + CLAUSE_ESCOPO_AND;
  return {
    outra_clausula_nao_passa: certa !== base + forma('AND 1 = 1'),
    clausula_a_mais_nao_passa: certa !== base + forma('AND public.' + HELP + '(school_id) AND x = 1'),
    base_nao_dispara_a_presenca: usa_o_predicado(base) === false,
    certa_dispara_a_presenca: usa_o_predicado(certa) === true,
    or_dispara_a_presenca_mas_nao_o_and: usa_o_predicado('a OR public.' + HELP + '(school_id)') === true && forma('a OR public.' + HELP + '(school_id)').endsWith(CLAUSE_ESCOPO_AND) === false,
    conectivos_contam: operadores('a AND b').and === 1 && operadores('a AND (b OR c)').or === 1 && operadores("(current_role()::text = 'director'::text)").and === 0,
  };
})();
const FIX_FORMA_DETECTA_MUDANCA = forma("current_role()::text = 'director'::text") !== forma("current_role()::text = 'secretary'::text");

const varreduraAlvo = JSON.stringify({
  contexto: ctx, vivas: estadoEsperadoVivo, controlo_positivo: controloPositivo.map((p) => `${p.mesa}:${p.polname}`),
  funcs, estrutura, colunas, totais, escolas_sem_municipio: semMunicipio, populacao,
  estrutura_candidata: estruturaCand, estrutura_reversao: estruturaRev, fixture: { contas: fixContas, usings: usingsFix },
});
const varredura = { emails: (varreduraAlvo.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []).length,
  jwt: (varreduraAlvo.match(/eyJ[\w-]{10,}/g) || []).length };
const FIX_VARREDURA_DISPARA = 'maria@example.edu e um token eyJhbGciOiJIUzI1NiJ9.abcdefghij';
const varreduraFix = { emails: (FIX_VARREDURA_DISPARA.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []).length,
  jwt: (FIX_VARREDURA_DISPARA.match(/eyJ[\w-]{10,}/g) || []).length };

// O eixo deste portão é o código: um nome de escola num USING seria etiquetagem hardcoded e fecharia a policy
// a uma escola só. A menção em comentário de cabeçalho (prosa que descreve a medição) conta-se e imprime-se à
// parte, porque é outra coisa e não deve ser confundida com um predicado.
const semComentarios = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const etiquetagemHardcoded = { uuid_no_codigo: contasSql(semComentarios(txtCand)).literais_uuid + contasSql(semComentarios(txtRev)).literais_uuid,
  nomes_de_escola_no_codigo: caça_nomes(semComentarios(txtCand)) + caça_nomes(semComentarios(txtRev)),
  nomes_de_escola_so_em_prosa: caça_nomes(txtCand) + caça_nomes(txtRev) - caça_nomes(semComentarios(txtCand)) - caça_nomes(semComentarios(txtRev)) };
const FIX_ETIQUETAGEM_DISPARA = nomesEscolas.length > 0
  && contasSql(`CREATE POLICY x ON public.y USING (school_id = '11111111-2222-3333-4444-555555555555');`).literais_uuid === 1
  && caça_nomes(`CREATE POLICY z ON public.y USING (school_id IN (SELECT id FROM escolas WHERE nome = '${nomesEscolas[0]}'));`) === 1
  && caça_nomes(semComentarios(`-- só prosa: ${nomesEscolas[0]}`)) === 0;

const batemComAlcance = MESAS.concat(['staff_schools']).every((m) => {
  const vivo = totais.find((t) => t.mesa === m);
  return !!vivo && vivo.linhas === alcance.reais_sem_rls[m];
});
const coerentes = populacao.length === 2 && populacao.every((p) => p.com_vinculo + p.sem_vinculo === p.perfis && p.ligado_a_escola_com_dados <= p.com_vinculo);

const portoes = [
  g('o_estado_vivo_bate_com_o_que_este_modo_pressupoe', portao1, { modo: MODO, policies: estadoEsperadoVivo }),
  g('a_presenca_do_predicado_de_escopo_tem_controlo_positivo_no_catalogo', controloPositivo.length >= 1 && controloPositivo.every((p) => tem_escopo(p.qual)) && POLIT.every((n) => tem_escopo(usingsCand[n] || '')) && POLIT.every((n) => tem_escopo(usingsRev[n] || '') === false), { controlo_positivo: controloPositivo.map((p) => `${p.mesa}:${p.polname}`), controlo_lido_do_catalogo_por_agulha_de_nome: controloPositivo.map((p) => p.qual), na_candidata: POLIT.map((n) => tem_escopo(usingsCand[n] || '')), na_reversao: POLIT.map((n) => tem_escopo(usingsRev[n] || '')), clausula_derivada: CLAUSE_ESCOPO_AND }),
  g('o_predicado_de_escopo_e_definer_com_search_path_fixa_e_executavel_por_authenticated', !!helper && sim(helper.definer) && /search_path/i.test(helper.config) && sim(helper.authenticated_pode) && nao(helper.anon_pode), { funcoes: funcs.map((f) => `${f.esquema}.${f.nome}(${f.argumentos}) definer=${f.definer} config=${f.config} auth=${f.authenticated_pode} anon=${f.anon_pode} dono=${f.dono}`) }),
  g('o_dono_do_predicado_e_o_dono_da_mesa_de_vinculos_e_o_rls_dela_nao_forcado', !!helper && (() => { const ss = estrutura.find((x) => x.mesa === 'staff_schools'); return !!ss && ss.dono === helper.dono && nao(ss.force_rls); })(), { helper_dono: helper ? helper.dono : null, mesas: estrutura }),
  g('a_coluna_de_escopo_e_uuid_nao_nula_e_o_rls_das_duas_mesas_e_o_medido', MESAS.every((m) => colunas.some((c) => c.mesa === m && c.coluna === 'school_id' && c.tipo === 'uuid' && c.nullavel === 'NO')) && MESAS.every((m) => { const e = estrutura.find((x) => x.mesa === m); return !!e && sim(e.rls); }), colunas),
  g('o_conjunto_de_policies_das_duas_mesas_bate_com_o_censo_versionado', porMesa.every((x) => { const ref = censo.policies.filter((p) => p.tabela === x.mesa).map((p) => p.polname).sort(); return JSON.stringify([...x.policies].sort()) === JSON.stringify(ref); }), { lidas: porMesa, do_censo: MESAS.map((m) => ({ mesa: m, n: censo.policies.filter((p) => p.tabela === m).length })) }),
  g('a_estrutura_da_candidata_e_a_da_reversao_sao_as_certificadas', JSON.stringify(estruturaCand) === JSON.stringify(EXPECT) && JSON.stringify(estruturaRev) === JSON.stringify(EXPECT) && FIX_COMENTARIO_NAO_CONTA, { certificada: EXPECT, candidata: estruturaCand, reversao: estruturaRev, fixture_contas: fixContas }),
  g('as_definicoes_da_reversao_batem_com_o_texto_do_censo_nao_com_a_minha_reconstrucao', deltas.every((d) => d.reversao_igual_ao_censo === true) && FIX_FORMA_DETECTA_MUDANCA, { comparadas: deltas.map((d) => ({ polname: d.polname, reversao_igual_ao_censo: d.reversao_igual_ao_censo, forma_reversao: d.forma_reversao })), limitacao: 'forma ignora parenteses redundantes; operadores() em baixo cobre conectivos' }),
  g('o_delta_da_candidata_sobre_a_reversao_e_exactamente_a_clausula_de_escopo', deltas.length === 4 && deltas.every((d) => d.verde === true) && Object.values(FIX_CLAUSULA_NAO_E_TAUTOLOGIA).every(Boolean) && FIX_USING_EQUILIBRADO && FIX_USING_DESEQUILIBRADO_E_NULL, { deltas, fixtures: FIX_CLAUSULA_NAO_E_TAUTOLOGIA, extracao: { equilibrado: FIX_USING_EQUILIBRADO, desequilibrado_da_null: FIX_USING_DESEQUILIBRADO_E_NULL } }),
  g('a_candidata_e_a_reversao_nao_etaquetam_escola_por_id_nem_por_nome', etiquetagemHardcoded.uuid_no_codigo === 0 && etiquetagemHardcoded.nomes_de_escola_no_codigo === 0 && FIX_ETIQUETAGEM_DISPARA, { medida: etiquetagemHardcoded, escolas_na_rede_sem_imprimir_os_nomes: nomesEscolas.length }),
  g('os_totais_vivos_batem_com_a_medida_de_alcance_versionada', batemComAlcance, { agora: totais, na_referencia_de_alcance: alcance.reais_sem_rls }),
  g('a_populacao_afectada_tem_somas_coerentes_com_o_zero_impresso', coerentes, { por_papel: populacao, escolas_sem_municipio: semMunicipio, escolas_na_rede: (totais.find((t) => t.mesa === 'schools') || {}).linhas }),
  g('nenhum_identificador_pessoal_nem_token_entra_neste_registo', varredura.emails === 0 && varredura.jwt === 0 && varreduraFix.emails >= 1 && varreduraFix.jwt >= 1, { medida_no_registo: varredura, fixture_que_dispara: varreduraFix }),
];

const afetadosMantem = populacao.filter((p) => p.com_vinculo === p.perfis).map((p) => p.papel);
const afetadosPerdem = populacao.filter((p) => p.sem_vinculo).map((p) => `${p.papel}:${p.sem_vinculo}`);
const out = {
  programa: 'scripts/p73-pen41-preflight.mjs', modo: MODO, em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pressuposto: MODO === 'candidata'
    ? 'as quatro policies vivas ainda sao a regra de cargo sem clausula de escola, exatamente como medida no censo versionado de 20/11'
    : 'a candidata foi aplicada: as quatro policies vivas ja carregam a clausula de escopo, e a reversao ainda e o texto do censo',
  metodo: 'leitura do catalogo (pg_policy/pg_proc/pg_class/information_schema) + censo versionado p73-politicas-municipais-20-11e.json como texto de referencia + alcance versionado p73-pen38-alcance-por-concessao-20-11e.json como referencia de totais. Comparacao por `forma` (caixa/aspas/espacos/parenteses redundantes/public.) com a limitacao declarada e com `operadores` a contar conectivos, porque o deparser do Postgres nao devolve o texto como foi escrito.',
  contexto: { utilizador: ctx.utilizador },
  policies_das_quatro: estadoEsperadoVivo,
  clausula_de_escopo: { como_fica_no_sql: CLAUSE_ESCOPO_ESCRITA, presenca_derivada_da_forma: forma(HELP + '(school_id)'), forma_exacta_de_and_derivada: CLAUSE_ESCOPO_AND, nota: 'presenca serve para o estado vivo e para o controlo do catalogo (la o conectivo e OR); a forma de AND serve so para o delta candidata-vs-reversao' },
  policies_por_mesa: porMesa,
  controlo_positivo_do_detector: controloPositivo.map((p) => ({ mesa: p.mesa, polname: p.polname, qual: p.qual })),
  funcoes: funcs.map((f) => ({ nome: `${f.esquema}.${f.nome}`, argumentos: f.argumentos, definer: f.definer, config: f.config, dono: f.dono, authenticated_pode: f.authenticated_pode, anon_pode: f.anon_pode })),
  rls_mesas: estrutura,
  colunas_de_escopo: colunas,
  totais: { por_mesa: totais, referencia_alcance: alcance.reais_sem_rls, escolas_sem_municipio: (semMunicipio[0] || {}).escolas_sem_municipio },
  populacao_afectada: populacao,
  ficheiros: { candidata: { caminho: 'scripts/p73-pen41-ddl-candidata.sql', ...pegada(bufCand) }, reversao: { caminho: 'scripts/p73-pen41-ddl-reversao.sql', ...pegada(bufRev) } },
  estrutura: { certificada_ambos_os_ficheiros: EXPECT, candidata: estruturaCand, reversao: estruturaRev },
  deltas: deltas.map((d) => ({ polname: d.polname, clausula_medida: d.clausula_medida, delta_e_a_clausula: d.delta_e_a_clausula, mais_um_and: d.mais_um_and, reversao_igual_ao_censo: d.reversao_igual_ao_censo })),
  fixtures: { extracao_de_usings: { grupo_equilibrado_a_panhar_os_dois: FIX_USING_EQUILIBRADO, parentesis_que_nao_fecha_da_null: FIX_USING_DESEQUILIBRADO_E_NULL, contas: fixContas, comentario_contado_como_codigo: FIX_COMENTARIO_NAO_CONTA }, forma_detecta_mudanca: FIX_FORMA_DETECTA_MUDANCA, clausula_de_escopo_nao_e_tautologia: FIX_CLAUSULA_NAO_E_TAUTOLOGIA, varredura_de_pessoal: varreduraFix, etiquetagem_hardcoded: FIX_ETIQUETAGEM_DISPARA },
  varredura_de_pessoal_no_registo: varredura,
  conclusao: {
    frase_que_esta_corrida_autoriza: `no momento desta corrida, ${afetadosMantem.length === 0 ? 'nenhum' : afetadosMantem.join('/')} mantem a leitura porque tem vinculo em staff_schools para a escola onde os dados estao, e perdem-na ${afetadosPerdem.length === 0 ? 'ninguem' : afetadosPerdem.join(', ')}; a clausula acrescentada as quatro policies e exatamente ${CLAUSE_ESCOPO_ESCRITA}, nada mais.`,
    o_que_nao_prova: 'nao prova que a candidata, depois de aplicada, depte exatamente a forma escrita (o deparser re-escreve parenteses) nem que uma sessao autenticada de cada papel recebe os numeros calculados aqui: isso mede-se pelo `p73-pen38-alcance-por-concessao-20-11.mjs` re-corrido apos aplicacao.',
  },
  portoes, falhas,
  precedentes: ['evidence/p73-politicas-municipais-20-11e.json', 'evidence/p73-pen38-alcance-por-concessao-20-11e.json', 'scripts/p73-pen38-preflight.mjs'],
  o_que_este_verde_nao_autoriza: 'nada. A aplicacao do SQL continua a pedir OK literal novo; este programa so diz que o estado vivo e aquele contra que a candidata foi escrita e que os dois ficheiros tem a estrutura certificada.',
};
out.veredito = falhas.length === 0 ? `P73_PEN41_PREFLIGHT_VERDE_${MODO.toUpperCase()} ${portoes.length}/0` : `P73_PEN41_PREFLIGHT_VERMELHO_${falhas.length}`;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`P73_PEN41_PREFLIGHT_VERMELHO · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`MODO ${MODO} · contexto ${JSON.stringify(ctx.utilizador)} · pegada candidata ${out.ficheiros.candidata.md5} ${out.ficheiros.candidata.bytes} B · reversao ${out.ficheiros.reversao.md5} ${out.ficheiros.reversao.bytes} B`);
console.log(`TOTAIS ${JSON.stringify(totais.map((t) => `${t.mesa}=${t.linhas}${t.escolas_distintas === null ? '' : '/' + t.escolas_distintas + 'escola'}`))} · ESCOLAS_SEM_MUNICIPIO ${(semMunicipio[0] || {}).escolas_sem_municipio}`);
console.log(`POPULACAO ${JSON.stringify(populacao.map((p) => `${p.papel}: ${p.perfis} perfis, ${p.com_vinculo} com vinculo, ${p.sem_vinculo} sem`))}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
