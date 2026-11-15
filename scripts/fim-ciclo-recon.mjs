// FIM-1 — recon SOMENTE LEITURA das duas pendências que este ciclo não fecha:
//   (a) as 11 policies de papel PUBLIC do RM-6.8, conferidas contra o texto gravado em
//       evidence/rm68-recon-depois... (o artefacto de 15/11 03:11:34Z), para provar que nada
//       derivou desde a aplicação;
//   (b) o estado do aparelho assinante (public.push_subscriptions), pré-condição do RM-1.3;
//   e as pré-condições de fixture do ciclo que ainda não tem OK.
// 0 escrita, 0 DDL, 0 mint, 0 deploy, 0 envio de push.
// Artefacto: evidence/fim-ciclo-recon-15-11.json  (não sobreponho: existe => exit 1)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SAIDA = process.argv[2] || `${DIR}/evidence/fim-ciclo-recon-15-11b.json`;
const ANTES_ARTEFACTO = `${DIR}/evidence/rm68-recon-depois-15-11.json`;

if (existsSync(SAIDA)) {
  console.log(`VERMELHO  já existe ${SAIDA} — artefactos não se sobrepõem; rebatize (b/c).`);
  process.exit(1);
}

const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

// A API de gestão devolve HTTP 500 {"message":"Failed to check user auth status"} de forma
// intermitente (medido 15/11 nas 06:3xZ); as consultas aqui são leituras idempotentes,
// por isso o retry só casa nessa mensagem e não sobre um erro SQL real.
const sql = async (query, tentativas = 6) => {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 300)}`;
    if (!/Failed to check user auth status/.test(t)) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error(`sql esgotou as tentativas — ${ultimo}`);
};

const md5 = (s) => createHash('md5').update(s).digest('hex');

// ---------- (a) as 11 PUBLIC do RM-6.8, texto por texto ----------
const ALVO = ['grades', 'attendance', 'access_requests', 'occurrences'];

const lidos = JSON.parse(readFileSync(ANTES_ARTEFACTO, 'utf8'));
const publicasAntes = (lidos.policies || [])
  .filter((p) => ALVO.includes(p.tablename) && (!p.roles || p.roles.length === 0))
  .map((p) => `${p.tablename}|${p.policyname}|${p.cmd}|${p.qual ?? ''}|${p.with_check ?? ''}`)
  .sort();

// Mesmo des-parser do rm68-recon-quals.mjs (pg_policy directo, `polrelid` para o pg_get_expr,
// `*` → 'ALL') — qualquer diferença de forma apareceria como derivação falsa, por isso o texto
// tem de vir produzido pela mesma consulta.
// PAPEL PÚBLICO, medido em scripts/fim-sonda-polroles.mjs e re-medido com evidência persistida
// em scripts/fim-sonda-polroles-b.mjs → evidence/fim-sonda-polroles-15-11.json: neste build
// `polroles` das policies de papel PUBLIC é o array de UM elemento `{0}` (o pseudo-role OID), não
// o array vazio — as 23 linhas das 4 tabelas repartem-se por `{16485}` (authenticated) ×12 e `{0}`
// ×11. Por isso o predicate é `0 = any(p.polroles)`: `cardinality(polroles)=0` não casa nada e foi
// o que deu «vivo=0 contra 11 do artefacto» na passada `-15-11`.
const publicasVivo = await sql(`
  select c.relname as tablename, p.polname as policyname,
         case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE'
                       when 'd' then 'DELETE' when '*' then 'ALL' end as cmd,
         pg_get_expr(p.polqual, p.polrelid) as qual,
         pg_get_expr(p.polwithcheck, p.polrelid) as with_check,
         p.polroles::text as roles_text
    from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array['grades','attendance','access_requests','occurrences'])
     and 0 = any(p.polroles)
   order by c.relname, p.polname;`);

const publicasVivoLinhas = publicasVivo.map((r) =>
  `${r.tablename}|${r.policyname}|${r.cmd}|${r.qual ?? ''}|${r.with_check ?? ''}`).sort();

const derivacao = {
  artefacto_antes: ANTES_ARTEFACTO.replace(`${DIR}/`, ''),
  em_do_artefacto: lidos.em,
  publicas_no_artefacto: publicasAntes.length,
  publicas_vivas: publicasVivoLinhas.length,
  texto_md5_artefacto: md5(publicasAntes.join('\n')),
  texto_md5_vivo: md5(publicasVivoLinhas.join('\n')),
  igual: publicasAntes.length === publicasVivoLinhas.length
    && md5(publicasAntes.join('\n')) === md5(publicasVivoLinhas.join('\n')),
  diferencas: publicasVivoLinhas.filter((l) => !publicasAntes.includes(l))
    .concat(publicasAntes.filter((l) => !publicasVivoLinhas.includes(l))),
};

// ---------- (b) pré-condição do RM-1.3: o aparelho assinante ----------
// A coluna do dono da subscrição não se dactilografa: lê-se o information_schema e escolhe-se
// a que existe (42703 já me derrubou uma passada por assumir `user_id`).
const colSubs = await sql(`
  select column_name as c from information_schema.columns
   where table_schema = 'public' and table_name = 'push_subscriptions' order by 1;`);
const nomesSubs = colSubs.map((r) => r.c);
const colDono = ['profile_id', 'user_id', 'uid', 'id'].filter((c) => nomesSubs.includes(c))[0] || null;
const subs = await sql(`
  select count(*)::int as subs_totais,
         ${colDono ? `count(distinct ${colDono})::int` : '0::int'} as donos_distintos,
         coalesce(max(created_at)::text,'-') as criada_mais_recente,
         coalesce(max(last_seen_at)::text,'-') as vista_mais_recente
    from public.push_subscriptions;`);
const contagens = await sql(`select relname as t, reltuples::bigint::text as Estimativa from pg_class where relname in ('attendance','grades','access_requests','occurrences','push_subscriptions') order by relname;`);
const exatas = {};
for (const t of ALVO) {
  const [r] = await sql(`select count(*)::int as n from public.${t};`);
  exatas[t] = r.n;
}
const perfisPapel = await sql(`
  select role::text as papel, count(*)::int as n from public.profiles
   where email like '%@test.local' group by role order by papel;`);

// ---------- (c) views sports_public_*: a outra superfície sem prova autenticada ----------
const vistas = await sql(`
  select c.relname as nome, pg_get_userbyid(c.relowner) as dono, r.rolbypassrls::text as dono_bypass,
         coalesce(has_table_privilege('anon', c.oid, 'SELECT')::text,'?') as anon_select,
         coalesce(has_table_privilege('authenticated', c.oid, 'SELECT')::text,'?') as auth_select,
         case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
              when c.reloptions::text like '%security_invoker=false%' then 'definer'
              else 'sem-opcao' end as modo
    from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_roles r on r.oid = c.relowner
   where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'sports\\_public%'
   order by c.relname;`);

// ---------- (d) derivação de privilégio: o que o RM-6.8 abriu × o que ficou fechado ----------
// O lado "fechado" é derivado do próprio artefacto de 15/11 (toda a função que lá tem
// anon_execute=false tem de o continuar a ter); o lado "aberto" são as 3 wrappers do RM-6.8,
// que a aplicação dotou de EXECUTE para anon/authenticated. Nada de listas dactilografadas.
const WRAPPERS = ['bfr_rls_session_role', 'bfr_rls_is_developer', 'bfr_rls_director_manages_student'];

const privilegios = await sql(`
  select p.proname as nome, pg_get_userbyid(p.proowner) as dono,
         coalesce(p.prosecdef::text,'?') as security_definer,
         coalesce(has_function_privilege('anon', p.oid, 'EXECUTE')::text,'?') as anon_execute,
         coalesce(has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,'?') as auth_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = any(array[${WRAPPERS.map((w) => `'${w}'`).join(',')},
           ${(lidos.funcoes || []).map((f) => `'${f.nome}'`).join(',')}])
   order by p.proname;`);
const [staffAnon] = await sql(`
  select coalesce(has_table_privilege('anon','public.staff_schools','SELECT')::text,'?') as anon_select;`);
const [auditResiduo] = await sql(`select count(*)::int as n from public.supervision_audit;`);
// Quem são os donos das linhas de auditoria que sobraram. O e-mail só se escreve quando é de
// teste (@test.local): as de conta real ficam rotuladas CONTA_REAL — não se põe PII em evidência.
const auditDonos = await sql(`
  select case when u.email like '%@test.local' then split_part(u.email,'@',1)
              when u.id is null then 'perfil_sem_auth.users'
              else 'CONTA_REAL' end as conta,
         coalesce(p.role::text,'-') as papel, count(*)::int as n
    from public.supervision_audit a
    left join public.profiles p on p.id = a.profile_id
    left join auth.users u on u.id = a.profile_id
   group by 1, 2 order by n desc, conta;`);
const contasVivas = await sql(`
  select case when u.email like 's20-%' then 's20'
              when u.email like 's17-%' then 's17'
              else 'outro_test_local' end as lote,
         count(*)::int as n
    from auth.users u where u.email like '%@test.local' group by 1 order by 1;`);

const falhasPrivilegio = [];
for (const f of lidos.funcoes || []) {
  if (f.anon_execute !== false) continue;
  const vivo_ = privilegios.find((x) => x.nome === f.nome);
  if (!vivo_) { falhasPrivilegio.push(`${f.nome} desapareceu do catálogo`); continue; }
  if (vivo_.anon_execute !== 'false') falhasPrivilegio.push(`${vivo_.nome} voltou a ter EXECUTE de anon`);
}
for (const w of WRAPPERS) {
  const vivo_ = privilegios.find((x) => x.nome === w);
  if (!vivo_) { falhasPrivilegio.push(`wrapper ${w} não encontrada`); continue; }
  if (vivo_.anon_execute !== 'true' || vivo_.auth_execute !== 'true')
    falhasPrivilegio.push(`wrapper ${w} sem EXECUTE para anon/authenticated (anon=${vivo_.anon_execute} auth=${vivo_.auth_execute})`);
  if (vivo_.security_definer !== 'true') falhasPrivilegio.push(`wrapper ${w} deixou de ser SECURITY DEFINER`);
}
if ((lidos.select_em_staff_schools?.[0]?.anon_select === false) && staffAnon.anon_select !== 'false')
  falhasPrivilegio.push('staff_schools voltou a ter SELECT de anon');

const out = {
  em: new Date().toISOString(),
  tarefa: 'FIM-1 — recon somente-leitura das duas pendências abertas (11 PUBLIC do RM-6.8 + push em aparelho físico)',
  autorizacao: 'nenhuma escrita: 0 DDL, 0 mint, 0 deploy, 0 envio, 0 git push',
  rm68_publicas: derivacao,
  rm68_privilegios: {
    funcoes: privilegios,
    staff_schools_anon_select: staffAnon.anon_select,
    falhas: falhasPrivilegio,
  },
  contagens_exatas: exatas,
  rm13_aparelho: { ...subs[0], coluna_dono: colDono, colunas: nomesSubs },
  contas_test_local_vivas: contasVivas,
  supervision_audit_residuo: auditResiduo.n,
  supervision_audit_por_conta: auditDonos,
  perfis_test_local_por_papel: perfisPapel,
  vistas_sports_public: vistas,
  contagens_pg_class: contagens,
};

writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');

console.log(`RM68_PUBLICAS  artefacto=${derivacao.publicas_no_artefacto} vivo=${derivacao.publicas_vivas}  igual=${derivacao.igual ? 'SIM' : 'NAO'}`);
console.log(`  md5 texto: antes=${derivacao.texto_md5_artefacto}  vivo=${derivacao.texto_md5_vivo}`);
for (const d of derivacao.diferencas.slice(0, 10)) console.log(`  DIFF ${d.slice(0, 160)}`);
console.log(`RM13_PUSH      subs=${subs[0].subs_totais} donos=${subs[0].donos_distintos} (coluna=${colDono}) vista_mais_recente=${subs[0].vista_mais_recente}`);
console.log(`CONTAGENS      ${ALVO.map((t) => `${t}=${exatas[t]}`).join(' ')}`);
console.log(`VISTAS         ${vistas.length} sports_public_*  anon_select_true=${vistas.filter((v) => v.anon_select === 'true').length}  dono_bypass_true=${vistas.filter((v) => v.dono_bypass === 'true').length}`);
console.log(`CONTAS_TEST    ${perfisPapel.map((p) => `${p.papel}=${p.n}`).join(' ') || 'nenhuma'}`);
console.log(`PRIVILEGIOS    funções=${privilegios.length} staff_schools_anon_select=${staffAnon.anon_select} falhas=${falhasPrivilegio.length}`);
for (const f of falhasPrivilegio) console.log(`  PRIFALHA ${f}`);
console.log(`CONTAS_VIVAS   ${contasVivas.map((c) => `${c.lote}=${c.n}`).join(' ') || 'nenhuma'}  supervision_audit=${auditResiduo.n}`);
for (const a of auditDonos) console.log(`  AUDIT ${String(a.n).padStart(2)}  ${a.conta}  papel=${a.papel}`);
const verde = derivacao.igual && falhasPrivilegio.length === 0;
console.log(verde ? 'FIM_RECON_VERDE' : 'FIM_RECON_AMARELO — divergência face ao artefacto de 15/11');
console.log(`Escrito ${SAIDA}`);
process.exit(verde ? 0 : 1);
