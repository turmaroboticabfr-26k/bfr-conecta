// SEG: forma dos tokens numa sessao gravada — so comprimento e prefixo de 6, nunca o valor inteiro.
import { execFileSync } from 'node:child_process';

const sha = process.argv[2];
const body = execFileSync('git', ['cat-file', 'blob', sha], { encoding: 'utf8', maxBuffer: 1 << 28 });
for (const key of ['access_token', 'refresh_token']) {
  const vals = [...body.matchAll(new RegExp('"' + key + '"\\s*:\\s*"([^"]*)"', 'g'))].map((m) => m[1]);
  console.log(`${key}: ${vals.length} valor(es) — comprimentos [${vals.map((v) => v.length).join(', ')}]`);
  for (const v of vals) {
    const parts = v.split('.');
    if (parts.length === 3) {
      let p = {};
      try { p = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch {}
      const exp = p.exp ? new Date(p.exp * 1000).toISOString() : '(sem exp)';
      console.log(`   JWT sub=${String(p.sub).slice(0, 8)}… role=${p.role} exp=${exp}`);
    } else if (v) {
      console.log(`   opaco prefixo=${v.slice(0, 6)}… len=${v.length}`);
    } else {
      console.log('   VAZIO');
    }
  }
}
