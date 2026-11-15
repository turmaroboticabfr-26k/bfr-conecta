#!/usr/bin/env node
// AD/§AD: re-le os números que a §AC e o bracket do roadmap citam, pelos caminhos ANINHADOS
// correctos. A 1.ª passada (scripts/fim-ac-numeros.mjs) leu `a.publicas_vivas`, `b.falhas`,
// `b.rm68_privilegios.length`, que não existem no topo dos artefactos: saíram por `?? []`
// e o JSON.stringify eliminou os campos. Somente leitura; não sobrescreve.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(DIR, "evidence/fim-ac-numeros-d-15-11.json");
const R = (p) => JSON.parse(readFileSync(join(DIR, p), "utf8"));

if (existsSync(SAIDA)) {
  process.stdout.write("FIM_AC_D_JA_EXISTE " + SAIDA + "\n");
  process.exit(1);
}

const a = R("evidence/fim-ciclo-recon-15-11.json");
const b = R("evidence/fim-ciclo-recon-15-11b.json");
const s = R("evidence/fim-sonda-polroles-15-11.json");
const md5 = (s) => createHash("md5").update(s, "utf8").digest("hex");

const q = (x) => (x === undefined ? "(inexistente no topo)" : x);

const out = {
  em: new Date().toISOString(),
  tarefa:
    "AD/§AD — re-leitura dos números da §AC pelos caminhos aninhados correctos (a 1.ª passada leu o topo)",
  autorizacao: "somente leitura: 0 DDL, 0 escrita, 0 mint, 0 deploy, 0 publicacao, 0 git push",
  caminho_lido_na_1_passada: {
    run1_publicas_vivas: q(a.publicas_vivas),
    run1_texto_md5_vivo: q(a.texto_md5_vivo),
    run2_publicas_vivas: q(b.publicas_vivas),
    run2_falhas_topo: q(b.falhas),
    run2_rm68_privilegios_tipo: typeof b.rm68_privilegios,
    run2_rm68_privilegios_length: q(b.rm68_privilegios?.length),
    nota: "undefined = o campo nao existe no topo; o script antigo caía no `?? []` e devolvia vazio",
  },
  aninhado_real: {
    run1_rm68_publicas: a.rm68_publicas,
    run2_rm68_publicas: b.rm68_publicas,
    run2_privilegios_falhas: b.rm68_privilegios?.falhas,
    run2_staff_schools_anon_select: b.rm68_privilegios?.staff_schools_anon_select,
  },
  assercoes: {
    run1_em: a.em,
    run2_em: b.em,
    publicas_vivas: b.rm68_publicas?.publicas_vivas,
    publicas_no_artefacto: b.rm68_publicas?.publicas_no_artefacto,
    igual: b.rm68_publicas?.igual,
    diferencas_n: (b.rm68_publicas?.diferencas ?? null)?.length,
    texto_md5_igual:
      b.rm68_publicas?.texto_md5_artefacto === b.rm68_publicas?.texto_md5_vivo,
    md5: b.rm68_publicas?.texto_md5_vivo,
    privilegios_falhas_n: (b.rm68_privilegios?.falhas ?? null)?.length,
    subs_totais: b.rm13_aparelho?.subs_totais,
    donos_distintos: b.rm13_aparelho?.donos_distintos,
    coluna_dono: b.rm13_aparelho?.coluna_dono,
    grades: b.contagens_exatas?.grades,
    attendance: b.contagens_exatas?.attendance,
    access_requests: b.contagens_exatas?.access_requests,
    occurrences: b.contagens_exatas?.occurrences,
    contas_s17: b.contas_test_local_vivas,
    supervision_audit_residuo: b.supervision_audit_residuo,
    vistas_n: (b.vistas_sports_public ?? null)?.length,
    vistas_anon_false: (b.vistas_sports_public ?? []).every((v) => v.anon_select === "false"),
    vistas_auth_true: (b.vistas_sports_public ?? []).every((v) => v.auth_select === "true"),
    vistas_modo: [...new Set((b.vistas_sports_public ?? []).map((v) => v.modo))],
    sonda_oid_0: s.PUBLIC_por_oid_0_qualquer,
    sonda_cardinality_0: s.PUBLIC_por_cardinality_0,
    sonda_polroles_null: s.PUBLIC_por_polroles_null,
    sonda_md5: s.policies_md5,
  },
  veredito: {
    publicas_11: b.rm68_publicas?.publicas_vivas === 11,
    md5_byte_identico:
      b.rm68_publicas?.igual === true &&
      b.rm68_publicas?.texto_md5_artefacto === b.rm68_publicas?.texto_md5_vivo &&
      (b.rm68_publicas?.diferencas ?? null)?.length === 0,
    privilegios_sem_falha: (b.rm68_privilegios?.falhas ?? null)?.length === 0,
    push_0: b.rm13_aparelho?.subs_totais === 0 && b.rm13_aparelho?.donos_distintos === 0,
    censos:
      b.contagens_exatas?.grades === 112 &&
      b.contagens_exatas?.attendance === 25 &&
      b.contagens_exatas?.access_requests === 12 &&
      b.contagens_exatas?.occurrences === 0,
    vistas_5_fechadas_para_anon:
      (b.vistas_sports_public ?? []).length === 5 &&
      (b.vistas_sports_public ?? []).every(
        (v) => v.anon_select === "false" && v.auth_select === "true" && v.modo === "sem-opcao",
      ),
  },
  hashes: {
    ficheiro_run1: md5(readFileSync(join(DIR, "evidence/fim-ciclo-recon-15-11.json"), "utf8")),
    ficheiro_run2: md5(readFileSync(join(DIR, "evidence/fim-ciclo-recon-15-11b.json"), "utf8")),
    ficheiro_sonda: md5(readFileSync(join(DIR, "evidence/fim-sonda-polroles-15-11.json"), "utf8")),
  },
};

const N = out.assercoes, V = out.veredito;
process.stdout.write(
  [
    `run1 ${a.em}  run2 ${b.em}`,
    `publicas_vivas(aninhado) ${V.publicas_11 ? "VERDE" : "VERMELHO"} = ${N.publicas_vivas}`,
    `md5_byte_identico ${V.md5_byte_identico ? "VERDE" : "VERMELHO"} ${N.md5}`,
    `privilegios_sem_falha ${V.privilegios_sem_falha ? "VERDE" : "VERMELHO"} n=${N.privilegios_falhas_n}`,
    `push_0 ${V.push_0 ? "VERDE" : "VERMELHO"} subs=${N.subs_totais} donos=${N.donos_distintos}`,
    `censos ${V.censos ? "VERDE" : "VERMELHO"} ${N.grades}/${N.attendance}/${N.access_requests}/${N.occurrences}`,
    `vistas ${V.vistas_5_fechadas_para_anon ? "VERDE" : "VERMELHO"} n=${N.vistas_n} modo=${N.vistas_modo}`,
    `sonda oid_0=${N.sonda_oid_0} cardinality_0=${N.sonda_cardinality_0} null=${N.sonda_polroles_null}`,
    `1_passada_leu_topo: run2.publicas_vivas=${out.caminho_lido_na_1_passada.run2_publicas_vivas} falhas=${out.caminho_lido_na_1_passada.run2_falhas_topo}`,
  ].join("\n") + "\n",
);

const tudoVerde = Object.values(V).every(Boolean);
out.veredito.tudo = tudoVerde;
writeFileSync(SAIDA, JSON.stringify(out, null, 2) + "\n", "utf8");
process.stdout.write(
  (tudoVerde ? "FIM_AC_D_VERDE " : "FIM_AC_D_VERMELHO ") +
    SAIDA +
    " md5 " +
    out.hashes.ficheiro_run2 +
    "\n",
);
