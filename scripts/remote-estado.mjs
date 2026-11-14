import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const cfg = readFileSync(".git/config", "latin1");
const url = spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "latin1" }).stdout.trim();
const user = spawnSync("git", ["config", "--get", "credential.username"], { encoding: "latin1" }).stdout.trim();

const userinfo = (url.match(/:\/\/[^@]*@/g) || []).length;
console.log("URL=" + url);
console.log("userinfo_no_url=" + userinfo);
console.log("credential_username=" + user);
console.log("github_pat_guardado_existe=" + existsSync(homedir() + "/.github-pat"));
console.log("url_contem_ghp=" + /ghp_[A-Za-z0-9]{4,}/.test(cfg + url));
