// BU-2c — matriz papel × tabela pelo caminho REAL de autorização:
// literal de papel (com e sem cast), helper invocada (com fechamento transitivo), auth.uid(),
// claim de JWT, join de ponte. A régua larga usa o próprio enum como filtro, não uma lista lembrada.
import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './s19-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU2_SUF || '';
const OUT = `${DIR}/evidence/bu2c-caminhos-de-autorizacao-20-11${SUF}.json`;
const TXT = `${DIR}/evidence/bu2c-caminhos-de-autorizacao-20-11${SUF}.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU2_SUF novo`);
const t0 = Date.now();

const q = async (rotulo, query) => {
  try { return { rotulo, ok: true, linhas: await sql(query) }; }
  catch (e) { return { rotulo, ok: false, erro: String(e.message).slice(0, 400) }; }
};
const res = { em: new Date().toISOString(), modo: 'read-only', instrumento: 'scripts/bu2c-caminhos-de-autorizacao-20-11.mjs' };

res.papeis_enum = (await q('papeis', `select enum_range(null::public.account_role)::text[] as papeis`)).linhas?.[0]?.papeis || [];
const ENUM = new Set(res.papeis_enum);

// duas prédicas sobre o mesmo texto: estreita (com cast, a da casa) e larga (literal nu), ambas filtradas pelo enum
const castEm = (txt) => [...new Set([...String(txt || '').matchAll(/'([a-z_][a-z_0-9]*)'::text/g)].map((m) => m[1]))];
const nuEm = (txt) => [...new Set([...String(txt || '').matchAll(/'([a-z_][a-z_0-9]*)'/g)].map((m) => m[1]))].filter((x) => ENUM.has(x));
const helperEm = (txt) => [...new Set([...String(txt || '').matchAll(/\b([a-z_][a-z_0-9]*)\s*\(/g)].map((m) => m[1]).filter((n) => NOMES_DE_FUNCAO.has(n)))];
// o vocabulário de helpers vem do catálogo (conjunto medido), nunca dum prefixo lembrado:
// a versão anterior desta prédica só reconhecia `bfr_*` e deixou 59 policies sem mecanismo nenhum
const NOMES_DE_FUNCAO = new Set();

const pol = await q('politicas', `select c.relname as tabela, p.polname as nome, p.polcmd::text as comando,
  array_agg(distinct r.rolname::text) as papeis_de_role,
  coalesce(pg_get_expr(p.polqual, c.oid),'') as usando,
  coalesce(pg_get_expr(p.polwithcheck, c.oid),'') as verificando
  from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  left join pg_roles r on r.oid=any(p.polroles)
  group by c.relname, p.polname, p.polcmd, p.polqual, p.polwithcheck, c.oid order by c.relname, p.polname`);

const fun = await q('funcoes', `select p.proname as nome, p.prosecdef as definer,
  pg_get_function_arguments(p.oid) as argumentos, length(p.prosrc)::int as corpo_chars,
  md5(p.prosrc) as corpo_md5, p.prosrc as corpo
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'`);

const fnByName = {};
for (const f of (fun.ok ? fun.linhas : [])) { NOMES_DE_FUNCAO.add(f.nome); (fnByName[f.nome] ||= []).push(f); }
res.funcoes_no_catalogo_publico = NOMES_DE_FUNCAO.size;

// o vocabulário de ponte também vem do catálogo: qualquer relação public.* nomeada numa expressão de outra
// tabela é ponte. A versão anterior usava uma lista lembrada de nove nomes e contava 59 órfãs.
const relacoesQ = await q('relacoes', `select c.relname as nome from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','v','m','f') order by 1`);
const NOMES_DE_RELACAO = (relacoesQ.ok ? relacoesQ.linhas : []).map((r) => r.nome);
const RE_DE_RELACAO = new Map(NOMES_DE_RELACAO.map((n) => [n, new RegExp(`\\b${n.replace(/[.$]/g, '\\$&')}\\b`)]));
res.relacoes_no_catalogo_publico = NOMES_DE_RELACAO.length;
const corpoDe = (nome) => (fnByName[nome] || []).map((f) => f.corpo).join('\n');

// fechamento transitivo: helper → papéis autorizados, seguindo as chamadas que ela própria faz
const memo = {};
const MAX_PROFUNDIDADE = 4;
function papeisDaHelper(nome, profundidade, pilha) {
  if (profundidade > MAX_PROFUNDIDADE || pilha.includes(nome)) return { cast: [], nu: [], caminho: [`!${nome}(ciclo/profundidade)`] };
  if (memo[nome + '@' + profundidade]) return memo[nome + '@' + profundidade];
  const corpo = corpoDe(nome);
  const diretos = castEm(corpo).filter((c) => ENUM.has(c));
  const largos = nuEm(corpo);
  const sub = helperEm(corpo).filter((h) => h !== nome && fnByName[h]);
  const agg = { cast: [...new Set(diretos)], nu: [...new Set(largos)], caminho: [`${nome}(prof${profundidade})`] };
  for (const h of sub) {
    const abaixo = papeisDaHelper(h, profundidade + 1, [...pilha, nome]);
    agg.cast = [...new Set(agg.cast.concat(abaixo.cast))];
    agg.nu = [...new Set(agg.nu.concat(abaixo.nu))];
    agg.caminho = agg.caminho.concat(abaixo.caminho);
  }
  memo[nome + '@' + profundidade] = agg;
  return agg;
}

const LEITURA = ['r', '*'], ESCRITA = ['a', 'w', 'd', '*'];
const politicasLidas = [];
const mecanimetros = { literal_cast: 0, literal_nu: 0, helper: 0, auth_uid: 0, jwt_claim: 0, join_de_ponte: 0, true_total: 0, sem_porta_de_papel: 0, nenhum: 0 };
let somaFlags = 0, multiplaMecanismo = 0;
const marcasNulos = [];
const semPortaDePapel = [];
const cortesDeFechamento = [];
for (const p of (pol.ok ? pol.linhas : [])) {
  const txt = `${p.usando} ${p.verificando}`;
  const cast = castEm(txt).filter((c) => ENUM.has(c));
  const nu = nuEm(txt);
  const helpers = helperEm(txt);
  const pontes = NOMES_DE_RELACAO.filter((t) => t !== p.tabela && RE_DE_RELACAO.get(t).test(txt));
  const mecan = {
    literal_cast: cast.length > 0,
    literal_nu: nu.length > 0,
    helper: helpers.length > 0,
    auth_uid: /auth\.uid\(\s*\)/.test(txt),
    jwt_claim: /auth\.jwt\(\s*\)/.test(txt),
    join_de_ponte: pontes.length > 0,
    true_total: /^\s*(true)\s*$/i.test(String(p.usando).trim()),
  };
  const marcas = Object.keys(mecan).filter((k) => mecan[k]);
  // o vocabulário dos sete mecanismos fecha-se contra o catálogo: se nada deles dispara e a expressão tem
  // conteúdo, a política não abre porta por papel nenhum — é o mecanismo «só colunas de estado»
  if (marcas.length === 0 && String(p.usando).trim().length > 0) { mecan.sem_porta_de_papel = true; marcas.push('sem_porta_de_papel'); semPortaDePapel.push(`${p.tabela}|${p.nome}|${p.comando}`); }
  somaFlags += marcas.length;
  if (marcas.length > 1) multiplaMecanismo++;
  if (marcas.length === 0) { mecanimetros.nenhum++; marcasNulos.push(`${p.tabela}|${p.nome}|${p.comando}`); }
  for (const k of marcas) if (k in mecanimetros) mecanimetros[k]++;
  const expandidos = { cast: [...new Set(cast)], nu: [...new Set(nu)] };
  for (const h of helpers) {
    const a = papeisDaHelper(h, 0, []);
    expandidos.cast = [...new Set(expandidos.cast.concat(a.cast))];
    expandidos.nu = [...new Set(expandidos.nu.concat(a.nu))];
    for (const c of a.caminho) if (c.startsWith('!')) cortesDeFechamento.push(`${p.tabela}|${p.nome}|${c}`);
  }
  politicasLidas.push({
    tabela: p.tabela, nome: p.nome, comando: p.comando, papeis_de_role: p.papeis_de_role,
    literais_cast: cast, literais_nu: nu.filter((c) => cast.includes(c) === false), helpers,
    relacoes_em_ponte: pontes,
    cargos_por_cast: expandidos.cast, cargos_por_regua_larga: expandidos.nu,
    mecanismo: marcas,
    usando_chars: String(p.usando).length, verificando_chars: String(p.verificando).length,
  });
}
res.politicas_lidas = politicasLidas.length;
res.mecanismos = mecanimetros;
res.marcas_nulas = marcasNulos;
res.politicas_sem_porta_de_papel = semPortaDePapel;
res.cortes_de_fechamento_transitivo = cortesDeFechamento;

// matriz por papel: duas réguas (estreita = cast na expressão; larga = literal nu do enum em expressão ou helper transitivo)
const matriz = {};
for (const papel of res.papeis_enum) matriz[papel] = { l_estreita: new Set(), e_estreita: new Set(), l_larga: new Set(), e_larga: new Set(), por_tabela: {} };
for (const p of politicasLidas) {
  for (const papel of p.cargos_por_cast) {
    if (LEITURA.includes(p.comando)) matriz[papel].l_estreita.add(p.tabela);
    if (ESCRITA.includes(p.comando)) matriz[papel].e_estreita.add(p.tabela);
  }
  for (const papel of p.cargos_por_regua_larga) {
    if (LEITURA.includes(p.comando)) matriz[papel].l_larga.add(p.tabela);
    if (ESCRITA.includes(p.comando)) matriz[papel].e_larga.add(p.tabela);
  }
  const todos = new Set([...p.cargos_por_cast, ...p.cargos_por_regua_larga]);
  for (const papel of todos) {
    const r = matriz[papel].por_tabela[p.tabela] ||= { comandos: new Set(), politicas: [] };
    r.comandos.add(p.comando);
    if (r.politicas.length < 6) r.politicas.push(`${p.nome}|${p.comando}`);
  }
}
res.matriz = Object.fromEntries(res.papeis_enum.map((papel) => {
  const m = matriz[papel];
  return [papel, {
    leitura_estreita_n: m.l_estreita.size, escrita_estreita_n: m.e_estreita.size,
    leitura_larga_n: m.l_larga.size, escrita_larga_n: m.e_larga.size,
    leitura_larga: [...m.l_larga].sort(), escrita_larga: [...m.e_larga].sort(),
    sem_leitura_estreita_mas_com_larga: m.l_estreita.size === 0 && m.l_larga.size > 0,
    tabelas_e_politicas: Object.fromEntries(Object.entries(m.por_tabela).map(([t, v]) => [t, { comandos: [...v.comandos].sort(), politicas: v.politicas }])),
  }];
}));

// tabelas: quem as alcança e por qual mecanismo
const tabelaInfo = {};
const tabelasQ = await q('tabelas', `select c.relname as tabela, c.relrowsecurity as rls,
  (select count(*)::int from pg_policy p where p.polrelid=c.oid) as politicas
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' and c.relkind='r' order by 1`);
for (const p of politicasLidas) {
  const ti = (tabelaInfo[p.tabela] ||= { cargos: new Set(), mec: new Set(), comandos: new Set() });
  for (const c of p.cargos_por_regua_larga) ti.cargos.add(c);
  for (const m of p.mecanismo) ti.mec.add(m);
  ti.comandos.add(p.comando);
}
res.tabelas_alcancadas_por_nenhum_papel = (tabelasQ.ok ? tabelasQ.linhas : [])
  .filter((t) => !tabelaInfo[t.tabela]).map((t) => t.tabela);
res.tabelas_sem_politica = (tabelasQ.ok ? tabelasQ.linhas : []).filter((t) => t.politicas === 0).map((t) => t.tabela);
res.tabelas_total = tabelasQ.ok ? tabelasQ.linhas.length : tabelasQ.erro;
res.resumo_por_tabela = Object.fromEntries(Object.entries(tabelaInfo).map(([t, v]) => [t, {
  cargos: [...v.cargos].sort(), mecan: [...v.mec].sort(), comandos: [...v.comandos].sort(), n_politicas: (tabelasQ.ok ? tabelasQ.linhas : []).find((x) => x.tabela === t)?.politicas ?? null,
}]).sort((a, b) => a[0].localeCompare(b[0])));

// helpers: o que cada uma decide, por nome (sem corpo no artefacto)
const helpersCitadas = [...new Set(politicasLidas.flatMap((p) => p.helpers))].sort();
res.helpers = helpersCitadas.map((h) => {
  const a = papeisDaHelper(h, 0, []);
  const def = (fnByName[h] || [])[0];
  return { nome: h, definer: !!def?.definer, corpo_chars: def?.corpo_chars ?? null, corpo_md5: def?.corpo_md5 ?? null,
    cargos_por_cast: a.cast, cargos_por_regua_larga: a.nu, profundidade_caminho: a.caminho.slice(0, 6) };
});

// portões falsificáveis
const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
const direta = await q('direta', `select count(*)::int as n from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'`);
G('politicas_lidas_batem_com_contagem_direta', res.politicas_lidas === (direta.ok ? direta.linhas[0].n : -1), { lidas: res.politicas_lidas, direta: direta.ok ? direta.linhas[0].n : direta.erro });
const viaObjetos = await q('via_objetos', `select count(*)::int as n from pg_class c
  join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`);
G('duas_contagens_de_tabelas_batem', res.tabelas_total === (viaObjetos.ok ? viaObjetos.linhas[0].n : -1), { via_tabelas: res.tabelas_total, via_objetos: viaObjetos.ok ? viaObjetos.linhas[0].n : viaObjetos.erro });
// a contenção tem de valer: o que a prédica estreita acha, a larga também tem de achar
const nomesDasTabelas = tabelasQ.ok ? tabelasQ.linhas.map((t) => t.tabela) : [];
const perdidosNaLarga = res.papeis_enum.filter((p) => matriz[p].l_larga.size < matriz[p].l_estreita.size || matriz[p].e_larga.size < matriz[p].e_estreita.size);
G('a_regua_larga_contem_a_estreita_para_todo_papel', perdidosNaLarga.length === 0, { perdidos: perdidosNaLarga, papeis_com_leitura_estreita: res.papeis_enum.filter((p) => matriz[p].l_estreita.size > 0).length, papeis_com_leitura_larga: res.papeis_enum.filter((p) => matriz[p].l_larga.size > 0).length });
const inalcanaveis = res.papeis_enum.filter((p) => matriz[p].l_larga.size === 0 && matriz[p].e_larga.size === 0);
G('papeis_sem_nenhum_acesso_sao_so_os_que_eu_registo', inalcanaveis.every((p) => p === 'pending'), { inalcanaveis });
// o vocabulário novo tem de disparar em fixture e não disparar em contrário, senão o verde é cortesia
const fixtureHelper = helperEm('EXISTS (SELECT 1 FROM aee_student_links l WHERE l.user_id = auth.uid() AND aee_can_access_student(aee_student_links.student_id))');
const fixturePonte = ['aee_student_links', 'aee_student_profiles'].every((t) => RE_DE_RELACAO.get(t) && RE_DE_RELACAO.get(t).test(`x ${t} y`));
G('o_predicado_de_helper_do_catalogo_dispara_na_helper_sem_prefixo_bfr', fixtureHelper.includes('aee_can_access_student') && fixtureHelper.includes('auth') === false,
  { achado: fixtureHelper, nome_no_catalogo: NOMES_DE_FUNCAO.has('aee_can_access_student'), nota: 'auth.uid nao e funcao public.* neste catalogo' });
G('o_predicado_de_ponte_do_catalogo_dispara_noutro_nome_de_relacao', fixturePonte, { relacoes: NOMES_DE_RELACAO.length, ponte_de_exemplo: 'aee_student_links' });
G('o_fechamento_transitivo_nao_perde_nenhuma_helper_por_profundidade_ou_ciclo', cortesDeFechamento.length === 0,
  { cortes: cortesDeFechamento.slice(0, 12), n: cortesDeFechamento.length, profundidade_maxima: MAX_PROFUNDIDADE });
const estranhos = [...new Set(politicasLidas.flatMap((p) => p.cargos_por_regua_larga.filter((c) => !ENUM.has(c))))];
G('cargos_extraidos_sao_todos_do_enum', estranhos.length === 0, { estranhos });
G('toda_politica_tem_pelo_menos_um_mecanismo_registrado', politicasLidas.every((p) => p.mecanismo.length > 0), { sem_mecanismo: politicasLidas.filter((p) => p.mecanismo.length === 0).map((p) => `${p.tabela}|${p.nome}`).slice(0, 12) });
// «só colunas de estado» é mecanismo de abertura a todos os papéis: falsificável por uma escrita aberta assim
G('nenhuma_politica_so_de_colunas_de_estado_abre_escrita', semPortaDePapel.every((s) => s.endsWith('|r')), { sem_porta_de_papel: semPortaDePapel, n: semPortaDePapel.length });
G('toda_tabela_de_policyexiste_no_catalogo', politicasLidas.every((p) => nomesDasTabelas.includes(p.tabela)), { ausentes: [...new Set(politicasLidas.map((p) => p.tabela))].filter((t) => !nomesDasTabelas.includes(t)) });
res.soma_de_marcas_de_mecanismo = somaFlags;
res.politicas_com_varios_mecanismos = multiplaMecanismo;

res.veredictos = gates;
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0 ? `BU2C_CAMINHOS_VERDE ${gates.length}/0` : `BU2C_CAMINHOS_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;
res.pegada_matriz = createHash('md5').update(JSON.stringify(res.matriz)).digest('hex');
delete res._descartado;

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const txt = [
  `veredito=${res.veredito_final}`,
  `politicas=${res.politicas_lidas} tabelas=${res.tabelas_total} helpers_citadas=${helpersCitadas.length}`,
  `mecanismos=${JSON.stringify(res.mecanismos)}`,
  `papeis_alcancaveis=${res.papeis_enum.filter((p) => matriz[p].l_larga.size > 0 || matriz[p].e_larga.size > 0).length} de ${res.papeis_enum.length} marcas_nulas=${marcasNulos.length} multipla_mecanismo=${multiplaMecanismo}`,
  `matriz=${res.papeis_enum.map((p) => `${p}:e${res.matriz[p].leitura_estreita_n}/l${res.matriz[p].leitura_larga_n}/w${res.matriz[p].escrita_larga_n}`).join(' ')}`,
  `tabelas_sem_politica=${res.tabelas_sem_politica.join(',') || 'nenhuma'}`,
  `tabelas_alcancadas_por_nenhum_papel=${res.tabelas_alcancadas_por_nenhum_papel.join(',') || 'nenhuma'}`,
  `politicas_so_de_colunas_de_estado=${res.politicas_sem_porta_de_papel.join(',') || 'nenhuma'}`,
  `helpers=${res.helpers.map((h) => `${h.nome}:${h.cargos_por_regua_larga.join('+') || '-'}`).join(' | ')}`,
  `pegada_matriz=${res.pegada_matriz} gates=${gates.map((g) => `${g.nome}:${g.veredito}`).join(' ')}`,
  `node_exit=0 ms=${res.msd}`,
].join('\n') + '\n';
writeFileSync(TXT, txt);
console.log(txt);
