#!/usr/bin/env node
// P3-B: censo das chaves de localStorage / sessionStorage

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const html = readFileSync(join(ROOT, 'app/index.html'), 'utf8');

function census(re) {
  const out = {};
  for (const m of html.matchAll(re)) {
    const k = m[1];
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

const lsGet = census(/localStorage\.getItem\(\s*['"]([^'"]+)['"]/g);
const lsSet = census(/localStorage\.setItem\(\s*['"]([^'"]+)['"]/g);
const lsRm  = census(/localStorage\.removeItem\(\s*['"]([^'"]+)['"]/g);
const ssGet = census(/sessionStorage\.getItem\(\s*['"]([^'"]+)['"]/g);
const ssSet = census(/sessionStorage\.setItem\(\s*['"]([^'"]+)['"]/g);
const ssRm  = census(/sessionStorage\.removeItem\(\s*['"]([^'"]+)['"]/g);

const all = {};
for (const [g, nome] of [[lsGet,'get'],[lsSet,'set'],[lsRm,'rm']])
  for (const k of Object.keys(g)) (all[k] ??= {LS:{},SS:{}}).LS[nome] = g[k];
const allSS = {};
for (const [g, nome] of [[ssGet,'get'],[ssSet,'set'],[ssRm,'rm']])
  for (const k of Object.keys(g)) (allSS[k] ??= {LS:{},SS:{}}).SS[nome] = g[k];

const keys = new Set([...Object.keys(all), ...Object.keys(allSS)]);

console.log('=== CHAVES localStorage / sessionStorage ===');
console.log('total de chaves distintas:', keys.size);

// agrupar por prefixo
const pref = {};
for (const k of keys) {
  const p = k.includes('.') ? k.split('.')[0] : (k.match(/^[a-z]+/)?.[0] ?? 'outro');
  pref[p] = (pref[p] || 0) + 1;
}
console.log('\npor prefixo:');
for (const [p, n] of Object.entries(pref).sort((a,b)=>b[1]-a[1])) console.log(`  ${p}: ${n}`);

// chaves de sessao — as que importam para seguranca
console.log('\nchaves relacionadas a AUTENTICACAO/SESSAO:');
const authRe = /token|session|auth|jwt|refresh|access|user|credential|api[_-]?key/i;
for (const k of [...keys].sort()) {
  if (!authRe.test(k)) continue;
  const store = allSS[k] ? 'sessionStorage' : 'localStorage';
  const ops = { ...(all[k]?.LS||{}), ...(allSS[k]?.SS||{}) };
  console.log(`  [${store}] ${k}  (get:${ops.get||0} set:${ops.set||0} rm:${ops.rm||0})`);
}

console.log('\nTODAS as chaves:');
for (const k of [...keys].sort()) {
  const ops = { ...(all[k]?.LS||{}), ...(allSS[k]?.SS||{}) };
  console.log(`  ${k}  LS:${all[k]?'sim':'nao'} SS:${allSS[k]?'sim':'nao'} get:${ops.get||0} set:${ops.set||0} rm:${ops.rm||0}`);
}
