import { spawnSync } from "node:child_process";

const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };
const run = (label, args, input) => {
  const r = spawnSync("git", args, { encoding: "latin1", env, input });
  const saida = r.stdout || "";
  const campos = saida.split("\n").filter((l) => /^(username|password)=/.test(l));
  const rel = (saida + (r.stderr || "")).replace(/(https?:\/\/)[^@\s/]*@/g, "$1REDACTED@");
  console.log(label + " exit=" + r.status + " campos=" + campos.length);
  for (const l of campos) {
    const i = l.indexOf("=");
    console.log("   campo=" + l.slice(0, i) + " len=" + (l.length - i - 1));
  }
  const erros = rel.split("\n").filter((l) => /fatal|error|cannot|prompt/i.test(l)).slice(0, 3);
  for (const e of erros) console.log("   stderr=" + e.trim());
};

run("FILL_sem_username", ["credential", "fill"], "protocol=https\nhost=github.com\n\n");
run("FILL_com_username", ["credential", "fill"], "protocol=https\nhost=github.com\nusername=x-access-token\n\n");
run("PUSH_DRYRUN", ["push", "--dry-run", "origin", "main"], "");
