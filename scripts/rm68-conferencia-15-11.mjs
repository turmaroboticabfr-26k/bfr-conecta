// RM-6.8 / #1189 — CONFERÊNCIA pós-aplicação, SOMENTE LEITURA.
// A aplicação (rm68-aplicar-15-11.mjs) escreveu e persistiu; este script não escreve nada em lado
// nenhum: uma única `sondaSql()` de catálogo e ficheiros em disco. Serve para duas coisas que o
// registo de aplicação não cobre sozinho:
//   (1) re-medir o estado COMETIDO hoje, com o instrumento já corrigido (o portão de 14 predicados
//       comparava texto de autor com deparse e rebentou com o banco certo — armadilha 15/11-d);
//   (2) provar que a correcção do instrumento não o amoleceu: o controlo de não-vacuidade perturba
//       cada cláusula viva em três pontos que mudam LÓGICA e exige que o classificador as rejeite.
// Régua de QUAIS são as 11 PUBLIC: derivada de dois artefactos independentes (o censo, onde o papel
// PUBLIC aparece como `roles = null`, e a lista da candidata com o `cmd` de cada uma), nunca dactilografada.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql, criarGates } from "./c2-lib.mjs";
import {
  ler, md5, statements, sondaSql, chamadaEm, pareiaClausulas, classeDeparse, perturbaClaustra,
  cmdVivo, normaliza, eAlterPolicy, WRAPPERS,
} from "./rm68-lib.mjs";

const CANDIDATA = "scripts/rm68-fail-closed-por-policy.sql";
const PRE = JSON.parse(ler("evidence/rm68-preflight-15-11b.json"));
const ENSAIO = JSON.parse(ler("evidence/rm68-dryrun-15-11d.json"));
const APLIC = JSON.parse(ler("evidence/rm68-aplicacao-15-11.json"));
const CENSO = JSON.parse(ler("evidence/rm68-recon-antes-15-11.json"));
const LISTA = JSON.parse(ler("evidence/rm68-candidata-portoes.json"));
const SUITE_ANTES = JSON.parse(ler("evidence/rm14-suite-antes-rm68-15-11.json"));
const ESTADO = JSON.parse(ler("evidence/rm15-estado-ar-14-11.json"));
const F_AP = PRE.derivados.aplicacao.ficheiro;
const F_REV = PRE.derivados.reversao.ficheiro;
const ARTEFACTO = "evidence/rm68-conferencia-15-11.json";

// A régua do md5 é LIDA do artefacto que a mediu, não copiada do aplicador; o aplicador tem a mesma
// constante escrita no código-fonte e confiro as duas — assim um typo no aplicador também apanha vermelho.
const REGUA_ARTEFACTO = (ESTADO.candidatas_em_disco || [])
  .find((c) => c.caminho === CANDIDATA || c.caminho.endsWith(CANDIDATA));
const REGUA_APLICADOR = /REGUA_MD5\s*=\s*"([0-9a-f]{32})"/.exec(ler("scripts/rm68-aplicar-15-11.mjs"));

const g = criarGates();
const out = {
  em: new Date().toISOString(),
  tarefa: "RM-6.8 / #1189 — conferência somente-leitura do estado aplicado (instrumento corrigido + não-vacuidade)",
  escrita_no_banco: false,
};
if (existsSync(ARTEFACTO)) { console.log(`VERMELHO  já existe ${ARTEFACTO} — não sobreponho artefactos`); process.exit(1); }

// ───────────── 1) disco: a candidata e os dois fluxos derivados não se mexeram ─────────────
g.gate("regua_existe_no_artefacto_e_no_aplicador", [!!REGUA_ARTEFACTO, !!REGUA_APLICADOR], [true, true]);
g.gate("regua_artefacto_igual_literal_do_aplicador",
  REGUA_ARTEFACTO && REGUA_APLICADOR ? REGUA_ARTEFACTO.md5 : null,
  REGUA_APLICADOR ? REGUA_APLICADOR[1] : null);
g.gate("candidata_md5_igual_regua", md5(readFileSync(CANDIDATA)), REGUA_ARTEFACTO.md5);
g.gate("fluxo_aplicacao_md5_igual_preflight", md5(readFileSync(F_AP)), PRE.derivados.aplicacao.md5);
const textoAp = ler(F_AP);
const ap = statements(textoAp).filter((s) => s.limpo);
g.gate("fluxo_aplicacao_22_statements_e_fecha_commit",
  [ap.length, ap.at(-1).limpo.replace(/;$/, "").toUpperCase()],
  [PRE.derivados.aplicacao.statements, "COMMIT"]);
g.gate("fluxo_aplicacao_11_alter_policy", ap.filter((s) => s.limpo && eAlterPolicy(s)).length, 11);
// O caminho de volta tem de estar intacto: é a única coisa que ainda separa o estado actual de um erro.
g.gate("reversao_md5_igual_preflight", existsSync(F_REV) && md5(readFileSync(F_REV)), PRE.derivados.reversao.md5);
g.gate("reversao_18_statements", statements(ler(F_REV)).filter((s) => s.limpo).length, PRE.derivados.reversao.statements);

// ───────────── 2) o que os artefactos do ciclo registaram ─────────────
g.gate("ensaio_verde_sem_escrita", [ENSAIO.portoes.portoes, ENSAIO.portoes.falhas.length, ENSAIO.escrita_persistida], [54, 0, false]);
g.gate("aplicacao_persistiu_com_unica_falha_conhecida",
  [APLIC.escrita_persistida, APLIC.portoes.falhas.map((f) => f.split(" | ")[0])],
  [true, ["depois_14_predicados_batem_com_o_ficheiro"]]);
// A única falha do registo era de INSTRUMENTO (texto de autor × deparse). Este script substitui-a por
// `pareiaClausulas`; guardar a contagem antiga deixa rasto do que foi trocado, e porquê.
out.falha_registrada_no_aplicador = {
  portao: "depois_14_predicados_batem_com_o_ficheiro",
  motivo: "comparava o texto do ficheiro com o pg_get_expr; o deparse tira qualificadores auto-resolvidos e por vezes um par exterior",
  substituido_por: "depois_14_clausulas_pareadas_por_nome_e_tipo + controlo_de_nao_vacuidade",
};
g.gate("suite_antes_registrava_as_4_recusas_por_privilegio",
  (SUITE_ANTES.amostra_anon?.recusadas_por_privilegio ?? []).length, 4);

// ───────────── 3) o banco, numa única sonda de catálogo ─────────────
const d = (await sql(sondaSql()))[0].veredito;
const nom = (p) => `${p.t}.${p.n}`;
const publicas = d.polisticas.filter((p) => p.roles_public);
const censoMap = new Map(CENSO.policies.map((p) => [p.policyname, p]));
// Duas réguas independentes para «QUAIS são as 11»: o censo (papel PUBLIC aparece como `roles = null`,
// porque não há linha de oid 0 no `pg_roles` do agregado) e a lista da candidata com o `cmd`.
const publicasDoCenso = CENSO.policies.filter((p) => !p.roles).map((p) => p.policyname).sort();
const listaDaCandidata = (LISTA.policies_public || []).map((x) => x.split("/")[2] + "|" + x.split("/")[1]).sort();

g.gate("sonda_total_polisticas_23", d.polisticas.length, 23);
g.gate("sonda_11_public", publicas.length, 11);
g.gate("quais_11_iguais_as_do_censo", publicas.map((p) => p.n).sort(), publicasDoCenso);
g.gate("quais_11_iguais_as_da_lista_da_candidata",
  publicas.map((p) => `${p.n}|${cmdVivo(p)}`).sort(), listaDaCandidata);
g.gate("cmd_de_cada_publica_igual_ao_censo",
  publicas.filter((p) => censoMap.get(p.n) && cmdVivo(p) !== censoMap.get(p.n).cmd).map(nom), []);
// Um `ALTER POLICY … WITH CHECK` que desapareça não dá erro: a policy fica sem verificação de escrita.
g.gate("with_check_preservado_onde_o_censo_o_tinha",
  d.polisticas.filter((p) => censoMap.get(p.n) && ((censoMap.get(p.n).with_check ?? null) === null) !== ((p.with_check ?? null) === null)).map(nom), []);
g.gate("pegada_igual_preflight", d.pegada, PRE.pegada);
g.gate("pegada_igual_registo_de_aplicacao", d.pegada, APLIC.depois.pegada);
g.gate("contagens_igual_baseline", d.contagens, PRE.contagens_baseline);
g.gate("contagens_igual_registo_de_aplicacao", d.contagens, APLIC.depois.contagens);
g.gate("nenhuma_linha_escrita_pela_ddl", APLIC.depois.contagens, PRE.contagens_baseline);

// O desenho: fail-closed por POLICY. Nenhuma das 11 pode chamar um objecto que o `anon` não possa ler,
// e todas têm de chamar um wrapper. Medido por duas camadas (contador do catálogo e fronteira JS).
g.gate("contador_catalogo_11_livres", d.public_sem_chamada_privilegiada, 11);
g.gate("as_11_livres_de_privilegio_medidas_em_js",
  publicas.filter((p) => [p.qual, p.with_check].filter(Boolean).some((t) => chamadaEm(t).length > 0)).map(nom), []);
g.gate("as_11_chamam_todas_um_wrapper",
  publicas.filter((p) => ![p.qual, p.with_check].filter(Boolean).some((t) => /bfr_rls_/.test(t))).map(nom), []);
g.gate("contador_catalogo_igual_clausula_a_clausula",
  d.public_sem_chamada_privilegiada,
  publicas.filter((p) => [p.qual, p.with_check].filter(Boolean).every((t) => chamadaEm(t).length === 0)).length);
// As 12 de papel não foram tocadas: byte a byte contra o censo anterior ao ciclo.
g.gate("as_12_de_papel_inalteradas_byte_a_byte",
  d.polisticas.filter((p) => !p.roles_public).filter((p) => {
    const c = censoMap.get(p.n);
    return !c || c.qual !== p.qual || (c.with_check ?? null) !== (p.with_check ?? null);
  }).map(nom), []);
g.gate("as_12_de_papel_sao_12", d.polisticas.filter((p) => !p.roles_public).length, 12);

const w = Object.fromEntries((d.wrappers || []).map((x) => [x.nome, x]));
g.gate("wrappers_sao_os_3", Object.keys(w).sort(), [...WRAPPERS].sort());
for (const nome of WRAPPERS) {
  const x = w[nome] || {};
  g.gate(`wrapper_${nome}_definer_com_search_path_preso`,
    [x.definer === true, (x.config || []).join(";")], [true, "search_path=public, pg_temp"]);
  g.gate(`wrapper_${nome}_executavel_por_anon_e_authenticated_nao_por_public`,
    [x.anon_exec, x.auth_exec, x.publico_exec], [true, true, false]);
  g.gate(`wrapper_${nome}_dono_postgres`, x.dono, "postgres");
}
// O RM-6.8 NÃO dá privilégios ao `anon`: os três legados têm de continuar negados, exatamente como o
// preflight os mediu antes do ciclo. É isso que torna o fecho «por policy» e não «por GRANT».
g.gate("anon_legado_continua_negado_como_antes_do_ciclo",
  [d.anon_legado_current_role, d.anon_legado_is_developer, d.anon_le_staff_schools],
  [PRE.anon_hoje.current_role_execute, PRE.anon_hoje.is_developer_execute, PRE.anon_hoje.staff_schools_select]);
// O ensaio (transacção com ROLLBACK) produziu este mesmo catálogo: a aplicação não acrescentou nada.
g.gate("catalogo_depois_igual_o_do_ensaio_rollback",
  [d.pegada, d.wrappers, d.public_sem_chamada_privilegiada],
  [ENSAIO.dentro.pegada, ENSAIO.dentro.wrappers, ENSAIO.dentro.public_sem_privilegio]);

// ───────────── 4) as 14 cláusulas: pareadas por nome + tipo, com causa de deparse nomeada ─────────────
const clausulas = pareiaClausulas(textoAp, d.polisticas);
const classes = Object.fromEntries([...new Set(clausulas.map((c) => c.classe))].map((k) => [k, clausulas.filter((c) => c.classe === k).length]));
g.gate("depois_14_clausulas_pareadas_por_nome_e_tipo",
  [clausulas.length, classes.OUTRO ?? 0, classes.POLITICA_AUSENTE ?? 0], [14, 0, 0]);
g.gate("toda_a_clausula_tem_causa_de_deparse_conhecida",
  clausulas.filter((c) => c.classe === "OUTRO" || c.classe === "POLITICA_AUSENTE" || c.catalogo === null)
    .map((c) => `${c.politica}/${c.clausula}`), []);
// Quantas NÃO batiam cruas: é a conta da armadilha 15/11-d, registada como facto, não como portão — se
// alguém reescrever o ficheiro para bater com o deparse, este número sobe e o portão de cima continua verde.
g.gate("pareamento_cobre_as_11_public_e_os_14_predicados",
  [publicas.length, clausulas.filter((c) => c.clausula === "USING").length, clausulas.filter((c) => c.clausula === "WITH CHECK").length],
  [APLIC.depois.public_polisticas, 8, 6]);
out.clausulas = {
  pareadas: clausulas.length,
  classes,
  byte_iguais_sem_normalizar: clausulas.filter((c) => normaliza(c.ficheiro) === normaliza(c.catalogo)).length,
  detalhes: clausulas,
};

// ───────────── 5) controlo de não-vacuidade ─────────────
// Se o classificador só «perdoar» o que é deparse, tem de continuar a REJEITAR o que é lógica diversa.
// Por cada cláusula viva, pico três pontos que mudam a resposta da policy e exijo «OUTRO» em cada um.
const vagas = [];
const perturbacoes = [];
for (const c of clausulas) {
  if (c.classe === "OUTRO" || c.classe === "POLITICA_AUSENTE" || c.catalogo === null) continue;
  for (const [tipo, texto] of perturbaClaustra(c.catalogo)) {
    perturbacoes.push({ politica: c.politica, clausula: c.clausula, tipo });
    if (classeDeparse(c.ficheiro, texto) !== "OUTRO") {
      vagas.push(`${c.politica}/${c.clausula}/${tipo} -> ${classeDeparse(c.ficheiro, texto)}`);
    }
  }
}
g.gate("controlo_de_nao_vacuidade",
  [perturbacoes.length, vagas.length], [clausulas.length * 3, 0]);
out.controlo_negativo = { perturbacoes: perturbacoes.length, nao_detectadas: vagas };

out.conferido = {
  pegada: d.pegada,
  public_sem_privilegio: d.public_sem_chamada_privilegiada,
  total_polisticas: d.polisticas.length,
  publicas: publicas.length,
  wrappers: (d.wrappers || []).map((x) => x.nome),
  contagens: d.contagens,
  cmd_publicas: publicas.map((p) => `${p.n}:${cmdVivo(p)}`),
};
out.portoes = g.resumo();
writeFileSync(ARTEFACTO, JSON.stringify(out, null, 2) + "\n");
const { portoes, falhas } = g.resumo();
for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`sonda: pegada ${d.pegada.total}/${d.pegada.hash.slice(0, 12)}, PUBLIC ${publicas.length}/23, livres ${d.public_sem_chamada_privilegiada}, wrappers ${(d.wrappers || []).length}, contagens ${JSON.stringify(d.contagens)}`);
console.log(`cláusulas: ${JSON.stringify(classes)} · byte-iguais cruas ${out.clausulas.byte_iguais_sem_normalizar}/${clausulas.length}`);
console.log(`controlo negativo: ${perturbacoes.length} perturbações, ${vagas.length} não detectadas`);
if (falhas.length === 0) { console.log(`RM68_CONFERENCIA_VERDE ${portoes} portões / 0 falhas · somente leitura · artefacto ${ARTEFACTO}`); process.exit(0); }
console.log(`RM68_CONFERENCIA_VERMELHA ${falhas.length} falha(s) de ${portoes} portões · artefacto ${ARTEFACTO}`);
process.exit(1);
