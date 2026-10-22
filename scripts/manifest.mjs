import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] ?? '.';
const skipDirs = new Set(['.git', 'scripts', 'node_modules']);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (!skipDirs.has(name)) walk(path, out);
      continue;
    }
    if (name === 'MANIFEST.md') continue;
    out.push(path);
  }
  return out;
}

const files = walk(root, []).sort();
const rows = files.map((path) => {
  const buf = readFileSync(path);
  const md5 = createHash('md5').update(buf).digest('hex');
  return `| \`${relative(root, path).split(sep).join('/')}\` | ${buf.length} | \`${md5}\` |`;
});

const lines = [
  '# Manifesto — v59',
  '',
  'Deployment `06f62d38-282d-4ce7-80d8-de4cf1e0f46f`, version `fc1b3648-7562-4352-a677-ebab223afc78`, publicado em 22/10/2026 11:19 UTC.',
  '',
  '| Arquivo | Bytes | md5 |',
  '|---|---:|---|',
  ...rows,
  '',
];

writeFileSync(join(root, 'MANIFEST.md'), lines.join('\n'));
console.log(`${rows.length} arquivos`);
