// Controle negativo do portão de cifras: corrompe o ARTEFACTO (nunca o documento) e exige
// AUDITORIA_VERMELHA + exit 1. Se o portão passar com o artefacto mentiroso, ele não é portão.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();
const TMP = "evidence/.tmp-controle-numeros";
for (const p of ["docs", "scripts", "evidence"]) mkdirSync(`${TMP}/${p}`, { recursive: true });
// Os artefactos que a bancada lê são derivados do próprio rm-audit-numeros.mjs: a lista fixa de antes
// envelheceu a 22/11, quando a fonte das três cifras passou de roadmap-censo-db.json para
// bu4-digestao-para-documentacao-20-11.json e o controle passou a correr contra um mundo sem o ficheiro.
const emisorTxt = readFileSync(`${RAIZ}/scripts/rm-audit-numeros.mjs`, "utf8");
const lidosPelaBancada = [...emisorTxt.matchAll(/fs\.readFileSync\(\s*"([^"]+)"\s*[,)]/g)]
  .map((m) => m[1])
  .filter((p) => /^(docs|evidence)\//.test(p) && p !== "evidence/rm14-suite.json");
if (lidosPelaBancada.length < 3) throw new Error("ABORTA: derivacao leu " + lidosPelaBancada.length + " ficheiros — a lista nao pode ter encolhido para isto");
for (const p of ["scripts/rm-audit-numeros.mjs", ...lidosPelaBancada]) cpSync(`${RAIZ}/${p}`, `${TMP}/${p}`);

const suite = JSON.parse(readFileSync("evidence/rm14-suite.json", "utf8"));
console.log(`artefacto de referência: portoes=${suite.portoes}, falhas=${suite.falhas.length}, alcancaveis=${suite.rls_no_catalogo.alcancaveis}`);
const roda = (muta) => {
  const s = JSON.parse(readFileSync("evidence/rm14-suite.json", "utf8"));
  if (muta) muta(s);
  writeFileSync(`${TMP}/evidence/rm14-suite.json`, JSON.stringify(s, null, 2) + "\n");
  let saida, code = 0;
  try {
    saida = execFileSync(process.execPath, ["scripts/rm-audit-numeros.mjs"], { cwd: TMP, encoding: "utf8" });
  } catch (e) { saida = (e.stdout || "") + (e.stderr || ""); code = e.status; }
  return { saida, code };
};

// controle POSITIVO: com o artefacto honesto a bancada tem de dar verde. Sem isto, uma bancada
// partida (âncora que nunca casa) produziria três «MORDEU» de graça.
const positivo = roda(null);
const bancoOk = positivo.code === 0 && /AUDITORIA_VERDE/.test(positivo.saida);
console.log(`${bancoOk ? "POSITIVO_OK" : "POSITIVO_FRACO"}  artefacto honesto → exit=${positivo.code} · ${positivo.saida.split("\n").filter((l) => /AUDITORIA/.test(l)).join(" | ")}`);

const casos = [
  ["rls_no_catalogo.alcancaveis 168→167", (s) => { s.rls_no_catalogo.alcancaveis = 167; }, "§11"],
  ["portoes 31→30", (s) => { s.portoes = 30; }, "§15 portões"],
  ["falhas []→[x]", (s) => { s.falhas = ["inventada"]; }, "§15 vermelho"],
];
let mordido = 0;
for (const [nome, muta, espera] of casos) {
  const { saida, code } = roda(muta);
  const linhas = saida.split("\n").filter((l) => /^(DIVERGE|AUDITORIA)/.test(l));
  const ver = code === 1 && /AUDITORIA_VERMELHA/.test(saida);
  if (ver) mordido++;
  console.log(`${ver ? "MORDEU   " : "FALHOU   "}${nome.padEnd(36)} exit=${code} · ${linhas.join(" | ") || "(sem DIVERGE)"} · esperado vermelho em ${espera}`);
}
const ok = bancoOk && mordido === casos.length;
console.log(`\n${ok ? "CONTROLE_NEGATIVO_OK" : "CONTROLE_NEGATIVO_FRACO"} positivo ${bancoOk ? "verde" : "VERMELHO"} · ${mordido}/${casos.length} artefactos corrompidos foram pegados`);
rmSync(TMP, { recursive: true, force: true }); // antes do exit: promise .then() não sobrevive ao process.exit()
process.exit(ok ? 0 : 1);
