// Censo do valor badge_token nos blobs ALCANCADOS pelas refs (o que clone/fetch transfere).
// Nunca imprime o valor. Uso: node scripts/seg-badge-history-census.mjs [caminho-do-fixture]
// (a partir da raiz do repo; o argumento permite correr dentro da clone de reescrita)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const md5 = (b) => createHash('md5').update(b).digest('hex');

const fix = JSON.parse(readFileSync(process.argv[2] || 'docs/c2-fixtures.json', 'utf8'));
const token = fix.badge_token;
if (typeof token !== 'string' || token.length !== 36) throw new Error('badge_token ausente ou inesperado no fixture do disco');
const needle = Buffer.from(token, 'utf8');
console.log(`valor: len=${token.length} md5=${md5(needle)}`);

const refs = git('for-each-ref', '--format=%(refname)').trim().split('\n');
console.log(`refs varridas: ${refs.length} (${refs.join(', ')})`);

const objLines = git('rev-list', '--objects', '--all').trim().split('\n');
const blobPaths = new Map();
for (const line of objLines) {
  const sp = line.indexOf(' ');
  if (sp < 0) continue;
  const sha = line.slice(0, sp);
  const path = line.slice(sp + 1);
  if (!blobPaths.has(sha)) blobPaths.set(sha, new Set());
  blobPaths.get(sha).add(path);
}

const reachable = [...blobPaths.keys()];
const check = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
  input: reachable.join('\n'), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
}).trim().split('\n');
const blobs = check.filter((l) => l.split(' ')[1] === 'blob').map((l) => l.split(' ')[0]);
console.log(`objectos com caminho: ${reachable.length} | blobs alcancados pelas refs: ${blobs.length}`);

const hits = [];
for (const sha of blobs) {
  const buf = execFileSync('git', ['cat-file', 'blob', sha], { maxBuffer: 256 * 1024 * 1024 });
  if (buf.includes(needle)) {
    const paths = blobPaths.has(sha) ? [...blobPaths.get(sha)] : ['(blob sem caminho alcancado)'];
    const commits = git('log', '--all', '--format=%h %s', '--find-object=' + sha).trim().split('\n').filter(Boolean);
    hits.push({ sha, size: buf.length, md5: md5(buf), paths, commits });
  }
}

console.log(`\nBLOBS COM O VALOR: ${hits.length}`);
for (const h of hits) {
  console.log(`- blob ${h.sha} (${h.size} B, md5 ${h.md5})`);
  for (const p of h.paths) console.log(`    caminho: ${p}`);
  for (const c of h.commits) console.log(`    commit: ${c}`);
}

console.log('\nhistorico de docs/c2-fixtures.json:');
console.log(git('log', '--all', '--oneline', '--follow', '--', 'docs/c2-fixtures.json').trim());
console.log(`\ncommits alcancados por --all: ${git('rev-list', '--count', '--all').trim()}`);
if (refs.includes('refs/remotes/origin/main')) {
  console.log(`commits em origin/main: ${git('rev-list', '--count', 'origin/main').trim()}`);
}
console.log(hits.length === 0 ? 'CENSO_OK — valor ausente de todos os blobs' : 'CENSO_PRESENTE — reescrita necessaria');