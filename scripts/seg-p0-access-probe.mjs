// P0-3: o acesso continua depois do URL limpo? Mede por git credential fill (com username)
// e por ls-remote. Compara a credencial do GCM com a que ia no URL por md5, nunca por valor.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const GIT = (args, opt = {}) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, ...opt });
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const USER = 'turmarobiticabfr-26k';
const MD5_URL_TOKEN = '4dc83e6d';

const url = GIT(['config', '--get', 'remote.origin.url']).trim();
console.log('URL actual: ' + url);
console.log('portao A — URL limpo (sem user:segredo@): ' + (/:\/\/[^@/]+:[^@/]+@/.test(url) ? 'FALHA' : 'OK'));

let out = '';
try {
  out = GIT(['credential', 'fill'], {
    input: `protocol=https\nhost=github.com\nusername=${USER}\n\n`,
    env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' },
  });
} catch (e) {
  console.log('portao B — credential fill falhou: ' + String(e.message).split('\n').filter(Boolean)[0]);
}
if (out) {
  const pass = (out.match(/^password=(.*)$/m) || ['', ''])[1];
  const kind = /^(ghp|github_pat|gho|ghu|ghs|ghr)_/.test(pass) ? 'PAT' : 'nao-PAT (provavel password ou OAuth)';
  console.log(`portao B — GCM devolve credencial: comprimento ${pass.length}, tipo ${kind}, md5 ${md5(pass).slice(0, 8)}`);
  console.log('portao C — é a MESMA que estava no URL (md5 ' + MD5_URL_TOKEN + '…)? ' +
    (md5(pass).slice(0, 8) === MD5_URL_TOKEN ? 'SIM — revogar o PAT parte o push ate emitir outro' : 'NAO — revogar o PAT nao parte o push'));
}

try {
  const heads = GIT(['ls-remote', '--heads', 'origin'], {
    env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' },
  });
  console.log(`portao D — ls-remote com URL limpo: OK, ${heads.trim().split('\n').length} branches visiveis`);
} catch (e) {
  console.log('portao D — ls-remote com URL limpo: FALHA — ' + String(e.message).split('\n').filter(Boolean)[0]);
}

console.log('portao E — HEAD local vs origin/main (nada mudou no conteudo): ' +
  GIT(['rev-parse', 'HEAD']).trim().slice(0, 7) + ' / ' + GIT(['rev-parse', 'origin/main']).trim().slice(0, 7));
console.log('portao F — estado do arvore de trabalho (contagem de linhas): ' + GIT(['status', '--porcelain']).trim().split('\n').filter(Boolean).length + ' entradas');
