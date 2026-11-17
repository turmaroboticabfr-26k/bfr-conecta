import { readFileSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const valor = readFileSync(homedir() + "/.github-pat", "latin1").trim();
const url = spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "latin1" }).stdout.trim();
const partes = url.split("/");
const nomeRepo = partes[partes.length - 1].replace(/\.git$/, "");
const nomeOrg = partes[partes.length - 2];
console.log("md5_do_guardado=" + createHash("md5").update(valor).digest("hex"));
console.log("md5_do_nome_do_repo=" + createHash("md5").update(nomeRepo).digest("hex"));
console.log("md5_do_nome_da_org=" + createHash("md5").update(nomeOrg).digest("hex"));
console.log("IGUAL_AO_REPO=" + (valor === nomeRepo));
console.log("IGUAL_A_ORG=" + (valor === nomeOrg));
console.log("COMPRIMENTO=" + valor.length);

const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };
const rejeicao = ["protocol=https", "host=github.com", "username=x-access-token", `password=${valor}`, "", ""].join("\n");
const r = spawnSync("git", ["credential", "reject"], { encoding: "latin1", env, input: rejeicao });
console.log("REJECT_exit=" + r.status);

rmSync(homedir() + "/.github-pat");
console.log("STASH_REMOVIDO=" + !existsSync(homedir() + "/.github-pat"));
