#!/usr/bin/env node
// SM-22 (peca 6, SOMENTE LEITURA): tres coisas que a peca 5 deixou em aberto ou abriu sem querer.
//  (a) A regua de caminhos FK de `guardian_students -> profiles` deu 0/0 enquanto o PostgREST
//      continua a responder PGRST201 (mais de uma relacao). Ou a regua esta cega, ou a relacao
//      nao vem de FK direto. Le-se o `pg_get_constraintdef` de tudo o que toca aquelas duas
//      tabelas, nos dois sentidos e em qualquer esquema — sem nomes dactilografiados.
//  (b) PEN-22 de verdade: 8 dos 9 predicados do escopo tem EXECUTE a anon e todos sao SECURITY
//      DEFINER de `postgres`. Mede-se `provolatile`/`pronargs` e chamam-se pelo /rpc, como anon,
//      APENAS as imutaveis/estaveis de zero argumentos — uma funcao volatile nunca e chamada por
//      esta sonda, porque escrita nao esta autorizada. O que se grava e o veredito (status,
//      numero de linhas, nomes de coluna), nunca o conteudo.
//  (c) PEN-13: pela primeira vez ha linhas `pending` no censo (2 de 28). Identifica-se a origem
//      sem PII: hash do id, data de criacao e se existe conta em `auth.users`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-rpc-anon-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
const shellTxt = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const cab = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' };

// ---- (a) o que faz o PostgREST ver mais de uma relacao entre guardian_students e profiles
const fksBrutos = await sql(`select c.conname as nome, n.nspname as esquema,
  cast(c.conrelid as regclass)::text as de, cast(c.confrelid as regclass)::text as para,
  pg_get_constraintdef(c.oid) as definicao
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where c.contype = 'f' and (c.conrelid in ('public.guardian_students'::regclass, 'public.profiles'::regclass)
     or c.confrelid in ('public.guardian_students'::regclass, 'public.profiles'::regclass))
  order by 3, 4, 1`);
const contam = (t) => fksBrutos.filter((f) => (f.de === `public.${t}`)).length;
const fixtura = await sql(`select cast(c.conrelid as regclass)::text as de, count(*)::int as saida_de_uma_fk
  from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace
  group by 1 order by 1 limit 5`);

// ---- (b) as 8 predicados com EXECUTE a anon: forma e chamada real
const NOME9 = ['bfr_school_in_municipal_scope', 'bfr_has_municipal_grant', 'bfr_is_municipal_authority',
  'bfr_is_platform_admin', 'bfr_municipal_network_totals', 'bfr_municipalities_visible',
  'bfr_rls_director_manages_student', 'bfr_rls_is_developer', 'bfr_rls_session_role'];
const formas = await sql(`select p.proname as nome, p.prosecdef as definer, p.provolatile as volatil,
  p.pronargs::int as argumentos, pg_get_function_arguments(p.oid) as assinaturas,
  pg_get_function_result(p.oid) as resultado, pg_get_functiondef(p.oid) as corpo,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (${NOME9.map((x) => `'${x}'`).join(',')}) order by 1, 4`);
// A chamada RPC so e feita com QUATRO provas lidas do catalogo, nao com nomes lembrados:
// zero argumentos, `provolatile` em (i,s), resultado que nao e trigger, e — a que falta a
// `provolatile` sozinha — nenhum comando que modifique dados dentro do corpo da funcao.
const ESCRITA = /\b(insert\s+into|update\s+|delete\s+from|truncate\s|create\s+table|alter\s+table|grant\s|revoke\s|copy\s)/i;
const semEscrita = (f) => !ESCRITA.test((f.corpo || '').replace(/--[^\n]*/g, ''));
const chamaveis = formas.filter((f) => f.anon === true && f.argumentos === 0 && /[is]/.test(f.volatil)
  && !/trigger/.test(f.resultado || '') && semEscrita(f));
const recusadas = formas.filter((f) => f.anon === true && !chamaveis.includes(f))
  .map((f) => `${f.nome}(args=${f.argumentos},volatil=${f.volatil},resultado=${f.resultado},escrita_no_corpo=${!semEscrita(f)})`);
const rpc = [];
for (const f of chamaveis) {
  const r = await fetch(`${HOST}/rest/v1/rpc/${f.nome}`, { method: 'POST', headers: { ...cab, 'cache-control': 'no-cache' }, body: '{}' });
  const t = await r.text();
  let forma = null, linhas = null, colunas = null, code = null;
  try {
    const j = JSON.parse(t);
    if (Array.isArray(j)) { linhas = j.length; colunas = j.length ? Object.keys(j[0]) : []; forma = 'array'; }
    else if (j && typeof j === 'object') { code = j.code || null; forma = 'objeto_erro'; }
    else { forma = 'escalar'; linhas = null; }
  } catch { forma = t.length > 0 ? 'texto' : 'vazio'; }
  rpc.push({ nome: f.nome, tipo_declarado: f.resultado, status: r.status, forma, linhas, colunas, code, bytes_resposta: t.length });
}
const bytesPeloVeredito = rpc.reduce((s, x) => s + (x.status === 200 ? 1 : 0), 0);

// ---- (c) as linhas pending, sem PII. Nao se dactilografam colunas: `profiles` nao tem
// `updated_at` (a primeira versao desta peca rebateu em 42703 por assumir), por isso a lista
// lida do catalogo e o que se seleciona e id (hash), created_at e a presenca em auth.users.
const colunasProfiles = await sql(`select column_name as coluna from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' order by 1`);
const temColuna = (c) => colunasProfiles.some((x) => x.coluna === c);
if (!temColuna('created_at')) throw new Error('ABORTA: profiles nao tem created_at — a data de origem do pending nao e mensuravel assim');
const pend = await sql(`select md5(p.id::text) as id_hash, to_char(p.created_at,'YYYY-MM-DD') as criado,
  (select count(*)::int from auth.users u where u.id = p.id) as auth_users
  from public.profiles p where p.role = 'pending' order by 2, 1`);
const filaAprovacao = await sql(`select coalesce(status::text,'(nulo)') as estado, count(*)::int as linhas
  from public.access_requests group by 1 order by 2 desc, 1`);
const porPapel = await sql(`select coalesce(role::text,'(nulo)') as papel, count(*)::int as linhas from public.profiles group by 1 order by 2 desc, 1`);

const out = {
  em: new Date().toISOString(),
  metodo: 'SELECTs de catalogo + POST /rpc so de funcoes estaveis/imutaveis de zero argumentos, como anon; zero escrita; chave anon jamais gravada',
  pen28_fk: {
    constraintenvolvidos: fksBrutos,
    total_de_fk_para_guardian_students: contam('guardian_students'),
    total_de_fk_para_profiles: contam('profiles'),
    fixture_regua: fixtura,
    nota: 'se 0/0 e o PostgREST diz PGRST201, a ambiguidade nao vem de FK direto entre as duas — ve-se em constraintenvolvidos o que existe',
  },
  pen22_rpc_anon: {
    formas: formas.map((f) => ({ nome: f.nome, definer: f.definer, volatil: f.volatil, argumentos: f.argumentos,
      resultado: f.resultado, anon: f.anon, auth: f.auth, corpo_bytes: (f.corpo || '').length, escrita_no_corpo: !semEscrita(f) })),
    chamaveis_sem_argumentos: chamaveis.map((f) => f.nome),
    nao_chamadas_porEsta_sonda: recusadas,
    chamadas: rpc,
    http_200: bytesPeloVeredito,
    regua_de_escrita: 'POST de RPC so com provolatile em (i,s) e 0 argumentos; nenhuma funcao volatile foi tocada',
  },
  pen13_pending: { distribuicao: porPapel, total: porPapel.reduce((s, x) => s + x.linhas, 0), linhas: pend, fila_access_requests: filaAprovacao },
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`(a) FKs que tocam guardian_students/profiles: ${fksBrutos.length}`);
for (const f of fksBrutos) console.log(`    ${f.de} -> ${f.para} [${f.nome}] ${f.definicao.slice(0, 110)}`);
console.log(`    contam saida: guardian_students=${contam('guardian_students')} profiles=${contam('profiles')}; fixture ${JSON.stringify(fixtura.slice(0, 2))}`);
console.log(`(b) chamaveis como anon sem argumentos: [${chamaveis.map((f) => f.nome).join(',')}]`);
console.log(`    nao chamadas (args>0 ou volatile): [${recusadas.join(', ') || 'nenhuma'}]`);
for (const r of rpc) console.log(`    rpc ${r.nome}: status=${r.status} forma=${r.forma} linhas=${r.linhas ?? '-'} code=${r.code || '-'} bytes=${r.bytes_resposta} colunas=[${(r.colunas || []).join(',')}]`);
for (const f of formas) console.log(`    forma ${f.nome}: definer=${f.definer} volatil=${f.volatil} args=${f.argumentos} anon=${f.anon} auth=${f.auth} resultado=${f.resultado}`);
console.log(`(c) pending: ${pend.length} linhas de ${out.pen13_pending.total} profiles`);
for (const p of pend) console.log(`    id_hash=${p.id_hash.slice(0, 12)} criado=${p.criado} auth_users=${p.auth_users}`);
console.log(`    fila access_requests: ${filaAprovacao.map((x) => `${x.estado}=${x.linhas}`).join(' ')}`);
console.log(`\nSM22_RPC_OK · registo evidence/sm22-varre-rpc-anon-18-11.json`);
