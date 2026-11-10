import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim();
const m = remote.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/);
if (!m) { console.log('ERRO: remote nao derivado'); process.exit(1); }
const [, owner, repo] = m;

const token = readFileSync(join(homedir(), '.gh-token'), 'utf8').trim();
const md5 = createHash('md5').update(token).digest('hex').slice(0, 12);
console.log(`ficheiro: len=${token.length} md5=${md5}`);
console.log(`alvo derivado do remote: ${owner}/${repo}`);

const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'seg-p0-sonda',
    'x-github-api-version': '2022-11-28',
  },
});
console.log(`GET /repos -> ${res.status}`);
const expiration = res.headers.get('github-authentication-token-expiration');
if (expiration) console.log(`expiracao: ${expiration}`);
if (res.ok) {
  const j = await res.json();
  console.log(`permissions: ${JSON.stringify(j.permissions)}`);
  console.log(`full_name: ${j.full_name}`);
} else {
  const j = await res.json().catch(() => ({}));
  console.log(`erro: ${j.message || res.statusText}`);
}