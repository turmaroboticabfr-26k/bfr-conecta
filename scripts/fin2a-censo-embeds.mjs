// FIN-2a — SOMENTE LEITURA. Duas perguntas, ambas respondidas pelos bytes do ar e pelo PostgREST:
//  (A) O módulo do Meu Espaço (item 91) tem hoje a guarda de voo, o pintor condicionado e o banner
//      parcial? Lê o CORPO da função, não um literal remembered.
//  (B) CENSO DE EMBEDS: todo par `.from('X').select('Y')` que o ar emite é sondado no PostgREST com
//      limit=1. Um embed sem FK dá PGRST200 e o `safeQuery` do app engole o erro em silêncio.
// Uso: node scripts/fin2a-censo-embeds.mjs          → só extrai e conta (sem rede)
//      node scripts/fin2a-censo-embeds.mjs sondar   → extrai, conta e sonda cada par distinto
// Artefacto: evidence/fin2a-censo-embeds.json  (ou -pre.json sem a sondagem)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { HOST } from "./c2-lib.mjs";

const serviceKey = readFileSync("C:/Users/pcmac/.supabase-service-role", "utf8").trim();
const AR = "https://bfr-conecta.turmaroboticabfr.workers.dev";
const SONDAR = process.argv[2] === "sondar";
const md5 = (b) => createHash("md5").update(b).digest("hex");
const linha = (t, i) => t.slice(0, i).split("\n").length;

const r = await fetch(AR + "/", { headers: { "cache-control": "no-cache" } });
const buf = Buffer.from(await r.arrayBuffer());
const txt = buf.toString("utf8");
const out = {
  em: new Date().toISOString(),
  tarefa: "FIN-2a corpo do item 91 + censo de embeds do ar",
  modo: SONDAR ? "extrair e sondar" : "extrair e contar (sem sondar)",
  ar: { http: r.status, bytes: buf.length, md5: md5(buf) },
};

// ---------- (A) o corpo do módulo do aluno ----------
function corpo(t, pos) {
  const abre = t.indexOf("{", pos);
  if (abre < 0) return null;
  let n = 0;
  for (let i = abre; i < t.length; i++) {
    if (t[i] === "{") n++;
    else if (t[i] === "}") { n--; if (n === 0) return t.slice(pos, i + 1); }
  }
  return null;
}
const ancora = txt.indexOf("function renderSpace(") >= 0 ? "function renderSpace(" : "function render() {";
out.item91 = { ancora_usada: ancora, modulo: null, guardas: null };
{
  // O módulo: do `const BFRStudentSpace` (se existir) ou do render que pinta bfr-student-space.
  const p = txt.indexOf("bfr-student-space");
  const inicio = Math.max(0, txt.lastIndexOf("const ", p));
  const fim = txt.indexOf("})();", p);
  const mod = txt.slice(inicio, fim > 0 ? fim + 5 : inicio + 60000);
  const renderP = mod.indexOf("function render()");
  const loadP = mod.indexOf("function load(");
  out.item91 = {
    ancora_usada: "literal 'bfr-student-space' e fatia do módulo",
    bytes_modulo: mod.length,
    render_linha_html: linha(txt, inicio + renderP),
    load_linha_html: loadP >= 0 ? linha(txt, inicio + loadP) : null,
    corpo_load: loadP >= 0 ? corpo(mod, loadP) : null,
    corpo_render: renderP >= 0 ? corpo(mod, renderP) : null,
  };
  const cl = out.item91.corpo_load || "";
  const cr = out.item91.corpo_render || "";
  out.item91.guardas = {
    E1_guarda_de_voo_no_topo_do_load: /^\{[\s\S]{0,120}?if\s*\(\s*state\.loading\s*\)\s*(return|===)/.test(cl),
    E1_qualquer_return_cedo_por_loading: /if\s*\(\s*state\.loading\s*\)\s*return/.test(cl),
    E2_pintor_condicionado: /if\s*\(\s*state\.error\s*&&/.test(cr),
    E2_pintor_incondicional: /if\s*\(\s*state\.error\s*\)\s*\{/.test(cr),
    E3_partialMsg: /partialMsg/.test(mod),
    estado_loading_lido_no_load: /state\.loading\s*=/.test(cl),
    tamanho_corpo_load: cl.length,
    tamanho_corpo_render: cr.length,
  };
}

// ---------- (B) censo de pares from().select() ----------
const RE = /\.from\(\s*(['"])([a-zA-Z_0-9]+)\1\s*\)\s*\.(?:select|count)\(\s*(['"])((?:\\.|(?!\3)[\s\S])*)\3/g;
const pares = new Map();
let m;
while ((m = RE.exec(txt)) !== null) {
  const de = m[2], sel = m[4].replace(/\s+/g, "").trim();
  const chave = `${de}|${sel}`;
  if (!pares.has(chave)) pares.set(chave, { de, select: sel, ocorrencias: 0, primeira_linha: linha(txt, m.index) });
  pares.get(chave).ocorrencias++;
}
const lista = [...pares.values()];
out.censo = {
  pares_distintos: lista.length,
  com_embed: lista.filter((p) => /\([a-zA-Z_,.:()]*\)/.test(p.select)).length,
  tabelas_distintas: new Set(lista.map((p) => p.de)).size,
  por_tabela: Object.fromEntries([...new Set(lista.map((p) => p.de))].map((t) => [t, lista.filter((p) => p.de === t).length])),
};
writeFileSync("evidence/fin2a-extracao.json", JSON.stringify({ em: out.em, ar: out.ar, censo: out.censo, pares: lista }, null, 2) + "\n");
console.log(`ar HTTP ${out.ar.http} ${out.ar.bytes} B md5 ${out.ar.md5}`);
console.log(`item91 guardas: ${JSON.stringify(out.item91.guardas)}`);
console.log(`censo: ${out.censo.pares_distintos} pares distintos em ${out.censo.tabelas_distintas} tabelas · ${out.censo.com_embed} com embed`);
if (!SONDAR) process.exit(0);

const sonda = async (de, sel) => {
  const u = `${HOST}/rest/v1/${de}?select=${encodeURIComponent(sel)}&limit=1`;
  const rr = await fetch(u, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" } });
  const t = await rr.text();
  let j = null; try { j = JSON.parse(t); } catch { }
  return { status: rr.status, code: j?.code ?? null, mensagem: j?.message ? String(j.message).slice(0, 240) : null, linhas: Array.isArray(j) ? j.length : null };
};
const resultados = [];
for (const p of lista) {
  resultados.push({ ...p, sonda: await sonda(p.de, p.select) });
}
const ruins = resultados.filter((x) => x.sonda.status !== 200);
out.sonda = { total: resultados.length, http_200: resultados.length - ruins.length, ruins: ruins.map((x) => ({ de: x.de, select: x.select, status: x.sonda.status, code: x.sonda.code, mensagem: x.sonda.mensagem, primeira_linha: x.primeira_linha, ocorrencias: x.ocorrencias })) };
writeFileSync("evidence/fin2a-censo-embeds.json", JSON.stringify(out, null, 2) + "\n");
console.log(`sonda: ${out.sonda.http_200}/${out.sonda.total} HTTP 200 · ${ruins.length} RUINS`);
for (const x of ruins) console.log(`  ${x.de} | ${x.select.slice(0, 120)} | HTTP ${x.status} ${x.sonda?.code || x.code} @linha ${x.primeira_linha} :: ${x.mensagem ? x.mensagem.slice(0, 110) : ""}`);
