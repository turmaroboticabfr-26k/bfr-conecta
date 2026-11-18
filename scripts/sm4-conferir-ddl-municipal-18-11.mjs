// SM4-CONFERIR — conferência pós-facto, SÓ LEITURA, da aplicação da candidata de DDL municipal.
// Identidade da correção: a aplicação correu limpa numa transacção às 04:08Z de 18/11, mas o
// instrumento aplicador devolveu APLICADO_COM_CONFERENCIA_VERMELHA por defeito do SEU comparador —
// comparava um objeto de 4 chaves (schools/sports_schools/profiles/students) contra o pre.baselines
// completo de 5 chaves (que inclui politicas_17_alvo). Os valores medidos estavam todos certos; o
// vermelho era impossível de não dar. Este script repete a conferência com os comparadores certos,
// sem re-aplicar nada: o DDL é idempotente-para-falhar (criar de novo rebentaria), logo a prova de
// que «já está lá» é a única forma de medir o estado vivo. O artefacto da corrida vermelha ficou
// preservado como evidence/sm4-aplicacao-18-11-ANTERIOR-comparador-vermelho.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const APL = `${DIR}/scripts/sm4-ddl-municipal-candidata.sql`;
const REV = `${DIR}/scripts/sm4-ddl-municipal-reversao.sql`;
const PRE = `${DIR}/evidence/sm4-preflight-ddl-municipal-18-11c.json`;
const OUT = `${DIR}/evidence/sm4-conferencia-18-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const ddl = readFileSync(APL, 'utf8');
const pre = JSON.parse(readFileSync(PRE, 'utf8'));

const falhas = [];
const gate = (nome, obtido, esperado) => {
  if (JSON.stringify(obtido) !== JSON.stringify(esperado)) falhas.push(`${nome}: ${JSON.stringify(obtido)} != ${JSON.stringify(esperado)}`);
};
const q = async (query) => (await sql(query));

const ALVO17 = ['schools', 'students', 'classes', 'profiles', 'staff_schools', 'student_school_profiles',
  'supervision_requests', 'supervision_responses', 'supervision_alerts', 'supervision_action_plans',
  'secretary_requests', 'secretary_profile_change_requests', 'school_documents', 'announcements',
  'attendance', 'grades', 'access_requests'];
const NOVAS_TABELAS = ['bfr_municipalities', 'bfr_school_key_map', 'bfr_municipal_access_grants', 'bfr_municipal_audit'];
const politicasCandidata = [...new Set([...ddl.matchAll(/CREATE POLICY ([a-z_0-9]+) ON public\.([a-z_]+)/gi)].map((m) => m[1]))];

gate('preflight_usado_verde', pre.veredito, 'PREFLIGHT_OK_SE_APLICAR_NADA');
gate('candidata_md5_igual_ao_preflight_lido', md5(ddl), 'd0e570308d92135440db68a74ba6135c');
gate('reversao_md5', md5(readFileSync(REV, 'utf8')), '6ac3442720f4ee931137cff59c0376aa');

const objetos = await q(`select
  (select count(*)::int from pg_tables where schemaname='public' and tablename in ('${NOVAS_TABELAS.join("','")}')) as tabelas,
  (select count(*)::int from information_schema.columns where table_schema='public' and (table_name,column_name) in (('schools','municipality_id'),('schools','zone'),('schools','operating_status'),('students','code_mec'))) as colunas,
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' where p.proname in ('bfr_is_platform_admin','bfr_has_municipal_grant','bfr_is_municipal_authority','bfr_municipal_municipalities','bfr_school_in_municipal_scope','bfr_school_in_own_school_scope','bfr_municipalities_visible','bfr_municipal_network_totals')) as funcoes,
  (select count(*)::int from pg_indexes where schemaname='public' and indexname in ('schools_municipality_id_idx','bfr_municipal_grants_one_active_per_profile','students_code_mec_unique','bfr_municipal_audit_at_idx')) as indices,
  (select count(*)::int from pg_views where schemaname='public' and viewname='bfr_municipal_school_stats') as vistas,
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relname in ('${NOVAS_TABELAS.join("','")}') and c.relrowsecurity) as rls_ativas`);
gate('objetos', {
  tabelas: objetos[0].tabelas, colunas: objetos[0].colunas, funcoes: objetos[0].funcoes,
  indices: objetos[0].indices, vistas: objetos[0].vistas, rls_ativas: objetos[0].rls_ativas,
}, { tabelas: 4, colunas: 4, funcoes: 8, indices: 4, vistas: 1, rls_ativas: 4 });

const linhas = await q(`select
  (select count(*)::int from public.schools) as schools,
  (select count(*)::int from public.sports_schools) as sports_schools,
  (select count(*)::int from public.profiles) as profiles,
  (select count(*)::int from public.students) as students,
  (select count(*)::int from public.bfr_municipalities) as municipios,
  (select count(*)::int from public.bfr_municipal_access_grants) as grants,
  (select count(*)::int from public.bfr_municipal_audit) as audit,
  (select count(*)::int from public.bfr_school_key_map) as ponte`);
gate('baselines_nao_mexeram', {
  schools: linhas[0].schools, sports_schools: linhas[0].sports_schools,
  profiles: linhas[0].profiles, students: linhas[0].students,
}, { schools: pre.baselines.schools, sports_schools: pre.baselines.sports_schools, profiles: pre.baselines.profiles, students: pre.baselines.students });
gate('tabelas_novas_vazias_ou_ponte', {
  municipios: linhas[0].municipios, grants: linhas[0].grants, audit: linhas[0].audit, ponte: linhas[0].ponte,
}, { municipios: 0, grants: 0, audit: 0, ponte: pre.ponte.por_id + pre.ponte.por_nome });

const ponte = await q(`select
  (select count(*)::int from public.bfr_school_key_map where matched_by='mesmo_id') as mesmo_id,
  (select count(*)::int from public.bfr_school_key_map where matched_by='mesmo_nome') as mesmo_nome,
  (select count(*)::int from public.bfr_school_key_map where confirmed_by is not null or confirmed_at is not null) as confirmadas`);
gate('ponte_por_metodo', { mesmo_id: ponte[0].mesmo_id, mesmo_nome: ponte[0].mesmo_nome, confirmadas: ponte[0].confirmadas },
  { mesmo_id: pre.ponte.por_id, mesmo_nome: pre.ponte.por_nome, confirmadas: 0 });

const escolas = await q(`select
  (select count(*)::int from public.schools where municipality_id is not null or zone is not null) as geo_preenchida,
  (select count(*)::int from public.schools where operating_status='ativo') as ativas,
  (select count(*)::int from public.students where code_mec is not null) as code_mec_preenchido`);
gate('colunas_novas_nascem_vazias', { geo_preenchida: escolas[0].geo_preenchida, ativas: escolas[0].ativas, code_mec_preenchido: escolas[0].code_mec_preenchido }, { geo_preenchida: 0, ativas: pre.baselines.schools, code_mec_preenchido: 0 });

const alvoH = await q(`select p.polname as nome, (p.polroles @> array[0::oid]) as e_public from pg_policy p
  join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where p.polname='supervision_requests_director_read'`);
gate('bloco_H_sem_public', alvoH[0], { nome: 'supervision_requests_director_read', e_public: false });

const politicas17 = await q(`select count(*)::int as n from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname = any(array[${ALVO17.map((t) => `'${t}'`).join(',')}])`);
// a candidata cria 4 políticas novas em tabelas da lista ALVO17 (schools, students, classes, supervision_requests)
gate('politicas_17_alvo_delta', politicas17[0].n, pre.baselines.politicas_17_alvo + 4);

const existentes = await q(`select polname as nome from pg_policy p
  join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'`);
const nomesExistentes = new Set(existentes.map((r) => r.nome));
gate('todas_as_politicas_da_candidata_existem', politicasCandidata.filter((p) => !nomesExistentes.has(p)), []);

const acl = await q(`select
  has_function_privilege('authenticated','public.bfr_is_municipal_authority()','execute') as auth_autoridade,
  has_function_privilege('authenticated','public.bfr_has_municipal_grant(uuid)','execute') as auth_grant,
  has_function_privilege('authenticated','public.bfr_municipal_network_totals()','execute') as auth_totais,
  has_function_privilege('anon','public.bfr_school_in_municipal_scope(uuid)','execute') as anon_scope,
  has_function_privilege('anon','public.bfr_school_in_own_school_scope(uuid)','execute') as anon_own,
  has_function_privilege('anon','public.bfr_municipal_municipalities()','execute') as anon_munis,
  has_function_privilege('authenticated','public.bfr_school_in_municipal_scope(uuid)','execute') as auth_scope,
  has_function_privilege('authenticated','public.bfr_school_in_own_school_scope(uuid)','execute') as auth_own,
  has_function_privilege('authenticated','public.bfr_municipal_municipalities()','execute') as auth_munis,
  has_function_privilege('service_role','public.bfr_school_in_municipal_scope(uuid)','execute') as sr_scope,
  has_function_privilege('service_role','public.bfr_municipal_municipalities()','execute') as sr_munis`);
gate('acl_de_funcoes', acl[0],
  { auth_autoridade: true, auth_grant: true, auth_totais: true,
    anon_scope: false, anon_own: false, anon_munis: false,
    auth_scope: false, auth_own: false, auth_munis: false,
    sr_scope: true, sr_munis: true });
const aclTexto = await q(`select proname, coalesce(proacl::text,'<NULL>') as proacl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in ('bfr_school_in_municipal_scope','bfr_school_in_own_school_scope','bfr_municipal_municipalities') order by 1`);
for (const r of aclTexto) {
  gate(`acl_texto_${r.proname}_sem_public`, /(^|,)=X\//.test(r.proacl), false);
  gate(`acl_texto_${r.proname}_sem_anon_auth`, r.proacl.includes('anon=X/') || r.proacl.includes('authenticated=X/'), false);
  gate(`acl_texto_${r.proname}_mantem_service_role`, r.proacl.includes('service_role=X/'), true);
}

// a vista e o agregado têm de COMPILAR e responder 0 linhas para quem não tem grant (auth.uid() é NULL
// para o papel postgres da ligação; nenhum predicado concede sem grant ativo)
const vista = await q(`select (select count(*)::int from public.bfr_municipal_school_stats) as n`);
const totais = await q(`select * from public.bfr_municipal_network_totals()`);
gate('vista_responde_vazia_sem_grant', vista[0], { n: 0 });
gate('agregado_responde_zeros_sem_grant', totais[0], { schools: 0, students: 0, classes: 0, municipalities: 0 });

const veredito = falhas.length ? 'CONFERENCIA_VERMELHA' : 'CONFERIDO_OK';
writeFileSync(OUT, JSON.stringify({
  programa: 'scripts/sm4-conferir-ddl-municipal-18-11.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  identidade_da_correcao: 'conferência pós-facto da aplicação de 18/11 04:08Z; o vermelho do aplicador foi só do comparador de baselines (4 chaves vs 5), os valores medidos estavam certos; a corrida vermelha está preservada em evidence/sm4-aplicacao-18-11-ANTERIOR-comparador-vermelho.json. Adenda ACL: a 1.ª conferência mediu que os default privileges da plataforma davam EXECUTE a anon/authenticated/service_role nas três funções de escopo apesar do REVOKE FROM PUBLIC; o reforço scripts/sm4-acl-reforco-escopo-18-11.mjs fechou anon e authenticated (service_role mantém, backend de confiança); a corrida intermédia está preservada em evidence/sm4-conferencia-18-11-ANTERIOR-acl-antes-do-reforco.json.',
  candidata: 'scripts/sm4-ddl-municipal-candidata.sql',
  candidata_md5: md5(ddl),
  reversao_md5: md5(readFileSync(REV, 'utf8')),
  preflight_usado: PRE,
  politicas_da_candidata: politicasCandidata.length,
  conferencia: { objetos: objetos[0], linhas: linhas[0], ponte: ponte[0], escolas: escolas[0], bloco_H: alvoH[0], politicas_17_alvo: politicas17[0].n, acl: acl[0], vista: vista[0], totais: totais[0] },
  o_que_prova: 'que a aplicação de 18/11 deixou exatamente o que a candidata cria: 4 tabelas com RLS ativo, 4 colunas novas vazias, 8 funções, 4 índices, 1 vista, a ponte com os pares medidos no preflight (mesmo_id + mesmo_nome, nenhum confirmado), grants e municípios vazios, baselines de linhas intactas, bloco H sem PUBLIC, +4 políticas na lista ALVO17, ACLs de função como desenhado (anon e authenticated sem EXECUTE nas três de escopo após o reforço, service_role mantém), e a vista/agregado compiláveis respondendo vazio sem grant.',
  o_que_NAO_prova: 'que um utilizador autenticado com grant vê linhas — isso é o teste de browser do MÓDULO 2 (tarefa própria), não uma conferência de catálogo; também não prova privilégios de GRANT sobre as tabelas novas além do que os catálogos consultados mostram.',
  falhas,
  veredito,
}, null, 1) + '\n');
console.log('OBJETOS', JSON.stringify(objetos[0]));
console.log('LINHAS', JSON.stringify(linhas[0]));
console.log('PONTE', JSON.stringify(ponte[0]), '| ESCOLAS', JSON.stringify(escolas[0]));
console.log('ALVO_H', JSON.stringify(alvoH[0]), '| politicas17', politicas17[0].n, '| acl', JSON.stringify(acl[0]));
console.log('VISTA', JSON.stringify(vista[0]), '| TOTAIS', JSON.stringify(totais[0]));
console.log(veredito, falhas.length ? JSON.stringify(falhas, null, 1) : '');
process.exit(falhas.length ? 1 : 0);
