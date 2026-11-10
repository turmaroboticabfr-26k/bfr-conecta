import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const file = join(homedir(), '.gh-token');
const deadMd5 = 'd915a2cca74a';

let clip;
try {
  clip = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Clipboard -Raw'], { encoding: 'utf8', timeout: 20000 });
} catch {
  console.log('ERRO: leitura do clipboard falhou. Ficheiro intacto.');
  process.exit(1);
}

const value = clip.replace(/[\r\n]+$/, '');
const md5 = createHash('md5').update(value).digest('hex').slice(0, 12);
console.log(`clipboard: len=${value.length} md5=${md5} esquema=${value.slice(0, 11)}`);

if (!value.startsWith('github_pat_') || value.length !== 93 || /\s/.test(value)) {
  console.log('ABORTADO: clipboard sem a forma esperada (github_pat_, 93 chars, sem espacos). Ficheiro intacto.');
  process.exit(2);
}
if (md5 === deadMd5) {
  console.log('ABORTADO: clipboard ainda contem o token MORTO. Ficheiro intacto.');
  process.exit(3);
}

const old = existsSync(file) ? readFileSync(file, 'utf8').replace(/[\r\n]+$/, '') : null;
const oldMd5 = old ? createHash('md5').update(old).digest('hex').slice(0, 12) : null;
writeFileSync(file, value);
console.log(`anterior: len=${old ? old.length : 0} md5=${oldMd5}`);
console.log(`GRAVADO: len=${value.length} md5=${md5} diferente_do_morto=SIM`);