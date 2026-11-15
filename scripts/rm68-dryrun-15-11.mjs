// RM-6.8 / #1189 — ENSAIO transacional (dry-run) do fluxo DERIVADO, com ROLLBACK.
// Não é uma releitura do DRY-RUN da candidata: é o MESMO ficheiro que vai para a aplicação, com o fecho
// `COMMIT;` trocado por sonda + `ROLLBACK;`. Assim o ensaio prova os bytes que vão ser aplicados, e não um
// texto paralelo — a armadilha de 12/11. O caminho do fluxo é LIDO do artefacto do preflight: apontar à
// mão para o ficheiro da passada antiga (com os nomes qualificados, que dão 42601) é o erro que se evita.
// ARMADILHAS MEDIDAS no ensaio: (15/11-a) 42601 por nomes de policy qualificados no `ALTER POLICY`;
// (15/11-b) 42601 porque a sonda não tem terminator e, colada antes do `ROLLBACK`, o banco lê os dois
// como UM statement; (15/11-c) o contador `not like '%is_developer%'` contava o NOME do wrapper novo
// como chamada privilegiada e dava 9 onde a medida cláusula a cláusula dava 11 — defeito do instrumento.
// Artefacto: evidence/rm68-dryrun-15-11d.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql, criarGates } from "./c2-lib.mjs";
import { ler, md5, statements, sondaSql, chamadaEm, normaliza, WRAPPERS, NOME_QUALIFICADO } from "./rm68-lib.mjs";

const CANDIDATA = "scripts/rm68-fail-closed-por-policy.sql";
const REGUA_MD5 = "85ccd0927153fbcca4389e9218f1111f";
const PRE = JSON.parse(ler("evidence/rm68-preflight-15-11b.json"));
const ANTES = JSON.parse(ler("evidence/rm68-recon-antes-15-11.json"));
const F_APLICACAO = PRE.derivados.aplicacao.ficheiro;
const ARTEFACTO = "evidence/rm68-dryrun-15-11d.json";

const g = criarGates();
const out = {
  em: new Date().toISOString(),
  tarefa: "RM-6.8 / #1189 — ensaio transacional do fluxo derivado, com rollback",
  escrita_persistida: false,
};
if (existsSync(ARTEFACTO)) { console.log(`VERMELHO  já existe ${ARTEFACTO} — não sobreponho artefactos`); process.exit(1); }

// ───────────── 0) régua: o que vou a enviar é o que o preflight derivou ─────────────
const brutoCand = readFileSync(CANDIDATA);
g.gate("candidata_md5_igual_regua", md5(brutoCand), REGUA_MD5);
const textoAp = ler(F_APLICACAO);
const ap = statements(textoAp).filter((s) => s.limpo);
g.gate("fluxo_aplicacao_md5_igual_preflight", md5(readFileSync(F_APLICACAO)), PRE.derivados.aplicacao.md5);
g.gate("fluxo_aplicacao_22_statements", ap.length, 22);
g.gate("fluxo_aplicacao_abre_begin_e_fecha_commit",
  [ap[0].limpo.replace(/;$/, "").toUpperCase(), ap[ap.length - 1].limpo.replace(/;$/, "").toUpperCase()],
  ["BEGIN", "COMMIT"]);
// O 42601 medido a 15/11, conferido ANTES de abrir ligação: se houvesse um nome de policy qualificado no
// texto que vai para o canal, o ensaio rebentava no banco. Aqui rebenta no instrumento, por nome.
g.gate("fluxo_aplicacao_zero_nomes_qualificados",
  ap.filter((s) => NOME_QUALIFICADO.test(s.limpo)).map((s) => s.limpo.slice(0, 60)), []);

// O corpo do ensaio: tudo menos o fecho, + sonda + ROLLBACK. O corte é feito no statement `COMMIT`,
// não por regex de texto — trocar a última linha por engano deixaria o COMMIT a persistir.
// O terminator só se acrescenta quando falta. A sonda é o único statement que NÃO vem do ficheiro
// derivado — e vem SEM `;`, porque é escrita para ir sozinha ao canal. Colada antes do ROLLBACK, o
// banco lê `…) as veredito ROLLBACK;` como UM statement e rebenta em 42601 na linha do ROLLBACK
// (medido 15/11). Acrescento-lhe o terminator pela mesma regra do resto do fluxo.
const comPonto = (s) => { const t = s.miolo.replace(/\s+$/, ""); return t.endsWith(";") ? t : `${t};`; };
const semCommit = ap.slice(0, ap.length - 1).map(comPonto).join("\n") + "\n";
const sondaComPonto = comPonto({ miolo: sondaSql() });
const ensaio = `${semCommit}\n${sondaComPonto}\nROLLBACK;\n`;
// Round-trip: o que vai para o canal tem de ser exactamente os 21 statements do ficheiro de aplicação.
const rt = statements(semCommit).filter((s) => s.limpo).map((s) => normaliza(s.limpo).replace(/;$/, ""));
const esperado = ap.slice(0, ap.length - 1).map((s) => normaliza(s.limpo).replace(/;$/, ""));
g.gate("ensaio_preserva_os_21_statements_do_fluxo", rt, esperado);
g.gate("ensaio_nao_contem_commit", /\bcommit\b/i.test(ensaio.replace(/^--.*$/gm, "")), false);
g.gate("ensaio_termina_em_rollback", ensaio.trimEnd().endsWith("ROLLBACK;"), true);
// O portão que faltava: parsear o que VAI PARA O CANAL e exigir que o ROLLBACK seja um statement só,
// terminado. Foi exactamente isto que o banco me devolveu como erro — o instrumento não sabia perguntar.
const stEnsaio = statements(ensaio).filter((s) => s.limpo);
g.gate("ensaio_23_statements", stEnsaio.length, 23);
g.gate("ensaio_sem_statements_soltos", stEnsaio.filter((s) => !s.pontoEVirgula).map((s) => s.limpo.slice(0, 40)), []);
g.gate("ensaio_rollback_e_statement_terminado_a_sonda_e_o_anterior",
  [stEnsaio.at(-1).limpo.replace(/;$/, "").toUpperCase(), stEnsaio.at(-2).limpo.trim().split(/\s+/)[0].toLowerCase()],
  ["ROLLBACK", "select"]);
out.ensaio = { bytes: ensaio.length, statements_antes_da_sonda: ap.length - 1, md5: md5(ensaio) };

// ───────────── 1) estado ANTES (linha de base do banco neste instante) ─────────────
// Duas medidas independentes do mesmo facto: o contador SQL (ARE com fronteira, `RX_CHAMADA_PRIVILEGIADA`)
// e esta contagem cláusula a cláusula em JS. Se alguém voltar a afrouxar o instrumento para um `like`
// de substring, as duas divergem e os portões `*_igual_clausula_a_clausula_*` ficam vermelhos — a
// armadilha 15/11-c dava 9 contra 11 e nada no ensaio o dizia.
const livresJs = (v) => v.polisticas.filter((p) => p.roles_public &&
  [p.qual, p.with_check].filter(Boolean).every((t) => chamadaEm(t).length === 0)).length;
const antes = (await sql(sondaSql()))[0].veredito;
out.antes = { pegada: antes.pegada, contagens: antes.contagens, public_sem_privilegio: antes.public_sem_chamada_privilegiada,
  wrappers: (antes.wrappers || []).map((w) => w.nome) };
g.gate("antes_pegada_igual_preflight", antes.pegada, PRE.pegada);
g.gate("antes_wrappers_nao_existem", (antes.wrappers || []).length, 0);
g.gate("antes_zero_public_livres_de_privilegio", antes.public_sem_chamada_privilegiada, 0);
g.gate("antes_contador_sonda_igual_clausula_a_clausula", antes.public_sem_chamada_privilegiada, livresJs(antes));

// ───────────── 2) o ensaio: uma transacção, sonda lá dentro, rollback ─────────────
let dentro;
try {
  dentro = (await sql(ensaio))[0].veredito;
} catch (e) {
  out.ensaio_falhou = String(e.message).slice(0, 500);
}
// Rebentar no canal É uma falha de portão, não uma linha vermelha fora da contagem: a 15/11 a passada
// imprimiu «0 falha(s) de 12» enquanto o ensaio abortava em 42601.
g.gate("ensaio_nao_rebenta", out.ensaio_falhou ?? "sem_erro", "sem_erro");
if (!dentro) {
  const depois = (await sql(sondaSql()))[0].veredito;
  g.gate("fallback_rollback_total_pegada_igual", depois.pegada, antes.pegada);
  g.gate("fallback_rollback_total_policies_iguais", depois.polisticas, antes.polisticas);
  g.gate("fallback_rollback_total_wrappers_iguais", (depois.wrappers || []).length, (antes.wrappers || []).length);
  out.portoes = g.resumo();
  writeFileSync(ARTEFACTO, JSON.stringify(out, null, 2) + "\n");
  const { falhas, portoes } = g.resumo();
  for (const f of falhas) console.log("VERMELHO  " + f);
  console.log(`RM68_DRYRUN_VERMELHA ${falhas.length} falha(s) de ${portoes} portões · artefacto ${ARTEFACTO}`);
  process.exit(1);
}
out.dentro = {
  pegada: dentro.pegada,
  public_sem_privilegio: dentro.public_sem_chamada_privilegiada,
  wrappers: dentro.wrappers,
  total_polisticas: dentro.polisticas.length,
  public_polisticas: dentro.polisticas.filter((p) => p.roles_public).length,
};

const nom = (p) => `${p.t}.${p.n}`;
const publicasDentro = dentro.polisticas.filter((p) => p.roles_public);
const antesMap = new Map(antes.polisticas.map((p) => [nom(p), p]));

// O veredicto da candidata: as 11 PUBLIC ficam LIVRES de chamada privilegiada e passam a chamar o wrapper.
g.gate("dentro_11_public", publicasDentro.length, 11);
g.gate("dentro_as_11_livres_de_privilegio",
  publicasDentro.filter((p) => [p.qual, p.with_check].filter(Boolean).some((t) => chamadaEm(t).length > 0)).map(nom), []);
g.gate("dentro_as_11_chamam_wrapper",
  publicasDentro.filter((p) => ![p.qual, p.with_check].filter(Boolean).some((t) => /bfr_rls_/.test(t))).map(nom), []);
g.gate("dentro_contador_public_livres_e_11", dentro.public_sem_chamada_privilegiada, 11);
g.gate("dentro_contador_sonda_igual_clausula_a_clausula", dentro.public_sem_chamada_privilegiada, livresJs(dentro));

// As 12 do papel `authenticated` não podem ter mudado UM byte — a candidata só toca nas PUBLIC.
const tocadas = dentro.polisticas.filter((p) => !p.roles_public && JSON.stringify(p) !== JSON.stringify(antesMap.get(nom(p))));
g.gate("dentro_nenhuma_policies_de_papel_alterada", tocadas.map(nom), []);
g.gate("dentro_total_polisticas_intacto", dentro.polisticas.length, antes.polisticas.length);

// Os três wrappers: SECURITY DEFINER, com search_path preso, executáveis por anon e NÃO públicos.
const w = Object.fromEntries((dentro.wrappers || []).map((x) => [x.nome, x]));
g.gate("dentro_3_wrappers_existem", Object.keys(w).sort(), [...WRAPPERS].sort());
for (const nome of WRAPPERS) {
  g.gate(`wrapper_${nome}_definer`, w[nome] && w[nome].definer, true);
  g.gate(`wrapper_${nome}_search_path_preso`, /search_path=(?:'?public'?|"?pg_temp"?)[,\s]*"?pg_temp"?/.test((w[nome] || {}).config || ""), true);
  g.gate(`wrapper_${nome}_anon_execute`, w[nome] && w[nome].anon_exec, true);
  g.gate(`wrapper_${nome}_authenticated_execute`, w[nome] && w[nome].auth_exec, true);
  g.gate(`wrapper_${nome}_nao_e_publico`, w[nome] && w[nome].publico_exec, false);
  g.gate(`wrapper_${nome}_dono_postgres`, w[nome] && w[nome].dono, "postgres");
}
// O revoke não tira o privilégio de quem já o tinha por papel, e os papéis legados ficam como estavam.
g.gate("dentro_anon_legado_inalterado",
  [dentro.anon_legado_current_role, dentro.anon_legado_is_developer, dentro.anon_le_staff_schools],
  [antes.anon_legado_current_role, antes.anon_legado_is_developer, antes.anon_le_staff_schools]);
g.gate("dentro_pegada_nao_muda_funcao_nao_e_pg_class", dentro.pegada, antes.pegada);
g.gate("dentro_contagens_intactas", dentro.contagens, antes.contagens);

// ───────────── 3) depois do rollback: tem de ser o ANTES, byte a byte ─────────────
const depois = (await sql(sondaSql()))[0].veredito;
out.depois = { pegada: depois.pegada, public_sem_privilegio: depois.public_sem_chamada_privilegiada,
  wrappers: (depois.wrappers || []).map((x) => x.nome), contagens: depois.contagens };
g.gate("rollback_devolve_pegada", depois.pegada, antes.pegada);
g.gate("rollback_devolve_as_23_policies_byte_a_byte", depois.polisticas, antes.polisticas);
g.gate("rollback_devolve_os_3_privilegios_anon",
  [depois.anon_legado_current_role, depois.anon_legado_is_developer, depois.anon_le_staff_schools],
  [antes.anon_legado_current_role, antes.anon_legado_is_developer, antes.anon_le_staff_schools]);
g.gate("rollback_apaga_os_wrappers", (depois.wrappers || []).length, 0);
g.gate("rollback_devolve_zero_public_livres", depois.public_sem_chamada_privilegiada, 0);
g.gate("rollback_contador_sonda_igual_clausula_a_clausula", depois.public_sem_chamada_privilegiada, livresJs(depois));
g.gate("rollback_devolve_as_contagens", depois.contagens, antes.contagens);
// Régua cruzada com o censo gravado antes do ciclo: as 11 PUBLIC voltaram ao texto do recon de 15/11.
const reconPub = new Map(ANTES.policies.filter((p) => p.roles === null).map((p) => [p.policyname, p]));
const textoAtual = new Map(depois.polisticas.filter((p) => p.roles_public).map((p) => [p.n, p]));
g.gate("rollback_texto_igual_ao_censo_de_15_11",
  [...reconPub.keys()].filter((n) => {
    const a = reconPub.get(n), b = textoAtual.get(n);
    return !b || a.qual !== b.qual || (a.with_check ?? null) !== (b.with_check ?? null);
  }), []);
g.gate("baseline_de_linhas_igual_a_do_preflight", depois.contagens, PRE.contagens_baseline);
out.portoes = g.resumo();
const { portoes, falhas } = g.resumo();
writeFileSync(ARTEFACTO, JSON.stringify(out, null, 2) + "\n");
for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`ensaio: ${out.ensaio.statements_antes_da_sonda + 2} statements, ${out.ensaio.bytes} B, md5 ${out.ensaio.md5}`);
console.log(`dentro: ${out.dentro.public_polisticas} PUBLIC livres=${out.dentro.public_sem_privilegio}, wrappers ${JSON.stringify(out.dentro.wrappers.map((x) => `${x.nome}:def=${x.definer}/anon=${x.anon_exec}/pub=${x.publico_exec}/cfg=${x.config}`))}`);
console.log(`depois do rollback: pegada ${depois.pegada.total}/${depois.pegada.hash.slice(0, 12)}, wrappers ${out.depois.wrappers.length}, livres ${out.depois.public_sem_privilegio}`);
if (falhas.length === 0) { console.log(`RM68_DRYRUN_VERDE ${portoes} portões / 0 falhas · artefacto ${ARTEFACTO}`); process.exit(0); }
console.log(`RM68_DRYRUN_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
