#!/usr/bin/env node
// SM-22 (peca 4, SOMENTE LEITURA): o censo de catalogo deu VERMELHO em PEN-23 porque o estado
// do banco mudou desde 12/11 — ha uma 7.ª view, `bfr_municipal_school_stats`, dona `postgres`
// (BYPASSRLS) e SEM `security_invoker`. Esta peca mede a vista a fundo, prova se um anon a
// consegue ler pelo PostgREST, e diz que funcoes ganharam EXECUTE a anon entretanto.
// Nada escreve: SELECTs de pg_catalog e GETs. A chave anon e lida dos bytes servidos e nunca
// impressa nem gravada; o artefacto so contem nomes, numeros e estados.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-view-municipal-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
const shellTxt = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
// extracao por substituicao, nunca por captura impressivel: o valor vive na variavel e morre ai.
const m = /SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt);
if (!m) throw new Error('ABORTA: a chave publishable nao foi encontrada nos bytes servidos — a sonda nao pode continuar às cegas');
const anonKey = m[1];
const chave_tem_forma_de_jwt = /^eyJ/.test(anonKey);

// 1) a vista: dono, security_invoker, grants por papel, e a forma da definicao (nomes de coluna).
// `aclexplode` e `RETURNS setof record`: num subselect com alias, o PG nao conhece as colunas em
// tempo de parsing e rebenta em `column a.priv_type does not exist`. A alternativa probatoria e
// `has_table_privilege` (o veredito do executor) + `information_schema.role_table_grants` (o
// quem-concedeu). `relacl NULL` tambem nao e `{}`: NULL = ACL de sistema (so dono).
const v = await sql(`select c.relname as nome, r.rolname as dono,
  case when c.relacl is null then 'NULL' else 'CONJUNTO' end as acl_forma,
  c.reloptions as opcoes,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
  has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'SELECT') as auth_select,
  has_table_privilege('service_role', c.oid, 'SELECT') as svc_select,
  (select coalesce(string_agg(g.rolname || '.' || g.ptype || ' por ' || g.grantor, ' | '), 'nenhum grant explicito')
     from (select gr.rolname, a.privilege_type as ptype, go.rolname as grantor
             from information_schema.role_table_grants a
             join pg_roles gr on gr.rolname = a.grantee
             join pg_roles go on go.rolname = a.grantor
            where a.table_schema = 'public' and a.table_name = c.relname
              and gr.rolname in ('anon','authenticated','service_role','public','postgres')) g) as grants,
  length(pg_get_viewdef(c.oid, true)) as definicao_bytes,
  pg_get_viewdef(c.oid, true) as definicao
  from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner
  where n.nspname='public' and c.relkind='v' order by c.relname`);
const municipal = v.find((x) => x.nome === 'bfr_municipal_school_stats');
if (!municipal) throw new Error('ABORTA: a vista municipal nao apareceu no censo das views — a premissa do vermelho mudou');
// `reloptions` pode chegar como array ou como texto `{...}` conforme o cliente; a predicates
// serializa os dois lados para nao decidir por representacao.
const temInvoker = (x) => JSON.stringify(x.opcoes ?? null).includes('security_invoker=true');
const colunas = [...new Set(((municipal.definicao || '').match(/[a-z_]+\.[a-z_]+/g) || []).map((s) => s.split('.')[1]))];

// 2) pode um anon ler? GET sem corpo gravado: so status, linhas e nomes de coluna.
const probeAnon = await fetch(`${HOST}/rest/v1/bfr_municipal_school_stats?select=*&limit=2`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
const corpoAnon = await probeAnon.text();
let linhasAnon = null, colunasAnon = null, erroAnon = null;
try { const j = JSON.parse(corpoAnon); if (Array.isArray(j)) { linhasAnon = j.length; colunasAnon = j.length ? Object.keys(j[0]) : []; } else erroAnon = `${j.code || ''} ${(j.message || '').slice(0, 120)}`; }
catch { erroAnon = 'nao-JSON'; }

// 3) leitura pelas 6 vistas velhas, para provar que o par anon/RLS nao mudou em nada
const probesVelhas = {};
for (const nome of ['sports_public_schools', 'sports_public_athletes', 'support_professionals_directory']) {
  const r = await fetch(`${HOST}/rest/v1/${nome}?select=*&limit=1`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  const t = await r.text();
  let n = null; try { n = Array.isArray(JSON.parse(t)) ? JSON.parse(t).length : null; } catch {}
  probesVelhas[nome] = { status: r.status, linhas: n };
}

// 4) PEN-22: quais funcoes tem EXECUTE a anon hoje, e o que acresceu contra 12/11
const hoje = await sql(`select p.proname as nome, n.nspname as esquema, count(*)::int as sobrecargas,
  bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' group by 1,2 order by 1`);
const artefacto12 = JSON.parse(readFileSync(join(REPO, 'evidence/fin2-higiene-rm62.json'), 'utf8'));
const nomes12 = new Set((artefacto12.pen22_funcoes || []).filter((f) => f.anon_execute).map((f) => f.nome));
const nomesHoje = new Set(hoje.filter((f) => f.anon_execute).map((f) => f.nome));
const novasComAnon = [...nomesHoje].filter((x) => !nomes12.has(x));

const out = {
  em: new Date().toISOString(),
  metodo: 'SELECTs de pg_catalog + GETs anon; zero escrita; chave anon lida dos bytes servidos e jamais gravada',
  chave_anon: { obtida_dos_bytes_servidos: true, forma_de_jwt: chave_tem_forma_de_jwt, bytes: anonKey.length },
  pen23: {
    total_views: v.length,
    views: v.map((x) => ({ nome: x.nome, dono: x.dono, acl_forma: x.acl_forma, opcoes: x.opcoes,
      anon_select: x.anon_select, auth_select: x.auth_select, grants: x.grants, definicao_bytes: x.definicao_bytes })),
    sem_security_invoker: v.filter((x) => !temInvoker(x)).map((x) => x.nome),
    a_vista_municipal: {
      nome: municipal.nome, dono: municipal.dono, acl_forma: municipal.acl_forma, opcoes: municipal.opcoes,
      grants_a_roles: municipal.grants,
      anon: { select: municipal.anon_select, insert: municipal.anon_insert, update: municipal.anon_update, delete: municipal.anon_delete },
      authenticated_select: municipal.auth_select, service_role_select: municipal.svc_select,
      colunas_referenciadas_na_definicao: colunas,
      security_invoker: temInvoker(municipal),
    },
  },
  probe_anon_na_vista_municipal: { status: probeAnon.status, linhas: linhasAnon, colunas: colunasAnon, erro: erroAnon },
  probes_anon_nas_vistas_velhas: probesVelhas,
  pen22: {
    total_funcoes_public: hoje.length,
    com_anon_execute_hoje: nomesHoje.size,
    com_anon_execute_em_12_11: nomes12.size,
    novas_com_anon_execute: novasComAnon,
  },
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`views=${out.pen23.total_views} sem_security_invoker=[${out.pen23.sem_security_invoker.join(',')}]`);
console.log(`municipal: dono=${municipal.dono} opcoes=${JSON.stringify(municipal.opcoes)} grants=[${municipal.grants}]`);
console.log(`anon GET na vista municipal: status=${probeAnon.status} linhas=${linhasAnon} colunas=[${(colunasAnon || []).join(',')}] erro=${erroAnon || '-'}`);
for (const [k, x] of Object.entries(probesVelhas)) console.log(`  vista velha ${k}: status=${x.status} linhas=${x.linhas}`);
console.log(`pen22: funcoes_public=${out.pen22.total_funcoes_public} anon_execute hoje=${out.pen22.com_anon_execute_hoje} em_12_11=${out.pen22.com_anon_execute_em_12_11} novas=[${out.pen22.novas_com_anon_execute.join(',') || 'nenhuma'}]`);
console.log(`\nSM22_VIEW_OK · registo evidence/sm22-varre-view-municipal-18-11.json`);
