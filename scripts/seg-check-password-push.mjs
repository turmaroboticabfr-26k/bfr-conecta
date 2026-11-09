// SEG-04d: a senha das 3 contas sobreviventes foi empurrada? Imprime só contagem, nunca o valor.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

const src = fs.readFileSync(REPO + '/scripts/s20-behavioral.mjs', 'utf8');
const mails = [...src.matchAll(/s20-(coordinator|director|supervisor)@bfr\.test/g)].map((m) => m[0]);
const srs = [...src.matchAll(/password\s*[:=]\s*['"]([^'"]{6,})['"]/g)].map((m) => m[1]);
const uniques = [...new Set(srs)];
console.log('contas no script local:', [...new Set(mails)].length, '| senhas distintas extraidas:', uniques.length);
if (uniques.length === 0) {
  console.log('VEREDITO: INSTRUMENTO CEGO — nenhuma senha extraida, a contagem abaixo nao prova nada');
  process.exit(1);
}

const objects = git(['rev-list', '--objects', 'origin/main']).trim().split('\n');
const ids = objects.map((l) => {
  const [sha, ...rest] = l.split(' ');
  return { sha, path: rest.join(' ') || '(sem-nome)' };
});
const check = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
  cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, input: ids.map((e) => e.sha).join('\n') + '\n',
});
const type = new Map(check.trim().split('\n').map((l) => l.split(' ')));
const blobs = ids.filter((e) => type.get(e.sha) === 'blob');
console.log('blobs alcancaveis do origin/main:', blobs.length);

let anyHit = 0;
for (const s of uniques) {
  const hits = [];
  for (const { sha, path } of blobs) {
    let body;
    try { body = git(['cat-file', 'blob', sha]); } catch { continue; }
    if (body.length > 8 << 20) continue;
    if (body.includes(s)) hits.push(path);
  }
  console.log(`senha #${uniques.indexOf(s) + 1} (len ${s.length}) em blobs empurrados: ${hits.length}${hits.length ? ' -> ' + hits.join(', ') : ''}`);
  anyHit += hits.length;
}
console.log(`\nVEREDITO: senha das 3 contas no historico empurrado = ${anyHit ? 'SIM' : 'NAO'}`);
