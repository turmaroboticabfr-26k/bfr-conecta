// FIN-3 (peça 1) — RM-6.8 SOMENTE LEITURA: deita para disco o texto VIVO das policies das 4 tabelas da
// PEN-25 e das funções que elas chamam. A candidata SQL é derivada daqui; nada neste ficheiro escreve.
// Artefacto: evidence/rm68-recon-quals.json
import { writeFileSync } from "node:fs";
import { sql, criarGates } from "./c2-lib.mjs";

const g = criarGates();
const alvos = ["grades", "attendance", "access_requests", "occurrences"];

const pegada = async () => (await sql(`
  select count(*)::int as total,
         md5(string_agg(n.nspname || '.' || c.relname || c.relkind::text, ',' order by n.nspname, c.relname)) as hash
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','v','m','p')`))[0];
const antes = await pegada();

const out = {
  em: new Date().toISOString(),
  tarefa: "FIN-3 — recon somente-leitura das quals da PEN-25 para a candidata RM-6.8",
  metodos: "SELECT de pg_policies / pg_get_expr / pg_proc; nenhuma escrita",
  pegada_antes: antes,
};

// pg_policy direto: `polqual` precisa do `polrelid` correcto para o des-parser, e o `pg_policies`
// só dá o nome da tabela (o cast para regclass dependia do search_path).
out.policies = await sql(`
  select n.nspname as schemaname, c.relname as tablename, p.polname as policyname,
         p.polpermissive as permissive,
         case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE'
                       when 'd' then 'DELETE' when '*' then 'ALL' end as cmd,
         pg_get_expr(p.polqual, p.polrelid) as qual,
         pg_get_expr(p.polwithcheck, p.polrelid) as with_check,
         (select string_agg(rolname, ',' order by rolname) from pg_roles where oid = any(p.polroles)) as roles
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any(array[${alvos.map((t) => `'${t}'`).join(",")}])
   order by c.relname, p.polname`);

// As funções citadas pelas quals, com corpo e ACL real (has_function_privilege, não proacl como texto).
out.funcoes = await sql(`
  select p.proname as nome, pg_get_userbyid(p.proowner) as dono,
         p.prosecdef as security_definer,
         pg_get_function_arguments(p.oid) as argumentos,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
         pg_get_functiondef(p.oid) as corpo
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('current_role', 'is_developer', 'is_staff', 'bfr_staff_can_manage_student_scope')
   order by p.proname`);

// O privilégio que a qual exige e que o anon não tem: é isto que produz o 42501 da PEN-25.
out.select_em_staff_schools = await sql(`
  select has_table_privilege('anon', 'public.staff_schools', 'SELECT') as anon_select,
         has_table_privilege('authenticated', 'public.staff_schools', 'SELECT') as auth_select`);

const porTabela = Object.fromEntries(alvos.map((t) =>
  [t, out.policies.filter((p) => p.tablename === t).map((p) => `${p.cmd}:${p.policyname}`)]));
out.resumo = porTabela;

// Portões: as 4 tabelas têm de aparecer com policy viva — sem isto a candidata não teria o que derivar.
for (const t of alvos) g.gate(`recon_polisticas_vivas_em_${t}`, out.policies.filter((p) => p.tablename === t).length > 0, true);
g.gate("recon_current_role_existe_sem_execute_para_anon",
  out.funcoes.filter((f) => f.nome === "current_role" && f.anon_execute === false).length, 1);
g.gate("recon_is_developer_listada", out.funcoes.some((f) => f.nome === "is_developer"), true);

const depois = await pegada();
g.gate("nao_escrita_pegada_de_catalogo_igual", depois, antes);
out.pegada_depois = depois;
out.portoes = g.resumo();
writeFileSync("evidence/rm68-recon-quals.json", JSON.stringify(out, null, 2) + "\n");

const { portoes, falhas } = g.resumo();
for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`policies vivas: ${out.policies.length} nas 4 tabelas (${alvos.map((t) => `${t}=${porTabela[t].length}`).join(" ")})`);
for (const p of out.policies) console.log(`  ${p.tablename} | ${p.cmd} | ${p.policyname} | roles=${p.roles}\n     qual: ${p.qual ?? "-"}`);
console.log(`funcoes: ${out.funcoes.map((f) => `${f.nome}(anon_exec=${f.anon_execute} definer=${f.security_definer})`).join(" ")}`);
console.log(`staff_schools SELECT: anon=${out.select_em_staff_schools[0].anon_select} auth=${out.select_em_staff_schools[0].auth_select}`);
console.log(`pegada catálogo antes=${antes.total}/${antes.hash.slice(0, 12)} depois=${depois.total}/${depois.hash.slice(0, 12)}`);
if (falhas.length === 0) { console.log(`RM68_RECON_VERDE ${portoes} portões / 0 falhas · artefacto evidence/rm68-recon-quals.json`); process.exit(0); }
console.log(`RM68_RECON_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
