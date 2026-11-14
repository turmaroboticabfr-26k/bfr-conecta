import fs from "node:fs";

const L = fs.readFileSync("docs/roadmap-master.md", "utf8").split(/\r?\n/);
const STATUSES = ["IF", "ICP", "PI", "NI", "NT", "NM", "PF"];
const blocos = {};
let cur = null;

const ini5 = L.findIndex(l => /^## 5\./.test(l));
const fim5 = L.findIndex((l, i) => i > ini5 && /^## 6\./.test(l));
if (ini5 < 0 || fim5 < 0) { console.log("ERRO: marcadores «## 5.»/«## 6.» não encontrados"); process.exit(1); }
for (let i = ini5; i < fim5; i++) {
  const l = L[i];
  const m = l.match(/^### (5\.\d+) (.+)/);
  if (m) {
    cur = m[1];
    blocos[cur] = { nome: m[2].trim(), tot: 0, if_: 0, st: {} };
    continue;
  }
  if (!cur || !l.startsWith("| ")) continue;
  const c = l.split("|").map((x) => x.trim());
  if (c[1] === "ID" || /^[-\s|:]+$/.test(c[1] || "")) continue;
  const s = c[3] || "";
  const k = STATUSES.find((x) => new RegExp("\\b" + x + "\\b").test(s));
  if (!k) continue;
  blocos[cur].tot++;
  blocos[cur].st[k] = (blocos[cur].st[k] || 0) + 1;
  if (k === "IF") blocos[cur].if_++;
}

const revend = {
  "5.1": [7, 8], "5.2": [5, 6], "5.3": [11, 14], "5.4": [8, 9],
  "5.5": [8, 9], "5.6": [8, 9], "5.7": [6, 7], "5.8": [6, 6],
  "5.9": [5, 6], "5.10": [4, 4], "5.11": [3, 5], "5.12": [6, 6],
  "5.13": [2, 2], "5.14": [4, 4], "5.15": [3, 3], "5.16": [6, 6],
};

let somaTot = 0, somaIf = 0, diverg = 0;
const dist = {};
for (const b of Object.values(blocos)) for (const [k, v] of Object.entries(b.st)) dist[k] = (dist[k] || 0) + v;
console.log("DISTRIB §5 (parser): " + STATUSES.map((s) => s + " " + (dist[s] || 0)).join(" · ") +
  " · itens " + Object.values(dist).reduce((a, b) => a + b, 0));
console.log("MOD    nome                            medido(IF/Tot)  tab§15   pct      veredito");
for (const k of Object.keys(blocos)) {
  const b = blocos[k];
  somaTot += b.tot;
  somaIf += b.if_;
  const [c, t] = revend[k] || [-1, -1];
  const ok = c === b.if_ && t === b.tot;
  if (!ok) diverg++;
  console.log(
    k.padEnd(6),
    b.nome.slice(0, 30).padEnd(32),
    (b.if_ + "/" + b.tot).padEnd(15),
    (c + "/" + t).padEnd(8),
    ((100 * b.if_ / b.tot).toFixed(1) + "%").padEnd(8),
    ok ? "OK" : "DIVERGE " + JSON.stringify(b.st)
  );
}
console.log("SOMAS MEDIDAS:", somaIf + "/" + somaTot, "· tabela §15: 92/104 · divergentes:", diverg);

// ─── 2. os números do §15/§9/§11 contra os artefactos de evidência ───────────────
// ─── 2. cada cifra do documento, AMARRADA à linha que a afirma, contra o artefacto ─
// O desenho importa: procurar «176/176» em qualquer ponto do ficheiro não é portão — a cifra pode
// existir numa linha que não é aquela que o indicador usa. Aqui a âncora é a LINHA e o número é
// capturado dela; corromper o artefacto (ou a linha) tem de dar vermelho.
const censo = JSON.parse(fs.readFileSync("evidence/roadmap-censo-db.json", "utf8"));
const suite = JSON.parse(fs.readFileSync("evidence/rm14-suite.json", "utf8"));
const anon = JSON.parse(fs.readFileSync("evidence/rm14-censo-anon.json", "utf8"));
const docTxt = fs.readFileSync("docs/roadmap-master.md", "utf8");
const painelTxt = fs.readFileSync("docs/roadmap-painel.html", "utf8");

const penRows = L.filter((l) => /^\| PEN-\d+ \|/.test(l)).length;
let rmTotal = 0, fase = null;
const rmPorFase = {};
for (const l of L) {
  const m = l.match(/^### (FASE \d)/);
  if (m) { fase = m[1]; rmPorFase[fase] = 0; continue; }
  if (/^## /.test(l)) fase = null;
  if (fase && /^\| RM-\d+\.\d+ \|/.test(l)) { rmPorFase[fase]++; rmTotal++; }
}

// [nome, corpo onde procurar, âncora (regex com 1 captura), valor que o artefacto impõe]
const afirmacoes = [
  ["§15 funcionalidades inventariadas", docTxt, /\| Funcionalidades inventariadas \| (\d+) \|/, somaTot],
  ["§15 IMPLEMENTADO E FUNCIONANDO", docTxt, /\*\*IMPLEMENTADO E FUNCIONANDO\*\* \| (\d+) \(/, somaIf],
  ["§15 pendências registradas", docTxt, /\| Pendências registradas \| (\d+) \(PEN-01/, penRows],
  ["§15 tarefas de roadmap", docTxt, /\| Tarefas de roadmap \| (\d+) \(contadas por parser/, rmTotal],
  ["§15 tabelas com RLS", docTxt, /\| Tabelas com RLS \| (\d+)\/(\d+) /, null],
  ["§15 policies com filtro", docTxt, /\| Policies com filtro \| (\d+)\/(\d+) /, censo.policies[0].com_filtro],
  ["§15 tabelas realtime", docTxt, /\| Tabelas realtime \| (\d+) \|/, censo.realtime[0].tabelas_publicadas],
  ["§15 portões da suite", docTxt, /\(RM-1\.4\) \| (\d+) portões/, suite.portoes],
  ["§15 verde da suite", docTxt, /(\d+) verde \/ (\d+) amarelo/, suite.portoes - suite.falhas.length - suite.lacunas_registradas.length],
  ["§15 vermelho da suite", docTxt, /amarelo .*?\/ (\d+) vermelho/, suite.falhas.length],
  ["§11 tabelas alcançáveis com RLS", docTxt, /(\d+)\/(\d+) tabelas alcançáveis com RLS/, suite.rls_no_catalogo.alcancaveis],
  ["§11 estado do veredicto", docTxt, /`RM14_SUITE_VERDE` — (\d+) verde, \*\*(\d+) amarelo\*\* \(RM14-A1[^\n]*?\), (\d+) vermelho/, null],
  ["§9 relações alcançáveis por anon", docTxt, /(\d+) relações alcançáveis por `anon`/, anon.alcancaveis_anon],
  ["§9 recusadas por privilégio", docTxt, /(\d+) recusadas com 401/, anon.nao_200.length],
  ["painel tarefas por fase", painelTxt, /Roadmap por fases — (\d+) tarefas/, rmTotal],
  ["painel pendências", painelTxt, /Pendências \((\d+) itens · PEN-01/, penRows],
  ["painel IF", painelTxt, /class="tag if">IF<\/span> (\d+) \(/, somaIf],
  ["painel tabelas com RLS", painelTxt, /class="n">(\d+)\/176<\/div><div class="l">tabelas com RLS/, censo.tabelas[0].com_rls],
  ["painel policies", painelTxt, /class="n">(\d+)\/475<\/div><div class="l">policies/, censo.policies[0].com_filtro],
  ["painel suite", painelTxt, new RegExp('class="n">(\\d+)/' + suite.portoes + '</div><div class="l">suite mínima'), suite.portoes - suite.falhas.length - suite.lacunas_registradas.length],
  ["painel progresso", painelTxt, /class="big">(\d+),(\d+)%/, null],
];

let roxos = diverg;
if (diverg) console.log("DIVERGE  " + diverg + " linha(s) de módulos do §15 não condizem com o inventário medido");
for (const [nome, corpo, re, esperadoValor] of afirmacoes) {
  const m = corpo.match(re);
  if (!m) { roxos++; console.log("DIVERGE  " + nome.padEnd(36) + "âncora não encontrada no documento"); continue; }
  const noDoc = Number(m[1]);
  // a linha «Tabelas com RLS» é «a/b» — aí o artefacto impõe ambos os lados
  let esperado = esperadoValor;
  if (nome === "§15 tabelas com RLS") {
    const okLinha = Number(m[1]) === censo.tabelas[0].com_rls && Number(m[2]) === censo.tabelas[0].total;
    if (!okLinha) { roxos++; console.log("DIVERGE  " + nome.padEnd(36) + m[1] + "/" + m[2] + " ≠ " + censo.tabelas[0].com_rls + "/" + censo.tabelas[0].total); }
    else console.log("OK       " + nome.padEnd(36) + "= " + m[1] + "/" + m[2]);
    continue;
  }
  if (nome === "§11 estado do veredicto") {
    const verde = suite.portoes - suite.falhas.length - suite.lacunas_registradas.length;
    const okLinha = Number(m[1]) === verde && Number(m[2]) === suite.lacunas_registradas.length && Number(m[3]) === suite.falhas.length;
    if (!okLinha) { roxos++; console.log("DIVERGE  " + nome.padEnd(36) + m[1] + "/" + m[2] + "/" + m[3] + " ≠ " + verde + "/" + suite.lacunas_registradas.length + "/" + suite.falhas.length); }
    else console.log("OK       " + nome.padEnd(36) + "= " + m[1] + " verde / " + m[2] + " amarelo / " + m[3] + " vermelho");
    continue;
  }
  if (nome === "painel progresso") {
    const noDoc = Number(m[1] + "." + m[2]);
    const okLinha = Math.abs(noDoc - (100 * somaIf) / somaTot) < 0.05;
    if (!okLinha) { roxos++; console.log("DIVERGE  " + nome.padEnd(36) + noDoc + "% ≠ " + ((100 * somaIf) / somaTot).toFixed(1) + "%"); }
    else console.log("OK       " + nome.padEnd(36) + "= " + noDoc + "%");
    continue;
  }
  if (noDoc !== esperado) { roxos++; console.log("DIVERGE  " + nome.padEnd(36) + "documento diz " + noDoc + " · artefacto impõe " + esperado); }
  else console.log("OK       " + nome.padEnd(36) + "= " + noDoc);
}
console.log("\ntarefas RM-x.y por fase (parser): " + JSON.stringify(rmPorFase) + " · total " + rmTotal);
console.log(`cifras amarradas: ${afirmacoes.length} · módulos do §5 conferidos: ${Object.keys(revend).length}`);
console.log(roxos ? "AUDITORIA_VERMELHA " + roxos + " divergência(s)" : "AUDITORIA_VERDE — todas as cifras amarradas às suas linhas batem com os artefactos");
process.exit(roxos ? 1 : 0);
