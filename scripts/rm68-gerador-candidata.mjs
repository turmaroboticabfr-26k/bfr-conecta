// FIN-3 (peça 2) — gerador da candidata RM-6.8 (PEN-25). NÃO executa nada contra o banco: lê o texto
// vivo de `evidence/rm68-recon-quals.json` (emitido por `scripts/rm68-recon-quals.mjs`, somente leitura),
// substitui as chamadas privilegiadas dentro das policies de papel PUBLIC, e emite
// `scripts/rm68-fail-closed-por-policy.sql`.
// A substituição do EXISTS do director é feita por contagem de parênteses, não por regex ganancioso: a
// primeira versão cortava no primeiro `))` e deixava `JOIN … WHERE …` órfão dentro do USING.
import { readFileSync, writeFileSync } from "node:fs";
import { criarGates } from "./c2-lib.mjs";

const g = criarGates();
const rec = JSON.parse(readFileSync("evidence/rm68-recon-quals.json", "utf8"));
const stamp = rec.em;

// Só as policies de papel PUBLIC (`polroles` vazio) podem ser avaliadas pelo anon: as de `authenticated`
// são filtradas pelo papel ANTES do qual, por isso nunca levantam 42501.
const publicas = rec.policies.filter((p) => p.roles === null);
const PRIV = /"current_role"\(\)|\bis_developer\(\)|staff_schools/;
const tocadas = publicas.filter((p) => PRIV.test(String(p.qual ?? "") + String(p.with_check ?? "")));
const intactas = publicas.filter((p) => !PRIV.test(String(p.qual ?? "") + String(p.with_check ?? "")));

const FN_ROLE = "public.bfr_rls_session_role()";
const FN_DEV = "public.bfr_rls_is_developer()";
const FN_DIR = "public.bfr_rls_director_manages_student";

// `EXISTS ( ... )` completo a partir de `from`, com parênteses contados. As quals do catálogo trazem
// apóstrofes mas nenhum parêntese dentro de literal, por isso a contagem simples é suficiente aqui.
const spanExists = (s, from) => {
  const i = s.indexOf("(", from);
  if (i < 0) return null;
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === "(") depth++;
    else if (s[k] === ")") { depth--; if (depth === 0) return { start: from, end: k + 1, text: s.slice(from, k + 1) }; }
  }
  return null;
};
const existsSpans = (s) => {
  const out = [];
  for (let i = s.indexOf("EXISTS ("); i >= 0; i = s.indexOf("EXISTS (", i + 1)) {
    const sp = spanExists(s, i);
    if (!sp) throw new Error(`EXISTS sem parêntese fechado em: ${s.slice(0, 60)}`);
    out.push(sp);
  }
  return out;
};
const saldo = (s) => [...s].reduce((d, c) => d + (c === "(" ? 1 : c === ")" ? -1 : 0), 0);

// O corpo da função do director é o EXISTS vivo, byte-a-byte, com `occurrences.student_id` trocado pelo
// parâmetro. Nada é reescrito à mão.
const dirPol = publicas.find((p) => p.policyname === "occurrences_director_select" && p.tablename === "occurrences");
const dirSpans = existsSpans(String(dirPol?.qual ?? ""));
if (dirSpans.length !== 1) throw new Error(`esperava 1 EXISTS na qual do director, medidos ${dirSpans.length}`);
if (!dirSpans[0].text.includes("staff_schools")) throw new Error("o EXISTS do director não contém staff_schools — artefacto inesperado");
const dirBody = dirSpans[0].text.replace(/occurrences\.student_id/g, "p_student_id");

const substitui = (expr, tabela) => {
  if (expr === null || expr === undefined) return expr;
  let s = expr.replace(/"current_role"\(\)/g, FN_ROLE).replace(/\bis_developer\(\)/g, FN_DEV);
  for (const sp of existsSpans(s).filter((x) => x.text.includes("staff_schools"))) {
    s = s.replace(sp.text, `${FN_DIR}(${tabela}.student_id)`);
  }
  return s;
};

const alter = publicas.map((p) => ({
  ...p,
  qualNovo: substitui(p.qual, p.tablename),
  withCheckNovo: substitui(p.with_check, p.tablename),
}));

g.gate("recon_polisticas_de_papel_public_contadas", publicas.length, 11);
g.gate("recon_todas_as_publicas_chamam_algo_privilegiado", intactas.length, 0);
g.gate("recon_exists_do_director_e_um_so", dirSpans.length, 1);
g.gate("corpo_do_director_tem_o_exists_vivo", dirSpans[0].text, String(dirPol.qual).trim().slice(1, -1));
g.gate("corpo_do_director_perde_a_coluna_da_tabela", dirBody.includes("occurrences.student_id"), false);
g.gate("corpo_do_director_ganha_o_parametro", dirBody.includes("p_student_id"), true);
g.gate("corpo_do_director_saldo_de_parenteses_zero", saldo(dirBody), 0);

for (const a of alter) {
  const texto = String(a.qualNovo ?? "") + String(a.withCheckNovo ?? "");
  g.gate(`substituicao_sem_chamada_privilegiada_em_${a.policyname}`, PRIV.test(texto), false);
  g.gate(`sem_residuo_de_exists_em_${a.policyname}`, /\bEXISTS\b|\bJOIN\b|\bWHERE\b/.test(texto), false);
  g.gate(`parenteses_equilibrados_em_${a.policyname}`, saldo(texto), 0);
  g.gate(`expressao_mudou_em_${a.policyname}`, texto !== String(a.qual ?? "") + String(a.with_check ?? ""), true);
}
g.gate("tabelas_alteradas_sao_as_quatro_da_pen25",
  [...new Set(alter.map((a) => a.tablename))].sort(), ["access_requests", "attendance", "grades", "occurrences"]);

// A prova mais forte disponível sem executar DDL nenhuma: cada expressão nova, com os wrappers
// re-trocados pelos textos originais, tem de voltar BYTE-A-BYTE ao texto do catálogo. Assim um
// `EXISTS` cortado a meio ou um conjuncto perdido não passam, por muito que o saldo de parênteses passe.
const devolve = (s) => s
  .split(FN_ROLE).join('"current_role"()')
  .split(FN_DEV).join("is_developer()")
  .split(`${FN_DIR}(occurrences.student_id)`).join(dirSpans[0].text);
for (const a of alter) {
  for (const [campo, antigo, novo] of [["qual", a.qual, a.qualNovo], ["with_check", a.with_check, a.withCheckNovo]]) {
    if (novo === null || novo === undefined) continue;
    g.gate(`substituicao_reversivel_byte_a_byte_${a.policyname}_${campo}`, devolve(String(novo)), String(antigo));
    g.gate(`saldo_zero_${a.policyname}_${campo}`, saldo(String(novo)), 0);
    const nPriv = (String(antigo).match(new RegExp(PRIV, "g")) || []).length;
    const nWrap = (String(novo).match(/bfr_rls_(session_role|is_developer|director_manages_student)/g) || []).length;
    g.gate(`mesmo_numero_de_chamadas_${a.policyname}_${campo}`, nWrap, nPriv);
  }
}

const stmt = (a, qual, wc) => {
  const lines = [`ALTER POLICY public."${a.policyname}" ON public.${a.tablename}`];
  if (qual !== null && qual !== undefined) lines.push(`  USING (${qual})`);
  if (wc !== null && wc !== undefined) lines.push(`  WITH CHECK (${wc})`);
  return lines.join("\n");
};

// `SET search_path = public, pg_temp` nas três funções novas: é o que permite emitir o corpo do director
// byte-a-byte do catálogo (`profiles`, `staff_schools`, `::account_role` sem qualificar) sem depender do
// search_path de quem aplica, e o `pg_temp` no fim é o que impede uma tabela temporária de trojan.
const PIN = " SET search_path = public, pg_temp";
const corpoFn = `-- 1) três funções próprias, SECURITY DEFINER, pinadas ao search_path e executáveis pelo anon
CREATE OR REPLACE FUNCTION public.bfr_rls_session_role()
 RETURNS public.account_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
${PIN}
AS $fn$
  -- Responde o mesmo que public."current_role"() (que já é SECURITY DEFINER e faz exactamente isto):
  -- para o anon, auth.uid() é NULL → 0 linhas → NULL, e a qualificação fica falsa por lógica própria
  -- em vez de por 42501.
  select role from public.profiles where id = auth.uid()
$fn$;

CREATE OR REPLACE FUNCTION public.bfr_rls_is_developer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
${PIN}
AS $fn$
  -- Delega na função viva: a resposta é a mesma; o que muda é que quem chama o wrapper não precisa de
  -- privilégio nenhum sobre a função interior.
  select coalesce(public.is_developer(), false)
$fn$;

CREATE OR REPLACE FUNCTION public.bfr_rls_director_manages_student(p_student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
${PIN}
AS $fn$
  -- Corpo = o EXISTS vivo de occurrences_director_select (lido do catálogo), só com
  -- occurrences.student_id trocado pelo parâmetro. O SELECT em staff_schools passa a ser feito pelo
  -- dono da função, por isso a policy deixa de precisar de privilégio sobre ela.
  select ${dirBody}
$fn$;

REVOKE ALL ON FUNCTION public.bfr_rls_session_role(), public.bfr_rls_is_developer(),
                     public.bfr_rls_director_manages_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_rls_session_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bfr_rls_is_developer() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bfr_rls_director_manages_student(uuid) TO anon, authenticated, service_role;`;

const alterStmts = alter.map((a) => stmt(a, a.qualNovo, a.withCheckNovo)).join("\n\n");

const vereditos = `-- 3) vereditos do dry-run — o que está à direita do comentário é o que tem de aparecer
select count(*)::int as polisticas_public_sem_chamada_privilegiada      -- esperado: ${alter.length}
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('grades','attendance','access_requests','occurrences')
   and cardinality(p.polroles) = 0
   and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%current_role%'
   and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%is_developer%'
   and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%staff_schools%'
   and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%current_role%'
   and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%is_developer%'
   and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%staff_schools%';

select has_function_privilege('anon', 'public.bfr_rls_session_role()'::regprocedure, 'EXECUTE')                as anon_chama_role_wrapper,  -- true
       has_function_privilege('anon', 'public.bfr_rls_is_developer()'::regprocedure, 'EXECUTE')                as anon_chama_dev_wrapper,     -- true
       has_function_privilege('anon', 'public.bfr_rls_director_manages_student(uuid)'::regprocedure, 'EXECUTE') as anon_chama_dir_wrapper,   -- true
       has_function_privilege('anon', 'public."current_role"()'::regprocedure, 'EXECUTE')                     as anon_no_legado,             -- false: fica como estava
       has_table_privilege('anon', 'public.staff_schools', 'SELECT')                                          as anon_le_staff_schools;      -- false: nada se abre

select public.bfr_rls_session_role() as papel_da_sessao,   -- NULL nesta ligação (não é JWT de app)
       public.bfr_rls_is_developer() as dev,               -- false
       public.bfr_rls_director_manages_student(null) as dir; -- false, nunca erro

-- 4) o que o dry-run NÃO prova: que a resposta por papel é a mesma de antes para cada papel autenticado.
--    Isso é comportamental e só se mede com JWTs reais — ver a secção APLICAÇÃO.
--    A igualdade esperada é: director continua a ver só ocorrências dos alunos da(s) sua(s) escola(s),
--    porque o corpo mantém \`p.id = auth.uid()\` e \`ss.profile_id = p.id\`; o que muda é quem tem de ter
--    privilégio para avaliar a expressão, não a expressão.`;

const sqlOut = `-- RM-6.8 / PEN-25 — fail-closed por POLICY, não por PRIVILÉGIO.
-- >>>>>> NÃO APLICADA. Nenhum DDL foi executado. A aplicação pede OK novo e explícito. <<<<<<
--
-- Fonte: evidence/rm68-recon-quals.json (medição ${stamp}, emitida por scripts/rm68-recon-quals.mjs,
-- que é somente leitura). As ${alter.length} policies abaixo são as de papel PUBLIC das 4 tabelas da
-- PEN-25 — são as únicas que um pedido anon chega a avaliar.
--
-- O que está errado hoje (medido 12/11, §12.2 da documentação): a qualificação chama directamente
--   public."current_role"()             → anon não tem EXECUTE                        → 42501
--   public.is_developer()              → idem                                        → 42501
--   EXISTS (… JOIN staff_schools …)    → anon não tem SELECT em staff_schools        → 42501
-- O resultado para o anon já é «nenhuma linha», mas pela porta do privilégio: um GRANT SELECT futuro
-- abriria a tabela sem tocar em policy nenhuma. Esta candidata move a decisão para dentro de funções
-- próprias — o anon passa a poder avaliá-las, e é a lógica delas (auth.uid() NULL → sem papel → false)
-- que fecha a porta.
--
-- O que este ficheiro NÃO altera: nenhuma expressão sobre dados. bfr_staff_can_manage_student_scope(),
-- auth.uid(), os filtros de família (guardian_students) e os predicados de entered_by continuam com o
-- mesmo texto; muda só quem responde «que papel é esta sessão» e onde vive o filtro do director.
-- Nenhum GRANT sobre tabela é emitido aqui.
--
-- Como o texto foi produzido: cada USING/WITH CHECK novo é o texto do catálogo com substituição
-- programática — o EXISTS do director é recortado por contagem de parênteses e copiado byte-a-byte,
-- com occurrences.student_id trocado pelo parâmetro. Nada foi dactilografado a partir da memória.

-- ═══════════════════════════════ DRY-RUN (BEGIN … ROLLBACK) ═══════════════════════════════
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

${corpoFn}

-- 2) as ${alter.length} policies de papel PUBLIC: mesma forma, decisão movida para as funções
${alterStmts}

${vereditos}

ROLLBACK;  -- o dry-run não deixa nada no banco

-- ═══════════════════════════════ REVERSÃO (texto original do banco) ═══════════════════════════════
-- Cada USING/WITH CHECK abaixo é copiado do artefacto, não reescrito: é o byte-a-byte do que está vivo
-- em ${stamp}. Depois das ${alter.length} re-atribuições:
${alter.map((a) => stmt(a, a.qual, a.with_check)).join("\n\n")}

DROP FUNCTION IF EXISTS public.bfr_rls_session_role();
DROP FUNCTION IF EXISTS public.bfr_rls_is_developer();
DROP FUNCTION IF EXISTS public.bfr_rls_director_manages_student(uuid);

-- ═══════════════════════════════ APLICAÇÃO (só com OK novo) ═══════════════════════════════
-- Mesmo corpo do DRY-RUN sem BEGIN/ROLLBACK, numa sessão cujo search_path inclui public (é o default do
-- canal de DDL; foi assim que o texto vivo foi capturado). Não executar a partir deste ficheiro.
-- Ordem e portões depois de aplicar:
--   1) node scripts/rm68-recon-quals.mjs          → as 23 policies voltam, e as ${alter.length} PUBLIC
--      já não chamam nada privilegiado;
--   2) node scripts/rm14-suite.mjs                → os 30 verdes intactos E o AVISO RM14-A2 VAZIO
--      (0 recusas por 42501); nenhum portão pode ser enfraquecido para obter o verde;
--   3) node scripts/s20-behavioral.mjs            → a equivalência por papel (director/secretaria/
--      coordenação) medida com JWTs reais, porque a substituição é de privilégio, não de lógica, e só
--      o comportamento com sessão autenticada prova que nenhum vista ganhou linhas.
`;

writeFileSync("scripts/rm68-fail-closed-por-policy.sql", sqlOut);

// Os portões do ficheiro olham só para as statements em diante (a REVERSÃO contém de propósito o texto
// privilegiado vivo), e ignoram linhas de comentário — senão a própria prosa que explica o PEN-25
// («um GRANT SELECT futuro») conta como instrução.
const linhasDeCodigo = (s) => s.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
g.gate("policies_novas_sem_chamada_privilegiada", PRIV.test(linhasDeCodigo(alterStmts)), false);
g.gate("nenhum_grant_sobre_tabela_no_ficheiro",
  /GRANT\s+(SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER)\b/i.test(linhasDeCodigo(sqlOut)), false);
g.gate("grant_apenas_execute",
  [...linhasDeCodigo(sqlOut).matchAll(/^\s*GRANT\s+(\w+)/gmi)].map((m) => m[1].toUpperCase()), ["EXECUTE", "EXECUTE", "EXECUTE"]);
g.gate("as_tres_funcoes_pinnam_o_search_path",
  [...corpoFn.matchAll(/SET search_path = public, pg_temp/g)].length, 3);
g.gate("ficheiro_declara_nao_aplicada", sqlOut.includes("NÃO APLICADA"), true);
g.gate("ficheiro_tem_dry_run_com_rollback",
  [/\nBEGIN;/.test(sqlOut), /\nROLLBACK;/.test(sqlOut), sqlOut.indexOf("BEGIN;") < sqlOut.indexOf("ROLLBACK;")].every(Boolean), true);
g.gate("reversao_tem_o_texto_vivo_de_cada_policy", alter.every((a) => sqlOut.includes(String(a.qual ?? a.with_check))), true);
g.gate("as_tres_funcoes_foram_emitidas", ["bfr_rls_session_role", "bfr_rls_is_developer", "bfr_rls_director_manages_student"]
  .every((n) => sqlOut.includes(`FUNCTION public.${n}`)), true);

const { portoes, falhas } = g.resumo();
writeFileSync("evidence/rm68-candidata-portoes.json", JSON.stringify({
  em: new Date().toISOString(),
  origem: "evidence/rm68-recon-quals.json",
  medicao_origem_em: stamp,
  ficheiro: "scripts/rm68-fail-closed-por-policy.sql",
  bytes: Buffer.byteLength(sqlOut),
  aplicada: false,
  policies_public: publicas.map((p) => `${p.tablename}/${p.cmd}/${p.policyname}`),
  tocadas: tocadas.map((p) => `${p.tablename}/${p.cmd}`),
  exists_director: dirSpans[0].text,
  corpo_funcao_director: dirBody,
  portoes: g.resumo(),
}, null, 2) + "\n");

for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`emitido scripts/rm68-fail-closed-por-policy.sql (${Buffer.byteLength(sqlOut)} B) · ${alter.length} policies · 3 funções · reversão byte-a-byte do texto vivo`);
console.log(`policies: ${alter.map((a) => `${a.tablename}:${a.cmd}`).sort().join(" · ")}`);
if (falhas.length === 0) { console.log(`RM68_CANDIDATA_VERDE ${portoes} portões / 0 falhas · NÃO APLICADA (nenhum DDL executado)`); process.exit(0); }
console.log(`RM68_CANDIDATA_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
