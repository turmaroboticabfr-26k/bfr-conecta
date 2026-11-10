// scripts/seg-p0-sonda-push403.mjs
// Sonda SO-LEITURA do 403 no push: que credencial o GCM serve e que permissao
// ela tem no repo? Nunca imprime o valor — so len, md5-12 e prefixo de esquema.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const md5 = (s) => createHash('md5').update(s).digest('hex');
const descr = (s) => {
  const pre = (s.match(/^(github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)/) || ['(outro)'])[0];
  return `len=${s.length} md5=${md5(s).slice(0, 12)} esquema=${pre}`;
};

const url = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim();
const u = new URL(url);
const [owner, repoGit] = u.pathname.split('/').filter(Boolean);
const repo = repoGit.replace(/\.git$/, '');
const username = u.username;
if (!owner || !repo || !username) {
  console.error('CEGO: owner/repo/username nao derivaveis do remote');
  process.exit(1);
}
console.log(`alvo derivado do config: ${owner}/${repo} username=${username}`);

const out = execFileSync('git', ['credential', 'fill'], {
  input: `protocol=https\nhost=github.com\nusername=${username}\n\n`,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' },
}).toString('utf8');
let gcm = null;
for (const line of out.split(/\r?\n/)) {
  if (line.startsWith('password=')) gcm = line.slice(9);
}
if (!gcm) { console.error('CEGO: GCM nao devolveu password'); process.exit(1); }
console.log(`GCM serve: ${descr(gcm)}`);

const ficheiro = join(homedir(), '.gh-token');
const disco = existsSync(ficheiro) ? readFileSync(ficheiro, 'utf8').trim() : null;
if (disco) console.log(`~/.gh-token: ${descr(disco)} | igual ao GCM: ${md5(disco) === md5(gcm) ? 'SIM' : 'NAO'}`);
else console.log('~/.gh-token: nao existe');

async function probe(nome, tok) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `token ${tok}`, 'User-Agent': 'bfr-seg-p0', Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30_000),
  });
  const exp = r.headers.get('github-authentication-token-expiration') || '(sem header)';
  let perms = '(sem body)';
  if (r.status === 200) {
    const j = await r.json();
    perms = JSON.stringify(j.permissions || null);
  }
  console.log(`${nome}: GET /repos -> ${r.status} permissions=${perms} expiracao=${exp}`);
}

await probe('GCM', gcm);
if (disco && md5(disco) !== md5(gcm)) await probe('disco', disco);