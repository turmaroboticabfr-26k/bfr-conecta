// V119-4 — somente leitura. Confirma POSITIVAMENTE o par de embed que a v119 publica:
// pega todos os pares (de -> select) extraídos dos bytes do ar que envolvem `supervision_requests`
// e sonda cada um no PostgREST com limit=1. Não escreve nada.
// Uso: node scripts/v119-sonda-supervision.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { HOST } from "./c2-lib.mjs";

const serviceKey = readFileSync("C:/Users/pcmac/.supabase-service-role", "utf8").trim();
const out = { em: new Date().toISOString(), tarefa: "V119-4 sonda do embed da Supervizacao nos bytes publicados", portoes: [] };
const gate = (name, ok, detail) => { out.portoes.push({ name, ok, detail }); console.log((ok ? "  verde  " : "  VERMELHO ") + name + "  ::  " + detail); };

const extr = JSON.parse(readFileSync("evidence/fin2a-extracao.json", "utf8"));
out.extracao = { em: extr.em, ar: extr.ar, total_pares: extr.pares.length };

const pares = extr.pares.filter((p) => p.de === "supervision_requests");
gate("pares_supervision_extraidos", pares.length >= 1, `${pares.length} par(es) no ar ${extr.ar.md5}`);

out.sondas = [];
for (const p of pares) {
  const url = `${HOST}/rest/v1/supervision_requests?select=${encodeURIComponent(p.select)}&limit=1`;
  const r = await fetch(url, { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "cache-control": "no-store" } });
  const body = await r.text();
  let code = null;
  try { code = JSON.parse(body)?.code ?? null; } catch {}
  out.sondas.push({ select: p.select, http: r.status, code, corpo: body.slice(0, 200) });
  console.log(`  sonda ${r.status} code=${code ?? "-"} :: ${p.select.slice(0, 120)}`);
}

const bom = out.sondas.find((s) => /sports_schools\(name\)/.test(s.select));
const ruim = out.sondas.find((s) => /(^|,)schools\(name\)/.test(s.select));
gate("par_publicado_devolve_200", !!bom && bom.http === 200, bom ? `sports_schools(name) -> HTTP ${bom.http}` : "nenhum par com sports_schools(name) no ar");
gate("par_antigo_nao_aparece_na_extracao", !ruim, ruim ? `ainda ha um par com schools(name): ${ruim.select}` : "0 pares com schools(name) nu");
const falhas = out.sondas.filter((s) => s.http >= 400);
gate("nenhuma_sonda_de_supervision_falha", falhas.length === 0,
  `sondas=${out.sondas.length} falhas=${falhas.length} [${falhas.map((s) => s.code || s.http).join(", ")}]`);

const ruins = JSON.parse(readFileSync("evidence/fin2a-censo-embeds.json", "utf8")).sonda.ruins;
const supRuin = ruins.filter((r) => r.de === "supervision_requests");
gate("censo_pos_v119_sem_ruina_na_supervision", supRuin.length === 0, `censo: ${ruins.length} ruins no total, ${supRuin.length} em supervision_requests`);

const verdes = out.portoes.filter((p) => p.ok).length;
out.total = out.portoes.length;
out.ruins = out.portoes.length - verdes;
out.veredito = out.ruins === 0 ? "V119_SONDA_VERDE" : "V119_SONDA_VERMELHO";
writeFileSync("evidence/v119-sonda-supervision.json", JSON.stringify(out, null, 2) + "\n");
console.log(`\n${out.veredito}  ${verdes}/${out.portoes.length} portoes, ${out.ruins} vermelhos  ->  evidence/v119-sonda-supervision.json`);
process.exit(out.ruins === 0 ? 0 : 1);
