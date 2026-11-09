// SEG-FIN: as contas nomeadas nos blobs pushados estão entre as 8 rotacionadas?
// Só imprime email de teste (não é segredo), comprimento de local-part, canal e contagens.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sql } from './c2-lib.mjs';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

const objects = git(['rev-list', '--objects', 'origin/main']).trim().split('\n');
const ids = objects.map((line) => {
  const [sha, ...rest] = line.split(' ');
  return { sha, path: rest.join(' ') || '(sem-nome)' };
});
const check = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
  cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, input: ids.map((e) => e.sha).join('\n') + '\n',
});
const type = new Map(check.trim().split('\n').map((l) => l.split(' ')));
const blobs = ids.filter((e) => type.get(e.sha) === 'blob');

const RX = /['"]([a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.(?:test|local))['"]/gi;
const DOMINIOS = /@(bfr\.test|bfr-admin\.test|test\.local)$/i;
const emails = new Map();
for (const { sha, path: p } of blobs) {
  let body;
  try { body = git(['cat-file', 'blob', sha]); } catch { continue; }
  if (body.length > 8 << 20) continue;
  for (const m of body.matchAll(RX)) {
    if (!DOMINIOS.test(m[1])) continue;
    if (!emails.has(m[1])) emails.set(m[1], new Set());
    emails.get(m[1]).add(p);
  }
}
if (!emails.size) { console.log('INSTRUMENTO CEGO: zero emails de teste nos blobs alcançáveis'); process.exit(1); }

const rot = JSON.parse(fs.readFileSync(`${REPO}/evidence/p1-rotacao-8.json`, 'utf8'));
const alvos = rot.alvos.map((a) => {
  const m = String(a.email).match(/^<(\d+) chars>@(.+)$/);
  return { len: Number(m[1]), dom: m[2], canal: a.canal, nova: a.novaDestrava, antiga: a.antigaDestrava };
});

const rows = await sql(`select id, email, role, created_at from auth.users`);
const porEmail = new Map(rows.map((r) => [String(r.email).toLowerCase(), r]));

console.log(`emails de teste nos blobs pushados: ${emails.size} | alvos do passe de rotação: ${alvos.length}`);
console.log('\nemail                              existe?  rotacionada?  canal      antiga destrava?');
let cobertas = 0, fora = 0;
for (const [em, onde] of [...emails].sort()) {
  const local = em.split('@')[0], dom = em.split('@')[1];
  const alvo = alvos.find((a) => a.dom === dom && a.len === local.length);
  const u = porEmail.get(em.toLowerCase());
  if (alvo) cobertas++; else if (u) fora++;
  console.log(
    `${em.padEnd(34)} ${u ? 'sim' : 'não  '}      ` +
    `${alvo ? 'sim' : 'não '}          ${(alvo?.canal ?? '—').padEnd(10)} ` +
    `${alvo ? (alvo.antiga ? 'SIM (por rodar)' : 'não') : '—'}`
  );
}
console.log(`\ncobertas pela rotação: ${cobertas} | existem e NÃO foram rotacionadas: ${fora}`);
console.log(`veredicto do passe de rotação: restantes=${rot.restantes} sessoesAlvos=${rot.sessoesAlvos} refreshAlvos=${JSON.stringify(rot.refreshAlvos)}`);
