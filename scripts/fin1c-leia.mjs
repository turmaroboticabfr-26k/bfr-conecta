import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync("evidence/fin1c-linhagem-html.json", "utf8"));
const chaves = Object.keys(j);
console.log("top:", chaves.join(", "));
const lista =
  Array.isArray(j.vagas) ? j.vagas :
  Array.isArray(j.por_diretorio) ? j.por_diretorio :
  Array.isArray(j.unidades) ? j.unidades : null;
if (!lista) {
  for (const k of chaves) {
    const v = j[k];
    console.log(" ", k, Array.isArray(v) ? `[array ${v.length}]` : typeof v === "object" ? `{${Object.keys(v).join(",").slice(0, 160)}}` : JSON.stringify(v).slice(0, 200));
  }
  process.exit(0);
}
for (const d of lista) {
  console.log("=== " + (d.dir || "?") + " md5=" + (d.md5 || "-") + " igual_ao_ar=" + d.igual_ao_ar);
  if (!d.marcas) continue;
  for (const k of Object.keys(d.marcas)) console.log("   " + k + " = " + d.marcas[k]);
}
