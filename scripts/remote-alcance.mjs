import { spawnSync } from "node:child_process";
import { execFileSync } from "node:child_process";

const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };

// Configuracao de credencial/URL em qualquer ambito (valores de chave, sem segredo).
const cfg = spawnSync("git", ["config", "--show-origin", "--get-regexp", "^(credential|url|http)\\."], {
  encoding: "latin1",
  env,
});
console.log("--- config credential/url/http ---");
for (const linha of (cfg.stdout || "").split(/\r?\n/)) {
  if (!linha.trim()) continue;
  console.log(linha.replace(/(github_pat_|gh[pousr]_)[A-Za-z0-9_]{6,}/g, "$1REDACTED").slice(0, 200));
}

const url = execFileSync("git", ["config", "--get", "remote.origin.url"], { encoding: "latin1" }).trim();
const semEsquema = url.replace(/^https?:\/\//, "").replace(/\.git$/, "");
const [host, ...resto] = semEsquema.split("/");
const caminho = resto.join("/");
console.log(`HOST=${host} CAMINHO=${caminho}`);

const input = ["protocol=https", `host=${host}`, "username=turmaroboticabfr-26k", "", ""].join("\n");
const r = spawnSync("git", ["credential", "fill"], { encoding: "latin1", env, input });
let segredo = "";
for (const linha of (r.stdout || "").split(/\r?\n/)) {
  if (linha.startsWith("password=")) segredo = linha.slice(9);
}
console.log("FILL_exit=" + r.status + " tem_segreto=" + (segredo.length > 0));

if (segredo.length > 0) {
  const corpo = spawnSync(
    "curl",
    ["-s", "-H", `Authorization: Bearer ${segredo}`, `https://api.github.com/repos/${caminho}`],
    { encoding: "latin1" }
  );
  let j = {};
  try {
    j = JSON.parse(corpo.stdout || "{}");
  } catch {}
  const p = j.permissions || {};
  console.log(
    `REPO http_ok=${j.full_name ? 1 : 0} full_name=${j.full_name || "(sem)"} private=${j.private} ` +
      `push=${p.push} admin=${p.admin} message=${(j.message || "").slice(0, 60)}`
  );
  const scopes = spawnSync(
    "curl",
    ["-s", "-o", "/dev/null", "-D", "-", "-H", `Authorization: Bearer ${segredo}`, `https://api.github.com/repos/${caminho}`],
    { encoding: "latin1" }
  );
  const xog = (scopes.stdout || "").split(/\r?\n/).filter((l) => /^x-oauth-scopes:/i.test(l)).join(" ").trim();
  console.log("x-oauth-scopes=" + (xog || "(ausente — fine-grained)"));
}
