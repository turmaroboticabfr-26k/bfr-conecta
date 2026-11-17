import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

const url = execFileSync("git", ["config", "--get", "remote.origin.url"], { encoding: "latin1" }).trim();
const m = /^(https?):\/\/([^@]*)@(.+)$/.exec(url);
if (!m) {
  console.log("NADA_GUARDADO: o URL ja nao tem credential");
  process.exit(1);
}
const valor = m[2].split(":")[0];
const destino = join(homedir(), ".github-pat");
writeFileSync(destino, valor, { mode: 0o600 });
console.log("ESCRITO=" + destino);
console.log("bytes=" + Buffer.byteLength(valor));
console.log("md5=" + createHash("md5").update(valor).digest("hex"));
