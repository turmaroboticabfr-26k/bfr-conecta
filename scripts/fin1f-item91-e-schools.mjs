// FIN-1f — SOMENTE LEITURA. Fecha a pergunta aberta pelo FIN-1d com medição, não com memória.
// (A) Lê o código REAL do ar: o corpo de `load()` e a linha do pintor de erro (item 91).
// (B) Catálogo do banco: que relação existe para `schools` e `sports_schools` e para onde apontam as FKs.
// (C) PostgREST vivo: o embed EXATO que o ar emite (`schools(name)`) resolve ou devolve PGRST202?
// Artefacto: evidence/fin1f-item91-e-schools.json
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sql, HOST } from "./c2-lib.mjs";

const serviceKey = readFileSync("C:/Users/pcmac/.supabase-service-role", "utf8").trim();
const AR = "https://bfr-conecta.turmaroboticabfr.workers.dev";
const md5 = (b) => createHash("md5").update(b).digest("hex");
const todos = (t, s) => { const v = []; let i = 0; while ((i = t.indexOf(s, i)) !== -1) { v.push(i); i += s.length; } return v; };
const linha = (t, i) => t.slice(0, i).split("\n").length;

function corpo(t, posAssinatura) {
  const abre = t.indexOf("{", posAssinatura);
  if (abre < 0) return null;
  let n = 0;
  for (let i = abre; i < t.length; i++) {
    if (t[i] === "{") n++;
    else if (t[i] === "}") { n--; if (n === 0) return { inicio: abre, fim: i, texto: t.slice(posAssinatura, i + 1) }; }
  }
  return null;
}

const r = await fetch(AR + "/", { headers: { "cache-control": "no-cache" } });
const buf = Buffer.from(await r.arrayBuffer());
const txt = buf.toString("utf8");
const out = {
  em: new Date().toISOString(),
  tarefa: "FIN-1f item 91 no ar + relação schools x sports_schools",
  metodo: "somente leitura (GET HTTP, SELECT de catálogo, GET PostgREST)",
  ar: { http: r.status, bytes: buf.length, md5: md5(buf), igual_ao_ar_shell: md5(buf) === md5(readFileSync("ar-shell.html")) },
};

// ---------- (A) item 91 lido do corpo da função ----------
const assinaturas = [...todos(txt, "function load(")].sort((a, b) => a - b);
const vistos = [];
out.item91 = { loads: [], pintor: null, contadores: {} };
for (const p of assinaturas) {
  if (vistos.some((q) => Math.abs(q - p) < 6)) continue;
  vistos.push(p);
  const c = corpo(txt, p);
  if (!c) continue;
  out.item91.loads.push({
    linha_html: linha(txt, p),
    async: txt.slice(Math.max(0, p - 6), p).includes("async"),
    assinatura: c.texto.split("\n")[0].slice(0, 120),
    E1_guarda_state_loading_no_topo: /^function load[^\n]*\{\s*(\/\/[^\n]*\n\s*)*if\s*\(\s*state\.loading\s*\)\s*return\s*;/.test(c.texto),
    primeiros_300: c.texto.slice(0, 300).replace(/\n/g, "⏎"),
    tamanho_chars: c.texto.length,
  });
}
const nu = todos(txt, "if (state.error) {");
const cond = todos(txt, "if (state.error &&");
out.item91.pintor = {
  linhas_state_error_nu: nu.map((i) => linha(txt, i)),
  trecho_state_error_nu: nu.map((i) => txt.slice(i, i + 260).replace(/\n/g, "⏎")),
  linhas_state_error_e_condicao: cond.map((i) => linha(txt, i)),
};
out.item91.contadores = {
  "if (state.error) {": nu.length,
  "if (state.error &&": cond.length,
  "partialMsg": todos(txt, "partialMsg").length,
  "state.loading": todos(txt, "state.loading").length,
  "if (state.loading) return;": todos(txt, "if (state.loading) return;").length,
  "if (state.loading) {": todos(txt, "if (state.loading) {").length,
  "!state.loaded || !state.linked": todos(txt, "!state.loaded || !state.linked").length,
  "bfr-student-error": todos(txt, "bfr-student-error").length,
  "data-student-refresh": todos(txt, "data-student-refresh").length,
};

// ---------- (B) catálogo ----------
out.catalogo = {
  relacoes: await sql(`
    select n.nspname as esquema, c.relname as relacao, c.relkind as tipo
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('schools','sports_schools','supervision_requests','staff_schools')
     order by c.relname`),
  fks_para_schools_ou_sports: await sql(`
    select n2.nspname || '.' || c.relname as de_onde,
           con.conname as fk,
           con.confrelid::regclass::text como_para,
           (select string_agg(a.attname, ',' order by x.ord)
              from unnest(con.conkey) with ordinality x(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = x.attnum) as colunas_locais
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n2 on n2.oid = c.relnamespace
     where con.contype = 'f'
       and con.confrelid in ('public.schools'::regclass, 'public.sports_schools'::regclass)
     order by como_para, de_onde, con.conname`),
  colunas_de_supervision_requests: await sql(`
    select a.attname as coluna, format_type(a.atttypid, a.atttypmod) as tipo, a.attnum
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'supervision_requests'
       and a.attnum > 0 and not a.attisdropped
     order by a.attnum`),
};

// ---------- (C) PostgREST: o embed que o ar emite ----------
async function rest(queryString) {
  const rr = await fetch(`${HOST}/rest/v1/${queryString}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" },
  });
  const t = await rr.text();
  let j = null; try { j = JSON.parse(t); } catch { }
  return {
    status: rr.status,
    code: j?.code ?? null,
    message: j?.message ? String(j.message).slice(0, 300) : null,
    e_lista: Array.isArray(j), e_lista_len: Array.isArray(j) ? j.length : null,
  };
}
out.postgrest = {
  embed_ar_schools: await rest("supervision_requests?select=id,school_id,schools(name)&limit=3"),
  embed_v115_sports: await rest("supervision_requests?select=id,school_id,sports_schools(name)&limit=3"),
  schools_direto: await rest("schools?select=id,name,active&limit=3"),
  sports_schools_direto: await rest("sports_schools?select=id,name&limit=3"),
};

// ---------- veredito com portões ----------
const gates = [];
const G = (nome, dado, esperado) => gates.push({ nome, dado, esperado, ok: JSON.stringify(dado) === JSON.stringify(esperado) });
G("ar_md5_estavel", out.ar.md5, "ae59d35346b685b2fbf9d18ade4fa5cd");
G("schools_existe_como_relacao", out.catalogo.relacoes.map((x) => `${x.relacao}:${x.tipo}`).sort(), ["schools:r", "sports_schools:r", "staff_schools:r", "supervision_requests:r"]);
G("embed_ar_escola_nu_status", out.postgrest.embed_ar_schools.status, 200);
G("embed_v115_status", out.postgrest.embed_v115_sports === undefined ? null : out.postgrest.embed_v115_sports.status, 200);
G("escola_nu_nao_e_PGRST202", out.postgrest.embed_ar_schools.code === "PGRST202", false);
out.veredito = { gates, falhas: gates.filter((g) => !g.ok).length };
writeFileSync("evidence/fin1f-item91-e-schools.json", JSON.stringify(out, null, 2) + "\n");

console.log(`ar HTTP ${out.ar.http} ${out.ar.bytes} B md5 ${out.ar.md5} igual_ao_ar_shell=${out.ar.igual_ao_ar_shell}`);
console.log(`item91: loads=${out.item91.loads.length} · E1 no topo=${out.item91.loads.map((l) => l.E1_guarda_state_loading_no_topo).join(",")}`);
console.log(`        if(state.error){  = ${out.item91.contadores["if (state.error) {"]} nas linhas ${out.item91.pintor.linhas_state_error_nu.join(",")} · if(state.error&& = ${out.item91.contadores["if (state.error &&"]}`);
console.log(`        partialMsg=${out.item91.contadores.partialMsg} · !state.loaded||!state.linked=${out.item91.contadores["!state.loaded || !state.linked"]}`);
console.log(`catálogo: ${out.catalogo.relacoes.map((x) => `${x.relacao}(${x.tipo})`).join(" ")} · FKs para schools/sports: ${out.catalogo.fks_para_schools_ou_sports.length}`);
for (const f of out.catalogo.fks_para_schools_ou_sports.slice(0, 14)) console.log(`   ${f.de_onde}.${f.colunas_locais} -[${f.fk}]-> ${f.como_para}`);
console.log(`postgrest: escolas_nu HTTP ${out.postgrest.embed_ar_schools.status} code=${out.postgrest.embed_ar_schools.code} · v115 HTTP ${out.postgrest.embed_v115_status === undefined ? "?" : out.postgrest.embed_v115_sports.status} code=${out.postgrest.embed_v115_sports.code} · schools ${out.postgrest.schools_direto.status}/${out.postgrest.schools_direto.e_lista_len ?? "-"} · sports_schools ${out.postgrest.sports_schools_direto.status}/${out.postgrest.sports_schools_direto.e_lista_len ?? "-"}`);
if (out.postgrest.embed_ar_schools.message) console.log(`   msg escolas_nu: ${out.postgrest.embed_ar_schools.message}`);
console.log(`PORTÃO FIN-1f: ${out.veredito.falhas === 0 ? "VERDE" : "VERMELHO"} ${gates.filter((g) => g.ok).length}/${gates.length} falhas=${out.veredito.falhas}`);
for (const g of gates.filter((x) => !x.ok)) console.log(`  vermelho ${g.nome} | dado=${JSON.stringify(g.dado)} | esperado=${JSON.stringify(g.esperado)}`);
process.exit(out.veredito.falhas === 0 ? 0 : 1);
