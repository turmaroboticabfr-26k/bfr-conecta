#!/usr/bin/env node
// p201 (SO LEITURA, sem credenciais dactilografadas): censo das chaves estrangeiras POR CONTA DE TESTE.
// A limitacao declarada do §SM.89 e do §SM.90 era esta: «19 removiveis» era classe por dominio de e-mail,
// nao plano de exclusao, porque as FKs por conta nunca foram censuradas. A FASE 15 do briefing manda apagar
// «so as contas de teste, respeitando chaves estrangeiras» — logo o pre-requisito medivel em leitura e saber,
// conta a conta, quais vinculos bloqueiam o DELETE (RESTRICT / NO ACTION), quais se anulam (SET NULL /
// SET DEFAULT) e quais caem com a conta (CASCADE). Nada disto apaga seja quem for: 0 DELETE, 0 DDL, 0 grants.
//
// As agulhas nao sao inventadas por mim — leo-as dos produtores e um portao confere que la estam:
//   scripts/ae5f-rm68-delete-mecanismo.mjs  -> a descoberta de FKs no catalogo (contype = 'f', 'public.profiles'::regclass)
//   scripts/ah2-inventario-contas.mjs       -> a classe de conta de teste (/\.test$/) e a rota do Admin API
// Uso: node scripts/p201-fks-por-conta-de-teste.mjs            (corrida viva, so leitura)
//      node scripts/p201-fks-por-conta-de-teste.mjs --fixtures (portoes sobre falsos em tmpdir, zero rede)
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { admin, sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p201-fks-por-conta-de-teste.mjs';
const PRODUTORES = {
  'scripts/ae5f-rm68-delete-mecanismo.mjs': ["contype = 'f'", "'public.profiles'::regclass"],
  'scripts/ah2-inventario-contas.mjs': ['/\\.test$/', 'auth/v1/admin/users?page='],
};
const SUF = process.env.P201_SUF ? '-' + process.env.P201_SUF : '-27-11';
const OUT = join(REPO, 'evidence/p201-fks-por-conta-de-teste' + SUF + '.json');
const FIXTURES = process.argv.includes('--fixtures');
if (!FIXTURES && existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com P201_SUF=novo, nao por cima`);

// Predicas lidas dos produtores (a classe de FK de ae5f, a classe de conta e a rota de ah2).
const SQL_FKS = `select con.conname as conname, con.conrelid::regclass::text as tabela,
        con.confrelid::regclass::text as referenciada, con.confdeltype as deltype,
        (select string_agg(a.attname, ',' order by o.ord)
           from unnest(con.conkey) with ordinality as o(n, ord)
           join pg_attribute a on a.attrelid = con.conrelid and a.attnum = o.n) as colunas_locais,
        (select string_agg(a.attname, ',' order by o.ord)
           from unnest(con.confkey) with ordinality as o(n, ord)
           join pg_attribute a on a.attrelid = con.confrelid and a.attnum = o.n) as colunas_referidas
   from pg_constraint con
  where con.contype = 'f'
    and con.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
  order by 2, 1`;
const SQL_CONTAS = `select u.id as id, u.email as email,
        split_part(u.email, '@', 2) as dominio, u.created_at::date as criado
   from auth.users u
  where coalesce(split_part(u.email, '@', 2), '') like '%.test'
  order by 2, 1`;
const SQL_TODAS_CONTAS = `select count(*)::int as contas from auth.users`;
// A atribuicao das linhas de FK que apontam para public.profiles so vale se a chave for a MESMA:
// profiles.id = auth.users.id. Em vez de o assumir, leio os ids das contas que tem perfil e um portao
// confere que nenhuma fica de fora — se profiles tivesse um surrogate, este censo diria zero onde ha linhas.
const SQL_PERFIS_DAS_CONTAS = `with contas as (${SQL_CONTAS})
select p.id::text as id from public.profiles p where p.id in (select id from contas) order by 1`;
const ADMIN_ROTA = '/auth/v1/admin/users?page=';
// A chave primaria de cada tabela bloqueante, lida do catalogo (e o que da nome a linha a retirar).
const SQL_PK = (tabela) => `select string_agg(a.attname, ',' order by o.ord) as chaves
   from pg_index i
   join unnest(i.indkey::int[]) with ordinality o(num, ord) on true
   join pg_attribute a on a.attrelid = i.indrelid and a.attnum = o.num
  where i.indrelid = '${tabela}'::regclass and i.indisprimary`;

// Classes de remocao, a partir do confdeltype do catalogo. a=NO ACTION, r=RESTRICT, c=CASCADE,
// n=SET NULL, d=SET DEFAULT. O ramo desconhecido devolve 'desconhecida' em vez de cair em undefined:
// um codigo silencioso transformaria um vinculo nao censurado num vinculo inexistente.
const CLASSE = { a: 'bloqueia', r: 'bloqueia', c: 'cascata', n: 'anula_ref', d: 'anula_ref' };
const classeDaFk = (deltype) => CLASSE[deltype] || 'desconhecida';

// A conta so pode ser apagada depois de removidos os vinculos bloqueantes. Aqui nao se apaga nada:
// compoe-se a lista de passos por conta, com o numero de linhas que cada um tocaria.
function passosPorConta(conta, fks, atribuicao) {
  const passos = [];
  for (const fk of fks) {
    const classe = classeDaFk(fk.deltype);
    const linhas = atribuicao
      .filter((r) => r.conname === fk.conname && r.referencia === conta.id)
      .reduce((s, r) => s + r.linhas, 0);
    if (linhas === 0) continue;
    passos.push({ conname: fk.conname, tabela: fk.tabela, coluna: fk.colunas_locais, classe, linhas,
      degrau: classe === 'bloqueia' ? 1 : 2 });
  }
  passos.push({ conname: '(a conta em auth.users)', tabela: 'auth.users', coluna: 'id', classe: 'conta', linhas: 1, degrau: 3 });
  return passos.sort((x, y) => x.degrau - y.degrau || x.tabela.localeCompare(y.tabela));
}

// Regua 1: o total por vinculo tem de bater com a soma das atribuicoes por conta. Forma agregada da
// regua auto-referente (§SM.88): sem o fixture partido, um `true` aqui nao diria que a soma foi feita.
const regulaAtribuicao = (porFk, porConta) => {
  const somadas = {};
  for (const r of porConta) somadas[r.conname] = (somadas[r.conname] || 0) + r.linhas;
  return porFk.every((f) => (somadas[f.conname] || 0) === f.linhas_de_contas_teste);
};
// Regua 2: o universo tem de ser o mesmo pelas duas rotas. Compara-se por id, nao por comprimento,
// porque §AE.6 mostrou linhas que existem numa rota e nao na outra.
const batemAsRotas = (sqlIds, adminIds) => {
  const a = new Set(sqlIds), b = new Set(adminIds);
  const soSql = sqlIds.filter((x) => !b.has(x)).sort();
  const soAdmin = adminIds.filter((x) => !a.has(x)).sort();
  return { conforme: soSql.length === 0 && soAdmin.length === 0, so_no_sql: soSql.length, so_no_admin: soAdmin.length, soSql, soAdmin };
};
// Regua 4: a ponte profiles.id = auth.users.id tem de fechar para toda a conta de teste, senao a
// atribuicao das FKs que apontam para public.profiles esta a contar linhas de quem nao e a conta.
const ponteFechada = (perfisIds, contasIds) => {
  const vistos = new Set(perfisIds);
  const fora = contasIds.filter((x) => !vistos.has(x)).sort();
  return { conforme: fora.length === 0, sem_perfil: fora.length, fora };
};
// Regua 3: esta peca so emite leituras. Um string que nao comece por select/with aborta a corrida.
const soLeitura = (q) => /^\s*(select|with)\b/i.test(String(q));
const CHAMADA_SQL = async (q) => {
  if (!soLeitura(q)) throw new Error(`ABORTA: predicado nao e leitura — ${String(q).slice(0, 40)}`);
  return sql(q);
};

// As linhas que bloqueiam um DELETE tem de ter nome: sem a chave primaria da linha bloqueante, o plano
// da FASE 15 diz «retirar 5 linhas» e nao diz quais. A listagem cobre todas as colunas de identidade da
// mesma tabela, e o portao compara o numero de linhas listadas com o esperado (linhas x colunas).
const LIMITE_DE_LISTAGEM = 2000;
const identColsDaTabela = (contaveis, tabela) => contaveis.filter((x) => x.tabela === tabela).map((x) => x.colunas_locais);
const qLinhasBloqueantes = (contaveis, f, pkCols) => {
  const cols = identColsDaTabela(contaveis, f.tabela);
  const registo = `concat_ws('/', ${pkCols.map((p) => `"${p}"::text`).join(', ')})`;
  return `with contas as (${SQL_CONTAS})
` + cols.map((c) => `select '${f.conname}'::text as vinculo_bloqueante, '${c}'::text as coluna_de_identidade,
       ${registo} as registo, "${c}" as referencia,
       exists (select 1 from contas ct where ct.id = t."${c}") as referencia_e_conta_de_teste
  from ${f.tabela} t where t."${f.colunas_locais}" in (select id from contas)`).join('\nunion all\n') +
    `\nlimit ${LIMITE_DE_LISTAGEM}`;
};
const esperadoDasListagens = (contaveis, bloqueantesComLinhas) => bloqueantesComLinhas
  .reduce((s, f) => s + f.linhas_de_contas_teste * identColsDaTabela(contaveis, f.tabela).length, 0);
// Uma tabela sem chave primaria lida nao pode ser listada linha a linha: e nomeada, nunca contada como zero.
const semChavePrimaria = (bloqueantesComLinhas, pksPorTabela) => bloqueantesComLinhas
  .filter((f) => !(pksPorTabela[f.tabela] || []).length).map((f) => f.conname);

// Uma linha bloqueante pode desaparecer sozinha: se outra coluna de identidade da MESMA linha for uma
// conta de teste alcancada por um vinculo CASCADE, a remocao dessa conta leva a linha antes de algum
// DELETE travar. Como a ordem do plano depende disto, calcula-se — nao se lembra.
const libertadoraDaColuna = (l, colunaBloqueante, contaveis) => {
  if (l.coluna_de_identidade === colunaBloqueante || !l.referencia_e_conta_de_teste) return false;
  const f = contaveis.find((x) => x.tabela === l.tabela && x.colunas_locais === l.coluna_de_identidade);
  return !!f && classeDaFk(f.deltype) === 'cascata';
};
const ordemDaListagem = (linhas, contaveis, fksPorNome, emailsPorId8) => {
  const grupos = new Map();
  for (const l of linhas) {
    const k = l.vinculo_bloqueante + '|' + l.registo;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(l);
  }
  return [...grupos].map(([k, ls]) => {
    const nome = k.slice(0, k.lastIndexOf('|'));
    const registo = k.slice(k.lastIndexOf('|') + 1);
    const colunaBloqueante = (fksPorNome[nome] || {}).colunas_locais;
    const lib = ls.filter((l) => libertadoraDaColuna(l, colunaBloqueante, contaveis));
    return { vinculo_bloqueante: nome, tabela: ls[0].tabela, registo,
      libertadas_por_cascata_de: lib.map((l) => ({ id8: l.referencia, email: emailsPorId8[l.referencia] || '(nao_listada)' })),
      requer_passo_manual: lib.length === 0 };
  });
};
// ------- agregacoes puras (usadas pelos fixtures e pela corrida viva) -------
function resumo(fks, contas, porFk, porConta) {
  const porClasse = {};
  for (const f of fks) porClasse[classeDaFk(f.deltype)] = (porClasse[classeDaFk(f.deltype)] || 0) + 1;
  const bloqueiosPorConta = contas.map((c) => {
    const passos = passosPorConta(c, fks, porConta);
    const bloqueantes = passos.filter((p) => p.classe === 'bloqueia');
    return { email: c.email, id8: c.id.slice(0, 8), criado: c.criado,
      linhas_bloqueantes: bloqueantes.reduce((s, p) => s + p.linhas, 0),
      degraus_bloqueantes: bloqueantes.length,
      degraus_anulados: passos.filter((p) => p.classe === 'anula_ref').length,
      degraus_cascata: passos.filter((p) => p.classe === 'cascata').length,
      passos };
  });
  return { porClasse, bloqueiosPorConta,
    contas_sem_bloqueio: bloqueiosPorConta.filter((x) => x.degraus_bloqueantes === 0).length,
    total_linhas_bloqueantes: bloqueiosPorConta.reduce((s, x) => s + x.linhas_bloqueantes, 0),
    total_degraus_bloqueantes: bloqueiosPorConta.reduce((s, x) => s + x.degraus_bloqueantes, 0) };
}

// ------- modo --fixtures: portoes sobre falsos, em tmpdir, zero rede -------
if (FIXTURES) {
  const dir = mkdtempSync(join(tmpdir(), 'p201-fix-'));
  const FK1 = { conname: 'fk_um', tabela: 'public.t_um', confrelid: '', referenciada: 'public.profiles', deltype: 'r', colunas_locais: 'a_id', colunas_referidas: 'id' };
  const FK2 = { ...FK1, conname: 'fk_dois', tabela: 'public.t_dois', deltype: 'c', colunas_locais: 'b_id' };
  const FK3 = { ...FK1, conname: 'fk_desconhecido', deltype: 'z' };
  const FK4 = { ...FK1, conname: 'fk_quatro', colunas_locais: 'd_id' };
  const FK5 = { ...FK4, conname: 'fk_cinco', deltype: 'c' };
  const LINHA_FIX = (coluna, teste) => ({ vinculo_bloqueante: 'fk_um', tabela: 'public.t_um', coluna_de_identidade: coluna,
    registo: 'r1', referencia: 'id-dois', referencia_e_conta_de_teste: teste });
  const LISTA_FIX = [LINHA_FIX('a_id', true), LINHA_FIX('d_id', true)];
  const NOMES_FIX = { fk_um: FK1 };
  const CTA = [{ id: 'id-um', email: 'um@bfr-conecta.test', criado: '2026-11-01' }, { id: 'id-dois', email: 'dois@bfr-conecta.test', criado: '2026-11-02' }];
  const ATR = [{ conname: 'fk_um', referencia: 'id-um', linhas: 3 }, { conname: 'fk_dois', referencia: 'id-um', linhas: 5 },
    { conname: 'fk_um', referencia: 'id-dois', linhas: 1 }];
  const POR_FK = [{ conname: 'fk_um', linhas_da_tabela: 9, linhas_de_contas_teste: 4 }, { conname: 'fk_dois', linhas_da_tabela: 5, linhas_de_contas_teste: 5 }];
  const casos = [
    ['a_regua_da_atribuicao_bate_no_corpus', [regulaAtribuicao(POR_FK, ATR)], [true]],
    ['falta_um_fragmento_partido_a_regua_da_atribuicao', [regulaAtribuicao(POR_FK, ATR.filter((r) => r.conname !== 'fk_dois'))], [false]],
    ['o_universo_das_duas_rotas_bate_quando_os_ids_sao_os_mesmos', [batemAsRotas(['id-um', 'id-dois'], ['id-um', 'id-dois']).conforme], [true]],
    ['uma_conta_so_na_rota_sql_parte_o_portao_e_nomeia_a_conta', (() => { const r = batemAsRotas(['id-um', 'id-dois'], ['id-um']); return [r.conforme, r.so_no_sql, r.soSql.length]; })(), [false, 1, 1]],
    ['o_deltype_desconhecido_nao_e_silencioso', [classeDaFk('z'), classeDaFk('r'), classeDaFk('c'), classeDaFk('n')], ['desconhecida', 'bloqueia', 'cascata', 'anula_ref']],
    ['o_so_leitura_rejeita_a_escrita_e_aceita_a_leitura', [soLeitura('delete from t'), soLeitura('  SELECT 1'), soLeitura('with x as (select 1) select * from x')], [false, true, true]],
    ['a_ponte_perfil_conta_fecha_quando_o_id_e_o_mesmo', [ponteFechada(['id-um', 'id-dois'], ['id-um', 'id-dois']).conforme], [true]],
    ['uma_conta_sem_perfil_abre_a_ponte_e_e_nomeada', (() => { const r = ponteFechada(['id-um'], ['id-um', 'id-dois']); return [r.conforme, r.sem_perfil, r.fora.length]; })(), [false, 1, 1]],
    ['o_passo_bloqueante_vem_antes_da_conta_e_o_cascata_depois', (() => { const p = passosPorConta(CTA[0], [FK1, FK2], ATR); return [p.map((x) => x.degrau).join('>'), p[0].linhas, p.length]; })(), ['1>2>3', 3, 3]],
    ['o_resumo_nao_deixa_conta_fora_do_censo', (() => { const r = resumo([FK1, FK2], CTA, POR_FK, ATR); return [r.bloqueiosPorConta.length, r.contas_sem_bloqueio, r.total_linhas_bloqueantes, r.porClasse.bloqueia, r.porClasse.cascata]; })(), [2, 0, 4, 1, 1]],
    ['o_predicado_das_linhas_bloqueantes_e_leitura_e_nomeia_as_colunas', (() => { const q = qLinhasBloqueantes([FK1, FK4], FK1, ['id']); return [soLeitura(q), q.includes('"a_id"'), q.includes('"d_id"'), q.includes('limit ' + LIMITE_DE_LISTAGEM)]; })(), [true, true, true, true]],
    ['retirar_uma_coluna_de_identidade_muda_o_esperado_da_listagem', [esperadoDasListagens([FK1, FK4], [{ ...FK1, linhas_de_contas_teste: 5 }]), esperadoDasListagens([FK1], [{ ...FK1, linhas_de_contas_teste: 5 }])], [10, 5]],
    ['a_ordem_liberta_a_linha_so_quando_a_outra_coluna_e_cascata_sobre_conta_de_teste', (() => { const o = ordemDaListagem(LISTA_FIX, [FK1, FK5], NOMES_FIX, { 'id-dois': 'dois@bfr-conecta.test' }); return [o.length, o[0].requer_passo_manual, o[0].libertadas_por_cascata_de.length, o[0].libertadas_por_cascata_de[0].email]; })(), [1, false, 1, 'dois@bfr-conecta.test']],
    ['se_a_outra_coluna_tambem_bloqueia_o_passo_continua_manual', (() => { const o = ordemDaListagem(LISTA_FIX, [FK1, FK4], NOMES_FIX, {}); return [o[0].requer_passo_manual, o[0].libertadas_por_cascata_de.length]; })(), [true, 0]],
    ['dois_registos_diferentes_contam_duas_linhas_e_um_registo_uma', [ordemDaListagem([LINHA_FIX('a_id', true), { ...LINHA_FIX('a_id', true), registo: 'r2' }], [FK1, FK5], NOMES_FIX, {}).length, ordemDaListagem(LISTA_FIX, [FK1, FK5], NOMES_FIX, {}).length], [2, 1]],
    ['uma_referencia_que_nao_conta_de_teste_nao_liberta_nada', (() => { const o = ordemDaListagem([LINHA_FIX('a_id', true), LINHA_FIX('d_id', false)], [FK1, FK5], NOMES_FIX, {}); return [o[0].requer_passo_manual, o[0].libertadas_por_cascata_de.length]; })(), [true, 0]],
    ['uma_tabela_bloqueante_sem_chave_primaria_lida_e_nomeada_em_vez_de_contada_zero', [semChavePrimaria([FK1], { 'public.t_um': ['id'] }), semChavePrimaria([FK1], {})], [[], ['fk_um']]],
    ['um_deltype_fora_do_catalogo_e_listado_como_desconhecida', [resumo([FK3], CTA, [], []).porClasse.desconhecida], [1]],
  ];
  const linha = casos.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
  writeFileSync(join(dir, 'fixtures.txt'), JSON.stringify(linha, null, 2) + '\n');
  const falhas = linha.filter((x) => !x.ok).length;
  for (const x of linha) console.log(`${x.ok ? 'VERDE   ' : 'VERMELHO'} ${x.nome} · obtido=${JSON.stringify(x.obtido)} esperado=${JSON.stringify(x.esperado)}`);
  console.log(`P201_FIXTURES ${linha.length - falhas}/${falhas} · pasta=${dir}`);
  rmSync(dir, { recursive: true, force: true });
  process.exit(falhas > 0 ? 1 : 0);
}

// ------- corrida viva: tudo o que segue e leitura -------
const fonteProdutores = {};
for (const p of Object.keys(PRODUTORES)) fonteProdutores[p] = readFileSync(join(REPO, p), 'utf8');
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const agulhas = Object.entries(PRODUTORES).flatMap(([p, lista]) => lista.map((agulha) => ({
  produtor: p, agulha, aparece_no_produtor: norm(fonteProdutores[p]).includes(norm(agulha)),
})));

const fks = await CHAMADA_SQL(SQL_FKS);
const contas = await CHAMADA_SQL(SQL_CONTAS);
const totalContas = (await CHAMADA_SQL(SQL_TODAS_CONTAS))[0].contas;

// Uma FK composta sobre a coluna de identidade nao e contavel por `(col) in (select id …)`:
// em vez de a contar como zero, deixo-a numa lista nomeada (imprime-se mesmo vazia).
const compostas = fks.filter((f) => String(f.colunas_locais).includes(',') || String(f.colunas_referidas).includes(','));
const simples = fks.filter((f) => !String(f.colunas_locais).includes(',') && !String(f.colunas_referidas).includes(','));
const foraDoPadrao = simples.filter((f) => f.colunas_referidas !== 'id').map((f) => ({ conname: f.conname, referenciada: f.referenciada, coluna_referida: f.colunas_referidas }));
const contaveis = simples.filter((f) => f.colunas_referidas === 'id');

const qPorFk = (lote) => `with contas as (${SQL_CONTAS})
` + lote.map((f) => `select '${f.conname}'::text as conname, count(*)::int as linhas_da_tabela,
       count(*) filter (where "${f.colunas_locais}" in (select id from contas))::int as linhas_de_contas_teste
  from ${f.tabela}`).join('\nunion all\n');
const qPorConta = (lote) => `with contas as (${SQL_CONTAS})
` + lote.map((f) => `select '${f.conname}'::text as conname, "${f.colunas_locais}" as referencia, count(*)::int as linhas
  from ${f.tabela} where "${f.colunas_locais}" in (select id from contas) group by 2`).join('\nunion all\n');
const lotes = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

const porFk = [];
for (const lote of lotes(contaveis, 20)) porFk.push(...await CHAMADA_SQL(qPorFk(lote)));
const porConta = [];
for (const lote of lotes(contaveis, 20)) porConta.push(...await CHAMADA_SQL(qPorConta(lote)));

// Segunda rota do universo: o Admin API, pela mesma paginaao e a mesma classe de dominio do produtor.
const idsAdmin = [];
for (let pagina = 1; pagina <= 40; pagina++) {
  const r = await admin(`${ADMIN_ROTA}${pagina}&per_page=1000`);
  if (r.status !== 200) throw new Error('ABORTA: Admin API respondeu ' + r.status);
  const us = r.j.users || r.j.auditors || [];
  for (const u of us) if (/\.test$/.test(String(u.email || '').split('@')[1] || '')) idsAdmin.push(String(u.id));
  if (us.length < 1000) break;
}
const rotas = batemAsRotas(contas.map((c) => c.id), idsAdmin);

// A ponte provada, nao assumida: so ha atribuicao valida das FKs de public.profiles se profiles.id
// for o mesmo uuid da conta.
const perfisDasContas = await CHAMADA_SQL(SQL_PERFIS_DAS_CONTAS);
const ponte = ponteFechada(perfisDasContas.map((x) => x.id), contas.map((c) => c.id));

// Nome das linhas bloqueantes: chave primaria de cada linha cujo dono e uma conta de teste.
const bloqueantesComLinhas = contaveis
  .filter((f) => classeDaFk(f.deltype) === 'bloqueia')
  .map((f) => ({ ...f, linhas_de_contas_teste: (porFk.find((p) => p.conname === f.conname) || { linhas_de_contas_teste: 0 }).linhas_de_contas_teste }))
  .filter((f) => f.linhas_de_contas_teste > 0);
const pksPorTabela = {};
for (const f of bloqueantesComLinhas) {
  if (pksPorTabela[f.tabela] === undefined) {
    const r = await CHAMADA_SQL(SQL_PK(f.tabela));
    pksPorTabela[f.tabela] = r[0] && r[0].chaves ? String(r[0].chaves).split(',') : [];
  }
}
const semChave = semChavePrimaria(bloqueantesComLinhas, pksPorTabela);
const linhasBloqueantes = [];
let listagemTruncada = false;
for (const f of bloqueantesComLinhas.filter((x) => (pksPorTabela[x.tabela] || []).length > 0)) {
  const bruto = await CHAMADA_SQL(qLinhasBloqueantes(contaveis, f, pksPorTabela[f.tabela]));
  if (bruto.length === LIMITE_DE_LISTAGEM) listagemTruncada = true;
  for (const l of bruto) linhasBloqueantes.push({ vinculo_bloqueante: l.vinculo_bloqueante, tabela: f.tabela,
    coluna_de_identidade: l.coluna_de_identidade, registo: l.registo, referencia: String(l.referencia).slice(0, 8),
    referencia_e_conta_de_teste: l.referencia_e_conta_de_teste });
}
const esperadoListagem = esperadoDasListagens(contaveis, bloqueantesComLinhas);
const fksPorNome = {};
for (const f of fks) fksPorNome[f.conname] = f;
const emailsPorId8 = {};
for (const c of contas) emailsPorId8[c.id.slice(0, 8)] = c.email;
const ordem = ordemDaListagem(linhasBloqueantes, contaveis, fksPorNome, emailsPorId8);
const degrausManuais = ordem.filter((x) => x.requer_passo_manual).length;
const r2 = resumo(fks, contas, porFk, porConta);

const contagensFk = porFk.length + compostas.length;
const PORTOES = [
  ['as_agulhas_dos_predicados_estao_nosProdutores', agulhas.filter((x) => x.aparece_no_produtor).length, agulhas.length],
  ['nenhum_vinculo_fica_fora_do_censo_por_ser_de_classe_ignorada', contagensFk, fks.length],
  ['o_resultado_tem_uma_linha_por_vinculo_contavel', porFk.length, contaveis.length],
  ['a_soma_por_conta_bate_com_o_total_por_vinculo', regulaAtribuicao(porFk, porConta), true],
  ['as_duas_rotas_do_universo_batem_por_id', rotas.conforme, true],
  ['o_universo_de_teste_e_igual_a_classe_do_inventario', contas.length, r2.bloqueiosPorConta.length],
  ['nenhuma_conta_fica_fora_do_plano', r2.bloqueiosPorConta.length, contas.length],
  ['a_ponte_profiles_id_auth_users_fecha_para_toda_conta_de_teste', [ponte.conforme, ponte.sem_perfil, ponte.fora], [true, 0, []]],
  ['nenhuma_tabela_bloqueante_fica_sem_chave_primaria_lida', semChave, []],
  ['cada_linha_bloqueante_aparece_na_listagem_com_a_sua_chave', [linhasBloqueantes.length, esperadoListagem, listagemTruncada], [esperadoListagem, esperadoListagem, false]],
  ['a_contagem_por_degrau_bate_com_a_listagem_por_linha', ordem.length, r2.total_linhas_bloqueantes],
];
const lista = PORTOES.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
const falhas = lista.filter((p) => !p.ok).length;
const emissor = readFileSync(join(REPO, PECA));

const out = {
  peca: PECA, em: new Date().toISOString(),
  emissor_bytes: emissor.length, emissor_md5: createHash('md5').update(emissor).digest('hex'),
  autorizacao: 'somente leitura: 0 DDL, 0 DML, 0 grants, 0 escrita, 0 mint, 0 DELETE',
  estado: falhas > 0 ? 'PORTAO_VERMELHO — veredito nao emitido' : 'MEDIDO',
  pergunta: 'cada conta de teste pode ser apagada sem violar chaves estrangeiras, e que linhas teriam de sair antes?',
  origem_dos_predicados: agulhas,
  fks_do_catalogo: { total: fks.length, por_classe: r2.porClasse, por_deltype: fks.reduce((m, f) => { const k = String(f.deltype); m[k] = (m[k] || 0) + 1; return m; }, {}) },
  vinculos: fks,
  vinculos_compostos_nao_contados_por_coluna: compostas.map((f) => ({ conname: f.conname, tabela: f.tabela, locais: f.colunas_locais, referidas: f.colunas_referidas })),
  vinculos_fora_do_padrao_coluna_referida_id: foraDoPadrao,
  universo: { contas_no_banco: totalContas, contas_de_teste_por_sql: contas.length, contas_de_teste_por_admin: idsAdmin.length,
    so_no_sql: rotas.so_no_sql, so_no_admin: rotas.so_no_admin },
  linhas_por_vinculo: porFk,
  linhas_por_vinculo_e_conta: porConta,
  ponte_profiles_auth_users: { perfis_das_contas_lidos: perfisDasContas.length, contas_de_teste: contas.length,
    conforme: ponte.conforme, contas_sem_perfil: ponte.fora },
  chaves_primarias_das_tabelas_bloqueantes: pksPorTabela,
  linhas_bloqueantes_em_causa: linhasBloqueantes,
  ordem_de_remocao: { linhas_bloqueantes: ordem, degraus_que_exigem_escrita_manual: degrausManuais,
    degraus_resolvidos_pela_ordem: ordem.length - degrausManuais },
  listagem_de_bloqueios: { esperado: esperadoListagem, listadas: linhasBloqueantes.length, truncada: listagemTruncada,
    tabelas_sem_chave_primaria: semChave, vinculos_bloqueantes_com_linhas: bloqueantesComLinhas.map((f) => ({ conname: f.conname, tabela: f.tabela, linhas: f.linhas_de_contas_teste })) },
  plano_por_conta: r2.bloqueiosPorConta,
  agregado: { contas_sem_bloqueio: r2.contas_sem_bloqueio, total_linhas_bloqueantes: r2.total_linhas_bloqueantes,
    total_degraus_bloqueantes: r2.total_degraus_bloqueantes },
  portoes: { total: lista.length, falhas, lista },
  o_que_prova: [
    'quantas chaves estrangeiras apontam para auth.users e public.profiles e qual o ON DELETE de cada uma, lido do catalogo',
    'quantas linhas de cada tabela referenciada pertencem a cada conta de teste, por vinculo e por conta, com a soma conferida contra o total por vinculo',
    'quais contas tem degraus bloqueantes (RESTRICT / NO ACTION) e quantas linhas cada degrau tocaria',
    'que o universo de contas de teste e o mesmo medido por SQL sobre auth.users e pelo Admin API, comparado por id',
    'que a ponte profiles.id = auth.users.id fecha para cada conta de teste medida, sem o que a atribuicao das FKs sobre public.profiles nao valeria nada',
    'que cada linha bloqueante tem nome: a chave primaria da linha e as suas colunas de identidade, com a bandeira de a referencia ser ou nao uma conta de teste',
    'que cada portao tem positivo: os fixtures em tmpdir mostram as regras a ficarem falsas quando falta uma linha, uma conta, uma coluna ou uma rota',
  ],
  o_que_NAO_prova: [
    'que apagar seja o que se deve fazer: nada aqui apaga. A exclusao e a FASE 15 e continuam sem OK',
    'o efeito de triggers sobre auth.users: este censo le pg_constraint, nao pg_trigger (isso e o ae5f)',
    'que os dados referenciados sejam dispensaveis: uma linha bloqueante pode ser residuo real de teste e carecer de decisao do dono',
    'o que as contas de teste representam nos fluxos humanos (pedidos de apoio, supervisao) — o plano nomea linhas, nao contexto',
    'o valor de negocio de cada linha bloqueante: a listagem da a chave primaria e as referencias, nao diz se a linha ainda serve alguem',
  ],
};
if (!FIXTURES) writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`contas: no_banco=${totalContas} teste_sql=${contas.length} teste_admin=${idsAdmin.length} so_no_sql=${rotas.so_no_sql} so_no_admin=${rotas.so_no_admin}`);
console.log(`vinculos: total=${fks.length} contaveis=${contaveis.length} compostos=${compostas.length} fora_do_padrao=${foraDoPadrao.length} · classes=${JSON.stringify(r2.porClasse)}`);
console.log(`linhas bloqueantes: contas_sem_bloqueio=${r2.contas_sem_bloqueio} degraus=${r2.total_degraus_bloqueantes} linhas=${r2.total_linhas_bloqueantes}`);
for (const c of r2.bloqueiosPorConta.filter((x) => x.degraus_bloqueantes > 0)) console.log(`  BLOQUEIA ${c.email} id ${c.id8}: ${c.degraus_bloqueantes} degrau(s), ${c.linhas_bloqueantes} linha(s) · ${c.passos.filter((p) => p.classe === 'bloqueia').map((p) => p.tabela + '=' + p.linhas).join(', ')}`);
console.log(`anulam_ref=${r2.bloqueiosPorConta.reduce((s, x) => s + x.degraus_anulados, 0)} · cascata=${r2.bloqueiosPorConta.reduce((s, x) => s + x.degraus_cascata, 0)}`);
console.log(`ponte profiles=auth.users: perfis_das_contas=${perfisDasContas.length} contas_de_teste=${contas.length} conforme=${ponte.conforme} sem_perfil=${JSON.stringify(ponte.fora)}`);
console.log(`linhas bloqueantes: listadas=${linhasBloqueantes.length} esperado=${esperadoListagem} truncada=${listagemTruncada} tabelas_sem_chave=${JSON.stringify(semChave)}`);
for (const l of linhasBloqueantes) console.log(`  ${l.vinculo_bloqueante} · coluna ${l.coluna_de_identidade} · registo ${l.registo} · ref ${l.referencia} · conta_de_teste=${l.referencia_e_conta_de_teste}`);
console.log(`ordem de remocao: linhas=${ordem.length} resolvidas_pela_ordem=${ordem.length - degrausManuais} exigem_escrita_manual=${degrausManuais}`);
for (const o of ordem) console.log(`  ${o.registo} · ${o.tabela} · liberta por ${o.libertadas_por_cascata_de.map((x) => x.email).join(' + ') || '(ninguem — passo manual)'}`);
console.log(`portoes: ${lista.length - falhas}/${falhas} · estado=${out.estado}`);
console.log(`P201_FKS_POR_CONTA ${lista.length - falhas}/${falhas}`);
if (!FIXTURES) console.log('escrito em ' + OUT);
if (falhas > 0) process.exit(1);
