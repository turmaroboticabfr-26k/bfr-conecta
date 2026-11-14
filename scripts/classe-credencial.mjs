#!/usr/bin/env node
// Triagem por CLASSE do que cada ficheiro rastreado carrega.
// Senhas: imprime apenas comprimento. JWT: decodifica claims role/email (contas sinteticas).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const raiz = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
let alvos = process.argv.slice(2);
if (!alvos.length) {
  alvos = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g;
const CHAVE_RE = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const PUB_RE = /sb_publishable_[A-Za-z0-9_-]{8,}/g;
const URLTOK_RE = /[?&]token=([A-Za-z0-9_-]{20,})/g;

function b64url(t) {
  try { return JSON.parse(Buffer.from(t.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); }
  catch { return null; }
}

for (const f of alvos) {
  let t;
  try { t = readFileSync(`${raiz}/${f}`); } catch { continue; }
  if (t.includes(0)) continue;
  t = t.toString('utf8');
  let rastreado = 'NAO';
  try { execFileSync('git', ['ls-files', '--error-unmatch', '--', f], { stdio: 'ignore' }); rastreado = 'SIM'; } catch {}
  const senhas = [...t.matchAll(CHAVE_RE)].map((m) => m[2].length);
  const jwt = [...t.matchAll(JWT_RE)];
  const pubs = [...t.matchAll(PUB_RE)].map((m) => m[0].length);
  const urlt = [...t.matchAll(URLTOK_RE)].map((m) => m[1].length);
  const papeis = new Map();
  for (const m of jwt) {
    const c = b64url(m[0].split('.')[1] || '');
    if (!c) { papeis.set('indecifrive', (papeis.get('indecifrive') || 0) + 1); continue; }
    const k = `${c.role ?? c.user_metadata?.role ?? '?'}/${String(c.email ?? '?').slice(0, 10)}`;
    papeis.set(k, (papeis.get(k) || 0) + 1);
  }
  console.log(`## ${f}  rastreado=${rastreado}`);
  if (senhas.length) console.log(`   senha_literal: n=${senhas.length} comprimentos=${senhas.join(',')}`);
  if (jwt.length) console.log(`   jwt: n=${jwt.length} papeis=${[...papeis].map(([k, n]) => `${k}x${n}`).join(' ')}`);
  if (urlt.length) console.log(`   token_de_url: n=${urlt.length} comprimentos=${urlt.join(',')}`);
  if (pubs.length) console.log(`   chave_publica(sb_publishable): n=${pubs.length}`);
  if (!senhas.length && !jwt.length && !urlt.length && !pubs.length) console.log('   classe_nada_encontrada');
}
