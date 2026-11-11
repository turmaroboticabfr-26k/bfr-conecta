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

const alvos = ['d26b4fa', '80c951c', 'b1d5c49', '0782736', '5385066', 'c1ca925'];
for (const p of alvos) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${p}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'seg-p0-sonda',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (res.ok) {
    const j = await res.json();
    console.log(`${p} -> ${res.status} sha=${j.sha}`);
  } else {
    console.log(`${p} -> ${res.status}`);
  }
}

const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/f2bac991bec0822357944040f7463dbc7110b478`, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'seg-p0-sonda',
    'x-github-api-version': '2022-11-28',
  },
});
console.log(`blob f2bac991 -> ${blobRes.status}`);
