import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";

const url = spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "latin1" }).stdout.trim();
const partes = url.split("/");
const org = partes[partes.length - 2];
const repo = partes[partes.length - 1].replace(/\.git$/, "");
const user = spawnSync("git", ["config", "--get", "credential.username"], { encoding: "latin1" }).stdout.trim();

const grafia = (s) => (s.includes("robotic") ? "OTIC" : s.includes("rob") ? "ITIC" : "INDETERMINADA");
console.log("ORG_do_URL=" + org + " len=" + org.length + " grafia=" + grafia(org));
console.log("REPO_do_URL=" + repo + " len=" + repo.length);
console.log("USERNAME_config=" + user + " len=" + user.length + " grafia=" + grafia(user));
console.log("USERNAME_IGUAL_ORG=" + (user === org));
console.log("md5_ORG=" + createHash("md5").update(org).digest("hex"));
console.log("md5_USERNAME=" + createHash("md5").update(user).digest("hex"));

const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };
const fill = spawnSync("git", ["credential", "fill"], {
  encoding: "latin1",
  env,
  input: ["protocol=https", "host=github.com", "username=" + user, "", ""].join("\n"),
});
console.log("FILL_exit=" + fill.status);
const campos = {};
for (const l of fill.stdout.split("\n").filter(Boolean)) {
  const i = l.indexOf("=");
  campos[l.slice(0, i)] = l.slice(i + 1);
}
const tok = campos.password || "";
console.log("TOKEN_len=" + tok.length + " prefixo4=" + tok.slice(0, 4) + " md5=" + (tok ? createHash("md5").update(tok).digest("hex") : "VAZIO"));

const tmp = "/tmp/apibody_probe.json";
const api = (path) =>
  spawnSync("curl", ["-s", "-o", tmp, "-w", "%{http_code}", "-H", "Authorization: token " + tok, "https://api.github.com" + path], {
    encoding: "latin1",
  }).stdout;
const corpo = () => {
  try {
    return JSON.parse(readFileSync(tmp, "latin1"));
  } catch {
    return {};
  }
};

let code = api("/user");
let j = corpo();
console.log("API_USER_http=" + code + " login=" + j.login + " len=" + String(j.login).length + " grafia=" + grafia(String(j.login)));
console.log("LOGIN_IGUAL_ORG=" + (j.login === org) + " LOGIN_IGUAL_USERNAME=" + (j.login === user));

code = api("/repos/" + org + "/" + repo);
j = corpo();
console.log(
  "REPO_com_org_do_URL_http=" + code +
    " full_name=" + j.full_name +
    " private=" + j.private +
    " push=" + (j.permissions ? j.permissions.push : "n/d") +
    " admin=" + (j.permissions ? j.permissions.admin : "n/d")
);

const outra = org.includes("robotic") ? org.replace("robotic", "rob") + "itic" + org.slice(org.indexOf("robotic") + 7) : org.replace("rob", "robot");
console.log("OUTRA_GRAFIA=" + outra + " len=" + outra.length);
code = api("/repos/" + outra + "/" + repo);
j = corpo();
console.log("REPO_com_org_alternativa_http=" + code + " full_name=" + (j.full_name || "n/d") + " mensagem=" + (j.message || "-"));

if (tok.length > 0) {
  const authOk = api("/user") === "200";
  if (!authOk) {
    console.log("PUSH_dryrun_NAO_EXECUTADO=auth_fora_de_banda_falhou");
  } else {
    const dry = spawnSync("git", ["push", "--dry-run", "origin", "main"], { encoding: "latin1", env });
    console.log("PUSH_dryrun_exit=" + dry.status);
    console.log("PUSH_dryrun_saida=" + String(dry.stderr || dry.stdout).trim().slice(0, 240));
  }
} else {
  console.log("PUSH_dryrun_NAO_EXECUTADO=sem_token_no_fill");
}
try { unlinkSync(tmp); } catch {}
