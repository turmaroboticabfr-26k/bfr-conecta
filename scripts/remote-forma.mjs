import { execFileSync } from "node:child_process";

const url = execFileSync("git", ["config", "--get", "remote.origin.url"], { encoding: "latin1" }).trim();
const m = /^(https?):\/\/([^@]*)@(.+)$/.exec(url);
if (!m) {
  console.log("TEM_CREDENTIAL=false");
  console.log("URL_REDIGIDO=" + url);
  process.exit(0);
}
const scheme = m[1];
const userinfo = m[2];
const resto = m[3];
const partes = userinfo.split(":");
console.log("TEM_CREDENTIAL=true");
console.log("ESQUEMA=" + scheme);
console.log("USERINFO_CAMPOS=" + partes.length);
console.log("CAMPO_A_LEN=" + partes[0].length);
console.log("CAMPO_B_LEN=" + (partes.length > 1 ? partes[1].length : 0));
console.log("CAMPO_B_EVAZIO=" + (partes.length > 1 ? partes[1] === "" : "nao_ha_segundo_campo"));
console.log("HOST_E_CAMINHO=" + resto);
