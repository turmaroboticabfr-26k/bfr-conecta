// Portao pre-commit: nenhum segredo entra no versionamento.
// Le os ficheiros passados por argumento (ou os staged, se vierem por --staged) e procura
// (A) credenciais de servidor e (B) senhas hardcoded conhecidas do corpus de ciclos.
// Imprime apenas contagens, comprimentos e md5 — nunca o valor.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const GIT = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });

const staged = process.argv.includes('--staged');
const files = staged
  ? GIT(['diff', '--cached', '--name-only', '--diff-filter=ACM']).split('\n').filter(Boolean)
  : process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) { console.log('INSTRUMENTO CEGO: nenhum ficheiro para verificar'); process.exit(1); }

const PAT = /(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/g;
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g;
const PEM = /-----BEGIN [A-Z ]*PRIVATE KEY-----/g;

import path from 'node:path';

// O corpus de senhas hardcoded NAO vem dos *-sessions.json (la a chave weak_password e null):
// vem dos proprios scripts que mintam as contas sinteticas, no literal `password: '...'`.
const CORPUS_RX = /password\s*[:=]\s*["']([^"'\n]{6,})["']/gi;
const harvest = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...harvest(p, depth - 1));
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name)) {
      out.push(...[...fs.readFileSync(p, 'utf8').matchAll(CORPUS_RX)].map((m) => m[1]));
    }
  }
  return out;
};
const senhasConhecidas = new Map([...new Set(harvest(REPO, 3))].map((s) => [md5(s), s.length]));
if (!senhasConhecidas.size) {
  console.log('INSTRUMENTO CEGO: corpus de senhas vazio — a verificacao de senha nao prova nada');
  process.exit(1);
}

let falha = 0, lidos = 0;
for (const rel of files) {
  const p = path.isAbsolute(rel) ? rel : path.join(REPO, rel);
  if (!fs.existsSync(p)) {
    console.log(`  ${rel}: INEXISTENTE — FALHA ALTA (o portao nao pode dar OK sobre o que nao leu)`);
    falha = 1; continue;
  }
  lidos++;
  const txt = fs.readFileSync(p, 'utf8');
  const pats = [...txt.matchAll(PAT)].length;
  const jwt = [...txt.matchAll(JWT)]
    .map((m) => { try { return JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString()); } catch { return null; } })
    .filter(Boolean);
  const svc = jwt.filter((c) => c.role === 'service_role').length;
  const pem = [...txt.matchAll(PEM)].length;
  const literais = [...txt.matchAll(/["']([^"'\n]{6,80})["']/g)].map((m) => m[1]);
  const hits = literais.filter((l) => senhasConhecidas.has(md5(l))).length;
  const ok = pats === 0 && svc === 0 && pem === 0 && hits === 0;
  if (!ok) falha = 1;
  console.log(`  ${rel}: PAT=${pats} service_role-JWT=${svc} PEM=${pem} senha-conhecida=${hits} ` +
    `anon-JWT=${jwt.length - svc} ${ok ? 'OK' : '<<< BLOQUEIA'}`);
}
console.log(`senhas no corpus: ${senhasConhecidas.size} (comprimentos ${[...senhasConhecidas.values()].sort((a, b) => a - b).join('/')}) | ficheiros lidos: ${lidos}/${files.length}`);
if (!lidos) { console.log('INSTRUMENTO CEGO: nenhum ficheiro foi lido'); process.exit(1); }
console.log(falha ? 'PORTAO PRE-COMMIT FALHA — ha segredo em algum dos ficheiros' : 'PORTAO PRE-COMMIT OK — zero credenciais nos ficheiros');
process.exit(falha);
