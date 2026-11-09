#!/usr/bin/env node
// P2-3 / P3: mede o estado real das pendencias de seguranca

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const html = readFileSync(join(ROOT, 'app/index.html'), 'utf8');

console.log('=== P2-3: CSP ===');
const metaCsp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/);
console.log('meta CSP presente?', metaCsp ? 'SIM' : 'NAO');
if (metaCsp) {
  const scriptSrc = metaCsp[1].match(/script-src([^;]*)/)?.[1]?.trim();
  console.log('script-src:', scriptSrc);
  console.log('contem unsafe-inline?', scriptSrc?.includes("'unsafe-inline'") ? 'SIM' : 'NAO');
}

// scripts inline vs externos
const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map(m => m[1]);
const withSrc = scripts.filter(s => /\bsrc\s*=/.test(s));
const inline = scripts.filter(s => !/\bsrc\s*=/.test(s));
console.log(`\n<script> total: ${scripts.length}`);
console.log(`  com src (externo): ${withSrc.length}`);
console.log(`  inline (sem src):  ${inline.length}`);

// scripts inline estaticos (sem interpolacao dinamica) vs injetados por JS
// contar innerHTML/document.write que criam <script>
const scriptInject = (html.match(/innerHTML[^;]{0,400}<script/g) || []).length;
const evalCount = (html.match(/\beval\s*\(/g) || []).length;
const newFn = (html.match(/new Function\s*\(/g) || []).length;
console.log(`\ninjecao dinamica de <script> via innerHTML: ${scriptInject}`);
console.log(`eval(): ${evalCount}`);
console.log(`new Function(): ${newFn}`);

// estilos inline
const styleBlocks = (html.match(/<style\b[^>]*>/g) || []).length;
const styleAttrs = (html.match(/\sstyle\s*=\s*"/g) || []).length;
console.log(`\n<style> blocos: ${styleBlocks}`);
console.log(`atributos style="": ${styleAttrs}`);

console.log('\n=== P3: credenciais hardcoded no index.html ===');
const patterns = [
  ['Firebase API key', /AIza[0-9A-Za-z_-]{35}/g],
  ['Cloudflare BEACON/token', /[a-f0-9]{32}@beacon/g],
  ['Supabase anon/publishable', /sb_publishable_[A-Za-z0-9_-]+/g],
  ['Supabase service_role (eyJ...)', /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g],
  ['JWT sbp_ (PAT)', /sbp_[A-Za-z0-9]{20,}/g],
  ['Bearer literal + string', /Bearer\s+["'`][A-Za-z0-9_\-\.]{20,}["'`]/g],
];
for (const [nome, re] of patterns) {
  const m = html.match(re) || [];
  console.log(`${nome}: ${m.length}` + (m.length ? `  [${m.length} ocorrencias]` : ''));
}

console.log('\n=== P3: credenciais nos scripts do repositorio (tracked) ===');
const dirs = ['scripts', '.'];
let hits = [];
function scan(dir, depth) {
  if (depth > 1) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory() && !e.startsWith('.') && e !== 'node_modules') { scan(p, depth + 1); continue; }
    if (!st.isFile() || !/\.(mjs|js|ts|sql|json|html|md)$/.test(e)) continue;
    if (/app\/index\.html$/.test(p)) continue;
    let c;
    try { c = readFileSync(p, 'utf8'); } catch { continue; }
    for (const [nome, re] of patterns) {
      const mm = c.match(re);
      if (mm) hits.push({ ficheiro: p.replace(ROOT, '.'), tipo: nome, n: mm.length });
    }
  }
}
scan(join(ROOT, 'scripts'), 0);
scan(ROOT, 1);
const seen = new Set();
for (const h of hits) {
  const k = h.ficheiro + '|' + h.tipo;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`  ${h.tipo} em ${h.ficheiro} (${h.n}x)`);
}
if (!hits.length) console.log('  (nenhuma)');
