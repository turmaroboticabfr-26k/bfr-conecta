import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

// Sondagem da loja de credenciais: so imprime comprimento, classe, md5 e login.
const REDATOR = /(github_pat_[A-Za-z0-9_]{10,}|gh[pousr]_[A-Za-z0-9]{10,})/g;
const mascara = (s) => String(s || "").replace(REDATOR, "REDACTED").slice(0, 160).replace(/\s+/g, " ");

const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };

function fill(username) {
  const input = ["protocol=https", "host=github.com", `username=${username}`, "", ""].join("\n");
  const r = spawnSync("git", ["credential", "fill"], { encoding: "latin1", env, input });
  const campos = {};
  for (const linha of (r.stdout || "").split(/\r?\n/)) {
    const i = linha.indexOf("=");
    if (i > 0) campos[linha.slice(0, i)] = linha.slice(i + 1);
  }
  return { exit: r.status, campos };
}

function classifica(rotulo, username) {
  const { exit, campos } = fill(username);
  const segredo = campos.password || "";
  const devolvido = campos.username || "(nenhum)";
  const classe = /^github_pat_[A-Za-z0-9_]{20,}$/.test(segredo)
    ? "fine-grained"
    : /^gh[pousr]_[A-Za-z0-9]{20,}$/.test(segredo)
      ? "classic"
      : segredo.length === 0
        ? "VAZIO"
        : "NAO_PARECE_TOKEN";
  console.log(`${rotulo} pedido_username=${username} exit=${exit} devolveu_username=${devolvido} len=${segredo.length} classe=${classe} md5=` +
    (segredo ? createHash("md5").update(segredo).digest("hex") : "-"));
  return { segredo, devolvido, classe, exit };
}

const itic = classifica("ITIC", "turmarobiticabfr-26k");
const otic = classifica("OTIC", "turmaroboticabfr-26k");

for (const [rotulo, c] of [["ITIC", itic], ["OTIC", otic]]) {
  if (c.segredo.length === 0) continue;
  const r = spawnSync(
    "curl",
    ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-H", `Authorization: token ${c.segredo}`, "https://api.github.com/user"],
    { encoding: "latin1", shell: false }
  );
  const corpo = spawnSync(
    "curl",
    ["-s", "-H", `Authorization: token ${c.segredo}`, "https://api.github.com/user"],
    { encoding: "latin1" }
  );
  let login = "(sem login)";
  try {
    const j = JSON.parse(corpo.stdout || "{}");
    if (j.login) login = j.login;
    else if (j.message) login = "sem_login(" + mascara(j.message) + ")";
  } catch {
    login = "corpo_nao_json " + mascara(corpo.stdout);
  }
  console.log(`VIVO_${rotulo} http=${(r.stdout || "").trim()} login=${login} stderr=${mascara(r.stderr)}`);
}
