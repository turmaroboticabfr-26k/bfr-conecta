import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const src = join(homedir(), 'Downloads', 'gh-token-novo.txt');
const dst = join(homedir(), '.gh-token');
const deadMd5 = 'd915a2cca74a';

const value = readFileSync(src, 'utf8').replace(/[\r\n]+$/, '');
const md5 = createHash('md5').update(value).digest('hex').slice(0, 12);
console.log(`download: len=${value.length} md5=${md5} esquema=${value.slice(0, 11)}`);

if (!value.startsWith('github_pat_') || value.length !== 93 || /\s/.test(value)) {
  console.log('ABORTADO: forma inesperada. Nada gravado.');
  process.exit(2);
}
if (md5 === deadMd5) {
  console.log('ABORTADO: ainda o token morto. Nada gravado.');
  process.exit(3);
}

const old = readFileSync(dst, 'utf8').replace(/[\r\n]+$/, '');
const oldMd5 = createHash('md5').update(old).digest('hex').slice(0, 12);
writeFileSync(dst, value);
unlinkSync(src);
console.log(`anterior: len=${old.length} md5=${oldMd5}`);
console.log(`GRAVADO: len=${value.length} md5=${md5} diferente_do_morto=SIM; download_removido=SIM`);