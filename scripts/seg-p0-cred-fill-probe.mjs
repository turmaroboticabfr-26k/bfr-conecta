// scripts/seg-p0-cred-fill-probe.mjs
// Sonda o credential fill com e sem username. NUNCA imprime o password:
// reporta so a presenca de cada chave e o comprimento do valor.

import { execFileSync } from 'node:child_process';

function fill(query) {
  try {
    const out = execFileSync('git', ['credential', 'fill'], {
      input: query,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, GCM_INTERACTIVE: 'never' },
    }).toString('utf8');
    const keys = {};
    for (const line of out.split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0) keys[line.slice(0, i)] = line.slice(i + 1);
    }
    const parts = Object.entries(keys).map(([k, v]) =>
      k === 'password' ? `password=<${v.length} chars>` : `${k}=${v}`
    );
    return `OK: ${parts.join(', ')}`;
  } catch (e) {
    const err = (e.stderr || '').toString().trim().split(/\r?\n/).slice(-2).join(' | ');
    return `FALHA: ${err || e.message}`;
  }
}

console.log('sem username:');
console.log(fill('protocol=https\nhost=github.com\n\n'));
console.log('com username:');
console.log(fill('protocol=https\nhost=github.com\nusername=turmaroboticabfr-26k\n\n'));
