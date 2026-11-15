// Sonda somente-leitura que fixa em disco a forma como ESTE build representa a política de
// papel PUBLIC na coluna `pg_policy.polroles`.
//
// Motivo: a passada `evidence/fim-ciclo-recon-15-11.json` saiu AMARELA (vivo=0 contra 11 do
// artefacto) porque o predicado herdado do des-parser antigo era `cardinality(polroles) = 0`.
// Se isso fosse verdade, `cardinality(NULL)` nem sequer compara — a pergunta honesta era
// «o que é que a coluna realmente contém?», e a resposta não estava em lado nenhum do ciclo.
//
// Nada aqui escreve: SELECT de catálogo. A segunda consulta é a mesma decomposição de
// `supervision_audit` do recon principal, rotulada para não levar identificador de conta real
// para dentro do artefacto.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SAIDA = process.argv[2] || `${DIR}/evidence/fim-sonda-polroles-15-11.json`;
const REF = 'yyzqoxlkcvqpessypfjo';
const tok = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const ALVO = ['grades', 'attendance', 'access_requests', 'occurrences'];

if (existsSync(SAIDA)) {
  console.error(`JÁ EXISTE — não sobescrevo evidência: ${SAIDA}`);
  process.exit(1);
}

const sql = async (query) => {
  for (let tentativa = 1; tentativa <= 6; tentativa++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (!r.ok) {
      // Só o HTTP 500 da própria API de gestão (regime intermitente já documentado) repete;
      // erro de SQL continua a lançar.
      if (r.status === 500 && t.includes('Failed to check user auth status') && tentativa < 6) {
        await new Promise((s) => setTimeout(s, 3000));
        continue;
      }
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
    }
    return JSON.parse(t);
  }
  throw new Error('unreachable');
};

const md5 = (s) => createHash('md5').update(s).digest('hex');

// (1) A forma crua da coluna, contada por estado.
const brutas = await sql(`
  select c.relname as tablename, p.polname as policyname,
         p.polroles is null                              as roles_e_null,
         coalesce(cardinality(p.polroles), -1)::int       as n_roles,
         p.polroles::text                                 as roles_text,
         0 = any(p.polroles)                              as contem_oid_0,
         exists (select 1 from pg_roles r
                  where r.oid = any(p.polroles))          as algum_oid_e_papel_real
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array['${ALVO.join("','")}'])
   order by c.relname, p.polname`);

const porEstado = {};
for (const x of brutas) {
  const k = `null=${x.roles_e_null} n=${x.n_roles} oid_0=${x.contem_oid_0} texto=${x.roles_text}`;
  porEstado[k] = (porEstado[k] || 0) + 1;
}

const peloVazio = brutas.filter((x) => x.n_roles === 0).length;
const peloNull = brutas.filter((x) => x.roles_e_null).length;
const peloOid0 = brutas.filter((x) => x.contem_oid_0).length;

// (2) A que papel pertence cada OID observado na coluna.
const nomes = await sql(`
  select r.oid::int as oid, coalesce(r.rolname, '(sem pg_roles)') as rolname,
         count(*)::int as policies
    from pg_policy p
    cross join lateral unnest(p.polroles) as q(oid)
    left join pg_roles r on r.oid = q.oid
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array['${ALVO.join("','")}'])
   group by 1, 2 order by policies desc`);

// (3) Os dois predicados, lado a lado, sobre o mesmo conjunto de 4 tabelas.
const velho = await sql(`
  select count(*)::int as n
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array['${ALVO.join("','")}'])
     and cardinality(p.polroles) = 0`);
const novo = await sql(`
  select count(*)::int as n
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array['${ALVO.join("','")}'])
     and 0 = any(p.polroles)`);

// (4) Resíduo de auditoria, sem identificador de conta real.
const audit = await sql(`
  select case when u.email like '%@test.local' then split_part(u.email,'@',1)
              when u.id is null then 'perfil_sem_auth.users'
              else 'CONTA_REAL' end as conta,
         coalesce(p.role::text,'-') as papel, count(*)::int as n
    from public.supervision_audit a
    left join public.profiles p on p.id = a.profile_id
    left join auth.users u on u.id = a.profile_id
   group by 1, 2 order by n desc, conta`);

const out = {
  em: new Date().toISOString(),
  tarefa: 'FIM-1/§AC — forma de polroles para papel PUBLIC neste build (armadilha de predicado)',
  autorizacao: 'somente leitura: 0 DDL, 0 mint, 0 deploy, 0 escrita',
  tabelas: ALVO,
  policies_no_conjunto: brutas.length,
  PUBLIC_por_cardinality_0: peloVazio,
  PUBLIC_por_polroles_null: peloNull,
  PUBLIC_por_oid_0_qualquer: peloOid0,
  estados_distintos: Object.entries(porEstado)
    .map(([k, n]) => ({ estado: k, n }))
    .sort((a, b) => b.n - a.n),
  oids_nos_polroles: nomes,
  contagem_pelo_predicado_velho_cardinality_0: velho[0].n,
  contagem_pelo_predicado_novo_oid_0: novo[0].n,
  supervision_audit_por_conta: audit,
  soma_audit: audit.reduce((s, a) => s + a.n, 0),
  policies_md5: md5(brutas.map((x) => `${x.tablename}|${x.policyname}|${x.roles_text}`).join('\n')),
};

writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`HTTP OK  policies=${out.policies_no_conjunto}`);
for (const e of out.estados_distintos) console.log(`  ${String(e.n).padStart(3)}  ${e.estado}`);
console.log(
  `PUBLIC por cardinality=0 -> ${out.PUBLIC_por_cardinality_0} | por NULL -> ${out.PUBLIC_por_polroles_null} | por 0 = any(polroles) -> ${out.PUBLIC_por_oid_0_qualquer}`,
);
console.log(`predicado velho count=${out.contagem_pelo_predicado_velho_cardinality_0}  predicado novo count=${out.contagem_pelo_predicado_novo_oid_0}`);
console.log('oids: ' + out.oids_nos_polroles.map((x) => `${x.oid}(${x.rolname})×${x.policies}`).join(' '));
console.log(`AUDIT soma=${out.soma_audit}  ` + audit.map((a) => `${a.conta}/${a.papel}:${a.n}`).join('  '));
console.log(`Escrito ${SAIDA}`);
