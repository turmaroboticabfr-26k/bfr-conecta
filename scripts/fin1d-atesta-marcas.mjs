// FIN-1d — SOMENTE LEITURA: atesta cada marcador usado no censo FIN-1c contra artefactos de disco.
// Regra da casa: um marcador tem de virar uma STRING EXATA lida de um artefacto (diário, candidata,
// src, worker), não da memória. Aqui o censo é por substring fixa (sem regex), sobre:
//   (a) os literais `const HTML` decodificados de cada worker-deploy-* sobrevivente,
//   (b) os HTML de disco (ar-shell.html, _v115-ar-live.html, src/*, candidatas/*),
//   (c) os diários JSON/MD de evidence/ + raiz + docs que citem a vaga do marcador.
// Artefacto: evidence/fin1d-atesta-marcas.json
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const md5 = (b) => createHash("md5").update(b).digest("hex");
const conta = (t, fixa) => { let n = 0, i = 0; while ((i = t.indexOf(fixa, i)) !== -1) { n++; i += fixa.length; } return n; };

const MARCAS = [
  "loadSchoolContent",
  "schoolContent.loading",
  "displayName(",
  "custom_display_name",
  "partialMsg",
  "if (state.loading) return;",
  "!state.loaded || !state.linked",
  "sports_schools(name)",
  "bindTrigger",
  "dispatchEvent(new MouseEvent(",
  "bfr:app-ready",
  "escola-historia",
];

const dirs = readdirSync(".").filter((d) => { try { return statSync(d).isDirectory() && /^worker-deploy-v\d+/.test(d); } catch { return false; } }).sort();

const literais = [];
const falhas = [];
for (const d of dirs) {
  const w = readFileSync(`${d}/worker.mjs`, "utf8");
  const linha = w.split("\n").find((l) => /^\s*const\s+HTML\s*=/.test(l));
  if (!linha) { falhas.push({ dir: d, motivo: "sem linha `const HTML =`" }); continue; }
  const expr = linha.replace(/^\s*const\s+HTML\s*=/, "").replace(/;\s*$/, "").trim();
  let html = null;
  for (const t of [expr, expr.replace(/^(['`])/, '"').replace(/(['`])$/, '"')]) { try { html = JSON.parse(t); break; } catch { } }
  if (html === null) { falhas.push({ dir: d, motivo: "JSON.parse falhou", delimitador: expr[0], bytes_linha: linha.length, cabe: expr.slice(0, 90), cauda: expr.slice(-40) }); continue; }
  const b = Buffer.from(html, "utf8");
  literais.push({ dir: d, bytes: b.length, md5: md5(b), texto: html });
}

const fontes = [];
for (const l of literais) fontes.push({ nome: `${l.dir}/worker.mjs :: const HTML`, texto: l.texto });
for (const f of ["ar-shell.html", "_v115-ar-live.html"]) {
  try { fontes.push({ nome: f, texto: readFileSync(f, "utf8") }); } catch { }
}
const varredura_dirs = ["bfr-v115-src", "bfr-v116-src", "bfr-candidata-v114-supervisao", "bfr-candidata-v115-supervisao-embed", "app"];
for (const d of varredura_dirs) {
  let ents; try { ents = readdirSync(d, { withFileTypes: true, recursive: true }); } catch { continue; }
  for (const e of ents) {
    if (!e.isFile()) continue;
    const p = `${e.parentPath ?? e.path}/${e.name}`;
    if (!/\.(html|js|mjs)$/i.test(e.name)) continue;
    try { fontes.push({ nome: p, texto: readFileSync(p, "utf8") }); } catch { }
  }
}

const tabela = MARCAS.map((m) => {
  const hits = fontes.filter((f) => conta(f.texto, m) > 0).map((f) => ({ fonte: f.nome, ocorrencias: conta(f.texto, m) }));
  return { marcador: m, fontes_com_marcador: hits.length, atestado_em_disco: hits.length > 0, exemplos: hits.slice(0, 12) };
});

// Diários que falam das vagas antigas: onde o marcador deveria ter sido emitido.
const diarios = [];
for (const d of [".", "evidence"]) {
  let ents; try { ents = readdirSync(d); } catch { continue; }
  for (const f of ents) {
    if (!/^(audit-|confere-|prova-|prepara-|i77-|.*v1\d\d.*\.json)$/i.test(f)) continue;
    let st; try { st = statSync(`${d}/${f}`); } catch { continue; }
    if (!st.isFile()) continue;
    const t = readFileSync(`${d}/${f}`, "utf8");
    const onde = MARCAS.filter((m) => conta(t, m) > 0);
    if (onde.length) diarios.push({ arquivo: `${d}/${f}`, bytes: st.size, marcadores: onde });
  }
}

const out = {
  em: new Date().toISOString(),
  tarefa: "FIN-1d atestar marcadores do censo",
  metodo: "somente leitura, substring fixa",
  literais_html_decodificados: literais.map((l) => ({ dir: l.dir, bytes: l.bytes, md5: l.md5 })),
  falhas_de_decodificacao: falhas,
  fontes_varridas: fontes.length,
  marcas: tabela,
  diarios_com_marcador: diarios,
};
writeFileSync("evidence/fin1d-atesta-marcas.json", JSON.stringify(out, null, 2) + "\n");

console.log(`literais decodificados: ${literais.length} · falhas: ${falhas.length} · fontes varridas: ${fontes.length} · diarios citados: ${diarios.length}`);
for (const f of falhas) console.log(`  FALHA ${f.dir}: ${f.motivo} del=${JSON.stringify(f.delimitador)} bytes_linha=${f.bytes_linha} cabe=${JSON.stringify(f.cabe || "")}`);
console.log("");
for (const t of tabela) console.log(`${t.atestado_em_disco ? "ATESTADO " : "NAO-ATEST"} ${t.marcador}  fontes=${t.fontes_com_marcador}  ${t.exemplos.map((e) => `${e.fonte}:${e.ocorrencias}`).slice(0, 4).join(" | ")}`);
