#!/usr/bin/env node
// SM-22 (peca 8, SOMENTE LEITURA): fecha a causa do `pending` e corrige uma regua minha.
//  (a) A peca 7 filtrou gatilhos por `cast(c.relname as text) in ('profiles','auth.users')` e nao
//      imprimiu nenhum — `relname` e so `users` na tabela `auth.users`, pelo que o filtro estava
//      morto e o 0 era da sonda, nao do banco. Aqui a chave e `esquema.tabela`.
//  (b) As 2 linhas `pending` (17/11 e 18/11) tem de ter assinaturas separadas: conta escrita pelo
//      caminho de signup SEM `role` nos metadados (cai no DEFAULT da coluna) ou INSERT explicito.
//      Leem-se apenas chaves de `raw_user_meta_data` e hashes de id — nunca e-mail nem nome.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-gatilho-pending-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

// (a) gatilhos com chave qualificada pelo esquema
const gatilhos = await sql(`select n.nspname || '.' || c.relname as tabela, t.tgname as nome,
  (t.tgtype::int & 4) > 0 as em_insercao, p.proname as funcao, p.prosecdef as definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal and n.nspname || '.' || c.relname in ('public.profiles','auth.users')
  order by 1, 2`);
if (gatilhos.length === 0) throw new Error('ABORTA: nenhum gatilho em auth.users/public.profiles — ou o nome qualificado voltou a estar errado ou a premissa do RM12-A1 mudou');

// (b) as linhas pending, por assinatura de escrita. Os nomes de coluna de `auth.users` NAO se
// dactilografram: a primeira versao desta peca pediu `u.app_metadata` e rebateu em 42703 (a
// coluna desta versao chama-se outra coisa). Le-se o catalogo e monta-se a consulta com o que
// existe — assim um 0 nunca e nome de coluna errado.
const colAuth = await sql(`select column_name as coluna from information_schema.columns where table_schema='auth' and table_name='users' order by 1`);
const tem = (c) => colAuth.some((x) => x.coluna === c);
const colunasMetadata = colAuth.filter((x) => /metadata|meta_data/i.test(x.coluna)).map((x) => x.coluna);
const colunasArb = await sql(`select column_name as coluna from information_schema.columns where table_schema='public' and table_name='access_requests' order by 1`);
const temEmailPedido = colunasArb.some((x) => x.coluna === 'email');
const exprs = ['md5(p.id::text) as id_hash', "to_char(p.created_at,'YYYY-MM-DD') as criado", "to_char(u.created_at,'YYYY-MM-DD') as auth_criado"];
for (const c of colunasMetadata) {
  exprs.push(`coalesce((select string_agg(k, ',' order by k) from jsonb_object_keys(u.${c}) k), '(sem metadados)') as chaves_${c}`);
  exprs.push(`(u.${c} ? 'role') as role_em_${c}`);
}
if (temEmailPedido) exprs.push(`(select count(*)::int from public.access_requests a where a.email = u.email) as pedidos_por_email`);
const pend = await sql(`select ${exprs.join(',\n  ')}
  from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'pending' order by 2, 1`);
if (!pend.length) throw new Error('ABORTA: ja nao ha linhas pending — a premissa desta peca (2 linhas) deixou de ser verdade, re-medir o censo antes');
const totalPending = pend.length;
const chaveRole = colunasMetadata.filter((c) => pend.every((x) => x[`role_em_${c}`] === false));
const semRoleEmQualquerMetadata = pend.filter((x) => colunasMetadata.every((c) => x[`role_em_${c}`] === false)).length;
const criadoMesmoDia = pend.filter((x) => x.criado === x.auth_criado).length;

// contrapartida: quantos profiles tem role DIFERENTE do default — prova que o default nao e a
// unica saida possivel e que as 2 linhas estao la porque alguem nao passou role, nao por bug de leitura
const foraDoDefault = await sql(`select count(*)::int as linhas from public.profiles where role <> 'pending'::account_role`);

const out = {
  em: new Date().toISOString(),
  metodo: 'SELECTs de catalogo e de auth/public; zero escrita; so hashes de id, datas e nomes de chave de metadata',
  gatilhos_qualificados: gatilhos,
  regua_corrigida: 'a peca 7 usava relname sozinho e nunca casava auth.users; aqui a chave e nspname.relname',
  pending: { linhas: pend, total: totalPending, colunas_de_metadata_lidas_do_catalogo: colunasMetadata,
    colunas_onde_role_nunca_aparece: chaveRole, sem_role_em_qualquer_metadata: semRoleEmQualquerMetadata,
    criado_mesmo_dia_que_auth: criadoMesmoDia, access_requests_tem_coluna_email: temEmailPedido },
  fora_do_default: foraDoDefault[0].linhas,
  leitura: 'default da coluna profiles.role = pending; handle_new_user NAO menciona pending (peca 7); entao uma conta criada sem role nos metadados fica pending por DEFAULT da coluna',
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`gatilhos (${gatilhos.length}):`);
for (const g of gatilhos) console.log(`  ${g.tabela}.${g.nome}: insert=${g.em_insercao} funcao=${g.funcao} definer=${g.definer} anon_execute=${g.anon_execute}`);
console.log(`pending: total=${totalPending} sem_role_em_qualquer_metadata=${semRoleEmQualquerMetadata} de ${colunasMetadata.length} colunas [${colunasMetadata.join(',')}] criado_mesmo_dia_que_auth=${criadoMesmoDia} fora_do_default=${out.fora_do_default} access_requests.email=${temEmailPedido}`);
for (const p of pend) console.log(`  id_hash=${p.id_hash.slice(0, 12)} criado=${p.criado}/auth=${p.auth_criado} ${colunasMetadata.map((c) => `${c}=[${p[`chaves_${c}`]}] role=${p[`role_em_${c}`]}`).join(' ')}${temEmailPedido ? ` pedidos=${p.pedidos_por_email}` : ''}`);
console.log(`\nSM22_GATILHO_OK · registo evidence/sm22-varre-gatilho-pending-18-11.json`);
