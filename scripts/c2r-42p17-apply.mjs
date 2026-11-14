// C2-R — APLICADOR da candidata que quebra o ciclo de 42P17 (profiles <-> staff_schools).
// Só escreve com `--apply`; sem a flag é simulação (imprime o plano, não manda nada).
// Protocolo da casa: preflight byte a byte -> DDL numa única chamada (transacção implícita)
// -> conferência de catálogo -> conferência de que NENHUM dado foi tocado -> evidência em disco.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DIR, sql } from './c2-lib.mjs';

const APLICA = process.argv.includes('--apply');
const ARQ_SQL = `${DIR}/sql/c2r-42p17-candidate.sql`;
const EVIDENCIA = `${DIR}/docs/c2r-42p17-apply.json`;
const TOKEN = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const espacar = (h) => [...String(h)].join(' ');

const bruto = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  return { status: r.status, bruto: t.slice(0, 2000), ok: r.ok };
};

const HASH_SQL = `select md5(string_agg(n.nspname || '.' || c.relname || '.' || p.polname || '|'
    || coalesce(pg_get_expr(p.polqual, p.polrelid), '<nulo>') || '|'
    || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '<nulo>'), '' order by 1)) as h,
  count(*)::int as n
  from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and ((c.relname = 'profiles' and p.polname = 'profiles_read') or c.relname = 'staff_schools')`;

const CENSO_SQL = `select n.nspname || '.' || c.relname || '.' || p.polname as policy,
       p.polcmd as comando,
       coalesce((select string_agg(r.rolname, ',' order by r.rolname) from pg_roles r where r.oid = any(p.polroles)), 'todos') as papeis
  from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and ((c.relname = 'profiles' and p.polname = 'profiles_read') or c.relname = 'staff_schools')
 order by 1`;

const FN_SQL = `select p.prosecdef as definer,
       pg_get_userbyid(p.proowner) as dono,
       p.provolatile as volatilidade,
       (select count(*)::int from aclexplode(coalesce(p.proacl, '{}'::aclitem[])) a
         where a.grantee = 0 and a.privilege_type = 'execute') as publico_executa,
       coalesce((select string_agg(r.rolname || '=' || a.privilege_type, ',' order by r.rolname)
                   from aclexplode(p.proacl) a join pg_roles r on r.oid = a.grantee
                  where a.privilege_type = 'execute'), '') as quem_pode_chamar,
       coalesce(p.proacl::text, '<nulo>') as acl_crua
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where p.proname = 'bfr_profile_in_my_schools' and n.nspname = 'public'`;

const DADOS_SQL = `select (select count(*)::int from public.profiles) as profiles,
       (select count(*)::int from public.staff_schools) as staff_schools,
       (select count(*)::int from public.students) as students,
       (select count(*)::int from public.guardian_students) as guardian_students`;

const gravado = JSON.parse(readFileSync(`${DIR}/docs/c2r-42p17-dryrun.json`, 'utf8'));
const busca = (o, k) => {
  if (!o || typeof o !== 'object') return null;
  for (const [kk, v] of Object.entries(o)) { if (kk === k) return v; const f = busca(v, k); if (f !== null) return f; }
  return null;
};
const md5_antes = busca(gravado, 'md5_antes');
const md5_cand = busca(gravado, 'md5_cand');
const md5_rb = busca(gravado, 'md5_rb');

const corpo = readFileSync(ARQ_SQL, 'utf8');
const registro = {
  ciclo: 'C2-R',
  itens: 'sql/c2r-42p17-candidate.sql',
  em: new Date().toISOString(),
  modo: APLICA ? 'APPLY' : 'SIMULACAO',
  arquivo: { caminho: ARQ_SQL, bytes: Buffer.byteLength(corpo), md5: createHash('md5').update(corpo).digest('hex') },
  esperado: { md5_antes, md5_cand, md5_rb },
};

console.log('arquivo :', registro.arquivo.caminho);
console.log('bytes   :', registro.arquivo.bytes);
console.log('md5 sql :', espacar(registro.arquivo.md5));
console.log('modo    :', registro.modo);

const antesHash = await sql(HASH_SQL);
const antesDados = await sql(DADOS_SQL);
const antesFn = await sql(`select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'bfr_profile_in_my_schools' and n.nspname = 'public'`);
registro.antes = {
  md5_vivo: antesHash[0].h,
  policies: antesHash[0].n,
  funcao_existe: antesFn[0].n,
  dados: antesDados[0],
};
console.log('\n-- PREFLIGHT --');
console.log('md5 vivo   :', espacar(antesHash[0].h));
console.log('md5_antes  :', espacar(md5_antes));
console.log('policies   :', antesHash[0].n);
console.log('funcao     :', antesFn[0].n, '(esperado 0: nada aplicado)');

const bloqueios = [];
if (antesHash[0].n !== 7) bloqueios.push(`censo antes | dado=${antesHash[0].n} | esperado=7`);
if (antesHash[0].h !== md5_antes) bloqueios.push('deparse vivo != md5_antes: a candidata envelheceu, nao aplicar');
if (antesFn[0].n !== 0) bloqueios.push('a funcao da candidata ja existe no vivo: estado nao e o esperado');
if (!md5_cand) bloqueios.push('md5_cand ausente no dry-run: nao ha pos-estado esperado');

if (bloqueios.length) {
  registro.resultado = 'BLOQUEADO';
  registro.bloqueios = bloqueios;
  writeFileSync(EVIDENCIA, JSON.stringify(registro, null, 2) + '\n');
  console.log('\nC2R_APLICA_BLOQUEADO:', JSON.stringify(bloqueios));
  process.exit(1);
}

if (!APLICA) {
  registro.resultado = 'SIMULACAO_OK';
  writeFileSync(EVIDENCIA, JSON.stringify(registro, null, 2) + '\n');
  console.log('\nC2R_APLICA_SIMULADO: preflight verde; nada foi enviado. Rode com --apply.');
  process.exit(0);
}

console.log('\n-- APLICANDO (uma chamada, transaccao implícita) --');
const apl = await bruto(corpo);
registro.aplicacao = { status: apl.status, resposta: apl.ok ? undefined : apl.bruto };
console.log('HTTP', apl.status, apl.ok ? 'OK' : apl.bruto);
if (!apl.ok) {
  registro.resultado = 'FALHA_APLICACAO';
  writeFileSync(EVIDENCIA, JSON.stringify(registro, null, 2) + '\n');
  console.log('C2R_APLICA_FALHOU');
  process.exit(1);
}

const depoisHash = await sql(HASH_SQL);
const depoisCenso = await sql(CENSO_SQL);
const depoisFn = await sql(FN_SQL);
const depoisDados = await sql(DADOS_SQL);
registro.depois = {
  md5_vivo: depoisHash[0].h,
  policies: depoisHash[0].n,
  censo: depoisCenso,
  funcao: depoisFn,
  dados: depoisDados[0],
};
console.log('\n-- CONFERENCIA --');
console.log('md5 vivo depois:', espacar(depoisHash[0].h));
console.log('md5_cand       :', espacar(md5_cand));
for (const r of depoisCenso) console.log(`   ${r.policy}  cmd=${r.comando}  papeis=${r.papeis}`);
console.log('funcao         :', JSON.stringify(depoisFn[0] ?? null));
console.log('dados antes    :', JSON.stringify(antesDados[0]));
console.log('dados depois   :', JSON.stringify(depoisDados[0]));

const pos = [];
if (depoisHash[0].n !== 7) pos.push(`censo depois | dado=${depoisHash[0].n} | esperado=7`);
if (depoisHash[0].h !== md5_cand) pos.push(`deparse depois != md5_cand | dado=${espacar(depoisHash[0].h)} | esperado=${espacar(md5_cand)}`);
if (depoisFn.length !== 1) pos.push(`funcao no catalogo | dado=${depoisFn.length} | esperado=1`);
if (depoisFn[0] && depoisFn[0].publico_executa !== 0) pos.push(`EXECUTE para PUBLIC | dado=${depoisFn[0].publico_executa} | esperado=0`);
if (depoisFn[0] && /anon=/.test(depoisFn[0].acl_crua)) pos.push('anon com grant na funcao');
if (depoisFn[0] && depoisFn[0].dono !== 'postgres') pos.push(`dono da funcao | dado=${depoisFn[0].dono} | esperado=postgres`);
if (depoisFn[0] && depoisFn[0].definer !== true) pos.push('funcao nao e SECURITY DEFINER');
if (JSON.stringify(depoisDados[0]) !== JSON.stringify(antesDados[0])) pos.push('contagem de dados mudou: a DDL escreveu em tabela');

registro.pos_conferencia = pos;
registro.resultado = pos.length ? 'APLICADO_COM_DIVERGENCIA' : 'APLICADO_OK';
writeFileSync(EVIDENCIA, JSON.stringify(registro, null, 2) + '\n');
console.log('\nevidencia:', EVIDENCIA);
if (pos.length) { console.log('C2R_APLICA_DIVERGENTE:', JSON.stringify(pos)); process.exit(1); }
console.log('C2R_APLICA_OK: policies reescritas, oraculo no catalogo, nenhum dado tocado.');
