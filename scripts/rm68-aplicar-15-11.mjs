// RM-6.8 / #1189 — APLICAÇÃO do fluxo derivado: UMA transacção, o fecho é COMMIT.
// OK nomeado que autoriza este ficheiro: «Aplicar o RM-6.8» (as quatro acções do ciclo, 14/11).
// Nada aqui foi dactilografado: os bytes que vão para o canal são o ficheiro que o preflight derivou
// (md5 lido do artefacto) e que o ensaio 15-11d aprovou statement a statement com ROLLBACK. Este script
// envia exactamente o mesmo texto, trocando nada — o `COMMIT;` já lá vem de origem.
// Portões ANTES de abrir a escrita: se um falhe, sai sem enviar seja o que for. Os do DEPOIS são a
// conferência de catálogo + a prova de que nenhuma linha foi tocada (contagens e pegada).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql, criarGates } from "./c2-lib.mjs";
import { ler, md5, statements, sondaSql, chamadaEm, eAlterPolicy, pareiaClausulas, WRAPPERS } from "./rm68-lib.mjs";

const CANDIDATA = "scripts/rm68-fail-closed-por-policy.sql";
const REGUA_MD5 = "85ccd0927153fbcca4389e9218f1111f";
const PRE = JSON.parse(ler("evidence/rm68-preflight-15-11b.json"));
const ENSAIO = JSON.parse(ler("evidence/rm68-dryrun-15-11d.json"));
const CENSO = JSON.parse(ler("evidence/rm68-recon-antes-15-11.json"));
const SUITE_ANTES = JSON.parse(ler("evidence/rm14-suite-antes-rm68-15-11.json"));
const F_AP = PRE.derivados.aplicacao.ficheiro;
const F_REV = PRE.derivados.reversao.ficheiro;
const ARTEFACTO = "evidence/rm68-aplicacao-15-11.json";

const g = criarGates();
const out = {
  em: new Date().toISOString(),
  tarefa: "RM-6.8 / #1189 — aplicar o fail-closed por policy (3 wrappers + 11 ALTER POLICY PUBLIC)",
  ok_nomeado: "Aplicar o RM-6.8",
  escrita_persistida: false,
};
if (existsSync(ARTEFACTO)) { console.log(`VERMELHO  já existe ${ARTEFACTO} — não sobreponho artefactos`); process.exit(1); }

// ───────────── 0) régua do que está em disco (sem tocar no banco) ─────────────
g.gate("candidata_md5_igual_regua", md5(readFileSync(CANDIDATA)), REGUA_MD5);
g.gate("fluxo_aplicacao_md5_igual_preflight", md5(readFileSync(F_AP)), PRE.derivados.aplicacao.md5);
const textoAp = ler(F_AP);
const ap = statements(textoAp).filter((s) => s.limpo);
g.gate("fluxo_aplicacao_22_statements", ap.length, PRE.derivados.aplicacao.statements);
g.gate("fluxo_aplicacao_abre_begin_e_fecha_commit",
  [ap[0].limpo.replace(/;$/, "").toUpperCase(), ap.at(-1).limpo.replace(/;$/, "").toUpperCase()],
  ["BEGIN", "COMMIT"]);
g.gate("fluxo_aplicacao_leva_lock_timeout_local", /set\s+local\s+lock_timeout/i.test(textoAp), true);
const alterAp = ap.filter((s) => s.limpo && eAlterPolicy(s));
g.gate("fluxo_aplicacao_11_alter_policy", alterAp.length, 11);
// O reverso do portão do ensaio: aqui tem de HAVER um COMMIT, e tem de ser o último statement.
g.gate("fluxo_aplicacao_commit_e_o_ultimo_statement",
  ap.filter((s) => /^\s*commit\b/i.test(s.limpo)).map((s) => ap.indexOf(s) + 1), [ap.length]);
g.gate("ensaio_verde_sem_falhas", [ENSAIO.portoes.portoes, ENSAIO.portoes.falhas.length, ENSAIO.escrita_persistida], [54, 0, false]);
g.gate("ensaio_mesmos_statements_do_fluxo_menos_o_commit", ENSAIO.ensaio.statements_antes_da_sonda, ap.length - 1);
// Reversão congelada ANTES de escrever: sem caminho de volta não se aplica DDL a um banco vivo.
g.gate("reversao_existe_com_md5_do_preflight", existsSync(F_REV) && md5(readFileSync(F_REV)), PRE.derivados.reversao.md5);
g.gate("reversao_18_statements", statements(ler(F_REV)).filter((s) => s.limpo).length, PRE.derivados.reversao.statements);

// ───────────── 1) preflight fresco: o banco é ainda o que o ensaio provou ─────────────
const antes = (await sql(sondaSql()))[0].veredito;
const nom = (p) => `${p.t}.${p.n}`;
g.gate("preflight_pegada_igual_ciclo", antes.pegada, PRE.pegada);
g.gate("preflight_wrappers_ainda_nao_existem", (antes.wrappers || []).length, 0);
g.gate("preflight_zero_public_livres_de_privilegio", antes.public_sem_chamada_privilegiada, 0);
g.gate("preflight_contagens_igual_baseline", antes.contagens, PRE.contagens_baseline);
// Régua cruzada com o censo gravado antes do ciclo: o texto das 23 policies não mudou desde então.
const censoMap = new Map(CENSO.policies.map((p) => [p.policyname, p]));
g.gate("preflight_texto_igual_ao_censo_de_15_11",
  antes.polisticas.filter((p) => {
    const c = censoMap.get(p.n);
    return !c || c.qual !== p.qual || (c.with_check ?? null) !== (p.with_check ?? null);
  }).map(nom), []);
g.gate("preflight_rm14_a2_ainda_quatro_recusas",
  (SUITE_ANTES.amostra_anon?.recusadas_por_privilegio ?? []).length, 4);
// O ensaio provou UMA TRANSACÇÃO que rebentava noutro estado? Não: provo que o banco que ele pisou é o
// banco em que vou escrever. O `antes` do ensaio e o preflight fresco têm de ser o mesmo veredito.
g.gate("banco_nao_mudou_entre_ensaio_e_aplicacao",
  [ENSAIO.antes.pegada, ENSAIO.antes.contagens, ENSAIO.antes.public_sem_privilegio, ENSAIO.antes.wrappers.length],
  [antes.pegada, antes.contagens, antes.public_sem_chamada_privilegiada, (antes.wrappers || []).length]);

const { falhas: preFalhas } = g.resumo();
if (preFalhas.length > 0) {
  out.portoes = g.resumo();
  writeFileSync(ARTEFACTO, JSON.stringify(out, null, 2) + "\n");
  for (const f of preFalhas) console.log("VERMELHO  " + f);
  console.log(`RM68_APLICACAO_ABORTADA ${preFalhas.length} falha(s) ANTES de escrever · nada foi enviado · artefacto ${ARTEFACTO}`);
  process.exit(1);
}

// ───────────── 2) a escrita: o texto do ficheiro, numa só chamada ─────────────
try {
  out.resposta_canal = await sql(textoAp);
} catch (e) {
  out.escrita_falhou = String(e.message).slice(0, 500);
}
g.gate("aplicacao_nao_rebenta", out.escrita_falhou ?? "sem_erro", "sem_erro");
if (out.escrita_falhou) {
  // O canal é uma transacção implícita: rebentar fez ROLLBACK total. Provo-o, e só depois escrevo o
  // artefacto — duas gravações do mesmo caminho dariam um ficheiro com o meio do raciocínio dentro.
  console.log("VERMELHO  " + out.escrita_falhou);
  const ff = (await sql(sondaSql()))[0].veredito;
  out.depois_da_falha = { pegada: ff.pegada, wrappers: (ff.wrappers || []).map((x) => x.nome), polisticas: ff.polisticas };
  g.gate("falha_rollback_total_pegada_igual", ff.pegada, antes.pegada);
  g.gate("falha_rollback_total_policies_iguais", ff.polisticas, antes.polisticas);
  g.gate("falha_rollback_total_wrappers_iguais", (ff.wrappers || []).length, (antes.wrappers || []).length);
  out.portoes = g.resumo();
  writeFileSync(ARTEFACTO, JSON.stringify(out, null, 2) + "\n");
  const { portoes, falhas } = g.resumo();
  console.log(`RM68_APLICACAO_FALHOU ${falhas.length} falha(s) de ${portoes} portões · nada persistido · artefacto ${ARTEFACTO}`);
  process.exit(1);
}
out.escrita_persistida = true;

// ───────────── 3) conferência de catálogo DEPOIS do COMMIT ─────────────
const d = (await sql(sondaSql()))[0].veredito;
out.depois = {
  pegada: d.pegada,
  public_sem_privilegio: d.public_sem_chamada_privilegiada,
  wrappers: d.wrappers,
  total_polisticas: d.polisticas.length,
  public_polisticas: d.polisticas.filter((p) => p.roles_public).length,
  contagens: d.contagens,
};
const publicas = d.polisticas.filter((p) => p.roles_public);
g.gate("depois_11_public", publicas.length, 11);
g.gate("depois_as_11_livres_de_privilegio",
  publicas.filter((p) => [p.qual, p.with_check].filter(Boolean).some((t) => chamadaEm(t).length > 0)).map(nom), []);
g.gate("depois_as_11_chamam_wrapper",
  publicas.filter((p) => ![p.qual, p.with_check].filter(Boolean).some((t) => /bfr_rls_/.test(t))).map(nom), []);
g.gate("depois_contador_public_livres_e_11", d.public_sem_chamada_privilegiada, 11);
g.gate("depois_contador_sonda_igual_clausula_a_clausula",
  d.public_sem_chamada_privilegiada,
  publicas.filter((p) => [p.qual, p.with_check].filter(Boolean).every((t) => chamadaEm(t).length === 0)).length);
// O que persisti é o que o ensaio provou dentro da transacção — os wrappers saem da MESMA sonda, pelo
// que um byte de diferença (search_path, dono, acl) aqui significa que apliquei outro texto.
g.gate("wrappers_aplicados_iguais_aos_do_ensaio", d.wrappers, ENSAIO.dentro.wrappers);
g.gate("contador_depois_igual_o_do_ensaio", d.public_sem_chamada_privilegiada, ENSAIO.dentro.public_sem_privilegio);
// O portão inverso: o texto tem de ter MUDADO. Sem isto, «11 livres» poderia ser o acaso de um no-op.
g.gate("depois_as_11_textos_mudaram",
  publicas.filter((p) => {
    const a = antes.polisticas.find((x) => nom(x) === nom(p));
    return !a || (a.qual === p.qual && (a.with_check ?? null) === (p.with_check ?? null));
  }).map(nom), []);
g.gate("depois_total_polisticas_intacto", d.polisticas.length, 23);
const antesMap = new Map(antes.polisticas.map((p) => [nom(p), p]));
g.gate("depois_nenhuma_policies_de_papel_alterada",
  d.polisticas.filter((p) => !p.roles_public && JSON.stringify(p) !== JSON.stringify(antesMap.get(nom(p)))).map(nom), []);
const w = Object.fromEntries((d.wrappers || []).map((x) => [x.nome, x]));
g.gate("depois_3_wrappers_existem", Object.keys(w).sort(), [...WRAPPERS].sort());
for (const nome of WRAPPERS) {
  g.gate(`wrapper_${nome}_definer`, w[nome] && w[nome].definer, true);
  g.gate(`wrapper_${nome}_search_path_preso`, /search_path=public,\s*pg_temp/.test((w[nome] || {}).config || ""), true);
  g.gate(`wrapper_${nome}_anon_execute`, w[nome] && w[nome].anon_exec, true);
  g.gate(`wrapper_${nome}_authenticated_execute`, w[nome] && w[nome].auth_exec, true);
  g.gate(`wrapper_${nome}_nao_e_publico`, w[nome] && w[nome].publico_exec, false);
  g.gate(`wrapper_${nome}_dono_postgres`, w[nome] && w[nome].dono, "postgres");
}
g.gate("depois_anon_legado_inalterado",
  [d.anon_legado_current_role, d.anon_legado_is_developer, d.anon_le_staff_schools],
  [antes.anon_legado_current_role, antes.anon_legado_is_developer, antes.anon_le_staff_schools]);
g.gate("depois_pegada_nao_muda_funcao_nao_e_pg_class", d.pegada, antes.pegada);
g.gate("depois_contagens_intactas_nenhuma_linha_escrita", d.contagens, PRE.contagens_baseline);

// O desenho é fail-closed por POLICY, não por privilégio: as 12 policies de papel têm de chamar o que
// chamavam. E os 14 predicados novos têem de ser os do ficheiro. ARMADILHA MEDIDA 15/11-d: a primeira
// versão deste portão comparava o multiconjunto de texto ordenado e rebentou com o banco CERTO, porque
// `pg_get_expr` não devolve o texto do autor (deparse 0/14 byte a byte). Agora pareio por NOME de policy
// e TIPO de cláusula — ordenar e comparar posição a posição até aceitaria cláusulas baralhadas entre si
// — e exijo que cada diferença tenha uma causa de deparse nomeada, com zero «OUTRO».
const clausulas = pareiaClausulas(textoAp, d.polisticas);
const classes = Object.fromEntries([...new Set(clausulas.map((c) => c.classe))].map((k) => [k, clausulas.filter((c) => c.classe === k).length]));
g.gate("depois_14_clausulas_pareadas_por_nome_e_tipo",
  [clausulas.length, classes.OUTRO ?? 0, classes.POLITICA_AUSENTE ?? 0], [14, 0, 0]);
g.gate("depois_toda_clausula_tem_causa_de_deparse_conhecida",
  clausulas.filter((c) => c.classe === "OUTRO" || c.classe === "POLITICA_AUSENTE" || c.catalogo === null)
    .map((c) => `${c.politica}/${c.clausula}`), []);
out.clausulas = { pareadas: clausulas.length, classes, detalhes: clausulas };

out.portoes = g.resumo();
writeFileSync(ARTEFACTO, JSON.stringify(out, null, 2) + "\n");
const { portoes, falhas } = g.resumo();
for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`fluxo aplicado: ${ap.length} statements, ${Buffer.byteLength(textoAp)} B, md5 ${md5(readFileSync(F_AP))}`);
console.log(`depois: pegada ${d.pegada.total}/${d.pegada.hash.slice(0, 12)}, PUBLIC livres ${d.public_sem_chamada_privilegiada}, wrappers ${Object.keys(w).length}, contagens ${JSON.stringify(d.contagens)}`);
console.log(`wrappers: ${JSON.stringify((d.wrappers || []).map((x) => `${x.nome}:def=${x.definer}/anon=${x.anon_exec}/pub=${x.publico_exec}/cfg=${x.config}`))}`);
if (falhas.length === 0) { console.log(`RM68_APLICACAO_VERDE ${portoes} portões / 0 falhas · escrita persistida · artefacto ${ARTEFACTO}`); process.exit(0); }
console.log(`RM68_APLICACAO_VERMELHA ${falhas.length} falha(s) de ${portoes} portões · DDL JÁ APLICADO — correr a reversão ${F_REV}`);
process.exit(1);
