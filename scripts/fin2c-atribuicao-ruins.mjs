// FIN-2c — SOMENTE LEITURA. Atribui cada forma de consulta RUIM ao código que a emite: a função
// contenedora (procurada para trás no próprio byte offset), se o voo vai dentro de `safeQuery(...)`
// (que engole o erro) e o rótulo que o safeQuery recebeu. Nada é nomeado à mão: o rótulo vem do ar.
// Artefacto: evidence/fin2c-atribuicao-ruins.json
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const txt = readFileSync("ar-shell.html", "utf8");
const md5 = (b) => createHash("md5").update(b).digest("hex");
const censo = JSON.parse(readFileSync("evidence/fin2a-censo-embeds.json", "utf8"));
const ruins = censo.sonda.ruins;
const saida = {
  em: new Date().toISOString(),
  tarefa: "FIN-2c atribuir as consultas ruins do ar ao código que as emite",
  metodo: "somente leitura",
  ar_shell: { bytes: Buffer.byteLength(txt, "utf8"), md5: md5(Buffer.from(txt, "utf8")), igual_ao_ar: md5(Buffer.from(txt, "utf8")) === censo.ar.md5 },
  itens: [],
};

const RE = /\.from\(\s*(['"])([a-zA-Z_0-9]+)\1\s*\)\s*\.(?:select|count)\(\s*(['"])((?:\\.|(?!\3)[\s\S])*)\3/g;
const occ = [];
let m;
while ((m = RE.exec(txt)) !== null) occ.push({ de: m[2], select: m[4].replace(/\s+/g, "").trim(), pos: m.index });
const linha = (i) => txt.slice(0, i).split("\n").length;

const assinatura = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g;
const assin = [];
let a;
while ((a = assinatura.exec(txt)) !== null) assin.push({ nome: a[1] || a[2], pos: a.index });

// O invólucro que dispara o voo é DERIVADO do ar: `rotulo` e `embrulho` vêm do texto imediatamente
// antes do `.from(`, nunca de um nome dactilografado. Assim `request('calendário letivo', …)` e
// `safeQuery('supervisão', …)` entram na mesma régua.
const RE_EMBRULHO = /([A-Za-z_$][\w$]*)\(\s*(['"])([^'"]*)\2\s*,\s*[A-Za-z_$][\w$]*$/;
const corpo = (nome) => {
  for (const re of [new RegExp(`(?:async\\s+)?function\\s+${nome}\\s*\\([^)]*\\)\\s*\\{`),
                    new RegExp(`(?:const|let|var)\\s+${nome}\\s*=\\s*(?:async\\s*)?(?:function\\s*\\([^)]*\\)|\\([^)]*\\))\\s*=>?\\s*\\{`)]) {
    const m = re.exec(txt);
    if (!m) continue;
    const abre = m.index + m[0].length - 1; let prof = 0;
    for (let i = abre; i < txt.length; i++) {
      if (txt[i] === "{") prof++;
      else if (txt[i] === "}") { prof--; if (prof === 0) return txt.slice(m.index, i + 1); }
    }
  }
  return null;
};
const embrulhos = new Map();

for (const x of ruins) {
  const aqui = occ.filter((o) => o.de === x.de && o.select === x.select);
  const cada = aqui.map((o) => {
    const antes = assin.filter((s) => s.pos <= o.pos);
    const envolvente = antes.length ? antes[antes.length - 1].nome : null;
    const cola = txt.slice(Math.max(0, o.pos - 120), o.pos);
    const em = RE_EMBRULHO.exec(cola);
    const embrulho = em ? em[1] : null, rotulo = em ? em[3] : null;
    if (embrulho && !embrulhos.has(embrulho)) {
      const c = corpo(embrulho);
      embrulhos.set(embrulho, c ? { bytes: c.length, tem_catch: /\bcatch\b/.test(c), tem_throw: /\bthrow\b/.test(c),
        devolve_null: /catch\s*\{[^}]*return\s+(null|\[\])/.test(c) } : null);
    }
    const onde = embrulho
      ? (embrulhos.get(embrulho)?.tem_catch ? "engolido_pelo_involuco" : "involuco_relanca")
      : (() => {
          const c = envolvente ? corpo(envolvente) : null;
          return c === null ? "desconhecido" : (/\btry\b/.test(c) && /\bcatch\b/.test(c) ? "catch_na_funcao" : "propaga_sem_catch");
        })();
    const janela = txt.slice(Math.max(0, o.pos - 160), o.pos + 300).replace(/\s+/g, " ");
    const bloco = txt.slice(Math.max(0, o.pos - 1200), o.pos + 1200);
    return {
      linha_html: linha(o.pos),
      envolvente,
      embrulho,
      rotulo,
      erro_para_em: onde,
      trata_erro: /\.catch\(|erro:/.test(bloco) || /catch\s*\(/.test(bloco),
      trecho: janela,
    };
  });
  saida.itens.push({
    de: x.de, select: x.select, http: x.status, code: x.code, mensagem: x.mensagem,
    ocorrencias_no_ar: cada.length, emissores: cada,
  });
}
saida.embrulhos = Object.fromEntries(embrulhos);
const todos = saida.itens.flatMap((i) => i.emissores);
const gates = [];
const G = (nome, dado, esperado) => gates.push({ nome, dado, esperado, ok: JSON.stringify(dado) === JSON.stringify(esperado) });
G("ar_shell_identico_ao_ar", saida.ar_shell.igual_ao_ar, true);
G("toda_forma_ruim_tem_emissao_no_ar", saida.itens.every((i) => i.ocorrencias_no_ar >= 1), true);
G("nenhuma_emissao_sem_classificacao", todos.filter((e) => e.erro_para_em === "desconhecido").length, 0);
G("todo_involuco_tem_corpo_extruido", Object.values(saida.embrulhos).every((v) => v !== null), true);
G("todo_involuco_engole_o_erro", Object.values(saida.embrulhos).every((v) => v.tem_catch), true);
const por_classe = {};
for (const e of todos) por_classe[e.erro_para_em] = (por_classe[e.erro_para_em] || 0) + 1;
const por_code = {};
for (const i of saida.itens) por_code[i.code] = (por_code[i.code] || 0) + i.ocorrencias_no_ar;
G("somatorio_de_emissoes", todos.length, 12);
G("distribuicao_do_erro", Object.entries(por_classe).sort(), [["catch_na_funcao", 4], ["engolido_pelo_involuco", 6], ["propaga_sem_catch", 2]]);
G("somatorio_por_code", Object.entries(por_code).sort(), [["42703", 1], ["PGRST200", 1], ["PGRST201", 5], ["PGRST205", 5]]);
saida.veredito = {
  emissas: todos.length,
  por_classe,
  por_code,
  silenciosas: por_classe["engolido_pelo_involuco"] || 0,
  portoes: { total: gates.length, falhas: gates.filter((g) => !g.ok).map((g) => `${g.nome} dado=${JSON.stringify(g.dado)} esperado=${JSON.stringify(g.esperado)}`) },
};
saida.portoes = saida.veredito.portoes;

writeFileSync("evidence/fin2c-atribuicao-ruins.json", JSON.stringify(saida, null, 2) + "\n");
console.log(`ar-shell.html md5 ${saida.ar_shell.md5} igual_ao_ar=${saida.ar_shell.igual_ao_ar}`);
console.log(`invólucros: ${JSON.stringify(saida.embrulhos)}`);
for (const i of saida.itens) {
  console.log(`\n${i.de} :: HTTP ${i.http} ${i.code} (${i.ocorrencias_no_ar} emissão(ões))`);
  console.log(`   ${String(i.mensagem).slice(0, 150)}`);
  for (const e of i.emissores) console.log(`   @linha ${e.linha_html} · funcao=${e.envolvente} · involuco=${e.embrulho ?? "-"}${e.rotulo ? `("${e.rotulo}")` : ""} · erro_para_em=${e.erro_para_em}`);
}
console.log(`\nveredito: ${JSON.stringify(saida.veredito, null, 1)}`);
process.exit(saida.veredito.portoes.falhas.length === 0 ? 0 : 1);
