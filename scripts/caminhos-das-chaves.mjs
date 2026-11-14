#!/usr/bin/env node
// Imprime apenas os CAMINHOS das chaves (com as arrays colapsadas) e o tipo/comprimento
// de cada folha. Nunca um valor.
import { readFileSync } from 'node:fs';

function varre(v, p, out) {
  if (Array.isArray(v)) { v.forEach((x, i) => varre(x, `${p}[${i}]`, out)); return; }
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) varre(v[k], `${p}.${k}`, out); return; }
  out.push(`${p} :: ${typeof v} ${typeof v === 'string' ? `n=${v.length}` : ''}`.trimEnd());
}

for (const f of process.argv.slice(2)) {
  console.log(`## ${f}`);
  const out = [];
  varre(JSON.parse(readFileSync(f, 'utf8')), '$', out);
  for (const l of out) console.log(`   ${l}`);
}
