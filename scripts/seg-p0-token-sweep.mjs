// P0-1: varrer as copias do token do GitHub sem nunca imprimir o valor.
// So conta, prefixo, comprimento e origem. Redaccao com substituicao fixa (nunca \0).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const HOME = process.env.HOME || process.env.USERPROFILE;
const PAT = /(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|ghs_[A-Za-z0-9]{20,}|ghr_[A-Za-z0-9]{20,})/g;

function report(label, text) {
  const hits = [...text.matchAll(PAT)];
  if (hits.length === 0) {
    console.log(`  ${label}: 0`);
    return;
  }
  for (const h of hits) {
    console.log(`  ${label}: SIM — prefixo ${h[1].slice(0, 8)}…, comprimento ${h[1].length}`);
  }
}

console.log('## ficheiros de config do git');
const files = [
  ['local .git/config', path.join(REPO, '.git', 'config'), true],
  ['global ~/.gitconfig', path.join(HOME, '.gitconfig'), false],
  ['global ~/.config/git/config', path.join(HOME, '.config', 'git', 'config'), false],
  ['system Git/etc/gitconfig', 'C:/Program Files/Git/etc/gitconfig', false],
  ['~/.config/gh/hosts.yml', path.join(HOME, '.config', 'gh', 'hosts.yml'), false],
  ['~/.netrc', path.join(HOME, '.netrc'), false],
  ['~/_netrc', path.join(HOME, '_netrc'), false],
  ['~/.npmrc', path.join(HOME, '.npmrc'), false],
  ['~/.git-credentials', path.join(HOME, '.git-credentials'), false],
];
for (const [label, f, mustExist] of files) {
  if (!fs.existsSync(f)) {
    console.log(`  ${label}: (nao existe)`);
    continue;
  }
  report(label, fs.readFileSync(f, 'utf8'));
  if (mustExist) {
    const url = execFileSync('git', ['config', '--get', 'remote.origin.url'], { cwd: REPO, encoding: 'utf8' });
    console.log(`  forma do URL (sem valor): ${url.replace(PAT, 'REDACTED').trim()}`);
    console.log(`  URL casa o padrao user:segredo@host? ${/:\/\/[^@/]+:[^@/]+@/.test(url) ? 'SIM' : 'NAO'}`);
  }
}

console.log('## ambiente (so nomes e comprimentos)');
const keys = Object.keys(process.env).filter((k) => /GH_TOKEN|GITHUB_TOKEN|GH_PAT/i.test(k));
if (keys.length === 0) console.log('  nenhuma variavel GH_TOKEN/GITHUB_TOKEN/GH_PAT');
for (const k of keys) console.log(`  ${k}: definida, comprimento ${process.env[k].length}`);

console.log('## historico do repo (objectos alcancaveis)');
const blobs = execFileSync('git', ['rev-list', '--objects', 'origin/main'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 })
  .trim().split('\n').filter((l) => l.trim());
let achou = 0;
for (const line of blobs) {
  const [sha, p] = [line.split(' ')[0], line.split(' ').slice(1).join(' ')];
  if (!p || /\.(json|ya?ml|env|txt|md|sh|mjs|js|sql|html)$/.test(p) === false) continue;
  let body = '';
  try {
    body = execFileSync('git', ['cat-file', 'blob', sha], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch {
    continue;
  }
  for (const h of body.matchAll(PAT)) {
    achou++;
    console.log(`  no historico: ${p} (prefixo ${h[1].slice(0, 8)}…, comprimento ${h[1].length})`);
  }
}
console.log(`  total de ocorrencias no historico empurrado: ${achou}`);

console.log('## credencial do github ja guardada no Git Credential Manager');
try {
  const list = execFileSync('cmdkey', ['/list'], { encoding: 'utf8' });
  const g = list.split(/\r?\n/).filter((l) => /git(?:hub)?/i.test(l));
  console.log(g.length === 0 ? '  nenhuma entrada com "git" no gatekeeper' : g.map((l) => '  ' + l.trim()).join('\n'));
} catch (e) {
  console.log('  cmdkey indisponivel: ' + e.message.split('\n')[0]);
}
