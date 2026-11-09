// O perfil de Chrome do ciclo C2 guarda sessão no Local Storage? Medir sem imprimir valores:
// extrai só o `sub`, o `exp` e a presença de refresh_token de cada JWT encontrado no LevelDB,
// e cruza o sub com auth.users (somente-leitura).
import fs from 'node:fs';
import path from 'node:path';
import { sql } from './s19-lib.mjs';

const LS = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/.c2-chrome-profile/Default/Local Storage/leveldb';
const raw = fs.readdirSync(LS)
  .filter((f) => /\.log$|\.ldb$/.test(f))
  .map((f) => fs.readFileSync(path.join(LS, f), 'latin1'))
  .join('');

console.log(`bytes lidos do LevelDB: ${raw.length}`);
const keys = [...new Set([...raw.matchAll(/sb-[\w-]+-auth-token/g)].map((m) => m[0]))];
console.log(`chaves sb-*-auth-token distintas: ${keys.length} -> ${keys.join(', ') || 'nenhuma'}`);

const jwtRx = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g;
const vistos = new Set();
const dec = (seg) => {
  try { return JSON.parse(Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); }
  catch { return null; }
};
let n = 0;
for (const m of raw.matchAll(jwtRx)) {
  n++;
  const p = dec(m[0].split('.')[1]);
  if (!p) continue;
  const sig = m[0].slice(0, 12) + '…';
  if (vistos.has(sig)) continue;
  vistos.add(sig);
  const exp = p.exp ? new Date(p.exp * 1000).toISOString() : 'sem exp';
  const vivo = p.exp ? p.exp * 1000 > Date.now() : false;
  console.log(`   sub=${String(p.sub).slice(0, 8)} role=${p.role ?? '?'} exp=${exp} (${vivo ? 'NA JANELA' : 'vencido'}) jwt=${sig} len=${m[0].length}`);
}
console.log(`JWTs encontrados: ${n} | distintos: ${vistos.size}`);
console.log(`presenca de "refresh_token" no blob: ${(raw.match(/refresh_token/g) || []).length}`);
console.log(`presenca de "access_token" no blob: ${(raw.match(/access_token/g) || []).length}`);

const subs = [...new Set([...raw.matchAll(jwtRx)].map((m) => dec(m[0].split('.')[1])?.sub).filter(Boolean))];
if (subs.length) {
  const rows = await sql(`select id, email, deleted_at from auth.users`);
  const por = new Map(rows.map((r) => [r.id, r]));
  console.log(`\ncruzamento de ${subs.length} sub distintos com auth.users (${rows.length} linhas):`);
  for (const s of subs) {
    const r = por.get(s);
    if (!r) { console.log(`   ${s.slice(0, 8)} | nao existe em auth.users`); continue; }
    const mask = (e) => {
      const [local, dom] = String(e || '').split('@');
      return /^(test|bfr|synth|audit|seed|demo|supervis|s20)/i.test(local) ? `${local}@${dom}` : `<${local.length} chars>@${dom}`;
    };
    const se = await sql(`select count(*)::int as n from auth.sessions where user_id = '${s}'`);
    const rt = await sql(`select count(*) filter (where revoked is distinct from true)::int as vivas from auth.refresh_tokens where user_id = '${s}'`);
    console.log(`   ${s.slice(0, 8)} | ${mask(r.email)} | deleted=${r.deleted_at ?? 'NULL'} | sessoes=${se[0].n} refresh_vivas=${rt[0].vivas}`);
  }
}
