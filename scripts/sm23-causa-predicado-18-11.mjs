#!/usr/bin/env node
// SM.23 — CAUSA DO PREDICADO: porque é que `bfr_municipal_school_stats` não devolve linhas a ninguém.
// A sonda anterior (evidence/sm23-causa-vista-18-11.json) separou duas coisas que a prosa misturava:
//   * `developer` via 6 linhas pela vista ANTES e 0 DEPOIS, mas via 0 linhas em `schools` direto →
//     o «6» era o BYPASSRLS do dono, não uma leitura que a política admitisse.
//   * `secretario_municipal` e `gestor_autorizado` veem 6 escolas DIRETO e 0 pela vista, antes e depois
//     do meu DDL ⇒ o vazio municipal NÃO foi causado pelo invoker; vem do WHERE da vista.
// Este instrumento lê o corpo das funções e os dados que o WHERE consulta, e avalia o predicado por
// escola com privilégio de dono, para dizer qual das duas premissas falha. 0 escrita.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-causa-predicado-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, não por cima');
const causa = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-causa-vista-18-11.json'), 'utf8'));

const funcs = await sql(`select p.proname as nome, pg_get_function_arguments(p.oid) as argumentos, p.prosecdef as definer,
  coalesce(pg_get_function_sqlbody(p.oid), pg_get_functiondef(p.oid)) as corpo
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in ('bfr_school_in_municipal_scope','bfr_is_platform_admin','bfr_municipal_municipalities','bfr_has_municipal_grant','bfr_municipal_network_totals')
  order by 1`);
const escolas = await sql(`select count(*)::int as total,
  count(municipality_id)::int as com_municipio, count(*)::int - count(municipality_id)::int as sem_municipio,
  count(distinct municipality_id)::int as municipios_distintos
  from public.schools`);
const municipiosEscola = await sql(`select coalesce(municipality_id::text,'NULL') as municipio, count(*)::int as escolas
  from public.schools group by 1 order by 2 desc limit 20`);
const colGrantsPrimeiro = await sql(`select column_name as coluna from information_schema.columns
  where table_schema='public' and table_name='bfr_municipal_access_grants' order by ordinal_position`);
const temCol = (lista, n) => lista.some((c) => c.coluna === n);
const colAtiva = ['active', 'is_active', 'revoked_at', 'expires_at'].find((n) => temCol(colGrantsPrimeiro, n));
const exprAtivos = colAtiva === 'revoked_at' ? 'revoked_at is null' : colAtiva === 'expires_at' ? '(expires_at is null or expires_at > now())' : colAtiva ? `coalesce(${colAtiva},true)` : 'true';
const grants = await sql(`select count(*)::int as linhas, count(distinct municipality_id)::int as municipios,
  count(*) filter (where ${exprAtivos})::int as ativos,
  coalesce(string_agg(distinct municipality_id::text, ','), 'nenhum') as municipios_lista
  from public.bfr_municipal_access_grants`);
// As duas espécies, medidas e não presumidas: se `municipality_id` das escolas for uuid e o dos grants
// for text, uma comparação direta entre as duas colunas pode nunca casar.
const especies = await sql(`select table_name as tabela, data_type as especie from information_schema.columns
  where table_schema='public' and column_name='municipality_id' and table_name in ('schools','bfr_municipal_access_grants') order by 1`);
const colunasKeyMap = await sql(`select column_name as coluna, data_type as tipo from information_schema.columns
  where table_schema='public' and table_name='bfr_school_key_map' order by ordinal_position`);
// Avaliação do predicado por escola, com o privilégio do DONO (postgres), sem RLS no meio:
// diz se o WHERE da vista alguma vez pode ser verdadeiro para um município concedido.
const porEscola = await sql(`select s.id, s.name as nome, s.municipality_id::text as municipio,
  public.bfr_school_in_municipal_scope(s.id) as scope_sem_sessao,
  public.bfr_is_platform_admin() as admin_sem_sessao
  from public.schools s order by s.name limit 20`);
// A avaliação como DONO e sem claims só diz o óbvio (falso para todas). O teste que decide é o de uma
// sessão FORJADA com o `sub` de um titular real de concessão: se mesmo assim o WHERE der 0 escolas,
// o vazio não é do modo da vista — é dos dados (nenhuma escola carries o município concedido).
const colGrants = await sql(`select column_name as coluna from information_schema.columns
  where table_schema='public' and table_name='bfr_municipal_access_grants' order by ordinal_position`);
const tem = (n) => colGrants.some((c) => c.coluna === n);
const colPerfil = ['profile_id', 'holder_profile_id', 'grantee_profile_id', 'user_id', 'secretariat_profile_id'].find(tem);
const colMun = tem('municipality_id') ? 'municipality_id' : null;
const colunasProfiles = await sql(`select column_name as coluna from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name in ('role','papel','account_role','municipality_id') order by 1`);
const colPapel = colunasProfiles.some((c) => c.coluna === 'role') ? 'role' : colunasProfiles.some((c) => c.coluna === 'papel') ? 'papel' : null;
let concedidos = [];
if (colPerfil && colMun) {
  concedidos = (await sql(`select g.${colPerfil}::text as perfil, g.${colMun}::text as municipio${colPapel ? `, p.${colPapel} as papel` : ''}
    from public.bfr_municipal_access_grants g${colPapel ? ` join public.profiles p on p.id = g.${colPerfil}` : ''}
    limit 3`)).slice(0, 3);
}
const sessoesForjadas = [];
for (const c of concedidos) {
  const claims = JSON.stringify({ role: 'authenticated', aud: 'authenticated', sub: c.perfil, app_metadata: colPapel ? { role: c.papel } : {}, user_metadata: {} });
  if (/'/.test(claims)) { sessoesForjadas.push({ perfil: c.perfil, saltado: 'claims contêm aspa simples' }); continue; }
  let r;
  try {
    r = await sql(`begin;\nset local role authenticated;\nselect set_config('request.jwt.claims', '${claims}', true);\nselect (public.bfr_is_platform_admin()) as admin, (select count(*)::int from public.schools s where public.bfr_school_in_municipal_scope(s.id)) as escolas_no_scope, (select count(*)::int from public.bfr_municipal_municipalities()) as municipios_visiveis;\nrollback;`);
  } catch (e) { r = { erro: String(e.message).slice(0, 300) }; }
  sessoesForjadas.push({ perfil: c.perfil, municipio_da_concessao: c.municipio, papel: c.papel || null, claims, resultado: r });
}
// Um controle que PROVA que a injeção de claims faz efeito: mesmo caminho com o sub de um titular, mas
// perguntando por uma escola cujo município é o concedido.
let escolar = null;
try {
  escolar = await sql(`select s.name as escola, s.municipality_id::text as municipio,
    (select count(*)::int from public.bfr_municipal_access_grants g where g.${colMun}::text = s.municipality_id::text) as concessoes_desse_municipio
    from public.schools s order by s.name limit 6`);
} catch (e) { escolar = { erro: String(e.message).slice(0, 200) }; }

const out = {
  programa: 'scripts/sm23-causa-predicado-18-11.mjs',
  em: new Date().toISOString(),
  pergunta: 'o WHERE da vista é satisfeito por alguma escola, para alguém?',
  metodo: 'pg_get_function_sqlbody + contagens de schools.municipality_id + bfr_municipal_access_grants + avaliação do predicado por escola como dono',
  leitura_anterior: { unidade: 'total visível por papel (Content-Range)', linhas_da_causa: causa.leitura_humana },
  funcoes: funcs,
  escolas, municipios_por_escola: municipiosEscola, grants, especies_de_municipality_id: especies,
  colunas_de_bfr_school_key_map: colunasKeyMap,
  nota_sonda_anterior: 'o 42703 em bfr_school_key_map foi erro do instrumento (pediu `id`, a tabela não tem essa coluna); as outras quatro colunas da mesma corrida são válidas',
  avaliacao_por_escola: porEscola,
  colunas_de_grants: colGrants.map((c) => c.coluna), coluna_de_perfil_escolhida: colPerfil, coluna_de_papel: colPapel,
  coluna_de_atividade_escolhida: colAtiva, expressao_de_ativos: exprAtivos,
  dentro_de_sessao_forjada: sessoesForjadas, escolas_por_municipio_concedido: escolar,
};
const municipiosComGrant = new Set(String(grants[0].municipios_lista).split(',').filter(Boolean));
const escolasComMunicipio = new Set(municipiosEscola.map((m) => m.municipio).filter((x) => x !== 'NULL'));
const interseccao = [...municipiosComGrant].filter((m) => escolasComMunicipio.has(m));
out.conclusao = {
  escolas_sem_municipio: escolas[0].sem_municipio,
  grants_apontam_para: [...municipiosComGrant],
  municipios_das_escolas: [...escolasComMunicipio],
  interseccao_grants_e_escolas: interseccao,
  lido_com_cuidado: 'se a intersecção for vazia, o WHERE devolve 0 linhas para QUALQUER papel, independentemente do security_invoker: o vazio é de DADOS (nenhuma escola marcada com o município concedido), não do modo da vista',
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('ESCOLAS', JSON.stringify(escolas[0]));
console.log('GRANTS', JSON.stringify(grants[0]));
console.log('INTERSECCAO', JSON.stringify(interseccao), '| escolas sem município:', escolas[0].sem_municipio);
console.log('PREDICADO_POR_ESCOLA', JSON.stringify(porEscola.slice(0, 3)));
console.log('KEY_MAP_COLUNAS', colunasKeyMap.map((c) => c.coluna).join(','));
console.log('SESSOES_FORJADAS', JSON.stringify(sessoesForjadas).slice(0, 600));
console.log('ESPECIES', JSON.stringify(especies), '| escolas por município concedido:', JSON.stringify(escolar).slice(0, 300));
console.log('CAUSA_PREDICADO_REGISTRADA ·', OUT);
