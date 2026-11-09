// P0-2: instalar o remote limpo e provar que o acesso continua, sem imprimir segredo.
// Compara por md5 (nunca por olho) a credencial que o GCM devolve contra a que ia no URL.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const GIT = (args, opt = {}) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, ...opt });
const CLEAN = 'https://github.com/turmarobiticabfr-26k/bfr-conecta.git';
const PAT_RE = /(ghp_|github_pat_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{20,}/;
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

const before = GIT(['config', '--get', 'remote.origin.url']);
const segredoUrl = (before.match(PAT_RE) || [''])[0];
console.log('antes: URL leva segredo embutido? ' + (PAT_RE.test(before) ? 'SIM' : 'NAO') +
  (segredoUrl ? ` (prefixo ${segredoUrl.slice(0, 8)}…, comprimento ${segredoUrl.length}, md5 ${md5(segredoUrl).slice(0, 8)})` : ''));

GIT(['remote', 'set-url', 'origin', CLEAN]);
const after = GIT(['config', '--get', 'remote.origin.url']).trim();
console.log('depois: ' + after);
console.log('portao 1 — URL limpo: ' + (after === CLEAN && !PAT_RE.test(after) && !/:\/\/[^@/]+:[^@/]+@/.test(after) ? 'OK' : 'FALHA'));

const inConfig = fs.readFileSync(path.join(REPO, '.git', 'config'), 'utf8');
console.log('portao 2 — ocorrências de token no .git/config agora: ' + [...inConfig.matchAll(new RegExp(PAT_RE.source, 'g'))].length);

let gcm = '';
try {
  gcm = GIT(['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' },
  });
} catch (e) {
  console.log('portao 3 — GCM nao devolveu credencial sem prompt: ' + String(e.message).split('\n')[0]);
}
if (gcm) {
  const pass = (gcm.match(/^password=(.*)$/m) || ['', ''])[1];
  const user = (gcm.match(/^username=(.*)$/m) || ['', ''])[1];
  console.log(`portao 3 — GCM devolve credencial: username=${user || '(vazio)'}, password comprimento ${pass.length}, md5 ${md5(pass).slice(0, 8)}`);
  console.log('portao 4 — a credencial do GCM é a MESMA que ia no URL? ' + (md5(pass) === md5(segredoUrl) ? 'SIM (revogar parte o push ate emitir token novo)' : 'NAO (revogar nao parte o push)'));
}
