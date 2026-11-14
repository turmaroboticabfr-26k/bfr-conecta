#!/usr/bin/env node
// Decodifica o payload dos JWTs de um ficheiro e imprime APENAS as chaves das claims,
// o papel (se houver) e o tempo de expiracao convertido. Nunca imprime o token.
import { readFileSync } from 'node:fs';

const RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g;
for (const f of process.argv.slice(2)) {
  const t = readFileSync(f, 'utf8');
  const ms = [...t.matchAll(RE)];
  if (!ms.length) continue;
  console.log(`## ${f} jwt=${ms.length}`);
  ms.forEach((m, i) => {
    const partes = m[0].split('.');
    let claims = null;
    try { claims = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8')); } catch {}
    if (!claims) { console.log(`   [${i}] payload_indecifrivei`); return; }
    const chaves = Object.keys(claims).sort().join(',');
    const exp = typeof claims.exp === 'number' ? new Date(claims.exp * 1000).toISOString() : '-';
    const iat = typeof claims.iat === 'number' ? new Date(claims.iat * 1000).toISOString() : '-';
    console.log(`   [${i}] chaves=${chaves} role=${claims.role ?? '-'} exp=${exp} iat=${iat} expirado=${typeof claims.exp === 'number' ? Date.now() > claims.exp * 1000 : '-'}`);
  });
}
