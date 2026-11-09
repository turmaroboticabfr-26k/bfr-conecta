#!/usr/bin/env node
// Decodifica payload dos JWTs encontrados (mostra só claims, nunca o token)

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const RE = /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g;

function decode(tok) {
  const p = tok.split('.')[1];
  const pad = p + '='.repeat((4 - (p.length % 4)) % 4);
  return JSON.parse(Buffer.from(pad.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

function classify(c) {
  if (c.role === 'service_role') return 'SERVICE_ROLE (bypassa RLS)';
  if (c.role === 'anon') return 'ANON';
  if (c.scope === 'privileges' || c.aud === 'supabase' && !c.email && !c.sub) return 'TOKEN DE API?';
  return `SESSAO DE USUARIO (role=${c.role}, email=${c.email || '-'})`;
}

const files = [
  'c2-sessions.json', 's19-sessions.json', 's20-sessions.json',
  'test-gap3-func.mjs', 'test-gap3-minimal.mjs',
  'criar-conta-supervisor-api.mjs', 's20-behavioral.mjs',
];

const porClasse = {};
for (const f of files) {
  const p = join(ROOT, f);
  if (!existsSync(p)) { console.log(`(ausente: ${f})`); continue; }
  const toks = readFileSync(p, 'utf8').match(RE) || [];
  if (!toks.length) { console.log(`${f}: 0 JWT`); continue; }
  const vistos = new Set();
  for (const t of toks) {
    let c; try { c = decode(t); } catch { console.log(`${f}: JWT nao decodificavel`); continue; }
    const cls = classify(c);
    const exp = c.exp ? new Date(c.exp * 1000).toISOString() : 'sem exp';
    const morto = c.exp && c.exp * 1000 < Date.now();
    const key = `${cls} | ${morto ? 'EXPIRADO' : 'VIGENTE'} | exp ${exp}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    porClasse[key] = (porClasse[key] || 0) + 1;
    console.log(`${f}: ${cls} · exp ${exp} · ${morto ? 'EXPIRADO' : 'AINDA VIGENTE'}`);
  }
}

console.log('\n=== RESUMO POR CLASSE ===');
for (const [k, n] of Object.entries(porClasse)) console.log(`${n}x  ${k}`);
