// RM-6.8 / #1189 — PREFLIGHT (somente leitura no banco).
// Faz três coisas: (1) confirma que a candidata em disco é a régua de 12/11; (2) mede o que está vivo e
// tem de estar vivo antes de aplicar (11 policies PUBLIC com chamada privilegiada, wrappers ausentes,
// anon sem privilégio nenhum); (3) DERIVA o fluxo executável, porque a candidata não é executável como
// está — e são DOIS defeitos, não um: 22 `ALTER POLICY` sem `;` (colapsam num único statement) e 11 nomes
// de policy qualificados com `public.`, que a gramática `ALTER POLICY nome ON tabela` recusa em 42601.
// O 42601 foi medido no ensaio de 15/11, não deduzido; os artefactos da primeira passada ficaram em disco
// como evidência do defeito e esta passada escreve `-15-11b` (nunca sobreponho artefactos).
// A derivación acrescenta o terminator e des-qualifica o nome, nada mais: cada statement é conferido
// byte a byte contra a candidata POR REININSERÇÃO — `requalificar` lê o ficheiro derivado e exige igualdade.
// Artefactos: evidence/rm68-preflight-15-11b.json, scripts/rm68-aplicacao-15-11b.sql, scripts/rm68-reversao-15-11b.sql
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql, criarGates } from "./c2-lib.mjs";
import { ler, md5, seccoes, statements, varrer, lerAlterPolicy, chamadaEm, formas, normaliza, sondaSql, WRAPPERS, eAlterPolicy, desqualificar, requalificar, NOME_QUALIFICADO } from "./rm68-lib.mjs";

const CANDIDATA = "scripts/rm68-fail-closed-por-policy.sql";
const REGUA_MD5 = "85ccd0927153fbcca4389e9218f1111f";
const REGUA_BYTES = 14568;
const PEGADA_ESPERADA = { total: 182, hash: "ecf3403210b8091209cb8584a4f1da51" };
const ARTEFACTO = "evidence/rm68-preflight-15-11b.json";
const F_APLICACAO = "scripts/rm68-aplicacao-15-11b.sql";
const F_REVERSAO = "scripts/rm68-reversao-15-11b.sql";

const g = criarGates();
const out = {
  em: new Date().toISOString(),
  tarefa: "RM-6.8 / #1189 — preflight somente-leitura + derivação do fluxo executável",
  metodos: "parse local da candidata; SELECT de pg_policy/pg_proc/pg_class/has_*_privilege; nenhuma escrita",
  escrita_no_banco: false,
};

for (const f of [ARTEFACTO, F_APLICACAO, F_REVERSAO])
  if (existsSync(f)) { console.log(`VERMELHO  já existe ${f} — não sobreponho artefactos, rebatize a passada`); process.exit(1); }

// ───────────────────────────── 1) a régua ─────────────────────────────
const bruto = readFileSync(CANDIDATA);
const src = bruto.toString("utf8");
g.gate("candidata_md5_igual_regua", md5(bruto), REGUA_MD5);
g.gate("candidata_bytes_iguais_regua", bruto.length, REGUA_BYTES);

const sec = seccoes(src);
g.gate("seccoes_na_ordem", [sec.inicioDry, sec.inicioRev, sec.inicioApl].every((x) => x > -1)
  && sec.inicioDry < sec.inicioRev && sec.inicioRev < sec.inicioApl, true);

const stDry = statements(sec.dry, sec.linhaDry).filter((s) => s.limpo);
const stRev = statements(sec.reversao, sec.linhaRev).filter((s) => s.limpo);

// O achado da candidata, medido outra vez: quantos `ALTER POLICY` sobrevivem sem terminator e quantos
// têem o nome qualificado — os DOIS defeitos que fazem do ficheiro de 12/11 um texto, não um fluxo.
const gruposDry = varrer(sec.dry).semi.filter((c) => sec.dry[c.fim - 1] !== ";");
const gruposRev = varrer(sec.reversao).semi.filter((c) => sec.reversao[c.fim - 1] !== ";");
const qualificados = (st) => st.filter((s) => NOME_QUALIFICADO.test(s.limpo)).length;
out.achado_executabilidade = {
  descricao: "a candidata de 12/11 não é um fluxo executável por duas razões medidas: (a) os ALTER POLICY "
    + "não têem ';' e colapsam em poucos statements quando enviados como estão; (b) o NOME da policy vem "
    + "qualificado com `public.`, que a gramática `ALTER POLICY nome ON tabela` recusa. A derivación "
    + "acrescenta o terminator e des-qualifica o nome — nada mais.",
  erro_medido_no_ensaio: "42601: syntax error at or near \".\" em `ALTER POLICY public.\"access_requests_manage\" ON public.access_requests`",
  dryrun_grupos_sem_ponto_e_virgula: gruposDry.length,
  reversao_grupos_sem_ponto_e_virgula: gruposRev.length,
  alter_policy_no_dryrun: stDry.filter((s) => /^\s*alter\s+policy/i.test(s.limpo)).length,
  nomes_qualificados_no_dryrun: qualificados(stDry),
  nomes_qualificados_na_reversao: qualificados(stRev),
};

// ─────────────────── 2) o que a candidata diz (parse local) ───────────────────
const nomes = (st) => st.filter((s) => /^\s*alter\s+policy/i.test(s.limpo)).map((s) => lerAlterPolicy(s.limpo));
const dryAlters = nomes(stDry);
const revAlters = nomes(stRev);
const ESPERADOS = [
  "public.\"access_requests_manage\"", "public.\"access_requests_staff_insert\"",
  "public.\"attendance_staff_delete\"", "public.\"attendance_staff_insert\"",
  "public.\"attendance_staff_select\"", "public.\"attendance_staff_update\"",
  "public.\"grades_staff_delete\"", "public.\"grades_staff_insert\"", "public.\"grades_staff_select\"",
  "public.\"occurrences_director_select\"", "public.\"occurrences_director_update\"",
].sort();
g.gate("dryrun_11_alter_policy", dryAlters.length, 11);
g.gate("reversao_11_alter_policy", revAlters.length, 11);
g.gate("dryrun_nomes_sao_os_11_esperados", dryAlters.map((a) => a.alvo).sort(), ESPERADOS);
g.gate("reversao_mesmos_11_nomes_do_dryrun", revAlters.map((a) => a.alvo).sort(), dryAlters.map((a) => a.alvo).sort());
g.gate("cria_3_funcoes_wrapper", stDry.filter((s) => /^\s*create\s+or\s+replace\s+function\s+public\.(bfr_rls_)/i.test(s.limpo)).length, 3);
g.gate("revoke_all_from_public_1_e_grant_3",
  [stDry.filter((s) => /^\s*revoke\s+all\s+on\s+function/i.test(s.limpo)).length,
   stDry.filter((s) => /^\s*grant\s+execute\s+on\s+function/i.test(s.limpo)).length], [1, 3]);
g.gate("reversao_drop_3_wrappers",
  stRev.filter((s) => /^\s*drop\s+function\b/i.test(s.limpo)).map((s) => /public\.([a-z_]+)/i.exec(s.limpo)[1]).sort(),
  [...WRAPPERS].sort());
// ALTER POLICY sem `FOR` e sem `TO`: o comando e os papéis das policies não são tocados.
g.gate("nenhum_alter_toca_comando_ou_papeis",
  [...dryAlters, ...revAlters].filter((a) => a.temFor || a.temTo).length, 0);

const clausulas = (alts) => alts.flatMap((a) => [
  { alvo: a.alvo, tipo: "USING", texto: a.using && a.using.texto, presente: !!a.using },
  { alvo: a.alvo, tipo: "WITH CHECK", texto: a.withCheck && a.withCheck.texto, presente: !!a.withCheck },
]).filter((c) => c.presente);
const dryClausulas = clausulas(dryAlters);
// 14 = 8 USING + 6 WITH CHECK medidos no ficheiro (a policy de INSERT não tem USING). O número NÃO é
// uma suposição: é o mesmo que o catálogo vivo dá, e é isso que a porta de paridade abaixo exige.
g.gate("dryrun_11_policies_14_clausulas", dryClausulas.length, 14);
g.gate("dryrun_8_using_e_6_with_check",
  [dryClausulas.filter((c) => c.tipo === "USING").length, dryClausulas.filter((c) => c.tipo === "WITH CHECK").length],
  [8, 6]);

// ─────────────────── 3) o que está vivo no banco (1 tacada) ───────────────────
const sonda = (await sql(sondaSql()))[0].veredito;
const vivas = sonda.polisticas;
const publicas = vivas.filter((p) => p.roles_public);
out.polisticas_vivas = { total: vivas.length, public: publicas.length };
g.gate("catalogo_23_policies_nas_4_tabelas", vivas.length, 23);
g.gate("catalogo_11_de_papel_public", publicas.length, 11);
g.gate("catalogo_nomes_public_iguais_ao_ficheiro",
  publicas.map((p) => `public."${p.n}"`).sort(), ESPERADOS);

// Todas as 11 têm de estar vivas com a chamada privilegiada — é isto que a candidata vai trocar.
const comPrivilegio = publicas.filter((p) =>
  [p.qual, p.with_check].filter(Boolean).some((t) => chamadaEm(t).length > 0)).map((p) => p.n).sort();
g.gate("as_11_public_chamam_algo_que_anon_nao_pode", comPrivilegio.length, 11);

// Paridade de cláusulas: onde o catálogo tem USING, o ficheiro tem USING; onde tem WITH CHECK, o ficheiro
// tem WITH CHECK. Uma INSERT legítima não tem USING — a régua é a forma do catálogo, não um número fixo.
const paridade = publicas.map((p) => {
  const a = dryAlters.find((x) => x.alvo === `public."${p.n}"`) || {};
  return { policy: p.n, no_catalogo: [p.qual !== null, p.with_check !== null],
           no_ficheiro: [!!a.using, !!a.withCheck] };
});
g.gate("paridade_de_clausulas_com_o_catalogo",
  paridade.filter((x) => JSON.stringify(x.no_catalogo) === JSON.stringify(x.no_ficheiro)).length, 11);
const clausulasVivas = publicas.reduce((n, p) => n + (p.qual !== null ? 1 : 0) + (p.with_check !== null ? 1 : 0), 0);
g.gate("catalogo_da_14_clausulas_e_o_ficheiro_tambem", [clausulasVivas, dryClausulas.length], [14, 14]);
out.paridade = paridade;

// A REVERSÃO tem de ser o byte-a-byte do que está vivo — senão o rollback não desfaz nada.
const vivos = new Map(publicas.map((p) => [`public."${p.n}"`, p]));
// Falhar aqui com nome, não com TypeError a meio do ficheiro: se o catálogo e o divergem, a passada
// inteira é inútil e é preciso saber ONDE.
g.gate("reversao_aponta_para_policies_todas_vivas_public",
  revAlters.filter((a) => !vivos.has(a.alvo)).map((a) => a.alvo), []);
const reversao = [];
for (const a of revAlters) {
  const viva = vivos.get(a.alvo);
  if (!viva) continue;
  for (const [tipo, clausula, textoVivo] of [["USING", a.using, viva.qual], ["WITH CHECK", a.withCheck, viva.with_check]]) {
    if (!clausula) continue;
    const formasClausula = formas(clausula.texto);
    const igual = formasClausula.includes(textoVivo);
    reversao.push({ alvo: a.alvo, tipo, igual_ao_vivo: igual, forma: formasClausula.indexOf(textoVivo) });
  }
}
g.gate("reversao_byte_identica_ao_catalogo_vivo", reversao.filter((r) => r.igual_ao_vivo).length, reversao.length);
g.gate("reversao_cobre_14_clausulas", reversao.length, 14);
out.reversao_clausula_a_clausula = reversao;

// O texto novo não pode conter NENHUMA das chamadas que o anon não pode avaliar.
const residuo = dryClausulas.filter((c) => c.texto && chamadaEm(c.texto).length > 0)
  .map((c) => `${c.alvo}/${c.tipo}:${chamadaEm(c.texto).join("+")}`);
g.gate("dryrun_zero_chamadas_privilegiadas", residuo, []);
g.gate("dryrun_todas_as_clausulas_usam_wrapper",
  dryClausulas.filter((c) => c.texto && !/bfr_rls_/.test(c.texto)).length, 0);

const existe = (nome) => (sonda.wrappers || []).some((w) => w.nome === nome);
g.gate("wrappers_ainda_nao_existem", WRAPPERS.filter(existe), []);
g.gate("anon_sem_execute_current_role_legado", sonda.anon_legado_current_role, false);
g.gate("anon_sem_execute_is_developer_legado", sonda.anon_legado_is_developer, false);
g.gate("anon_sem_select_staff_schools", sonda.anon_le_staff_schools, false);
// Antes de aplicar, nenhuma das 11 PUBLIC está livre de chamada privilegiada — é exactamente o gap.
g.gate("nenhuma_public_livre_de_privilegio_antes", sonda.public_sem_chamada_privilegiada, 0);
g.gate("pegada_de_catalogo_igual_a_regua", sonda.pegada, PEGADA_ESPERADA);
const antes = JSON.parse(ler("evidence/rm68-recon-antes-15-11.json"));
g.gate("pegada_igual_a_do_recon_de_15_11", sonda.pegada, antes.pegada_antes);
// Régua independente: o censo gravado antes do ciclo (pg_policies, papel PUBLIC = `roles` null) tem de
// dar o mesmo conjunto de 11 names e o mesmo número de cláusulas que a sonda de agora.
const reconPublic = antes.policies.filter((p) => p.roles === null);
g.gate("recon_15_11_tem_as_mesmas_11_public", reconPublic.map((p) => `public."${p.policyname}"`).sort(), ESPERADOS);
g.gate("recon_15_11_da_mesma_contagem_de_clausulas",
  reconPublic.reduce((n, p) => n + (p.qual !== null ? 1 : 0) + (p.with_check !== null ? 1 : 0), 0), clausulasVivas);
out.pegada = sonda.pegada;
out.contagens_baseline = sonda.contagens;
out.anon_hoje = {
  current_role_execute: sonda.anon_legado_current_role,
  is_developer_execute: sonda.anon_legado_is_developer,
  staff_schools_select: sonda.anon_le_staff_schools,
};

// ─────────────────── 4) derivar o fluxo executável ───────────────────
// Duas diferenças, e só estas, em relação aos bytes da candidata: o `;` acrescentado quando falta e o
// `public.` removido do NOME da policy (a gramática não aceita nome qualificado — 42601 medido no ensaio).
const comPonto = (s) => {
  const m = eAlterPolicy(s) ? desqualificar(s.miolo) : s.miolo;
  return m.endsWith(";") ? m : `${m};`;
};
const seco = (t) => normaliza(t).replace(/;$/, "");

// Do DRY-RUN interessa o prefixo completo até ao último ALTER POLICY: BEGIN, os dois SET LOCAL, as três
// CREATE, o REVOKE, os três GRANT e os onze ALTER. Os `select` de veredito e o ROLLBACK ficam fora —
// o ensaio emite a sonda dele próprio, e a aplicação não emite nenhum.
const ateAlter = [];
for (const s of stDry) {
  if (/^\s*(select|rollback|commit)\b/i.test(s.limpo)) break;
  ateAlter.push(s);
}
const altersDry = ateAlter.filter((s) => /^\s*alter\s+policy/i.test(s.limpo));
const cabecaSeca = ateAlter.filter((s) => !/^\s*(alter|create\s+or\s+replace|revoke|grant)\b/i.test(s.limpo));
const altersRev = stRev.filter((s) => /^\s*alter\s+policy/i.test(s.limpo));
const dropsRev = stRev.filter((s) => /^\s*drop\s+function\b/i.test(s.limpo));

// Primeiro verbo do statement, sem o `;` que o fecho cola ao token.
const primeiro = (s) => s.limpo.split(/\s+/)[0].replace(/;$/, "").toUpperCase();

g.gate("dryrun_prefixo_tem_21_statements", ateAlter.length, 21);
g.gate("dryrun_prefixo_forma_begin_set_set_create3_revoke_grant3_alter11",
  ateAlter.map(primeiro)
    .map((t, i) => (i === 3 || i === 4 || i === 5 ? `${t}${i - 2}` : t === "GRANT" ? `GRANT${i - 6}` : t)),
  ["BEGIN", "SET", "SET", "CREATE1", "CREATE2", "CREATE3", "REVOKE", "GRANT1", "GRANT2", "GRANT3",
   ...Array(11).fill("ALTER")]);
g.gate("cabeca_seca_do_dryrun_sao_3", cabecaSeca.map(primeiro), ["BEGIN", "SET", "SET"]);
g.gate("reversao_tem_11_alter_e_3_drop", [altersRev.length, dropsRev.length], [11, 3]);

const cabecalho = (que, deOnde) => [
  `-- RM-6.8 — fluxo ${que} derivado de ${deOnde}`,
  `-- Gerado por scripts/rm68-preflight-15-11.mjs em ${out.em} (passada b, depois do 42601 medido no ensaio).`,
  `-- Régua: ${CANDIDATA} md5 ${REGUA_MD5} (${REGUA_BYTES} B).`,
  "-- Regra da derivación: cada statement é o byte-a-byte do candidato com (a) o `;` acrescentado quando",
  "-- faltava e (b) o `public.` removido do NOME da policy, que a gramática `ALTER POLICY nome ON tabela`",
  "-- recusa em 42601. O `ON public.<tabela>` fica intacto. Conferido statement a statement por reinserção.",
  "-- Do DRY-RUN foram deixados fora os `select` de veredito e o ROLLBACK; aqui o fecho é COMMIT, por isso",
  "-- a aplicação inteira é UMA transacção: se qualquer statement falhar, nada fica no banco.",
  "",
].join("\n");

// A primeira fatia do DRY-RUN traz a faixa "-- ═══ DRY-RUN ═══" colada ao `BEGIN;`. Repetida no ficheiro
// de REVERSÃO a legenda mentiria; linhas de comentário à esquerda não são SQL, por isso cortam-se.
const semBanner = (s) => ({ ...s, miolo: s.miolo.replace(/^(?:[ \t]*--.*(?:\n|$))+/, "") });

const F_ONDE = "scripts/rm68-fail-closed-por-policy.sql";
writeFileSync(F_APLICACAO, cabecalho("de APLICAÇÃO (BEGIN…COMMIT)", F_ONDE)
  + ateAlter.map(comPonto).join("\n\n") + "\n\nCOMMIT;\n");
writeFileSync(F_REVERSAO, cabecalho("de REVERSÃO (BEGIN…COMMIT)", F_ONDE)
  + [...cabecaSeca.map(semBanner), ...altersRev, ...dropsRev].map(comPonto).join("\n\n") + "\n\nCOMMIT;\n");

// O derivado tem de conter exactamente os mesmos statements do candidato — só com `;` e sem o qualificador
// do nome. A conferência é feita AO CONTRÁRIO para não ser circular: lêem-se os bytes do ficheiro escrito,
// reinsere-se `public.` no nome (`requalificar`) e só então se exige igualdade byte a byte com a candidata.
// Se a remoção tivesse comido mais alguma coisa — o `public.` de um wrapper dentro do USING, ou o da
// tabela depois de `ON` — a reinserção não batia e o portão ia vermelho.
const GRAMATICA_ALTER = /^\s*alter\s+policy\s+"[a-z_0-9]+"\s+on\s+public\.[a-z_0-9]+\b/i;
const conferido = (ficheiro, esperados) => {
  const st = statements(readFileSync(ficheiro, "utf8")).filter((s) => s.limpo);
  const dados = st.map((s) => seco(requalificar(s.limpo)));
  const alters = st.filter((s) => /^\s*alter\s+policy/i.test(s.limpo));
  return {
    total: st.length,
    sem_terminador: st.filter((s) => !s.pontoEVirgula).length,
    nomes_ainda_qualificados: st.filter((s) => NOME_QUALIFICADO.test(s.limpo)).length,
    alter_fora_da_gramatica: alters.filter((s) => !GRAMATICA_ALTER.test(s.limpo)).map((s) => s.limpo.slice(0, 70)),
    identicos: esperados.length === st.length && esperados.every((e, i) => dados[i] === seco(e.limpo)),
    tipos: st.map(primeiro),
  };
};
const derAp = conferido(F_APLICACAO, [...ateAlter, { limpo: "COMMIT" }]);
const derRv = conferido(F_REVERSAO, [...cabecaSeca, ...altersRev, ...dropsRev, { limpo: "COMMIT" }]);
out.derivados = {
  aplicacao: { ficheiro: F_APLICACAO, statements: derAp.total, bytes: readFileSync(F_APLICACAO).length, md5: md5(readFileSync(F_APLICACAO)), nomes_ainda_qualificados: derAp.nomes_ainda_qualificados, alter_fora_da_gramatica: derAp.alter_fora_da_gramatica },
  reversao: { ficheiro: F_REVERSAO, statements: derRv.total, bytes: readFileSync(F_REVERSAO).length, md5: md5(readFileSync(F_REVERSAO)), nomes_ainda_qualificados: derRv.nomes_ainda_qualificados, alter_fora_da_gramatica: derRv.alter_fora_da_gramatica },
};
g.gate("derivado_aplicacao_22_statements", derAp.total, 22);
g.gate("derivado_aplicacao_sem_statements_soltos", derAp.sem_terminador, 0);
// Não é «byte-idêntico» a secas: é idêntico à candidata quando o `public.` do nome é reinserido. O nome
// do portão diz a regra inteira, porque a palavra «idêntico» sozinha tapava o segundo defeito.
g.gate("derivado_aplicacao_identico_a_candidata_salvo_terminador_e_qualificador", derAp.identicos, true);
g.gate("derivado_reversao_18_statements", derRv.total, 18);
g.gate("derivado_reversao_sem_statements_soltos", derRv.sem_terminador, 0);
g.gate("derivado_reversao_identico_a_candidata_salvo_terminador_e_qualificador", derRv.identicos, true);
// O defeito do 42601 tem de estar morto nos dois ficheiros: nenhum nome qualificado, e os 11 ALTER de cada
// um com a forma que o parser do Postgres aceita (nome simples, tabela qualificada).
g.gate("derivado_aplicacao_zero_nomes_qualificados", derAp.nomes_ainda_qualificados, 0);
g.gate("derivado_reversao_zero_nomes_qualificados", derRv.nomes_ainda_qualificados, 0);
g.gate("derivado_aplicacao_11_alter_na_gramatica", [derAp.alter_fora_da_gramatica.length, derAp.tipos.filter((t) => t === "ALTER").length], [0, 11]);
g.gate("derivado_reversao_11_alter_na_gramatica", [derRv.alter_fora_da_gramatica.length, derRv.tipos.filter((t) => t === "ALTER").length], [0, 11]);
g.gate("derivado_aplicacao_on_de_todas_as_11_qualificado",
  [...readFileSync(F_APLICACAO, "utf8").matchAll(/^\s*alter\s+policy\s+"[a-z_0-9]+"\s+on\s+(public\.[a-z_0-9]+)/gim)].map((m) => m[1]).sort(),
  ESPERADOS.map((e) => { const a = dryAlters.find((x) => x.alvo === e); return `public.${a.tabela}`; }).sort());
g.gate("derivado_aplicacao_ordem_cria_antes_de_alterar",
  derAp.tipos.indexOf("REVOKE") < derAp.tipos.lastIndexOf("ALTER") && derAp.tipos.indexOf("CREATE") < derAp.tipos.indexOf("ALTER"), true);
g.gate("derivado_reversao_altera_antes_de_dropar",
  derRv.tipos.lastIndexOf("ALTER") < derRv.tipos.indexOf("DROP"), true);

// O preflight não escreve: a pegada tem de ser a mesma depois de todas as leituras.
const depois = (await sql(sondaSql()))[0].veredito.pegada;
g.gate("preflight_nao_escreveu_pegada_igual", depois, sonda.pegada);

out.pegada_depois = depois;
out.portoes = g.resumo();
writeFileSync(ARTEFACTO, JSON.stringify(out, null, 2) + "\n");

const { portoes, falhas } = g.resumo();
for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`vivo: ${vivas.length} policies (${publicas.length} PUBLIC), pegada ${sonda.pegada.total}/${sonda.pegada.hash.slice(0, 12)}, contagens ${JSON.stringify(sonda.contagens)}`);
console.log(`achado executabilidade: ${JSON.stringify(out.achado_executabilidade)}`);
console.log(`derivados: aplicação ${derAp.total} statements / reversão ${derRv.total} · ${JSON.stringify(out.derivados.aplicacao.md5)} · ${JSON.stringify(out.derivados.reversao.md5)}`);
console.log(`qualificador: ${out.achado_executabilidade.nomes_qualificados_no_dryrun} na candidata → ${derAp.nomes_ainda_qualificados} no derivado; ALTER fora da gramática: ${derAp.alter_fora_da_gramatica.length}/${derRv.alter_fora_da_gramatica.length}`);
if (falhas.length === 0) { console.log(`RM68_PREFLIGHT_VERDE ${portoes} portões / 0 falhas · artefacto ${ARTEFACTO}`); process.exit(0); }
console.log(`RM68_PREFLIGHT_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
