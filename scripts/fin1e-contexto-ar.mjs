// FIN-1e — SOMENTE LEITURA: em vez de contar um marcador, LER o código real do ar em torno de um hit
// medido. Motivo: o FIN-1d provou que 6 dos 12 marcadores do censo não estão atestados em NENHUM
// artefacto de disco (as diárias v107–v113 foram apagadas), logo o vermelho deles é instrumento, não
// produto. A pergunta honesta passa a ser: o que o ar REALMENTE tem no pintor de erro do Meu Espaço
// (item 91) e na query de escolas (v115 -> v116).
// Artefacto: evidence/fin1e-contexto-ar.json
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const AR = "https://bfr-conecta.turmaroboticabfr.workers.dev";
const md5 = (b) => createHash("md5").update(b).digest("hex");
const fixa = (t, s, from = 0) => t.indexOf(s, from);
const todos = (t, s) => { const v = []; let i = 0; while ((i = t.indexOf(s, i)) !== -1) { v.push(i); i += s.length; } return v; };
const janela = (t, i, antes, depois) => t.slice(Math.max(0, i - antes), i + depois);
const linhaDe = (t, i) => t.slice(0, i).split("\n").length;

const r = await fetch(AR + "/", { headers: { "cache-control": "no-cache" } });
const buf = Buffer.from(await r.arrayBuffer());
const txt = buf.toString("utf8");
const out = {
  em: new Date().toISOString(),
  tarefa: "FIN-1e ler o código do ar em torno dos hits medidos",
  metodo: "somente leitura",
  ar: { http: r.status, bytes: buf.length, md5: md5(buf), mesma_do_ar_shell: md5(buf) === md5(readFileSync("ar-shell.html")) },
};

// (1) O pintor de erro do Meu Espaço: âncora é o HIT MEDIDO, não uma string de memória.
const alvo = "!state.loaded || !state.linked";
const hits = todos(txt, alvo);
out.pintor_item91 = {
  alvo, hits: hits.length, posicoes_utf16: hits,
  trecho: hits.map((i) => ({ linha_html: linhaDe(txt, i), contexto: janela(txt, i, 700, 700) })),
};
// Guarda de voo: qualquer retorno cedo dentro da função que declara state.loading.
const sl = todos(txt, "state.loading");
out.guarda_de_voo = {
  ocorrencias_state_loading: sl.length,
  trechos: sl.slice(0, 12).map((i) => ({ linha_html: linhaDe(txt, i), contexto: janela(txt, i, 220, 220) })),
};
// O banner do item 91 existia como «parcial»: procurar por identificadores que o PRÓPRIO ar emite.
out.banner_parcial = {
  padroes: ["partial", "parcial", "state.error", "bfr-student-error", "renderSpace"].map((p) => ({ padrao: p, ocorrencias: todos(txt, p).length })),
};

// (2) A query de escolas: o ar usa `schools(name)`; a v115 usava `sports_schools(name)`.
const q1 = todos(txt, "schools(");
out.query_escolas = {
  ocorrencias_schools_paren: q1.length,
  trechos: q1.slice(0, 10).map((i) => ({ linha_html: linhaDe(txt, i), contexto: janela(txt, i, 260, 260) })),
 Sports: null,
};
out.query_escolas.sports_prefixadas = q1.filter((i) => txt.slice(Math.max(0, i - 7), i) === "sports_").length;
out.query_escolas.nu_sem_prefixo = q1.length - out.query_escolas.sports_prefixadas;

writeFileSync("evidence/fin1e-contexto-ar.json", JSON.stringify(out, null, 2) + "\n");
console.log(`ar HTTP ${out.ar.http} ${out.ar.bytes} B md5 ${out.ar.md5} · igual ao ar-shell.html: ${out.ar.mesma_do_ar_shell}`);
console.log(`pintor item91 \`${alvo}\`: ${hits.length} hit(s)` + hits.map((i) => ` @linha ${linhaDe(txt, i)}`).join(""));
console.log(`state.loading: ${sl.length} ocorrencias · schools(: ${q1.length} (com prefixo sports_ ${out.query_escolas.sports_prefixadas}, nu ${out.query_escolas.nu_sem_prefixo})`);
for (const t of out.banner_parcial.padroes) console.log(`  padrao ${JSON.stringify(t.padrao)}: ${t.ocorrencias}`);
console.log("\n--- trecho do pintor (1º hit) ---");
if (out.pintor_item91.trecho[0]) console.log(out.pintor_item91.trecho[0].contexto.replace(/\n/g, "⏎").slice(0, 1400));
console.log("\n--- 1º trecho de schools( ---");
if (out.query_escolas.trechos[0]) console.log(out.query_escolas.trechos[0].contexto.replace(/\n/g, "⏎").slice(0, 600));
