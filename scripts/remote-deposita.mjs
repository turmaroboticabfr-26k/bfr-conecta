import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const valor = readFileSync(homedir() + "/.github-pat", "latin1").trim();
const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };

const corpo = [
  "protocol=https",
  "host=github.com",
  "username=x-access-token",
  `password=${valor}`,
  "",
  "",
].join("\n");

const a = spawnSync("git", ["credential", "approve"], { encoding: "latin1", env, input: corpo });
console.log("APPROVE_exit=" + a.status);

const f = spawnSync("git", ["credential", "fill"], { encoding: "latin1", env, input: "protocol=https\nhost=github.com\n\n" });
const linhas = (f.stdout || "").split("\n");
let n = 0;
for (const l of linhas) {
  const i = l.indexOf("=");
  if (i > 0 && /^(username|password)$/.test(l.slice(0, i))) {
    n++;
    console.log("  campo=" + l.slice(0, i) + " len=" + (l.length - i - 1));
  }
}
console.log("FILL_exit=" + f.status + " FILL_campos=" + n);
