#!/usr/bin/env node
// SM.23 — CENSO de PRONTIDÃO DE DADOS municipais (só leitura), para atribuir a causa do «0 linhas» sem
// inventar: a vista já não salta o RLS (security_invoker=true, aplicado e conferido), e o WHERE pede
// `bfr_school_in_municipal_scope(id)`. Medido em evidence/sm23-causa-predicado-18-11.json: 6 escolas,
// 0 com `municipality_id`, 4 concessões sobre 1 município. Este censo completa a cadeia:
//   * `bfr_municipalities` tem o município que as concessões citam? (se não, são órfãs)
//   * `bfr_municipal_audit` e `bfr_school_key_map`: o que existe para ligar escola↔município
//   * o predicado `bfr_municipal_municipalities()` (que a minha sonda forjada tentou chamar) está
//     grantado a quem? — é a mesma classe de defeito que o ciclo sm10 corrigiu para outros predicados.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-censo-municipios-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, não por cima');
const causa = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-causa-predicado-18-11.json'), 'utf8'));

const mesas = await sql(`select t.tablename as tabela,
  (select count(*)::int from public.bfr_municipalities) as municipios, 0 as nada
  from pg_tables t where t.schemaname='public' and t.tablename in ('bfr_municipalities','bfr_municipal_access_grants','bfr_municipal_audit','bfr_school_key_map') order by 1`);
const contagens = await sql(`select
  (select count(*)::int from public.bfr_municipalities) as municipios,
  (select count(*)::int from public.bfr_municipal_access_grants) as concessoes,
  (select count(*)::int from public.bfr_municipal_audit) as auditoria,
  (select count(*)::int from public.bfr_school_key_map) as chaves_de_escola,
  (select count(*)::int from public.schools) as escolas,
  (select count(*)::int from public.schools where municipality_id is not null) as escolas_com_municipio`);
const municipios = await sql(`select id::text as id, name as nome from public.bfr_municipalities order by name limit 20`);
const concedidos = await sql(`select distinct municipality_id::text as municipio_concedido,
  (select count(*)::int from public.bfr_municipalities m where m.id::text = g.municipality_id::text) as existe_na_tabela_de_municipios,
  (select count(*)::int from public.schools s where s.municipality_id::text = g.municipality_id::text) as escolas_desse_municipio
  from public.bfr_municipal_access_grants g order by 1`);
const funcoesDeEscopo = await sql(`select p.proname as nome, pg_get_function_arguments(p.oid) as argumentos,
  array_to_string(p.proacl,' | ') as acl, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec, has_function_privilege('service_role', p.oid, 'EXECUTE') as svc_exec,
  (select count(*)::int from pg_policy pol where strpos(coalesce(pg_get_expr(pol.polqual,pol.polrelid),'') || coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),''), p.proname) > 0) as em_policies,
  (select count(*)::int from pg_class v where v.relkind='v' and strpos(pg_get_viewdef(v.oid), p.proname) > 0) as em_views
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in ('bfr_municipal_municipalities','bfr_school_in_municipal_scope','bfr_school_in_own_school_scope','bfr_municipalities_visible','bfr_is_platform_admin','bfr_is_municipal_authority')
  order by 1`);
const chavesMap = await sql(`select count(*)::int as linhas,
  count(matched_by)::int as com_matched_by, count(confirmed_by)::int as com_confirmado_por,
  count(*) filter (where sports_school_id is not null)::int as com_escola_desportiva
  from public.bfr_school_key_map`);

const o = {
  programa: 'scripts/sm23-censo-municipios-18-11.mjs',
  em: new Date().toISOString(),
  pergunta: 'o que falta para o escopo municipal ter linhas: DDL, ou dados?',
  metodo: 'contagens e junções por ::text no canal SQL (dono, BYPASSRLS); nenhuma escrita',
  unidade: 'linhas por mesa; `escolas_com_municipio` são ESCOLAS com municipality_id não nulo',
  lido_de: 'evidence/sm23-causa-predicado-18-11.json',
  causa_anterior: causa.conclusao,
  mesas, contagens: contagens[0], municipios, concessionarios: concedidos, chaves_de_escola: chavesMap[0],
  funcoes_de_escopo: funcoesDeEscopo,
  conclusao: (() => {
    const c = contagens[0];
    const semLigacao = c.escolas - c.escolas_com_municipio;
    return {
      escolas_sem_municipio: semLigacao,
      municipios_registrados: c.municipios,
      frases_que_esta_corrida_autoriza: [
        c.escolas_com_municipio === 0 ? `nenhuma das ${c.escolas} escolas carries município: o predicado de escopo não tem com que casar` : `${c.escolas_com_municipio} escolas têm município`,
        c.municipios === 0 ? 'a tabela bfr_municipalities está vazia, logo as concessões apontam para um uuid que não está registrado como município' : `bfr_municipalities tem ${c.municipios} linhas`,
        'nada disto é causado pelo `security_invoker=true`: o mesmo WHERE, avaliado sem sessão, já dava falso para todas as escolas',
      ],
      o_que_a_escola_tem_de_decidir: 'quais escolas pertencem a qual município (é dado, não política); só depois a vista municipal devolve linhas',
    };
  })(),
};
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('CONTAGENS', JSON.stringify(o.contagens));
console.log('MUNICIPIOS', JSON.stringify(municipios));
console.log('CONCEDIDOS', JSON.stringify(concedidos));
console.log('CHAVES_MAP', JSON.stringify(chavesMap[0]));
console.log('FUNCOES_DE_ESCOPE', funcoesDeEscopo.map((f) => `${f.nome}:anon=${f.anon_exec}/auth=${f.auth_exec}/policies=${f.em_policies}/views=${f.em_views}`).join(' | '));
console.log('CONCLUSAO', JSON.stringify(o.conclusao.frases_que_esta_corrida_autoriza, null, 1));
console.log('CENSO_MUNICIPAL_REGISTRADO ·', OUT);
