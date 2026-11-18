// SM4-APLICAR — aplicação da candidata de DDL do escopo municipal, UMA transacção com COMMIT.
// OK que autoriza: seleção explícita do utilizador «Aplicar DDL municipal» (18/11, ferramenta de escolha).
// Correção datada 18/11, antes da primeira aplicação bem-sucedida: duas tentativas rebentaram com erros
// reais do Postgres, e o rollback de cada uma não deixou nada —
//   (1) `ALTER POLICY public.supervision_requests_director_read` qualifica o nome da política, que a
//       sintaxe não admite (42601, linha 246); candidata e reversão corrigidas (nome sem schema);
//   (2) `= ANY (public.bfr_municipal_municipalities())` usa uma função SETOF em expressão escalar, que o
//       Postgres não admite (0A000, linha 132; o mesmo nas linhas 138 e 156); corrigido para
//       `= ANY (SELECT * FROM public.bfr_municipal_municipalities())`.
// Os md5 novos foram re-medidos, a auditoria cita os valores novos, e dois portões de texto abaixo
// (srf_em_any_eliminada, alter_policy_sem_schema) defendem contra regressão destes dois defeitos.
// Correção datada 18/11, PÓS-aplicação (a aplicação correu limpa às 04:08Z; o vermelho foi só do
// comparador): o portão `baselines_nao_mexeram` comparava um objeto de 4 chaves contra o
// `pre.baselines` completo (5 chaves, inclui `politicas_17_alvo`), o que é sempre vermelho. A
// conferência real de valores estava certa — 6/6/24/848 idênticos ao preflight. Corrigido para
// comparar apenas as 4 chaves medidas; o artefacto da corrida vermelha ficou preservado como
// `evidence/sm4-aplicacao-18-11-ANTERIOR-comparador-vermelho.json` e a conferência pós-facto,
// só-leitura, vive em `scripts/sm4-conferir-ddl-municipal-18-11.mjs`.
// Portões ANTES de abrir a escrita: preflight fresco deste dia VERDE, md5 da candidata igual ao citado
// na auditoria, md5 da reversão igual ao medido em disco, nomes novos ainda inexistentes, e a
// conferência de pós-aplicação no próprio artefacto (objetos passam a existir, baselines não mexem,
// a política do bloco H deixa de ser PUBLIC). Reversão completa em sm4-ddl-municipal-reversao.sql.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const APL = `${DIR}/scripts/sm4-ddl-municipal-candidata.sql`;
const REV = `${DIR}/scripts/sm4-ddl-municipal-reversao.sql`;
const PRE = `${DIR}/evidence/sm4-preflight-ddl-municipal-18-11c.json`;
const OUT = `${DIR}/evidence/sm4-aplicacao-18-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

const falhas = [];
const gate = (nome, obtido, esperado) => {
  if (JSON.stringify(obtido) !== JSON.stringify(esperado)) falhas.push(`${nome}: ${JSON.stringify(obtido)} != ${JSON.stringify(esperado)}`);
};
const q = async (query) => (await sql(query));

const ddl = readFileSync(APL, 'utf8');
const rev = readFileSync(REV, 'utf8');
const pre = JSON.parse(readFileSync(PRE, 'utf8'));

// ── portões ANTES ───────────────────────────────────────────────────────────
gate('preflight_verde', pre.veredito, 'PREFLIGHT_OK_SE_APLICAR_NADA');
gate('candidata_md5_doc', md5(ddl), 'd0e570308d92135440db68a74ba6135c');
gate('reversao_md5_disco', md5(rev), '6ac3442720f4ee931137cff59c0376aa');
gate('srf_em_any_eliminada', /=\s*ANY\s*\(\s*public\.bfr_municipal_municipalities\s*\(/.test(ddl), false);
gate('alter_policy_sem_schema', /ALTER\s+POLICY\s+public\./i.test(ddl), false);
gate('transacao_completa', /^BEGIN;/m.test(ddl) && /^COMMIT;/m.test(ddl), true);
const aposCommit = ddl.split(/^COMMIT;/m).pop().replace(/^\s*--[^\n]*(\n|$)/gm, '').trim();
gate('nada_alem_de_comentarios_apos_commit', aposCommit, '');

// nomes novos ainda inexistentes (o preflight já os mediu; repete-se AGORA, imediatamente antes)
const aindaNaoExistem = await q(`select
  (select count(*)::int from pg_tables where schemaname='public' and tablename in ('bfr_municipalities','bfr_school_key_map','bfr_municipal_access_grants','bfr_municipal_audit')) as tabelas,
  (select count(*)::int from information_schema.columns where table_schema='public' and (table_name,column_name) in (('schools','municipality_id'),('schools','zone'),('schools','operating_status'),('students','code_mec'))) as colunas,
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' where p.proname in ('bfr_is_platform_admin','bfr_has_municipal_grant','bfr_is_municipal_authority','bfr_municipal_municipalities','bfr_school_in_municipal_scope','bfr_school_in_own_school_scope','bfr_municipalities_visible','bfr_municipal_network_totals')) as funcoes`);
gate('nomes_novos_ainda_inexistentes', aindaNaoExistem[0], { tabelas: 0, colunas: 0, funcoes: 0 });
if (falhas.length) {
  writeFileSync(OUT, JSON.stringify({ programa: 'scripts/sm4-aplicar-ddl-municipal-18-11.mjs', em: new Date().toISOString(), aplicado: false, portoes_antes: falhas, veredito: 'APLICACAO_RECUSADA_PELOS_PORTOES' }, null, 1) + '\n');
  console.log('RECUSADA', JSON.stringify(falhas, null, 1));
  process.exit(1);
}

// ── aplicar (uma transacção) ────────────────────────────────────────────────
const em = new Date().toISOString();
await sql(ddl);

// ── conferência DEPOIS ──────────────────────────────────────────────────────
const depois = await q(`select
  (select count(*)::int from pg_tables where schemaname='public' and tablename in ('bfr_municipalities','bfr_school_key_map','bfr_municipal_access_grants','bfr_municipal_audit')) as tabelas_novas,
  (select count(*)::int from information_schema.columns where table_schema='public' and (table_name,column_name) in (('schools','municipality_id'),('schools','zone'),('schools','operating_status'),('students','code_mec'))) as colunas_novas,
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' where p.proname in ('bfr_is_platform_admin','bfr_has_municipal_grant','bfr_is_municipal_authority','bfr_municipal_municipalities','bfr_school_in_municipal_scope','bfr_school_in_own_school_scope','bfr_municipalities_visible','bfr_municipal_network_totals')) as funcoes_novas,
  (select count(*)::int from pg_indexes where schemaname='public' and indexname in ('schools_municipality_id_idx','bfr_municipal_grants_one_active_per_profile','students_code_mec_unique','bfr_municipal_audit_at_idx')) as indices_novos,
  (select count(*)::int from pg_views where schemaname='public' and viewname='bfr_municipal_school_stats') as vistas_novas,
  (select count(*)::int from public.schools) as schools,
  (select count(*)::int from public.sports_schools) as sports_schools,
  (select count(*)::int from public.profiles) as profiles,
  (select count(*)::int from public.students) as students,
  (select count(*)::int from public.bfr_municipal_access_grants) as grants_linhas,
  (select count(*)::int from public.bfr_municipalities) as municipios_linhas`);
gate('objetos_criados', {
  tabelas: depois[0].tabelas_novas, colunas: depois[0].colunas_novas, funcoes: depois[0].funcoes_novas,
  indices: depois[0].indices_novos, vistas: depois[0].vistas_novas,
}, { tabelas: 4, colunas: 4, funcoes: 8, indices: 4, vistas: 1 });
const BASELINES_MEDIDAS = ['schools', 'sports_schools', 'profiles', 'students'];
gate('baselines_nao_mexeram', {
  schools: depois[0].schools, sports_schools: depois[0].sports_schools, profiles: depois[0].profiles, students: depois[0].students,
}, Object.fromEntries(BASELINES_MEDIDAS.map((k) => [k, pre.baselines[k]])));
gate('grants_nascem_vazios', [depois[0].grants_linhas, depois[0].municipios_linhas], [0, 0]);
const alvoH = await q(`select p.polname as nome, (p.polroles @> array[0::oid]) as e_public from pg_policy p
  join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where p.polname='supervision_requests_director_read'`);
gate('bloco_H_sem_public', alvoH[0], { nome: 'supervision_requests_director_read', e_public: false });

const veredito = falhas.length ? 'APLICADO_COM_CONFERENCIA_VERMELHA' : 'APLICADO_E_CONFERIDO';
writeFileSync(OUT, JSON.stringify({
  programa: 'scripts/sm4-aplicar-ddl-municipal-18-11.mjs',
  em,
  aplicado: true,
  candidata: 'scripts/sm4-ddl-municipal-candidata.sql',
  candidata_md5: md5(ddl),
  reversao: 'scripts/sm4-ddl-municipal-reversao.sql',
  reversao_md5: md5(rev),
  preflight_usado: PRE,
  conferencia: { objetos: { tabelas: depois[0].tabelas_novas, colunas: depois[0].colunas_novas, funcoes: depois[0].funcoes_novas, indices: depois[0].indices_novos, vistas: depois[0].vistas_novas }, baselines: { schools: depois[0].schools, sports_schools: depois[0].sports_schools, profiles: depois[0].profiles, students: depois[0].students }, grants_linhas: depois[0].grants_linhas, municipios_linhas: depois[0].municipios_linhas, bloco_H: alvoH[0] },
  falhas,
  veredito,
}, null, 1) + '\n');
console.log('EM', em);
console.log('DEPOIS', JSON.stringify(depois[0]));
console.log('ALVO_H', JSON.stringify(alvoH[0]));
console.log(veredito, falhas.length ? JSON.stringify(falhas, null, 1) : '');
process.exit(falhas.length ? 1 : 0);
