// SM4-ACL-REFORCO — fecha as três funções de escopo municipal também para anon e authenticated.
// Identidade: a candidata aplicada às 04:08Z de 18/11 revogou EXECUTE destas funções a PUBLIC, e isso
// funcionou (o `=X/postgres` sumiu do proacl). O que a candidata não sabia — e a conferência mediu —
// é que o Supabase tem DEFAULT PRIVILEGES no schema public que concedem EXECUTE a anon, authenticated
// e service_role a TODA função nova no momento da criação: as três ficaram com `anon=X/…,
// authenticated=X/…` apesar do REVOKE FROM PUBLIC. Intenção escrita da candidata: «Os predicados de
// escopo ficam fechados ao PUBLIC — não são sonda para enumerar escolas». Este reforço faz o vivo
// bater com essa intenção: REVOKE EXECUTE de anon e authenticated nas três. service_role fica com o
// privilégio (é o papel de backend de confiança, norma da plataforma). Reversão não é precisa: a
// reversão da candidata faz DROP das funções, e DROP elimina o ACL junto. O shell v131 só chama
// bfr_is_municipal_authority via rpc (medido: 4 ocorrências, nenhuma das três fechadas) — fechar
// não quebra nada do cliente. Autorização: o mesmo OK «Aplicar DDL municipal» — é correção restritiva
// que alinha o estado vivo com o texto da candidata, sem criar objeto nem dado novo.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/sm4-acl-reforco-escopo-18-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const falhas = [];
const gate = (nome, obtido, esperado) => {
  if (JSON.stringify(obtido) !== JSON.stringify(esperado)) falhas.push(`${nome}: ${JSON.stringify(obtido)} != ${JSON.stringify(esperado)}`);
};
const q = async (query) => (await sql(query));
const alvos = ["bfr_school_in_municipal_scope(uuid)", "bfr_school_in_own_school_scope(uuid)", "bfr_municipal_municipalities()"];

// pré-estado: PUBLIC já fechado, e o defeito presente (anon/authenticated com EXECUTE via default)
const pre = await q(`select proname, coalesce(proacl::text,'<NULL>') as proacl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in ('bfr_school_in_municipal_scope','bfr_school_in_own_school_scope','bfr_municipal_municipalities') order by 1`);
const preMap = Object.fromEntries(pre.map((r) => [r.proname, r.proacl]));
const defaults = await q(`select d.defaclrole::regrole::text as papel, d.defaclobjtype::text as tipo,
  coalesce(d.defaclacl::text,'<NULL>') as acl from pg_default_acl d`);
// Correção datada 18/11, pós-primeira-corrida: o padrão `includes('=X/')` também casa `postgres=X/…`
// (o nome do concedente), e acusou PUBLIC presente quando não estava. O padrão certo é a entrada com
// concedente VAZIO: `{=X/` no início ou `,=X/` a seguir a vírgula. A corrida vermelha (só por este
// defeito do portão — os REVOKEs aplicaram e a conferência POS ficou toda verde) está preservada em
// evidence/sm4-acl-reforco-escopo-18-11-ANTERIOR-pre-gate-padrao-vermelho.json.
const temPublic = (acl) => /(^|,)=X\//.test(acl);
for (const r of pre)
  gate(`pre_public_fechado_${r.proname}`, temPublic(r.proacl), false);
gate('pre_anon_authenticated_com_execute', pre.every((r) => r.proacl.includes('anon=X/') && r.proacl.includes('authenticated=X/')), true);

const em = new Date().toISOString();
const ddl = `BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';
REVOKE EXECUTE ON FUNCTION public.bfr_school_in_municipal_scope(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bfr_school_in_own_school_scope(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bfr_municipal_municipalities() FROM anon, authenticated;
COMMIT;`;
await sql(ddl);

const pos = await q(`select
  has_function_privilege('anon','public.bfr_school_in_municipal_scope(uuid)','execute') as anon_scope,
  has_function_privilege('anon','public.bfr_school_in_own_school_scope(uuid)','execute') as anon_own,
  has_function_privilege('anon','public.bfr_municipal_municipalities()','execute') as anon_munis,
  has_function_privilege('authenticated','public.bfr_school_in_municipal_scope(uuid)','execute') as auth_scope,
  has_function_privilege('authenticated','public.bfr_school_in_own_school_scope(uuid)','execute') as auth_own,
  has_function_privilege('authenticated','public.bfr_municipal_municipalities()','execute') as auth_munis,
  has_function_privilege('service_role','public.bfr_school_in_municipal_scope(uuid)','execute') as sr_scope,
  has_function_privilege('service_role','public.bfr_municipal_municipalities()','execute') as sr_munis`);
gate('pos_anon_e_authenticated_sem_execute', pos[0],
  { anon_scope: false, anon_own: false, anon_munis: false, auth_scope: false, auth_own: false, auth_munis: false, sr_scope: true, sr_munis: true });
const posAcl = await q(`select proname, coalesce(proacl::text,'<NULL>') as proacl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in ('bfr_school_in_municipal_scope','bfr_school_in_own_school_scope','bfr_municipal_municipalities') order by 1`);
for (const r of posAcl) {
  gate(`pos_acl_${r.proname}_sem_anon_auth`, r.proacl.includes('anon=X/') || r.proacl.includes('authenticated=X/'), false);
  gate(`pos_acl_${r.proname}_mantem_service_role`, r.proacl.includes('service_role=X/'), true);
}

const veredito = falhas.length ? 'REFORCO_VERMELHO' : 'REFORCO_APLICADO_E_CONFERIDO';
writeFileSync(OUT, JSON.stringify({
  programa: 'scripts/sm4-acl-reforco-escopo-18-11.mjs',
  em,
  alvos,
  pre_acl: preMap,
  pg_default_acl_medido: defaults,
  pos_privilegios: pos[0],
  pos_acl: Object.fromEntries(posAcl.map((r) => [r.proname, r.proacl])),
  o_que_prova: 'que o REVOKE FROM PUBLIC da candidata tinha funcionado (não havia =X/postgres) mas que os default privileges da plataforma davam EXECUTE a anon/authenticated/service_role a toda função nova; que depois deste reforço anon e authenticated já não executam as três funções de escopo, que service_role mantém (backend de confiança), e que o shell cliente não chama nenhuma delas (medido: 4 chamadas a bfr_is_municipal_authority, que continua concedida de propósito).',
  o_que_NAO_prova: 'que nenhuma outra função municipal herdou o mesmo default — só estas três foram medidas e fechadas; as restantes (authority, grant, totais, visível) são de interface e a candidata concede-as de propósito.',
  falhas,
  veredito,
}, null, 1) + '\n');
console.log('PRE', JSON.stringify(preMap));
console.log('DEFAULTS', JSON.stringify(defaults));
console.log('POS', JSON.stringify(pos[0]));
console.log(veredito, falhas.length ? JSON.stringify(falhas, null, 1) : '');
process.exit(falhas.length ? 1 : 0);
