#!/usr/bin/env node
// Censo de credenciais apenas nos ficheiros TRACKED pelo git.
// Decodifica JWT e classifica por role + expiracao. Nunca imprime o token.

import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';

const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

console.log(`ficheiros tracked: ${tracked.length}`);

const JWT = /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g;
const PATS = [
  ['FIREBASE_KEY (publica por design)', /AIza[0-9A-Za-z_-]{35}/g],
  ['SUPABASE_ANON/PUBLISHABLE (publica por design)', /sb_publishable_[A-Za-z0-9_-]{20,}/g],
  ['QODER_PAT sbp_', /sbp_[A-Za-z0-9]{20,}/g],
  ['CF_API_TOKEN', /cf[a-z_]*token["']?\s*[:=]/gi],
  ['JWT (precisa classificacao)', JWT],
];

function decode(tok) {
  const p = tok.split('.')[1];
  const pad = p + '='.repeat((4 - (p.length % 4)) % 4);
  return JSON.parse(Buffer.from(pad.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

const rows = [];
for (const rel of tracked) {
  let c;
  try { c = readFileSync(join(ROOT, rel), 'utf8'); } catch { continue; }
  if (c.length > 8_000_000) continue;

  for (const [nome, re] of PATS) {
    const hits = c.match(re) || [];
    if (!hits.length) continue;
    if (nome.startsWith('JWT')) {
      const classes = {};
      for (const t of new Set(hits)) {
        let cl; try { cl = decode(t); } catch { continue; }
        const morto = cl.exp && cl.exp * 1000 < Date.now();
        const key = `${cl.role || '?'}|${morto ? 'expirado' : 'VIGENTE'}`;
        classes[key] = (classes[key] || 0) + 1;
      }
      for (const [k, n] of Object.entries(classes))
        rows.push({ ficheiro: rel, tipo: `JWT role=${k}`, n });
    } else {
      rows.push({ ficheiro: rel, tipo: nome, n: hits.length });
    }
  }
}

console.log('\n=== ACHADOS EM FICHEIROS TRACKED ===');
if (!rows.length) console.log('(nenhum)');
for (const r of rows.sort((a, b) => a.ficheiro.localeCompare(b.ficheiro)))
  console.log(`${r.ficheiro.padEnd(48)} ${r.tipo.padEnd(46)} ${r.n}x`);

const perigo = rows.filter(r =>
  /VIGENTE/.test(r.tipo) || /sbp_|CF_API/.test(r.tipo));
console.log('\n=== PORTAO: exige acao? ===');
console.log(perigo.length
  ? `SIM — ${perigo.length} classe(s) com material VIGENTE ou token de infraestrutura`
  : 'NAO — todo JWT tracked e expirado e as unicas chaves vivas sao publicas por design');
for (const p of perigo) console.log('  >> ' + p.ficheiro + ' : ' + p.tipo);
