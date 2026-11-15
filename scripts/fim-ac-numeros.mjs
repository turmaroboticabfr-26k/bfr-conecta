#!/usr/bin/env node
// FIM-2: lê dos artefactos em disco os números que a §AC cita. Somente leitura.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => JSON.parse(readFileSync(join(DIR, p), "utf8"));
const a = R("evidence/fim-ciclo-recon-15-11.json");
const b = R("evidence/fim-ciclo-recon-15-11b.json");
const s = R("evidence/fim-sonda-polroles-15-11.json");
const out = {
  run1: {
    em: a.em,
    exit: a.exit ?? "(sem campo)",
    publicas_no_artefacto: a.politics?.publicas_no_artefacto ?? a.publicas_no_artefacto,
    publicas_vivas: a.politics?.publicas_vivas ?? a.publicas_vivas,
    texto_md5_vivo: a.politics?.texto_md5_vivo ?? a.texto_md5_vivo,
    texto_md5_artefacto: a.politics?.texto_md5_artefacto ?? a.texto_md5_artefacto,
    igual: a.politics?.igual ?? a.igual,
    diferencas_n: (a.politics?.diferencas ?? a.diferencas ?? []).length,
    chaves: Object.keys(a),
  },
  run2: {
    em: b.em,
    publicas_no_artefacto: b.publicas_no_artefacto,
    publicas_vivas: b.publicas_vivas,
    texto_md5_artefacto: b.texto_md5_artefacto,
    texto_md5_vivo: b.texto_md5_vivo,
    igual: b.igual,
    diferencas: b.diferencas,
    falhas_n: (b.falhas ?? []).length,
    artefacto_antes: b.artefacto_antes,
    contagens_exatas: b.contagens_exatas,
    rm68_privilegios_n: (b.rm68_privilegios ?? []).length,
    staff_schools_anon_select: b.staff_schools_anon_select,
    rm13_aparelho: b.rm13_aparelho,
    contas_test_local_vivas: b.contas_test_local_vivas,
    supervision_audit_residuo: b.supervision_audit_residuo,
    vistas: b.vistas_sports_public,
    chaves: Object.keys(b),
  },
  sonda: s,
};
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
