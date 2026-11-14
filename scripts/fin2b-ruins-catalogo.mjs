// FIN-2b — SOMENTE LEITURA. Lê evidence/fin2a-censo-embeds.json e explica cada consulta RUIM do ar
// contra o CATÁLOGO do banco: a relação existe? a coluna existe? a FK existe? Nada é inferido de nome:
// cada veredito vem de um SELECT de pg_catalog na mesma passada.
// Artefacto: evidence/fin2b-ruins-catalogo.json
import { readFileSync, writeFileSync } from "node:fs";
import { sql } from "./c2-lib.mjs";

const censo = JSON.parse(readFileSync("evidence/fin2a-censo-embeds.json", "utf8"));
const ruins = censo.sonda.ruins;
const out = {
  em: new Date().toISOString(),
  tarefa: "FIN-2b explicar as consultas ruins do ar pelo catálogo",
  metodo: "somente leitura (SELECT de pg_catalog/pg_metadata)",
  origem: "evidence/fin2a-censo-embeds.json",
  ar: censo.ar,
  total_pares: censo.sonda.total, ruins: ruins.length,
};

const tabelas = [...new Set(ruins.map((x) => x.de))];
out.existencia = await sql(`
  select c.relname as relacao, c.relkind as tipo, n.nspname as esquema
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any(array[${tabelas.map((t) => `'${t}'`).join(",")}])
   order by c.relname`);
out.tabelas_ausentes = tabelas.filter((t) => !out.existencia.some((e) => e.relacao === t));

// Colunas reais das tabelas que EXISTEM e tiveram erro de coluna/relacionamento.
out.colunas = {};
for (const t of tabelas.filter((x) => !out.tabelas_ausentes.includes(x))) {
  out.colunas[t] = (await sql(`
    select column_name, data_type
      from information_schema.columns
     where table_schema = 'public' and table_name = '${t}'
     order by ordinal_position`)).map((c) => c.column_name);
}

// O que cada select pede, e o que falta. É preciso separar no TOPO, sem quebrar dentro de `(...)`:
// um token com parênteses é um EMBED (a relação que o PostgREST procura), um token nu é uma COLUNA.
// Splitar por vírgula a seco libera `phone` de dentro de `profiles(full_name,phone,email)` e o
// portão acusaria uma coluna ausente que na verdade pertence a `profiles` — ruído de instrumento.
const dividir_top = (s) => {
  const partes = []; let cur = "", prof = 0;
  for (const ch of s) {
    if (ch === "(") prof++;
    else if (ch === ")") prof = Math.max(0, prof - 1);
    if (ch === "," && prof === 0) { partes.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  partes.push(cur.trim());
  return partes.filter(Boolean);
};
const embed_de = (t) => (t.match(/^([a-zA-Z_0-9]+)\(/) || [])[1] || null;
out.pedes_em_falta = {};
out.emeds_pedidos = {};
for (const x of ruins) {
  if (out.tabelas_ausentes.includes(x.de)) {
    out.pedes_em_falta[x.de] = "RELACAO_INEXISTENTE";
    out.emeds_pedidos[x.de] = [];
    continue;
  }
  const tem = out.colunas[x.de] || [];
  const tokens = [...new Set(dividir_top(x.select))];
  out.emeds_pedidos[x.de] = [...new Set(tokens.map(embed_de).filter(Boolean))];
  const nuas = tokens.filter((t) => !t.includes("(") && !tem.includes(t));
  out.pedes_em_falta[x.de] = out.pedes_em_falta[x.de] || {};
  for (const p of nuas) (out.pedes_em_falta[x.de][p] ||= []).push(x.select.slice(0, 90));
}

// FKs que saem de cada tabela ruim (é o que o embed do PostgREST procura).
out.fks_de = {};
for (const t of tabelas.filter((x) => !out.tabelas_ausentes.includes(x))) {
  out.fks_de[t] = await sql(`
    select con.conname as fk, con.confrelid::regclass::text as para,
           (select string_agg(a.attname, ',' order by x.ord)
              from unnest(con.conkey) with ordinality x(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = x.attnum) as colunas_locais
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = '${t}' and con.contype = 'f'
     order by con.conname`);
}
// E quem aponta para profiles / schools (o embed pedido é desses lados).
out.fks_para = {};
for (const alvo of ["profiles", "schools", "sports_schools", "classes"]) {
  out.fks_para[alvo] = await sql(`
    select n2.nspname || '.' || c2.relname as de_onde, con.conname as fk,
           (select string_agg(a.attname, ',' order by x.ord)
              from unnest(con.conkey) with ordinality x(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = x.attnum) as colunas_locais
      from pg_constraint con
      join pg_class c2 on c2.oid = con.conrelid
      join pg_namespace n2 on n2.oid = c2.relnamespace
      join pg_class ct on ct.oid = con.confrelid
      join pg_namespace nt on nt.oid = ct.relnamespace
     where nt.nspname = 'public' and ct.relname = '${alvo}'
     order by de_onde, con.conname`);
}

out.ruins_detalhados = ruins;

const gates = [];
const G = (nome, dado, esperado) => gates.push({ nome, dado, esperado, ok: JSON.stringify(dado) === JSON.stringify(esperado) });
// `confrelid::regclass::text` sai SEM o prefixo do esquema quando este está no search_path: a régua
// compara o nome pelado, nunca a notação qualificada (senão o portão "não tem FK" passa por inércia).
const pelado = (s) => String(s || "").split(".").pop();
G("teto_de_pares_sondados", censo.sonda.total, 248);
G("tabelas_inexistentes_consultadas_pelo_ar", out.tabelas_ausentes.sort(), ["bfr_school_calendar_days", "bfr_school_calendar_month_targets", "bfr_school_shift_settings"]);
G("supervision_requests_nao_tem_fk_para_schools", out.fks_de.supervision_requests.filter((f) => pelado(f.para) === "schools").length, 0);
G("supervision_requests_tem_fk_para_sports_schools", out.fks_de.supervision_requests.filter((f) => pelado(f.para) === "sports_schools").length, 1);
G("guardian_students_fk_para_profiles_e_ambigua_mais_de_uma", out.fks_de.guardian_students.filter((f) => pelado(f.para) === "profiles").length >= 2, true);
G("guardian_students_tem_coluna_profile_id", (out.colunas.guardian_students || []).includes("profile_id"), true);
// O strip de parênteses é o que separa ruído de instrumento de achado de produto:
G("guardian_students_nenhum_token_nu_em_falta", Object.keys(out.pedes_em_falta.guardian_students || {}), []);
G("supervision_requests_nenhum_token_nu_em_falta", Object.keys(out.pedes_em_falta.supervision_requests || {}), []);
G("announcements_realmente_nao_tem_created_at", (out.colunas.announcements || []).includes("created_at"), false);
out.portoes = { total: gates.length, falhas: gates.filter((g) => !g.ok).map((g) => `${g.nome} dado=${JSON.stringify(g.dado)} esperado=${JSON.stringify(g.esperado)}`) };
writeFileSync("evidence/fin2b-ruins-catalogo.json", JSON.stringify(out, null, 2) + "\n");

console.log(`ar md5 ${out.ar.md5} · ${out.total_pares} pares sondados · ${ruins.length} ruins`);
console.log(`tabelas ausentes: ${out.tabelas_ausentes.join(", ") || "-"}`);
for (const t of Object.keys(out.colunas)) console.log(`  colunas ${t}: ${(out.colunas[t] || []).length}`);
console.log(`  FKs de supervision_requests: ${out.fks_de.supervision_requests.map((f) => `${f.colunas_locais}->${f.para}`).join(" | ")}`);
console.log(`  FKs de guardian_students: ${out.fks_de.guardian_students.map((f) => `${f.colunas_locais}->${f.para}`).join(" | ")}`);
console.log(`  quem aponta para profiles: ${out.fks_para.profiles.length} · schools: ${out.fks_para.schools.length} · sports_schools: ${out.fks_para.sports_schools.length}`);
console.log(`  colunas pedidas em falta: ${JSON.stringify(Object.fromEntries(Object.entries(out.pedes_em_falta).map(([k, v]) => [k, v === "RELACAO_INEXISTENTE" ? v : Object.keys(v)])))}`);
for (const r of out.ruins_detalhados) console.log(`  RUIM ${r.de} :: HTTP ${r.status} ${r.code} :: ${r.mensagem || "(sem mensagem)"} :: ${r.select.slice(0, 100)}`);
console.log(`PORTÃO FIN-2b: ${out.portoes.falhas.length === 0 ? "VERDE" : "VERMELHO"} ${gates.length - out.portoes.falhas.length}/${gates.length}`);
for (const f of out.portoes.falhas) console.log("  vermelho " + f);
process.exit(out.portoes.falhas.length === 0 ? 0 : 1);
