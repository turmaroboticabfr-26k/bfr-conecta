#!/usr/bin/env node
// SM.23 peça 8 — O CENSO PÓS-APLICAÇÃO QUE O LEDGER VAI CITAR (SÓ LEITURA).
// Porque esta peça existe: PEN-22, PEN-23, PEN-29 e PEN-37 vão ser re-emitidas com números novos, e as
// cifras que tenho na conversa são de antes das três peças do OK de 18/11 (calendário aplicado, vista
// passada a invocador, dois agregados revogados a anon). Re-escrever o ledger com as cifras memorizadas é
// exactamente o defeito que a casa proíbe. Então re-medo o catálogo hoje e num só registo: as mesas do
// calendário, o modo de cada vista, o EXECUTE de cada função municipal por papel, e a higiene de grants.
// Junto também as pegadas dos artefactos que o §SM.23 vai citar, para que uma referência escrita em prosa
// seja verificável por caminho + md5 medidos agora, e não por nome lembrado.
// Zero escrita: SELECTs de catálogo e leituras de ficheiros próprios. Nenhuma chave lida nem impressa.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-censo-pos-aplicacao-para-o-ledger-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, não por cima');
const t0 = Date.now();

const md5 = (b) => createHash('md5').update(b).digest('hex');
const MESAS_CAL = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
// Nomes lidos do catálogo em 18/11, não dactilografados de memória: `bfr_municipal_access_grants` e
// `bfr_municipal_audit` são MESA (relkind r) e `bfr_municipal_school_stats` é VISTA (relkind v) — as três
// coisas que eu teria chamadas «funções» se tivesse escrito a lista de cabeça.
const REVOGADAS = ['bfr_municipal_network_totals', 'bfr_has_municipal_grant'];
const OUTRAS_FNS = ['bfr_municipal_municipalities', 'bfr_is_municipal_authority', 'bfr_school_in_municipal_scope', 'bfr_municipalities_visible'];
const MESAS_MUN = ['bfr_municipalities', 'bfr_municipal_access_grants', 'bfr_municipal_audit'];

// ---- (1) as três mesas que a PEN-29 dizia não existirem
const listas = MESAS_CAL.map((m) => "'" + m + "'").join(',');
const rels = await sql(
  "select c.relname::text as nome, c.relkind::text, coalesce(c.relrowsecurity,false)::text as rls, coalesce(c.relforcerowsecurity,false)::text as forcada "
  + 'from pg_class c join pg_namespace n on n.oid=c.relnamespace '
  + "where n.nspname='public' and c.relname in (" + listas + ') order by 1'
);
const politicas = await sql(
  'select c.relname::text as mesa, count(*)::int as n from pg_policy p join pg_class c on c.oid=p.polrelid '
  + "join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (" + listas + ') group by 1 order by 1'
);
const linhas = {};
for (const m of MESAS_CAL) {
  const r = await sql('select count(*)::int as n from public.' + m);
  linhas[m] = Array.isArray(r) ? r[0].n : ('ERRO ' + JSON.stringify(r).slice(0, 60));
}

// ---- (2) vistas de public: quantas, e em que modo cada uma corre
const vistas = await sql(
  'select c.relname::text as nome, pg_get_userbyid(c.relowner)::text as dono, r.rolbypassrls::text as bypass, '
  + "case when c.reloptions::text like '%security_invoker=true%' then 'invoker' "
  + "when c.reloptions::text like '%security_invoker=false%' then 'definer' else 'sem-opcao' end as modo "
  + 'from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner '
  + "where n.nspname='public' and c.relkind='v' order by 1"
);
const MODOS = ['invoker', 'definer', 'sem-opcao'];
const grelha_modos = MODOS.map((modo) => ({ modo, n: vistas.filter((v) => v.modo === modo).length }));
const soma_grelha = grelha_modos.reduce((a, x) => a + x.n, 0);
const vista_municipal = vistas.find((v) => v.nome === 'bfr_municipal_school_stats') || null;
const def_vista = await sql("select md5(pg_get_viewdef('public.bfr_municipal_school_stats'::regclass,true)) as h, pg_get_viewdef('public.bfr_municipal_school_stats'::regclass,true) as txt");
const def_h = Array.isArray(def_vista) ? def_vista[0].h : null;
const def_linhas_vista = Array.isArray(def_vista) ? String(def_vista[0].txt).split(/\r?\n/).length : 0;

// ---- (3) EXECUTE por papel em TODAS as funções do escopo municipal (por padrão, não por lista lembrada)
const funcs = await sql(
  "select p.proname::text as nome, coalesce(has_function_privilege('anon',p.oid,'EXECUTE')::text,'?') as anon_x, "
  + "coalesce(has_function_privilege('authenticated',p.oid,'EXECUTE')::text,'?') as auth_x, "
  + "coalesce(has_function_privilege('service_role',p.oid,'EXECUTE')::text,'?') as svc_x, "
  + "case when p.proacl is null then 'acl-nula' else 'acl-propria' end as acl, p.prosecdef::text as definer "
  + 'from pg_proc p join pg_namespace n on n.oid=p.pronamespace '
  + "where n.nspname='public' and (p.proname like '%municipal%' or p.proname like '%grant%') order by 1"
);
const por_nome = Object.fromEntries(funcs.map((f) => [f.nome, f]));
// As três mesas do DDL municipal, com as suas linhas de hoje (o censo de 18/11 dizia 1/4/0).
const linhas_mun = {};
for (const m of MESAS_MUN) {
  const r = await sql('select count(*)::int as n from public.' + m);
  linhas_mun[m] = Array.isArray(r) ? r[0].n : ('ERRO ' + JSON.stringify(r).slice(0, 60));
}

// ---- (4) higiene de grants sobre TODAS as funções de public (é a cifra da PEN-22)
const higiene = await sql(
  'select count(*)::int as total, '
  + "count(*) filter (where has_function_privilege('anon',p.oid,'EXECUTE'))::int as anon_x, "
  + "count(*) filter (where has_function_privilege('public',p.oid,'EXECUTE'))::int as public_x, "
  + "count(*) filter (where p.proacl is null)::int as acl_nula "
  + "from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"
);
const hid = Array.isArray(higiene) ? higiene[0] : {};

// ---- (5) controlo negativo: um nome que não existe não pode entrar no registo — e a mesma régua, com a
// mesma forma, tem de disparar num nome que existe (senão um zero é só uma consulta que não sabe perguntar)
const fantasma = await sql(
  "select count(*) filter (where p.proname like '%municipal%')::int as agulha_que_existe, "
  + "count(*) filter (where p.proname like '%inexistente_zzz%')::int as agulha_que_nao_existe "
  + 'from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=\'public\''
);
const fxl2 = Array.isArray(fantasma) ? fantasma[0] : {};
const registo_fantasma = await sql(
  "select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace "
  + "where n.nspname='public' and p.proname like '%inexistente_zzz%'"
);
const fantasma_n = Array.isArray(registo_fantasma) ? registo_fantasma[0].n : null;

// ---- (6) fixture da régua de EXECUTE: tem de saber dizer sim e não no mesmo eixo
const fx = await sql(
  "select has_function_privilege('anon','pg_catalog.now()'::regprocedure,'EXECUTE')::text as sim, "
  + "count(*) filter (where has_function_privilege('anon',p.oid,'EXECUTE'))::int as outras_com_sim, "
  + "count(*) filter (where not has_function_privilege('anon',p.oid,'EXECUTE'))::int as outras_com_nao "
  + "from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"
);
const fxl = Array.isArray(fx) ? fx[0] : {};

// ---- (7) pegadas dos artefactos que o §SM.23 vai citar
const CITADOS = [
  'evidence/sm23-aplicacao-calendario-18-11-VERMELHO.json',
  'evidence/sm23-conferencia-calendario-18-11.json',
  'evidence/sm23-preflight-ddl-18-11.json',
  'evidence/sm23-preflight-view-funcoes-18-11.json',
  'evidence/sm23-aplicacao-view-funcoes-18-11.json',
  'evidence/sm23-causa-vista-18-11.json',
  'evidence/sm23-causa-predicado-18-11.json',
  'evidence/sm23-censo-municipios-18-11.json',
  'evidence/sm23-conferencia-nomes-municipais-18-11.json',
  'evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11.json',
  'evidence/sm23-escopo-aplicado-por-leitura-18-11.json',
  'evidence/sm23-sonda-com-sessao-antes-18-11.json',
  'evidence/sm23-sonda-com-sessao-depois-18-11.json',
  'scripts/ah2-ddl-calendario-candidata.sql',
];
const pegadas = CITADOS.map((c) => {
  const p = join(REPO, c);
  if (!existsSync(p)) return { caminho: c, existe: false };
  const b = readFileSync(p);
  return { caminho: c, existe: true, bytes: b.length, md5: md5(b) };
});
const lido = (c) => JSON.parse(readFileSync(join(REPO, c), 'utf8'));
const art_inv = lido('evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11.json');
const art_esp = lido('evidence/sm23-escopo-aplicado-por-leitura-18-11.json');
const grafia = (eixo, verbo, grafo) => ((art_inv.grelha_de_grafias[eixo] || []).find((x) => x.verbo === verbo && x.grafo === grafo) || {}).ocorrencias;
const escopo_citado = {
  involucro_chars: art_inv.involucro.chars,
  ancora_dentro: art_inv.involucro.ancoras_bfrMunicipal_dentro,
  ancora_corpus: art_inv.involucro.ancoras_no_corpus,
  from_ponto_no_involucro: grafia('no_involucre', 'from', 'com_ponto'),
  from_solto_no_involucro: grafia('no_involucre', 'from', 'solto'),
  from_ponto_no_corpus: grafia('no_corpus', 'from', 'com_ponto'),
  rpc_no_involucro: grafia('no_involucre', 'rpc', 'com_ponto'),
  mesas_abertas: (art_inv.mesas_e_funcoes_nomeadas.no_involucro || []).length,
  leituras: art_esp.leituras.length,
  colunas_filtradas: art_esp.resumo.colunas_filtradas_em_todas_as_leituras,
  leituras_que_filtram_municipio: art_esp.resumo.leituras_que_filtram_por_municipio,
  familias: art_esp.mencoes_de_municipio_no_involucre_por_familia.map((x) => x.familia + '=' + x.ocorrencias),
};

// ---- portões (cada um pode divergir; as classes vazias imprimem-se com a sua prédica)
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome + ': ' + JSON.stringify(detalhe).slice(0, 300)); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('as_tres_mesas_dizidas_em_PEN-29_existem_agora', rels.length === 3 && rels.every((r) => r.relkind === 'r'), { lidas: rels.map((r) => r.nome + '/' + r.relkind), esperadas: MESAS_CAL }),
  g('as_tres_mesas_estao_vazias_e_isto_imprime_a_linha_zero', MESAS_CAL.every((m) => linhas[m] === 0), { linhas,predicate: 'count(*) == 0 por mesa' }),
  g('a_rls_das_tres_mesas_esta_ligada_e_forcada', rels.length === 3 && rels.every((r) => r.rls === 'true' && r.forcada === 'true'), rels.map((r) => r.nome + ' rls=' + r.rls + ' forcada=' + r.forcada)),
  g('cada_mesa_do_calendario_tem_a_sua_politica_registada', politicas.length === 3 && politicas.every((p) => p.n >= 1), politicas),
  g('a_vista_municipal_passou_a_correr_como_invocador', !!vista_municipal && vista_municipal.modo === 'invoker', vista_municipal || { nota: 'a vista nao apareceu no censo', grelha: grelha_modos }),
  g('a_definicao_da_vista_nao_mudou_sozinha', def_h === 'af7a898df0af2401d80f289a0736dcd2', { def_md5: def_h, linhas_do_def: def_linhas_vista }),
  g('as_seis_funcoes_do_escopo_municipal_foram_lidas_por_papel', REVOGADAS.concat(OUTRAS_FNS).every((n) => !!por_nome[n]) && funcs.length >= 6, { lidas: funcs.map((f) => f.nome + '/anon=' + f.anon_x + '/auth=' + f.auth_x), esperadas: REVOGADAS.concat(OUTRAS_FNS) }),
  g('as_duas_funcoes_revogadas_a_anon_estao_revogadas_e_so_a_anon', REVOGADAS.every((n) => por_nome[n] && por_nome[n].anon_x === 'false' && por_nome[n].auth_x === 'true'), REVOGADAS.map((n) => n + '=' + JSON.stringify(por_nome[n] || null))),
  g('o_gate_da_porta_continua_executavel_por_authenticated', (por_nome.bfr_is_municipal_authority || {}).auth_x === 'true', por_nome.bfr_is_municipal_authority || null),
  g('as_tres_mesas_municipais_existem_e_imprimem_as_suas_linhas', MESAS_MUN.every((m) => Number.isInteger(linhas_mun[m])), { linhas: linhas_mun, predicate: 'count(*) por mesa, inclusive os zeros' }),
  g('a_regua_de_execute_sabe_dizer_sim_e_nao_no_mesmo_eixo', fxl.sim === 'true' && Number(fxl.outras_com_sim) > 0 && Number(fxl.outras_com_nao) > 0, { fixture: fxl, anon_x_por_nome: Object.entries(por_nome).map(([k, v]) => k + '=' + v.anon_x) }),
  g('a_regua_nao_inventa_nada_no_controlo_negativo_e_dispara_no_positivo', Number(fxl2.agulha_que_existe) >= 5 && Number(fxl2.agulha_que_nao_existe) === 0 && fantasma_n === 0, { agulha_que_existe: fxl2.agulha_que_existe, agulha_que_nao_existe: fxl2.agulha_que_nao_existe, linhas_por_nome_fantasma: fantasma_n }),
  g('a_grelha_de_modos_bate_com_o_censo_e_imprime_os_zeros', soma_grelha === vistas.length && grelha_modos.length === MODOS.length, { total_vistas: vistas.length, grelha: grelha_modos }),
  g('a_cifra_de_higiene_de_funcoes_sai_do_catalogo_de_hoje', Number(hid.total) > 100 && Number(hid.anon_x) > 0 && Number(hid.anon_x) < Number(hid.total), hid),
  g('todo_artefacto_citado_no_documento_existe_com_pega_medida', pegadas.every((p) => p.existe && p.bytes > 1000), pegadas.filter((p) => !p.existe || p.bytes <= 1000).map((p) => p.caminho)),
  g('as_cifras_do_modulo_no_ar_foram_lidas_dos_registos_e_nao_dactilografadas', escopo_citado.involucro_chars > 5000 && escopo_citado.leituras >= 12 && Number.isInteger(escopo_citado.from_ponto_no_involucro) && escopo_citado.familias.length === 6, escopo_citado),
  g('nenhuma_leitura_do_modulo_filtra_por_municipio_e_isto_lido_do_artefacto', Array.isArray(escopo_citado.leituras_que_filtram_municipio) && escopo_citado.leituras_que_filtram_municipio.length === 0 && JSON.stringify(escopo_citado.colunas_filtradas) === JSON.stringify(['school_id']), escopo_citado),
];

const o = {
  programa: 'scripts/sm23-censo-pos-aplicacao-para-o-ledger-18-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'que cifras o ledger e o §SM.23 podem citar depois das três peças do OK de 18/11, medidas hoje e não lembradas?',
  calendario: { mesas: rels, politicas, linhas_por_mesa: linhas },
  vistas: { total: vistas.length, grelha_por_modo: grelha_modos, sem_invoker: vistas.filter((v) => v.modo !== 'invoker').map((v) => v.nome), municipal: vista_municipal, def_md5: def_h, def_linhas: def_linhas_vista },
  funcoes_do_escopo: funcs,
  mesas_municipais: { nomes: MESAS_MUN, linhas: linhas_mun },
  higiene_funcoes_public: hid,
  controlo_negativo: fxl2,
  fixture_da_regua: fxl,
  escopo_do_modulo_lido_dos_registos: escopo_citado,
  pegadas_dos_citados: pegadas,
  portoes,
};
o.veredito = falhas.length === 0 ? 'CENSO_LEDGER_CONFERIDO' : 'VERMELHO: ' + falhas.length;
o.falhas = falhas;
o.conclusao = {
  frases_que_esta_corrida_autoriza: [
    'as ' + rels.length + ' mesas nomeadas na PEN-29 existem no catálogo de hoje (' + MESAS_CAL.map((m) => m + '=' + linhas[m] + ' linhas').join(', ') + ') com RLS forçada e ' + politicas.map((p) => p.mesa + ':' + p.n).join(', ') + ' policies — estrutura criada, conteúdo não',
    'a vista ' + ((vista_municipal || {}).nome || '?') + ' corre como ' + ((vista_municipal || {}).modo || '?') + '; das ' + vistas.length + ' vistas de public, ' + grelha_modos.map((x) => x.modo + '=' + x.n).join(' ') + ' (a grelha imprime os zeros)',
    'as duas funções que a PEN-37 nomeava já não são executáveis por anon (' + REVOGADAS.map((n) => n + '=' + (por_nome[n] || {}).anon_x).join(', ') + ') e continuam executáveis por authenticated; o gate da porta não foi tocado: o REVOKE tirou um agregado anónimo, não a autenticação',
    'no ar de hoje o módulo abre ' + escopo_citado.mesas_abertas + ' mesas em ' + escopo_citado.leituras + ' leituras, o único filtro enviado ao servidor é ' + JSON.stringify(escopo_citado.colunas_filtradas) + ' e as famílias de agulha dão ' + JSON.stringify(escopo_citado.familias),
  ],
  o_que_este_artefacto_nao_prova: [
    'não prova que as mesas do calendário devam ter linhas: diz que estão vazias, que é a diferença entre DDL aplicado e função exercida (conteúdo fica na RM-5.2)',
    'não prova o que cada papel lê nas mesas: as contagens por papel estão em sm23-causa-vista-18-11.json e sm23-sonda-com-sessao-depois-18-11.json',
    'não re-escreve o censo de privilégios por mesa (só o de funções), portanto não substitui o portão de higiene da PEN-22',
  ],
};
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('SM23_CENSO_VERMELHO · registo ' + p);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('CALENDARIO', JSON.stringify(rels.map((r) => r.nome + ' rls=' + r.rls + ' forcada=' + r.forcada)), 'LINHAS', JSON.stringify(linhas), 'POLICIES', JSON.stringify(politicas));
console.log('VISTAS', JSON.stringify(grelha_modos), 'SEM_INVOKER', JSON.stringify(o.vistas.sem_invoker), 'MUNICIPAL', JSON.stringify(vista_municipal), 'def_md5=' + def_h);
console.log('FUNCOES', JSON.stringify(funcs.map((f) => f.nome + ' anon=' + f.anon_x + ' auth=' + f.auth_x + ' acl=' + f.acl + ' def=' + f.definer)));
console.log('HIGIENE', JSON.stringify(hid), 'NEGATIVO', JSON.stringify(o.controlo_negativo), 'FIXTURE', JSON.stringify(fxl));
console.log('ESCOPO', JSON.stringify(escopo_citado));
console.log('PEGADAS', JSON.stringify(pegadas.map((p) => p.caminho.replace('evidence/', '') + '=' + p.bytes + 'B/' + String(p.md5).slice(0, 8))));
for (const x of o.portoes) console.log('  portao ' + x.nome + ': ' + (x.verde ? 'VERDE' : 'VERMELHO'));
console.log('SM23_CENSO_CONFERIDO · registo ' + OUT + ' · ' + o.duracao_ms + ' ms');
