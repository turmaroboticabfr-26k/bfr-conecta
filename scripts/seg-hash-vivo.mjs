// Pergunta ao git, para cada hash citado num texto, se ainda existe como objeto.
// Depois da reescrita de historia de 10/11 os hashes citados em prosa podem
// apontar para objetos que ja nao existem — mas "nao existe" nao e o mesmo que
// "era um commit morto": o mesmo padrao apanha contagens em bytes, prefixos de
// md5 e fragmentos de UUID de deployment. Nenhum atalho de comprimento resolve
// isso (4293585 e 5385066 so tem digitos e sao refs de commit), por isso o
// instrumento imprime a vizinhanca de cada token morto e a decisao fica marcada.
// A linha crua nunca e impressa: so palavras de letras, sem digitos.
// Uso: node scripts/seg-hash-vivo.mjs <caminho>
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const alvo = process.argv[2];
if (!alvo) {
  console.error("falta o caminho do ficheiro");
  process.exit(2);
}
const texto = readFileSync(alvo, "utf8");
const vistos = new Map();
for (const m of texto.matchAll(/\b[0-9a-f]{7,40}\b/g)) {
  const h = m[0];
  const antes = (texto.slice(Math.max(0, m.index - 40), m.index).match(/[A-Za-z_]{2,}\W*$/) || ["", ""])[0]
    .replace(/\W+$/, "");
  const depois = (texto.slice(m.index + h.length, m.index + h.length + 40).match(/^\W*[A-Za-z_]{2,}/) || ["", ""])[0]
    .replace(/^\W+/, "");
  const info = {
    comp: h.length,
    uuid: texto[m.index + h.length] === "-",
    antes: antes.replace(/[^A-Za-z_]/g, ""),
    depois: depois.replace(/[^A-Za-z_]/g, ""),
  };
  const a = vistos.get(h);
  vistos.set(h, {
    comp: info.comp,
    uuid: (a?.uuid || false) || info.uuid,
    antes: a?.antes || info.antes,
    depois: a?.depois || info.depois,
  });
}
const vivo = [];
const morto = [];
for (const [h, info] of [...vistos].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
  let tipo = "";
  try {
    tipo = execSync(`git cat-file -t ${h}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {}
  if (tipo) vivo.push(`${h}(${tipo})`);
  else morto.push(`${h}[len=${info.comp}${info.uuid ? " uuid" : ""} "${info.antes}→${info.depois}"]`);
}
console.log(`ficheiro=${alvo} tokens=${vistos.size} objetos_vivos=${vivo.length} nao_existem=${morto.length}`);
console.log("VIVOS: " + (vivo.join(" ") || "-"));
console.log("NAO_EXISTEM (decidir pela vizinhanca):");
for (const l of morto) console.log("  " + l);
